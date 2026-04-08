/**
 * Dota2 Host Realization Engine
 *
 * Rule-based, deterministic realization of AssemblyPlan modules into Dota2 host types.
 * Follows docs/DOTA2-HOST-REALIZATION-POLICY.md and docs/HOST-REALIZATION-CONTRACT.md.
 *
 * NOT a LLM planner - uses explicit policy rules only.
 */

import {
  AssemblyPlan,
  AssemblyModule,
  HostRealizationPlan,
  HostRealizationUnit,
  HostRealizationOutput,
  RealizationType,
  RealizationRole,
} from "../../../core/schema/types";

/**
 * Dota2 realization policy mapping
 * Maps pattern combinations and module roles to realization types.
 */
interface Dota2RealizationRule {
  patterns: string[];
  role?: RealizationRole;
  realizationType: RealizationType;
  confidence: "high" | "medium" | "low";
  hostTargets: string[];
  rationale: string[];
}

/**
 * Default rules following docs/DOTA2-HOST-REALIZATION-POLICY.md mapping table
 */
const DOTA2_REALIZATION_RULES: Dota2RealizationRule[] = [
  // T143-R1: Lua-backed ability patterns -> kv+lua (produces both lua runtime and kv static shell)
  {
    patterns: ["dota2.short_time_buff"],
    role: "gameplay-core",
    realizationType: "kv+lua",
    confidence: "high",
    hostTargets: ["lua_ability", "ability_kv"],
    rationale: [
      "ability_lua system uses Lua for ability + same-file modifier",
      "KV provides static ability definition shell",
      "Produces two routed outputs: lua runtime + kv config",
    ],
  },
  // T143: Keep standalone lua for pure lua cases (no kv output needed)
  {
    patterns: [],
    role: "gameplay-core",
    realizationType: "lua",
    confidence: "low",
    hostTargets: ["lua_ability"],
    rationale: ["pure lua output without kv static shell"],
  },
  // UI patterns -> ui
  {
    patterns: ["ui.selection_modal"],
    role: "ui-surface",
    realizationType: "ui",
    confidence: "high",
    hostTargets: ["panorama_tsx", "panorama_less"],
    rationale: ["user-facing selection flow requires UI output"],
  },
  {
    patterns: ["ui.key_hint"],
    role: "ui-surface",
    realizationType: "ui",
    confidence: "high",
    hostTargets: ["panorama_tsx", "panorama_less"],
    rationale: ["key hint display requires UI output"],
  },
  {
    patterns: ["ui.resource_bar"],
    role: "ui-surface",
    realizationType: "ui",
    confidence: "high",
    hostTargets: ["panorama_tsx", "panorama_less"],
    rationale: ["resource bar display requires UI output"],
  },
  // gameplay patterns
  {
    patterns: ["effect.dash"],
    role: "gameplay-core",
    realizationType: "kv+ts",
    confidence: "high",
    hostTargets: ["ability_kv", "modifier_ts"],
    rationale: [
      "ability shell fits host-native static configuration",
      "dash movement logic requires runtime script behavior",
    ],
  },
  {
    patterns: ["effect.modifier_applier"],
    role: "gameplay-core",
    realizationType: "kv+ts",
    confidence: "high",
    hostTargets: ["modifier_kv", "modifier_ts"],
    rationale: [
      "modifier registration may be host-native",
      "custom behavior usually remains scripted",
    ],
  },
  {
    patterns: ["input.key_binding"],
    role: "gameplay-core",
    realizationType: "ts",
    confidence: "high",
    hostTargets: ["server_ts"],
    rationale: ["custom input capture and trigger orchestration are runtime concerns"],
  },
  {
    patterns: ["rule.selection_flow"],
    role: "gameplay-core",
    realizationType: "ts",
    confidence: "high",
    hostTargets: ["server_ts"],
    rationale: ["choice flow and nontrivial orchestration exceed static config"],
  },
  {
    patterns: ["resource.basic_pool"],
    role: "gameplay-core",
    realizationType: "kv",
    confidence: "medium",
    hostTargets: ["ability_kv"],
    rationale: ["static resource properties bias toward KV"],
  },
  {
    patterns: ["data.weighted_pool"],
    role: "shared-support",
    realizationType: "shared-ts",
    confidence: "medium",
    hostTargets: ["shared_ts"],
    rationale: ["data structure may need to be shared across surfaces"],
  },
];

/**
 * Check if module has UI requirement
 */
function hasUIRequirement(module: AssemblyModule): boolean {
  if (module.outputKinds.includes("ui")) return true;
  if (module.realizationHints?.uiRequired) return true;
  return false;
}

/**
 * Check if module is runtime heavy
 */
function isRuntimeHeavy(module: AssemblyModule): boolean {
  if (module.realizationHints?.runtimeHeavy) return true;
  // Check pattern-based heuristics
  const runtimePatterns = ["input.key_binding", "rule.selection_flow", "effect.dash"];
  return module.selectedPatterns.some((p) => runtimePatterns.includes(p));
}

/**
 * Check if module is KV capable
 */
function isKVCapable(module: AssemblyModule): boolean {
  if (module.realizationHints?.kvCapable === false) return false;
  if (module.realizationHints?.kvCapable) return true;
  // Default: gameplay-core without runtime-heavy hints is KV capable
  return module.role === "gameplay-core" && !isRuntimeHeavy(module);
}

/**
 * Find matching rule for module patterns and role
 */
function findMatchingRule(
  module: AssemblyModule
): Dota2RealizationRule | null {
  // First try exact pattern match
  for (const rule of DOTA2_REALIZATION_RULES) {
    const hasAllPatterns = rule.patterns.every((p) =>
      module.selectedPatterns.includes(p)
    );
    if (hasAllPatterns && rule.patterns.length > 0) {
      return rule;
    }
  }
  return null;
}

/**
 * Determine realization type from module structure
 */
function inferRealizationType(module: AssemblyModule): RealizationType {
  // UI surface always goes to UI
  if (hasUIRequirement(module)) {
    return "ui";
  }

  // Check explicit hints first
  if (module.realizationHints) {
    if (module.realizationHints.runtimeHeavy && module.realizationHints.kvCapable) {
      return "kv+ts";
    }
    if (module.realizationHints.runtimeHeavy) {
      return "ts";
    }
    if (module.realizationHints.kvCapable) {
      return "kv";
    }
  }

  // Pattern-based inference
  const hasUIPatterns = module.selectedPatterns.some((p) => p.startsWith("ui."));
  if (hasUIPatterns) {
    return "ui";
  }

  const hasEffectPatterns = module.selectedPatterns.some((p) => p.startsWith("effect."));
  const hasInputPattern = module.selectedPatterns.includes("input.key_binding");
  const hasRulePattern = module.selectedPatterns.includes("rule.selection_flow");

  // Hybrid: effect patterns with input/rules suggest kv+ts
  if (hasEffectPatterns && (hasInputPattern || hasRulePattern)) {
    return "kv+ts";
  }

  // Runtime heavy patterns
  if (hasRulePattern || hasInputPattern) {
    return "ts";
  }

  // Effect patterns without runtime hints default to kv+ts (conservative)
  if (hasEffectPatterns) {
    return "kv+ts";
  }

  // Default to ts for unknown cases
  return "ts";
}

/**
 * Determine host targets from realization type
 */
function getHostTargets(realizationType: RealizationType): string[] {
  switch (realizationType) {
    case "kv":
      return ["ability_kv"];
    case "ts":
      return ["server_ts"];
    case "ui":
      return ["panorama_tsx", "panorama_less"];
    // T143: Added lua host target
    case "lua":
      return ["lua_ability"];
    // T143-R1: Added kv+lua host targets
    case "kv+lua":
      return ["lua_ability", "ability_kv"];
    case "kv+ts":
      return ["ability_kv", "server_ts"];
    case "shared-ts":
      return ["shared_ts"];
    case "bridge-only":
      return ["bridge_refresh"];
    default:
      return ["server_ts"];
  }
}

/**
 * T148: Generate explicit outputs[] from realizationType and hostTargets
 * This maintains backward compatibility while enabling the new outputs[] model
 */
function generateOutputs(
  realizationType: RealizationType,
  hostTargets: string[],
  rationale: string[]
): HostRealizationOutput[] {
  const outputs: HostRealizationOutput[] = [];

  // Map hostTargets to output kinds
  for (const target of hostTargets) {
    let kind: HostRealizationOutput["kind"];

    if (target.startsWith("lua_")) {
      kind = "lua";
    } else if (target.startsWith("ability_kv") || target.endsWith("_kv")) {
      kind = "kv";
    } else if (target.startsWith("server_ts") || target.startsWith("shared_ts")) {
      kind = "ts";
    } else if (target.startsWith("panorama_")) {
      kind = "ui";
    } else if (target.startsWith("bridge_")) {
      kind = "bridge";
    } else {
      // Default fallback - treat as ts
      kind = "ts";
    }

    outputs.push({
      kind,
      target,
      rationale,
    });
  }

  return outputs;
}

/**
 * Infer role from selected patterns
 */
function inferRole(module: AssemblyModule): RealizationRole {
  if (module.role) return module.role;

  const hasUIPatterns = module.selectedPatterns.some((p) => p.startsWith("ui."));
  if (hasUIPatterns) {
    return "ui-surface";
  }

  const hasSharedPatterns = module.selectedPatterns.includes("data.weighted_pool");
  if (hasSharedPatterns) {
    return "shared-support";
  }

  return "gameplay-core";
}

/**
 * Build rationale based on decision factors
 */
function buildRationale(
  module: AssemblyModule,
  realizationType: RealizationType
): string[] {
  const rationale: string[] = [];

  if (realizationType === "kv") {
    rationale.push("static ability properties fit host-native KV configuration");
  } else if (realizationType === "ts") {
    rationale.push("runtime logic requires TypeScript implementation");
  } else if (realizationType === "ui") {
    rationale.push("UI surface requires Panorama output");
  // T143: Added lua rationale
  } else if (realizationType === "lua") {
    rationale.push("ability_lua system requires Lua implementation");
  // T143-R1: Added kv+lua rationale
  } else if (realizationType === "kv+lua") {
    rationale.push("ability_lua runtime + kv static shell produces two routed outputs");
  } else if (realizationType === "kv+ts") {
    rationale.push("ability shell fits static config, behavior requires runtime script");
  } else if (realizationType === "shared-ts") {
    rationale.push("shared data structure benefits from TypeScript shared output");
  } else if (realizationType === "bridge-only") {
    rationale.push("module requires only bridge registration refresh");
  }

  // Add pattern-based rationale
  module.selectedPatterns.forEach((p) => {
    if (p === "input.key_binding") {
      rationale.push("input handling is a runtime concern");
    }
    if (p === "effect.dash") {
      rationale.push("dash effect combines static config and runtime behavior");
    }
    if (p === "ui.selection_modal") {
      rationale.push("selection modal is a UI-facing surface");
    }
  });

  return rationale;
}

/**
 * Main realization function
 * Takes AssemblyPlan and produces HostRealizationPlan
 */
export function realizeDota2Host(
  assemblyPlan: AssemblyPlan,
  host: string = "dota2"
): HostRealizationPlan {
  const units: HostRealizationUnit[] = [];
  const blockers: string[] = [];
  const notes: string[] = [];

  // If no modules, create a single unit from selected patterns
  // T112-R1: This is a conservative fallback, not first-class realization
  if (!assemblyPlan.modules || assemblyPlan.modules.length === 0) {
    const allPatterns = assemblyPlan.selectedPatterns.map((p) => p.patternId);

    // T112-R1: Analyze pattern mix to make a more informed fallback decision
    const hasUI = allPatterns.some((p) => p.startsWith("ui."));
    const hasEffect = allPatterns.some((p) => p.startsWith("effect."));
    const hasData = allPatterns.some((p) => p.startsWith("data."));

    // T112-R1: Determine fallback realization type based on pattern mix
    let fallbackType: RealizationType = "ts";
    let fallbackHostTargets = ["server_ts"];
    const fallbackRationale: string[] = ["no module structure provided, using pattern-based fallback"];

    if (hasUI && !hasEffect && !hasData) {
      fallbackType = "ui";
      fallbackHostTargets = ["panorama_tsx", "panorama_less"];
      fallbackRationale.push("UI-only pattern mix detected");
    } else if (hasEffect) {
      fallbackType = "kv+ts";
      fallbackHostTargets = ["kv", "server_ts"];
      fallbackRationale.push("effect patterns detected, KV+TS hybrid");
    } else if (hasData) {
      fallbackType = "shared-ts";
      fallbackHostTargets = ["server_shared_ts"];
      fallbackRationale.push("data patterns detected, shared TypeScript");
    }

    const defaultUnit: HostRealizationUnit = {
      id: "default",
      sourceModuleId: "default",
      sourcePatternIds: allPatterns,
      role: hasUI ? "ui-surface" : "gameplay-core",
      realizationType: fallbackType,
      hostTargets: fallbackHostTargets,
      rationale: fallbackRationale,
      // T112-R1: Lower confidence for fallback
      confidence: "low",
      // T112-R1: Mark this as fallback
      blockers: ["fallback realization - no blueprint module structure"],
    };
    units.push(defaultUnit);
    notes.push("T112-R1: Realization used fallback - Blueprint had no module structure");
  } else {
    // Process each module
    for (const module of assemblyPlan.modules) {
      const matchingRule = findMatchingRule(module);

      let realizationType: RealizationType;
      let confidence: "high" | "medium" | "low";
      let hostTargets: string[];
      let rationale: string[];
      let role: RealizationRole;

      if (matchingRule) {
        realizationType = matchingRule.realizationType;
        confidence = matchingRule.confidence;
        hostTargets = matchingRule.hostTargets;
        rationale = matchingRule.rationale;
        role = matchingRule.role || inferRole(module);
      } else {
        // Infer from module structure
        role = inferRole(module);
        realizationType = inferRealizationType(module);
        confidence = realizationType === "kv" ? "low" : "medium";
        hostTargets = getHostTargets(realizationType);
        rationale = buildRationale(module, realizationType);
      }

      // T148: Generate explicit outputs[] for multi-output realization
      // This populates the new field while maintaining backward compatibility
      const outputs = generateOutputs(realizationType, hostTargets, rationale);

      // Check for blockers
      const unitBlockers: string[] = [];
      if (realizationType === "kv+ts" && !module.outputKinds.includes("server")) {
        unitBlockers.push("kv+ts realization requires server output kind");
      }

      const unit: HostRealizationUnit = {
        id: module.id,
        sourceModuleId: module.id,
        sourcePatternIds: module.selectedPatterns,
        role,
        realizationType,
        hostTargets,
        outputs,
        parameters: module.parameters,
        rationale,
        confidence,
        blockers: unitBlockers.length > 0 ? unitBlockers : undefined,
      };

      units.push(unit);

      if (unitBlockers.length > 0) {
        blockers.push(...unitBlockers.map((b) => `${module.id}: ${b}`));
      }
    }
  }

  return {
    version: "1.0",
    host,
    sourceBlueprintId: assemblyPlan.blueprintId,
    units,
    blockers,
    notes,
  };
}

/**
 * Get summary of realization for CLI display
 */
export function summarizeRealization(plan: HostRealizationPlan): string {
  const unitSummary = plan.units
    .map(
      (u) =>
        `  - ${u.id}: ${u.realizationType} (${u.confidence}) from [${u.sourcePatternIds.join(", ")}]`
    )
    .join("\n");

  return `Host Realization Plan v${plan.version} for ${plan.host}
Source: ${plan.sourceBlueprintId}

Units (${plan.units.length}):
${unitSummary}

Blockers: ${plan.blockers.length > 0 ? plan.blockers.join(", ") : "none"}
Notes: ${plan.notes.length > 0 ? plan.notes.join(", ") : "none"}
`;
}
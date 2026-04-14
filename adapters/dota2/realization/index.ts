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
  RealizationType,
  RealizationRole,
} from "../../../core/schema/types";
import {
  buildFallbackDecision,
  classifyRoleFromPatterns,
  createHostRealizer,
  inferRealizationTypeFromModule,
  summarizeRealization,
  type HostRealizationRule,
} from "../../../core/host/realization-engine.js";

/**
 * Dota2 realization policy mapping
 * Maps pattern combinations and module roles to realization types.
 */
const DOTA2_PATTERN_CLASSIFIER = {
  isUI: (pattern: string): boolean => pattern.startsWith("ui."),
  isRuntime: (pattern: string): boolean =>
    ["input.key_binding", "rule.selection_flow", "effect.dash"].includes(pattern),
  isShared: (pattern: string): boolean => pattern === "data.weighted_pool",
};

/**
 * Default rules following docs/DOTA2-HOST-REALIZATION-POLICY.md mapping table
 */
const DOTA2_REALIZATION_RULES: HostRealizationRule[] = [
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
    realizationType: "kv+lua",
    confidence: "high",
    hostTargets: ["lua_ability", "ability_kv"],
    rationale: [
      "modifier_applier uses ability_lua base class",
      "KV provides static ability definition shell",
      "Lua provides runtime ability + modifier implementation",
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

const realizeDota2 = createHostRealizer({
  host: "dota2",
  rules: DOTA2_REALIZATION_RULES,
  classifier: DOTA2_PATTERN_CLASSIFIER,
  inferRole: (module: AssemblyModule): RealizationRole =>
    classifyRoleFromPatterns(module, DOTA2_PATTERN_CLASSIFIER),
  inferRealizationType: (module: AssemblyModule): RealizationType =>
    inferRealizationTypeFromModule(module, DOTA2_PATTERN_CLASSIFIER),
  getHostTargets,
  buildRationale,
  buildFallback: (assemblyPlan: AssemblyPlan) =>
    buildFallbackDecision(assemblyPlan, {
      classifier: DOTA2_PATTERN_CLASSIFIER,
      hostTargetsByType: getHostTargets,
    }),
});

export function realizeDota2Host(
  assemblyPlan: AssemblyPlan,
  host: string = "dota2"
): HostRealizationPlan {
  const plan = realizeDota2(assemblyPlan);
  return host === "dota2" ? plan : { ...plan, host };
}

export { summarizeRealization };

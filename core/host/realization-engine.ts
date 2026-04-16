import type {
  AssemblyModule,
  AssemblyPlan,
  HostRealizationPlan,
  HostRealizationUnit,
  RealizationRole,
  RealizationType,
} from "../schema/types.js";
import {
  generateOutputs,
  hasUIRequirement,
  isKVCapable,
  isRuntimeHeavy,
  type HostPatternClassifier,
} from "./realization-utils.js";
import {
  patternHasCapabilityPrefix,
  patternSupportsSemanticOutput,
} from "../patterns/canonical-patterns.js";

export interface HostRealizationRule {
  patterns: string[];
  role?: RealizationRole;
  realizationType: RealizationType;
  confidence: "high" | "medium" | "low";
  hostTargets: string[];
  rationale: string[];
}

export interface HostFallbackDecision {
  realizationType: RealizationType;
  hostTargets: string[];
  rationale: string[];
  role: RealizationRole;
  confidence?: "high" | "medium" | "low";
  blockers?: string[];
}

export interface HostRealizationEngineConfig {
  host: string;
  rules: HostRealizationRule[];
  classifier?: HostPatternClassifier;
  inferRole: (module: AssemblyModule) => RealizationRole;
  inferRealizationType: (module: AssemblyModule) => RealizationType;
  getHostTargets: (realizationType: RealizationType) => string[];
  buildRationale: (
    module: AssemblyModule,
    realizationType: RealizationType
  ) => string[];
  buildFallback?: (assemblyPlan: AssemblyPlan) => HostFallbackDecision;
}

export function findMatchingRule(
  module: AssemblyModule,
  rules: HostRealizationRule[]
): HostRealizationRule | null {
  for (const rule of rules) {
    if (rule.role && module.role && rule.role !== module.role) {
      continue;
    }
    const hasAllPatterns = rule.patterns.every((pattern) =>
      module.selectedPatterns.includes(pattern)
    );
    if (hasAllPatterns && rule.patterns.length > 0) {
      return rule;
    }
  }
  return null;
}

export function createHostRealizer(config: HostRealizationEngineConfig) {
  return function realizeHost(assemblyPlan: AssemblyPlan): HostRealizationPlan {
    const units: HostRealizationUnit[] = [];
    const blockers: string[] = [];
    const notes: string[] = [];

    if (!assemblyPlan.modules || assemblyPlan.modules.length === 0) {
      const fallback = config.buildFallback?.(assemblyPlan);
      if (fallback) {
        units.push({
          id: "default",
          sourceModuleId: "default",
          sourcePatternIds: assemblyPlan.selectedPatterns.map((p) => p.patternId),
          role: fallback.role,
          realizationType: fallback.realizationType,
          hostTargets: fallback.hostTargets,
          outputs: generateOutputs(
            fallback.hostTargets,
            fallback.rationale,
            config.classifier
          ),
          rationale: fallback.rationale,
          confidence: fallback.confidence || "low",
          blockers: fallback.blockers,
        });
        notes.push("fallback realization - no blueprint module structure");
      }

      return {
        version: "1.0",
        host: config.host,
        sourceBlueprintId: assemblyPlan.blueprintId,
        units,
        blockers,
        notes,
      };
    }

    for (const module of assemblyPlan.modules) {
      const matchingRule = findMatchingRule(module, config.rules);

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
        role = matchingRule.role || config.inferRole(module);
      } else {
        role = config.inferRole(module);
        realizationType = config.inferRealizationType(module);
        confidence = realizationType === "kv" ? "low" : "medium";
        hostTargets = config.getHostTargets(realizationType);
        rationale = config.buildRationale(module, realizationType);
      }

      const outputs = generateOutputs(hostTargets, rationale, config.classifier);

      const unitBlockers: string[] = [];
      if (realizationType === "kv+ts" && !module.outputKinds.includes("server")) {
        unitBlockers.push("kv+ts realization requires server output kind");
      }

      units.push({
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
      });

      if (unitBlockers.length > 0) {
        blockers.push(...unitBlockers.map((blocker) => `${module.id}: ${blocker}`));
      }
    }

    return {
      version: "1.0",
      host: config.host,
      sourceBlueprintId: assemblyPlan.blueprintId,
      units,
      blockers,
      notes,
    };
  };
}

export function summarizeRealization(plan: HostRealizationPlan): string {
  const unitSummary = plan.units
    .map(
      (unit) =>
        `  - ${unit.id}: ${unit.realizationType} (${unit.confidence}) from [${unit.sourcePatternIds.join(", ")}]`
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

export function classifyRoleFromPatterns(
  module: AssemblyModule,
  classifier?: HostPatternClassifier
): RealizationRole {
  if (module.role) return module.role;

  if (module.selectedPatterns.some((pattern) => classifier?.isUI?.(pattern))) {
    return "ui-surface";
  }

  if (module.selectedPatterns.some((pattern) => classifier?.isShared?.(pattern))) {
    return "shared-support";
  }

  return "gameplay-core";
}

export function inferRealizationTypeFromModule(
  module: AssemblyModule,
  classifier?: HostPatternClassifier
): RealizationType {
  const preferredFamilies = module.selectedPatterns
    .map((pattern) => classifier?.getPreferredFamily?.(pattern))
    .filter((family): family is string => !!family);

  if (preferredFamilies.includes("ui-surface")) {
    return "ui";
  }

  if (preferredFamilies.includes("runtime-shared")) {
    return "shared-ts";
  }

  if (preferredFamilies.includes("bridge-support")) {
    return "bridge-only";
  }

  if (preferredFamilies.includes("modifier-runtime")) {
    const hasLuaTarget =
      module.outputs?.some((output) => output.kind === "lua") ||
      module.selectedPatterns.some((pattern) => patternSupportsSemanticOutput(pattern, "host.runtime.lua"));
    return hasLuaTarget ? "kv+lua" : "kv+ts";
  }

  if (preferredFamilies.includes("composite-static-runtime")) {
    const hasLuaTarget = module.outputs?.some((output) => output.kind === "lua");
    return hasLuaTarget ? "kv+lua" : "kv+ts";
  }

  if (preferredFamilies.includes("runtime-primary")) {
    return "ts";
  }

  if (hasUIRequirement(module)) {
    return "ui";
  }

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

  const hasUIPatterns = module.selectedPatterns.some((pattern) =>
    classifier?.isUI?.(pattern)
  );
  if (hasUIPatterns) {
    return "ui";
  }

  const hasEffectPatterns = module.selectedPatterns.some(
    (pattern) =>
      patternHasCapabilityPrefix(pattern, "effect.") ||
      patternSupportsSemanticOutput(pattern, "host.config.kv") ||
      patternSupportsSemanticOutput(pattern, "host.runtime.lua")
  );
  const hasRuntimePatterns = module.selectedPatterns.some((pattern) =>
    classifier?.isRuntime?.(pattern)
  );

  if (hasEffectPatterns && hasRuntimePatterns) {
    return "kv+ts";
  }

  if (hasRuntimePatterns) {
    return "ts";
  }

  if (hasEffectPatterns) {
    return "kv+ts";
  }

  return "ts";
}

export function buildFallbackDecision(
  assemblyPlan: AssemblyPlan,
  params: {
    classifier?: HostPatternClassifier;
    hostTargetsByType: (realizationType: RealizationType) => string[];
  }
): HostFallbackDecision {
  const allPatterns = assemblyPlan.selectedPatterns.map((pattern) => pattern.patternId);
  const hasUI = allPatterns.some((pattern) => params.classifier?.isUI?.(pattern));
  const hasEffect = allPatterns.some(
    (pattern) =>
      patternHasCapabilityPrefix(pattern, "effect.") ||
      patternSupportsSemanticOutput(pattern, "host.config.kv") ||
      patternSupportsSemanticOutput(pattern, "host.runtime.lua")
  );
  const hasData = allPatterns.some((pattern) => params.classifier?.isShared?.(pattern));

  let realizationType: RealizationType = "ts";
  let role: RealizationRole = hasUI ? "ui-surface" : "gameplay-core";
  const rationale: string[] = ["no module structure provided, using pattern-based fallback"];

  if (hasUI && !hasEffect && !hasData) {
    realizationType = "ui";
    rationale.push("UI-only pattern mix detected");
  } else if (hasEffect) {
    realizationType = "kv+ts";
    rationale.push("effect patterns detected, hybrid runtime realization");
  } else if (hasData) {
    realizationType = "shared-ts";
    role = "shared-support";
    rationale.push("data/shared patterns detected");
  }

  return {
    realizationType,
    hostTargets: params.hostTargetsByType(realizationType),
    rationale,
    role,
    confidence: "low",
    blockers: ["fallback realization - no blueprint module structure"],
  };
}

export { hasUIRequirement, isRuntimeHeavy, isKVCapable };

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
import {
  getCanonicalPatternMeta,
  getPatternPreferredFamily,
} from "../../../core/patterns/canonical-patterns.js";

/**
 * Dota2 realization policy mapping
 * Maps pattern combinations and module roles to realization types.
 */
const DOTA2_PATTERN_CLASSIFIER = {
  isUI: (pattern: string): boolean =>
    getPatternPreferredFamily(pattern) === "ui-surface" ||
    getCanonicalPatternMeta(pattern)?.semanticOutputs?.some((output) => output.includes("ui.surface")) === true,
  isRuntime: (pattern: string): boolean =>
    ["runtime-primary", "modifier-runtime", "composite-static-runtime"].includes(
      getPatternPreferredFamily(pattern) || ""
    ),
  isShared: (pattern: string): boolean =>
    getPatternPreferredFamily(pattern) === "runtime-shared" ||
    getCanonicalPatternMeta(pattern)?.semanticOutputs?.some((output) => output.includes("shared.runtime")) === true,
  getPreferredFamily: (pattern: string): string | undefined => getPatternPreferredFamily(pattern),
  outputKindToOutput: (target: string) => {
    switch (target) {
      case "ability_kv":
        return "kv";
      case "panorama_tsx":
      case "panorama_less":
        return "ui";
      case "shared_ts":
      case "server_ts":
      case "modifier_ts":
        return "ts";
      case "lua_ability":
        return "lua";
      case "bridge_refresh":
        return "bridge";
      default:
        return undefined;
    }
  },
};

/**
 * Dota2 keeps no pattern-id-led common-path rules here.
 * Real exceptions should be added narrowly when metadata/family inference is insufficient.
 */
const DOTA2_REALIZATION_RULES: HostRealizationRule[] = [];

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
  const preferredFamilies = module.selectedPatterns
    .map((pattern) => getPatternPreferredFamily(pattern))
    .filter((family): family is string => !!family);
  const uniqueFamilies = Array.from(new Set(preferredFamilies));

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

  if (uniqueFamilies.length > 0) {
    rationale.push(`family fit: ${uniqueFamilies.join(", ")}`);
  }

  if (module.outputs?.some((output) => output.kind === "kv")) {
    rationale.push("routed outputs require KV generation");
  }
  if (module.outputs?.some((output) => output.kind === "lua")) {
    rationale.push("routed outputs require Lua generation");
  }
  if (module.outputs?.some((output) => output.kind === "ui")) {
    rationale.push("routed outputs require Panorama UI generation");
  }

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

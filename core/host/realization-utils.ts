import type {
  AssemblyModule,
  HostRealizationOutput,
} from "../schema/types.js";

export interface HostPatternClassifier {
  isUI?: (pattern: string) => boolean;
  isRuntime?: (pattern: string) => boolean;
  isShared?: (pattern: string) => boolean;
  outputKindToOutput?: (
    target: string
  ) => HostRealizationOutput["kind"] | undefined;
}

export function hasUIRequirement(module: AssemblyModule): boolean {
  if (module.outputKinds.includes("ui")) return true;
  if (module.realizationHints?.uiRequired) return true;
  return false;
}

export function isRuntimeHeavy(
  module: AssemblyModule,
  classifier?: HostPatternClassifier
): boolean {
  if (module.realizationHints?.runtimeHeavy) return true;
  if (!classifier?.isRuntime) return false;
  return module.selectedPatterns.some((pattern) => classifier.isRuntime?.(pattern));
}

export function isKVCapable(
  module: AssemblyModule,
  classifier?: HostPatternClassifier
): boolean {
  if (module.realizationHints?.kvCapable === false) return false;
  if (module.realizationHints?.kvCapable) return true;
  return module.role === "gameplay-core" && !isRuntimeHeavy(module, classifier);
}

export function generateOutputs(
  hostTargets: string[],
  rationale: string[],
  classifier?: HostPatternClassifier
): HostRealizationOutput[] {
  return hostTargets.map((target) => {
    const kind =
      classifier?.outputKindToOutput?.(target) ??
      defaultTargetToOutputKind(target);

    return {
      kind,
      target,
      rationale,
    };
  });
}

function defaultTargetToOutputKind(
  target: string
): HostRealizationOutput["kind"] {
  if (target.startsWith("lua_")) return "lua";
  if (target.startsWith("ability_kv") || target.endsWith("_kv")) return "kv";
  if (target.startsWith("server_ts") || target.startsWith("shared_ts")) return "ts";
  if (target.startsWith("panorama_")) return "ui";
  if (target.startsWith("bridge_")) return "bridge";
  return "ts";
}

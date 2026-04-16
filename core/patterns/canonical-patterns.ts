import {
  dota2Patterns,
  getPatternMeta as getDota2PatternMeta,
} from "../../adapters/dota2/patterns/index";
import type { PatternHostBinding, PatternMeta } from "./index.js";

export type PatternRouteKind = "bridge" | "kv" | "lua" | "ts" | "ui";

export const CANONICAL_AVAILABLE_PATTERNS = new Set(
  dota2Patterns.map(p => p.id)
);

export const CANONICAL_PATTERN_METADATA = new Map<string, PatternMeta>(
  dota2Patterns.map((pattern) => [pattern.id, pattern])
);

export function isCanonicalPatternAvailable(patternId: string): boolean {
  return CANONICAL_AVAILABLE_PATTERNS.has(patternId);
}

export function getCanonicalPatternMeta(patternId: string): PatternMeta | undefined {
  return CANONICAL_PATTERN_METADATA.get(patternId) || getDota2PatternMeta(patternId);
}

export function getCanonicalPatterns(): PatternMeta[] {
  return dota2Patterns;
}

export function getPatternsByCapability(capability: string): PatternMeta[] {
  return dota2Patterns.filter((pattern) => pattern.capabilities.includes(capability));
}

export function getPatternsByTrait(trait: string): PatternMeta[] {
  return dota2Patterns.filter((pattern) => pattern.traits?.includes(trait));
}

export function getPatternHostBinding(
  patternId: string,
  hostId?: string
): PatternHostBinding | undefined {
  const bindings = getCanonicalPatternMeta(patternId)?.hostBindings;
  if (!bindings || bindings.length === 0) {
    return undefined;
  }

  if (hostId) {
    return bindings.find((binding) => binding.hostId === hostId);
  }

  return bindings.length === 1 ? bindings[0] : undefined;
}

export function getPatternPreferredFamily(patternId: string, hostId?: string): string | undefined {
  return getPatternHostBinding(patternId, hostId)?.preferredFamily;
}

export function getPatternAllowedFamilies(patternId: string, hostId?: string): string[] {
  return getPatternHostBinding(patternId, hostId)?.allowedFamilies || [];
}

export function patternUsesPreferredFamily(
  patternId: string,
  family: string,
  hostId: string = "dota2"
): boolean {
  return getPatternPreferredFamily(patternId, hostId) === family;
}

export function patternSupportsSemanticOutput(patternId: string, signal: string): boolean {
  const semanticOutputs = getCanonicalPatternMeta(patternId)?.semanticOutputs || [];
  const normalizedSignal = normalizeSignal(signal);

  return semanticOutputs.some((output) => {
    const normalizedOutput = normalizeSignal(output);
    return (
      normalizedOutput === normalizedSignal ||
      normalizedOutput.includes(normalizedSignal) ||
      normalizedSignal.includes(normalizedOutput)
    );
  });
}

export function patternSupportsCapability(patternId: string, capability: string): boolean {
  return getCanonicalPatternMeta(patternId)?.capabilities.includes(capability) ?? false;
}

export function patternHasCapabilityPrefix(patternId: string, prefix: string): boolean {
  return (
    getCanonicalPatternMeta(patternId)?.capabilities.some((capability) =>
      capability.startsWith(prefix)
    ) ?? false
  );
}

export function patternEmitsOutputType(
  patternId: string,
  outputType: string,
  hostId: string = "dota2"
): boolean {
  return getPatternHostBinding(patternId, hostId)?.outputTypes.includes(outputType) ?? false;
}

export function getPatternRouteKinds(
  patternId: string,
  hostId: string = "dota2"
): PatternRouteKind[] {
  const routeKinds = new Set<PatternRouteKind>();
  const binding = getPatternHostBinding(patternId, hostId);
  const outputTypes = binding?.outputTypes || [];
  const preferredFamily = binding?.preferredFamily;

  for (const outputType of outputTypes) {
    const routeKind = mapOutputTypeToRouteKind(outputType);
    if (routeKind) {
      routeKinds.add(routeKind);
    }
  }

  if (patternSupportsSemanticOutput(patternId, "ui.surface") || preferredFamily === "ui-surface") {
    routeKinds.add("ui");
  }
  if (patternSupportsSemanticOutput(patternId, "host.config.kv")) {
    routeKinds.add("kv");
  }
  if (patternSupportsSemanticOutput(patternId, "host.runtime.lua")) {
    routeKinds.add("lua");
  }
  if (
    patternSupportsSemanticOutput(patternId, "server.runtime") ||
    patternSupportsSemanticOutput(patternId, "shared.runtime") ||
    ["runtime-primary", "runtime-shared", "modifier-runtime", "composite-static-runtime"].includes(
      preferredFamily || ""
    )
  ) {
    routeKinds.add("ts");
  }
  if (patternSupportsSemanticOutput(patternId, "bridge") || preferredFamily === "bridge-support") {
    routeKinds.add("bridge");
  }

  return Array.from(routeKinds);
}

function mapOutputTypeToRouteKind(outputType: string): PatternRouteKind | undefined {
  switch (outputType) {
    case "kv":
    case "json":
      return "kv";
    case "lua":
      return "lua";
    case "tsx":
    case "less":
      return "ui";
    case "typescript":
      return "ts";
    default:
      return undefined;
  }
}

function normalizeSignal(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ".");
}

export const CORE_PATTERN_IDS = {
  INPUT_KEY_BINDING: "input.key_binding",
  DATA_WEIGHTED_POOL: "data.weighted_pool",
  RULE_SELECTION_FLOW: "rule.selection_flow",
  EFFECT_DASH: "effect.dash",
  EFFECT_MODIFIER_APPLIER: "effect.modifier_applier",
  EFFECT_RESOURCE_CONSUME: "effect.resource_consume",
  RESOURCE_BASIC_POOL: "resource.basic_pool",
  UI_SELECTION_MODAL: "ui.selection_modal",
  UI_KEY_HINT: "ui.key_hint",
  UI_RESOURCE_BAR: "ui.resource_bar",
  DOTA2_SHORT_TIME_BUFF: "dota2.short_time_buff",
} as const;

export type CorePatternId = typeof CORE_PATTERN_IDS[keyof typeof CORE_PATTERN_IDS];

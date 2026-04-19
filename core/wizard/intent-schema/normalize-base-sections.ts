import type {
  HostDescriptor,
  IntentActor,
  IntentConstraints,
  IntentInvariant,
  IntentRequirements,
  UserRequestSummary,
} from "../../schema/types.js";
import { isOneOf, normalizeStringArray } from "./shared.js";

export function normalizeHost(
  host: Partial<HostDescriptor> | undefined,
  fallback: HostDescriptor,
): HostDescriptor {
  return {
    kind: typeof host?.kind === "string" && host.kind.trim() ? host.kind : fallback.kind,
    projectRoot: typeof host?.projectRoot === "string" ? host.projectRoot : fallback.projectRoot,
    capabilities: Array.isArray(host?.capabilities)
      ? host.capabilities.filter((value): value is string => typeof value === "string")
      : fallback.capabilities,
  };
}

export function normalizeRequest(
  request: Partial<UserRequestSummary> | undefined,
  rawText: string,
): UserRequestSummary {
  return {
    rawPrompt: rawText,
    goal: typeof request?.goal === "string" && request.goal.trim() ? request.goal : rawText,
    nameHint: typeof request?.nameHint === "string" ? request.nameHint : undefined,
  };
}

export function normalizeRequirements(
  requirements: Partial<IntentRequirements> | undefined,
): IntentRequirements {
  return {
    functional: normalizeStringArray(requirements?.functional) || [],
    typed: Array.isArray(requirements?.typed)
      ? requirements.typed
          .filter(
            (item): item is NonNullable<IntentRequirements["typed"]>[number] =>
              typeof item === "object" && item !== null,
          )
          .map((item, index) => ({
            id: typeof item.id === "string" && item.id.trim() ? item.id : `req_${index}`,
            kind: isOneOf(item.kind, ["trigger", "state", "rule", "effect", "resource", "ui", "integration", "generic"])
              ? item.kind
              : "generic",
            summary:
              typeof item.summary === "string" && item.summary.trim()
                ? item.summary
                : "Unspecified requirement",
            actors: normalizeStringArray(item.actors),
            inputs: normalizeStringArray(item.inputs),
            outputs: normalizeStringArray(item.outputs),
            invariants: normalizeStringArray(item.invariants),
            parameters:
              typeof item.parameters === "object" && item.parameters !== null
                ? item.parameters
                : undefined,
            priority: isOneOf(item.priority, ["must", "should", "could"]) ? item.priority : undefined,
          }))
      : undefined,
    interactions: normalizeStringArray(requirements?.interactions),
    dataNeeds: normalizeStringArray(requirements?.dataNeeds),
    outputs: normalizeStringArray(requirements?.outputs),
  };
}

export function normalizeActors(actors: unknown): IntentActor[] | undefined {
  if (!Array.isArray(actors)) {
    return undefined;
  }

  const normalized = actors
    .filter((item): item is IntentActor => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `actor_${index}`,
      role: typeof item.role === "string" && item.role.trim() ? item.role : "unknown",
      label: typeof item.label === "string" && item.label.trim() ? item.label : `Actor ${index + 1}`,
    }));

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeConstraints(
  constraints: Partial<IntentConstraints> | undefined,
): IntentConstraints {
  return {
    requiredPatterns: undefined,
    forbiddenPatterns: undefined,
    hostConstraints: normalizeStringArray(constraints?.hostConstraints),
    nonFunctional: normalizeStringArray(constraints?.nonFunctional),
  };
}

export function normalizeInvariants(invariants: unknown): IntentInvariant[] | undefined {
  if (!Array.isArray(invariants)) {
    return undefined;
  }

  const normalized = invariants
    .filter((item): item is IntentInvariant => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `invariant_${index}`,
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified invariant",
      severity: isOneOf(item.severity, ["error", "warning"]) ? item.severity : "warning",
    }));

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeModuleSafeParameters(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      result[key] = entry;
      continue;
    }

    if (
      Array.isArray(entry) &&
      entry.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
    ) {
      result[key] = entry;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizeClassificationConfidence(value: unknown): "low" | "medium" | "high" {
  return isOneOf(value, ["low", "medium", "high"]) ? value : "medium";
}

import type {
  IntentCompositionContract,
  IntentEffectContract,
  IntentFlowContract,
  IntentInteractionContract,
  IntentIntegrationContract,
  IntentOutcomeContract,
  IntentSpatialContract,
  IntentStateContract,
  IntentTargetingContract,
  IntentTimingContract,
} from "../../schema/types.js";
import { isOneOf, normalizePositiveInteger, normalizePositiveNumber, normalizeStringArray } from "./shared.js";

export function normalizeInteraction(
  interaction: Partial<IntentInteractionContract> | undefined,
): IntentInteractionContract | undefined {
  if (!interaction || !Array.isArray(interaction.activations)) {
    return undefined;
  }

  const activations = interaction.activations
    .filter(
      (item): item is NonNullable<IntentInteractionContract["activations"]>[number] =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      actor: typeof item.actor === "string" && item.actor.trim() ? item.actor : undefined,
      kind: isOneOf(item.kind, ["key", "mouse", "event", "passive", "system"]) ? item.kind : "event",
      input: typeof item.input === "string" && item.input.trim() ? item.input : undefined,
      phase: isOneOf(item.phase, ["press", "release", "hold", "enter", "occur"]) ? item.phase : undefined,
      repeatability: isOneOf(item.repeatability, ["one-shot", "repeatable", "toggle", "persistent"])
        ? item.repeatability
        : undefined,
      confirmation: isOneOf(item.confirmation, ["none", "implicit", "explicit"])
        ? item.confirmation
        : undefined,
    }))
    .filter((item) => !!item.input || item.kind === "passive" || item.kind === "system" || item.kind === "event");

  return activations.length > 0 ? { activations } : undefined;
}

export function normalizeTargeting(
  targeting: Partial<IntentTargetingContract> | undefined,
): IntentTargetingContract | undefined {
  if (!targeting) {
    return undefined;
  }

  const normalized: IntentTargetingContract = {
    subject: isOneOf(targeting.subject, ["self", "ally", "enemy", "unit", "point", "area", "direction", "global"])
      ? targeting.subject
      : undefined,
    selector: isOneOf(targeting.selector, ["cursor", "current-target", "nearest", "random", "none"])
      ? targeting.selector
      : undefined,
    teamScope: isOneOf(targeting.teamScope, ["self", "ally", "enemy", "any"])
      ? targeting.teamScope
      : undefined,
  };

  return normalized.subject || normalized.selector || normalized.teamScope ? normalized : undefined;
}

export function normalizeTiming(
  timing: Partial<IntentTimingContract> | undefined,
): IntentTimingContract | undefined {
  if (!timing) {
    return undefined;
  }

  const normalized: IntentTimingContract = {
    cooldownSeconds: normalizePositiveNumber(timing.cooldownSeconds),
    delaySeconds: normalizePositiveNumber(timing.delaySeconds),
    intervalSeconds: normalizePositiveNumber(timing.intervalSeconds),
    duration:
      timing.duration && isOneOf(timing.duration.kind, ["instant", "timed", "persistent"])
        ? {
            kind: timing.duration.kind,
            seconds: normalizePositiveNumber(timing.duration.seconds),
          }
        : undefined,
  };

  return normalized.cooldownSeconds !== undefined ||
    normalized.delaySeconds !== undefined ||
    normalized.intervalSeconds !== undefined ||
    normalized.duration !== undefined
    ? normalized
    : undefined;
}

export function normalizeSpatial(
  spatial: Partial<IntentSpatialContract> | undefined,
): IntentSpatialContract | undefined {
  if (!spatial) {
    return undefined;
  }

  const normalized: IntentSpatialContract = {
    motion:
      spatial.motion && isOneOf(spatial.motion.kind, ["dash", "teleport", "knockback", "none"])
      && spatial.motion.kind !== "none"
        ? {
            kind: spatial.motion.kind,
            distance: normalizePositiveNumber(spatial.motion.distance),
            direction: isOneOf(spatial.motion.direction, ["cursor", "facing", "target", "fixed"])
              ? spatial.motion.direction
              : undefined,
          }
        : undefined,
    area:
      spatial.area && isOneOf(spatial.area.shape, ["circle", "line", "cone"])
      && (
        normalizePositiveNumber(spatial.area.radius) !== undefined ||
        normalizePositiveNumber(spatial.area.length) !== undefined ||
        normalizePositiveNumber(spatial.area.width) !== undefined
      )
        ? {
            shape: spatial.area.shape,
            radius: normalizePositiveNumber(spatial.area.radius),
            length: normalizePositiveNumber(spatial.area.length),
            width: normalizePositiveNumber(spatial.area.width),
          }
        : undefined,
    emission:
      spatial.emission && isOneOf(spatial.emission.kind, ["projectile", "pulse", "wave", "none"])
      && spatial.emission.kind !== "none"
        ? {
            kind: spatial.emission.kind,
            speed: normalizePositiveNumber(spatial.emission.speed),
            count: normalizePositiveInteger(spatial.emission.count),
          }
        : undefined,
  };

  return normalized.motion || normalized.area || normalized.emission ? normalized : undefined;
}

export function normalizeStateModel(
  stateModel: Partial<IntentStateContract> | undefined,
): IntentStateContract | undefined {
  if (!stateModel || !Array.isArray(stateModel.states)) {
    return undefined;
  }

  const states = stateModel.states
    .filter(
      (item): item is IntentStateContract["states"][number] =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `state_${index}`,
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified state",
      owner: isOneOf(item.owner, ["feature", "session", "external"]) ? item.owner : undefined,
      lifetime: isOneOf(item.lifetime, ["ephemeral", "session", "persistent"]) ? item.lifetime : undefined,
      kind: isOneOf(item.kind, ["scalar", "counter", "collection", "inventory", "selection-session", "generic"])
        ? item.kind
        : undefined,
      mutationMode: isOneOf(item.mutationMode, ["create", "update", "consume", "expire", "remove"])
        ? item.mutationMode
        : undefined,
    }));

  return states.length > 0 ? { states } : undefined;
}

export function normalizeFlow(
  flow: Partial<IntentFlowContract> | undefined,
  rawText: string,
): IntentFlowContract | undefined {
  if (!flow) {
    return undefined;
  }

  const loweredPrompt = rawText.toLowerCase();

  return {
    triggerSummary: typeof flow.triggerSummary === "string" ? flow.triggerSummary : undefined,
    sequence: normalizeStringArray(flow.sequence),
    supportsCancel: flow.supportsCancel === true && mentionsCancelSemantics(loweredPrompt),
    supportsRetry: flow.supportsRetry === true && mentionsRetrySemantics(loweredPrompt),
    requiresConfirmation: flow.requiresConfirmation === true && mentionsConfirmationSemantics(loweredPrompt),
  };
}

export function normalizeEffects(
  effects: Partial<IntentEffectContract> | undefined,
): IntentEffectContract | undefined {
  if (!effects) {
    return undefined;
  }

  const operations = Array.isArray(effects.operations)
    ? effects.operations.filter((item): item is IntentEffectContract["operations"][number] =>
        isOneOf(item, ["apply", "remove", "stack", "expire", "consume", "restore"]),
      )
    : [];

  if (operations.length === 0 && !effects.targets && !effects.durationSemantics) {
    return undefined;
  }

  return {
    operations,
    targets: normalizeStringArray(effects.targets),
    durationSemantics: isOneOf(effects.durationSemantics, ["instant", "timed", "persistent"])
      ? effects.durationSemantics
      : undefined,
  };
}

export function normalizeOutcomes(
  outcomes: Partial<IntentOutcomeContract> | undefined,
): IntentOutcomeContract | undefined {
  if (!outcomes) {
    return undefined;
  }

  const operations = Array.isArray(outcomes.operations)
    ? outcomes.operations.filter((item): item is NonNullable<IntentOutcomeContract["operations"]>[number] =>
        isOneOf(item, [
          "apply-effect",
          "move",
          "spawn",
          "grant-feature",
          "update-state",
          "consume-resource",
          "emit-event",
        ]),
      )
    : [];

  return operations.length > 0 ? { operations } : undefined;
}

export function normalizeComposition(
  composition: Partial<IntentCompositionContract> | undefined,
): IntentCompositionContract | undefined {
  if (!composition || !Array.isArray(composition.dependencies)) {
    return undefined;
  }

  const dependencies = composition.dependencies
    .filter(
      (item): item is NonNullable<IntentCompositionContract["dependencies"]>[number] =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      kind: isOneOf(item.kind, ["same-feature", "cross-feature", "external-system"])
        ? item.kind
        : "external-system",
      relation: isOneOf(item.relation, ["reads", "writes", "triggers", "grants", "syncs-with"])
        ? item.relation
        : "reads",
      target: typeof item.target === "string" && item.target.trim() ? item.target : undefined,
      required: item.required === true,
    }));

  return dependencies.length > 0 ? { dependencies } : undefined;
}

export function normalizeIntegrations(
  integrations: Partial<IntentIntegrationContract> | undefined,
): IntentIntegrationContract | undefined {
  if (!integrations || !Array.isArray(integrations.expectedBindings)) {
    return undefined;
  }

  const expectedBindings = integrations.expectedBindings
    .filter(
      (item): item is IntentIntegrationContract["expectedBindings"][number] =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `binding_${index}`,
      kind: isOneOf(item.kind, ["entry-point", "event-hook", "bridge-point", "ui-surface", "data-source"])
        ? item.kind
        : "entry-point",
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified binding",
      required: item.required === true,
    }));

  return expectedBindings.length > 0 ? { expectedBindings } : undefined;
}

function mentionsCancelSemantics(value: string): boolean {
  return ["cancel", "dismiss", "close without", "close the modal", "cancelable", "取消", "关闭", "可取消"].some(
    (token) => value.includes(token),
  );
}

function mentionsRetrySemantics(value: string): boolean {
  return ["retry", "try again", "重试", "再次尝试"].some((token) => value.includes(token));
}

function mentionsConfirmationSemantics(value: string): boolean {
  return ["confirm", "confirmation", "double confirm", "二次确认", "确认"].some((token) =>
    value.includes(token),
  );
}

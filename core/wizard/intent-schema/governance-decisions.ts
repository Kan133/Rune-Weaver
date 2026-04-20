import type {
  HostDescriptor,
  IntentClassification,
  IntentCompositionContract,
  IntentContentModelContract,
  IntentEffectContract,
  IntentInteractionContract,
  IntentSchema,
  IntentSelectionContract,
  IntentStateContract,
  IntentTimingContract,
  NormalizedMechanics,
  UIRequirementSummary,
} from "../../schema/types.js";
import { hasReturnToPoolSignal, hasSelectionEligibilityRemovalSignal } from "./prompt-hints.js";
import { hasTrueRawFact, readRawFactValue } from "./raw-facts.js";
import type {
  IntentGovernanceDecisions,
  IntentRawFacts,
} from "./semantic-analysis.js";
import type { PromptSemanticHints } from "./shared.js";
import { isOneOf, normalizePositiveInteger } from "./shared.js";

interface DeriveIntentGovernanceDecisionsInput {
  candidate: Partial<IntentSchema>;
  rawFacts: IntentRawFacts;
  rawText: string;
  host: HostDescriptor;
  promptHints: PromptSemanticHints;
}

export function deriveIntentGovernanceDecisions(
  input: DeriveIntentGovernanceDecisionsInput,
): IntentGovernanceDecisions {
  const { candidate } = input;
  const crossSystemComposition = hasCrossSystemCompositionSemantics(candidate);
  const nonUiGameplayPresent = hasNonUiGameplaySemantics(candidate);
  const normalizedMechanics = normalizeNormalizedMechanics(candidate, input.promptHints);
  const candidateDrawEligible = isCanonicalCandidateDrawGovernanceCore(input);
  const hasUiOnly = candidate.uiRequirements?.needed === true && !nonUiGameplayPresent;
  const requestsStandaloneSystem = /system|framework|engine|系统/iu.test(input.rawText);

  let intentKind =
    typeof candidate.classification?.intentKind === "string" &&
    isOneOf(candidate.classification.intentKind, [
      "micro-feature",
      "standalone-system",
      "cross-system-composition",
      "ui-surface",
      "unknown",
    ])
      ? candidate.classification.intentKind
      : "unknown";

  if (crossSystemComposition) {
    intentKind = "cross-system-composition";
  } else if (intentKind === "cross-system-composition") {
    if (hasUiOnly) {
      intentKind = "ui-surface";
    } else if (requestsStandaloneSystem) {
      intentKind = "standalone-system";
    } else if (nonUiGameplayPresent) {
      intentKind = "micro-feature";
    } else {
      intentKind = "unknown";
    }
  } else if (candidateDrawEligible) {
    intentKind = "standalone-system";
  } else if (intentKind === "unknown" && hasUiOnly) {
    intentKind = "ui-surface";
  } else if (intentKind === "unknown" && requestsStandaloneSystem) {
    intentKind = "standalone-system";
  } else if (intentKind === "unknown" && nonUiGameplayPresent) {
    intentKind = "micro-feature";
  } else if (intentKind === "ui-surface" && nonUiGameplayPresent) {
    intentKind = "micro-feature";
  }

  return {
    intentKind: {
      code: "intent_kind",
      value: intentKind,
      confidence: "medium",
      rationaleFactCodes: [
        crossSystemComposition ? "schema.composition.has_cross_feature" : "",
        candidateDrawEligible ? "prompt.selection.candidate_pool" : "",
        nonUiGameplayPresent ? "schema.interaction.kind" : "",
      ].filter(Boolean),
    },
    normalizedMechanics: {
      code: "normalized_mechanics",
      value: normalizedMechanics,
      confidence: "medium",
      rationaleFactCodes: [
        normalizedMechanics.trigger ? "schema.interaction.kind" : "",
        normalizedMechanics.candidatePool ? "schema.selection.source" : "",
        normalizedMechanics.uiModal ? "schema.ui.surfaces" : "",
      ].filter(Boolean),
    },
    crossSystemComposition: {
      code: "cross_system_composition",
      value: crossSystemComposition,
      confidence: "high",
      rationaleFactCodes: [
        crossSystemComposition ? "schema.composition.has_cross_feature" : "",
        crossSystemComposition ? "schema.composition.has_external_system" : "",
      ].filter(Boolean),
    },
    nonUiGameplayPresent: {
      code: "non_ui_gameplay_present",
      value: nonUiGameplayPresent,
      confidence: "high",
      rationaleFactCodes: [nonUiGameplayPresent ? "schema.interaction.kind" : ""].filter(Boolean),
    },
    canonicalizationEligible: {
      code: "canonicalization_eligible",
      value: candidateDrawEligible ? ["candidate_draw_governance_core"] : [],
      confidence: candidateDrawEligible ? "high" : "medium",
      rationaleFactCodes: candidateDrawEligible
        ? [
            "prompt.selection.candidate_pool",
            "prompt.selection.player_choice",
            "prompt.selection.candidate_count",
            "schema.ui.needed",
          ]
        : [],
    },
    activationContract: {
      code: "activation_contract",
      value: buildActivationContract(candidate.interaction),
      confidence: "high",
      rationaleFactCodes: ["schema.interaction.kind", "schema.interaction.trigger_key"],
    },
    selectionContract: {
      code: "selection_contract",
      value: buildSelectionContract(candidate.selection),
      confidence: "high",
      rationaleFactCodes: ["schema.selection.source", "schema.selection.choice_mode", "schema.selection.choice_count"],
    },
    uiContract: {
      code: "ui_contract",
      value: buildUiContract(candidate.uiRequirements),
      confidence: "high",
      rationaleFactCodes: ["schema.ui.needed", "schema.ui.surfaces"],
    },
    timingContract: {
      code: "timing_contract",
      value: buildTimingContract(candidate.timing),
      confidence: "high",
      rationaleFactCodes: ["prompt.timing.cooldown_seconds", "prompt.timing.interval_seconds"],
    },
    effectContract: {
      code: "effect_contract",
      value: buildEffectContract(candidate.effects),
      confidence: "high",
      rationaleFactCodes: ["schema.effects.duration_semantics"],
    },
    outcomeContract: {
      code: "outcome_contract",
      value: buildOutcomeContract(candidate.outcomes),
      confidence: "high",
      rationaleFactCodes: ["schema.outcomes.operations"],
    },
    stateContract: {
      code: "state_contract",
      value: buildStateContract(candidate.stateModel),
      confidence: "high",
      rationaleFactCodes: ["schema.state.has_external_owner", "schema.state.has_persistent_lifetime"],
    },
    contentContract: {
      code: "content_contract",
      value: buildContentContract(candidate.contentModel),
      confidence: "high",
      rationaleFactCodes: ["schema.content.has_candidate_collection"],
    },
    compositionContract: {
      code: "composition_contract",
      value: buildCompositionContract(candidate.composition),
      confidence: "high",
      rationaleFactCodes: ["schema.composition.has_cross_feature", "schema.composition.has_external_system"],
    },
  };
}

function buildActivationContract(
  interaction: IntentInteractionContract | undefined,
) {
  const activations = interaction?.activations || [];
  return {
    interactive: activations.some(
      (activation) => activation.kind === "key" || activation.kind === "mouse",
    ),
    kinds: uniqueSortedStrings(activations.map((activation) => activation.kind)),
    inputs: uniqueSortedStrings(activations.map((activation) => activation.input)),
    phases: uniqueSortedStrings(activations.map((activation) => activation.phase)),
    repeatability: uniqueSortedStrings(activations.map((activation) => activation.repeatability)),
  };
}

function buildSelectionContract(
  selection: IntentSelectionContract | undefined,
) {
  return {
    present: Boolean(selection),
    source: selection?.source,
    choiceMode: selection?.choiceMode,
    cardinality: selection?.cardinality,
    choiceCount: selection?.choiceCount,
    repeatability: selection?.repeatability,
    duplicatePolicy: selection?.duplicatePolicy,
    commitment: selection?.commitment,
    inventory: selection?.inventory
      ? {
          enabled: selection.inventory.enabled,
          capacity: selection.inventory.capacity,
          blockDrawWhenFull: selection.inventory.blockDrawWhenFull,
          storeSelectedItems: selection.inventory.storeSelectedItems,
          presentation: selection.inventory.presentation,
        }
      : undefined,
  };
}

function buildUiContract(
  uiRequirements: UIRequirementSummary | undefined,
) {
  return {
    needed: uiRequirements?.needed === true,
    surfaces: uniqueSortedStrings(uiRequirements?.surfaces || []),
    feedbackNeeds: uniqueSortedStrings(uiRequirements?.feedbackNeeds || []),
  };
}

function buildTimingContract(
  timing: IntentTimingContract | undefined,
) {
  return {
    cooldownSeconds: timing?.cooldownSeconds,
    intervalSeconds: timing?.intervalSeconds,
    durationKind: timing?.duration?.kind,
  };
}

function buildEffectContract(
  effects: IntentEffectContract | undefined,
) {
  return {
    operations: uniqueSortedStrings((effects?.operations || []) as string[]) as IntentEffectContract["operations"] | undefined,
    targets: uniqueSortedStrings(effects?.targets || []),
    durationSemantics: effects?.durationSemantics,
  };
}

function buildOutcomeContract(
  outcomes: IntentSchema["outcomes"] | undefined,
) {
  return {
    operations: uniqueSortedStrings((outcomes?.operations || []) as string[]) as IntentSchema["outcomes"] extends infer TOut
      ? TOut extends { operations?: infer TOps }
        ? TOps
        : never
      : never,
  };
}

function buildStateContract(
  stateModel: IntentStateContract | undefined,
) {
  return {
    states: stableSortObjects(
      (stateModel?.states || []).map((state) => ({
        owner: state.owner,
        lifetime: state.lifetime,
        kind: state.kind,
        mutationMode: state.mutationMode,
      })),
    ),
  };
}

function buildContentContract(
  contentModel: IntentContentModelContract | undefined,
) {
  return {
    collections: stableSortObjects(
      (contentModel?.collections || []).map((collection) => ({
        role: collection.role,
        ownership: collection.ownership,
        updateMode: collection.updateMode,
        itemSchema: stableSortObjects(
          (collection.itemSchema || []).map((item) => ({
            type: item.type,
            semanticRole: item.semanticRole,
            required: item.required === true ? true : undefined,
          })),
        ),
      })),
    ),
  };
}

function buildCompositionContract(
  composition: IntentCompositionContract | undefined,
) {
  return {
    dependencies: stableSortObjects(
      (composition?.dependencies || []).map((dependency) => ({
        kind: dependency.kind,
        relation: dependency.relation,
        target: dependency.target,
        required: dependency.required === true ? true : undefined,
      })),
    ),
  };
}

function normalizeNormalizedMechanics(
  candidate: Partial<IntentSchema>,
  promptHints: PromptSemanticHints,
): NormalizedMechanics {
  const interaction = candidate.interaction;
  const selection = candidate.selection;
  const uiRequirements = candidate.uiRequirements;
  const outcomes = candidate.outcomes;
  const effects = candidate.effects;
  const contentModel = candidate.contentModel;

  const hasInteractiveActivation =
    (interaction?.activations || []).some(
      (activation) => activation.kind === "key" || activation.kind === "mouse",
    );
  const hasCandidateCollection =
    selection?.source === "candidate-collection" ||
    selection?.source === "weighted-pool" ||
    selection?.source === "filtered-pool" ||
    selection?.choiceMode === "user-chosen" ||
    selection?.choiceMode === "weighted" ||
    selection?.choiceMode === "hybrid" ||
    selection?.mode === "weighted" ||
    selection?.mode === "filtered" ||
    selection?.mode === "user-chosen" ||
    selection?.mode === "hybrid" ||
    (contentModel?.collections || []).some((collection) => collection.role === "candidate-options");
  const hasWeightedSelection =
    selection?.choiceMode === "weighted" ||
    selection?.choiceMode === "hybrid" ||
    selection?.source === "weighted-pool" ||
    selection?.mode === "weighted" ||
    selection?.mode === "hybrid" ||
    promptHints.weightedDraw;
  const hasPlayerChoice =
    selection?.choiceMode === "user-chosen" ||
    selection?.choiceMode === "hybrid" ||
    selection?.mode === "user-chosen" ||
    selection?.mode === "hybrid";
  const hasModalSurface =
    (uiRequirements?.surfaces || []).some((surface) => {
      const normalized = normalizeSurfaceToken(surface);
      return normalized?.includes("modal") || normalized?.includes("dialog") || false;
    }) || hasPlayerChoice;
  const hasOutcomeApplication =
    (outcomes?.operations || []).length > 0 ||
    (effects?.operations || []).length > 0 ||
    !!candidate.spatial?.motion ||
    !!candidate.spatial?.emission;
  const hasResourceConsumption =
    (outcomes?.operations || []).includes("consume-resource") ||
    (candidate.requirements?.typed || []).some(
      (requirement) =>
        requirement.kind === "resource" &&
        /consume|cost|spend|mana|health|energy|resource cost/i.test(
          `${requirement.summary} ${(requirement.inputs || []).join(" ")} ${(requirement.outputs || []).join(" ")}`,
        ),
    );
  const hasFacetEvidence =
    !!interaction ||
    !!selection ||
    !!uiRequirements ||
    !!outcomes ||
    !!effects ||
    !!candidate.spatial ||
    !!contentModel;

  return {
    trigger: hasInteractiveActivation || (!hasFacetEvidence && candidate.normalizedMechanics?.trigger === true),
    candidatePool:
      hasCandidateCollection || (!hasFacetEvidence && candidate.normalizedMechanics?.candidatePool === true),
    weightedSelection:
      hasWeightedSelection || (!hasFacetEvidence && candidate.normalizedMechanics?.weightedSelection === true),
    playerChoice: hasPlayerChoice || (!hasFacetEvidence && candidate.normalizedMechanics?.playerChoice === true),
    uiModal: hasModalSurface || (!hasFacetEvidence && candidate.normalizedMechanics?.uiModal === true),
    outcomeApplication:
      hasOutcomeApplication || (!hasFacetEvidence && candidate.normalizedMechanics?.outcomeApplication === true),
    resourceConsumption:
      hasResourceConsumption ||
      (!hasFacetEvidence && candidate.normalizedMechanics?.resourceConsumption === true),
  };
}

function isCanonicalCandidateDrawGovernanceCore(
  input: DeriveIntentGovernanceDecisionsInput,
): boolean {
  const { candidate, promptHints, rawFacts, rawText } = input;
  const choiceCount =
    promptHints.candidateCount ??
    normalizePositiveInteger(candidate.selection?.choiceCount) ??
    readRawFactValue<number>(rawFacts, "schema.parameters.choice_count");
  const cardinality =
    candidate.selection?.cardinality || (promptHints.committedCount === 1 ? "single" : undefined);

  if (!choiceCount || cardinality !== "single") {
    return false;
  }

  if (
    hasTrueRawFact(rawFacts, "prompt.composition.runtime_persistence") ||
    hasTrueRawFact(rawFacts, "prompt.composition.explicit_cross_feature") ||
    hasTrueRawFact(rawFacts, "prompt.inventory.enabled")
  ) {
    return false;
  }

  const hasCandidatePoolSemantics =
    promptHints.candidatePool ||
    (candidate.contentModel?.collections || []).some((collection) => collection.role === "candidate-options") ||
    candidate.selection?.source === "candidate-collection" ||
    candidate.selection?.source === "weighted-pool" ||
    candidate.selection?.source === "filtered-pool";
  const hasUserChoiceSemantics =
    promptHints.playerChoice ||
    candidate.selection?.choiceMode === "user-chosen" ||
    candidate.selection?.choiceMode === "hybrid" ||
    candidate.selection?.mode === "user-chosen" ||
    candidate.selection?.mode === "hybrid";
  const hasWeightedCandidateSemantics =
    promptHints.weightedDraw ||
    promptHints.rarityDisplay ||
    candidate.selection?.source === "weighted-pool" ||
    candidate.selection?.mode === "weighted";
  const hasUiSurface =
    promptHints.uiSurface ||
    candidate.uiRequirements?.needed === true ||
    (candidate.uiRequirements?.surfaces || []).some((surface) => {
      const normalizedSurface = normalizeSurfaceToken(surface);
      return normalizedSurface?.includes("selection")
        || normalizedSurface?.includes("modal")
        || normalizedSurface?.includes("dialog")
        || normalizedSurface?.includes("card")
        || false;
    }) ||
    (hasUserChoiceSemantics && choiceCount > 1);
  const hasPoolMutationSemantics =
    promptHints.noRepeatAfterSelection ||
    promptHints.returnsUnchosenToPool ||
    hasSelectionEligibilityRemovalSignal(rawText) ||
    hasReturnToPoolSignal(rawText) ||
    candidate.selection?.duplicatePolicy === "forbid" ||
    (candidate.requirements?.functional || []).some((entry) =>
      /future draws|future eligibility|return.*pool|unchosen.*pool/i.test(entry),
    ) ||
    (candidate.resolvedAssumptions || []).some((entry) =>
      /future draws|session scope|return.*pool|unchosen.*pool/i.test(entry),
    );
  const requestsOneShotOnly = /one[- ]shot|single[- ]use|only once|只能一次|单次使用/iu.test(rawText);

  return Boolean(
    hasCandidatePoolSemantics &&
      hasUserChoiceSemantics &&
      hasWeightedCandidateSemantics &&
      hasUiSurface &&
      hasPoolMutationSemantics &&
      !requestsOneShotOnly,
  );
}

export function hasNonUiGameplaySemantics(candidate: Partial<IntentSchema>): boolean {
  if ((candidate.requirements?.typed || []).some((requirement) => requirement.kind !== "ui")) {
    return true;
  }

  if ((candidate.interaction?.activations?.length || 0) > 0) {
    return true;
  }

  if (
    !!candidate.selection?.mode ||
    !!candidate.selection?.choiceMode ||
    !!candidate.selection?.choiceCount ||
    !!candidate.selection?.source
  ) {
    return true;
  }

  if ((candidate.effects?.operations?.length || 0) > 0 || (candidate.outcomes?.operations?.length || 0) > 0) {
    return true;
  }

  if (!!candidate.spatial?.motion || !!candidate.spatial?.emission) {
    return true;
  }

  if ((candidate.stateModel?.states?.length || 0) > 0 || (candidate.contentModel?.collections?.length || 0) > 0) {
    return true;
  }

  if ((candidate.composition?.dependencies?.length || 0) > 0) {
    return true;
  }

  return (candidate.integrations?.expectedBindings || []).some((binding) => binding.kind !== "ui-surface");
}

export function hasCrossSystemCompositionSemantics(candidate: Partial<IntentSchema>): boolean {
  if (
    (candidate.composition?.dependencies || []).some(
      (dependency) => dependency.kind === "cross-feature" || dependency.kind === "external-system",
    )
  ) {
    return true;
  }

  if (
    (candidate.outcomes?.operations || []).includes("grant-feature") &&
    (
      candidate.timing?.duration?.kind === "persistent" ||
      (candidate.stateModel?.states || []).some((state) => state.lifetime === "persistent") ||
      (candidate.integrations?.expectedBindings || []).some((binding) => binding.kind === "data-source")
    )
  ) {
    return true;
  }

  return false;
}

function uniqueSortedStrings(values: Array<string | undefined>): string[] | undefined {
  const normalized = [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))].sort(
    (left, right) => left.localeCompare(right),
  );
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSurfaceToken(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.toLowerCase();
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const kind = typeof record.kind === "string" ? record.kind : undefined;
    const purpose = typeof record.purpose === "string" ? record.purpose : undefined;
    const token = [kind, purpose].filter((entry): entry is string => Boolean(entry)).join(" ");
    return token ? token.toLowerCase() : undefined;
  }

  return undefined;
}

function stableSortObjects<T extends Record<string, unknown>>(values: T[]): T[] | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const keyed = new Map<string, T>();
  for (const value of values) {
    const normalized = Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right)),
    ) as T;
    const key = JSON.stringify(normalized);
    if (!keyed.has(key)) {
      keyed.set(key, normalized);
    }
  }

  return [...keyed.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}

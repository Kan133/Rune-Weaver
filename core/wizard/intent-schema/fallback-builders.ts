import type {
  HostDescriptor,
  IntentCompositionContract,
  IntentContentModelContract,
  IntentInteractionContract,
  IntentOutcomeContract,
  IntentRequirements,
  IntentSchema,
  IntentSelectionContract,
  IntentSpatialContract,
  IntentStateContract,
  IntentTargetingContract,
  IntentTimingContract,
  UIRequirementSummary,
} from "../../schema/types.js";
import { readRawFactValue } from "./raw-facts.js";
import type { IntentRawFacts } from "./semantic-analysis.js";
import { normalizePositiveInteger, normalizePositiveNumber } from "./shared.js";

interface BuildFallbackIntentSchemaCandidateInput {
  rawText: string;
  host: HostDescriptor;
  rawFacts: IntentRawFacts;
}

export function buildFallbackIntentSchemaCandidate(
  input: BuildFallbackIntentSchemaCandidateInput,
): Partial<IntentSchema> {
  const interaction = buildFallbackInteraction(input.rawFacts);
  const targeting = buildFallbackTargeting(input.rawFacts);
  const timing = buildFallbackTiming(input.rawFacts);
  const spatial = buildFallbackSpatial(input.rawFacts);
  const selection = buildFallbackSelection(input.rawFacts);
  const outcomes = buildFallbackOutcomes(input.rawFacts, spatial, selection);
  const composition = buildFallbackComposition(input.rawFacts);
  const uiRequirements = buildFallbackUiRequirements(input.rawFacts, selection);
  const contentModel = buildFallbackContentModel(input.rawFacts, selection);
  const stateModel = buildFallbackStateModel(input.rawFacts, selection, composition);

  return {
    version: "1.0",
    host: input.host,
    request: {
      rawPrompt: input.rawText,
      goal: input.rawText.trim() || "Interpret the requested feature semantics.",
      nameHint: buildFallbackNameHint(input.rawText),
    },
    requirements: {
      functional: [buildFallbackFunctionalRequirement(input.rawText)],
      typed: buildFallbackTypedRequirements({
        rawText: input.rawText,
        interaction,
        selection,
        spatial,
        outcomes,
        composition,
        uiRequirements,
      }),
    },
    interaction,
    targeting,
    timing,
    spatial,
    selection,
    outcomes,
    contentModel,
    composition,
    stateModel,
    uiRequirements,
    resolvedAssumptions: ["Using generic wizard fallback after LLM generation failed."],
    parameters: extractFallbackParameters(input.rawFacts),
  };
}

function buildFallbackNameHint(rawText: string): string | undefined {
  const tokens = rawText
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .split("_")
    .filter(Boolean)
    .slice(0, 6);
  return tokens.length > 0 ? tokens.join("_") : undefined;
}

function buildFallbackFunctionalRequirement(rawText: string): string {
  const trimmed = rawText.trim();
  return trimmed.length > 0
    ? trimmed
    : "Interpret the user's requested gameplay or UI behavior.";
}

function buildFallbackInteraction(rawFacts: IntentRawFacts): IntentInteractionContract | undefined {
  const triggerKey = readRawFactValue<string>(rawFacts, "prompt.interaction.trigger_key");
  if (triggerKey) {
    return {
      activations: [
        {
          kind: "key",
          input: triggerKey,
          phase: "press",
          repeatability: "repeatable",
        },
      ],
    };
  }

  if (readRawFactValue<boolean>(rawFacts, "prompt.interaction.passive")) {
    return {
      activations: [
        {
          kind: "passive",
          repeatability: "persistent",
        },
      ],
    };
  }

  return undefined;
}

function buildFallbackTargeting(rawFacts: IntentRawFacts): IntentTargetingContract | undefined {
  const subject = readRawFactValue<IntentTargetingContract["subject"]>(rawFacts, "prompt.targeting.subject");
  const selector = readRawFactValue<IntentTargetingContract["selector"]>(rawFacts, "prompt.targeting.selector");

  if (!subject && !selector) {
    return undefined;
  }

  return {
    subject,
    selector: selector ?? "none",
    teamScope:
      subject === "enemy"
        ? "enemy"
        : subject === "ally"
          ? "ally"
          : subject === "self"
            ? "self"
            : "self",
  };
}

function buildFallbackTiming(rawFacts: IntentRawFacts): IntentTimingContract | undefined {
  const cooldownSeconds = normalizePositiveNumber(readRawFactValue(rawFacts, "prompt.timing.cooldown_seconds"));
  const durationSeconds = normalizePositiveNumber(readRawFactValue(rawFacts, "prompt.timing.duration_seconds"));
  const intervalSeconds = normalizePositiveNumber(readRawFactValue(rawFacts, "prompt.timing.interval_seconds"));
  const explicitPersistence = readRawFactValue<boolean>(rawFacts, "prompt.composition.explicit_persistence");

  if (!cooldownSeconds && !durationSeconds && !intervalSeconds && !explicitPersistence) {
    return undefined;
  }

  return {
    cooldownSeconds,
    delaySeconds: undefined,
    intervalSeconds,
    duration: explicitPersistence
      ? { kind: "persistent" }
      : durationSeconds
        ? { kind: "timed", seconds: durationSeconds }
        : undefined,
  };
}

function buildFallbackSpatial(rawFacts: IntentRawFacts): IntentSpatialContract | undefined {
  const motionKind = readRawFactValue<IntentSpatialContract["motion"] extends infer TMotion ? TMotion extends { kind: infer TKind } ? TKind : never : never>(
    rawFacts,
    "prompt.spatial.motion_kind",
  );
  const distance = normalizePositiveNumber(readRawFactValue(rawFacts, "prompt.spatial.distance"));
  const selector = readRawFactValue<string>(rawFacts, "prompt.targeting.selector");

  if (!motionKind) {
    return undefined;
  }

  return {
    motion: {
      kind: motionKind === "teleport" ? "teleport" : "dash",
      distance,
      direction: selector === "cursor" ? "cursor" : undefined,
    },
  };
}

function buildFallbackSelection(rawFacts: IntentRawFacts): IntentSelectionContract | undefined {
  const candidatePool = readRawFactValue<boolean>(rawFacts, "prompt.selection.candidate_pool");
  const playerChoice = readRawFactValue<boolean>(rawFacts, "prompt.selection.player_choice");
  const weightedDraw = readRawFactValue<boolean>(rawFacts, "prompt.selection.weighted_draw");
  const candidateCount = normalizePositiveInteger(readRawFactValue(rawFacts, "prompt.selection.candidate_count"));
  const committedCount = normalizePositiveInteger(readRawFactValue(rawFacts, "prompt.selection.committed_count"));
  const inventoryEnabled = readRawFactValue<boolean>(rawFacts, "prompt.inventory.enabled");
  const inventoryCapacity = normalizePositiveInteger(readRawFactValue(rawFacts, "prompt.inventory.capacity"));
  const inventoryBlocksWhenFull = readRawFactValue<boolean>(rawFacts, "prompt.inventory.block_draw_when_full");

  if (!candidatePool && !playerChoice) {
    return undefined;
  }

  return {
    mode: weightedDraw ? "weighted" : playerChoice ? "user-chosen" : "deterministic",
    source: weightedDraw ? "weighted-pool" : candidatePool ? "candidate-collection" : "none",
    choiceMode: playerChoice ? "user-chosen" : weightedDraw ? "weighted" : "none",
    choiceCount: candidateCount,
    cardinality: committedCount && committedCount > 1 ? "multiple" : "single",
    repeatability: "one-shot",
    duplicatePolicy: readRawFactValue<boolean>(rawFacts, "prompt.selection.no_repeat_after_selection")
      ? "forbid"
      : undefined,
    commitment: readRawFactValue<boolean>(rawFacts, "prompt.selection.immediate_outcome")
      ? "immediate"
      : undefined,
    inventory: inventoryEnabled
      ? {
          enabled: true,
          capacity: inventoryCapacity,
          storeSelectedItems: true,
          blockDrawWhenFull: inventoryBlocksWhenFull ? true : undefined,
          presentation: readRawFactValue<boolean>(rawFacts, "prompt.ui.surface_needed")
            ? "persistent_panel"
            : undefined,
        }
      : undefined,
  };
}

function buildFallbackOutcomes(
  rawFacts: IntentRawFacts,
  spatial: IntentSpatialContract | undefined,
  selection: IntentSelectionContract | undefined,
): IntentOutcomeContract | undefined {
  const operations = new Set<NonNullable<IntentOutcomeContract["operations"]>[number]>();

  if (spatial?.motion) {
    operations.add("move");
  }
  if (selection) {
    operations.add("apply-effect");
  }
  if (readRawFactValue<boolean>(rawFacts, "prompt.composition.explicit_cross_feature")) {
    operations.add("grant-feature");
  }
  if (readRawFactValue<boolean>(rawFacts, "prompt.composition.explicit_persistence")) {
    operations.add("update-state");
  }

  return operations.size > 0 ? { operations: [...operations] } : undefined;
}

function buildFallbackContentModel(
  rawFacts: IntentRawFacts,
  selection: IntentSelectionContract | undefined,
): IntentContentModelContract | undefined {
  if (!readRawFactValue<boolean>(rawFacts, "prompt.selection.candidate_pool") && !selection) {
    return undefined;
  }

  return {
    collections: [
      {
        id: "feature_content",
        role: readRawFactValue<boolean>(rawFacts, "prompt.selection.candidate_pool")
          ? "candidate-options"
          : "generic",
        ownership: "feature",
        updateMode: "replace",
      },
    ],
  };
}

function buildFallbackComposition(rawFacts: IntentRawFacts): IntentCompositionContract | undefined {
  const dependencies: NonNullable<IntentCompositionContract["dependencies"]> = [];

  if (readRawFactValue<boolean>(rawFacts, "prompt.composition.explicit_cross_feature")) {
    dependencies.push({
      kind: "cross-feature",
      relation: "grants",
      required: true,
    });
  }

  if (readRawFactValue<boolean>(rawFacts, "prompt.composition.explicit_persistence")) {
    dependencies.push({
      kind: "external-system",
      relation: "writes",
      required: true,
    });
  }

  return dependencies.length > 0 ? { dependencies } : undefined;
}

function buildFallbackUiRequirements(
  rawFacts: IntentRawFacts,
  selection: IntentSelectionContract | undefined,
): UIRequirementSummary | undefined {
  const needed =
    readRawFactValue<boolean>(rawFacts, "prompt.ui.surface_needed") ||
    readRawFactValue<boolean>(rawFacts, "prompt.inventory.enabled");

  if (!needed) {
    return undefined;
  }

  const surfaces = new Set<string>();
  if (selection) {
    surfaces.add("selection_modal");
  }
  if (readRawFactValue<boolean>(rawFacts, "prompt.selection.rarity_display")) {
    surfaces.add("rarity_cards");
  }
  if (readRawFactValue<boolean>(rawFacts, "prompt.inventory.enabled")) {
    surfaces.add("inventory_panel");
  }

  return {
    needed: true,
    surfaces: [...surfaces],
  };
}

function buildFallbackStateModel(
  rawFacts: IntentRawFacts,
  selection: IntentSelectionContract | undefined,
  composition: IntentCompositionContract | undefined,
): IntentStateContract | undefined {
  const states: NonNullable<IntentStateContract["states"]> = [];

  if (selection) {
    states.push({
      id: "active_selection_state",
      summary: "Tracks the active selection or draw session state.",
      owner: "feature",
      lifetime: selection.repeatability === "persistent" ? "persistent" : "session",
      kind: selection.inventory?.enabled ? "inventory" : "selection-session",
      mutationMode: "update",
    });
  }

  if ((composition?.dependencies || []).some((dependency) => dependency.kind === "external-system")) {
    states.push({
      id: "persistent_progression_state",
      summary: "Tracks behavior or progression that persists outside the local feature session.",
      owner: "external",
      lifetime: "persistent",
      kind: "generic",
      mutationMode: "update",
    });
  }

  return states.length > 0 ? { states } : undefined;
}

function buildFallbackTypedRequirements(input: {
  rawText: string;
  interaction: IntentInteractionContract | undefined;
  selection: IntentSelectionContract | undefined;
  spatial: IntentSpatialContract | undefined;
  outcomes: IntentOutcomeContract | undefined;
  composition: IntentCompositionContract | undefined;
  uiRequirements: UIRequirementSummary | undefined;
}): IntentRequirements["typed"] | undefined {
  const typed: NonNullable<IntentRequirements["typed"]> = [];

  if (input.interaction?.activations?.length) {
    typed.push({
      id: "fallback_trigger",
      kind: "trigger",
      summary: "Capture and interpret the requested activation boundary.",
      priority: "must",
    });
  }

  if (input.selection) {
    typed.push({
      id: "fallback_selection",
      kind: "rule",
      summary: "Run the requested candidate selection or draft flow.",
      priority: "must",
    });
  }

  if (input.spatial?.motion || (input.outcomes?.operations || []).includes("move")) {
    typed.push({
      id: "fallback_motion",
      kind: "effect",
      summary: "Apply the requested movement or spatial outcome.",
      priority: "must",
    });
  }

  if (input.uiRequirements?.needed) {
    typed.push({
      id: "fallback_ui",
      kind: "ui",
      summary: "Expose the requested player-facing UI surface or feedback.",
      priority: "should",
    });
  }

  if ((input.composition?.dependencies || []).length > 0) {
    typed.push({
      id: "fallback_composition",
      kind: "integration",
      summary: "Preserve the requested coupling with another feature or external system.",
      priority: "must",
    });
  }

  if (typed.length === 0) {
    typed.push({
      id: "fallback_generic",
      kind: "generic",
      summary: buildFallbackFunctionalRequirement(input.rawText),
      priority: "must",
    });
  }

  return typed;
}

function extractFallbackParameters(rawFacts: IntentRawFacts): Record<string, unknown> | undefined {
  const parameters: Record<string, unknown> = {};
  const triggerKey = readRawFactValue<string>(rawFacts, "prompt.interaction.trigger_key");
  const choiceCount = normalizePositiveInteger(readRawFactValue(rawFacts, "prompt.selection.candidate_count"));
  const commitCount = normalizePositiveInteger(readRawFactValue(rawFacts, "prompt.selection.committed_count"));
  const distance = normalizePositiveNumber(readRawFactValue(rawFacts, "prompt.spatial.distance"));
  const durationSeconds = normalizePositiveNumber(readRawFactValue(rawFacts, "prompt.timing.duration_seconds"));
  const capacity = normalizePositiveInteger(readRawFactValue(rawFacts, "prompt.inventory.capacity"));

  if (triggerKey) {
    parameters.triggerKey = triggerKey;
  }
  if (typeof choiceCount === "number") {
    parameters.choiceCount = choiceCount;
  }
  if (typeof commitCount === "number") {
    parameters.commitCount = commitCount;
  }
  if (typeof distance === "number") {
    parameters.distance = distance;
  }
  if (typeof durationSeconds === "number") {
    parameters.durationSeconds = durationSeconds;
  }
  if (typeof capacity === "number") {
    parameters.capacity = capacity;
  }

  return Object.keys(parameters).length > 0 ? parameters : undefined;
}

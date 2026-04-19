import type {
  IntentContentModelContract,
  IntentEffectContract,
  IntentInteractionContract,
  IntentOutcomeContract,
  IntentRequirements,
  IntentSchema,
  IntentSelectionContract,
  IntentStateContract,
  UIRequirementSummary,
} from "../../schema/types.js";
import {
  appendResolvedAssumptionResidue,
  suppressBoundedCandidateDrawOpenSemanticResidue,
} from "./semantic-residue.js";
import { readRawFactValue } from "./raw-facts.js";
import type { IntentSchemaCanonicalizationPass, PromptSemanticHints } from "./shared.js";
import { buildPromptDerivedCandidateCollection } from "./normalize-selection-sections.js";
import { normalizePositiveInteger } from "./shared.js";

export const CANDIDATE_DRAW_CANONICALIZATION_PASS: IntentSchemaCanonicalizationPass = {
  id: "candidate-draw-governance-core",
  priority: 100,
  changedSemanticAreas: [
    "requirements",
    "selection",
    "stateModel",
    "contentModel",
    "composition",
    "timing",
    "effects",
    "outcomes",
    "uiRequirements",
    "parameters",
    "openSemanticResidue",
  ],
  matches(candidate, _context, semanticAnalysis) {
    return semanticAnalysis.governanceDecisions.canonicalizationEligible.value.includes(
      "candidate_draw_governance_core",
    );
  },
  apply({ candidate, context, semanticAnalysis }) {
    const choiceCount =
      readRawFactValue<number>(semanticAnalysis.rawFacts, "prompt.selection.candidate_count") ??
      normalizePositiveInteger(candidate.selection?.choiceCount);
    if (!choiceCount) {
      return {
        candidate,
        openSemanticResidue: semanticAnalysis.openSemanticResidue,
      };
    }

    const residueWithoutBoundedDetail = suppressBoundedCandidateDrawOpenSemanticResidue(
      semanticAnalysis.openSemanticResidue,
      context.promptHints,
    );
    const openSemanticResidue = appendResolvedAssumptionResidue(
      residueWithoutBoundedDetail,
      {
        summaries: buildCanonicalCandidateDrawResolvedAssumptions(context.promptHints),
        class: "governance_relevant",
        source: "canonicalization",
      },
    );

    return {
      candidate: {
        ...candidate,
        requirements: buildCanonicalCandidateDrawRequirements(candidate, context.promptHints, choiceCount),
        selection: buildCanonicalCandidateDrawSelection(choiceCount),
        stateModel: buildCanonicalCandidateDrawStateModel(),
        contentModel: {
          collections: [buildCanonicalCandidateDrawCollection(context.promptHints)],
        },
        composition: undefined,
        timing: undefined,
        effects: {
          operations: ["apply", "remove"] as NonNullable<IntentEffectContract["operations"]>,
        },
        outcomes: {
          operations: ["apply-effect", "update-state"] as NonNullable<IntentOutcomeContract["operations"]>,
        },
        uiRequirements: buildCanonicalCandidateDrawUiRequirements(context.promptHints),
        parameters: buildCanonicalCandidateDrawParameters(candidate, choiceCount, context.promptHints),
      },
      openSemanticResidue,
    };
  },
};

function buildCanonicalCandidateDrawRequirements(
  candidate: Partial<IntentSchema>,
  promptHints: { rarityDisplay: boolean; weightedDraw: boolean },
  choiceCount: number,
): IntentRequirements {
  const functional = [
    `${describeCanonicalCandidateDrawTrigger(candidate.interaction)} opens a current-feature candidate selection UI.`,
    `Draw ${choiceCount} weighted candidates from a feature-owned pool.`,
    "Present the drawn candidates for a single player choice.",
    "Apply the chosen candidate result immediately.",
    "Remove the selected candidate from future draw eligibility within the same feature/session.",
    "Return unchosen candidates to the same feature-owned pool for future draws.",
  ];

  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    functional.push("Candidate rarity influences draw weights and selection presentation.");
  }

  return {
    functional,
    typed: [
      {
        id: "candidate_draw_local_trigger",
        kind: "trigger",
        summary: "Capture one local trigger that opens the candidate selection flow.",
        priority: "must",
      },
      {
        id: "candidate_draw_feature_pool",
        kind: "state",
        summary: "Maintain a feature-owned candidate pool for future draws.",
        priority: "must",
      },
      {
        id: "candidate_draw_weighted_rule",
        kind: "rule",
        summary: `Draw ${choiceCount} weighted candidates from the local pool.`,
        priority: "must",
      },
      {
        id: "candidate_draw_single_choice_commit",
        kind: "rule",
        summary: "Let the player choose exactly one candidate and commit it immediately.",
        priority: "must",
      },
      {
        id: "candidate_draw_session_tracking",
        kind: "state",
        summary: "Track selected eligibility removal and pool updates in same-feature session state.",
        priority: "must",
      },
    ],
    interactions: candidate.requirements?.interactions,
    dataNeeds: candidate.requirements?.dataNeeds,
    outputs: candidate.requirements?.outputs,
  };
}

function describeCanonicalCandidateDrawTrigger(
  interaction: IntentInteractionContract | undefined,
): string {
  const activation = (interaction?.activations || []).find((entry) => entry.kind !== "passive");
  if (!activation) {
    return "A local trigger";
  }

  if (activation.kind === "key" && activation.input) {
    return `Pressing ${activation.input.toUpperCase()}`;
  }

  if (activation.input) {
    return `The local ${activation.kind} input ${activation.input}`;
  }

  return "A local trigger";
}

function buildCanonicalCandidateDrawSelection(choiceCount: number): IntentSelectionContract {
  return {
    mode: "weighted",
    source: "weighted-pool",
    choiceMode: "user-chosen",
    cardinality: "single",
    choiceCount,
    repeatability: "repeatable",
    duplicatePolicy: "forbid",
    commitment: "immediate",
  };
}

function buildCanonicalCandidateDrawStateModel(): IntentStateContract {
  return {
    states: [
      {
        id: "candidate_pool_state",
        summary: "Tracks the feature-owned candidate pool and future draw eligibility.",
        owner: "feature",
        lifetime: "session",
        kind: "collection",
        mutationMode: "update",
      },
      {
        id: "selection_commit_state",
        summary: "Tracks the most recent committed candidate choice for the current feature session.",
        owner: "feature",
        lifetime: "session",
        kind: "selection-session",
        mutationMode: "update",
      },
    ],
  };
}

function buildCanonicalCandidateDrawUiRequirements(
  promptHints: { rarityDisplay: boolean; weightedDraw: boolean },
): UIRequirementSummary {
  const surfaces = new Set<string>(["selection_modal"]);
  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    surfaces.add("rarity_cards");
  }

  return {
    needed: true,
    surfaces: [...surfaces],
  };
}

function buildCanonicalCandidateDrawCollection(
  promptHints: PromptSemanticHints,
): NonNullable<IntentContentModelContract["collections"]>[number] {
  const collection = buildPromptDerivedCandidateCollection(promptHints);
  const itemSchema = [...(collection.itemSchema || [])];

  if (!itemSchema.some((item) => item.semanticRole === "selected-outcome")) {
    itemSchema.push({
      name: "effect",
      type: "effect-ref",
      required: false,
      semanticRole: "selected-outcome",
    });
  }

  return {
    ...collection,
    itemSchema,
  };
}

function buildCanonicalCandidateDrawParameters(
  candidate: Partial<IntentSchema>,
  choiceCount: number,
  promptHints: { rarityDisplay: boolean; weightedDraw: boolean },
): Record<string, unknown> {
  const triggerKey = (candidate.interaction?.activations || []).find((activation) => activation.kind === "key")?.input;
  const parameters: Record<string, unknown> = {
    drawCount: choiceCount,
    selectionCount: 1,
    applyImmediately: true,
    removeChosenFromFutureDraws: true,
    returnUnchosenToPool: true,
  };

  if (typeof triggerKey === "string" && triggerKey.trim()) {
    parameters.triggerKey = triggerKey.toUpperCase();
  }

  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    parameters.weightedBy = "rarity";
  }

  return parameters;
}

function buildCanonicalCandidateDrawResolvedAssumptions(
  promptHints: { rarityDisplay: boolean; weightedDraw: boolean },
): string[] {
  const assumptions = new Set<string>([
    "Selection eligibility updates stay feature-owned and session-local unless persistence is explicitly requested.",
    "Selected candidates leave future draw eligibility within the same feature/session.",
    "Unchosen candidates remain available in the same feature-owned pool for future draws.",
  ]);

  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    assumptions.add("Rarity-weighted draw and presentation remain local to the same feature selection flow.");
  }

  return [...assumptions];
}

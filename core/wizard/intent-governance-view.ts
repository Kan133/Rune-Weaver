import type { IntentSchema } from "../schema/types.js";
import {
  extractIntentSchemaGovernanceDecisions,
  type IntentGovernanceActivationContract,
  type IntentGovernanceCompositionContract,
  type IntentGovernanceContentContract,
  type IntentGovernanceDecisions,
  type IntentGovernanceEffectContract,
  type IntentGovernanceOutcomeContract,
  type IntentGovernanceSelectionContract,
  type IntentGovernanceStateContract,
  type IntentGovernanceTimingContract,
  type IntentGovernanceUiContract,
} from "./intent-schema.js";

export interface IntentGovernanceView {
  decisions: IntentGovernanceDecisions;
  intentKind: IntentGovernanceDecisions["intentKind"]["value"];
  mechanics: IntentGovernanceDecisions["normalizedMechanics"]["value"];
  crossSystemComposition: boolean;
  nonUiGameplayPresent: boolean;
  canonicalizationEligible: string[];
  activation: IntentGovernanceActivationContract;
  selection: IntentGovernanceSelectionContract;
  ui: IntentGovernanceUiContract;
  timing: IntentGovernanceTimingContract;
  effect: IntentGovernanceEffectContract;
  outcome: IntentGovernanceOutcomeContract;
  state: IntentGovernanceStateContract;
  content: IntentGovernanceContentContract;
  composition: IntentGovernanceCompositionContract;
}

const GOVERNANCE_VIEW_CACHE = new WeakMap<IntentSchema, IntentGovernanceView>();

export function getIntentGovernanceView(schema: IntentSchema): IntentGovernanceView {
  const cached = GOVERNANCE_VIEW_CACHE.get(schema);
  if (cached) {
    return cached;
  }

  const decisions = extractIntentSchemaGovernanceDecisions(schema);
  const view: IntentGovernanceView = {
    decisions,
    intentKind: decisions.intentKind.value,
    mechanics: decisions.normalizedMechanics.value,
    crossSystemComposition: decisions.crossSystemComposition.value,
    nonUiGameplayPresent: decisions.nonUiGameplayPresent.value,
    canonicalizationEligible: decisions.canonicalizationEligible.value || [],
    activation: decisions.activationContract.value,
    selection: decisions.selectionContract.value,
    ui: decisions.uiContract.value,
    timing: decisions.timingContract.value,
    effect: decisions.effectContract.value,
    outcome: decisions.outcomeContract.value,
    state: decisions.stateContract.value,
    content: decisions.contentContract.value,
    composition: decisions.compositionContract.value,
  };

  GOVERNANCE_VIEW_CACHE.set(schema, view);
  return view;
}

export function getGovernanceKeyInputs(schema: IntentSchema): string[] {
  return Array.from(
    new Set(
      (getIntentGovernanceView(schema).activation.inputs || [])
        .map((input) => input?.trim().toUpperCase())
        .filter((input): input is string => Boolean(input)),
    ),
  );
}

export function hasGovernanceExternalOrSharedOwnership(schema: IntentSchema): boolean {
  const view = getIntentGovernanceView(schema);
  return Boolean(
    (view.state.states || []).some((state) => state.owner === "external") ||
      (view.content.collections || []).some(
        (collection) => collection.ownership === "external" || collection.ownership === "shared",
      ),
  );
}

export function hasGovernancePersistentScope(schema: IntentSchema): boolean {
  const view = getIntentGovernanceView(schema);
  return Boolean(
    (view.state.states || []).some((state) => state.lifetime === "persistent") ||
      (view.composition.dependencies || []).some(
        (dependency) => dependency.kind === "external-system" && dependency.relation === "writes",
      ),
  );
}

export function hasGovernanceFeatureOwnedCandidateCollection(schema: IntentSchema): boolean {
  const view = getIntentGovernanceView(schema);
  return Boolean(
    (view.content.collections || []).some(
      (collection) =>
        collection.role === "candidate-options" &&
        (collection.ownership === undefined || collection.ownership === "feature"),
    ),
  );
}

export function hasGovernancePlayerConfirmedSelection(schema: IntentSchema): boolean {
  const view = getIntentGovernanceView(schema);
  return Boolean(
    view.selection.resolutionMode === "player_confirm_single" ||
      view.mechanics.playerChoice ||
      view.selection.choiceMode === "user-chosen" ||
      view.selection.choiceMode === "hybrid" ||
      (view.selection.cardinality === "single" && (view.selection.choiceCount || 0) > 1),
  );
}

export function hasGovernanceRevealBatchResolution(schema: IntentSchema): boolean {
  return getIntentGovernanceView(schema).selection.resolutionMode === "reveal_batch_immediate";
}

export function hasGovernanceSelectionFlowContract(schema: IntentSchema): boolean {
  const view = getIntentGovernanceView(schema);
  if (!hasGovernancePlayerConfirmedSelection(schema) || hasGovernanceRevealBatchResolution(schema)) {
    return false;
  }

  return Boolean(
    view.mechanics.candidatePool ||
      view.mechanics.weightedSelection ||
      view.mechanics.uiModal ||
      hasGovernancePlayerConfirmedSelection(schema) ||
      view.selection.source !== undefined ||
      view.selection.repeatability !== undefined ||
      view.selection.duplicatePolicy !== undefined ||
      view.selection.inventory !== undefined,
  );
}

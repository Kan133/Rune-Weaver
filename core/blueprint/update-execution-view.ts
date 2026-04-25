import type {
  GovernedUpdateExecutionView,
  IntentSchema,
  UpdateIntent,
} from "../schema/types.js";

function projectGovernedChangeToExecutionSchema(
  updateIntent: UpdateIntent,
): IntentSchema {
  const governedChange = updateIntent.governedChange;
  if (!governedChange) {
    throw new Error("Governed update execution authority is missing.");
  }

  return {
    version: governedChange.version,
    host: updateIntent.requestedChange.host,
    request: governedChange.request,
    classification: governedChange.classification,
    requirements: governedChange.requirements,
    constraints: governedChange.constraints,
    interaction: governedChange.interaction,
    targeting: governedChange.targeting,
    timing: governedChange.timing,
    spatial: governedChange.spatial,
    stateModel: governedChange.stateModel,
    flow: governedChange.flow,
    selection: governedChange.selection,
    effects: governedChange.effects,
    outcomes: governedChange.outcomes,
    contentModel: governedChange.contentModel,
    composition: governedChange.composition,
    integrations: governedChange.integrations,
    uiRequirements: governedChange.uiRequirements,
    normalizedMechanics: governedChange.normalizedMechanics,
    acceptanceInvariants: updateIntent.requestedChange.acceptanceInvariants || [],
    uncertainties: [],
    resolvedAssumptions: [...(governedChange.resolvedAssumptions || [])],
    ...(governedChange.parameters ? { parameters: governedChange.parameters } : {}),
  };
}

export function buildGovernedUpdateExecutionView(
  updateIntent: UpdateIntent,
): GovernedUpdateExecutionView | undefined {
  if (!updateIntent.governedChange || !updateIntent.semanticAnalysis) {
    return undefined;
  }

  return {
    governedChange: updateIntent.governedChange,
    semanticAnalysis: updateIntent.semanticAnalysis,
    delta: updateIntent.delta,
    currentFeatureContext: updateIntent.currentFeatureContext,
    ...(updateIntent.currentFeatureTruth ? { currentFeatureTruth: updateIntent.currentFeatureTruth } : {}),
    executionSchema: projectGovernedChangeToExecutionSchema(updateIntent),
  };
}

export function requireGovernedUpdateExecutionView(
  updateIntent: UpdateIntent,
  consumerName: string,
): GovernedUpdateExecutionView {
  const view = buildGovernedUpdateExecutionView(updateIntent);
  if (view) {
    return view;
  }

  throw new Error(
    `${consumerName} requires governed update execution authority. Build the update through createUpdateIntentFromRequestedChange or another explicit compat projection before entering execution.`,
  );
}

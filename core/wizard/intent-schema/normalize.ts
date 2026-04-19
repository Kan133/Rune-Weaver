import type { HostDescriptor, IntentSchema } from "../../schema/types.js";
import { runIntentSchemaCanonicalizationPasses } from "./canonicalization.js";
import {
  normalizeActors,
  normalizeClassificationConfidence,
  normalizeConstraints,
  normalizeHost,
  normalizeInvariants,
  normalizeModuleSafeParameters,
  normalizeRequest,
  normalizeRequirements,
} from "./normalize-base-sections.js";
import {
  normalizeEffects,
  normalizeFlow,
  normalizeIntegrations,
  normalizeInteraction,
  normalizeOutcomes,
  normalizeSpatial,
  normalizeStateModel,
  normalizeTargeting,
  normalizeTiming,
  normalizeComposition,
} from "./normalize-feature-sections.js";
import {
  normalizeContentModel,
  normalizeSelection,
  normalizeUIRequirements,
} from "./normalize-selection-sections.js";
import {
  analyzeIntentSemanticLayers,
} from "./semantic-analysis.js";
import {
  projectOpenSemanticResidueToResolvedAssumptions,
  projectOpenSemanticResidueToUncertainties,
} from "./semantic-residue.js";
import type { IntentSchemaNormalizationContext } from "./shared.js";
import { isRecord } from "./shared.js";
import { collectPromptSemanticHints } from "./prompt-hints.js";

export function normalizeIntentSchema(
  candidateInput: Partial<IntentSchema>,
  rawText: string,
  host: HostDescriptor,
): IntentSchema {
  const candidate = coerceIntentSchemaCandidate(candidateInput);
  const promptHints = collectPromptSemanticHints(rawText);
  const context: IntentSchemaNormalizationContext = {
    rawText,
    host,
    promptHints,
    trace: {
      appliedCanonicalizationPassIds: [],
    },
  };

  const requirements = normalizeRequirements(candidate.requirements);
  const constraints = normalizeConstraints(candidate.constraints);
  const interaction = normalizeInteraction(candidate.interaction);
  const targeting = normalizeTargeting(candidate.targeting);
  const timing = normalizeTiming(candidate.timing);
  const spatial = normalizeSpatial(candidate.spatial);
  const stateModel = normalizeStateModel(candidate.stateModel);
  const flow = normalizeFlow(candidate.flow, rawText);
  const selection = normalizeSelection(candidate.selection, promptHints);
  const effects = normalizeEffects(candidate.effects);
  const outcomes = normalizeOutcomes(candidate.outcomes);
  const contentModel = normalizeContentModel(candidate.contentModel, promptHints);
  const composition = normalizeComposition(candidate.composition);
  const integrations = normalizeIntegrations(candidate.integrations);
  const uiRequirements = normalizeUIRequirements(candidate.uiRequirements);

  const initialCandidate: Partial<IntentSchema> = {
    ...candidate,
    requirements,
    constraints,
    interaction,
    targeting,
    timing,
    spatial,
    stateModel,
    flow,
    selection,
    effects,
    outcomes,
    contentModel,
    composition,
    integrations,
    uiRequirements,
  };

  const initialAnalysis = analyzeIntentSemanticLayers(initialCandidate, rawText, host, {
    promptHints,
  });
  const canonicalized = runIntentSchemaCanonicalizationPasses({
    candidate: initialCandidate,
    context,
    semanticAnalysis: initialAnalysis,
  });
  context.trace.appliedCanonicalizationPassIds = canonicalized.appliedPassIds;
  const normalizedCandidate = canonicalized.candidate;
  const finalAnalysis = canonicalized.semanticAnalysis;

  return finalizeNormalizedIntentSchema({
    version: typeof candidate.version === "string" ? candidate.version : "1.0",
    host: normalizeHost(candidate.host, host),
    request: normalizeRequest(candidate.request, rawText),
    classification: {
      intentKind: finalAnalysis.governanceDecisions.intentKind.value,
      confidence: normalizeClassificationConfidence(candidate.classification?.confidence),
    },
    actors: normalizeActors(candidate.actors),
    requirements: normalizedCandidate.requirements ?? requirements,
    constraints: normalizedCandidate.constraints ?? constraints,
    interaction: normalizedCandidate.interaction ?? interaction,
    targeting: normalizedCandidate.targeting ?? targeting,
    timing: normalizedCandidate.timing,
    spatial: normalizedCandidate.spatial ?? spatial,
    stateModel: normalizedCandidate.stateModel,
    flow: normalizedCandidate.flow ?? flow,
    selection: normalizedCandidate.selection,
    effects: normalizedCandidate.effects,
    outcomes: normalizedCandidate.outcomes,
    contentModel: normalizedCandidate.contentModel,
    composition: normalizedCandidate.composition,
    integrations: normalizedCandidate.integrations ?? integrations,
    uiRequirements: normalizedCandidate.uiRequirements,
    normalizedMechanics: finalAnalysis.governanceDecisions.normalizedMechanics.value,
    acceptanceInvariants: normalizeInvariants(candidate.acceptanceInvariants),
    uncertainties: projectOpenSemanticResidueToUncertainties(finalAnalysis.openSemanticResidue),
    resolvedAssumptions: projectOpenSemanticResidueToResolvedAssumptions(finalAnalysis.openSemanticResidue),
    parameters: normalizeModuleSafeParameters(normalizedCandidate.parameters ?? candidate.parameters),
  });
}

function coerceIntentSchemaCandidate(
  candidate: Partial<IntentSchema> | undefined,
): Partial<IntentSchema> {
  return isRecord(candidate) ? candidate : {};
}

function finalizeNormalizedIntentSchema(schema: IntentSchema): IntentSchema {
  return schema;
}

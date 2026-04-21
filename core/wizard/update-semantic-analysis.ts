import type {
  CurrentFeatureTruth,
  IntentSchema,
  UpdateSemanticAnalysis,
} from "../schema/types.js";
import {
  buildGovernedUpdateSchema,
  deriveUpdateGovernanceDecisions,
} from "./update-governance-decisions.js";
import {
  buildUpdateCurrentTruthRawFacts,
  buildUpdatePromptRawFacts,
} from "./update-raw-facts.js";
import { deriveUpdateOpenSemanticResidue } from "./update-semantic-residue.js";

export function analyzeUpdateSemanticLayers(input: {
  requestedChange: IntentSchema;
  currentFeatureTruth: CurrentFeatureTruth;
}): {
  semanticAnalysis: UpdateSemanticAnalysis;
  governedChange: ReturnType<typeof buildGovernedUpdateSchema>;
} {
  const promptFacts = buildUpdatePromptRawFacts(input.requestedChange);
  const currentTruthFacts = buildUpdateCurrentTruthRawFacts(input.currentFeatureTruth);
  const governanceDecisions = deriveUpdateGovernanceDecisions({
    requestedChange: input.requestedChange,
    currentFeatureTruth: input.currentFeatureTruth,
    promptFacts,
    currentTruthFacts,
  });
  const openSemanticResidue = deriveUpdateOpenSemanticResidue({
    requestedChange: input.requestedChange,
    currentFeatureTruth: input.currentFeatureTruth,
    promptFacts,
    governanceDecisions,
  });
  const semanticAnalysis: UpdateSemanticAnalysis = {
    promptFacts,
    currentTruthFacts,
    governanceDecisions,
    openSemanticResidue,
  };
  const governedChange = buildGovernedUpdateSchema({
    requestedChange: input.requestedChange,
    currentFeatureTruth: input.currentFeatureTruth,
    governanceDecisions,
    promptFacts,
  });

  return {
    semanticAnalysis,
    governedChange,
  };
}

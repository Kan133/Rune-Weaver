import type { IntentSchema } from "../../schema/types.js";
import {
  extractIntentSchemaGovernanceDecisions,
  type IntentGovernanceDecisions,
} from "./semantic-analysis.js";
import { stableStringify } from "./shared.js";

export type IntentGovernanceCore = Record<string, unknown>;

export function projectIntentGovernanceDecisionCore(
  decisions: IntentGovernanceDecisions,
): IntentGovernanceCore {
  return {
    intentKind: decisions.intentKind.value,
    normalizedMechanics: decisions.normalizedMechanics.value,
    crossSystemComposition: decisions.crossSystemComposition.value,
    nonUiGameplayPresent: decisions.nonUiGameplayPresent.value,
    canonicalizationEligible: decisions.canonicalizationEligible.value,
    activationContract: decisions.activationContract.value,
    selectionContract: decisions.selectionContract.value,
    uiContract: decisions.uiContract.value,
    timingContract: decisions.timingContract.value,
    effectContract: decisions.effectContract.value,
    outcomeContract: decisions.outcomeContract.value,
    stateContract: decisions.stateContract.value,
    contentContract: decisions.contentContract.value,
    compositionContract: decisions.compositionContract.value,
  };
}

export function stableIntentGovernanceDecisionFingerprint(
  decisions: IntentGovernanceDecisions,
): string {
  return stableStringify(projectIntentGovernanceDecisionCore(decisions));
}

export function extractIntentSchemaGovernanceCore(schema: IntentSchema): IntentGovernanceCore {
  return projectIntentGovernanceDecisionCore(extractIntentSchemaGovernanceDecisions(schema));
}

export function stableIntentSchemaGovernanceFingerprint(schema: IntentSchema): string {
  return stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(schema));
}

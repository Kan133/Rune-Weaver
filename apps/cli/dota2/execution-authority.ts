import type {
  Blueprint,
  CurrentFeatureContext,
  ExecutionAuthorityDecision,
  IntentSchema,
  WizardClarificationSignals,
  WizardStructuralOpenContract,
} from "../../../core/schema/types.js";
import {
  isWizardStructuralOpenContractResolved,
} from "../../../core/wizard/index.js";
import type { CreateReadinessDecision } from "../../../adapters/dota2/blueprint/index.js";

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function resolveClosedSurfaces(
  createReadinessDecision?: CreateReadinessDecision,
): Set<NonNullable<WizardStructuralOpenContract["surface"]>> {
  const closed = new Set<NonNullable<WizardStructuralOpenContract["surface"]>>();
  for (const residue of createReadinessDecision?.closedResidue || []) {
    if (
      residue.surface === "activation"
      || residue.surface === "selection_flow"
      || residue.surface === "state_scope"
      || residue.surface === "composition_boundary"
    ) {
      closed.add(residue.surface);
    }
  }
  return closed;
}

export function resolveExecutionAuthorityAfterBlueprint(input: {
  schema: IntentSchema;
  blueprint: Pick<Blueprint, "commitDecision"> | null | undefined;
  clarificationSignals?: WizardClarificationSignals;
  currentFeatureContext?: CurrentFeatureContext | null;
  createReadinessDecision?: CreateReadinessDecision;
}): ExecutionAuthorityDecision {
  const closedSurfaces = resolveClosedSurfaces(input.createReadinessDecision);
  const remainingStructuralContracts = (input.clarificationSignals?.openStructuralContracts || []).filter(
    (contract) => !isWizardStructuralOpenContractResolved(contract, {
      schema: input.schema,
      currentFeatureContext: input.currentFeatureContext || undefined,
      closedSurfaces,
    }),
  );
  const unresolvedDependencies = input.clarificationSignals?.unresolvedDependencies || [];
  const canAssemble = input.blueprint?.commitDecision?.canAssemble ?? false;
  const canWriteHost = input.blueprint?.commitDecision?.canWriteHost ?? canAssemble;
  const missingBlueprintReason = input.blueprint
    ? []
    : ["Blueprint generation did not produce a final blueprint."];
  const structuralReasons = remainingStructuralContracts.map((contract) => contract.summary);
  const dependencyReasons = unresolvedDependencies.map((dependency) => dependency.summary);
  const blueprintReasons = !canAssemble || !canWriteHost
    ? (input.blueprint?.commitDecision?.reasons || [])
    : [];
  const reasons = dedupeStrings([
    ...missingBlueprintReason,
    ...structuralReasons,
    ...dependencyReasons,
    ...blueprintReasons,
  ]);

  return {
    blocksBlueprint: !input.blueprint || !canAssemble || remainingStructuralContracts.length > 0,
    blocksWrite:
      !input.blueprint
      || !canAssemble
      || !canWriteHost
      || remainingStructuralContracts.length > 0
      || unresolvedDependencies.length > 0,
    requiresReview:
      Boolean(input.blueprint?.commitDecision?.requiresReview)
      || Boolean(input.clarificationSignals?.reasons.length)
      || remainingStructuralContracts.length > 0
      || unresolvedDependencies.length > 0,
    reasons,
    remainingStructuralContracts,
    unresolvedDependencies,
  };
}

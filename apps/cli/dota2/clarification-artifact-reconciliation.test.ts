import assert from "node:assert/strict";

import type {
  ExecutionAuthorityDecision,
  WizardClarificationPlan,
  WizardClarificationSignals,
} from "../../../core/schema/types.js";
import { reconcileClarificationArtifactTruth } from "./clarification-artifact-reconciliation.js";

function createClarificationPlan(): WizardClarificationPlan {
  return {
    questions: [
      {
        id: "clarify-selection-flow",
        question: "Does the player choose one result, or do all revealed results resolve immediately?",
        targetPaths: ["selection"],
        reason: "Selection-flow boundary is unresolved.",
        impact: "structural-open-contract",
      },
      {
        id: "clarify-cross-feature-target",
        question: "Which existing feature should receive the granted reward?",
        targetPaths: ["composition.dependencies"],
        reason: "Cross-feature target is unresolved.",
        impact: "write-blocking-unresolved-dependency",
        unresolvedDependencyId: "dep-cross-feature-target",
      },
      {
        id: "clarify-closed-noise",
        question: "Legacy noisy question that should not survive artifact reconciliation.",
        targetPaths: ["interaction.activations"],
        reason: "Closed activation boundary noise.",
        impact: "structural-open-contract",
      },
    ],
    maxQuestions: 3,
    requiredForFaithfulInterpretation: true,
    targetPaths: ["selection", "composition.dependencies", "interaction.activations"],
    reason: "Clarification is required before execution.",
  };
}

function createClarificationSignals(): WizardClarificationSignals {
  return {
    semanticPosture: "bounded",
    reasons: [
      "Selection-flow boundary is unresolved.",
      "Cross-feature target is unresolved.",
      "Closed activation boundary noise.",
    ],
    openStructuralContracts: [
      {
        id: "contract-selection-flow",
        kind: "selection-flow-boundary",
        surface: "selection_flow",
        summary: "Selection-flow boundary is unresolved.",
        targetPaths: ["selection"],
        questionIds: ["clarify-selection-flow"],
      },
      {
        id: "contract-closed-noise",
        kind: "activation-boundary",
        surface: "activation",
        summary: "Closed activation boundary noise.",
        targetPaths: ["interaction.activations"],
        questionIds: ["clarify-closed-noise"],
      },
    ],
    unresolvedDependencies: [
      {
        id: "dep-cross-feature-target",
        kind: "cross-feature-target",
        summary: "Cross-feature target is unresolved.",
        questionIds: ["clarify-cross-feature-target"],
      },
    ],
  };
}

function testReconciliationKeepsOnlyAuthorityBackedClarifications(): void {
  const clarificationPlan = createClarificationPlan();
  const clarificationSignals = createClarificationSignals();
  const executionAuthority: ExecutionAuthorityDecision = {
    blocksBlueprint: false,
    blocksWrite: true,
    requiresReview: true,
    reasons: ["Cross-feature target is unresolved."],
    remainingStructuralContracts: [],
    unresolvedDependencies: [
      {
        id: "dep-cross-feature-target",
        kind: "cross-feature-target",
        summary: "Cross-feature target is unresolved.",
        questionIds: ["clarify-cross-feature-target"],
      },
    ],
  };

  const reconciled = reconcileClarificationArtifactTruth({
    clarificationPlan,
    clarificationSignals,
    executionAuthority,
  });

  assert.deepEqual(
    reconciled.clarificationPlan?.questions.map((question) => question.id),
    ["clarify-cross-feature-target"],
  );
  assert.deepEqual(
    reconciled.clarificationSignals?.openStructuralContracts,
    [],
  );
  assert.deepEqual(
    reconciled.clarificationSignals?.unresolvedDependencies.map((dependency) => dependency.id),
    ["dep-cross-feature-target"],
  );
}

function testReconciliationDropsClarificationPlanWhenAuthorityHasNoOpenQuestions(): void {
  const reconciled = reconcileClarificationArtifactTruth({
    clarificationPlan: createClarificationPlan(),
    clarificationSignals: createClarificationSignals(),
    executionAuthority: {
      blocksBlueprint: false,
      blocksWrite: false,
      requiresReview: false,
      reasons: [],
      remainingStructuralContracts: [],
      unresolvedDependencies: [],
    },
  });

  assert.equal(reconciled.clarificationPlan, undefined);
  assert.deepEqual(reconciled.clarificationSignals?.openStructuralContracts, []);
  assert.deepEqual(reconciled.clarificationSignals?.unresolvedDependencies, []);
}

function testReconciliationLeavesPayloadUntouchedWithoutExecutionAuthority(): void {
  const clarificationPlan = createClarificationPlan();
  const clarificationSignals = createClarificationSignals();

  const reconciled = reconcileClarificationArtifactTruth({
    clarificationPlan,
    clarificationSignals,
  });

  assert.equal(reconciled.clarificationPlan, clarificationPlan);
  assert.equal(reconciled.clarificationSignals, clarificationSignals);
}

testReconciliationKeepsOnlyAuthorityBackedClarifications();
testReconciliationDropsClarificationPlanWhenAuthorityHasNoOpenQuestions();
testReconciliationLeavesPayloadUntouchedWithoutExecutionAuthority();

console.log("apps/cli/dota2/clarification-artifact-reconciliation.test.ts passed");

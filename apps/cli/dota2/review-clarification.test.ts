import assert from "node:assert/strict";

import type {
  ExecutionAuthorityDecision,
  WizardClarificationPlan,
  WizardClarificationSignals,
} from "../../../core/schema/types.js";
import { reconcileClarificationForReviewArtifact } from "./review-clarification.js";

function createClarificationPlan(): WizardClarificationPlan {
  return {
    questions: [
      {
        id: "clarify-selection-flow",
        question: "After the shown candidates appear, should the player choose one to commit, or should the shown results resolve without a follow-up choice?",
        targetPaths: ["selection", "flow", "requirements.typed"],
        reason: "The request shows multiple candidates but does not say whether the player chooses one or the revealed results resolve immediately without a follow-up choice.",
        impact: "structural-open-contract",
      },
      {
        id: "clarify-cross-feature-target",
        question: "Which exact feature is being granted, read, or coupled to?",
        targetPaths: ["composition.dependencies"],
        reason: "Cross-feature semantics are present, but the target feature boundary is not explicit.",
        impact: "write-blocking-unresolved-dependency",
        unresolvedDependencyId: "cross-feature-target",
      },
    ],
    maxQuestions: 3,
    requiredForFaithfulInterpretation: true,
    targetPaths: ["selection", "flow", "requirements.typed", "composition.dependencies"],
    reason: "The governed create semantics still contain unresolved structural boundaries that would materially change execution.",
    signals: {
      semanticPosture: "open",
      reasons: [
        "The request shows multiple candidates but does not say whether the player chooses one or the revealed results resolve immediately without a follow-up choice.",
        "Cross-feature semantics are present, but the target feature boundary is not explicit.",
      ],
      openStructuralContracts: [
        {
          id: "clarify-selection-flow",
          kind: "selection-flow-boundary",
          surface: "selection_flow",
          summary: "The request shows multiple candidates but does not say whether the player chooses one or the revealed results resolve immediately without a follow-up choice.",
          targetPaths: ["selection", "flow", "requirements.typed"],
          questionIds: ["clarify-selection-flow"],
        },
      ],
      unresolvedDependencies: [
        {
          id: "cross-feature-target",
          kind: "cross-feature-target",
          summary: "Cross-feature semantics are present, but the target feature boundary is not explicit.",
          questionIds: ["clarify-cross-feature-target"],
        },
      ],
    },
  };
}

function createExecutionAuthority(overrides: Partial<ExecutionAuthorityDecision> = {}): ExecutionAuthorityDecision {
  return {
    blocksBlueprint: false,
    blocksWrite: false,
    requiresReview: false,
    reasons: [],
    remainingStructuralContracts: [],
    unresolvedDependencies: [],
    ...overrides,
  };
}

function testReconciliationDropsClosedStructuralQuestions(): void {
  const result = reconcileClarificationForReviewArtifact({
    clarificationPlan: createClarificationPlan(),
    clarificationSignals: createClarificationPlan().signals as WizardClarificationSignals,
    executionAuthority: createExecutionAuthority(),
  });

  assert.equal(result.clarificationPlan, undefined);
  assert.equal(result.clarificationSignals.semanticPosture, "bounded");
  assert.equal(result.clarificationSignals.openStructuralContracts.length, 0);
  assert.equal(result.clarificationSignals.unresolvedDependencies.length, 0);
}

function testReconciliationKeepsOnlyUnresolvedDependencyQuestions(): void {
  const result = reconcileClarificationForReviewArtifact({
    clarificationPlan: createClarificationPlan(),
    clarificationSignals: createClarificationPlan().signals as WizardClarificationSignals,
    executionAuthority: createExecutionAuthority({
      blocksWrite: true,
      requiresReview: true,
      unresolvedDependencies: [
        {
          id: "cross-feature-target",
          kind: "cross-feature-target",
          summary: "Cross-feature semantics are present, but the target feature boundary is not explicit.",
          questionIds: ["clarify-cross-feature-target"],
        },
      ],
    }),
  });

  assert.equal(result.clarificationPlan?.questions.length, 1);
  assert.equal(result.clarificationPlan?.questions[0]?.id, "clarify-cross-feature-target");
  assert.equal(result.clarificationPlan?.requiredForFaithfulInterpretation, true);
  assert.equal(result.clarificationSignals.openStructuralContracts.length, 0);
  assert.equal(result.clarificationSignals.unresolvedDependencies.length, 1);
}

function testReconciliationKeepsOnlyRemainingStructuralQuestions(): void {
  const result = reconcileClarificationForReviewArtifact({
    clarificationPlan: createClarificationPlan(),
    clarificationSignals: createClarificationPlan().signals as WizardClarificationSignals,
    executionAuthority: createExecutionAuthority({
      blocksBlueprint: true,
      blocksWrite: true,
      requiresReview: true,
      remainingStructuralContracts: [
        {
          id: "clarify-selection-flow",
          kind: "selection-flow-boundary",
          surface: "selection_flow",
          summary: "The request shows multiple candidates but does not say whether the player chooses one or the revealed results resolve immediately without a follow-up choice.",
          targetPaths: ["selection", "flow", "requirements.typed"],
          questionIds: ["clarify-selection-flow"],
        },
      ],
    }),
  });

  assert.equal(result.clarificationPlan?.questions.length, 1);
  assert.equal(result.clarificationPlan?.questions[0]?.id, "clarify-selection-flow");
  assert.equal(result.clarificationPlan?.requiredForFaithfulInterpretation, true);
  assert.equal(result.clarificationSignals.openStructuralContracts.length, 1);
  assert.equal(result.clarificationSignals.unresolvedDependencies.length, 0);
}

testReconciliationDropsClosedStructuralQuestions();
testReconciliationKeepsOnlyUnresolvedDependencyQuestions();
testReconciliationKeepsOnlyRemainingStructuralQuestions();

console.log("apps/cli/dota2/review-clarification.test.ts passed");

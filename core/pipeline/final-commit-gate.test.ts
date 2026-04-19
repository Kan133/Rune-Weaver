import assert from "node:assert/strict";

import { buildFinalValidationStatus, calculateFinalCommitDecision } from "./final-commit-gate.js";
import type { Blueprint } from "../schema/types.js";
import type { ModuleImplementationRecord } from "../workspace/types.js";

const baseBlueprint: Blueprint = {
  id: "bp_test",
  version: "1.0",
  summary: "test blueprint",
  sourceIntent: {
    intentKind: "ability",
    goal: "test",
    normalizedMechanics: {},
  } as Blueprint["sourceIntent"],
  modules: [],
  connections: [],
  patternHints: [],
  assumptions: [],
  validations: [],
  readyForAssembly: true,
};

function createModule(
  overrides: Partial<ModuleImplementationRecord> = {},
): ModuleImplementationRecord {
  return {
    moduleId: "runtime",
    role: "runtime",
    selectedPatterns: ["input.key_binding"],
    sourceKind: "templated",
    implementationStrategy: "pattern",
    maturity: "templated",
    requiresReview: false,
    reviewReasons: [],
    ...overrides,
  };
}

function testModuleReviewForcesExploratoryDecision(): void {
  const decision = calculateFinalCommitDecision({
    blueprint: baseBlueprint,
    moduleRecords: [
      createModule(),
      createModule({
        moduleId: "synth_effect",
        sourceKind: "synthesized",
        implementationStrategy: "guided_native",
        maturity: "stabilized",
        requiresReview: true,
        reviewReasons: ["synthesized host-native effect path"],
      }),
    ],
    hostValidation: { success: true, issues: [] },
    runtimeValidation: { success: true, limitations: [] },
  });

  assert.equal(decision.outcome, "exploratory");
  assert.equal(decision.requiresReview, true);
  assert.ok(decision.downgradedFeatures?.includes("module:synth_effect"));
  assert.ok(decision.reasons.some((reason) => reason.includes("[module:synth_effect]")));
}

function testBlockedDecisionStillWinsOverModuleReview(): void {
  const decision = calculateFinalCommitDecision({
    blueprint: baseBlueprint,
    moduleRecords: [
      createModule({
        moduleId: "exploratory_runtime",
        sourceKind: "synthesized",
        implementationStrategy: "exploratory",
        maturity: "exploratory",
        requiresReview: true,
        reviewReasons: ["exploratory runtime"],
      }),
    ],
    hostValidation: { success: false, issues: ["host failed"] },
    runtimeValidation: { success: true, limitations: [] },
  });

  assert.equal(decision.outcome, "blocked");
  assert.deepEqual(decision.reasons, ["host failed"]);

  const validationStatus = buildFinalValidationStatus(
    baseBlueprint,
    {
      blueprint: baseBlueprint,
      moduleRecords: [
        createModule({
          moduleId: "exploratory_runtime",
          sourceKind: "synthesized",
          implementationStrategy: "exploratory",
          maturity: "exploratory",
          requiresReview: true,
          reviewReasons: ["exploratory runtime"],
        }),
      ],
      hostValidation: { success: false, issues: ["host failed"] },
      runtimeValidation: { success: true, limitations: [] },
    },
    decision,
  );

  assert.equal(validationStatus.status, "failed");
  assert.ok(validationStatus.warnings.some((warning) => warning.includes("[module:exploratory_runtime]")));
}

testModuleReviewForcesExploratoryDecision();
testBlockedDecisionStillWinsOverModuleReview();

console.log("core/pipeline/final-commit-gate.test.ts passed");

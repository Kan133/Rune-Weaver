import assert from "node:assert/strict";

import { getValidationSummary, validateIntentSchema } from "./schema-validator";
import type { IntentSchema } from "../schema/types";

function makeSchema(overrides: Partial<IntentSchema>): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "做一个按Q键触发的朝鼠标方向冲刺技能",
      goal: "实现一个冲刺位移技能",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    requirements: {
      functional: ["按键触发技能", "朝鼠标方向位移"],
    },
    constraints: {},
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
    ...overrides,
  };
}

function testValidSchemaPassesWithoutCompletionFlags() {
  const issues = validateIntentSchema(
    makeSchema({
      uncertainties: [
        {
          id: "unc_optional",
          summary: "Optional tuning is still open.",
          affects: ["intent"],
          severity: "low",
        },
      ],
    }),
  );

  const summary = getValidationSummary(issues);
  assert.equal(summary.valid, true);
  assert.equal(summary.errorCount, 0);
}

function testMissingIntentKindFails() {
  const issues = validateIntentSchema(
    makeSchema({
      // @ts-expect-error intentional invalid case
      classification: {},
    }),
  );

  assert.ok(issues.some((issue) => issue.code === "MISSING_INTENT_KIND"));
}

function testEmptyFunctionalFails() {
  const issues = validateIntentSchema(
    makeSchema({
      requirements: {
        functional: [],
      },
    }),
  );

  assert.ok(issues.some((issue) => issue.code === "EMPTY_FUNCTIONAL_REQUIREMENTS"));
}

function testGoalStillRequired() {
  const issues = validateIntentSchema(
    makeSchema({
      request: {
        rawPrompt: "测试",
        goal: "",
      },
    }),
  );

  assert.ok(issues.some((issue) => issue.code === "MISSING_GOAL"));
}

function runTests() {
  testValidSchemaPassesWithoutCompletionFlags();
  testMissingIntentKindFails();
  testEmptyFunctionalFails();
  testGoalStillRequired();
  console.log("core/validation/schema-validator.test.ts passed");
}

runTests();

import assert from "node:assert/strict";

import type { IntentSchema } from "../schema/types.js";
import {
  buildCurrentFeatureContext,
  buildUpdateWizardMessages,
  createUpdateIntentFromRequestedChange,
  runWizardToUpdateIntent,
} from "./index.js";

function createSourceBackedFeatureRecord() {
  return {
    featureId: "selection_pool_demo",
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 3,
    blueprintId: "bp_selection_pool_demo",
    selectedPatterns: [
      "input.key_binding",
      "data.weighted_pool",
      "rule.selection_flow",
      "ui.selection_modal",
    ],
    generatedFiles: [],
    entryBindings: [],
    sourceModel: {
      adapter: "selection_pool",
      version: 1,
      path: "missing.source.json",
    },
    featureAuthoring: {
      mode: "source-backed" as const,
      profile: "selection_pool" as const,
      parameters: {
        triggerKey: "F4",
        choiceCount: 3,
        objects: Array.from({ length: 6 }, (_, index) => ({ id: `obj_${index + 1}` })),
        inventory: {
          enabled: false,
          capacity: 15,
          fullMessage: "Inventory full",
        },
      },
      parameterSurface: {
        invariants: ["single trigger", "same-feature ownership"],
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createGenericFeatureRecord() {
  return {
    featureId: "rw_dash_g",
    intentKind: "micro-feature",
    status: "active" as const,
    revision: 2,
    blueprintId: "bp_dash_g",
    selectedPatterns: [
      "input.key_binding",
      "effect.modifier_applier",
    ],
    generatedFiles: [],
    entryBindings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function testBuildCurrentFeatureContextStaysGeneric() {
  const context = buildCurrentFeatureContext(
    createSourceBackedFeatureRecord(),
    "D:\\rw_test_missing",
  );

  assert.equal(context.featureId, "selection_pool_demo");
  assert.equal(context.sourceBacked, true);
  assert.deepEqual(context.preservedModuleBackbone, [
    "input.key_binding",
    "data.weighted_pool",
    "rule.selection_flow",
    "ui.selection_modal",
  ]);
  assert.deepEqual(context.admittedSkeleton, [
    "input.key_binding",
    "data.weighted_pool",
    "rule.selection_flow",
    "ui.selection_modal",
  ]);
  assert.equal(context.boundedFields.triggerKey, "F4");
  assert.equal(context.boundedFields.choiceCount, 3);
  assert.equal(context.boundedFields.objectCount, 6);
}

function testCreateUpdateIntentPreservesSkeletonAndDeltaWithoutReadiness() {
  const currentFeatureContext = buildCurrentFeatureContext(
    createSourceBackedFeatureRecord(),
    "D:\\rw_test_missing",
  );
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "给这个功能增加一个 15 格的库存面板，确认后的对象存进去。",
      goal: "给这个功能增加一个 15 格的库存面板，确认后的对象存进去。",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    requirements: {
      functional: ["Add a 15-slot inventory panel for confirmed objects."],
    },
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      inventory: {
        enabled: true,
        capacity: 15,
        storeSelectedItems: true,
        blockDrawWhenFull: true,
        fullMessage: "Inventory full",
        presentation: "persistent_panel",
      },
    },
    normalizedMechanics: {
      playerChoice: true,
      uiModal: true,
    },
    resolvedAssumptions: [],
    constraints: {},
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);

  assert.equal(updateIntent.target.featureId, "selection_pool_demo");
  assert.equal(updateIntent.readiness, undefined);
  assert.equal(updateIntent.requiredClarifications, undefined);
  assert.ok(updateIntent.delta.preserve.some((item) => item.path === "backbone.input.key_binding"));
  assert.ok(updateIntent.delta.add.some((item) => item.path === "selection.inventory"));
}

function testCreateUpdateIntentStaysGenericForNonSourceBackedFeature() {
  const currentFeatureContext = buildCurrentFeatureContext(
    createGenericFeatureRecord(),
    "D:\\test3",
  );
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "把这个技能的触发键改成 G。",
      goal: "把这个技能的触发键改成 G。",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    requirements: {
      functional: ["Rebind the existing trigger to G."],
    },
    interaction: {
      activations: [
        {
          kind: "key",
          input: "G",
        },
      ],
    },
    normalizedMechanics: {
      trigger: true,
    },
    resolvedAssumptions: [],
    constraints: {},
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);

  assert.equal(updateIntent.target.sourceBacked, false);
  assert.deepEqual(updateIntent.currentFeatureContext.boundedFields, {});
  assert.ok(updateIntent.delta.modify.some((item) => item.path === "input.triggerKey"));
}

function testCreateUpdateIntentDetectsGenericObjectCountExpansion() {
  const currentFeatureContext = buildCurrentFeatureContext(
    createSourceBackedFeatureRecord(),
    "D:\\rw_test_missing",
  );
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "把这个对象池从 6 个扩充到 20 个，保持现有逻辑不变。",
      goal: "把这个对象池从 6 个扩充到 20 个，保持现有逻辑不变。",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "medium",
    },
    requirements: {
      functional: ["Expand the existing same-feature owned object collection to 20 items."],
    },
    normalizedMechanics: {
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
    constraints: {},
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);

  assert.ok(updateIntent.delta.modify.some((item) => item.path === "content.collection.objectCount"));
}

function testUpdateWizardPromptStaysSemanticOnly() {
  const currentFeatureContext = buildCurrentFeatureContext(
    createSourceBackedFeatureRecord(),
    "D:\\rw_test_missing",
  );
  const systemMessage = buildUpdateWizardMessages(
    "给这个功能加库存。",
    currentFeatureContext,
    { kind: "dota2-x-template" },
  )[0]?.content || "";

  assert.match(systemMessage, /semantic-only/i);
  assert.match(systemMessage, /Do not output readiness/i);
  assert.match(systemMessage, /Prefer preserve semantics over rebuild semantics/i);
}

async function testRunWizardToUpdateIntentReturnsClarificationSidecar() {
  const currentFeatureContext = buildCurrentFeatureContext(
    createSourceBackedFeatureRecord(),
    "D:\\rw_test_missing",
  );

  const result = await runWizardToUpdateIntent({
    client: {
      async generateObject() {
        return {
          object: {
            requestedChange: {
              request: {
                goal: "After one selection, grant another feature and persist it across matches.",
              },
              classification: {
                intentKind: "cross-system-composition",
                confidence: "high",
              },
              requirements: {
                functional: ["After one selection, grant another feature and persist it across matches."],
              },
              outcomes: {
                operations: ["grant-feature", "update-state"],
              },
              timing: {
                duration: { kind: "persistent" },
              },
              composition: {
                dependencies: [
                  { kind: "cross-feature", relation: "grants", required: true },
                  { kind: "external-system", relation: "writes", required: true },
                ],
              },
              resolvedAssumptions: [],
              constraints: {},
            },
            delta: {
              modify: [
                {
                  path: "composition.dependencies",
                  kind: "composition",
                  summary: "Add cross-feature grant semantics.",
                },
              ],
            },
          },
          raw: {},
        };
      },
    },
    input: {
      rawText: "After one selection, grant another feature and persist it across matches.",
      currentFeatureContext,
    },
  });

  assert.equal(result.updateIntent.readiness, undefined);
  assert.ok((result.clarificationPlan?.questions.length || 0) >= 2);
  assert.ok(result.clarificationPlan?.questions.some((question) => question.id === "clarify-cross-feature-target"));
}

async function runTests() {
  testBuildCurrentFeatureContextStaysGeneric();
  testCreateUpdateIntentPreservesSkeletonAndDeltaWithoutReadiness();
  testCreateUpdateIntentStaysGenericForNonSourceBackedFeature();
  testCreateUpdateIntentDetectsGenericObjectCountExpansion();
  testUpdateWizardPromptStaysSemanticOnly();
  await testRunWizardToUpdateIntentReturnsClarificationSidecar();
  console.log("core/wizard/update-intent.test.ts passed");
}

runTests();

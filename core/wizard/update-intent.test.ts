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
    modules: [
      {
        moduleId: "selection_input",
        role: "input_trigger",
        category: "trigger",
        sourceKind: "family" as const,
        selectedPatternIds: ["input.key_binding"],
      },
      {
        moduleId: "selection_pool",
        role: "weighted_pool",
        category: "data",
        sourceKind: "family" as const,
        selectedPatternIds: ["data.weighted_pool"],
      },
      {
        moduleId: "selection_flow",
        role: "selection_flow",
        category: "rule",
        sourceKind: "family" as const,
        selectedPatternIds: ["rule.selection_flow"],
      },
      {
        moduleId: "selection_modal",
        role: "selection_modal",
        category: "ui",
        sourceKind: "family" as const,
        selectedPatternIds: ["ui.selection_modal"],
      },
      {
        moduleId: "selection_effect",
        role: "effect_application",
        category: "effect",
        sourceKind: "family" as const,
        selectedPatternIds: [],
      },
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

function createGenericSourceBackedProjectionRecord() {
  return {
    featureId: "selection_pool_projection_demo",
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 4,
    blueprintId: "bp_selection_pool_projection_demo",
    selectedPatterns: [
      "input.key_binding",
      "data.weighted_pool",
      "rule.selection_flow",
      "ui.selection_modal",
    ],
    modules: [
      {
        moduleId: "gameplay_core",
        role: "gameplay-core",
        category: "effect",
        sourceKind: "family" as const,
        selectedPatternIds: ["effect.modifier_applier"],
      },
      {
        moduleId: "shared_support",
        role: "shared-support",
        category: "data",
        sourceKind: "family" as const,
        selectedPatternIds: ["data.weighted_pool"],
      },
      {
        moduleId: "ui_surface",
        role: "ui-surface",
        category: "ui",
        sourceKind: "family" as const,
        selectedPatternIds: ["ui.selection_modal"],
      },
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
      },
      parameterSurface: {
        invariants: ["same selection skeleton"],
      },
    },
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
  assert.ok((context.moduleRecords || []).length >= 5);
  assert.deepEqual(context.sourceBackedInvariantRoles, [
    "input_trigger",
    "weighted_pool",
    "selection_flow",
    "selection_modal",
    "effect_application",
  ]);
  assert.deepEqual(context.preservedModuleBackbone, [
    "input_trigger",
    "weighted_pool",
    "selection_flow",
    "selection_modal",
    "effect_application",
  ]);
  assert.equal(context.admittedSkeleton, undefined);
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
  assert.ok(updateIntent.delta.preserve.some((item) => item.path === "backbone.input_trigger"));
  assert.ok(updateIntent.delta.preserve.some((item) => item.path === "backbone.selection_modal"));
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

function testSourceBackedInvariantBackboneOutranksGenericProjectionRoles() {
  const context = buildCurrentFeatureContext(
    createGenericSourceBackedProjectionRecord(),
    "D:\\rw_test_missing",
  );

  assert.deepEqual(context.sourceBackedInvariantRoles, [
    "input_trigger",
    "weighted_pool",
    "selection_flow",
    "selection_modal",
    "effect_application",
  ]);
  assert.deepEqual(context.preservedModuleBackbone, [
    "input_trigger",
    "weighted_pool",
    "selection_flow",
    "selection_modal",
    "effect_application",
  ]);
  assert.equal(context.preservedModuleBackbone.includes("gameplay-core"), false);
  assert.equal(context.preservedModuleBackbone.includes("shared-support"), false);
  assert.equal(context.preservedModuleBackbone.includes("ui-surface"), false);
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

function testInventoryCapacityUpdateDoesNotInventChoiceCountDelta() {
  const currentFeatureContext = buildCurrentFeatureContext(
    createSourceBackedFeatureRecord(),
    "D:\\rw_test_missing",
  );
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "16格的天赋仓库，如果满了则按F4不能继续抽取天赋。",
      goal: "Expand the current inventory capacity to 16 and stop drawing when full.",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    requirements: {
      functional: ["Expand the inventory to 16 slots and stop opening new draws when the inventory is full."],
    },
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      choiceCount: 1,
      inventory: {
        enabled: true,
        capacity: 16,
        storeSelectedItems: true,
        blockDrawWhenFull: true,
        fullMessage: "Talent inventory full",
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

  assert.equal(
    updateIntent.delta.modify.some((item) => item.path === "selection.choiceCount"),
    false,
  );
  assert.ok(updateIntent.delta.modify.some((item) => item.path === "selection.inventory.capacity"));
}

function testExplicitChoiceCountChangeProducesDelta() {
  const currentFeatureContext = buildCurrentFeatureContext(
    createSourceBackedFeatureRecord(),
    "D:\\rw_test_missing",
  );
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "把当前抽取改成 5 选 1，展示 5 个候选。",
      goal: "Change the current draw to show 5 candidates and let the player choose 1.",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    requirements: {
      functional: ["Change the current draw to show 5 candidates and let the player choose 1."],
    },
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      choiceCount: 5,
    },
    normalizedMechanics: {
      playerChoice: true,
      uiModal: true,
    },
    resolvedAssumptions: [],
    constraints: {},
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);

  assert.ok(updateIntent.delta.modify.some((item) => item.path === "selection.choiceCount"));
}

function testRestoreThreeChoiceChineseShorthandProducesDeltaAgainstPollutedTruth() {
  const featureRecord = createSourceBackedFeatureRecord();
  featureRecord.featureAuthoring.parameters.choiceCount = 1;
  const currentFeatureContext = buildCurrentFeatureContext(
    featureRecord,
    "D:\\rw_test_missing",
  );
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "恢复成 F4 三选一天赋抽取，保持 16 格仓库；如果满了则按 F4 不能继续抽取天赋。",
      goal: "Restore F4-triggered three-candidate talent draw while preserving the 16-slot inventory and full-inventory block.",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    requirements: {
      functional: ["Restore the draw to three presented candidates while keeping single confirmation and the current inventory behavior."],
    },
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      choiceCount: 3,
      inventory: {
        enabled: true,
        capacity: 16,
        storeSelectedItems: true,
        blockDrawWhenFull: true,
        fullMessage: "Talent inventory full",
        presentation: "persistent_panel",
      },
    },
    normalizedMechanics: {
      playerChoice: true,
      uiModal: true,
      weightedSelection: true,
      candidatePool: true,
    },
    resolvedAssumptions: [
      "Interpret 三选一 as presenting three candidates while still confirming exactly one.",
    ],
    constraints: {},
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);

  assert.ok(updateIntent.delta.modify.some((item) => item.path === "selection.choiceCount"));
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
  assert.match(systemMessage, /single-confirm invariants/i);
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

async function testRunWizardToUpdateIntentStripsInferredPersistenceFromInventoryUpdate() {
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
                goal: "Add a 16-slot talent inventory and block further draws when it is full.",
              },
              classification: {
                intentKind: "micro-feature",
                confidence: "high",
              },
              requirements: {
                functional: ["Add a 16-slot talent inventory and block further draws when it is full."],
              },
              timing: {
                duration: { kind: "persistent" },
              },
              stateModel: {
                states: [
                  {
                    id: "talent_inventory",
                    summary: "Store selected talents in the current feature inventory.",
                    owner: "feature",
                    lifetime: "session",
                    mutationMode: "update",
                  },
                ],
              },
              selection: {
                mode: "hybrid",
                source: "weighted-pool",
                cardinality: "single",
                choiceCount: 3,
                repeatability: "repeatable",
                inventory: {
                  enabled: true,
                  capacity: 16,
                  storeSelectedItems: true,
                  blockDrawWhenFull: true,
                  presentation: "persistent_panel",
                },
              },
              effects: {
                operations: ["apply", "update-state"],
                durationSemantics: "persistent",
                targets: ["inventory state"],
              },
              uiRequirements: {
                needed: true,
                surfaces: ["selection_modal", "persistent_inventory_panel"],
              },
              normalizedMechanics: {
                trigger: true,
                candidatePool: true,
                weightedSelection: true,
                playerChoice: true,
                uiModal: true,
                outcomeApplication: true,
              },
              resolvedAssumptions: [],
              constraints: {},
            },
            delta: {
              modify: [
                {
                  path: "featureAuthoring.parameters.inventory",
                  kind: "state",
                  summary: "Add the bounded inventory contract to the existing feature.",
                },
              ],
            },
          },
          raw: {},
        };
      },
    },
    input: {
      rawText: "创建一个天赋仓库，有16格，抽取的天赋会显示在仓库中，仓库满了就无法再进行抽取。",
      currentFeatureContext,
    },
  });

  assert.equal(result.requestedChange.timing?.duration, undefined);
  assert.equal(result.requestedChange.effects?.durationSemantics, undefined);
  assert.equal(result.requestedChange.selection?.inventory?.presentation, "persistent_panel");
  assert.equal(
    result.clarificationPlan?.questions.some((question) => question.id === "clarify-persistence-scope") ?? false,
    false,
  );
}

async function runTests() {
  testBuildCurrentFeatureContextStaysGeneric();
  testCreateUpdateIntentPreservesSkeletonAndDeltaWithoutReadiness();
  testCreateUpdateIntentStaysGenericForNonSourceBackedFeature();
  testSourceBackedInvariantBackboneOutranksGenericProjectionRoles();
  testCreateUpdateIntentDetectsGenericObjectCountExpansion();
  testInventoryCapacityUpdateDoesNotInventChoiceCountDelta();
  testExplicitChoiceCountChangeProducesDelta();
  testRestoreThreeChoiceChineseShorthandProducesDeltaAgainstPollutedTruth();
  testUpdateWizardPromptStaysSemanticOnly();
  await testRunWizardToUpdateIntentReturnsClarificationSidecar();
  await testRunWizardToUpdateIntentStripsInferredPersistenceFromInventoryUpdate();
  console.log("core/wizard/update-intent.test.ts passed");
}

runTests();

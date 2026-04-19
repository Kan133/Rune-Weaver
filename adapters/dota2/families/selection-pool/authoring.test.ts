import assert from "node:assert/strict";

import {
  EQUIPMENT_DRAW_EXAMPLE_CREATE_PROMPT,
  TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
  TALENT_DRAW_EXAMPLE_INVENTORY_UPDATE_PROMPT,
  TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
} from "./examples.js";
import {
  deriveSelectionPoolCurrentContextHints,
  mergeSelectionPoolFeatureAuthoringForUpdate,
  resolveSelectionPoolFamily,
} from "./index.js";
import { createUpdateIntentFromRequestedChange } from "../../../../core/wizard/index.js";
import type { IntentSchema } from "../../../../core/schema/types.js";

function testCanonicalCreateSeedsSelectionPoolAuthoring(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.blocked, false);
  assert.equal(resolution.proposal?.profile, "selection_pool");
  assert.equal(resolution.proposal?.objectKind, "talent");
  assert.equal(resolution.proposal?.parameters.triggerKey, "F4");
  assert.equal(resolution.proposal?.parameters.choiceCount, 3);
  assert.equal(resolution.proposal?.parameters.objects.length, 6);
}

function testCanonicalUpdateExpandsPoolToTwenty(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const updateResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "talent_draw_demo",
    existingFeature: {
      featureId: "talent_draw_demo",
      intentKind: "standalone-system",
      status: "active",
      revision: 1,
      blueprintId: "bp",
      selectedPatterns: [],
      generatedFiles: [],
      entryBindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featureAuthoring: {
        mode: "source-backed",
        profile: "selection_pool",
        objectKind: "talent",
        parameters: existingResolution.proposal!.parameters,
        parameterSurface: existingResolution.proposal!.parameterSurface,
      },
    },
    proposalSource: "existing-feature",
  });

  assert.equal(updateResolution.blocked, false);
  assert.equal(updateResolution.proposal?.parameters.triggerKey, "F4");
  assert.equal(updateResolution.proposal?.parameters.objects.length, 20);
  assert.deepEqual(
    updateResolution.proposal?.parameters.objects.slice(0, 6),
    existingResolution.proposal?.parameters.objects,
  );
  assert.ok(updateResolution.proposal?.parameters.objects.some((item) => item.id === "R003"));
  assert.ok(updateResolution.proposal?.parameters.objects.some((item) => item.id === "SR006"));
  assert.equal(updateResolution.proposal?.parameters.objects.at(-1)?.id, "UR002");
}

function testCanonicalInventoryUpdateKeepsExampleInventoryCopy(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const updateResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_INVENTORY_UPDATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "talent_draw_demo",
    existingFeature: {
      featureId: "talent_draw_demo",
      intentKind: "standalone-system",
      status: "active",
      revision: 1,
      blueprintId: "bp",
      selectedPatterns: [],
      generatedFiles: [],
      entryBindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featureAuthoring: {
        mode: "source-backed",
        profile: "selection_pool",
        objectKind: "talent",
        parameters: existingResolution.proposal!.parameters,
        parameterSurface: existingResolution.proposal!.parameterSurface,
      },
    },
    proposalSource: "existing-feature",
  });

  assert.equal(updateResolution.blocked, false);
  assert.equal(updateResolution.proposal?.parameters.inventory?.capacity, 15);
  assert.equal(updateResolution.proposal?.parameters.inventory?.fullMessage, "Talent inventory full");
}

function testSiblingEquipmentPromptUsesSameFamily(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: EQUIPMENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test4",
    mode: "create",
    featureId: "equipment_draw_demo",
    proposalSource: "fallback",
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.blocked, false);
  assert.equal(resolution.proposal?.profile, "selection_pool");
  assert.equal(resolution.proposal?.objectKind, "equipment");
  assert.ok(resolution.proposal?.parameters.objects.every((item) => item.id.startsWith("EQ_")));
}

function testSelectionPoolCurrentContextHintsExposeBoundedFields(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const hints = deriveSelectionPoolCurrentContextHints({
    featureId: "talent_draw_demo",
    intentKind: "standalone-system",
    status: "active",
    revision: 1,
    blueprintId: "bp",
    selectedPatterns: [],
    generatedFiles: [],
    entryBindings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    featureAuthoring: {
      mode: "source-backed",
      profile: "selection_pool",
      objectKind: resolution.proposal?.objectKind,
      parameters: resolution.proposal!.parameters,
      parameterSurface: resolution.proposal!.parameterSurface,
    },
  });

  assert.deepEqual(hints?.admittedSkeleton, [
    "input.key_binding",
    "data.weighted_pool",
    "rule.selection_flow",
    "ui.selection_modal",
  ]);
  assert.equal(hints?.boundedFields.triggerKey, "F4");
  assert.equal(hints?.boundedFields.choiceCount, 3);
  assert.equal(hints?.boundedFields.objectCount, 6);
}

function testUpdateMergeUsesUpdateIntentAuthority(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });
  const currentFeatureAuthoring = {
    mode: "source-backed" as const,
    profile: "selection_pool" as const,
    objectKind: existingResolution.proposal?.objectKind,
    parameters: existingResolution.proposal!.parameters,
    parameterSurface: existingResolution.proposal!.parameterSurface,
  };
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
      goal: TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Expand the existing same-feature object collection to 20 entries."],
    },
    normalizedMechanics: {
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
    },
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
  const updateIntent = createUpdateIntentFromRequestedChange(
    {
      featureId: "talent_draw_demo",
      revision: 1,
      intentKind: "standalone-system",
      selectedPatterns: [],
      sourceBacked: true,
      featureAuthoring: currentFeatureAuthoring,
      admittedSkeleton: [
        "input.key_binding",
        "data.weighted_pool",
        "rule.selection_flow",
        "ui.selection_modal",
      ],
      preservedInvariants: [],
      boundedFields: {
        triggerKey: "F4",
        choiceCount: 3,
        objectCount: 6,
      },
    },
    requestedChange,
  );

  const merged = mergeSelectionPoolFeatureAuthoringForUpdate({
    currentFeatureAuthoring,
    requestedChange,
    updateIntent,
  });

  assert.equal(merged.parameters.objects.length, 20);
  assert.ok(merged.parameters.objects.some((item) => item.id === "R003"));
  assert.ok(merged.notes?.some((note) => note.includes("UpdateIntent authority")));
}

function testUpdateMergePrefersRequestedTargetTriggerKey(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });
  const currentFeatureAuthoring = {
    mode: "source-backed" as const,
    profile: "selection_pool" as const,
    objectKind: existingResolution.proposal?.objectKind,
    parameters: existingResolution.proposal!.parameters,
    parameterSurface: existingResolution.proposal!.parameterSurface,
  };
  const requestedChange: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "把天赋抽取的触发键从 F4 改成 F5",
      goal: "把天赋抽取的触发键从 F4 改成 F5",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Change the existing hotkey from F4 to F5."],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
    },
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
  const updateIntent = createUpdateIntentFromRequestedChange(
    {
      featureId: "talent_draw_demo",
      revision: 1,
      intentKind: "standalone-system",
      selectedPatterns: [],
      sourceBacked: true,
      featureAuthoring: currentFeatureAuthoring,
      admittedSkeleton: [
        "input.key_binding",
        "data.weighted_pool",
        "rule.selection_flow",
        "ui.selection_modal",
      ],
      preservedInvariants: [],
      boundedFields: {
        triggerKey: "F4",
        choiceCount: 3,
        objectCount: 6,
      },
    },
    requestedChange,
  );

  const merged = mergeSelectionPoolFeatureAuthoringForUpdate({
    currentFeatureAuthoring,
    requestedChange,
    updateIntent,
  });

  assert.equal(merged.parameters.triggerKey, "F5");
}

function testUnsupportedContractEscapeHonestBlocks(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: "给这个抽取系统再加第二个触发键，并且支持跨局保存与授予另一个技能 feature。",
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.blocked, true);
  assert.ok(
    resolution.reasons.some((reason) => reason.includes("one trigger owner")) ||
      resolution.reasons.some((reason) => reason.includes("cross-feature grants")),
  );
}

testCanonicalCreateSeedsSelectionPoolAuthoring();
testCanonicalUpdateExpandsPoolToTwenty();
testCanonicalInventoryUpdateKeepsExampleInventoryCopy();
testSiblingEquipmentPromptUsesSameFamily();
testSelectionPoolCurrentContextHintsExposeBoundedFields();
testUpdateMergeUsesUpdateIntentAuthority();
testUpdateMergePrefersRequestedTargetTriggerKey();
testUnsupportedContractEscapeHonestBlocks();

console.log("adapters/dota2/families/selection-pool/authoring.test.ts passed");

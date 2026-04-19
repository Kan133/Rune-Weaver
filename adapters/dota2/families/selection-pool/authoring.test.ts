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
  normalizeSelectionPoolFeatureAuthoringProposal,
  resolveSelectionPoolFamily,
} from "./index.js";
import { createUpdateIntentFromRequestedChange } from "../../../../core/wizard/index.js";
import type { IntentSchema } from "../../../../core/schema/types.js";

const ORIGINAL_TALENT_DRAW_CREATE_PROMPT =
  "实现一个天赋抽取系统：按F4打开天赋选择界面，从天赋池中随机抽取3个天赋供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。天赋有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。";

const NO_UI_FIREBALL_PROMPT =
  "做一个主动技能，不要UI，不要inventory，不要persistence。按Q生成一个跟随玩家2秒的火焰球，每0.5秒对附近敌人造成一次伤害。";

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
  assert.ok(resolution.admissionDiagnostics);
  assert.deepEqual(
    resolution.admissionDiagnostics?.detection.matchedBy.includes("object_kind:talent"),
    true,
  );
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

function testOriginalTalentDrawPromptCompressesIntoSelectionPool(): void {
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: ORIGINAL_TALENT_DRAW_CREATE_PROMPT,
      goal: ORIGINAL_TALENT_DRAW_CREATE_PROMPT,
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: [
        "Open a talent selection UI on F4.",
        "Draw 3 weighted talents and let the player choose 1.",
        "Apply the chosen talent and keep the unchosen entries in the pool.",
      ],
    },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      choiceCount: 3,
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      commitment: "immediate",
    },
    contentModel: {
      collections: [
        {
          id: "talent_pool",
          role: "candidate-options",
          ownership: "feature",
          updateMode: "replace",
        },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal", "rarity_cards"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
    requiredClarifications: [],
    openQuestions: [],
    isReadyForBlueprint: true,
    effects: {
      operations: ["apply"],
      durationSemantics: "instant",
    },
  };

  const resolution = resolveSelectionPoolFamily({
    prompt: ORIGINAL_TALENT_DRAW_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    schema,
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });
  const normalized = normalizeSelectionPoolFeatureAuthoringProposal(
    schema,
    resolution.proposal,
    resolution.admissionDiagnostics,
  );

  assert.equal(resolution.handled, true);
  assert.equal(normalized.featureAuthoring?.profile, "selection_pool");
  assert.equal(normalized.admissionDiagnostics?.verdict, "admitted_compressed");
  assert.equal(
    normalized.admissionDiagnostics?.contract.assessment?.missingAtoms.length,
    0,
  );
}

function testNoUiFireballPromptStaysNotApplicable(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: NO_UI_FIREBALL_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "fireball_demo",
    proposalSource: "fallback",
  });

  assert.equal(resolution.handled, false);
  assert.equal(resolution.admissionDiagnostics?.verdict, "not_applicable");
}

function testSelectionPoolCompressionDeclinesWithoutUiSurface(): void {
  const prompt = "按 F4 从加权天赋池抽取 3 个候选天赋，玩家选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。";
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: { rawPrompt: prompt, goal: prompt },
    classification: { intentKind: "standalone-system", confidence: "high" },
    readiness: "ready",
    requirements: { functional: [prompt] },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      choiceCount: 3,
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      commitment: "immediate",
    },
    contentModel: {
      collections: [
        {
          id: "talent_pool",
          role: "candidate-options",
          ownership: "feature",
          updateMode: "replace",
        },
      ],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
    requiredClarifications: [],
    openQuestions: [],
    isReadyForBlueprint: true,
  };

  const resolution = resolveSelectionPoolFamily({
    prompt,
    hostRoot: "D:\\test3",
    mode: "create",
    schema,
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });
  const normalized = normalizeSelectionPoolFeatureAuthoringProposal(
    schema,
    resolution.proposal,
    resolution.admissionDiagnostics,
  );

  assert.equal(normalized.featureAuthoring, undefined);
  assert.equal(normalized.admissionDiagnostics?.verdict, "declined");
  assert.ok(
    normalized.admissionDiagnostics?.contract.assessment?.missingAtoms.includes("current_feature_ui_surface"),
  );
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
  updateIntent.delta.modify.push({
    path: "input.triggerKey",
    oldValue: "F4",
    newValue: "F5",
    reason: "Explicit trigger-key update for the bounded source-backed feature.",
  });

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
  updateIntent.delta.modify.push({
    path: "input.triggerKey",
    oldValue: "F4",
    newValue: "F5",
    reason: "Explicit trigger-key update for the bounded source-backed feature.",
  });

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
  assert.equal(resolution.admissionDiagnostics?.verdict, "governance_blocked");
}

testCanonicalCreateSeedsSelectionPoolAuthoring();
testCanonicalUpdateExpandsPoolToTwenty();
testCanonicalInventoryUpdateKeepsExampleInventoryCopy();
testSiblingEquipmentPromptUsesSameFamily();
testOriginalTalentDrawPromptCompressesIntoSelectionPool();
testNoUiFireballPromptStaysNotApplicable();
testSelectionPoolCompressionDeclinesWithoutUiSurface();
testSelectionPoolCurrentContextHintsExposeBoundedFields();
testUpdateMergeUsesUpdateIntentAuthority();
testUpdateMergePrefersRequestedTargetTriggerKey();
testUnsupportedContractEscapeHonestBlocks();

console.log("adapters/dota2/families/selection-pool/authoring.test.ts passed");

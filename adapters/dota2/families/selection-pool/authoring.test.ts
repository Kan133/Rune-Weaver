import assert from "node:assert/strict";

import {
  EQUIPMENT_DRAW_EXAMPLE_CREATE_PROMPT,
  TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
  TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
} from "./__fixtures__/examples.js";
import {
  detectSelectionPoolFallbackIntent,
  compileSelectionPoolModuleParameters,
  deriveSelectionPoolCurrentContextHints,
  extractSelectionPoolAdmissionBlockers,
  mergeSelectionPoolFeatureAuthoringForUpdate,
  normalizeSelectionPoolFeatureAuthoringProposal,
  resolveSelectionPoolFamily,
} from "./index.js";
import { parseChoiceCount, promptHasSelectionUiSurface } from "./shared.js";
import { createFallbackIntentSchema, createUpdateIntentFromRequestedChange } from "../../../../core/wizard/index.js";
import type { IntentSchema } from "../../../../core/schema/types.js";

const ORIGINAL_TALENT_DRAW_CREATE_PROMPT =
  "实现一个天赋抽取系统：按F4打开天赋选择界面，从天赋池中随机抽取3个天赋供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。天赋有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。";

const NO_UI_FIREBALL_PROMPT =
  "做一个主动技能，不要UI，不要inventory，不要persistence。按Q生成一个跟随玩家2秒的火焰球，每0.5秒对附近敌人造成一次伤害。";

const GENERIC_INVENTORY_UPDATE_PROMPT =
  "给当前功能增加一个存储面板，16格，存满了就不能再抽了";
const STORAGE_PANEL_INVENTORY_UPDATE_PROMPT =
  "为该抽取系统创建一个16格的存储面板，抽取到的选项会自动出现在面板上。";

function testCanonicalCreateSeedsSelectionPoolAuthoring(): void {
  const detection = detectSelectionPoolFallbackIntent({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    mode: "create",
    featureId: "talent_draw_demo",
  });
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
  assert.equal(detection.handled, true);
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
  assert.equal(
    new Set(updateResolution.proposal?.parameters.objects.map((item) => item.id)).size,
    20,
  );
}

function testGenericInventoryUpdateUsesPromptAuthority(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const updateResolution = resolveSelectionPoolFamily({
    prompt: GENERIC_INVENTORY_UPDATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "standalone_system_75dh",
    existingFeature: {
      featureId: "standalone_system_75dh",
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
  assert.equal(updateResolution.proposal?.parameters.inventory?.capacity, 16);
  assert.equal(updateResolution.proposal?.parameters.inventory?.fullMessage, "Selection inventory full");
}

function testInventoryPromptDoesNotDependOnFeatureId(): void {
  const prompts = [
    "talent_draw_demo",
    "reward_draw_demo",
    "standalone_system_75dh",
  ].map((featureId) =>
    resolveSelectionPoolFamily({
      prompt: GENERIC_INVENTORY_UPDATE_PROMPT,
      hostRoot: "D:\\test3",
      mode: "update",
      featureId,
      existingFeature: {
        featureId,
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
          parameters: resolveSelectionPoolFamily({
            prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
            hostRoot: "D:\\test3",
            mode: "create",
            featureId,
            proposalSource: "fallback",
          }).proposal!.parameters,
          parameterSurface: resolveSelectionPoolFamily({
            prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
            hostRoot: "D:\\test3",
            mode: "create",
            featureId,
            proposalSource: "fallback",
          }).proposal!.parameterSurface,
        },
      },
      proposalSource: "existing-feature",
    }),
  );

  const capacities = new Set(prompts.map((result) => result.proposal?.parameters.inventory?.capacity));
  const messages = new Set(prompts.map((result) => result.proposal?.parameters.inventory?.fullMessage));
  assert.deepEqual([...capacities], [16]);
  assert.deepEqual([...messages], ["Selection inventory full"]);
}

function testStoragePanelPromptUsesSameInventoryAuthority(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "standalone_system_75dh",
    proposalSource: "fallback",
  });

  const updateResolution = resolveSelectionPoolFamily({
    prompt: STORAGE_PANEL_INVENTORY_UPDATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "standalone_system_75dh",
    existingFeature: {
      featureId: "standalone_system_75dh",
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
  assert.equal(updateResolution.proposal?.parameters.inventory?.capacity, 16);
  assert.equal(updateResolution.proposal?.parameters.inventory?.enabled, true);
  assert.equal(updateResolution.proposal?.parameters.inventory?.blockDrawWhenFull, false);
}

function testCardDrawPromptShapeDetectionHandlesCardPhrasing(): void {
  const prompt =
    "创建一个抽卡系统，玩家按下F4后弹出三张卡片，卡片有R/SR/SSR/UR四个等级，等级影响抽取概率和外观。";
  const detection = detectSelectionPoolFallbackIntent({
    prompt,
    mode: "create",
    featureId: "card_draw_demo",
  });

  assert.equal(detection.handled, true);
  assert.ok(detection.matchedBy.includes("prompt_shape"));
  assert.equal(parseChoiceCount(prompt), 3);
  assert.equal(promptHasSelectionUiSurface(prompt), true);
}

function testAmbiguousCardRevealPromptDeclinesInsteadOfGovernanceBlocking(): void {
  const prompt =
    "创建一个抽卡系统，玩家按下F4后弹出三张卡片，卡片有R/SR/SSR/UR四个等级，等级影响抽取概率和外观。";
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: { rawPrompt: prompt, goal: prompt },
    classification: { intentKind: "standalone-system", confidence: "high" },
    readiness: "ready",
    requirements: {
      functional: ["按F4展示三张候选卡片，并基于稀有度影响概率和外观。"],
    },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "none",
      cardinality: "multiple",
      choiceCount: 3,
      repeatability: "repeatable",
      duplicatePolicy: "allow",
      commitment: "immediate",
    },
    uiRequirements: {
      needed: true,
      surfaces: ["card_popup", "card_list", "rarity_styled_cards"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: false,
      uiModal: false,
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
    featureId: "card_draw_demo",
    proposalSource: "llm",
  });

  assert.equal(resolution.blocked, false);
  assert.equal(resolution.admissionDiagnostics?.verdict, "declined");
  assert.ok(
    resolution.admissionDiagnostics?.contract.assessment?.missingAtoms.includes("choose_exactly_one"),
  );
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
  const blockers = extractSelectionPoolAdmissionBlockers(normalized.admissionDiagnostics);

  assert.equal(normalized.featureAuthoring, undefined);
  assert.equal(resolution.blocked, false);
  assert.equal(normalized.admissionDiagnostics?.verdict, "declined");
  assert.equal(normalized.blockers.length, 0);
  assert.equal(blockers.length, 0);
  assert.ok(
    normalized.admissionDiagnostics?.contract.assessment?.missingAtoms.includes("current_feature_ui_surface"),
  );
}

function testSelectionPoolCompressionDeclinesWithoutUiOrPlayerChoice(): void {
  const prompt =
    "Press F4 to draw 1 weighted talent from the pool and apply it immediately without showing UI or letting the player choose.";
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
      choiceMode: "weighted",
      choiceCount: 1,
      cardinality: "single",
      repeatability: "repeatable",
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
      playerChoice: false,
      uiModal: false,
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
  assert.equal(resolution.blocked, false);
  assert.equal(normalized.admissionDiagnostics?.verdict, "declined");
  assert.equal(normalized.blockers.length, 0);
  assert.ok(
    normalized.admissionDiagnostics?.contract.assessment?.missingAtoms.includes("current_feature_ui_surface"),
  );
  assert.ok(
    normalized.admissionDiagnostics?.contract.assessment?.missingAtoms.includes("present_multiple_candidates"),
  );
}

function testWordSwapClusterKeepsSelectionPoolAdmissionContract(): void {
  const prompts = [
    TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    TALENT_DRAW_EXAMPLE_CREATE_PROMPT.replaceAll("天赋", "祝福"),
    TALENT_DRAW_EXAMPLE_CREATE_PROMPT.replaceAll("天赋", "奖励"),
  ];
  const results = prompts.map((prompt) => {
    const schema = createFallbackIntentSchema(prompt, {
      kind: "dota2-x-template",
      projectRoot: "D:\\test3",
    });
    return resolveSelectionPoolFamily({
      prompt,
      hostRoot: "D:\\test3",
      mode: "create",
      schema,
      featureId: "talent_draw_demo",
      proposalSource: "fallback",
    });
  });

  const verdicts = new Set(results.map((result) => result.admissionDiagnostics?.verdict));
  const satisfiedAtomSets = new Set(
    results.map((result) =>
      JSON.stringify(result.admissionDiagnostics?.contract.assessment?.satisfiedAtoms || [])),
  );
  const missingAtomSets = new Set(
    results.map((result) =>
      JSON.stringify(result.admissionDiagnostics?.contract.assessment?.missingAtoms || [])),
  );

  assert.deepEqual([...verdicts], ["admitted_explicit"]);
  assert.equal(satisfiedAtomSets.size, 1);
  assert.equal(missingAtomSets.size, 1);
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
    updateIntent,
  });

  assert.equal(merged.parameters.objects.length, 20);
  assert.equal(new Set(merged.parameters.objects.map((item) => item.id)).size, 20);
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
    updateIntent,
  });

  assert.equal(merged.parameters.triggerKey, "F5");
}

function testUpdateMergeUsesObjectCountDeltaAuthorityWithoutPromptUnit(): void {
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
      rawPrompt: "将当前的奖励池子数量提升到20",
      goal: "将当前的奖励池子数量提升到20",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Increase the current same-feature reward pool size to 20 total objects."],
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
    path: "boundedFields.objectCount",
    oldValue: 6,
    newValue: 20,
    reason: "Authoritative update intent resolved the pool object count to 20.",
  });

  const merged = mergeSelectionPoolFeatureAuthoringForUpdate({
    currentFeatureAuthoring,
    updateIntent,
  });

  assert.equal(merged.parameters.objects.length, 20);
}

function testUpdateMergeRestoresInventoryContractFromBoundedAuthority(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "standalone_system_75dh",
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
      rawPrompt: GENERIC_INVENTORY_UPDATE_PROMPT,
      goal: GENERIC_INVENTORY_UPDATE_PROMPT,
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: [
        "Add a 16-slot storage panel to the current selection system.",
        "When the panel is full, do not start another draw.",
      ],
      interactions: [
        "Confirmed selected items are added into the 16-slot inventory panel.",
      ],
      outputs: [
        "Persistent inventory panel UI.",
      ],
    },
    stateModel: {
      states: [
        {
          id: "selection_inventory",
          summary: "Store confirmed selected items in current-feature session state.",
          owner: "feature",
          lifetime: "session",
          kind: "inventory",
          mutationMode: "update",
        },
      ],
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
      featureId: "standalone_system_75dh",
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
  updateIntent.delta.add.push({
    path: "selection.inventory",
    kind: "state",
    summary: "Add session-scoped inventory behavior for storing selected items.",
  });
  updateIntent.delta.modify.push({
    path: "selection.inventory.capacity",
    kind: "state",
    summary: "Set inventory capacity to 16 slots.",
    oldValue: undefined,
    newValue: 16,
    reason: "Explicit bounded storage capacity request.",
  });
  updateIntent.delta.modify.push({
    path: "rule.selection_flow.precondition",
    kind: "trigger",
    summary: "Gate draw activation so F4 cannot open a new draw when inventory is full.",
  });

  const merged = mergeSelectionPoolFeatureAuthoringForUpdate({
    currentFeatureAuthoring,
    updateIntent,
  });
  const compiled = compileSelectionPoolModuleParameters(merged);

  assert.equal(merged.parameters.choiceCount, 3);
  assert.equal(merged.parameters.inventory?.enabled, true);
  assert.equal(merged.parameters.inventory?.capacity, 16);
  assert.equal(merged.parameters.inventory?.blockDrawWhenFull, true);
  assert.equal(compiled.selection_modal.inventory?.capacity, 16);
  assert.equal(compiled.selection_flow.inventory?.blockDrawWhenFull, true);
}

function testUpdateMergeDoesNotInventInventoryCapacity(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "standalone_system_75dh",
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
      rawPrompt: "给当前功能增加一个存储面板，满了就不能再抽了",
      goal: "给当前功能增加一个存储面板，满了就不能再抽了",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Add a storage panel and block draws when it is full."],
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
      featureId: "standalone_system_75dh",
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
  updateIntent.delta.add.push({
    path: "selection.inventory",
    kind: "state",
    summary: "Add session-scoped inventory behavior for storing selected items.",
  });

  const merged = mergeSelectionPoolFeatureAuthoringForUpdate({
    currentFeatureAuthoring: {
      ...currentFeatureAuthoring,
      parameters: {
        ...currentFeatureAuthoring.parameters,
        inventory: undefined,
      },
    },
    updateIntent,
  });

  assert.equal(merged.parameters.inventory, undefined);
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
      resolution.reasons.some((reason) => reason.includes("session-only")),
  );
  assert.equal(resolution.admissionDiagnostics?.verdict, "governance_blocked");
}

testCanonicalCreateSeedsSelectionPoolAuthoring();
testCanonicalUpdateExpandsPoolToTwenty();
testGenericInventoryUpdateUsesPromptAuthority();
testInventoryPromptDoesNotDependOnFeatureId();
testStoragePanelPromptUsesSameInventoryAuthority();
testCardDrawPromptShapeDetectionHandlesCardPhrasing();
testAmbiguousCardRevealPromptDeclinesInsteadOfGovernanceBlocking();
testSiblingEquipmentPromptUsesSameFamily();
testOriginalTalentDrawPromptCompressesIntoSelectionPool();
testNoUiFireballPromptStaysNotApplicable();
testSelectionPoolCompressionDeclinesWithoutUiOrPlayerChoice();
testWordSwapClusterKeepsSelectionPoolAdmissionContract();
testSelectionPoolCurrentContextHintsExposeBoundedFields();
testUpdateMergeUsesUpdateIntentAuthority();
testUpdateMergePrefersRequestedTargetTriggerKey();
testUpdateMergeUsesObjectCountDeltaAuthorityWithoutPromptUnit();
testUpdateMergeRestoresInventoryContractFromBoundedAuthority();
testUpdateMergeDoesNotInventInventoryCapacity();
testUnsupportedContractEscapeHonestBlocks();

console.log("adapters/dota2/families/selection-pool/authoring.test.ts passed");

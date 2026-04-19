import assert from "node:assert/strict";

import { buildBlueprint, buildUpdateBlueprint, createWritePlan } from "./planning.js";
import {
  buildCurrentFeatureContext,
  createUpdateIntentFromRequestedChange,
} from "../../../core/wizard/index.js";
import {
  TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
  getSelectionPoolSourceArtifactRelativePath,
  materializeSelectionPoolSourceArtifact,
  resolveSelectionPoolFamily,
} from "../../../adapters/dota2/families/selection-pool/index.js";

const ORIGINAL_TALENT_DRAW_CREATE_PROMPT =
  "实现一个天赋抽取系统：按F4打开天赋选择界面，从天赋池中随机抽取3个天赋供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。天赋有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。";

function testCreateWritePlanUsesStableFeatureIdForCreate(): void {
  const assemblyPlan = {
    blueprintId: "standalone_system_abcd",
    selectedPatterns: [
      {
        patternId: "input.key_binding",
        role: "input_trigger",
        parameters: {
          triggerKey: "F4",
        },
      },
    ],
    writeTargets: [],
    readyForHostWrite: true,
    hostWriteReadiness: {
      blockers: [],
    },
    parameters: {},
  } as any;

  const { writePlan, issues } = createWritePlan(
    assemblyPlan,
    "D:\\test3",
    null,
    "create",
    undefined,
    undefined,
    "talent_draw_demo",
  );

  assert.deepEqual(issues, []);
  assert.ok(writePlan);
  assert.equal(
    writePlan!.entries.every((entry) => entry.targetPath.includes("talent_draw_demo")),
    true,
  );
}

function testCreateWritePlanAppendsSelectionPoolSourceArtifact(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt:
      "做一个按 F4 触发的三选一天赋抽取系统。玩家按 F4 后，从加权天赋池抽出 3 个候选天赋，显示卡牌选择 UI。玩家选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。",
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });
  assert.equal(resolution.blocked, false);
  assert.ok(resolution.proposal);
  const { sourceArtifact, sourceArtifactRef } = materializeSelectionPoolSourceArtifact("talent_draw_demo", {
    mode: "source-backed",
    profile: "selection_pool",
    objectKind: resolution.proposal!.objectKind,
    parameters: resolution.proposal!.parameters,
    parameterSurface: resolution.proposal!.parameterSurface,
  });

  const assemblyPlan = {
    blueprintId: "standalone_system_abcd",
    selectedPatterns: [
      {
        patternId: "input.key_binding",
        role: "input_trigger",
        parameters: {
          triggerKey: "F4",
        },
      },
    ],
    writeTargets: [],
    readyForHostWrite: true,
    hostWriteReadiness: {
      blockers: [],
    },
    parameters: {},
    featureAuthoring: {
      mode: "source-backed",
      profile: "selection_pool",
      objectKind: resolution.proposal!.objectKind,
      parameters: resolution.proposal!.parameters,
      parameterSurface: resolution.proposal!.parameterSurface,
    },
  } as any;

  const { writePlan, issues } = createWritePlan(
    assemblyPlan,
    "D:\\test3",
    null,
    "create",
    undefined,
    undefined,
    "talent_draw_demo",
  );

  assert.deepEqual(issues, []);
  assert.ok(writePlan);
  const jsonEntry = writePlan!.entries.find((entry) => entry.contentType === "json");
  assert.ok(jsonEntry);
  assert.ok(sourceArtifact);
  assert.ok(sourceArtifactRef);
  assert.equal(jsonEntry!.targetPath, getSelectionPoolSourceArtifactRelativePath("talent_draw_demo"));
  assert.equal(jsonEntry!.sourcePattern, "rw.feature_source_model");
  assert.deepEqual(jsonEntry!.parameters, sourceArtifact as unknown as Record<string, unknown>);
}

function testCreateWritePlanKeepsSynthesizedBundleArtifactsCollapsed(): void {
  const bundleId = "gameplay_ability_orbit_timing_1";
  const assemblyPlan = {
    blueprintId: "rw_fire_orbit",
    selectedPatterns: [],
    moduleRecords: [
      {
        moduleId: "orbit_timing",
        bundleId,
        role: "timed_rule",
        sourceKind: "synthesized",
        selectedPatternIds: [],
        reviewRequired: true,
        requiresReview: true,
        implementationStrategy: "exploratory",
        maturity: "exploratory",
        artifactPaths: [
          "game/scripts/vscripts/rune_weaver/abilities/rw_fire_orbit.lua",
          "game/scripts/npc/npc_abilities_custom.txt",
        ],
        synthesizedArtifactIds: ["orbit_lua", "orbit_kv"],
      },
      {
        moduleId: "orbit_state",
        bundleId,
        role: "session_state",
        sourceKind: "synthesized",
        selectedPatternIds: [],
        reviewRequired: true,
        requiresReview: true,
        implementationStrategy: "exploratory",
        maturity: "exploratory",
        artifactPaths: [
          "game/scripts/vscripts/rune_weaver/abilities/rw_fire_orbit.lua",
          "game/scripts/npc/npc_abilities_custom.txt",
        ],
        synthesizedArtifactIds: ["orbit_lua", "orbit_kv"],
      },
    ],
    synthesizedArtifacts: [
      {
        id: "orbit_lua",
        moduleId: "orbit_timing",
        bundleId,
        sourceKind: "synthesized",
        role: "gameplay-core",
        hostTarget: "lua_ability",
        outputKind: "lua",
        contentType: "lua",
        targetPath: "game/scripts/vscripts/rune_weaver/abilities/rw_fire_orbit.lua",
        content: "-- lua",
        summary: "Bundled Lua shell",
        rationale: [],
      },
      {
        id: "orbit_kv",
        moduleId: "orbit_timing",
        bundleId,
        sourceKind: "synthesized",
        role: "gameplay-core",
        hostTarget: "ability_kv",
        outputKind: "kv",
        contentType: "kv",
        targetPath: "game/scripts/npc/npc_abilities_custom.txt",
        content: "\"rw_fire_orbit\" {}",
        summary: "Bundled KV shell",
        rationale: [],
      },
    ],
    writeTargets: [
      {
        target: "server",
        path: "game/scripts/vscripts/rune_weaver/abilities/rw_fire_orbit.lua",
        summary: "Bundled Lua shell",
      },
      {
        target: "config",
        path: "game/scripts/npc/npc_abilities_custom.txt",
        summary: "Bundled KV shell",
      },
    ],
    readyForHostWrite: true,
    hostWriteReadiness: {
      ready: true,
      blockers: [],
      checks: [],
    },
    parameters: {},
  } as any;

  const { writePlan, issues } = createWritePlan(
    assemblyPlan,
    "D:\\test3",
    null,
    "create",
    undefined,
    undefined,
    "fire_orbit_demo",
  );

  assert.deepEqual(issues, []);
  assert.ok(writePlan);
  const synthesizedEntries = writePlan!.entries.filter((entry) =>
    entry.sourcePattern.startsWith("synthesized."),
  );
  assert.equal(synthesizedEntries.length, 2);
  assert.equal(
    synthesizedEntries.every((entry) => entry.metadata?.bundleId === bundleId),
    true,
  );
}

function testBuildBlueprintAppliesSelectionPoolCreateEnrichment(): void {
  const schema = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
      goal: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    },
    classification: {
      intentKind: "standalone-system" as const,
      confidence: "high" as const,
    },
    readiness: "ready" as const,
    requirements: {
      functional: [
        "Open draft UI",
        "Select one weighted option",
        "Apply selected effect",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger" as const,
          summary: "Start draft from an explicit trigger",
          parameters: { triggerKey: "F4" },
        },
        {
          id: "rule_req",
          kind: "rule" as const,
          summary: "Choose one option from weighted candidates",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
        {
          id: "ui_req",
          kind: "ui" as const,
          summary: "Show a modal choice surface",
          outputs: ["selection_modal"],
        },
      ],
    },
    constraints: {
      requiredPatterns: ["rule.selection_flow"],
    },
    stateModel: {
      states: [
        {
          id: "draft_choice",
          summary: "Current selected draft option",
          owner: "feature" as const,
          lifetime: "session" as const,
        },
      ],
    },
    selection: {
      mode: "weighted" as const,
      cardinality: "single" as const,
      repeatability: "repeatable" as const,
    },
    effects: {
      operations: ["apply"] as const,
      durationSemantics: "timed" as const,
    },
    integrations: {
      expectedBindings: [
        {
          id: "ui_surface",
          kind: "ui-surface" as const,
          summary: "Modal selection UI",
          required: true,
        },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: ["Default trigger is F4"],
    isReadyForBlueprint: true,
  } as any;

  const result = buildBlueprint(schema, {
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  assert.ok(result.blueprint);
  assert.ok(result.finalBlueprint);
  assert.equal(result.status, "ready");
  assert.equal(result.blueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(result.finalBlueprint?.featureAuthoring?.profile, "selection_pool");
  assert.deepEqual(
    result.blueprint?.fillContracts?.map((contract) => contract.boundaryId),
    [
      "weighted_pool.selection_policy",
      "selection_flow.effect_mapping",
      "ui.selection_modal.payload_adapter",
    ],
  );
  assert.equal(result.blueprint?.moduleRecords?.every((module) => module.sourceKind === "family"), true);
  assert.equal(
    result.blueprint?.modules.find((module) => module.role === "selection_flow")?.parameters?.choiceCount,
    3,
  );
  assert.equal(
    result.blueprint?.modules.find((module) => module.role === "selection_modal")?.parameters?.title,
    "Choose Your Talent",
  );
  assert.equal(result.finalBlueprint?.commitDecision?.canAssemble, true);
  assert.equal(result.admissionDiagnostics?.verdict, "admitted_compressed");
  assert.equal(result.admissionDiagnostics?.proposal.baseSource, "example_seed");
}

function testBuildBlueprintCompressesSelectionPoolContractWithoutFullSkeleton(): void {
  const schema = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: ORIGINAL_TALENT_DRAW_CREATE_PROMPT,
      goal: ORIGINAL_TALENT_DRAW_CREATE_PROMPT,
    },
    classification: {
      intentKind: "standalone-system" as const,
      confidence: "high" as const,
    },
    readiness: "ready" as const,
    requirements: {
      functional: [
        "Open the talent selection UI on F4.",
        "Draw 3 weighted talents and let the player choose 1.",
        "Apply the chosen result and keep the remaining pool consistent.",
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: {
      mode: "weighted" as const,
      source: "weighted-pool" as const,
      choiceMode: "user-chosen" as const,
      choiceCount: 3,
      cardinality: "single" as const,
      repeatability: "repeatable" as const,
      duplicatePolicy: "forbid" as const,
      commitment: "immediate" as const,
    },
    contentModel: {
      collections: [
        {
          id: "talent_pool",
          role: "candidate-options" as const,
          ownership: "feature" as const,
          updateMode: "replace" as const,
        },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal", "rarity_cards"],
    },
    effects: {
      operations: ["apply"] as const,
      durationSemantics: "instant" as const,
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      outcomeApplication: true,
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  } as any;

  const result = buildBlueprint(schema, {
    prompt: ORIGINAL_TALENT_DRAW_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  assert.ok(result.blueprint);
  assert.ok(result.finalBlueprint);
  assert.equal(result.blueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(result.finalBlueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(result.admissionDiagnostics?.verdict, "admitted_compressed");
  assert.equal(
    result.admissionDiagnostics?.contract.assessment?.missingAtoms.length,
    0,
  );
}

function testSelectionPoolContractDoesNotInjectStandaloneInventoryState(): void {
  const prompt =
    '给现有天赋抽取功能增加一个常驻天赋库存界面：15 格。玩家每次从 F4 三选一中确认的天赋都进入库存。库存满了后，再按 F4 不再继续抽取，并在库存界面显示 "Talent inventory full"。保持现有 F4 三选一抽取逻辑、稀有度展示和已选天赋不再出现的行为不变。';
  const existingFeature = {
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
      parameters: {
        triggerKey: "F4",
        choiceCount: 3,
        objectKind: "talent",
        objects: [
          { id: "TL001", label: "Strength Boost", description: "+10 Strength", weight: 40, tier: "R" },
        ],
      },
      parameterSurface: resolutionParameterSurface(),
    },
  } as any;

  const resolution = resolveSelectionPoolFamily({
    prompt,
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "talent_draw_demo",
    existingFeature,
    proposalSource: "fallback",
  });
  assert.equal(resolution.blocked, false);
  const currentFeatureContext = buildCurrentFeatureContext(existingFeature, "D:\\test3");
  const requestedChange = {
    version: "1.0",
    host: { kind: "dota2-x-template", projectRoot: "D:\\test3" },
    request: { rawPrompt: prompt, goal: "Extend talent draw with inventory" },
    classification: { intentKind: "standalone-system", confidence: "high" },
    requirements: {
      functional: ["Extend talent draw with a persistent inventory panel"],
      typed: [
        {
          id: "inventory-ui",
          kind: "ui",
          summary: "Render the persistent inventory panel",
          priority: "must",
        },
        {
          id: "inventory-state",
          kind: "state",
          summary: "Track inventory slots and full flag",
          priority: "must",
        },
      ],
    },
    constraints: {},
    flow: {
      sequence: ["Player opens the talent draw modal."],
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
        fullMessage: "Talent inventory full",
        presentation: "persistent_panel",
      },
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "instant",
    },
    integrations: {
      expectedBindings: [],
    },
    stateModel: {
      states: [
        {
          id: "inventory_slots",
          summary: "Array of up to 15 talent data objects",
          owner: "feature",
          lifetime: "session",
          mutationMode: "create",
        },
        {
          id: "inventory_full_flag",
          summary: "Boolean indicating if capacity is reached",
          owner: "feature",
          lifetime: "ephemeral",
          mutationMode: "update",
        },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal"],
      feedbackNeeds: [],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    acceptanceInvariants: [],
    uncertainties: [],
    resolvedAssumptions: [],
  } as any;

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);

  assert.ok(updateIntent.delta.add.some((item) => item.path === "selection.inventory"));
  assert.equal(
    updateIntent.delta.add.some((item) => item.path.startsWith("state")),
    false,
  );
  assert.equal(
    updateIntent.delta.modify.some((item) => item.path.startsWith("state")),
    false,
  );
}

function testSelectionPoolUpdateExpansionUsesGenericDeltaContract(): void {
  const prompt =
    "把现有 talent_draw_demo 的天赋池从 6 个扩充到 20 个。保持当前 F4 三选一、立即生效、已选天赋后续不再出现的逻辑不变；如果当前已有库存界面，也保持其行为不变。新增 14 个天赋先使用与现有风格一致的占位符名称、描述、稀有度和权重即可。";
  const currentFeatureContext = buildCurrentFeatureContext({
    featureId: "talent_draw_demo",
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 1,
    blueprintId: "bp_talent_draw",
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
      path: "game/scripts/src/rune_weaver/features/talent_draw_demo/selection-pool.source.json",
    },
    featureAuthoring: {
      mode: "source-backed" as const,
      profile: "selection_pool" as const,
      objectKind: "talent" as const,
      parameters: {
        triggerKey: "F4",
        choiceCount: 3,
        objectKind: "talent" as const,
        objects: Array.from({ length: 6 }, (_, index) => ({
          id: `TL${String(index + 1).padStart(3, "0")}`,
          label: `Talent ${index + 1}`,
          description: `Placeholder talent ${index + 1}`,
          weight: 10,
          tier: "R" as const,
        })),
      },
      parameterSurface: resolutionParameterSurface(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, "D:\\rw_test_missing");

  const requestedChange = {
    version: "1.0",
    host: { kind: "dota2-x-template", projectRoot: "D:\\test3" },
    request: { rawPrompt: prompt, goal: "Expand talent pool" },
    classification: { intentKind: "micro-feature", confidence: "medium" },
    requirements: { functional: [prompt], typed: [] },
    constraints: {},
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    uncertainties: [{ id: "u1", summary: "Wizard guessed update semantics", affects: ["blueprint"], severity: "medium" }],
    resolvedAssumptions: [],
  } as any;

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  assert.ok(updateIntent.delta.modify.some((item) => item.path === "content.collection.objectCount"));
  assert.ok(updateIntent.delta.preserve.some((item) => item.path === "backbone.input_trigger"));
}

function testBuildUpdateBlueprintAppliesPostBlueprintSelectionPoolMerge(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt:
      "做一个按 F4 触发的三选一天赋抽取系统。玩家按 F4 后，从加权天赋池抽出 3 个候选天赋，显示卡牌选择 UI。玩家选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。",
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const currentFeatureContext = buildCurrentFeatureContext({
    featureId: "talent_draw_demo",
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 1,
    blueprintId: "bp_talent_draw",
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
      path: "game/scripts/src/rune_weaver/features/talent_draw_demo/selection-pool.source.json",
    },
    featureAuthoring: {
      mode: "source-backed" as const,
      profile: "selection_pool" as const,
      objectKind: resolution.proposal?.objectKind,
      parameters: resolution.proposal!.parameters,
      parameterSurface: resolution.proposal!.parameterSurface,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, "D:\\rw_test_missing");

  const requestedChange = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: "给现有抽取功能增加一个常驻库存界面:15格。玩家每次确认的对象都进入库存。",
      goal: "给现有抽取功能增加一个常驻库存界面:15格。玩家每次确认的对象都进入库存。",
    },
    classification: {
      intentKind: "standalone-system" as const,
      confidence: "high" as const,
    },
    requirements: {
      functional: ["Add a persistent 15-slot inventory panel for confirmed selections."],
    },
    selection: {
      mode: "user-chosen" as const,
      cardinality: "single" as const,
      repeatability: "repeatable" as const,
      duplicatePolicy: "forbid" as const,
      inventory: {
        enabled: true,
        capacity: 15,
        storeSelectedItems: true,
        blockDrawWhenFull: true,
        fullMessage: "Talent inventory full",
        presentation: "persistent_panel" as const,
      },
    },
    normalizedMechanics: {
      playerChoice: true,
      uiModal: true,
    },
    resolvedAssumptions: [],
  } as any;

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  const result = buildUpdateBlueprint(updateIntent);

  assert.ok(result.blueprint);
  assert.ok(result.finalBlueprint);
  assert.equal(result.blueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(result.finalBlueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(result.blueprint?.featureAuthoring?.parameters.inventory?.capacity, 15);
  assert.equal(result.finalBlueprint?.featureAuthoring?.parameters.inventory?.capacity, 15);
  assert.ok(
    result.blueprint?.fillContracts?.some(
      (contract) => contract.boundaryId === "ui.selection_modal.payload_adapter",
    ),
  );
  assert.equal(result.finalBlueprint?.commitDecision?.canAssemble, true);
}

function resolutionParameterSurface() {
  return {
    triggerKey: { kind: "single_hotkey", allowList: ["F4"] },
    choiceCount: { minimum: 1, maximum: 5 },
    objectKind: { allowed: ["talent"] },
    objects: { minItems: 1, seededWhenMissing: true },
    inventory: {
      supported: true,
      capacityRange: { minimum: 1, maximum: 30 },
      fixedPresentation: "persistent_panel",
    },
    invariants: [],
  } as any;
}

function runTests(): void {
  testCreateWritePlanUsesStableFeatureIdForCreate();
  testCreateWritePlanAppendsSelectionPoolSourceArtifact();
  testCreateWritePlanKeepsSynthesizedBundleArtifactsCollapsed();
  testBuildBlueprintAppliesSelectionPoolCreateEnrichment();
  testBuildBlueprintCompressesSelectionPoolContractWithoutFullSkeleton();
  testSelectionPoolContractDoesNotInjectStandaloneInventoryState();
  testSelectionPoolUpdateExpansionUsesGenericDeltaContract();
  testBuildUpdateBlueprintAppliesPostBlueprintSelectionPoolMerge();
  console.log("apps/cli/dota2/planning.test.ts: PASS");
}

runTests();

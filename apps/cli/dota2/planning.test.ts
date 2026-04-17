import assert from "node:assert/strict";

import { createWritePlan } from "./planning.js";
import {
  applySelectionPoolIntentContract,
  getSelectionPoolSourceArtifactRelativePath,
  materializeSelectionPoolSourceArtifact,
  resolveSelectionPoolFamily,
} from "../../../adapters/dota2/families/selection-pool/index.js";

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

function testSelectionPoolContractDoesNotInjectStandaloneInventoryState(): void {
  const prompt =
    '给现有天赋抽取功能增加一个常驻天赋库存界面：15 格。玩家每次从 F4 三选一中确认的天赋都进入库存。库存满了后，再按 F4 不再继续抽取，并在库存界面显示 "Talent inventory full"。保持现有 F4 三选一抽取逻辑、稀有度展示和已选天赋不再出现的行为不变。';

  const resolution = resolveSelectionPoolFamily({
    prompt,
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
    } as any,
    proposalSource: "fallback",
  });
  const schema = applySelectionPoolIntentContract(
    {
      version: "1.0",
      host: { kind: "dota2-x-template", projectRoot: "D:\\test3" },
      request: { rawPrompt: prompt, goal: "Extend talent draw with inventory" },
      classification: { intentKind: "standalone-system", confidence: "high" },
      readiness: "ready",
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
      requiredClarifications: [],
      openQuestions: [],
      resolvedAssumptions: [],
      isReadyForBlueprint: true,
    } as any,
    resolution,
  );

  assert.equal(schema.selection?.inventory?.capacity, 15);
  assert.equal(
    schema.requirements?.typed?.some((requirement) => requirement.kind === "state") ?? false,
    false,
  );
  assert.equal(
    schema.stateModel?.states?.some((state) => state.id === "talent-draw-inventory") ?? false,
    false,
  );
  assert.equal(
    schema.stateModel?.states?.some((state) => state.id === "inventory_slots") ?? false,
    false,
  );
}

function testSelectionPoolUpdateClampPromotesReadyBlueprintIntent(): void {
  const prompt =
    "把现有 talent_draw_demo 的天赋池从 6 个扩充到 20 个。保持当前 F4 三选一、立即生效、已选天赋后续不再出现的逻辑不变；如果当前已有库存界面，也保持其行为不变。新增 14 个天赋先使用与现有风格一致的占位符名称、描述、稀有度和权重即可。";
  const resolution = resolveSelectionPoolFamily({
    prompt,
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const schema = applySelectionPoolIntentContract(
    {
      version: "1.0",
      host: { kind: "dota2-x-template", projectRoot: "D:\\test3" },
      request: { rawPrompt: prompt, goal: "Expand talent pool" },
      classification: { intentKind: "micro-feature", confidence: "medium" },
      readiness: "weak",
      requirements: { functional: [prompt], typed: [] },
      constraints: {},
      normalizedMechanics: {
        trigger: false,
        candidatePool: false,
        weightedSelection: false,
        playerChoice: false,
        uiModal: false,
        outcomeApplication: false,
      },
      uncertainties: [{ id: "u1", summary: "Wizard guessed update semantics", affects: ["blueprint"], severity: "medium" }],
      requiredClarifications: [{ id: "c1", question: "Need more detail", blocksFinalization: false }],
      openQuestions: ["Need more detail"],
      resolvedAssumptions: [],
      isReadyForBlueprint: false,
    } as any,
    resolution,
  );

  assert.equal(schema.readiness, "ready");
  assert.equal(schema.isReadyForBlueprint, true);
  assert.equal(schema.openQuestions?.length, 0);
  assert.equal(schema.uncertainties?.length, 0);
  assert.equal(schema.normalizedMechanics.trigger, true);
  assert.equal(schema.normalizedMechanics.candidatePool, true);
  assert.equal(schema.normalizedMechanics.weightedSelection, true);
  assert.equal(schema.normalizedMechanics.playerChoice, true);
  assert.equal(schema.normalizedMechanics.uiModal, true);
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
  testSelectionPoolContractDoesNotInjectStandaloneInventoryState();
  testSelectionPoolUpdateClampPromotesReadyBlueprintIntent();
  console.log("apps/cli/dota2/planning.test.ts: PASS");
}

runTests();

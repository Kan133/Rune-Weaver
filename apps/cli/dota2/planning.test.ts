import assert from "node:assert/strict";

import { buildBlueprint, buildUpdateBlueprint, createWritePlan } from "./planning.js";
import {
  buildCurrentFeatureContext,
  createUpdateIntentFromRequestedChange,
  normalizeIntentSchema,
} from "../../../core/wizard/index.js";
import { enrichDota2CreateBlueprint } from "../../../adapters/dota2/blueprint/index.js";
import {
  getSelectionPoolSourceArtifactRelativePath,
  materializeSelectionPoolSourceArtifact,
  resolveSelectionPoolFamily,
} from "../../../adapters/dota2/families/selection-pool/index.js";
import {
  TALENT_DRAW_DEMO_CREATE_PROMPT,
} from "../../../adapters/dota2/cases/selection-demo-registry.js";

const ORIGINAL_TALENT_DRAW_CREATE_PROMPT =
  "实现一个天赋抽取系统：按F4打开天赋选择界面，从天赋池中随机抽取3个天赋供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。天赋有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。";

function createCanonicalSelectionPoolParameters(
  objects: Array<{ id: string; label: string; description: string; weight: number; tier: "R" | "SR" | "SSR" | "UR" }>,
) {
  return {
    triggerKey: "F4",
    choiceCount: 3,
    objectKind: "talent" as const,
    localCollections: [
      {
        collectionId: "talent_pool",
        visibility: "local" as const,
        objects: objects.map((object) => ({
          objectId: object.id,
          label: object.label,
          description: object.description,
        })),
      },
    ],
    poolEntries: objects.map((object) => ({
      entryId: object.id,
      objectRef: {
        source: "local_collection" as const,
        collectionId: "talent_pool",
        objectId: object.id,
      },
      weight: object.weight,
      tier: object.tier,
    })),
  };
}

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
      rawPrompt: TALENT_DRAW_DEMO_CREATE_PROMPT,
      goal: TALENT_DRAW_DEMO_CREATE_PROMPT,
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
    prompt: TALENT_DRAW_DEMO_CREATE_PROMPT,
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
      "selection_outcome.realization",
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
    "Choose Your Selection",
  );
  assert.equal(result.finalBlueprint?.commitDecision?.canAssemble, true);
  assert.equal(result.admissionDiagnostics?.verdict, "admitted_compressed");
  assert.equal(result.admissionDiagnostics?.proposal.baseSource, "generic_seed");
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

function testBuildBlueprintExplicitSelectionPoolClosurePromotesBoundedResidue(): void {
  const prompt =
    "Press F4 to open a local weighted reward draw UI, draw 3 rarity-weighted rewards, let the player choose 1, apply the chosen local placeholder immediately, remove the selected reward from future draws, and return unchosen rewards to the pool.";
  const schema = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: prompt,
      goal: prompt,
    },
    classification: {
      intentKind: "standalone-system" as const,
      confidence: "high" as const,
    },
    requirements: {
      functional: [
        "Press F4 to open a local reward draw UI.",
        "Draw 3 rarity-weighted reward candidates from a local pool.",
        "Let the player choose exactly 1 candidate.",
        "Apply the chosen local placeholder immediately.",
        "Remove the selected reward from future draws and return the unchosen rewards to the pool.",
      ],
      typed: [
        {
          id: "reward_draw_trigger",
          kind: "trigger" as const,
          summary: "F4 activates the local reward draw flow.",
          parameters: { triggerKey: "F4" },
          priority: "must" as const,
        },
        {
          id: "reward_draw_rule",
          kind: "rule" as const,
          summary: "Draw 3 rarity-weighted reward candidates from the local pool and commit exactly 1.",
          parameters: { choiceCount: 3, choiceMode: "weighted" },
          priority: "must" as const,
        },
        {
          id: "reward_draw_ui",
          kind: "ui" as const,
          summary: "Present the candidates in one local modal choice surface.",
          outputs: ["selection_modal"],
          priority: "must" as const,
        },
      ],
    },
    constraints: {},
    interaction: {
      activations: [
        {
          actor: "player",
          kind: "key" as const,
          input: "F4",
          phase: "press" as const,
          repeatability: "repeatable" as const,
          confirmation: "implicit" as const,
        },
      ],
    },
    stateModel: {
      states: [
        {
          id: "reward_pool_state",
          summary: "Session-local reward draw state.",
          owner: "feature" as const,
          lifetime: "session" as const,
          mutationMode: "update" as const,
        },
      ],
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
    effects: {
      operations: ["apply"] as const,
      durationSemantics: "instant" as const,
    },
    contentModel: {
      collections: [
        {
          id: "reward_pool",
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
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    uncertainties: [
      {
        id: "unc_local_reward_consequence",
        summary: "The chosen reward consequence boundary is still unspecified inside the local placeholder profile.",
        affects: ["blueprint"],
        severity: "medium" as const,
      },
    ],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  } as any;

  const result = buildBlueprint(schema, {
    prompt,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "reward_draw_demo",
    proposalSource: "fallback",
  });

  assert.ok(result.finalBlueprint);
  assert.equal(result.admissionDiagnostics?.verdict, "admitted_explicit");
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(result.finalBlueprint?.commitDecision?.requiresReview, true);
  assert.equal(result.admissionDiagnostics?.closure?.applied, false);
  assert.deepEqual(result.admissionDiagnostics?.closure?.closedResidueIds, []);
  assert.equal(
    result.admissionDiagnostics?.boundedClosureAuthority?.closeableSurfaces.includes("selection_outcome"),
    true,
  );
}

function testBuildBlueprintCompressedSelectionPoolDoesNotPromoteBlueprintResidue(): void {
  const prompt =
    "实现一个天赋抽取系统：按F4打开天赋选择界面，从天赋池中随机抽取3个天赋供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。天赋有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。";
  const schema = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: prompt,
      goal: prompt,
    },
    classification: {
      intentKind: "standalone-system" as const,
      confidence: "high" as const,
    },
    requirements: {
      functional: [
        "Open the talent selection UI on F4.",
        "Draw 3 rarity-weighted talents and let the player choose 1.",
        "Apply the chosen result and keep the remaining pool consistent.",
      ],
    },
    constraints: {},
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
    uncertainties: [
      {
        id: "unc_compressed_reward_consequence",
        summary: "The chosen reward consequence boundary is still unspecified inside the local placeholder profile.",
        affects: ["blueprint"],
        severity: "medium" as const,
      },
    ],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  } as any;

  const result = buildBlueprint(schema, {
    prompt,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "compressed_reward_draw_demo",
    proposalSource: "fallback",
  });

  assert.ok(result.finalBlueprint);
  assert.equal(result.admissionDiagnostics?.verdict, "admitted_compressed");
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(result.admissionDiagnostics?.closure?.applied, false);
  assert.equal(result.admissionDiagnostics?.closure?.closedResidueIds.length, 0);
}

function testBuildBlueprintKeepsCrossFeatureSelectionShellWeakButAssemblable(): void {
  const prompt =
    "Press F4 to open a local weighted reward draw UI, draw 3 rarity-weighted rewards, let the player choose 1, apply the chosen local placeholder immediately, remove the selected reward from future draws, return unchosen rewards to the pool, and later bind one reward to another feature when its target is resolved.";
  const schema = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: prompt,
      goal: prompt,
    },
    classification: {
      intentKind: "cross-system-composition" as const,
      confidence: "high" as const,
    },
    readiness: "ready" as const,
    requirements: {
      functional: [
        "Run a local weighted three-choice draw shell.",
        "Apply the chosen local placeholder immediately.",
        "Remove the selected reward from future draws and return unchosen rewards to the pool.",
        "Later bind one reward to another feature.",
      ],
    },
    constraints: {},
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
          id: "reward_pool",
          role: "candidate-options" as const,
          ownership: "feature" as const,
          updateMode: "replace" as const,
        },
      ],
    },
    effects: {
      operations: ["apply"] as const,
      durationSemantics: "instant" as const,
    },
    outcomes: {
      operations: ["grant-feature"] as const,
    },
    composition: {
      dependencies: [
        {
          kind: "cross-feature" as const,
          relation: "grants" as const,
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
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  } as any;

  const result = buildBlueprint(
    schema,
    {
      prompt,
      hostRoot: "D:\\test3",
      mode: "create",
      featureId: "consumer_draw_demo",
      proposalSource: "fallback",
    },
    {
      blocksBlueprint: false,
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
      reasons: ["Cross-feature semantics are present, but the target feature boundary is not explicit."],
    },
  );

  assert.ok(result.finalBlueprint);
  assert.equal(result.finalBlueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(result.finalBlueprint?.commitDecision?.canAssemble, true);
  assert.equal(result.finalBlueprint?.commitDecision?.canWriteHost, false);
}

function testBuildBlueprintLetsSelectionPoolFamilyOverrideSupersededCrossFeatureBlockers(): void {
  const prompt =
    "Press F4 to open a local weighted reward draw UI, draw 3 rarity-weighted rewards, let the player choose 1, apply the chosen local placeholder immediately, remove the selected reward from future draws, return unchosen rewards to the pool, and later bind one reward to another feature when its target is resolved.";
  const schema = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: prompt,
      goal: prompt,
    },
    classification: {
      intentKind: "cross-system-composition" as const,
      confidence: "high" as const,
    },
    requirements: {
      functional: [
        "Press F4 to open a local reward draw UI.",
        "Draw exactly 3 rarity-weighted reward candidates from a local pool.",
        "Let the player choose exactly 1 of the 3 candidates.",
        "Apply the chosen reward's local placeholder immediately upon selection.",
        "Remove the selected reward from future draws within the same feature pool.",
        "Return unchosen rewards to the pool after the selection resolves.",
        "Allow a reward to be bound later to another feature after that reward's target is resolved.",
      ],
      typed: [
        {
          id: "f4_trigger",
          kind: "trigger" as const,
          summary: "F4 activates the reward draw flow.",
          parameters: { triggerKey: "F4" },
          priority: "must" as const,
        },
        {
          id: "weighted_draw",
          kind: "rule" as const,
          summary: "Select 3 rarity-weighted reward candidates from a local pool.",
          parameters: { choiceCount: 3 },
          priority: "must" as const,
        },
        {
          id: "player_choice",
          kind: "ui" as const,
          summary: "Present the 3 candidates as cards and let the player choose 1.",
          parameters: { commitCount: 1, presentation: "cards" },
          priority: "must" as const,
        },
        {
          id: "immediate_placeholder_apply",
          kind: "effect" as const,
          summary: "Apply the chosen reward's local placeholder immediately after selection.",
          priority: "must" as const,
        },
        {
          id: "pool_mutation",
          kind: "state" as const,
          summary: "Remove the selected reward from future draws and return unchosen rewards to the pool.",
          priority: "must" as const,
        },
        {
          id: "deferred_binding",
          kind: "integration" as const,
          summary: "Store enough information to bind a reward later to another feature when its target becomes resolved.",
          priority: "must" as const,
        },
      ],
    },
    constraints: {
      hostConstraints: [
        "The draw UI is local.",
        "The chosen effect initially applies as a local placeholder before later target binding.",
      ],
    },
    interaction: {
      activations: [
        {
          actor: "player",
          kind: "key" as const,
          input: "F4",
          phase: "press" as const,
          repeatability: "repeatable" as const,
          confirmation: "implicit" as const,
        },
      ],
    },
    stateModel: {
      states: [
        {
          id: "local_reward_pool_state",
          summary: "Session-local state that tracks available rewards and future-draw eligibility.",
          owner: "feature" as const,
          lifetime: "session" as const,
          mutationMode: "update" as const,
        },
        {
          id: "presented_candidates_state",
          summary: "Ephemeral state holding the 3 currently drawn reward candidates for the active choice.",
          owner: "feature" as const,
          lifetime: "ephemeral" as const,
          mutationMode: "create" as const,
        },
        {
          id: "pending_binding_state",
          summary: "Tracks selected reward data that waits for a future target-resolution step before binding to another feature.",
          owner: "feature" as const,
          lifetime: "session" as const,
          mutationMode: "update" as const,
        },
      ],
    },
    selection: {
      mode: "weighted" as const,
      source: "weighted-pool" as const,
      choiceMode: "user-chosen" as const,
      cardinality: "single" as const,
      choiceCount: 3,
      repeatability: "repeatable" as const,
      duplicatePolicy: "forbid" as const,
      commitment: "immediate" as const,
    },
    effects: {
      operations: ["apply", "remove"] as const,
      targets: ["selected local placeholder", "future draw eligibility"],
      durationSemantics: "instant" as const,
    },
    outcomes: {
      operations: ["apply-effect", "update-state", "emit-event"] as const,
    },
    contentModel: {
      collections: [
        {
          id: "reward_pool",
          role: "candidate-options" as const,
          ownership: "feature" as const,
          updateMode: "replace" as const,
          itemSchema: [
            { name: "rewardId", type: "string" as const, required: true, semanticRole: "unique reward identity" },
            { name: "rarity", type: "enum" as const, required: true, semanticRole: "rarity classification" },
            { name: "weight", type: "number" as const, required: true, semanticRole: "draw weighting" },
            { name: "placeholderRef", type: "effect-ref" as const, required: true, semanticRole: "immediate local application" },
            { name: "bindingTargetRef", type: "object-ref" as const, required: false, semanticRole: "deferred cross-feature binding target" },
          ],
        },
      ],
    },
    composition: {
      dependencies: [
        {
          kind: "same-feature" as const,
          relation: "reads" as const,
          target: "local reward pool",
          required: true,
        },
        {
          kind: "same-feature" as const,
          relation: "writes" as const,
          target: "future draw eligibility state",
          required: true,
        },
        {
          kind: "cross-feature" as const,
          relation: "syncs-with" as const,
          target: "target feature",
          required: true,
        },
        {
          kind: "cross-feature" as const,
          relation: "triggers" as const,
          target: "deferred reward binding on target resolution",
          required: true,
        },
      ],
    },
    integrations: {
      expectedBindings: [
        {
          id: "f4_entry",
          kind: "entry-point" as const,
          summary: "Activation entry point for F4-triggered local reward draw.",
          required: true,
        },
        {
          id: "reward_draw_ui_surface",
          kind: "ui-surface" as const,
          summary: "Local UI surface for displaying 3 reward cards and accepting a single choice.",
          required: true,
        },
        {
          id: "target_resolution_hook",
          kind: "event-hook" as const,
          summary: "A hook or signal that indicates when a deferred reward target has been resolved.",
          required: true,
        },
        {
          id: "cross_feature_binding_bridge",
          kind: "bridge-point" as const,
          summary: "Bridge used to bind the selected reward to another feature after target resolution.",
          required: true,
        },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["local_reward_draw_ui", "reward_cards"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    uncertainties: [
      {
        id: "unc_target_resolution_source",
        summary: "The source and format of the future target-resolution signal are not specified.",
        affects: ["blueprint", "realization"],
        severity: "medium" as const,
      },
    ],
    resolvedAssumptions: [
      "The reward pool is local to this feature.",
      "The immediate application step affects a local placeholder first, while later bind-to-feature behavior stays deferred.",
    ],
    parameters: {
      triggerKey: "F4",
      choiceCount: 3,
      commitCount: 1,
    },
    isReadyForBlueprint: true,
  } as any;

  const blockedBlueprint = {
    id: "cross_system_composition_fixture",
    version: "1.0",
    summary: "Blocked generic blueprint placeholder",
    sourceIntent: {
      goal: prompt,
      intentKind: "cross-system-composition",
    },
    modules: [
      {
        id: "mod_generic_trigger",
        role: "input_trigger",
        category: "trigger",
        responsibilities: ["Generic trigger placeholder"],
      },
      {
        id: "mod_generic_bridge",
        role: "integration_bridge",
        category: "integration",
        responsibilities: ["Generic integration placeholder"],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    status: "blocked" as const,
    readyForAssembly: false,
    commitDecision: {
      outcome: "blocked" as const,
      canAssemble: false,
      canWriteHost: false,
      requiresReview: true,
      reasons: [
        "Standalone entity/session state semantics request persistent/external/shared ownership and are governance-blocked.",
      ],
    },
  } as any;

  const enrichedBlockedBlueprint = enrichDota2CreateBlueprint(blockedBlueprint, {
    schema,
    prompt,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "consumer_draw_demo",
    proposalSource: "fallback",
  });

  assert.ok(enrichedBlockedBlueprint.blueprint);
  assert.equal(enrichedBlockedBlueprint.admissionDiagnostics?.verdict, "admitted_explicit");
  assert.equal(enrichedBlockedBlueprint.blueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(enrichedBlockedBlueprint.blueprint?.status, "weak");
  assert.equal(enrichedBlockedBlueprint.blueprint?.commitDecision?.outcome, "exploratory");
  assert.equal(enrichedBlockedBlueprint.blueprint?.commitDecision?.canAssemble, true);
  assert.equal(enrichedBlockedBlueprint.blueprint?.commitDecision?.canWriteHost, true);

  const result = buildBlueprint(schema, {
    prompt,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "consumer_draw_demo",
    proposalSource: "fallback",
  });

  assert.ok(result.finalBlueprint);
  assert.equal(result.admissionDiagnostics?.verdict, "admitted_explicit");
  assert.equal(result.finalBlueprint?.featureAuthoring?.profile, "selection_pool");
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(result.finalBlueprint?.commitDecision?.canAssemble, true);
  assert.equal(result.finalBlueprint?.commitDecision?.canWriteHost, true);
  assert.equal(result.issues.some((issue) => issue.startsWith("FINAL_BLUEPRINT_")), false);
}

function testBuildBlueprintDoesNotInventInputKeyBindingFromNegativeActivationConstraint(): void {
  const prompt =
    "Define a gameplay ability feature that has no activation key and does not auto-attach to the hero. It only defines a primary hero ability shell for a level 1 placeholder fire ability on the current hero.";
  const schema = {
    version: "1.0",
    host: { kind: "dota2-x-template" as const },
    request: {
      rawPrompt: prompt,
      goal: prompt,
    },
    classification: {
      intentKind: "micro-feature" as const,
      confidence: "high" as const,
    },
    requirements: {
      functional: [
        "Define a gameplay ability feature that has no activation key and does not auto-attach to the hero.",
        "Only define a primary hero ability shell for a level 1 placeholder fire ability on the current hero.",
      ],
      typed: [
        {
          id: "primary_ability_shell",
          kind: "resource" as const,
          summary: "Define a primary hero ability shell.",
          parameters: {
            abilityLevel: 1,
            autoAttach: false,
          },
          priority: "must" as const,
        },
      ],
    },
    constraints: {},
    timing: {
      duration: {
        kind: "persistent" as const,
      },
    },
    stateModel: {
      states: [
        {
          id: "ability_shell_definition",
          summary: "Definition state for the ability shell.",
          owner: "feature" as const,
          lifetime: "session" as const,
          mutationMode: "create" as const,
        },
      ],
    },
    effects: {
      operations: ["apply"] as const,
      durationSemantics: "persistent" as const,
      targets: ["current hero"],
    },
    composition: {
      dependencies: [
        {
          kind: "same-feature" as const,
          relation: "grants" as const,
          target: "current_hero",
          required: true,
        },
      ],
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
  } as any;

  const result = buildBlueprint(schema, {
    prompt,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "grant_only_provider_demo",
    proposalSource: "fallback",
  });

  assert.ok(result.finalBlueprint);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "input_trigger"), false);
  assert.equal(result.finalBlueprint?.patternHints.some((hint) => hint.suggestedPatterns.includes("input.key_binding")), false);
}

function testBuildBlueprintDoesNotInventModifierApplierForDefinitionOnlyProviderShell(): void {
  const prompt =
    "Create one gameplay ability shell only. No activation key, no player input, no auto-attach, no grant logic, and no modifier application. It only defines one primary hero ability named placeholder fire ability for later external granting.";
  const schema = normalizeIntentSchema(
    {
      request: {
        rawPrompt: prompt,
        goal: prompt,
      },
      classification: {
        intentKind: "cross-system-composition" as const,
        confidence: "high" as const,
      },
      requirements: {
        functional: [
          "Define exactly one gameplay ability shell only.",
          "The feature includes no grant logic.",
          "The feature includes no modifier application.",
          "The shell exists only as a definition for later external granting.",
        ],
        typed: [
          {
            id: "primary_ability_shell",
            kind: "generic" as const,
            summary: "Define a primary hero ability shell.",
            outputs: ["ability shell definition"],
            parameters: {
              abilityName: "placeholder fire ability",
            },
            priority: "must" as const,
          },
        ],
      },
      constraints: {},
      timing: {
        duration: {
          kind: "persistent" as const,
        },
      },
      stateModel: {
        states: [
          {
            id: "ability_shell_definition",
            summary: "Definition state for the ability shell.",
            owner: "feature" as const,
            lifetime: "session" as const,
            mutationMode: "create" as const,
          },
        ],
      },
      selection: {
        mode: "deterministic" as const,
        source: "none" as const,
        choiceMode: "none" as const,
        cardinality: "single" as const,
        choiceCount: 1,
      },
      outcomes: {
        operations: ["grant-feature"] as const,
      },
      composition: {
        dependencies: [
          {
            kind: "external-system" as const,
            relation: "grants" as const,
            target: "placeholder fire ability",
            required: true,
          },
        ],
      },
      parameters: {
        shellOnly: true,
        playerInput: false,
        autoAttach: false,
        grantLogicIncluded: false,
        modifierApplicationIncluded: false,
        externalGrantLater: true,
      },
      resolvedAssumptions: [],
    } as any,
    prompt,
    { kind: "dota2-x-template" as const },
  );

  const result = buildBlueprint(schema, {
    prompt,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "grant_only_provider_demo",
    proposalSource: "fallback",
  });

  assert.ok(result.finalBlueprint);
  assert.equal(result.finalBlueprint?.modules.length, 1);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.equal(result.finalBlueprint?.modules[0]?.role, "gameplay_ability");
  assert.equal(result.finalBlueprint?.modules[0]?.backboneKind, "gameplay_ability");
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "effect_application"), false);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "resource_pool"), false);
  assert.equal(result.finalBlueprint?.patternHints.some((hint) => hint.category === "effect"), false);
  assert.equal(
    result.issues.some((issue) => issue.includes("feature-owned session state")),
    false,
  );
  assert.equal(
    result.finalBlueprint?.moduleNeeds.some((need) => need.requiredCapabilities.includes("ability.definition.shell")),
    true,
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
      parameters: createCanonicalSelectionPoolParameters([
          { id: "TL001", label: "Strength Boost", description: "+10 Strength", weight: 40, tier: "R" },
        ]),
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
      version: 2,
      path: "game/scripts/src/rune_weaver/features/talent_draw_demo/selection-pool.source.json",
    },
    featureAuthoring: {
      mode: "source-backed" as const,
      profile: "selection_pool" as const,
      objectKind: "talent" as const,
      parameters: createCanonicalSelectionPoolParameters(
        Array.from({ length: 6 }, (_, index) => ({
          id: `TL${String(index + 1).padStart(3, "0")}`,
          label: `Talent ${index + 1}`,
          description: `Placeholder talent ${index + 1}`,
          weight: 10,
          tier: "R" as const,
        })),
      ),
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
      version: 2,
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
    poolEntries: { minItems: 1, seededWhenMissing: true },
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
  testBuildBlueprintExplicitSelectionPoolClosurePromotesBoundedResidue();
  testBuildBlueprintCompressedSelectionPoolDoesNotPromoteBlueprintResidue();
  testBuildBlueprintKeepsCrossFeatureSelectionShellWeakButAssemblable();
  testBuildBlueprintLetsSelectionPoolFamilyOverrideSupersededCrossFeatureBlockers();
  testBuildBlueprintDoesNotInventInputKeyBindingFromNegativeActivationConstraint();
  testBuildBlueprintDoesNotInventModifierApplierForDefinitionOnlyProviderShell();
  testSelectionPoolContractDoesNotInjectStandaloneInventoryState();
  testSelectionPoolUpdateExpansionUsesGenericDeltaContract();
  testBuildUpdateBlueprintAppliesPostBlueprintSelectionPoolMerge();
  console.log("apps/cli/dota2/planning.test.ts: PASS");
}

runTests();

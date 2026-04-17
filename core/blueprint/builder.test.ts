import assert from "node:assert/strict";

import { buildBlueprint } from "./builder";
import type { IntentSchema } from "../schema/types";
import {
  buildSelectionPoolExampleParameters,
  getSelectionPoolParameterSurface,
} from "../../adapters/dota2/families/selection-pool/index.js";

const readySchema: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "Create a weighted draft flow with a modal",
    goal: "Create a weighted draft flow with a modal",
  },
  classification: {
    intentKind: "standalone-system",
    confidence: "high",
  },
  readiness: "ready",
  requirements: {
    functional: ["Open draft UI", "Select one weighted option", "Apply selected effect"],
    typed: [
      {
        id: "trigger_req",
        kind: "trigger",
        summary: "Start draft from an explicit trigger",
        parameters: { triggerKey: "F4" },
      },
      {
        id: "rule_req",
        kind: "rule",
        summary: "Choose one option from weighted candidates",
        invariants: ["Exactly one candidate is selected"],
        parameters: { choiceCount: 1, selectionPolicy: "weighted" },
      },
      {
        id: "ui_req",
        kind: "ui",
        summary: "Show a modal choice surface",
        outputs: ["selection_modal"],
      },
    ],
  },
  constraints: {
    requiredPatterns: ["rule.selection_flow"],
  },
  stateModel: {
    states: [{ id: "draft_choice", summary: "Current selected draft option", owner: "feature", lifetime: "session" }],
  },
  selection: {
    mode: "weighted",
    cardinality: "single",
    repeatability: "repeatable",
  },
  effects: {
    operations: ["apply"],
    durationSemantics: "timed",
  },
  integrations: {
    expectedBindings: [{ id: "ui_surface", kind: "ui-surface", summary: "Modal selection UI", required: true }],
  },
  uiRequirements: {
    needed: true,
    surfaces: ["selection_modal"],
  },
  normalizedMechanics: {
    trigger: true,
    candidatePool: true,
    weightedSelection: true,
    uiModal: true,
    outcomeApplication: true,
  },
  acceptanceInvariants: [
    { id: "inv1", summary: "Only one option may be committed", severity: "error" },
  ],
  uncertainties: [],
  requiredClarifications: [],
  openQuestions: [],
  resolvedAssumptions: ["Default trigger is F4"],
  isReadyForBlueprint: true,
};

const weakSchema: IntentSchema = {
  ...readySchema,
  readiness: "weak",
  requiredClarifications: [{ id: "clarify_target", question: "What exact effect should be applied?", blocksFinalization: false }],
  openQuestions: ["What exact effect should be applied?"],
  isReadyForBlueprint: false,
};

function testReadyBuildProducesFinalBlueprint() {
  const result = buildBlueprint(readySchema);
  assert.equal(result.success, true);
  assert.ok(result.finalBlueprint);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.ok(result.blueprintProposal);
  assert.ok(result.normalizationReport);
  assert.ok(result.finalBlueprint?.moduleNeeds.length);
  assert.equal(result.finalBlueprint?.moduleNeeds.length, result.finalBlueprint?.modules.length);
  assert.equal(result.finalBlueprint?.moduleNeeds[0]?.moduleId, result.finalBlueprint?.modules[0]?.id);
  assert.equal((result.blueprint as any)?.status, "ready");
}

function testWeakBuildHonorsHonestStatus() {
  const result = buildBlueprint(weakSchema);
  assert.equal(result.success, false);
  assert.ok(result.finalBlueprint);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.ok(result.normalizationReport?.issues.some((issue) => issue.code === "FINAL_BLUEPRINT_WEAK"));
}

function testMustRequirementWithoutSemanticSupportStaysWeak() {
  const result = buildBlueprint({
    ...readySchema,
    readiness: "ready",
    requirements: {
      functional: ["Apply an effect"],
      typed: [
        {
          id: "effect_req",
          kind: "effect",
          summary: "Apply a gameplay effect",
          priority: "must",
        },
      ],
    },
    effects: {
      operations: [],
    },
    normalizedMechanics: {
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("effect_req")
    )
  );
}

function testFinalBlueprintCarriesCanonicalStateAndIntegrationSemantics() {
  const result = buildBlueprint(readySchema);
  const dataNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "weighted_pool");
  const uiNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "selection_modal");
  const effectNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "effect_application");

  assert.ok(dataNeed?.stateExpectations?.includes("state:draft_choice"));
  assert.ok(dataNeed?.stateExpectations?.some((item) => item.includes("owner:feature")));
  assert.ok(dataNeed?.requiredOutputs?.includes("shared.runtime"));
  assert.ok(dataNeed?.integrationHints?.includes("selection.candidate_source"));
  assert.ok(dataNeed?.requiredCapabilities.includes("selection.pool.weighted_candidates"));
  assert.ok(uiNeed?.integrationHints?.includes("binding:ui-surface:ui_surface"));
  assert.ok(uiNeed?.integrationHints?.includes("ui.surface"));
  assert.ok(uiNeed?.integrationHints?.includes("selection.ui_surface"));
  assert.ok(uiNeed?.integrationHints?.includes("required-binding:ui_surface"));
  assert.ok(uiNeed?.requiredCapabilities.includes("ui.selection.modal"));
  assert.ok(uiNeed?.requiredOutputs?.includes("ui.surface"));
  assert.ok(effectNeed?.requiredOutputs?.includes("host.config.kv"));
  assert.ok(effectNeed?.integrationHints?.includes("ability.execution"));
}

function testBoundedDetailClarificationDoesNotBlockSupportedBlueprint() {
  const result = buildBlueprint({
    ...readySchema,
    readiness: "ready",
    requiredClarifications: [
      {
        id: "clarify_buff_catalog",
        question: "请提供增益候选池的具体内容：每个增益的名称、属性加成数值、图标资源路径",
        blocksFinalization: false,
      },
    ],
    openQuestions: [
      "请提供增益候选池的具体内容：每个增益的名称、属性加成数值、图标资源路径",
    ],
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.ok(
    !result.normalizationReport?.issues.some((issue) => issue.code === "REQUIRED_CLARIFICATION_BLOCKS_FINALIZATION")
  );
}

function testBoundedDraftCatalogClarificationDoesNotBlockExistingSeamBlueprint() {
  const result = buildBlueprint({
    ...readySchema,
    requiredClarifications: [
      {
        id: "clarify_weights",
        question: "请提供候选池的具体数值、图标资源路径与完整候选列表",
        blocksFinalization: true,
      },
    ],
    openQuestions: [
      "请提供候选池的具体数值、图标资源路径与完整候选列表",
    ],
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.ok(
    !result.normalizationReport?.issues.some((issue) => issue.code === "REQUIRED_CLARIFICATION_BLOCKS_FINALIZATION")
  );
}

function testSupportedCapabilitiesUseAdmittedVocabulary() {
  const result = buildBlueprint(readySchema);
  const needsByRole = new Map(
    (result.finalBlueprint?.moduleNeeds || []).map((need) => [need.semanticRole, need])
  );

  assert.deepEqual(needsByRole.get("input_trigger")?.requiredCapabilities, ["input.trigger.capture"]);
  assert.deepEqual(needsByRole.get("selection_flow")?.requiredCapabilities, ["selection.flow.player_confirmed"]);
  assert.ok(needsByRole.get("selection_flow")?.optionalCapabilities?.includes("selection.flow.weighted_resolve"));
  assert.deepEqual(needsByRole.get("effect_application")?.requiredCapabilities, ["effect.modifier.apply"]);
  assert.deepEqual(needsByRole.get("selection_modal")?.requiredCapabilities, ["ui.selection.modal"]);
  assert.ok(needsByRole.get("input_trigger")?.requiredOutputs?.includes("server.runtime"));
  assert.ok(needsByRole.get("input_trigger")?.integrationHints?.includes("input.binding"));
  assert.ok(needsByRole.get("selection_flow")?.requiredOutputs?.includes("server.runtime"));
  assert.ok(needsByRole.get("selection_flow")?.stateExpectations?.includes("selection.commit_state"));
  assert.ok(needsByRole.get("selection_modal")?.integrationHints?.includes("selection.ui_surface"));
  assert.ok(needsByRole.get("effect_application")?.requiredOutputs?.includes("server.runtime"));
  assert.ok(needsByRole.get("effect_application")?.requiredOutputs?.includes("host.config.kv"));
  assert.ok(needsByRole.get("effect_application")?.integrationHints?.includes("ability.execution"));
}

function testExplicitPatternHintsOnlyEmitSchemaConstrainedPatterns() {
  const result = buildBlueprint(readySchema);
  const needsByRole = new Map(
    (result.finalBlueprint?.moduleNeeds || []).map((need) => [need.semanticRole, need])
  );

  assert.deepEqual(needsByRole.get("selection_flow")?.explicitPatternHints, ["rule.selection_flow"]);
  assert.equal(needsByRole.get("input_trigger")?.explicitPatternHints, undefined);
  assert.equal(needsByRole.get("weighted_pool")?.explicitPatternHints, undefined);
  assert.equal(needsByRole.get("selection_modal")?.explicitPatternHints, undefined);
}

function testStandaloneStateAskHonestBlocksInsteadOfStayingWeak() {
  const result = buildBlueprint({
    ...readySchema,
    requirements: {
      functional: ["Track a session-scoped draft state", "Resolve a generic rule"],
      typed: [
        {
          id: "state_req",
          kind: "state",
          summary: "Keep a session-scoped draft state",
          priority: "must",
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Resolve a generic rule without explicit selection semantics",
          priority: "must",
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    effects: undefined,
    integrations: undefined,
    uiRequirements: undefined,
    normalizedMechanics: {},
    stateModel: {
      states: [{ id: "generic_state", summary: "Current generic state", owner: "feature", lifetime: "session" }],
    },
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("Standalone entity/session state semantics")
    )
  );
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("selection.flow.resolve")
    )
  );
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("state.session.snapshot")
    )
  );
}

function testSelectionLocalProgressionSliceStaysReady() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "Track reward progress after each completed selection round and level up after three rounds.",
      goal: "Track reward progress after each completed selection round and level up after three rounds.",
    },
    requirements: {
      functional: [
        "Track reward progress after each selection round",
        "Level up after three completed rounds",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to open the selection flow",
          parameters: { triggerKey: "A" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Resolve one player-confirmed choice from weighted candidates",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
        {
          id: "state_req",
          kind: "state",
          summary: "Store reward progress and current reward level",
          parameters: { progressThreshold: 3 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: {
      mode: "weighted",
      cardinality: "single",
      repeatability: "repeatable",
    },
    stateModel: {
      states: [
        { id: "reward_progress", summary: "Completed selection rounds", owner: "feature", lifetime: "session" },
        { id: "reward_level", summary: "Current reward level", owner: "feature", lifetime: "session" },
      ],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: false,
      outcomeApplication: false,
      resourceConsumption: false,
    },
    uiRequirements: undefined,
    integrations: undefined,
    effects: undefined,
    isReadyForBlueprint: true,
  });

  const selectionModule = result.finalBlueprint?.modules.find((module) => module.role === "selection_flow");
  const selectionNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "selection_flow");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.deepEqual(selectionModule?.parameters?.progression, {
    enabled: true,
    progressThreshold: 3,
    progressStateId: "reward_progress",
    levelStateId: "reward_level",
  });
  assert.ok(selectionNeed?.optionalCapabilities?.includes("progression.selection.local_threshold"));
  assert.ok(selectionNeed?.stateExpectations?.includes("progression.round_counter_state"));
  assert.ok(selectionNeed?.stateExpectations?.includes("progression.level_state"));
}

function testBroaderRewardProgressionFrameworkStaysBlocked() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "Track reward progress across matches and grant a persistent inventory unlock after three rounds.",
      goal: "Track reward progress across matches and grant a persistent inventory unlock after three rounds.",
    },
    requirements: {
      functional: [
        "Track reward progress across matches",
        "Grant an inventory unlock after three rounds",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to open the selection flow",
          parameters: { triggerKey: "A" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Resolve one player-confirmed choice from weighted candidates",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
        {
          id: "state_req",
          kind: "state",
          summary: "Store reward progress and current reward level",
          parameters: { progressThreshold: 3 },
        },
      ],
    },
    selection: {
      mode: "weighted",
      cardinality: "single",
      repeatability: "repeatable",
      inventory: {
        enabled: true,
        capacity: 3,
        storeSelectedItems: true,
        blockDrawWhenFull: false,
        fullMessage: "Inventory full",
        presentation: "persistent_panel",
      },
    },
    stateModel: {
      states: [
        { id: "reward_progress", summary: "Completed selection rounds", owner: "feature", lifetime: "persistent" },
        { id: "reward_level", summary: "Current reward level", owner: "feature", lifetime: "persistent" },
      ],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: false,
      outcomeApplication: false,
      resourceConsumption: false,
    },
    effects: undefined,
    uiRequirements: undefined,
    integrations: undefined,
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("selection-local threshold progression slice")
    )
  );
}

function testForwardLinearProjectileSliceStaysReady() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "Press D to fire one forward linear projectile with fixed speed, distance, and radius.",
      goal: "Press D to fire one forward linear projectile with fixed speed, distance, and radius.",
    },
    requirements: {
      functional: ["Capture a key press", "Fire one forward linear projectile"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to emit the projectile",
          parameters: { triggerKey: "D" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Emit one forward linear projectile",
          parameters: {
            projectileDistance: 900,
            projectileSpeed: 1200,
            projectileRadius: 125,
          },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    effects: undefined,
    uiRequirements: undefined,
    integrations: undefined,
    stateModel: undefined,
    normalizedMechanics: {
      trigger: true,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: true,
      resourceConsumption: false,
    },
    isReadyForBlueprint: true,
  });

  const effectNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "effect_application");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.deepEqual(effectNeed?.requiredCapabilities, ["emission.projectile.linear.forward"]);
  assert.ok(effectNeed?.requiredOutputs?.includes("host.runtime.lua"));
  assert.ok(effectNeed?.requiredOutputs?.includes("host.config.kv"));
}

function testHelperUnitSpawnChoreographyStaysBlocked() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "Press D to spawn a helper unit or projectile that follows the player and applies a short-time effect.",
      goal: "Press D to spawn a helper unit or projectile that follows the player and applies a short-time effect.",
    },
    requirements: {
      functional: [
        "Capture a key press",
        "Spawn a helper unit or projectile",
        "Apply a short-time effect",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to activate the spawn action",
          parameters: { triggerKey: "D" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Spawn a helper unit or projectile that follows the player and applies a brief effect",
          parameters: { lifetimeSeconds: 5 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    uiRequirements: undefined,
    integrations: undefined,
    stateModel: undefined,
    normalizedMechanics: {
      trigger: true,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: true,
      resourceConsumption: false,
    },
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("forward-linear-projectile slice")
    )
  );
}

function testSupportedLifecycleClarificationDoesNotBlockPersistentBuffFlow() {
  const result = buildBlueprint({
    ...readySchema,
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "persistent",
    },
    stateModel: {
      states: [
        {
          id: "active_buff_state",
          summary: "Current active buff choice",
          owner: "feature",
          lifetime: "persistent",
        },
      ],
    },
    requiredClarifications: [
      {
        id: "clarify_duration",
        question: "增益的持续时间是永久的、持续到下次打开F4重新选择、还是固定秒数？",
        blocksFinalization: true,
      },
      {
        id: "clarify_stacking",
        question: "新选择的增益是替换当前增益还是叠加？如果是替换，是否需要先移除旧效果？",
        blocksFinalization: true,
      },
    ],
    openQuestions: [
      "增益的持续时间是永久的、持续到下次打开F4重新选择、还是固定秒数？",
      "新选择的增益是替换当前增益还是叠加？如果是替换，是否需要先移除旧效果？",
    ],
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.ok(
    !result.normalizationReport?.issues.some((issue) => issue.code === "REQUIRED_CLARIFICATION_BLOCKS_FINALIZATION")
  );
}

function testTimedSelfBuffSteersToShortDurationCapability() {
  const result = buildBlueprint({
    ...readySchema,
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
  });
  const effectNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "effect_application");

  assert.deepEqual(effectNeed?.requiredCapabilities, ["ability.buff.short_duration"]);
  assert.ok(effectNeed?.optionalCapabilities?.includes("effect-duration/timed"));
  assert.ok(effectNeed?.requiredOutputs?.includes("server.runtime"));
  assert.ok(effectNeed?.requiredOutputs?.includes("host.config.kv"));
}

function testTimedSelfBuffWithLocalCooldownStaysReady() {
  const result = buildBlueprint({
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "Press Q to apply a short self buff with a 12 second cooldown.",
      goal: "Press Q to apply a short self buff with a 12 second cooldown.",
    },
    requirements: {
      functional: ["Press Q to cast a short self buff", "Keep the ability on a 12 second cooldown"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to cast the buff",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Apply a timed self buff with a local cooldown",
          parameters: { cooldownSeconds: 12, durationSeconds: 4 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    uiRequirements: undefined,
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    integrations: undefined,
    stateModel: undefined,
    isReadyForBlueprint: true,
  });
  const effectNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "effect_application");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.deepEqual(effectNeed?.requiredCapabilities, ["ability.buff.short_duration"]);
  assert.ok(effectNeed?.optionalCapabilities?.includes("effect-duration/timed"));
  assert.ok(effectNeed?.optionalCapabilities?.includes("timing.cooldown.local"));
}

function testInitialDelaySchedulerAskStaysBlocked() {
  const result = buildBlueprint({
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "Press Q, wait 2 seconds, then apply a short self buff.",
      goal: "Press Q, wait 2 seconds, then apply a short self buff.",
    },
    requirements: {
      functional: ["Press Q to cast a short self buff after a delay"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to cast the buff",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Apply a timed self buff after an initial delay",
          parameters: { initialDelaySeconds: 2, durationSeconds: 4 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    uiRequirements: undefined,
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    integrations: undefined,
    stateModel: undefined,
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("cooldown-local effect slice")
    )
  );
}

function testPeriodicSchedulerAskStaysBlocked() {
  const result = buildBlueprint({
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "Press Q to apply a self buff that ticks every second for 5 seconds.",
      goal: "Press Q to apply a self buff that ticks every second for 5 seconds.",
    },
    requirements: {
      functional: ["Press Q to cast a ticking self buff"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to cast the buff",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Apply a timed self buff with periodic ticks",
          parameters: { intervalSeconds: 1, durationSeconds: 5 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    uiRequirements: undefined,
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    integrations: undefined,
    stateModel: undefined,
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("delay/periodic")
    )
  );
}

function testTimedNonSelfBuffKeepsGenericModifierCapability() {
  const result = buildBlueprint({
    ...readySchema,
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["enemy"],
    },
  });
  const effectNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "effect_application");

  assert.deepEqual(effectNeed?.requiredCapabilities, ["effect.modifier.apply"]);
}

function testCooldownCoupledToSelectionFlowStaysBlocked() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "Open a modal choice flow and put the chosen effect on a 12 second cooldown.",
      goal: "Open a modal choice flow and put the chosen effect on a 12 second cooldown.",
    },
    requirements: {
      functional: [
        "Open a weighted selection flow",
        "Choose one option",
        "Apply the chosen self buff with a local cooldown",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to open the selection flow",
          parameters: { triggerKey: "F4" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Resolve one choice from weighted candidates",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
        {
          id: "ui_req",
          kind: "ui",
          summary: "Show a modal choice surface",
          outputs: ["selection_modal"],
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Apply the chosen timed self buff with a local cooldown",
          parameters: { cooldownSeconds: 12, durationSeconds: 4 },
        },
      ],
    },
    constraints: {
      requiredPatterns: ["rule.selection_flow"],
    },
    selection: {
      mode: "weighted",
      cardinality: "single",
      repeatability: "repeatable",
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal"],
    },
    integrations: undefined,
    stateModel: undefined,
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("cross-module/post-selection")
    )
  );
}

function testNonSelfCooldownBuffStaysBlockedAtCurrentBoundary() {
  const result = buildBlueprint({
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "Press Q to apply a timed enemy debuff with a 12 second cooldown.",
      goal: "Press Q to apply a timed enemy debuff with a 12 second cooldown.",
    },
    requirements: {
      functional: ["Press Q to cast a timed enemy debuff with a cooldown"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to cast the debuff",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Apply a timed enemy debuff with a local cooldown",
          parameters: { cooldownSeconds: 12, durationSeconds: 4 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    uiRequirements: undefined,
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["enemy"],
    },
    integrations: undefined,
    stateModel: undefined,
    isReadyForBlueprint: true,
  });
  const effectNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "effect_application");

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.deepEqual(effectNeed?.requiredCapabilities, ["effect.modifier.apply"]);
  assert.ok(!effectNeed?.optionalCapabilities?.includes("timing.cooldown.local"));
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("cooldown-local effect slice")
    )
  );
}

function testInventoryExtensionStaysOnExistingRuleAndUiModules() {
  const inventorySchema: IntentSchema & { parameters: Record<string, unknown> } = {
    ...readySchema,
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
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: false,
    },
    parameters: {
      triggerKey: "F4",
      choiceCount: 3,
      selectionPolicy: "single",
      applyMode: "immediate",
      inventory: {
        enabled: true,
        capacity: 15,
        storeSelectedItems: true,
        blockDrawWhenFull: true,
        fullMessage: "Talent inventory full",
        presentation: "persistent_panel",
      },
    },
  };

  const result = buildBlueprint(inventorySchema);
  assert.equal(result.success, true);

  const selectionModule = result.finalBlueprint?.modules.find((module) => module.role === "selection_flow");
  const uiModule = result.finalBlueprint?.modules.find((module) => module.role === "selection_modal");

  assert.deepEqual(selectionModule?.parameters?.inventory, inventorySchema.parameters?.inventory);
  assert.deepEqual(uiModule?.parameters?.inventory, inventorySchema.parameters?.inventory);
}

function testSelectionPoolFeatureAuthoringFlowsThroughFinalBlueprint() {
  const selectionPoolParameters = buildSelectionPoolExampleParameters("talent");
  const result = buildBlueprint({
    ...readySchema,
    featureAuthoringProposal: {
      mode: "source-backed",
      profile: "selection_pool",
      objectKind: "talent",
      parameters: selectionPoolParameters,
      parameterSurface: getSelectionPoolParameterSurface(),
      proposalSource: "fallback",
    },
    fillIntentCandidates: [
      {
        boundaryId: "weighted_pool.selection_policy",
        summary: "Shape weighted candidate draw policy from authored objects.",
        source: "fallback",
      },
      {
        boundaryId: "selection_flow.effect_mapping",
        summary: "Map authored effect profile into immediate apply behavior.",
        source: "fallback",
      },
      {
        boundaryId: "ui.selection_modal.payload_adapter",
        summary: "Adapt authored display fields into modal payload.",
        source: "fallback",
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.featureAuthoring?.profile, "selection_pool");
  assert.deepEqual(
    result.finalBlueprint?.fillContracts?.map((contract) => contract.boundaryId),
    [
      "weighted_pool.selection_policy",
      "selection_flow.effect_mapping",
      "ui.selection_modal.payload_adapter",
    ],
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.finalBlueprint?.parameters || {}, "rwFeatureAuthoring"),
    false,
  );
}

function testSelectionPoolBoundedFieldsStayInsideSameSkeleton() {
  const result = buildBlueprint({
    ...readySchema,
    featureAuthoringProposal: {
      mode: "source-backed",
      profile: "selection_pool",
      objectKind: "talent",
      parameters: {
        ...buildSelectionPoolExampleParameters("talent"),
        triggerKey: "F5",
        choiceCount: 5,
        display: {
          title: "Choose Your Selection",
          description: "Select one of the following options",
          inventoryTitle: "Selection Inventory",
          payloadShape: "card_with_rarity",
          minDisplayCount: 5,
        },
      },
      parameterSurface: getSelectionPoolParameterSurface(),
      proposalSource: "fallback",
    },
  });

  const inputModule = result.finalBlueprint?.modules.find((module) => module.role === "input_trigger");
  const flowModule = result.finalBlueprint?.modules.find((module) => module.role === "selection_flow");
  const modalModule = result.finalBlueprint?.modules.find((module) => module.role === "selection_modal");

  assert.equal(result.success, true);
  assert.equal(inputModule?.parameters?.triggerKey, "F5");
  assert.equal(flowModule?.parameters?.choiceCount, 5);
  assert.equal(modalModule?.parameters?.title, "Choose Your Selection");
  assert.equal(modalModule?.parameters?.minDisplayCount, 5);
}

function runTests() {
  testReadyBuildProducesFinalBlueprint();
  testWeakBuildHonorsHonestStatus();
  testMustRequirementWithoutSemanticSupportStaysWeak();
  testFinalBlueprintCarriesCanonicalStateAndIntegrationSemantics();
  testBoundedDetailClarificationDoesNotBlockSupportedBlueprint();
  testBoundedDraftCatalogClarificationDoesNotBlockExistingSeamBlueprint();
  testSupportedCapabilitiesUseAdmittedVocabulary();
  testExplicitPatternHintsOnlyEmitSchemaConstrainedPatterns();
  testStandaloneStateAskHonestBlocksInsteadOfStayingWeak();
  testSelectionLocalProgressionSliceStaysReady();
  testBroaderRewardProgressionFrameworkStaysBlocked();
  testSupportedLifecycleClarificationDoesNotBlockPersistentBuffFlow();
  testTimedSelfBuffSteersToShortDurationCapability();
  testTimedSelfBuffWithLocalCooldownStaysReady();
  testInitialDelaySchedulerAskStaysBlocked();
  testPeriodicSchedulerAskStaysBlocked();
  testTimedNonSelfBuffKeepsGenericModifierCapability();
  testCooldownCoupledToSelectionFlowStaysBlocked();
  testNonSelfCooldownBuffStaysBlockedAtCurrentBoundary();
  testForwardLinearProjectileSliceStaysReady();
  testHelperUnitSpawnChoreographyStaysBlocked();
  testInventoryExtensionStaysOnExistingRuleAndUiModules();
  testSelectionPoolFeatureAuthoringFlowsThroughFinalBlueprint();
  testSelectionPoolBoundedFieldsStayInsideSameSkeleton();
  console.log("builder.test.ts: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };

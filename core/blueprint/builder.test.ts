import assert from "node:assert/strict";

import { BlueprintBuilder, buildBlueprint } from "./builder";
import type { IntentSchema } from "../schema/types";
import {
  getSelectionPoolParameterSurface,
  resolveSelectionPoolFamily,
} from "../../adapters/dota2/families/selection-pool/index.js";
import {
  buildSelectionPoolSyntheticParameters,
} from "../../adapters/dota2/families/selection-pool/__fixtures__/synthetic.js";
import {
  TALENT_DRAW_DEMO_CREATE_PROMPT,
} from "../../adapters/dota2/cases/selection-demo-registry.js";
import {
  buildCurrentFeatureContext,
  createUpdateIntentFromRequestedChange,
} from "../wizard/index.js";

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
  uncertainties: [
    {
      id: "unc_clear_target",
      summary: "The exact effect target is still underspecified.",
      affects: ["intent", "blueprint"],
      severity: "medium",
    },
  ],
  requiredClarifications: [{ id: "clarify_target", question: "What exact effect should be applied?", blocksFinalization: false }],
  openQuestions: ["What exact effect should be applied?"],
  isReadyForBlueprint: false,
};

function testReadyBuildProducesFinalBlueprint() {
  const result = buildBlueprint(readySchema);
  assert.equal(result.success, true);
  assert.ok(result.draftBlueprint);
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
  assert.equal(result.success, true);
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

  assert.equal(result.success, true);
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

  assert.ok(dataNeed?.stateExpectations?.includes("selection.pool_state"));
  assert.ok(dataNeed?.stateExpectations?.some((item) => item.includes("owner:feature")));
  assert.ok(dataNeed?.requiredOutputs?.includes("shared.runtime"));
  assert.ok(dataNeed?.requiredCapabilities.includes("selection.pool.weighted_candidates"));
  assert.ok(uiNeed?.integrationHints?.includes("binding:ui-surface"));
  assert.ok(uiNeed?.integrationHints?.includes("ui.surface"));
  assert.ok(uiNeed?.integrationHints?.includes("selection.ui_surface"));
  assert.ok(uiNeed?.integrationHints?.includes("required-binding:ui-surface"));
  assert.ok(uiNeed?.requiredCapabilities.includes("ui.selection.modal"));
  assert.ok(uiNeed?.requiredOutputs?.includes("ui.surface"));
  assert.ok(effectNeed?.requiredOutputs?.includes("host.config.kv"));
  assert.ok(effectNeed?.requiredOutputs?.includes("server.runtime"));
}

function testSurfaceDetailDriftDoesNotChangeBlueprintPlanning(): void {
  const variantSchema: IntentSchema = {
    ...readySchema,
    stateModel: {
      states: [
        {
          id: "selection_runtime_state",
          summary: "Visible runtime selection state",
          owner: "feature",
          lifetime: "session",
        },
      ],
    },
    integrations: {
      expectedBindings: [
        {
          id: "selection_surface_runtime",
          kind: "ui-surface",
          summary: "Runtime selection surface binding",
          required: true,
        },
      ],
    },
    resolvedAssumptions: ["Alternative display copy"],
  };

  const baseResult = buildBlueprint(readySchema);
  const variantResult = buildBlueprint(variantSchema);
  const project = (result: ReturnType<typeof buildBlueprint>) => ({
    status: result.finalBlueprint?.status,
    modules: (result.finalBlueprint?.modules || []).map((module) => ({
      role: module.role,
      category: module.category,
      planningKind: module.planningKind,
      backboneKind: module.backboneKind,
    })),
    moduleNeeds: (result.finalBlueprint?.moduleNeeds || []).map((need) => ({
      role: need.semanticRole,
      requiredCapabilities: need.requiredCapabilities,
      optionalCapabilities: need.optionalCapabilities,
      requiredOutputs: need.requiredOutputs,
      stateExpectations: need.stateExpectations,
      integrationHints: need.integrationHints,
    })),
  });

  assert.deepEqual(project(variantResult), project(baseResult));
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
  assert.ok(needsByRole.get("selection_flow")?.requiredOutputs?.includes("server.runtime"));
  assert.ok(needsByRole.get("selection_flow")?.stateExpectations?.includes("selection.commit_state"));
  assert.ok(needsByRole.get("selection_modal")?.integrationHints?.includes("selection.ui_surface"));
  assert.ok(needsByRole.get("effect_application")?.requiredOutputs?.includes("server.runtime"));
  assert.ok(needsByRole.get("effect_application")?.requiredOutputs?.includes("host.config.kv"));
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

  const sessionStateModule = result.finalBlueprint?.modules.find((module) => module.role === "session_state");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.ok(sessionStateModule);
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("feature-owned session state")
    )
  );
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("state.session.feature_owned")
    )
  );
}

function testGenericTimedRuleDoesNotInventSelectionUiModules() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离，并在终点留下一个持续2秒的火焰区域，每0.5秒对附近敌人造成一次伤害。",
      goal: "Create a Q-triggered fire dash with timed periodic damage and no UI or persistence.",
    },
    requirements: {
      functional: ["Press Q to dash 400 units toward the cursor and apply timed periodic fire damage at the endpoint."],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a Q key press to activate the ability.",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Schedule a 2-second periodic fire-area damage sequence with 0.5-second ticks.",
          parameters: { durationSeconds: 2, intervalSeconds: 0.5 },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Dash the caster 400 units toward the cursor and damage nearby enemies.",
          parameters: { distance: 400 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    stateModel: undefined,
    integrations: undefined,
    uiRequirements: undefined,
    timing: {
      duration: { kind: "timed", seconds: 2 },
      intervalSeconds: 0.5,
    },
    spatial: {
      motion: { kind: "dash", distance: 400, direction: "cursor" },
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  });

  const roles = new Set((result.finalBlueprint?.modules || []).map((module) => module.role));
  const patternHints = new Set(
    (result.finalBlueprint?.patternHints || []).flatMap((hint) => hint.suggestedPatterns || []),
  );
  const backbone = result.finalBlueprint?.modules.find((module) => module.planningKind === "backbone");
  const backboneNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "gameplay_ability");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(roles.has("selection_flow"), false);
  assert.equal(roles.has("selection_modal"), false);
  assert.equal(patternHints.has("ui.selection_modal"), false);
  assert.equal(patternHints.has("rule.selection_flow"), false);
  assert.equal(backbone?.role, "gameplay_ability");
  assert.ok(backboneNeed?.requiredCapabilities?.includes("timing.interval.local"));
}

function testNegativeFunctionalConstraintsDoNotCreateUiModules() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "Create a fire dash with no UI, inventory, or persistence.",
      goal: "Create a fire dash with no UI, inventory, or persistence.",
    },
    requirements: {
      functional: [
        "Press Q to activate the skill.",
        "Dash the caster 400 units toward the cursor.",
        "The feature must not add UI.",
        "The feature must not add inventory.",
        "The feature must not add persistence.",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Activate the skill when Q is pressed.",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "periodic_fire_damage",
          kind: "rule",
          summary: "Deal damage every 0.5 seconds while the fire area exists.",
          parameters: { intervalSeconds: 0.5 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    uiRequirements: {
      needed: false,
      surfaces: [],
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  });

  const roles = new Set((result.finalBlueprint?.modules || []).map((module) => module.role));

  assert.equal(roles.has("selection_modal"), false);
  assert.equal(roles.has("selection_flow"), false);
  assert.equal(result.finalBlueprint?.patternHints.some((hint) => (hint.suggestedPatterns || []).includes("ui.selection_modal")), false);
}

function testInlineNegativeConstraintClausesDoNotTriggerGovernanceBlocks() {
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: "做一个主动技能：施放后在英雄身边召唤一个跟随自己的火球，持续5秒，每秒灼烧附近敌人。不要 UI，不要 inventory，不要 persistence，不要跨 feature，只需要一个技能。",
      goal: "Create a single active skill that summons a fireball near the hero for 5 seconds, burns nearby enemies every second, with no UI, no inventory, no persistence, and no cross-feature coupling.",
    },
    requirements: {
      functional: [
        "Create a single active skill that summons a fireball near the hero for 5 seconds, burns nearby enemies every second, with no UI, no inventory, no persistence, and no cross-feature coupling.",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Cast a single active skill.",
        },
        {
          id: "state_req",
          kind: "state",
          summary: "Track the temporary fireball instance for 5 seconds.",
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Apply burn damage every second for 5 seconds.",
          parameters: { intervalSeconds: 1, durationSeconds: 5 },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Spawn the fireball near the hero and burn nearby enemies.",
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    stateModel: {
      states: [{ id: "fireball_runtime", summary: "Runtime fireball instance", owner: "feature", lifetime: "round" }],
    },
    uiRequirements: {
      needed: false,
      surfaces: [],
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  });

  const issues = result.normalizationReport?.issues || [];
  const roles = new Set((result.finalBlueprint?.modules || []).map((module) => module.role));

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(
    issues.some((issue) => issue.message.includes("persistent/economy/inventory scope")),
    false,
  );
  assert.equal(roles.has("selection_modal"), false);
  assert.equal(roles.has("selection_flow"), false);
}

function testWizardStyleNegativeScopePhrasesDoNotTriggerGovernanceBlocks() {
  const result = buildBlueprint({
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "做一个主动技能：施放后在英雄身边召唤一个跟随自己的火球，持续5秒，每秒灼烧附近敌人。不要 UI，不要 inventory，不要 persistence，不要跨 feature，只需要一个技能。",
      goal: "Create a single active skill that summons a fireball near the hero, follows the hero for 5 seconds, and burns nearby enemies once per second, with no UI, no inventory, no persistence, and no cross-feature composition.",
    },
    requirements: {
      functional: [
        "The feature is a single active skill.",
        "On cast, the skill summons a fireball near the casting hero.",
        "The summoned fireball follows the hero after being created.",
        "The fireball lasts exactly 5 seconds.",
        "While active, the fireball burns nearby enemies once every second.",
        "The feature must not require UI.",
        "The feature must not use inventory mechanics.",
        "The feature must not use persistence.",
        "The feature must not depend on cross-feature composition.",
      ],
      typed: [
        {
          id: "trigger_cast_skill",
          kind: "trigger",
          summary: "Casting the active skill creates the following fireball.",
          inputs: ["skill cast"],
          outputs: ["fireball spawned"],
        },
        {
          id: "state_fireball_active",
          kind: "state",
          summary: "Temporary active fireball state exists for 5 seconds after cast.",
          inputs: ["fireball spawned"],
          outputs: ["active timed aura-like presence"],
          invariants: ["State is not persistent."],
          parameters: { durationSeconds: 5 },
        },
        {
          id: "rule_follow_caster",
          kind: "rule",
          summary: "The fireball stays with or follows the caster while active.",
          inputs: ["caster position"],
          outputs: ["fireball position updated"],
        },
        {
          id: "effect_periodic_burn",
          kind: "effect",
          summary: "Every second, nearby enemies are burned while the fireball is active.",
          inputs: ["1-second interval", "enemy proximity to fireball"],
          outputs: ["burn applied to nearby enemies"],
          parameters: { intervalSeconds: 1, durationSeconds: 5 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    stateModel: {
      states: [
        { id: "fireball_instance", summary: "Temporary summoned fireball linked to the caster.", owner: "feature", lifetime: "ephemeral" },
        { id: "fireball_expiration", summary: "Timed removal of the fireball after 5 seconds.", owner: "feature", lifetime: "ephemeral" },
      ],
    },
    uiRequirements: {
      needed: false,
      surfaces: [],
    },
    integrations: {
      expectedBindings: [
        { id: "skill_cast_entry", kind: "entry-point", summary: "Bind to the active skill cast event.", required: true },
        { id: "nearby_enemy_query", kind: "bridge-point", summary: "Resolve enemy units near the active fireball during each periodic pulse.", required: true },
      ],
    },
    timing: {
      intervalSeconds: 1,
      duration: { kind: "timed", seconds: 5 },
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  });

  const issues = result.normalizationReport?.issues || [];
  const roles = new Set((result.finalBlueprint?.modules || []).map((module) => module.role));

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(
    issues.some((issue) => issue.message.includes("persistent/economy/inventory scope")),
    false,
  );
  assert.equal(roles.has("selection_modal"), false);
  assert.equal(roles.has("selection_flow"), false);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.planningKind === "backbone"), true);
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
        issue.message.includes("persistent/economy/inventory scope")
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

function testHelperUnitSpawnChoreographyBuildsGameplayBackbone() {
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

  const backbone = result.finalBlueprint?.modules.find((module) => module.planningKind === "backbone");
  const need = result.finalBlueprint?.moduleNeeds[0];
  const facetKinds = new Set((result.finalBlueprint?.moduleFacets || []).map((facet) => facet.kind));

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(result.finalBlueprint?.modules.length, 1);
  assert.equal(backbone?.role, "gameplay_ability");
  assert.equal(need?.semanticRole, "gameplay_ability");
  assert.ok(need?.requiredCapabilities.includes("emission.spawn.feature_owned"));
  assert.ok(need?.requiredCapabilities.includes("ability.buff.short_duration"));
  assert.ok(need?.optionalCapabilities?.includes("entity.motion.follow_owner"));
  assert.ok(facetKinds.has("spawn"));
  assert.ok(facetKinds.has("effect"));
  assert.ok(facetKinds.has("motion"));
  assert.equal(result.finalBlueprint?.modules.some((module) => module.category === "ui"), false);
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("Spawn/emission semantics require synthesis")
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

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("persistent/external/shared ownership")
    )
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

function testInitialDelaySchedulerAskBuildsTimingFacetBackbone() {
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

  const backbone = result.finalBlueprint?.modules.find((module) => module.planningKind === "backbone");
  const gameplayNeed = result.finalBlueprint?.moduleNeeds[0];
  const timingFacet = result.finalBlueprint?.moduleFacets?.find((facet) => facet.role === "timed_rule");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(backbone?.role, "gameplay_ability");
  assert.equal(gameplayNeed?.semanticRole, "gameplay_ability");
  assert.deepEqual(timingFacet?.requiredCapabilities, ["timing.delay.local"]);
  assert.ok(gameplayNeed?.requiredCapabilities.includes("timing.delay.local"));
  assert.equal(result.finalBlueprint?.modules.some((module) => module.category === "ui"), false);
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("Scheduler/timer semantics need synthesis")
    )
  );
}

function testPeriodicSchedulerAskBuildsIntervalFacetBackbone() {
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

  const backbone = result.finalBlueprint?.modules.find((module) => module.planningKind === "backbone");
  const gameplayNeed = result.finalBlueprint?.moduleNeeds[0];
  const timingFacet = result.finalBlueprint?.moduleFacets?.find((facet) => facet.role === "timed_rule");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(backbone?.role, "gameplay_ability");
  assert.equal(gameplayNeed?.semanticRole, "gameplay_ability");
  assert.deepEqual(timingFacet?.requiredCapabilities, ["timing.interval.local"]);
  assert.ok(gameplayNeed?.requiredCapabilities.includes("timing.interval.local"));
  assert.equal(result.finalBlueprint?.modules.some((module) => module.category === "ui"), false);
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("Scheduler/timer semantics need synthesis")
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

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("Scheduler/timer semantics need synthesis")
    )
  );
}

function testNonSelfCooldownBuffBuildsBackboneWithSeparateTimingFacet() {
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
  const backbone = result.finalBlueprint?.modules.find((module) => module.planningKind === "backbone");
  const gameplayNeed = result.finalBlueprint?.moduleNeeds[0];
  const effectFacet = result.finalBlueprint?.moduleFacets?.find((facet) => facet.role === "effect_application");
  const timingFacet = result.finalBlueprint?.moduleFacets?.find((facet) => facet.role === "timed_rule");

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "weak");
  assert.equal(backbone?.role, "gameplay_ability");
  assert.equal(gameplayNeed?.semanticRole, "gameplay_ability");
  assert.deepEqual(effectFacet?.requiredCapabilities, ["effect.modifier.apply"]);
  assert.deepEqual(timingFacet?.requiredCapabilities, ["timing.cooldown.local"]);
  assert.ok(!effectFacet?.optionalCapabilities?.includes("timing.cooldown.local"));
  assert.ok(gameplayNeed?.requiredCapabilities.includes("effect.modifier.apply"));
  assert.ok(gameplayNeed?.requiredCapabilities.includes("timing.cooldown.local"));
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_WARNING" &&
        issue.message.includes("Scheduler/timer semantics need synthesis")
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
  const result = buildBlueprint(readySchema);

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.featureAuthoring, undefined);
  assert.equal(result.finalBlueprint?.fillContracts, undefined);
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.finalBlueprint?.parameters || {}, "rwFeatureAuthoring"),
    false,
  );
}

function testSelectionPoolBoundedFieldsStayInsideSameSkeleton() {
  const result = buildBlueprint(readySchema);

  const inputModule = result.finalBlueprint?.modules.find((module) => module.role === "input_trigger");
  const flowModule = result.finalBlueprint?.modules.find((module) => module.role === "selection_flow");
  const modalModule = result.finalBlueprint?.modules.find((module) => module.role === "selection_modal");

  assert.equal(result.success, true);
  assert.equal(inputModule?.parameters?.triggerKey, "F4");
  assert.equal(flowModule?.parameters?.choiceCount, 1);
  assert.equal(modalModule?.parameters?.title, undefined);
  assert.equal(modalModule?.parameters?.minDisplayCount, undefined);
}

function testSchemaOwnedImplementationCandidatesAreIgnored() {
  const pollutedSchema = {
    ...readySchema,
    featureAuthoringProposal: {
      mode: "source-backed",
      profile: "selection_pool",
      objectKind: "talent",
      parameters: buildSelectionPoolSyntheticParameters("talent"),
      parameterSurface: getSelectionPoolParameterSurface(),
      proposalSource: "fallback",
    },
    fillIntentCandidates: [
      {
        boundaryId: "weighted_pool.selection_policy",
        summary: "Legacy schema-owned fill candidate",
        source: "fallback",
      },
    ],
  } as IntentSchema & Record<string, unknown>;

  const result = buildBlueprint(pollutedSchema as IntentSchema);

  assert.equal(result.finalBlueprint?.featureAuthoring, undefined);
  assert.equal(result.finalBlueprint?.fillContracts, undefined);
}

function testBlockedExternalCandidatesBlockBlueprintWithoutMutatingSchema() {
  const schema: IntentSchema = {
    ...readySchema,
    requiredClarifications: [],
    openQuestions: [],
    uncertainties: [],
    readiness: "ready",
    isReadyForBlueprint: true,
  };

  const result = buildBlueprint(schema);

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.equal(schema.readiness, "ready");
  assert.equal(
    result.normalizationReport?.issues.some(
      (issue) => issue.code === "FINAL_BLUEPRINT_IMPLEMENTATION_CANDIDATE_BLOCKER",
    ),
    false,
  );
}

function testContentModelEvidenceSurfacesInNormalizationNotes() {
  const result = buildBlueprint({
    ...readySchema,
    contentModel: {
      collections: [
        {
          id: "draft_candidates",
          role: "candidate-options",
          ownership: "feature",
          updateMode: "merge",
          itemSchema: [
            { name: "label", type: "string", required: true },
            { name: "weight", type: "number", required: true },
          ],
        },
      ],
    },
  });

  assert.equal(result.success, true);
  assert.ok(
    result.normalizationReport?.notes.some((note) =>
      note.includes("feature-owned content collection"),
    ),
  );
}

function testUpdateBlueprintKeepsWorkspaceContextGenericUntilAdapterLayer() {
  const createResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_DEMO_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const currentFeature = {
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
      objectKind: createResolution.proposal?.objectKind,
      parameters: createResolution.proposal!.parameters,
      parameterSurface: createResolution.proposal!.parameterSurface,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const currentFeatureContext = buildCurrentFeatureContext(currentFeature, "D:\\test3");
  const requestedChange: IntentSchema = {
    ...readySchema,
    request: {
      rawPrompt: "Add a persistent 15-slot inventory panel that stores confirmed selections.",
      goal: "Add a persistent 15-slot inventory panel that stores confirmed selections.",
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
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  const builder = new BlueprintBuilder();
  const result = builder.buildUpdate(updateIntent);

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.status, "ready");
  assert.equal(result.finalBlueprint?.featureAuthoring, undefined);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "selection_flow"), true);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "selection_modal"), true);
}

function testUpdateBlueprintDoesNotRebuildSelectionFromLegacyPatternIds() {
  const currentFeatureContext = buildCurrentFeatureContext({
    featureId: "dash_generic",
    intentKind: "micro-feature",
    status: "active" as const,
    revision: 2,
    blueprintId: "bp_dash_generic",
    selectedPatterns: [
      "input.key_binding",
      "data.weighted_pool",
      "rule.selection_flow",
      "ui.selection_modal",
    ],
    generatedFiles: [],
    entryBindings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, "D:\\test3");
  const requestedChange: IntentSchema = {
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "Rebind the dash trigger to G. No UI.",
      goal: "Rebind the dash trigger to G. No UI.",
    },
    requirements: {
      functional: ["Rebind the dash trigger to G.", "The feature must not add UI."],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture G to trigger the existing dash.",
          parameters: { triggerKey: "G" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Keep the existing dash effect.",
          parameters: { distance: 400 },
        },
      ],
    },
    selection: undefined,
    uiRequirements: {
      needed: false,
      surfaces: [],
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  const builder = new BlueprintBuilder();
  const result = builder.buildUpdate(updateIntent);
  const roles = new Set((result.finalBlueprint?.modules || []).map((module) => module.role));

  assert.equal(result.success, true);
  assert.equal(roles.has("selection_flow"), false);
  assert.equal(roles.has("selection_modal"), false);
}

function testUpdateBlueprintBlocksSourceBackedInvariantRemoval() {
  const createResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_DEMO_CREATE_PROMPT,
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
      objectKind: createResolution.proposal?.objectKind,
      parameters: createResolution.proposal!.parameters,
      parameterSurface: createResolution.proposal!.parameterSurface,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, "D:\\rw_test_missing");
  const requestedChange: IntentSchema = {
    ...readySchema,
    request: {
      rawPrompt: "Remove the modal UI and auto-apply immediately.",
      goal: "Remove the modal UI and auto-apply immediately.",
    },
    requirements: {
      functional: ["Remove the modal UI and auto-apply immediately."],
    },
    selection: undefined,
    uiRequirements: {
      needed: false,
      surfaces: [],
    },
    normalizedMechanics: {
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  const builder = new BlueprintBuilder();
  const result = builder.buildUpdate(updateIntent);

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(result.issues.some((issue) => issue.code === "UPDATE_INVARIANT_CONFLICT"));
}

function testBoundedSourceBackedUpdateUsesAuthoritativeProjectionInsteadOfPreserveEchoModules() {
  const currentFeatureContext = buildCurrentFeatureContext({
    featureId: "talent_draw_projection_demo",
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 2,
    blueprintId: "bp_talent_draw_projection_demo",
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
      path: "game/scripts/src/rune_weaver/features/talent_draw_demo/selection-pool.source.json",
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
  }, "D:\\rw_test_missing");
  const requestedChange: IntentSchema = {
    ...readySchema,
    request: {
      rawPrompt: "把天赋抽取的触发键从 F4 改成 F5",
      goal: "Only change the trigger key from F4 to F5 while preserving everything else.",
    },
    requirements: {
      functional: [
        "Rebind the existing talent draw trigger key from F4 to F5.",
        "Keep all other selection, pool, UI, effect, and state behavior unchanged.",
      ],
      typed: [
        {
          id: "req_trigger_rebind",
          kind: "trigger",
          summary: "Change the single hotkey activation from F4 to F5.",
          inputs: ["F5 key press"],
          outputs: ["existing talent draw flow activation"],
          invariants: ["preserve existing selection flow and outcome behavior"],
          parameters: {
            oldKey: "F4",
            newKey: "F5",
          },
          priority: "must",
        },
        {
          id: "req_preserve_flow",
          kind: "rule",
          summary: "Preserve the current weighted draw, single confirmation, and immediate apply flow.",
          outputs: ["unchanged talent selection behavior"],
          parameters: {
            choiceCount: 3,
            selectionPolicy: "single",
            applyMode: "immediate",
          },
          priority: "must",
        },
      ],
    },
    interaction: {
      activations: [
        {
          kind: "key",
          input: "F5",
          phase: "press",
          repeatability: "repeatable",
        },
      ],
    },
    parameters: {
      triggerKey: "F5",
    },
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
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
    isReadyForBlueprint: true,
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  const builder = new BlueprintBuilder();
  const result = builder.buildUpdate(updateIntent);
  const moduleIds = (result.finalBlueprint?.modules || []).map((module) => module.id);
  const roles = new Set((result.finalBlueprint?.modules || []).map((module) => module.role));

  assert.equal(result.success, true);
  assert.equal(moduleIds.some((moduleId) => moduleId.includes("req_preserve_flow")), false);
  assert.equal(moduleIds.some((moduleId) => moduleId.includes("req_trigger_rebind")), false);
  assert.ok(roles.has("input_trigger"));
  assert.ok(roles.has("weighted_pool"));
  assert.ok(roles.has("selection_flow"));
  assert.ok(roles.has("selection_modal"));
}

function testSourceBackedUpdateKeepsBoundedChoiceCountWithoutExplicitDelta() {
  const currentFeatureContext = buildCurrentFeatureContext({
    featureId: "talent_draw_inventory_demo",
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 2,
    blueprintId: "bp_talent_draw_inventory_demo",
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
      parameters: {
        triggerKey: "F4",
        choiceCount: 3,
        inventory: {
          enabled: true,
          capacity: 15,
          storeSelectedItems: true,
          blockDrawWhenFull: true,
          fullMessage: "Talent inventory full",
          presentation: "persistent_panel",
        },
      },
      parameterSurface: {
        invariants: ["same selection skeleton"],
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, "D:\\rw_test_missing");
  const requestedChange: IntentSchema = {
    ...readySchema,
    request: {
      rawPrompt: "16格的天赋仓库，如果满了则按F4不能继续抽取天赋。",
      goal: "Expand the current inventory capacity to 16 and stop drawing when full.",
    },
    requirements: {
      functional: ["Expand the inventory capacity to 16 and stop drawing when full."],
      typed: [
        {
          id: "inventory_req",
          kind: "ui",
          summary: "Keep the current inventory panel but expand it to 16 slots.",
          priority: "must",
        },
      ],
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
    isReadyForBlueprint: true,
  };

  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  const builder = new BlueprintBuilder();
  const result = builder.buildUpdate(updateIntent);

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.parameters?.choiceCount, 3);
}

function testSelectionFamilyBlueprintDoesNotCollapseIntoGameplayBackbone() {
  const result = buildBlueprint(readySchema);

  assert.equal(result.finalBlueprint?.modules.some((module) => module.planningKind === "backbone"), false);
  assert.equal((result.finalBlueprint?.moduleFacets || []).length, 0);
}

function testSingleAbilityExploratoryPlanningBuildsGameplayBackbone() {
  const result = buildBlueprint({
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "Create one active skill that summons a fireball near the hero, follows the hero for 5 seconds, and burns nearby enemies every second. No UI, no inventory, no persistence.",
      goal: "Create one active skill that summons a fireball near the hero, follows the hero for 5 seconds, and burns nearby enemies every second. No UI, no inventory, no persistence.",
    },
    requirements: {
      functional: [
        "Create one active skill.",
        "Summon a fireball near the hero.",
        "Follow the hero for 5 seconds.",
        "Burn nearby enemies every second.",
        "The feature must not include UI.",
        "The feature must not include inventory mechanics.",
        "The feature must not include persistence.",
        "The feature must not couple to other features.",
        "Only a single skill is required.",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Cast one active skill.",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "state_req",
          kind: "state",
          summary: "Track the temporary fireball instance for 5 seconds.",
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Run the 5 second burn cadence with 1 second ticks.",
          parameters: { durationSeconds: 5, intervalSeconds: 1 },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Spawn the fireball near the hero and burn nearby enemies.",
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    uiRequirements: {
      needed: false,
      surfaces: [],
    },
    integrations: {
      expectedBindings: [
        { id: "skill_cast_entry", kind: "entry-point", summary: "Ability cast entry point.", required: true },
        { id: "periodic_tick", kind: "event-hook", summary: "Recurring 1-second tick while active.", required: true },
        { id: "nearby_enemy_query", kind: "bridge-point", summary: "Resolve nearby enemies during each burn pulse.", required: true },
      ],
    },
    stateModel: {
      states: [{ id: "fireball_runtime", summary: "Runtime fireball instance", owner: "feature", lifetime: "round" }],
    },
    timing: {
      duration: { kind: "timed", seconds: 5 },
      intervalSeconds: 1,
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  });

  const backbone = result.finalBlueprint?.modules.find((module) => module.planningKind === "backbone");
  const need = result.finalBlueprint?.moduleNeeds[0];
  const facetKinds = new Set((result.finalBlueprint?.moduleFacets || []).map((facet) => facet.kind));

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.modules.length, 1);
  assert.equal(backbone?.role, "gameplay_ability");
  assert.equal(backbone?.backboneKind, "gameplay_ability");
  assert.ok((backbone?.facetIds || []).length >= 4);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "selection_flow"), false);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "selection_modal"), false);
  assert.equal(result.finalBlueprint?.moduleNeeds.length, 1);
  assert.equal(need?.backboneKind, "gameplay_ability");
  assert.equal(need?.coLocatePreferred, true);
  assert.ok(facetKinds.has("trigger"));
  assert.ok(facetKinds.has("timing"));
  assert.ok(facetKinds.has("state"));
  assert.ok(facetKinds.has("motion"));
  assert.ok(facetKinds.has("spawn") || facetKinds.has("effect"));
  assert.equal(
    (result.normalizationReport?.issues || []).some((issue) =>
      issue.message.includes("Missing canonical ModuleNeed"),
    ),
    false,
  );
}

function testSingleAbilityPlanningKeepsExplicitUiAsSeparateSurface() {
  const result = buildBlueprint({
    ...readySchema,
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    request: {
      rawPrompt: "Create one active fireball skill and show a key hint UI. The fireball follows the hero for 5 seconds and burns nearby enemies every second.",
      goal: "Create one active fireball skill and show a key hint UI. The fireball follows the hero for 5 seconds and burns nearby enemies every second.",
    },
    requirements: {
      functional: [
        "Create one active fireball skill.",
        "Show a key hint UI.",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Cast one active skill.",
          parameters: { triggerKey: "Q" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Run the 5 second burn cadence with 1 second ticks.",
          parameters: { durationSeconds: 5, intervalSeconds: 1 },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Spawn the fireball near the hero and burn nearby enemies.",
        },
        {
          id: "ui_req",
          kind: "ui",
          summary: "Show a key hint UI surface.",
          outputs: ["key_hint"],
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: undefined,
    uiRequirements: {
      needed: true,
      surfaces: ["key_hint"],
    },
    integrations: undefined,
    stateModel: undefined,
    timing: {
      duration: { kind: "timed", seconds: 5 },
      intervalSeconds: 1,
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    isReadyForBlueprint: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.planningKind === "backbone"), true);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.category === "ui"), true);
  assert.equal(result.finalBlueprint?.modules.some((module) => module.role === "selection_modal"), false);
}

function testRevealBatchImmediatePlanningStaysExploratoryAndAvoidsSelectionPoolModules() {
  const prompt =
    "Create a reveal-only weighted card system. Press F4 to reveal 3 weighted cards from a feature-owned pool, show their rarity-styled UI, and resolve all 3 revealed results immediately as one batch without letting the player choose any card. No follow-up selection, no inventory panel, no persistence, no cross-feature grants.";
  const result = buildBlueprint({
    ...readySchema,
    request: {
      rawPrompt: prompt,
      goal: prompt,
    },
    requirements: {
      functional: [
        "Press F4 to reveal 3 weighted cards from a feature-owned pool.",
        "Resolve all revealed results immediately as one batch.",
        "Show a rarity-styled reveal UI without any follow-up choice.",
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    interaction: {
      activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
    },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "none",
      resolutionMode: "reveal_batch_immediate",
      cardinality: "multiple",
      choiceCount: 3,
      repeatability: "repeatable",
      commitment: "immediate",
    },
    effects: undefined,
    outcomes: undefined,
    stateModel: undefined,
    integrations: {
      expectedBindings: [
        { id: "f4_entry", kind: "entry-point", summary: "Reveal entry point", required: true },
        { id: "feature_pool_source", kind: "data-source", summary: "Feature-owned weighted pool", required: true },
        { id: "reveal_surface", kind: "ui-surface", summary: "Reveal-only card surface", required: true },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["card_reveal_surface", "rarity_cards"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: false,
      uiModal: true,
      outcomeApplication: false,
    },
    parameters: {
      triggerKey: "F4",
      choiceCount: 3,
      resolutionMode: "reveal_batch_immediate",
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  });

  const roles = new Set((result.finalBlueprint?.modules || []).map((module) => module.role));
  const patternHints = new Set(
    (result.finalBlueprint?.patternHints || []).flatMap((hint) => hint.suggestedPatterns || []),
  );
  const backbone = result.finalBlueprint?.modules.find((module) => module.planningKind === "backbone");
  const backboneNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "gameplay_ability");
  const revealUiNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "reveal_surface");
  const facetRoles = new Set((result.finalBlueprint?.moduleFacets || []).map((facet) => facet.role));

  assert.equal(result.success, true);
  assert.equal(roles.has("gameplay_ability"), true);
  assert.equal(roles.has("reveal_surface"), true);
  assert.equal(backbone?.backboneKind, "gameplay_ability");
  assert.equal(roles.has("selection_flow"), false);
  assert.equal(roles.has("selection_modal"), false);
  assert.equal(patternHints.has("rule.selection_flow"), false);
  assert.equal(patternHints.has("ui.selection_modal"), false);
  assert.equal(result.finalBlueprint?.implementationStrategy, "exploratory");
  assert.equal(result.finalBlueprint?.maturity, "exploratory");
  assert.equal(result.finalBlueprint?.commitDecision?.outcome, "exploratory");
  assert.equal(result.finalBlueprint?.commitDecision?.requiresReview, true);
  assert.equal(backboneNeed?.backboneKind, "gameplay_ability");
  assert.equal(backboneNeed?.coLocatePreferred, true);
  assert.equal(backboneNeed?.category, "effect");
  assert.ok(facetRoles.has("input_trigger"));
  assert.ok(facetRoles.has("weighted_pool"));
  assert.ok(facetRoles.has("reveal_batch_runtime"));
  assert.ok(facetRoles.has("effect_application"));
  assert.deepEqual(revealUiNeed?.requiredCapabilities, ["ui.reveal.batch_surface"]);
  assert.equal(revealUiNeed?.category, "ui");
}

function runTests() {
  testReadyBuildProducesFinalBlueprint();
  testWeakBuildHonorsHonestStatus();
  testMustRequirementWithoutSemanticSupportStaysWeak();
  testFinalBlueprintCarriesCanonicalStateAndIntegrationSemantics();
  testSurfaceDetailDriftDoesNotChangeBlueprintPlanning();
  testBoundedDetailClarificationDoesNotBlockSupportedBlueprint();
  testBoundedDraftCatalogClarificationDoesNotBlockExistingSeamBlueprint();
  testSupportedCapabilitiesUseAdmittedVocabulary();
  testExplicitPatternHintsOnlyEmitSchemaConstrainedPatterns();
  testStandaloneStateAskHonestBlocksInsteadOfStayingWeak();
testGenericTimedRuleDoesNotInventSelectionUiModules();
testNegativeFunctionalConstraintsDoNotCreateUiModules();
testInlineNegativeConstraintClausesDoNotTriggerGovernanceBlocks();
testWizardStyleNegativeScopePhrasesDoNotTriggerGovernanceBlocks();
testSelectionLocalProgressionSliceStaysReady();
  testBroaderRewardProgressionFrameworkStaysBlocked();
  testSupportedLifecycleClarificationDoesNotBlockPersistentBuffFlow();
  testTimedSelfBuffSteersToShortDurationCapability();
  testTimedSelfBuffWithLocalCooldownStaysReady();
  testInitialDelaySchedulerAskBuildsTimingFacetBackbone();
  testPeriodicSchedulerAskBuildsIntervalFacetBackbone();
  testTimedNonSelfBuffKeepsGenericModifierCapability();
  testCooldownCoupledToSelectionFlowStaysBlocked();
  testNonSelfCooldownBuffBuildsBackboneWithSeparateTimingFacet();
  testForwardLinearProjectileSliceStaysReady();
  testHelperUnitSpawnChoreographyBuildsGameplayBackbone();
  testInventoryExtensionStaysOnExistingRuleAndUiModules();
  testSelectionPoolFeatureAuthoringFlowsThroughFinalBlueprint();
  testSelectionPoolBoundedFieldsStayInsideSameSkeleton();
  testSchemaOwnedImplementationCandidatesAreIgnored();
  testBlockedExternalCandidatesBlockBlueprintWithoutMutatingSchema();
  testContentModelEvidenceSurfacesInNormalizationNotes();
  testUpdateBlueprintKeepsWorkspaceContextGenericUntilAdapterLayer();
  testUpdateBlueprintDoesNotRebuildSelectionFromLegacyPatternIds();
  testUpdateBlueprintBlocksSourceBackedInvariantRemoval();
  testBoundedSourceBackedUpdateUsesAuthoritativeProjectionInsteadOfPreserveEchoModules();
  testSourceBackedUpdateKeepsBoundedChoiceCountWithoutExplicitDelta();
  testSelectionFamilyBlueprintDoesNotCollapseIntoGameplayBackbone();
  testSingleAbilityExploratoryPlanningBuildsGameplayBackbone();
  testSingleAbilityPlanningKeepsExplicitUiAsSeparateSurface();
  testRevealBatchImmediatePlanningStaysExploratoryAndAvoidsSelectionPoolModules();
  console.log("builder.test.ts: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };

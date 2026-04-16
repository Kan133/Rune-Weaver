import assert from "node:assert/strict";

import { buildBlueprint } from "./builder";
import { resolvePatterns } from "../patterns/resolver";
import type { IntentSchema } from "../schema/types";

function testAcceptanceInvariantsDoNotBlockAdmittedPatternResolution() {
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Open a weighted three-choice buff flow from a key press",
      goal: "Open a weighted three-choice buff flow from a key press",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Open a weighted three-choice buff flow", "Apply the chosen buff to self immediately"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture an explicit key press",
          parameters: { triggerKey: "X" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Choose one option from weighted candidates",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
        {
          id: "ui_req",
          kind: "ui",
          summary: "Show a modal choice surface",
          outputs: ["selection_modal"],
        },
        {
          id: "integration_req",
          kind: "integration",
          summary: "Synchronize the current selection state to the UI surface",
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
      targets: ["self"],
    },
    integrations: {
      expectedBindings: [
        { id: "input_binding", kind: "entry-point", summary: "Authoritative key trigger", required: true },
        { id: "ui_surface", kind: "ui-surface", summary: "Selection modal surface", required: true },
        { id: "state_sync", kind: "bridge-point", summary: "Sync current selection state", required: true },
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
      resourceConsumption: false,
    },
    acceptanceInvariants: [
      { id: "inv1", summary: "Only one option may be committed", severity: "error" },
    ],
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };

  const result = buildBlueprint(schema);

  assert.equal(result.success, true);
  assert.ok(result.finalBlueprint);

  const selectionNeed = result.finalBlueprint?.moduleNeeds.find((need) => need.semanticRole === "selection_flow");
  assert.ok(!selectionNeed?.invariants?.includes("Only one option may be committed"));

  const resolution = resolvePatterns(result.finalBlueprint!);
  assert.equal(resolution.unresolved.length, 0);
  assert.deepEqual(
    resolution.patterns.map((pattern) => pattern.patternId).sort(),
    [
      "data.weighted_pool",
      "dota2.short_time_buff",
      "input.key_binding",
      "integration.state_sync_bridge",
      "rule.selection_flow",
      "ui.selection_modal",
    ]
  );
}

function testResourceBlueprintResolvesToCurrentAdmittedResourcePath() {
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Create a keybound mana spend flow with a resource bar",
      goal: "Create a keybound mana spend flow with a resource bar",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Maintain a mana pool", "Consume 25 mana on key press", "Show a resource bar"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to trigger the resource spend",
          parameters: { triggerKey: "C" },
        },
        {
          id: "resource_req",
          kind: "resource",
          summary: "Maintain a numeric mana resource pool with max 100 initial 100 and no regen",
          parameters: { resourceId: "mana", maxValue: 100, initial: 100, regen: 0 },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Consume 25 mana and block when insufficient",
          parameters: { amount: 25, resourceType: "mana", failBehavior: "block" },
        },
        {
          id: "ui_req",
          kind: "ui",
          summary: "Show a resource bar surface",
          outputs: ["resource_bar"],
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    effects: {
      operations: ["consume"],
      durationSemantics: "instant",
    },
    uiRequirements: {
      needed: true,
      surfaces: ["resource_bar"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: false,
      resourceConsumption: true,
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };

  const result = buildBlueprint(schema);

  assert.equal(result.success, true);
  assert.ok(result.finalBlueprint);

  const needsByRole = new Map(
    (result.finalBlueprint?.moduleNeeds || []).map((need) => [need.semanticRole, need])
  );

  assert.deepEqual(needsByRole.get("resource_pool")?.requiredCapabilities, ["resource.pool.numeric"]);
  assert.deepEqual(needsByRole.get("effect_application")?.requiredCapabilities, ["effect.resource.consume"]);
  assert.deepEqual(needsByRole.get("resource_bar")?.requiredCapabilities, ["ui.resource.bar"]);
  assert.ok(needsByRole.get("resource_bar")?.integrationHints?.includes("resource.ui_surface"));

  const resolution = resolvePatterns(result.finalBlueprint!);
  assert.equal(resolution.unresolved.length, 0);
  assert.deepEqual(
    resolution.patterns.map((pattern) => pattern.patternId).sort(),
    [
      "effect.resource_consume",
      "input.key_binding",
      "resource.basic_pool",
      "ui.resource_bar",
    ]
  );
}

function testSchedulerTimerGapDoesNotMasqueradeAsReadySupport() {
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Open a three-choice window, resolve it after 5 seconds, then trigger the chosen effect every 1 second for 5 seconds.",
      goal: "Open a three-choice window, resolve it after 5 seconds, then trigger the chosen effect every 1 second for 5 seconds.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: [
        "Open a weighted three-choice selection flow",
        "Resolve the selection after a 5 second delay",
        "Apply the chosen effect every 1 second for 5 seconds",
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
          summary: "Apply the chosen buff after a delay and then periodically over time",
          parameters: { initialDelaySeconds: 5, tickSeconds: 1, durationSeconds: 5 },
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
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
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
      resourceConsumption: false,
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };

  const result = buildBlueprint(schema);

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("scheduler/timer family")
    )
  );
}

function testRewardProgressionGapDoesNotMasqueradeAsReadySupport() {
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Track reward progress after each completed selection round and level up after three rounds.",
      goal: "Track reward progress after each completed selection round and level up after three rounds.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
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
          summary: "Resolve one choice from weighted candidates",
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
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };

  const result = buildBlueprint(schema);

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("reward/progression family")
    )
  );
}

function testSpawnEmissionGapDoesNotCollapseIntoShortBuffSupport() {
  const schema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Press D to spawn a helper unit or projectile that follows the player and applies a short-time effect.",
      goal: "Press D to spawn a helper unit or projectile that follows the player and applies a short-time effect.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
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
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: true,
      resourceConsumption: false,
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };

  const result = buildBlueprint(schema);

  assert.equal(result.success, false);
  assert.equal(result.finalBlueprint?.status, "blocked");
  assert.ok(
    result.normalizationReport?.issues.some(
      (issue) =>
        issue.code === "FINAL_BLUEPRINT_SEMANTIC_BLOCKER" &&
        issue.message.includes("spawn/emission family")
    )
  );
}

function runTests() {
  testAcceptanceInvariantsDoNotBlockAdmittedPatternResolution();
  testResourceBlueprintResolvesToCurrentAdmittedResourcePath();
  testSchedulerTimerGapDoesNotMasqueradeAsReadySupport();
  testRewardProgressionGapDoesNotMasqueradeAsReadySupport();
  testSpawnEmissionGapDoesNotCollapseIntoShortBuffSupport();
  console.log("package6-current-seam.test.ts: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };

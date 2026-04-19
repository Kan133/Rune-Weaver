import assert from "node:assert/strict";

import {
  classifyRewardProgressionRisk,
  classifySchedulerTimerRisk,
  classifySpawnEmissionRisk,
  classifyStandaloneSessionStateRisk,
  detectForwardLinearProjectileReusableFit,
  detectLocalCooldownSchedulerReusableFit,
  detectSelectionLocalProgressionReusableFit,
} from "./seam-authority";
import type { IntentSchema } from "../schema/types";

function createCooldownSelfBuffSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Press Q to apply a short self buff with a 12 second cooldown.",
      goal: "Press Q to apply a short self buff with a 12 second cooldown.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
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
    normalizedMechanics: {
      trigger: true,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: true,
      resourceConsumption: false,
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    acceptanceInvariants: [],
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
}

function createSelectionLocalProgressionSchema(): IntentSchema {
  return {
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
    acceptanceInvariants: [],
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
}

function createForwardProjectileSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Press D to fire one forward linear projectile with fixed speed, distance, and radius.",
      goal: "Press D to fire one forward linear projectile with fixed speed, distance, and radius.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
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
    normalizedMechanics: {
      trigger: true,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: true,
      resourceConsumption: false,
    },
    acceptanceInvariants: [],
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
}

function createStandaloneStateSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Maintain a standalone shared session state store for this feature.",
      goal: "Maintain a standalone shared session state store for this feature.",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Maintain a standalone shared session state store"],
      typed: [
        {
          id: "state_req",
          kind: "state",
          summary: "Store standalone shared session state",
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    stateModel: {
      states: [
        { id: "generic_state", summary: "Current generic state", owner: "feature", lifetime: "session" },
      ],
    },
    normalizedMechanics: {
      trigger: false,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: false,
      resourceConsumption: false,
    },
    acceptanceInvariants: [],
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
}

function testSchedulerLocalCooldownSliceIsAdmitted() {
  const schema = createCooldownSelfBuffSchema();

  assert.equal(detectLocalCooldownSchedulerReusableFit(schema), true);
  assert.equal(classifySchedulerTimerRisk(schema), "reusable_fit");
}

function testDelayAndPostSelectionSchedulerSignalsRequireSynthesis() {
  const delayedSchema: IntentSchema = {
    ...createCooldownSelfBuffSchema(),
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
  };
  const postSelectionSchema: IntentSchema = {
    ...createCooldownSelfBuffSchema(),
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
      resourceConsumption: false,
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal"],
    },
  };

  assert.equal(detectLocalCooldownSchedulerReusableFit(delayedSchema), false);
  assert.equal(classifySchedulerTimerRisk(delayedSchema), "synthesis_required");
  assert.equal(detectLocalCooldownSchedulerReusableFit(postSelectionSchema), false);
  assert.equal(classifySchedulerTimerRisk(postSelectionSchema), "synthesis_required");
}

function testSelectionLocalProgressionAdmitsOnlyBoundedSlice() {
  const admittedSchema = createSelectionLocalProgressionSchema();
  const blockedSchema: IntentSchema = {
    ...createSelectionLocalProgressionSchema(),
    request: {
      rawPrompt: "Track reward progress across matches and grant a persistent inventory unlock after three rounds.",
      goal: "Track reward progress across matches and grant a persistent inventory unlock after three rounds.",
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
  };

  assert.equal(detectSelectionLocalProgressionReusableFit(admittedSchema), true);
  assert.equal(classifyRewardProgressionRisk(admittedSchema), "reusable_fit");
  assert.equal(detectSelectionLocalProgressionReusableFit(blockedSchema), false);
  assert.equal(classifyRewardProgressionRisk(blockedSchema), "governance_blocked");
}

function testForwardProjectileAdmissionStaysBounded() {
  const admittedSchema = createForwardProjectileSchema();
  const blockedSchema: IntentSchema = {
    ...createForwardProjectileSchema(),
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
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
  };

  assert.equal(detectForwardLinearProjectileReusableFit(admittedSchema), true);
  assert.equal(classifySpawnEmissionRisk(admittedSchema), "reusable_fit");
  assert.equal(detectForwardLinearProjectileReusableFit(blockedSchema), false);
  assert.equal(classifySpawnEmissionRisk(blockedSchema), "synthesis_required");
}

function testStandaloneStateGapRemainsExplicit() {
  const standaloneStateSchema = createStandaloneStateSchema();
  const progressionSchema = createSelectionLocalProgressionSchema();

  assert.equal(classifyStandaloneSessionStateRisk(standaloneStateSchema), "synthesis_required");
  assert.equal(classifyStandaloneSessionStateRisk(progressionSchema), "reusable_fit");
}

testSchedulerLocalCooldownSliceIsAdmitted();
testDelayAndPostSelectionSchedulerSignalsRequireSynthesis();
testSelectionLocalProgressionAdmitsOnlyBoundedSlice();
testForwardProjectileAdmissionStaysBounded();
testStandaloneStateGapRemainsExplicit();

console.log("core/blueprint/seam-authority.test.ts passed");

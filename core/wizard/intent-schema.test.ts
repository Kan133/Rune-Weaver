import assert from "node:assert/strict";

import { normalizeIntentSchema } from "./intent-schema";

const host = { kind: "dota2-x-template" as const };

function testNormalizeReadySchema() {
  const schema = normalizeIntentSchema(
    {
      version: "1.1",
      request: { goal: "Build a weighted draft flow" },
      classification: { intentKind: "standalone-system", confidence: "high" },
      readiness: "ready",
      actors: [{ id: "player", role: "triggering-actor", label: "Player" }],
      requirements: {
        functional: ["Open a draft flow"],
        typed: [
          {
            id: "req_selection",
            kind: "rule",
            summary: "Select one option from weighted candidates",
            invariants: ["exactly one option is committed"],
            parameters: { choiceCount: 1 },
            priority: "must",
          },
        ],
      },
      stateModel: {
        states: [{ id: "draft_state", summary: "Current draft choice", owner: "feature", lifetime: "session" }],
      },
      selection: {
        mode: "weighted",
        cardinality: "single",
        repeatability: "repeatable",
      },
      uncertainties: [{ id: "u1", summary: "Need final balance tuning", affects: ["intent"], severity: "low" }],
      requiredClarifications: [],
      openQuestions: [],
      resolvedAssumptions: ["Draft is session-scoped"],
      normalizedMechanics: {
        candidatePool: true,
        weightedSelection: true,
      },
      isReadyForBlueprint: true,
    },
    "Create a weighted draft system",
    host
  );

  assert.equal(schema.readiness, "ready");
  assert.equal(schema.isReadyForBlueprint, true);
  assert.equal(schema.requirements.typed?.[0]?.kind, "rule");
  assert.equal(schema.selection?.mode, "weighted");
  assert.equal(schema.stateModel?.states[0]?.owner, "feature");
}

function testNormalizeBlockedSchemaFromClarification() {
  const schema = normalizeIntentSchema(
    {
      request: { goal: "Build an unclear mechanic" },
      classification: { intentKind: "unknown" },
      requirements: {
        functional: ["Do something"],
      },
      normalizedMechanics: {},
      openQuestions: ["What triggers it?"],
      requiredClarifications: [
        { id: "c1", question: "What triggers it?", blocksFinalization: true },
      ],
      resolvedAssumptions: [],
      isReadyForBlueprint: false,
    },
    "Make something cool",
    host
  );

  assert.equal(schema.readiness, "blocked");
  assert.equal(schema.isReadyForBlueprint, false);
  assert.equal(schema.requiredClarifications?.[0]?.blocksFinalization, true);
}

function testNormalizeSupportedDetailClarificationAsReady() {
  const schema = normalizeIntentSchema(
    {
      request: { goal: "Build a three-choice buff system" },
      classification: { intentKind: "micro-feature", confidence: "high" },
      requirements: {
        functional: ["Open a three-choice buff UI", "Apply the chosen buff immediately"],
      },
      normalizedMechanics: {
        trigger: true,
        candidatePool: true,
        playerChoice: true,
        uiModal: true,
        outcomeApplication: true,
      },
      requiredClarifications: [
        {
          id: "c_buff_details",
          question: "请提供增益候选池的具体内容：每个增益的名称、属性加成数值、图标资源路径",
          blocksFinalization: true,
        },
      ],
      openQuestions: [
        "请提供增益候选池的具体内容：每个增益的名称、属性加成数值、图标资源路径",
      ],
      resolvedAssumptions: [],
      isReadyForBlueprint: false,
    },
    "做一个按 F4 打开的三选一增益系统",
    host
  );

  assert.equal(schema.readiness, "ready");
  assert.equal(schema.isReadyForBlueprint, true);
  assert.equal(schema.requiredClarifications?.[0]?.blocksFinalization, false);
}

function testNormalizeBoundedDetailClarificationWithoutTriChoicePromotionStillReady() {
  const schema = normalizeIntentSchema(
    {
      request: { goal: "Build a weighted draft flow" },
      classification: { intentKind: "standalone-system", confidence: "high" },
      readiness: "ready",
      requirements: {
        functional: ["Open a weighted draft flow"],
        typed: [
          {
            id: "req_rule",
            kind: "rule",
            summary: "Select one weighted option",
          },
        ],
      },
      selection: {
        mode: "weighted",
        cardinality: "single",
      },
      normalizedMechanics: {
        candidatePool: true,
        weightedSelection: true,
        uiModal: true,
      },
      requiredClarifications: [
        {
          id: "c_weights",
          question: "请提供候选池的具体数值和图标资源路径",
          blocksFinalization: true,
        },
      ],
      openQuestions: ["请提供候选池的具体数值和图标资源路径"],
      resolvedAssumptions: [],
      isReadyForBlueprint: false,
    },
    "Build a weighted draft flow",
    host
  );

  assert.equal(schema.readiness, "ready");
  assert.equal(schema.isReadyForBlueprint, true);
}

function testReadyFlagWithoutSemanticMinimumDoesNotOverPromote() {
  const schema = normalizeIntentSchema(
    {
      request: { goal: "Do something unspecified" },
      classification: { intentKind: "unknown" },
      readiness: "ready",
      requirements: {
        functional: [],
      },
      normalizedMechanics: {},
      requiredClarifications: [],
      openQuestions: [],
      resolvedAssumptions: [],
      isReadyForBlueprint: true,
    },
    "Do something unspecified",
    host
  );

  assert.equal(schema.readiness, "blocked");
  assert.equal(schema.isReadyForBlueprint, false);
}

function testNormalizeSelectionInventoryContract() {
  const schema = normalizeIntentSchema(
    {
      request: { goal: "Extend talent draw with persistent inventory panel" },
      classification: { intentKind: "standalone-system", confidence: "high" },
      requirements: {
        functional: ["Store confirmed talents in a 15-slot inventory panel"],
      },
      selection: {
        mode: "user-chosen",
        cardinality: "single",
        repeatability: "repeatable",
        duplicatePolicy: "forbid",
        inventory: {
          enabled: true,
          capacity: 15.9,
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
      requiredClarifications: [],
      openQuestions: [],
      resolvedAssumptions: [],
      isReadyForBlueprint: true,
    },
    "Extend talent draw with inventory",
    host
  );

  assert.deepEqual(schema.selection?.inventory, {
    enabled: true,
    capacity: 15,
    storeSelectedItems: true,
    blockDrawWhenFull: true,
    fullMessage: "Talent inventory full",
    presentation: "persistent_panel",
  });
  assert.equal(schema.readiness, "ready");
}

function runTests() {
  testNormalizeReadySchema();
  testNormalizeBlockedSchemaFromClarification();
  testNormalizeSupportedDetailClarificationAsReady();
  testNormalizeBoundedDetailClarificationWithoutTriChoicePromotionStillReady();
  testReadyFlagWithoutSemanticMinimumDoesNotOverPromote();
  testNormalizeSelectionInventoryContract();
  console.log("intent-schema.test.ts: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };

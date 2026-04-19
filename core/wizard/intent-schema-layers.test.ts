import assert from "node:assert/strict";

import {
  analyzeIntentSemanticLayers,
  createFallbackIntentSchema,
  extractIntentSchemaGovernanceDecisions,
  extractIntentSchemaGovernanceCore,
  normalizeIntentSchema,
  stableIntentGovernanceDecisionFingerprint,
} from "./intent-schema.js";

const host = { kind: "dota2-x-template" as const };

function testRawFactsStayStableForSamePrompt() {
  const prompt = "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离。";
  const schema = createFallbackIntentSchema(prompt, host);

  const left = analyzeIntentSemanticLayers(schema, prompt, host);
  const right = analyzeIntentSemanticLayers(schema, prompt, host);

  assert.deepEqual(left.rawFacts, right.rawFacts);
  assert.equal(findFactValue(left.rawFacts, "prompt.constraint.no_ui"), true);
  assert.equal(findFactValue(left.rawFacts, "prompt.constraint.no_inventory"), true);
  assert.equal(findFactValue(left.rawFacts, "prompt.constraint.no_persistence"), true);
  assert.equal(findFactValue(left.rawFacts, "prompt.interaction.trigger_key"), "Q");
  assert.equal(findFactValue(left.rawFacts, "prompt.spatial.distance"), 400);
}

function testParaphraseGovernanceDecisionsStayAlignedForCandidateDraw() {
  const prompts = [
    "按F4打开天赋选择界面，从稀有度加权天赋池抽3个候选，玩家选1个立即生效，已选项后续不再参与抽取，未选项回池。",
    "做一个F4触发的三选一天赋抽取系统，候选来自稀有度权重池，选择后立即应用效果，已选从后续候选资格中移除，未选回到池中。",
    "Press F4 to open a local weighted candidate selection UI, draw 3 rarity-weighted options, let the player choose 1, apply it immediately, remove the selected option from future draws, and return unchosen options to the pool.",
  ];

  const analyses = prompts.map((prompt) => {
    const schema = createFallbackIntentSchema(prompt, host);
    return analyzeIntentSemanticLayers(schema, prompt, host);
  });

  for (const analysis of analyses) {
    assert.equal(analysis.governanceDecisions.intentKind.value, "standalone-system");
    assert.deepEqual(analysis.governanceDecisions.canonicalizationEligible.value, [
      "candidate_draw_governance_core",
    ]);
    assert.equal(analysis.governanceDecisions.normalizedMechanics.value.candidatePool, true);
    assert.equal(analysis.governanceDecisions.normalizedMechanics.value.playerChoice, true);
    assert.equal(analysis.governanceDecisions.normalizedMechanics.value.uiModal, true);
  }
}

function testExplicitPersistenceStaysGovernanceVisible() {
  const prompt =
    "Press F4 to draw 3 weighted candidates, choose 1, save the selected result across matches, and sync it with an external progression system.";
  const schema = createFallbackIntentSchema(prompt, host);
  const analysis = analyzeIntentSemanticLayers(schema, prompt, host);

  assert.equal(analysis.governanceDecisions.crossSystemComposition.value, true);
  assert.deepEqual(analysis.governanceDecisions.canonicalizationEligible.value, []);
}

function testDashPromptDoesNotAccidentallyEnterCandidateDrawDecision() {
  const prompt = "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离。";
  const schema = createFallbackIntentSchema(prompt, host);
  const analysis = analyzeIntentSemanticLayers(schema, prompt, host);

  assert.deepEqual(analysis.governanceDecisions.canonicalizationEligible.value, []);
  assert.equal(analysis.governanceDecisions.normalizedMechanics.value.candidatePool, false);
}

function testOpenSemanticResidueSeparatesBoundedDetailsFromGovernanceRisk() {
  const prompt =
    "Press F4 to open a local weighted candidate selection UI, draw 3 rarity-weighted options, let the player choose 1, apply it immediately, remove the selected option from future draws, and return unchosen options to the pool.";
  const analysis = analyzeIntentSemanticLayers(
    {
      requirements: {
        functional: ["Run a local weighted candidate draw."],
      },
      constraints: {},
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
      },
      uiRequirements: {
        needed: true,
        surfaces: ["selection_modal", "rarity_cards"],
      },
      uncertainties: [
        {
          id: "unc_catalog",
          summary: "Please provide the exact candidate catalog and icon list.",
          affects: ["intent"],
          severity: "medium",
        },
        {
          id: "unc_owner",
          summary: "Persistence owner is unclear.",
          affects: ["intent", "blueprint"],
          severity: "high",
        },
      ],
      resolvedAssumptions: ["Selection remains feature-owned and session-local."],
    },
    prompt,
    host,
  );

  const catalogResidue = analysis.openSemanticResidue.find((item) => item.id === "unc_catalog");
  const ownerResidue = analysis.openSemanticResidue.find((item) => item.id === "unc_owner");
  const assumptionResidue = analysis.openSemanticResidue.find((item) =>
    item.summary.includes("feature-owned and session-local"),
  );

  assert.equal(catalogResidue?.class, "bounded_detail_only");
  assert.equal(ownerResidue?.class, "governance_relevant");
  assert.equal(assumptionResidue?.disposition, "assumed");
}

function testFallbackAndStructuredPathShareGovernanceCore() {
  const prompt =
    "Press F4 to open a local weighted candidate selection UI, draw 3 rarity-weighted options, let the player choose 1, apply it immediately, remove the selected option from future draws, and return unchosen options to the pool.";
  const fallbackSchema = createFallbackIntentSchema(prompt, host);
  const structuredSchema = normalizeIntentSchema(
    {
      request: { goal: prompt },
      requirements: {
        functional: ["Run a local weighted candidate draw."],
      },
      constraints: {},
      interaction: {
        activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
        commitment: "immediate",
      },
      uiRequirements: {
        needed: true,
        surfaces: ["selection_modal", "rarity_cards"],
      },
      resolvedAssumptions: [],
    },
    prompt,
    host,
  );

  assert.deepEqual(
    extractIntentSchemaGovernanceCore(fallbackSchema),
    extractIntentSchemaGovernanceCore(structuredSchema),
  );
}

function testDecisionProjectionIgnoresSchemaSurfaceNoise() {
  const prompt =
    "Press F4 to open a local weighted candidate selection UI, draw 3 rarity-weighted options, let the player choose 1, apply it immediately, remove the selected option from future draws, and return unchosen options to the pool.";
  const left = normalizeIntentSchema(
    {
      request: { goal: prompt },
      requirements: { functional: ["Run a local weighted candidate draw."] },
      constraints: {},
      interaction: {
        activations: [{ actor: "player", kind: "key", input: "F4", phase: "press", repeatability: "repeatable", confirmation: "implicit" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
        commitment: "immediate",
      },
      uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
      stateModel: {
        states: [{ id: "left_state", summary: "left summary", owner: "feature", lifetime: "session", kind: "collection", mutationMode: "update" }],
      },
      contentModel: {
        collections: [{ id: "left_collection", role: "candidate-options", ownership: "feature", updateMode: "replace", itemSchema: [{ name: "choice_id", type: "string", required: true, semanticRole: "stable-option-id" }] }],
      },
      resolvedAssumptions: [],
    },
    prompt,
    host,
  );
  const right = normalizeIntentSchema(
    {
      request: { goal: prompt },
      requirements: { functional: ["Run a local weighted candidate draw."] },
      constraints: {},
      interaction: {
        activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
        commitment: "immediate",
      },
      uiRequirements: { needed: true, surfaces: ["rarity_cards", "selection_modal"] },
      stateModel: {
        states: [{ id: "right_state", summary: "right summary", owner: "feature", lifetime: "session", kind: "collection", mutationMode: "update" }],
      },
      contentModel: {
        collections: [{ id: "right_collection", role: "candidate-options", ownership: "feature", updateMode: "replace", itemSchema: [{ name: "another_name", type: "string", required: true, semanticRole: "stable-option-id" }] }],
      },
      resolvedAssumptions: [],
    },
    prompt,
    host,
  );

  assert.deepEqual(
    extractIntentSchemaGovernanceDecisions(left),
    extractIntentSchemaGovernanceDecisions(right),
  );
}

async function testWordSwapClusterSharesDecisionFingerprint() {
  const prompts = [
    "实现一个天赋抽取系统：按F4打开天赋选择界面，从天赋池中随机抽取3个天赋供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。天赋有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。",
    "实现一个祝福抽取系统：按F4打开祝福选择界面，从祝福池中随机抽取3个祝福供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。祝福有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。",
    "实现一个奖励抽取系统：按F4打开奖励选择界面，从奖励池中随机抽取3个奖励供玩家选择，玩家选择一个后应用效果并永久移除，未选中的返回池中。奖励有稀有度（R/SR/SSR/UR），稀有度影响抽取权重和视觉效果。",
  ];

  const fingerprints = prompts.map((prompt) =>
    stableIntentGovernanceDecisionFingerprint(
      extractIntentSchemaGovernanceDecisions(createFallbackIntentSchema(prompt, host)),
    ),
  );

  assert.equal(new Set(fingerprints).size, 1);
}

async function runTests() {
  testRawFactsStayStableForSamePrompt();
  testParaphraseGovernanceDecisionsStayAlignedForCandidateDraw();
  testExplicitPersistenceStaysGovernanceVisible();
  testDashPromptDoesNotAccidentallyEnterCandidateDrawDecision();
  testOpenSemanticResidueSeparatesBoundedDetailsFromGovernanceRisk();
  testFallbackAndStructuredPathShareGovernanceCore();
  testDecisionProjectionIgnoresSchemaSurfaceNoise();
  await testWordSwapClusterSharesDecisionFingerprint();
  console.log("intent-schema-layers.test.ts: PASS");
}

function findFactValue(rawFacts: ReturnType<typeof analyzeIntentSemanticLayers>["rawFacts"], code: string) {
  return rawFacts.find((fact) => fact.code === code)?.value;
}

await runTests();

export { runTests };

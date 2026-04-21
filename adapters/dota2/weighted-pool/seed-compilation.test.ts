import assert from "node:assert/strict";

import { applyGenericWeightedPoolProjection } from "./seed-compilation.js";

function testProjectsGenericWeightedPoolRuntimeParameters(): void {
  const blueprint = {
    id: "rarity_draw_demo",
    version: "1.0",
    summary: "Weighted selection demo",
    sourceIntent: { intentKind: "standalone-system", goal: "Weighted selection demo" },
    modules: [
      {
        id: "trigger_mod",
        role: "input_trigger",
        category: "trigger",
        patternIds: ["input.key_binding"],
      },
      {
        id: "resource_mod",
        role: "resource_pool",
        category: "resource",
        patternIds: [],
        parameters: {
          rarities: ["R", "SR", "SSR", "UR"],
        },
      },
      {
        id: "pool_mod",
        role: "weighted_pool",
        category: "data",
        patternIds: ["data.weighted_pool"],
      },
      {
        id: "flow_mod",
        role: "selection_flow",
        category: "rule",
        patternIds: ["rule.selection_flow"],
      },
      {
        id: "ui_mod",
        role: "selection_modal",
        category: "ui",
        patternIds: ["ui.selection_modal"],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: true,
    status: "ready",
    designDraft: {
      retrievedFamilyCandidates: [],
      retrievedPatternCandidates: [],
      reuseConfidence: "medium",
      chosenImplementationStrategy: "family",
      artifactTargets: ["server", "shared", "ui"],
      notes: [],
    },
  } as any;

  const schema = {
    version: "1.0",
    request: {
      rawPrompt: "Press F4 to draw 3 rarity-weighted rewards and apply the chosen one to the hero.",
      goal: "Weighted reward draw",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    interaction: {
      activations: [{ kind: "key", input: "F4" }],
    },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      choiceCount: 3,
      duplicatePolicy: "avoid",
      commitment: "immediate",
    },
    effects: {
      operations: ["apply"],
    },
    stateModel: {
      states: [
        {
          id: "candidate_pool",
          owner: "feature",
          lifetime: "session",
        },
      ],
    },
    contentModel: {
      collections: [
        {
          id: "reward_pool",
          role: "candidate-options",
          ownership: "feature",
          itemSchema: [
            { name: "id", type: "string", semanticRole: "candidate identifier" },
            { name: "rarity", type: "enum", semanticRole: "rarity tier" },
            { name: "effect", type: "effect-ref", semanticRole: "selected-outcome" },
          ],
        },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal", "rarity_cards"],
    },
    normalizedMechanics: {
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
  } as any;

  const projected = applyGenericWeightedPoolProjection(blueprint, schema, {
    prompt: schema.request.rawPrompt,
    includeEntries: true,
  });

  const triggerModule = projected.modules.find((module: any) => module.role === "input_trigger");
  const weightedPoolModule = projected.modules.find((module: any) => module.role === "weighted_pool");
  const selectionFlowModule = projected.modules.find((module: any) => module.role === "selection_flow");
  const selectionModalModule = projected.modules.find((module: any) => module.role === "selection_modal");

  assert.equal(triggerModule?.parameters?.triggerKey, "F4");
  assert.equal(weightedPoolModule?.parameters?.choiceCount, 3);
  assert.equal(weightedPoolModule?.parameters?.drawMode, "multiple_without_replacement");
  assert.equal(weightedPoolModule?.parameters?.duplicatePolicy, "avoid_when_possible");
  assert.equal(weightedPoolModule?.parameters?.poolStateTracking, "session");
  assert.equal(weightedPoolModule?.parameters?.entries?.length, 6);
  assert.equal(selectionFlowModule?.parameters?.choiceCount, 3);
  assert.equal(selectionFlowModule?.parameters?.effectApplication?.enabled, true);
  assert.equal(selectionModalModule?.parameters?.minDisplayCount, 3);
  assert.equal(projected.designDraft?.notes?.includes(
    "Projected generic weighted-pool runtime parameters from feature-owned candidate pool semantics.",
  ), true);
}

function testKeepsExplicitWeightedPoolEntriesAndChoiceCount(): void {
  const blueprint = {
    id: "existing_seed_demo",
    version: "1.0",
    summary: "Existing weighted pool demo",
    sourceIntent: { intentKind: "standalone-system", goal: "Existing weighted pool demo" },
    modules: [
      {
        id: "pool_mod",
        role: "weighted_pool",
        category: "data",
        patternIds: ["data.weighted_pool"],
        parameters: {
          choiceCount: 5,
          entries: [
            {
              id: "CUSTOM_001",
              label: "Custom 001",
              description: "Already seeded",
              weight: 100,
            },
          ],
        },
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: true,
    status: "ready",
  } as any;

  const schema = {
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceCount: 3,
    },
    contentModel: {
      collections: [
        {
          id: "reward_pool",
          role: "candidate-options",
          ownership: "feature",
        },
      ],
    },
    normalizedMechanics: {
      candidatePool: true,
      weightedSelection: true,
    },
  } as any;

  const projected = applyGenericWeightedPoolProjection(blueprint, schema, {
    prompt: "Create a weighted reward draw.",
    includeEntries: true,
  });
  const weightedPoolModule = projected.modules[0];

  assert.equal(weightedPoolModule.parameters.choiceCount, 5);
  assert.equal(weightedPoolModule.parameters.entries.length, 1);
  assert.equal(weightedPoolModule.parameters.entries[0].id, "CUSTOM_001");
}

function runTests(): void {
  testProjectsGenericWeightedPoolRuntimeParameters();
  testKeepsExplicitWeightedPoolEntriesAndChoiceCount();
  console.log("adapters/dota2/weighted-pool/seed-compilation.test.ts: PASS");
}

runTests();

import assert from "node:assert/strict";

import type { IntentSchema } from "../schema/types.js";
import {
  buildWizardMessages,
  createFallbackIntentSchema,
  extractIntentSchemaGovernanceDecisions,
  stableIntentGovernanceDecisionFingerprint,
  stableIntentSchemaGovernanceFingerprint,
  normalizeIntentSchema,
  runWizardToIntentSchema,
} from "./intent-schema.js";

const host = { kind: "dota2-x-template" as const };

function testNormalizeIntentSchemaStaysSemanticOnly() {
  const schema = normalizeIntentSchema(
    {
      request: { goal: "Press F4 to draw 3 weighted candidates and pick 1." },
      classification: { intentKind: "micro-feature", confidence: "high" },
      requirements: {
        functional: ["Press F4 to draw 3 weighted candidates and pick 1."],
        typed: [
          {
            id: "req_draw",
            kind: "rule",
            summary: "Resolve a three-choice weighted draw.",
          },
        ],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
      },
      constraints: {
        requiredPatterns: ["weighted pool modal"],
        forbiddenPatterns: ["new family invention"],
        hostConstraints: ["Dota2 only"],
      },
      requiredClarifications: [
        {
          id: "legacy_catalog",
          question: "Please provide the exact candidate catalog.",
          blocksFinalization: true,
        },
      ],
      openQuestions: ["Please provide the exact candidate catalog."],
      resolvedAssumptions: [],
    },
    "Press F4 to draw 3 weighted candidates and pick 1.",
    host,
  );

  assert.equal(schema.selection?.choiceCount, 3);
  assert.equal(schema.selection?.cardinality, "single");
  assert.equal(schema.readiness, undefined);
  assert.equal(schema.isReadyForBlueprint, undefined);
  assert.equal(schema.requiredClarifications, undefined);
  assert.equal(schema.openQuestions, undefined);
  assert.equal(schema.constraints.requiredPatterns, undefined);
  assert.equal(schema.constraints.forbiddenPatterns, undefined);
  assert.deepEqual(schema.constraints.hostConstraints, ["Dota2 only"]);
}

function testBuildWizardMessagesExplicitlyBanImplementationAuthority() {
  const systemMessage = buildWizardMessages(
    "Create a skill that moves the player 400 units toward the cursor when G is pressed.",
    host,
  )[0]?.content || "";

  assert.match(systemMessage, /Always return a best-effort semantic IntentSchema/i);
  assert.match(systemMessage, /Do not judge implementation readiness/i);
  assert.match(systemMessage, /Do not output readiness, blocked, weak/i);
  assert.match(systemMessage, /Do not infer or name implementation families/i);
  assert.match(systemMessage, /same-feature eligibility mutation unless the user explicitly asks for persistence/i);
}

function testCreateFallbackIntentSchemaPreservesDashFacts() {
  const schema = createFallbackIntentSchema(
    "Create a skill that moves the player 400 units toward the cursor when G is pressed.",
    host,
  );

  assert.equal(schema.classification.intentKind, "micro-feature");
  assert.equal(schema.interaction?.activations?.[0]?.input, "G");
  assert.equal(schema.spatial?.motion?.distance, 400);
  assert.equal(schema.spatial?.motion?.direction, "cursor");
  assert.deepEqual(schema.outcomes?.operations, ["move"]);
  assert.equal(schema.selection, undefined);
}

function testCreateFallbackIntentSchemaPreservesWeightedDrawFacts() {
  const schema = createFallbackIntentSchema(
    "Press F4 to draw 3 weighted candidates from a pool, show rarity on cards, let the player pick 1, and apply the chosen result immediately.",
    host,
  );

  assert.equal(schema.interaction?.activations?.[0]?.input, "F4");
  assert.equal(schema.selection?.source, "weighted-pool");
  assert.equal(schema.selection?.choiceCount, 3);
  assert.equal(schema.selection?.cardinality, "single");
  assert.equal(schema.uiRequirements?.needed, true);
  assert.equal(schema.contentModel?.collections?.[0]?.role, "candidate-options");
}

function testCreateFallbackIntentSchemaHonorsNegativeUiAndPersistenceConstraints() {
  const schema = createFallbackIntentSchema(
    "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离。",
    host,
  );

  assert.equal(schema.interaction?.activations?.[0]?.input, "Q");
  assert.equal(schema.uiRequirements, undefined);
  assert.equal(schema.selection?.inventory, undefined);
  assert.equal(schema.timing?.duration?.kind, undefined);
  assert.equal(schema.composition?.dependencies, undefined);
  assert.equal(Boolean(schema.stateModel?.states?.some((state) => state.lifetime === "persistent")), false);
}

function testNormalizeIntentSchemaDoesNotInventInventoryDetails() {
  const schema = normalizeIntentSchema(
    {
      request: {
        goal: "Add a persistent inventory panel and store each confirmed selection.",
      },
      classification: {
        intentKind: "standalone-system",
        confidence: "high",
      },
      requirements: {
        functional: ["Add a persistent inventory panel and store each confirmed selection."],
      },
      selection: {
        inventory: {
          enabled: true,
          capacity: 1,
          storeSelectedItems: true,
          blockDrawWhenFull: false,
          fullMessage: "Inventory full",
          presentation: "persistent_panel",
        },
      },
      resolvedAssumptions: [],
    },
    "给 talent_draw_demo 增加一个常驻库存界面，玩家每次确认后都放进去",
    host,
  );

  assert.equal(schema.selection?.inventory?.enabled, true);
  assert.equal(schema.selection?.inventory?.capacity, undefined);
  assert.equal(schema.selection?.inventory?.fullMessage, undefined);
  assert.equal(schema.selection?.inventory?.storeSelectedItems, true);
}

function testNormalizeIntentSchemaDropsSelectionShellWhenPromptHasNoSelectionSemantics() {
  const schema = normalizeIntentSchema(
    {
      request: {
        goal: "Create a dash ability with no UI or persistence.",
      },
      classification: {
        intentKind: "micro-feature",
        confidence: "high",
      },
      requirements: {
        functional: ["Dash 400 units toward the cursor on Q."],
      },
      selection: {
        mode: "deterministic",
        source: "none",
        choiceMode: "none",
        cardinality: "single",
      },
      resolvedAssumptions: [],
    },
    "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离。",
    host,
  );

  assert.equal(schema.selection, undefined);
}

function testNormalizeIntentSchemaCanonicalizesCandidateDrawGovernanceCore() {
  const prompt =
    "Press F4 to open a talent selection UI, draw 3 rarity-weighted talents from a pool, let the player choose 1, apply it immediately, permanently remove the selected talent from future draws, and return unchosen talents to the pool.";
  const stable = normalizeIntentSchema(
    {
      request: { goal: prompt },
      classification: { intentKind: "standalone-system", confidence: "high" },
      requirements: {
        functional: ["Run a local weighted talent draw."],
      },
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
      uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
      stateModel: {
        states: [{ id: "candidate_pool", summary: "Track pool state.", owner: "feature", lifetime: "session", kind: "collection", mutationMode: "update" }],
      },
      outcomes: { operations: ["apply-effect", "update-state"] },
      resolvedAssumptions: [],
    },
    prompt,
    host,
  );

  const drifted = normalizeIntentSchema(
    {
      request: { goal: prompt },
      classification: { intentKind: "standalone-system", confidence: "high" },
      requirements: {
        functional: ["Persist the unlocked result forever after selection."],
        typed: [{ id: "persist", kind: "state", summary: "Persist unlock state externally." }],
      },
      interaction: {
        activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
        repeatability: "persistent",
        duplicatePolicy: "forbid",
        commitment: "immediate",
      },
      uiRequirements: { needed: true, surfaces: ["cards", "modal"] },
      stateModel: {
        states: [{ id: "persistent_unlock", summary: "Persist unlock state.", owner: "external", lifetime: "persistent", kind: "generic", mutationMode: "update" }],
      },
      timing: {
        duration: { kind: "persistent" },
      },
      effects: {
        operations: ["apply"],
        durationSemantics: "persistent",
      },
      outcomes: { operations: ["grant-feature", "update-state"] },
      composition: {
        dependencies: [{ kind: "external-system", relation: "writes", required: true }],
      },
      uncertainties: [
        {
          id: "unc_persist",
          summary: "Persistence owner is unclear.",
          affects: ["intent", "blueprint"],
          severity: "high",
        },
      ],
      resolvedAssumptions: ["Persist the unlocked result."],
    },
    prompt,
    host,
  );

  assert.equal(stableIntentSchemaGovernanceFingerprint(stable), stableIntentSchemaGovernanceFingerprint(drifted));
  assert.equal(drifted.selection?.source, "weighted-pool");
  assert.equal(drifted.selection?.choiceCount, 3);
  assert.equal(drifted.selection?.duplicatePolicy, "forbid");
  assert.equal(drifted.uiRequirements?.needed, true);
  assert.equal(drifted.timing?.duration?.kind, undefined);
  assert.equal(drifted.effects?.durationSemantics, undefined);
  assert.equal(drifted.composition, undefined);
  assert.equal(Boolean(drifted.stateModel?.states.some((state) => state.lifetime === "persistent" || state.owner === "external")), false);
}

function testNormalizeIntentSchemaKeepsExplicitPersistenceWhenRequested() {
  const prompt =
    "Press F4 to draw 3 rarity-weighted talents, let the player choose 1, apply it immediately, remove it from future draws, and save the unlocked result across matches in external profile storage.";
  const schema = normalizeIntentSchema(
    {
      request: { goal: prompt },
      classification: { intentKind: "cross-system-composition", confidence: "high" },
      requirements: {
        functional: ["Persist unlocked talents across matches."],
      },
      interaction: {
        activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
      },
      timing: {
        duration: { kind: "persistent" },
      },
      stateModel: {
        states: [{ id: "persistent_unlock", summary: "Persist unlock state.", owner: "external", lifetime: "persistent", kind: "generic", mutationMode: "update" }],
      },
      composition: {
        dependencies: [{ kind: "external-system", relation: "writes", required: true }],
      },
      resolvedAssumptions: [],
    },
    prompt,
    host,
  );

  assert.equal(schema.timing?.duration?.kind, "persistent");
  assert.equal(Boolean(schema.stateModel?.states.some((state) => state.lifetime === "persistent")), true);
  assert.equal(Boolean(schema.composition?.dependencies?.some((dependency) => dependency.kind === "external-system")), true);
}

function testGovernanceDecisionFingerprintIgnoresNonGovernanceActivationNoise() {
  const prompt = "Press F4 to draw 3 weighted candidates and pick 1.";
  const left = normalizeIntentSchema(
    {
      request: { goal: prompt },
      requirements: { functional: ["Run a local weighted draw."] },
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
      uiRequirements: { needed: true, surfaces: ["selection_modal"] },
      resolvedAssumptions: [],
    },
    prompt,
    host,
  );
  const right = normalizeIntentSchema(
    {
      request: { goal: prompt },
      requirements: { functional: ["Run a local weighted draw."] },
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
      uiRequirements: { needed: true, surfaces: ["selection_modal"] },
      resolvedAssumptions: [],
    },
    prompt,
    host,
  );

  assert.deepEqual(
    extractIntentSchemaGovernanceDecisions(left).activationContract.value,
    extractIntentSchemaGovernanceDecisions(right).activationContract.value,
  );
  assert.equal(
    stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(left)),
    stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(right)),
  );
}

function testNormalizeIntentSchemaParaphraseGovernanceCoreConsistency() {
  const prompts = [
    "Press F4 to open a talent selection UI, draw 3 rarity-weighted talents from a pool, let the player choose 1, apply it immediately, permanently remove the selected talent from future draws, and return unchosen talents to the pool.",
    "Press F4 to draw 3 rarity-weighted candidates on cards, let the player pick 1 for immediate effect, remove the selected candidate from future eligibility, and put unchosen ones back into the pool.",
    "Build an F4 three-choice talent draft from a rarity-weighted pool; selecting one applies it now, removes it from later draws, and returns the others to the pool.",
  ];

  const fingerprints = prompts.map((prompt, index) =>
    stableIntentSchemaGovernanceFingerprint(
      normalizeIntentSchema(
        {
          request: { goal: prompt },
          classification: { intentKind: index === 0 ? "standalone-system" : "micro-feature", confidence: "high" },
          requirements: { functional: ["Resolve the requested weighted candidate draw."] },
          interaction: {
            activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
          },
          selection: {
            mode: index === 2 ? "user-chosen" : "weighted",
            source: "weighted-pool",
            choiceMode: "user-chosen",
            choiceCount: 3,
            cardinality: "single",
            commitment: "immediate",
          },
          uiRequirements: { needed: true, surfaces: index === 1 ? ["cards"] : ["selection_modal"] },
          stateModel: index === 1
            ? {
                states: [{ id: "candidate_pool", summary: "Track pool state.", owner: "external", lifetime: "persistent", kind: "generic", mutationMode: "update" }],
              }
            : undefined,
          outcomes: { operations: ["apply-effect"] },
          composition: index === 1
            ? { dependencies: [{ kind: "external-system", relation: "writes", required: true }] }
            : undefined,
          resolvedAssumptions: [],
        },
        prompt,
        host,
      ),
    ),
  );

  assert.equal(new Set(fingerprints).size, 1);
}

async function testRunWizardToIntentSchemaFallsBackOnProviderFailure() {
  const result = await runWizardToIntentSchema({
    client: {
      async generateObject() {
        throw new Error("provider offline");
      },
    },
    input: {
      rawText: "Create a passive aura that gives nearby allies bonus armor.",
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.schema.classification.intentKind, "micro-feature");
  assert.equal(result.schema.interaction?.activations?.[0]?.kind, "passive");
  assert.ok(result.issues.some((issue) => issue.code === "WIZARD_GENERIC_FALLBACK"));
}

async function testRunWizardToIntentSchemaProducesClarificationSidecar() {
  const schemaObject: Partial<IntentSchema> = {
    request: {
      goal: "After drawing one option, grant another feature and persist it across matches.",
    },
    classification: {
      intentKind: "cross-system-composition",
      confidence: "high",
    },
    requirements: {
      functional: ["After drawing one option, grant another feature and persist it across matches."],
    },
    outcomes: {
      operations: ["grant-feature", "update-state"],
    },
    timing: {
      duration: { kind: "persistent" },
    },
    composition: {
      dependencies: [
        { kind: "cross-feature", relation: "grants", required: true },
        { kind: "external-system", relation: "writes", required: true },
      ],
    },
    resolvedAssumptions: [],
  };

  const result = await runWizardToIntentSchema({
    client: {
      async generateObject() {
        return { object: schemaObject, raw: schemaObject };
      },
    },
    input: {
      rawText: "After drawing one option, grant another feature and persist it across matches.",
    },
  });

  assert.equal(result.schema.readiness, undefined);
  assert.ok((result.clarificationPlan?.questions.length || 0) >= 2);
  assert.ok(result.clarificationPlan?.questions.some((question) => question.id === "clarify-cross-feature-target"));
  assert.ok(result.clarificationPlan?.questions.some((question) => question.id === "clarify-persistence-scope"));
}

async function runTests() {
  testNormalizeIntentSchemaStaysSemanticOnly();
  testBuildWizardMessagesExplicitlyBanImplementationAuthority();
  testCreateFallbackIntentSchemaPreservesDashFacts();
  testCreateFallbackIntentSchemaPreservesWeightedDrawFacts();
  testCreateFallbackIntentSchemaHonorsNegativeUiAndPersistenceConstraints();
  testNormalizeIntentSchemaDoesNotInventInventoryDetails();
  testNormalizeIntentSchemaDropsSelectionShellWhenPromptHasNoSelectionSemantics();
  testNormalizeIntentSchemaCanonicalizesCandidateDrawGovernanceCore();
  testNormalizeIntentSchemaKeepsExplicitPersistenceWhenRequested();
  testGovernanceDecisionFingerprintIgnoresNonGovernanceActivationNoise();
  testNormalizeIntentSchemaParaphraseGovernanceCoreConsistency();
  await testRunWizardToIntentSchemaFallsBackOnProviderFailure();
  await testRunWizardToIntentSchemaProducesClarificationSidecar();
  console.log("core/wizard/intent-schema.test.ts passed");
}

runTests();

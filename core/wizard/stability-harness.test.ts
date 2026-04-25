import assert from "node:assert/strict";

import type { IntentSchema, ValidationIssue, WizardClarificationPlan } from "../schema/types";
import {
  buildWizardStabilityArtifact,
  DEFAULT_WIZARD_STABILITY_CORPUS,
  parseWizardStabilityCorpus,
} from "./stability-harness";
import {
  extractIntentSchemaGovernanceCore,
  extractIntentSchemaGovernanceDecisions,
  stableIntentGovernanceDecisionFingerprint,
  stableIntentSchemaGovernanceFingerprint,
} from "./intent-schema";

function makeSchema(overrides: Partial<IntentSchema>): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "test prompt",
      goal: "test prompt",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    requirements: {
      functional: ["Do the thing"],
    },
    constraints: {},
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
    ...overrides,
  };
}

function makeIssue(code: string, severity: ValidationIssue["severity"] = "warning"): ValidationIssue {
  return {
    code,
    severity,
    scope: "schema",
    message: code,
  };
}

function makeClarificationPlan(question: string): WizardClarificationPlan {
  return {
    questions: [
      {
        id: "clarify-target",
        question,
        reason: "Target boundary is unclear.",
        targetPaths: ["targeting"],
      },
    ],
    maxQuestions: 3,
    requiredForFaithfulInterpretation: true,
    targetPaths: ["targeting"],
    reason: "Structural targeting ambiguity.",
  };
}

function testParseWizardStabilityCorpusSupportsStringsAndObjects() {
  const corpus = parseWizardStabilityCorpus(
    JSON.stringify([
      "Create a dash skill.",
      { id: "selection-modal", prompt: "Open a three-choice modal.", groupId: "selection-family" },
    ]),
  );

  assert.equal(corpus.length, 2);
  assert.equal(corpus[0]?.id, "prompt_1");
  assert.equal(corpus[1]?.id, "selection-modal");
  assert.equal(corpus[1]?.groupId, "selection-family");
}

function testDefaultWizardStabilityCorpusExpandedCoverage() {
  const ids = new Set(DEFAULT_WIZARD_STABILITY_CORPUS.map((entry) => entry.id));
  assert.ok(ids.has("weighted-draw"));
  assert.ok(ids.has("passive-aura"));
  assert.ok(ids.has("no-ui-fire-dash"));
  assert.ok(ids.has("unfamiliar-mechanic"));
}

function testBuildWizardStabilityArtifactSummarizesClarificationAndCoverage() {
  const artifact = buildWizardStabilityArtifact({
    model: "gpt-5.4",
    temperature: 0.2,
    runCount: 2,
    corpus: DEFAULT_WIZARD_STABILITY_CORPUS.slice(0, 1),
    promptResults: [
      {
        entry: DEFAULT_WIZARD_STABILITY_CORPUS[0]!,
        runs: [
          {
            run: 1,
            valid: true,
            issues: [],
            schema: makeSchema({
              interaction: {
                activations: [{ kind: "key", input: "G", phase: "press" }],
              },
              spatial: {
                motion: { kind: "dash", distance: 400, direction: "cursor" },
              },
              outcomes: {
                operations: ["move"],
              },
            }),
          },
          {
            run: 2,
            valid: false,
            issues: [makeIssue("EMPTY_FUNCTIONAL_REQUIREMENTS", "error")],
            clarificationPlan: makeClarificationPlan("What target boundary should this skill use?"),
            schema: makeSchema({
              interaction: {
                activations: [{ kind: "key", input: "G", phase: "press" }],
              },
              spatial: {
                motion: { kind: "dash", distance: 400, direction: "cursor" },
              },
              outcomes: {
                operations: ["move"],
              },
              uncertainties: [
                {
                  id: "unc_dash_target",
                  summary: "Targeting remains ambiguous.",
                  affects: ["intent"],
                  severity: "medium",
                },
              ],
            }),
          },
        ],
      },
    ],
  });

  assert.equal(artifact.summary.validRate, 0.5);
  assert.equal(artifact.promptSummaries[0]?.normalizedMechanicsVariantCount, 1);
  assert.equal(artifact.promptSummaries[0]?.coreFacetVariantCount, 1);
  assert.equal(artifact.promptSummaries[0]?.clarificationPlanRate, 0.5);
  assert.equal(artifact.promptSummaries[0]?.clarificationQuestionCountDistribution["0"], 1);
  assert.equal(artifact.promptSummaries[0]?.clarificationQuestionCountDistribution["1"], 1);
  assert.equal(artifact.promptSummaries[0]?.issueCodeDistribution["error:EMPTY_FUNCTIONAL_REQUIREMENTS"], 1);
  assert.equal(artifact.promptSummaries[0]?.semanticCoverage.distancePreservationRate, 1);
}

function testBuildWizardStabilityArtifactTracksNegativeConstraintMetrics() {
  const prompt = "做一个主动技能，不要UI，不要persistence，不要cross-feature。按Q向鼠标方向冲刺400距离。";
  const artifact = buildWizardStabilityArtifact({
    model: "gpt-5.4",
    temperature: 0.2,
    runCount: 2,
    corpus: [{ id: "no-ui-fire-dash", prompt }],
    promptResults: [
      {
        entry: { id: "no-ui-fire-dash", prompt },
        runs: [
          {
            run: 1,
            valid: true,
            issues: [],
            schema: makeSchema({
              interaction: {
                activations: [{ kind: "key", input: "Q", phase: "press" }],
              },
              spatial: {
                motion: { kind: "dash", distance: 400, direction: "cursor" },
              },
              outcomes: {
                operations: ["move"],
              },
              uiRequirements: { needed: false, surfaces: [] },
            }),
          },
          {
            run: 2,
            valid: true,
            issues: [],
            schema: makeSchema({
              interaction: {
                activations: [{ kind: "key", input: "Q", phase: "press" }],
              },
              spatial: {
                motion: { kind: "dash", distance: 400, direction: "cursor" },
              },
              outcomes: {
                operations: ["move", "grant-feature"],
              },
              uiRequirements: {
                needed: true,
                surfaces: [{ kind: "modal", purpose: "unwanted-ui" }],
              },
              timing: {
                duration: { kind: "persistent" },
              },
              composition: {
                dependencies: [{ kind: "cross-feature", target: "other_feature" }],
              },
            }),
          },
        ],
      },
    ],
  });

  assert.equal(artifact.promptSummaries[0]?.semanticCoverage.negativeConstraintPreservationRate, 0.5);
  assert.equal(artifact.promptSummaries[0]?.semanticCoverage.spuriousUiRate, 0.5);
  assert.equal(artifact.promptSummaries[0]?.semanticCoverage.spuriousPersistenceRate, 0.5);
  assert.equal(artifact.promptSummaries[0]?.semanticCoverage.spuriousCrossFeatureRate, 0.5);
}

function testGovernanceFingerprintIgnoresDisplayProseOrder() {
  const left = makeSchema({
    classification: { intentKind: "standalone-system", confidence: "high" },
    interaction: { activations: [{ kind: "key", input: "F4", phase: "press" }] },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      cardinality: "single",
      choiceCount: 3,
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      commitment: "immediate",
    },
    uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
    stateModel: {
      states: [{ id: "candidate_pool_state", summary: "left", owner: "feature", lifetime: "session", kind: "collection", mutationMode: "update" }],
    },
    outcomes: { operations: ["apply-effect", "update-state"] },
    parameters: { choiceCount: 3, triggerKey: "F4" },
  });
  const right = makeSchema({
    classification: { intentKind: "standalone-system", confidence: "low" },
    interaction: { activations: [{ kind: "key", input: "F4", phase: "press" }] },
    selection: {
      source: "weighted-pool",
      choiceMode: "user-chosen",
      mode: "weighted",
      commitment: "immediate",
      cardinality: "single",
      duplicatePolicy: "forbid",
      repeatability: "repeatable",
      choiceCount: 3,
    },
    uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
    stateModel: {
      states: [{ id: "candidate_pool_state", summary: "right", owner: "feature", lifetime: "session", kind: "collection", mutationMode: "update" }],
    },
    outcomes: { operations: ["apply-effect", "update-state"] },
    parameters: { triggerKey: "F4", choiceCount: 3 },
  });

  assert.deepEqual(extractIntentSchemaGovernanceCore(left), extractIntentSchemaGovernanceCore(right));
  assert.equal(stableIntentSchemaGovernanceFingerprint(left), stableIntentSchemaGovernanceFingerprint(right));
  assert.equal(
    stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(left)),
    stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(right)),
  );
}

function testBuildWizardStabilityArtifactTracksGovernanceGroups() {
  const promptA = {
    id: "talent-draw-a",
    prompt: "Press F4 to draw 3 weighted talents, pick 1, remove the selected one from future draws, and return the rest to the pool.",
    groupId: "talent_draw_local_selection",
  };
  const promptB = {
    id: "talent-draw-b",
    prompt: "Build an F4 three-choice weighted talent draft, apply the chosen one immediately, remove it from later draws, and return unchosen ones to the pool.",
    groupId: "talent_draw_local_selection",
  };
  const stableSchema = makeSchema({
    classification: { intentKind: "standalone-system", confidence: "high" },
    interaction: { activations: [{ kind: "key", input: "F4", phase: "press" }] },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      cardinality: "single",
      choiceCount: 3,
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
      commitment: "immediate",
    },
    uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
    stateModel: {
      states: [{ id: "candidate_pool_state", summary: "stable", owner: "feature", lifetime: "session", kind: "collection", mutationMode: "update" }],
    },
    outcomes: { operations: ["apply-effect", "update-state"] },
  });
  const driftedSchema = makeSchema({
    classification: { intentKind: "cross-system-composition", confidence: "high" },
    interaction: { activations: [{ kind: "key", input: "F4", phase: "press" }] },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      cardinality: "single",
      choiceCount: 3,
      repeatability: "persistent",
      duplicatePolicy: "forbid",
      commitment: "immediate",
    },
    uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
    stateModel: {
      states: [{ id: "persistent_unlock_state", summary: "drifted", owner: "external", lifetime: "persistent", kind: "generic", mutationMode: "update" }],
    },
    composition: { dependencies: [{ kind: "external-system", relation: "writes", required: true }] },
    timing: { duration: { kind: "persistent" } },
    outcomes: { operations: ["grant-feature", "update-state"] },
  });

  const artifact = buildWizardStabilityArtifact({
    model: "gpt-5.4",
    temperature: 0.2,
    runCount: 2,
    corpus: [promptA, promptB],
    promptResults: [
      {
        entry: promptA,
        runs: [
          { run: 1, valid: true, issues: [], schema: stableSchema },
          { run: 2, valid: true, issues: [], schema: stableSchema },
        ],
      },
      {
        entry: promptB,
        runs: [
          { run: 1, valid: true, issues: [], schema: stableSchema },
          { run: 2, valid: false, issues: [makeIssue("PERSISTENCE_DRIFT", "error")], schema: driftedSchema },
        ],
      },
    ],
  });

  assert.equal(artifact.promptSummaries[0]?.governanceCoreVariantCount, 1);
  assert.equal(artifact.promptSummaries[1]?.governanceCoreVariantCount, 2);
  assert.equal(artifact.promptSummaries[1]?.semanticCoverage.governanceConsistencyRate, 0.5);
  assert.equal(artifact.groupSummaries.length, 1);
  assert.equal(artifact.groupSummaries[0]?.groupId, "talent_draw_local_selection");
  assert.equal(artifact.groupSummaries[0]?.governanceCoreVariantCount, 2);
  assert.equal(artifact.groupSummaries[0]?.blockedLikeVariantCount, 2);
}

function runTests() {
  testParseWizardStabilityCorpusSupportsStringsAndObjects();
  testDefaultWizardStabilityCorpusExpandedCoverage();
  testBuildWizardStabilityArtifactSummarizesClarificationAndCoverage();
  testBuildWizardStabilityArtifactTracksNegativeConstraintMetrics();
  testGovernanceFingerprintIgnoresDisplayProseOrder();
  testBuildWizardStabilityArtifactTracksGovernanceGroups();
  console.log("stability-harness.test.ts: PASS");
}

runTests();

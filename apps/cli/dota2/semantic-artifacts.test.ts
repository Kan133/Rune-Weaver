import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  createPendingSemanticExportStatus,
  createWrittenSemanticExportStatus,
  saveCreateSemanticArtifacts,
  saveUpdateSemanticArtifacts,
} from "./semantic-artifacts.js";

const sampleBlueprint = {
  id: "bp_draft",
  version: "1.0",
  summary: "draft",
  sourceIntent: {
    intentKind: "standalone-system",
    goal: "draft",
    normalizedMechanics: {},
  },
  modules: [],
  connections: [],
  patternHints: [],
  assumptions: [],
  validations: [],
  readyForAssembly: true,
} as any;

const sampleFinalBlueprint = {
  ...sampleBlueprint,
  id: "bp_final",
  status: "ready",
  moduleNeeds: [],
  designDraft: {
    modulePlan: [],
    retrievedFamilyCandidates: [],
    retrievedPatternCandidates: [],
    reuseConfidence: "low",
    chosenImplementationStrategy: "exploratory",
    artifactTargets: ["server"],
    notes: [],
  },
  maturity: "exploratory",
  implementationStrategy: "exploratory",
  featureContract: {
    exports: [],
    consumes: [],
    integrationSurfaces: [],
    stateScopes: [],
  },
  validationStatus: {
    status: "unvalidated",
    warnings: [],
    blockers: [],
  },
  dependencyEdges: [],
  commitDecision: {
    outcome: "exploratory",
    canAssemble: true,
    canWriteHost: true,
    requiresReview: true,
    reasons: [],
  },
} as any;

const tempRoot = mkdtempSync(join(tmpdir(), "rw-semantic-artifacts-"));

function cleanup(): void {
  rmSync(tempRoot, { recursive: true, force: true });
}

function testCreateWriteExportsFeatureLocalIntentSchema(): void {
  const hostRoot = join(tempRoot, "host");
  const result = saveCreateSemanticArtifacts({
    hostRoot,
    featureId: "talent_draw_demo",
    dryRun: false,
    reviewOutputDir: join(tempRoot, "review"),
    commandKind: "create",
    generatedAt: "2026-04-18T00:00:00.000Z",
    blueprint: sampleBlueprint,
    finalBlueprint: sampleFinalBlueprint,
    semanticAnalysis: {
      rawFacts: [],
      governanceDecisions: {} as any,
      openSemanticResidue: [
        {
          id: "unc_local_reward_consequence",
          summary: "The chosen reward consequence boundary is still unspecified inside the local placeholder profile.",
          surface: "effect_profile",
          class: "blueprint_relevant",
          disposition: "open",
          affects: ["blueprint"],
          severity: "medium",
          targetPaths: ["effects", "outcomes", "parameters"],
          source: "schema.uncertainty",
        },
      ],
    } as any,
    createReadinessDecision: {
      status: "ready",
      requiresReview: false,
      remainingResidue: [],
      closedResidue: [
        {
          id: "unc_local_reward_consequence",
        },
      ],
      reasons: [],
    } as any,
    intentSchema: {
      version: "1.0",
      host: { kind: "dota2-x-template" },
      request: {
        rawPrompt: "create",
        goal: "create",
      },
      classification: {
        intentKind: "standalone-system",
      },
      requirements: {
        functional: ["Create a feature"],
      },
      constraints: {},
      normalizedMechanics: {},
      requiredClarifications: [],
      openQuestions: [],
      resolvedAssumptions: [],
      isReadyForBlueprint: true,
    },
  });

  const expectedPath = join(
    hostRoot,
    "game",
    "scripts",
    "src",
    "rune_weaver",
    "features",
    "talent_draw_demo",
    "artifacts",
    "semantic",
    "intent-schema.create.json",
  );

  assert.equal(result.intentSchemaPath, expectedPath);
  assert.equal(existsSync(expectedPath), true);
  assert.equal(existsSync(join(
    hostRoot,
    "game",
    "scripts",
    "src",
    "rune_weaver",
    "features",
    "talent_draw_demo",
    "artifacts",
    "semantic",
    "blueprint.create.json",
  )), true);
  assert.equal(existsSync(join(
    hostRoot,
    "game",
    "scripts",
    "src",
    "rune_weaver",
    "features",
    "talent_draw_demo",
    "artifacts",
    "semantic",
    "final-blueprint.create.json",
  )), true);

  const payload = JSON.parse(readFileSync(expectedPath, "utf-8"));
  assert.equal(payload.featureId, "talent_draw_demo");
  assert.equal(payload.commandKind, "create");
  assert.equal(payload.semanticAnalysis.openSemanticResidue[0].surface, "effect_profile");
  assert.equal(payload.createReadinessDecision.status, "ready");
}

function testSemanticExportStatusHelpersReflectWrittenState(): void {
  const pending = createPendingSemanticExportStatus("not yet");
  assert.equal(pending.written, false);
  assert.equal(pending.reason, "not yet");

  const written = createWrittenSemanticExportStatus({
    rootDir: join(tempRoot, "semantic"),
  });
  assert.equal(written.written, true);
  assert.equal(written.rootDir, join(tempRoot, "semantic"));
}

function testUpdateDryRunExportsReviewMirrorArtifacts(): void {
  const reviewOutputDir = join(tempRoot, "review-output");
  const result = saveUpdateSemanticArtifacts({
    hostRoot: join(tempRoot, "host"),
    featureId: "talent_draw_demo",
    dryRun: true,
    reviewOutputDir,
    commandKind: "update",
    generatedAt: "2026-04-18T00:00:00.000Z",
    blueprint: sampleBlueprint,
    finalBlueprint: sampleFinalBlueprint,
    requestedChangeIntentSchema: {
      version: "1.0",
      host: { kind: "dota2-x-template" },
      request: {
        rawPrompt: "update",
        goal: "update",
      },
      classification: {
        intentKind: "standalone-system",
      },
      requirements: {
        functional: ["Update the feature"],
      },
      constraints: {},
      normalizedMechanics: {},
      requiredClarifications: [],
      openQuestions: [],
      resolvedAssumptions: [],
      isReadyForBlueprint: true,
    },
    updateIntent: {
      version: "1.0",
      mode: "update",
      target: {
        featureId: "talent_draw_demo",
        revision: 2,
        sourceBacked: true,
      },
      currentFeatureContext: {
        featureId: "talent_draw_demo",
        revision: 2,
        intentKind: "standalone-system",
        selectedPatterns: ["input.key_binding"],
        sourceBacked: true,
        preservedModuleBackbone: ["input_trigger"],
        admittedSkeleton: ["input.key_binding"],
        preservedInvariants: [],
        boundedFields: {},
      },
      requestedChange: {
        version: "1.0",
        host: { kind: "dota2-x-template" },
        request: {
          rawPrompt: "update",
          goal: "update",
        },
        classification: {
          intentKind: "standalone-system",
        },
        requirements: {
          functional: ["Update the feature"],
        },
        constraints: {},
        normalizedMechanics: {},
        requiredClarifications: [],
        openQuestions: [],
        resolvedAssumptions: [],
        isReadyForBlueprint: true,
      },
      delta: {
        preserve: [],
        add: [],
        modify: [],
        remove: [],
      },
      readiness: "ready",
      resolvedAssumptions: [],
    },
  });

  const expectedRoot = join(reviewOutputDir, "semantic", "talent_draw_demo");
  assert.equal(result.rootDir, expectedRoot);
  assert.equal(existsSync(join(expectedRoot, "intent-schema.update.json")), true);
  assert.equal(existsSync(join(expectedRoot, "update-intent.json")), true);
  assert.equal(existsSync(join(expectedRoot, "blueprint.update.json")), true);
  assert.equal(existsSync(join(expectedRoot, "final-blueprint.update.json")), true);

  const updateIntentPayload = JSON.parse(readFileSync(join(expectedRoot, "update-intent.json"), "utf-8"));
  assert.equal(updateIntentPayload.featureId, "talent_draw_demo");
  assert.equal(updateIntentPayload.commandKind, "update");
  assert.equal(updateIntentPayload.revision, 2);
}

try {
  testCreateWriteExportsFeatureLocalIntentSchema();
  testSemanticExportStatusHelpersReflectWrittenState();
  testUpdateDryRunExportsReviewMirrorArtifacts();
  console.log("apps/cli/dota2/semantic-artifacts.test.ts passed");
} finally {
  cleanup();
}

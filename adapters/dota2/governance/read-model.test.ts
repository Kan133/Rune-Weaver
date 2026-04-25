import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { aggregateGroundingChecks } from "../../../core/governance/grounding.js";
import { loadWorkspace } from "../../../core/workspace/index.js";
import {
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
} from "../cross-feature/index.js";
import {
  DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION,
  buildDota2GovernanceReadModel,
  observeDota2GovernanceLiveObservation,
} from "./read-model.js";

function createMockHost(root: string): void {
  if (existsSync(root)) {
    rmSync(root, { recursive: true, force: true });
  }

  const dirs = [
    "game/scripts/npc",
    "game/scripts/vscripts/rune_weaver/abilities",
    "game/scripts/src/rune_weaver/generated/server",
    "game/scripts/src/rune_weaver/generated/shared",
    "content/panorama/src/rune_weaver/generated/ui",
    "content/panorama/src/hud",
  ];

  for (const dir of dirs) {
    mkdirSync(join(root, dir), { recursive: true });
  }

  writeFileSync(
    join(root, "game/scripts/src/rune_weaver/generated/server/index.ts"),
    "export {};\n",
    "utf-8",
  );
  writeFileSync(
    join(root, "content/panorama/src/rune_weaver/generated/ui/index.tsx"),
    "export function RuneWeaverGeneratedUIRoot() { return null; }\n",
    "utf-8",
  );
  writeFileSync(
    join(root, "content/panorama/src/hud/styles.less"),
    ".rune-weaver-root { width: 100%; height: 100%; }\n",
    "utf-8",
  );
}

function writeWorkspace(root: string, features: unknown[]): void {
  const workspaceDir = join(root, "game", "scripts", "src", "rune_weaver");
  mkdirSync(workspaceDir, { recursive: true });
  writeFileSync(
    join(workspaceDir, "rune-weaver.workspace.json"),
    JSON.stringify(
      {
        version: "0.1",
        hostType: "dota2-x-template",
        hostRoot: root,
        addonName: "test_addon",
        initializedAt: new Date().toISOString(),
        features,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function buildRawGrounding(options?: {
  weakSymbols?: string[];
  unknownSymbols?: string[];
  verifiedSymbols?: string[];
  warnings?: string[];
}) {
  return [
    {
      artifactId: "reveal_runtime_lua",
      verifiedSymbols: options?.verifiedSymbols || ["ApplyDamage"],
      allowlistedSymbols: [],
      weakSymbols: options?.weakSymbols || [],
      unknownSymbols: options?.unknownSymbols || [],
      warnings: options?.warnings || [],
    },
  ];
}

function createBaseFeature(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    featureId: "test_feature",
    intentKind: "ability",
    status: "active",
    revision: 1,
    blueprintId: "bp_test_feature",
    modules: [],
    selectedPatterns: [],
    generatedFiles: [],
    entryBindings: [],
    commitDecision: {
      outcome: "exploratory",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: true,
      reasons: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildReadModel(root: string) {
  const workspaceResult = loadWorkspace(root);
  assert.equal(workspaceResult.success, true);
  const liveObservation = observeDota2GovernanceLiveObservation(root);
  return buildDota2GovernanceReadModel({
    hostRoot: root,
    features: workspaceResult.workspace!.features,
    liveObservation,
  });
}

assert.equal(DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION, "dota2-governance-read-model/v1");

{
  const hostRoot = join(tmpdir(), `rw-governance-read-model-selection-${Date.now()}`);
  try {
    createMockHost(hostRoot);
    writeWorkspace(hostRoot, [
      createBaseFeature({
        featureId: "selection_family_demo",
        implementationStrategy: "family",
        maturity: "templated",
        commitDecision: {
          outcome: "committable",
          canAssemble: true,
          canWriteHost: true,
          requiresReview: false,
          reasons: [],
        },
        modules: [
          {
            moduleId: "selection_flow",
            role: "selection_flow",
            familyId: "selection_pool",
            selectedPatternIds: ["rule.selection_flow"],
            sourceKind: "family",
            implementationStrategy: "family",
            maturity: "templated",
            requiresReview: false,
            reviewReasons: [],
          },
        ],
        selectedPatterns: ["rule.selection_flow"],
      }),
    ]);

    const readModel = buildReadModel(hostRoot);
    const feature = readModel.features[0]!;

    assert.equal(readModel.schemaVersion, DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION);
    assert.equal(readModel.workspace.liveValidationSummary?.status, "clean");
    assert.equal(feature.lifecycle.implementationStrategy, "family");
    assert.equal(feature.lifecycle.commitOutcome, "committable");
    assert.equal(feature.reusableGovernance.familyAdmissions[0]?.assetId, "selection_pool");
    assert.equal(feature.reusableGovernance.familyAdmissions[0]?.status, "admitted");
    assert.equal(feature.repairability.status, "clean");
    assert.equal(feature.productVerdict.label, "Clean");
  } finally {
    if (existsSync(hostRoot)) {
      rmSync(hostRoot, { recursive: true, force: true });
    }
  }
}

{
  const hostRoot = join(tmpdir(), `rw-governance-read-model-provider-${Date.now()}`);
  try {
    createMockHost(hostRoot);
    const rawGrounding = buildRawGrounding({
      verifiedSymbols: ["ApplyDamage"],
    });
    const exactAssessment = aggregateGroundingChecks(rawGrounding);

    writeWorkspace(hostRoot, [
      createBaseFeature({
        featureId: "provider_shell_demo",
        implementationStrategy: "exploratory",
        maturity: "exploratory",
        modules: [
          {
            moduleId: "provider_runtime",
            role: "gameplay_ability",
            sourceKind: "synthesized",
            selectedPatternIds: [],
            implementationStrategy: "exploratory",
            maturity: "exploratory",
            requiresReview: true,
            reviewReasons: [],
            groundingAssessment: exactAssessment,
            metadata: { grounding: rawGrounding },
          },
        ],
        featureContract: {
          exports: [
            {
              id: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
              kind: "capability",
              summary: "Exports one grantable primary hero ability surface.",
              contractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
            },
          ],
          consumes: [],
          integrationSurfaces: [],
          stateScopes: [],
        },
        groundingSummary: exactAssessment,
      }),
    ]);

    const readModel = buildReadModel(hostRoot);
    const feature = readModel.features[0]!;

    assert.equal(readModel.workspace.liveValidationSummary?.status, "clean");
    assert.equal(feature.lifecycle.implementationStrategy, "exploratory");
    assert.equal(feature.lifecycle.commitOutcome, "exploratory");
    assert.equal(feature.reusableGovernance.seamAdmissions[0]?.assetId, "grant_only_provider_export_seam");
    assert.equal(feature.reusableGovernance.seamAdmissions[0]?.status, "admitted");
    assert.equal(feature.repairability.status, "clean");
    assert.equal(feature.productVerdict.label, "Review required");
  } finally {
    if (existsSync(hostRoot)) {
      rmSync(hostRoot, { recursive: true, force: true });
    }
  }
}

{
  const hostRoot = join(tmpdir(), `rw-governance-read-model-reveal-${Date.now()}`);
  try {
    createMockHost(hostRoot);
    const rawGrounding = buildRawGrounding({
      weakSymbols: ["DealSplash"],
      warnings: ["weak grounding"],
    });
    const partialAssessment = aggregateGroundingChecks(rawGrounding);

    writeWorkspace(hostRoot, [
      createBaseFeature({
        featureId: "reveal_only_demo",
        implementationStrategy: "exploratory",
        maturity: "exploratory",
        modules: [
          {
            moduleId: "reveal_runtime",
            role: "reveal_runtime",
            sourceKind: "synthesized",
            selectedPatternIds: [],
            implementationStrategy: "exploratory",
            maturity: "exploratory",
            requiresReview: true,
            reviewReasons: [],
            groundingAssessment: partialAssessment,
            metadata: { grounding: rawGrounding },
          },
        ],
        groundingSummary: partialAssessment,
      }),
    ]);

    const readModel = buildReadModel(hostRoot);
    const feature = readModel.features[0]!;

    assert.equal(readModel.workspace.liveValidationSummary?.status, "review_required");
    assert.equal(feature.lifecycle.commitOutcome, "exploratory");
    assert.deepEqual(feature.reusableGovernance.patternAdmissions, []);
    assert.deepEqual(feature.reusableGovernance.familyAdmissions, []);
    assert.deepEqual(feature.reusableGovernance.seamAdmissions, []);
    assert.equal(feature.grounding.status, "partial");
    assert.equal(feature.repairability.status, "review_required");
    assert.equal(feature.productVerdict.label, "Review required");
  } finally {
    if (existsSync(hostRoot)) {
      rmSync(hostRoot, { recursive: true, force: true });
    }
  }
}

{
  const hostRoot = join(tmpdir(), `rw-governance-read-model-upgrade-${Date.now()}`);
  try {
    createMockHost(hostRoot);
    const rawGrounding = buildRawGrounding({
      weakSymbols: ["DealSplash"],
      warnings: ["weak grounding"],
    });

    writeWorkspace(hostRoot, [
      createBaseFeature({
        featureId: "stale_upgrade_demo",
        implementationStrategy: "exploratory",
        maturity: "exploratory",
        modules: [
          {
            moduleId: "reveal_runtime",
            role: "reveal_runtime",
            sourceKind: "synthesized",
            selectedPatternIds: [],
            implementationStrategy: "exploratory",
            maturity: "exploratory",
            requiresReview: true,
            reviewReasons: [],
            metadata: { grounding: rawGrounding },
          },
        ],
      }),
    ]);

    const readModel = buildReadModel(hostRoot);
    const feature = readModel.features[0]!;

    assert.equal(readModel.workspace.liveValidationSummary?.status, "failed");
    assert.equal(feature.grounding.status, "none_required");
    assert.equal(feature.repairability.status, "upgrade_workspace_grounding");
    assert.equal(feature.productVerdict.label, "Repair available");
  } finally {
    if (existsSync(hostRoot)) {
      rmSync(hostRoot, { recursive: true, force: true });
    }
  }
}

{
  const hostRoot = join(tmpdir(), `rw-governance-read-model-regenerate-${Date.now()}`);
  try {
    createMockHost(hostRoot);
    writeWorkspace(hostRoot, [
      createBaseFeature({
        featureId: "stale_regenerate_demo",
        implementationStrategy: "exploratory",
        maturity: "exploratory",
        modules: [
          {
            moduleId: "reveal_runtime",
            role: "reveal_runtime",
            sourceKind: "synthesized",
            selectedPatternIds: [],
            implementationStrategy: "exploratory",
            maturity: "exploratory",
            requiresReview: true,
            reviewReasons: [],
            metadata: {},
          },
        ],
      }),
    ]);

    const readModel = buildReadModel(hostRoot);
    const feature = readModel.features[0]!;

    assert.equal(readModel.workspace.liveValidationSummary?.status, "failed");
    assert.equal(feature.repairability.status, "requires_regenerate");
    assert.equal(feature.productVerdict.label, "Regenerate required");
  } finally {
    if (existsSync(hostRoot)) {
      rmSync(hostRoot, { recursive: true, force: true });
    }
  }
}

console.log("adapters/dota2/governance/read-model.test.ts passed");

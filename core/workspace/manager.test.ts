import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  addFeatureToWorkspace,
  createEmptyWorkspace,
  deriveFeatureLifecycleFromModules,
  getWorkspaceFilePath,
  loadWorkspace,
  updateFeatureInWorkspace,
} from "./index.js";
import type { ModuleImplementationRecord } from "./types.js";

function createModule(
  overrides: Partial<ModuleImplementationRecord> = {},
): ModuleImplementationRecord {
  return {
    moduleId: "runtime",
    role: "runtime",
    selectedPatternIds: ["input.key_binding"],
    sourceKind: "pattern",
    implementationStrategy: "pattern",
    maturity: "templated",
    requiresReview: false,
    reviewReasons: [],
    ...overrides,
  };
}

function testLegacyWorkspaceBackfillsModuleTruth(): void {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-workspace-manager-"));
  try {
    const workspaceDir = join(hostRoot, "game", "scripts", "src", "rune_weaver");
    const workspacePath = getWorkspaceFilePath(hostRoot);
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      workspacePath,
      JSON.stringify({
        version: "0.1",
        hostType: "dota2-x-template",
        hostRoot,
        addonName: "test_addon",
        initializedAt: new Date().toISOString(),
        features: [
          {
            featureId: "legacy_feature",
            intentKind: "ability",
            status: "active",
            revision: 2,
            blueprintId: "bp_legacy",
            selectedPatterns: ["input.key_binding"],
            generatedFiles: ["game/scripts/src/rune_weaver/generated/server/legacy.ts"],
            entryBindings: [],
            implementationStrategy: "guided_native",
            commitDecision: {
              outcome: "exploratory",
              canAssemble: true,
              canWriteHost: true,
              requiresReview: true,
              reasons: ["legacy review"],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }, null, 2),
      "utf-8",
    );

    const result = loadWorkspace(hostRoot);
    assert.equal(result.success, true);
    const feature = result.workspace!.features[0];
    assert.equal(feature.modules?.length, 1);
    assert.equal(feature.modules?.[0].moduleId, "legacy.feature");
    assert.equal(feature.implementationStrategy, "exploratory");
    assert.equal(feature.maturity, "exploratory");
    assert.equal(feature.commitDecision?.outcome, "exploratory");
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testUpdatePreservesModuleDrivenLifecycleTruth(): void {
  const workspace = createEmptyWorkspace("D:\\fake-host");
  const existingModule = createModule({
    moduleId: "synth_runtime",
    sourceKind: "synthesized",
    implementationStrategy: "guided_native",
    maturity: "exploratory",
    requiresReview: true,
    reviewReasons: ["needs review"],
  });
  const created = addFeatureToWorkspace(
    workspace,
    {
      featureId: "feature_one",
      blueprintId: "bp_1",
      modules: [existingModule],
      selectedPatterns: ["input.key_binding"],
      generatedFiles: ["game/scripts/src/rune_weaver/generated/server/feature_one.ts"],
      entryBindings: [],
    },
    "ability",
  );

  const updated = updateFeatureInWorkspace(
    created,
    "feature_one",
    {
      featureId: "feature_one",
      blueprintId: "bp_2",
      selectedPatterns: ["input.key_binding"],
      generatedFiles: ["game/scripts/src/rune_weaver/generated/server/feature_one.ts"],
      entryBindings: [],
      maturity: "templated",
      implementationStrategy: "pattern",
    },
    "ability",
  );

  const feature = updated.features[0];
  assert.equal(feature.modules?.[0].moduleId, "synth_runtime");
  assert.equal(feature.implementationStrategy, "exploratory");
  assert.equal(feature.maturity, "exploratory");
  assert.equal(feature.commitDecision?.outcome, "exploratory");
}

function testFeatureLifecycleDerivedFromModules(): void {
  const lifecycle = deriveFeatureLifecycleFromModules({
    modules: [
      createModule(),
      createModule({
        moduleId: "synth",
        sourceKind: "synthesized",
        implementationStrategy: "guided_native",
        maturity: "exploratory",
        requiresReview: true,
        reviewReasons: ["host-native"],
      }),
    ],
  });

  assert.equal(lifecycle.implementationStrategy, "guided_native");
  assert.equal(lifecycle.maturity, "exploratory");
  assert.equal(lifecycle.commitDecision?.outcome, "exploratory");
  assert.match(lifecycle.commitDecision?.reasons[0] || "", /\[module:synth\]/);
}

function testWorkspaceRoundTripsTypedContractMetadata(): void {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-workspace-contract-"));
  try {
    const workspaceDir = join(hostRoot, "game", "scripts", "src", "rune_weaver");
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      getWorkspaceFilePath(hostRoot),
      JSON.stringify({
        version: "0.1",
        hostType: "dota2-x-template",
        hostRoot,
        addonName: "test_addon",
        initializedAt: new Date().toISOString(),
        features: [
          {
            featureId: "contract_feature",
            intentKind: "standalone-system",
            status: "active",
            revision: 1,
            blueprintId: "bp_contract",
            selectedPatterns: ["rule.selection_flow"],
            generatedFiles: [],
            entryBindings: [],
            featureContract: {
              exports: [
                {
                  id: "content_collection:default",
                  kind: "data",
                  summary: "Exports reusable content collection 'default'.",
                  contractId: "selection_pool.object",
                },
              ],
              consumes: [
                {
                  id: "grantable_primary_hero_ability",
                  kind: "capability",
                  summary: "Consumes a provider feature that can grant one primary hero ability.",
                  contractId: "dota2.primary_hero_ability.grantable",
                },
              ],
              integrationSurfaces: [],
              stateScopes: [],
            },
            dependencyEdges: [
              {
                relation: "grants",
                targetFeatureId: "skill_provider_demo",
                targetSurfaceId: "grantable_primary_hero_ability",
                targetContractId: "dota2.primary_hero_ability.grantable",
                required: true,
                summary: "cross-feature reward grants:skill_provider_demo:grantable_primary_hero_ability",
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }, null, 2),
      "utf-8",
    );

    const result = loadWorkspace(hostRoot);
    assert.equal(result.success, true);
    const feature = result.workspace!.features[0];
    assert.equal(feature.featureContract?.exports[0]?.contractId, "selection_pool.object");
    assert.equal(feature.featureContract?.consumes[0]?.contractId, "dota2.primary_hero_ability.grantable");
    assert.equal(feature.dependencyEdges?.[0]?.targetContractId, "dota2.primary_hero_ability.grantable");
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testWorkspaceRoundTripsGroundingSummary(): void {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-workspace-grounding-"));
  try {
    const workspaceDir = join(hostRoot, "game", "scripts", "src", "rune_weaver");
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      getWorkspaceFilePath(hostRoot),
      JSON.stringify({
        version: "0.1",
        hostType: "dota2-x-template",
        hostRoot,
        addonName: "test_addon",
        initializedAt: new Date().toISOString(),
        features: [
          {
            featureId: "reveal_batch_demo",
            intentKind: "standalone-system",
            status: "active",
            revision: 1,
            blueprintId: "bp_reveal",
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
                groundingAssessment: {
                  status: "partial",
                  reviewRequired: true,
                  verifiedSymbolCount: 1,
                  allowlistedSymbolCount: 0,
                  weakSymbolCount: 1,
                  unknownSymbolCount: 0,
                  warnings: ["weak grounding"],
                  reasonCodes: ["verified_symbols_present", "weak_symbols_present"],
                  evidenceRefs: [],
                },
                metadata: {
                  grounding: [
                    {
                      artifactId: "reveal_runtime_lua",
                      verifiedSymbols: ["ApplyDamage"],
                      allowlistedSymbols: [],
                      weakSymbols: ["DealSplash"],
                      unknownSymbols: [],
                      warnings: ["weak grounding"],
                    },
                  ],
                },
              },
            ],
            selectedPatterns: [],
            generatedFiles: [],
            entryBindings: [],
            groundingSummary: {
              status: "partial",
              reviewRequired: true,
              verifiedSymbolCount: 1,
              allowlistedSymbolCount: 0,
              weakSymbolCount: 1,
              unknownSymbolCount: 0,
              warnings: ["weak grounding"],
              reasonCodes: ["verified_symbols_present", "weak_symbols_present"],
              evidenceRefs: [],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }, null, 2),
      "utf-8",
    );

    const result = loadWorkspace(hostRoot);
    assert.equal(result.success, true);
    const feature = result.workspace!.features[0];
    assert.equal(feature.groundingSummary?.status, "partial");
    assert.equal(feature.modules?.[0]?.groundingAssessment?.status, "partial");
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

testLegacyWorkspaceBackfillsModuleTruth();
testUpdatePreservesModuleDrivenLifecycleTruth();
testFeatureLifecycleDerivedFromModules();
testWorkspaceRoundTripsTypedContractMetadata();
testWorkspaceRoundTripsGroundingSummary();

console.log("core/workspace/manager.test.ts passed");

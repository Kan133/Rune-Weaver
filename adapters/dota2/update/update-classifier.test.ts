import assert from "node:assert/strict";

import { classifyUpdateDiff } from "./update-classifier.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import type { WritePlan } from "../assembler/index.js";

const existingFeature: RuneWeaverFeatureRecord = {
  featureId: "standalone_system_test",
  intentKind: "standalone-system",
  status: "active",
  revision: 2,
  blueprintId: "bp_old",
  selectedPatterns: ["integration.state_sync_bridge", "input.key_binding"],
  generatedFiles: [
    "game/scripts/src/rune_weaver/generated/server/standalone_system_test_integration_bridge_integration_state_sync_bridge.ts",
    "game/scripts/src/rune_weaver/generated/server/standalone_system_test_input_trigger_input_key_binding.ts",
  ],
  entryBindings: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const newWritePlan = {
  entries: [
    {
      operation: "create",
      targetPath:
        "game/scripts/src/rune_weaver/generated/server/standalone_system_test_integration_bridge_integration_state_sync_bridge.ts",
      contentType: "typescript",
      contentSummary: "integration/integration.state_sync_bridge (typescript) params: {}",
      sourcePattern: "integration.state_sync_bridge",
      sourceModule: "integration_bridge",
      safe: true,
      generatorFamilyHint: "bridge-support",
      deferred: true,
      deferredReason:
        "Selection-state bridge output is intentionally elided: runtime/UI sync is already absorbed by the admitted selection flow, so no standalone bridge file is emitted.",
    },
    {
      operation: "create",
      targetPath:
        "game/scripts/src/rune_weaver/generated/server/standalone_system_test_input_trigger_input_key_binding.ts",
      contentType: "typescript",
      contentSummary: "input/input.key_binding (typescript) params: {}",
      sourcePattern: "input.key_binding",
      sourceModule: "input_trigger",
      safe: true,
      generatorFamilyHint: "dota2-ts",
    },
  ],
} as WritePlan;

const diff = classifyUpdateDiff(existingFeature, newWritePlan, "D:\\test-host");

assert.equal(diff.requiresRegenerate, false);
assert.equal(diff.deletedFiles.length, 1);
assert.equal(
  diff.deletedFiles[0].path,
  "game/scripts/src/rune_weaver/generated/server/standalone_system_test_integration_bridge_integration_state_sync_bridge.ts"
);
assert.equal(diff.deletedFiles[0].classification, "safe-delete");

const sourceArtifactDiff = classifyUpdateDiff(
  existingFeature,
  {
    entries: [
      ...newWritePlan.entries,
      {
        operation: "create",
        targetPath: "game/scripts/src/rune_weaver/features/standalone_system_test/selection-pool.source.json",
        contentType: "json",
        contentSummary: "feature_source_model/selection_pool (json) objects:20 kind:talent",
        sourcePattern: "rw.feature_source_model",
        sourceModule: "feature_source_model",
        safe: true,
        metadata: {
          sourceModelRef: {
            adapter: "selection_pool",
            version: 1,
            path: "game/scripts/src/rune_weaver/features/standalone_system_test/selection-pool.source.json",
          },
        },
      },
    ],
  } as WritePlan,
  "D:\\test-host",
);

assert.equal(sourceArtifactDiff.requiresRegenerate, false);
assert.equal(sourceArtifactDiff.createdFiles.length, 1);
assert.equal(
  sourceArtifactDiff.createdFiles[0].path,
  "game/scripts/src/rune_weaver/features/standalone_system_test/selection-pool.source.json"
);

const migratedSourceFeature: RuneWeaverFeatureRecord = {
  ...existingFeature,
  sourceModel: {
    adapter: "talent-draw",
    version: 1,
    path: "game/scripts/src/rune_weaver/features/standalone_system_test/talent-draw.source.json",
  },
};

const migratedSourceArtifactDiff = classifyUpdateDiff(
  migratedSourceFeature,
  {
    entries: [
      ...newWritePlan.entries,
      {
        operation: "create",
        targetPath: "game/scripts/src/rune_weaver/features/standalone_system_test/selection-pool.source.json",
        contentType: "json",
        contentSummary: "feature_source_model/selection_pool (json) objects:20 kind:talent",
        sourcePattern: "rw.feature_source_model",
        sourceModule: "feature_source_model",
        safe: true,
        metadata: {
          sourceModelRef: {
            adapter: "selection_pool",
            version: 1,
            path: "game/scripts/src/rune_weaver/features/standalone_system_test/selection-pool.source.json",
          },
        },
      },
    ],
  } as WritePlan,
  "D:\\test-host",
);

assert.equal(migratedSourceArtifactDiff.requiresRegenerate, false);
assert.equal(migratedSourceArtifactDiff.refreshedFiles.length, 2);
assert.equal(migratedSourceArtifactDiff.createdFiles.length, 0);
assert.equal(migratedSourceArtifactDiff.deletedFiles.length, 1);
assert.deepEqual(
  migratedSourceArtifactDiff.refreshedFiles.map((file) => file.path).sort(),
  [
    "game/scripts/src/rune_weaver/features/standalone_system_test/selection-pool.source.json",
    "game/scripts/src/rune_weaver/generated/server/standalone_system_test_input_trigger_input_key_binding.ts",
  ].sort(),
);
assert.equal(
  migratedSourceArtifactDiff.deletedFiles[0].path,
  "game/scripts/src/rune_weaver/generated/server/standalone_system_test_integration_bridge_integration_state_sync_bridge.ts"
);

console.log("adapters/dota2/update/update-classifier.test.ts passed");

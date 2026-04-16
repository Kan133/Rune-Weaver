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
        targetPath: "game/scripts/src/rune_weaver/features/standalone_system_test/talent-draw.source.json",
        contentType: "json",
        contentSummary: "feature_source_model/talent-draw (json) talents:20",
        sourcePattern: "rw.feature_source_model",
        sourceModule: "feature_source_model",
        safe: true,
      },
    ],
  } as WritePlan,
  "D:\\test-host",
);

assert.equal(sourceArtifactDiff.requiresRegenerate, false);
assert.equal(sourceArtifactDiff.createdFiles.length, 1);
assert.equal(
  sourceArtifactDiff.createdFiles[0].path,
  "game/scripts/src/rune_weaver/features/standalone_system_test/talent-draw.source.json"
);

console.log("adapters/dota2/update/update-classifier.test.ts passed");

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION,
} from "../governance/read-model.js";
import { checkHostStatus } from "./host-status.js";

function createMockHost(root: string): void {
  mkdirSync(root, { recursive: true });

  const dirs = [
    "scripts",
    "game/scripts/src/rune_weaver",
    "content/panorama/src/rune_weaver",
  ];

  for (const dir of dirs) {
    mkdirSync(join(root, dir), { recursive: true });
  }

  writeFileSync(join(root, "scripts/addon.config.ts"), "export default {};\n", "utf-8");
  writeFileSync(join(root, "scripts/install.ts"), "export {};\n", "utf-8");
  writeFileSync(join(root, "scripts/launch.ts"), "export {};\n", "utf-8");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "rw-host-status-test",
        private: true,
        scripts: {
          postinstall: "echo postinstall",
          launch: "echo launch",
        },
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function createWorkspaceFeature(featureId: string) {
  return {
    featureId,
    intentKind: "ability",
    status: "active",
    revision: 1,
    blueprintId: `bp_${featureId}`,
    selectedPatterns: [],
    generatedFiles: [],
    entryBindings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function writeWorkspace(root: string): void {
  const workspacePath = join(root, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
  writeFileSync(
    workspacePath,
    JSON.stringify(
      {
        version: "0.1",
        hostType: "dota2-x-template",
        hostRoot: root,
        addonName: "test_addon",
        initializedAt: new Date().toISOString(),
        features: [
          createWorkspaceFeature("feature_one"),
          createWorkspaceFeature("feature_two"),
        ],
      },
      null,
      2,
    ),
    "utf-8",
  );
}

{
  const hostRoot = join(
    tmpdir(),
    `rw-host-status-governance-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  createMockHost(hostRoot);
  writeWorkspace(hostRoot);

  const result = checkHostStatus(hostRoot);

  assert.equal(result.supported, true);
  assert.ok(result.workspace);
  assert.ok(result.governanceReadModel);
  assert.equal(result.governanceReadModel?.schemaVersion, DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION);
  assert.equal(result.governanceReadModel?.workspace.featureCount, result.workspace?.features.length);
  assert.equal(result.governanceReadModel?.workspace.featureCount, result.governanceReadModel?.features.length);
  assert.equal(result.governanceReadModel?.features.length, result.workspace?.features.length);
  assert.equal(result.governanceReadModel?.workspace.liveValidationSummary, undefined);

  for (const feature of result.governanceReadModel?.features || []) {
    assert.equal(feature.repairability.status, "not_checked");
  }
}

console.log("adapters/dota2/scanner/host-status.test.ts passed");

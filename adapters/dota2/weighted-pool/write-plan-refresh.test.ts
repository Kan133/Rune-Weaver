import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { generateWeightedPoolCode } from "../generator/server/weighted-pool.js";
import { refreshWeightedPoolWritePlan } from "./write-plan-refresh.js";

function testRefreshWeightedPoolWritePlanHydratesExistingSeedData(): void {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-weighted-pool-refresh-"));
  const sharedDir = join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "shared");
  mkdirSync(sharedDir, { recursive: true });

  const relativePath =
    "game/scripts/src/rune_weaver/generated/shared/existing_seed_demo_weighted_pool_data_weighted_pool.ts";
  const fullPath = join(hostRoot, relativePath);
  const source = generateWeightedPoolCode(
    "ExistingSeedDemoWeightedPoolDataWeightedPool",
    "existing_seed_demo",
    {
      operation: "create",
      targetPath: relativePath,
      contentType: "typescript",
      contentSummary: "weighted pool",
      sourcePattern: "data.weighted_pool",
      sourceModule: "weighted_pool",
      safe: true,
      parameters: {
        entries: [
          { id: "RW_R001", label: "Reward R001", description: "R reward", weight: 40, tier: "R" },
          { id: "RW_SR001", label: "Reward SR001", description: "SR reward", weight: 30, tier: "SR" },
          { id: "RW_UR001", label: "Reward UR001", description: "UR reward", weight: 10, tier: "UR" },
        ],
        choiceCount: 3,
        drawMode: "multiple_without_replacement",
        duplicatePolicy: "forbid",
        poolStateTracking: "session",
      },
    } as any,
  );
  writeFileSync(fullPath, source, "utf-8");

  const writePlan = {
    entries: [
      {
        sourcePattern: "data.weighted_pool",
        parameters: {
          choiceCount: 5,
        },
      },
    ],
  } as any;

  refreshWeightedPoolWritePlan(writePlan, {
    hostRoot,
    existingFeature: {
      featureId: "existing_seed_demo",
      generatedFiles: [relativePath],
    } as any,
  });

  assert.equal(writePlan.entries[0].parameters.choiceCount, 5);
  assert.equal(writePlan.entries[0].parameters.entries.length, 3);
  assert.equal(writePlan.entries[0].parameters.drawMode, "multiple_without_replacement");
  assert.equal(writePlan.entries[0].parameters.duplicatePolicy, "forbid");
  assert.equal(writePlan.entries[0].parameters.poolStateTracking, "session");
}

function testRefreshWeightedPoolWritePlanNoopsWithoutExistingFeature(): void {
  const writePlan = {
    entries: [
      {
        sourcePattern: "data.weighted_pool",
        parameters: undefined,
      },
    ],
  } as any;

  refreshWeightedPoolWritePlan(writePlan, {
    hostRoot: "D:\\does-not-matter",
    existingFeature: null,
  });

  assert.equal(writePlan.entries[0].parameters, undefined);
}

function runTests(): void {
  testRefreshWeightedPoolWritePlanHydratesExistingSeedData();
  testRefreshWeightedPoolWritePlanNoopsWithoutExistingFeature();
  console.log("adapters/dota2/weighted-pool/write-plan-refresh.test.ts: PASS");
}

runTests();

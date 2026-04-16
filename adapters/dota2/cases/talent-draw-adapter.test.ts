import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";

import {
  TALENT_DRAW_CANONICAL_CREATE_PROMPT,
  TALENT_DRAW_CANONICAL_FEATURE_ID,
  TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT,
  TALENT_DRAW_CANONICAL_UPDATE_PROMPT,
  createCanonicalTalentDrawFeatureModel,
  getTalentDrawSourceArtifactRelativePath,
  resolveTalentDrawSourceModel,
} from "./talent-draw-adapter.js";

function makeActiveFeature(featureId: string, generatedFiles: string[] = []) {
  const now = new Date().toISOString();
  return {
    featureId,
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 1,
    blueprintId: "bp_test",
    selectedPatterns: ["input.key_binding", "data.weighted_pool", "rule.selection_flow", "ui.selection_modal"],
    generatedFiles,
    entryBindings: [],
    createdAt: now,
    updatedAt: now,
  };
}

function testCanonicalCreateSeedsSixTalents(): void {
  const result = resolveTalentDrawSourceModel({
    prompt: TALENT_DRAW_CANONICAL_CREATE_PROMPT,
    hostRoot: "D:/test-host",
    mode: "create",
    featureId: TALENT_DRAW_CANONICAL_FEATURE_ID,
  });

  assert.equal(result.handled, true);
  assert.equal(result.blocked, false);
  assert.equal(result.sourceModel?.talents.length, 6);
  assert.equal(Array.isArray(result.compiledParameters?.entries), true);
  assert.equal((result.compiledParameters?.entries as unknown[]).length, 6);
  assert.equal(result.sourceModelRef?.path, getTalentDrawSourceArtifactRelativePath(TALENT_DRAW_CANONICAL_FEATURE_ID));
}

function testCanonicalTwentyTalentUpdateExpandsAndPreservesInventory(): void {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-talent-draw-"));
  const seedModel = createCanonicalTalentDrawFeatureModel(
    TALENT_DRAW_CANONICAL_FEATURE_ID,
    {
      enabled: true,
      capacity: 15,
      storeSelectedItems: true,
      blockDrawWhenFull: true,
      fullMessage: "Talent inventory full",
      presentation: "persistent_panel",
    },
  );
  const sourcePath = getTalentDrawSourceArtifactRelativePath(TALENT_DRAW_CANONICAL_FEATURE_ID);
  const fullPath = join(hostRoot, sourcePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(seedModel, null, 2)}\n`, "utf-8");

  const result = resolveTalentDrawSourceModel({
    prompt: TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT,
    hostRoot,
    mode: "update",
    featureId: TALENT_DRAW_CANONICAL_FEATURE_ID,
    existingFeature: {
      ...makeActiveFeature(TALENT_DRAW_CANONICAL_FEATURE_ID, [sourcePath]),
      sourceModel: {
        adapter: "talent-draw",
        version: 1,
        path: sourcePath,
      },
    },
  });

  assert.equal(result.blocked, false);
  assert.equal(result.sourceModel?.talents.length, 20);
  assert.equal(result.sourceModel?.inventory?.capacity, 15);
  assert.deepEqual(
    result.sourceModel?.talents.slice(0, 6).map((talent) => talent.id),
    ["R001", "R002", "SR001", "SR002", "SSR001", "UR001"],
  );
  assert.equal(result.sourceModel?.talents.at(-1)?.id, "UR002");
}

function testUnsupportedPromptHonestBlocks(): void {
  const result = resolveTalentDrawSourceModel({
    prompt: "把 talent_draw_demo 改成按 F5 触发的五选一天赋，并支持冲刺与跨局保存。",
    hostRoot: "D:/test-host",
    mode: "update",
    featureId: TALENT_DRAW_CANONICAL_FEATURE_ID,
    existingFeature: makeActiveFeature(TALENT_DRAW_CANONICAL_FEATURE_ID),
  });

  assert.equal(result.handled, true);
  assert.equal(result.blocked, true);
  assert.equal(result.reasons.some((reason) => reason.includes("trigger contract changes")), true);
  assert.equal(result.reasons.some((reason) => reason.includes("selection contract changes")), true);
  assert.equal(result.reasons.some((reason) => reason.includes("new effect family")), true);
}

function testInventoryUpdateStillSupportedOnSourceModel(): void {
  const result = resolveTalentDrawSourceModel({
    prompt: TALENT_DRAW_CANONICAL_UPDATE_PROMPT,
    hostRoot: "D:/test-host",
    mode: "update",
    featureId: TALENT_DRAW_CANONICAL_FEATURE_ID,
    existingFeature: makeActiveFeature(TALENT_DRAW_CANONICAL_FEATURE_ID),
  });

  assert.equal(result.handled, true);
  assert.equal(result.blocked, false);
  assert.equal(result.sourceModel?.inventory?.fullMessage, "Talent inventory full");
}

function runTests(): void {
  testCanonicalCreateSeedsSixTalents();
  testCanonicalTwentyTalentUpdateExpandsAndPreservesInventory();
  testUnsupportedPromptHonestBlocks();
  testInventoryUpdateStillSupportedOnSourceModel();
  console.log("adapters/dota2/cases/talent-draw-adapter.test.ts: PASS");
}

runTests();

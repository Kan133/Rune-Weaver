import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { executeRollback } from "./rollback-execute.js";
import type { RollbackPlan } from "./rollback-plan.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  buildAbilityKvFragmentPath,
} from "../kv/contract.js";
import { parseAbilityBlocks } from "../kv/aggregate-writer.js";
import type { RuneWeaverWorkspace } from "../../../core/workspace/types.js";

function createHostRoot(): string {
  return mkdtempSync(join(tmpdir(), "rw-rollback-execute-"));
}

function writeHostFile(hostRoot: string, relativePath: string, content: string): void {
  const fullPath = join(hostRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
}

function abilityBlock(abilityName: string, scriptFile?: string): string {
  return [
    `"${abilityName}"`,
    "{",
    '  "BaseClass" "ability_lua"',
    `  "ScriptFile" "${scriptFile || `rune_weaver/abilities/${abilityName}`}"`,
    "}",
  ].join("\n");
}

function wrapAggregate(blocks: string[]): string {
  return `"DOTAAbilities"\n{\n${blocks.map((block) => `\t${block.replace(/\n/g, "\n\t")}`).join("\n\n")}\n}\n`;
}

function testExecuteRollbackRematerializesAggregateFromRemainingFragments(): void {
  const hostRoot = createHostRoot();
  const removedFragmentPath = buildAbilityKvFragmentPath("feature_demo", "rw_feature_demo_remove");
  const keptFragmentPath = buildAbilityKvFragmentPath("feature_demo", "rw_feature_demo_keep");

  writeHostFile(hostRoot, removedFragmentPath, abilityBlock("rw_feature_demo_remove"));
  writeHostFile(hostRoot, keptFragmentPath, abilityBlock("rw_feature_demo_keep"));
  writeHostFile(
    hostRoot,
    ABILITY_KV_AGGREGATE_TARGET_PATH,
    wrapAggregate([
      abilityBlock("host_unmanaged", "abilities/host_unmanaged"),
      abilityBlock("rw_feature_demo_keep"),
      abilityBlock("rw_feature_demo_remove"),
    ]),
  );

  const plan: RollbackPlan = {
    featureId: "feature_demo",
    currentRevision: 2,
    filesToDelete: [removedFragmentPath],
    abilityNamesToRemove: ["rw_feature_demo_remove"],
    bridgeEffectsToRefresh: [],
    ownershipValid: true,
    safetyIssues: [],
    canExecute: true,
  };
  const workspace: RuneWeaverWorkspace = {
    version: "0.1",
    hostType: "dota2-x-template",
    hostRoot,
    addonName: "test-host",
    initializedAt: new Date().toISOString(),
    features: [],
  };

  const result = executeRollback(plan, workspace, hostRoot, false, true);
  assert.equal(result.success, true);
  assert.equal(result.deleted.includes(removedFragmentPath), true);
  assert.equal(existsSync(join(hostRoot, removedFragmentPath)), false);

  const aggregateContent = readFileSync(join(hostRoot, ABILITY_KV_AGGREGATE_TARGET_PATH), "utf-8");
  const blocks = parseAbilityBlocks(aggregateContent);
  assert.equal(blocks.has("host_unmanaged"), true);
  assert.equal(blocks.has("rw_feature_demo_keep"), true);
  assert.equal(blocks.has("rw_feature_demo_remove"), false);
}

function testExecuteRollbackRematerializesAggregateForLegacyAbilityWithoutFragmentFile(): void {
  const hostRoot = createHostRoot();
  writeHostFile(
    hostRoot,
    ABILITY_KV_AGGREGATE_TARGET_PATH,
    wrapAggregate([
      abilityBlock("host_unmanaged", "abilities/host_unmanaged"),
      abilityBlock("rw_feature_demo_legacy"),
    ]),
  );

  const synthesizedLegacyFragmentPath = buildAbilityKvFragmentPath("feature_demo", "rw_feature_demo_legacy");
  const plan: RollbackPlan = {
    featureId: "feature_demo",
    currentRevision: 2,
    filesToDelete: [synthesizedLegacyFragmentPath],
    abilityNamesToRemove: ["rw_feature_demo_legacy"],
    bridgeEffectsToRefresh: [],
    ownershipValid: true,
    safetyIssues: [],
    canExecute: true,
  };
  const workspace: RuneWeaverWorkspace = {
    version: "0.1",
    hostType: "dota2-x-template",
    hostRoot,
    addonName: "test-host",
    initializedAt: new Date().toISOString(),
    features: [],
  };

  const result = executeRollback(plan, workspace, hostRoot, false, true);
  assert.equal(result.success, true);
  assert.equal(result.skipped.includes(synthesizedLegacyFragmentPath), true);

  const aggregateContent = readFileSync(join(hostRoot, ABILITY_KV_AGGREGATE_TARGET_PATH), "utf-8");
  const blocks = parseAbilityBlocks(aggregateContent);
  assert.equal(blocks.has("host_unmanaged"), true);
  assert.equal(blocks.has("rw_feature_demo_legacy"), false);
}

testExecuteRollbackRematerializesAggregateFromRemainingFragments();
testExecuteRollbackRematerializesAggregateForLegacyAbilityWithoutFragmentFile();

console.log("adapters/dota2/rollback/rollback-execute.test.ts passed");

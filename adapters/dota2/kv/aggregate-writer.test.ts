import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  materializeAbilityKvAggregate,
  parseAbilityBlocks,
} from "./aggregate-writer.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  buildAbilityKvFragmentPath,
} from "./contract.js";

function createHostRoot(): string {
  return mkdtempSync(join(tmpdir(), "rw-kv-aggregate-"));
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

function testMaterializeAggregatePreservesUnmanagedBlocks(): void {
  const hostRoot = createHostRoot();
  writeHostFile(
    hostRoot,
    ABILITY_KV_AGGREGATE_TARGET_PATH,
    `"DOTAAbilities"\n{\n\t${abilityBlock("host_existing_unmanaged", "abilities/host_existing_unmanaged").replace(/\n/g, "\n\t")}\n}\n`,
  );

  const fragmentPath = buildAbilityKvFragmentPath("feature_demo", "rw_feature_demo_spell");
  const result = materializeAbilityKvAggregate({
    hostRoot,
    pendingFragments: [
      {
        fragmentPath,
        abilityName: "rw_feature_demo_spell",
        content: abilityBlock("rw_feature_demo_spell"),
      },
    ],
  });

  const blocks = parseAbilityBlocks(result.content);
  assert.equal(blocks.has("host_existing_unmanaged"), true);
  assert.equal(blocks.has("rw_feature_demo_spell"), true);
  assert.deepEqual(result.abilityNames, ["rw_feature_demo_spell"]);
  assert.deepEqual(result.fragmentPaths, [fragmentPath]);
}

function testMaterializeAggregateRemovesDeletedManagedFragment(): void {
  const hostRoot = createHostRoot();
  const keptFragmentPath = buildAbilityKvFragmentPath("feature_demo", "rw_feature_demo_keep");
  const removedFragmentPath = buildAbilityKvFragmentPath("feature_demo", "rw_feature_demo_remove");

  writeHostFile(hostRoot, keptFragmentPath, abilityBlock("rw_feature_demo_keep"));
  writeHostFile(hostRoot, removedFragmentPath, abilityBlock("rw_feature_demo_remove"));
  writeHostFile(
    hostRoot,
    ABILITY_KV_AGGREGATE_TARGET_PATH,
    `"DOTAAbilities"\n{\n\t${abilityBlock("host_existing_unmanaged", "abilities/host_existing_unmanaged").replace(/\n/g, "\n\t")}\n\n\t${abilityBlock("rw_feature_demo_keep").replace(/\n/g, "\n\t")}\n\n\t${abilityBlock("rw_feature_demo_remove").replace(/\n/g, "\n\t")}\n}\n`,
  );

  const result = materializeAbilityKvAggregate({
    hostRoot,
    removedFragmentPaths: [removedFragmentPath],
  });

  const blocks = parseAbilityBlocks(result.content);
  assert.equal(blocks.has("host_existing_unmanaged"), true);
  assert.equal(blocks.has("rw_feature_demo_keep"), true);
  assert.equal(blocks.has("rw_feature_demo_remove"), false);
  assert.deepEqual(result.abilityNames, ["rw_feature_demo_keep"]);
  assert.deepEqual(result.fragmentPaths, [keptFragmentPath]);
}

function testMaterializeAggregateRemovesAbilityByNameWithoutFragmentFile(): void {
  const hostRoot = createHostRoot();
  writeHostFile(
    hostRoot,
    ABILITY_KV_AGGREGATE_TARGET_PATH,
    wrapAggregate([
      abilityBlock("host_existing_unmanaged", "abilities/host_existing_unmanaged"),
      abilityBlock("rw_feature_demo_legacy"),
    ]),
  );

  const result = materializeAbilityKvAggregate({
    hostRoot,
    removedAbilityNames: ["rw_feature_demo_legacy"],
  });

  const blocks = parseAbilityBlocks(result.content);
  assert.equal(blocks.has("host_existing_unmanaged"), true);
  assert.equal(blocks.has("rw_feature_demo_legacy"), false);
}

function testMaterializeAggregateNormalizesAggregateTargetPath(): void {
  const hostRoot = createHostRoot();
  const fragmentPath = buildAbilityKvFragmentPath("feature_demo", "rw_feature_demo_spell");
  const result = materializeAbilityKvAggregate({
    hostRoot,
    pendingFragments: [
      {
        fragmentPath,
        abilityName: "rw_feature_demo_spell",
        aggregateTargetPath: "game/scripts/npc/custom_other_abilities.txt",
        content: abilityBlock("rw_feature_demo_spell"),
      },
    ],
  });

  assert.equal(result.aggregateTargetPath, ABILITY_KV_AGGREGATE_TARGET_PATH);
}

testMaterializeAggregatePreservesUnmanagedBlocks();
testMaterializeAggregateRemovesDeletedManagedFragment();
testMaterializeAggregateRemovesAbilityByNameWithoutFragmentFile();
testMaterializeAggregateNormalizesAggregateTargetPath();

console.log("adapters/dota2/kv/aggregate-writer.test.ts passed");

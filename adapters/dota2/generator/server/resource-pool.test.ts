import assert from "node:assert/strict";

import { generateResourcePoolCode } from "./resource-pool.js";
import type { WritePlanEntry } from "../../assembler/index.js";

function createEntry(regen: number = 0): WritePlanEntry {
  return {
    operation: "create",
    targetPath: "game/scripts/src/rune_weaver/generated/shared/feature_resource_pool.ts",
    contentType: "typescript",
    contentSummary: "resource/resource.basic_pool (typescript) params: {}",
    sourcePattern: "resource.basic_pool",
    sourceModule: "resource_pool",
    safe: true,
    parameters: {
      resourceId: "mana",
      maxValue: 150,
      regen,
    },
  };
}

const code = generateResourcePoolCode("FeatureResourcePool", "feature_resource", createEntry());

assert.match(code, /server-local pool state/i);
assert.match(code, /does not promise runtime UI sync/i);
assert.match(code, /does not promise auto-regen behavior/i);
assert.match(code, /consume\(playerId: number, amount: number\): boolean/i);
assert.match(code, /restore\(playerId: number, amount: number\): void/i);
assert.match(code, /getCurrent\(playerId: number\): number/i);
assert.match(code, /getMax\(playerId: number\): number/i);
assert.doesNotMatch(code, /XNetTable/i);
assert.doesNotMatch(code, /syncToClient/i);
assert.doesNotMatch(code, /onTick\(\): void/i);

assert.throws(
  () => generateResourcePoolCode("FeatureResourcePool", "feature_resource", createEntry(2)),
  /resource\.basic_pool only supports regen = 0/i
);

console.log("adapters/dota2/generator/server/resource-pool.test.ts passed");

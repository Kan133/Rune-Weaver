import assert from "node:assert/strict";

import { generateResourceConsumeCode } from "./resource-consume.js";
import type { WritePlanEntry } from "../../assembler/index.js";

function createEntry(failBehavior: string = "block"): WritePlanEntry {
  return {
    operation: "create",
    targetPath: "game/scripts/src/rune_weaver/generated/server/feature_resource_consume.ts",
    contentType: "typescript",
    contentSummary: "effect/effect.resource_consume (typescript) params: {}",
    sourcePattern: "effect.resource_consume",
    sourceModule: "resource_cost_consumer",
    safe: true,
    parameters: {
      amount: 50,
      resourceType: "mana",
      failBehavior,
    },
    metadata: {
      resourcePoolImportPath: "../shared/feature_resource_pool.js",
      resourcePoolTargetPath: "game/scripts/src/rune_weaver/generated/shared/feature_resource_pool.ts",
      resourcePoolClassName: "FeatureResourcePool",
      resourcePoolResourceId: "mana",
      resourceCostComposition: "feature-local-auto-bind",
    },
  };
}

{
  const code = generateResourceConsumeCode(
    "FeatureResourceConsume",
    "feature_resource",
    createEntry("block")
  );

  assert.match(code, /\* - failBehavior: "block"/i);
  assert.doesNotMatch(code, /normalized to "block"/i);
}

{
  const code = generateResourceConsumeCode(
    "FeatureResourceConsume",
    "feature_resource",
    createEntry("report")
  );

  assert.match(code, /\* - failBehavior: "report"/i);
  assert.match(code, /if \(this\.failBehavior === "report"\)/i);
  assert.doesNotMatch(code, /normalized to "block"/i);
}

assert.throws(
  () => generateResourceConsumeCode("FeatureResourceConsume", "feature_resource", createEntry("soft-block")),
  /effect\.resource_consume only supports failBehavior "block" or "report"/i
);

console.log("adapters/dota2/generator/server/resource-consume.test.ts passed");

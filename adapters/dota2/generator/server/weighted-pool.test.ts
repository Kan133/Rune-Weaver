import assert from "node:assert/strict";

import { generateWeightedPoolCode } from "./weighted-pool.js";
import type { WritePlanEntry } from "../../assembler/index.js";

function createEntry(): WritePlanEntry {
  return {
    operation: "create",
    targetPath: "game/scripts/src/rune_weaver/generated/shared/talent_draw_demo_weighted_pool_data_weighted_pool.ts",
    contentType: "typescript",
    contentSummary: "data.weighted_pool (typescript) params: {}",
    sourcePattern: "data.weighted_pool",
    sourceModule: "weighted_pool",
    safe: true,
    parameters: {
      entries: [
        { id: "r_1", label: "R1", description: "Rare 1", weight: 50, tier: "R" },
        { id: "sr_1", label: "SR1", description: "Super Rare 1", weight: 30, tier: "SR" },
        { id: "ssr_1", label: "SSR1", description: "SSR 1", weight: 20, tier: "SSR" },
      ],
      choiceCount: 3,
      drawMode: "multiple_without_replacement",
      duplicatePolicy: "forbid",
      poolStateTracking: "session",
    },
  };
}

const code = generateWeightedPoolCode(
  "TalentDrawWeightedPool",
  "talent_draw_demo",
  createEntry(),
);

assert.match(code, /drawForSelection\(count: number = 3\): T\[] \{/);
assert.match(code, /this\.sessionState\.currentChoiceIds = result\.map/);
assert.match(code, /return result;\s*\n  }\s*\n/);
assert.doesNotMatch(
  code,
  /\n    }\s*\n\s*}\s*\n\s*\n\s*\/\/ Update currentChoiceIds in session state/,
);

console.log("adapters/dota2/generator/server/weighted-pool.test.ts passed");

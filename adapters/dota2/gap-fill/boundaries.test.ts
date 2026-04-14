import assert from "assert";

import {
  resolveDota2GapFillBoundariesForPatterns,
  resolveDota2GapFillBoundaryIdsForPatterns,
} from "./boundaries.js";

const ids = resolveDota2GapFillBoundaryIdsForPatterns([
  "input.key_binding",
  "data.weighted_pool",
  "rule.selection_flow",
  "ui.selection_modal",
]);

assert.deepStrictEqual(ids, [
  "weighted_pool.selection_policy",
  "selection_flow.effect_mapping",
  "ui.selection_modal.payload_adapter",
]);

const boundaries = resolveDota2GapFillBoundariesForPatterns([
  "data.weighted_pool",
  "rule.selection_flow",
]);

assert.deepStrictEqual(
  boundaries.map((boundary) => boundary.id),
  [
    "weighted_pool.selection_policy",
    "selection_flow.effect_mapping",
  ],
);

console.log("dota2 gap-fill boundary mapping tests passed");

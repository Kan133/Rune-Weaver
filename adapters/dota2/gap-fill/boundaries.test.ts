import assert from "assert";

import {
  resolveDota2GapFillBoundariesForPatterns,
  resolveDota2GapFillBoundaryIdsForPatterns,
} from "./boundaries.js";

const ids = resolveDota2GapFillBoundaryIdsForPatterns([
  "input.key_binding",
  "data.weighted_pool",
  "effect.outcome_realizer",
  "ui.selection_modal",
]);

assert.deepStrictEqual(ids, [
  "weighted_pool.selection_policy",
  "selection_outcome.realization",
  "ui.selection_modal.payload_adapter",
]);

const boundaries = resolveDota2GapFillBoundariesForPatterns([
  "data.weighted_pool",
  "effect.outcome_realizer",
]);

assert.deepStrictEqual(
  boundaries.map((boundary) => boundary.id),
  [
    "weighted_pool.selection_policy",
    "selection_outcome.realization",
  ],
);

console.log("dota2 gap-fill boundary mapping tests passed");

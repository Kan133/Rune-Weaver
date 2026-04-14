import assert from "assert";

import { validateAppliedGapFill } from "./index.js";

const boundary = {
  id: "selection_flow.effect_mapping",
  label: "Selection flow effect mapping",
  filePath: "adapters/dota2/generator/server/selection-flow.ts",
  anchor: "GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
  allowed: ["rarity_formula"],
  forbidden: ["wiring"],
};

function main(): void {
  const ok = validateAppliedGapFill({
    boundary,
    request: {
      mode: "apply",
      requestedBoundaryId: boundary.id,
      approvedBoundaryId: boundary.id,
      targetFile: boundary.filePath,
    },
    patchPlan: {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Tighten rarity mapping",
      operations: [
        {
          kind: "replace",
          target: "line 0120",
          reason: "Clarify rarity fallback logic near the boundary",
          replacement: "const rarity = option.tier || DEFAULT_RARITY;",
        },
      ],
    },
    applyResult: {
      requested: true,
      attempted: true,
      success: true,
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      targetPath: boundary.filePath,
      appliedOperations: ["replace line 0120"],
      issues: [],
    },
    decision: {
      decision: "auto_apply",
      riskLevel: "low",
      reasons: [],
      userSummary: "Small in-boundary patch; safe enough for direct apply.",
      canApplyDirectly: true,
      failureCategories: [],
    },
  });
  assert.strictEqual(ok.success, true);
  assert.strictEqual(ok.issues.length, 0);

  const mismatch = validateAppliedGapFill({
    boundary,
    request: {
      mode: "apply",
      requestedBoundaryId: "weighted_pool.selection_policy",
      approvedBoundaryId: boundary.id,
      targetFile: boundary.filePath,
    },
    patchPlan: {
      boundaryId: boundary.id,
      targetFile: "adapters/dota2/generator/server/weighted-pool.ts",
      summary: "Wrong target",
      operations: [],
    },
  });
  assert.strictEqual(mismatch.success, false);
  assert.ok(mismatch.failureCategories.includes("write_mismatch"));

  console.log("gap-fill validation tests passed");
}

main();

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
  assert.ok(ok.checks.some((check) => check.id === "applied_patch_present" && check.passed));

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

  const missingPatch = validateAppliedGapFill({
    boundary,
    request: {
      mode: "validate-applied",
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
          target: "line 0003",
          reason: "Clarify rarity fallback logic near the boundary",
          replacement: "const rarity = option.tier || DEFAULT_RARITY;",
        },
      ],
    },
    currentTargetFile: {
      path: boundary.filePath,
      content: [
        "export const a = 1;",
        "// GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
        "const rarity = option.tier || \"R\";",
      ].join("\n"),
      lineCount: 3,
      sizeBytes: 96,
    },
  });
  assert.strictEqual(missingPatch.success, false);
  assert.ok(missingPatch.checks.some((check) => check.id === "applied_patch_present" && !check.passed));

  const longerReplacement = validateAppliedGapFill({
    boundary,
    request: {
      mode: "validate-applied",
      requestedBoundaryId: boundary.id,
      approvedBoundaryId: boundary.id,
      targetFile: boundary.filePath,
    },
    patchPlan: {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Expand a single-line range into a multi-line replacement",
      operations: [
        {
          kind: "replace",
          target: "line 0002",
          reason: "Replace the anchored line with a longer approved block",
          replacement: [
            "// GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
            "const rarity = option.tier || DEFAULT_RARITY;",
            "return rarity;",
          ].join("\n"),
        },
      ],
    },
    currentTargetFile: {
      path: boundary.filePath,
      content: [
        "export const a = 1;",
        "// GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
        "const rarity = option.tier || DEFAULT_RARITY;",
        "return rarity;",
      ].join("\n"),
      lineCount: 4,
      sizeBytes: 120,
    },
  });
  assert.strictEqual(longerReplacement.success, true);
  assert.ok(longerReplacement.checks.some((check) => check.id === "applied_patch_present" && check.passed));

  console.log("gap-fill validation tests passed");
}

main();

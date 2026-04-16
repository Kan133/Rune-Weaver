import assert from "assert";

import {
  createGapFillApprovalToken,
  formatGapFillApprovalSummary,
  validateGapFillApprovalRecord,
} from "./index.js";

const boundary = {
  id: "selection_flow.effect_mapping",
  label: "Selection flow effect mapping",
  filePath: "adapters/dota2/generator/server/selection-flow.ts",
  anchor: "GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
  allowed: ["rarity_formula"],
  forbidden: ["wiring"],
};

const targetFile = {
  path: boundary.filePath,
  content: [
    "export const a = 1;",
    "// GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
    "const rarity = option.tier || \"R\";",
  ].join("\n"),
  lineCount: 3,
  sizeBytes: 96,
};

const patchPlan = {
  boundaryId: boundary.id,
  targetFile: boundary.filePath,
  summary: "Rewrite several lines",
  operations: [
    {
      kind: "replace" as const,
      target: "lines 0002-0004",
      reason: "Expand the local formula explanation near the boundary",
      replacement: Array.from({ length: 13 }, (_, index) => `const line${index} = ${index};`).join("\n"),
    },
  ],
};

  const decision = {
    decision: "require_confirmation" as const,
    riskLevel: "medium" as const,
    reasons: [{ code: "large_replacement", category: "approval_required" as const, message: "Replacement exceeds the auto-apply limit." }],
    userSummary: "Patch stays within the boundary, but it is large or complex enough to require confirmation.",
    canApplyDirectly: false,
    failureCategories: ["approval_required" as const],
  };

function main(): void {
  const { record } = createGapFillApprovalToken({
    hostRoot: "D:/Rune Weaver",
    boundaryId: boundary.id,
    instruction: "expand the local formula explanation",
    targetFile,
    patchPlan,
    decision,
  });

  assert.strictEqual(record.kind, "gap-fill-approval");
  assert.strictEqual(record.version, "1.0");
  assert.strictEqual(record.boundaryId, boundary.id);
  assert.strictEqual(record.targetFile, boundary.filePath);
  assert.strictEqual(record.decision.decision, "require_confirmation");
  assert.deepStrictEqual(record.decision.failureCategories, ["approval_required"]);
  assert.ok(record.approvalId.length > 0);
  assert.ok(record.targetFileHash.length > 0);
  assert.ok(record.patchPlanHash.length > 0);
  assert.ok(formatGapFillApprovalSummary(record).includes("Approval ID:"));

  const valid = validateGapFillApprovalRecord({
    record,
    hostRoot: "D:/Rune Weaver",
    boundary,
    targetFile,
  });
  assert.strictEqual(valid.valid, true);
  assert.deepStrictEqual(valid.issues, []);

  const changedTarget = validateGapFillApprovalRecord({
    record,
    hostRoot: "D:/Rune Weaver",
    boundary,
    targetFile: { ...targetFile, content: `${targetFile.content}\nconst changed = true;` },
  });
  assert.strictEqual(changedTarget.valid, false);
  assert.ok(changedTarget.issues.some((issue) => issue.includes("content has changed")));

  const changedTargetAllowed = validateGapFillApprovalRecord({
    record,
    hostRoot: "D:/Rune Weaver",
    boundary,
    targetFile: { ...targetFile, content: `${targetFile.content}\nconst changed = true;` },
    allowTargetFileHashChange: true,
  });
  assert.strictEqual(changedTargetAllowed.valid, true);
  assert.deepStrictEqual(changedTargetAllowed.issues, []);

  const wrongHost = validateGapFillApprovalRecord({
    record,
    hostRoot: "D:/Other Host",
    boundary,
    targetFile,
  });
  assert.strictEqual(wrongHost.valid, false);
  assert.ok(wrongHost.issues.some((issue) => issue.includes("does not match current host")));

  console.log("gap-fill approval tests passed");
}

main();

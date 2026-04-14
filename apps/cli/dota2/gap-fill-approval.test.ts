import assert from "assert";
import { existsSync, mkdirSync, rmSync } from "fs";
import { basename, join } from "path";

import { createGapFillApprovalToken } from "../../../core/gap-fill/index.js";
import { loadGapFillApprovalRecord, saveGapFillApprovalRecord } from "./gap-fill-approval.js";

const TEST_BASE = join(process.cwd(), "tmp", "test-gap-fill-approval");

function cleanup(): void {
  if (existsSync(TEST_BASE)) {
    rmSync(TEST_BASE, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  cleanup();
  mkdirSync(TEST_BASE, { recursive: true });
  const originalCwd = process.cwd();
  process.chdir(TEST_BASE);

  try {
    const { record } = createGapFillApprovalToken({
      hostRoot: "C:/hosts/dota2",
      boundaryId: "selection_flow.effect_mapping",
      instruction: "expand the local formula explanation",
      targetFile: {
        path: "adapters/dota2/generator/server/selection-flow.ts",
        content: "const rarity = option.tier || \"R\";",
        lineCount: 1,
        sizeBytes: 34,
      },
      patchPlan: {
        boundaryId: "selection_flow.effect_mapping",
        targetFile: "adapters/dota2/generator/server/selection-flow.ts",
        summary: "Rewrite several lines",
        operations: [
          {
            kind: "replace",
            target: "line 0001",
            reason: "Expand the local formula explanation near the boundary",
            replacement: "const rarity = option.tier || DEFAULT_RARITY;",
          },
        ],
      },
      decision: {
        decision: "require_confirmation",
        riskLevel: "medium",
        reasons: [{ code: "large_replacement", message: "Replacement exceeds the auto-apply limit." }],
        userSummary: "Patch stays within the boundary, but it is large or complex enough to require confirmation.",
        canApplyDirectly: false,
      },
    });

    const savedPath = saveGapFillApprovalRecord(record);
    assert.ok(savedPath.includes(join("tmp", "cli-review")));
    assert.ok(basename(savedPath).startsWith("gap-fill-approval-"));

    const loaded = loadGapFillApprovalRecord(savedPath);
    assert.strictEqual(loaded.approvalId, record.approvalId);
    assert.strictEqual(loaded.boundaryId, record.boundaryId);
    assert.strictEqual(loaded.patchPlanHash, record.patchPlanHash);
    console.log("gap-fill approval persistence tests passed");
  } finally {
    process.chdir(originalCwd);
    cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

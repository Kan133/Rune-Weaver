import assert from "assert";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { applyGapFillPatchPlan } from "./apply.js";
import type { GapFillBoundaryInfo, GapFillPatchPlan } from "./types.js";

const TEST_ROOT = join(process.cwd(), "tmp", "gap-fill-apply-test");

function setupGeneratorFile(): { boundary: GapFillBoundaryInfo; targetPath: string } {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }

  mkdirSync(join(TEST_ROOT, "adapters", "dota2", "generator", "server"), { recursive: true });

  const targetPath = join(TEST_ROOT, "adapters", "dota2", "generator", "server", "selection-flow.ts");
  writeFileSync(
    targetPath,
    [
      "export const a = 1;",
      "// GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
      "const rarity = option.tier || \"R\";",
      "const value = map[rarity];",
      "export const z = 9;",
    ].join("\n"),
    "utf-8",
  );

  return {
    boundary: {
      id: "selection_flow.effect_mapping",
      label: "Selection flow effect mapping",
      filePath: "adapters/dota2/generator/server/selection-flow.ts",
      anchor: "GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
      allowed: ["rarity_formula"],
      forbidden: ["wiring"],
    },
    targetPath,
  };
}

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const { boundary, targetPath } = setupGeneratorFile();

  try {
    const successPlan: GapFillPatchPlan = {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Exercise supported apply operations",
      operations: [
        {
          kind: "insert_before",
          target: "line 0002",
          reason: "Add a helper line before the anchor",
          replacement: "const prep = true;",
        },
        {
          kind: "replace",
          target: "line 0003",
          reason: "Tighten the rarity fallback",
          replacement: "const rarity = option.tier || \"SR\";",
        },
        {
          kind: "insert_after",
          target: "line 0004",
          reason: "Keep a trace line after the mapping",
          replacement: "const after = value;",
        },
        {
          kind: "delete",
          target: "line 0005",
          reason: "Remove the terminal stub",
        },
      ],
    };

    const successResult = applyGapFillPatchPlan({
      projectRoot: TEST_ROOT,
      boundary,
      patchPlan: successPlan,
    });

    assert.strictEqual(successResult.success, true);
    assert.strictEqual(successResult.appliedOperations.length, 4);
    assert.ok(successResult.appliedOperations.includes("insert_before line 0002"));
    assert.ok(successResult.appliedOperations.includes("replace line 0003"));
    assert.ok(successResult.appliedOperations.includes("insert_after line 0004"));
    assert.ok(successResult.appliedOperations.includes("delete line 0005"));

    const updated = readFileSync(targetPath, "utf-8");
    assert.ok(updated.includes("const prep = true;"));
    assert.ok(updated.includes('const rarity = option.tier || "SR";'));
    assert.ok(updated.includes("const after = value;"));
    assert.ok(!updated.includes("export const z = 9;"));

    const badFormatPlan: GapFillPatchPlan = {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Reject unsupported target syntax",
      operations: [
        {
          kind: "replace",
          target: "row 0003",
          reason: "Invalid target syntax should fail",
          replacement: "const rarity = option.tier || \"UR\";",
        },
      ],
    };

    const badFormatResult = applyGapFillPatchPlan({
      projectRoot: TEST_ROOT,
      boundary,
      patchPlan: badFormatPlan,
    });

    assert.strictEqual(badFormatResult.success, false);
    assert.ok(badFormatResult.issues[0]?.includes("Unsupported target format"));

    const missingReplacementPlan: GapFillPatchPlan = {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Reject missing replacement",
      operations: [
        {
          kind: "insert_before",
          target: "line 0002",
          reason: "Missing replacement should fail",
        },
      ],
    };

    const missingReplacementResult = applyGapFillPatchPlan({
      projectRoot: TEST_ROOT,
      boundary,
      patchPlan: missingReplacementPlan,
    });

    assert.strictEqual(missingReplacementResult.success, false);
    assert.ok(missingReplacementResult.issues[0]?.includes("missing replacement text"));

    const outsideWindowPlan: GapFillPatchPlan = {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Reject far away edits",
      operations: [
        {
          kind: "replace",
          target: "line 0300",
          reason: "Far away line should fail",
          replacement: "const farAway = true;",
        },
      ],
    };

    const outsideWindowResult = applyGapFillPatchPlan({
      projectRoot: TEST_ROOT,
      boundary,
      patchPlan: outsideWindowPlan,
    });

    assert.strictEqual(outsideWindowResult.success, false);
    assert.ok(outsideWindowResult.issues[0]?.includes("outside the allowed boundary window"));

    const outsideGeneratorBoundary: GapFillBoundaryInfo = {
      id: "escape.boundary",
      label: "Escape boundary",
      filePath: "adapters/dota2/realization/escape.ts",
      anchor: "GAP_FILL_BOUNDARY: escape.boundary",
      allowed: ["nothing"],
      forbidden: ["everything"],
    };

    mkdirSync(join(TEST_ROOT, "adapters", "dota2", "realization"), { recursive: true });
    writeFileSync(
      join(TEST_ROOT, "adapters", "dota2", "realization", "escape.ts"),
      [
        "export const x = 1;",
        "// GAP_FILL_BOUNDARY: escape.boundary",
      ].join("\n"),
      "utf-8",
    );

    const outsideGeneratorResult = applyGapFillPatchPlan({
      projectRoot: TEST_ROOT,
      boundary: outsideGeneratorBoundary,
      patchPlan: {
        boundaryId: outsideGeneratorBoundary.id,
        targetFile: outsideGeneratorBoundary.filePath,
        summary: "Reject non-generator file",
        operations: [
          {
            kind: "replace",
            target: "line 0001",
            reason: "Non-generator path should fail",
            replacement: "export const y = 2;",
          },
        ],
      },
    });

    assert.strictEqual(outsideGeneratorResult.success, false);
    assert.ok(outsideGeneratorResult.issues[0]?.includes("generator source tree"));

    console.log("gap-fill apply tests passed");
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

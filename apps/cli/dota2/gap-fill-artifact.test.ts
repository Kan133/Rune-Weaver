import assert from "assert";
import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { basename, join } from "path";

import { buildGapFillArtifact } from "../../../core/gap-fill/index.js";
import { persistGapFillArtifact } from "./gap-fill-artifact.js";

const TEST_BASE = join(process.cwd(), "tmp", "test-gap-fill-artifact");

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
      content: "export const a = 1;\n// GAP_FILL_BOUNDARY: selection_flow.effect_mapping\n",
      lineCount: 2,
      sizeBytes: 72,
    };

    const runResult = {
      success: true,
      summary: "Patch plan covers the rarity fallback near the boundary",
      promptMessages: [],
      patchPlan: {
        boundaryId: boundary.id,
        targetFile: boundary.filePath,
        summary: "Replace fallback token",
        operations: [
          {
            kind: "replace" as const,
            target: "line 0002",
            reason: "Tighten the rarity fallback",
            replacement: "const rarity = option.tier || \"SR\";",
          },
        ],
      },
      issues: [],
    };

    const applyResult = {
      success: true,
      targetPath: targetFile.path,
      appliedOperations: ["replace line 0002"],
      issues: [],
    };

    const artifact = buildGapFillArtifact({
      hostRoot: "C:/hosts/dota2",
      instruction: "Adjust the rarity fallback for the selection flow.",
      boundary,
      targetFile,
      llmConfigured: true,
      llmProvider: "openai-compatible",
      llmModel: "gpt-4.1",
      llmTemperature: 0.2,
      runResult,
      applyRequested: true,
      applyResult,
    });

    assert.strictEqual(artifact.boundaryId, boundary.id);
    assert.strictEqual(artifact.hostRoot, "C:/hosts/dota2");
    assert.strictEqual(artifact.instruction, "Adjust the rarity fallback for the selection flow.");
    assert.strictEqual(artifact.targetFile, targetFile.path);
    assert.deepStrictEqual(artifact.allowed, boundary.allowed);
    assert.deepStrictEqual(artifact.forbidden, boundary.forbidden);
    assert.strictEqual(artifact.llm.provider, "openai-compatible");
    assert.strictEqual(artifact.llm.model, "gpt-4.1");
    assert.strictEqual(artifact.decision.decision, "auto_apply");
    assert.strictEqual(artifact.dryRun.summary, runResult.summary);
    assert.deepStrictEqual(artifact.dryRun.patchPlan, runResult.patchPlan);
    assert.deepStrictEqual(artifact.runnerIssues, []);
    assert.strictEqual(artifact.apply.requested, true);
    assert.strictEqual(artifact.apply.success, true);
    assert.deepStrictEqual(artifact.apply.issues, []);

    const outputPath = persistGapFillArtifact({
      hostRoot: "C:/hosts/dota2",
      instruction: "Adjust the rarity fallback for the selection flow.",
      boundary,
      targetFile,
      llmConfigured: true,
      llmProvider: "openai-compatible",
      llmModel: "gpt-4.1",
      llmTemperature: 0.2,
      runResult,
      applyRequested: true,
      applyResult,
    });

    assert.ok(outputPath.includes(join("tmp", "cli-review")));
    assert.ok(basename(outputPath).startsWith("gap-fill-"));
    assert.ok(basename(outputPath).endsWith(".json"));
    assert.ok(existsSync(outputPath));

    const saved = JSON.parse(readFileSync(outputPath, "utf-8"));
    assert.strictEqual(saved.boundaryId, boundary.id);
    assert.strictEqual(saved.hostRoot, "C:/hosts/dota2");
    assert.strictEqual(saved.dryRun.summary, runResult.summary);
    assert.strictEqual(saved.apply.requested, true);
    assert.strictEqual(saved.apply.success, true);

    console.log("gap-fill artifact test passed");
  } finally {
    process.chdir(originalCwd);
    cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

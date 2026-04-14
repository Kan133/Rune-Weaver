import assert from "assert";

import { buildGapFillArtifact } from "./index.js";

function main(): void {
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
    mode: "apply",
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
  assert.strictEqual(artifact.mode, "apply");
  assert.strictEqual(artifact.hostRoot, "C:/hosts/dota2");
  assert.strictEqual(artifact.instruction, "Adjust the rarity fallback for the selection flow.");
  assert.strictEqual(artifact.targetFile, targetFile.path);
  assert.deepStrictEqual(artifact.allowed, boundary.allowed);
  assert.deepStrictEqual(artifact.forbidden, boundary.forbidden);
  assert.strictEqual(artifact.llm.provider, "openai-compatible");
  assert.strictEqual(artifact.llm.model, "gpt-4.1");
  assert.strictEqual(artifact.descriptor.status, "ready");
  assert.strictEqual(artifact.decisionRecord.requestedBoundaryId, boundary.id);
  assert.strictEqual(artifact.decision.decision, "auto_apply");
  assert.ok(artifact.decision.failureCategories.length === 0);
  assert.strictEqual(artifact.gapFillStatus, "ready_to_apply");
  assert.strictEqual(artifact.dryRun.summary, runResult.summary);
  assert.deepStrictEqual(artifact.dryRun.patchPlan, runResult.patchPlan);
  assert.deepStrictEqual(artifact.runnerIssues, []);
  assert.strictEqual(artifact.apply.requested, true);
  assert.strictEqual(artifact.apply.attempted, true);
  assert.strictEqual(artifact.apply.success, true);
  assert.deepStrictEqual(artifact.apply.issues, []);
  assert.strictEqual(artifact.validation.success, true);
  console.log("gap-fill review tests passed");
}

main();

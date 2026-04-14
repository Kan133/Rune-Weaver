import assert from "assert";

import { runGapFillPlan } from "./runner.js";
import type { GapFillBoundaryInfo } from "./types.js";
import type { LLMClient } from "../llm/index.js";

const boundary: GapFillBoundaryInfo = {
  id: "demo.boundary",
  label: "Demo boundary",
  filePath: "demo/demo.ts",
  anchor: "GAP_FILL_BOUNDARY: demo.boundary",
  allowed: ["replacement"],
  forbidden: ["wiring"],
};

const llmClient: LLMClient = {
  async generateText() {
    throw new Error("not used");
  },
  async generateObject<T>() {
    return {
        object: {
          boundaryId: boundary.id,
          targetFile: boundary.filePath,
          summary: "Replace the stub with a constant export",
          operations: [
            {
              kind: "replace",
              target: "lines 2-4",
              reason: "Replace the stubbed block with the requested behavior",
              replacement: "export const value = 2;",
            },
        ],
      } as T,
        rawText: JSON.stringify({
          boundaryId: boundary.id,
          targetFile: boundary.filePath,
          summary: "Replace the stub with a constant export",
          operations: [
            {
              kind: "replace",
              target: "lines 2-4",
              reason: "Replace the stubbed block with the requested behavior",
              replacement: "export const value = 2;",
            },
        ],
      }),
    };
  },
};

async function main(): Promise<void> {
  const successResult = await runGapFillPlan(
    {
      projectRoot: process.cwd(),
      hostRoot: "D:\\demo-host",
      llmConfigured: true,
      instruction: "Replace the stub with a constant export.",
      boundary,
      targetFile: {
        path: boundary.filePath,
        content: [
          "export const value = 1;",
          "// GAP_FILL_BOUNDARY: demo.boundary",
          "export function stub() {",
          "  return value;",
          "}",
        ].join("\n"),
        lineCount: 5,
        sizeBytes: 0,
      },
    },
    { llmClient },
  );

  assert.strictEqual(successResult.success, true);
  assert.ok(successResult.patchPlan);
  assert.strictEqual(successResult.patchPlan?.operations.length, 1);

  const badClient: LLMClient = {
    async generateText() {
      throw new Error("not used");
    },
    async generateObject<T>() {
      return {
        object: {
          boundaryId: boundary.id,
          targetFile: boundary.filePath,
          summary: "bad plan",
          operations: [],
        } as T,
      };
    },
  };

  const failureResult = await runGapFillPlan(
    {
      projectRoot: process.cwd(),
      hostRoot: "D:\\demo-host",
      llmConfigured: true,
      instruction: "This should fail validation.",
      boundary,
      targetFile: {
        path: boundary.filePath,
        content: "export const value = 1;",
        lineCount: 1,
        sizeBytes: 23,
      },
    },
    { llmClient: badClient },
  );

  assert.strictEqual(failureResult.success, false);
  assert.ok(failureResult.issues.length > 0);
  console.log("gap-fill runner tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

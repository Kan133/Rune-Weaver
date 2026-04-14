import type { LLMClient } from "../llm/index.js";
import type {
  GapFillPatchPlan,
  GapFillPromptContext,
  GapFillRunInput,
  GapFillRunResult,
} from "./types.js";

export interface GapFillRunnerDeps {
  llmClient: LLMClient;
}

const GAP_FILL_TARGET_PATTERN = /^(line\s+\d{1,6}|lines\s+\d{1,6}-\d{1,6})$/i;

const GAP_FILL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["boundaryId", "targetFile", "summary", "operations"],
  properties: {
    boundaryId: { type: "string" },
    targetFile: { type: "string" },
    summary: { type: "string" },
    operations: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "target", "reason"],
        properties: {
          kind: {
            type: "string",
            enum: ["replace", "insert_before", "insert_after", "delete"],
          },
          target: { type: "string" },
          reason: { type: "string" },
          excerpt: { type: "string" },
          replacement: { type: "string" },
        },
      },
    },
    notes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export async function runGapFillPlan(
  input: GapFillRunInput,
  deps: GapFillRunnerDeps,
): Promise<GapFillRunResult> {
  const promptContext: GapFillPromptContext = {
    boundary: input.boundary,
    hostRoot: input.hostRoot,
    instruction: input.instruction,
    targetFile: input.targetFile,
  };

  const promptMessages = buildPromptMessages(promptContext);
  const result: GapFillRunResult = {
    success: false,
    summary: "",
    promptMessages,
    issues: [],
  };

  const response = await deps.llmClient.generateObject<GapFillPatchPlan>({
    messages: promptMessages,
    schemaName: "gap-fill.patch-plan",
    schemaDescription: "Dry-run patch plan for a single Dota2 gap-fill boundary.",
    schema: GAP_FILL_SCHEMA,
    temperature: input.llmTemperature,
    maxTokens: 1400,
    providerOptions: input.llmProviderOptions,
  });

  result.rawModelText = response.rawText;

  if (!isValidGapFillPatchPlan(response.object)) {
    result.issues.push("LLM output did not match the gap-fill patch plan shape");
    result.summary = "Invalid LLM output";
    return result;
  }

  if (response.object.boundaryId !== input.boundary.id) {
    result.issues.push(`LLM returned boundaryId '${response.object.boundaryId}', expected '${input.boundary.id}'`);
    result.summary = "Invalid LLM output";
    return result;
  }

  if (response.object.targetFile !== input.targetFile.path) {
    result.issues.push(`LLM returned targetFile '${response.object.targetFile}', expected '${input.targetFile.path}'`);
    result.summary = "Invalid LLM output";
    return result;
  }

  result.success = true;
  result.patchPlan = response.object;
  result.summary = summarizePlan(response.object);
  return result;
}

export function formatGapFillConsoleSummary(input: GapFillRunInput, result: GapFillRunResult): string {
  const lines = [
    "=".repeat(70),
    "Rune Weaver - Dota2 Gap Fill Dry-Run",
    "=".repeat(70),
    `Boundary: ${input.boundary.id}`,
    `Target file: ${input.targetFile.path}`,
    `Host root: ${input.hostRoot}`,
    `LLM configured: ${input.llmConfigured ? "yes" : "no"}`,
    `Allowed: ${input.boundary.allowed.join(", ")}`,
    `Forbidden: ${input.boundary.forbidden.join(", ")}`,
    `Summary: ${result.summary || "(none)"}`,
  ];

  if (result.patchPlan) {
    lines.push("Patch plan:");
    for (const [index, operation] of result.patchPlan.operations.entries()) {
      lines.push(`  ${index + 1}. ${operation.kind} -> ${operation.target}`);
      lines.push(`     ${operation.reason}`);
    }
    if (result.patchPlan.notes && result.patchPlan.notes.length > 0) {
      lines.push("Notes:");
      for (const note of result.patchPlan.notes) {
        lines.push(`  - ${note}`);
      }
    }
  }

  if (result.issues.length > 0) {
    lines.push("Issues:");
    for (const issue of result.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  return lines.join("\n");
}

function buildPromptMessages(context: GapFillPromptContext) {
  const numberedContent = context.targetFile.content
    .split(/\r?\n/)
    .map((line, index) => `${String(index + 1).padStart(4, "0")}: ${line}`)
    .join("\n");

  return [
    {
      role: "system" as const,
      content: [
        "You are a surgical patch planner for Rune Weaver gap-fill work.",
        "Return only one JSON object that matches the schema.",
        "Do not use markdown fences or commentary outside JSON.",
        "Only modify code inside the declared boundary or immediately adjacent to the anchor comment.",
        "Never touch host wiring, imports, exports, contracts, lifecycle code, or unrelated call sites.",
        "Keep the plan minimal and explicit.",
        "Each operation.target must use one of these exact formats: 'line 0157' or 'lines 0052-0065'.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        `Boundary ID: ${context.boundary.id}`,
        `Boundary label: ${context.boundary.label}`,
        `Boundary anchor: ${context.boundary.anchor}`,
        `Host root: ${context.hostRoot}`,
        `Target file: ${context.targetFile.path}`,
        `Allowed: ${context.boundary.allowed.join(", ")}`,
        `Forbidden: ${context.boundary.forbidden.join(", ")}`,
        "",
        "Instruction:",
        context.instruction,
        "",
        "Target file content (line-numbered):",
        numberedContent,
        "",
        "Return at least one patch operation.",
        "Do not use raw code excerpts as operation.target.",
      ].join("\n"),
    },
  ];
}

function isValidGapFillPatchPlan(value: unknown): value is GapFillPatchPlan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const plan = value as Record<string, unknown>;
  if (
    typeof plan.boundaryId !== "string" ||
    typeof plan.targetFile !== "string" ||
    typeof plan.summary !== "string" ||
    !Array.isArray(plan.operations) ||
    plan.operations.length === 0
  ) {
    return false;
  }

  return plan.operations.every((operation) => {
    if (!operation || typeof operation !== "object") {
      return false;
    }
    const op = operation as Record<string, unknown>;
    const allowedKinds = new Set(["replace", "insert_before", "insert_after", "delete"]);
      return (
        typeof op.kind === "string" &&
        allowedKinds.has(op.kind) &&
        typeof op.target === "string" &&
        op.target.trim().length > 0 &&
        GAP_FILL_TARGET_PATTERN.test(op.target.trim()) &&
        typeof op.reason === "string" &&
        op.reason.trim().length > 0
      );
  });
}

function summarizePlan(plan: GapFillPatchPlan): string {
  const operationList = plan.operations.map((operation) => `${operation.kind}:${operation.target}`).join(", ");
  return `${plan.summary}${operationList ? ` [${operationList}]` : ""}`;
}

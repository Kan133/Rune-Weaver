import { readFileSync, writeFileSync } from "fs";
import { isAbsolute, normalize, relative, resolve } from "path";

import type {
  GapFillBoundaryInfo,
  GapFillApplyResult,
  GapFillPatchOperation,
  GapFillPatchPlan,
} from "./types.js";

const LINE_TARGET_PATTERN = /^line\s+0*(\d{1,6})$/i;
const LINES_TARGET_PATTERN = /^lines\s+0*(\d{1,6})-0*(\d{1,6})$/i;
const DEFAULT_BOUNDARY_WINDOW = 120;
const REPO_GENERATOR_ROOT = normalize("adapters/dota2/generator");

export interface GapFillApplyInput {
  projectRoot: string;
  boundary: GapFillBoundaryInfo;
  patchPlan: GapFillPatchPlan;
}

interface ParsedTargetRange {
  startLine: number;
  endLine: number;
}

export function applyGapFillPatchPlan(input: GapFillApplyInput): GapFillApplyResult {
  const projectRoot = resolve(input.projectRoot);
  const targetPath = resolve(projectRoot, input.boundary.filePath);
  const issues: string[] = [];
  const appliedOperations: string[] = [];

  if (!isGeneratorSourcePath(projectRoot, targetPath)) {
    return {
      requested: true,
      attempted: false,
      success: false,
      boundaryId: input.boundary.id,
      targetFile: input.boundary.filePath,
      targetPath,
      appliedOperations,
      issues: [
        `Boundary file must stay inside the repo generator source tree: ${input.boundary.filePath}`,
      ],
    };
  }

  let content: string;
  try {
    content = readFileSync(targetPath, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      requested: true,
      attempted: false,
      success: false,
      boundaryId: input.boundary.id,
      targetFile: input.boundary.filePath,
      targetPath,
      appliedOperations,
      issues: [`Failed to read target file: ${message}`],
    };
  }

  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const anchorLine = findAnchorLine(lines, input.boundary.anchor);
  if (anchorLine === -1) {
    return {
      requested: true,
      attempted: false,
      success: false,
      boundaryId: input.boundary.id,
      targetFile: input.boundary.filePath,
      targetPath,
      appliedOperations,
      issues: [`Boundary anchor not found: ${input.boundary.anchor}`],
    };
  }

  const workingLines = [...lines];
  let lineOffset = 0;

  for (const operation of input.patchPlan.operations) {
    const parsedRange = parseTargetRange(operation.target);
    if (!parsedRange) {
      return failure(input.boundary, targetPath, appliedOperations, `Unsupported target format: ${operation.target}`);
    }

    if (!isTargetNearAnchor(parsedRange, anchorLine, DEFAULT_BOUNDARY_WINDOW)) {
      return failure(
        input.boundary,
        targetPath,
        appliedOperations,
        `Operation target ${operation.target} is outside the allowed boundary window around anchor line ${anchorLine}`,
      );
    }

    if (requiresReplacement(operation) && !hasReplacement(operation)) {
      return failure(
        input.boundary,
        targetPath,
        appliedOperations,
        `Operation ${operation.kind} on ${operation.target} is missing replacement text`,
      );
    }

    const adjustedRange = {
      startLine: parsedRange.startLine + lineOffset,
      endLine: parsedRange.endLine + lineOffset,
    };

    const applyIssue = applyOperation(workingLines, adjustedRange, operation);
    if (applyIssue) {
      return failure(input.boundary, targetPath, appliedOperations, applyIssue);
    }

    lineOffset += computeLineOffsetDelta(operation, parsedRange);
    appliedOperations.push(formatAppliedOperation(operation));
  }

  try {
    writeFileSync(targetPath, workingLines.join(newline), "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      requested: true,
      attempted: true,
      success: false,
      boundaryId: input.boundary.id,
      targetFile: input.boundary.filePath,
      targetPath,
      appliedOperations,
      issues: [`Failed to write target file: ${message}`],
    };
  }

  return {
    requested: true,
    attempted: true,
    success: true,
    boundaryId: input.boundary.id,
    targetFile: input.boundary.filePath,
    targetPath,
    appliedOperations,
    issues,
  };
}

export function formatGapFillApplySummary(result: GapFillApplyResult): string {
  const lines = [
    "=".repeat(70),
    "Rune Weaver - Dota2 Gap Fill Apply",
    "=".repeat(70),
    `Target file: ${result.targetPath}`,
    `Status: ${result.success ? "applied" : "failed"}`,
  ];

  if (result.appliedOperations.length > 0) {
    lines.push("Applied operations:");
    for (const operation of result.appliedOperations) {
      lines.push(`  - ${operation}`);
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

function failure(
  boundary: GapFillBoundaryInfo,
  targetPath: string,
  appliedOperations: string[],
  issue: string,
): GapFillApplyResult {
  return {
    requested: true,
    attempted: true,
    success: false,
    boundaryId: boundary.id,
    targetFile: boundary.filePath,
    targetPath,
    appliedOperations,
    issues: [issue],
  };
}

function isGeneratorSourcePath(projectRoot: string, targetPath: string): boolean {
  if (!targetPath.startsWith(projectRoot)) {
    return false;
  }

  const relativePath = normalize(relative(projectRoot, targetPath));
  if (!relativePath || relativePath.startsWith("..")) {
    return false;
  }

  return relativePath.startsWith(`${REPO_GENERATOR_ROOT}${normalize("/")}`);
}

function findAnchorLine(lines: string[], anchor: string): number {
  const index = lines.findIndex((line) => line.includes(anchor));
  return index === -1 ? -1 : index + 1;
}

function parseTargetRange(target: string): ParsedTargetRange | null {
  const lineMatch = target.match(LINE_TARGET_PATTERN);
  if (lineMatch) {
    const line = Number(lineMatch[1]);
    return line > 0 ? { startLine: line, endLine: line } : null;
  }

  const linesMatch = target.match(LINES_TARGET_PATTERN);
  if (linesMatch) {
    const startLine = Number(linesMatch[1]);
    const endLine = Number(linesMatch[2]);
    if (startLine <= 0 || endLine < startLine) {
      return null;
    }
    return { startLine, endLine };
  }

  return null;
}

function isTargetNearAnchor(
  range: ParsedTargetRange,
  anchorLine: number,
  windowSize: number,
): boolean {
  const windowStart = Math.max(1, anchorLine - windowSize);
  const windowEnd = anchorLine + windowSize;
  const withinWindow = range.startLine >= windowStart && range.endLine <= windowEnd;
  const coversAnchor = range.startLine <= anchorLine && range.endLine >= anchorLine;

  return withinWindow || coversAnchor;
}

function requiresReplacement(operation: GapFillPatchOperation): boolean {
  return operation.kind === "replace" || operation.kind === "insert_before" || operation.kind === "insert_after";
}

function hasReplacement(operation: GapFillPatchOperation): boolean {
  return operation.replacement !== undefined;
}

function applyOperation(
  lines: string[],
  range: ParsedTargetRange,
  operation: GapFillPatchOperation,
): string | null {
  const startIndex = range.startLine - 1;
  const endIndex = range.endLine - 1;

  if (startIndex < 0 || endIndex >= lines.length) {
    return `Target ${operation.target} is out of file bounds`;
  }

  const replacementLines = operation.replacement?.split(/\r?\n/) ?? [];

  switch (operation.kind) {
    case "replace":
      lines.splice(startIndex, endIndex - startIndex + 1, ...replacementLines);
      return null;
    case "insert_before":
      lines.splice(startIndex, 0, ...replacementLines);
      return null;
    case "insert_after":
      lines.splice(endIndex + 1, 0, ...replacementLines);
      return null;
    case "delete":
      lines.splice(startIndex, endIndex - startIndex + 1);
      return null;
    default:
      return `Unsupported operation kind: ${(operation as { kind: string }).kind}`;
  }
}

function computeLineOffsetDelta(
  operation: GapFillPatchOperation,
  range: ParsedTargetRange,
): number {
  const replacementLineCount = operation.replacement?.split(/\r?\n/).length ?? 0;
  const removedLineCount = range.endLine - range.startLine + 1;

  switch (operation.kind) {
    case "replace":
      return replacementLineCount - removedLineCount;
    case "insert_before":
    case "insert_after":
      return replacementLineCount;
    case "delete":
      return -removedLineCount;
    default:
      return 0;
  }
}

function formatAppliedOperation(operation: GapFillPatchOperation): string {
  return `${operation.kind} ${operation.target}`;
}

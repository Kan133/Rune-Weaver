import { createHash, randomUUID } from "crypto";

import type {
  GapFillBoundaryInfo,
  GapFillDecisionRecord,
  GapFillDecisionResult,
  GapFillPatchPlan,
  GapFillPlanMetadata,
  GapFillTargetFile,
} from "./types.js";

const GAP_FILL_APPROVAL_TOKEN_PREFIX = "rw-gap-fill-approval.v1.";

export interface GapFillApprovalRecord {
  version: "1.0";
  kind: "gap-fill-approval";
  approvalId: string;
  createdAt: string;
  hostRoot: string;
  boundaryId: string;
  instruction: string;
  instructionSummary: string;
  targetFile: string;
  targetFileHash: string;
  patchPlanSummary: string;
  patchPlanHash: string;
  decision: GapFillDecisionResult;
  decisionRecord?: GapFillDecisionRecord;
  patchPlan: GapFillPatchPlan;
  planMetadata?: GapFillPlanMetadata;
  recordHash: string;
}

export interface GapFillApprovalValidationResult {
  valid: boolean;
  issues: string[];
}

export interface GapFillApprovalTokenParseResult extends GapFillApprovalValidationResult {
  record?: GapFillApprovalRecord;
}

export function createGapFillApprovalRecord(input: {
  hostRoot: string;
  boundaryId: string;
  instruction: string;
  targetFile: GapFillTargetFile;
  patchPlan: GapFillPatchPlan;
  decision: GapFillDecisionResult;
  decisionRecord?: GapFillDecisionRecord;
  planMetadata?: GapFillPlanMetadata;
}): GapFillApprovalRecord {
  return withRecordHash({
    version: "1.0",
    kind: "gap-fill-approval",
    approvalId: randomUUID(),
    createdAt: new Date().toISOString(),
    hostRoot: input.hostRoot,
    boundaryId: input.boundaryId,
    instruction: input.instruction,
    instructionSummary: summarizeGapFillText(input.instruction, 180),
    targetFile: input.targetFile.path,
    targetFileHash: hashString(input.targetFile.content),
    patchPlanSummary: summarizePatchPlan(input.patchPlan),
    patchPlanHash: hashString(stableStringify(input.patchPlan)),
    decision: input.decision,
    decisionRecord: input.decisionRecord,
    patchPlan: input.patchPlan,
    planMetadata: input.planMetadata,
    recordHash: "",
  });
}

export function createGapFillApprovalToken(input: {
  hostRoot: string;
  boundaryId: string;
  instruction: string;
  targetFile: GapFillTargetFile;
  patchPlan: GapFillPatchPlan;
  decision: GapFillDecisionResult;
  decisionRecord?: GapFillDecisionRecord;
  planMetadata?: GapFillPlanMetadata;
}): {
  record: GapFillApprovalRecord;
  token: string;
} {
  const record = createGapFillApprovalRecord(input);
  return {
    record,
    token: serializeGapFillApprovalRecord(record),
  };
}

export function serializeGapFillApprovalRecord(record: GapFillApprovalRecord): string {
  const payload = stableStringify(record);
  return `${GAP_FILL_APPROVAL_TOKEN_PREFIX}${Buffer.from(payload, "utf-8").toString("base64url")}`;
}

export function parseGapFillApprovalToken(token: string): GapFillApprovalTokenParseResult {
  const issues: string[] = [];

  if (!token.startsWith(GAP_FILL_APPROVAL_TOKEN_PREFIX)) {
    return {
      valid: false,
      issues: [`Unsupported approval token prefix. Expected '${GAP_FILL_APPROVAL_TOKEN_PREFIX}'.`],
    };
  }

  const encoded = token.slice(GAP_FILL_APPROVAL_TOKEN_PREFIX.length);
  let decodedText: string;
  try {
    decodedText = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return {
      valid: false,
      issues: ["Approval token payload is not valid base64url text."],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodedText);
  } catch {
    return {
      valid: false,
      issues: ["Approval token payload is not valid JSON."],
    };
  }

  if (!isGapFillApprovalRecord(parsed)) {
    return {
      valid: false,
      issues: ["Approval token payload does not match the approval record shape."],
    };
  }

  const record = parsed;
  const hashIssues = validateGapFillApprovalRecordHash(record);
  issues.push(...hashIssues);

  return {
    valid: issues.length === 0,
    issues,
    record,
  };
}

export function validateGapFillApprovalRecord(input: {
  record: GapFillApprovalRecord;
  hostRoot: string;
  boundary: GapFillBoundaryInfo;
  targetFile: GapFillTargetFile;
  patchPlan?: GapFillPatchPlan;
}): GapFillApprovalValidationResult {
  const issues: string[] = [];

  if (input.record.kind !== "gap-fill-approval") {
    issues.push(`Unsupported approval kind '${input.record.kind}'.`);
  }

  if (input.record.version !== "1.0") {
    issues.push(`Unsupported approval version '${input.record.version}'.`);
  }

  if (input.record.decision.decision !== "require_confirmation") {
    issues.push(`Approval record decision must be 'require_confirmation', received '${input.record.decision.decision}'.`);
  }

  if (input.record.hostRoot !== input.hostRoot) {
    issues.push(`Approval record host '${input.record.hostRoot}' does not match current host '${input.hostRoot}'.`);
  }

  if (input.record.boundaryId !== input.boundary.id) {
    issues.push(`Approval record boundary '${input.record.boundaryId}' does not match current boundary '${input.boundary.id}'.`);
  }

  if (input.record.targetFile !== input.targetFile.path) {
    issues.push(`Approval record target '${input.record.targetFile}' does not match current target '${input.targetFile.path}'.`);
  }

  if (input.record.targetFile !== input.boundary.filePath) {
    issues.push(`Approval record target '${input.record.targetFile}' does not match boundary file '${input.boundary.filePath}'.`);
  }

  if (input.record.patchPlan.boundaryId !== input.record.boundaryId) {
    issues.push("Approval record patch plan boundary does not match its boundary record.");
  }

  if (input.record.patchPlan.targetFile !== input.record.targetFile) {
    issues.push("Approval record patch plan target does not match its target record.");
  }

  const currentTargetHash = hashString(input.targetFile.content);
  if (input.record.targetFileHash !== currentTargetHash) {
    issues.push("Target file content has changed since approval was recorded.");
  }

  const patchPlanToValidate = input.patchPlan ?? input.record.patchPlan;
  const currentPatchPlanHash = hashString(stableStringify(patchPlanToValidate));
  if (input.record.patchPlanHash !== currentPatchPlanHash) {
    issues.push("Approval patch plan payload no longer matches its recorded hash.");
  }

  if (input.record.recordHash !== hashApprovalRecord(input.record)) {
    issues.push("Approval record payload no longer matches its recorded hash.");
  }

  if (input.record.instructionSummary.trim().length === 0) {
    issues.push("Approval record instruction summary is empty.");
  }

  if (input.record.patchPlanSummary.trim().length === 0) {
    issues.push("Approval record patch plan summary is empty.");
  }

  if (input.record.decisionRecord) {
    if (input.record.decisionRecord.requestedBoundaryId !== input.record.boundaryId) {
      issues.push("Approval decision record boundary does not match approval boundary.");
    }
    if (input.record.decisionRecord.targetFile !== input.record.targetFile) {
      issues.push("Approval decision record target does not match approval target.");
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateGapFillApprovalToken(input: {
  token: string;
  hostRoot: string;
  boundary: GapFillBoundaryInfo;
  targetFile: GapFillTargetFile;
  patchPlan?: GapFillPatchPlan;
}): GapFillApprovalTokenParseResult {
  const parsed = parseGapFillApprovalToken(input.token);
  if (!parsed.valid || !parsed.record) {
    return parsed;
  }

  const validation = validateGapFillApprovalRecord({
    record: parsed.record,
    hostRoot: input.hostRoot,
    boundary: input.boundary,
    targetFile: input.targetFile,
    patchPlan: input.patchPlan,
  });

  return {
    valid: validation.valid,
    issues: validation.issues,
    record: parsed.record,
  };
}

export function formatGapFillApprovalSummary(record: GapFillApprovalRecord): string {
  const lines = [
    "=".repeat(70),
    "Rune Weaver - Gap Fill Approval",
    "=".repeat(70),
    `Approval ID: ${record.approvalId}`,
    `Boundary: ${record.boundaryId}`,
    `Target file: ${record.targetFile}`,
    `Instruction summary: ${record.instructionSummary}`,
    `Patch plan summary: ${record.patchPlanSummary}`,
    `Decision: ${record.decision.decision}`,
    `Risk: ${record.decision.riskLevel}`,
    `Created: ${record.createdAt}`,
    `Summary: ${record.decision.userSummary}`,
  ];

  if (record.decision.reasons.length > 0) {
    lines.push("Reasons:");
    for (const reason of record.decision.reasons) {
      lines.push(`  - [${reason.code}] ${reason.message}`);
    }
  }

  return lines.join("\n");
}

function withRecordHash(record: GapFillApprovalRecord): GapFillApprovalRecord {
  const recordHash = hashApprovalRecord(record);
  return {
    ...record,
    recordHash,
  };
}

function validateGapFillApprovalRecordHash(record: GapFillApprovalRecord): string[] {
  const issues: string[] = [];
  if (record.recordHash !== hashApprovalRecord(record)) {
    issues.push("Approval token hash does not match the encoded record.");
  }
  return issues;
}

function hashApprovalRecord(record: GapFillApprovalRecord): string {
  const { recordHash: _recordHash, ...recordWithoutHash } = record;
  return hashString(stableStringify(recordWithoutHash));
}

function isGapFillApprovalRecord(value: unknown): value is GapFillApprovalRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.version === "1.0"
    && record.kind === "gap-fill-approval"
    && typeof record.approvalId === "string"
    && typeof record.createdAt === "string"
    && typeof record.hostRoot === "string"
    && typeof record.boundaryId === "string"
    && typeof record.instruction === "string"
    && typeof record.instructionSummary === "string"
    && typeof record.targetFile === "string"
    && typeof record.targetFileHash === "string"
    && typeof record.patchPlanSummary === "string"
    && typeof record.patchPlanHash === "string"
    && typeof record.recordHash === "string"
    && record.decision !== undefined
    && record.patchPlan !== undefined
  );
}

function summarizeGapFillText(value: string, limit: number): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= limit) {
    return collapsed;
  }
  return `${collapsed.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function summarizePatchPlan(plan: GapFillPatchPlan): string {
  const operationCount = plan.operations.length;
  const summary = summarizeGapFillText(plan.summary, 160);
  return `${summary} (${operationCount} op${operationCount === 1 ? "" : "s"})`;
}

function hashString(value: string): string {
  return createHash("sha256").update(value, "utf-8").digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

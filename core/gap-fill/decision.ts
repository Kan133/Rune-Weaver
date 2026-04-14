import type {
  GapFillBoundaryInfo,
  GapFillDecisionIssue,
  GapFillDecisionResult,
  GapFillPatchOperation,
  GapFillPatchPlan,
  GapFillRunResult,
} from "./types.js";
import { DEFAULT_GAP_FILL_POLICY, type GapFillPolicyConfig } from "./policy.js";
import { summarizeGapFillDecision } from "./summary.js";
import { classifyGapFillFailureCategory } from "./validation.js";

const LINE_TARGET_PATTERN = /^line\s+0*(\d{1,6})$/i;
const LINES_TARGET_PATTERN = /^lines\s+0*(\d{1,6})-0*(\d{1,6})$/i;

const FORBIDDEN_REASON_PATTERNS = [
  { code: "touches_imports", pattern: /\bimport\b/i, message: "Patch reasons mention imports, which stay outside safe auto-apply." },
  { code: "touches_exports", pattern: /\bexport\b/i, message: "Patch reasons mention exports, which stay outside safe auto-apply." },
  { code: "touches_contract", pattern: /\bcontract|schema|type\b/i, message: "Patch reasons mention contracts or types." },
  { code: "touches_wiring", pattern: /\bwiring|bridge|lifecycle|routing\b/i, message: "Patch reasons mention wiring or lifecycle concerns." },
];

export function evaluateGapFillDecision(input: {
  boundary: GapFillBoundaryInfo;
  patchPlan?: GapFillPatchPlan;
  runResult?: Pick<GapFillRunResult, "success" | "issues" | "summary">;
  applyRequested?: boolean;
  policy?: Partial<GapFillPolicyConfig>;
}): GapFillDecisionResult {
  const policy = { ...DEFAULT_GAP_FILL_POLICY, ...input.policy };
  const reasons: GapFillDecisionIssue[] = [];
  const operations = input.patchPlan?.operations ?? [];

  if (input.runResult && !input.runResult.success) {
    reasons.push(issue(
      "run_failed",
      input.runResult.issues.length > 0
        ? `Gap-fill run failed: ${input.runResult.issues.join("; ")}`
        : "Gap-fill run failed before a patch plan could be evaluated.",
    ));
  }

  if (!input.patchPlan) {
    reasons.push(issue("missing_patch_plan", "No patch plan was available for decision making."));
  }

  if (input.patchPlan && input.patchPlan.boundaryId !== input.boundary.id) {
    reasons.push(issue(
      "boundary_mismatch",
      `Patch plan boundary '${input.patchPlan.boundaryId}' does not match requested boundary '${input.boundary.id}'.`,
    ));
  }

  if (input.patchPlan && input.patchPlan.targetFile !== input.boundary.filePath) {
    reasons.push(issue(
      "target_mismatch",
      `Patch plan target '${input.patchPlan.targetFile}' does not match boundary file '${input.boundary.filePath}'.`,
    ));
  }

  if (operations.length === 0 && input.patchPlan) {
    reasons.push(issue("empty_patch", "Patch plan contains no operations."));
  }

  if (operations.length > policy.maxOperationsForAutoApply) {
    reasons.push(issue(
      "too_many_operations",
      `Patch plan has ${operations.length} operations, above the auto-apply limit of ${policy.maxOperationsForAutoApply}.`,
    ));
  }

  for (const operation of operations) {
    collectOperationIssues(operation, input.boundary, policy, reasons);
  }

  const rejectCodes = new Set([
    "boundary_mismatch",
    "target_mismatch",
    "empty_patch",
    "unknown_target_format",
    "replacement_missing",
    "touches_forbidden_boundary_topic",
    "touches_imports",
    "touches_exports",
    "touches_contract",
    "touches_wiring",
  ]);

  const confirmationCodes = new Set([
    "too_many_operations",
    "large_replacement",
    "delete_operation",
    "wide_line_range",
  ]);

  const hasReject = reasons.some((reason) => rejectCodes.has(reason.code));
  const hasConfirmation = reasons.some((reason) => confirmationCodes.has(reason.code));

  if (hasReject) {
    return buildDecisionResult("reject", "high", reasons);
  }

  if (hasConfirmation) {
    return buildDecisionResult("require_confirmation", "medium", reasons);
  }

  if (input.applyRequested === false) {
    reasons.push(issue("apply_not_requested", "Patch is safe enough for auto-apply, but apply was not requested."));
    return buildDecisionResult("require_confirmation", "low", reasons);
  }

  return buildDecisionResult("auto_apply", "low", reasons);
}

function buildDecisionResult(
  decision: GapFillDecisionResult["decision"],
  riskLevel: GapFillDecisionResult["riskLevel"],
  reasons: GapFillDecisionIssue[],
): GapFillDecisionResult {
  return {
    decision,
    riskLevel,
    reasons,
    userSummary: summarizeGapFillDecision(decision, reasons),
    canApplyDirectly: decision === "auto_apply",
    failureCategories: [...new Set(reasons.map((reason) => reason.category))],
  };
}

function issue(code: string, message: string): GapFillDecisionIssue {
  return {
    code,
    category: classifyGapFillFailureCategory(code),
    message,
  };
}

function collectOperationIssues(
  operation: GapFillPatchOperation,
  boundary: GapFillBoundaryInfo,
  policy: GapFillPolicyConfig,
  reasons: GapFillDecisionIssue[],
): void {
  const parsedTarget = parseTarget(operation.target);
  if (!parsedTarget) {
    reasons.push(issue(
      "unknown_target_format",
      `Operation target '${operation.target}' does not use the supported line/lines syntax.`,
    ));
  } else if (parsedTarget.lineSpan > policy.maxReplacementLinesForAutoApply) {
    reasons.push(issue(
      "wide_line_range",
      `Operation target '${operation.target}' spans ${parsedTarget.lineSpan} lines, above the auto-apply limit of ${policy.maxReplacementLinesForAutoApply}.`,
    ));
  }

  if ((operation.kind === "replace" || operation.kind === "insert_before" || operation.kind === "insert_after")
      && operation.replacement === undefined) {
    reasons.push(issue(
      "replacement_missing",
      `Operation '${operation.kind}' on ${operation.target} has no replacement text.`,
    ));
  }

  if (operation.kind === "delete") {
    reasons.push(issue("delete_operation", `Delete operation '${operation.target}' requires confirmation.`));
  }

  const replacementLineCount = operation.replacement?.split(/\r?\n/).length ?? 0;
  if (replacementLineCount > policy.maxReplacementLinesForAutoApply) {
    reasons.push(issue(
      "large_replacement",
      `Replacement for ${operation.target} adds ${replacementLineCount} lines, above the auto-apply limit of ${policy.maxReplacementLinesForAutoApply}.`,
    ));
  }

  for (const forbidden of boundary.forbidden) {
    const pattern = new RegExp(escapeRegExp(forbidden), "i");
    if (pattern.test(operation.reason) || pattern.test(operation.replacement || "")) {
      reasons.push(issue(
        "touches_forbidden_boundary_topic",
        `Operation mentions forbidden boundary topic '${forbidden}'.`,
      ));
    }
  }

  for (const forbidden of FORBIDDEN_REASON_PATTERNS) {
    if (forbidden.pattern.test(operation.reason) || forbidden.pattern.test(operation.replacement || "")) {
      reasons.push(issue(forbidden.code, forbidden.message));
    }
  }
}

function parseTarget(target: string): { lineSpan: number } | null {
  const lineMatch = target.match(LINE_TARGET_PATTERN);
  if (lineMatch) {
    return { lineSpan: 1 };
  }

  const linesMatch = target.match(LINES_TARGET_PATTERN);
  if (linesMatch) {
    const start = Number(linesMatch[1]);
    const end = Number(linesMatch[2]);
    if (start <= 0 || end < start) {
      return null;
    }
    return { lineSpan: end - start + 1 };
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

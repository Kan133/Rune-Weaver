import { createHash } from "crypto";
import type {
  GapFillApplyRequest,
  GapFillApplyResult,
  GapFillBoundaryInfo,
  GapFillDecisionResult,
  GapFillFailureCategory,
  GapFillPatchPlan,
  GapFillPlanMetadata,
  GapFillValidationCheck,
  GapFillValidationIssue,
  GapFillValidationResult,
} from "./types.js";

function buildCheck(
  id: string,
  passed: boolean,
  message: string,
  details?: string[],
): GapFillValidationCheck {
  return { id, passed, message, details };
}

const GAP_FILL_FAILURE_CATEGORY_MAP: Record<string, GapFillFailureCategory> = {
  run_failed: "spec_ambiguity",
  missing_patch_plan: "spec_ambiguity",
  boundary_mismatch: "write_mismatch",
  target_mismatch: "write_mismatch",
  empty_patch: "spec_ambiguity",
  too_many_operations: "approval_required",
  unknown_target_format: "spec_ambiguity",
  wide_line_range: "approval_required",
  replacement_missing: "spec_ambiguity",
  delete_operation: "approval_required",
  large_replacement: "approval_required",
  touches_forbidden_boundary_topic: "policy_reject",
  touches_imports: "policy_reject",
  touches_exports: "policy_reject",
  touches_contract: "policy_reject",
  touches_wiring: "policy_reject",
  apply_not_requested: "approval_required",
  plan_scope_mismatch: "write_mismatch",
  apply_target_mismatch: "write_mismatch",
  structure_mutation_risk: "policy_reject",
  apply_error: "write_mismatch",
};

export function classifyGapFillFailureCategory(code: string): GapFillFailureCategory {
  return GAP_FILL_FAILURE_CATEGORY_MAP[code] ?? "spec_ambiguity";
}

function collectFailureCategories(decision?: GapFillDecisionResult, applyResult?: GapFillApplyResult): GapFillFailureCategory[] {
  const categories = new Set<GapFillFailureCategory>(decision?.failureCategories || []);
  if (applyResult && !applyResult.success) {
    categories.add(classifyGapFillFailureCategory("apply_error"));
  }
  return [...categories];
}

function buildPlanMetadata(plan?: GapFillPatchPlan): GapFillPlanMetadata | undefined {
  if (!plan) {
    return undefined;
  }

  const operationCount = plan.operations.length;
  return {
    planId: hashObject(plan),
    createdAt: new Date().toISOString(),
    summary: plan.summary,
    operationCount,
    includesReplace: plan.operations.some((operation) => operation.kind === "replace"),
    includesInsert: plan.operations.some((operation) => operation.kind === "insert_before" || operation.kind === "insert_after"),
    includesDelete: plan.operations.some((operation) => operation.kind === "delete"),
    notes: plan.notes,
  };
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value), "utf-8").digest("hex");
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

export function validateAppliedGapFill(input: {
  boundary: GapFillBoundaryInfo;
  request: GapFillApplyRequest;
  patchPlan?: GapFillPatchPlan;
  applyResult?: GapFillApplyResult;
  decision?: GapFillDecisionResult;
}): GapFillValidationResult {
  const checks: GapFillValidationCheck[] = [];
  const issues: string[] = [];
  const issueDetails: GapFillValidationIssue[] = [];
  const planMetadata = buildPlanMetadata(input.patchPlan);

  const recordIssue = (
    code: string,
    message: string,
    details?: string[],
    evidence?: string[],
  ): void => {
    const category = classifyGapFillFailureCategory(code);
    issues.push(message);
    issueDetails.push({ code, message, category, details, evidence });
  };

  const boundaryMatchesRequest = input.request.requestedBoundaryId === input.boundary.id;
  checks.push(
    buildCheck(
      "approved_boundary_matches_request",
      boundaryMatchesRequest,
      boundaryMatchesRequest
        ? "Requested boundary matches the reviewed boundary."
        : `Requested boundary '${input.request.requestedBoundaryId}' does not match '${input.boundary.id}'.`,
    ),
  );
  if (!boundaryMatchesRequest) {
    recordIssue(
      "boundary_mismatch",
      `Requested boundary '${input.request.requestedBoundaryId}' does not match '${input.boundary.id}'.`,
    );
  }

  const planBoundaryMatches =
    !input.patchPlan ||
    (input.patchPlan.boundaryId === input.boundary.id && input.patchPlan.targetFile === input.boundary.filePath);
  checks.push(
    buildCheck(
      "plan_scope_matches_boundary",
      planBoundaryMatches,
      planBoundaryMatches
        ? "Patch plan scope stays on the approved boundary."
        : "Patch plan scope drifted away from the approved boundary or target file.",
    ),
  );
  if (!planBoundaryMatches) {
    recordIssue(
      "plan_scope_mismatch",
      "Patch plan scope drifted away from the approved boundary or target file.",
    );
  }

  const appliedTargetMatches =
    !input.applyResult ||
    input.applyResult.targetPath === undefined ||
    input.applyResult.targetFile === input.boundary.filePath;
  checks.push(
    buildCheck(
      "apply_target_matches_boundary",
      appliedTargetMatches,
      appliedTargetMatches
        ? "Applied target stayed within the approved boundary file."
        : "Apply result targeted a file outside the approved boundary.",
    ),
  );
  if (!appliedTargetMatches) {
    recordIssue(
      "apply_target_mismatch",
      "Apply result targeted a file outside the approved boundary.",
    );
  }

  const noStructureMutation = !input.decision?.reasons.some((reason) =>
    reason.code === "touches_imports" ||
    reason.code === "touches_exports" ||
    reason.code === "touches_contract" ||
    reason.code === "touches_wiring" ||
    reason.code === "touches_forbidden_boundary_topic",
  );
  checks.push(
    buildCheck(
      "no_structure_mutation",
      noStructureMutation,
      noStructureMutation
        ? "No structure-level mutation was detected in the approved gap-fill scope."
        : "Decision signals indicate structure-level mutation risk.",
    ),
  );
  if (!noStructureMutation) {
    recordIssue(
      "structure_mutation_risk",
      "Decision signals indicate structure-level mutation risk.",
    );
  }

  const applySucceeded = !input.applyResult || input.applyResult.success;
  checks.push(
    buildCheck(
      "apply_result_success",
      applySucceeded,
      applySucceeded
        ? "Apply stage completed without reported write errors."
        : "Apply stage reported write errors.",
      input.applyResult?.issues.length ? input.applyResult.issues : undefined,
    ),
  );
  if (!applySucceeded) {
    recordIssue(
      "apply_error",
      "Apply stage reported write errors.",
      undefined,
      input.applyResult?.issues,
    );
  }

  const failureCategories = collectFailureCategories(input.decision, input.applyResult);
  for (const detail of issueDetails) {
    failureCategories.push(detail.category);
  }

  const uniqueFailureCategories = [...new Set(failureCategories)];
  const recommendedNextStep = issues.length === 0
    ? input.request.mode === "apply"
      ? "Apply completed cleanly. You can continue to host repair/build and launch."
      : "Review is consistent. You can continue to approval/apply."
    : "Resolve the write mismatch or policy issue before continuing.";

  return {
    success: issues.length === 0,
    boundaryId: input.boundary.id,
    targetFile: input.boundary.filePath,
    checks,
    issues,
    failureCategories: uniqueFailureCategories,
    issueDetails,
    planMetadata,
    recommendedNextStep,
  };
}

import type {
  Blueprint,
  CommitDecision,
  CommitDecisionOutcome,
  DependencyRevalidationResult,
  ModuleImplementationRecord,
  ValidationStatus,
} from "../schema/types.js";
import { buildGroundingReviewReason } from "../governance/grounding.js";

export interface FinalCommitGateInput {
  blueprint: Blueprint;
  moduleRecords?: ModuleImplementationRecord[];
  hostBlockers?: string[];
  routingBlockers?: string[];
  governanceBlockers?: string[];
  localRepair?: {
    success: boolean;
    blockers: string[];
    warnings?: string[];
  };
  dependencyRevalidation?: DependencyRevalidationResult;
  hostValidation: {
    success: boolean;
    issues: string[];
    skipped?: boolean;
  };
  runtimeValidation: {
    success: boolean;
    limitations: string[];
    skipped?: boolean;
  };
  dryRun?: boolean;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function collectModuleReviewReasons(moduleRecords: ModuleImplementationRecord[]): string[] {
  return unique(
    moduleRecords.flatMap((module) =>
      [
        ...(module.reviewReasons || []),
        buildGroundingReviewReason(`module '${module.moduleId}'`, module.groundingAssessment) || "",
      ]
        .filter((reason) => reason.trim().length > 0)
        .map((reason) => `[module:${module.moduleId}] ${reason}`),
    ),
  );
}

function moduleNeedsReview(module: ModuleImplementationRecord): boolean {
  return module.reviewRequired === true || module.requiresReview === true;
}

function resolveOutcome(
  blueprint: Blueprint,
  moduleRecords: ModuleImplementationRecord[],
  blockers: string[],
): CommitDecisionOutcome {
  if (blockers.length > 0) {
    return "blocked";
  }

  if (moduleRecords.length > 0) {
    if (
      moduleRecords.some((module) => module.sourceKind === "synthesized")
      || moduleRecords.some(moduleNeedsReview)
    ) {
      return "exploratory";
    }

    return "committable";
  }

  if (
    blueprint.implementationStrategy === "exploratory"
    || blueprint.implementationStrategy === "guided_native"
    || blueprint.maturity === "exploratory"
    || blueprint.commitDecision?.outcome === "exploratory"
  ) {
    return "exploratory";
  }

  return "committable";
}

export function calculateFinalCommitDecision(
  input: FinalCommitGateInput,
): CommitDecision {
  const moduleRecords = input.moduleRecords || [];
  const dependencyBlockers = input.dependencyRevalidation?.blockers || [];
  const blockers = unique([
    ...(input.hostBlockers || []),
    ...(input.routingBlockers || []),
    ...(input.governanceBlockers || []),
    ...(input.localRepair?.success === false ? input.localRepair.blockers : []),
    ...dependencyBlockers,
    ...(!input.hostValidation.success && !input.hostValidation.skipped ? input.hostValidation.issues : []),
    ...(!input.runtimeValidation.success && !input.runtimeValidation.skipped && !input.dryRun
      ? input.runtimeValidation.limitations
      : []),
  ]);
  const warnings = unique([
    ...(input.blueprint.validationStatus?.warnings || []),
    ...(input.localRepair?.warnings || []),
    ...collectModuleReviewReasons(moduleRecords),
  ]);
  const outcome = resolveOutcome(input.blueprint, moduleRecords, blockers);
  const reviewModules = moduleRecords.filter(moduleNeedsReview);
  const downgradedFeatures = unique([
    ...(input.dependencyRevalidation?.downgradedFeatures || []),
    ...reviewModules.map((module) => `module:${module.moduleId}`),
  ]);

  return {
    outcome,
    canAssemble: outcome !== "blocked",
    canWriteHost: outcome !== "blocked",
    requiresReview:
      outcome === "exploratory"
      || warnings.length > 0
      || reviewModules.length > 0,
    reasons: blockers.length > 0 ? blockers : warnings,
    stage: "final",
    impactedFeatures: input.dependencyRevalidation?.impactedFeatures.map((item) => item.featureId) || [],
    dependencyBlockers,
    downgradedFeatures,
    reviewModules: reviewModules.map((module) => module.moduleId),
  };
}

export function buildFinalValidationStatus(
  blueprint: Blueprint,
  input: FinalCommitGateInput,
  decision: CommitDecision,
): ValidationStatus {
  const now = new Date().toISOString();
  const prior = blueprint.validationStatus;
  const dependencyIssues = input.dependencyRevalidation?.impactedFeatures.flatMap((item) => item.issues) || [];
  const dependencyBlockers = input.dependencyRevalidation?.blockers || [];
  const repairWarnings = input.localRepair?.warnings || [];
  const repairBlockers = input.localRepair?.success === false ? input.localRepair.blockers : [];
  const moduleWarnings = collectModuleReviewReasons(input.moduleRecords || []);

  const warnings = unique([
    ...(prior?.warnings || []),
    ...repairWarnings,
    ...moduleWarnings,
    ...dependencyIssues.filter((issue) => !dependencyBlockers.includes(issue)),
    ...(input.hostValidation.success || input.hostValidation.skipped ? [] : input.hostValidation.issues),
    ...(input.runtimeValidation.success || input.runtimeValidation.skipped || input.dryRun
      ? []
      : input.runtimeValidation.limitations),
  ]);
  const blockers = unique([
    ...(decision.outcome === "blocked" ? decision.reasons : []),
    ...repairBlockers,
    ...dependencyBlockers,
  ]);

  return {
    status:
      blockers.length > 0
        ? "failed"
        : decision.requiresReview
          ? "needs_review"
          : "passed",
    warnings,
    blockers,
    lastValidatedAt: now,
    blueprint: prior?.blueprint || {
      status: prior?.status || "unvalidated",
      warnings: prior?.warnings || [],
      blockers: prior?.blockers || [],
      summary: "Blueprint planning-stage validation",
      checkedAt: prior?.lastValidatedAt,
    },
    synthesis: {
      status:
        input.moduleRecords?.some((module) => module.sourceKind === "synthesized")
          ? decision.outcome === "blocked"
            ? "failed"
            : decision.requiresReview
              ? "needs_review"
              : "passed"
          : prior?.synthesis?.status || "unvalidated",
      warnings: input.moduleRecords?.some((module) => module.sourceKind === "synthesized")
        ? moduleWarnings
        : prior?.synthesis?.warnings || [],
      blockers: input.moduleRecords?.some((module) => module.sourceKind === "synthesized")
        ? blockers
        : prior?.synthesis?.blockers || [],
      summary: "Artifact synthesis",
      checkedAt: now,
    },
    repair: {
      status:
        input.localRepair?.success === false
          ? "failed"
          : repairWarnings.length > 0
            ? "needs_review"
            : "passed",
      warnings: repairWarnings,
      blockers: repairBlockers,
      summary: "Local repair / muscle fill",
      checkedAt: now,
    },
    dependency: {
      status:
        dependencyBlockers.length > 0
          ? "failed"
          : (input.dependencyRevalidation?.downgradedFeatures.length || 0) > 0
            ? "needs_review"
            : "passed",
      warnings: dependencyIssues.filter((issue) => !dependencyBlockers.includes(issue)),
      blockers: dependencyBlockers,
      summary: "Dependency-driven revalidation",
      checkedAt: now,
    },
    host: {
      status:
        input.hostValidation.skipped
          ? "unvalidated"
          : input.hostValidation.success
            ? "passed"
            : "failed",
      warnings: [],
      blockers: input.hostValidation.success || input.hostValidation.skipped ? [] : input.hostValidation.issues,
      summary: "Host validation",
      checkedAt: now,
    },
    runtime: {
      status:
        input.runtimeValidation.skipped || input.dryRun
          ? "unvalidated"
          : input.runtimeValidation.success
            ? "passed"
            : "failed",
      warnings: [],
      blockers:
        input.runtimeValidation.success || input.runtimeValidation.skipped || input.dryRun
          ? []
          : input.runtimeValidation.limitations,
      summary: "Runtime validation",
      checkedAt: now,
    },
  };
}

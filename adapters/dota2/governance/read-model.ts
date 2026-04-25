import type { GroundingAssessment } from "../../../core/schema/types.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import {
  planPostGenerationRepairs,
  type PostGenerationCheck,
  type PostGenerationRepairAction,
  type PostGenerationRepairPlan,
} from "../validator/post-generation-repair.js";
import {
  validatePostGeneration,
  type PostGenerationValidationResult,
} from "../validator/post-generation-validator.js";
import {
  summarizeDota2FeatureGovernance,
  type Dota2FeatureGovernanceSummary,
} from "./feature-governance.js";

export const DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION = "dota2-governance-read-model/v1" as const;

type Dota2AdmissionStatus = Dota2FeatureGovernanceSummary["familyAdmissions"][number]["status"];

export type Dota2GovernanceRepairability =
  | "not_checked"
  | "clean"
  | "review_required"
  | "repair_safe"
  | "upgrade_workspace_grounding"
  | "requires_regenerate";
export type Dota2GovernanceRepairabilityKind = Dota2GovernanceRepairability;

export interface Dota2GovernanceAssetAdmission {
  assetId: string;
  status: Dota2AdmissionStatus;
}

export interface Dota2FeatureLifecycleReadModel {
  implementationStrategy?: RuneWeaverFeatureRecord["implementationStrategy"];
  maturity?: RuneWeaverFeatureRecord["maturity"];
  commitOutcome?: NonNullable<RuneWeaverFeatureRecord["commitDecision"]>["outcome"];
  requiresReview: boolean;
  reviewReasons: string[];
}

export interface Dota2FeatureReusableGovernanceReadModel {
  familyAdmissions: Dota2GovernanceAssetAdmission[];
  patternAdmissions: Dota2GovernanceAssetAdmission[];
  seamAdmissions: Dota2GovernanceAssetAdmission[];
  admittedCount: number;
  attentionCount: number;
  summary: string;
}

export interface Dota2FeatureGroundingReadModel {
  status: GroundingAssessment["status"] | "none_required";
  reviewRequired: boolean;
  verifiedSymbolCount: number;
  allowlistedSymbolCount: number;
  weakSymbolCount: number;
  unknownSymbolCount: number;
  warningCount: number;
  warnings: string[];
  reasonCodes: string[];
  summary: string;
}

export interface Dota2FeatureRepairabilityReadModel {
  status: Dota2GovernanceRepairability;
  reasons: string[];
  summary: string;
}

export interface Dota2FeatureProductVerdictReadModel {
  label: string;
  reasons: string[];
}

export interface Dota2GovernanceFeatureReadModel {
  featureId: string;
  status: RuneWeaverFeatureRecord["status"];
  revision: number;
  updatedAt: string;
  lifecycle: Dota2FeatureLifecycleReadModel;
  reusableGovernance: Dota2FeatureReusableGovernanceReadModel;
  grounding: Dota2FeatureGroundingReadModel;
  repairability: Dota2FeatureRepairabilityReadModel;
  productVerdict: Dota2FeatureProductVerdictReadModel;
}

export interface Dota2GovernanceWorkspaceLiveValidationSummary {
  status: "not_checked" | "clean" | "review_required" | "failed";
  failedCheckCount: number;
  warningCount: number;
  executableRepairCount: number;
  summary: string;
}

export interface Dota2GovernanceReadModel {
  schemaVersion: typeof DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION;
  workspace: {
    hostRoot: string;
    featureCount: number;
    liveValidationSummary?: Dota2GovernanceWorkspaceLiveValidationSummary;
  };
  features: Dota2GovernanceFeatureReadModel[];
}

export interface Dota2GovernanceLiveObservation {
  hostRoot: string;
  validation: PostGenerationValidationResult;
  repairPlan: PostGenerationRepairPlan;
}

export interface BuildDota2GovernanceReadModelInput {
  hostRoot: string;
  features: RuneWeaverFeatureRecord[];
  liveObservation?: Dota2GovernanceLiveObservation;
}

export interface Dota2RepairabilityPresentation {
  kind: Dota2GovernanceRepairability;
  status: Dota2GovernanceRepairability;
  label: string;
  doctorHeadline: string;
  doctorReason: string;
  failureQualifier?: string;
  buildSuggestion(hostRoot: string): string | undefined;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function extractFeatureIdsFromText(text: string, featureIds: Set<string>): string[] {
  const matches: string[] = [];
  const quotedFeaturePattern = /feature '([^']+)'/g;
  let quotedMatch: RegExpExecArray | null;
  while ((quotedMatch = quotedFeaturePattern.exec(text)) !== null) {
    const candidate = quotedMatch[1];
    if (candidate && featureIds.has(candidate)) {
      matches.push(candidate);
    }
  }

  const prefixedMatch = text.match(/^([A-Za-z0-9_.-]+):/);
  if (prefixedMatch?.[1] && featureIds.has(prefixedMatch[1])) {
    matches.push(prefixedMatch[1]);
  }

  return dedupe(matches);
}

function collectCheckFeatureIds(check: PostGenerationCheck, featureIds: Set<string>): string[] {
  return dedupe([check.message, ...(check.details || [])].flatMap((text) => extractFeatureIdsFromText(text, featureIds)));
}

function getActionContextStrings(action: PostGenerationRepairAction): string[] {
  const detailValues = action.data?.context && "details" in action.data.context
    ? action.data.context.details
    : undefined;

  return [
    action.title,
    action.description,
    ...(Array.isArray(detailValues)
      ? detailValues.filter((value): value is string => typeof value === "string")
      : []),
  ];
}

function collectActionFeatureIds(action: PostGenerationRepairAction, featureIds: Set<string>): string[] {
  const explicitFeatureIds = action.data?.groundingUpgrade?.featureIds || [];
  const contextualFeatureIds = getActionContextStrings(action).flatMap((text) => extractFeatureIdsFromText(text, featureIds));
  return dedupe([
    ...explicitFeatureIds.filter((featureId) => featureIds.has(featureId)),
    ...contextualFeatureIds,
  ]);
}

function buildReusableGovernance(feature: RuneWeaverFeatureRecord): Dota2FeatureReusableGovernanceReadModel {
  const summary = summarizeDota2FeatureGovernance(feature);
  const allAdmissions = [
    ...summary.familyAdmissions,
    ...summary.patternAdmissions,
    ...summary.seamAdmissions,
  ];
  const admittedCount = allAdmissions.filter((entry) => entry.status === "admitted").length;
  const attentionCount = allAdmissions.length - admittedCount;

  let readableSummary = "No reusable-governance assets are referenced by this feature.";
  if (allAdmissions.length > 0 && attentionCount === 0) {
    readableSummary = "All referenced reusable assets are formally admitted.";
  } else if (allAdmissions.length > 0) {
    readableSummary = `${attentionCount} referenced reusable asset(s) still need attention.`;
  }

  return {
    familyAdmissions: summary.familyAdmissions,
    patternAdmissions: summary.patternAdmissions,
    seamAdmissions: summary.seamAdmissions,
    admittedCount,
    attentionCount,
    summary: readableSummary,
  };
}

function buildGrounding(feature: RuneWeaverFeatureRecord): Dota2FeatureGroundingReadModel {
  const grounding = feature.groundingSummary;
  if (!grounding) {
    return {
      status: "none_required",
      reviewRequired: false,
      verifiedSymbolCount: 0,
      allowlistedSymbolCount: 0,
      weakSymbolCount: 0,
      unknownSymbolCount: 0,
      warningCount: 0,
      warnings: [],
      reasonCodes: [],
      summary: "No persisted grounding summary is recorded for this feature.",
    };
  }

  let summary = "Grounding does not require additional review.";
  if (grounding.status === "exact") {
    summary = "Grounding is exact on the persisted workspace record.";
  } else if (grounding.status === "partial") {
    summary = "Grounding is partial and still requires manual review.";
  } else if (grounding.status === "insufficient") {
    summary = "Grounding is insufficient for unattended trust.";
  }

  return {
    status: grounding.status,
    reviewRequired: grounding.reviewRequired,
    verifiedSymbolCount: grounding.verifiedSymbolCount,
    allowlistedSymbolCount: grounding.allowlistedSymbolCount,
    weakSymbolCount: grounding.weakSymbolCount,
    unknownSymbolCount: grounding.unknownSymbolCount,
    warningCount: grounding.warnings.length,
    warnings: grounding.warnings,
    reasonCodes: grounding.reasonCodes,
    summary,
  };
}

function buildLifecycle(feature: RuneWeaverFeatureRecord): Dota2FeatureLifecycleReadModel {
  const groundingReason = feature.groundingSummary?.reviewRequired
    ? `Grounding remains ${feature.groundingSummary.status}.`
    : "";
  const reviewReasons = dedupe([
    ...(feature.commitDecision?.reasons || []),
    groundingReason,
  ]);

  return {
    implementationStrategy: feature.implementationStrategy,
    maturity: feature.maturity,
    commitOutcome: feature.commitDecision?.outcome,
    requiresReview:
      feature.commitDecision?.requiresReview === true
      || feature.groundingSummary?.reviewRequired === true,
    reviewReasons,
  };
}

function resolveRepairabilityStatus(input: {
  validation: PostGenerationValidationResult;
  featureId: string;
  featureIds: Set<string>;
  repairPlan: PostGenerationRepairPlan;
}): {
  status: Dota2GovernanceRepairability;
  reasons: string[];
} {
  const featureFailedChecks = input.validation.checks.filter(
    (check) => !check.passed && collectCheckFeatureIds(check, input.featureIds).includes(input.featureId),
  );
  const featureWarningChecks = input.validation.checks.filter(
    (check) =>
      check.passed
      && (check.details?.length || 0) > 0
      && collectCheckFeatureIds(check, input.featureIds).includes(input.featureId),
  );
  const featureActions = input.repairPlan.actions.filter(
    (action) => collectActionFeatureIds(action, input.featureIds).includes(input.featureId),
  );
  const genericActions = input.repairPlan.actions.filter(
    (action) => collectActionFeatureIds(action, input.featureIds).length === 0,
  );

  if (featureActions.some((action) => action.kind === "requires_regenerate")) {
    return {
      status: "requires_regenerate",
      reasons: dedupe(featureActions.filter((action) => action.kind === "requires_regenerate").map((action) => action.title)),
    };
  }
  if (featureActions.some((action) => action.kind === "upgrade_workspace_grounding")) {
    return {
      status: "upgrade_workspace_grounding",
      reasons: dedupe(featureActions.filter((action) => action.kind === "upgrade_workspace_grounding").map((action) => action.title)),
    };
  }
  if (featureActions.some((action) => action.executable) || featureFailedChecks.length > 0) {
    return {
      status: "repair_safe",
      reasons: dedupe([
        ...featureActions.filter((action) => action.executable).map((action) => action.title),
        ...featureFailedChecks.map((check) => check.message),
      ]),
    };
  }
  if (featureWarningChecks.length > 0) {
    return {
      status: "review_required",
      reasons: dedupe(featureWarningChecks.flatMap((check) => check.details || [check.message])),
    };
  }
  if (genericActions.some((action) => action.kind === "requires_regenerate")) {
    return {
      status: "requires_regenerate",
      reasons: dedupe(genericActions.filter((action) => action.kind === "requires_regenerate").map((action) => action.title)),
    };
  }
  if (genericActions.some((action) => action.kind === "upgrade_workspace_grounding")) {
    return {
      status: "upgrade_workspace_grounding",
      reasons: dedupe(genericActions.filter((action) => action.kind === "upgrade_workspace_grounding").map((action) => action.title)),
    };
  }
  if (genericActions.some((action) => action.executable) || input.validation.summary.failed > 0) {
    return {
      status: "repair_safe",
      reasons: dedupe(genericActions.filter((action) => action.executable).map((action) => action.title)),
    };
  }

  return {
    status: "clean",
    reasons: [],
  };
}

export function describeDota2Repairability(status: Dota2GovernanceRepairability): Dota2RepairabilityPresentation {
  switch (status) {
    case "upgrade_workspace_grounding":
      return {
        kind: status,
        status,
        label: "upgradeable legacy grounding",
        doctorHeadline: "Upgrade legacy synthesized grounding",
        doctorReason: "Preserved raw grounding is present and can be upgraded into canonical module and feature assessments.",
        failureQualifier: "upgradeable legacy grounding state detected",
        buildSuggestion: (hostRoot) =>
          `Run npm run cli -- dota2 repair --host ${hostRoot} --safe to upgrade canonical workspace grounding from preserved raw metadata.`,
      };
    case "requires_regenerate":
      return {
        kind: status,
        status,
        label: "requires regenerate",
        doctorHeadline: "Regenerate stale synthesized grounding",
        doctorReason: "This host predates the canonical grounding contract and repair cannot reconstruct missing raw grounding honestly.",
        failureQualifier: "stale synthesized grounding requires regenerate",
        buildSuggestion: () =>
          "Regenerate the affected synthesized feature with the current pipeline; this host predates the canonical grounding contract and preserved raw grounding is missing.",
      };
    case "review_required":
      return {
        kind: status,
        status,
        label: "review-required grounding",
        doctorHeadline: "Review exploratory grounding warnings",
        doctorReason: "Fresh synthesized output still has partial or insufficient grounding and remains review-required.",
        buildSuggestion: () => "Review synthesized modules with partial or insufficient grounding before promotion.",
      };
    case "repair_safe":
      return {
        kind: status,
        status,
        label: "repair-safe runtime wiring",
        doctorHeadline: "Repair generated/runtime wiring",
        doctorReason: "Generated files or bridge wiring are inconsistent with a runnable host.",
        buildSuggestion: (hostRoot) =>
          `Run npm run cli -- dota2 repair --host ${hostRoot} --safe to reconcile generated/runtime wiring with the current host state.`,
      };
    case "clean":
      return {
        kind: status,
        status,
        label: "clean",
        doctorHeadline: "No repair action required",
        doctorReason: "Live post-generation observation does not require repair action.",
        buildSuggestion: () => undefined,
      };
    case "not_checked":
    default:
      return {
        kind: "not_checked",
        status: "not_checked",
        label: "not checked",
        doctorHeadline: "No live repairability observation",
        doctorReason: "This projection was built without running live post-generation validation.",
        buildSuggestion: () => undefined,
      };
  }
}

function buildRepairability(feature: RuneWeaverFeatureRecord, input: BuildDota2GovernanceReadModelInput): Dota2FeatureRepairabilityReadModel {
  if (!input.liveObservation) {
    return {
      status: "not_checked",
      reasons: [],
      summary: describeDota2Repairability("not_checked").doctorReason,
    };
  }

  const featureIds = new Set(input.features.map((candidate) => candidate.featureId));
  const result = resolveRepairabilityStatus({
    validation: input.liveObservation.validation,
    featureId: feature.featureId,
    featureIds,
    repairPlan: input.liveObservation.repairPlan,
  });
  const description = describeDota2Repairability(result.status);

  return {
    status: result.status,
    reasons: result.reasons,
    summary: description.doctorReason,
  };
}

function buildProductVerdict(feature: Dota2GovernanceFeatureReadModel): Dota2FeatureProductVerdictReadModel {
  if (feature.repairability.status === "requires_regenerate") {
    return {
      label: "Regenerate required",
      reasons: [feature.repairability.summary, ...feature.repairability.reasons].slice(0, 4),
    };
  }
  if (
    feature.repairability.status === "upgrade_workspace_grounding"
    || feature.repairability.status === "repair_safe"
  ) {
    return {
      label: "Repair available",
      reasons: [feature.repairability.summary, ...feature.repairability.reasons].slice(0, 4),
    };
  }
  if (
    feature.repairability.status === "review_required"
    || feature.lifecycle.requiresReview
  ) {
    return {
      label: "Review required",
      reasons: dedupe([
        feature.repairability.summary,
        ...feature.lifecycle.reviewReasons,
      ]).slice(0, 4),
    };
  }
  if (feature.repairability.status === "not_checked") {
    return {
      label: "Not checked",
      reasons: [feature.repairability.summary],
    };
  }

  return {
    label: "Clean",
    reasons: [
      feature.grounding.summary,
      feature.reusableGovernance.summary,
    ].filter((reason) => reason.length > 0).slice(0, 3),
  };
}

function buildWorkspaceLiveValidationSummary(
  liveObservation?: Dota2GovernanceLiveObservation,
): Dota2GovernanceWorkspaceLiveValidationSummary | undefined {
  if (!liveObservation) {
    return undefined;
  }

  const groundingCheck = liveObservation.validation.checks.find(
    (check) => check.check === "synthesized_grounding_governance",
  );
  const warningCount = groundingCheck?.details?.length || 0;
  const repairabilityStatus =
    liveObservation.validation.valid
      ? warningCount > 0
        ? "review_required"
        : "clean"
      : "failed";

  let summary = "Live post-generation validation is clean.";
  if (repairabilityStatus === "review_required") {
    summary = "Live post-generation validation passed, but synthesized grounding still requires review.";
  } else if (repairabilityStatus === "failed") {
    const remediation = describeDota2Repairability(
      resolveWorkspaceFailureRepairability(liveObservation.repairPlan),
    );
    summary = remediation.doctorReason;
  }

  return {
    status: repairabilityStatus,
    failedCheckCount: liveObservation.validation.summary.failed,
    warningCount,
    executableRepairCount: liveObservation.repairPlan.executableActions.length,
    summary,
  };
}

function resolveWorkspaceRepairability(
  liveObservation?: Dota2GovernanceLiveObservation,
): Dota2GovernanceRepairability {
  if (!liveObservation) {
    return "not_checked";
  }
  const groundingCheck = liveObservation.validation.checks.find(
    (check) => check.check === "synthesized_grounding_governance",
  );
  if (liveObservation.validation.valid && groundingCheck?.details?.length) {
    return "review_required";
  }
  if (liveObservation.validation.valid) {
    return "clean";
  }
  return resolveWorkspaceFailureRepairability(liveObservation.repairPlan);
}

function resolveWorkspaceFailureRepairability(
  repairPlan: PostGenerationRepairPlan,
): Dota2GovernanceRepairability {
  if (repairPlan.summary.requiresRegenerate > 0 && repairPlan.executableActions.length === 0) {
    return "requires_regenerate";
  }
  if (repairPlan.summary.upgradeWorkspaceGrounding > 0) {
    return "upgrade_workspace_grounding";
  }
  return "repair_safe";
}

export function buildDota2FeatureGovernanceReadModel(
  feature: RuneWeaverFeatureRecord,
  input: BuildDota2GovernanceReadModelInput,
): Dota2GovernanceFeatureReadModel {
  const lifecycle = buildLifecycle(feature);
  const reusableGovernance = buildReusableGovernance(feature);
  const grounding = buildGrounding(feature);
  const repairability = buildRepairability(feature, input);

  const readModel: Dota2GovernanceFeatureReadModel = {
    featureId: feature.featureId,
    status: feature.status,
    revision: feature.revision,
    updatedAt: feature.updatedAt,
    lifecycle,
    reusableGovernance,
    grounding,
    repairability,
    productVerdict: {
      label: "",
      reasons: [],
    },
  };

  readModel.productVerdict = buildProductVerdict(readModel);
  return readModel;
}

export function buildDota2RepairabilityReadModel(
  statusOrLiveObservation: Dota2GovernanceRepairability | Dota2GovernanceLiveObservation | undefined,
): Dota2RepairabilityPresentation {
  if (!statusOrLiveObservation || typeof statusOrLiveObservation === "string") {
    return describeDota2Repairability(statusOrLiveObservation || "not_checked");
  }

  return describeDota2Repairability(resolveWorkspaceRepairability(statusOrLiveObservation));
}

export function buildDota2GovernanceReadModel(
  input: BuildDota2GovernanceReadModelInput,
): Dota2GovernanceReadModel {
  return {
    schemaVersion: DOTA2_GOVERNANCE_READ_MODEL_SCHEMA_VERSION,
    workspace: {
      hostRoot: input.hostRoot,
      featureCount: input.features.length,
      liveValidationSummary: buildWorkspaceLiveValidationSummary(input.liveObservation),
    },
    features: input.features.map((feature) => buildDota2FeatureGovernanceReadModel(feature, input)),
  };
}

export function findDota2GovernanceFeatureReadModel(
  readModel: Dota2GovernanceReadModel,
  featureId: string,
): Dota2GovernanceFeatureReadModel | undefined {
  return readModel.features.find((feature) => feature.featureId === featureId);
}

export function observeDota2GovernanceLiveObservation(
  hostRoot: string,
): Dota2GovernanceLiveObservation {
  const validation = validatePostGeneration(hostRoot);
  const repairPlan = planPostGenerationRepairs(validation, hostRoot);
  return {
    hostRoot,
    validation,
    repairPlan,
  };
}

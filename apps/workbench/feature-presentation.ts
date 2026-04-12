import type {
  ClarificationResult,
  ConflictCheckResult,
  FeatureCard,
  FeatureCardStatus,
  FeatureDetail,
  FeatureDetailBasicInfo,
  FeatureDetailEditableParams,
  FeatureDetailHostOutput,
  FeatureDetailPatternBindings,
  FeatureDetailStatus,
  FeatureIdentity,
  FeatureOwnership,
  FeatureReview,
  IntegrationPointRegistry,
  KnownInputs,
} from "./types.js";

export function createFeatureCard(
  featureIdentity: FeatureIdentity,
  featureOwnership: FeatureOwnership,
  conflictResult: ConflictCheckResult,
  review: FeatureReview,
): FeatureCard {
  const statusMap: Record<string, FeatureCardStatus> = {
    intake: "draft",
    review: "draft",
    blueprint_pending: "draft",
    generating: "draft",
    ready: "ready",
    error: "blocked",
  };

  const conflictStatusMap: Record<string, FeatureCardStatus> = {
    safe: "ready",
    needs_confirmation: "needs_clarification",
    blocked: "blocked",
  };

  const currentStage = featureIdentity.currentStage ?? "intake";
  const cardStatus = conflictResult.status !== "safe"
    ? conflictStatusMap[conflictResult.status] || "draft"
    : statusMap[currentStage] || "draft";

  const needsConfirmation = conflictResult.status === "needs_confirmation" ||
    conflictResult.status === "blocked" ||
    review.nextStep.action === "clarify";

  const riskLevel: "low" | "medium" | "high" =
    conflictResult.status === "blocked" ? "high" :
      conflictResult.status === "needs_confirmation" ? "medium" :
        "low";

  const now = new Date();

  return {
    id: featureIdentity.id,
    displayLabel: featureIdentity.label,
    systemLabel: featureIdentity.label.toLowerCase().replace(/\s+/g, "_"),
    summary: review.featureSummary || `Feature: ${featureIdentity.label}`,
    host: "dota2",
    status: cardStatus,
    riskLevel,
    needsConfirmation,
    createdAt: featureIdentity.createdAt || now,
    updatedAt: now,
  };
}

export function createFeatureDetail(
  featureCard: FeatureCard,
  featureIdentity: FeatureIdentity,
  featureOwnership: FeatureOwnership,
  integrationPoints: IntegrationPointRegistry,
  conflictResult: ConflictCheckResult,
  knownInputs: KnownInputs,
  clarification: ClarificationResult,
): FeatureDetail {
  const now = new Date();

  const basicInfo: FeatureDetailBasicInfo = {
    id: featureIdentity.id,
    displayLabel: featureIdentity.label,
    systemLabel: featureCard.systemLabel,
    intentSummary: featureIdentity.intentSummary,
    hostScope: featureIdentity.hostScope,
    createdAt: featureIdentity.createdAt || now,
    updatedAt: now,
  };

  const status: FeatureDetailStatus = {
    status: featureCard.status,
    riskLevel: featureCard.riskLevel,
    needsConfirmation: featureCard.needsConfirmation,
    conflictCount: conflictResult.conflicts.length,
    lastConflictSummary: conflictResult.summary,
  };

  const editableParams: FeatureDetailEditableParams = {
    knownInputs,
    missingParams: clarification.missingParams,
    canEdit: clarification.hasMissingKeyParams,
  };

  const hostOutput: FeatureDetailHostOutput = {
    host: featureCard.host,
    expectedSurfaces: featureOwnership.expectedSurfaces,
    impactAreas: featureOwnership.impactAreas,
    integrationPointCount: integrationPoints.points.length,
    outputSummary: `Expected ${integrationPoints.points.length} integration point(s) on ${featureCard.host}`,
  };

  const patternBindings: FeatureDetailPatternBindings = {
    patterns: [],
    isBound: false,
  };

  return {
    cardId: featureCard.id,
    basicInfo,
    status,
    editableParams,
    hostOutput,
    patternBindings,
  };
}

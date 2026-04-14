import type { RuneWeaverFeatureRecord } from "../../core/workspace/types.js";
import { extractIntegrationPoints } from "./intake-analysis.js";
import type {
  ConflictCheckResult,
  ConflictSeverity,
  ConflictStatus,
  IntegrationPointConflict,
  IntegrationPointRegistry,
  RecommendedAction,
} from "./types.js";

export function detectSharedIntegrationPointConflict(
  featureId: string,
  featureLabel: string,
  integrationPoints: IntegrationPointRegistry,
  workspace: { features: RuneWeaverFeatureRecord[] } | null,
): ConflictCheckResult {
  const currentPointKinds = integrationPoints.points.map((point) => point.kind);
  const conflicts: IntegrationPointConflict[] = [];

  if (workspace && workspace.features) {
    const existingFeatures = workspace.features.filter(
      (feature) => feature.featureId !== featureId && feature.status === "active",
    );

    for (const existingFeature of existingFeatures) {
      const existingPoints = extractIntegrationPoints(existingFeature);

      for (const existingPoint of existingPoints) {
        if (currentPointKinds.includes(existingPoint)) {
          const severity: ConflictSeverity =
            existingPoint === "ability_slot" || existingPoint === "data_pool"
              ? "error"
              : "warning";

          conflicts.push({
            kind: "shared_integration_point",
            severity,
            conflictingPoint: existingPoint,
            existingFeatureId: existingFeature.featureId,
            existingFeatureLabel: existingFeature.featureName || existingFeature.intentKind || existingFeature.featureId,
            explanation: `Both this feature and existing feature '${existingFeature.featureId}' require '${existingPoint}' integration point.`,
          });
        }
      }
    }
  }

  let status: ConflictStatus;
  let recommendedAction: RecommendedAction;
  let summary: string;

  if (conflicts.length === 0) {
    status = "safe";
    recommendedAction = "proceed";
    summary = "No integration point conflicts detected with existing features.";
  } else {
    const hasError = conflicts.some((conflict) => conflict.severity === "error");
    if (hasError) {
      status = "blocked";
      recommendedAction = "block";
      summary = `Detected ${conflicts.length} conflict(s) including critical shared integration point(s). Review required before proceeding.`;
    } else {
      status = "needs_confirmation";
      recommendedAction = "confirm";
      summary = `Detected ${conflicts.length} conflict(s) with existing features. Please confirm to proceed.`;
    }
  }

  return {
    featureId,
    hasConflict: conflicts.length > 0,
    conflicts,
    status,
    recommendedAction,
    summary,
  };
}

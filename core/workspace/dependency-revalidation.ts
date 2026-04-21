import type {
  DependencyImpactRecord,
  DependencyRevalidationResult,
  FeatureContract,
  ValidationStatus,
} from "../schema/types.js";
import type { RuneWeaverFeatureRecord, RuneWeaverWorkspace } from "./types.js";

export interface DependencyRevalidationInput {
  workspace: RuneWeaverWorkspace | null;
  providerFeatureId: string;
  nextFeatureContract?: FeatureContract;
  lifecycleAction: "create" | "update" | "regenerate" | "delete" | "rollback";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function findExportKind(
  contract: FeatureContract | undefined,
  surfaceId: string,
): string | undefined {
  if (!contract) {
    return undefined;
  }

  const exported = contract.exports.find((item) => item.id === surfaceId);
  if (exported) {
    return exported.kind;
  }
  if (contract.integrationSurfaces.includes(surfaceId)) {
    return "integration";
  }
  if (contract.stateScopes.some((item) => item.stateId === surfaceId)) {
    return "state";
  }
  return undefined;
}

function getImpactedFeatures(
  workspace: RuneWeaverWorkspace,
  providerFeatureId: string,
): RuneWeaverFeatureRecord[] {
  return workspace.features.filter((feature) => {
    if (feature.status !== "active" || feature.featureId === providerFeatureId) {
      return false;
    }

    if (feature.dependsOn?.includes(providerFeatureId)) {
      return true;
    }

    return Boolean(
      feature.dependencyEdges?.some((edge) => edge.targetFeatureId === providerFeatureId),
    );
  });
}

function evaluateFeatureImpact(
  feature: RuneWeaverFeatureRecord,
  providerFeatureId: string,
  nextFeatureContract: FeatureContract | undefined,
  lifecycleAction: DependencyRevalidationInput["lifecycleAction"],
): DependencyImpactRecord {
  const issues: string[] = [];
  let blocked = false;
  let downgraded = false;
  const relevantEdges = (feature.dependencyEdges || []).filter(
    (edge) => edge.targetFeatureId === providerFeatureId,
  );

  const implicitDependsOn =
    feature.dependsOn?.includes(providerFeatureId) && relevantEdges.length === 0;

  if (!nextFeatureContract) {
    if (relevantEdges.length === 0 && implicitDependsOn) {
      blocked = true;
      issues.push(
        `${lifecycleAction} would remove provider '${providerFeatureId}' for dependent feature '${feature.featureId}'.`,
      );
    }

    for (const edge of relevantEdges) {
      const prefix = edge.required ? "Required" : "Optional";
      const targetSurface = edge.targetSurfaceId ? ` surface '${edge.targetSurfaceId}'` : "";
      issues.push(
        `${prefix} dependency on feature '${providerFeatureId}'${targetSurface} is no longer available.`,
      );
      if (edge.required) {
        blocked = true;
      } else {
        downgraded = true;
      }
    }
  } else {
    for (const edge of relevantEdges) {
      if (!edge.targetSurfaceId) {
        continue;
      }

      const nextKind = findExportKind(nextFeatureContract, edge.targetSurfaceId);
      if (!nextKind) {
        issues.push(
          `${edge.required ? "Required" : "Optional"} surface '${edge.targetSurfaceId}' is missing from '${providerFeatureId}'.`,
        );
        if (edge.required) {
          blocked = true;
        } else {
          downgraded = true;
        }
        continue;
      }

      const consumedKind = feature.featureContract?.consumes.find(
        (item) => item.id === edge.targetSurfaceId,
      )?.kind;
      if (consumedKind && consumedKind !== nextKind) {
        issues.push(
          `${edge.required ? "Required" : "Optional"} surface '${edge.targetSurfaceId}' changed kind from '${consumedKind}' to '${nextKind}'.`,
        );
        if (edge.required) {
          blocked = true;
        } else {
          downgraded = true;
        }
      }
    }
  }

  return {
    featureId: feature.featureId,
    label: feature.featureName || feature.intentKind || feature.featureId,
    outcome: blocked ? "blocked" : downgraded ? "needs_review" : "validated",
    issues,
  };
}

export function analyzeDependencyRevalidation(
  input: DependencyRevalidationInput,
): DependencyRevalidationResult {
  if (!input.workspace) {
    return {
      success: true,
      providerFeatureId: input.providerFeatureId,
      impactedFeatures: [],
      blockers: [],
      downgradedFeatures: [],
      compatibleFeatures: [],
    };
  }

  const impactedFeatures = getImpactedFeatures(input.workspace, input.providerFeatureId)
    .map((feature) =>
      evaluateFeatureImpact(
        feature,
        input.providerFeatureId,
        input.nextFeatureContract,
        input.lifecycleAction,
      ),
    );
  const blockers = unique(
    impactedFeatures
      .filter((item) => item.outcome === "blocked")
      .flatMap((item) => item.issues),
  );
  const downgradedFeatures = impactedFeatures
    .filter((item) => item.outcome === "needs_review")
    .map((item) => item.featureId);
  const compatibleFeatures = impactedFeatures
    .filter((item) => item.outcome === "validated")
    .map((item) => item.featureId);

  return {
    success: blockers.length === 0,
    providerFeatureId: input.providerFeatureId,
    impactedFeatures,
    blockers,
    downgradedFeatures,
    compatibleFeatures,
  };
}

function mergeValidationStatus(
  existing: ValidationStatus | undefined,
  status: ValidationStatus,
): ValidationStatus {
  return {
    ...existing,
    ...status,
    warnings: unique([...(existing?.warnings || []), ...status.warnings]),
    blockers: unique([...(existing?.blockers || []), ...status.blockers]),
  };
}

export function applyDependencyRevalidationEffects(
  workspace: RuneWeaverWorkspace,
  result: DependencyRevalidationResult,
): RuneWeaverWorkspace {
  const now = new Date().toISOString();

  return {
    ...workspace,
    features: workspace.features.map((feature) => {
      const impact = result.impactedFeatures.find((item) => item.featureId === feature.featureId);
      if (!impact || feature.status !== "active") {
        return feature;
      }

      if (impact.outcome === "blocked") {
        return feature;
      }

      const validationStatus: ValidationStatus =
        impact.outcome === "needs_review"
          ? {
              status: "needs_review",
              warnings: impact.issues,
              blockers: [],
              lastValidatedAt: now,
              dependency: {
                status: "needs_review",
                warnings: impact.issues,
                blockers: [],
                summary: `Dependency revalidation after provider '${result.providerFeatureId}'`,
                checkedAt: now,
              },
            }
          : {
              status: "passed",
              warnings: [],
              blockers: [],
              lastValidatedAt: now,
              dependency: {
                status: "passed",
                warnings: [],
                blockers: [],
                summary: `Dependency revalidated against provider '${result.providerFeatureId}'`,
                checkedAt: now,
              },
            };

      return {
        ...feature,
        validationStatus: mergeValidationStatus(feature.validationStatus, validationStatus),
        updatedAt: now,
      };
    }),
  };
}

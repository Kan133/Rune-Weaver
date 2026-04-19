import type { FeatureAuthoring as CoreFeatureAuthoring } from "../../../../core/schema/types.js";
import type { FeatureSourceModelRef, FeatureWriteResult } from "../../../../core/workspace/types.js";
import type { WritePlan, WritePlanEntry } from "../../assembler/index.js";
import { createSelectionPoolLifecycleState, isSelectionPoolFeatureAuthoring } from "./authoring.js";

function isFeatureSourceModelRef(value: unknown): value is FeatureSourceModelRef {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).adapter === "string" &&
      typeof (value as Record<string, unknown>).version === "number" &&
      typeof (value as Record<string, unknown>).path === "string",
  );
}

export function appendSelectionPoolSourceModelEntry(
  writePlan: WritePlan,
  featureId: string,
  featureAuthoring: CoreFeatureAuthoring | undefined,
): void {
  const lifecycleState = createSelectionPoolLifecycleState(featureId, featureAuthoring);
  if (!lifecycleState) {
    return;
  }
  if (writePlan.entries.some((entry) => entry.targetPath === lifecycleState.sourceArtifactRef.path)) {
    return;
  }
  writePlan.entries.push({
    operation: "create",
    targetPath: lifecycleState.sourceArtifactRef.path,
    contentType: "json",
    contentSummary: `feature_source_model/selection_pool (json) objects:${lifecycleState.sourceArtifact.objects.length}${
      lifecycleState.sourceArtifact.objectKind ? ` metadata-kind:${lifecycleState.sourceArtifact.objectKind}` : ""
    }`,
    sourcePattern: "rw.feature_source_model",
    sourceModule: "feature_source_model",
    safe: true,
    parameters: lifecycleState.sourceArtifact as unknown as Record<string, unknown>,
    metadata: {
      sourceModelRef: lifecycleState.sourceArtifactRef,
      featureAuthoring: lifecycleState.featureAuthoring,
      adapter: "selection_pool",
    },
  });
  writePlan.executionOrder = [...writePlan.executionOrder, writePlan.entries.length - 1];
  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((entry) => entry.operation === "create").length,
    update: writePlan.entries.filter((entry) => entry.operation === "update").length,
    conflicts: writePlan.entries.filter((entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0)).length,
    deferred: writePlan.entries.filter((entry) => entry.deferred).length,
  };
}

export function extractSourceModelRefFromWritePlan(writePlan: WritePlan): FeatureSourceModelRef | undefined {
  const candidate = writePlan.entries.find((entry) => entry.sourcePattern === "rw.feature_source_model")?.metadata?.sourceModelRef;
  return isFeatureSourceModelRef(candidate)
    ? {
        adapter: candidate.adapter,
        version: candidate.version,
        path: candidate.path,
      }
    : undefined;
}

export function extractFeatureAuthoringFromWritePlan(writePlan: WritePlan): CoreFeatureAuthoring | undefined {
  const sourceEntry = writePlan.entries.find((entry) => entry.sourcePattern === "rw.feature_source_model");
  const candidate = sourceEntry?.metadata?.featureAuthoring;
  if (!isSelectionPoolFeatureAuthoring(candidate)) {
    return undefined;
  }
  return candidate;
}

export function isFeatureSourceModelEntry(entry: WritePlanEntry | undefined): boolean {
  return Boolean(
    entry &&
      (
        entry.sourcePattern === "rw.feature_source_model" ||
        entry.metadata?.adapter === "selection_pool" ||
        isFeatureSourceModelRef(entry.metadata?.sourceModelRef)
      )
  );
}

export function resolveSelectionPoolWorkspaceFields(
  writePlan: WritePlan,
  featureId: string,
  mode: "create" | "update" | "regenerate",
  blueprintFeatureAuthoring?: CoreFeatureAuthoring,
): Pick<FeatureWriteResult, "sourceModel" | "featureAuthoring"> {
  const sourceModel = extractSourceModelRefFromWritePlan(writePlan);
  const featureAuthoring = extractFeatureAuthoringFromWritePlan(writePlan);

  if (sourceModel || featureAuthoring) {
    return {
      sourceModel: sourceModel ?? (mode === "create" ? undefined : null),
      featureAuthoring:
        featureAuthoring ??
        blueprintFeatureAuthoring ??
        (mode === "create" ? undefined : null),
    };
  }

  const lifecycleState = blueprintFeatureAuthoring
    ? createSelectionPoolLifecycleState(featureId, blueprintFeatureAuthoring)
    : undefined;
  if (lifecycleState) {
    return {
      sourceModel: lifecycleState.sourceArtifactRef,
      featureAuthoring: lifecycleState.featureAuthoring,
    };
  }

  if (mode === "create") {
    return {
      sourceModel: undefined,
      featureAuthoring: undefined,
    };
  }

  return {
    sourceModel: null,
    featureAuthoring: null,
  };
}

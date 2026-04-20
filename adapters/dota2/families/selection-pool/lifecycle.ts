import type { FeatureAuthoring as CoreFeatureAuthoring } from "../../../../core/schema/types.js";
import { calculateHostWriteExecutionOrder } from "../../../../core/host/write-plan.js";
import type { FeatureSourceModelRef, FeatureWriteResult } from "../../../../core/workspace/types.js";
import type { WritePlan, WritePlanEntry } from "../../assembler/index.js";
import {
  compileSelectionPoolModuleParameters,
  createSelectionPoolLifecycleState,
} from "./materialization.js";
import {
  isSelectionPoolFeatureAuthoring,
  type FeatureAuthoring as SelectionPoolFeatureAuthoring,
} from "./shared.js";

const SELECTION_POOL_PATTERN_PARAMETER_KEYS = {
  "input.key_binding": "input_trigger",
  "data.weighted_pool": "weighted_pool",
  "rule.selection_flow": "selection_flow",
  "ui.selection_modal": "selection_modal",
} as const;

type SelectionPoolPatternSource = keyof typeof SELECTION_POOL_PATTERN_PARAMETER_KEYS;

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

function recomputeWritePlanDerivedFields(writePlan: WritePlan): void {
  writePlan.executionOrder = calculateHostWriteExecutionOrder(writePlan.entries);
  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((entry) => entry.operation === "create").length,
    update: writePlan.entries.filter((entry) => entry.operation === "update").length,
    conflicts: writePlan.entries.filter((entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0)).length,
    deferred: writePlan.entries.filter((entry) => entry.deferred).length,
  };
}

function buildPatternEntryContentSummary(
  entry: WritePlanEntry,
  parameters: Record<string, unknown> | undefined,
): string {
  return `${entry.sourcePattern} (${entry.contentType}) params: ${JSON.stringify(parameters || {})}`;
}

function isSelectionPoolPatternSource(value: string): value is SelectionPoolPatternSource {
  return value in SELECTION_POOL_PATTERN_PARAMETER_KEYS;
}

export function refreshSelectionPoolWritePlanEntries(
  writePlan: WritePlan,
  featureId: string,
  featureAuthoring: SelectionPoolFeatureAuthoring,
): void {
  const lifecycleState = createSelectionPoolLifecycleState(featureId, featureAuthoring);
  if (!lifecycleState) {
    return;
  }

  const compiledParameters = compileSelectionPoolModuleParameters(lifecycleState.featureAuthoring);
  for (const entry of writePlan.entries) {
    if (!isSelectionPoolPatternSource(entry.sourcePattern)) {
      continue;
    }

    const compiledKey = SELECTION_POOL_PATTERN_PARAMETER_KEYS[entry.sourcePattern];
    const nextParameters = compiledParameters[compiledKey];
    entry.parameters = nextParameters;
    entry.contentSummary = buildPatternEntryContentSummary(entry, nextParameters);
    entry.metadata = {
      ...(entry.metadata || {}),
      featureAuthoring: lifecycleState.featureAuthoring,
    };
  }

  const sourceEntryIndex = writePlan.entries.findIndex((entry) => entry.sourcePattern === "rw.feature_source_model");
  const existingSourceEntry = sourceEntryIndex >= 0 ? writePlan.entries[sourceEntryIndex] : undefined;
  const nextSourceEntry: WritePlanEntry = {
    operation: existingSourceEntry?.operation || "create",
    targetPath: lifecycleState.sourceArtifactRef.path,
    contentType: "json",
    contentSummary: `feature_source_model/selection_pool (json) objects:${lifecycleState.sourceArtifact.objects.length}${
      lifecycleState.sourceArtifact.objectKind ? ` metadata-kind:${lifecycleState.sourceArtifact.objectKind}` : ""
    }`,
    sourcePattern: "rw.feature_source_model",
    sourceModule: "feature_source_model",
    safe: existingSourceEntry?.safe ?? true,
    conflicts: existingSourceEntry?.conflicts,
    generatorFamilyHint: existingSourceEntry?.generatorFamilyHint,
    deferred: existingSourceEntry?.deferred,
    deferredReason: existingSourceEntry?.deferredReason,
    parameters: lifecycleState.sourceArtifact as unknown as Record<string, unknown>,
    metadata: {
      ...(existingSourceEntry?.metadata || {}),
      sourceModelRef: lifecycleState.sourceArtifactRef,
      featureAuthoring: lifecycleState.featureAuthoring,
      adapter: "selection_pool",
    },
  };

  if (sourceEntryIndex >= 0) {
    writePlan.entries[sourceEntryIndex] = nextSourceEntry;
  } else {
    writePlan.entries.push(nextSourceEntry);
  }

  recomputeWritePlanDerivedFields(writePlan);
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

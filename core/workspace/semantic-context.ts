import type {
  FeatureAuthoring,
  WorkspaceFeatureHandle,
  WorkspaceSemanticContext,
} from "../schema/types.js";
import type { RuneWeaverFeatureRecord, RuneWeaverWorkspace, WorkspaceStateResult } from "./types.js";
import { getActiveFeatures, initializeWorkspace } from "./manager.js";

function dedupeStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function readDisplayAliases(featureAuthoring: FeatureAuthoring | undefined): string[] {
  if (!featureAuthoring || !isRecord(featureAuthoring.parameters)) {
    return [];
  }

  const display = isRecord(featureAuthoring.parameters.display)
    ? featureAuthoring.parameters.display
    : undefined;
  if (!display) {
    return [];
  }

  return dedupeStrings([
    typeof display.title === "string" ? display.title : undefined,
    typeof display.inventoryTitle === "string" ? display.inventoryTitle : undefined,
    typeof display.description === "string" ? display.description : undefined,
  ]);
}

function tokenizeFeatureId(featureId: string): string[] {
  const normalized = featureId.replace(/[-.]/g, "_");
  return dedupeStrings([
    featureId,
    normalized,
    normalized.replace(/_/g, " "),
  ]);
}

function buildFeatureHandle(feature: RuneWeaverFeatureRecord): WorkspaceFeatureHandle {
  const aliases = dedupeStrings([
    ...tokenizeFeatureId(feature.featureId),
    feature.featureName,
    ...readDisplayAliases(feature.featureAuthoring),
    ...(feature.integrationPoints || []),
  ]);

  const semanticHints = dedupeStrings([
    feature.intentKind,
    ...(feature.selectedPatterns || []),
    ...(feature.integrationPoints || []),
    feature.sourceModel?.adapter,
    feature.featureAuthoring?.profile,
  ]);

  return {
    featureId: feature.featureId,
    ...(feature.featureName ? { featureName: feature.featureName } : {}),
    aliases,
    intentKind: feature.intentKind,
    selectedPatterns: [...(feature.selectedPatterns || [])],
    sourceBacked: Boolean(feature.sourceModel || feature.featureAuthoring),
    integrationPoints: [...(feature.integrationPoints || [])],
    semanticHints,
  };
}

export function buildWorkspaceSemanticContextFromWorkspace(
  workspace: RuneWeaverWorkspace,
): WorkspaceSemanticContext {
  const activeFeatures = getActiveFeatures(workspace);
  return {
    featureCount: activeFeatures.length,
    features: activeFeatures.map(buildFeatureHandle),
  };
}

export function loadWorkspaceSemanticContext(
  hostRoot: string,
): { success: true; context: WorkspaceSemanticContext } | { success: false; issues: string[] } {
  const result: WorkspaceStateResult = initializeWorkspace(hostRoot);
  if (!result.success || !result.workspace) {
    return {
      success: false,
      issues: result.issues,
    };
  }

  return {
    success: true,
    context: buildWorkspaceSemanticContextFromWorkspace(result.workspace),
  };
}

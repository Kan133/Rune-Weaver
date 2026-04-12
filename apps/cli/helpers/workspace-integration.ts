/**
 * Dota2 CLI - Workspace Integration Helpers
 *
 * T141: Extract Workspace Result Integration Out Of dota2-cli.ts
 *
 * This module contains workspace result integration logic only.
 * No command parsing, no pipeline orchestration, no artifact building.
 *
 * Split Principle:
 * - CLI should become a command orchestration shell
 * - Workspace result integration should be centralized for reuse
 * - Workspace model itself stays in core/workspace
 */

import type { Blueprint, AssemblyPlan } from "../../../core/schema/types.js";
import type { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import type { WriteResult } from "../../../adapters/dota2/executor/write-executor.js";
import {
  initializeWorkspace,
  saveWorkspace,
  checkDuplicateFeature,
  addFeatureToWorkspace,
  updateFeatureInWorkspace,
  extractEntryBindings,
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
  FeatureWriteResult,
} from "../../../core/workspace/index.js";
import { refreshBridge } from "../../../adapters/dota2/bridge/index.js";

export type FeatureMode = "create" | "update" | "regenerate";

export interface WorkspaceUpdateResult {
  success: boolean;
  featureId: string;
  totalFeatures: number;
  error?: string;
}

/**
 * Extract integration points from WritePlan
 * Integration points are identifiers for shared resources like key bindings
 */
function extractIntegrationPointsFromWritePlan(writePlan: WritePlan): string[] {
  const points: string[] = [];
  
  // Add explicit integration points from writePlan
  if (writePlan.integrationPoints) {
    points.push(...writePlan.integrationPoints);
  }
  
  // Extract triggerKey from writePlan.entries for key_binding patterns
  for (const entry of writePlan.entries) {
    const triggerKey = entry.parameters?.triggerKey || entry.metadata?.triggerKey;
    if (triggerKey && entry.sourcePattern === "input.key_binding") {
      points.push(`input.key_binding:${triggerKey}`);
    }
  }
  
  // Deduplicate
  return [...new Set(points)];
}

export function updateWorkspaceState(
  hostRoot: string,
  blueprint: Blueprint,
  assemblyPlan: AssemblyPlan,
  writePlan: WritePlan,
  mode: FeatureMode,
  featureId: string,
  existingFeature: RuneWeaverFeatureRecord | null,
  writeResult?: WriteResult
): WorkspaceUpdateResult {
  const initResult = initializeWorkspace(hostRoot);
  if (!initResult.success) {
    return {
      success: false,
      featureId,
      totalFeatures: 0,
      error: "Failed to initialize workspace",
    };
  }

  const workspace = initResult.workspace!;

  const normalizedSave = saveWorkspace(hostRoot, workspace);
  if (!normalizedSave.success) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: "Failed to normalize existing workspace state",
    };
  }

  if (mode === "create") {
    const duplicatePolicy = checkDuplicateFeature(workspace, featureId);
    if (duplicatePolicy.action === "reject") {
      const existing = workspace.features.find((f) => f.featureId === featureId);
      if (existing) {
        return {
          success: false,
          featureId,
          totalFeatures: workspace.features.length,
          error: duplicatePolicy.message,
        };
      }
    }
  } else if (!existingFeature) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: `Feature '${featureId}' does not exist for ${mode}`,
    };
  }

  const entryBindings = extractEntryBindings(assemblyPlan.bridgeUpdates);

  let generatedFiles: string[];
  if (writeResult && writeResult.success) {
    generatedFiles = [...writeResult.createdFiles, ...writeResult.modifiedFiles];
  } else {
    const executableEntries = writePlan.entries.filter((e: WritePlanEntry) => !e.deferred);
    const kvEntriesForWs = executableEntries.filter((e: WritePlanEntry) => e.contentType === "kv");
    const nonKvEntriesForWs = executableEntries.filter((e: WritePlanEntry) => e.contentType !== "kv");
    const kvTargetPathsForWs = new Set(kvEntriesForWs.map((e: WritePlanEntry) => e.targetPath));
    const aggregatedKvFilesForWs = Array.from(kvTargetPathsForWs);
    const nonKvFilesForWs = nonKvEntriesForWs.map((e: WritePlanEntry) => e.targetPath);
    generatedFiles = [...nonKvFilesForWs, ...aggregatedKvFilesForWs];
  }

  const featureResult: FeatureWriteResult = {
    featureId,
    blueprintId: blueprint.id,
    selectedPatterns: assemblyPlan.selectedPatterns.map((p) => p.patternId),
    generatedFiles,
    entryBindings,
  };

  const intentKind = blueprint.sourceIntent.intentKind;
  
  // Extract integration points for conflict detection
  const integrationPoints = extractIntegrationPointsFromWritePlan(writePlan);
  
  const updatedWorkspace =
    mode === "create"
      ? addFeatureToWorkspace(workspace, featureResult, intentKind, integrationPoints)
      : updateFeatureInWorkspace(workspace, featureId, featureResult, intentKind, integrationPoints);

  const saveResult = saveWorkspace(hostRoot, updatedWorkspace);
  if (!saveResult.success) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: "Failed to save workspace state",
    };
  }

  const bridgeRefresh = refreshBridge(hostRoot, updatedWorkspace);
  if (!bridgeRefresh.success) {
    return {
      success: false,
      featureId,
      totalFeatures: updatedWorkspace.features.length,
      error: `Failed to refresh generated bridge indexes: ${bridgeRefresh.errors.join(", ")}`,
    };
  }

  return {
    success: true,
    featureId,
    totalFeatures: updatedWorkspace.features.length,
  };
}

export function formatWorkspaceUpdateResult(result: WorkspaceUpdateResult): string {
  if (result.success) {
    return `Workspace updated: ${result.featureId} (total features: ${result.totalFeatures})`;
  }
  return `Workspace update failed: ${result.error}`;
}

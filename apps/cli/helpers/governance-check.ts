/**
 * CLI Governance Check - Packet D Minimum Governance
 *
 * T149: Write conflict detection for CLI authoritative path
 *
 * 检测写入前冲突：
 * 1. Ownership overlap - 文件被多个 feature 声明
 * 2. Bridge contention - 多个 feature 竞争同一 bridge point
 */

import type { RuneWeaverWorkspace, RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import type { WritePlan } from "../../../adapters/dota2/assembler/index.js";

export interface WriteConflict {
  kind: "ownership_overlap" | "bridge_contention" | "shared_integration_point" | "dependency_conflict";
  severity: "error" | "warning";
  conflictingPoint: string;
  existingFeatureId: string;
  existingFeatureLabel: string;
  explanation: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: WriteConflict[];
  recommendedAction: "block" | "confirm" | "proceed";
  status: "safe" | "blocked" | "needs_confirmation";
  summary: string;
}

/**
 * Bridge points that require explicit binding logic
 * Direct writes to these files are blocked
 */
const BRIDGE_POINTS = [
  "game/scripts/src/modules/index.ts",
  "content/panorama/src/hud/script.tsx",
];

/**
 * Aggregatable files - multiple features can write to the same file
 * These files support content merging (e.g., KV files with multiple abilities)
 */
const AGGREGATABLE_FILES = [
  "game/scripts/npc/npc_abilities_custom.txt",
  "game/scripts/npc/npc_heroes_custom.txt",
  "game/scripts/npc/npc_units_custom.txt",
  "game/scripts/npc/npc_items_custom.txt",
];

/**
 * Check if deleting a feature would break other features that depend on it
 *
 * @param targetFeatureId - The feature ID being deleted
 * @param workspace - Current workspace state
 * @returns Array of dependency conflicts
 */
export function checkDeleteDependencyRisk(
  targetFeatureId: string,
  workspace: RuneWeaverWorkspace | null
): WriteConflict[] {
  const conflicts: WriteConflict[] = [];

  if (!workspace || !workspace.features) {
    return conflicts;
  }

  for (const feature of workspace.features) {
    if (feature.featureId === targetFeatureId) continue;
    if (feature.status !== "active") continue;

    if (feature.dependsOn && feature.dependsOn.includes(targetFeatureId)) {
      conflicts.push({
        kind: "dependency_conflict",
        severity: "error",
        conflictingPoint: targetFeatureId,
        existingFeatureId: feature.featureId,
        existingFeatureLabel: feature.featureName || feature.intentKind || feature.featureId,
        explanation: `Feature '${feature.featureId}' depends on the target feature. Deleting may break dependent features.`,
      });
    }
  }

  return conflicts;
}

/**
 * Check write conflicts before executing write plan
 *
 * @param writePlan - The write plan to check
 * @param workspace - Current workspace state (null if no workspace exists)
 * @param newFeatureId - The feature ID being created/updated/deleted
 * @param operation - The operation type: "create" | "update" | "delete"
 * @returns Conflict check result with recommended action
 */
export function checkWriteConflicts(
  writePlan: WritePlan,
  workspace: RuneWeaverWorkspace | null,
  newFeatureId: string,
  operation: "create" | "update" | "delete" = "create"
): ConflictCheckResult {
  const conflicts: WriteConflict[] = [];

  // If delete operation, check dependency risk first
  if (operation === "delete") {
    const dependencyConflicts = checkDeleteDependencyRisk(newFeatureId, workspace);
    conflicts.push(...dependencyConflicts);
  }

  if (!workspace || !workspace.features) {
    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      recommendedAction: conflicts.length > 0 ? "block" : "proceed",
      status: conflicts.length > 0 ? "blocked" : "safe",
      summary: conflicts.length > 0
        ? `Dependency conflicts detected: ${conflicts.length} error(s). Delete blocked.`
        : "No workspace or features to conflict with.",
    };
  }

  // Check ownership overlap
  for (const entry of writePlan.entries) {
    for (const feature of workspace.features) {
      if (feature.featureId === newFeatureId) continue;
      if (feature.status !== "active") continue;

      if (feature.generatedFiles && feature.generatedFiles.includes(entry.targetPath)) {
        // Skip aggregatable files - multiple features can write to the same file
        if (AGGREGATABLE_FILES.includes(entry.targetPath)) {
          continue;
        }

        conflicts.push({
          kind: "ownership_overlap",
          severity: "error",
          conflictingPoint: entry.targetPath,
          existingFeatureId: feature.featureId,
          existingFeatureLabel: feature.featureName || feature.intentKind || feature.featureId,
          explanation: `File '${entry.targetPath}' is already owned by feature '${feature.featureId}'.`,
        });
      }
    }
  }

  // Check bridge contention
  for (const entry of writePlan.entries) {
    if (BRIDGE_POINTS.includes(entry.targetPath)) {
      conflicts.push({
        kind: "bridge_contention",
        severity: "error",
        conflictingPoint: entry.targetPath,
        existingFeatureId: "host",
        existingFeatureLabel: "Host Bridge Point",
        explanation: `Direct write to bridge point '${entry.targetPath}' requires explicit bridge binding logic.`,
      });
    }
  }

  // Check shared integration point conflicts
  if (writePlan.integrationPoints && writePlan.integrationPoints.length > 0) {
    for (const newPoint of writePlan.integrationPoints) {
      for (const feature of workspace.features) {
        if (feature.featureId === newFeatureId) continue;
        if (feature.status !== "active") continue;
        
        if (feature.integrationPoints && feature.integrationPoints.includes(newPoint)) {
          conflicts.push({
            kind: "shared_integration_point",
            severity: "error",
            conflictingPoint: newPoint,
            existingFeatureId: feature.featureId,
            existingFeatureLabel: feature.featureName || feature.intentKind || feature.featureId,
            explanation: `Integration point '${newPoint}' is already used by feature '${feature.featureId}'.`,
          });
        }
      }
    }
  }

  // Determine recommendedAction and status
  const hasError = conflicts.some(c => c.severity === "error");

  if (conflicts.length === 0) {
    return {
      hasConflict: false,
      conflicts: [],
      recommendedAction: "proceed",
      status: "safe",
      summary: "No conflicts detected. Safe to proceed.",
    };
  }

  if (hasError) {
    return {
      hasConflict: true,
      conflicts,
      recommendedAction: "block",
      status: "blocked",
      summary: `Critical conflicts detected: ${conflicts.filter(c => c.severity === "error").length} error(s). Write blocked.`,
    };
  }

  return {
    hasConflict: true,
    conflicts,
    recommendedAction: "confirm",
    status: "needs_confirmation",
    summary: `Potential conflicts detected: ${conflicts.length} warning(s). Please confirm to proceed.`,
  };
}

/**
 * Rune Weaver - Regenerate Cleanup Plan
 *
 * T100: Regenerate Cleanup Plan
 *
 * 为单个 feature 生成受控 cleanup plan
 */

import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { RuneWeaverFeatureRecord } from "../../../core/workspace/index.js";
import { WritePlan } from "../assembler/index.js";

export interface CleanupPlan {
  featureId: string;
  previousRevision: number;
  nextRevision: number;
  filesToCreate: string[];
  filesToRefresh: string[];
  filesToDelete: string[];
  filesUnchanged: string[];
  ownershipValid: boolean;
  safetyIssues: string[];
  canExecute: boolean;
}

export interface CleanupValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export interface CleanupExecutionResult {
  success: boolean;
  deleted: string[];
  failed: { file: string; error: string }[];
  skipped: string[];
}

const RW_OWNED_PREFIXES = [
  "game/scripts/src/rune_weaver/",
  "content/panorama/src/rune_weaver/",
];

const BRIDGE_POINTS = [
  "game/scripts/src/modules/index.ts",
  "content/panorama/src/hud/script.tsx",
];

export function generateCleanupPlan(
  existingFeature: RuneWeaverFeatureRecord,
  newWritePlan: WritePlan,
  hostRoot: string
): CleanupPlan {
  const previousRevision = existingFeature.revision;
  const nextRevision = previousRevision + 1;

  const existingFiles = new Set(existingFeature.generatedFiles);
  const plannedPaths = new Set(newWritePlan.entries.map((entry) => entry.targetPath));

  const filesToCreate: string[] = [];
  const filesToRefresh: string[] = [];
  const filesToDelete: string[] = [];
  const filesUnchanged: string[] = [];

  for (const entry of newWritePlan.entries) {
    if (!existingFiles.has(entry.targetPath)) {
      filesToCreate.push(entry.targetPath);
    } else {
      filesToRefresh.push(entry.targetPath);
    }
  }

  for (const existingPath of existingFeature.generatedFiles) {
    if (!plannedPaths.has(existingPath)) {
      filesToDelete.push(existingPath);
    } else {
      if (!filesToRefresh.includes(existingPath)) {
        filesUnchanged.push(existingPath);
      }
    }
  }

  const ownershipValidation = validateFileOwnership(
    filesToDelete,
    existingFeature.featureId,
    hostRoot
  );

  const bridgeValidation = validateNoBridgePointsInDeletion(filesToDelete);

  const safetyIssues: string[] = [
    ...ownershipValidation.issues,
    ...bridgeValidation.issues,
  ];

  const canExecute = safetyIssues.length === 0 && ownershipValidation.valid;

  return {
    featureId: existingFeature.featureId,
    previousRevision,
    nextRevision,
    filesToCreate,
    filesToRefresh,
    filesToDelete,
    filesUnchanged,
    ownershipValid: ownershipValidation.valid,
    safetyIssues,
    canExecute,
  };
}

export function validateFileOwnership(
  filesToDelete: string[],
  featureId: string,
  hostRoot: string
): CleanupValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  for (const filePath of filesToDelete) {
    if (!isRwOwnedPath(filePath)) {
      issues.push(
        `File '${filePath}' is not in Rune Weaver owned directories. ` +
        `Cannot delete non-RW-owned files.`
      );
      continue;
    }

    const fullPath = join(hostRoot, filePath);
    if (!existsSync(fullPath)) {
      warnings.push(`File '${filePath}' does not exist on disk, but is in feature record.`);
      continue;
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

export function validateNoBridgePointsInDeletion(
  filesToDelete: string[]
): CleanupValidationResult {
  const issues: string[] = [];

  for (const filePath of filesToDelete) {
    if (BRIDGE_POINTS.includes(filePath)) {
      issues.push(
        `File '${filePath}' is a bridge point and cannot be deleted during regenerate. ` +
        `Bridge points should only be modified via inject_once.`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings: [],
  };
}

export function isRwOwnedPath(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return RW_OWNED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

export function isBridgePoint(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return BRIDGE_POINTS.includes(normalizedPath);
}

export function formatCleanupPlan(plan: CleanupPlan): string {
  const lines: string[] = [
    "=".repeat(70),
    "Cleanup Plan",
    "=".repeat(70),
    "",
    `Feature ID: ${plan.featureId}`,
    `Previous Revision: ${plan.previousRevision}`,
    `Next Revision: ${plan.nextRevision}`,
    "",
    "--- Files to Create ---",
  ];

  if (plan.filesToCreate.length === 0) {
    lines.push("  (none)");
  } else {
    for (const file of plan.filesToCreate) {
      lines.push(`  + ${file}`);
    }
  }

  lines.push("", "--- Files to Refresh ---");
  if (plan.filesToRefresh.length === 0) {
    lines.push("  (none)");
  } else {
    for (const file of plan.filesToRefresh) {
      lines.push(`  ~ ${file}`);
    }
  }

  lines.push("", "--- Files to Delete ---");
  if (plan.filesToDelete.length === 0) {
    lines.push("  (none)");
  } else {
    for (const file of plan.filesToDelete) {
      lines.push(`  - ${file}`);
    }
  }

  lines.push("", "--- Files Unchanged ---");
  if (plan.filesUnchanged.length === 0) {
    lines.push("  (none)");
  } else {
    for (const file of plan.filesUnchanged) {
      lines.push(`  = ${file}`);
    }
  }

  lines.push("", "--- Safety Status ---");
  lines.push(`  Ownership Valid: ${plan.ownershipValid ? "✅" : "❌"}`);
  lines.push(`  Can Execute: ${plan.canExecute ? "✅" : "❌"}`);

  if (plan.safetyIssues.length > 0) {
    lines.push("", "--- Safety Issues ---");
    for (const issue of plan.safetyIssues) {
      lines.push(`  ❌ ${issue}`);
    }
  }

  lines.push("", "=".repeat(70));

  return lines.join("\n");
}

export function executeCleanup(
  cleanupPlan: CleanupPlan,
  hostRoot: string,
  dryRun: boolean
): CleanupExecutionResult {
  const result: CleanupExecutionResult = {
    success: true,
    deleted: [],
    failed: [],
    skipped: [],
  };

  if (!cleanupPlan.canExecute) {
    result.success = false;
    return result;
  }

  if (cleanupPlan.filesToDelete.length === 0) {
    return result;
  }

  for (const filePath of cleanupPlan.filesToDelete) {
    const fullPath = join(hostRoot, filePath);

    if (!existsSync(fullPath)) {
      result.skipped.push(filePath);
      continue;
    }

    if (dryRun) {
      result.skipped.push(filePath);
      continue;
    }

    try {
      unlinkSync(fullPath);
      result.deleted.push(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push({ file: filePath, error: message });
      result.success = false;
    }
  }

  return result;
}

export function formatCleanupResult(result: CleanupExecutionResult): string {
  const lines: string[] = [];

  lines.push("--- Cleanup Execution Result ---");
  lines.push(`  Success: ${result.success ? "✅" : "❌"}`);
  lines.push(`  Deleted: ${result.deleted.length}`);
  lines.push(`  Failed: ${result.failed.length}`);
  lines.push(`  Skipped: ${result.skipped.length}`);

  if (result.deleted.length > 0) {
    lines.push("", "  Deleted Files:");
    for (const file of result.deleted) {
      lines.push(`    🗑️  ${file}`);
    }
  }

  if (result.failed.length > 0) {
    lines.push("", "  Failed Deletions:");
    for (const failure of result.failed) {
      lines.push(`    ❌ ${failure.file}: ${failure.error}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push("", "  Skipped Files:");
    for (const file of result.skipped) {
      lines.push(`    ⏭️  ${file}`);
    }
  }

  return lines.join("\n");
}

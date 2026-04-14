/**
 * Rune Weaver - Rollback Plan
 *
 * T104: Rollback Plan
 *
 * 为单个 feature 生成结构化 rollback plan
 */

import { existsSync } from "fs";
import { join } from "path";
import { RuneWeaverFeatureRecord, RuneWeaverWorkspace } from "../../../core/workspace/index.js";

export interface RollbackPlan {
  featureId: string;
  currentRevision: number;
  filesToDelete: string[];
  abilityNamesToRemove: string[];
  bridgeEffectsToRefresh: string[];
  ownershipValid: boolean;
  safetyIssues: string[];
  canExecute: boolean;
}

export interface RollbackValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

const RW_OWNED_PREFIXES = [
  "game/scripts/src/rune_weaver/",
  "game/scripts/vscripts/rune_weaver/",
  "content/panorama/src/rune_weaver/",
];

const BRIDGE_POINTS = [
  "game/scripts/src/modules/index.ts",
  "content/panorama/src/hud/script.tsx",
];

export function generateRollbackPlan(
  feature: RuneWeaverFeatureRecord,
  workspace: RuneWeaverWorkspace,
  hostRoot: string
): RollbackPlan {
  const currentRevision = feature.revision;

  const filesToDelete: string[] = [];
  const abilityNamesToRemove: string[] = [];
  const bridgeEffectsToRefresh: string[] = [];

  for (const filePath of feature.generatedFiles) {
    if (isRwOwnedPath(filePath)) {
      if (!isBridgePoint(filePath)) {
        filesToDelete.push(filePath);
      }
    }

    const abilityName = extractAbilityName(filePath);
    if (abilityName && !abilityNamesToRemove.includes(abilityName)) {
      abilityNamesToRemove.push(abilityName);
    }
  }

  for (const binding of feature.entryBindings) {
    if (binding.file && !bridgeEffectsToRefresh.includes(binding.file)) {
      bridgeEffectsToRefresh.push(binding.file);
    }
  }

  const ownershipValidation = validateFileOwnership(
    filesToDelete,
    feature.featureId,
    hostRoot
  );

  const exclusivityValidation = validateFeatureExclusivity(
    filesToDelete,
    feature.featureId,
    workspace
  );

  const safetyIssues: string[] = [
    ...ownershipValidation.issues,
    ...exclusivityValidation.issues,
  ];

  const canExecute = safetyIssues.length === 0 && ownershipValidation.valid;

  return {
    featureId: feature.featureId,
    currentRevision,
    filesToDelete,
    abilityNamesToRemove,
    bridgeEffectsToRefresh,
    ownershipValid: ownershipValidation.valid,
    safetyIssues,
    canExecute,
  };
}

export function validateFileOwnership(
  filesToDelete: string[],
  featureId: string,
  hostRoot: string
): RollbackValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  for (const filePath of filesToDelete) {
    if (!isRwOwnedPath(filePath)) {
      issues.push(
        `File '${filePath}' is not in Rune Weaver owned directories. ` +
        `Cannot delete non-RW-owned files during rollback.`
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

export function validateFeatureExclusivity(
  filesToDelete: string[],
  featureId: string,
  workspace: RuneWeaverWorkspace
): RollbackValidationResult {
  const issues: string[] = [];

  for (const filePath of filesToDelete) {
    for (const otherFeature of workspace.features) {
      if (otherFeature.featureId === featureId) {
        continue;
      }

      if (otherFeature.generatedFiles.includes(filePath)) {
        issues.push(
          `File '${filePath}' is also owned by feature '${otherFeature.featureId}'. ` +
          `Cannot delete files shared with other features.`
        );
      }
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

export function formatRollbackPlan(plan: RollbackPlan): string {
  const lines: string[] = [
    "=".repeat(70),
    "Rollback Plan",
    "=".repeat(70),
    "",
    `Feature ID: ${plan.featureId}`,
    `Current Revision: ${plan.currentRevision}`,
    "",
    "--- Files to Delete ---",
  ];

  if (plan.filesToDelete.length === 0) {
    lines.push("  (none)");
  } else {
    for (const file of plan.filesToDelete) {
      lines.push(`  - ${file}`);
    }
  }

  lines.push("", "--- Ability Blocks to Remove ---");
  if (plan.abilityNamesToRemove.length === 0) {
    lines.push("  (none)");
  } else {
    for (const abilityName of plan.abilityNamesToRemove) {
      lines.push(`  - ${abilityName}`);
    }
  }

  lines.push("", "--- Bridge Effects to Refresh ---");
  if (plan.bridgeEffectsToRefresh.length === 0) {
    lines.push("  (none)");
  } else {
    for (const bridge of plan.bridgeEffectsToRefresh) {
      lines.push(`  ~ ${bridge}`);
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

function extractAbilityName(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(/game\/scripts\/vscripts\/rune_weaver\/abilities\/([^/]+)\.lua$/);
  return match?.[1] || null;
}

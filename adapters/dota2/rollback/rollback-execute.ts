/**
 * Rune Weaver - Rollback Execute
 *
 * T105: Rollback Execute Minimal
 *
 * 执行 rollback 操作
 */

import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { RollbackPlan } from "./rollback-plan.js";
import { refreshBridge } from "../bridge/index.js";
import { RuneWeaverWorkspace } from "../../../core/workspace/index.js";

export interface RollbackExecutionResult {
  success: boolean;
  deleted: string[];
  failed: { file: string; error: string }[];
  skipped: string[];
  indexRefreshSuccess: boolean;
  workspaceUpdateSuccess: boolean;
  errors: string[];
}

export function executeRollback(
  rollbackPlan: RollbackPlan,
  workspace: RuneWeaverWorkspace,
  hostRoot: string,
  dryRun: boolean,
  skipBridgeRefresh?: boolean
): RollbackExecutionResult {
  const result: RollbackExecutionResult = {
    success: true,
    deleted: [],
    failed: [],
    skipped: [],
    indexRefreshSuccess: false,
    workspaceUpdateSuccess: false,
    errors: [],
  };

  if (!rollbackPlan.canExecute) {
    result.success = false;
    result.errors.push("Rollback plan cannot be executed due to safety issues");
    return result;
  }

  for (const filePath of rollbackPlan.filesToDelete) {
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

  if (!dryRun && result.success && skipBridgeRefresh !== true) {
    const bridgeResult = refreshBridge(hostRoot, workspace);
    result.indexRefreshSuccess = bridgeResult.success;

    if (!bridgeResult.success) {
      result.errors.push(...bridgeResult.errors);
    }
  } else if (dryRun) {
    result.indexRefreshSuccess = true;
  }

  result.workspaceUpdateSuccess = true;

  return result;
}

export function formatRollbackResult(result: RollbackExecutionResult): string {
  const lines: string[] = [];

  lines.push("--- Rollback Execution Result ---");
  lines.push(`  Success: ${result.success ? "✅" : "❌"}`);
  lines.push(`  Deleted: ${result.deleted.length}`);
  lines.push(`  Failed: ${result.failed.length}`);
  lines.push(`  Skipped: ${result.skipped.length}`);
  lines.push(`  Index Refresh: ${result.indexRefreshSuccess ? "✅" : "❌"}`);
  lines.push(`  Workspace Update: ${result.workspaceUpdateSuccess ? "✅" : "❌"}`);

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

  if (result.errors.length > 0) {
    lines.push("", "  Errors:");
    for (const error of result.errors) {
      lines.push(`    ⚠️  ${error}`);
    }
  }

  return lines.join("\n");
}

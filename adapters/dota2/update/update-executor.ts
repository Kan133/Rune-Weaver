/**
 * Rune Weaver - Selective Update Executor
 *
 * T108-T111-R2: Update Semantics Final Tightening
 *
 * 本模块是 CLI 主路径的内部策略，不是独立 maintenance executor。
 *
 * 职责：
 * - 执行 selective update 的具体文件操作
 * - 处理 unchanged / refresh-only / create-new / safe-delete
 * - 刷新 bridge index
 *
 * 不是：
 * - 独立的 maintenance 命令系统
 * - 平行于 regenerate / rollback 的 lifecycle executor
 * - 自成一套 review / verdict 体系
 *
 * 使用方式：
 * - 只通过 runUpdateCommand (dota2-cli.ts) 调用
 * - 结果进入统一 Dota2ReviewArtifact
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { dirname, join } from "path";
import type { RuneWeaverFeatureRecord, RuneWeaverWorkspace } from "../../../core/workspace/types.js";
import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import {
  classifyUpdateDiff,
  formatUpdateDiffResult,
  type UpdateDiffResult,
  type FileUpdateClassification,
  type UpdateClassification,
} from "./update-classifier.js";
import {
  refreshBridge,
  type BridgeRefreshResult,
} from "../bridge/index.js";

export interface SelectiveUpdateResult {
  success: boolean;
  featureId: string;
  revision: number;
  
  unchangedCount: number;
  refreshedCount: number;
  createdCount: number;
  deletedCount: number;
  
  unchangedFiles: string[];
  refreshedFiles: string[];
  createdFiles: string[];
  deletedFiles: string[];
  failedFiles: { path: string; error: string }[];
  
  bridgeRefreshResult?: BridgeRefreshResult;
  
  requiresRegenerate: boolean;
  regenerateReasons: string[];
}

export function executeSelectiveUpdate(
  existingFeature: RuneWeaverFeatureRecord,
  newWritePlan: WritePlan,
  diffResult: UpdateDiffResult,
  hostRoot: string,
  workspace: RuneWeaverWorkspace,
  contentMap: Map<string, string>,
  dryRun: boolean
): SelectiveUpdateResult {
  const result: SelectiveUpdateResult = {
    success: true,
    featureId: existingFeature.featureId,
    revision: existingFeature.revision + 1,
    unchangedCount: 0,
    refreshedCount: 0,
    createdCount: 0,
    deletedCount: 0,
    unchangedFiles: [],
    refreshedFiles: [],
    createdFiles: [],
    deletedFiles: [],
    failedFiles: [],
    requiresRegenerate: diffResult.requiresRegenerate,
    regenerateReasons: diffResult.regenerateReasons,
  };
  
  if (diffResult.requiresRegenerate) {
    result.success = false;
    return result;
  }
  
  const processFile = (classification: FileUpdateClassification): void => {
    const filePath = join(hostRoot, classification.path);
    
    switch (classification.classification) {
      case "unchanged":
        result.unchangedCount++;
        result.unchangedFiles.push(classification.path);
        break;
        
      case "refresh-only":
        if (dryRun) {
          result.refreshedCount++;
          result.refreshedFiles.push(classification.path);
        } else {
          try {
            const content = contentMap.get(classification.path) || "";
            const dir = dirname(filePath);
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            writeFileSync(filePath, content, "utf-8");
            result.refreshedCount++;
            result.refreshedFiles.push(classification.path);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.failedFiles.push({ path: classification.path, error: errorMessage });
            result.success = false;
          }
        }
        break;
        
      case "create-new":
        if (dryRun) {
          result.createdCount++;
          result.createdFiles.push(classification.path);
        } else {
          try {
            const content = contentMap.get(classification.path) || "";
            const dir = dirname(filePath);
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            writeFileSync(filePath, content, "utf-8");
            result.createdCount++;
            result.createdFiles.push(classification.path);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.failedFiles.push({ path: classification.path, error: errorMessage });
            result.success = false;
          }
        }
        break;
        
      case "safe-delete":
        if (dryRun) {
          result.deletedCount++;
          result.deletedFiles.push(classification.path);
        } else {
          try {
            if (existsSync(filePath)) {
              unlinkSync(filePath);
            }
            result.deletedCount++;
            result.deletedFiles.push(classification.path);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.failedFiles.push({ path: classification.path, error: errorMessage });
            result.success = false;
          }
        }
        break;
        
      case "requires-regenerate":
        result.requiresRegenerate = true;
        result.regenerateReasons.push(classification.reason);
        result.success = false;
        break;
    }
  };
  
  for (const file of diffResult.unchangedFiles) {
    processFile(file);
  }
  
  for (const file of diffResult.refreshedFiles) {
    processFile(file);
  }
  
  for (const file of diffResult.createdFiles) {
    processFile(file);
  }
  
  for (const file of diffResult.deletedFiles) {
    processFile(file);
  }
  
  if (!dryRun && result.success && (diffResult.refreshedFiles.length > 0 || diffResult.createdFiles.length > 0)) {
    try {
      const bridgeResult = refreshBridge(hostRoot, workspace);
      result.bridgeRefreshResult = bridgeResult;
      
      if (!bridgeResult.success) {
        result.success = false;
        for (const error of bridgeResult.errors) {
          result.failedFiles.push({ path: "bridge-refresh", error });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.failedFiles.push({ path: "bridge-refresh", error: errorMessage });
      result.success = false;
    }
  }
  
  return result;
}

export function formatSelectiveUpdateResult(result: SelectiveUpdateResult): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(70));
  lines.push("Selective Update Result");
  lines.push("=".repeat(70));
  lines.push("");
  lines.push(`Feature ID: ${result.featureId}`);
  lines.push(`Revision: ${result.revision}`);
  lines.push(`Success: ${result.success ? "✅" : "❌"}`);
  lines.push("");
  
  lines.push("--- Summary ---");
  lines.push(`  Unchanged: ${result.unchangedCount}`);
  lines.push(`  Refreshed: ${result.refreshedCount}`);
  lines.push(`  Created: ${result.createdCount}`);
  lines.push(`  Deleted: ${result.deletedCount}`);
  lines.push(`  Failed: ${result.failedFiles.length}`);
  lines.push("");
  
  if (result.unchangedFiles.length > 0 && result.unchangedFiles.length <= 10) {
    lines.push("--- Unchanged Files ---");
    for (const file of result.unchangedFiles) {
      lines.push(`  = ${file}`);
    }
    lines.push("");
  }
  
  if (result.refreshedFiles.length > 0) {
    lines.push("--- Refreshed Files ---");
    for (const file of result.refreshedFiles) {
      lines.push(`  ~ ${file}`);
    }
    lines.push("");
  }
  
  if (result.createdFiles.length > 0) {
    lines.push("--- Created Files ---");
    for (const file of result.createdFiles) {
      lines.push(`  + ${file}`);
    }
    lines.push("");
  }
  
  if (result.deletedFiles.length > 0) {
    lines.push("--- Deleted Files ---");
    for (const file of result.deletedFiles) {
      lines.push(`  - ${file}`);
    }
    lines.push("");
  }
  
  if (result.failedFiles.length > 0) {
    lines.push("--- Failed Files ---");
    for (const file of result.failedFiles) {
      lines.push(`  ❌ ${file.path}: ${file.error}`);
    }
    lines.push("");
  }
  
  if (result.requiresRegenerate) {
    lines.push("=".repeat(70));
    lines.push("⚠️  REQUIRES REGENERATE");
    lines.push("=".repeat(70));
    for (const reason of result.regenerateReasons) {
      lines.push(`  ${reason}`);
    }
    lines.push("");
  }
  
  if (result.bridgeRefreshResult) {
    lines.push("--- Bridge Refresh ---");
    lines.push(`  Success: ${result.bridgeRefreshResult.success ? "✅" : "❌"}`);
    if (result.bridgeRefreshResult.errors.length > 0) {
      for (const error of result.bridgeRefreshResult.errors) {
        lines.push(`    Error: ${error}`);
      }
    }
    lines.push("");
  }
  
  return lines.join("\n");
}

export {
  classifyUpdateDiff,
  formatUpdateDiffResult,
  type UpdateDiffResult,
  type FileUpdateClassification,
  type UpdateClassification,
};

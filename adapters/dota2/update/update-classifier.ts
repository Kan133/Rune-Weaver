/**
 * Rune Weaver - Update Classifier
 *
 * T108-T111-R2: Update Semantics Final Tightening
 *
 * 本模块是 CLI 主路径的内部策略，用于分类 update 的文件变化。
 *
 * 职责：
 * - 比较现有 feature 与新 write plan 的差异
 * - 分类文件变化：unchanged / refresh-only / create-new / safe-delete / requires-regenerate
 * - 判断是否需要升级为 regenerate
 * - 安全性检查
 *
 * 不是：
 * - 独立的 maintenance 命令系统
 * - 平行于 regenerate / rollback 的 lifecycle executor
 *
 * 使用方式：
 * - 只通过 runUpdateCommand (dota2-cli.ts) 调用
 * - 结果进入统一 Dota2ReviewArtifact
 */

import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import { isFeatureSourceModelEntry } from "../families/selection-pool/index.js";
import { resolveFeatureOwnedArtifacts } from "../kv/owned-artifacts.js";

const RW_OWNED_PREFIXES = [
  "game/scripts/src/rune_weaver/",
  "game/scripts/vscripts/rune_weaver/",
  "content/panorama/src/rune_weaver/",
];

function isRwOwnedPath(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/");
  return RW_OWNED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

export type UpdateClassification =
  | "unchanged"
  | "refresh-only"
  | "create-new"
  | "safe-delete"
  | "requires-regenerate";

export interface FileUpdateClassification {
  path: string;
  classification: UpdateClassification;
  reason: string;
  oldEntry?: WritePlanEntry;
  newEntry?: WritePlanEntry;
}

export interface UpdateDiffResult {
  featureId: string;
  previousRevision: number;
  nextRevision: number;
  
  unchangedFiles: FileUpdateClassification[];
  refreshedFiles: FileUpdateClassification[];
  createdFiles: FileUpdateClassification[];
  deletedFiles: FileUpdateClassification[];
  
  requiresRegenerate: boolean;
  regenerateReasons: string[];
  
  bridgeChanges: {
    serverBridgeChanged: boolean;
    uiBridgeChanged: boolean;
    bridgeChangeDetails: string[];
  };
  
  safetyIssues: string[];
  canUpdate: boolean;
  
  summary: {
    totalFiles: number;
    unchanged: number;
    refreshed: number;
    created: number;
    deleted: number;
  };
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function extractPatternIdFromPath(path: string): string | null {
  const match = path.match(/\/([^\/]+)_[^\/]+\.ts(x)?$/);
  if (match) {
    return match[1];
  }
  return null;
}

function isBridgeFile(path: string): boolean {
  const normalizedPath = normalizePath(path);
  return normalizedPath.includes("/modules/index.ts") ||
         normalizedPath.includes("/hud/script.tsx");
}

function isFeatureSourceModelFile(classification: FileUpdateClassification): boolean {
  return isFeatureSourceModelEntry(classification.newEntry) || isFeatureSourceModelEntry(classification.oldEntry);
}

function findFeatureSourceModelEntry(entries: Map<string, WritePlanEntry>): WritePlanEntry | undefined {
  for (const entry of entries.values()) {
    if (isFeatureSourceModelEntry(entry)) {
      return entry;
    }
  }
  return undefined;
}

function inferContentTypeFromPath(path: string): WritePlanEntry["contentType"] {
  const normalizedPath = normalizePath(path);
  if (normalizedPath.endsWith(".tsx")) {
    return "tsx";
  }
  if (normalizedPath.endsWith(".less")) {
    return "less";
  }
  if (normalizedPath.endsWith(".css")) {
    return "css";
  }
  if (normalizedPath.endsWith(".json")) {
    return "json";
  }
  if (normalizedPath.endsWith(".lua")) {
    return "lua";
  }
  if (normalizedPath.endsWith(".kv.txt") || normalizedPath.endsWith(".kv")) {
    return "kv";
  }
  return "typescript";
}

function buildHistoricalOwnedArtifactEntry(
  feature: RuneWeaverFeatureRecord,
  artifact: ReturnType<typeof resolveFeatureOwnedArtifacts>[number],
): WritePlanEntry | undefined {
  switch (artifact.kind) {
    case "materialized_aggregate":
      return undefined;
    case "rw_source_model":
      return {
        operation: "create",
        targetPath: artifact.path,
        contentType: "json",
        contentSummary: "",
        sourcePattern: "rw.feature_source_model",
        sourceModule: "feature_source_model",
        safe: true,
        metadata: {
          sourceModelRef: {
            adapter: artifact.adapter,
            version: artifact.version,
            path: artifact.path,
          },
        },
      };
    case "ability_kv_fragment":
      return {
        operation: "create",
        targetPath: artifact.path,
        contentType: "kv",
        contentSummary: "",
        sourcePattern: "dota2.ability_kv_fragment",
        sourceModule: feature.featureId,
        safe: true,
        metadata: {
          abilityName: artifact.abilityName,
          scriptFile: artifact.scriptFile,
          kvArtifactKind: "fragment",
          aggregateTargetPath: artifact.aggregateTargetPath,
        },
      };
    case "generated_file":
    default:
      return {
        operation: "create",
        targetPath: artifact.path,
        contentType: inferContentTypeFromPath(artifact.path),
        contentSummary: "",
        sourcePattern: "",
        sourceModule: "",
        safe: true,
      };
  }
}

function isAbilityKvFragmentEntry(entry: WritePlanEntry | undefined): boolean {
  return Boolean(
    entry
    && (
      entry.metadata?.kvArtifactKind === "fragment"
      || normalizePath(entry.targetPath).endsWith(".kv.txt")
    ),
  );
}

function resolveAggregateTargetPath(entry: WritePlanEntry | undefined): string | undefined {
  const aggregateTargetPath = entry?.metadata?.aggregateTargetPath;
  return typeof aggregateTargetPath === "string" && aggregateTargetPath.trim().length > 0
    ? aggregateTargetPath
    : undefined;
}

function classifyFileChange(
  oldPath: string,
  newPath: string,
  oldEntry: WritePlanEntry | undefined,
  newEntry: WritePlanEntry | undefined
): FileUpdateClassification {
  const normalizedOldPath = normalizePath(oldPath);
  const normalizedNewPath = normalizePath(newPath);
  
  if (!oldEntry && !newEntry) {
    return {
      path: oldPath,
      classification: "unchanged",
      reason: "No entry found",
    };
  }
  
  if (!oldEntry && newEntry) {
    return {
      path: newPath,
      classification: "create-new",
      reason: "New file in write plan",
      newEntry,
    };
  }
  
  if (oldEntry && !newEntry) {
    if (isRwOwnedPath(oldPath)) {
      return {
        path: oldPath,
        classification: "safe-delete",
        reason: "File removed from write plan, RW-owned",
        oldEntry,
      };
    } else {
      return {
        path: oldPath,
        classification: "requires-regenerate",
        reason: "File removed from write plan, not RW-owned - requires full regenerate",
        oldEntry,
      };
    }
  }
  
  if (normalizedOldPath !== normalizedNewPath) {
    if (isFeatureSourceModelEntry(oldEntry) && isFeatureSourceModelEntry(newEntry)) {
      return {
        path: newPath,
        classification: "refresh-only",
        reason: "Feature source artifact path changed under the same source-model lifecycle",
        oldEntry,
        newEntry,
      };
    }

    const oldPatternId = extractPatternIdFromPath(oldPath);
    const newPatternId = extractPatternIdFromPath(newPath);
    
    if (oldPatternId && newPatternId && oldPatternId === newPatternId) {
      return {
        path: newPath,
        classification: "refresh-only",
        reason: `Same pattern (${oldPatternId}), path changed`,
        oldEntry,
        newEntry,
      };
    }
    
    return {
      path: newPath,
      classification: "requires-regenerate",
      reason: "Path changed significantly, pattern may have changed",
      oldEntry,
      newEntry,
    };
  }
  
  if (oldEntry && newEntry && oldEntry.contentSummary === newEntry.contentSummary) {
    return {
      path: newPath,
      classification: "unchanged",
      reason: "Content summary identical",
      oldEntry,
      newEntry,
    };
  }
  
  return {
    path: newPath,
    classification: "refresh-only",
    reason: "Content changed, same path",
    oldEntry,
    newEntry,
  };
}

export function classifyUpdateDiff(
  existingFeature: RuneWeaverFeatureRecord,
  newWritePlan: WritePlan,
  _hostRoot: string
): UpdateDiffResult {
  const oldFiles = new Map<string, WritePlanEntry>();
  const newFiles = new Map<string, WritePlanEntry>();
  
  for (const artifact of resolveFeatureOwnedArtifacts(existingFeature)) {
    const entry = buildHistoricalOwnedArtifactEntry(existingFeature, artifact);
    if (!entry) {
      continue;
    }
    oldFiles.set(normalizePath(entry.targetPath), entry);
  }
  
  for (const entry of newWritePlan.entries.filter((candidate) => !candidate.deferred)) {
    const normalizedRelativePath = normalizePath(entry.targetPath);
    newFiles.set(normalizedRelativePath, entry);
  }
  
  const classifications: FileUpdateClassification[] = [];
  const oldSourceEntry = findFeatureSourceModelEntry(oldFiles);
  const newSourceEntry = findFeatureSourceModelEntry(newFiles);

  if (
    oldSourceEntry &&
    newSourceEntry &&
    normalizePath(oldSourceEntry.targetPath) !== normalizePath(newSourceEntry.targetPath)
  ) {
    classifications.push({
      path: newSourceEntry.targetPath,
      classification: "refresh-only",
      reason: "Feature source artifact migrated under the same source-model lifecycle",
      oldEntry: oldSourceEntry,
      newEntry: newSourceEntry,
    });
    oldFiles.delete(normalizePath(oldSourceEntry.targetPath));
    newFiles.delete(normalizePath(newSourceEntry.targetPath));
  }

  const allPaths = new Set([...oldFiles.keys(), ...newFiles.keys()]);
  
  for (const path of allPaths) {
    const oldEntry = oldFiles.get(path);
    const newEntry = newFiles.get(path);
    
    const classification = classifyFileChange(
      oldEntry?.targetPath || "",
      newEntry?.targetPath || "",
      oldEntry,
      newEntry
    );
    
    classifications.push(classification);
  }

  const managedAggregateTargets = new Set<string>();
  for (const classification of classifications) {
    if (classification.classification === "unchanged") {
      continue;
    }
    const oldAggregateTarget = resolveAggregateTargetPath(classification.oldEntry);
    const newAggregateTarget = resolveAggregateTargetPath(classification.newEntry);
    if (isAbilityKvFragmentEntry(classification.oldEntry) && oldAggregateTarget) {
      managedAggregateTargets.add(oldAggregateTarget);
    }
    if (isAbilityKvFragmentEntry(classification.newEntry) && newAggregateTarget) {
      managedAggregateTargets.add(newAggregateTarget);
    }
  }

  for (const aggregateTarget of managedAggregateTargets) {
    if (classifications.some((classification) => normalizePath(classification.path) === normalizePath(aggregateTarget))) {
      continue;
    }
    classifications.push({
      path: aggregateTarget,
      classification: "refresh-only",
      reason: "Managed KV fragments changed; aggregate host file will be rematerialized",
    });
  }
  
  const unchangedFiles = classifications.filter(c => c.classification === "unchanged");
  const refreshedFiles = classifications.filter(c => c.classification === "refresh-only");
  const createdFiles = classifications.filter(c => c.classification === "create-new");
  const deletedFiles = classifications.filter(c => c.classification === "safe-delete");
  const requiresRegenerateFiles = classifications.filter(c => c.classification === "requires-regenerate");
  
  const regenerateReasons: string[] = [];
  const safetyIssues: string[] = [];
  const bridgeChangeDetails: string[] = [];
  
  if (requiresRegenerateFiles.length > 0) {
    regenerateReasons.push(`${requiresRegenerateFiles.length} file(s) require full regenerate`);
    for (const file of requiresRegenerateFiles) {
      regenerateReasons.push(`  - ${file.path}: ${file.reason}`);
    }
  }
  
  const deletedBridgeFiles = deletedFiles.filter(f => isBridgeFile(f.path));
  if (deletedBridgeFiles.length > 0) {
    regenerateReasons.push("Bridge file deletion detected");
    for (const file of deletedBridgeFiles) {
      bridgeChangeDetails.push(`Deleted bridge: ${file.path}`);
    }
  }
  
  const createdBridgeFiles = createdFiles.filter(f => isBridgeFile(f.path));
  if (createdBridgeFiles.length > 0) {
    bridgeChangeDetails.push(`New bridge files: ${createdBridgeFiles.map(f => f.path).join(", ")}`);
  }
  
  const serverBridgeChanged = deletedBridgeFiles.some(f => normalizePath(f.path).includes("/modules/index.ts")) ||
                              createdBridgeFiles.some(f => normalizePath(f.path).includes("/modules/index.ts"));
  const uiBridgeChanged = deletedBridgeFiles.some(f => normalizePath(f.path).includes("/hud/script.tsx")) ||
                          createdBridgeFiles.some(f => normalizePath(f.path).includes("/hud/script.tsx"));
  
  if (deletedFiles.length > 5) {
    safetyIssues.push(`Large number of deletions (${deletedFiles.length}), consider regenerate`);
  }
  
  if (createdFiles.length > 5) {
    safetyIssues.push(`Large number of new files (${createdFiles.length}), consider regenerate`);
  }
  
  // refreshedFiles 是正常的 update 行为，不算"破坏性变化"
  // 只有 createdFiles 和 deletedFiles 才是"破坏性变化"
  const nonStructuralCreates = createdFiles.filter((file) => !isFeatureSourceModelFile(file));
  const destructiveChanges = nonStructuralCreates.length + deletedFiles.length;
  const totalFiles = oldFiles.size;
  if (totalFiles > 0 && destructiveChanges / totalFiles > 0.8) {
    regenerateReasons.push(`High destructive change ratio (${Math.round(destructiveChanges / totalFiles * 100)}%), consider regenerate`);
  }
  
  const requiresRegenerate = regenerateReasons.length > 0;
  const canUpdate = !requiresRegenerate && safetyIssues.length === 0;
  
  return {
    featureId: existingFeature.featureId,
    previousRevision: existingFeature.revision,
    nextRevision: existingFeature.revision + 1,
    
    unchangedFiles,
    refreshedFiles,
    createdFiles,
    deletedFiles,
    
    requiresRegenerate,
    regenerateReasons,
    
    bridgeChanges: {
      serverBridgeChanged,
      uiBridgeChanged,
      bridgeChangeDetails,
    },
    
    safetyIssues,
    canUpdate,
    
    summary: {
      totalFiles,
      unchanged: unchangedFiles.length,
      refreshed: refreshedFiles.length,
      created: createdFiles.length,
      deleted: deletedFiles.length,
    },
  };
}

export function formatUpdateDiffResult(result: UpdateDiffResult): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(70));
  lines.push("Update Diff Classification");
  lines.push("=".repeat(70));
  lines.push("");
  lines.push(`Feature ID: ${result.featureId}`);
  lines.push(`Revision: ${result.previousRevision} -> ${result.nextRevision}`);
  lines.push("");
  
  lines.push("--- Summary ---");
  lines.push(`  Total Files: ${result.summary.totalFiles}`);
  lines.push(`  Unchanged: ${result.summary.unchanged}`);
  lines.push(`  Refreshed: ${result.summary.refreshed}`);
  lines.push(`  Created: ${result.summary.created}`);
  lines.push(`  Deleted: ${result.summary.deleted}`);
  lines.push("");
  
  if (result.unchangedFiles.length > 0) {
    lines.push("--- Unchanged Files ---");
    for (const file of result.unchangedFiles) {
      lines.push(`  = ${file.path}`);
      lines.push(`    Reason: ${file.reason}`);
    }
    lines.push("");
  }
  
  if (result.refreshedFiles.length > 0) {
    lines.push("--- Refresh-Only Files ---");
    for (const file of result.refreshedFiles) {
      lines.push(`  ~ ${file.path}`);
      lines.push(`    Reason: ${file.reason}`);
    }
    lines.push("");
  }
  
  if (result.createdFiles.length > 0) {
    lines.push("--- Create-New Files ---");
    for (const file of result.createdFiles) {
      lines.push(`  + ${file.path}`);
      lines.push(`    Reason: ${file.reason}`);
    }
    lines.push("");
  }
  
  if (result.deletedFiles.length > 0) {
    lines.push("--- Safe-Delete Files ---");
    for (const file of result.deletedFiles) {
      lines.push(`  - ${file.path}`);
      lines.push(`    Reason: ${file.reason}`);
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
  
  if (result.safetyIssues.length > 0) {
    lines.push("--- Safety Issues ---");
    for (const issue of result.safetyIssues) {
      lines.push(`  ⚠️  ${issue}`);
    }
    lines.push("");
  }
  
  lines.push("--- Bridge Changes ---");
  lines.push(`  Server Bridge Changed: ${result.bridgeChanges.serverBridgeChanged ? "Yes" : "No"}`);
  lines.push(`  UI Bridge Changed: ${result.bridgeChanges.uiBridgeChanged ? "Yes" : "No"}`);
  if (result.bridgeChanges.bridgeChangeDetails.length > 0) {
    for (const detail of result.bridgeChanges.bridgeChangeDetails) {
      lines.push(`    - ${detail}`);
    }
  }
  lines.push("");
  
  lines.push("--- Update Status ---");
  lines.push(`  Can Update: ${result.canUpdate ? "✅" : "❌"}`);
  lines.push(`  Requires Regenerate: ${result.requiresRegenerate ? "Yes" : "No"}`);
  
  return lines.join("\n");
}

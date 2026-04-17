/**
 * Rune Weaver - Regenerate Executor
 *
 * T101: Regenerate Execute Minimal
 *
 * 执行最小 cleanup + rewrite
 */

import { existsSync, unlinkSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { CleanupPlan, formatCleanupPlan } from "./cleanup-plan.js";
import { RuneWeaverFeatureRecord, RuneWeaverWorkspace, saveWorkspace, findFeatureById } from "../../../core/workspace/index.js";
import { WritePlan } from "../assembler/index.js";
import { generateCode } from "../generator/index.js";
import {
  resolveSelectionPoolWorkspaceFields,
} from "../families/selection-pool/index.js";

export interface RegenerateResult {
  success: boolean;
  featureId: string;
  previousRevision: number;
  nextRevision: number;
  filesDeleted: string[];
  filesCreated: string[];
  filesRefreshed: string[];
  errors: string[];
  warnings: string[];
  workspaceUpdated: boolean;
}

export interface RegenerateOptions {
  hostRoot: string;
  dryRun: boolean;
}

export async function executeRegenerate(
  cleanupPlan: CleanupPlan,
  writePlan: WritePlan,
  workspace: RuneWeaverWorkspace,
  options: RegenerateOptions
): Promise<RegenerateResult> {
  const result: RegenerateResult = {
    success: false,
    featureId: cleanupPlan.featureId,
    previousRevision: cleanupPlan.previousRevision,
    nextRevision: cleanupPlan.nextRevision,
    filesDeleted: [],
    filesCreated: [],
    filesRefreshed: [],
    errors: [],
    warnings: [],
    workspaceUpdated: false,
  };

  if (!cleanupPlan.canExecute) {
    result.errors.push("Cleanup plan cannot be executed due to safety issues:");
    result.errors.push(...cleanupPlan.safetyIssues);
    return result;
  }

  console.log(formatCleanupPlan(cleanupPlan));

  if (options.dryRun) {
    console.log("\n🔍 DRY-RUN MODE - No files will be modified\n");
    result.success = true;
    result.warnings.push("Dry-run mode - no actual changes made");
    return result;
  }

  console.log("\n📝 WRITE MODE - Executing changes\n");

  const deleteResult = deleteFiles(cleanupPlan.filesToDelete, options.hostRoot);
  if (deleteResult.errors.length > 0) {
    result.errors.push(...deleteResult.errors);
  }
  result.filesDeleted = deleteResult.deleted;

  const writeResult = writeFiles(writePlan, options.hostRoot, cleanupPlan.featureId);
  if (writeResult.errors.length > 0) {
    result.errors.push(...writeResult.errors);
    return result;
  }
  result.filesCreated = writeResult.created;
  result.filesRefreshed = writeResult.refreshed;

  const workspaceResult = updateWorkspaceState(
    workspace,
    cleanupPlan.featureId,
    writePlan,
    cleanupPlan.nextRevision
  );
  if (!workspaceResult.success) {
    result.errors.push(`Failed to update workspace state: ${workspaceResult.error}`);
    return result;
  }
  result.workspaceUpdated = true;

  const indexRefreshResult = refreshGeneratedIndexes(options.hostRoot);
  if (!indexRefreshResult.success) {
    result.warnings.push(...indexRefreshResult.warnings);
  }

  result.success = result.errors.length === 0;
  return result;
}

interface DeleteResult {
  deleted: string[];
  errors: string[];
}

function deleteFiles(filesToDelete: string[], hostRoot: string): DeleteResult {
  const result: DeleteResult = {
    deleted: [],
    errors: [],
  };

  for (const filePath of filesToDelete) {
    const fullPath = join(hostRoot, filePath);

    if (!existsSync(fullPath)) {
      continue;
    }

    try {
      unlinkSync(fullPath);
      result.deleted.push(filePath);
      console.log(`  🗑️  Deleted: ${filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to delete '${filePath}': ${message}`);
    }
  }

  return result;
}

interface WriteResult {
  created: string[];
  refreshed: string[];
  errors: string[];
}

function writeFiles(writePlan: WritePlan, hostRoot: string, featureId: string): WriteResult {
  const result: WriteResult = {
    created: [],
    refreshed: [],
    errors: [],
  };

  for (const entry of writePlan.entries) {
    const fullPath = join(hostRoot, entry.targetPath);
    const dir = dirname(fullPath);

    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const generated = generateCode(entry, featureId);
      writeFileSync(fullPath, generated.content, "utf-8");

      if (entry.operation === "create") {
        result.created.push(entry.targetPath);
        console.log(`  ✨ Created: ${entry.targetPath}`);
      } else {
        result.refreshed.push(entry.targetPath);
        console.log(`  🔄 Refreshed: ${entry.targetPath}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to write '${entry.targetPath}': ${message}`);
    }
  }

  return result;
}

interface WorkspaceUpdateResult {
  success: boolean;
  error?: string;
}

function updateWorkspaceState(
  workspace: RuneWeaverWorkspace,
  featureId: string,
  writePlan: WritePlan,
  nextRevision: number
): WorkspaceUpdateResult {
  const existingFeature = findFeatureById(workspace, featureId);
  if (!existingFeature) {
    return { success: false, error: `Feature '${featureId}' not found in workspace` };
  }

  const now = new Date().toISOString();
  const executableEntries = writePlan.entries.filter((e) => !e.deferred);
  const kvEntries = executableEntries.filter((e) => e.contentType === "kv");
  const nonKvEntries = executableEntries.filter((e) => e.contentType !== "kv");
  const kvTargetPaths = new Set(kvEntries.map((e) => e.targetPath));
  const aggregatedKvFiles = Array.from(kvTargetPaths);
  const nonKvFiles = nonKvEntries.map((e) => e.targetPath);
  const generatedFiles = [...nonKvFiles, ...aggregatedKvFiles];
  const sourceBackedFields = resolveSelectionPoolWorkspaceFields(
    writePlan,
    featureId,
    "regenerate",
  );

  const updatedFeature: RuneWeaverFeatureRecord = {
    ...existingFeature,
    revision: nextRevision,
    generatedFiles,
    sourceModel: sourceBackedFields.sourceModel ?? undefined,
    featureAuthoring: sourceBackedFields.featureAuthoring ?? undefined,
    updatedAt: now,
  };

  const updatedWorkspace: RuneWeaverWorkspace = {
    ...workspace,
    features: workspace.features.map((f) =>
      f.featureId === featureId ? updatedFeature : f
    ),
  };

  const saveResult = saveWorkspace(workspace.hostRoot, updatedWorkspace);
  if (!saveResult.success) {
    return {
      success: false,
      error: saveResult.issues.join(", "),
    };
  }

  return { success: true };
}

interface IndexRefreshResult {
  success: boolean;
  warnings: string[];
}

function refreshGeneratedIndexes(hostRoot: string): IndexRefreshResult {
  const warnings: string[] = [];

  const serverIndexDir = join(hostRoot, "game/scripts/src/rune_weaver/generated/server");
  const serverIndexPath = join(serverIndexDir, "index.ts");

  if (existsSync(serverIndexDir)) {
    try {
      const files = readdirSync(serverIndexDir)
        .filter((f) => f.endsWith(".ts") && f !== "index.ts")
        .map((f) => f.replace(".ts", ""));

      const indexContent = generateServerIndexContent(files);
      writeFileSync(serverIndexPath, indexContent, "utf-8");
      console.log(`  📋 Refreshed: generated/server/index.ts`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Failed to refresh server index: ${message}`);
    }
  }

  return {
    success: warnings.length === 0,
    warnings,
  };
}

function generateServerIndexContent(modules: string[]): string {
  const moduleList = JSON.stringify(modules);

  return `/**
 * Rune Weaver Generated Server Modules
 * Auto-generated index file
 */

// Dynamic module loading to avoid Lua local variable limit
const moduleFileNames = ${moduleList};
for (const fileName of moduleFileNames) {
  require("rune_weaver.generated.server." + fileName);
}

export function activateRuneWeaverModules(): void {
  print("[Rune Weaver] Activating generated modules...");
  print("[Rune Weaver] All modules activated");
}
`;
}

/**
 * Dota2 CLI - Validation Orchestration Helpers
 *
 * T140: Extract Validation Orchestration Out Of dota2-cli.ts
 *
 * This module contains validation orchestration logic only.
 * No command parsing, no pipeline orchestration, no artifact building.
 *
 * Split Principle:
 * - CLI should become a command orchestration shell
 * - Validation orchestration should be centralized for reuse across commands
 * - Validation rules themselves stay in validators, not here
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import type { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import type { WriteResult } from "../../../adapters/dota2/executor/index.js";
import type { UpdateDiffResult, SelectiveUpdateResult } from "../../../adapters/dota2/update/index.js";
import type { RollbackPlan, RollbackExecutionResult } from "../../../adapters/dota2/rollback/index.js";
import { checkHostEntryBridge } from "../../../adapters/dota2/bridge/index.js";
import { loadWorkspace } from "../../../core/workspace/index.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";

export interface HostValidationResult {
  success: boolean;
  checks: string[];
  issues: string[];
  details: Record<string, unknown>;
}

export interface RuntimeValidationResult {
  success: boolean;
  serverPassed: boolean;
  uiPassed: boolean;
  serverErrors: number;
  uiErrors: number;
  limitations: string[];
  skipped?: boolean;
}

export function validateHost(
  hostRoot: string,
  writePlan: WritePlan,
  writeResult: WriteResult,
  stableFeatureId: string,
  deferredEntries?: Array<{ pattern: string; reason: string }>
): HostValidationResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 7: Host Validation");
  console.log("=".repeat(70));

  const checks: string[] = [];
  const issues: string[] = [];
  const details: Record<string, unknown> = {};

  const serverNsPath = join(hostRoot, "game/scripts/src/rune_weaver");
  const uiNsPath = join(hostRoot, "content/panorama/src/rune_weaver");

  if (existsSync(serverNsPath)) {
    checks.push("✅ Server namespace exists");
  } else {
    checks.push("❌ Server namespace missing");
    issues.push("Server namespace directory not found");
  }

  if (existsSync(uiNsPath)) {
    checks.push("✅ UI namespace exists");
  } else {
    checks.push("❌ UI namespace missing");
    issues.push("UI namespace directory not found");
  }

  const serverBridgePath = join(hostRoot, "game/scripts/src/modules/index.ts");
  const uiBridgePath = join(hostRoot, "content/panorama/src/hud/script.tsx");
  const hostEntryBridge = checkHostEntryBridge(hostRoot);

  if (existsSync(serverBridgePath)) {
    checks.push("✅ Server bridge file exists");
    if (hostEntryBridge.serverEntry) {
      checks.push("✅ Server bridge correctly injected");
    } else {
      checks.push("❌ Server bridge missing activation call");
      issues.push("Server bridge host entry was not injected");
    }
    details.serverBridgeInjected = hostEntryBridge.serverEntry;
  } else {
    checks.push("❌ Server bridge file missing");
    issues.push("Server bridge file not found");
  }

  if (existsSync(uiBridgePath)) {
    checks.push("✅ UI bridge file exists");
    if (hostEntryBridge.uiEntry) {
      checks.push("✅ UI bridge correctly connected");
    } else {
      checks.push("❌ UI bridge missing rune_weaver reference");
      issues.push("UI bridge host entry was not injected");
    }
    details.uiBridgeConnected = hostEntryBridge.uiEntry;
  } else {
    checks.push("❌ UI bridge file missing");
    issues.push("UI bridge file not found");
  }

  const generatedServerPath = join(hostRoot, "game/scripts/src/rune_weaver/generated/server");
  const generatedUIPath = join(hostRoot, "content/panorama/src/rune_weaver/generated/ui");

  if (existsSync(generatedServerPath)) {
    checks.push("✅ Generated server directory exists");
  } else {
    checks.push("⚠️  Generated server directory missing");
  }

  if (existsSync(generatedUIPath)) {
    checks.push("✅ Generated UI directory exists");
  } else {
    checks.push("⚠️  Generated UI directory missing");
  }

  const nonDeferredEntries = writePlan.entries.filter((e: WritePlanEntry) => !e.deferred);
  const plannedFiles = nonDeferredEntries.map((e: WritePlanEntry) => e.targetPath);
  const realizedFiles = [
    ...writeResult.createdFiles,
    ...writeResult.modifiedFiles.filter((file: string) => file.startsWith("game/scripts/src/rune_weaver/") || file.startsWith("content/panorama/src/rune_weaver/")),
  ];

  const missingFiles = plannedFiles.filter((f: string) => !realizedFiles.includes(f));
  const extraFiles = realizedFiles.filter((f: string) => !plannedFiles.includes(f));

  if (missingFiles.length === 0) {
    checks.push("✅ All planned files were created");
  } else {
    checks.push(`❌ ${missingFiles.length} planned files not created`);
    issues.push(`Missing files: ${missingFiles.slice(0, 3).join(", ")}${missingFiles.length > 3 ? "..." : ""}`);
  }

  if (deferredEntries && deferredEntries.length > 0) {
    checks.push(`ℹ️  ${deferredEntries.length} deferred entries not executed (see deferred reasons)`);
  }

  details.plannedFilesCount = plannedFiles.length;
  details.createdFilesCount = realizedFiles.length;
  details.missingFiles = missingFiles;
  details.extraFiles = extraFiles;

  const featureFiles = realizedFiles.filter((f: string) => f.includes(stableFeatureId));
  
  if (featureFiles.length > 0) {
    checks.push(`✅ Feature files created (${featureFiles.length})`);
  } else {
    checks.push("❌ No feature-specific files found");
    issues.push("Cannot identify feature-specific files from write result");
  }
  
  details.featureFilesCount = featureFiles.length;

  const workspaceResult = loadWorkspace(hostRoot);
  const workspaceFeature = workspaceResult.success
    ? workspaceResult.workspace?.features.find((feature) => feature.featureId === stableFeatureId)
    : undefined;

  const keyBindingConflict = detectActiveKeyBindingConflict(hostRoot, stableFeatureId);
  if (keyBindingConflict) {
    checks.push(`❌ Key binding conflict detected on ${keyBindingConflict.key}`);
    issues.push(
      `Feature '${stableFeatureId}' shares key ${keyBindingConflict.key} with active features: ${keyBindingConflict.conflictingFeatureIds.join(", ")}`
    );
    details.keyBindingConflict = keyBindingConflict;
  } else {
    checks.push("✅ No active key binding conflicts detected");
  }

  const requiresSeededPool =
    workspaceFeature?.selectedPatterns?.includes("data.weighted_pool") &&
    workspaceFeature?.selectedPatterns?.includes("rule.selection_flow");

  if (requiresSeededPool) {
    const poolSeedCheck = checkSelectionPoolSeedData(hostRoot, stableFeatureId, workspaceFeature);
    if (poolSeedCheck.ok) {
      checks.push("✅ Selection pool contains initial entries");
    } else {
      checks.push("❌ Selection pool is empty for selection flow");
      issues.push(poolSeedCheck.message);
      details.selectionPoolSeed = poolSeedCheck;
    }
  }

  console.log(`  Validation Checks:`);
  for (const check of checks) {
    console.log(`    ${check}`);
  }

  const success = issues.length === 0;
  console.log(`\n  Overall: ${success ? "✅ PASSED" : "❌ FAILED"}`);

  return { success, checks, issues, details };
}

export function buildRuntimeValidationResult(
  dryRun: boolean,
  writeSuccess: boolean,
  runtimeArtifact?: {
    overall: { success: boolean; serverPassed: boolean; uiPassed: boolean; limitations: string[] };
    server: { success: boolean; errorCount: number; checked: boolean };
    ui: { success: boolean; errorCount: number; checked: boolean };
  }
): RuntimeValidationResult {
  if (!dryRun && writeSuccess && runtimeArtifact) {
    return {
      success: runtimeArtifact.overall.success,
      serverPassed: runtimeArtifact.overall.serverPassed,
      uiPassed: runtimeArtifact.overall.uiPassed,
      serverErrors: runtimeArtifact.server.errorCount,
      uiErrors: runtimeArtifact.ui.errorCount,
      limitations: runtimeArtifact.overall.limitations,
    };
  }

  return {
    success: true,
    serverPassed: true,
    uiPassed: true,
    serverErrors: 0,
    uiErrors: 0,
    limitations: dryRun ? ["Skipped due to dry-run mode"] : writeSuccess ? [] : ["Skipped due to write failure"],
    skipped: true,
  };
}

export function performUpdateHostValidation(
  hostRoot: string,
  diffResult: UpdateDiffResult,
  updateResult: SelectiveUpdateResult
): HostValidationResult {
  const checks: string[] = [];
  const issues: string[] = [];
  const details: Record<string, unknown> = {};

  const serverNsPath = join(hostRoot, "game/scripts/src/rune_weaver");
  const uiNsPath = join(hostRoot, "content/panorama/src/rune_weaver");

  if (existsSync(serverNsPath)) {
    checks.push("✅ Server namespace exists");
  } else {
    checks.push("❌ Server namespace missing");
    issues.push("Server namespace directory not found");
  }

  if (existsSync(uiNsPath)) {
    checks.push("✅ UI namespace exists");
  } else {
    checks.push("❌ UI namespace missing");
    issues.push("UI namespace directory not found");
  }

  if (updateResult.refreshedCount > 0) {
    checks.push(`✅ Refreshed ${updateResult.refreshedCount} files`);
  }

  if (updateResult.createdCount > 0) {
    checks.push(`✅ Created ${updateResult.createdCount} files`);
  }

  if (updateResult.deletedCount > 0) {
    checks.push(`✅ Deleted ${updateResult.deletedCount} files`);
  }

  if (updateResult.failedFiles.length > 0) {
    checks.push(`❌ ${updateResult.failedFiles.length} files failed`);
    for (const file of updateResult.failedFiles) {
      issues.push(`Failed: ${file.path} - ${file.error}`);
    }
  }

  if (updateResult.bridgeRefreshResult) {
    if (updateResult.bridgeRefreshResult.success) {
      checks.push("✅ Bridge indexes refreshed");
    } else {
      checks.push("❌ Bridge refresh failed");
      issues.push("Bridge index refresh failed");
    }
  }

  const success = issues.length === 0;
  return { success, checks, issues, details };
}

export function performRollbackHostValidation(
  hostRoot: string,
  rollbackPlan: RollbackPlan,
  rollbackResult: RollbackExecutionResult
): HostValidationResult {
  const checks: string[] = [];
  const issues: string[] = [];
  const details: Record<string, unknown> = {};

  const serverNsPath = join(hostRoot, "game/scripts/src/rune_weaver");
  const uiNsPath = join(hostRoot, "content/panorama/src/rune_weaver");

  if (existsSync(serverNsPath)) {
    checks.push("✅ Server namespace exists");
  } else {
    checks.push("❌ Server namespace missing");
    issues.push("Server namespace directory not found");
  }

  if (existsSync(uiNsPath)) {
    checks.push("✅ UI namespace exists");
  } else {
    checks.push("❌ UI namespace missing");
    issues.push("UI namespace directory not found");
  }

  if (rollbackResult.deleted && rollbackResult.deleted.length > 0) {
    checks.push(`✅ Deleted ${rollbackResult.deleted.length} files`);
  }

  if (rollbackResult.skipped && rollbackResult.skipped.length > 0) {
    checks.push(`⏭️  Skipped ${rollbackResult.skipped.length} files`);
  }

  if (rollbackResult.failed && rollbackResult.failed.length > 0) {
    checks.push(`❌ ${rollbackResult.failed.length} deletions failed`);
    for (const failure of rollbackResult.failed) {
      issues.push(`Failed to delete: ${failure}`);
    }
  }

  if (rollbackResult.indexRefreshSuccess) {
    checks.push("✅ Bridge indexes refreshed");
  } else {
    checks.push("⚠️  Bridge index refresh had issues");
    issues.push("Bridge index refresh was not fully successful");
  }

  details.filesDeleted = rollbackResult.deleted?.length ?? 0;
  details.filesSkipped = rollbackResult.skipped?.length ?? 0;
  details.deleteFailures = rollbackResult.failed ?? [];

  const success = issues.length === 0;
  return { success, checks, issues, details };
}

export function formatRuntimeValidationOutput(result: RuntimeValidationResult): void {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 8: Runtime Validation");
  console.log("=".repeat(70));

  if (result.skipped) {
    console.log("  ⏭️  Skipped (dry-run mode or write failed)");
    if (result.limitations.length > 0) {
      for (const limitation of result.limitations) {
        console.log(`    - ${limitation}`);
      }
    }
    return;
  }

  console.log(`  Server: ${result.serverPassed ? "✅ Passed" : "❌ Failed"}`);
  console.log(`    - Errors: ${result.serverErrors}`);
  
  console.log(`  UI: ${result.uiPassed ? "✅ Passed" : "❌ Failed"}`);
  console.log(`    - Errors: ${result.uiErrors}`);

  if (result.limitations.length > 0) {
    console.log(`  Limitations:`);
    for (const limitation of result.limitations) {
      console.log(`    - ${limitation}`);
    }
  }
}

function detectActiveKeyBindingConflict(
  hostRoot: string,
  stableFeatureId: string
): { key: string; conflictingFeatureIds: string[] } | null {
  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    return null;
  }

  const activeFeatures = workspaceResult.workspace.features.filter((feature) => feature.status === "active");
  const keyToFeatures = new Map<string, string[]>();

  for (const feature of activeFeatures) {
    const keyBindingFile = findFeatureGeneratedFile(feature, isGeneratedKeyBindingFile);
    if (!keyBindingFile) {
      continue;
    }

    const content = readFileSync(join(hostRoot, keyBindingFile), "utf8");
    const match = content.match(/configuredKey:\s*string\s*=\s*"([^"]+)"/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const featureIds = keyToFeatures.get(key) || [];
    featureIds.push(feature.featureId);
    keyToFeatures.set(key, featureIds);
  }

  for (const [key, featureIds] of keyToFeatures.entries()) {
    if (featureIds.includes(stableFeatureId) && featureIds.length > 1) {
      return {
        key,
        conflictingFeatureIds: featureIds.filter((featureId) => featureId !== stableFeatureId),
      };
    }
  }

  return null;
}

function checkSelectionPoolSeedData(
  hostRoot: string,
  stableFeatureId: string,
  workspaceFeature?: RuneWeaverFeatureRecord
): { ok: true } | { ok: false; message: string } {
  const poolFile = workspaceFeature
    ? findFeatureGeneratedFile(workspaceFeature, isGeneratedWeightedPoolFile)
    : undefined;

  if (!poolFile) {
    return {
      ok: false,
      message: `Selection flow expects a weighted pool, but no generated weighted pool source is recorded for '${stableFeatureId}'`,
    };
  }

  const content = readFileSync(join(hostRoot, poolFile), "utf8");
  const hasTodoMarker = content.includes("TODO: Add initial talent entries");
  const addCallCount = (content.match(/\.add\(/g) || []).length;
  const seededAddCalls = hasTodoMarker ? addCallCount : Math.max(0, addCallCount - 1);

  if (hasTodoMarker || seededAddCalls === 0) {
    return {
      ok: false,
      message: `Feature '${stableFeatureId}' generated rule.selection_flow but the weighted pool has no initial entries, so runtime selection cannot produce UI options`,
    };
  }

  return { ok: true };
}

function findFeatureGeneratedFile(
  feature: Pick<RuneWeaverFeatureRecord, "generatedFiles">,
  matcher: (file: string) => boolean
): string | undefined {
  return feature.generatedFiles.find(matcher);
}

function isGeneratedKeyBindingFile(file: string): boolean {
  return file.includes("/generated/server/") && file.endsWith("_input_key_binding.ts");
}

function isGeneratedWeightedPoolFile(file: string): boolean {
  return file.includes("/generated/shared/") && file.endsWith("_data_weighted_pool.ts");
}

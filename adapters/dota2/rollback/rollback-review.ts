/**
 * Rune Weaver - Rollback Review Artifact
 *
 * T106: Rollback Review Artifact
 *
 * 让 rollback 结果可审查
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { RollbackPlan } from "./rollback-plan.js";
import { RollbackExecutionResult } from "./rollback-execute.js";

export interface RollbackReviewArtifact {
  version: string;
  generatedAt: string;
  featureId: string;
  currentRevision: number;
  mode: "dry-run" | "write";
  rollbackPlan: {
    filesToDelete: string[];
    bridgeEffectsToRefresh: string[];
    ownershipValid: boolean;
    safetyIssues: string[];
    canExecute: boolean;
  };
  execution: {
    success: boolean;
    deleted: string[];
    failed: { file: string; error: string }[];
    skipped: string[];
    indexRefreshSuccess: boolean;
    workspaceUpdateSuccess: boolean;
    errors: string[];
  };
  verdict: {
    overall: "success" | "partial" | "failed";
    filesDeleted: boolean;
    indexRefreshed: boolean;
    workspaceUpdated: boolean;
    hasResidualFiles: boolean;
    summary: string;
  };
  nextSteps: string[];
}

export function generateRollbackReviewArtifact(
  rollbackPlan: RollbackPlan,
  executionResult: RollbackExecutionResult,
  mode: "dry-run" | "write"
): RollbackReviewArtifact {
  const filesDeleted = executionResult.deleted.length > 0 || 
    (mode === "dry-run" && rollbackPlan.filesToDelete.length > 0);
  
  const indexRefreshed = executionResult.indexRefreshSuccess;
  const workspaceUpdated = executionResult.workspaceUpdateSuccess;
  
  const hasResidualFiles = executionResult.failed.length > 0;

  let overall: "success" | "partial" | "failed";
  let summary: string;

  if (mode === "dry-run") {
    if (rollbackPlan.canExecute) {
      overall = "success";
      summary = `Dry-run successful. Would delete ${rollbackPlan.filesToDelete.length} files. ` +
        `Feature '${rollbackPlan.featureId}' (revision ${rollbackPlan.currentRevision}) would be rolled back.`;
    } else {
      overall = "failed";
      summary = `Dry-run blocked by safety issues: ${rollbackPlan.safetyIssues.join("; ")}`;
    }
  } else {
    if (executionResult.success && executionResult.failed.length === 0) {
      overall = "success";
      summary = `Rollback successful. Deleted ${executionResult.deleted.length} files. ` +
        `Feature '${rollbackPlan.featureId}' (revision ${rollbackPlan.currentRevision}) has been rolled back.`;
    } else if (executionResult.deleted.length > 0 && executionResult.failed.length > 0) {
      overall = "partial";
      summary = `Rollback partially successful. Deleted ${executionResult.deleted.length} files, ` +
        `but ${executionResult.failed.length} deletions failed. ` +
        `Feature '${rollbackPlan.featureId}' may have residual files.`;
    } else {
      overall = "failed";
      summary = `Rollback failed: ${executionResult.errors.join("; ")}`;
    }
  }

  const nextSteps: string[] = [];
  if (overall === "success" && mode === "dry-run") {
    nextSteps.push("Run with --write to execute the rollback plan.");
  }
  if (overall === "success" && mode === "write") {
    nextSteps.push("Verify the feature has been completely removed.");
    nextSteps.push("Check that no residual files remain.");
  }
  if (overall === "partial") {
    nextSteps.push("Manually review and clean up residual files.");
    nextSteps.push("Check workspace state for consistency.");
  }
  if (overall === "failed") {
    nextSteps.push("Fix the issues blocking rollback before retrying.");
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    featureId: rollbackPlan.featureId,
    currentRevision: rollbackPlan.currentRevision,
    mode,
    rollbackPlan: {
      filesToDelete: rollbackPlan.filesToDelete,
      bridgeEffectsToRefresh: rollbackPlan.bridgeEffectsToRefresh,
      ownershipValid: rollbackPlan.ownershipValid,
      safetyIssues: rollbackPlan.safetyIssues,
      canExecute: rollbackPlan.canExecute,
    },
    execution: {
      success: executionResult.success,
      deleted: executionResult.deleted,
      failed: executionResult.failed,
      skipped: executionResult.skipped,
      indexRefreshSuccess: executionResult.indexRefreshSuccess,
      workspaceUpdateSuccess: executionResult.workspaceUpdateSuccess,
      errors: executionResult.errors,
    },
    verdict: {
      overall,
      filesDeleted,
      indexRefreshed,
      workspaceUpdated,
      hasResidualFiles,
      summary,
    },
    nextSteps,
  };
}

export function saveRollbackReviewArtifact(
  artifact: RollbackReviewArtifact,
  outputDir: string
): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `rollback-${artifact.featureId}-${timestamp}.json`;
  const outputPath = join(outputDir, filename);

  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");

  return outputPath;
}

export function formatRollbackReviewSummary(artifact: RollbackReviewArtifact): string {
  const lines: string[] = [
    "=".repeat(70),
    "Rollback Review Summary",
    "=".repeat(70),
    "",
    `Feature ID: ${artifact.featureId}`,
    `Current Revision: ${artifact.currentRevision}`,
    `Mode: ${artifact.mode}`,
    "",
    "--- Verdict ---",
    `  Overall: ${artifact.verdict.overall === "success" ? "✅" : artifact.verdict.overall === "partial" ? "⚠️" : "❌"} ${artifact.verdict.overall}`,
    `  Files Deleted: ${artifact.verdict.filesDeleted ? "✅" : "❌"}`,
    `  Index Refreshed: ${artifact.verdict.indexRefreshed ? "✅" : "❌"}`,
    `  Workspace Updated: ${artifact.verdict.workspaceUpdated ? "✅" : "❌"}`,
    `  Has Residual Files: ${artifact.verdict.hasResidualFiles ? "⚠️" : "✅"}`,
    "",
    `  Summary: ${artifact.verdict.summary}`,
  ];

  if (artifact.nextSteps.length > 0) {
    lines.push("", "--- Next Steps ---");
    for (const step of artifact.nextSteps) {
      lines.push(`  → ${step}`);
    }
  }

  lines.push("", "=".repeat(70));

  return lines.join("\n");
}

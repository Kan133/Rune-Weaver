/**
 * Rune Weaver - Regenerate Review Artifact
 *
 * T102: Regenerate Review Artifact
 *
 * 生成 regenerate 结果的审查产物
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { CleanupPlan } from "./cleanup-plan.js";
import type { RegenerateResult } from "./executor.js";

export interface RegenerateReviewArtifact {
  version: string;
  generatedAt: string;
  featureId: string;
  previousRevision: number;
  nextRevision: number;
  mode: "dry-run" | "write";
  cleanupPlan: {
    filesToCreate: string[];
    filesToRefresh: string[];
    filesToDelete: string[];
    filesUnchanged: string[];
    ownershipValid: boolean;
    safetyIssues: string[];
    canExecute: boolean;
  };
  execution: {
    success: boolean;
    filesDeleted: string[];
    filesCreated: string[];
    filesRefreshed: string[];
    errors: string[];
    warnings: string[];
    workspaceUpdated: boolean;
  };
  verdict: {
    overall: "success" | "partial" | "failed";
    filesReplaced: boolean;
    revisionAdvanced: boolean;
    workspaceConsistent: boolean;
    orphanedFilesRemaining: boolean;
    summary: string;
  };
  nextSteps: string[];
}

export function generateRegenerateReviewArtifact(
  cleanupPlan: CleanupPlan,
  result: RegenerateResult,
  mode: "dry-run" | "write"
): RegenerateReviewArtifact {
  const filesReplaced =
    result.filesDeleted.length > 0 ||
    result.filesRefreshed.length > 0 ||
    (mode === "dry-run" && cleanupPlan.filesToDelete.length > 0);

  const revisionAdvanced = result.nextRevision > result.previousRevision;

  const workspaceConsistent = result.workspaceUpdated || mode === "dry-run";

  const orphanedFilesRemaining = false;

  let overall: "success" | "partial" | "failed";
  let summary: string;

  if (mode === "dry-run") {
    if (cleanupPlan.canExecute) {
      overall = "success";
      summary = `Dry-run successful. Would delete ${cleanupPlan.filesToDelete.length} files, ` +
        `create ${cleanupPlan.filesToCreate.length} files, ` +
        `refresh ${cleanupPlan.filesToRefresh.length} files. ` +
        `Revision would advance from ${result.previousRevision} to ${result.nextRevision}.`;
    } else {
      overall = "failed";
      summary = `Dry-run blocked by safety issues: ${cleanupPlan.safetyIssues.join("; ")}`;
    }
  } else {
    if (result.success && result.errors.length === 0) {
      overall = "success";
      summary = `Regenerate successful. Deleted ${result.filesDeleted.length} files, ` +
        `created ${result.filesCreated.length} files, ` +
        `refreshed ${result.filesRefreshed.length} files. ` +
        `Revision advanced from ${result.previousRevision} to ${result.nextRevision}.`;
    } else if (result.success && result.warnings.length > 0) {
      overall = "partial";
      summary = `Regenerate completed with warnings. ` +
        `Deleted ${result.filesDeleted.length} files, ` +
        `created ${result.filesCreated.length} files, ` +
        `refreshed ${result.filesRefreshed.length} files. ` +
        `Revision advanced from ${result.previousRevision} to ${result.nextRevision}.`;
    } else {
      overall = "failed";
      summary = `Regenerate failed: ${result.errors.join("; ")}`;
    }
  }

  const nextSteps: string[] = [];
  if (overall === "success" && mode === "dry-run") {
    nextSteps.push("Run with --write to execute the regenerate plan.");
  }
  if (overall === "success" && mode === "write") {
    nextSteps.push("Verify the regenerated feature works as expected.");
    nextSteps.push("Run runtime validation to check for compilation errors.");
  }
  if (overall === "partial") {
    nextSteps.push("Review warnings and verify feature functionality.");
  }
  if (overall === "failed") {
    nextSteps.push("Fix the issues blocking regenerate before retrying.");
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    featureId: result.featureId,
    previousRevision: result.previousRevision,
    nextRevision: result.nextRevision,
    mode,
    cleanupPlan: {
      filesToCreate: cleanupPlan.filesToCreate,
      filesToRefresh: cleanupPlan.filesToRefresh,
      filesToDelete: cleanupPlan.filesToDelete,
      filesUnchanged: cleanupPlan.filesUnchanged,
      ownershipValid: cleanupPlan.ownershipValid,
      safetyIssues: cleanupPlan.safetyIssues,
      canExecute: cleanupPlan.canExecute,
    },
    execution: {
      success: result.success,
      filesDeleted: result.filesDeleted,
      filesCreated: result.filesCreated,
      filesRefreshed: result.filesRefreshed,
      errors: result.errors,
      warnings: result.warnings,
      workspaceUpdated: result.workspaceUpdated,
    },
    verdict: {
      overall,
      filesReplaced,
      revisionAdvanced,
      workspaceConsistent,
      orphanedFilesRemaining,
      summary,
    },
    nextSteps,
  };
}

export function saveRegenerateReviewArtifact(
  artifact: RegenerateReviewArtifact,
  outputDir: string,
  filename?: string
): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(
    outputDir,
    filename || `regenerate-review-${artifact.featureId}-${Date.now()}.json`
  );

  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");

  return outputPath;
}

export function formatRegenerateReviewSummary(artifact: RegenerateReviewArtifact): string {
  const lines: string[] = [
    "=".repeat(70),
    "Regenerate Review Summary",
    "=".repeat(70),
    "",
    `Feature ID: ${artifact.featureId}`,
    `Mode: ${artifact.mode}`,
    `Revision: ${artifact.previousRevision} -> ${artifact.nextRevision}`,
    "",
    "--- Cleanup Plan ---",
    `  Files to Create: ${artifact.cleanupPlan.filesToCreate.length}`,
    `  Files to Refresh: ${artifact.cleanupPlan.filesToRefresh.length}`,
    `  Files to Delete: ${artifact.cleanupPlan.filesToDelete.length}`,
    `  Files Unchanged: ${artifact.cleanupPlan.filesUnchanged.length}`,
    `  Can Execute: ${artifact.cleanupPlan.canExecute ? "✅" : "❌"}`,
    "",
    "--- Execution Result ---",
    `  Success: ${artifact.execution.success ? "✅" : "❌"}`,
    `  Files Deleted: ${artifact.execution.filesDeleted.length}`,
    `  Files Created: ${artifact.execution.filesCreated.length}`,
    `  Files Refreshed: ${artifact.execution.filesRefreshed.length}`,
    `  Workspace Updated: ${artifact.execution.workspaceUpdated ? "✅" : "❌"}`,
    "",
    "--- Verdict ---",
    `  Overall: ${artifact.verdict.overall}`,
    `  Summary: ${artifact.verdict.summary}`,
    "",
  ];

  if (artifact.execution.errors.length > 0) {
    lines.push("--- Errors ---");
    for (const error of artifact.execution.errors) {
      lines.push(`  ❌ ${error}`);
    }
    lines.push("");
  }

  if (artifact.execution.warnings.length > 0) {
    lines.push("--- Warnings ---");
    for (const warning of artifact.execution.warnings) {
      lines.push(`  ⚠️  ${warning}`);
    }
    lines.push("");
  }

  if (artifact.nextSteps.length > 0) {
    lines.push("--- Next Steps ---");
    for (const step of artifact.nextSteps) {
      lines.push(`  → ${step}`);
    }
    lines.push("");
  }

  lines.push("=".repeat(70));

  return lines.join("\n");
}

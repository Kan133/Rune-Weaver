import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import type { UpdateDiffResult, SelectiveUpdateResult } from "./update-executor.js";

export interface UpdateReviewArtifact {
  version: string;
  generatedAt: string;
  commandKind: "maintenance";
  applicableStages: string[];
  
  cliOptions: {
    command: string;
    prompt: string;
    hostRoot: string;
    featureId: string;
    dryRun: boolean;
    write: boolean;
    force: boolean;
  };
  
  feature: {
    featureId: string;
    previousRevision: number;
    nextRevision: number;
    status: string;
  };
  
  diffClassification: {
    totalFiles: number;
    unchanged: number;
    refreshed: number;
    created: number;
    deleted: number;
    
    unchangedFiles: string[];
    refreshedFiles: string[];
    createdFiles: string[];
    deletedFiles: string[];
    
    requiresRegenerate: boolean;
    regenerateReasons: string[];
  };
  
  bridgeChanges: {
    serverBridgeChanged: boolean;
    uiBridgeChanged: boolean;
    bridgeChangeDetails: string[];
  };
  
  execution: {
    success: boolean;
    unchangedCount: number;
    refreshedCount: number;
    createdCount: number;
    deletedCount: number;
    failedFiles: { path: string; error: string }[];
  };
  
  workspaceState: {
    success: boolean;
    error?: string;
  };
  
  hostValidation: {
    success: boolean;
    checks: string[];
    issues: string[];
  };
  
  runtimeValidation: {
    success: boolean;
    serverPassed: boolean;
    uiPassed: boolean;
    serverErrors: number;
    uiErrors: number;
  };
  
  finalVerdict: {
    pipelineComplete: boolean;
    completionKind: "default-safe" | "partial" | "requires-regenerate";
    weakestStage: string;
    sufficientForDemo: boolean;
    remainingRisks: string[];
    nextSteps: string[];
  };
}

export function createUpdateReviewArtifact(
  existingFeature: RuneWeaverFeatureRecord,
  diffResult: UpdateDiffResult,
  updateResult: SelectiveUpdateResult,
  cliOptions: {
    command: string;
    prompt: string;
    hostRoot: string;
    featureId: string;
    dryRun: boolean;
    write: boolean;
    force: boolean;
  },
  workspaceResult: { success: boolean; error?: string },
  hostValidation: { success: boolean; checks: string[]; issues: string[] },
  runtimeValidation: { success: boolean; serverPassed: boolean; uiPassed: boolean; serverErrors: number; uiErrors: number }
): UpdateReviewArtifact {
  const allStages = [
    { name: "diffClassification", success: !diffResult.requiresRegenerate },
    { name: "execution", success: updateResult.success },
    { name: "workspaceState", success: workspaceResult.success },
    { name: "hostValidation", success: hostValidation.success },
    { name: "runtimeValidation", success: runtimeValidation.success },
  ];
  
  const failedStages = allStages.filter(s => !s.success);
  const weakestStage = failedStages.length > 0 ? failedStages[0].name : "";
  const pipelineComplete = failedStages.length === 0;
  
  let completionKind: "default-safe" | "partial" | "requires-regenerate" = "default-safe";
  if (diffResult.requiresRegenerate) {
    completionKind = "requires-regenerate";
  } else if (!pipelineComplete) {
    completionKind = "partial";
  }
  
  const remainingRisks: string[] = [];
  if (diffResult.requiresRegenerate) {
    remainingRisks.push("Update requires full regenerate");
  }
  if (!updateResult.success) {
    remainingRisks.push("Selective update execution failed");
  }
  if (!workspaceResult.success) {
    remainingRisks.push("Workspace state update failed");
  }
  if (!hostValidation.success) {
    remainingRisks.push("Host validation failed");
  }
  if (!runtimeValidation.success) {
    remainingRisks.push("Runtime validation failed");
  }
  
  const nextSteps: string[] = [];
  if (diffResult.requiresRegenerate) {
    nextSteps.push("Use 'dota2 regenerate --feature <id>' instead of update");
    for (const reason of diffResult.regenerateReasons) {
      nextSteps.push(`  Reason: ${reason}`);
    }
  } else if (cliOptions.dryRun) {
    nextSteps.push("Run with --write to execute the selective update");
  } else if (pipelineComplete) {
    nextSteps.push("Update completed successfully");
    nextSteps.push("Verify the feature works as expected");
  } else {
    nextSteps.push("Fix the issues before retrying");
  }
  
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "maintenance",
    applicableStages: ["diffClassification", "execution", "workspaceState", "hostValidation", "runtimeValidation"],
    
    cliOptions,
    
    feature: {
      featureId: existingFeature.featureId,
      previousRevision: existingFeature.revision,
      nextRevision: existingFeature.revision + 1,
      status: existingFeature.status,
    },
    
    diffClassification: {
      totalFiles: diffResult.summary.totalFiles,
      unchanged: diffResult.summary.unchanged,
      refreshed: diffResult.summary.refreshed,
      created: diffResult.summary.created,
      deleted: diffResult.summary.deleted,
      
      unchangedFiles: diffResult.unchangedFiles.map(f => f.path),
      refreshedFiles: diffResult.refreshedFiles.map(f => f.path),
      createdFiles: diffResult.createdFiles.map(f => f.path),
      deletedFiles: diffResult.deletedFiles.map(f => f.path),
      
      requiresRegenerate: diffResult.requiresRegenerate,
      regenerateReasons: diffResult.regenerateReasons,
    },
    
    bridgeChanges: diffResult.bridgeChanges,
    
    execution: {
      success: updateResult.success,
      unchangedCount: updateResult.unchangedCount,
      refreshedCount: updateResult.refreshedCount,
      createdCount: updateResult.createdCount,
      deletedCount: updateResult.deletedCount,
      failedFiles: updateResult.failedFiles,
    },
    
    workspaceState: workspaceResult,
    
    hostValidation,
    
    runtimeValidation,
    
    finalVerdict: {
      pipelineComplete,
      completionKind,
      weakestStage,
      sufficientForDemo: pipelineComplete,
      remainingRisks,
      nextSteps,
    },
  };
}

export function saveUpdateReviewArtifact(artifact: UpdateReviewArtifact, outputDir: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `update-review-${artifact.feature.featureId}-${timestamp}.json`;
  const outputPath = join(outputDir, filename);
  
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");
  
  return outputPath;
}

export function formatUpdateReviewSummary(artifact: UpdateReviewArtifact): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(70));
  lines.push("Update Review Summary");
  lines.push("=".repeat(70));
  lines.push("");
  
  lines.push(`Feature: ${artifact.feature.featureId}`);
  lines.push(`Revision: ${artifact.feature.previousRevision} -> ${artifact.feature.nextRevision}`);
  lines.push("");
  
  lines.push("--- Diff Classification ---");
  lines.push(`  Total Files: ${artifact.diffClassification.totalFiles}`);
  lines.push(`  Unchanged: ${artifact.diffClassification.unchanged}`);
  lines.push(`  Refreshed: ${artifact.diffClassification.refreshed}`);
  lines.push(`  Created: ${artifact.diffClassification.created}`);
  lines.push(`  Deleted: ${artifact.diffClassification.deleted}`);
  lines.push("");
  
  if (artifact.diffClassification.requiresRegenerate) {
    lines.push("⚠️  REQUIRES REGENERATE");
    for (const reason of artifact.diffClassification.regenerateReasons) {
      lines.push(`  ${reason}`);
    }
    lines.push("");
  }
  
  lines.push("--- Execution ---");
  lines.push(`  Success: ${artifact.execution.success ? "✅" : "❌"}`);
  lines.push(`  Unchanged: ${artifact.execution.unchangedCount}`);
  lines.push(`  Refreshed: ${artifact.execution.refreshedCount}`);
  lines.push(`  Created: ${artifact.execution.createdCount}`);
  lines.push(`  Deleted: ${artifact.execution.deletedCount}`);
  if (artifact.execution.failedFiles.length > 0) {
    lines.push("  Failed:");
    for (const file of artifact.execution.failedFiles) {
      lines.push(`    ❌ ${file.path}: ${file.error}`);
    }
  }
  lines.push("");
  
  lines.push("--- Final Verdict ---");
  lines.push(`  Pipeline Complete: ${artifact.finalVerdict.pipelineComplete ? "✅" : "❌"}`);
  lines.push(`  Completion Kind: ${artifact.finalVerdict.completionKind}`);
  lines.push(`  Weakest Stage: ${artifact.finalVerdict.weakestStage || "(none)"}`);
  
  if (artifact.finalVerdict.remainingRisks.length > 0) {
    lines.push("  Remaining Risks:");
    for (const risk of artifact.finalVerdict.remainingRisks) {
      lines.push(`    - ${risk}`);
    }
  }
  
  if (artifact.finalVerdict.nextSteps.length > 0) {
    lines.push("  Next Steps:");
    for (const step of artifact.finalVerdict.nextSteps) {
      lines.push(`    → ${step}`);
    }
  }
  
  return lines.join("\n");
}

import {
  analyzeDependencyRevalidation,
  deleteFeature,
  findFeatureById,
  initializeWorkspace,
  saveWorkspace,
} from "../../../../core/workspace/index.js";
import { exportWorkspaceToBridge, refreshBridge } from "../../../../adapters/dota2/bridge/index.js";
import { executeRollback, formatRollbackPlan, formatRollbackResult, generateRollbackPlan } from "../../../../adapters/dota2/rollback/index.js";
import { performRollbackHostValidation } from "../../helpers/index.js";
import { checkDeleteDependencyRisk } from "../../helpers/governance-check.js";
import { createDeleteReviewArtifact } from "../delete-artifact.js";
import { saveDefaultReviewArtifact } from "../review-artifacts.js";
import {
  finalizeDota2MaintenanceArtifact,
  printHostValidationStage,
  runDota2RuntimeValidation,
} from "./lifecycle-runner.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";
import { calculateFinalCommitDecision } from "../../../../core/pipeline/final-commit-gate.js";

function buildMaintenanceGateBlueprint(existingFeature: {
  featureId: string;
  implementationStrategy?: string;
  maturity?: string;
  validationStatus?: unknown;
  commitDecision?: unknown;
}): any {
  return {
    id: `maintenance.${existingFeature.featureId}`,
    version: "1.0",
    summary: `Maintenance lifecycle gate for ${existingFeature.featureId}`,
    sourceIntent: {
      intentKind: "unknown",
      goal: `maintenance ${existingFeature.featureId}`,
      normalizedMechanics: {},
    },
    modules: [],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: true,
    implementationStrategy: existingFeature.implementationStrategy ?? "pattern",
    maturity: existingFeature.maturity ?? "templated",
    validationStatus: existingFeature.validationStatus,
    commitDecision: existingFeature.commitDecision,
  };
}

function setBlockedCommitDecision(
  artifact: ReturnType<typeof createDeleteReviewArtifact>,
  reasons: string[],
  impactedFeatures: string[] = [],
  dependencyBlockers: string[] = [],
  downgradedFeatures: string[] = [],
): void {
  artifact.stages.finalCommitDecision = {
    success: false,
    outcome: "blocked",
    requiresReview: false,
    reasons,
    impactedFeatures,
    dependencyBlockers,
    downgradedFeatures,
    skipped: false,
  };
}

export async function runDeleteCommand(options: Dota2CLIOptions): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Delete Feature (Maintenance Command)");
  console.log("=".repeat(70));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📝 Feature: ${options.featureId || "(not specified)"}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : "write"}`);

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for delete");
    return false;
  }

  const artifact = createDeleteReviewArtifact(options);

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    artifact.stages.workspaceState = {
      success: false,
      featureId: options.featureId,
      totalFeatures: 0,
      error: workspaceResult.issues.join(", "),
      skipped: false,
    };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Failed to load workspace");
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    artifact.stages.workspaceState = {
      success: false,
      featureId: options.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
      error: "Feature not found",
      skipped: false,
    };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature '${options.featureId}' not found`);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be deleted`);
    console.error("   Only features with status 'active' can be deleted");
    artifact.stages.workspaceState = {
      success: false,
      featureId: options.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
      error: `Feature status is '${existingFeature.status}', not 'active'`,
      skipped: false,
    };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature status is '${existingFeature.status}', only 'active' features can be deleted`);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("\n📋 Existing Feature:");
  console.log(`   Feature ID: ${existingFeature.featureId}`);
  console.log(`   Revision: ${existingFeature.revision}`);
  console.log(`   Generated Files: ${existingFeature.generatedFiles.length}`);
  console.log(`   Status: ${existingFeature.status}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 0: Dependency Risk Check");
  console.log("=".repeat(70));

  const dependencyConflicts = checkDeleteDependencyRisk(options.featureId, workspaceResult.workspace);
  const dependencyRevalidation = analyzeDependencyRevalidation({
    workspace: workspaceResult.workspace,
    providerFeatureId: options.featureId,
    lifecycleAction: "delete",
  });
  artifact.stages.dependencyRevalidation = {
    success: dependencyRevalidation.success,
    impactedFeatures: dependencyRevalidation.impactedFeatures,
    blockers: dependencyRevalidation.blockers,
    downgradedFeatures: dependencyRevalidation.downgradedFeatures,
    compatibleFeatures: dependencyRevalidation.compatibleFeatures,
    skipped: dependencyRevalidation.impactedFeatures.length === 0,
  };

  if (dependencyConflicts.length > 0) {
    console.error("\n❌ Cannot delete feature: other features depend on it");
    console.error("\n  Dependent features:");
    for (const conflict of dependencyConflicts) {
      console.error(`    - ${conflict.existingFeatureLabel} (${conflict.existingFeatureId})`);
    }
    if (options.force) {
      console.error("\n  Force mode does not bypass V2 dependency governance.");
    }

    artifact.stages.governanceCheck = {
      success: false,
      hasConflict: true,
      conflicts: dependencyConflicts,
      recommendedAction: "block",
      status: "blocked",
      summary: `Cannot delete feature: ${dependencyConflicts.length} dependent feature(s) found.`,
    };
    setBlockedCommitDecision(
      artifact,
      dependencyRevalidation.blockers,
      dependencyRevalidation.impactedFeatures.map((impact) => impact.featureId),
      dependencyRevalidation.blockers,
      dependencyRevalidation.downgradedFeatures,
    );
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "dependencyRevalidation";
    artifact.finalVerdict.remainingRisks.push(...dependencyConflicts.map((conflict) => conflict.explanation));
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("  ✅ No dependency conflicts detected");

  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: Delete Plan");
  console.log("=".repeat(70));

  const deletePlan = generateRollbackPlan(existingFeature, workspaceResult.workspace, options.hostRoot);
  console.log(formatRollbackPlan(deletePlan));

  if (!deletePlan.canExecute) {
    console.error("\n❌ Delete plan cannot be executed due to safety issues:");
    for (const issue of deletePlan.safetyIssues) {
      console.error(`   - ${issue}`);
    }
    artifact.stages.rollbackPlan = {
      featureId: deletePlan.featureId,
      currentRevision: deletePlan.currentRevision,
      filesToDelete: deletePlan.filesToDelete,
      bridgeEffectsToRefresh: deletePlan.bridgeEffectsToRefresh,
      ownershipValid: deletePlan.ownershipValid,
      safetyIssues: deletePlan.safetyIssues,
      canExecute: false,
      executedDeletes: [],
      deleteFailures: [],
      skippedDeletes: [],
      indexRefreshSuccess: false,
    };
    setBlockedCommitDecision(artifact, deletePlan.safetyIssues);
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "rollbackPlan";
    artifact.finalVerdict.remainingRisks.push(...deletePlan.safetyIssues);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Delete Execution");
  console.log("=".repeat(70));

  const deleteResult = executeRollback(
    deletePlan,
    workspaceResult.workspace,
    options.hostRoot,
    options.dryRun,
    true,
  );
  console.log(formatRollbackResult(deleteResult));

  artifact.stages.rollbackPlan = {
    featureId: deletePlan.featureId,
    currentRevision: deletePlan.currentRevision,
    filesToDelete: deletePlan.filesToDelete,
    bridgeEffectsToRefresh: deletePlan.bridgeEffectsToRefresh,
    ownershipValid: deletePlan.ownershipValid,
    safetyIssues: deletePlan.safetyIssues,
    canExecute: deletePlan.canExecute,
    executedDeletes: deleteResult.deleted,
    deleteFailures: deleteResult.failed,
    skippedDeletes: deleteResult.skipped,
    indexRefreshSuccess: deleteResult.indexRefreshSuccess,
  };

  if (!deleteResult.success) {
    console.error("\n❌ Delete execution failed");
    setBlockedCommitDecision(
      artifact,
      deleteResult.failed.map((failure) => `${failure.file}: ${failure.error}`).length > 0
        ? deleteResult.failed.map((failure) => `${failure.file}: ${failure.error}`)
        : ["Delete execution failed"],
      dependencyRevalidation.impactedFeatures.map((impact) => impact.featureId),
      dependencyRevalidation.blockers,
      dependencyRevalidation.downgradedFeatures,
    );
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "rollbackPlan";
    artifact.finalVerdict.remainingRisks.push("Delete execution failed");
    if (deleteResult.failed.length > 0) {
      artifact.finalVerdict.remainingRisks.push(`${deleteResult.failed.length} file deletions failed`);
    }
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Host Validation");
  console.log("=".repeat(70));

  const hostValidationResult = performRollbackHostValidation(options.hostRoot, deletePlan, deleteResult);
  artifact.stages.hostValidation = hostValidationResult;
  printHostValidationStage(hostValidationResult);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: Runtime Validation");
  console.log("=".repeat(70));

  const runtimeValidationResult = await runDota2RuntimeValidation(
    options,
    !options.dryRun && deleteResult.success,
    "dry-run mode or delete failure",
  );
  artifact.stages.runtimeValidation = runtimeValidationResult;

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Final Commit Decision");
  console.log("=".repeat(70));

  const finalCommitDecision = calculateFinalCommitDecision({
    blueprint: buildMaintenanceGateBlueprint(existingFeature),
    dependencyRevalidation,
    hostValidation: {
      success: hostValidationResult.success,
      issues: hostValidationResult.issues,
    },
    runtimeValidation: {
      success: runtimeValidationResult.success,
      limitations: runtimeValidationResult.limitations,
      skipped: runtimeValidationResult.skipped,
    },
    dryRun: options.dryRun,
  });
  artifact.stages.finalCommitDecision = {
    success: finalCommitDecision.outcome !== "blocked",
    outcome: finalCommitDecision.outcome,
    requiresReview: finalCommitDecision.requiresReview,
    reasons: finalCommitDecision.reasons,
    impactedFeatures: finalCommitDecision.impactedFeatures || [],
    dependencyBlockers: finalCommitDecision.dependencyBlockers || [],
    downgradedFeatures: finalCommitDecision.downgradedFeatures || [],
    skipped: false,
  };
  console.log(`  Outcome: ${finalCommitDecision.outcome}`);
  console.log(`  Requires Review: ${finalCommitDecision.requiresReview ? "yes" : "no"}`);
  for (const reason of finalCommitDecision.reasons) {
    console.log(`    - ${reason}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 6: Workspace State Update");
  console.log("=".repeat(70));

  let workspaceStateResult: {
    success: boolean;
    featureId: string;
    totalFeatures: number;
    error?: string;
    skipped?: boolean;
  } = {
    success: true,
    featureId: options.featureId,
    totalFeatures: 0,
    skipped: true,
  };

  if (!options.dryRun && finalCommitDecision.outcome !== "blocked") {
    const deleteFeatureResult = deleteFeature(workspaceResult.workspace, options.featureId);

    if (!deleteFeatureResult.success) {
      console.error(`\n❌ Failed to delete feature from workspace: ${deleteFeatureResult.issues.join(", ")}`);
      workspaceStateResult = {
        success: false,
        featureId: options.featureId,
        totalFeatures: workspaceResult.workspace.features.length,
        error: deleteFeatureResult.issues.join(", "),
        skipped: false,
      };
    } else {
      const updatedWorkspace = deleteFeatureResult.workspace!;
      const saveResult = saveWorkspace(options.hostRoot, updatedWorkspace);
      if (!saveResult.success) {
        console.error(`\n❌ Failed to update workspace state: ${saveResult.issues.join(", ")}`);
        workspaceStateResult = {
          success: false,
          featureId: options.featureId,
          totalFeatures: updatedWorkspace.features.length,
          error: saveResult.issues.join(", "),
          skipped: false,
        };
      } else {
        console.log("✅ Workspace state updated - feature completely removed");
        workspaceStateResult = {
          success: true,
          featureId: options.featureId,
          totalFeatures: updatedWorkspace.features.length,
          skipped: false,
        };

        const bridgeRefreshResult = refreshBridge(options.hostRoot, updatedWorkspace);
        if (bridgeRefreshResult.success) {
          console.log("✅ Bridge indexes refreshed");
        } else {
          console.error(`⚠️ Bridge refresh failed: ${bridgeRefreshResult.errors.join(", ")}`);
        }

        const bridgeExportResult = exportWorkspaceToBridge(updatedWorkspace, {
          hostRoot: options.hostRoot,
        });
        if (bridgeExportResult.success) {
          console.log(`✅ Bridge export updated: ${bridgeExportResult.outputPath}`);
        } else {
          console.error(`⚠️ Bridge export failed: ${bridgeExportResult.issues.join(", ")}`);
        }
      }
    }
  } else {
    console.log(
      options.dryRun
        ? "🔍 DRY-RUN MODE - Workspace state would be updated to remove feature completely"
        : "⚠️ Workspace update skipped because final commit decision is blocked",
    );
    workspaceStateResult = {
      success: true,
      featureId: options.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
      skipped: true,
    };
  }

  artifact.stages.workspaceState = workspaceStateResult;

  const { pipelineComplete } = finalizeDota2MaintenanceArtifact({
    artifact,
    options,
    stageStatuses: [
      { name: "dependencyRevalidation", success: artifact.stages.dependencyRevalidation?.success ?? true },
      { name: "rollbackPlan", success: artifact.stages.rollbackPlan?.canExecute ?? false },
      { name: "finalCommitDecision", success: artifact.stages.finalCommitDecision?.success ?? false },
      { name: "workspaceState", success: artifact.stages.workspaceState.success },
      { name: "hostValidation", success: artifact.stages.hostValidation.success },
      { name: "runtimeValidation", success: artifact.stages.runtimeValidation.success },
    ],
    stageRiskMessages: {
      dependencyRevalidation: "Dependency revalidation blocked the delete.",
      rollbackPlan: "Delete plan has safety issues",
      finalCommitDecision: "Final commit decision blocked the delete.",
      workspaceState: "Workspace state update failed",
      hostValidation: "Host validation failed",
      runtimeValidation: "Runtime validation failed",
    },
    dryRunNextStep: "Run with --write to execute the delete plan.",
    successNextSteps: [
      "Verify the feature has been completely removed.",
      "Check that no residual files remain.",
    ],
  });
  return pipelineComplete;
}

import { exportWorkspaceToBridge } from "../../../../adapters/dota2/bridge/index.js";
import { executeRollback, formatRollbackPlan, formatRollbackResult, generateRollbackPlan } from "../../../../adapters/dota2/rollback/index.js";
import { checkDeleteDependencyRisk } from "../../helpers/governance-check.js";
import { performRollbackHostValidation } from "../../helpers/index.js";
import { createRollbackReviewArtifact } from "../rollback-artifact.js";
import { saveDefaultReviewArtifact } from "../review-artifacts.js";
import {
  finalizeDota2MaintenanceArtifact,
  printHostValidationStage,
  runDota2RuntimeValidation,
} from "./lifecycle-runner.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";
import {
  findFeatureById,
  initializeWorkspace,
  rollbackFeatureInWorkspace,
  saveWorkspace,
} from "../../../../core/workspace/index.js";

export async function runRollbackCommand(options: Dota2CLIOptions): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Rollback Feature (Maintenance Command)");
  console.log("=".repeat(70));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📝 Feature: ${options.featureId || "(not specified)"}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : "write"}`);

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for rollback");
    return false;
  }

  const artifact = createRollbackReviewArtifact(options);

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: workspaceResult.issues.join(", ") };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Failed to load workspace");
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: "Feature not found" };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature '${options.featureId}' not found`);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be rolled back`);
    console.error("   Only features with status 'active' can be rolled back");
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: `Feature status is '${existingFeature.status}', not 'active'` };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature status is '${existingFeature.status}', only 'active' features can be rolled back`);
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

  if (options.force) {
    console.log("  ⚠️  Force mode: skipping dependency risk check");
    console.log("     This may break features that depend on this feature.");
  } else {
    const dependencyConflicts = checkDeleteDependencyRisk(options.featureId, workspaceResult.workspace);

    if (dependencyConflicts.length > 0) {
      console.error("\n❌ Cannot rollback feature: other features depend on it");
      console.error("\n  Dependent features:");
      for (const conflict of dependencyConflicts) {
        console.error(`    - ${conflict.existingFeatureLabel} (${conflict.existingFeatureId})`);
      }
      console.error("\n  Recommendation:");
      console.error("    1. Remove the dependency from dependent features first");
      console.error("    2. Or use --force to force rollback (not recommended)");

      artifact.stages.governanceCheck = {
        success: false,
        hasConflict: true,
        conflicts: dependencyConflicts,
        recommendedAction: "block",
        status: "blocked",
        summary: `Cannot rollback feature: ${dependencyConflicts.length} dependent feature(s) found.`,
      };
      artifact.finalVerdict.pipelineComplete = false;
      artifact.finalVerdict.weakestStage = "governanceCheck";
      artifact.finalVerdict.remainingRisks.push(...dependencyConflicts.map((conflict) => conflict.explanation));
      saveDefaultReviewArtifact(artifact);
      return false;
    }

    console.log("  ✅ No dependency conflicts detected");
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: Rollback Plan");
  console.log("=".repeat(70));

  const rollbackPlan = generateRollbackPlan(existingFeature, workspaceResult.workspace, options.hostRoot);

  console.log(formatRollbackPlan(rollbackPlan));

  if (!rollbackPlan.canExecute) {
    console.error("\n❌ Rollback plan cannot be executed due to safety issues:");
    for (const issue of rollbackPlan.safetyIssues) {
      console.error(`   - ${issue}`);
    }
    artifact.stages.rollbackPlan = {
      featureId: rollbackPlan.featureId,
      currentRevision: rollbackPlan.currentRevision,
      filesToDelete: rollbackPlan.filesToDelete,
      bridgeEffectsToRefresh: rollbackPlan.bridgeEffectsToRefresh,
      ownershipValid: rollbackPlan.ownershipValid,
      safetyIssues: rollbackPlan.safetyIssues,
      canExecute: false,
      executedDeletes: [],
      deleteFailures: [],
      skippedDeletes: [],
      indexRefreshSuccess: false,
    };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "rollbackPlan";
    artifact.finalVerdict.remainingRisks.push(...rollbackPlan.safetyIssues);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Rollback Execution");
  console.log("=".repeat(70));

  const rollbackResult = executeRollback(
    rollbackPlan,
    workspaceResult.workspace,
    options.hostRoot,
    options.dryRun,
  );
  console.log(formatRollbackResult(rollbackResult));

  artifact.stages.rollbackPlan = {
    featureId: rollbackPlan.featureId,
    currentRevision: rollbackPlan.currentRevision,
    filesToDelete: rollbackPlan.filesToDelete,
    bridgeEffectsToRefresh: rollbackPlan.bridgeEffectsToRefresh,
    ownershipValid: rollbackPlan.ownershipValid,
    safetyIssues: rollbackPlan.safetyIssues,
    canExecute: rollbackPlan.canExecute,
    executedDeletes: rollbackResult.deleted,
    deleteFailures: rollbackResult.failed,
    skippedDeletes: rollbackResult.skipped,
    indexRefreshSuccess: rollbackResult.indexRefreshSuccess,
  };

  if (!rollbackResult.success) {
    console.error("\n❌ Rollback execution failed");
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "rollbackPlan";
    artifact.finalVerdict.remainingRisks.push("Rollback execution failed");
    if (rollbackResult.failed.length > 0) {
      artifact.finalVerdict.remainingRisks.push(`${rollbackResult.failed.length} file deletions failed`);
    }
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Workspace State Update");
  console.log("=".repeat(70));

  let workspaceStateResult: { success: boolean; featureId: string; totalFeatures: number; error?: string; skipped?: boolean } =
    { success: true, featureId: options.featureId, totalFeatures: 0, skipped: true };

  if (!options.dryRun) {
    const updatedWorkspace = rollbackFeatureInWorkspace(
      workspaceResult.workspace,
      options.featureId,
    );
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
      console.log("✅ Workspace state updated - feature marked as rolled_back");
      workspaceStateResult = {
        success: true,
        featureId: options.featureId,
        totalFeatures: updatedWorkspace.features.length,
        skipped: false,
      };

      const bridgeExportResult = exportWorkspaceToBridge(updatedWorkspace, {
        hostRoot: options.hostRoot,
      });
      if (bridgeExportResult.success) {
        console.log(`✅ Bridge export updated: ${bridgeExportResult.outputPath}`);
      } else {
        console.error(`⚠️ Bridge export failed: ${bridgeExportResult.issues.join(", ")}`);
      }
    }
  } else {
    console.log("🔍 DRY-RUN MODE - Workspace state would be updated to mark feature as rolled_back");
    workspaceStateResult = {
      success: true,
      featureId: options.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
      skipped: true,
    };
  }

  artifact.stages.workspaceState = workspaceStateResult;

  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: Host Validation");
  console.log("=".repeat(70));

  const hostValidationResult = performRollbackHostValidation(
    options.hostRoot,
    rollbackPlan,
    rollbackResult,
  );

  artifact.stages.hostValidation = hostValidationResult;
  printHostValidationStage(hostValidationResult);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Runtime Validation");
  console.log("=".repeat(70));

  const runtimeValidationResult = await runDota2RuntimeValidation(
    options,
    !options.dryRun && rollbackResult.success,
    "dry-run mode or rollback failure"
  );
  artifact.stages.runtimeValidation = runtimeValidationResult;
  const { pipelineComplete } = finalizeDota2MaintenanceArtifact({
    artifact,
    options,
    stageStatuses: [
      { name: "rollbackPlan", success: artifact.stages.rollbackPlan?.canExecute ?? false },
      { name: "workspaceState", success: artifact.stages.workspaceState.success },
      { name: "hostValidation", success: artifact.stages.hostValidation.success },
      { name: "runtimeValidation", success: artifact.stages.runtimeValidation.success },
    ],
    stageRiskMessages: {
      rollbackPlan: "Rollback plan has safety issues",
      workspaceState: "Workspace state update failed",
      hostValidation: "Host validation failed",
      runtimeValidation: "Runtime validation failed",
    },
    dryRunNextStep: "Run with --write to execute the rollback plan.",
    successNextSteps: [
      "Verify the feature has been completely removed.",
      "Check that no residual files remain.",
    ],
  });
  return pipelineComplete;
}

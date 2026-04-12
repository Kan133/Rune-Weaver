import { join } from "path";

import { deleteFeature, findFeatureById, initializeWorkspace, saveWorkspace } from "../../../../core/workspace/index.js";
import { exportWorkspaceToBridge, refreshBridge } from "../../../../adapters/dota2/bridge/index.js";
import { executeRollback, formatRollbackPlan, formatRollbackResult, generateRollbackPlan } from "../../../../adapters/dota2/rollback/index.js";
import { validateHostRuntime } from "../../../../adapters/dota2/validator/runtime-validator.js";
import { performRollbackHostValidation } from "../../helpers/index.js";
import { checkDeleteDependencyRisk } from "../../helpers/governance-check.js";
import { createDeleteReviewArtifact } from "../delete-artifact.js";
import { getDefaultReviewArtifactOutputDir, saveDefaultReviewArtifact, saveReviewArtifact } from "../review-artifacts.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";

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
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be deleted`);
    console.error("   Only features with status 'active' can be deleted");
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: `Feature status is '${existingFeature.status}', not 'active'` };
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

  if (options.force) {
    console.log("  ⚠️  Force mode: skipping dependency risk check");
    console.log("     This may break features that depend on this feature.");
  } else {
    const dependencyConflicts = checkDeleteDependencyRisk(options.featureId, workspaceResult.workspace);

    if (dependencyConflicts.length > 0) {
      console.error("\n❌ Cannot delete feature: other features depend on it");
      console.error("\n  Dependent features:");
      for (const conflict of dependencyConflicts) {
        console.error(`    - ${conflict.existingFeatureLabel} (${conflict.existingFeatureId})`);
      }
      console.error("\n  Recommendation:");
      console.error("    1. Remove the dependency from dependent features first");
      console.error("    2. Or use 'dota2 rollback' instead to keep the feature record");
      console.error("    3. Or use --force to force delete (not recommended)");

      artifact.stages.governanceCheck = {
        success: false,
        hasConflict: true,
        conflicts: dependencyConflicts,
        recommendedAction: "block",
        status: "blocked",
        summary: `Cannot delete feature: ${dependencyConflicts.length} dependent feature(s) found.`,
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
  console.log("Stage 3: Workspace State Update");
  console.log("=".repeat(70));

  let workspaceStateResult: { success: boolean; featureId: string; totalFeatures: number; error?: string; skipped?: boolean } =
    { success: true, featureId: options.featureId, totalFeatures: 0, skipped: true };

  if (!options.dryRun) {
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
    console.log("🔍 DRY-RUN MODE - Workspace state would be updated to remove feature completely");
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

  const hostValidationResult = performRollbackHostValidation(options.hostRoot, deletePlan, deleteResult);

  artifact.stages.hostValidation = hostValidationResult;

  for (const check of hostValidationResult.checks) {
    console.log(`  ${check}`);
  }

  if (hostValidationResult.issues.length > 0) {
    console.log("\n  Issues:");
    for (const issue of hostValidationResult.issues) {
      console.log(`    - ${issue}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Runtime Validation");
  console.log("=".repeat(70));

  let runtimeValidationResult: { success: boolean; serverPassed: boolean; uiPassed: boolean; serverErrors: number; uiErrors: number; limitations: string[] } =
    { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [] };

  if (!options.dryRun && deleteResult.success) {
    try {
      const runtimeArtifact = await validateHostRuntime(options.hostRoot);

      runtimeValidationResult = {
        success: runtimeArtifact.overall.success,
        serverPassed: runtimeArtifact.overall.serverPassed,
        uiPassed: runtimeArtifact.overall.uiPassed,
        serverErrors: runtimeArtifact.server.errorCount,
        uiErrors: runtimeArtifact.ui.errorCount,
        limitations: runtimeArtifact.overall.limitations,
      };

      console.log(`  Server: ${runtimeArtifact.server.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.server.errorCount}`);
      console.log(`    - Checked: ${runtimeArtifact.server.checked}`);

      console.log(`  UI: ${runtimeArtifact.ui.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.ui.errorCount}`);
      console.log(`    - Checked: ${runtimeArtifact.ui.checked}`);

      if (runtimeArtifact.overall.limitations.length > 0) {
        console.log("  Limitations:");
        for (const limitation of runtimeArtifact.overall.limitations) {
          console.log(`    - ${limitation}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Runtime validation failed: ${errorMessage}`);
      runtimeValidationResult = {
        success: false,
        serverPassed: false,
        uiPassed: false,
        serverErrors: 0,
        uiErrors: 0,
        limitations: [`Runtime validation error: ${errorMessage}`],
      };
    }
  } else {
    console.log("  ⏭️  Skipped (dry-run mode or delete failed)");
    runtimeValidationResult.limitations = ["Skipped due to dry-run mode or delete failure"];
  }

  artifact.stages.runtimeValidation = runtimeValidationResult;

  const allStages = [
    { name: "rollbackPlan", success: artifact.stages.rollbackPlan?.canExecute ?? false },
    { name: "workspaceState", success: artifact.stages.workspaceState.success },
    { name: "hostValidation", success: artifact.stages.hostValidation.success },
    { name: "runtimeValidation", success: artifact.stages.runtimeValidation.success },
  ];

  const failedStages = allStages.filter((stage) => !stage.success);
  const weakestStage = failedStages.length > 0 ? failedStages[0].name : "";
  const pipelineComplete = failedStages.length === 0;

  artifact.finalVerdict.pipelineComplete = pipelineComplete;
  artifact.finalVerdict.weakestStage = weakestStage;
  artifact.finalVerdict.completionKind = options.dryRun ? "default-safe" : (pipelineComplete ? "default-safe" : "partial");
  artifact.finalVerdict.sufficientForDemo = pipelineComplete;

  if (!pipelineComplete) {
    if (!artifact.stages.rollbackPlan?.canExecute) {
      artifact.finalVerdict.remainingRisks.push("Delete plan has safety issues");
    }
    if (!artifact.stages.workspaceState.success) {
      artifact.finalVerdict.remainingRisks.push("Workspace state update failed");
    }
    if (!artifact.stages.hostValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Host validation failed");
    }
    if (!artifact.stages.runtimeValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Runtime validation failed");
    }
  }

  if (options.dryRun) {
    artifact.finalVerdict.nextSteps.push("Run with --write to execute the delete plan.");
  } else if (pipelineComplete) {
    artifact.finalVerdict.nextSteps.push("Verify the feature has been completely removed.");
    artifact.finalVerdict.nextSteps.push("Check that no residual files remain.");
  } else {
    artifact.finalVerdict.nextSteps.push("Fix the issues before retrying.");
  }

  const outputPath = saveReviewArtifact(artifact, getDefaultReviewArtifactOutputDir());

  console.log("\n" + "=".repeat(70));
  console.log("Final Verdict");
  console.log("=".repeat(70));
  console.log(`  Pipeline Complete: ${pipelineComplete ? "✅" : "❌"}`);
  console.log(`  Completion Kind: ${artifact.finalVerdict.completionKind}`);
  console.log(`  Weakest Stage: ${weakestStage || "(none)"}`);
  console.log(`  Sufficient for Demo: ${artifact.finalVerdict.sufficientForDemo ? "✅" : "❌"}`);

  if (artifact.finalVerdict.remainingRisks.length > 0) {
    console.log("\n  Remaining Risks:");
    for (const risk of artifact.finalVerdict.remainingRisks) {
      console.log(`    - ${risk}`);
    }
  }

  if (artifact.finalVerdict.nextSteps.length > 0) {
    console.log("\n  Next Steps:");
    for (const step of artifact.finalVerdict.nextSteps) {
      console.log(`    → ${step}`);
    }
  }

  console.log(`\n📄 Review artifact saved: ${outputPath}`);

  return pipelineComplete;
}

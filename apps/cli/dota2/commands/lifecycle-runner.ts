import { validateHostRuntime } from "../../../../adapters/dota2/validator/runtime-validator.js";
import { LifecycleArtifactBuilder } from "../../../../core/lifecycle/artifact-builder.js";
import type { MaintenanceLifecycleStageStatus } from "../../../../core/lifecycle/types.js";
import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../../dota2-cli.js";
import { getDefaultReviewArtifactOutputDir, saveReviewArtifact } from "../review-artifacts.js";

type Dota2HostValidationStage = Dota2ReviewArtifact["stages"]["hostValidation"];
type Dota2RuntimeValidationStage = Dota2ReviewArtifact["stages"]["runtimeValidation"];

export function printHostValidationStage(result: Dota2HostValidationStage): void {
  for (const check of result.checks) {
    console.log(`  ${check}`);
  }

  if (result.issues.length > 0) {
    console.log("\n  Issues:");
    for (const issue of result.issues) {
      console.log(`    - ${issue}`);
    }
  }
}

export async function runDota2RuntimeValidation(
  options: Dota2CLIOptions,
  shouldRun: boolean,
  skipReason: string
): Promise<Dota2RuntimeValidationStage> {
  const defaultResult: Dota2RuntimeValidationStage = {
    success: true,
    serverPassed: true,
    uiPassed: true,
    serverErrors: 0,
    uiErrors: 0,
    limitations: [],
  };

  if (!shouldRun) {
    console.log(`  ⏭️  Skipped (${skipReason})`);
    defaultResult.limitations = [`Skipped due to ${skipReason}`];
    defaultResult.skipped = true;
    return defaultResult;
  }

  try {
    const runtimeArtifact = await validateHostRuntime(options.hostRoot);
    if (!runtimeArtifact.overall.checked) {
      const limitations = runtimeArtifact.overall.limitations.length > 0
        ? runtimeArtifact.overall.limitations
        : ["Runtime validation skipped because no runtime validation prerequisites were available."];

      console.log("  ⏭️  Runtime validation skipped");
      if (limitations.length > 0) {
        console.log("  Limitations:");
        for (const limitation of limitations) {
          console.log(`    - ${limitation}`);
        }
      }

      return {
        success: true,
        serverPassed: true,
        uiPassed: true,
        serverErrors: 0,
        uiErrors: 0,
        limitations,
        skipped: true,
      };
    }

    const runtimeValidationResult: Dota2RuntimeValidationStage = {
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

    return runtimeValidationResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ Runtime validation failed: ${errorMessage}`);
    return {
      success: false,
      serverPassed: false,
      uiPassed: false,
      serverErrors: 0,
      uiErrors: 0,
      limitations: [`Runtime validation error: ${errorMessage}`],
    };
  }
}

export function finalizeDota2MaintenanceArtifact(params: {
  artifact: Dota2ReviewArtifact;
  options: Dota2CLIOptions;
  stageStatuses: MaintenanceLifecycleStageStatus[];
  stageRiskMessages: Partial<Record<string, string>>;
  dryRunNextStep: string;
  successNextSteps: string[];
  failureNextStep?: string;
}): { pipelineComplete: boolean; outputPath: string } {
  const {
    artifact,
    options,
    stageStatuses,
    stageRiskMessages,
    dryRunNextStep,
    successNextSteps,
    failureNextStep = "Fix the issues before retrying.",
  } = params;

  const builder = new LifecycleArtifactBuilder(artifact);
  const failedStages = stageStatuses.filter((stage) => !stage.success);
  const weakestStage = failedStages.length > 0 ? failedStages[0].name : "";
  const pipelineComplete = failedStages.length === 0;

  builder.setPipelineStatus({
    pipelineComplete,
    weakestStage,
    completionKind: options.dryRun
      ? "default-safe"
      : pipelineComplete
        ? "default-safe"
        : "partial",
    sufficientForDemo: pipelineComplete,
  });

  if (!pipelineComplete) {
    for (const failedStage of failedStages) {
      const risk = stageRiskMessages[failedStage.name];
      if (risk) {
        builder.addRemainingRisk(risk);
      }
    }
  }

  if (options.dryRun) {
    builder.addNextStep(dryRunNextStep);
  } else if (pipelineComplete) {
    for (const step of successNextSteps) {
      builder.addNextStep(step);
    }
  } else {
    builder.addNextStep(failureNextStep);
  }

  const outputPath = saveReviewArtifact(builder.build(), getDefaultReviewArtifactOutputDir());

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

  return { pipelineComplete, outputPath };
}

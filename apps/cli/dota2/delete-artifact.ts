import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../dota2-cli.js";

export function createDeleteReviewArtifact(options: Dota2CLIOptions): Dota2ReviewArtifact {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "maintenance",
    applicableStages: ["rollbackPlan", "workspaceState", "hostValidation", "runtimeValidation"],
    cliOptions: {
      command: options.command,
      prompt: options.prompt || "",
      hostRoot: options.hostRoot,
      featureId: options.featureId,
      dryRun: options.dryRun,
      write: options.write,
      force: options.force,
    },
    input: {
      rawPrompt: options.prompt || "",
      goal: `Delete feature: ${options.featureId}`,
    },
    intentSchema: {
      usedFallback: true,
      intentKind: "delete",
      uiNeeded: false,
      mechanics: [],
    },
    stages: {
      intentSchema: { success: true, summary: "Not applicable for maintenance command", issues: [], usedFallback: true, skipped: true },
      blueprint: { success: true, summary: "Not applicable for maintenance command", moduleCount: 0, patternHints: [], issues: [], skipped: true },
      patternResolution: { success: true, resolvedPatterns: [], unresolvedPatterns: [], issues: [], complete: true, skipped: true },
      assemblyPlan: { success: true, selectedPatterns: [], writeTargets: [], readyForHostWrite: true, blockers: [], skipped: true },
      hostRealization: { success: true, units: [], blockers: [], skipped: true },
      generator: { success: true, generatedFiles: [], issues: [], skipped: true },
      writeExecutor: { success: true, executedActions: 0, skippedActions: 0, failedActions: 0, createdFiles: [], modifiedFiles: [], skipped: true },
      hostValidation: { success: true, checks: [], issues: [], details: {}, skipped: false },
      runtimeValidation: { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [], skipped: false },
      workspaceState: { success: true, featureId: options.featureId ?? "", totalFeatures: 0, skipped: false },
    },
    finalVerdict: {
      pipelineComplete: false,
      completionKind: "default-safe",
      weakestStage: "",
      sufficientForDemo: false,
      hasUnresolvedPatterns: false,
      wasForceOverride: false,
      remainingRisks: [],
      nextSteps: [],
    },
  };
}

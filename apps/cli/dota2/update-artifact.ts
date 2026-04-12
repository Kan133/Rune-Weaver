import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../dota2-cli.js";

export function createUpdateReviewArtifact(options: Dota2CLIOptions): Dota2ReviewArtifact {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "maintenance",
    applicableStages: [
      "intentSchema",
      "blueprint",
      "patternResolution",
      "assemblyPlan",
      "hostRealization",
      "generator",
      "updateDiff",
      "writeExecutor",
      "hostValidation",
      "runtimeValidation",
      "workspaceState",
    ],
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
      goal: `Update feature: ${options.featureId}`,
    },
    intentSchema: {
      usedFallback: false,
      intentKind: "",
      uiNeeded: false,
      mechanics: [],
    },
    stages: {
      intentSchema: { success: false, summary: "", issues: [] },
      blueprint: { success: false, summary: "", moduleCount: 0, patternHints: [], issues: [] },
      patternResolution: { success: false, resolvedPatterns: [], unresolvedPatterns: [], issues: [], complete: false },
      assemblyPlan: { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers: [] },
      hostRealization: { success: false, units: [], blockers: [] },
      generator: { success: false, generatedFiles: [], issues: [] },
      writeExecutor: { success: false, executedActions: 0, skippedActions: 0, failedActions: 0, createdFiles: [], modifiedFiles: [] },
      hostValidation: { success: false, checks: [], issues: [], details: {} },
      runtimeValidation: { success: false, serverPassed: false, uiPassed: false, serverErrors: 0, uiErrors: 0, limitations: [] },
      workspaceState: { success: false, featureId: options.featureId || "", totalFeatures: 0 },
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

import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../dota2-cli.js";
import { resolveReviewInputProvenance } from "./input-provenance.js";
import { createPendingSemanticExportStatus } from "./semantic-artifacts.js";

export function createBaseMaintenanceReviewArtifact(
  options: Dota2CLIOptions,
  params: {
    intentKind: string;
    goal: string;
    applicableStages?: string[];
  }
): Dota2ReviewArtifact {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "maintenance",
    applicableStages: params.applicableStages || [
      "rollbackPlan",
      "dependencyRevalidation",
      "finalCommitDecision",
      "workspaceState",
      "hostValidation",
        "runtimeValidation",
      ],
    inputProvenance: resolveReviewInputProvenance(options),
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
      goal: params.goal,
    },
    semanticExportStatus: createPendingSemanticExportStatus(
      "Semantic artifact export is not part of this maintenance artifact until a command stage writes it.",
    ),
    intentSchema: {
      usedFallback: true,
      intentKind: params.intentKind,
      uiNeeded: false,
      mechanics: [],
    },
    stages: {
      intentSchema: {
        success: true,
        summary: "Not applicable for maintenance command",
        issues: [],
        usedFallback: true,
        skipped: true,
      },
      blueprint: {
        success: true,
        summary: "Not applicable for maintenance command",
        moduleCount: 0,
        patternHints: [],
        issues: [],
        moduleSourceBreakdown: { family: 0, pattern: 0, synthesized: 0 },
        skipped: true,
      },
      patternResolution: {
        success: true,
        resolvedPatterns: [],
        unresolvedPatterns: [],
        issues: [],
        complete: true,
        resolvedModules: [],
        unresolvedModuleNeeds: [],
        skipped: true,
      },
      artifactSynthesis: {
        success: true,
        triggered: false,
        artifacts: [],
        synthesizedModuleIds: [],
        warnings: [],
        blockers: [],
        skipped: true,
      },
      assemblyPlan: {
        success: true,
        selectedPatterns: [],
        writeTargets: [],
        readyForHostWrite: true,
        blockers: [],
        skipped: true,
      },
      hostRealization: { success: true, units: [], blockers: [], skipped: true },
      generator: { success: true, generatedFiles: [], issues: [], skipped: true },
      localRepair: {
        success: true,
        triggered: false,
        attempted: false,
        repairedTargets: [],
        warnings: [],
        blockers: [],
        skipped: true,
      },
      dependencyRevalidation: {
        success: true,
        impactedFeatures: [],
        blockers: [],
        downgradedFeatures: [],
        compatibleFeatures: [],
        skipped: true,
      },
      finalCommitDecision: {
        success: true,
        outcome: "committable",
        requiresReview: false,
        reasons: [],
        reviewModules: [],
        impactedFeatures: [],
        dependencyBlockers: [],
        downgradedFeatures: [],
        skipped: true,
      },
      writeExecutor: {
        success: true,
        executedActions: 0,
        skippedActions: 0,
        failedActions: 0,
        createdFiles: [],
        modifiedFiles: [],
        skipped: true,
      },
      hostValidation: { success: true, checks: [], issues: [], details: {}, skipped: true },
      runtimeValidation: {
        success: true,
        serverPassed: true,
        uiPassed: true,
        serverErrors: 0,
        uiErrors: 0,
        limitations: [],
        skipped: true,
      },
      workspaceState: { success: true, featureId: options.featureId ?? "", totalFeatures: 0, skipped: true },
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

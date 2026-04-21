import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import { LifecycleArtifactBuilder } from "../../../../core/lifecycle/artifact-builder.js";
import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../../dota2-cli.js";
import { resolveReviewArtifactOutputDir } from "../review-artifacts.js";
import { resolveReviewInputProvenance } from "../input-provenance.js";
import { createPendingSemanticExportStatus } from "../semantic-artifacts.js";

export function createCreateReviewArtifact(options: Dota2CLIOptions): Dota2ReviewArtifact {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "creation",
    applicableStages: [
      "intentSchema",
      "blueprint",
      "patternResolution",
      "artifactSynthesis",
      "assemblyPlan",
      "hostRealization",
      "generatorRouting",
      "generator",
      "localRepair",
      "dependencyRevalidation",
      "finalCommitDecision",
      "writeExecutor",
      "hostValidation",
      "runtimeValidation",
      "workspaceState",
    ],
    inputProvenance: resolveReviewInputProvenance(options),
    cliOptions: {
      command: options.command,
      prompt: options.prompt,
      hostRoot: options.hostRoot,
      featureId: options.featureId,
      dryRun: options.dryRun,
      write: options.write,
      force: options.force,
    },
    input: {
      rawPrompt: options.prompt,
      goal: options.prompt,
    },
    semanticExportStatus: createPendingSemanticExportStatus(),
    intentSchema: {
      usedFallback: false,
      intentKind: "unknown",
      uiNeeded: false,
      mechanics: [],
    },
    stages: {
      intentSchema: { success: false, summary: "", issues: [] },
      blueprint: { success: false, summary: "", moduleCount: 0, patternHints: [], issues: [] },
      patternResolution: { success: false, resolvedPatterns: [], unresolvedPatterns: [], issues: [], complete: false },
      artifactSynthesis: { success: true, triggered: false, artifacts: [], warnings: [], blockers: [], skipped: true },
      assemblyPlan: { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers: [] },
      hostRealization: { success: false, units: [], blockers: [] },
      generatorRouting: { success: false, routes: [], warnings: [], blockers: [] },
      generator: { success: false, generatedFiles: [], issues: [] },
      localRepair: { success: true, triggered: false, attempted: false, repairedTargets: [], warnings: [], blockers: [], skipped: true },
      dependencyRevalidation: { success: true, impactedFeatures: [], blockers: [], downgradedFeatures: [], compatibleFeatures: [], skipped: true },
      finalCommitDecision: { success: false, outcome: "blocked", requiresReview: true, reasons: [], reviewModules: [], impactedFeatures: [], dependencyBlockers: [], downgradedFeatures: [], skipped: true },
      writeExecutor: { success: false, executedActions: 0, skippedActions: 0, failedActions: 0, createdFiles: [], modifiedFiles: [] },
      hostValidation: { success: false, checks: [], issues: [], details: {} },
      runtimeValidation: { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [] },
      workspaceState: { success: true, featureId: "", totalFeatures: 0, skipped: true },
    },
    finalVerdict: {
      pipelineComplete: false,
      completionKind: "partial",
      weakestStage: "",
      sufficientForDemo: false,
      hasUnresolvedPatterns: false,
      wasForceOverride: false,
      remainingRisks: [],
      nextSteps: [],
    },
  };
}

export function createDota2ReviewArtifactBuilder<TArtifact extends Dota2ReviewArtifact>(
  artifact: TArtifact,
): LifecycleArtifactBuilder<TArtifact> {
  return new LifecycleArtifactBuilder(artifact);
}

export function persistDota2ReviewArtifact(
  artifact: Dota2ReviewArtifact,
  options: Dota2CLIOptions,
  defaultFilePrefix = "dota2-review",
): string {
  const outputDir = resolveReviewArtifactOutputDir(options.output);
  mkdirSync(outputDir, { recursive: true });

  const outputPath = options.output
    ? resolve(process.cwd(), options.output)
    : join(outputDir, `${defaultFilePrefix}-${Date.now()}.json`);

  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");
  return outputPath;
}

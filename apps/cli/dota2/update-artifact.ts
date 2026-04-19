import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../dota2-cli.js";
import { createBaseMaintenanceReviewArtifact } from "./maintenance-artifact.js";

export function createUpdateReviewArtifact(options: Dota2CLIOptions): Dota2ReviewArtifact {
  const artifact = createBaseMaintenanceReviewArtifact(options, {
    intentKind: "",
    goal: `Update feature: ${options.featureId}`,
    applicableStages: [
      "intentSchema",
      "blueprint",
      "patternResolution",
      "artifactSynthesis",
      "assemblyPlan",
      "hostRealization",
      "generator",
      "localRepair",
      "dependencyRevalidation",
      "finalCommitDecision",
      "updateDiff",
      "writeExecutor",
      "hostValidation",
      "runtimeValidation",
      "workspaceState",
    ],
  });

  artifact.intentSchema.usedFallback = false;
  artifact.intentSchema.intentKind = "";
  artifact.stages.intentSchema = { success: false, summary: "", issues: [] };
  artifact.stages.blueprint = {
    success: false,
    summary: "",
    moduleCount: 0,
    patternHints: [],
    issues: [],
    moduleSourceBreakdown: { family: 0, pattern: 0, synthesized: 0 },
  };
  artifact.stages.patternResolution = {
    success: false,
    resolvedPatterns: [],
    unresolvedPatterns: [],
    issues: [],
    complete: false,
    resolvedModules: [],
    unresolvedModuleNeeds: [],
  };
  artifact.stages.artifactSynthesis = {
    success: true,
    triggered: false,
    artifacts: [],
    synthesizedModuleIds: [],
    warnings: [],
    blockers: [],
    skipped: true,
  };
  artifact.stages.assemblyPlan = {
    success: false,
    selectedPatterns: [],
    writeTargets: [],
    readyForHostWrite: false,
    blockers: [],
  };
  artifact.stages.hostRealization = { success: false, units: [], blockers: [] };
  artifact.stages.generator = { success: false, generatedFiles: [], issues: [] };
  artifact.stages.localRepair = {
    success: true,
    triggered: false,
    attempted: false,
    repairedTargets: [],
    warnings: [],
    blockers: [],
    skipped: true,
  };
  artifact.stages.dependencyRevalidation = {
    success: true,
    impactedFeatures: [],
    blockers: [],
    downgradedFeatures: [],
    compatibleFeatures: [],
    skipped: true,
  };
  artifact.stages.finalCommitDecision = {
    success: false,
    outcome: "blocked",
    requiresReview: true,
    reasons: [],
    reviewModules: [],
    impactedFeatures: [],
    dependencyBlockers: [],
    downgradedFeatures: [],
    skipped: true,
  };
  artifact.stages.writeExecutor = {
    success: false,
    executedActions: 0,
    skippedActions: 0,
    failedActions: 0,
    createdFiles: [],
    modifiedFiles: [],
  };
  artifact.stages.hostValidation = { success: false, checks: [], issues: [], details: {} };
  artifact.stages.runtimeValidation = {
    success: false,
    serverPassed: false,
    uiPassed: false,
    serverErrors: 0,
    uiErrors: 0,
    limitations: [],
  };
  artifact.stages.workspaceState = { success: false, featureId: options.featureId || "", totalFeatures: 0 };

  return artifact;
}

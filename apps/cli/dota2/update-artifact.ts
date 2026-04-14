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
      "assemblyPlan",
      "hostRealization",
      "generator",
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
  artifact.stages.blueprint = { success: false, summary: "", moduleCount: 0, patternHints: [], issues: [] };
  artifact.stages.patternResolution = {
    success: false,
    resolvedPatterns: [],
    unresolvedPatterns: [],
    issues: [],
    complete: false,
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

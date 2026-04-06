/**
 * Dota2 CLI - Artifact and Verdict Builder Helpers
 *
 * T120: Split Prep - Extract low-risk artifact assembly logic from dota2-cli.ts
 *
 * This module contains pure assembly / formatting helpers only.
 * No execution policy, no routing policy, no host realization logic.
 *
 * Split Principle (per DOTA2-CLI-SPLIT-PLAN.md):
 * - CLI should become a command orchestration shell
 * - Artifact construction and verdict calculation should be unified
 * - Stage-specific business logic should move to dedicated modules
 */

import type { Dota2ReviewArtifact } from "../dota2-cli.js";
import type { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";

export interface VerdictInput {
  stages: Dota2ReviewArtifact["stages"];
  options: {
    force: boolean;
    dryRun: boolean;
  };
  writePlan: WritePlan | null;
  runtimeValidationResult: {
    success: boolean;
    skipped?: boolean;
  };
  workspaceStateResult: {
    success: boolean;
    error?: string;
    skipped?: boolean;
  };
  hostValidationDetails: Record<string, unknown>;
}

export type CompletionKind = "default-safe" | "forced" | "partial" | "requires-regenerate";

export interface VerdictResult {
  pipelineComplete: boolean;
  completionKind: CompletionKind;
  weakestStage: string;
  sufficientForDemo: boolean;
  hasUnresolvedPatterns: boolean;
  wasForceOverride: boolean;
  remainingRisks: string[];
  nextSteps: string[];
}

export function calculateFinalVerdict(input: VerdictInput): VerdictResult {
  const { stages, options, writePlan, runtimeValidationResult, workspaceStateResult, hostValidationDetails } = input;
  const { force, dryRun } = options;

  const coreStages = [
    stages.intentSchema,
    stages.blueprint,
    stages.patternResolution,
    stages.assemblyPlan,
    stages.hostRealization,
    stages.generatorRouting,
    stages.generator,
    stages.writeExecutor,
    stages.hostValidation,
    stages.runtimeValidation,
    stages.workspaceState,
  ];

  const allStagesSuccess = coreStages.every((s) => s && (s as { success: boolean }).success);
  const hasUnresolvedPatterns = stages.patternResolution.unresolvedPatterns.length > 0;
  const wasForceOverride = force && stages.assemblyPlan.readyForHostWrite === false;
  const featureFilesCreated = (hostValidationDetails.featureFilesCount as number) > 0;
  const wsFailed = !workspaceStateResult.success && !workspaceStateResult.skipped;
  const runtimeFailed = !runtimeValidationResult.success && !dryRun;

  let completionKind: CompletionKind = "partial";
  if (allStagesSuccess && !hasUnresolvedPatterns && !wasForceOverride && stages.assemblyPlan.readyForHostWrite && !wsFailed && !runtimeFailed) {
    completionKind = "default-safe";
  } else if (allStagesSuccess && wasForceOverride && !wsFailed && !runtimeFailed) {
    completionKind = "forced";
  } else if (allStagesSuccess && hasUnresolvedPatterns && !wsFailed && !runtimeFailed) {
    completionKind = "partial";
  } else if (wsFailed || runtimeFailed) {
    completionKind = "partial";
  }

  const pipelineComplete =
    allStagesSuccess &&
    !wsFailed &&
    !runtimeFailed &&
    !hasUnresolvedPatterns &&
    !wasForceOverride &&
    stages.assemblyPlan.readyForHostWrite;

  const weakestStage =
    allStagesSuccess && !wsFailed
      ? "none"
      : wsFailed
        ? "workspaceState"
        : (Object.entries(stages) as [string, unknown][])
            .filter(([k, s]) => k !== "cleanupPlan" && typeof s === "object" && s !== null && "success" in s && !(s as { success: boolean }).success)
            .map(([k]) => k)[0] || "unknown";

  const sufficientForDemo =
    completionKind === "default-safe" &&
    stages.hostValidation.success &&
    featureFilesCreated &&
    !wsFailed;

  const risks: string[] = [...(stages.hostValidation.issues || [])];
  if (hasUnresolvedPatterns) {
    risks.push(`Has ${stages.patternResolution.unresolvedPatterns.length} unresolved patterns`);
  }
  if (wasForceOverride) {
    risks.push("Execution required --force override");
  }
  if (!featureFilesCreated) {
    risks.push("Feature-specific files could not be identified");
  }
  if (wsFailed) {
    risks.push(`Workspace state update failed: ${workspaceStateResult.error}`);
  }

  const routingPlan = stages.generatorRouting;
  if (routingPlan && !routingPlan.success && routingPlan.blockers?.length > 0) {
    const kvBlocked = routingPlan.blockers.some((b: string) => b.includes("KV route"));
    if (kvBlocked) {
      risks.push("KV routes blocked - dota2-kv generator not yet implemented (transitional gap)");
    } else {
      risks.push(...routingPlan.blockers);
    }
  }

  const nextSteps: string[] = [];
  if (wsFailed) {
    nextSteps.push("Fix workspace state update failure");
  }
  if (completionKind === "partial") {
    if (hasUnresolvedPatterns) {
      nextSteps.push("Add missing patterns to resolve all pattern hints");
    }
    if (!featureFilesCreated) {
      nextSteps.push("Improve feature file identification");
    }
  }
  if (completionKind === "forced") {
    nextSteps.push("Resolve blockers to enable default-safe execution");
  }
  if (completionKind === "default-safe") {
    nextSteps.push("Host runtime validation");
    nextSteps.push("Rollback support");
  }
  if (routingPlan && !routingPlan.success && routingPlan.blockers?.some((b: string) => b.includes("KV route"))) {
    nextSteps.push("Implement dota2-kv generator to unblock KV routes");
  }

  return {
    pipelineComplete,
    completionKind,
    weakestStage,
    sufficientForDemo,
    hasUnresolvedPatterns,
    wasForceOverride,
    remainingRisks: risks,
    nextSteps: nextSteps.length > 0 ? nextSteps : ["Improve pipeline completeness"],
  };
}

export function buildDeferredEntriesInfo(entries: WritePlanEntry[]): Array<{ pattern: string; reason: string }> {
  return entries
    .filter((e: WritePlanEntry) => e.deferred)
    .map((e: WritePlanEntry) => ({
      pattern: e.sourcePattern,
      reason: e.deferredReason || "Generator not yet implemented",
    }));
}

export function buildGeneratorStage(
  writePlan: WritePlan | null,
  issues: string[]
): Dota2ReviewArtifact["stages"]["generator"] {
  const entries: WritePlanEntry[] = writePlan?.entries || [];
  const deferredEntries = entries.filter((e: WritePlanEntry) => e.deferred);
  const executableEntries = entries.filter((e: WritePlanEntry) => !e.deferred);

  // T118-R2: Compute aggregated files to avoid showing duplicate KV targets
  // Multiple KV entries may target the same file (e.g., npc_abilities_custom.txt)
  const kvEntries = executableEntries.filter((e: WritePlanEntry) => e.contentType === "kv");
  const nonKvEntries = executableEntries.filter((e: WritePlanEntry) => e.contentType !== "kv");

  // Group KV entries by targetPath and count each unique path once
  const kvTargetPaths = new Set(kvEntries.map((e: WritePlanEntry) => e.targetPath));
  const aggregatedKvFiles = Array.from(kvTargetPaths);

  // Non-KV entries are already one-to-one
  const nonKvFiles = nonKvEntries.map((e: WritePlanEntry) => e.targetPath);

  // Combine: non-KV files + aggregated KV files
  const generatedFiles = [...nonKvFiles, ...aggregatedKvFiles];

  return {
    success: writePlan !== null,
    generatedFiles,
    deferredEntries: buildDeferredEntriesInfo(deferredEntries),
    issues,
    realizationContext: writePlan?.realizationContext,
  };
}
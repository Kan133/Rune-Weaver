import {
  buildFinalValidationStatus,
  calculateFinalCommitDecision,
} from "../../../../core/pipeline/final-commit-gate.js";
import type {
  Blueprint,
  DependencyRevalidationResult,
  GeneratorRoutingPlan,
  HostRealizationPlan,
} from "../../../../core/schema/types.js";
import type { HostValidationResult, RuntimeValidationResult } from "../../helpers/index.js";
import type { Dota2ReviewArtifact } from "../../dota2-cli.js";

export interface ValidationOrchestrationInput {
  blueprint: Blueprint;
  hostRealizationPlan?: HostRealizationPlan | null;
  generatorRoutingPlan?: GeneratorRoutingPlan | null;
  governanceBlockers?: string[];
  localRepair: {
    success: boolean;
    blockers: string[];
    warnings: string[];
  };
  dependencyRevalidation: DependencyRevalidationResult;
  hostValidation: HostValidationResult;
  runtimeValidation: RuntimeValidationResult;
  dryRun: boolean;
}

export interface ValidationOrchestrationResult {
  finalCommitDecision: ReturnType<typeof calculateFinalCommitDecision>;
  finalValidationStatus: ReturnType<typeof buildFinalValidationStatus>;
  stageResult: Dota2ReviewArtifact["stages"]["finalCommitDecision"];
}

export function orchestrateValidation(
  input: ValidationOrchestrationInput,
): ValidationOrchestrationResult {
  const finalCommitDecision = calculateFinalCommitDecision({
    blueprint: input.blueprint,
    hostBlockers: input.hostRealizationPlan?.blockers,
    routingBlockers: input.generatorRoutingPlan?.blockers,
    governanceBlockers: input.governanceBlockers || [],
    localRepair: input.localRepair,
    dependencyRevalidation: input.dependencyRevalidation,
    hostValidation: {
      success: input.hostValidation.success,
      issues: input.hostValidation.issues,
      skipped: input.hostValidation.skipped,
    },
    runtimeValidation: {
      success: input.runtimeValidation.success,
      limitations: input.runtimeValidation.limitations,
      skipped: input.runtimeValidation.skipped,
    },
    dryRun: input.dryRun,
  });

  const finalValidationStatus = buildFinalValidationStatus(
    input.blueprint,
    {
      blueprint: input.blueprint,
      hostBlockers: input.hostRealizationPlan?.blockers,
      routingBlockers: input.generatorRoutingPlan?.blockers,
      governanceBlockers: input.governanceBlockers || [],
      localRepair: input.localRepair,
      dependencyRevalidation: input.dependencyRevalidation,
      hostValidation: {
        success: input.hostValidation.success,
        issues: input.hostValidation.issues,
        skipped: input.hostValidation.skipped,
      },
      runtimeValidation: {
        success: input.runtimeValidation.success,
        limitations: input.runtimeValidation.limitations,
        skipped: input.runtimeValidation.skipped,
      },
      dryRun: input.dryRun,
    },
    finalCommitDecision,
  );

  return {
    finalCommitDecision,
    finalValidationStatus,
    stageResult: {
      success: finalCommitDecision.outcome !== "blocked",
      outcome: finalCommitDecision.outcome,
      requiresReview: finalCommitDecision.requiresReview,
      reasons: finalCommitDecision.reasons,
      reviewModules: finalCommitDecision.reviewModules || [],
      impactedFeatures: finalCommitDecision.impactedFeatures || [],
      dependencyBlockers: finalCommitDecision.dependencyBlockers || [],
      downgradedFeatures: finalCommitDecision.downgradedFeatures || [],
    },
  };
}

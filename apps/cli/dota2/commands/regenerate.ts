import { join } from "path";

import { executeCleanup, formatCleanupPlan, formatCleanupResult, generateCleanupPlan } from "../../../../adapters/dota2/regenerate/index.js";
import { generateGeneratorRoutingPlan } from "../../../../adapters/dota2/routing/index.js";
import { realizeDota2Host, summarizeRealization } from "../../../../adapters/dota2/realization/index.js";
import { findFeatureById, initializeWorkspace, saveWorkspace } from "../../../../core/workspace/index.js";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/index.js";
import { saveReviewArtifact } from "../review-artifacts.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";
import type { AssemblyPlan, Blueprint, IntentSchema } from "../../../../core/schema/types.js";
import type { PatternResolutionResult } from "../../../../core/patterns/resolver.js";
import type { HostRealizationPlan, GeneratorRoutingPlan } from "../../../../core/schema/types.js";
import type { FeatureMode } from "../planning.js";

export interface RegenerateCommandDeps {
  createIntentSchema: (prompt: string, hostRoot: string) => Promise<{ schema: IntentSchema | null; usedFallback: boolean }>;
  buildBlueprint: (schema: IntentSchema) => { blueprint: Blueprint | null; issues: string[] };
  resolvePatternsFromBlueprint: (blueprint: Blueprint) => PatternResolutionResult;
  buildAssemblyPlan: (
    blueprint: Blueprint,
    resolutionResult: PatternResolutionResult,
    hostRoot: string,
  ) => { plan: AssemblyPlan | null; blockers: string[] };
  createWritePlan: (
    plan: AssemblyPlan,
    hostRoot: string,
    existingFeature?: RuneWeaverFeatureRecord | null,
    mode?: FeatureMode,
    hostRealizationPlan?: HostRealizationPlan,
    generatorRoutingPlan?: GeneratorRoutingPlan,
  ) => { writePlan: unknown; issues: string[] };
  runPipeline: (options: Dota2CLIOptions) => Promise<any>;
}

export async function runRegenerateCommand(
  options: Dota2CLIOptions,
  deps: RegenerateCommandDeps,
): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Regenerate Feature");
  console.log("=".repeat(70));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📝 Feature: ${options.featureId || "(not specified)"}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : "write"}`);

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for regenerate");
    return false;
  }

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be regenerated`);
    return false;
  }

  console.log("\n📋 Existing Feature:");
  console.log(`   Feature ID: ${existingFeature.featureId}`);
  console.log(`   Revision: ${existingFeature.revision}`);
  console.log(`   Generated Files: ${existingFeature.generatedFiles.length}`);
  console.log(`   Status: ${existingFeature.status}`);

  const { schema } = await deps.createIntentSchema(options.prompt, options.hostRoot);
  if (!schema) {
    console.error("\n❌ Failed to create IntentSchema");
    return false;
  }

  const { blueprint, issues: blueprintIssues } = deps.buildBlueprint(schema);
  if (!blueprint) {
    console.error(`\n❌ Failed to build Blueprint: ${blueprintIssues.join(", ")}`);
    return false;
  }

  const resolutionResult = deps.resolvePatternsFromBlueprint(blueprint);
  if (resolutionResult.patterns.length === 0) {
    console.error("\n❌ No patterns resolved");
    return false;
  }

  const { plan, blockers } = deps.buildAssemblyPlan(blueprint, resolutionResult, options.hostRoot);
  if (!plan) {
    console.error(`\n❌ Failed to build AssemblyPlan: ${blockers.join(", ")}`);
    return false;
  }

  const hostRealizationPlan = realizeDota2Host(plan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.5: Host Realization (for regenerate)");
  console.log("=".repeat(70));
  console.log(summarizeRealization(hostRealizationPlan));

  const generatorRoutingPlan = generateGeneratorRoutingPlan(hostRealizationPlan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.6: Generator Routing (for regenerate)");
  console.log("=".repeat(70));
  const tsRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "ts");
  const uiRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "ui");
  const kvRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "kv");
  console.log(`  Routes: ${generatorRoutingPlan.routes.length} total`);
  console.log(`    - TS: ${tsRoutes.length}, UI: ${uiRoutes.length}, KV: ${kvRoutes.length} (${kvRoutes.filter((route) => route.blockers?.length).length} blocked)`);

  const { writePlan, issues: generatorIssues } = deps.createWritePlan(
    plan,
    options.hostRoot,
    existingFeature,
    "regenerate",
    hostRealizationPlan,
    generatorRoutingPlan,
  );
  if (!writePlan) {
    console.error(`\n❌ Failed to create WritePlan: ${generatorIssues.join(", ")}`);
    return false;
  }

  const cleanupPlan = generateCleanupPlan(existingFeature, writePlan as any, options.hostRoot);

  console.log("\n" + "=".repeat(70));
  console.log("Cleanup Plan");
  console.log("=".repeat(70));
  console.log(formatCleanupPlan(cleanupPlan));

  if (!cleanupPlan.canExecute) {
    console.error("\n❌ Cleanup plan cannot be executed due to safety issues:");
    for (const issue of cleanupPlan.safetyIssues) {
      console.error(`   - ${issue}`);
    }
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Executing Cleanup");
  console.log("=".repeat(70));

  const cleanupResult = executeCleanup(cleanupPlan, options.hostRoot, options.dryRun);
  console.log(formatCleanupResult(cleanupResult));

  if (!cleanupResult.success) {
    console.error("\n❌ Cleanup execution failed");
    return false;
  }

  const regenerateOptions: Dota2CLIOptions = {
    ...options,
    command: "regenerate",
    featureId: existingFeature.featureId,
  };

  const artifact = await deps.runPipeline(regenerateOptions);

  artifact.commandKind = "maintenance";
  artifact.applicableStages = [
    "cleanupPlan",
    "intentSchema",
    "blueprint",
    "patternResolution",
    "assemblyPlan",
    "hostRealization",
    "generator",
    "writeExecutor",
    "hostValidation",
    "runtimeValidation",
    "workspaceState",
  ];

  (artifact.stages as Record<string, unknown>).cleanupPlan = {
    filesToDelete: cleanupPlan.filesToDelete,
    filesToCreate: cleanupPlan.filesToCreate,
    filesToRefresh: cleanupPlan.filesToRefresh,
    filesUnchanged: cleanupPlan.filesUnchanged,
    previousRevision: cleanupPlan.previousRevision,
    nextRevision: cleanupPlan.nextRevision,
    canExecute: cleanupPlan.canExecute,
    executedDeletes: cleanupResult.deleted,
    deleteFailures: cleanupResult.failed,
    skippedDeletes: cleanupResult.skipped,
  };

  const outputPath = saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));

  if (!options.dryRun && artifact.stages.workspaceState?.skipped && artifact.stages.generator?.generatedFiles) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 9: Workspace State Update (Post-Regenerate)");
    console.log("=".repeat(70));

    const initResult = initializeWorkspace(options.hostRoot);
    if (!initResult.success) {
      console.error("  ❌ Failed to initialize workspace");
    } else {
      const workspace = initResult.workspace!;
      const featureIdToUpdate = options.featureId;
      const featureToUpdate = findFeatureById(workspace, featureIdToUpdate);

      if (featureToUpdate) {
        const generatedFiles = artifact.stages.generator.generatedFiles as string[];
        const updatedFeature: RuneWeaverFeatureRecord = {
          ...featureToUpdate,
          revision: featureToUpdate.revision + 1,
          generatedFiles,
          blueprintId: artifact.stages.blueprint?.summary || featureToUpdate.blueprintId,
          selectedPatterns: artifact.stages.patternResolution?.resolvedPatterns || featureToUpdate.selectedPatterns,
          updatedAt: new Date().toISOString(),
        };

        const updatedFeatures = workspace.features.map((feature) =>
          feature.featureId === featureIdToUpdate ? updatedFeature : feature,
        );

        const updatedWorkspace = {
          ...workspace,
          features: updatedFeatures,
        };

        const saveResult = saveWorkspace(options.hostRoot, updatedWorkspace);
        if (saveResult.success) {
          console.log("  ✅ Workspace state updated");
          console.log(`     Feature ID: ${featureIdToUpdate}`);
          console.log(`     Revision: ${featureToUpdate.revision} -> ${updatedFeature.revision}`);
          console.log(`     Generated Files: ${generatedFiles.length}`);
        } else {
          console.error(`  ❌ Failed to save workspace: ${saveResult.issues.join(", ")}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Final Verdict");
  console.log("=".repeat(70));
  console.log(`  Pipeline Complete: ${artifact.finalVerdict.pipelineComplete ? "✅" : "❌"}`);
  console.log(`  Completion Kind: ${artifact.finalVerdict.completionKind}`);
  console.log(`  Sufficient for Demo: ${artifact.finalVerdict.sufficientForDemo ? "✅" : "❌"}`);
  console.log(`  Has Unresolved Patterns: ${artifact.finalVerdict.hasUnresolvedPatterns ? "⚠️" : "✅"}`);
  console.log(`  Was Force Override: ${artifact.finalVerdict.wasForceOverride ? "⚠️" : "✅"}`);

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

  return artifact.finalVerdict.pipelineComplete;
}

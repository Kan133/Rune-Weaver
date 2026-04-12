import { existsSync } from "fs";
import { join } from "path";

import type { AssemblyPlan, Blueprint, GeneratorRoutingPlan, HostRealizationPlan, IntentSchema } from "../../../../core/schema/types.js";
import { extractEntryBindings, findFeatureById, initializeWorkspace, saveWorkspace } from "../../../../core/workspace/index.js";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/index.js";
import type { PatternResolutionResult } from "../../../../core/patterns/resolver.js";
import { classifyUpdateDiff, executeSelectiveUpdate, formatUpdateDiffResult, formatSelectiveUpdateResult } from "../../../../adapters/dota2/update/index.js";
import { validateHostRuntime } from "../../../../adapters/dota2/validator/runtime-validator.js";
import { generateGeneratorRoutingPlan } from "../../../../adapters/dota2/routing/index.js";
import { realizeDota2Host, summarizeRealization } from "../../../../adapters/dota2/realization/index.js";
import { performUpdateHostValidation } from "../../helpers/index.js";
import { saveReviewArtifact } from "../review-artifacts.js";
import { createUpdateReviewArtifact } from "../update-artifact.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";

export interface UpdateCommandDeps {
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
    existingFeature?: RuneWeaverFeatureRecord,
    mode?: "create" | "update" | "regenerate",
    hostRealizationPlan?: HostRealizationPlan,
    generatorRoutingPlan?: GeneratorRoutingPlan,
  ) => { writePlan: any; issues: string[] };
  generateCodeContent: (entry: any) => string;
}

export async function runUpdateCommand(
  options: Dota2CLIOptions,
  deps: UpdateCommandDeps,
): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Update Feature (Maintenance Command)");
  console.log("=".repeat(70));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📝 Feature: ${options.featureId || "(not specified)"}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : "write"}`);

  const artifact = createUpdateReviewArtifact(options);

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for update");
    artifact.stages.workspaceState = { success: false, featureId: "", totalFeatures: 0, error: "Missing featureId" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Missing featureId");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  if (!options.prompt) {
    console.error("\n❌ Error: Prompt is required for update to generate new write plan");
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: "Missing prompt" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Missing prompt");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: workspaceResult.issues.join(", ") };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Failed to load workspace");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: "Feature not found" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Feature not found");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be updated`);
    console.error("   Only features with status 'active' can be updated");
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: `Feature status is '${existingFeature.status}'` };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature status is '${existingFeature.status}', only 'active' features can be updated`);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  console.log("\n📋 Existing Feature:");
  console.log(`   Feature ID: ${existingFeature.featureId}`);
  console.log(`   Revision: ${existingFeature.revision}`);
  console.log(`   Generated Files: ${existingFeature.generatedFiles.length}`);
  console.log(`   Status: ${existingFeature.status}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 0: Host Readiness Preflight");
  console.log("=".repeat(70));

  const criticalHostFiles = [
    { path: "game/scripts/npc/abilities.txt", reason: "Required for baseline ability migration during bridge refresh" },
  ];

  let preflightPassed = true;
  for (const file of criticalHostFiles) {
    const fullPath = join(options.hostRoot, file.path);
    if (existsSync(fullPath)) {
      console.log(`  ✅ ${file.path}`);
    } else {
      console.error(`  ❌ ${file.path} - missing`);
      console.error(`     Reason: ${file.reason}`);
      preflightPassed = false;
    }
  }

  if (!preflightPassed) {
    console.error("\n⚠️  Host readiness check failed - critical files are missing");
    console.error("   The update can continue in dry-run mode,");
    console.error("   but write mode will fail at bridge refresh stage.");
    artifact.finalVerdict.remainingRisks.push("Missing critical host files");
    if (!options.dryRun) {
      console.error("\n   Recommendation: Run with --dry-run first to verify the update plan,");
      console.error("   or initialize the host properly before running write mode.");
    }
  } else {
    console.log("  ✅ Host readiness check passed");
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: IntentSchema");
  console.log("=".repeat(70));

  const { schema, usedFallback } = await deps.createIntentSchema(options.prompt, options.hostRoot);
  if (!schema) {
    console.error("\n❌ Failed to create IntentSchema");
    artifact.stages.intentSchema = { success: false, summary: "Failed to create IntentSchema", issues: ["Failed to create IntentSchema"] };
    artifact.finalVerdict.weakestStage = "intentSchema";
    artifact.finalVerdict.remainingRisks.push("Failed to create IntentSchema");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  artifact.intentSchema = {
    usedFallback,
    intentKind: schema.classification.intentKind,
    uiNeeded: schema.uiRequirements?.needed || false,
    mechanics: Object.entries(schema.normalizedMechanics)
      .filter(([, value]) => value === true)
      .map(([key]) => key),
  };
  artifact.stages.intentSchema = { success: true, summary: `IntentSchema created (${usedFallback ? "fallback" : "LLM"})`, issues: [], usedFallback };
  console.log(`  ✅ IntentSchema created (${usedFallback ? "fallback" : "LLM"})`);
  console.log(`     Goal: ${schema.request.goal}`);
  console.log(`     Intent Kind: ${schema.classification.intentKind}`);
  console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const { blueprint, issues: blueprintIssues } = deps.buildBlueprint(schema);
  if (!blueprint) {
    console.error(`\n❌ Failed to build Blueprint: ${blueprintIssues.join(", ")}`);
    artifact.stages.blueprint = { success: false, summary: "Failed to build Blueprint", moduleCount: 0, patternHints: [], issues: blueprintIssues };
    artifact.finalVerdict.weakestStage = "blueprint";
    artifact.finalVerdict.remainingRisks.push(...blueprintIssues);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  artifact.stages.blueprint = {
    success: true,
    summary: "Blueprint created",
    moduleCount: blueprint.modules.length,
    patternHints: blueprint.patternHints.flatMap((hint) => hint.suggestedPatterns),
    issues: [],
  };
  console.log("  ✅ Blueprint created");
  console.log(`     ID: ${blueprint.id}`);
  console.log(`     Modules: ${blueprint.modules.length}`);
  console.log(`     Pattern Hints: ${blueprint.patternHints.length}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Pattern Resolution");
  console.log("=".repeat(70));

  const resolutionResult = deps.resolvePatternsFromBlueprint(blueprint);
  if (resolutionResult.patterns.length === 0) {
    console.error("\n❌ No patterns resolved");
    artifact.stages.patternResolution = {
      success: false,
      resolvedPatterns: [],
      unresolvedPatterns: resolutionResult.unresolved.map((unresolved) => unresolved.requestedId),
      issues: ["No patterns resolved"],
      complete: false,
    };
    artifact.finalVerdict.weakestStage = "patternResolution";
    artifact.finalVerdict.hasUnresolvedPatterns = true;
    artifact.finalVerdict.remainingRisks.push("No patterns resolved");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  if (existingFeature.selectedPatterns && existingFeature.selectedPatterns.length > 0) {
    const newPatternIds = new Set(resolutionResult.patterns.map((pattern) => pattern.patternId));

    const inferRoleFromFiles = (patternId: string, generatedFiles: string[], featureId: string): string => {
      const patternSegment = patternId.replace(/\./g, "_");

      for (const filePath of generatedFiles) {
        const fileName = filePath.split("/").pop() || "";
        const baseName = fileName.replace(/\.[^.]+$/, "");

        if (baseName.includes(patternSegment)) {
          const prefix = `${featureId}_`;
          if (baseName.startsWith(prefix)) {
            const suffix = baseName.slice(prefix.length);
            if (suffix === patternSegment) {
              return patternSegment;
            }
            if (suffix.endsWith(`_${patternSegment}`)) {
              return suffix.slice(0, -`_${patternSegment}`.length);
            }
          }
        }
      }

      return patternSegment;
    };

    const mergedPatterns: typeof resolutionResult.patterns = [];
    const addedPatternIds = new Set<string>();

    for (const patternId of existingFeature.selectedPatterns) {
      const newPattern = resolutionResult.patterns.find((pattern) => pattern.patternId === patternId);
      if (newPattern) {
        mergedPatterns.push(newPattern);
        addedPatternIds.add(patternId);
      } else {
        const inferredRole = inferRoleFromFiles(patternId, existingFeature.generatedFiles, existingFeature.featureId);
        mergedPatterns.push({
          patternId,
          role: inferredRole,
          priority: "required" as const,
          source: "hint" as const,
        });
        addedPatternIds.add(patternId);
      }
    }

    const newOnlyPatterns = resolutionResult.patterns.filter((pattern) => !addedPatternIds.has(pattern.patternId));
    if (newOnlyPatterns.length > 0) {
      console.log(`\n  ⚠️  Pattern Inheritance: Skipping ${newOnlyPatterns.length} new patterns not in original feature`);
      for (const pattern of newOnlyPatterns) {
        console.log(`     - ${pattern.patternId}`);
      }
    }

    resolutionResult.patterns = mergedPatterns;

    console.log("\n  🔒 Pattern Inheritance: Merged patterns");
    console.log(`     Original patterns: ${existingFeature.selectedPatterns.join(", ")}`);
    console.log(`     New intent patterns: ${Array.from(newPatternIds).join(", ") || "(none)"}`);
    console.log(`     Final patterns: ${resolutionResult.patterns.map((pattern) => pattern.patternId).join(", ")}`);
  }

  artifact.stages.patternResolution = {
    success: true,
    resolvedPatterns: resolutionResult.patterns.map((pattern) => pattern.patternId),
    unresolvedPatterns: resolutionResult.unresolved.map((unresolved) => unresolved.requestedId),
    issues: [],
    complete: resolutionResult.complete,
  };
  console.log(`  Patterns resolved: ${resolutionResult.patterns.length}`);
  for (const pattern of resolutionResult.patterns) {
    console.log(`    ✅ ${pattern.patternId}`);
  }
  if (resolutionResult.unresolved.length > 0) {
    console.log(`  Unresolved patterns: ${resolutionResult.unresolved.length}`);
    for (const unresolved of resolutionResult.unresolved) {
      console.log(`    ⚠️  ${unresolved.requestedId}`);
    }
  }
  console.log(`  Complete: ${resolutionResult.complete}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: AssemblyPlan");
  console.log("=".repeat(70));

  const { plan, blockers } = deps.buildAssemblyPlan(blueprint, resolutionResult, options.hostRoot);
  if (!plan) {
    console.error(`\n❌ Failed to build AssemblyPlan: ${blockers.join(", ")}`);
    artifact.stages.assemblyPlan = { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers };
    artifact.finalVerdict.weakestStage = "assemblyPlan";
    artifact.finalVerdict.remainingRisks.push(...blockers);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  artifact.stages.assemblyPlan = {
    success: true,
    selectedPatterns: plan.selectedPatterns.map((pattern) => pattern.patternId),
    writeTargets: plan.writeTargets.map((target) => target.path),
    readyForHostWrite: plan.readyForHostWrite ?? false,
    blockers,
  };
  console.log("  ✅ AssemblyPlan created");
  console.log(`     Blueprint ID: ${plan.blueprintId}`);
  console.log(`     Selected Patterns: ${plan.selectedPatterns.length}`);
  console.log(`     Ready for Host Write: ${plan.readyForHostWrite ?? false}`);

  const hostRealizationPlan = realizeDota2Host(plan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.5: Host Realization (for update)");
  console.log("=".repeat(70));
  console.log(summarizeRealization(hostRealizationPlan));

  const generatorRoutingPlan = generateGeneratorRoutingPlan(hostRealizationPlan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.6: Generator Routing (for update)");
  console.log("=".repeat(70));
  const tsRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "ts");
  const uiRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "ui");
  const kvRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "kv");
  console.log(`  Routes: ${generatorRoutingPlan.routes.length} total`);
  console.log(`    - TS: ${tsRoutes.length}, UI: ${uiRoutes.length}, KV: ${kvRoutes.length} (${kvRoutes.filter((route) => route.blockers?.length).length} blocked)`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Generator");
  console.log("=".repeat(70));

  const { writePlan, issues: generatorIssues } = deps.createWritePlan(
    plan,
    options.hostRoot,
    existingFeature,
    "update",
    hostRealizationPlan,
    generatorRoutingPlan,
  );
  if (!writePlan) {
    console.error(`\n❌ Failed to create WritePlan: ${generatorIssues.join(", ")}`);
    artifact.stages.generator = { success: false, generatedFiles: [], issues: generatorIssues };
    artifact.finalVerdict.weakestStage = "generator";
    artifact.finalVerdict.remainingRisks.push(...generatorIssues);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  const executableEntries = writePlan.entries.filter((entry: any) => !entry.deferred);
  const kvEntriesForGen = executableEntries.filter((entry: any) => entry.contentType === "kv");
  const nonKvEntriesForGen = executableEntries.filter((entry: any) => entry.contentType !== "kv");
  const kvTargetPathsForGen = new Set(kvEntriesForGen.map((entry: any) => entry.targetPath));
  const aggregatedKvFilesForGen = Array.from(kvTargetPathsForGen);
  const nonKvFilesForGen = nonKvEntriesForGen.map((entry: any) => entry.targetPath);
  const aggregatedGeneratedFiles = [...nonKvFilesForGen, ...aggregatedKvFilesForGen];

  artifact.stages.generator = {
    success: true,
    generatedFiles: aggregatedGeneratedFiles,
    issues: [],
    realizationContext: writePlan.realizationContext,
    deferredWarnings: writePlan.deferredWarnings,
  };
  console.log("  ✅ WritePlan created");
  console.log(`     ID: ${writePlan.id}`);
  console.log(`     Entries: ${writePlan.entries.length}`);

  if (writePlan.stats.deferred > 0) {
    console.log(`     ⚠️  Deferred entries: ${writePlan.stats.deferred} (KV side not yet implemented)`);
  }

  const familyHints = writePlan.entries.reduce((acc: Record<string, number>, entry: any) => {
    if (entry.generatorFamilyHint) {
      acc[entry.generatorFamilyHint] = (acc[entry.generatorFamilyHint] || 0) + 1;
    }
    return acc;
  }, {});
  if (Object.keys(familyHints).length > 0) {
    console.log(`     Generator hints: ${Object.entries(familyHints).map(([key, value]) => `${key}:${value}`).join(", ")}`);
  }

  if (writePlan.deferredWarnings && writePlan.deferredWarnings.length > 0) {
    console.log("     Deferred warnings:");
    for (const warning of writePlan.deferredWarnings) {
      console.log(`       - ${warning}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 6: Update Diff Classification");
  console.log("=".repeat(70));

  const diffResult = classifyUpdateDiff(existingFeature, writePlan, options.hostRoot);
  console.log(formatUpdateDiffResult(diffResult));

  artifact.stages.updateDiff = {
    totalFiles: diffResult.summary.totalFiles,
    unchanged: diffResult.summary.unchanged,
    refreshed: diffResult.summary.refreshed,
    created: diffResult.summary.created,
    deleted: diffResult.summary.deleted,
    unchangedFiles: diffResult.unchangedFiles.map((file) => file.path),
    refreshedFiles: diffResult.refreshedFiles.map((file) => file.path),
    createdFiles: diffResult.createdFiles.map((file) => file.path),
    deletedFiles: diffResult.deletedFiles.map((file) => file.path),
    requiresRegenerate: diffResult.requiresRegenerate,
    regenerateReasons: diffResult.regenerateReasons,
    canUpdate: diffResult.canUpdate,
  };

  if (diffResult.requiresRegenerate) {
    console.log("\n" + "=".repeat(70));
    console.log("⚠️  UPDATE SAFETY GATE: Requires Regenerate");
    console.log("=".repeat(70));
    console.log("\n  The update classifier has determined that this change is too significant");
    console.log("  for a selective update. A full regenerate is recommended instead.\n");
    console.log("  Reasons:");
    for (const reason of diffResult.regenerateReasons) {
      console.log(`    - ${reason}`);
    }
    console.log("\n  This is NOT an execution failure.");
    console.log("  This is a safety gate to prevent unsafe partial updates.\n");
    console.log("  Recommended action:");
    console.log("    → Use 'dota2 regenerate --feature <id>' instead");
    console.log("");

    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.completionKind = "requires-regenerate";
    artifact.finalVerdict.weakestStage = "updateDiff";
    artifact.finalVerdict.sufficientForDemo = false;
    artifact.finalVerdict.remainingRisks.push("Update requires regenerate (safety gate)", ...diffResult.regenerateReasons);
    artifact.finalVerdict.nextSteps.push("Use 'dota2 regenerate --feature <id>' instead");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 7: Selective Update Execution");
  console.log("=".repeat(70));

  const contentMap = new Map<string, string>();
  for (const entry of writePlan.entries) {
    const content = deps.generateCodeContent(entry);
    const relativePath = entry.targetPath.replace(options.hostRoot.replace(/\\/g, "/"), "").replace(/^\//, "");
    contentMap.set(relativePath, content);
  }

  const updateResult = executeSelectiveUpdate(
    existingFeature,
    writePlan,
    diffResult,
    options.hostRoot,
    workspaceResult.workspace,
    contentMap,
    options.dryRun,
  );
  console.log(formatSelectiveUpdateResult(updateResult));

  const executedActions = updateResult.refreshedCount + updateResult.createdCount + updateResult.deletedCount;
  artifact.stages.writeExecutor = {
    success: updateResult.success,
    executedActions,
    skippedActions: updateResult.unchangedCount,
    failedActions: updateResult.failedFiles.length,
    createdFiles: updateResult.createdFiles,
    modifiedFiles: updateResult.refreshedFiles,
  };

  if (!updateResult.success) {
    console.error("\n❌ Selective update execution failed");
    artifact.finalVerdict.weakestStage = "writeExecutor";
    artifact.finalVerdict.remainingRisks.push("Selective update execution failed");
    for (const failed of updateResult.failedFiles) {
      artifact.finalVerdict.remainingRisks.push(`${failed.path}: ${failed.error}`);
    }
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 8: Workspace State Update");
  console.log("=".repeat(70));

  if (!options.dryRun) {
    const deletedFiles = diffResult.deletedFiles.map((file) => file.path);
    const executableEntriesForUpdate = writePlan.entries.filter((entry: any) => !entry.deferred);
    const kvEntriesForUpdate = executableEntriesForUpdate.filter((entry: any) => entry.contentType === "kv");
    const nonKvEntriesForUpdate = executableEntriesForUpdate.filter((entry: any) => entry.contentType !== "kv");
    const kvTargetPathsForUpdate = new Set(kvEntriesForUpdate.map((entry: any) => entry.targetPath));
    const aggregatedKvFilesForUpdate = Array.from(kvTargetPathsForUpdate);
    const nonKvFilesForUpdate = nonKvEntriesForUpdate.map((entry: any) => entry.targetPath);
    const generatedFilesForUpdate = [...nonKvFilesForUpdate, ...aggregatedKvFilesForUpdate].filter((file) => !deletedFiles.includes(file));

    const updatedFeature: RuneWeaverFeatureRecord = {
      ...existingFeature,
      revision: existingFeature.revision + 1,
      blueprintId: existingFeature.blueprintId,
      entryBindings: extractEntryBindings(plan.bridgeUpdates),
      generatedFiles: generatedFilesForUpdate,
      selectedPatterns: resolutionResult.patterns.map((pattern) => pattern.patternId),
      updatedAt: new Date().toISOString(),
    };

    const updatedFeatures = workspaceResult.workspace.features.map((feature) =>
      feature.featureId === existingFeature.featureId ? updatedFeature : feature,
    );

    const updatedWorkspace = {
      ...workspaceResult.workspace,
      features: updatedFeatures,
    };

    const saveResult = saveWorkspace(options.hostRoot, updatedWorkspace);
    if (!saveResult.success) {
      console.error(`\n❌ Failed to update workspace state: ${saveResult.issues.join(", ")}`);
      artifact.stages.workspaceState = {
        success: false,
        featureId: existingFeature.featureId,
        totalFeatures: workspaceResult.workspace.features.length,
        error: saveResult.issues.join(", "),
      };
      artifact.finalVerdict.weakestStage = "workspaceState";
      artifact.finalVerdict.remainingRisks.push("Failed to update workspace state");
    } else {
      console.log("✅ Workspace state updated");
      console.log(`   Revision: ${existingFeature.revision} -> ${updatedFeature.revision}`);
      artifact.stages.workspaceState = {
        success: true,
        featureId: existingFeature.featureId,
        totalFeatures: updatedFeatures.length,
      };
    }
  } else {
    console.log("🔍 DRY-RUN MODE - Workspace state would be updated");
    artifact.stages.workspaceState = {
      success: true,
      featureId: existingFeature.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
    };
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 9: Host Validation");
  console.log("=".repeat(70));

  const hostValidationResult = performUpdateHostValidation(options.hostRoot, diffResult, updateResult);

  artifact.stages.hostValidation = {
    success: hostValidationResult.success,
    checks: hostValidationResult.checks,
    issues: hostValidationResult.issues,
    details: {},
  };

  for (const check of hostValidationResult.checks) {
    console.log(`  ${check}`);
  }

  if (hostValidationResult.issues.length > 0) {
    console.log("\n  Issues:");
    for (const issue of hostValidationResult.issues) {
      console.log(`    - ${issue}`);
    }
    if (!hostValidationResult.success) {
      artifact.finalVerdict.weakestStage = "hostValidation";
      artifact.finalVerdict.remainingRisks.push(...hostValidationResult.issues);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 10: Runtime Validation");
  console.log("=".repeat(70));

  if (!options.dryRun && updateResult.success) {
    try {
      const runtimeArtifact = await validateHostRuntime(options.hostRoot);

      artifact.stages.runtimeValidation = {
        success: runtimeArtifact.overall.success,
        serverPassed: runtimeArtifact.overall.serverPassed,
        uiPassed: runtimeArtifact.overall.uiPassed,
        serverErrors: runtimeArtifact.server.errorCount,
        uiErrors: runtimeArtifact.ui.errorCount,
        limitations: [],
      };

      console.log(`  Server: ${runtimeArtifact.server.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.server.errorCount}`);

      console.log(`  UI: ${runtimeArtifact.ui.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.ui.errorCount}`);

      if (!runtimeArtifact.overall.success) {
        artifact.finalVerdict.weakestStage = "runtimeValidation";
        if (!runtimeArtifact.overall.serverPassed) {
          artifact.finalVerdict.remainingRisks.push(`Server runtime validation failed with ${runtimeArtifact.server.errorCount} errors`);
        }
        if (!runtimeArtifact.overall.uiPassed) {
          artifact.finalVerdict.remainingRisks.push(`UI runtime validation failed with ${runtimeArtifact.ui.errorCount} errors`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Runtime validation failed: ${errorMessage}`);
      artifact.stages.runtimeValidation = {
        success: false,
        serverPassed: false,
        uiPassed: false,
        serverErrors: 0,
        uiErrors: 0,
        limitations: [errorMessage],
      };
      artifact.finalVerdict.weakestStage = "runtimeValidation";
      artifact.finalVerdict.remainingRisks.push(`Runtime validation failed: ${errorMessage}`);
    }
  } else {
    console.log("  ⏭️  Skipped (dry-run mode or update failed)");
    artifact.stages.runtimeValidation = {
      success: true,
      serverPassed: true,
      uiPassed: true,
      serverErrors: 0,
      uiErrors: 0,
      limitations: ["Skipped due to dry-run mode or update failed"],
    };
  }

  const pipelineComplete =
    artifact.stages.intentSchema.success &&
    artifact.stages.blueprint.success &&
    artifact.stages.patternResolution.success &&
    artifact.stages.assemblyPlan.success &&
    artifact.stages.generator.success &&
    artifact.stages.writeExecutor.success &&
    artifact.stages.workspaceState.success &&
    artifact.stages.hostValidation.success &&
    artifact.stages.runtimeValidation.success;

  artifact.finalVerdict.pipelineComplete = pipelineComplete;
  artifact.finalVerdict.hasUnresolvedPatterns = resolutionResult.unresolved.length > 0;
  artifact.finalVerdict.wasForceOverride = options.force;

  if (pipelineComplete) {
    artifact.finalVerdict.completionKind = options.force ? "forced" : "default-safe";
    artifact.finalVerdict.sufficientForDemo = true;
    if (options.dryRun) {
      artifact.finalVerdict.nextSteps.push("Run with --write to execute the selective update");
    } else {
      artifact.finalVerdict.nextSteps.push("Update completed successfully");
    }
  } else {
    artifact.finalVerdict.completionKind = "partial";
    if (!artifact.stages.writeExecutor.success) {
      artifact.finalVerdict.remainingRisks.push("Selective update execution failed");
    }
    if (!artifact.stages.workspaceState.success) {
      artifact.finalVerdict.remainingRisks.push("Workspace state update failed");
    }
    if (!artifact.stages.hostValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Host validation failed");
    }
    if (!artifact.stages.runtimeValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Runtime validation failed");
    }
    artifact.finalVerdict.nextSteps.push("Fix the issues before retrying");
  }

  const outputPath = saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));

  console.log("\n" + "=".repeat(70));
  console.log("Final Verdict");
  console.log("=".repeat(70));
  console.log(`  Pipeline Complete: ${pipelineComplete ? "✅" : "❌"}`);
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

  return pipelineComplete;
}

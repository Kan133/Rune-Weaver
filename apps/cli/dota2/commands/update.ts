import { existsSync } from "fs";
import { join, resolve } from "path";

import type {
  AssemblyPlan,
  Blueprint,
  CurrentFeatureContext,
  GeneratorRoutingPlan,
  HostRealizationPlan,
  IntentSchema,
  RelationCandidate,
  UpdateIntent,
  WizardClarificationAuthority,
  WizardClarificationPlan,
  WorkspaceSemanticContext,
} from "../../../../core/schema/types.js";
import {
  analyzeDependencyRevalidation,
  applyDependencyRevalidationEffects,
  extractEntryBindings,
  findFeatureById,
  initializeWorkspace,
  saveWorkspace,
} from "../../../../core/workspace/index.js";
import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/index.js";
import type { PatternResolutionResult } from "../../../../core/patterns/resolver.js";
import { exportWorkspaceToBridge, refreshBridge } from "../../../../adapters/dota2/bridge/index.js";
import { classifyUpdateDiff, executeSelectiveUpdate, formatUpdateDiffResult, formatSelectiveUpdateResult } from "../../../../adapters/dota2/update/index.js";
import { preserveDota2UpdateWritePlanArtifacts } from "../../../../adapters/dota2/update/write-plan-preservation.js";
import { generateGeneratorRoutingPlan } from "../../../../adapters/dota2/routing/index.js";
import { realizeDota2Host, summarizeRealization } from "../../../../adapters/dota2/realization/index.js";
import { shouldUseArtifactSynthesis } from "../../../../adapters/dota2/synthesis/index.js";
import { applyDota2GrantSeam } from "../../../../adapters/dota2/cross-feature/index.js";
import {
  resolveSelectionPoolWorkspaceFields,
} from "../../../../adapters/dota2/families/selection-pool/index.js";
import { generateKVContentWithIndex, performUpdateHostValidation } from "../../helpers/index.js";
import { resolveReviewArtifactOutputDir } from "../review-artifacts.js";
import {
  createPendingSemanticExportStatus,
  createWrittenSemanticExportStatus,
  saveUpdateSemanticArtifacts,
} from "../semantic-artifacts.js";
import {
  buildArtifactSynthesisStageFromPlan,
  buildGeneratorRoutingStage,
  buildHostRealizationStage,
} from "../pipeline/assembly-stage-results.js";
import {
  createDota2ReviewArtifactBuilder,
  persistDota2ReviewArtifact,
} from "../pipeline/review-artifact.js";
import { runPipelineStage } from "../pipeline/stage-runner.js";
import { orchestrateValidation } from "../pipeline/validation-orchestration.js";
import { createUpdateReviewArtifact } from "../update-artifact.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";
import type { Dota2BlueprintBuildResult, FeatureMode } from "../planning.js";
import { printHostValidationStage, runDota2RuntimeValidation } from "./lifecycle-runner.js";
import { normalizeUpdateWritePlanEntries } from "../update-entry-normalizer.js";
import { runLocalRepairWithLLM } from "../../../../core/local-repair/index.js";
import {
  buildOwnedArtifactsFromWritePlan,
  buildWritePlanGeneratedFiles,
  isAbilityKvFragmentPath,
  materializeKvWritePlanEntries,
} from "../../../../adapters/dota2/kv/index.js";

export interface UpdateCommandDeps {
  createUpdateIntent: (
    prompt: string,
    hostRoot: string,
    existingFeature: RuneWeaverFeatureRecord,
    interactive?: boolean,
  ) => Promise<{
    currentFeatureContext: CurrentFeatureContext | null;
    requestedChange: IntentSchema | null;
    updateIntent: UpdateIntent | null;
    usedFallback: boolean;
    clarificationPlan?: WizardClarificationPlan;
    clarificationAuthority: WizardClarificationAuthority;
    relationCandidates?: RelationCandidate[];
    workspaceSemanticContext?: WorkspaceSemanticContext;
    requiresClarification: boolean;
  }>;
  buildUpdateBlueprint: (
    updateIntent: UpdateIntent,
    clarificationAuthority?: WizardClarificationAuthority,
  ) => Dota2BlueprintBuildResult;
  resolvePatternsFromBlueprint: (blueprint: Blueprint) => PatternResolutionResult;
  buildAssemblyPlan: (
    blueprint: Blueprint,
    resolutionResult: PatternResolutionResult,
    hostRoot: string,
    stableFeatureId?: string,
  ) => Promise<{ plan: AssemblyPlan | null; blockers: string[] }>;
  createWritePlan: (
    plan: AssemblyPlan,
    hostRoot: string,
    existingFeature?: RuneWeaverFeatureRecord | null,
    mode?: FeatureMode,
    hostRealizationPlan?: HostRealizationPlan,
    generatorRoutingPlan?: GeneratorRoutingPlan,
  ) => { writePlan: any; issues: string[] };
  generateCodeContent: (entry: any) => string;
}

function inferRoleFromGeneratedFiles(patternId: string, generatedFiles: string[], featureId: string): string {
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
}

function findBlueprintModuleParameters(
  blueprint: Blueprint,
  role: string,
): Record<string, unknown> | undefined {
  const module = blueprint.modules.find((candidate) => candidate.role === role || candidate.id === role);
  const triggerFallbackModule = role === "input_trigger"
    ? blueprint.modules.find((candidate) => candidate.category === "trigger")
    : undefined;
  const rawParameters = module?.parameters && typeof module.parameters === "object"
    ? module.parameters as Record<string, unknown>
    : triggerFallbackModule?.parameters && typeof triggerFallbackModule.parameters === "object"
      ? triggerFallbackModule.parameters as Record<string, unknown>
      : undefined;

  if (role !== "input_trigger") {
    return rawParameters;
  }

  const promptDerivedTriggerKey = inferRequestedTriggerKeyFromBlueprint(blueprint);
  if (!promptDerivedTriggerKey) {
    return rawParameters;
  }

  return {
    ...(rawParameters || {}),
    triggerKey: promptDerivedTriggerKey,
    key: promptDerivedTriggerKey,
  };
}

function inferRequestedTriggerKeyFromBlueprint(blueprint: Blueprint): string | undefined {
  const textSources = [
    blueprint.summary,
    blueprint.sourceIntent?.goal,
    typeof blueprint.parameters?.triggerKey === "string" ? blueprint.parameters.triggerKey : undefined,
    typeof blueprint.parameters?.key === "string" ? blueprint.parameters.key : undefined,
    typeof blueprint.parameters?.toKey === "string" ? blueprint.parameters.toKey : undefined,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  for (const source of textSources) {
    const explicitChange = source.match(
      /(?:从|由)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\s*(?:改(?:成|为)|调整(?:成|为|到)|换(?:成|为)?|替换(?:成|为)?|变(?:成|为)|to)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
    );
    if (explicitChange?.[2]) {
      return explicitChange[2].toUpperCase();
    }

    const targetOnly = source.match(
      /(?:改(?:成|为)|调整(?:成|为|到)|换(?:成|为)?|替换(?:成|为)?|变(?:成|为)|to)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
    );
    if (targetOnly?.[1]) {
      return targetOnly[1].toUpperCase();
    }

    const allKeys = Array.from(source.matchAll(/\b(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/ig));
    const lastKey = allKeys.at(-1)?.[1];
    if (lastKey) {
      return lastKey.toUpperCase();
    }
  }

  return undefined;
}

function normalizePatternParametersForUpdate(
  patternId: string,
  parameters: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!parameters || patternId !== "input.key_binding") {
    return parameters;
  }

  const nextTriggerKey = typeof parameters.triggerKey === "string" && parameters.triggerKey.trim().length > 0
    ? parameters.triggerKey.trim()
    : typeof parameters.key === "string" && parameters.key.trim().length > 0
      ? parameters.key.trim()
      : typeof parameters.toKey === "string" && parameters.toKey.trim().length > 0
        ? parameters.toKey.trim()
        : undefined;

  if (!nextTriggerKey) {
    return parameters;
  }

  return {
    ...parameters,
    triggerKey: nextTriggerKey,
    key: nextTriggerKey,
  };
}

export function mergePatternInheritanceForUpdate(
  existingFeature: Pick<RuneWeaverFeatureRecord, "selectedPatterns" | "generatedFiles" | "featureId">,
  resolutionPatterns: PatternResolutionResult["patterns"],
  blueprint: Blueprint,
): PatternResolutionResult["patterns"] {
  const newPatternIds = new Set(resolutionPatterns.map((pattern) => pattern.patternId));
  const mergedPatterns: typeof resolutionPatterns = [];
  const addedPatternIds = new Set<string>();

  for (const patternId of existingFeature.selectedPatterns) {
    const newPattern = resolutionPatterns.find((pattern) => pattern.patternId === patternId);
    const inferredRole = newPattern?.role
      || inferRoleFromGeneratedFiles(patternId, existingFeature.generatedFiles, existingFeature.featureId);
    const moduleParameters = findBlueprintModuleParameters(blueprint, inferredRole);

    if (newPattern) {
      const mergedParameters = moduleParameters
        ? { ...moduleParameters, ...(newPattern.parameters || {}) }
        : newPattern.parameters;
      mergedPatterns.push({
        ...newPattern,
        role: inferredRole,
        parameters: normalizePatternParametersForUpdate(patternId, mergedParameters),
      });
      addedPatternIds.add(patternId);
      continue;
    }

    mergedPatterns.push({
      patternId,
      role: inferredRole,
      parameters: normalizePatternParametersForUpdate(patternId, moduleParameters),
      priority: "required" as const,
      source: "hint" as const,
    });
    addedPatternIds.add(patternId);
  }

  const newOnlyPatterns = resolutionPatterns.filter((pattern) => !addedPatternIds.has(pattern.patternId));
  if (newOnlyPatterns.length > 0) {
    console.log(`\n  ⚠️  Pattern Inheritance: Skipping ${newOnlyPatterns.length} new patterns not in original feature`);
    for (const pattern of newOnlyPatterns) {
      console.log(`     - ${pattern.patternId}`);
    }
  }

  console.log("\n  🔒 Pattern Inheritance: Merged patterns");
  console.log(`     Original patterns: ${existingFeature.selectedPatterns.join(", ")}`);
  console.log(`     New intent patterns: ${Array.from(newPatternIds).join(", ") || "(none)"}`);
  console.log(`     Final patterns: ${mergedPatterns.map((pattern) => pattern.patternId).join(", ")}`);

  return mergedPatterns;
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
  const reviewArtifactOutputDir = resolveReviewArtifactOutputDir(options.output);

  const artifact = createUpdateReviewArtifact(options);
  const persistReviewArtifact = () => persistDota2ReviewArtifact(artifact, options, "dota2-update-review");
  const artifactBuilder = createDota2ReviewArtifactBuilder(artifact);

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for update");
    artifact.stages.workspaceState = { success: false, featureId: "", totalFeatures: 0, error: "Missing featureId" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Missing featureId");
    persistReviewArtifact();
    return false;
  }

  if (!options.prompt) {
    console.error("\n❌ Error: Prompt is required for update to generate new write plan");
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: "Missing prompt" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Missing prompt");
    persistReviewArtifact();
    return false;
  }

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: workspaceResult.issues.join(", ") };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Failed to load workspace");
    persistReviewArtifact();
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: "Feature not found" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Feature not found");
    persistReviewArtifact();
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be updated`);
    console.error("   Only features with status 'active' can be updated");
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: `Feature status is '${existingFeature.status}'` };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature status is '${existingFeature.status}', only 'active' features can be updated`);
    persistReviewArtifact();
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

  const warningHostFiles = [
    { path: "game/scripts/npc/abilities.txt", reason: "Optional baseline migration input; bridge refresh now tolerates it being absent." },
  ];

  let preflightPassed = true;
  for (const file of warningHostFiles) {
    const fullPath = join(options.hostRoot, file.path);
    if (existsSync(fullPath)) {
      console.log(`  ✅ ${file.path}`);
    } else {
      console.warn(`  ⚠️  ${file.path} - missing`);
      console.warn(`     Reason: ${file.reason}`);
      preflightPassed = false;
    }
  }

  if (!preflightPassed) {
    console.warn("\n⚠️  Host readiness check found optional baseline files missing");
    console.warn("   Bridge refresh can continue, but baseline ability migration will be skipped.");
    artifact.finalVerdict.remainingRisks.push("Baseline ability migration input missing");
  } else {
    console.log("  ✅ Host readiness check passed");
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: Update Intent");
  console.log("=".repeat(70));

  const updateIntentResult = await deps.createUpdateIntent(
    options.prompt,
    options.hostRoot,
    existingFeature,
    process.stdin.isTTY && process.stdout.isTTY,
  );
  const {
    currentFeatureContext,
    requestedChange,
    updateIntent,
    usedFallback,
    clarificationPlan,
    clarificationAuthority,
    relationCandidates,
    workspaceSemanticContext,
  } = updateIntentResult;
  if (!requestedChange || !updateIntent || !currentFeatureContext) {
    console.error("\n❌ Failed to create UpdateIntent");
    artifact.stages.intentSchema = { success: false, summary: "Failed to create UpdateIntent", issues: ["Failed to create UpdateIntent"] };
    artifact.semanticExportStatus = createPendingSemanticExportStatus(
      "Semantic artifacts were not written because update intent generation did not complete.",
    );
    artifact.finalVerdict.weakestStage = "intentSchema";
    artifact.finalVerdict.remainingRisks.push("Failed to create UpdateIntent");
    persistReviewArtifact();
    return false;
  }

  artifact.intentSchema = {
    usedFallback,
    intentKind: requestedChange.classification.intentKind,
    uiNeeded: requestedChange.uiRequirements?.needed || false,
    mechanics: Object.entries(requestedChange.normalizedMechanics)
      .filter(([, value]) => value === true)
      .map(([key]) => key),
    promptPackageId: updateIntentResult.promptPackageId,
    promptConstraints: updateIntentResult.promptConstraints
      ? {
          mustPreserve: updateIntentResult.promptConstraints.mustPreserve,
          mustNotAdd: updateIntentResult.promptConstraints.mustNotAdd,
          exactScalars: updateIntentResult.promptConstraints.exactScalars,
          openSemanticGaps: updateIntentResult.promptConstraints.openSemanticGaps,
        }
      : undefined,
    retrieval: updateIntentResult.retrievalBundle
      ? {
          summary: updateIntentResult.retrievalBundle.summary,
          tiersUsed: updateIntentResult.retrievalBundle.tiersUsed,
          evidenceRefs: updateIntentResult.retrievalBundle.evidenceRefs.map((item) => ({
            title: item.title,
            sourceKind: item.sourceKind,
            path: item.path,
          })),
        }
      : undefined,
  };
  artifact.updateContext = {
    currentFeatureContext,
    requestedChangeIntentSchema: requestedChange,
    updateIntent,
  };
  artifact.clarificationPlan = clarificationPlan;
  artifact.clarificationAuthority = clarificationAuthority;
  artifact.relationCandidates = relationCandidates;
  artifact.workspaceSemanticContext = workspaceSemanticContext;
  try {
    const semanticArtifacts = saveUpdateSemanticArtifacts({
      hostRoot: options.hostRoot,
      featureId: currentFeatureContext.featureId,
      dryRun: options.dryRun || !options.write,
      reviewOutputDir: reviewArtifactOutputDir,
      requestedChangeIntentSchema: requestedChange,
      updateIntent,
      commandKind: "update",
      generatedAt: artifact.generatedAt,
    });
    artifact.semanticArtifacts = semanticArtifacts;
    artifact.semanticExportStatus = createWrittenSemanticExportStatus(semanticArtifacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    artifact.semanticExportStatus = createPendingSemanticExportStatus(
      `Semantic artifacts failed to export: ${message}`,
    );
    artifact.finalVerdict.remainingRisks.push(`Failed to export update semantic artifacts: ${message}`);
  }
  artifact.stages.intentSchema = {
    success: true,
    summary: `UpdateIntent created (${usedFallback ? "fallback" : "LLM"}, uncertainties: ${requestedChange.uncertainties?.length || 0})`,
    issues: [],
    usedFallback,
  };
  console.log(`  ✅ UpdateIntent created (${usedFallback ? "fallback" : "LLM"})`);
  console.log(`     Feature: ${currentFeatureContext.featureId}@r${currentFeatureContext.revision}`);
  console.log(`     Requested Change: ${requestedChange.request.goal}`);
  console.log(`     Intent Kind: ${requestedChange.classification.intentKind}`);
  console.log(`     Uncertainties: ${requestedChange.uncertainties?.length || 0}`);
  console.log(`     UI Needed: ${requestedChange.uiRequirements?.needed || false}`);

  if (clarificationAuthority.blocksBlueprint) {
    artifact.finalVerdict.weakestStage = "intentSchema";
    artifact.finalVerdict.remainingRisks.push(
      ...(clarificationAuthority.reasons.length > 0
        ? clarificationAuthority.reasons
        : ["UpdateIntent requires clarification before Blueprint generation can continue."]),
    );
    artifact.finalVerdict.nextSteps.push("Answer the clarification questions and rerun update.");
    persistReviewArtifact();
    return false;
  }

  const {
    blueprint: blueprintDraft,
    finalBlueprint,
    issues: blueprintIssues,
    status: blueprintStatus,
    moduleNeedsCount,
  } = deps.buildUpdateBlueprint(updateIntent, clarificationAuthority);
  let blueprint = finalBlueprint;
  const blueprintView = finalBlueprint || blueprintDraft;
  const canContinueBlueprint = blueprint?.commitDecision?.canAssemble ?? false;
  if (!blueprint || !canContinueBlueprint) {
    console.error(`\n❌ FinalBlueprint ${blueprintStatus}: ${blueprintIssues.join(", ")}`);
    artifact.stages.blueprint = {
      success: false,
      summary: `FinalBlueprint ${blueprintStatus} (moduleNeeds: ${moduleNeedsCount})`,
      moduleCount: blueprintView?.modules.length || 0,
      patternHints: blueprintView?.patternHints.flatMap((hint) => hint.suggestedPatterns) || [],
      issues: blueprintIssues,
    };
    artifact.finalVerdict.weakestStage = "blueprint";
    artifact.finalVerdict.remainingRisks.push(
      ...(blueprintIssues.length > 0 ? blueprintIssues : [`FinalBlueprint ${blueprintStatus}`])
    );
    persistReviewArtifact();
    return false;
  }

  artifact.stages.blueprint = {
    success: canContinueBlueprint,
    summary: `FinalBlueprint ${blueprintStatus} (moduleNeeds: ${moduleNeedsCount})`,
    moduleCount: blueprintView?.modules.length || 0,
    patternHints: blueprintView?.patternHints.flatMap((hint) => hint.suggestedPatterns) || [],
    issues: blueprintIssues,
  };
  try {
    const semanticArtifacts = saveUpdateSemanticArtifacts({
      hostRoot: options.hostRoot,
      featureId: currentFeatureContext.featureId,
      dryRun: options.dryRun || !options.write,
      reviewOutputDir: reviewArtifactOutputDir,
      requestedChangeIntentSchema: requestedChange,
      updateIntent,
      blueprint: blueprintDraft || undefined,
      finalBlueprint: blueprint,
      commandKind: "update",
      generatedAt: artifact.generatedAt,
    });
    artifact.semanticArtifacts = semanticArtifacts;
    artifact.semanticExportStatus = createWrittenSemanticExportStatus(semanticArtifacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    artifact.finalVerdict.remainingRisks.push(`Failed to export update blueprint semantic artifacts: ${message}`);
  }
  const resolutionResult = deps.resolvePatternsFromBlueprint(blueprint);
  if (resolutionResult.patterns.length === 0 && !shouldUseArtifactSynthesis(blueprint, resolutionResult)) {
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
    persistReviewArtifact();
    return false;
  }

  if (existingFeature.selectedPatterns && existingFeature.selectedPatterns.length > 0) {
    resolutionResult.patterns = mergePatternInheritanceForUpdate(
      existingFeature,
      resolutionResult.patterns,
      blueprint,
    );
  }

  const usesArtifactSynthesis = shouldUseArtifactSynthesis(blueprint, resolutionResult);

  artifact.stages.patternResolution = {
    success: resolutionResult.patterns.length > 0 || usesArtifactSynthesis,
    resolvedPatterns: resolutionResult.patterns.map((pattern) => pattern.patternId),
    unresolvedPatterns: resolutionResult.unresolved.map((unresolved) => unresolved.requestedId),
    issues: [],
    complete: resolutionResult.complete,
  };

  const { plan, blockers } = await deps.buildAssemblyPlan(
    blueprint,
    resolutionResult,
    options.hostRoot,
    existingFeature.featureId,
  );
  if (!plan) {
    console.error(`\n❌ Failed to build AssemblyPlan: ${blockers.join(", ")}`);
    artifact.stages.assemblyPlan = { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers };
    artifact.finalVerdict.weakestStage = "assemblyPlan";
    artifact.finalVerdict.remainingRisks.push(...blockers);
    persistReviewArtifact();
    return false;
  }

  artifact.stages.assemblyPlan = {
    success: true,
    selectedPatterns: plan.selectedPatterns.map((pattern) => pattern.patternId),
    writeTargets: plan.writeTargets.map((target) => target.path),
    readyForHostWrite: plan.readyForHostWrite ?? false,
    blockers,
  };
  artifact.stages.artifactSynthesis = buildArtifactSynthesisStageFromPlan(plan);
  const hostRealizationStage = await runPipelineStage(
    { id: "hostRealization", label: "Stage 4.5: Host Realization (for update)", mode: "update" },
    () => realizeDota2Host(plan),
  );
  if (!hostRealizationStage.ok || !hostRealizationStage.value) {
    const message = hostRealizationStage.error || "Host realization failed";
    artifact.stages.hostRealization = {
      success: false,
      units: [],
      blockers: [message],
    };
    artifactBuilder.setFinalVerdict({ weakestStage: "hostRealization" }).addRemainingRisk(message);
    persistReviewArtifact();
    return false;
  }
  const hostRealizationPlan = hostRealizationStage.value;
  console.log(summarizeRealization(hostRealizationPlan));
  artifact.stages.hostRealization = buildHostRealizationStage(hostRealizationPlan);

  const generatorRoutingStage = await runPipelineStage(
    { id: "generatorRouting", label: "Stage 4.6: Generator Routing (for update)", mode: "update" },
    () => generateGeneratorRoutingPlan(hostRealizationPlan),
  );
  if (!generatorRoutingStage.ok || !generatorRoutingStage.value) {
    const message = generatorRoutingStage.error || "Generator routing failed";
    artifact.stages.generatorRouting = {
      success: false,
      routes: [],
      warnings: [],
      blockers: [message],
    };
    artifactBuilder.setFinalVerdict({ weakestStage: "generatorRouting" }).addRemainingRisk(message);
    persistReviewArtifact();
    return false;
  }
  const generatorRoutingPlan = generatorRoutingStage.value;
  const tsRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "ts");
  const uiRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "ui");
  const kvRoutes = generatorRoutingPlan.routes.filter((route) => route.routeKind === "kv");
  console.log(`  Routes: ${generatorRoutingPlan.routes.length} total`);
  console.log(`    - TS: ${tsRoutes.length}, UI: ${uiRoutes.length}, KV: ${kvRoutes.length} (${kvRoutes.filter((route) => route.blockers?.length).length} blocked)`);
  artifact.stages.generatorRouting = buildGeneratorRoutingStage(generatorRoutingPlan);

  const { writePlan, issues: generatorIssues } = deps.createWritePlan(
    plan,
    options.hostRoot,
    existingFeature,
    "update",
    hostRealizationPlan,
    generatorRoutingPlan,
  );

  if (writePlan && blueprint) {
    const grantSeam = applyDota2GrantSeam({
      hostRoot: options.hostRoot,
      featureId: existingFeature.featureId,
      prompt: options.prompt,
      schema: requestedChange,
      updateIntent,
      blueprint,
      writePlan,
      relationCandidates,
      clarificationAuthority,
      currentFeature: existingFeature,
      workspaceFeatures: workspaceResult.workspace.features,
    });
    blueprint = grantSeam.blueprint;
    if (grantSeam.notes.length > 0) {
      artifact.stages.blueprint.issues.push(...grantSeam.notes);
    }
    artifact.stages.assemblyPlan.readyForHostWrite = writePlan.readyForHostWrite;
    artifact.stages.assemblyPlan.blockers = [...new Set([...(artifact.stages.assemblyPlan.blockers || []), ...(writePlan.readinessBlockers || [])])];

    const preservedArtifacts = preserveDota2UpdateWritePlanArtifacts({
      hostRoot: options.hostRoot,
      updateIntent,
      existingFeature,
      writePlan,
    });
    if (preservedArtifacts.preserved.length > 0) {
      console.log("  ♻ Preserved existing gameplay shell artifacts:");
      for (const preserved of preservedArtifacts.preserved) {
        console.log(`     - ${preserved.targetPath} (${preserved.reason})`);
      }
    }
    if (preservedArtifacts.prunedPaths.length > 0) {
      console.log("  ⛏ Pruned replacement gameplay shell entries:");
      for (const targetPath of preservedArtifacts.prunedPaths) {
        console.log(`     - ${targetPath}`);
      }
    }
    if (options.verbose && preservedArtifacts.skippedReasons.length > 0) {
      console.log("  Preservation notes:");
      for (const reason of preservedArtifacts.skippedReasons) {
        console.log(`     - ${reason}`);
      }
    }
  }
  if (!writePlan) {
    console.error(`\n❌ Failed to create WritePlan: ${generatorIssues.join(", ")}`);
    artifact.stages.generator = { success: false, generatedFiles: [], issues: generatorIssues };
    artifact.finalVerdict.weakestStage = "generator";
    artifact.finalVerdict.remainingRisks.push(...generatorIssues);
    persistReviewArtifact();
    return false;
  }

  writePlan.entries = normalizeUpdateWritePlanEntries(writePlan.entries);
  const localRepairResult = await runLocalRepairWithLLM(blueprint, writePlan);
  artifact.stages.localRepair = {
    success: localRepairResult.success,
    triggered: localRepairResult.triggered,
    attempted: localRepairResult.attempted,
    repairedTargets: localRepairResult.repairedTargets,
    warnings: localRepairResult.warnings,
    blockers: localRepairResult.blockers,
    promptPackageId: localRepairResult.promptPackageId,
    evidenceRefs: localRepairResult.evidenceRefs.map((item) => ({
      title: item.title,
      sourceKind: item.sourceKind,
      path: item.path,
    })),
    boundaryHonored: localRepairResult.boundaryHonored,
    revalidationPassed: localRepairResult.revalidationPassed,
    skipped: !localRepairResult.triggered,
  };

  if (!localRepairResult.success) {
    artifact.finalVerdict.weakestStage = "localRepair";
    artifact.finalVerdict.remainingRisks.push(...localRepairResult.blockers);
    persistReviewArtifact();
    return false;
  }

  const aggregatedGeneratedFiles = buildWritePlanGeneratedFiles(writePlan);

  artifact.stages.generator = {
    success: true,
    generatedFiles: aggregatedGeneratedFiles,
    issues: [],
    realizationContext: writePlan.realizationContext,
    deferredWarnings: writePlan.deferredWarnings,
  };

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
    persistReviewArtifact();
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 6.5: Dependency Revalidation");
  console.log("=".repeat(70));

  const dependencyRevalidation = analyzeDependencyRevalidation({
    workspace: workspaceResult.workspace,
    providerFeatureId: existingFeature.featureId,
    nextFeatureContract: blueprint.featureContract,
    lifecycleAction: "update",
  });
  artifact.stages.dependencyRevalidation = {
    success: dependencyRevalidation.success,
    impactedFeatures: dependencyRevalidation.impactedFeatures,
    blockers: dependencyRevalidation.blockers,
    downgradedFeatures: dependencyRevalidation.downgradedFeatures,
    compatibleFeatures: dependencyRevalidation.compatibleFeatures,
    skipped: dependencyRevalidation.impactedFeatures.length === 0,
  };

  if (dependencyRevalidation.impactedFeatures.length > 0) {
    console.log(`  Impacted Features: ${dependencyRevalidation.impactedFeatures.length}`);
    for (const impact of dependencyRevalidation.impactedFeatures) {
      console.log(`    - ${impact.featureId}: ${impact.outcome}`);
    }
  } else {
    console.log("  ✅ No dependent features impacted");
  }

  if (!dependencyRevalidation.success) {
    artifact.finalVerdict.weakestStage = "dependencyRevalidation";
    artifact.finalVerdict.remainingRisks.push(...dependencyRevalidation.blockers);
    persistReviewArtifact();
    return false;
  }

  if (!options.dryRun && writePlan.readyForHostWrite === false && !options.force) {
    const readinessBlockers = writePlan.readinessBlockers && writePlan.readinessBlockers.length > 0
      ? writePlan.readinessBlockers
      : ["Update host write is blocked by unresolved write authority."];
    console.log("\n" + "=".repeat(70));
    console.log("Stage 7: Selective Update Execution");
    console.log("=".repeat(70));
    console.log("  ⛔ Blocked by readiness gate");
    for (const blocker of readinessBlockers) {
      console.log(`    - ${blocker}`);
    }
    console.log("  Use --force only if you intentionally want to override the host write gate.");

    artifact.stages.writeExecutor = {
      success: false,
      executedActions: 0,
      skippedActions: 0,
      failedActions: 0,
      createdFiles: [],
      modifiedFiles: [],
      blockedByReadinessGate: true,
      readinessBlockers,
    };
    artifact.finalVerdict.weakestStage = "writeExecutor";
    artifact.finalVerdict.remainingRisks.push(...readinessBlockers);
    artifact.finalVerdict.nextSteps.push("Resolve the unresolved provider/binding dependency before rerunning update.");
    persistReviewArtifact();
    return false;
  }

  const contentMap = new Map<string, string>();
  const stableFeatureId = existingFeature.featureId;
  const executableEntriesForUpdate = writePlan.entries.filter((candidate: any) => !candidate.deferred);
  const kvMaterialization = materializeKvWritePlanEntries({
    hostRoot: options.hostRoot,
    entries: executableEntriesForUpdate,
    buildKvContent: generateKVContentWithIndex,
    removedFragmentPaths: diffResult.deletedFiles
      .map((file) => file.path)
      .filter((filePath) => isAbilityKvFragmentPath(filePath)),
  });
  for (const entry of executableEntriesForUpdate) {
    if (entry.contentType === "kv") {
      continue;
    }
    contentMap.set(entry.targetPath, deps.generateCodeContent(entry, stableFeatureId));
  }
  for (const fragment of kvMaterialization.fragmentEntries) {
    contentMap.set(fragment.targetPath, fragment.content);
  }
  for (const passthrough of kvMaterialization.passthroughEntries) {
    contentMap.set(passthrough.targetPath, passthrough.content);
  }
  if (kvMaterialization.aggregate) {
    contentMap.set(
      kvMaterialization.aggregate.aggregateTargetPath,
      kvMaterialization.aggregate.content,
    );
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
    persistReviewArtifact();
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 8: Host Validation");
  console.log("=".repeat(70));

  const hostValidationResult = performUpdateHostValidation(options.hostRoot, diffResult, updateResult);

  artifact.stages.hostValidation = {
    success: hostValidationResult.success,
    checks: hostValidationResult.checks,
    issues: hostValidationResult.issues,
    details: {},
  };
  printHostValidationStage(artifact.stages.hostValidation);

  if (hostValidationResult.issues.length > 0 && !hostValidationResult.success) {
    artifactBuilder.setFinalVerdict({ weakestStage: "hostValidation" });
    for (const issue of hostValidationResult.issues) {
      artifactBuilder.addRemainingRisk(issue);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 9: Runtime Validation");
  console.log("=".repeat(70));

  artifact.stages.runtimeValidation = await runDota2RuntimeValidation(
    options,
    !options.dryRun && updateResult.success,
    "dry-run mode or update failed"
  );

  if (!artifact.stages.runtimeValidation.success) {
    artifactBuilder.setFinalVerdict({ weakestStage: "runtimeValidation" });
    if (!artifact.stages.runtimeValidation.serverPassed) {
      artifactBuilder.addRemainingRisk(
        `Server runtime validation failed with ${artifact.stages.runtimeValidation.serverErrors} errors`
      );
    }
    if (!artifact.stages.runtimeValidation.uiPassed) {
      artifactBuilder.addRemainingRisk(
        `UI runtime validation failed with ${artifact.stages.runtimeValidation.uiErrors} errors`
      );
    }
    if (
      artifact.stages.runtimeValidation.limitations.length > 0 &&
      artifact.stages.runtimeValidation.serverErrors === 0 &&
      artifact.stages.runtimeValidation.uiErrors === 0
    ) {
      for (const limitation of artifact.stages.runtimeValidation.limitations) {
        artifactBuilder.addRemainingRisk(`Runtime validation failed: ${limitation}`);
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 10: Final Commit Decision");
  console.log("=".repeat(70));

  const validationOrchestration = orchestrateValidation({
    blueprint,
    hostRealizationPlan,
    generatorRoutingPlan,
    localRepair: {
      success: localRepairResult.success,
      blockers: localRepairResult.blockers,
      warnings: localRepairResult.warnings,
    },
    dependencyRevalidation,
    hostValidation: {
      success: hostValidationResult.success,
      issues: hostValidationResult.issues,
      checks: hostValidationResult.checks,
      details: hostValidationResult.details,
      skipped: hostValidationResult.skipped,
    },
    runtimeValidation: artifact.stages.runtimeValidation,
    dryRun: options.dryRun,
  });
  const { finalCommitDecision, finalValidationStatus } = validationOrchestration;
  artifact.stages.finalCommitDecision = validationOrchestration.stageResult;
  console.log(`  Outcome: ${finalCommitDecision.outcome}`);
  console.log(`  Requires Review: ${finalCommitDecision.requiresReview ? "yes" : "no"}`);
  for (const reason of finalCommitDecision.reasons) {
    console.log(`    - ${reason}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 11: Workspace State Update");
  console.log("=".repeat(70));

  if (!options.dryRun && finalCommitDecision.outcome !== "blocked") {
    const deletedFiles = diffResult.deletedFiles.map((file) => file.path);
    const sourceBackedFields = resolveSelectionPoolWorkspaceFields(
      writePlan,
      existingFeature.featureId,
      "update",
      blueprint.featureAuthoring ?? existingFeature.featureAuthoring,
    );
    const generatedFilesForUpdate = buildWritePlanGeneratedFiles(writePlan)
      .filter((file) => !deletedFiles.includes(file));
    const ownedArtifactsForUpdate = buildOwnedArtifactsFromWritePlan({
      writePlan,
      sourceModelPath: sourceBackedFields.sourceModel?.path,
      sourceModelAdapter: sourceBackedFields.sourceModel?.adapter,
      sourceModelVersion: sourceBackedFields.sourceModel?.version,
    });
    const integrationPoints = writePlan.integrationPoints && writePlan.integrationPoints.length > 0
      ? [...new Set(writePlan.integrationPoints)]
      : existingFeature.integrationPoints;

    const dependencyEdges = blueprint.dependencyEdges || existingFeature.dependencyEdges;
    const dependsOn = dependencyEdges
      ?.map((edge) => edge.targetFeatureId)
      .filter((target): target is string => typeof target === "string" && target.length > 0);

    const updatedFeature: RuneWeaverFeatureRecord = {
      ...existingFeature,
      revision: existingFeature.revision + 1,
      blueprintId: blueprint.id,
      entryBindings: extractEntryBindings(plan.bridgeUpdates),
      generatedFiles: generatedFilesForUpdate,
      ownedArtifacts: ownedArtifactsForUpdate,
      selectedPatterns: resolutionResult.patterns.map((pattern) => pattern.patternId),
      sourceModel: sourceBackedFields.sourceModel ?? existingFeature.sourceModel ?? undefined,
      featureAuthoring: sourceBackedFields.featureAuthoring ?? existingFeature.featureAuthoring ?? undefined,
      dependsOn: dependsOn && dependsOn.length > 0 ? [...new Set(dependsOn)] : existingFeature.dependsOn,
      maturity: blueprint.maturity ?? existingFeature.maturity,
      implementationStrategy: blueprint.implementationStrategy ?? existingFeature.implementationStrategy,
      featureContract: blueprint.featureContract ?? existingFeature.featureContract,
      validationStatus: finalValidationStatus,
      dependencyEdges,
      commitDecision: finalCommitDecision,
      integrationPoints,
      updatedAt: new Date().toISOString(),
    };

    const updatedFeatures = workspaceResult.workspace.features.map((feature) =>
      feature.featureId === existingFeature.featureId ? updatedFeature : feature,
    );

    let updatedWorkspace = {
      ...workspaceResult.workspace,
      features: updatedFeatures,
    };

    if (dependencyRevalidation.impactedFeatures.length > 0) {
      updatedWorkspace = applyDependencyRevalidationEffects(updatedWorkspace, dependencyRevalidation);
    }

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

      const bridgeRefreshResult = refreshBridge(options.hostRoot, updatedWorkspace);
      if (bridgeRefreshResult.success) {
        console.log("✅ Bridge indexes refreshed");
      } else {
        console.error(`⚠️ Bridge refresh failed: ${bridgeRefreshResult.errors.join(", ")}`);
      }

      const bridgeExportResult = exportWorkspaceToBridge(updatedWorkspace, {
        hostRoot: options.hostRoot,
      });
      if (bridgeExportResult.success) {
        console.log(`✅ Bridge export updated: ${bridgeExportResult.outputPath}`);
      } else {
        console.error(`⚠️ Bridge export failed: ${bridgeExportResult.issues.join(", ")}`);
      }

      artifact.stages.workspaceState = {
        success: true,
        featureId: existingFeature.featureId,
        totalFeatures: updatedWorkspace.features.length,
      };
    }
  } else if (options.dryRun) {
    console.log("🔍 DRY-RUN MODE - Workspace state would be updated");
    artifact.stages.workspaceState = {
      success: true,
      featureId: existingFeature.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
      skipped: true,
    };
  } else {
    console.log("⚠️ Workspace update skipped because final commit decision is blocked");
    artifact.stages.workspaceState = {
      success: true,
      featureId: existingFeature.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
      skipped: true,
    };
  }

  const pipelineComplete =
    artifact.stages.intentSchema.success &&
    artifact.stages.blueprint.success &&
    artifact.stages.patternResolution.success &&
    (artifact.stages.artifactSynthesis?.success ?? true) &&
    artifact.stages.assemblyPlan.success &&
    artifact.stages.generator.success &&
    (artifact.stages.localRepair?.success ?? true) &&
    (artifact.stages.dependencyRevalidation?.success ?? true) &&
    (artifact.stages.finalCommitDecision?.success ?? true) &&
    artifact.stages.writeExecutor.success &&
    artifact.stages.workspaceState.success &&
    artifact.stages.hostValidation.success &&
    artifact.stages.runtimeValidation.success;

  artifactBuilder.setFinalVerdict({
    pipelineComplete,
    hasUnresolvedPatterns: resolutionResult.unresolved.length > 0,
    wasForceOverride: options.force,
  });

  if (pipelineComplete) {
    artifactBuilder.setFinalVerdict({
      completionKind: options.force ? "forced" : "default-safe",
      sufficientForDemo: true,
    });
    if (options.dryRun) {
      artifactBuilder.addNextStep("Run with --write to execute the selective update");
    } else {
      artifactBuilder.addNextStep("Update completed successfully");
    }
  } else {
    artifactBuilder.setFinalVerdict({ completionKind: "partial" });
    if (!artifact.stages.writeExecutor.success) {
      artifactBuilder.addRemainingRisk("Selective update execution failed");
    }
    if (!artifact.stages.workspaceState.success) {
      artifactBuilder.addRemainingRisk("Workspace state update failed");
    }
    if (!artifact.stages.hostValidation.success) {
      artifactBuilder.addRemainingRisk("Host validation failed");
    }
    if (!artifact.stages.runtimeValidation.success) {
      artifactBuilder.addRemainingRisk("Runtime validation failed");
    }
    artifactBuilder.addNextStep("Fix the issues before retrying");
  }

  const outputPath = persistReviewArtifact();

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

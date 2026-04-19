/**
 * Dota2 CLI - Workspace Integration Helpers
 *
 * T141: Extract Workspace Result Integration Out Of dota2-cli.ts
 *
 * This module contains workspace result integration logic only.
 * No command parsing, no pipeline orchestration, no artifact building.
 *
 * Split Principle:
 * - CLI should become a command orchestration shell
 * - Workspace result integration should be centralized for reuse
 * - Workspace model itself stays in core/workspace
 */

import type { Blueprint, AssemblyModule, AssemblyPlan } from "../../../core/schema/types.js";
import type { WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import type { WriteResult } from "../../../adapters/dota2/executor/write-executor.js";
import {
  initializeWorkspace,
  saveWorkspace,
  checkDuplicateFeature,
  addFeatureToWorkspace,
  updateFeatureInWorkspace,
  extractEntryBindings,
  deriveFeatureLifecycleFromModules,
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
  FeatureWriteResult,
  ModuleImplementationRecord,
} from "../../../core/workspace/index.js";
import { injectHostEntryBridge, refreshBridge } from "../../../adapters/dota2/bridge/index.js";
import { resolveDota2GapFillBoundaryIdsForPatterns } from "../../../adapters/dota2/gap-fill/boundaries.js";
import {
  resolveSelectionPoolWorkspaceFields,
} from "../../../adapters/dota2/families/selection-pool/index.js";

export type FeatureMode = "create" | "update" | "regenerate";

export interface WorkspaceUpdateResult {
  success: boolean;
  featureId: string;
  totalFeatures: number;
  error?: string;
}

/**
 * Extract integration points from WritePlan
 * Integration points are identifiers for shared resources like key bindings
 */
function extractIntegrationPointsFromWritePlan(writePlan: WritePlan): string[] {
  const points: string[] = [];
  
  // Add explicit integration points from writePlan
  if (writePlan.integrationPoints) {
    points.push(...writePlan.integrationPoints);
  }
  
  // Extract triggerKey from writePlan.entries for key_binding patterns
  for (const entry of writePlan.entries) {
    const triggerKey =
      entry.parameters?.triggerKey ||
      entry.parameters?.key ||
      entry.metadata?.triggerKey ||
      entry.metadata?.key;
    if (triggerKey && entry.sourcePattern === "input.key_binding") {
      points.push(`input.key_binding:${triggerKey}`);
    }
  }
  
  // Deduplicate
  return [...new Set(points)];
}

function extractDependsOnFromBlueprint(blueprint: Blueprint): string[] | undefined {
  const dependencyTargets = (blueprint.dependencyEdges || [])
    .map((edge) => edge.targetFeatureId)
    .filter((target): target is string => typeof target === "string" && target.length > 0);

  return dependencyTargets.length > 0 ? [...new Set(dependencyTargets)] : undefined;
}

function inferModuleStrategy(input: {
  sourceKind: ModuleImplementationRecord["sourceKind"];
  selectedPatternIds: string[];
  implementationStrategy?: ModuleImplementationRecord["implementationStrategy"];
}): ModuleImplementationRecord["implementationStrategy"] {
  if (input.implementationStrategy) {
    return input.implementationStrategy;
  }

  if (input.sourceKind === "synthesized") {
    return input.selectedPatternIds.length > 0 ? "guided_native" : "exploratory";
  }

  if (input.sourceKind === "family") {
    return "family";
  }

  return "pattern";
}

function inferModuleMaturity(
  strategy: ModuleImplementationRecord["implementationStrategy"],
): ModuleImplementationRecord["maturity"] {
  switch (strategy) {
    case "family":
    case "pattern":
      return "templated";
    case "guided_native":
      return "exploratory";
    case "exploratory":
    default:
      return "exploratory";
  }
}

function buildModuleReviewReasons(
  module: AssemblyModule,
  strategy: ModuleImplementationRecord["implementationStrategy"],
  writePlan: WritePlan,
  existingRecord?: ModuleImplementationRecord,
): string[] {
  const reasons: string[] = [...(existingRecord?.reviewReasons || [])];
  const deferredEntries = writePlan.entries.filter(
    (entry) => entry.sourceModule === module.id && entry.deferred && entry.deferredReason,
  );
  reasons.push(...deferredEntries.map((entry) => entry.deferredReason!).filter((reason) => reason.trim().length > 0));

  if (module.realizationHints?.isFallback) {
    reasons.push("Module currently relies on fallback realization and should remain reviewable.");
  }
  if (strategy === "guided_native") {
    reasons.push("Module includes synthesized host-native implementation and should remain reviewable.");
  } else if (strategy === "exploratory") {
    reasons.push("Module has no templated pattern backing and remains exploratory.");
  }

  return [...new Set(reasons)];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function normalizeModuleSourceKind(
  sourceKind: ModuleImplementationRecord["sourceKind"] | undefined,
): ModuleImplementationRecord["sourceKind"] {
  switch (sourceKind) {
    case "family":
    case "pattern":
    case "synthesized":
      return sourceKind;
    default:
      return "pattern";
  }
}

function inferArtifactTargetsFromModule(
  module: AssemblyModule | undefined,
  artifactPaths: string[],
): string[] | undefined {
  const targets = new Set<string>();

  for (const outputKind of module?.outputKinds || []) {
    switch (outputKind) {
      case "server":
        targets.add("server");
        break;
      case "shared":
        targets.add("shared");
        break;
      case "ui":
        targets.add("ui");
        break;
      case "bridge":
        targets.add("bridge");
        break;
      default:
        break;
    }
  }

  for (const path of artifactPaths) {
    if (path.endsWith(".lua")) {
      targets.add("lua");
    } else if (path.endsWith(".txt")) {
      targets.add("config");
    } else if (path.endsWith(".tsx") || path.endsWith(".less")) {
      targets.add("ui");
    } else if (path.includes("generated/shared")) {
      targets.add("shared");
    } else if (path.includes("modules/index.ts") || path.includes("hud/script.tsx")) {
      targets.add("bridge");
    } else {
      targets.add("server");
    }
  }

  return targets.size > 0 ? [...targets] : undefined;
}

function buildModuleImplementationRecords(
  blueprint: Blueprint,
  assemblyPlan: AssemblyPlan,
  writePlan: WritePlan,
): ModuleImplementationRecord[] | undefined {
  const assemblyModules = assemblyPlan.modules || [];
  const baseRecords = assemblyPlan.moduleRecords || blueprint.moduleRecords || [];
  if (assemblyModules.length === 0 && baseRecords.length === 0) {
    return undefined;
  }

  const blueprintModules = new Map(blueprint.modules.map((module) => [module.id, module] as const));
  const assemblyModuleById = new Map(assemblyModules.map((module) => [module.id, module] as const));
  const baseRecordById = new Map(baseRecords.map((record) => [record.moduleId, record] as const));
  const moduleIds = uniqueStrings([
    ...assemblyModules.map((module) => module.id),
    ...baseRecords.map((record) => record.moduleId),
  ]);
  const records = moduleIds.map((moduleId) => {
    const module = assemblyModuleById.get(moduleId);
    const baseRecord = baseRecordById.get(moduleId);
    const blueprintModule = blueprintModules.get(moduleId);
    const synthesizedArtifactsForModule = (assemblyPlan.synthesizedArtifacts || []).filter(
      (artifact) =>
        artifact.moduleId === moduleId
        || (baseRecord?.bundleId && artifact.bundleId === baseRecord.bundleId),
    );
    const selectedPatternIds = uniqueStrings([
      ...(baseRecord?.selectedPatternIds || []),
      ...(module?.selectedPatterns || []),
      ...(blueprintModule?.patternIds || []),
    ]);
    const sourceKind = normalizeModuleSourceKind(
      baseRecord?.sourceKind || module?.sourceKind || assemblyPlan.sourceKind,
    );
    const strategy = inferModuleStrategy({
      sourceKind,
      selectedPatternIds,
      implementationStrategy: baseRecord?.implementationStrategy,
    });
    const reviewReasons = uniqueStrings([
      ...(module ? buildModuleReviewReasons(module, strategy, writePlan, baseRecord) : baseRecord?.reviewReasons || []),
      ...(baseRecord?.reviewRequired || baseRecord?.requiresReview
        ? baseRecord?.reviewReasons || []
        : []),
    ]);
    const artifactPaths = uniqueStrings([
      ...(baseRecord?.artifactPaths || []),
      ...synthesizedArtifactsForModule.map((artifact) => artifact.targetPath),
      ...writePlan.entries
        .filter(
          (entry) =>
            !entry.deferred
            && (
              entry.sourceModule === moduleId
              || (
                typeof entry.metadata?.bundleId === "string"
                && baseRecord?.bundleId === entry.metadata.bundleId
              )
            ),
        )
        .map((entry) => entry.targetPath),
    ]);
    const synthesizedArtifactIds = uniqueStrings([
      ...(baseRecord?.synthesizedArtifactIds || []),
      ...synthesizedArtifactsForModule.map((artifact) => artifact.id),
    ]);
    const ownedPaths = uniqueStrings([
      ...(baseRecord?.ownedPaths || []),
      ...artifactPaths,
    ]);
    const artifactTargets =
      baseRecord?.artifactTargets
      || inferArtifactTargetsFromModule(module, artifactPaths);
    const fillContractIds = uniqueStrings([
      ...(baseRecord?.fillContractIds || []),
      ...(blueprint.fillContracts || [])
        .filter((fillContract) => fillContract.targetModuleId === moduleId)
        .map((fillContract) => fillContract.boundaryId),
    ]);
    const requiresReview =
      baseRecord?.reviewRequired === true
      || baseRecord?.requiresReview === true
      || reviewReasons.length > 0;
    const resolvedFrom =
      baseRecord?.resolvedFrom
      || (sourceKind === "synthesized"
        ? strategy
        : sourceKind === "family"
          ? "family"
          : "pattern");

    return {
      moduleId,
      bundleId: baseRecord?.bundleId,
      role: module?.role || baseRecord?.role || blueprintModule?.role || moduleId,
      category: baseRecord?.category || blueprintModule?.category,
      sourceKind,
      familyId: baseRecord?.familyId,
      patternId: baseRecord?.patternId || (sourceKind === "pattern" ? selectedPatternIds[0] : undefined),
      selectedPatternIds,
      artifactTargets,
      ownedPaths: ownedPaths.length > 0 ? ownedPaths : undefined,
      fillContractIds: fillContractIds.length > 0 ? fillContractIds : undefined,
      reviewRequired: requiresReview,
      requiresReview,
      reviewReasons,
      implementationStrategy: strategy,
      maturity: inferModuleMaturity(strategy),
      outputKinds: baseRecord?.outputKinds || module?.outputKinds,
      artifactPaths: artifactPaths.length > 0 ? artifactPaths : undefined,
      resolvedFrom,
      summary: baseRecord?.summary,
      requiredOutputs: baseRecord?.requiredOutputs,
      integrationHints: baseRecord?.integrationHints,
      stateExpectations: baseRecord?.stateExpectations,
      synthesizedArtifactIds: synthesizedArtifactIds.length > 0 ? synthesizedArtifactIds : undefined,
      metadata: baseRecord?.metadata,
    } satisfies ModuleImplementationRecord;
  });

  return records.length > 0 ? records : undefined;
}

export function updateWorkspaceState(
  hostRoot: string,
  blueprint: Blueprint,
  assemblyPlan: AssemblyPlan,
  writePlan: WritePlan,
  mode: FeatureMode,
  featureId: string,
  existingFeature: RuneWeaverFeatureRecord | null,
  writeResult?: WriteResult
): WorkspaceUpdateResult {
  const initResult = initializeWorkspace(hostRoot);
  if (!initResult.success) {
    return {
      success: false,
      featureId,
      totalFeatures: 0,
      error: "Failed to initialize workspace",
    };
  }

  const workspace = initResult.workspace!;

  const normalizedSave = saveWorkspace(hostRoot, workspace);
  if (!normalizedSave.success) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: "Failed to normalize existing workspace state",
    };
  }

  if (mode === "create") {
    const duplicatePolicy = checkDuplicateFeature(workspace, featureId);
    if (duplicatePolicy.action === "reject") {
      const existing = workspace.features.find((f) => f.featureId === featureId);
      if (existing) {
        return {
          success: false,
          featureId,
          totalFeatures: workspace.features.length,
          error: duplicatePolicy.message,
        };
      }
    }
  } else if (!existingFeature) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: `Feature '${featureId}' does not exist for ${mode}`,
    };
  }

  const entryBindings = extractEntryBindings(assemblyPlan.bridgeUpdates);

  let generatedFiles: string[];
  if (writeResult && writeResult.success) {
    generatedFiles = [...writeResult.createdFiles, ...writeResult.modifiedFiles];
  } else {
    const executableEntries = writePlan.entries.filter((e: WritePlanEntry) => !e.deferred);
    const kvEntriesForWs = executableEntries.filter((e: WritePlanEntry) => e.contentType === "kv");
    const nonKvEntriesForWs = executableEntries.filter((e: WritePlanEntry) => e.contentType !== "kv");
    const kvTargetPathsForWs = new Set(kvEntriesForWs.map((e: WritePlanEntry) => e.targetPath));
    const aggregatedKvFilesForWs = Array.from(kvTargetPathsForWs);
    const nonKvFilesForWs = nonKvEntriesForWs.map((e: WritePlanEntry) => e.targetPath);
    generatedFiles = [...nonKvFilesForWs, ...aggregatedKvFilesForWs];
  }

  const sourceBackedFields = resolveSelectionPoolWorkspaceFields(
    writePlan,
    featureId,
    mode,
    blueprint.featureAuthoring,
  );
  const modules = buildModuleImplementationRecords(blueprint, assemblyPlan, writePlan);
  const lifecycle = deriveFeatureLifecycleFromModules({
    modules: modules || existingFeature?.modules || [],
    priorCommitDecision: blueprint.commitDecision || existingFeature?.commitDecision,
  });

  const featureResult: FeatureWriteResult = {
    featureId,
    blueprintId: blueprint.id,
    modules,
    selectedPatterns: assemblyPlan.selectedPatterns.map((p) => p.patternId),
    generatedFiles,
    entryBindings,
    sourceModel: sourceBackedFields.sourceModel,
    featureAuthoring: sourceBackedFields.featureAuthoring,
    dependsOn: extractDependsOnFromBlueprint(blueprint),
    maturity: lifecycle.maturity,
    implementationStrategy: lifecycle.implementationStrategy,
    featureContract: blueprint.featureContract || null,
    validationStatus: blueprint.validationStatus || null,
    dependencyEdges: blueprint.dependencyEdges || [],
    commitDecision: lifecycle.commitDecision || null,
    gapFillBoundaries: uniqueStrings([
      ...resolveDota2GapFillBoundaryIdsForPatterns(
        assemblyPlan.selectedPatterns.map((p) => p.patternId)
      ),
      ...(blueprint.fillContracts || []).map((fillContract) => fillContract.boundaryId),
    ]),
  };

  const intentKind = blueprint.sourceIntent.intentKind;
  
  // Extract integration points for conflict detection
  const integrationPoints = extractIntegrationPointsFromWritePlan(writePlan);
  
  const updatedWorkspace =
    mode === "create"
      ? addFeatureToWorkspace(workspace, featureResult, intentKind, integrationPoints)
      : updateFeatureInWorkspace(workspace, featureId, featureResult, intentKind, integrationPoints);

  const saveResult = saveWorkspace(hostRoot, updatedWorkspace);
  if (!saveResult.success) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: "Failed to save workspace state",
    };
  }

  const bridgeRefresh = refreshBridge(hostRoot, updatedWorkspace);
  if (!bridgeRefresh.success) {
    return {
      success: false,
      featureId,
      totalFeatures: updatedWorkspace.features.length,
      error: `Failed to refresh generated bridge indexes: ${bridgeRefresh.errors.join(", ")}`,
    };
  }

  const hostEntryInjection = injectHostEntryBridge(hostRoot);
  if (!hostEntryInjection.success) {
    return {
      success: false,
      featureId,
      totalFeatures: updatedWorkspace.features.length,
      error: `Failed to inject host bridge entries: ${hostEntryInjection.errors.join(", ")}`,
    };
  }

  return {
    success: true,
    featureId,
    totalFeatures: updatedWorkspace.features.length,
  };
}

export function formatWorkspaceUpdateResult(result: WorkspaceUpdateResult): string {
  if (result.success) {
    return `Workspace updated: ${result.featureId} (total features: ${result.totalFeatures})`;
  }
  return `Workspace update failed: ${result.error}`;
}

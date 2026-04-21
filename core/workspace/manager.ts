/**
 * Rune Weaver - Workspace State Manager
 *
 * T090-T093: Workspace State Management Minimal Foundation
 *
 * 管理工作区状态文件的读取、写入、更新和验证
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname, basename } from "path";
import {
  DOTA2_X_TEMPLATE_HOST_KIND,
  UNKNOWN_HOST_KIND,
} from "../host/types.js";
import {
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
  WorkspaceStateResult,
  WorkspaceValidationResult,
  FeatureWriteResult,
  DuplicateFeaturePolicy,
  EntryBinding,
  FeatureOwnedArtifact,
  FeatureSourceModelRef,
  ModuleImplementationRecord,
} from "./types.js";

const WORKSPACE_FILE_NAME = "rune-weaver.workspace.json";
const CURRENT_VERSION = "0.1";

// F011: Workspace file is located in game/scripts/src/rune_weaver/
const WORKSPACE_RELATIVE_PATH = "game/scripts/src/rune_weaver";

function resolveOptionalReplace<T>(
  nextValue: T | null | undefined,
  existingValue: T | undefined,
): T | undefined {
  if (nextValue === undefined) {
    return existingValue;
  }
  if (nextValue === null) {
    return undefined;
  }
  return nextValue;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function deriveModuleStrategy(input: {
  sourceKind: ModuleImplementationRecord["sourceKind"];
  selectedPatternIds: string[];
  implementationStrategy?: ModuleImplementationRecord["implementationStrategy"];
}): ModuleImplementationRecord["implementationStrategy"] {
  if (input.implementationStrategy) {
    return input.implementationStrategy;
  }

  switch (input.sourceKind) {
    case "family":
      return "family";
    case "pattern":
      return "pattern";
    case "synthesized":
      return input.selectedPatternIds.length > 0 ? "guided_native" : "exploratory";
    case "templated":
    default:
      return input.selectedPatternIds.length > 0 ? "pattern" : "family";
  }
}

function deriveModuleMaturity(
  strategy: ModuleImplementationRecord["implementationStrategy"],
  maturity?: ModuleImplementationRecord["maturity"],
): ModuleImplementationRecord["maturity"] {
  if (maturity) {
    return maturity;
  }

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

function normalizeSelectedPatternIds(raw: Record<string, unknown>): string[] {
  return uniqueStrings([
    ...normalizeStringArray(raw.selectedPatternIds),
    ...normalizeStringArray(raw.selectedPatterns),
  ]);
}

function normalizeModuleSourceKind(
  raw: Record<string, unknown>,
  selectedPatternIds: string[],
): ModuleImplementationRecord["sourceKind"] | undefined {
  switch (raw.sourceKind) {
    case "family":
    case "pattern":
    case "synthesized":
      return raw.sourceKind;
    case "templated":
      if (typeof raw.familyId === "string" && raw.familyId.length > 0) {
        return "family";
      }
      if (typeof raw.patternId === "string" && raw.patternId.length > 0) {
        return "pattern";
      }
      return selectedPatternIds.length > 0 ? "pattern" : "family";
    default:
      return undefined;
  }
}

function normalizeModuleCategory(
  rawCategory: unknown,
): ModuleImplementationRecord["category"] {
  switch (rawCategory) {
    case "trigger":
    case "data":
    case "rule":
    case "effect":
    case "ui":
    case "resource":
    case "integration":
      return rawCategory;
    default:
      return undefined;
  }
}

function normalizeReviewReasons(
  strategy: ModuleImplementationRecord["implementationStrategy"],
  rawReasons: unknown,
  requiresReview: boolean,
): string[] {
  const normalized = normalizeStringArray(rawReasons);
  if (normalized.length > 0 || !requiresReview) {
    return normalized;
  }

  switch (strategy) {
    case "guided_native":
      return ["Module includes synthesized host-native implementation and should remain reviewable."];
    case "exploratory":
      return ["Module is exploratory and should remain reviewable before committable promotion."];
    default:
      return [];
  }
}

function normalizeModuleImplementationRecord(
  rawModule: unknown,
): ModuleImplementationRecord | undefined {
  if (!rawModule || typeof rawModule !== "object") {
    return undefined;
  }

  const raw = rawModule as Record<string, unknown>;
  const moduleId =
    typeof raw.moduleId === "string" && raw.moduleId.length > 0
      ? raw.moduleId
      : undefined;
  const role =
    typeof raw.role === "string" && raw.role.length > 0
      ? raw.role
      : moduleId;
  const selectedPatternIds = normalizeSelectedPatternIds(raw);
  const sourceKind = normalizeModuleSourceKind(raw, selectedPatternIds);

  if (!moduleId || !role || !sourceKind) {
    return undefined;
  }

  const implementationStrategy = deriveModuleStrategy({
    sourceKind,
    selectedPatternIds,
    implementationStrategy: normalizeImplementationStrategy(raw.implementationStrategy),
  });
  const maturity = deriveModuleMaturity(
    implementationStrategy,
    normalizeFeatureMaturity(raw.maturity),
  );
  const requiresReview =
    raw.reviewRequired === true
    || raw.requiresReview === true
    || normalizeStringArray(raw.reviewReasons).length > 0
    || implementationStrategy === "guided_native"
    || implementationStrategy === "exploratory";

  return {
    moduleId,
    bundleId: typeof raw.bundleId === "string" && raw.bundleId.length > 0 ? raw.bundleId : undefined,
    role,
    category: normalizeModuleCategory(raw.category),
    sourceKind,
    familyId: typeof raw.familyId === "string" && raw.familyId.length > 0 ? raw.familyId : undefined,
    patternId: typeof raw.patternId === "string" && raw.patternId.length > 0 ? raw.patternId : undefined,
    selectedPatternIds,
    artifactTargets: normalizeStringArray(raw.artifactTargets),
    ownedPaths: normalizeStringArray(raw.ownedPaths),
    fillContractIds: normalizeStringArray(raw.fillContractIds),
    reviewRequired: requiresReview,
    implementationStrategy,
    maturity,
    outputKinds: normalizeOutputKinds(raw.outputKinds),
    artifactPaths: normalizeStringArray(raw.artifactPaths),
    resolvedFrom:
      raw.resolvedFrom === "family"
      || raw.resolvedFrom === "pattern"
      || raw.resolvedFrom === "guided_native"
      || raw.resolvedFrom === "exploratory"
      || raw.resolvedFrom === "mixed"
        ? raw.resolvedFrom
        : undefined,
    summary: typeof raw.summary === "string" && raw.summary.length > 0 ? raw.summary : undefined,
    requiredOutputs: normalizeStringArray(raw.requiredOutputs),
    integrationHints: normalizeStringArray(raw.integrationHints),
    stateExpectations: normalizeStringArray(raw.stateExpectations),
    synthesizedArtifactIds: normalizeStringArray(raw.synthesizedArtifactIds),
    requiresReview,
    metadata:
      raw.metadata && typeof raw.metadata === "object"
        ? raw.metadata as Record<string, unknown>
        : undefined,
    reviewReasons: normalizeReviewReasons(implementationStrategy, raw.reviewReasons, requiresReview),
  };
}

function inferLegacyModuleRecord(raw: Record<string, unknown>): ModuleImplementationRecord {
  const selectedPatternIds = normalizeSelectedPatternIds(raw);
  const explicitStrategy = normalizeImplementationStrategy(raw.implementationStrategy);
  const hasSourceBackedEvidence = Boolean(normalizeSourceModelRef(raw.sourceModel) || normalizeFeatureAuthoring(raw.featureAuthoring));
  const sourceKind: ModuleImplementationRecord["sourceKind"] =
    explicitStrategy === "guided_native" || explicitStrategy === "exploratory"
      ? "synthesized"
      : explicitStrategy === "family"
        ? "family"
      : explicitStrategy === "pattern"
        ? "pattern"
      : selectedPatternIds.length === 0 && !hasSourceBackedEvidence
        ? "synthesized"
      : hasSourceBackedEvidence
        ? "family"
        : "pattern";
  const implementationStrategy = deriveModuleStrategy({
    sourceKind,
    selectedPatternIds,
    implementationStrategy: explicitStrategy,
  });
  const maturity = deriveModuleMaturity(
    implementationStrategy,
    normalizeFeatureMaturity(raw.maturity),
  );
  const reviewReasons = uniqueStrings([
    ...normalizeStringArray((raw.commitDecision as Record<string, unknown> | undefined)?.reasons),
    ...normalizeStringArray((raw.validationStatus as Record<string, unknown> | undefined)?.warnings),
  ]);
  const requiresReview =
    (raw.commitDecision as Record<string, unknown> | undefined)?.requiresReview === true
    || implementationStrategy === "guided_native"
    || implementationStrategy === "exploratory"
    || reviewReasons.length > 0;

  return {
    moduleId: "legacy.feature",
    role: "legacy_feature",
    sourceKind,
    selectedPatternIds,
    reviewRequired: requiresReview,
    implementationStrategy,
    maturity,
    outputKinds: inferOutputKindsFromGeneratedFiles(
      ((raw.generatedFiles as string[]) || []).filter((file): file is string => typeof file === "string"),
    ),
    artifactPaths: ((raw.generatedFiles as string[]) || []).filter((file): file is string => typeof file === "string"),
    requiresReview,
    reviewReasons: normalizeReviewReasons(implementationStrategy, reviewReasons, requiresReview),
  };
}

function inferOutputKindsFromGeneratedFiles(
  generatedFiles: string[],
): ModuleImplementationRecord["outputKinds"] {
  const kinds = new Set<"server" | "shared" | "ui" | "bridge">();

  for (const file of generatedFiles) {
    if (file.startsWith("game/scripts/src/rune_weaver/generated/server/")) {
      kinds.add("server");
    } else if (file.startsWith("game/scripts/src/rune_weaver/generated/shared/")) {
      kinds.add("shared");
    } else if (file.startsWith("content/panorama/src/rune_weaver/generated/ui/")) {
      kinds.add("ui");
    } else if (
      file === "game/scripts/src/modules/index.ts"
      || file === "content/panorama/src/hud/script.tsx"
    ) {
      kinds.add("bridge");
    }
  }

  return kinds.size > 0 ? [...kinds] : undefined;
}

function normalizeOutputKinds(rawOutputKinds: unknown): ModuleImplementationRecord["outputKinds"] {
  if (!Array.isArray(rawOutputKinds)) {
    return undefined;
  }

  const normalized = rawOutputKinds.filter(
    (kind): kind is "server" | "shared" | "ui" | "bridge" =>
      kind === "server" || kind === "shared" || kind === "ui" || kind === "bridge",
  );

  return normalized.length > 0 ? [...new Set(normalized)] : undefined;
}

export function deriveFeatureLifecycleFromModules(input: {
  modules: ModuleImplementationRecord[];
  priorCommitDecision?: RuneWeaverFeatureRecord["commitDecision"] | FeatureWriteResult["commitDecision"];
}): Pick<FeatureWriteResult, "maturity" | "implementationStrategy" | "commitDecision"> {
  if (input.modules.length === 0) {
    return {
      maturity: undefined,
      implementationStrategy: undefined,
      commitDecision: input.priorCommitDecision ?? undefined,
    };
  }

  const hasSynthesized = input.modules.some((module) => module.sourceKind === "synthesized");
  const hasReusable = input.modules.some(
    (module) => module.sourceKind === "family" || module.sourceKind === "pattern",
  );
  const allFamily = input.modules.every((module) => module.sourceKind === "family");
  const moduleReviewReasons = uniqueStrings(
    input.modules.flatMap((module) =>
      (module.reviewReasons || []).map((reason) => `[module:${module.moduleId}] ${reason}`),
    ),
  );
  const reviewModules = input.modules.filter(
    (module) => module.reviewRequired === true || module.requiresReview === true,
  );
  const moduleRequiresReview = reviewModules.length > 0;
  const prior = input.priorCommitDecision;
  const blocked = prior?.outcome === "blocked";
  const implementationStrategy =
    hasSynthesized && hasReusable
      ? "guided_native"
      : hasSynthesized
      ? "exploratory"
      : allFamily
        ? "family"
        : "pattern";
  const maturity = hasSynthesized ? "exploratory" : "templated";
  const moduleDrivenOutcome =
    blocked
      ? "blocked"
      : (hasSynthesized || moduleRequiresReview || prior?.outcome === "exploratory")
        ? "exploratory"
        : "committable";
  const reasons = uniqueStrings([
    ...(blocked ? prior?.reasons || [] : []),
    ...moduleReviewReasons,
    ...(!blocked && prior?.outcome !== "blocked" ? prior?.reasons || [] : []),
  ]);

  return {
    maturity,
    implementationStrategy,
    commitDecision: {
      outcome: moduleDrivenOutcome,
      canAssemble: prior?.canAssemble ?? moduleDrivenOutcome !== "blocked",
      canWriteHost: prior?.canWriteHost ?? moduleDrivenOutcome !== "blocked",
      requiresReview: prior?.requiresReview === true || hasSynthesized || moduleRequiresReview,
      reasons,
      stage: prior?.stage,
      impactedFeatures: prior?.impactedFeatures,
      dependencyBlockers: prior?.dependencyBlockers,
      downgradedFeatures: prior?.downgradedFeatures,
      reviewModules: reviewModules.map((module) => module.moduleId),
    },
  };
}

export function getWorkspaceFilePath(hostRoot: string): string {
  return join(hostRoot, WORKSPACE_RELATIVE_PATH, WORKSPACE_FILE_NAME);
}

export function workspaceExists(hostRoot: string): boolean {
  return existsSync(getWorkspaceFilePath(hostRoot));
}

/**
 * Read addon_name from scripts/addon.config.ts
 * Returns null if file doesn't exist or addon_name cannot be parsed
 */
function readAddonNameFromConfig(projectPath: string): string | null {
  try {
    const configPath = join(projectPath, "scripts/addon.config.ts");
    if (!existsSync(configPath)) return null;
    
    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function createEmptyWorkspace(
  hostRoot: string, 
  mapName?: string,
  addonName?: string
): RuneWeaverWorkspace {
  if (!addonName) {
    addonName = readAddonNameFromConfig(hostRoot) || basename(hostRoot);
  }
  
  const now = new Date().toISOString();
  return {
    version: CURRENT_VERSION,
    hostType: DOTA2_X_TEMPLATE_HOST_KIND,
    hostRoot,
    addonName,
    mapName,
    initializedAt: now,
    features: [],
  };
}

export function loadWorkspace(hostRoot: string): WorkspaceStateResult {
  const filePath = getWorkspaceFilePath(hostRoot);
  const issues: string[] = [];

  if (!existsSync(filePath)) {
    return {
      success: false,
      workspace: null,
      issues: ["Workspace file does not exist"],
    };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const rawWorkspace = JSON.parse(content);

    if (!validateWorkspaceStructure(rawWorkspace)) {
      issues.push("Workspace file has invalid structure");
      return {
        success: false,
        workspace: null,
        issues,
      };
    }

    // Normalize workspace to ensure all required fields exist
    const workspace = normalizeWorkspace(rawWorkspace);

    return {
      success: true,
      workspace,
      issues: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Failed to load workspace: ${message}`);
    return {
      success: false,
      workspace: null,
      issues,
    };
  }
}

export function saveWorkspace(hostRoot: string, workspace: RuneWeaverWorkspace): WorkspaceStateResult {
  const filePath = getWorkspaceFilePath(hostRoot);
  const issues: string[] = [];

  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(workspace, null, 2);
    writeFileSync(filePath, content, "utf-8");

    return {
      success: true,
      workspace,
      issues: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Failed to save workspace: ${message}`);
    return {
      success: false,
      workspace: null,
      issues,
    };
  }
}

export function initializeWorkspace(hostRoot: string): WorkspaceStateResult {
  if (workspaceExists(hostRoot)) {
    return loadWorkspace(hostRoot);
  }

  const workspace = createEmptyWorkspace(hostRoot);
  return saveWorkspace(hostRoot, workspace);
}

export function findFeatureById(workspace: RuneWeaverWorkspace, featureId: string): RuneWeaverFeatureRecord | undefined {
  return workspace.features.find((f) => f.featureId === featureId);
}

export function getActiveFeatures(workspace: RuneWeaverWorkspace): RuneWeaverFeatureRecord[] {
  return workspace.features.filter((f) => f.status === "active");
}

export function checkDuplicateFeature(
  workspace: RuneWeaverWorkspace,
  featureId: string
): DuplicateFeaturePolicy {
  const existing = findFeatureById(workspace, featureId);

  if (!existing) {
    return {
      action: "reject",
      message: "No duplicate found",
    };
  }

  return {
    action: "reject",
    message: `Feature '${featureId}' already exists with status '${existing.status}'. ` +
             `Use --update to modify existing features or use a different feature ID.`,
  };
}

export function addFeatureToWorkspace(
  workspace: RuneWeaverWorkspace,
  result: FeatureWriteResult,
  intentKind: string,
  integrationPoints?: string[]
): RuneWeaverWorkspace {
  const now = new Date().toISOString();
  const lifecycle = deriveFeatureLifecycleFromModules({
    modules: result.modules || [],
    priorCommitDecision: result.commitDecision,
  });

  const featureRecord: RuneWeaverFeatureRecord = {
    featureId: result.featureId,
    intentKind,
    status: "active",
    revision: 1,
    blueprintId: result.blueprintId,
    modules: result.modules || [],
    selectedPatterns: result.selectedPatterns,
    generatedFiles: result.generatedFiles,
    ownedArtifacts: result.ownedArtifacts,
    entryBindings: result.entryBindings,
    sourceModel: result.sourceModel ?? undefined,
    featureAuthoring: result.featureAuthoring ?? undefined,
    dependsOn: result.dependsOn,
    maturity: lifecycle.maturity,
    implementationStrategy: lifecycle.implementationStrategy,
    featureContract: result.featureContract ?? undefined,
    validationStatus: result.validationStatus ?? undefined,
    dependencyEdges: result.dependencyEdges,
    commitDecision: lifecycle.commitDecision ?? undefined,
    integrationPoints,
    gapFillBoundaries: result.gapFillBoundaries,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...workspace,
    features: [...workspace.features, featureRecord],
  };
}

export function updateFeatureInWorkspace(
  workspace: RuneWeaverWorkspace,
  featureId: string,
  result: FeatureWriteResult,
  intentKind: string,
  integrationPoints?: string[]
): RuneWeaverWorkspace {
  const existing = findFeatureById(workspace, featureId);
  if (!existing) {
    throw new Error(`Feature '${featureId}' does not exist in workspace`);
  }

  const now = new Date().toISOString();
  const nextModules = resolveOptionalReplace(result.modules, existing.modules) || [];
  const lifecycle = deriveFeatureLifecycleFromModules({
    modules: nextModules,
    priorCommitDecision: result.commitDecision ?? existing.commitDecision,
  });

  const updatedFeature: RuneWeaverFeatureRecord = {
    ...existing,
    intentKind,
    status: "active",
    revision: existing.revision + 1,
    blueprintId: result.blueprintId,
    modules: nextModules,
    selectedPatterns: result.selectedPatterns,
    generatedFiles: result.generatedFiles,
    ownedArtifacts: resolveOptionalReplace(result.ownedArtifacts, existing.ownedArtifacts),
    entryBindings: result.entryBindings,
    sourceModel: resolveOptionalReplace(result.sourceModel, existing.sourceModel),
    featureAuthoring: resolveOptionalReplace(result.featureAuthoring, existing.featureAuthoring),
    dependsOn: resolveOptionalReplace(result.dependsOn, existing.dependsOn),
    maturity: lifecycle.maturity,
    implementationStrategy: lifecycle.implementationStrategy,
    featureContract: resolveOptionalReplace(result.featureContract, existing.featureContract),
    validationStatus: resolveOptionalReplace(result.validationStatus, existing.validationStatus),
    dependencyEdges: resolveOptionalReplace(result.dependencyEdges, existing.dependencyEdges),
    commitDecision: lifecycle.commitDecision ?? undefined,
    integrationPoints: integrationPoints || existing.integrationPoints,
    gapFillBoundaries: result.gapFillBoundaries || existing.gapFillBoundaries,
    updatedAt: now,
  };

  return {
    ...workspace,
    features: workspace.features.map((feature) =>
      feature.featureId === featureId ? updatedFeature : feature
    ),
  };
}

export function deleteFeature(
  workspace: RuneWeaverWorkspace,
  featureId: string
): { success: boolean; issues: string[]; workspace?: RuneWeaverWorkspace } {
  const existing = findFeatureById(workspace, featureId);
  if (!existing) {
    return { success: false, issues: [`Feature '${featureId}' does not exist in workspace`] };
  }

  return {
    success: true,
    issues: [],
    workspace: {
      ...workspace,
      features: workspace.features.filter((f) => f.featureId !== featureId),
    },
  };
}

export function validateWorkspace(workspace: RuneWeaverWorkspace): WorkspaceValidationResult {
  const checks: string[] = [];
  const issues: string[] = [];

  checks.push("✅ Workspace file exists");
  checks.push(`✅ Version: ${workspace.version}`);
  checks.push(`✅ Host type: ${workspace.hostType}`);
  checks.push(`✅ Addon name: ${workspace.addonName}`);

  const featureCount = workspace.features.length;
  const totalGeneratedFiles = workspace.features.reduce(
    (sum, f) => sum + f.generatedFiles.length,
    0
  );
  const bridgePointCount = workspace.features.reduce(
    (sum, f) => sum + f.entryBindings.length,
    0
  );

  checks.push(`✅ Features: ${featureCount}`);
  checks.push(`✅ Total generated files: ${totalGeneratedFiles}`);
  checks.push(`✅ Bridge points: ${bridgePointCount}`);

  const featureIds = new Set<string>();
  for (const feature of workspace.features) {
    if (featureIds.has(feature.featureId)) {
      issues.push(`Duplicate feature ID: ${feature.featureId}`);
    }
    featureIds.add(feature.featureId);

    if (feature.generatedFiles.length === 0) {
      checks.push(`⚠️  Feature '${feature.featureId}' has no generated files`);
    }
  }

  return {
    valid: issues.length === 0,
    checks,
    issues,
    details: {
      fileExists: true,
      featureCount,
      totalGeneratedFiles,
      bridgePointCount,
    },
  };
}

function validateWorkspaceStructure(workspace: unknown): workspace is RuneWeaverWorkspace {
  if (typeof workspace !== "object" || workspace === null) {
    return false;
  }

  const w = workspace as Record<string, unknown>;

  return (
    typeof w.version === "string" &&
    typeof w.hostType === "string" &&
    typeof w.hostRoot === "string" &&
    typeof w.addonName === "string" &&
    typeof w.initializedAt === "string" &&
    Array.isArray(w.features)
  );
}

/**
 * Normalize workspace to ensure all required fields exist
 * 
 * This handles migration from older workspace formats by:
 * - Adding missing fields with sensible defaults
 * - Ensuring feature records have all required fields
 */
function normalizeWorkspace(rawWorkspace: unknown): RuneWeaverWorkspace {
  const raw = rawWorkspace as Record<string, unknown>;

  const workspace: RuneWeaverWorkspace = {
    version: (raw.version as string) || CURRENT_VERSION,
    hostType: typeof raw.hostType === "string" ? raw.hostType : UNKNOWN_HOST_KIND,
    hostRoot: (raw.hostRoot as string) || "",
    addonName: (raw.addonName as string) || "",
    mapName: (raw.mapName as string) || undefined,
    initializedAt: (raw.initializedAt as string) || new Date().toISOString(),
    features: [],
  };

  // Normalize features
  const rawFeatures = (raw.features as Array<unknown>) || [];
  workspace.features = rawFeatures.map((rawFeature) => normalizeFeature(rawFeature));

  return workspace;
}

/**
 * Normalize a feature record to ensure all required fields exist
 */
function normalizeFeature(rawFeature: unknown): RuneWeaverFeatureRecord {
  const raw = rawFeature as Record<string, unknown>;
  const now = new Date().toISOString();
  const generatedFiles = ((raw.generatedFiles as string[]) || []).filter((file): file is string => typeof file === "string");
  const ownedArtifacts = normalizeOwnedArtifacts(raw.ownedArtifacts);
  const sourceModel = normalizeSourceModelRef(raw.sourceModel);
  const featureAuthoring = normalizeFeatureAuthoring(raw.featureAuthoring);
  const modules = normalizeModuleImplementationRecords(raw.modules, raw);
  const lifecycle = deriveFeatureLifecycleFromModules({
    modules,
    priorCommitDecision: normalizeCommitDecision(raw.commitDecision),
  });

  return {
    featureId: (raw.featureId as string) || "",
    intentKind: (raw.intentKind as string) || "unknown",
    status:
      raw.status === "active"
      || raw.status === "disabled"
      || raw.status === "archived"
      || raw.status === "rolled_back"
        ? raw.status
        : "active",
    revision: (raw.revision as number) || 1,
    blueprintId: (raw.blueprintId as string) || "",
    modules,
    selectedPatterns: (raw.selectedPatterns as string[]) || [],
    generatedFiles,
    ownedArtifacts,
    entryBindings: normalizeEntryBindings(raw.entryBindings, generatedFiles),
    sourceModel,
    featureAuthoring,
    integrationPoints: (raw.integrationPoints as string[]) || undefined,
    gapFillBoundaries: (raw.gapFillBoundaries as string[]) || undefined,
    dependsOn: (raw.dependsOn as string[]) || undefined,
    maturity: lifecycle.maturity,
    implementationStrategy: lifecycle.implementationStrategy,
    featureContract: normalizeFeatureContract(raw.featureContract),
    validationStatus: normalizeValidationStatus(raw.validationStatus),
    dependencyEdges: normalizeFeatureDependencyEdges(raw.dependencyEdges),
    commitDecision: lifecycle.commitDecision ?? undefined,
    createdAt: (raw.createdAt as string) || now,
    updatedAt: (raw.updatedAt as string) || now,
  };
}

function normalizeModuleImplementationRecords(
  rawModules: unknown,
  rawFeature: Record<string, unknown>,
): ModuleImplementationRecord[] {
  if (Array.isArray(rawModules)) {
    const normalized = rawModules
      .map((rawModule) => normalizeModuleImplementationRecord(rawModule))
      .filter((module): module is ModuleImplementationRecord => Boolean(module));
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [inferLegacyModuleRecord(rawFeature)];
}

function normalizeFeatureAuthoring(rawFeatureAuthoring: unknown): RuneWeaverFeatureRecord["featureAuthoring"] {
  if (!rawFeatureAuthoring || typeof rawFeatureAuthoring !== "object") {
    return undefined;
  }

  const raw = rawFeatureAuthoring as Record<string, unknown>;
  if (
    raw.mode !== "source-backed" ||
    raw.profile !== "selection_pool" ||
    !raw.parameters ||
    typeof raw.parameters !== "object" ||
    !raw.parameterSurface ||
    typeof raw.parameterSurface !== "object"
  ) {
    return undefined;
  }

  return rawFeatureAuthoring as RuneWeaverFeatureRecord["featureAuthoring"];
}

function normalizeFeatureMaturity(rawMaturity: unknown): RuneWeaverFeatureRecord["maturity"] {
  switch (rawMaturity) {
    case "exploratory":
    case "stabilized":
    case "templated":
      return rawMaturity;
    default:
      return undefined;
  }
}

function normalizeImplementationStrategy(
  rawStrategy: unknown,
): RuneWeaverFeatureRecord["implementationStrategy"] {
  switch (rawStrategy) {
    case "family":
    case "pattern":
    case "guided_native":
    case "exploratory":
      return rawStrategy;
    default:
      return undefined;
  }
}

function normalizeFeatureContract(
  rawFeatureContract: unknown,
): RuneWeaverFeatureRecord["featureContract"] {
  if (!rawFeatureContract || typeof rawFeatureContract !== "object") {
    return undefined;
  }

  const raw = rawFeatureContract as Record<string, unknown>;
  const exports = normalizeContractSurfaces(raw.exports);
  const consumes = normalizeContractSurfaces(raw.consumes);
  const integrationSurfaces = normalizeStringArray(raw.integrationSurfaces);
  const stateScopes = normalizeStateScopes(raw.stateScopes);

  return {
    exports,
    consumes,
    integrationSurfaces,
    stateScopes,
  };
}

function normalizeValidationStatus(
  rawValidationStatus: unknown,
): RuneWeaverFeatureRecord["validationStatus"] {
  if (!rawValidationStatus || typeof rawValidationStatus !== "object") {
    return undefined;
  }

  const raw = rawValidationStatus as Record<string, unknown>;
  const status =
    raw.status === "unvalidated"
    || raw.status === "passed"
    || raw.status === "needs_review"
    || raw.status === "failed"
      ? raw.status
      : "unvalidated";

  return {
    status,
    warnings: normalizeStringArray(raw.warnings),
    blockers: normalizeStringArray(raw.blockers),
    lastValidatedAt:
      typeof raw.lastValidatedAt === "string" && raw.lastValidatedAt.length > 0
        ? raw.lastValidatedAt
        : undefined,
    blueprint: normalizeValidationStageStatus(raw.blueprint),
    repair: normalizeValidationStageStatus(raw.repair),
    dependency: normalizeValidationStageStatus(raw.dependency),
    host: normalizeValidationStageStatus(raw.host),
    runtime: normalizeValidationStageStatus(raw.runtime),
  };
}

function normalizeFeatureDependencyEdges(
  rawDependencyEdges: unknown,
): RuneWeaverFeatureRecord["dependencyEdges"] {
  if (!Array.isArray(rawDependencyEdges)) {
    return undefined;
  }

  const edges: NonNullable<RuneWeaverFeatureRecord["dependencyEdges"]> = rawDependencyEdges
    .filter((edge): edge is Record<string, unknown> => Boolean(edge) && typeof edge === "object")
    .map((edge) => {
      const relation: NonNullable<RuneWeaverFeatureRecord["dependencyEdges"]>[number]["relation"] | undefined =
        edge.relation === "reads"
        || edge.relation === "writes"
        || edge.relation === "triggers"
        || edge.relation === "grants"
        || edge.relation === "syncs_with"
          ? edge.relation
          : undefined;
      if (!relation) {
        return undefined;
      }

      return {
        relation,
        targetFeatureId:
          typeof edge.targetFeatureId === "string" && edge.targetFeatureId.length > 0
            ? edge.targetFeatureId
            : undefined,
        targetSurfaceId:
          typeof edge.targetSurfaceId === "string" && edge.targetSurfaceId.length > 0
            ? edge.targetSurfaceId
            : undefined,
        required: edge.required === true ? true : undefined,
        summary:
          typeof edge.summary === "string" && edge.summary.length > 0
            ? edge.summary
            : undefined,
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

  return edges.length > 0 ? edges : undefined;
}

function normalizeCommitDecision(
  rawCommitDecision: unknown,
): RuneWeaverFeatureRecord["commitDecision"] {
  if (!rawCommitDecision || typeof rawCommitDecision !== "object") {
    return undefined;
  }

  const raw = rawCommitDecision as Record<string, unknown>;
  const outcome =
    raw.outcome === "committable"
    || raw.outcome === "exploratory"
    || raw.outcome === "blocked"
      ? raw.outcome
      : undefined;
  if (!outcome) {
    return undefined;
  }

  return {
    outcome,
    canAssemble: raw.canAssemble === true,
    canWriteHost: raw.canWriteHost === true,
    requiresReview: raw.requiresReview === true,
    reasons: normalizeStringArray(raw.reasons),
    stage:
      raw.stage === "blueprint" || raw.stage === "final"
        ? raw.stage
        : undefined,
    impactedFeatures: normalizeStringArray(raw.impactedFeatures),
    dependencyBlockers: normalizeStringArray(raw.dependencyBlockers),
    downgradedFeatures: normalizeStringArray(raw.downgradedFeatures),
  };
}

function normalizeValidationStageStatus(
  rawStageStatus: unknown,
): NonNullable<RuneWeaverFeatureRecord["validationStatus"]>["blueprint"] | undefined {
  if (!rawStageStatus || typeof rawStageStatus !== "object") {
    return undefined;
  }

  const raw = rawStageStatus as Record<string, unknown>;
  const status =
    raw.status === "unvalidated"
    || raw.status === "passed"
    || raw.status === "needs_review"
    || raw.status === "failed"
      ? raw.status
      : undefined;

  if (!status) {
    return undefined;
  }

  return {
    status,
    warnings: normalizeStringArray(raw.warnings),
    blockers: normalizeStringArray(raw.blockers),
    summary:
      typeof raw.summary === "string" && raw.summary.length > 0
        ? raw.summary
        : undefined,
    checkedAt:
      typeof raw.checkedAt === "string" && raw.checkedAt.length > 0
        ? raw.checkedAt
        : undefined,
  };
}

function normalizeContractSurfaces(value: unknown): Array<{
  id: string;
  kind: "event" | "data" | "capability" | "state" | "integration";
  summary: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const summary = typeof item.summary === "string" ? item.summary : "";
      const kind: "event" | "data" | "capability" | "state" | "integration" | undefined =
        item.kind === "event"
        || item.kind === "data"
        || item.kind === "capability"
        || item.kind === "state"
        || item.kind === "integration"
          ? item.kind
          : undefined;

      if (!id || !summary || !kind) {
        return undefined;
      }

      return { id, kind, summary };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function normalizeStateScopes(value: unknown): Array<{
  stateId: string;
  scope: "local" | "session" | "persistent";
  owner: "feature" | "shared" | "external";
  summary?: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const stateId = typeof item.stateId === "string" ? item.stateId : "";
      const scope: "local" | "session" | "persistent" | undefined =
        item.scope === "local" || item.scope === "session" || item.scope === "persistent"
          ? item.scope
          : undefined;
      const owner: "feature" | "shared" | "external" | undefined =
        item.owner === "feature" || item.owner === "shared" || item.owner === "external"
          ? item.owner
          : undefined;

      if (!stateId || !scope || !owner) {
        return undefined;
      }

      return {
        stateId,
        scope,
        owner,
        summary:
          typeof item.summary === "string" && item.summary.length > 0
            ? item.summary
            : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

/**
 * Normalize entry bindings to ensure correct structure
 */
function normalizeEntryBindings(rawBindings: unknown, generatedFiles: string[]): EntryBinding[] {
  const bindings = (rawBindings as Array<unknown>) || [];
  const normalized = bindings.map((rawBinding) => {
    const raw = rawBinding as Record<string, unknown>;
    return {
      target: (raw.target as "server" | "ui" | "config") || "server",
      file: (raw.file as string) || "",
      kind: (raw.kind as "import" | "register" | "mount" | "append_index") || "import",
    };
  });

  const bridged = toKnownBridgeBindings(normalized);
  if (bridged.length > 0) {
    return bridged;
  }

  return inferBridgeBindingsFromGeneratedFiles(generatedFiles);
}

function normalizeSourceModelRef(rawSourceModel: unknown): FeatureSourceModelRef | undefined {
  if (!rawSourceModel || typeof rawSourceModel !== "object") {
    return undefined;
  }

  const raw = rawSourceModel as Record<string, unknown>;
  if (
    typeof raw.adapter !== "string" ||
    typeof raw.version !== "number" ||
    typeof raw.path !== "string"
  ) {
    return undefined;
  }

  return {
    adapter: raw.adapter,
    version: raw.version,
    path: raw.path,
  };
}

function normalizeOwnedArtifacts(rawOwnedArtifacts: unknown): FeatureOwnedArtifact[] | undefined {
  if (!Array.isArray(rawOwnedArtifacts)) {
    return undefined;
  }

  const artifacts = rawOwnedArtifacts
    .filter((artifact): artifact is Record<string, unknown> => Boolean(artifact) && typeof artifact === "object")
    .map((artifact) => {
      const path = typeof artifact.path === "string" && artifact.path.length > 0
        ? artifact.path
        : undefined;
      if (!path) {
        return undefined;
      }

      switch (artifact.kind) {
        case "generated_file":
          return {
            kind: "generated_file",
            path,
          } satisfies FeatureOwnedArtifact;
        case "rw_source_model":
          return {
            kind: "rw_source_model",
            path,
            adapter: typeof artifact.adapter === "string" && artifact.adapter.length > 0
              ? artifact.adapter
              : undefined,
            version: typeof artifact.version === "number" ? artifact.version : undefined,
          } satisfies FeatureOwnedArtifact;
        case "ability_kv_fragment":
          if (
            typeof artifact.aggregateTargetPath !== "string"
            || artifact.aggregateTargetPath.length === 0
            || typeof artifact.abilityName !== "string"
            || artifact.abilityName.length === 0
            || typeof artifact.scriptFile !== "string"
            || artifact.scriptFile.length === 0
            || artifact.managedBy !== "dota2-ability-kv-aggregate"
          ) {
            return undefined;
          }
          return {
            kind: "ability_kv_fragment",
            path,
            aggregateTargetPath: artifact.aggregateTargetPath,
            abilityName: artifact.abilityName,
            scriptFile: artifact.scriptFile,
            managedBy: artifact.managedBy,
          } satisfies FeatureOwnedArtifact;
        case "materialized_aggregate":
          if (artifact.managedBy !== "dota2-ability-kv-aggregate") {
            return undefined;
          }
          return {
            kind: "materialized_aggregate",
            path,
            managedBy: artifact.managedBy,
          } satisfies FeatureOwnedArtifact;
        default:
          return undefined;
      }
    })
    .filter((artifact): artifact is FeatureOwnedArtifact => Boolean(artifact));

  return artifacts.length > 0 ? artifacts : undefined;
}

/**
 * 提取真实的 bridge/entry 绑定
 * 
 * 根据 WORKSPACE-MODEL.md，entryBindings 应该记录：
 * - 宿主入口文件（bridge points）
 * - 而不是 generated files
 * 
 * 允许的 bridge points：
 * - game/scripts/src/modules/index.ts (server bridge)
 * - content/panorama/src/hud/script.tsx (ui bridge)
 */
export function extractEntryBindings(
  bridgeUpdates: Array<{ target: string; file: string; action: string }> | undefined
): EntryBinding[] {
  const bindings: EntryBinding[] = [];
  for (const update of bridgeUpdates || []) {
    if (update.action !== "inject_once") {
      continue;
    }

    if (update.file === "game/scripts/src/modules/index.ts") {
      bindings.push({
        target: "server",
        file: update.file,
        kind: "import",
      });
    } else if (update.file === "content/panorama/src/hud/script.tsx") {
      bindings.push({
        target: "ui",
        file: update.file,
        kind: "mount",
      });
    }
  }

  return dedupeBindings(bindings);
}

function toKnownBridgeBindings(bindings: EntryBinding[]): EntryBinding[] {
  const known = bindings.filter((binding) =>
    binding.file === "game/scripts/src/modules/index.ts" ||
    binding.file === "content/panorama/src/hud/script.tsx"
  );

  return dedupeBindings(
    known.map((binding) => {
      if (binding.file === "game/scripts/src/modules/index.ts") {
        return { target: "server", file: binding.file, kind: "import" as const };
      }
      return { target: "ui", file: binding.file, kind: "mount" as const };
    })
  );
}

function inferBridgeBindingsFromGeneratedFiles(generatedFiles: string[]): EntryBinding[] {
  const bindings: EntryBinding[] = [];

  if (generatedFiles.some((file) => file.startsWith("game/scripts/src/rune_weaver/"))) {
    bindings.push({
      target: "server",
      file: "game/scripts/src/modules/index.ts",
      kind: "import",
    });
  }

  if (generatedFiles.some((file) => file.startsWith("content/panorama/src/rune_weaver/"))) {
    bindings.push({
      target: "ui",
      file: "content/panorama/src/hud/script.tsx",
      kind: "mount",
    });
  }

  return bindings;
}

function dedupeBindings(bindings: EntryBinding[]): EntryBinding[] {
  const seen = new Set<string>();
  const deduped: EntryBinding[] = [];

  for (const binding of bindings) {
    const key = `${binding.target}:${binding.file}:${binding.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(binding);
  }

  return deduped;
}

export function rollbackFeatureInWorkspace(
  workspace: RuneWeaverWorkspace,
  featureId: string
): RuneWeaverWorkspace {
  const existing = findFeatureById(workspace, featureId);
  if (!existing) {
    throw new Error(`Feature '${featureId}' does not exist in workspace`);
  }

  const now = new Date().toISOString();

  const rolledBackFeature: RuneWeaverFeatureRecord = {
    ...existing,
    status: "rolled_back",
    generatedFiles: [],
    ownedArtifacts: [],
    entryBindings: [],
    updatedAt: now,
  };

  return {
    ...workspace,
    features: workspace.features.map((feature) =>
      feature.featureId === featureId ? rolledBackFeature : feature
    ),
  };
}

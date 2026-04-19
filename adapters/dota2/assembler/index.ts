/**
 * Dota2 Adapter - Assembler
 *
 * 将 AssemblyPlan 转换为 Write Plan
 * 目标目录对齐 x-template 源码结构：
 * - game/scripts/src/rune_weaver/
 * - content/panorama/src/rune_weaver/
 */

import { posix as pathPosix } from "path";

import { AssemblyPlan, GeneratorRoutingPlan, HostRealizationPlan, ModuleSourceKind, SelectedPattern, SynthesizedArtifact } from "../../../core/schema/types";
import {
  calculateHostWriteExecutionOrder,
  type HostWriteOperation,
  type HostWritePlan,
  type HostWritePlanEntry,
} from "../../../core/host/write-plan.js";
import type {
  HostRealizationContext,
  HostRealizationContextUnit,
  HostRouteContext,
  HostRouteContextUnit,
} from "../../../core/host/routing.js";
import { getPatternMeta } from "../patterns";
import { getPatternRouteKinds } from "../../../core/patterns/canonical-patterns.js";
import { appendSelectionPoolSourceModelEntry } from "../families/selection-pool/index.js";

/**
 * T112-R2: Generator family hint for transitional routing
 * Indicates which generator family should handle this entry
 */
export type GeneratorFamilyHint = "dota2-ts" | "dota2-ui" | "dota2-kv" | "dota2-lua" | "bridge-support";

/**
 * 写入操作类型
 */
export type WriteOperation = HostWriteOperation;

/**
 * 文件写入条目
 */
export interface WritePlanEntry extends HostWritePlanEntry {
  /** T112-R2: Generator family hint for transitional routing */
  generatorFamilyHint?: GeneratorFamilyHint;
  /** Marks entry as deferred by route or realization blockers */
  deferred?: boolean;
  /** T112-R2: Reason for deferral if applicable */
  deferredReason?: string;
  /**
   * T125-R1: Optional metadata for generator-specific config.
   * For lua contentType, supports:
   *   - abilityName: string
   *   - modifierConfig: AbilityModifierConfig
   *   - onSpellStart: string
   *   - additionalMethods: string
   */
  metadata?: Record<string, any>;
}

/**
 * 写入计划
 */
export interface WritePlan extends HostWritePlan {
  namespaceRoots: {
    server: string;
    panorama: string;
  };
  entries: WritePlanEntry[];
  /** T115: Route context from routing stage (primary for T115+) */
  routeContext?: RouteContext;
  /** T112-R1: Realization context (backward compatible) */
  realizationContext?: RealizationContext;
  /** Warnings for deferred entries */
  deferredWarnings?: string[];
}

/**
 * Rune Weaver 命名空间配置
 */
const RUNE_WEAVER_NAMESPACE = {
  /** 服务端命名空间 */
  server: {
    root: "game/scripts/src/rune_weaver",
    generated: "game/scripts/src/rune_weaver/generated",
    serverSpecific: "game/scripts/src/rune_weaver/generated/server",
    shared: "game/scripts/src/rune_weaver/generated/shared",
  },
  /** Panorama 命名空间 */
  panorama: {
    root: "content/panorama/src/rune_weaver",
    generated: "content/panorama/src/rune_weaver/generated",
    ui: "content/panorama/src/rune_weaver/generated/ui",
  },
};

/**
 * Normalize route hostTarget to patternMeta.hostTarget format
 * Maps routing stage hostTarget values to namespace path keys
 */
function normalizeHostTarget(
  routeHostTarget: string
): "dota2.server" | "dota2.panorama" | "dota2.shared" | "dota2.config" {
  const mapping: Record<string, "dota2.server" | "dota2.panorama" | "dota2.shared" | "dota2.config"> = {
    "shared_ts": "dota2.shared",
    "server_shared_ts": "dota2.shared",
    "server_ts": "dota2.server",
    "modifier_ts": "dota2.server",
    "panorama_tsx": "dota2.panorama",
    "panorama_less": "dota2.panorama",
    "kv": "dota2.config",
    "modifier_kv": "dota2.config",
    "ability_kv": "dota2.config",
    "lua_ability": "dota2.server",
  };
  return mapping[routeHostTarget] || "dota2.server";
}

/**
 * 宿主目标到命名空间的映射
 */
function getNamespacePath(
  hostTarget: "dota2.server" | "dota2.panorama" | "dota2.shared" | "dota2.config",
  featureId: string,
  contentType: string
): string {
  // T118: Special handling for KV content type
  if (contentType === "kv") {
    return `game/scripts/npc/npc_abilities_custom.txt`;
  }

  // T125-R1: Lua ability/modifier files go to vscripts directory
  if (contentType === "lua") {
    return `game/scripts/vscripts/rune_weaver/abilities/${featureId}.lua`;
  }

  switch (hostTarget) {
    case "dota2.server":
      return `${RUNE_WEAVER_NAMESPACE.server.serverSpecific}/${featureId}.ts`;
    case "dota2.shared":
      return `${RUNE_WEAVER_NAMESPACE.server.shared}/${featureId}.ts`;
    case "dota2.panorama":
      if (contentType === "less" || contentType === "css") {
        return `${RUNE_WEAVER_NAMESPACE.panorama.ui}/${featureId}.less`;
      }
      return `${RUNE_WEAVER_NAMESPACE.panorama.ui}/${featureId}.tsx`;
    case "dota2.config":
      // 配置文件暂时放在 npc 目录
      return `game/scripts/npc/rune_weaver_${featureId}.kv`;
    default:
      return `${RUNE_WEAVER_NAMESPACE.server.generated}/${featureId}.ts`;
  }
}

/**
 * Generate Write Plan (formerly generateWritePlan)
 * T115: Now route-aware, consumes GeneratorRoutingPlan as execution input
 *
 * @param plan AssemblyPlan
 * @param projectPath Target project path
 * @param featureId Feature identifier
 * @param routingPlan GeneratorRoutingPlan from routing stage (optional for transitional compatibility)
 * @param hostRealizationPlan HostRealizationPlan (kept for backward compatibility)
 */
export function createWritePlan(
  plan: AssemblyPlan,
  projectPath: string = "D:\\test1",
  featureId?: string,
  routingPlan?: GeneratorRoutingPlan,
  hostRealizationPlan?: HostRealizationPlan
): WritePlan {
  const entries: WritePlanEntry[] = [];
  const generatedFeatureId = featureId || plan.blueprintId;

  // T115: Route-aware context for downstream consumption
  // If routingPlan is provided, use it as the primary decision source
  const routeContext: RouteContext | undefined = routingPlan
    ? createRouteContext(routingPlan, hostRealizationPlan)
    : undefined;

  // T112-R1: Keep realization context for backward compatibility if no routing plan
  const realizationContext: RealizationContext | undefined = (!routeContext && hostRealizationPlan)
    ? createRealizationContext(hostRealizationPlan)
    : undefined;

  // T138-R1: Extract ability parameters from AssemblyPlan for KV generation
  const abilityParams = plan.parameters || {};

  for (const binding of plan.selectedPatterns) {
    const patternMeta = getPatternMeta(binding.patternId);
    if (!patternMeta) continue;

    const patternEntries = generateEntriesForPattern(
      binding,
      patternMeta,
      generatedFeatureId,
      routeContext,
      realizationContext,
      abilityParams
    );
    entries.push(...patternEntries);
  }

  if (plan.synthesizedArtifacts && plan.synthesizedArtifacts.length > 0) {
    entries.push(...generateEntriesForSynthesizedArtifacts(plan.synthesizedArtifacts));
  }

  appendInputKeyBindingEmitterEntries(entries);
  applyResourceCostHonestyDeferrals(entries);
  applyResourceCostComposition(entries);
  applyResourceCostCallerInvocation(entries);

  // 提取集成点
  const integrationPoints: string[] = [];
  for (const binding of plan.selectedPatterns) {
    // 从 key_binding pattern 中提取 triggerKey
    const triggerKey = binding.parameters?.triggerKey || binding.parameters?.key;
    if (binding.patternId === "input.key_binding" && triggerKey) {
      integrationPoints.push(`input.key_binding:${triggerKey}`);
    }
  }

  const writePlan: WritePlan = {
    id: `writeplan_${plan.blueprintId}_${Date.now()}`,
    targetProject: projectPath,
    generatedAt: new Date().toISOString(),
    namespaceRoots: {
      server: RUNE_WEAVER_NAMESPACE.server.root,
      panorama: RUNE_WEAVER_NAMESPACE.panorama.root,
    },
    entries,
    integrationPoints,
    stats: {
      total: entries.length,
      create: entries.filter((e) => e.operation === "create").length,
      update: entries.filter((e) => e.operation === "update").length,
      conflicts: entries.filter(
        (e) => !e.safe || (e.conflicts && e.conflicts.length > 0)
      ).length,
      deferred: entries.filter((e) => e.deferred).length,
    },
    executionOrder: calculateExecutionOrder(entries),
    readyForHostWrite: plan.readyForHostWrite,
    readinessBlockers: plan.hostWriteReadiness?.blockers,
    // T115: Attach route context if available (primary path for T115+)
    routeContext,
    // T112-R1: Keep realization context for backward compatibility
    // This marks the write plan as "realization-aware" even if generator is still transitional
    realizationContext,
    // T112-R2: Capture deferred warnings for unsupported KV paths
    deferredWarnings: entries
      .filter((e) => e.deferred && e.deferredReason)
      .map((e) => `[${e.sourcePattern}] ${e.deferredReason}`),
  };

  appendSelectionPoolSourceModelEntry(
    writePlan,
    generatedFeatureId,
    plan.featureAuthoring,
  );
  writePlan.executionOrder = calculateExecutionOrder(writePlan.entries);
  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((e) => e.operation === "create").length,
    update: writePlan.entries.filter((e) => e.operation === "update").length,
    conflicts: writePlan.entries.filter(
      (e) => !e.safe || (e.conflicts && e.conflicts.length > 0)
    ).length,
    deferred: writePlan.entries.filter((e) => e.deferred).length,
  };

  return writePlan;
}

function generatorFamilyFromSynthesizedArtifact(
  artifact: SynthesizedArtifact,
): GeneratorFamilyHint {
  switch (artifact.outputKind) {
    case "kv":
      return "dota2-kv";
    case "ui":
      return "dota2-ui";
    case "lua":
      return "dota2-lua";
    case "bridge":
      return "bridge-support";
    default:
      return "dota2-ts";
  }
}

function generateEntriesForSynthesizedArtifacts(
  artifacts: SynthesizedArtifact[],
): WritePlanEntry[] {
  return artifacts.map((artifact) => ({
    operation: "create",
    targetPath: artifact.targetPath,
    contentType: artifact.contentType,
    contentSummary: artifact.summary,
    sourcePattern: `synthesized.${artifact.moduleId}.${artifact.outputKind}`,
    sourceModule: artifact.moduleId,
    safe: true,
    generatorFamilyHint: generatorFamilyFromSynthesizedArtifact(artifact),
    metadata: {
      ...(artifact.metadata || {}),
      bundleId: artifact.bundleId,
      sourceKind: artifact.sourceKind,
      synthesizedArtifactId: artifact.id,
      synthesizedContent: artifact.content,
    },
  }));
}

function appendInputKeyBindingEmitterEntries(entries: WritePlanEntry[]): void {
  const emitterEntries: WritePlanEntry[] = [];

  for (const entry of entries) {
    if (entry.sourcePattern !== "input.key_binding") {
      continue;
    }

    if (!isPrimaryRuntimeEntry(entry)) {
      continue;
    }

    if (
      !entry.targetPath.startsWith(`${RUNE_WEAVER_NAMESPACE.server.serverSpecific}/`) ||
      !entry.targetPath.endsWith(".ts")
    ) {
      continue;
    }

    const fileName = entry.targetPath.split("/").pop()?.replace(/\.ts$/i, "");
    if (!fileName) {
      continue;
    }

    const emitterTargetPath = `${RUNE_WEAVER_NAMESPACE.panorama.ui}/${fileName}_emitter.tsx`;
    if (entries.some((candidate) => candidate.targetPath === emitterTargetPath)) {
      continue;
    }

    emitterEntries.push({
      ...entry,
      targetPath: emitterTargetPath,
      contentType: "tsx",
      contentSummary: `${entry.contentSummary} [ui-emitter]`,
      generatorFamilyHint: "dota2-ui",
      metadata: {
        ...(entry.metadata || {}),
        inputEmitter: true,
      },
    });
  }

  entries.push(...emitterEntries);
}

/**
 * T115: Route Context
 * Encapsulates GeneratorRoutingPlan data for route-aware write plan generation.
 * This is the primary interface for T115+ routing consumption.
 */
export interface RouteContext extends HostRouteContext {
  routes: RouteContextUnit[];
}

export interface RouteContextUnit extends HostRouteContextUnit {
  // T143: Added dota2-lua for formal lua routing
  sourceKind: ModuleSourceKind;
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "dota2-lua" | "bridge-support";
  routeKind: "kv" | "ts" | "ui" | "lua" | "bridge";
}

/**
 * T115: Create RouteContext from GeneratorRoutingPlan
 * Cross-references with HostRealizationPlan to get real sourcePatternIds
 */
function createRouteContext(
  plan: GeneratorRoutingPlan,
  hostRealizationPlan?: HostRealizationPlan
): RouteContext {
  // Build a map from unitId to sourcePatternIds from the realization plan
  const unitToPatterns = new Map<string, string[]>();
  if (hostRealizationPlan) {
    for (const unit of hostRealizationPlan.units) {
      unitToPatterns.set(unit.id, unit.sourcePatternIds);
    }
  }

  return {
    version: plan.version,
    host: plan.host,
    sourceBlueprintId: plan.sourceBlueprintId,
    routes: plan.routes.map(r => ({
      id: r.id,
      sourceUnitId: r.sourceUnitId,
      sourceKind: r.sourceKind,
      generatorFamily: r.generatorFamily,
      routeKind: r.routeKind,
      hostTarget: r.hostTarget,
      sourcePatternIds: unitToPatterns.get(r.sourceUnitId) || [],
      parameters: r.parameters,
      blocked: !!(r.blockers && r.blockers.length > 0),
    })),
  };
}

/**
 * T112-R1: Realization Context
 * Encapsulates HostRealizationPlan data for downstream generator consumption.
 * This is the transitional interface before formal GeneratorRoutingPlan exists.
 */
export interface RealizationContext extends HostRealizationContext {
  units: RealizationContextUnit[];
}

export interface RealizationContextUnit extends HostRealizationContextUnit {
  sourceKind: ModuleSourceKind;
  realizationType: string;
}

/**
 * T112-R1: Create RealizationContext from HostRealizationPlan
 * This transforms the full realization plan into a consumer-friendly context.
 */
function createRealizationContext(plan: HostRealizationPlan): RealizationContext {
  return {
    version: plan.version,
    host: plan.host,
    sourceBlueprintId: plan.sourceBlueprintId,
    units: plan.units.map((u) => ({
      id: u.id,
      sourcePatternIds: u.sourcePatternIds,
      sourceKind: u.sourceKind,
      realizationType: u.realizationType,
      hostTargets: u.hostTargets,
      confidence: u.confidence,
    })),
    isFallback: plan.units.every((u) => u.confidence === "low"),
  };
}

/**
 * T112-R2: Find the realization unit that matches this binding's pattern
 * Returns the unit whose sourcePatternIds include this binding's patternId
 */
function findMatchingRealizationUnit(
  binding: SelectedPattern,
  realizationContext?: RealizationContext
): RealizationContextUnit | undefined {
  if (!realizationContext?.units) return undefined;

  return realizationContext.units.find((unit) =>
    unit.sourcePatternIds.includes(binding.patternId)
  );
}

/**
 * T115: Find the route that matches this binding's pattern
 * T143-R2: Now uses outputType for multi-output patterns (kv+lua, kv+ts)
 * to match the correct route side instead of first pattern match
 */
function findMatchingRoute(
  binding: SelectedPattern,
  routeContext: RouteContext,
  outputType?: string
): RouteContextUnit | undefined {
  // T143-R2: First try pattern + outputType match for multi-output patterns
  if (outputType) {
    const outputTypeToRouteKind: Record<string, string> = {
      "typescript": "ts",
      "kv": "kv",
      "lua": "lua",
      "ui": "ui",
      "tsx": "ui",
      "less": "ui",
      "json": "kv",
    };
    const targetRouteKind = outputTypeToRouteKind[outputType];
    
    if (targetRouteKind) {
      const matchByOutputType = routeContext.routes.find(r =>
        r.sourcePatternIds.includes(binding.patternId) && r.routeKind === targetRouteKind
      );
      if (matchByOutputType) {
        return matchByOutputType;
      }
    }
  }

  // T115-R1: Fallback to exact pattern match
  const exactMatch = routeContext.routes.find(r =>
    r.sourcePatternIds.includes(binding.patternId)
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Fallback: If no exact match, use heuristic based on routeKind
  // This handles cases where patterns aren't directly mapped to routes yet
  const routeKinds = new Set(getPatternRouteKinds(binding.patternId));

  if (routeKinds.has("ui")) {
    return routeContext.routes.find(r => r.routeKind === "ui" && !r.blocked)
      || routeContext.routes.find(r => r.routeKind === "ui");
  }

  if (routeKinds.has("lua")) {
    return routeContext.routes.find(r => r.routeKind === "lua" && !r.blocked)
      || routeContext.routes.find(r => r.routeKind === "lua");
  }

  if (routeKinds.has("kv")) {
    return routeContext.routes.find(r => r.routeKind === "kv")
      || routeContext.routes.find(r => r.routeKind === "ts");
  }

  if (routeKinds.has("bridge")) {
    return routeContext.routes.find(r => r.routeKind === "bridge" && !r.blocked)
      || routeContext.routes.find(r => r.routeKind === "bridge");
  }

  return routeContext.routes.find(r => r.routeKind === "ts" && !r.blocked)
    || routeContext.routes.find(r => r.routeKind === "ts");
}

/**
 * T112-R2: Determine generator family hint based on realization context
 * T118: Updated to properly handle KV family for kv+ts patterns
 */
function determineGeneratorFamilyHint(
  unit: RealizationContextUnit | undefined,
  patternMeta: ReturnType<typeof getPatternMeta>
): GeneratorFamilyHint | undefined {
  if (!unit) return undefined;

  // If realization says ui, use dota2-ui
  if (unit.realizationType === "ui") {
    return "dota2-ui";
  }

  // T143: If realization says lua, use dota2-lua
  if (unit.realizationType === "lua") {
    return "dota2-lua";
  }

  // T143-R1: If realization says kv+lua, determine based on pattern outputTypes
  if (unit.realizationType === "kv+lua") {
    // If pattern outputs lua type, it's lua side
    if (patternMeta?.outputTypes.includes("lua")) {
      return "dota2-lua";
    }
    // If pattern outputs KV type, it's KV side
    if (patternMeta?.outputTypes.includes("kv")) {
      return "dota2-kv";
    }
  }

  // If realization says kv or kv+ts
  if (unit.realizationType === "kv" || unit.realizationType === "kv+ts") {
    // If pattern outputs KV type, it should go to dota2-kv
    if (patternMeta?.outputTypes.includes("kv")) {
      return "dota2-kv";
    }
    // If pattern outputs TS, it's TS side
    if (patternMeta?.outputTypes.includes("typescript")) {
      return "dota2-ts";
    }
    // T143: If pattern outputs lua type, it should go to dota2-lua
    if (patternMeta?.outputTypes.includes("lua")) {
      return "dota2-lua";
    }
  }

  // Default to TS for gameplay patterns
  if (unit.realizationType === "ts" || unit.realizationType === "shared-ts") {
    return "dota2-ts";
  }

  return undefined;
}

/**
 * Check whether realization metadata requires deferring a specific output.
 * Current generalized routing treats KV as a first-class generator family.
 */
function shouldDeferKVRelated(
  unit: RealizationContextUnit | undefined,
  outputType: string
): { deferred: boolean; reason?: string } {
  if (!unit) return { deferred: false };

  // If output is KV type, it should NOT be deferred now that dota2-kv generator is implemented
  // The route will handle blockers based on the unit's inherent blockers
  if (outputType === "kv") {
    return { deferred: false };
  }

  // If realization type is "kv" alone and we're generating something that's not KV
  // This should not happen in practice since route matching should handle it
  if (unit.realizationType === "kv") {
    return { deferred: false };
  }

  // If realization type is "kv+ts" but we're generating non-TS/non-KV output
  // This is now handled by route matching - TS and KV routes are separate
  if (unit.realizationType === "kv+ts" && outputType !== "typescript") {
    return { deferred: false };
  }

  return { deferred: false };
}

function shouldElideBridgeSupportEntry(
  binding: SelectedPattern,
  generatorFamilyHint: GeneratorFamilyHint | undefined
): { deferred: boolean; reason?: string } {
  if (binding.patternId !== "integration.state_sync_bridge") {
    return { deferred: false };
  }

  if (generatorFamilyHint !== "bridge-support") {
    return { deferred: false };
  }

  return {
    deferred: true,
    reason:
      "Selection-state bridge output is intentionally elided: runtime/UI sync is already absorbed by the admitted selection flow, so no standalone bridge file is emitted.",
  };
}

function shouldDeferGenericModifierApplier(
  binding: SelectedPattern
): { deferred: boolean; reason?: string } {
  if (binding.patternId !== "effect.modifier_applier") {
    return { deferred: false };
  }

  return {
    deferred: true,
    reason:
      "effect.modifier_applier remains deferred: current lua/kv modifier generation is only honest for specialized same-file ability modifier slices such as dota2.short_time_buff, not broad generic modifier application.",
  };
}

function shouldDeferDashEffect(
  binding: SelectedPattern
): { deferred: boolean; reason?: string } {
  if (binding.patternId !== "effect.dash") {
    return { deferred: false };
  }

  return {
    deferred: true,
    reason:
      "effect.dash remains deferred: current dash realization/routing still implies a kv+ts ability shell and companion modifier surface, but write generation only produces nominal TS stubs and does not honestly materialize the required ability-shell + motion-modifier path yet.",
  };
}

function stringifyPatternScalar(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}

function resolveShortTimeBuffAbilityCooldown(
  binding: SelectedPattern,
  metadata?: Record<string, unknown>
): string | undefined {
  const bindingParameters = binding.parameters || {};

  return (
    stringifyPatternScalar(bindingParameters.cooldownSeconds) ||
    stringifyPatternScalar(bindingParameters.cooldown) ||
    stringifyPatternScalar(bindingParameters.abilityCooldown) ||
    stringifyPatternScalar(metadata?.abilityCooldown) ||
    stringifyPatternScalar(metadata?.cooldownSeconds) ||
    stringifyPatternScalar(metadata?.cooldown)
  );
}

function normalizeResourceIdentifier(value: unknown, fallback: string = "mana"): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase()
    : fallback;
}

function normalizeTriggerKey(value: unknown, fallback: string = "F4"): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toUpperCase()
    : fallback;
}

function toOptionalPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function resolveLinearProjectileConfig(
  binding: SelectedPattern,
  featureId: string,
  targetId: string
): {
  abilityName: string;
  projectileDistance: string;
  projectileSpeed: string;
  projectileRadius: string;
  scriptFile: string;
} | undefined {
  const bindingParameters = binding.parameters || {};
  const projectileDistance = toOptionalPositiveNumber(
    bindingParameters.projectileDistance ?? bindingParameters.distance
  );
  const projectileSpeed = toOptionalPositiveNumber(
    bindingParameters.projectileSpeed ?? bindingParameters.speed
  );
  const projectileRadius = toOptionalPositiveNumber(
    bindingParameters.projectileRadius ?? bindingParameters.radius
  );

  if (
    projectileDistance === undefined ||
    projectileSpeed === undefined ||
    projectileRadius === undefined
  ) {
    return undefined;
  }

  const abilityName = (bindingParameters.abilityName as string)
    || targetId.replace(/[^a-zA-Z0-9_]/g, "_");

  return {
    abilityName,
    projectileDistance: String(projectileDistance),
    projectileSpeed: String(projectileSpeed),
    projectileRadius: String(projectileRadius),
    scriptFile: `rune_weaver/abilities/${featureId}.lua`,
  };
}

function resolveExploratoryAbilityConfig(
  binding: SelectedPattern,
  targetId: string,
): {
  abilityName: string;
  scriptFile: string;
  abilityBehavior: string;
  onSpellStart: string;
  additionalMethods: string;
} {
  const bindingParameters = binding.parameters || {};
  const abilityName = (bindingParameters.abilityName as string)
    || targetId.replace(/[^a-zA-Z0-9_]/g, "_");
  const behaviorHint = (bindingParameters.exploratoryBehaviorHint as string) || "";
  const abilityBehavior =
    (bindingParameters.abilityBehavior as string)
    || mapExploratoryBehaviorHintToAbilityBehavior(behaviorHint);
  const exploratorySummary = stringifyExploratoryValue(
    bindingParameters.exploratoryGoal
      ?? bindingParameters.exploratoryIntentSummary
      ?? bindingParameters.summary,
  );
  const exploratoryCapabilities = normalizeExploratoryStringArray(
    bindingParameters.exploratoryCapabilities,
  );
  const capabilitySummary =
    exploratoryCapabilities.length > 0
      ? exploratoryCapabilities.join(", ")
      : "none captured";

  return {
    abilityName,
    scriptFile: `rune_weaver/abilities/${targetId}.lua`,
    abilityBehavior,
    onSpellStart: buildExploratoryAbilityOnSpellStart(
      abilityBehavior,
      exploratorySummary,
      capabilitySummary,
    ),
    additionalMethods: buildExploratoryAbilityAdditionalMethods(
      abilityName,
      exploratorySummary,
      capabilitySummary,
    ),
  };
}

function buildExploratoryAbilityOnSpellStart(
  abilityBehavior: string,
  summary: string,
  capabilitySummary: string,
): string {
  const targetPrelude =
    abilityBehavior === "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET"
      ? "    local target = self:GetCursorTarget()\n"
      : abilityBehavior === "DOTA_ABILITY_BEHAVIOR_POINT"
        ? "    local point = self:GetCursorPosition()\n"
        : "";

  return `    local caster = self:GetCaster()
${targetPrelude}    -- Exploratory scaffold generated by Rune Weaver V2.
    -- Intent: ${sanitizeLuaComment(summary)}
    -- Required capabilities: ${sanitizeLuaComment(capabilitySummary)}
    -- Replace this block with host-native gameplay logic for the feature.

    if not IsServer() then
        return
    end

    -- TODO: implement exploratory ability behavior here.`;
}

function buildExploratoryAbilityAdditionalMethods(
  abilityName: string,
  summary: string,
  capabilitySummary: string,
): string {
  return `
function ${abilityName}:DescribeExploratoryIntent()
    return "${escapeLuaString(`${summary} | capabilities: ${capabilitySummary}`)}"
end`;
}

function mapExploratoryBehaviorHintToAbilityBehavior(hint: string): string {
  switch (hint) {
    case "passive":
      return "DOTA_ABILITY_BEHAVIOR_PASSIVE";
    case "point_target":
      return "DOTA_ABILITY_BEHAVIOR_POINT";
    case "unit_target":
      return "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET";
    default:
      return "DOTA_ABILITY_BEHAVIOR_NO_TARGET";
  }
}

function normalizeExploratoryStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyExploratoryValue(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "Exploratory ability scaffold";
}

function sanitizeLuaComment(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/--/g, "").trim();
}

function escapeLuaString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildLinearProjectileOnSpellStart(): string {
  return `    local caster = self:GetCaster()
    local origin = caster:GetAbsOrigin()
    local direction = caster:GetForwardVector()

    ProjectileManager:CreateLinearProjectile({
        Ability = self,
        Source = caster,
        vSpawnOrigin = origin,
        fDistance = self:GetSpecialValueFor("projectile_distance") or 0,
        fStartRadius = self:GetSpecialValueFor("projectile_radius") or 0,
        fEndRadius = self:GetSpecialValueFor("projectile_radius") or 0,
        vVelocity = direction * (self:GetSpecialValueFor("projectile_speed") or 0),
        bHasFrontalCone = false,
        bReplaceExisting = false,
        bDeleteOnHit = true,
        iUnitTargetTeam = DOTA_UNIT_TARGET_TEAM_ENEMY,
        iUnitTargetType = DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BASIC,
        iUnitTargetFlags = DOTA_UNIT_TARGET_FLAG_NONE,
        bProvidesVision = false
    })`;
}

function buildLinearProjectileAdditionalMethods(abilityName: string): string {
  return `
function ${abilityName}.prototype.OnProjectileHit(self, target, location)
    return true
end
`;
}

function normalizeResourceFailBehavior(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase()
    : "block";
}

function appendContentSummaryTag(contentSummary: string, tag: string): string {
  return contentSummary.includes(tag) ? contentSummary : `${contentSummary} ${tag}`;
}

function markEntryDeferred(entry: WritePlanEntry, reason: string, tag: string): void {
  entry.deferred = true;
  entry.deferredReason = reason;
  entry.contentSummary = appendContentSummaryTag(entry.contentSummary, tag);
}

function ensureRelativeJsImport(fromTargetPath: string, toTargetPath: string): string {
  const fromDir = pathPosix.dirname(fromTargetPath);
  const jsTargetPath = toTargetPath.replace(/\.ts$/i, ".js");
  const relativePath = pathPosix.relative(fromDir, jsTargetPath).replace(/\\/g, "/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function toGeneratedClassName(targetPath: string): string {
  const baseName = targetPath.split("/").pop()?.replace(/\.ts$/i, "") || "module";
  return baseName
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function isPrimaryRuntimeEntry(entry: WritePlanEntry): boolean {
  return !entry.targetPath.endsWith("_ability.ts") && !entry.targetPath.endsWith("_modifier.ts");
}

function findMatchingResourcePoolEntry(
  entries: WritePlanEntry[],
  resourceType: string,
  options?: { includeDeferred?: boolean }
): WritePlanEntry | undefined {
  const includeDeferred = options?.includeDeferred ?? false;

  return entries.find(
    (entry) =>
      entry.sourcePattern === "resource.basic_pool" &&
      (includeDeferred || !entry.deferred) &&
      normalizeResourceIdentifier(
        entry.parameters?.resourceId ?? entry.parameters?.resourceType,
        "mana"
      ) === resourceType
  );
}

function applyResourceCostHonestyDeferrals(entries: WritePlanEntry[]): void {
  for (const entry of entries) {
    if (entry.deferred) {
      continue;
    }

    if (entry.sourcePattern === "resource.basic_pool") {
      const regenRate = toOptionalPositiveNumber(entry.parameters?.regen) || 0;
      if (regenRate > 0) {
        const resourceType = normalizeResourceIdentifier(
          entry.parameters?.resourceId ?? entry.parameters?.resourceType,
          "mana"
        );
        markEntryDeferred(
          entry,
          `resource.basic_pool auto-regen remains deferred in the current resource/cost slice (resourceType: "${resourceType}", regen: ${regenRate})`,
          "[deferred: auto-regen not supported in current resource/cost slice]"
        );
      }
      continue;
    }

    if (entry.sourcePattern === "effect.resource_consume") {
      const rawFailBehavior = normalizeResourceFailBehavior(entry.parameters?.failBehavior);
      if (rawFailBehavior !== "block" && rawFailBehavior !== "report") {
        const resourceType = normalizeResourceIdentifier(entry.parameters?.resourceType, "mana");
        markEntryDeferred(
          entry,
          `effect.resource_consume only admits failBehavior "block" or "report" in the current resource/cost slice (resourceType: "${resourceType}", failBehavior: "${rawFailBehavior}")`,
          "[deferred: unsupported failBehavior for current resource/cost slice]"
        );
      }
    }
  }
}

function applyResourceCostComposition(entries: WritePlanEntry[]): void {
  for (const entry of entries) {
    if (entry.sourcePattern !== "effect.resource_consume" || entry.deferred) {
      continue;
    }

    const consumerResourceType = normalizeResourceIdentifier(entry.parameters?.resourceType, "mana");
    const matchingPool = findMatchingResourcePoolEntry(entries, consumerResourceType);

    if (!matchingPool) {
      const deferredPool = findMatchingResourcePoolEntry(entries, consumerResourceType, {
        includeDeferred: true,
      });
      const deferredReason =
        deferredPool?.sourcePattern === "resource.basic_pool"
          ? `effect.resource_consume requires a same-feature resource.basic_pool companion without auto-regen in the current resource/cost slice (resourceType: "${consumerResourceType}")`
          : `effect.resource_consume requires a same-feature resource.basic_pool companion for automatic composition in the current resource/cost slice (resourceType: "${consumerResourceType}")`;
      const deferredTag =
        deferredPool?.sourcePattern === "resource.basic_pool"
          ? "[deferred: companion pool shape not supported]"
          : "[deferred: missing compatible resource.basic_pool companion]";
      markEntryDeferred(entry, deferredReason, deferredTag);
      continue;
    }

    entry.metadata = {
      ...(entry.metadata || {}),
      resourcePoolImportPath: ensureRelativeJsImport(entry.targetPath, matchingPool.targetPath),
      resourcePoolTargetPath: matchingPool.targetPath,
      resourcePoolClassName: toGeneratedClassName(matchingPool.targetPath),
      resourcePoolResourceId: consumerResourceType,
      resourceCostComposition: "feature-local-auto-bind",
    };
    entry.contentSummary = `${entry.contentSummary} [auto-compose: resource.basic_pool(${consumerResourceType})]`;
  }
}

function applyResourceCostCallerInvocation(entries: WritePlanEntry[]): void {
  const keyBindingEntries = entries.filter(
    (entry) =>
      entry.sourcePattern === "input.key_binding" &&
      !entry.deferred &&
      isPrimaryRuntimeEntry(entry)
  );
  const consumerEntries = entries.filter(
    (entry) =>
      entry.sourcePattern === "effect.resource_consume" &&
      !entry.deferred &&
      entry.metadata?.resourceCostComposition === "feature-local-auto-bind"
  );

  if (consumerEntries.length === 0) {
    return;
  }

  if (keyBindingEntries.length !== 1 || consumerEntries.length !== 1) {
    const ambiguousCallerReason =
      keyBindingEntries.length === 0
        ? undefined
        : `effect.resource_consume requires an unambiguous same-feature input.key_binding caller in the current admitted slice (keyBindings: ${keyBindingEntries.length}, consumers: ${consumerEntries.length})`;

    for (const consumerEntry of consumerEntries) {
      const resourceType = normalizeResourceIdentifier(consumerEntry.parameters?.resourceType, "mana");
      consumerEntry.deferred = true;
      consumerEntry.deferredReason =
        keyBindingEntries.length === 0
          ? `effect.resource_consume requires a same-feature input.key_binding caller to expose the current admitted invocation path (resourceType: "${resourceType}")`
          : `${ambiguousCallerReason} (resourceType: "${resourceType}")`;
      consumerEntry.contentSummary =
        `${consumerEntry.contentSummary} [deferred: canonical caller missing or ambiguous]`;
    }
    return;
  }

  const [keyBindingEntry] = keyBindingEntries;
  const [consumerEntry] = consumerEntries;
  const resourceType = normalizeResourceIdentifier(consumerEntry.parameters?.resourceType, "mana");
  const triggerKey = normalizeTriggerKey(
    keyBindingEntry.parameters?.triggerKey ?? keyBindingEntry.parameters?.key,
    "F4"
  );

  keyBindingEntry.metadata = {
    ...(keyBindingEntry.metadata || {}),
    resourceInvocationImportPath: ensureRelativeJsImport(
      keyBindingEntry.targetPath,
      consumerEntry.targetPath
    ),
    resourceInvocationTargetPath: consumerEntry.targetPath,
    resourceInvocationClassName: toGeneratedClassName(consumerEntry.targetPath),
    resourceInvocationMode: "resource-consume-configured",
    resourceInvocationResourceType: resourceType,
  };
  keyBindingEntry.contentSummary =
    `${keyBindingEntry.contentSummary} [auto-call: effect.resource_consume(${resourceType})]`;
  consumerEntry.contentSummary =
    `${consumerEntry.contentSummary} [canonical caller: input.key_binding(${triggerKey})]`;
}

/**
 * 为单个 Pattern 生成写入条目
 * T112-R2: Now actually consumes realizationContext for decision making
 * T115: Now also consumes routeContext as primary input
 */
function generateEntriesForPattern(
  binding: SelectedPattern,
  patternMeta: ReturnType<typeof getPatternMeta>,
  featureId: string,
  routeContext?: RouteContext,
  realizationContext?: RealizationContext,
  abilityParams?: Record<string, unknown>
): WritePlanEntry[] {
  const entries: WritePlanEntry[] = [];

  if (!patternMeta) return entries;

  // T112-R2: Find matching realization unit for this binding (fallback if no route context)
  // Note: For multi-output patterns, we find route inside the loop per outputType
  const matchingUnit = findMatchingRealizationUnit(binding, realizationContext);

  // 确定基础路径（使用命名空间）
  const roleSegment = sanitizeSegment(binding.role.replace(/^mod_/, ""));
  const patternSegment = sanitizeSegment(binding.patternId.replace(/\./g, "_"));
  const baseName =
    roleSegment === patternSegment || roleSegment.endsWith(`_${patternSegment}`)
      ? roleSegment
      : `${roleSegment}_${patternSegment}`;
  const targetId = `${featureId}_${baseName}`;

  // 为每种输出类型生成条目
  for (const outputType of patternMeta.outputTypes) {
    // T143-R2: Find matching route per outputType for multi-output patterns
    const matchingRoute = routeContext
      ? findMatchingRoute(binding, routeContext, outputType)
      : undefined;

    const isBlocked = matchingRoute?.blocked || false;
    const routeFamilyHint = matchingRoute?.generatorFamily;

    // T112-R2: Determine if this specific output should be deferred
    const outputDeferral = shouldDeferKVRelated(matchingUnit, outputType);
    const bridgeElision = shouldElideBridgeSupportEntry(binding, routeFamilyHint);
    const modifierApplierDeferral = shouldDeferGenericModifierApplier(binding);
    const dashDeferral = shouldDeferDashEffect(binding);

    // T115: If route is blocked, that takes precedence
    const entryDeferred =
      isBlocked ||
      outputDeferral.deferred ||
      bridgeElision.deferred ||
      modifierApplierDeferral.deferred ||
      dashDeferral.deferred;
    const entryDeferredReason = isBlocked
      ? `Route ${matchingRoute?.id} is blocked`
      : outputDeferral.reason || bridgeElision.reason || modifierApplierDeferral.reason || dashDeferral.reason;

    // 使用 route 的 hostTarget（如果有），否则使用 patternMeta.hostTarget
    const effectiveHostTarget = matchingRoute 
      ? normalizeHostTarget(matchingRoute.hostTarget)
      : patternMeta.hostTarget;

    const targetPath = getNamespacePath(
      effectiveHostTarget,
      targetId,
      outputType
    );

    // T115: Use route family hint as primary if available, fallback to realization-based hint
    const generatorFamilyHint = routeFamilyHint || determineGeneratorFamilyHint(matchingUnit, patternMeta);

    const mergedParameters = {
      ...(binding.parameters || {}),
      ...(matchingRoute?.parameters || {}),
    };

    const entry: WritePlanEntry = {
      operation: "create",
      targetPath,
      contentType: outputType as WritePlanEntry["contentType"],
      contentSummary: generateContentSummary(binding, patternMeta, outputType),
      sourcePattern: binding.patternId,
      sourceModule: binding.role,
      safe: true,
      // T112-R2: Attach generator family hint for transitional routing
      generatorFamilyHint,
      // T115: Mark as deferred if route blocked or KV side not implementable
      deferred: entryDeferred,
      deferredReason: entryDeferredReason,
      // Preserve binding-level parameters while allowing route metadata to refine them.
      parameters: Object.keys(mergedParameters).length > 0 ? mergedParameters : undefined,
    };

    // T138-R1: Attach ability parameters to KV entries for proper generation
    if (outputType === "kv" && abilityParams && Object.keys(abilityParams).length > 0) {
      entry.metadata = abilityParams;
    }

    if (outputType === "kv" && binding.patternId === "dota2.short_time_buff") {
      const abilityCooldown = resolveShortTimeBuffAbilityCooldown(binding, entry.metadata);
      if (abilityCooldown) {
        entry.metadata = {
          ...(entry.metadata || {}),
          abilityCooldown,
        };
      }
    }

    if ((outputType === "kv" || outputType === "lua") && binding.patternId === "dota2.linear_projectile_emit") {
      const projectileConfig = resolveLinearProjectileConfig(binding, featureId, targetId);
      if (projectileConfig) {
        entry.metadata = {
          ...(entry.metadata || {}),
          abilityName: projectileConfig.abilityName,
          abilityBaseClass: "ability_lua",
          abilityBehavior: "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
          scriptFile: projectileConfig.scriptFile,
          specials: [
            { index: "01", varType: "FIELD_INTEGER", key: "projectile_distance", value: projectileConfig.projectileDistance },
            { index: "02", varType: "FIELD_INTEGER", key: "projectile_speed", value: projectileConfig.projectileSpeed },
            { index: "03", varType: "FIELD_INTEGER", key: "projectile_radius", value: projectileConfig.projectileRadius },
          ],
        };
      }
    }

    if ((outputType === "kv" || outputType === "lua") && binding.patternId === "dota2.exploratory_ability") {
      const exploratoryConfig = resolveExploratoryAbilityConfig(binding, targetId);
      entry.metadata = {
        ...(entry.metadata || {}),
        abilityName: exploratoryConfig.abilityName,
        abilityBaseClass: "ability_lua",
        abilityBehavior: exploratoryConfig.abilityBehavior,
        scriptFile: exploratoryConfig.scriptFile,
      };

      if (outputType === "lua") {
        entry.metadata = {
          ...(entry.metadata || {}),
          onSpellStart: exploratoryConfig.onSpellStart,
          additionalMethods: exploratoryConfig.additionalMethods,
        };
      }
    }

    if ((outputType === "kv" || outputType === "lua") && binding.patternId === "effect.modifier_applier") {
      const effectAbilityName = (binding.parameters?.abilityName as string)
        || targetId.replace(/[^a-zA-Z0-9_]/g, "_");
      entry.metadata = {
        ...(entry.metadata || {}),
        abilityName: effectAbilityName,
      };
    }

    // T125-R3: Fill explicit metadata for lua entries
    // T128: Extended with archetype discriminator ("buff" | "dot")
    // T125-R3: Fill explicit metadata for lua entries
    // T125-R4: SCOPE: This metadata is specialized for dota2.short_time_buff and
    // closely related ability-buff patterns that produce movespeed/buff modifiers.
    // It hardcodes: frost particle, MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT,
    // and a default 80 movespeed bonus. It does NOT generalize to arbitrary
    // ability types.
    // T128: archetype discriminator added — when binding.parameters.archetype is
    // explicitly set to "dot", the assembler produces DOT-specific metadata
    // (OnIntervalThink, dotDamage, dotInterval). This discriminator lives in
    // binding.parameters, NOT in patternId. Pattern catalog is NOT modified.
    if (outputType === "lua" && binding.patternId === "dota2.short_time_buff") {
      const abilityName = (binding.parameters?.abilityName as string)
        || targetId.replace(/[^a-zA-Z0-9_]/g, "_");
      const modifierName = (binding.parameters?.modifierName as string)
        || `modifier_${abilityName}`;
      const archetype = (binding.parameters?.archetype as string) || "buff";

      // T128: When binding.parameters.archetype is explicitly "dot", the DOT branch fires.
      // This is discriminator-from-parameters, NOT from patternId.
      // No new pattern added; pattern catalog is unchanged.
      if (archetype === "dot") {
        const dotDamage = (binding.parameters?.dotDamage as number) || 50;
        const dotInterval = (binding.parameters?.dotInterval as number) || 1.0;
        const movespeedSlow = (binding.parameters?.movespeedSlow as number) || 50;
        entry.metadata = {
          abilityName,
          archetype: "dot",
          modifierConfig: {
            name: modifierName,
            archetype: "dot",
            isHidden: false,
            isDebuff: true,
            isPurgable: true,
            isBuff: false,
            statusEffectName: (binding.parameters?.statusEffectParticle as string)
              || "particles/status_fx/status_effect_poison.vpcf",
            declareFunctions: "MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT",
            modifierFunctions: {
              GetModifierMoveSpeedBonus_Constant:
                "return -(self:GetAbility():GetSpecialValueFor('movespeed_slow') or " +
                String(movespeedSlow),
            },
            dotDamage,
            dotInterval,
          },
        };
      } else {
        // default: "buff" archetype — identical to T125-R3 baseline
        entry.metadata = {
          abilityName,
          archetype: "buff",
          modifierConfig: {
            name: modifierName,
            archetype: "buff",
            isHidden: false,
            isDebuff: false,
            isPurgable: true,
            isBuff: true,
            statusEffectName: (binding.parameters?.statusEffectParticle as string)
              || "particles/status_fx/status_effect_frost.vpcf",
            declareFunctions: "MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT",
            modifierFunctions: {
              GetModifierMoveSpeedBonus_Constant:
                "return self:GetAbility():GetSpecialValueFor('movespeed_bonus') or " +
                String((binding.parameters?.movespeedBonus as number) || 80),
            },
          },
        };
      }
    }

    if (outputType === "lua" && binding.patternId === "dota2.linear_projectile_emit") {
      const projectileConfig = resolveLinearProjectileConfig(binding, featureId, targetId);
      if (projectileConfig) {
        entry.metadata = {
          ...(entry.metadata || {}),
          abilityName: projectileConfig.abilityName,
          onSpellStart: buildLinearProjectileOnSpellStart(),
          additionalMethods: buildLinearProjectileAdditionalMethods(projectileConfig.abilityName),
        };
      }
    }

    // 检查是否需要额外文件
    if (patternMeta.dota2Params?.requiresAbility && outputType === "typescript") {
      entries.push({
        ...entry,
        targetPath: getNamespacePath(
          patternMeta.hostTarget,
          `${targetId}_ability`,
          outputType
        ),
        contentSummary: `Ability 类: ${binding.patternId}`,
      });
    }

    if (patternMeta.dota2Params?.requiresModifier && outputType === "typescript") {
      entries.push({
        ...entry,
        targetPath: getNamespacePath(
          patternMeta.hostTarget,
          `${targetId}_modifier`,
          outputType
        ),
        contentSummary: `Modifier 类: ${binding.patternId}`,
      });
    }

    // 添加主条目
    if (!entries.find((e) => e.targetPath === entry.targetPath)) {
      entries.push(entry);
    }
  }

  return entries;
}

function sanitizeSegment(value: string): string {
  const normalized = value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || "module";
}

/**
 * 生成内容摘要
 */
function generateContentSummary(
  binding: SelectedPattern,
  patternMeta: ReturnType<typeof getPatternMeta>,
  outputType: string
): string {
  if (!patternMeta) return "";
  const params = binding.parameters ? JSON.stringify(binding.parameters) : "{}";
  return `${patternMeta.category}/${binding.patternId} (${outputType}) params: ${params}`;
}

/**
 * 计算执行顺序
 */
function calculateExecutionOrder(entries: WritePlanEntry[]): number[] {
  return calculateHostWriteExecutionOrder(entries);
}

/**
 * 打印 Write Plan
 */
export function printWritePlan(plan: WritePlan): void {
  console.log("=".repeat(60));
  console.log("Dota2 Adapter - Write Plan (x-template)");
  console.log("=".repeat(60));
  console.log();
  console.log(`计划 ID: ${plan.id}`);
  console.log(`目标项目: ${plan.targetProject}`);
  console.log(`生成时间: ${plan.generatedAt}`);
  console.log();
  console.log("命名空间:");
  console.log(`  服务端: ${plan.namespaceRoots.server}`);
  console.log(`  Panorama: ${plan.namespaceRoots.panorama}`);
  console.log();
  console.log("统计:");
  console.log(`  总条目: ${plan.stats.total}`);
  console.log(`  新建: ${plan.stats.create}`);
  console.log(`  更新: ${plan.stats.update}`);
  console.log(`  潜在冲突: ${plan.stats.conflicts}`);
  console.log();
  console.log("写入条目（按执行顺序）:");

  for (const index of plan.executionOrder) {
    const entry = plan.entries[index];
    const icon = entry.operation === "create" ? "+" : entry.operation === "update" ? "~" : "?";
    const safe = entry.safe ? "✓" : "⚠";
    console.log(`  ${icon} [${safe}] ${entry.targetPath}`);
    console.log(`     类型: ${entry.contentType}, 来源: ${entry.sourcePattern}`);
    console.log(`     内容: ${entry.contentSummary.substring(0, 50)}...`);
    if (entry.conflicts && entry.conflicts.length > 0) {
      console.log(`     冲突: ${entry.conflicts.join(", ")}`);
    }
    console.log();
  }

  console.log("=".repeat(60));
  console.log("注意：这是写入计划，尚未实际修改任何文件");
  console.log("=".repeat(60));
}

/**
 * 验证 Write Plan 路径是否都在命名空间内
 */
export function validateWritePlanPaths(plan: WritePlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  const allowedPrefixes = [
    RUNE_WEAVER_NAMESPACE.server.root,
    RUNE_WEAVER_NAMESPACE.panorama.root,
    "game/scripts/npc/", // 配置目录例外
  ];

  for (const entry of plan.entries) {
    const isAllowed = allowedPrefixes.some((prefix) =>
      entry.targetPath.startsWith(prefix)
    );
    if (!isAllowed) {
      errors.push(`路径不在受控命名空间内: ${entry.targetPath}`);
    }
    
    // 特别禁止写入 vscripts 目录
    if (entry.targetPath.includes("/vscripts/") && 
        !entry.targetPath.includes("/vscripts/rune_weaver/")) {
      errors.push(`禁止直接写入 vscripts 目录: ${entry.targetPath}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

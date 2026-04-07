/**
 * Dota2 Adapter - Assembler
 *
 * 将 AssemblyPlan 转换为 Write Plan
 * 目标目录对齐 x-template 源码结构：
 * - game/scripts/src/rune_weaver/
 * - content/panorama/src/rune_weaver/
 */

import { AssemblyPlan, HostRealizationPlan, SelectedPattern, GeneratorRoutingPlan } from "../../../core/schema/types";
import { getPatternMeta } from "../patterns";

/**
 * T112-R2: Generator family hint for transitional routing
 * Indicates which generator family should handle this entry
 */
export type GeneratorFamilyHint = "dota2-ts" | "dota2-ui" | "dota2-kv" | "bridge-support";

/**
 * 写入操作类型
 */
export type WriteOperation = "create" | "update" | "append" | "delete";

/**
 * 文件写入条目
 */
export interface WritePlanEntry {
  /** 操作类型 */
  operation: WriteOperation;
  /** 目标文件路径（相对项目根目录） */
  targetPath: string;
  /** 内容类型 */
  contentType: "typescript" | "tsx" | "less" | "css" | "json" | "kv" | "lua";
  /** 内容摘要 */
  contentSummary: string;
  /** 来源 Pattern */
  sourcePattern: string;
  /** 来源模块 */
  sourceModule: string;
  /** 是否安全（无冲突） */
  safe: boolean;
  /** 潜在冲突 */
  conflicts?: string[];
  /** T112-R2: Generator family hint for transitional routing */
  generatorFamilyHint?: GeneratorFamilyHint;
  /** T112-R2: Marks entry as deferred (generator not yet implemented) */
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
export interface WritePlan {
  id: string;
  targetProject: string;
  generatedAt: string;
  namespaceRoots: {
    server: string;
    panorama: string;
  };
  entries: WritePlanEntry[];
  stats: {
    total: number;
    create: number;
    update: number;
    conflicts: number;
    /** T112-R2: Number of deferred entries (KV side not yet implemented) */
    deferred: number;
  };
  executionOrder: number[];
  readyForHostWrite?: boolean;
  readinessBlockers?: string[];
  /** T115: Route context from routing stage (primary for T115+) */
  routeContext?: RouteContext;
  /** T112-R1: Realization context (backward compatible) */
  realizationContext?: RealizationContext;
  /** T112-R2: Warnings for deferred entries (KV not yet implemented) */
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

  for (const binding of plan.selectedPatterns) {
    const patternMeta = getPatternMeta(binding.patternId);
    if (!patternMeta) continue;

    const patternEntries = generateEntriesForPattern(
      binding,
      patternMeta,
      generatedFeatureId,
      routeContext,
      realizationContext
    );
    entries.push(...patternEntries);
  }

  // 生成执行顺序
  const executionOrder = calculateExecutionOrder(entries);

  // 统计
  const stats = {
    total: entries.length,
    create: entries.filter((e) => e.operation === "create").length,
    update: entries.filter((e) => e.operation === "update").length,
    conflicts: entries.filter(
      (e) => !e.safe || (e.conflicts && e.conflicts.length > 0)
    ).length,
    // T112-R2: Count deferred entries
    deferred: entries.filter((e) => e.deferred).length,
  };

  return {
    id: `writeplan_${plan.blueprintId}_${Date.now()}`,
    targetProject: projectPath,
    generatedAt: new Date().toISOString(),
    namespaceRoots: {
      server: RUNE_WEAVER_NAMESPACE.server.root,
      panorama: RUNE_WEAVER_NAMESPACE.panorama.root,
    },
    entries,
    stats,
    executionOrder,
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
}

/**
 * T115: Route Context
 * Encapsulates GeneratorRoutingPlan data for route-aware write plan generation.
 * This is the primary interface for T115+ routing consumption.
 */
export interface RouteContext {
  version: string;
  host: string;
  sourceBlueprintId: string;
  routes: RouteContextUnit[];
}

export interface RouteContextUnit {
  id: string;
  sourceUnitId: string;
  generatorFamily: "dota2-kv" | "dota2-ts" | "dota2-ui" | "bridge-support";
  routeKind: "kv" | "ts" | "ui" | "bridge";
  hostTarget: string;
  sourcePatternIds: string[];
  blocked: boolean;
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
      generatorFamily: r.generatorFamily,
      routeKind: r.routeKind,
      hostTarget: r.hostTarget,
      sourcePatternIds: unitToPatterns.get(r.sourceUnitId) || [],
      blocked: !!(r.blockers && r.blockers.length > 0),
    })),
  };
}

/**
 * T112-R1: Realization Context
 * Encapsulates HostRealizationPlan data for downstream generator consumption.
 * This is the transitional interface before formal GeneratorRoutingPlan exists.
 */
export interface RealizationContext {
  version: string;
  host: string;
  sourceBlueprintId: string;
  units: RealizationContextUnit[];
  isFallback: boolean;
}

export interface RealizationContextUnit {
  id: string;
  sourcePatternIds: string[];
  realizationType: string;
  hostTargets: string[];
  confidence: string;
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
 * Uses real sourcePatternIds from RouteContextUnit for accurate matching
 */
function findMatchingRoute(
  binding: SelectedPattern,
  routeContext: RouteContext
): RouteContextUnit | undefined {
  // T115-R1: Now uses real sourcePatternIds from routeContext.routes
  // First try exact pattern match
  const exactMatch = routeContext.routes.find(r =>
    r.sourcePatternIds.includes(binding.patternId)
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Fallback: If no exact match, use heuristic based on routeKind
  // This handles cases where patterns aren't directly mapped to routes yet
  const patternMeta = getPatternMeta(binding.patternId);
  const isUIPattern = binding.patternId.startsWith("ui.");
  const isKVPattern = patternMeta?.outputTypes.includes("kv");

  if (isUIPattern) {
    return routeContext.routes.find(r => r.routeKind === "ui" && !r.blocked)
      || routeContext.routes.find(r => r.routeKind === "ui");
  }

  if (isKVPattern) {
    return routeContext.routes.find(r => r.routeKind === "kv")
      || routeContext.routes.find(r => r.routeKind === "ts");
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
  }

  // Default to TS for gameplay patterns
  if (unit.realizationType === "ts" || unit.realizationType === "shared-ts") {
    return "dota2-ts";
  }

  return undefined;
}

/**
 * T112-R2: Check if realization indicates a KV-side that should be deferred
 * T118: Updated - KV generator is now implemented, so KV outputs are no longer deferred
 * Note: Only defer if outputType is not supported or unit has inherent blockers
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
  realizationContext?: RealizationContext
): WritePlanEntry[] {
  const entries: WritePlanEntry[] = [];

  if (!patternMeta) return entries;

  // T115: Find matching route for this binding
  // Route context is primary, realization context is fallback
  const matchingRoute = routeContext
    ? findMatchingRoute(binding, routeContext)
    : undefined;

  // T112-R2: Find matching realization unit for this binding (fallback if no route context)
  const matchingUnit = !matchingRoute
    ? findMatchingRealizationUnit(binding, realizationContext)
    : undefined;

  // T115: Use route information if available
  // If route is blocked, mark entry as deferred
  const isBlocked = matchingRoute?.blocked || false;
  const routeFamilyHint = matchingRoute?.generatorFamily;

  // T112-R2: Determine if this pattern's outputs should be deferred based on realization
  // This is the key decision: if realization expects KV but we can't provide it, defer
  const kvDeferral = shouldDeferKVRelated(
    matchingUnit,
    patternMeta.outputTypes[0] || "typescript"
  );

  // 确定基础路径（使用命名空间）
  // 仅使用 role 会让同一 case 内多个 effect/data/rule 模块落到同一路径。
  const roleSegment = sanitizeSegment(binding.role.replace(/^mod_/, ""));
  const patternSegment = sanitizeSegment(binding.patternId.replace(/\./g, "_"));
  const baseName =
    roleSegment === patternSegment || roleSegment.endsWith(`_${patternSegment}`)
      ? roleSegment
      : `${roleSegment}_${patternSegment}`;
  const targetId = `${featureId}_${baseName}`;

  // T115: Use route family hint as primary if available, fallback to realization-based hint
  const generatorFamilyHint = routeFamilyHint || determineGeneratorFamilyHint(matchingUnit, patternMeta);

  // 为每种输出类型生成条目
  for (const outputType of patternMeta.outputTypes) {
    const targetPath = getNamespacePath(
      patternMeta.hostTarget,
      targetId,
      outputType
    );

    // T112-R2: Check if this specific output should be deferred
    const outputDeferral = shouldDeferKVRelated(matchingUnit, outputType);

    // T115: If route is blocked, that takes precedence
    const entryDeferred = isBlocked || outputDeferral.deferred || kvDeferral.deferred;
    const entryDeferredReason = isBlocked
      ? `Route ${matchingRoute?.id} is blocked`
      : outputDeferral.reason || kvDeferral.reason;

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
    };

    // T125-R3: Fill explicit metadata for lua entries
    // T125-R4: SCOPE: This metadata is specialized for dota2.short_time_buff and
    // closely related ability-buff patterns that produce movespeed/buff modifiers.
    // It hardcodes: frost particle, MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT,
    // and a default 80 movespeed bonus. It does NOT generalize to arbitrary
    // ability types. For other lua patterns, metadata must be extended explicitly.
    if (outputType === "lua") {
      const abilityName = (binding.parameters?.abilityName as string)
        || targetId.replace(/[^a-zA-Z0-9_]/g, "_");
      const modifierName = (binding.parameters?.modifierName as string)
        || `modifier_${abilityName}`;
      entry.metadata = {
        abilityName,
        modifierConfig: {
          name: modifierName,
          isHidden: false,
          isDebuff: false,
          isPurgable: true,
          isBuff: true,
          statusEffectName: (binding.parameters?.statusEffectParticle as string) || "particles/status_fx/status_effect_frost.vpcf",
          declareFunctions: "MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT",
          modifierFunctions: {
            GetModifierMoveSpeedBonus_Constant:
              "return self:GetAbility():GetSpecialValueFor('movespeed_bonus') or " +
              String((binding.parameters?.movespeedBonus as number) || 80),
          },
        },
      };
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
  const priority: Record<string, number> = {
    json: 1,
    typescript: 2,
    tsx: 3,
    less: 4,
    css: 5,
  };

  return entries
    .map((_, index) => index)
    .sort((a, b) => {
      const pa = priority[entries[a].contentType] || 99;
      const pb = priority[entries[b].contentType] || 99;
      return pa - pb;
    });
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

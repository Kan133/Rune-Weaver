/**
 * Dota2 Adapter - Assembler
 * 
 * 将 AssemblyPlan 转换为 Write Plan
 * 目标目录对齐 x-template 源码结构：
 * - game/scripts/src/rune_weaver/
 * - content/panorama/src/rune_weaver/
 */

import { AssemblyPlan } from "../../../core/schema/types";
import { SelectedPattern } from "../../../core/schema/types";
import { getPatternMeta } from "../patterns";

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
  contentType: "typescript" | "tsx" | "less" | "css" | "json";
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
  };
  executionOrder: number[];
  readyForHostWrite?: boolean;
  readinessBlockers?: string[];
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
 * 生成 Write Plan
 * @param plan AssemblyPlan
 * @param projectPath 目标项目路径
 * @param featureId Feature 标识
 */
export function generateWritePlan(
  plan: AssemblyPlan,
  projectPath: string = "D:\\test1",
  featureId?: string
): WritePlan {
  const entries: WritePlanEntry[] = [];
  const generatedFeatureId = featureId || plan.blueprintId;

  for (const binding of plan.selectedPatterns) {
    const patternMeta = getPatternMeta(binding.patternId);
    if (!patternMeta) continue;

    const patternEntries = generateEntriesForPattern(
      binding,
      patternMeta,
      generatedFeatureId
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
  };
}

/**
 * 为单个 Pattern 生成写入条目
 */
function generateEntriesForPattern(
  binding: SelectedPattern,
  patternMeta: ReturnType<typeof getPatternMeta>,
  featureId: string
): WritePlanEntry[] {
  const entries: WritePlanEntry[] = [];
  
  if (!patternMeta) return entries;

  // 确定基础路径（使用命名空间）
  // 仅使用 role 会让同一 case 内多个 effect/data/rule 模块落到同一路径。
  const roleSegment = sanitizeSegment(binding.role.replace(/^mod_/, ""));
  const patternSegment = sanitizeSegment(binding.patternId.replace(/\./g, "_"));
  const baseName =
    roleSegment === patternSegment || roleSegment.endsWith(`_${patternSegment}`)
      ? roleSegment
      : `${roleSegment}_${patternSegment}`;
  const targetId = `${featureId}_${baseName}`;

  // 为每种输出类型生成条目
  for (const outputType of patternMeta.outputTypes) {
    const targetPath = getNamespacePath(
      patternMeta.hostTarget,
      targetId,
      outputType
    );

    const entry: WritePlanEntry = {
      operation: "create",
      targetPath,
      contentType: outputType as WritePlanEntry["contentType"],
      contentSummary: generateContentSummary(binding, patternMeta, outputType),
      sourcePattern: binding.patternId,
      sourceModule: binding.role,
      safe: true,
    };

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

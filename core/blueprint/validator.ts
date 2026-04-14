/**
 * Rune Weaver - Blueprint Validator
 * 
 * 对 Blueprint 进行结构验证
 * 确保模块、连接等符合规范
 * 与 docs/SCHEMA.md 和 docs/BLUEPRINT-VALIDATION.md 对齐
 */

import {
  Blueprint,
  BlueprintModule,
  BlueprintConnection,
  ValidationIssue,
} from "../schema/types";
import { BlueprintValidationResult, BlueprintStats } from "./types";

/**
 * 验证 Blueprint 结构
 * @param blueprint 待验证的 Blueprint
 * @returns 验证结果
 */
export function validateBlueprint(blueprint: Blueprint): BlueprintValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. 验证基本信息
  const basicIssues = validateBasicInfo(blueprint);
  errors.push(...basicIssues.errors);
  warnings.push(...basicIssues.warnings);

  // 2. 验证模块列表
  const moduleIssues = validateModules(blueprint.modules);
  errors.push(...moduleIssues.errors);
  warnings.push(...moduleIssues.warnings);

  // 3. 验证连接
  const connectionIssues = validateConnections(
    blueprint.connections,
    blueprint.modules
  );
  errors.push(...connectionIssues.errors);
  warnings.push(...connectionIssues.warnings);

  // 4. 验证依赖关系
  const dependencyIssues = validateDependencies(
    blueprint.modules,
    blueprint.connections
  );
  errors.push(...dependencyIssues.errors);
  warnings.push(...dependencyIssues.warnings);

  // 5. 统计信息
  const stats = analyzeBlueprint(blueprint);

  // 6. 基于统计的额外验证
  const statIssues = validateByStats(stats);
  errors.push(...statIssues.errors);
  warnings.push(...statIssues.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * 验证基本信息
 */
function validateBasicInfo(blueprint: Blueprint): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 检查 version
  if (!blueprint.version) {
    errors.push({
      code: "MISSING_VERSION",
      scope: "blueprint",
      severity: "error",
      message: "Blueprint 缺少 version 字段",
      path: "version",
    });
  }

  // 检查 id
  if (!blueprint.id) {
    errors.push({
      code: "MISSING_ID",
      scope: "blueprint",
      severity: "error",
      message: "Blueprint 缺少 id 字段",
      path: "id",
    });
  }

  // 检查 summary
  if (!blueprint.summary) {
    errors.push({
      code: "MISSING_SUMMARY",
      scope: "blueprint",
      severity: "error",
      message: "Blueprint 缺少 summary 字段",
      path: "summary",
    });
  }

  // 检查 sourceIntent
  if (!blueprint.sourceIntent) {
    errors.push({
      code: "MISSING_SOURCE_INTENT",
      scope: "blueprint",
      severity: "error",
      message: "Blueprint 缺少 sourceIntent 字段",
      path: "sourceIntent",
    });
  }

  return { errors, warnings };
}

/**
 * 验证模块列表
 */
function validateModules(modules: BlueprintModule[]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 检查是否有模块
  if (!modules || modules.length === 0) {
    errors.push({
      code: "EMPTY_MODULES",
      scope: "blueprint",
      severity: "error",
      message: "Blueprint 必须至少包含一个模块",
      path: "modules",
    });
    return { errors, warnings };
  }

  // 检查模块 ID 唯一性
  const moduleIds = new Map<string, number>();
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];

    if (!mod.id) {
      errors.push({
        code: "MISSING_MODULE_ID",
        scope: "blueprint",
        severity: "error",
        message: `modules[${i}] 缺少 id 字段`,
        path: `modules[${i}].id`,
      });
      continue;
    }

    if (moduleIds.has(mod.id)) {
      errors.push({
        code: "DUPLICATE_MODULE_ID",
        scope: "blueprint",
        severity: "error",
        message: `模块 ID '${mod.id}' 重复定义`,
        path: `modules[${i}].id`,
      });
    } else {
      moduleIds.set(mod.id, i);
    }

    // 检查 responsibilities
    if (!mod.responsibilities || mod.responsibilities.length === 0) {
      warnings.push({
        code: "EMPTY_RESPONSIBILITIES",
        scope: "blueprint",
        severity: "warning",
        message: `模块 '${mod.id}' 缺少 responsibilities`,
        path: `modules[${i}].responsibilities`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * 验证连接
 */
function validateConnections(
  connections: BlueprintConnection[],
  modules: BlueprintModule[]
): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const moduleIds = new Set(modules.map((m) => m.id));
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i];

    // 检查 from 字段
    if (!conn.from) {
      errors.push({
        code: "MISSING_CONNECTION_FROM",
        scope: "blueprint",
        severity: "error",
        message: `connections[${i}] 缺少 from 字段`,
        path: `connections[${i}].from`,
      });
    } else if (!moduleIds.has(conn.from)) {
      errors.push({
        code: "INVALID_CONNECTION_FROM",
        scope: "blueprint",
        severity: "error",
        message: `connections[${i}].from '${conn.from}' 指向不存在的模块`,
        path: `connections[${i}].from`,
      });
    }

    // 检查 to 字段
    if (!conn.to) {
      errors.push({
        code: "MISSING_CONNECTION_TO",
        scope: "blueprint",
        severity: "error",
        message: `connections[${i}] 缺少 to 字段`,
        path: `connections[${i}].to`,
      });
    } else if (!moduleIds.has(conn.to)) {
      errors.push({
        code: "INVALID_CONNECTION_TO",
        scope: "blueprint",
        severity: "error",
        message: `connections[${i}].to '${conn.to}' 指向不存在的模块`,
        path: `connections[${i}].to`,
      });
    }

    // 检查自连接
    if (conn.from && conn.to && conn.from === conn.to) {
      warnings.push({
        code: "SELF_CONNECTION",
        scope: "blueprint",
        severity: "warning",
        message: `连接是模块 '${conn.from}' 的自连接`,
        path: `connections[${i}]`,
      });
    }

    // 检查 purpose
    if (!conn.purpose) {
      warnings.push({
        code: "MISSING_CONNECTION_PURPOSE",
        scope: "blueprint",
        severity: "warning",
        message: `connections[${i}] 缺少 purpose 描述`,
        path: `connections[${i}].purpose`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * 验证模块依赖关系
 */
function validateDependencies(
  modules: BlueprintModule[],
  connections: BlueprintConnection[]
): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 检查孤立模块（无连接）
  const connectedModuleIds = new Set<string>();
  for (const conn of connections) {
    if (conn.from) connectedModuleIds.add(conn.from);
    if (conn.to) connectedModuleIds.add(conn.to);
  }

  for (const mod of modules) {
    if (!connectedModuleIds.has(mod.id)) {
      warnings.push({
        code: "ISOLATED_MODULE",
        scope: "blueprint",
        severity: "warning",
        message: `模块 '${mod.id}' 没有与其他模块连接`,
        path: `modules.${mod.id}`,
      });
    }
  }

  // 检查循环依赖（简化版）
  const hasCycle = detectCycle(modules, connections);
  if (hasCycle) {
    warnings.push({
      code: "POTENTIAL_CYCLE",
      scope: "blueprint",
      severity: "warning",
      message: "Blueprint 中可能存在循环依赖",
      path: "connections",
    });
  }

  return { errors, warnings };
}

/**
 * 基于统计的验证
 */
function validateByStats(stats: BlueprintStats): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 检查过深的依赖层级
  if (stats.maxDepth > 5) {
    warnings.push({
      code: "DEEP_DEPENDENCY_CHAIN",
      scope: "blueprint",
      severity: "warning",
      message: `模块依赖链过深（${stats.maxDepth} 层）`,
      path: "connections",
    });
  }

  // 检查模块数量
  if (stats.moduleCount > 10) {
    warnings.push({
      code: "TOO_MANY_MODULES",
      scope: "blueprint",
      severity: "warning",
      message: `模块数量较多（${stats.moduleCount} 个）`,
      path: "modules",
    });
  }

  return { errors, warnings };
}

/**
 * 检测循环依赖（简化 DFS 实现）
 */
function detectCycle(
  modules: BlueprintModule[],
  connections: BlueprintConnection[]
): boolean {
  const adjacency = new Map<string, string[]>();
  
  for (const mod of modules) {
    adjacency.set(mod.id, []);
  }
  
  for (const conn of connections) {
    if (conn.from && conn.to && adjacency.has(conn.from)) {
      adjacency.get(conn.from)!.push(conn.to);
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const mod of modules) {
    if (!visited.has(mod.id)) {
      if (dfs(mod.id)) return true;
    }
  }

  return false;
}

/**
 * 分析 Blueprint 统计信息
 */
function analyzeBlueprint(blueprint: Blueprint): BlueprintStats {
  const modules = blueprint.modules;
  const connections = blueprint.connections;

  // 计算各类模块数量
  const inputModuleCount = modules.filter((m) => m.category === "trigger").length;
  const effectModuleCount = modules.filter((m) => m.category === "effect").length;
  const uiModuleCount = modules.filter((m) => m.category === "ui").length;
  const dataModuleCount = modules.filter((m) => m.category === "data").length;

  // 计算最大深度
  const maxDepth = calculateMaxDepth(modules, connections);

  return {
    moduleCount: modules.length,
    connectionCount: connections.length,
    inputModuleCount,
    effectModuleCount,
    uiModuleCount,
    dataModuleCount,
    maxDepth,
  };
}

/**
 * 计算最大依赖深度
 */
function calculateMaxDepth(
  modules: BlueprintModule[],
  connections: BlueprintConnection[]
): number {
  const adjacency = new Map<string, string[]>();
  
  for (const mod of modules) {
    adjacency.set(mod.id, []);
  }
  
  for (const conn of connections) {
    if (conn.from && conn.to && adjacency.has(conn.from)) {
      adjacency.get(conn.from)!.push(conn.to);
    }
  }

  const depths = new Map<string, number>();

  function getDepth(nodeId: string, visited: Set<string>): number {
    if (depths.has(nodeId)) {
      return depths.get(nodeId)!;
    }

    if (visited.has(nodeId)) {
      return 0; // 循环依赖
    }

    visited.add(nodeId);
    const neighbors = adjacency.get(nodeId) || [];
    
    if (neighbors.length === 0) {
      depths.set(nodeId, 1);
      return 1;
    }

    const maxNeighborDepth = Math.max(
      ...neighbors.map((n) => getDepth(n, new Set(visited)))
    );
    const depth = maxNeighborDepth + 1;
    depths.set(nodeId, depth);
    return depth;
  }

  let maxDepth = 0;
  for (const mod of modules) {
    const depth = getDepth(mod.id, new Set());
    maxDepth = Math.max(maxDepth, depth);
  }

  return maxDepth;
}

/**
 * 打印验证报告
 */
export function printValidationReport(result: BlueprintValidationResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("Blueprint 验证报告");
  lines.push("=".repeat(60));

  lines.push(`\n验证结果: ${result.valid ? "✅ 通过" : "❌ 未通过"}`);
  lines.push(`错误: ${result.errors.length}, 警告: ${result.warnings.length}`);

  lines.push("\n--- 统计信息 ---");
  lines.push(`模块总数: ${result.stats.moduleCount}`);
  lines.push(`连接总数: ${result.stats.connectionCount}`);
  lines.push(`输入模块: ${result.stats.inputModuleCount}`);
  lines.push(`效果模块: ${result.stats.effectModuleCount}`);
  lines.push(`UI 模块: ${result.stats.uiModuleCount}`);
  lines.push(`数据模块: ${result.stats.dataModuleCount}`);
  lines.push(`最大深度: ${result.stats.maxDepth}`);

  if (result.errors.length > 0) {
    lines.push("\n--- 错误 ---");
    for (const error of result.errors) {
      lines.push(`❌ [${error.code}] ${error.message}`);
      if (error.path) {
        lines.push(`   路径: ${error.path}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    lines.push("\n--- 警告 ---");
    for (const warning of result.warnings) {
      lines.push(`⚠️ [${warning.code}] ${warning.message}`);
    }
  }

  lines.push("\n" + "=".repeat(60));

  return lines.join("\n");
}

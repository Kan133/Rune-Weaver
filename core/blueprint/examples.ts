/**
 * Rune Weaver - Blueprint Examples & Utilities
 * 
 * Blueprint 示例和分析工具
 * 与 docs/SCHEMA.md 对齐
 */

import type {
  Blueprint,
  BlueprintModule,
  BlueprintConnection,
} from "../schema/types";
import type { BlueprintStats } from "./types";

// 导出 schema 中的示例
export {
  dashBlueprintExample,
  talentSystemBlueprintExample,
} from "../schema/examples";

/**
 * 分析 Blueprint 统计信息
 */
export function analyzeBlueprint(blueprint: Blueprint): BlueprintStats {
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
 * 检查 Blueprint 是否包含指定类别的模块
 */
export function hasModuleCategory(
  blueprint: Blueprint,
  category: BlueprintModule["category"]
): boolean {
  return blueprint.modules.some((m) => m.category === category);
}

/**
 * 获取模块的输入连接
 */
export function getIncomingConnections(
  moduleId: string,
  connections: BlueprintConnection[]
): BlueprintConnection[] {
  return connections.filter((c) => c.to === moduleId);
}

/**
 * 获取模块的输出连接
 */
export function getOutgoingConnections(
  moduleId: string,
  connections: BlueprintConnection[]
): BlueprintConnection[] {
  return connections.filter((c) => c.from === moduleId);
}

/**
 * 检查模块是否为入口点（无输入连接）
 */
export function isEntryPoint(
  moduleId: string,
  connections: BlueprintConnection[]
): boolean {
  return !connections.some((c) => c.to === moduleId);
}

/**
 * 检查模块是否为出口点（无输出连接）
 */
export function isExitPoint(
  moduleId: string,
  connections: BlueprintConnection[]
): boolean {
  return !connections.some((c) => c.from === moduleId);
}

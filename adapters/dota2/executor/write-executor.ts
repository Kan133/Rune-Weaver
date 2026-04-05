/**
 * T074-T077-R1: Write Executor Phase 1 Cleanup
 *
 * 实现 Dota2 Write Executor 的最小真实闭环
 * - 消费生成产物与 host planning 结果
 * - 只写 Rune Weaver 自有目录与受控 bridge 点
 * - 支持 create, refresh, inject_once 动作
 * - 边界校验真正参与执行
 * - 收紧 inject_once 幂等逻辑
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";

/**
 * 写入操作类型
 */
export type WriteActionType = "create" | "refresh" | "inject_once";

/**
 * 写入动作
 */
export interface WriteAction {
  /** 操作类型 */
  type: WriteActionType;
  /** 目标路径 (相对宿主根目录) */
  targetPath: string;
  /** 文件内容 (create/refresh 时必需) */
  content?: string;
  /** 是否 RW 拥有 */
  rwOwned: boolean;
  /** 动作描述 */
  description?: string;
}

/**
 * 写入计划
 */
export interface WritePlan {
  /** 要执行的动作列表 */
  actions: WriteAction[];
  /** 预计创建的文件 */
  filesToCreate: string[];
  /** 预计修改的文件 */
  filesToModify: string[];
  /** 关联的 featureId */
  featureId: string;
}

/**
 * 写入执行结果
 */
export interface WriteResult {
  /** 是否整体成功 */
  success: boolean;
  /** 成功执行的动作 */
  executed: WriteAction[];
  /** 失败的动作 */
  failed: { action: WriteAction; error: string }[];
  /** 跳过的动作 */
  skipped: WriteAction[];
  /** 创建的文件列表 */
  createdFiles: string[];
  /** 修改的文件列表 */
  modifiedFiles: string[];
}

/**
 * Write Executor 选项
 */
export interface WriteExecutorOptions {
  /** 宿主根目录 */
  hostRoot: string;
  /** 是否 dry-run 模式 */
  dryRun?: boolean;
  /** 是否创建备份 */
  createBackup?: boolean;
}

/**
 * Write Review Artifact
 */
export interface WriteReviewArtifact {
  /** 版本 */
  version: string;
  /** 宿主根目录 */
  hostRoot: string;
  /** feature ID */
  featureId: string;
  /** 要创建的文件 */
  filesToCreate: {
    path: string;
    rwOwned: boolean;
    lineCount: number;
    description?: string;
  }[];
  /** 要刷新的文件 */
  filesToRefresh: {
    path: string;
    rwOwned: boolean;
    lineCount: number;
    description?: string;
  }[];
  /** inject_once 目标 */
  injectOnceTargets: {
    path: string;
    alreadyInjected: boolean;
    injectionStatus: "correct" | "duplicate" | "missing" | "unknown";
    description?: string;
  }[];
  /** 跳过的项目 */
  skippedItems: {
    path: string;
    reason: string;
  }[];
  /** 阻塞项目 */
  blockers: {
    path: string;
    reason: string;
  }[];
  /** 是否准备好执行 */
  readyToExecute: boolean;
  /** 生成时间 */
  generatedAt: string;
}

// ============================================================================
// 边界定义 - Phase 1 允许的操作范围
// ============================================================================

/**
 * RW 自有命名空间前缀
 * create / refresh 只能写这些目录
 */
const RW_OWNED_PREFIXES = [
  "game/scripts/src/rune_weaver/",
  "content/panorama/src/rune_weaver/",
];

/**
 * 允许的 inject_once 目标 (bridge points)
 * 只有这些文件可以被 inject_once
 */
const ALLOWED_BRIDGE_POINTS = [
  "game/scripts/src/modules/index.ts",
  "content/panorama/src/hud/script.tsx",
];

/**
 * 检查路径是否在 RW 命名空间内
 */
export function isInRWNamespace(targetPath: string): boolean {
  return RW_OWNED_PREFIXES.some((prefix) => targetPath.startsWith(prefix));
}

/**
 * 检查路径是否是允许的 bridge point
 */
export function isAllowedBridgePoint(targetPath: string): boolean {
  return ALLOWED_BRIDGE_POINTS.includes(targetPath);
}

/**
 * 验证写入动作
 */
export function validateWriteAction(action: WriteAction): {
  valid: boolean;
  error?: string;
} {
  switch (action.type) {
    case "create":
    case "refresh":
      if (!action.rwOwned) {
        return {
          valid: false,
          error: `${action.type} action requires rwOwned=true`,
        };
      }
      if (!isInRWNamespace(action.targetPath)) {
        return {
          valid: false,
          error: `${action.type} action target not in RW namespace: ${action.targetPath}`,
        };
      }
      if (!action.content) {
        return {
          valid: false,
          error: `${action.type} action requires content`,
        };
      }
      break;

    case "inject_once":
      if (action.rwOwned) {
        return {
          valid: false,
          error: "inject_once action requires rwOwned=false",
        };
      }
      if (!isAllowedBridgePoint(action.targetPath)) {
        return {
          valid: false,
          error: `inject_once target not in allowed bridge points: ${action.targetPath}`,
        };
      }
      break;

    default:
      return {
        valid: false,
        error: `Unknown action type: ${(action as WriteAction).type}`,
      };
  }

  return { valid: true };
}

// ============================================================================
// inject_once 幂等检查 - 更精确的判断
// ============================================================================

type InjectionStatus = "correct" | "duplicate" | "missing" | "unknown";

/**
 * 检查 Server bridge 注入状态
 */
function checkServerBridgeStatus(content: string): InjectionStatus {
  const hasImport = content.includes('import { activateRuneWeaverModules } from "../rune_weaver"');
  const hasCall = content.includes("activateRuneWeaverModules();");

  const callCount = (content.match(/activateRuneWeaverModules\(\)/g) || []).length;

  if (hasImport && hasCall) {
    if (callCount === 1) {
      return "correct";
    } else if (callCount > 1) {
      return "duplicate";
    }
  }

  if (!hasImport && !hasCall) {
    return "missing";
  }

  return "unknown";
}

/**
 * 检查 UI bridge 注入状态
 */
function checkUIBridgeStatus(content: string): InjectionStatus {
  const hasImport = content.includes('import { RuneWeaverHUDRoot } from "../rune_weaver"');
  const hasComponent = content.includes("<RuneWeaverHUDRoot />");

  const componentCount = (content.match(/<RuneWeaverHUDRoot\s*\/>/g) || []).length;

  if (hasImport && hasComponent) {
    if (componentCount === 1) {
      return "correct";
    } else if (componentCount > 1) {
      return "duplicate";
    }
  }

  if (!hasImport && !hasComponent) {
    return "missing";
  }

  return "unknown";
}

/**
 * 检查注入状态
 */
function checkInjectionStatus(content: string, targetPath: string): InjectionStatus {
  if (targetPath === "game/scripts/src/modules/index.ts") {
    return checkServerBridgeStatus(content);
  } else if (targetPath === "content/panorama/src/hud/script.tsx") {
    return checkUIBridgeStatus(content);
  }
  return "unknown";
}

/**
 * 检查是否需要注入（更精确的幂等判断）
 */
function needsInjection(content: string, targetPath: string): boolean {
  const status = checkInjectionStatus(content, targetPath);
  return status === "missing";
}

// ============================================================================
// 核心执行函数
// ============================================================================

/**
 * 执行写入计划
 */
export async function executeWritePlan(
  plan: WritePlan,
  options: WriteExecutorOptions
): Promise<WriteResult> {
  const result: WriteResult = {
    success: true,
    executed: [],
    failed: [],
    skipped: [],
    createdFiles: [],
    modifiedFiles: [],
  };

  for (const action of plan.actions) {
    const validation = validateWriteAction(action);
    if (!validation.valid) {
      result.failed.push({ action, error: validation.error || "Validation failed" });
      result.success = false;
      continue;
    }

    try {
      const actionResult = await executeWriteAction(action, options);

      if (actionResult.skipped) {
        result.skipped.push(action);
      } else if (actionResult.success) {
        result.executed.push(action);
        if (action.type === "create") {
          result.createdFiles.push(action.targetPath);
        } else if (action.type === "refresh" || action.type === "inject_once") {
          result.modifiedFiles.push(action.targetPath);
        }
      } else {
        result.failed.push({ action, error: actionResult.error || "Unknown error" });
        result.success = false;
      }
    } catch (error) {
      result.failed.push({
        action,
        error: error instanceof Error ? error.message : String(error),
      });
      result.success = false;
    }
  }

  return result;
}

/**
 * 执行单个写入动作
 */
async function executeWriteAction(
  action: WriteAction,
  options: WriteExecutorOptions
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const fullPath = join(options.hostRoot, action.targetPath);

  switch (action.type) {
    case "create":
      return executeCreate(action, fullPath, options);
    case "refresh":
      return executeRefresh(action, fullPath, options);
    case "inject_once":
      return executeInjectOnce(action, fullPath, options);
    default:
      return { success: false, error: `Unknown action type: ${action.type}` };
  }
}

/**
 * 执行 create 动作
 */
function executeCreate(
  action: WriteAction,
  fullPath: string,
  options: WriteExecutorOptions
): { success: boolean; skipped?: boolean; error?: string } {
  if (existsSync(fullPath)) {
    if (!action.rwOwned) {
      return { success: true, skipped: true };
    }
  }

  if (options.dryRun) {
    return { success: true };
  }

  try {
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, action.content || "", "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 执行 refresh 动作
 */
function executeRefresh(
  action: WriteAction,
  fullPath: string,
  options: WriteExecutorOptions
): { success: boolean; skipped?: boolean; error?: string } {
  if (!action.rwOwned) {
    return {
      success: false,
      error: "Refresh action only allowed for RW owned files",
    };
  }

  if (options.dryRun) {
    return { success: true };
  }

  try {
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, action.content || "", "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to refresh file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 执行 inject_once 动作
 */
function executeInjectOnce(
  action: WriteAction,
  fullPath: string,
  options: WriteExecutorOptions
): { success: boolean; skipped?: boolean; error?: string } {
  if (action.rwOwned) {
    return {
      success: false,
      error: "Inject_once action not allowed for RW owned files",
    };
  }

  if (!existsSync(fullPath)) {
    return {
      success: false,
      error: `Target file does not exist: ${action.targetPath}`,
    };
  }

  if (options.dryRun) {
    return { success: true };
  }

  try {
    const content = readFileSync(fullPath, "utf-8");
    const status = checkInjectionStatus(content, action.targetPath);

    if (status === "correct") {
      return { success: true, skipped: true };
    }

    if (status === "duplicate") {
      return {
        success: false,
        error: `Duplicate injection detected in ${action.targetPath}. Manual cleanup required.`,
      };
    }

    if (status === "unknown") {
      return {
        success: false,
        error: `Unknown injection state in ${action.targetPath}. Manual inspection required.`,
      };
    }

    const injectedContent = injectBridgeCode(content, action.targetPath);
    writeFileSync(fullPath, injectedContent, "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to inject: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// inject_once 辅助函数
// ============================================================================

/**
 * 注入桥接代码
 */
function injectBridgeCode(content: string, targetPath: string): string {
  if (targetPath === "game/scripts/src/modules/index.ts") {
    return injectServerBridge(content);
  } else if (targetPath === "content/panorama/src/hud/script.tsx") {
    return injectUIBridge(content);
  }

  return content;
}

/**
 * 注入 Server 桥接代码
 */
function injectServerBridge(content: string): string {
  const hasActivateModules = content.includes("export function ActivateModules");

  if (!hasActivateModules) {
    const bridgeCode = `

// === Rune Weaver Bridge (injected once) ===
import { activateRuneWeaverModules } from "../rune_weaver";
// === End Rune Weaver Bridge ===

export function ActivateModules() {
  // === Rune Weaver Bridge ===
  activateRuneWeaverModules();
  // === End Rune Weaver Bridge ===
}
`;
    return content + bridgeCode;
  }

  let result = content;
  if (!content.includes('import { activateRuneWeaverModules } from "../rune_weaver"')) {
    const importCode = `// === Rune Weaver Bridge (injected once) ===\nimport { activateRuneWeaverModules } from "../rune_weaver";\n// === End Rune Weaver Bridge ===\n\n`;
    result = importCode + content;
  }

  const callCode = `
  // === Rune Weaver Bridge ===
  activateRuneWeaverModules();
  // === End Rune Weaver Bridge ===
`;

  const bodyStartIndex = result.indexOf("{", result.indexOf("export function ActivateModules")) + 1;
  result = result.slice(0, bodyStartIndex) + callCode + result.slice(bodyStartIndex);

  return result;
}

/**
 * 注入 UI 桥接代码
 */
function injectUIBridge(content: string): string {
  let result = content;
  if (!content.includes('import { RuneWeaverHUDRoot } from "../rune_weaver"')) {
    const importCode = `// === Rune Weaver Bridge (injected once) ===\nimport { RuneWeaverHUDRoot } from "../rune_weaver";\n// === End Rune Weaver Bridge ===\n\n`;
    result = importCode + content;
  }

  if (!result.includes("<RuneWeaverHUDRoot />")) {
    const returnIndex = result.indexOf("return");
    if (returnIndex !== -1) {
      const jsxStart = result.indexOf("(", returnIndex);
      if (jsxStart !== -1) {
        const insertCode = `\n      {/* === Rune Weaver Bridge === */}\n      <RuneWeaverHUDRoot />\n      {/* === End Rune Weaver Bridge === */}\n`;
        result = result.slice(0, jsxStart + 1) + insertCode + result.slice(jsxStart + 1);
      }
    }
  }

  return result;
}

// ============================================================================
// Write Review / Dry Run
// ============================================================================

/**
 * 生成 Write Review Artifact
 */
export function generateWriteReview(
  plan: WritePlan,
  options: WriteExecutorOptions
): WriteReviewArtifact {
  const filesToCreate: WriteReviewArtifact["filesToCreate"] = [];
  const filesToRefresh: WriteReviewArtifact["filesToRefresh"] = [];
  const injectOnceTargets: WriteReviewArtifact["injectOnceTargets"] = [];
  const skippedItems: WriteReviewArtifact["skippedItems"] = [];
  const blockers: WriteReviewArtifact["blockers"] = [];

  for (const action of plan.actions) {
    const validation = validateWriteAction(action);
    if (!validation.valid) {
      blockers.push({
        path: action.targetPath,
        reason: validation.error || "Validation failed",
      });
      continue;
    }

    const fullPath = join(options.hostRoot, action.targetPath);
    const lineCount = action.content ? action.content.split("\n").length : 0;

    switch (action.type) {
      case "create":
        if (existsSync(fullPath) && !action.rwOwned) {
          skippedItems.push({
            path: action.targetPath,
            reason: "File exists and not RW owned",
          });
        } else {
          filesToCreate.push({
            path: action.targetPath,
            rwOwned: action.rwOwned,
            lineCount,
            description: action.description,
          });
        }
        break;

      case "refresh":
        filesToRefresh.push({
          path: action.targetPath,
          rwOwned: action.rwOwned,
          lineCount,
          description: action.description,
        });
        break;

      case "inject_once":
        if (!existsSync(fullPath)) {
          blockers.push({
            path: action.targetPath,
            reason: "Target file does not exist",
          });
        } else {
          const content = readFileSync(fullPath, "utf-8");
          const status = checkInjectionStatus(content, action.targetPath);
          injectOnceTargets.push({
            path: action.targetPath,
            alreadyInjected: status === "correct",
            injectionStatus: status,
            description: action.description,
          });
        }
        break;
    }
  }

  const readyToExecute = blockers.length === 0;

  return {
    version: "1.0",
    hostRoot: options.hostRoot,
    featureId: plan.featureId,
    filesToCreate,
    filesToRefresh,
    injectOnceTargets,
    skippedItems,
    blockers,
    readyToExecute,
    generatedAt: new Date().toISOString(),
  };
}

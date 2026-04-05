/**
 * Rune Weaver - Workspace Manifest 读写模块
 * 
 * 实现 WORKSPACE-MODEL.md 中定义的工作区模型
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ============================================================================
// Workspace Types - 定义在 WORKSPACE-MODEL.md
// ============================================================================

/**
 * Workspace 文件版本
 */
export const WORKSPACE_VERSION = "0.1";

/**
 * Rune Weaver Workspace 根对象
 */
export interface RuneWeaverWorkspace {
  /** 版本 */
  version: string;
  /** 宿主类型 */
  hostType: "dota2-x-template";
  /** 宿主根目录 */
  hostRoot: string;
  /** addon 名称 */
  addonName: string;
  /** 初始化时间 */
  initializedAt: string;
  /** Feature 记录列表 */
  features: RuneWeaverFeatureRecord[];
}

/**
 * Feature 状态
 */
export type FeatureStatus = "active" | "disabled" | "archived";

/**
 * Feature 记录
 */
export interface RuneWeaverFeatureRecord {
  /** Feature ID (宿主内唯一) */
  featureId: string;
  /** Feature 名称（可选） */
  featureName?: string;
  /** 意图类型 */
  intentKind: string;
  /** 状态 */
  status: FeatureStatus;
  /** 版本号 */
  revision: number;
  /** Blueprint ID */
  blueprintId: string;
  /** 生成的文件列表 */
  generatedFiles: string[];
  /** 入口绑定 */
  entryBindings: EntryBinding[];
  /** 依赖的其他 feature */
  dependsOn?: string[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 入口绑定类型
 */
export interface EntryBinding {
  /** 目标类型 */
  target: "server" | "ui" | "config";
  /** 文件路径 */
  file: string;
  /** 绑定方式 */
  kind: "import" | "register" | "mount" | "append_index";
  /** 符号名（可选） */
  symbol?: string;
}

// ============================================================================
// Validation Result
// ============================================================================

/**
 * Workspace 验证结果
 */
export interface WorkspaceValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
}

// ============================================================================
// Workspace Operations
// ============================================================================

/**
 * Workspace 文件名称
 */
export const WORKSPACE_FILENAME = "rune-weaver.workspace.json";

/**
 * 验证 Workspace 对象
 */
export function validateWorkspace(
  workspace: unknown
): WorkspaceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!workspace || typeof workspace !== "object") {
    errors.push("Workspace 必须是一个对象");
    return { valid: false, errors, warnings };
  }

  const ws = workspace as Record<string, unknown>;

  // 检查必需字段
  if (!ws.version || typeof ws.version !== "string") {
    errors.push("缺少必需字段: version");
  } else if (ws.version !== WORKSPACE_VERSION) {
    warnings.push(`版本不匹配: 期望 ${WORKSPACE_VERSION}, 实际 ${ws.version}`);
  }

  if (!ws.hostType || typeof ws.hostType !== "string") {
    errors.push("缺少必需字段: hostType");
  } else if (ws.hostType !== "dota2-x-template") {
    warnings.push(`未知的 hostType: ${ws.hostType}`);
  }

  if (!ws.hostRoot || typeof ws.hostRoot !== "string") {
    errors.push("缺少必需字段: hostRoot");
  }

  if (!ws.addonName || typeof ws.addonName !== "string") {
    errors.push("缺少必需字段: addonName");
  } else {
    // 验证 addon_name 格式
    if (!ws.addonName.match(/^[a-z][a-z0-9_]*$/)) {
      errors.push("addonName 格式无效: 必须以字母开头，只能包含小写字母、数字和下划线");
    }
  }

  if (!ws.initializedAt || typeof ws.initializedAt !== "string") {
    errors.push("缺少必需字段: initializedAt");
  }

  // 验证 features 数组
  if (!Array.isArray(ws.features)) {
    errors.push("features 必须是一个数组");
  } else {
    for (let i = 0; i < ws.features.length; i++) {
      const feature = ws.features[i] as Record<string, unknown>;
      if (!feature.featureId || typeof feature.featureId !== "string") {
        errors.push(`features[${i}]: 缺少必需字段 featureId`);
      }
      if (!feature.status || !["active", "disabled", "archived"].includes(feature.status as string)) {
        errors.push(`features[${i}]: status 必须是 active/disabled/archived 之一`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 创建最小 Workspace
 */
export function createMinimalWorkspace(
  hostRoot: string,
  addonName: string
): RuneWeaverWorkspace {
  return {
    version: WORKSPACE_VERSION,
    hostType: "dota2-x-template",
    hostRoot,
    addonName,
    initializedAt: new Date().toISOString(),
    features: [],
  };
}

/**
 * 读取 Workspace 文件
 */
export function readWorkspace(
  projectPath: string
): { workspace: RuneWeaverWorkspace | null; error?: string } {
  const workspacePath = join(projectPath, WORKSPACE_FILENAME);

  if (!existsSync(workspacePath)) {
    return { workspace: null, error: "Workspace 文件不存在" };
  }

  try {
    const content = readFileSync(workspacePath, "utf-8");
    const workspace = JSON.parse(content) as RuneWeaverWorkspace;

    const validation = validateWorkspace(workspace);
    if (!validation.valid) {
      return {
        workspace: null,
        error: `Workspace 验证失败: ${validation.errors.join(", ")}`,
      };
    }

    return { workspace };
  } catch (error) {
    return {
      workspace: null,
      error: `读取 Workspace 失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 写入 Workspace 文件
 */
export function writeWorkspace(
  projectPath: string,
  workspace: RuneWeaverWorkspace
): { success: boolean; error?: string } {
  const workspacePath = join(projectPath, WORKSPACE_FILENAME);

  // 验证 workspace
  const validation = validateWorkspace(workspace);
  if (!validation.valid) {
    return {
      success: false,
      error: `Workspace 验证失败: ${validation.errors.join(", ")}`,
    };
  }

  try {
    writeFileSync(workspacePath, JSON.stringify(workspace, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `写入 Workspace 失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 检查项目是否已初始化（存在有效的 workspace）
 */
export function isWorkspaceInitialized(projectPath: string): boolean {
  const { workspace } = readWorkspace(projectPath);
  return workspace !== null;
}

/**
 * 添加 Feature 到 Workspace
 */
export function addFeatureToWorkspace(
  workspace: RuneWeaverWorkspace,
  feature: Omit<RuneWeaverFeatureRecord, "revision" | "createdAt" | "updatedAt">
): RuneWeaverWorkspace {
  const now = new Date().toISOString();
  const newFeature: RuneWeaverFeatureRecord = {
    ...feature,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };

  // 检查是否已存在同名 feature
  const existingIndex = workspace.features.findIndex(
    (f) => f.featureId === feature.featureId
  );

  if (existingIndex >= 0) {
    // 更新现有 feature
    const existing = workspace.features[existingIndex];
    workspace.features[existingIndex] = {
      ...newFeature,
      revision: existing.revision + 1,
      createdAt: existing.createdAt,
    };
  } else {
    // 添加新 feature
    workspace.features.push(newFeature);
  }

  return workspace;
}

/**
 * 更新 Feature 状态
 */
export function updateFeatureStatus(
  workspace: RuneWeaverWorkspace,
  featureId: string,
  status: FeatureStatus
): { success: boolean; error?: string } {
  const feature = workspace.features.find((f) => f.featureId === featureId);
  if (!feature) {
    return { success: false, error: `Feature ${featureId} 不存在` };
  }

  feature.status = status;
  feature.updatedAt = new Date().toISOString();
  return { success: true };
}

/**
 * 获取活动的 features（排除 disabled 和 archived）
 */
export function getActiveFeatures(
  workspace: RuneWeaverWorkspace
): RuneWeaverFeatureRecord[] {
  return workspace.features.filter((f) => f.status === "active");
}

/**
 * 打印 Workspace 摘要
 */
export function printWorkspaceSummary(workspace: RuneWeaverWorkspace): void {
  console.log("=".repeat(60));
  console.log("Rune Weaver Workspace");
  console.log("=".repeat(60));
  console.log();
  console.log(`版本: ${workspace.version}`);
  console.log(`宿主类型: ${workspace.hostType}`);
  console.log(`宿主根目录: ${workspace.hostRoot}`);
  console.log(`Addon 名称: ${workspace.addonName}`);
  console.log(`初始化时间: ${workspace.initializedAt}`);
  console.log();
  console.log(`Features (${workspace.features.length}):`);

  if (workspace.features.length === 0) {
    console.log("  (无)");
  } else {
    for (const feature of workspace.features) {
      const statusIcon =
        feature.status === "active"
          ? "✅"
          : feature.status === "disabled"
          ? "⏸️"
          : "📦";
      console.log(
        `  ${statusIcon} ${feature.featureId} (${feature.status}) - rev.${feature.revision}`
      );
    }
  }

  console.log();
  console.log("=".repeat(60));
}

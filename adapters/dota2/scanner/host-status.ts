/**
 * Dota2 Adapter - Host Status Model (T024-A)
 * 
 * 定义宿主接入状态的完整检查模型
 * Scanner 不再只回答"是不是 x-template"，而是回答"宿主处于什么接入状态"
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { scanDota2Project } from "./project-scan.js";
import { loadWorkspace } from "../../../core/workspace/index.js";
import type { RuneWeaverWorkspace } from "../../../core/workspace/index.js";
import type { HostKind } from "../../../core/host/types.js";
import {
  DOTA2_X_TEMPLATE_HOST_KIND,
  UNKNOWN_HOST_KIND,
} from "../../../core/host/types.js";
import {
  buildDota2GovernanceReadModel,
  type Dota2GovernanceReadModel,
} from "../governance/read-model.js";

/**
 * Rune Weaver 接入状态
 */
export interface RWIntegrationStatus {
  /** 是否已初始化 (addon_name 不是 x_template) */
  initialized: boolean;
  /** 命名空间目录是否存在 */
  namespaceReady: boolean;
  /** workspace manifest 是否存在且有效 */
  workspaceReady: boolean;
  /** Server bridge 状态 */
  serverBridge: BridgeStatus;
  /** UI bridge 状态 */
  uiBridge: BridgeStatus;
  /** 总体就绪状态 */
  ready: boolean;
}

/**
 * Bridge 状态详情
 */
export interface BridgeStatus {
  /** RW 总入口文件是否存在 */
  entryExists: boolean;
  /** 索引文件是否存在 */
  indexExists: boolean;
  /** 宿主入口是否已接线 */
  hostEntryInjected: boolean;
  /** 总体状态 */
  ready: boolean;
}

/**
 * 宿主状态检查结果
 */
export interface HostStatusResult {
  /** 宿主路径 */
  hostRoot: string;
  /** 是否受支持宿主 */
  supported: boolean;
  /** 宿主类型 */
  hostType: HostKind;
  /** Rune Weaver 接入状态 */
  rwStatus: RWIntegrationStatus;
  /** Workspace 数据 (如存在) */
  workspace?: RuneWeaverWorkspace;
  governanceReadModel?: Dota2GovernanceReadModel;
  /** 发现的问题 */
  issues: HostIssue[];
  /** 时间戳 */
  checkedAt: string;
}

/**
 * 宿主问题
 */
export interface HostIssue {
  /** 问题级别 */
  severity: "error" | "warning" | "info";
  /** 问题代码 */
  code: string;
  /** 问题描述 */
  message: string;
  /** 相关步骤 */
  step: HostSetupStep;
  /** 修复建议 */
  suggestion?: string;
}

/**
 * 宿主设置步骤
 */
export type HostSetupStep = 
  | "scan"           // 基础扫描
  | "init"           // 初始化 (addon_name)
  | "workspace"      // workspace 创建
  | "namespace"      // 命名空间目录
  | "server-bridge"  // server 桥接
  | "ui-bridge"      // ui 桥接
  | "host-entry";    // 宿主入口接线

/**
 * 检查宿主完整状态
 * 
 * 这是 T024-A 的核心实现：从简单 bool 判断升级为完整状态模型
 */
export function checkHostStatus(hostRoot: string = "D:\\test1"): HostStatusResult {
  const issues: HostIssue[] = [];
  const checkedAt = new Date().toISOString();

  // Step 1: 基础扫描
  const scanResult = scanDota2Project(hostRoot);
  
  if (!scanResult.valid) {
    issues.push({
      severity: "error",
      code: "HOST_NOT_SUPPORTED",
      message: `宿主不符合 dota2-x-template 规范: ${scanResult.errors.join(", ")}`,
      step: "scan",
      suggestion: "请确保宿主是有效的 dota2-x-template 项目",
    });

    return {
      hostRoot,
      supported: false,
      hostType: UNKNOWN_HOST_KIND,
      rwStatus: createEmptyRWStatus(),
      issues,
      checkedAt,
    };
  }

  // Step 2: 检查初始化状态 (addon_name)
  const workspaceResult = loadWorkspace(hostRoot);
  const workspace = workspaceResult.workspace;
  const governanceReadModel = workspaceResult.success && workspace
    ? buildDota2GovernanceReadModel({
        hostRoot,
        features: workspace.features,
      })
    : undefined;
  
  const initialized = workspaceResult.success && workspace 
    ? workspace.addonName !== "x_template" 
    : false;
  
  if (!workspaceResult.success || !workspace) {
    issues.push({
      severity: "warning",
      code: "WORKSPACE_NOT_FOUND",
      message: `Workspace 不存在: ${workspaceResult.issues.join(", ")}`,
      step: "workspace",
      suggestion: "运行: npm run cli -- dota2 init --host " + hostRoot,
    });
  } else if (!initialized) {
    issues.push({
      severity: "warning",
      code: "HOST_NOT_INITIALIZED",
      message: `宿主未初始化: addon_name 仍为 "${workspace.addonName}"`,
      step: "init",
      suggestion: "运行: npm run cli -- dota2 init --host " + hostRoot,
    });
  }

  // Step 3: 检查命名空间目录
  const serverNsPath = join(hostRoot, "game/scripts/src/rune_weaver");
  const panoramaNsPath = join(hostRoot, "content/panorama/src/rune_weaver");
  
  const serverNsExists = existsSync(serverNsPath);
  const panoramaNsExists = existsSync(panoramaNsPath);
  const namespaceReady = serverNsExists && panoramaNsExists;

  if (!serverNsExists) {
    issues.push({
      severity: "warning",
      code: "SERVER_NAMESPACE_MISSING",
      message: "服务端命名空间目录不存在",
      step: "namespace",
      suggestion: "运行 init 命令会自动创建",
    });
  }

  if (!panoramaNsExists) {
    issues.push({
      severity: "warning",
      code: "UI_NAMESPACE_MISSING",
      message: "UI 命名空间目录不存在",
      step: "namespace",
      suggestion: "运行 init 命令会自动创建",
    });
  }

  // Step 4: 检查 Server Bridge
  const serverBridge = checkServerBridgeStatus(hostRoot);
  
  if (!serverBridge.ready) {
    if (!serverBridge.entryExists) {
      issues.push({
        severity: "info",
        code: "SERVER_ENTRY_MISSING",
        message: "RW Server 总入口未创建",
        step: "server-bridge",
        suggestion: "首次 create/update 时会自动创建",
      });
    }
    if (!serverBridge.indexExists) {
      issues.push({
        severity: "info",
        code: "SERVER_INDEX_MISSING",
        message: "RW Server 索引未创建",
        step: "server-bridge",
        suggestion: "首次 create/update 时会自动创建",
      });
    }
    if (!serverBridge.hostEntryInjected) {
      issues.push({
        severity: "info",
        code: "SERVER_HOST_ENTRY_NOT_INJECTED",
        message: "宿主 Server 入口未接线",
        step: "host-entry",
        suggestion: "首次 --run 时会自动注入",
      });
    }
  }

  // Step 5: 检查 UI Bridge
  const uiBridge = checkUIBridgeStatus(hostRoot);
  
  if (!uiBridge.ready) {
    if (!uiBridge.entryExists) {
      issues.push({
        severity: "info",
        code: "UI_ENTRY_MISSING",
        message: "RW UI 总入口未创建",
        step: "ui-bridge",
        suggestion: "首次 create/update 时会自动创建",
      });
    }
    if (!uiBridge.indexExists) {
      issues.push({
        severity: "info",
        code: "UI_INDEX_MISSING",
        message: "RW UI 索引未创建",
        step: "ui-bridge",
        suggestion: "首次 create/update 时会自动创建",
      });
    }
    if (!uiBridge.hostEntryInjected) {
      issues.push({
        severity: "info",
        code: "UI_HOST_ENTRY_NOT_INJECTED",
        message: "宿主 HUD 入口未接线",
        step: "host-entry",
        suggestion: "首次 --run 时会自动注入",
      });
    }
  }

  // 计算总体就绪状态
  const rwStatus: RWIntegrationStatus = {
    initialized,
    namespaceReady,
    workspaceReady: !!workspace,
    serverBridge,
    uiBridge,
    ready: initialized && namespaceReady && !!workspace && serverBridge.ready && uiBridge.ready,
  };

  // 如果没有问题，添加一个 info 表示一切就绪
  if (issues.length === 0) {
    issues.push({
      severity: "info",
      code: "HOST_READY",
      message: "宿主已完全就绪，可以执行 create/update 操作",
      step: "scan",
    });
  }

  return {
    hostRoot,
    supported: true,
    hostType: DOTA2_X_TEMPLATE_HOST_KIND,
    rwStatus,
    workspace: workspace || undefined,
    governanceReadModel,
    issues,
    checkedAt,
  };
}

/**
 * 检查 Server Bridge 状态
 */
function checkServerBridgeStatus(hostRoot: string): BridgeStatus {
  const entryPath = join(hostRoot, "game/scripts/src/rune_weaver/index.ts");
  const indexPath = join(hostRoot, "game/scripts/src/rune_weaver/generated/server/index.ts");
  const hostEntryPath = join(hostRoot, "game/scripts/src/modules/index.ts");

  const entryExists = existsSync(entryPath);
  const indexExists = existsSync(indexPath);
  const hostEntryInjected = checkHostEntryInjected(hostEntryPath, "server");

  return {
    entryExists,
    indexExists,
    hostEntryInjected,
    ready: entryExists && indexExists && hostEntryInjected,
  };
}

/**
 * 检查 UI Bridge 状态
 */
function checkUIBridgeStatus(hostRoot: string): BridgeStatus {
  const entryPath = join(hostRoot, "content/panorama/src/rune_weaver/index.tsx");
  const indexPath = join(hostRoot, "content/panorama/src/rune_weaver/generated/ui/index.tsx");
  const hostEntryPath = join(hostRoot, "content/panorama/src/hud/script.tsx");

  const entryExists = existsSync(entryPath);
  const indexExists = existsSync(indexPath);
  const hostEntryInjected = checkHostEntryInjected(hostEntryPath, "ui");

  return {
    entryExists,
    indexExists,
    hostEntryInjected,
    ready: entryExists && indexExists && hostEntryInjected,
  };
}

/**
 * 检查宿主入口是否已注入 RW 桥接
 */
function checkHostEntryInjected(hostEntryPath: string, type: "server" | "ui"): boolean {
  if (!existsSync(hostEntryPath)) {
    return false;
  }

  try {
    const content = readFileSync(hostEntryPath, "utf-8");
    
    if (type === "server") {
      // 检查是否已导入 activateRuneWeaverModules
      return content.includes("activateRuneWeaverModules") || 
             content.includes("from \"../rune_weaver\"") ||
             content.includes("from '../rune_weaver'");
    } else {
      // 检查是否已导入 RuneWeaverHUDRoot
      return content.includes("RuneWeaverHUDRoot") || 
             content.includes("from \"../rune_weaver\"") ||
             content.includes("from '../rune_weaver'");
    }
  } catch {
    return false;
  }
}

/**
 * 创建空的 RW 状态
 */
function createEmptyRWStatus(): RWIntegrationStatus {
  return {
    initialized: false,
    namespaceReady: false,
    workspaceReady: false,
    serverBridge: {
      entryExists: false,
      indexExists: false,
      hostEntryInjected: false,
      ready: false,
    },
    uiBridge: {
      entryExists: false,
      indexExists: false,
      hostEntryInjected: false,
      ready: false,
    },
    ready: false,
  };
}

/**
 * 获取状态摘要报告
 */
export function getHostStatusSummary(result: HostStatusResult): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(70));
  lines.push("🎮 Dota2 宿主状态检查报告 (T024-A)");
  lines.push("=".repeat(70));
  lines.push("");
  lines.push(`宿主路径: ${result.hostRoot}`);
  lines.push(`检查时间: ${result.checkedAt}`);
  lines.push("");
  
  // 宿主支持状态
  if (result.supported) {
    lines.push(`✅ 宿主类型: ${result.hostType}`);
  } else {
    lines.push(`❌ 宿主不支持`);
  }
  lines.push("");
  
  // Rune Weaver 接入状态
  lines.push("-".repeat(70));
  lines.push("Rune Weaver 接入状态:");
  lines.push("-".repeat(70));
  
  const rs = result.rwStatus;
  lines.push(`  初始化完成:     ${rs.initialized ? "✅" : "❌"} ${getStatusText(rs.initialized)}`);
  lines.push(`  Workspace 就绪: ${rs.workspaceReady ? "✅" : "❌"} ${getStatusText(rs.workspaceReady)}`);
  lines.push(`  命名空间就绪:   ${rs.namespaceReady ? "✅" : "❌"} ${getStatusText(rs.namespaceReady)}`);
  lines.push(`  Server Bridge:  ${rs.serverBridge.ready ? "✅" : "❌"} ${getBridgeStatusText(rs.serverBridge)}`);
  lines.push(`  UI Bridge:      ${rs.uiBridge.ready ? "✅" : "❌"} ${getBridgeStatusText(rs.uiBridge)}`);
  lines.push("");
  lines.push(`  总体状态:       ${rs.ready ? "✅ 完全就绪" : "⚠️ 部分就绪"}`);
  lines.push("");
  
  // 问题列表
  if (result.issues.length > 0) {
    lines.push("-".repeat(70));
    lines.push("状态详情:");
    lines.push("-".repeat(70));
    
    for (const issue of result.issues) {
      const icon = issue.severity === "error" ? "❌" : 
                   issue.severity === "warning" ? "⚠️" : "ℹ️";
      lines.push(`${icon} [${issue.code}] ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`   💡 ${issue.suggestion}`);
      }
      lines.push("");
    }
  }
  
  lines.push("=".repeat(70));
  
  return lines.join("\n");
}

function getStatusText(ready: boolean): string {
  return ready ? "" : "(待完成)";
}

function getBridgeStatusText(bridge: BridgeStatus): string {
  const parts: string[] = [];
  if (!bridge.entryExists) parts.push("入口未创建");
  if (!bridge.indexExists) parts.push("索引未创建");
  if (!bridge.hostEntryInjected) parts.push("宿主未接线");
  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}

/**
 * 快速检查宿主是否完全就绪
 */
export function isHostFullyReady(hostRoot: string): boolean {
  const result = checkHostStatus(hostRoot);
  return result.supported && result.rwStatus.ready;
}

/**
 * 获取宿主下一步需要完成的设置步骤
 */
export function getNextSetupSteps(result: HostStatusResult): HostSetupStep[] {
  const steps: HostSetupStep[] = [];
  const rs = result.rwStatus;
  
  if (!rs.initialized) steps.push("init");
  else if (!rs.workspaceReady) steps.push("workspace");
  else if (!rs.namespaceReady) steps.push("namespace");
  else if (!rs.serverBridge.ready) steps.push("server-bridge");
  else if (!rs.uiBridge.ready) steps.push("ui-bridge");
  
  return steps;
}

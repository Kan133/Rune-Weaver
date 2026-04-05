/**
 * Dota2 Adapter - Host Integration Validator
 * 
 * T037: 强化 Dota2 Host Validation
 * 
 * 提供专门的验证入口，检查宿主集成的各个步骤
 */

import { existsSync } from "fs";
import { join } from "path";
import { scanDota2Project } from "../scanner/index.js";
import { readWorkspace } from "../../../core/workspace/index.js";
import { checkBridgeFiles, checkHostEntryBridge } from "../bridge/index.js";
import { canExecuteWritePlan } from "../executor/index.js";

/**
 * 验证步骤结果
 */
export interface ValidationStepResult {
  step: string;
  passed: boolean;
  message: string;
  details?: string[];
}

/**
 * 完整宿主验证结果
 */
export interface HostIntegrationValidationResult {
  valid: boolean;
  projectPath: string;
  steps: ValidationStepResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

/**
 * 验证宿主集成
 * 
 * 按步骤验证:
 * 1. scan - 宿主扫描
 * 2. workspace - workspace 存在且有效
 * 3. init - addon_name 已初始化
 * 4. namespace - 命名空间目录存在
 * 5. bridge - bridge 文件存在
 * 6. host-entry - 宿主入口已桥接
 * 7. write-executor - 可以执行写入
 */
export function validateHostIntegration(
  projectPath: string
): HostIntegrationValidationResult {
  const steps: ValidationStepResult[] = [];

  // Step 1: 扫描验证
  const scanResult = scanDota2Project(projectPath);
  steps.push({
    step: "scan",
    passed: scanResult.valid,
    message: scanResult.valid
      ? `✅ 扫描通过: ${scanResult.hostType}`
      : `❌ 扫描失败: ${scanResult.errors.join(", ")}`,
    details: scanResult.valid
      ? [`宿主类型: ${scanResult.hostType}`, `能力: ${scanResult.capabilities.join(", ")}`]
      : scanResult.errors,
  });

  // 如果扫描失败，后续步骤跳过
  if (!scanResult.valid) {
    return {
      valid: false,
      projectPath,
      steps,
      summary: { passed: 0, failed: 1, total: 7 },
    };
  }

  // Step 2: Workspace 验证
  const { workspace, error: workspaceError } = readWorkspace(projectPath);
  steps.push({
    step: "workspace",
    passed: !!workspace,
    message: workspace
      ? `✅ Workspace 有效: ${workspace.addonName}`
      : `❌ Workspace 无效: ${workspaceError}`,
    details: workspace
      ? [`版本: ${workspace.version}`, `Addon: ${workspace.addonName}`, `Features: ${workspace.features.length}`]
      : undefined,
  });

  // Step 3: 初始化验证 (addon_name 不是 x_template)
  const isInitialized = workspace ? workspace.addonName !== "x_template" : false;
  steps.push({
    step: "init",
    passed: isInitialized,
    message: isInitialized
      ? `✅ 已初始化: ${workspace?.addonName}`
      : `❌ 未初始化: addon_name 仍为 x_template`,
  });

  // Step 4: 命名空间目录验证
  const serverNsPath = join(projectPath, "game/scripts/src/rune_weaver");
  const panoramaNsPath = join(projectPath, "content/panorama/src/rune_weaver");
  const serverNsExists = existsSync(serverNsPath);
  const panoramaNsExists = existsSync(panoramaNsPath);
  const namespaceValid = serverNsExists || panoramaNsExists;

  steps.push({
    step: "namespace",
    passed: namespaceValid,
    message: namespaceValid
      ? `✅ 命名空间目录存在`
      : `❌ 命名空间目录不存在`,
    details: [
      `服务端: ${serverNsExists ? "✅" : "❌"}`,
      `Panorama: ${panoramaNsExists ? "✅" : "❌"}`,
    ],
  });

  // Step 5: Bridge 文件验证
  const bridgeFiles = checkBridgeFiles(projectPath);
  const bridgeValid =
    bridgeFiles.serverBridge &&
    bridgeFiles.serverIndex &&
    bridgeFiles.uiBridge &&
    bridgeFiles.uiIndex;

  steps.push({
    step: "bridge",
    passed: bridgeValid,
    message: bridgeValid ? "✅ Bridge 文件完整" : "❌ Bridge 文件缺失",
    details: [
      `server/index.ts: ${bridgeFiles.serverBridge ? "✅" : "❌"}`,
      `server/generated/index.ts: ${bridgeFiles.serverIndex ? "✅" : "❌"}`,
      `ui/index.tsx: ${bridgeFiles.uiBridge ? "✅" : "❌"}`,
      `ui/generated/index.tsx: ${bridgeFiles.uiIndex ? "✅" : "❌"}`,
    ],
  });

  // Step 6: 宿主入口桥接验证（T037 修复：收紧为标准）
  const hostEntry = checkHostEntryBridge(projectPath);
  const hostEntryPassed = hostEntry.serverEntry && hostEntry.uiEntry; // 需要两者都通过
  steps.push({
    step: "host-entry",
    passed: hostEntryPassed,
    message: hostEntryPassed
      ? "✅ 宿主入口已桥接"
      : "❌ 宿主入口未桥接 (将尝试自动注入)",
    details: [
      `服务端入口: ${hostEntry.serverEntry ? "✅" : "❌ 未注入 (将在首次 --run 时自动注入)"}`,
      `UI 入口: ${hostEntry.uiEntry ? "✅" : "❌ 未注入 (将在首次 --run 时自动注入)"}`,
    ],
  });

  // Step 7: Write Executor 验证
  const canWrite = canExecuteWritePlan(projectPath);
  steps.push({
    step: "write-executor",
    passed: canWrite.canExecute,
    message: canWrite.canExecute
      ? "✅ 可以执行写入"
      : `❌ 无法执行写入: ${canWrite.error}`,
  });

  // 计算汇总
  const passed = steps.filter((s) => s.passed).length;
  const failed = steps.filter((s) => !s.passed).length;

  // T037 修复：收紧验证标准
  // 整体有效性：所有步骤都必须通过（不再允许 host-entry 失败）
  // 注意：首次接入时可以通过 --run 自动注入，不需要手动预注入
  const criticalSteps = [
    "scan", 
    "workspace", 
    "namespace", 
    "bridge", 
    "write-executor",
    "host-entry" // T037: 添加 host-entry 到关键步骤
  ];
  const criticalPassed = steps
    .filter((s) => criticalSteps.includes(s.step))
    .every((s) => s.passed);

  return {
    valid: criticalPassed,
    projectPath,
    steps,
    summary: {
      passed,
      failed,
      total: steps.length,
    },
  };
}

/**
 * 打印验证报告
 */
export function printHostValidationReport(
  result: HostIntegrationValidationResult
): void {
  console.log("=".repeat(70));
  console.log("🎮 Dota2 宿主集成验证报告");
  console.log("=".repeat(70));
  console.log();
  console.log(`项目路径: ${result.projectPath}`);
  console.log();

  // 步骤详情
  console.log("验证步骤:");
  console.log();

  for (const step of result.steps) {
    const icon = step.passed ? "✅" : "❌";
    console.log(`${icon} [${step.step.toUpperCase()}] ${step.message}`);
    
    if (step.details && step.details.length > 0) {
      for (const detail of step.details) {
        console.log(`   ${detail}`);
      }
    }
    console.log();
  }

  // 汇总
  console.log("-".repeat(70));
  console.log("汇总:");
  console.log(`  通过: ${result.summary.passed}/${result.summary.total}`);
  console.log(`  失败: ${result.summary.failed}/${result.summary.total}`);
  console.log();

  if (result.valid) {
    console.log("✅ 宿主集成验证通过，可以执行 create/update 操作");
  } else {
    console.log("❌ 宿主集成验证未通过，请先运行:");
    console.log(`   npm run cli -- dota2 init --host ${result.projectPath}`);
  }

  console.log();
  console.log("=".repeat(70));
}

/**
 * 快速检查宿主是否就绪
 */
export function isHostReady(projectPath: string): boolean {
  const result = validateHostIntegration(projectPath);
  return result.valid;
}

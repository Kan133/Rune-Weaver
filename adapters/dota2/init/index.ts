/**
 * Dota2 Adapter - Init
 * 
 * 宿主初始化流程
 * 实现 `dota2 init --host D:\test1` 的最小闭环
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, resolve, basename } from "path";
import { execSync } from "child_process";
import { scanDota2Project } from "../scanner";
import { createInterface } from "readline";

/**
 * 初始化结果
 */
export interface InitResult {
  success: boolean;
  hostPath: string;
  addonName: string;
  initialized: boolean;
  workspaceFile: string;
  createdDirectories: string[];
  errors: string[];
  warnings: string[];
}

/**
 * 初始化配置
 */
export interface InitOptions {
  hostPath: string;
  addonName?: string; // 如果提供，直接使用；否则交互式询问
  skipInstall?: boolean;
}

/**
 * 验证 addon_name 是否合法
 * 规则：^[a-z][a-z0-9_]*$
 */
export function validateAddonName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name.match(/^[a-z][a-z0-9_]*$/)) {
    return {
      valid: false,
      error: "addon_name 必须为字母开头，只能包含小写字母、数字和下划线",
    };
  }
  if (name === "x_template") {
    return {
      valid: false,
      error: "addon_name 不能为 x_template，请修改为您的项目名称",
    };
  }
  return { valid: true };
}

/**
 * 读取 addon.config.ts 中的 addon_name
 */
function readAddonConfig(projectPath: string): string | null {
  try {
    const configPath = join(projectPath, "scripts/addon.config.ts");
    if (!existsSync(configPath)) return null;

    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/);
    if (match) {
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 更新 addon.config.ts 中的 addon_name
 */
function updateAddonConfig(
  projectPath: string,
  newName: string
): { success: boolean; error?: string } {
  try {
    const configPath = join(projectPath, "scripts/addon.config.ts");
    if (!existsSync(configPath)) {
      return { success: false, error: "addon.config.ts 不存在" };
    }

    let content = readFileSync(configPath, "utf-8");
    
    // 替换 addon_name 定义
    const newContent = content.replace(
      /let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/,
      `let addon_name = '${newName}'`
    );

    if (newContent === content) {
      return { success: false, error: "无法替换 addon_name，请手动修改" };
    }

    writeFileSync(configPath, newContent, "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `写入失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 创建 Rune Weaver 命名空间目录
 */
function createNamespaceDirectories(projectPath: string): string[] {
  const created: string[] = [];
  
  const directories = [
    // 服务端
    "game/scripts/src/rune_weaver",
    "game/scripts/src/rune_weaver/generated",
    "game/scripts/src/rune_weaver/generated/server",
    "game/scripts/src/rune_weaver/generated/shared",
    // Panorama
    "content/panorama/src/rune_weaver",
    "content/panorama/src/rune_weaver/generated",
    "content/panorama/src/rune_weaver/generated/ui",
  ];

  for (const dir of directories) {
    const fullPath = join(projectPath, dir);
    if (!existsSync(fullPath)) {
      try {
        mkdirSync(fullPath, { recursive: true });
        created.push(dir);
      } catch (error) {
        console.error(`创建目录失败: ${dir}`, error);
      }
    }
  }

  return created;
}

/**
 * 初始化宿主
 */
export async function initDota2Host(options: InitOptions): Promise<InitResult> {
  const result: InitResult = {
    success: false,
    hostPath: resolve(options.hostPath),
    addonName: "",
    initialized: false,
    workspaceFile: "",
    createdDirectories: [],
    errors: [],
    warnings: [],
  };

  // 1. 扫描宿主
  const scanResult = scanDota2Project(options.hostPath);
  if (!scanResult.valid) {
    result.errors.push(...scanResult.errors);
    return result;
  }

  // 2. 读取当前 addon_name
  const currentAddonName = readAddonConfig(options.hostPath);
  if (!currentAddonName) {
    result.errors.push("无法读取 scripts/addon.config.ts 中的 addon_name");
    return result;
  }

  // 3. 检查是否需要新的 addon_name
  let finalAddonName = options.addonName;
  
  if (!finalAddonName) {
    if (currentAddonName === "x_template") {
      // 需要初始化，使用宿主目录名作为默认值
      const defaultName = basename(result.hostPath).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      finalAddonName = await promptForAddonName(defaultName);
    } else {
      finalAddonName = currentAddonName;
      result.warnings.push(`使用现有的 addon_name: ${finalAddonName}`);
    }
  }

  // 4. 验证 addon_name
  const nameValidation = validateAddonName(finalAddonName);
  if (!nameValidation.valid) {
    result.errors.push(nameValidation.error!);
    return result;
  }

  result.addonName = finalAddonName;

  // 5. 更新 addon.config.ts（如果需要）
  if (currentAddonName !== finalAddonName) {
    const updateResult = updateAddonConfig(options.hostPath, finalAddonName);
    if (!updateResult.success) {
      result.errors.push(updateResult.error!);
      return result;
    }
  }

  // 6. 创建命名空间目录
  result.createdDirectories = createNamespaceDirectories(options.hostPath);

  // 7. 创建 workspace 文件
  const workspaceContent = generateWorkspaceFile(finalAddonName, options.hostPath);
  const workspacePath = join(options.hostPath, "rune-weaver.workspace.json");
  
  try {
    writeFileSync(workspacePath, JSON.stringify(workspaceContent, null, 2), "utf-8");
    result.workspaceFile = workspacePath;
  } catch (error) {
    result.errors.push(`创建 workspace 文件失败: ${error}`);
    return result;
  }

  // 8. 创建桥接文件（空壳）
  createBridgeFiles(options.hostPath);

  result.success = true;
  result.initialized = true;

  // 9. 调用 yarn install（可选）
  if (!options.skipInstall) {
    console.log("\n📦 正在执行 yarn install...");
    try {
      execSync("yarn install", {
        cwd: options.hostPath,
        stdio: "inherit",
      });
      console.log("✅ yarn install 完成");
    } catch (error) {
      result.warnings.push("yarn install 执行失败，请手动运行");
    }
  }

  return result;
}

/**
 * 交互式询问 addon_name
 * @param defaultName 默认值（宿主目录名）
 */
async function promptForAddonName(defaultName: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log("\n检测到 addon_name 仍为 x_template");
  console.log(`默认项目名称: ${defaultName} (直接回车使用默认值)`);
  console.log("请输入您的项目名称（小写字母开头，只能包含小写字母、数字和下划线）：\n");

  let name = "";
  while (true) {
    const input = await ask("> ");
    name = input.trim() || defaultName;
    
    const validation = validateAddonName(name);
    if (validation.valid) {
      break;
    }
    console.log(`❌ ${validation.error}`);
    console.log("请重新输入（或直接回车使用默认值）：\n");
  }

  rl.close();
  return name;
}

/**
 * 生成 workspace 文件内容
 */
function generateWorkspaceFile(addonName: string, hostPath: string) {
  return {
    version: "0.1.0",
    hostType: "dota2-x-template",
    hostRoot: resolve(hostPath),
    addonName,
    initializedAt: new Date().toISOString(),
    features: [],
  };
}

/**
 * 创建桥接文件
 * 
 * 遵循 HOST-INTEGRATION-DOTA2.md 的桥接策略:
 * - bridge 只做聚合与接线，不做业务
 * - 业务逻辑归 generated/*
 */
function createBridgeFiles(projectPath: string): void {
  // 1. 服务端桥接文件 - 暴露 activateRuneWeaverModules()
  const serverBridgePath = join(
    projectPath,
    "game/scripts/src/rune_weaver/index.ts"
  );
  
  if (!existsSync(serverBridgePath)) {
    const serverContent = `// Rune Weaver Server Bridge
// This file is the entry point for Rune Weaver generated server modules
// Bridge 只做聚合与接线，业务逻辑在 generated/server/ 中

import { activateRwGeneratedServer } from "./generated/server";

export function activateRuneWeaverModules(): void {
  activateRwGeneratedServer();
}
`;
    writeFileSync(serverBridgePath, serverContent, "utf-8");
  } else {
    const existingContent = readFileSync(serverBridgePath, "utf-8");
    const correctContent = `// Rune Weaver Server Bridge
// This file is the entry point for Rune Weaver generated server modules
// Bridge 只做聚合与接线，业务逻辑在 generated/server/ 中

import { activateRwGeneratedServer } from "./generated/server";

export function activateRuneWeaverModules(): void {
  activateRwGeneratedServer();
}
`;
    if (!existingContent.includes("activateRwGeneratedServer")) {
      console.warn("[Init] Server bridge has incorrect content, fixing...");
      writeFileSync(serverBridgePath, correctContent, "utf-8");
    }
  }

  // 2. 服务端 generated 索引文件
  const serverGeneratedIndexPath = join(
    projectPath,
    "game/scripts/src/rune_weaver/generated/server/index.ts"
  );
  
  if (!existsSync(serverGeneratedIndexPath)) {
    const serverGeneratedContent = `// Generated by Rune Weaver
// Server modules index - 由 Rune Weaver 自动刷新

export function activateRwGeneratedServer(): void {
  // TODO: Import and register generated modules here
  // 此文件由 Rune Weaver 在 feature 变更时自动刷新
  console.log("[Rune Weaver] Generated server modules activated");
}
`;
    writeFileSync(serverGeneratedIndexPath, serverGeneratedContent, "utf-8");
  }

  // 3. UI 桥接文件 - 暴露 RuneWeaverHUDRoot()
  const uiBridgePath = join(
    projectPath,
    "content/panorama/src/rune_weaver/index.tsx"
  );
  
  if (!existsSync(uiBridgePath)) {
    const uiContent = `// Rune Weaver UI Bridge
// This file is the entry point for Rune Weaver generated UI components
// Bridge 只做聚合与接线，UI 组件在 generated/ui/ 中

import React from "react";
import { RuneWeaverGeneratedUIRoot } from "./generated/ui";

export function RuneWeaverHUDRoot() {
  return (
    <Panel className="rune-weaver-root">
      <RuneWeaverGeneratedUIRoot />
    </Panel>
  );
}

export default RuneWeaverHUDRoot;
`;
    writeFileSync(uiBridgePath, uiContent, "utf-8");
  }

  // 4. UI generated 索引文件
  const uiGeneratedIndexPath = join(
    projectPath,
    "content/panorama/src/rune_weaver/generated/ui/index.tsx"
  );
  
  if (!existsSync(uiGeneratedIndexPath)) {
    const uiGeneratedContent = `// Generated by Rune Weaver
// UI components index - 由 Rune Weaver 自动刷新

import React from "react";

export function RuneWeaverGeneratedUIRoot() {
  return (
    <Panel className="rune-weaver-generated-root">
      {/* Generated UI components will be mounted here by Rune Weaver */}
    </Panel>
  );
}

export default RuneWeaverGeneratedUIRoot;
`;
    writeFileSync(uiGeneratedIndexPath, uiGeneratedContent, "utf-8");
  }
}

/**
 * 打印初始化结果
 */
export function printInitResult(result: InitResult): void {
  console.log("=".repeat(60));
  console.log("Dota2 宿主初始化结果");
  console.log("=".repeat(60));
  console.log();
  console.log(`状态: ${result.success ? "✅ 成功" : "❌ 失败"}`);
  console.log(`宿主路径: ${result.hostPath}`);
  console.log(`addon_name: ${result.addonName}`);
  console.log();

  if (result.createdDirectories.length > 0) {
    console.log("创建的目录:");
    for (const dir of result.createdDirectories) {
      console.log(`  ✅ ${dir}`);
    }
    console.log();
  }

  if (result.workspaceFile) {
    console.log(`Workspace 文件: ${result.workspaceFile}`);
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log("警告:");
    for (const warning of result.warnings) {
      console.log(`  ⚠️ ${warning}`);
    }
    console.log();
  }

  if (result.errors.length > 0) {
    console.log("错误:");
    for (const error of result.errors) {
      console.log(`  ❌ ${error}`);
    }
    console.log();
  }

  if (result.success) {
    console.log("下一步:");
    console.log("  1. 运行 `yarn install` 链接宿主到 Dota2");
    console.log("  2. 运行 `yarn launch` 启动 Dota2 Tools");
    console.log();
  }

  console.log("=".repeat(60));
}

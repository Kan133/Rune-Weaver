/**
 * Dota2 Adapter - Launch
 *
 * 启动 Dota2 Tools 进行测试
 * 实现 `dota2 launch --host D:\test1` 的最小闭环
 */

import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { loadWorkspace } from "../../../core/workspace/index.js";

export interface LaunchOptions {
  hostRoot: string;
}

export interface LaunchResult {
  /**
   * 命令是否成功派发
   * - true: yarn launch 命令已成功执行（spawn 成功）
   * - false: 命令派发失败（spawn error）
   * 
   * 注意：这不代表 Dota2 已成功启动
   */
  dispatched: boolean;
  
  /**
   * 当前实现的局限性
   */
  limitations: string[];
  
  addonName?: string;
  mapName?: string;
  errors: string[];
  warnings: string[];
}

function readHostAddonName(hostRoot: string): string | null {
  try {
    const configPath = join(hostRoot, "scripts/addon.config.ts");
    if (!existsSync(configPath)) {
      return null;
    }

    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * 执行 launch 命令
 *
 * 1. 从 workspace 读取 addonName 和 mapName
 * 2. 在宿主目录执行 yarn launch [addonName] [mapName]
 * 3. 返回执行结果
 */
export async function runLaunchCommand(options: LaunchOptions): Promise<LaunchResult> {
  const result: LaunchResult = {
    dispatched: false,
    limitations: ["Detached mode: parent process cannot verify Dota2 startup"],
    errors: [],
    warnings: [],
  };

  // 1. 读取 workspace
  const workspaceResult = loadWorkspace(options.hostRoot);

  if (!workspaceResult.success || !workspaceResult.workspace) {
    result.errors.push(`无法读取 workspace: ${workspaceResult.issues.join(", ")}`);
    result.errors.push("请先执行: dota2 init --host " + options.hostRoot);
    return result;
  }

  const workspace = workspaceResult.workspace;
  const hostAddonName = readHostAddonName(options.hostRoot);
  if (!hostAddonName) {
    result.errors.push("无法读取宿主 scripts/addon.config.ts 中的 addon_name");
    result.errors.push("请确认宿主配置存在且可读取");
    return result;
  }

  if (workspace.addonName !== hostAddonName) {
    result.errors.push(
      `workspace.addonName (${workspace.addonName}) 与宿主 addon.config.ts (${hostAddonName}) 不一致`,
    );
    result.errors.push(
      "请先同步宿主 addon_name 与 workspace，必要时重新执行 init / yarn install 后再 launch",
    );
    result.warnings.push(
      "x-template 的真实 addon 挂载由 scripts/addon.config.ts 和 install/link 结果决定，不能只修改 workspace",
    );
    return result;
  }

  result.addonName = hostAddonName;
  result.mapName = workspace.mapName;

  // 2. 构建命令参数
  const args = ["launch"];

  // x-template 的 launch 脚本参数顺序: [addon_name] [map_name]
  // 如果只传一个参数，会被当作 map_name（不是 addon_name！）
  // 如果传两个参数，第一个是 addon_name，第二个是 map_name
  // 如果不传参数，x-template 会从 addon.config.ts 读取默认 addon_name

  // 始终传递 addonName
  args.push(hostAddonName);

  if (workspace.mapName) {
    // 有 mapName：传两个参数
    args.push(workspace.mapName);
  } else {
    // 没有 mapName：传引号包裹的空字符串作为第二个参数
    // shell 模式下，空字符串需要用引号包裹才能正确传递
    // 这样 x-template 会使用传入的 addonName，但不会加载地图
    args.push('""');
  }

  console.log("=".repeat(60));
  console.log("🚀 Rune Weaver - Launch Dota2 Tools");
  console.log("=".repeat(60));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📦 Addon: ${workspace.addonName}`);
  if (workspace.mapName) {
    console.log(`🗺️  Map: ${workspace.mapName}`);
  }
  console.log(`\n⚙️  Executing: yarn ${args.join(" ")}`);
  console.log();

  // 3. 执行 yarn launch
  return new Promise((resolve) => {
    const child = spawn("yarn", args, {
      cwd: options.hostRoot,
      shell: true,
      stdio: "inherit",
      detached: true,
    });

    child.on("error", (error) => {
      result.errors.push(`启动失败: ${error.message}`);
      result.dispatched = false;
      resolve(result);
    });

    // detached 模式下，spawn 成功即视为成功
    // 不等待进程结束
    setTimeout(() => {
      if (child.pid) {
        console.log("\n✅ Dota2 Tools 启动命令已派发");
        console.log("   请手动检查 Dota2 是否正常启动");
        console.log("\n⚠️  Limitation: Detached mode - cannot verify Dota2 startup");
        result.dispatched = true;
        resolve(result);
      }
    }, 1000);

    // 超时保护
    setTimeout(() => {
      if (!result.dispatched) {
        result.warnings.push("启动超时，请手动检查 Dota2 是否启动");
        result.dispatched = true; // 仍然视为派发成功，因为可能是 Dota2 启动慢
        resolve(result);
      }
    }, 5000);
  });
}

/**
 * 打印 launch 结果
 */
export function printLaunchResult(result: LaunchResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("Launch 结果");
  console.log("=".repeat(60));

  if (result.dispatched) {
    console.log("状态: ✅ 命令已派发");
    console.log("需要手动验证: 是");
  } else {
    console.log("状态: ❌ 命令派发失败");
  }

  if (result.limitations.length > 0) {
    console.log("\nLimitations:");
    for (const limitation of result.limitations) {
      console.log(`  ⚠️ ${limitation}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\n警告:");
    for (const warning of result.warnings) {
      console.log(`  ⚠️ ${warning}`);
    }
  }

  if (result.errors.length > 0) {
    console.log("\n错误:");
    for (const error of result.errors) {
      console.log(`  ❌ ${error}`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

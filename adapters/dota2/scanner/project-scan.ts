/**
 * Dota2 Adapter - Project Scanner (基础扫描模块)
 * 
 * 提供基础项目扫描功能，独立于 host-status 模块
 * 避免 barrel 循环依赖: host-status -> index -> host-status
 */

import { existsSync, statSync, readFileSync } from "fs";
import { join, resolve } from "path";

/**
 * Dota2 项目扫描结果
 */
export interface Dota2ProjectScanResult {
  /** 是否为有效的 Dota2 项目 */
  valid: boolean;
  /** 项目路径 */
  path: string;
  /** 宿主类型 */
  hostType: "dota2-x-template" | "unknown";
  /** 脚本能力 */
  capabilities: string[];
  /** 检测到的关键路径 */
  directories: {
    /** 服务端源码目录 */
    serverSrc?: string;
    /** Panorama 源码目录 */
    panoramaSrc?: string;
    /** 脚本目录 */
    scripts?: string;
  };
  /** 检测到的关键文件 */
  keyFiles: {
    addonConfig?: string;
    installScript?: string;
    launchScript?: string;
    packageJson?: string;
  };
  /** 宿主脚本能力 */
  scriptsCapabilities: {
    postinstall: boolean;
    launch: boolean;
    dev: boolean;
    prod: boolean;
  };
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * x-template 宿主特征定义
 */
const xTemplateIndicators = {
  /** 必须存在的文件 */
  requiredFiles: [
    "scripts/addon.config.ts",
    "scripts/install.ts",
    "scripts/launch.ts",
    "package.json",
  ],
  /** 必须存在的目录 */
  requiredDirs: [
    "game/scripts/src",
    "content/panorama/src",
  ],
  /** package.json 中必须存在的脚本 */
  requiredScripts: ["postinstall", "launch"] as const,
  /** package.json 中推荐存在的脚本 */
  optionalScripts: ["dev", "prod"] as const,
};

/**
 * 检查路径是否存在
 */
function checkPath(projectPath: string, relativePath: string): boolean {
  const fullPath = join(projectPath, relativePath);
  try {
    return existsSync(fullPath);
  } catch {
    return false;
  }
}

/**
 * 检查文件是否存在
 */
function checkFile(projectPath: string, file: string): boolean {
  const fullPath = join(projectPath, file);
  try {
    return existsSync(fullPath) && statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

/**
 * 检查目录是否存在
 */
function checkDirectory(projectPath: string, dir: string): boolean {
  const fullPath = join(projectPath, dir);
  try {
    return existsSync(fullPath) && statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 读取 package.json 并解析脚本
 */
function readPackageScripts(projectPath: string): {
  postinstall: boolean;
  launch: boolean;
  dev: boolean;
  prod: boolean;
} | null {
  try {
    const packagePath = join(projectPath, "package.json");
    if (!existsSync(packagePath)) return null;
    
    // 读取并解析 JSON
    const content = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(content);
    const scripts = pkg.scripts || {};
    
    return {
      postinstall: !!scripts.postinstall,
      launch: !!scripts.launch,
      dev: !!scripts.dev,
      prod: !!scripts.prod,
    };
  } catch {
    return null;
  }
}

/**
 * 扫描 Dota2 项目
 * @param projectPath 项目路径，默认为 D:\test1
 */
export function scanDota2Project(
  projectPath: string = "D:\\test1"
): Dota2ProjectScanResult {
  const result: Dota2ProjectScanResult = {
    valid: false,
    path: resolve(projectPath),
    hostType: "unknown",
    capabilities: [],
    directories: {},
    keyFiles: {},
    scriptsCapabilities: {
      postinstall: false,
      launch: false,
      dev: false,
      prod: false,
    },
    errors: [],
    warnings: [],
  };

  // 1. 检查路径是否存在
  if (!existsSync(projectPath)) {
    result.errors.push(`项目路径不存在: ${projectPath}`);
    return result;
  }

  const pathStat = statSync(projectPath);
  if (!pathStat.isDirectory()) {
    result.errors.push(`项目路径不是目录: ${projectPath}`);
    return result;
  }

  // 2. 检查必需文件
  for (const file of xTemplateIndicators.requiredFiles) {
    if (checkFile(projectPath, file)) {
      if (file === "scripts/addon.config.ts") result.keyFiles.addonConfig = join(projectPath, file);
      if (file === "scripts/install.ts") result.keyFiles.installScript = join(projectPath, file);
      if (file === "scripts/launch.ts") result.keyFiles.launchScript = join(projectPath, file);
      if (file === "package.json") result.keyFiles.packageJson = join(projectPath, file);
    } else {
      result.errors.push(`缺少必需文件: ${file}`);
    }
  }

  // 3. 检查必需目录
  for (const dir of xTemplateIndicators.requiredDirs) {
    if (!checkDirectory(projectPath, dir)) {
      result.errors.push(`缺少必需目录: ${dir}`);
    }
  }

  // 4. 读取 package.json 脚本
  const scripts = readPackageScripts(projectPath);
  if (scripts) {
    result.scriptsCapabilities = scripts;
    
    // 检查必需脚本
    for (const script of xTemplateIndicators.requiredScripts) {
      if (!scripts[script]) {
        result.errors.push(`package.json 缺少必需脚本: ${script}`);
      }
    }
    
    // 记录可选脚本缺失
    for (const script of xTemplateIndicators.optionalScripts) {
      if (!scripts[script]) {
        result.warnings.push(`package.json 缺少推荐脚本: ${script}`);
      }
    }
  } else {
    result.errors.push("无法读取 package.json 或解析失败");
  }

  // 5. 设置目录信息
  if (checkDirectory(projectPath, "game/scripts/src")) {
    result.directories.serverSrc = join(projectPath, "game/scripts/src");
  }
  if (checkDirectory(projectPath, "content/panorama/src")) {
    result.directories.panoramaSrc = join(projectPath, "content/panorama/src");
  }
  if (checkDirectory(projectPath, "scripts")) {
    result.directories.scripts = join(projectPath, "scripts");
  }

  // 6. 判定宿主类型和能力
  const hasAllRequired = 
    result.errors.length === 0 || 
    result.errors.every(e => !xTemplateIndicators.requiredFiles.some(f => e.includes(f)) && 
                             !xTemplateIndicators.requiredDirs.some(d => e.includes(d)));

  if (hasAllRequired && scripts?.postinstall && scripts?.launch) {
    result.hostType = "dota2-x-template";
    result.valid = true;
    
    // 设置能力
    result.capabilities = [
      "install-link",
      "launch-tools",
      "panorama-build",
      "vscripts-build",
    ];
    
    if (scripts.dev) {
      result.capabilities.push("dev-watch");
    }
    if (scripts.prod) {
      result.capabilities.push("production-build");
    }
  } else {
    result.hostType = "unknown";
    result.valid = false;
    result.errors.push("项目不符合 dota2-x-template 规范");
  }

  return result;
}

/**
 * 检查是否为受支持的宿主
 */
export function isSupportedHost(projectPath: string = "D:\\test1"): boolean {
  const result = scanDota2Project(projectPath);
  return result.valid && result.hostType === "dota2-x-template";
}

/**
 * 获取项目信息摘要
 */
export function getProjectSummary(result: Dota2ProjectScanResult): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(60));
  lines.push("Dota2 项目扫描结果");
  lines.push("=".repeat(60));
  lines.push(`项目路径: ${result.path}`);
  lines.push(`宿主类型: ${result.hostType}`);
  lines.push(`有效性: ${result.valid ? "✅ 有效" : "❌ 无效"}`);
  lines.push("");
  
  lines.push("脚本能力:");
  lines.push(`  postinstall: ${result.scriptsCapabilities.postinstall ? "✅" : "❌"}`);
  lines.push(`  launch: ${result.scriptsCapabilities.launch ? "✅" : "❌"}`);
  lines.push(`  dev: ${result.scriptsCapabilities.dev ? "✅" : "❌"}`);
  lines.push(`  prod: ${result.scriptsCapabilities.prod ? "✅" : "❌"}`);
  lines.push("");
  
  lines.push("关键目录:");
  for (const [name, path] of Object.entries(result.directories)) {
    lines.push(`  ✅ ${name}: ${path}`);
  }
  lines.push("");
  
  lines.push("关键文件:");
  for (const [name, path] of Object.entries(result.keyFiles)) {
    if (path) {
      lines.push(`  ✅ ${name}: ${path}`);
    }
  }
  lines.push("");
  
  if (result.capabilities.length > 0) {
    lines.push("宿主能力:");
    for (const cap of result.capabilities) {
      lines.push(`  - ${cap}`);
    }
    lines.push("");
  }
  
  if (result.warnings.length > 0) {
    lines.push("警告:");
    for (const warning of result.warnings) {
      lines.push(`  ⚠️ ${warning}`);
    }
    lines.push("");
  }
  
  if (result.errors.length > 0) {
    lines.push("错误:");
    for (const error of result.errors) {
      lines.push(`  ❌ ${error}`);
    }
    lines.push("");
  }
  
  lines.push("=".repeat(60));
  
  return lines.join("\n");
}

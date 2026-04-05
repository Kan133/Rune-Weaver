#!/usr/bin/env node
/**
 * Rune Weaver - Assembly CLI Module
 *
 * Blueprint -> AssemblyPlan 链路 CLI
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { createAssemblyPlan, AssemblyPlanConfig } from "../../core/pipeline/assembly-plan.js";
import { validateAssemblyPlan, printAssemblyValidationReport } from "../../core/pipeline/assembly-validator.js";
import { resolvePatterns } from "../../core/patterns/resolver.js";
import type { Blueprint, AssemblyPlan } from "../../core/schema/types.js";

export interface AssemblyCLIOptions {
  command: "generate" | "validate" | "review";
  fromFile?: string;
  output?: string;
  json: boolean;
  verbose: boolean;
  /** 宿主根目录 (T067: 显式传入，不再硬编码) */
  hostRoot?: string;
}

// 返回状态类型
type AssemblyCLIStatus =
  | "success"
  | "validation_error"
  | "execution_error";

interface AssemblyCLIResult {
  status: AssemblyCLIStatus;
  blueprint?: Blueprint;
  assemblyPlan?: AssemblyPlan;
  resolution?: ReturnType<typeof resolvePatterns>;
  validation?: ReturnType<typeof validateAssemblyPlan>;
  message?: string;
  issues?: Array<{ code: string; message: string; path?: string }>;
}

function logInfo(message: string): void {
  console.error(message);
}

function logError(message: string): void {
  console.error(message);
}

/**
 * 运行 Assembly CLI 主流程
 */
export async function runAssemblyCLI(options: AssemblyCLIOptions): Promise<boolean> {
  const result = await runAssemblyCommand(options);

  if (options.json) {
    const jsonOutput = buildJSONOutput(result);
    if (options.output) {
      writeOutputToFile(options.output, JSON.stringify(jsonOutput, null, 2));
    }
    console.log(JSON.stringify(jsonOutput, null, 2));
  } else {
    printTerminalOutput(result, options);
    if (options.output && result.assemblyPlan) {
      writeOutputToFile(options.output, JSON.stringify({
        status: result.status,
        blueprint: result.blueprint,
        assemblyPlan: result.assemblyPlan,
        validation: result.validation,
      }, null, 2));
    }
  }

  return result.status !== "execution_error";
}

/**
 * 运行 Assembly 命令（内部）
 */
async function runAssemblyCommand(options: AssemblyCLIOptions): Promise<AssemblyCLIResult> {
  switch (options.command) {
    case "generate":
      return await runGenerate(options);
    case "validate":
      return await runValidate(options);
    case "review":
      return await runReview(options);
    default:
      return {
        status: "execution_error",
        message: `Unknown command: ${options.command}`,
      };
  }
}

/**
 * 生成 AssemblyPlan
 */
async function runGenerate(options: AssemblyCLIOptions): Promise<AssemblyCLIResult> {
  if (!options.fromFile) {
    return {
      status: "execution_error",
      message: "Generate command requires --from to specify Blueprint file",
    };
  }

  const loadResult = await loadBlueprintFromFile(options.fromFile);
  if (!loadResult.success) {
    return {
      status: "execution_error",
      message: loadResult.error,
    };
  }

  const blueprint = loadResult.blueprint!;

  logInfo("🔍 Resolving patterns from Blueprint...");
  
  // Get full resolution result to track unresolved patterns
  const resolutionResult = resolvePatterns(blueprint);
  
  // T067: 显式传入 host context，不再硬编码
  const hostRoot = options.hostRoot || process.env.RUNEWEAVER_HOST_ROOT || "";
  const config: AssemblyPlanConfig = {
    hostRoot,
    allowFallback: true,
    allowUnresolved: false,
  };
  
  const { plan, issues } = createAssemblyPlan(blueprint, config);

  if (!plan) {
    return {
      status: "execution_error",
      message: "Failed to create AssemblyPlan",
      blueprint,
      issues: issues.map((i) => ({
        code: i.code,
        message: i.message,
        path: i.path,
      })),
    };
  }

  logInfo("🔍 Validating AssemblyPlan...");
  const validation = validateAssemblyPlan(plan);

  // 保存评审产物（包含 resolution 信息和 host context）
  const reviewArtifact = generateReviewArtifact(blueprint, plan, validation, resolutionResult, hostRoot);
  await saveReviewArtifact(reviewArtifact, plan.blueprintId);

  return {
    status: validation.valid ? "success" : "validation_error",
    blueprint,
    assemblyPlan: plan,
    resolution: resolutionResult,
    validation,
    message: validation.valid
      ? "AssemblyPlan generated successfully"
      : "AssemblyPlan generated with validation issues",
  };
}

/**
 * 验证 AssemblyPlan 文件
 */
async function runValidate(options: AssemblyCLIOptions): Promise<AssemblyCLIResult> {
  if (!options.fromFile) {
    return {
      status: "execution_error",
      message: "Validate command requires --from to specify AssemblyPlan file",
    };
  }

  const loadResult = await loadAssemblyPlanFromFile(options.fromFile);
  if (!loadResult.success) {
    return {
      status: "execution_error",
      message: loadResult.error,
    };
  }

  const plan = loadResult.assemblyPlan!;
  const validation = validateAssemblyPlan(plan);

  if (!options.json) {
    console.log(printAssemblyValidationReport(validation));
  }

  return {
    status: validation.valid ? "success" : "validation_error",
    assemblyPlan: plan,
    validation,
    message: validation.valid ? "Validation passed" : "Validation failed",
  };
}

/**
 * 评审模式 - 生成详细报告
 */
async function runReview(options: AssemblyCLIOptions): Promise<AssemblyCLIResult> {
  // Review 模式与 generate 类似，但更注重输出报告
  const result = await runGenerate(options);

  if (result.assemblyPlan && !options.json) {
    logInfo("");
    logInfo("📋 Assembly Review Summary");
    logInfo("━".repeat(60));
    logInfo(`Blueprint: ${result.assemblyPlan.blueprintId}`);
    logInfo(`Patterns: ${result.assemblyPlan.selectedPatterns.length}`);
    
    // Show resolution status
    if (result.resolution) {
      logInfo(`Resolution Complete: ${result.resolution.complete ? "Yes" : "No"}`);
      if (result.resolution.unresolved.length > 0) {
        logInfo(`Unresolved Patterns: ${result.resolution.unresolved.length}`);
      }
    }
    
    logInfo(`Write Targets: ${result.assemblyPlan.writeTargets.length}`);
    logInfo(`Bridge Updates: ${result.assemblyPlan.bridgeUpdates?.length || 0}`);
    logInfo(`Ready for Host Write: ${result.assemblyPlan.readyForHostWrite ? "Yes" : "No"}`);

    if (result.validation) {
      logInfo("");
      logInfo(`Validation: ${result.validation.valid ? "PASS" : "FAIL"}`);
      logInfo(`Errors: ${result.validation.errors.length}, Warnings: ${result.validation.warnings.length}`);
    }

    // Show detailed unresolved info
    if (result.resolution && result.resolution.unresolved.length > 0) {
      logInfo("");
      logInfo("⚠️  Unresolved Pattern Details:");
      for (const u of result.resolution.unresolved) {
        logInfo(`  • ${u.requestedId}`);
        logInfo(`    Reason: ${u.reason}`);
      }
    }

    logInfo("");
    logInfo("📦 Review artifact saved to: tmp/assembly-review/");
  }

  return result;
}

/**
 * 从文件加载 Blueprint
 */
async function loadBlueprintFromFile(filePath: string): Promise<{ success: boolean; blueprint?: Blueprint; error?: string }> {
  try {
    const fullPath = resolve(filePath);
    if (!existsSync(fullPath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const content = readFileSync(fullPath, "utf-8");
    const data = JSON.parse(content);

    // Support both pure blueprint and nested format
    const blueprint = data.blueprint || data;

    return { success: true, blueprint };
  } catch (error) {
    return { success: false, error: `Failed to load: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 从文件加载 AssemblyPlan
 */
async function loadAssemblyPlanFromFile(filePath: string): Promise<{ success: boolean; assemblyPlan?: AssemblyPlan; error?: string }> {
  try {
    const fullPath = resolve(filePath);
    if (!existsSync(fullPath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const content = readFileSync(fullPath, "utf-8");
    const data = JSON.parse(content);

    // Support both pure assemblyPlan and nested format
    const assemblyPlan = data.assemblyPlan || data;

    return { success: true, assemblyPlan };
  } catch (error) {
    return { success: false, error: `Failed to load: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 生成评审产物 (T067: 使用显式 hostRoot)
 */
function generateReviewArtifact(
  blueprint: Blueprint,
  plan: AssemblyPlan,
  validation: ReturnType<typeof validateAssemblyPlan>,
  resolution?: ReturnType<typeof resolvePatterns>,
  hostRoot?: string
): Record<string, unknown> {
  // T067: hostRoot 来自显式参数，不再硬编码
  const effectiveHostRoot = hostRoot || process.env.RUNEWEAVER_HOST_ROOT || "NOT_SET";
  
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    hostContext: {
      hostRoot: effectiveHostRoot,
      source: hostRoot ? "cli-option" : (process.env.RUNEWEAVER_HOST_ROOT ? "env-var" : "default"),
    },
    blueprintSummary: {
      id: blueprint.id,
      summary: blueprint.summary,
      intentKind: blueprint.sourceIntent.intentKind,
    },
    selectedPatterns: plan.selectedPatterns,
    assumptions: blueprint.assumptions,
    unresolvedItems: resolution?.unresolved || [],
    resolutionIssues: resolution?.issues || [],
    resolutionComplete: resolution?.complete ?? false,
    // T063: 宿主写入目标映射
    hostWriteMapping: generateHostWriteMapping(plan.writeTargets, effectiveHostRoot),
    writeTargets: plan.writeTargets,
    // T064: 桥接计划
    bridgePlan: generateBridgePlan(plan.bridgeUpdates || []),
    bridgeUpdates: plan.bridgeUpdates,
    validations: plan.validations,
    readyForHostWrite: plan.readyForHostWrite,
    // T065: Readiness Gate 详情
    hostWriteReadiness: plan.hostWriteReadiness,
    notes: [
      `Selected Patterns: ${plan.selectedPatterns.length}`,
      `Unresolved Patterns: ${resolution?.unresolved.length || 0}`,
      `Resolution Complete: ${resolution?.complete ?? false}`,
      `Validation Errors: ${validation.errors.length}`,
      `Validation Warnings: ${validation.warnings.length}`,
      ...(resolution?.unresolved.map((u) => `[UNRESOLVED] ${u.requestedId}: ${u.reason}`) || []),
      ...validation.errors.map((e) => `[ERROR] ${e.message}`),
      ...validation.warnings.map((w) => `[WARN] ${w.message}`),
    ],
  };
}

/**
 * T063/T067: 生成宿主写入目标映射 (使用显式 hostRoot)
 */
function generateHostWriteMapping(
  writeTargets: Array<{target: string; path: string}>,
  hostRoot: string
): Array<{
  abstractTarget: string;
  abstractPath: string;
  hostRoot: string;
  hostRelativePath: string;
  hostAbsolutePath: string;
}> {
  const targetMapping: Record<string, {dir: string; ext: string}> = {
    server: { dir: "game/scripts/src/rune_weaver/generated/server", ext: ".ts" },
    shared: { dir: "game/scripts/src/rune_weaver/generated/shared", ext: ".ts" },
    ui: { dir: "content/panorama/src/rune_weaver/generated/ui", ext: ".tsx" },
    config: { dir: "game/scripts/src/rune_weaver/generated/config", ext: ".txt" },
  };
  
  return writeTargets.map(wt => {
    const mapping = targetMapping[wt.target];
    if (!mapping || hostRoot === "NOT_SET") {
      return {
        abstractTarget: wt.target,
        abstractPath: wt.path,
        hostRoot,
        hostRelativePath: mapping ? `${mapping.dir}/[feature].${mapping.ext}` : "unknown",
        hostAbsolutePath: "[host-not-set]",
      };
    }
    
    // 从 abstract path 提取 feature 名
    const match = wt.path.match(/([^/\\]+)\.(ts|tsx|txt)$/);
    const fileName = match ? match[1] + mapping.ext : wt.path;
    
    const hostRelativePath = `${mapping.dir}/${fileName}`;
    const hostAbsolutePath = `${hostRoot}\\${hostRelativePath.replace(/\//g, "\\")}`;
    
    return {
      abstractTarget: wt.target,
      abstractPath: wt.path,
      hostRoot,
      hostRelativePath,
      hostAbsolutePath,
    };
  });
}

/**
 * T067: 生成桥接计划 - 修正 hostFile 和 rwOwned 判定
 */
function generateBridgePlan(bridgeUpdates: Array<{target: string; file: string; action: string}>): Array<{
  action: string;
  target: string;
  rwOwned: boolean;
  hostFile: string;
  description: string;
}> {
  const actionDescriptions: Record<string, string> = {
    create: "Create RW bridge file if not exists",
    refresh: "Refresh RW-managed index file",
    inject_once: "Inject RW call into host entry (once)",
  };
  
  // T067: RW 拥有文件的正确路径（基于 target 前缀）
  const rwOwnedPatterns = [
    /^rune_weaver\//,  // 以 rune_weaver/ 开头的都是 RW 拥有的
  ];
  
  // 宿主拥有文件（inject_once 目标）
  const hostOwnedPatterns = [
    /modules\/index\.ts$/,  // server 宿主入口
    /hud\/script\.tsx$/,    // UI 宿主入口
  ];
  
  return bridgeUpdates.map(bu => {
    // T067: bu.file 已经是宿主相对路径，直接使用
    const hostFile = bu.file;
    
    // T067: 根据文件路径和 action 判定 rwOwned
    // create 和 refresh 都是 RW 拥有的
    // inject_once 是宿主拥有的
    const isRwOwned = bu.action !== "inject_once" && 
                      rwOwnedPatterns.some(pattern => pattern.test(bu.file));
    const isHostOwned = bu.action === "inject_once" || 
                        hostOwnedPatterns.some(pattern => pattern.test(bu.file));
    
    return {
      action: bu.action,
      target: bu.target,
      rwOwned: isRwOwned && !isHostOwned,
      hostFile,
      description: actionDescriptions[bu.action] || "Unknown action",
    };
  });
}

/**
 * 保存评审产物
 */
async function saveReviewArtifact(artifact: Record<string, unknown>, blueprintId: string): Promise<void> {
  const reviewDir = resolve("tmp/assembly-review");
  if (!existsSync(reviewDir)) {
    mkdirSync(reviewDir, { recursive: true });
  }

  const fileName = `${blueprintId}-${Date.now()}.json`;
  const filePath = resolve(reviewDir, fileName);

  writeFileSync(filePath, JSON.stringify(artifact, null, 2), "utf-8");
  logInfo(`💾 Review artifact saved: ${filePath}`);
}

/**
 * 构建 JSON 输出
 */
function buildJSONOutput(result: AssemblyCLIResult): Record<string, unknown> {
  return {
    status: result.status,
    blueprint: result.blueprint,
    assemblyPlan: result.assemblyPlan,
    validation: result.validation,
    message: result.message,
    issues: result.issues,
  };
}

/**
 * 打印终端输出
 */
function printTerminalOutput(result: AssemblyCLIResult, options: AssemblyCLIOptions): void {
  logInfo("=".repeat(60));
  logInfo("⚙️  Rune Weaver - Assembly");
  logInfo("=".repeat(60));
  logInfo("");

  if (result.status === "execution_error") {
    logError("❌ " + result.message);
    if (result.issues && result.issues.length > 0) {
      logError("");
      logError("Issues:");
      for (const issue of result.issues) {
        logError(`  • [${issue.code}] ${issue.message}`);
      }
    }
    return;
  }

  if (result.assemblyPlan) {
    logInfo("✅ " + result.message);
    logInfo("");

    logInfo("📋 Assembly Plan Summary:");
    logInfo("━".repeat(60));
    logInfo(`Blueprint ID: ${result.assemblyPlan.blueprintId}`);
    logInfo(`Selected Patterns: ${result.assemblyPlan.selectedPatterns.length}`);
    for (const p of result.assemblyPlan.selectedPatterns) {
      logInfo(`  • ${p.patternId} (${p.role})`);
    }

    // Show unresolved patterns if any
    if (result.resolution && result.resolution.unresolved.length > 0) {
      logInfo("");
      logInfo("⚠️  Unresolved Patterns:");
      for (const u of result.resolution.unresolved) {
        logInfo(`  • ${u.requestedId}: ${u.reason}`);
        if (u.suggestedAlternative) {
          logInfo(`    Suggested: ${u.suggestedAlternative}`);
        }
      }
    }

    // Show resolution issues if any
    if (result.resolution && result.resolution.issues.length > 0) {
      logInfo("");
      logInfo("📊 Resolution Issues:");
      for (const issue of result.resolution.issues) {
        const icon = issue.severity === "error" ? "❌" : "⚠️";
        logInfo(`  ${icon} [${issue.code}] ${issue.message}`);
      }
    }

    logInfo("");
    logInfo("📝 Write Targets:");
    for (const t of result.assemblyPlan.writeTargets) {
      logInfo(`  • [${t.target}] ${t.path}`);
    }

    if (result.assemblyPlan.bridgeUpdates && result.assemblyPlan.bridgeUpdates.length > 0) {
      logInfo("");
      logInfo("🔗 Bridge Updates:");
      for (const b of result.assemblyPlan.bridgeUpdates) {
        logInfo(`  • [${b.target}] ${b.file} (${b.action})`);
      }
    }

    if (result.validation) {
      logInfo("");
      logInfo("📊 Validation:");
      logInfo(`  Result: ${result.validation.valid ? "PASS" : "FAIL"}`);
      logInfo(`  Errors: ${result.validation.errors.length}`);
      logInfo(`  Warnings: ${result.validation.warnings.length}`);
    }

    logInfo("");
    logInfo(`📦 Ready for Host Write: ${result.assemblyPlan.readyForHostWrite ? "YES" : "NO"}`);

    // T065: 展示 Host Write Readiness Gate 详情
    if (result.assemblyPlan.hostWriteReadiness) {
      logInfo("");
      logInfo("🛡️  Host Write Readiness Gate:");
      logInfo("━".repeat(60));
      for (const check of result.assemblyPlan.hostWriteReadiness.checks) {
        const icon = check.passed ? "✅" : (check.severity === "error" ? "❌" : "⚠️");
        logInfo(`  ${icon} ${check.name}: ${check.message}`);
      }
      
      if (result.assemblyPlan.hostWriteReadiness.blockers.length > 0) {
        logInfo("");
        logInfo("  Blockers:");
        for (const blocker of result.assemblyPlan.hostWriteReadiness.blockers) {
          logInfo(`    • ${blocker}`);
        }
      }
    }

    if (result.assemblyPlan.readyForHostWrite) {
      logInfo("");
      logInfo("Next step:");
      logInfo("  rune-weaver write --assembly <file>");
    }
  }
}

/**
 * 写入输出到文件
 */
function writeOutputToFile(filePath: string, content: string): void {
  try {
    const fullPath = resolve(filePath);
    const dir = dirname(fullPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, content, "utf-8");
    logInfo(`💾 Output written: ${fullPath}`);
  } catch (error) {
    logError(`❌ Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 显示 Assembly 帮助
 */
export function showAssemblyHelp(): void {
  console.log(`
⚙️  Rune Weaver - Assembly Commands

Usage:
  npm run cli -- assembly <command> [options]

Commands:
  generate --from <file>    Generate AssemblyPlan from Blueprint
  validate --from <file>    Validate AssemblyPlan file
  review --from <file>      Generate AssemblyPlan with detailed review

Options:
  --from <file>             Input file path
  --output, -o <file>       Output file path
  --json                    Output as JSON
  --verbose, -v             Verbose output
  -h, --help                Show help

Examples:
  npm run cli -- assembly generate --from tmp/blueprint.json
  npm run cli -- assembly generate --from tmp/blueprint.json --json
  npm run cli -- assembly validate --from tmp/assembly.json
  npm run cli -- assembly review --from tmp/blueprint.json --output tmp/review.json

Output Status:
  - "success":            AssemblyPlan generated and validated
  - "validation_error":   AssemblyPlan has validation issues
  - "execution_error":    Execution failed
`);
}

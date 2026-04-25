#!/usr/bin/env node
/**
 * Rune Weaver - Blueprint CLI Module
 * 
 * Wizard -> IntentSchema -> Blueprint 链路 CLI
 * 
 * 命令:
 *   blueprint "需求"              从自然语言生成 Blueprint
 *   blueprint --from <file>       从 IntentSchema 文件生成 Blueprint
 *   blueprint validate <file>     验证 Blueprint
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { createLLMClientFromEnv, readLLMExecutionConfig } from "../../core/llm/factory.js";
import { runWizardToIntentSchema } from "../../core/wizard/intent-schema.js";
import { BlueprintBuilder } from "../../core/blueprint/builder.js";
import { validateBlueprint } from "../../core/blueprint/validator.js";
import type { IntentSchema, Blueprint, WizardClarificationPlan } from "../../core/schema/types.js";
import type { BlueprintValidationResult, BlueprintReviewArtifact } from "../../core/blueprint/types.js";

export interface BlueprintCLIOptions {
  command: "generate" | "validate";
  rawText?: string;
  fromFile?: string;
  output?: string;
  json: boolean;
  verbose: boolean;
  temperature?: number;
  model?: string;
}

// 返回状态类型
type BlueprintCLIStatus = 
  | "success"           // 成功生成 Blueprint
  | "validation_error"  // 验证错误
  | "execution_error";  // 执行失败

interface BlueprintCLIResult {
  status: BlueprintCLIStatus;
  schema?: IntentSchema;
  clarificationPlan?: WizardClarificationPlan;
  blueprint?: Blueprint;
  validation?: BlueprintValidationResult;
  reviewArtifact?: BlueprintReviewArtifact;
  message?: string;
  issues?: Array<{ code: string; message: string; path?: string }>;
}

// 日志输出函数
function logInfo(message: string): void {
  console.error(message);
}

function logError(message: string): void {
  console.error(message);
}

/**
 * 运行 Blueprint CLI 主流程
 */
export async function runBlueprintCLI(options: BlueprintCLIOptions): Promise<boolean> {
  const isJSONMode = options.json;

  if (!isJSONMode) {
    logInfo("=".repeat(60));
    logInfo("📋 Rune Weaver - Wizard -> Blueprint");
    logInfo("=".repeat(60));
    logInfo("");
  }

  const result = await runBlueprintCommand(options);

  if (isJSONMode) {
    const jsonOutput = buildJSONOutput(result);
    if (options.output) {
      writeOutputToFile(options.output, JSON.stringify(jsonOutput, null, 2));
    }
    console.log(JSON.stringify(jsonOutput, null, 2));
  } else {
    printTerminalOutput(result, options);
    if (options.output && result.blueprint) {
      writeOutputToFile(options.output, JSON.stringify({
        status: result.status,
        schema: result.schema,
        blueprint: result.blueprint,
        validation: result.validation,
        reviewArtifact: result.reviewArtifact,
      }, null, 2));
    }
  }

  // 只有 execution_error 返回 false（真正的失败）
  // schema_not_ready 是正常的澄清分支，返回 true
  return result.status !== "execution_error";
}

/**
 * 运行 Blueprint 命令（内部）
 */
async function runBlueprintCommand(options: BlueprintCLIOptions): Promise<BlueprintCLIResult> {
  let schema: IntentSchema;
  let clarificationPlan: WizardClarificationPlan | undefined;

  // 1. 获取 IntentSchema
  if (options.fromFile) {
    const result = await loadIntentSchemaFromFile(options.fromFile);
    if (!result.success) {
      return {
        status: "execution_error",
        message: result.error,
      };
    }
    schema = result.schema!;
  } else if (options.rawText) {
    logInfo("💬 输入需求:");
    logInfo(`   ${options.rawText}`);
    logInfo("");
    logInfo("🔍 步骤 1/2: 运行 Wizard 生成 IntentSchema...");

    const wizardResult = await runWizard(options);
    if (!wizardResult.success) {
      return {
        status: "execution_error",
        message: wizardResult.error,
      };
    }
    schema = wizardResult.schema!;
    clarificationPlan = wizardResult.clarificationPlan;
  } else {
    return {
      status: "execution_error",
      message: "必须提供需求文本或使用 --from 指定文件",
    };
  }

  // 2. 构建 Blueprint
  logInfo("");
  logInfo("🔍 步骤 2/2: 构建 Blueprint...");

  const builder = new BlueprintBuilder({
    autoConnect: true,
    enableUIBranch: true,
  });

  const buildResult = builder.build(schema);

  if (!buildResult.blueprint) {
    return {
      status: "execution_error",
      schema,
      clarificationPlan,
      message: "Blueprint 构建失败",
      issues: buildResult.issues.map(i => ({
        code: i.code,
        message: i.message,
        path: i.path,
      })),
    };
  }

  // 3. 验证 Blueprint
  const validation = validateBlueprint(buildResult.blueprint);

  // 4. 生成评审产物
  const reviewArtifact = generateReviewArtifact(schema, buildResult.blueprint, validation);

  // 5. 保存评审产物到 tmp/blueprint-review/
  await saveReviewArtifact(reviewArtifact, buildResult.blueprint.id);

  const validationStatus = validation.valid && buildResult.success ? "success" : "validation_error";

  return {
    status: validationStatus,
    schema,
    clarificationPlan,
    blueprint: buildResult.blueprint,
    validation,
    reviewArtifact,
    message: validationStatus === "success" ? "Blueprint 生成成功" : "Blueprint 已生成，但仍需 review",
    issues: buildResult.issues.map(i => ({
      code: i.code,
      message: i.message,
      path: i.path,
    })),
  };
}

/**
 * 运行 Wizard 生成 IntentSchema
 */
async function runWizard(options: BlueprintCLIOptions): Promise<{ success: boolean; schema?: IntentSchema; clarificationPlan?: WizardClarificationPlan; error?: string }> {
  try {
    const client = createLLMClientFromEnv(process.cwd());
    const llmConfig = readLLMExecutionConfig(process.cwd(), "blueprint");
    
    const result = await runWizardToIntentSchema({
      client,
      input: {
        rawText: options.rawText!,
        temperature: options.temperature ?? llmConfig.temperature,
        model: options.model ?? llmConfig.model,
        providerOptions: llmConfig.providerOptions,
      },
    });

    if (!result.valid) {
      return {
        success: false,
        error: `IntentSchema 验证失败: ${result.issues.map(i => i.message).join(", ")}`,
      };
    }

    return { success: true, schema: result.schema, clarificationPlan: result.clarificationPlan };
  } catch (error) {
    return {
      success: false,
      error: `Wizard 执行失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 从文件加载 IntentSchema
 */
async function loadIntentSchemaFromFile(filePath: string): Promise<{ success: boolean; schema?: IntentSchema; error?: string }> {
  try {
    const fullPath = resolve(filePath);
    if (!existsSync(fullPath)) {
      return { success: false, error: `文件不存在: ${filePath}` };
    }

    const content = readFileSync(fullPath, "utf-8");
    const data = JSON.parse(content);
    
    // 支持两种格式：纯 schema 或包含 schema 的对象
    const schema = data.schema || data;
    
    return { success: true, schema };
  } catch (error) {
    return { success: false, error: `加载失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 生成评审产物
 */
function generateReviewArtifact(
  schema: IntentSchema,
  blueprint: Blueprint,
  validation: BlueprintValidationResult
): BlueprintReviewArtifact {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    sourceSchema: {
      goal: schema.request.goal,
      intentKind: schema.classification.intentKind,
      uncertaintyCount: schema.uncertainties?.length || 0,
    },
    blueprint: {
      id: blueprint.id,
      summary: blueprint.summary,
      moduleCount: blueprint.modules.length,
      connectionCount: blueprint.connections.length,
    },
    patternHints: blueprint.patternHints,
    assumptions: blueprint.assumptions,
    readyForAssembly: blueprint.readyForAssembly && validation.valid,
    notes: [
      `验证错误: ${validation.errors.length}`,
      `验证警告: ${validation.warnings.length}`,
      ...validation.errors.map(e => `[ERROR] ${e.message}`),
      ...validation.warnings.map(w => `[WARN] ${w.message}`),
    ],
  };
}

/**
 * 保存评审产物到 tmp/blueprint-review/
 */
async function saveReviewArtifact(artifact: BlueprintReviewArtifact, blueprintId: string): Promise<void> {
  const reviewDir = resolve("tmp/blueprint-review");
  if (!existsSync(reviewDir)) {
    mkdirSync(reviewDir, { recursive: true });
  }

  const fileName = `${blueprintId}-${Date.now()}.json`;
  const filePath = resolve(reviewDir, fileName);
  
  writeFileSync(filePath, JSON.stringify(artifact, null, 2), "utf-8");
  logInfo(`💾 评审产物已保存: ${filePath}`);
}

/**
 * 构建 JSON 输出
 */
function buildJSONOutput(result: BlueprintCLIResult): Record<string, unknown> {
  return {
    status: result.status,
    schema: result.schema,
    clarificationPlan: result.clarificationPlan,
    blueprint: result.blueprint,
    validation: result.validation,
    reviewArtifact: result.reviewArtifact,
    message: result.message,
    issues: result.issues,
  };
}

/**
 * 打印终端输出
 */
function printTerminalOutput(result: BlueprintCLIResult, options: BlueprintCLIOptions): void {
  switch (result.status) {
    case "execution_error":
      logError("");
      logError("❌ 执行失败");
      logError("━".repeat(60));
      logError(result.message || "未知错误");
      if (result.issues && result.issues.length > 0) {
        logError("");
        logError("问题列表:");
        for (const issue of result.issues) {
          logError(`  • [${issue.code}] ${issue.message}`);
        }
      }
      break;

    case "validation_error":
    case "success":
      if (result.clarificationPlan?.questions.length) {
        logInfo("");
        logInfo("🧭 Wizard 建议追问:");
        for (const question of result.clarificationPlan.questions) {
          logInfo(`  • ${question.question}`);
        }
      }
      if (result.blueprint && result.validation) {
        printBlueprintSummary(result.blueprint, result.validation);
      }
      break;
  }
}

/**
 * 打印 Blueprint 摘要
 */
function printBlueprintSummary(blueprint: Blueprint, validation: BlueprintValidationResult): void {
  logInfo("");
  logInfo(`📋 Blueprint: ${blueprint.id}`);
  logInfo("━".repeat(60));
  logInfo(`来源意图: ${blueprint.sourceIntent.intentKind}`);
  logInfo(`目标: ${blueprint.sourceIntent.goal}`);
  logInfo(`描述: ${blueprint.summary}`);
  logInfo("");
  
  logInfo(`🔧 模块: ${blueprint.modules.length} 个`);
  for (const mod of blueprint.modules) {
    logInfo(`  • ${mod.id} (${mod.category})`);
    if (mod.responsibilities.length > 0) {
      logInfo(`    职责: ${mod.responsibilities.join(", ")}`);
    }
  }
  
  logInfo("");
  logInfo(`🔗 连接: ${blueprint.connections.length} 个`);
  for (const conn of blueprint.connections) {
    logInfo(`  • ${conn.from} → ${conn.to}`);
    logInfo(`    目的: ${conn.purpose}`);
  }

  if (blueprint.patternHints.length > 0) {
    logInfo("");
    logInfo("🧩 Pattern 提示:");
    for (const hint of blueprint.patternHints) {
      logInfo(`  • [${hint.category}] ${hint.suggestedPatterns.join(", ")}`);
      if (hint.rationale) {
        logInfo(`    ${hint.rationale}`);
      }
    }
  }

  if (blueprint.assumptions.length > 0) {
    logInfo("");
    logInfo("📋 假设:");
    for (const assumption of blueprint.assumptions) {
      logInfo(`  • ${assumption}`);
    }
  }

  logInfo("");
  logInfo("📊 验证结果:");
  if (validation.errors.length > 0) {
    logInfo(`  ❌ 错误: ${validation.errors.length}`);
    for (const err of validation.errors.slice(0, 3)) {
      logInfo(`     - ${err.message}`);
    }
  }
  if (validation.warnings.length > 0) {
    logInfo(`  ⚠️  警告: ${validation.warnings.length}`);
  }
  
  const ready = blueprint.readyForAssembly && validation.valid;
  logInfo("");
  logInfo(`${ready ? "✅" : "❌"} Ready for Assembly: ${ready ? "是" : "否"}`);
  
  if (ready) {
    logInfo("");
    logInfo("📦 评审产物已保存到: tmp/blueprint-review/");
    logInfo("推荐下一步:");
    logInfo("  rune-weaver assemble --blueprint <file>");
  }
}

/**
 * 验证 Blueprint 文件
 */
async function runValidate(options: BlueprintCLIOptions): Promise<BlueprintCLIResult> {
  if (!options.fromFile) {
    return {
      status: "execution_error",
      message: "validate 命令需要 --from 指定 Blueprint 文件",
    };
  }

  const result = await loadBlueprintFromFile(options.fromFile);
  if (!result.success) {
    return {
      status: "execution_error",
      message: result.error,
    };
  }

  const validation = validateBlueprint(result.blueprint!);

  if (options.json) {
    console.log(JSON.stringify({
      status: validation.valid ? "success" : "validation_error",
      validation: sanitizeValidation(validation),
    }, null, 2));
  } else {
    printValidationResult(result.blueprint!, validation);
  }

  return {
    status: validation.valid ? "success" : "validation_error",
    blueprint: result.blueprint,
    validation,
    message: validation.valid ? "验证通过" : "验证未通过",
  };
}

/**
 * 从文件加载 Blueprint
 */
async function loadBlueprintFromFile(filePath: string): Promise<{ success: boolean; blueprint?: Blueprint; error?: string }> {
  try {
    const fullPath = resolve(filePath);
    if (!existsSync(fullPath)) {
      return { success: false, error: `文件不存在: ${filePath}` };
    }

    const content = readFileSync(fullPath, "utf-8");
    const data = JSON.parse(content);
    
    // 支持两种格式：纯 blueprint 或包含 blueprint 的对象
    const blueprint = data.blueprint || data;
    
    return { success: true, blueprint };
  } catch (error) {
    return { success: false, error: `加载失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 打印验证结果
 */
function printValidationResult(blueprint: Blueprint, validation: BlueprintValidationResult): void {
  logInfo(`📋 Blueprint: ${blueprint.id}`);
  logInfo("━".repeat(60));
  
  logInfo("📊 统计:");
  logInfo(`  模块数: ${validation.stats.moduleCount}`);
  logInfo(`  连接数: ${validation.stats.connectionCount}`);
  logInfo(`  输入模块: ${validation.stats.inputModuleCount}`);
  logInfo(`  效果模块: ${validation.stats.effectModuleCount}`);
  logInfo(`  UI 模块: ${validation.stats.uiModuleCount}`);
  
  if (validation.errors.length > 0) {
    logInfo("");
    logInfo("❌ 错误:");
    for (const err of validation.errors) {
      logInfo(`  - ${err.message}`);
    }
  }
  
  if (validation.warnings.length > 0) {
    logInfo("");
    logInfo("⚠️  警告:");
    for (const warn of validation.warnings) {
      logInfo(`  - ${warn.message}`);
    }
  }
  
  logInfo("");
  logInfo(`${validation.valid ? "✅" : "❌"} 验证结果: ${validation.valid ? "通过" : "未通过"}`);
}

/**
 * 清理验证结果（移除循环引用）
 */
function sanitizeValidation(validation: BlueprintValidationResult): any {
  return {
    valid: validation.valid,
    errors: validation.errors.map(e => ({
      code: e.code,
      scope: e.scope,
      severity: e.severity,
      message: e.message,
      path: e.path,
    })),
    warnings: validation.warnings.map(w => ({
      code: w.code,
      scope: w.scope,
      severity: w.severity,
      message: w.message,
      path: w.path,
    })),
    stats: validation.stats,
  };
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
    logInfo(`💾 结果已写入: ${fullPath}`);
  } catch (error) {
    logError(`❌ 写入文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 显示 Blueprint 帮助
 */
export function showBlueprintHelp(): void {
  console.log(`
📋 Rune Weaver - Blueprint 命令

使用方式:
  npm run cli -- blueprint "<需求文本>" [选项]
  npm run cli -- blueprint --from <schema-file> [选项]

参数:
  <需求文本>              自然语言功能需求

选项:
  --from <file>           从 IntentSchema 文件生成
  --output, -o <file>     将结果写入文件
  --json                  以 JSON 格式输出
  --temperature <num>     设置 temperature (默认: 0.6)
  --model <name>          指定模型名称
  --verbose, -v           显示详细输出
  -h, --help              显示此帮助

子命令:
  validate --from <file>  验证 Blueprint 文件

返回状态 (JSON 模式):
  - "success":            Blueprint 生成成功且验证通过
  - "schema_not_ready":   Schema 需要澄清（正常分支，不是错误）
  - "validation_error":   Blueprint 验证未通过
  - "execution_error":    执行失败（真正的错误）

示例:
  # 从自然语言生成
  npm run cli -- blueprint "做一个按Q键的冲刺技能"

  # 从 IntentSchema 文件生成
  npm run cli -- blueprint --from tmp/intent-schema.json

  # JSON 输出
  npm run cli -- blueprint "做一个冲刺技能" --json

  # 生成并保存
  npm run cli -- blueprint "做一个冲刺技能" --output tmp/blueprint.json

  # 验证 Blueprint
  npm run cli -- blueprint validate --from tmp/blueprint.json
`);
}

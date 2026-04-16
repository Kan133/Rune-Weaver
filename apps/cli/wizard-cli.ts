#!/usr/bin/env node
/**
 * Rune Weaver - Wizard CLI Module
 * 
 * Wizard -> IntentSchema 链路 CLI
 * 与 docs/SCHEMA.md 对齐
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { createLLMClientFromEnv, readLLMExecutionConfig } from "../../core/llm/factory.js";
import { runWizardToIntentSchema } from "../../core/wizard/intent-schema.js";
import { validateIntentSchema, getValidationSummary } from "../../core/validation/schema-validator.js";
import type { IntentSchema } from "../../core/schema/types.js";

export interface WizardCLIOptions {
  rawText: string;
  json: boolean;
  output?: string;
  verbose: boolean;
  temperature?: number;
  model?: string;
}

interface WizardCLIResult {
  success: boolean;
  schema?: IntentSchema;
  message?: string;
  issues?: Array<{ code: string; message: string; severity: string }>;
}

function logInfo(message: string): void {
  console.error(message);
}

function logError(message: string): void {
  console.error(message);
}

/**
 * 运行 Wizard CLI
 */
export async function runWizardCLI(options: WizardCLIOptions): Promise<boolean> {
  const result = await runWizardCommand(options);

  if (options.json) {
    const jsonOutput = {
      success: result.success,
      schema: result.schema,
      message: result.message,
      issues: result.issues,
    };
    
    if (options.output) {
      writeOutputToFile(options.output, JSON.stringify(jsonOutput, null, 2));
    }
    console.log(JSON.stringify(jsonOutput, null, 2));
  } else {
    printTerminalOutput(result, options);
    if (options.output && result.schema) {
      writeOutputToFile(options.output, JSON.stringify(result.schema, null, 2));
    }
  }

  return result.success;
}

/**
 * 运行 Wizard 命令（内部）
 */
async function runWizardCommand(options: WizardCLIOptions): Promise<WizardCLIResult> {
  if (!options.rawText.trim()) {
    return {
      success: false,
      message: "必须提供需求文本",
    };
  }

  try {
    const client = createLLMClientFromEnv(process.cwd());
    const llmConfig = readLLMExecutionConfig(process.cwd(), "wizard");
    
    const result = await runWizardToIntentSchema({
      client,
      input: {
        rawText: options.rawText,
        temperature: options.temperature ?? llmConfig.temperature,
        model: options.model ?? llmConfig.model,
        providerOptions: llmConfig.providerOptions,
      },
    });

    const summary = getValidationSummary(result.issues);

    if (!result.valid) {
      return {
        success: false,
        schema: result.schema,
        message: `IntentSchema 验证失败: ${summary.errorCount} 个错误`,
        issues: result.issues.map(i => ({
          code: i.code,
          message: i.message,
          severity: i.severity,
        })),
      };
    }

    return {
      success: true,
      schema: result.schema,
      message: `IntentSchema 生成成功 (置信度: ${result.schema.classification.confidence || "medium"})`,
      issues: result.issues.map(i => ({
        code: i.code,
        message: i.message,
        severity: i.severity,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: `Wizard 执行失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 打印终端输出
 */
function printTerminalOutput(result: WizardCLIResult, options: WizardCLIOptions): void {
  logInfo("=".repeat(60));
  logInfo("🔮 Rune Weaver - Wizard -> IntentSchema");
  logInfo("=".repeat(60));
  logInfo("");

  if (!result.success) {
    logError("❌ " + result.message);
    if (result.issues && result.issues.length > 0) {
      logError("");
      logError("问题列表:");
      for (const issue of result.issues) {
        const icon = issue.severity === "error" ? "❌" : "⚠️";
        logError(`  ${icon} [${issue.code}] ${issue.message}`);
      }
    }
    return;
  }

  if (!result.schema) {
    logError("❌ 未知错误: Schema 未生成");
    return;
  }

  const schema = result.schema;

  logInfo("✅ " + result.message);
  logInfo("");
  
  logInfo("📋 Schema 摘要:");
  logInfo("━".repeat(60));
  logInfo(`目标: ${schema.request.goal}`);
  logInfo(`意图类型: ${schema.classification.intentKind}`);
  logInfo(`置信度: ${schema.classification.confidence || "medium"}`);
  logInfo(`准备就绪: ${schema.isReadyForBlueprint ? "是" : "否"}`);
  logInfo("");
  
  logInfo("📋 功能需求:");
  for (const req of schema.requirements.functional) {
    logInfo(`  • ${req}`);
  }

  if (schema.openQuestions.length > 0) {
    logInfo("");
    logInfo("❓ 待澄清问题:");
    for (const q of schema.openQuestions) {
      logInfo(`  • ${q}`);
    }
  }

  if (schema.resolvedAssumptions.length > 0) {
    logInfo("");
    logInfo("✓ 已解决的假设:");
    for (const a of schema.resolvedAssumptions) {
      logInfo(`  • ${a}`);
    }
  }

  if (result.issues && result.issues.length > 0) {
    logInfo("");
    logInfo("⚠️  警告:");
    for (const issue of result.issues) {
      logInfo(`  • [${issue.code}] ${issue.message}`);
    }
  }

  logInfo("");
  logInfo("━".repeat(60));
  
  if (schema.isReadyForBlueprint) {
    logInfo("📦 推荐下一步:");
    logInfo("  npm run cli -- blueprint --from <schema-file>");
  } else {
    logInfo("⏸️  需要进一步澄清后才能生成 Blueprint");
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
    logInfo(`💾 结果已写入: ${fullPath}`);
  } catch (error) {
    logError(`❌ 写入文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 显示 Wizard 帮助
 */
export function showWizardHelp(): void {
  console.log(`
🔮 Rune Weaver - Wizard 命令

使用方式:
  npm run cli -- wizard "<需求文本>" [选项]

选项:
  --output, -o <file>   将结果写入文件
  --json                以 JSON 格式输出
  --temperature <num>   设置 temperature (默认: 1)
  --model <name>        指定模型名称
  --verbose, -v         显示详细输出
  -h, --help            显示此帮助

示例:
  npm run cli -- wizard "做一个按Q键的冲刺技能"
  npm run cli -- wizard "做一个按Q键的冲刺技能" --json
  npm run cli -- wizard "做一个按Q键的冲刺技能" --output tmp/intent-schema.json
`);
}

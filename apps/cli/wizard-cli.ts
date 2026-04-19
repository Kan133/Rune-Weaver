#!/usr/bin/env node
/**
 * Rune Weaver - Wizard CLI Module
 * 
 * Wizard -> IntentSchema 链路 CLI
 * 与 docs/SCHEMA.md 对齐
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { createLLMClientFromEnv, readLLMExecutionConfig } from "../../core/llm/factory.js";
import {
  buildWizardStabilityArtifact,
  DEFAULT_WIZARD_STABILITY_CORPUS,
  parseWizardStabilityCorpus,
  type WizardStabilityArtifact,
  type WizardStabilityCorpusEntry,
  type WizardStabilityPromptResult,
} from "../../core/wizard/stability-harness.js";
import { getValidationSummary } from "../../core/validation/schema-validator.js";
import type { IntentSchema, RelationCandidate, WizardClarificationPlan } from "../../core/schema/types.js";
import { resolveCreateWizardFlow } from "./helpers/wizard-flow.js";

export interface WizardCLIOptions {
  subcommand?: "generate" | "stability";
  rawText: string;
  json: boolean;
  output?: string;
  verbose: boolean;
  temperature?: number;
  model?: string;
  corpus?: string;
  runs?: number;
  hostRoot?: string;
}

interface WizardCLIResult {
  success: boolean;
  schema?: IntentSchema;
  clarificationPlan?: WizardClarificationPlan;
  relationCandidates?: RelationCandidate[];
  message?: string;
  issues?: Array<{ code: string; message: string; severity: string }>;
}

interface WizardStabilityCLIResult {
  success: boolean;
  artifact?: WizardStabilityArtifact;
  message?: string;
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
  if ((options.subcommand || "generate") === "stability") {
    const result = await runWizardStabilityCommand(options);

    if (options.json) {
      if (options.output && result.artifact) {
        writeOutputToFile(options.output, JSON.stringify(result.artifact, null, 2));
      }
      console.log(JSON.stringify({
        success: result.success,
        message: result.message,
        artifact: result.artifact,
      }, null, 2));
    } else {
      printWizardStabilityOutput(result, options);
      if (options.output && result.artifact) {
        writeOutputToFile(options.output, JSON.stringify(result.artifact, null, 2));
      }
    }

    return result.success;
  }

  const result = await runWizardCommand(options);

  if (options.json) {
    const jsonOutput = {
      success: result.success,
      schema: result.schema,
      clarificationPlan: result.clarificationPlan,
      relationCandidates: result.relationCandidates,
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
      writeOutputToFile(options.output, JSON.stringify({
        schema: result.schema,
        clarificationPlan: result.clarificationPlan,
        relationCandidates: result.relationCandidates,
      }, null, 2));
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
    const result = await resolveCreateWizardFlow({
      client,
      rawText: options.rawText,
      hostRoot: options.hostRoot,
      allowInteractive: !options.json,
      temperature: options.temperature ?? llmConfig.temperature,
      model: options.model ?? llmConfig.model,
      providerOptions: llmConfig.providerOptions,
    });

    const summary = getValidationSummary(result.issues);

    if (!result.valid) {
      return {
        success: false,
        schema: result.schema,
        clarificationPlan: result.clarificationPlan,
        relationCandidates: result.relationCandidates,
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
      clarificationPlan: result.clarificationPlan,
      relationCandidates: result.relationCandidates,
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

async function runWizardStabilityCommand(options: WizardCLIOptions): Promise<WizardStabilityCLIResult> {
  try {
    const client = createLLMClientFromEnv(process.cwd());
    const llmConfig = readLLMExecutionConfig(process.cwd(), "wizard");
    const model = options.model ?? llmConfig.model;
    const temperature = options.temperature ?? llmConfig.temperature;
    const runCount = options.runs && Number.isFinite(options.runs) && options.runs > 0
      ? Math.floor(options.runs)
      : 3;
    const corpus = loadWizardStabilityCorpus(options.corpus);

    const promptResults: WizardStabilityPromptResult[] = [];
    for (const entry of corpus) {
      const runs: WizardStabilityPromptResult["runs"] = [];
      for (let i = 0; i < runCount; i++) {
        const result = await resolveCreateWizardFlow({
          client,
          rawText: entry.prompt,
          temperature,
          model,
          providerOptions: llmConfig.providerOptions,
        });
        runs.push({
          run: i + 1,
          valid: result.valid,
          schema: result.schema,
          issues: result.issues,
          clarificationPlan: result.clarificationPlan,
        });
      }

      promptResults.push({
        entry,
        runs,
      });
    }

    return {
      success: true,
      artifact: buildWizardStabilityArtifact({
        model,
        temperature,
        runCount,
        corpus,
        promptResults,
      }),
      message: `Wizard stability harness completed for ${corpus.length} prompt(s) x ${runCount} run(s).`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Wizard stability harness failed: ${error instanceof Error ? error.message : String(error)}`,
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
  logInfo(`不确定项: ${schema.uncertainties?.length || 0}`);
  logInfo("");
  
  logInfo("📋 功能需求:");
  for (const req of schema.requirements.functional) {
    logInfo(`  • ${req}`);
  }

  if ((schema.uncertainties?.length || 0) > 0) {
    logInfo("");
    logInfo("❓ 语义不确定项:");
    for (const item of schema.uncertainties || []) {
      logInfo(`  • ${item.summary}`);
    }
  }

  if (result.clarificationPlan?.questions.length) {
    logInfo("");
    logInfo("🧭 建议追问:");
    for (const question of result.clarificationPlan.questions) {
      logInfo(`  • ${question.question}`);
    }
  }

  if (result.relationCandidates?.length) {
    logInfo("");
    logInfo("🔗 Relation 候选:");
    for (const candidate of result.relationCandidates) {
      logInfo(`  • ${candidate.targetFeatureId} [${candidate.confidence}] via "${candidate.matchedAlias}"`);
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
  logInfo("📦 推荐下一步:");
  if (result.clarificationPlan?.questions.length) {
    logInfo("  先回答追问让 schema 收敛，再继续生成更稳定的 Blueprint。");
  } else {
    logInfo("  npm run cli -- blueprint --from <schema-file>");
  }
}

function printWizardStabilityOutput(result: WizardStabilityCLIResult, options: WizardCLIOptions): void {
  logInfo("=".repeat(60));
  logInfo("📈 Rune Weaver - Wizard Stability Harness");
  logInfo("=".repeat(60));
  logInfo("");

  if (!result.success || !result.artifact) {
    logError("❌ " + (result.message || "Wizard stability harness failed"));
    return;
  }

  const artifact = result.artifact;
  logInfo("✅ " + (result.message || "Wizard stability harness completed"));
  logInfo("");
  logInfo("📋 Harness 摘要:");
  logInfo("━".repeat(60));
  logInfo(`模型: ${artifact.model || "(default)"}`);
  logInfo(`Temperature: ${artifact.temperature}`);
  logInfo(`Prompt 数: ${artifact.corpus.length}`);
  logInfo(`每个 Prompt 采样次数: ${artifact.runCount}`);
  logInfo(`整体 valid rate: ${(artifact.summary.validRate * 100).toFixed(1)}%`);
  logInfo(`IntentKind 分布: ${formatDistribution(artifact.summary.intentKindDistribution)}`);
  logInfo(`Uncertainty 数分布: ${formatDistribution(artifact.summary.uncertaintyCountDistribution)}`);
  logInfo(`Clarification 触发率: ${formatRate(artifact.summary.clarificationPlanRate)}`);
  logInfo(`Clarification 问题数分布: ${formatDistribution(artifact.summary.clarificationQuestionCountDistribution)}`);
  logInfo(`Coverage(key/count/distance/duration/relation): ${formatCoverageSummary(artifact.summary.semanticCoverage)}`);
  if (Object.keys(artifact.summary.issueCodeDistribution).length > 0) {
    logInfo(`Issue 分布: ${formatDistribution(artifact.summary.issueCodeDistribution)}`);
  }

  for (const summary of artifact.promptSummaries) {
    logInfo("");
    logInfo(`• ${summary.id}`);
    logInfo(`  valid rate: ${(summary.validRate * 100).toFixed(1)}%`);
    logInfo(`  intentKind: ${formatDistribution(summary.intentKindDistribution)}`);
    logInfo(`  mechanics drift variants: ${summary.normalizedMechanicsVariantCount}`);
    logInfo(`  core facet drift variants: ${summary.coreFacetVariantCount}`);
    logInfo(`  uncertainty counts: ${formatDistribution(summary.uncertaintyCountDistribution)}`);
    logInfo(`  clarification rate: ${formatRate(summary.clarificationPlanRate)}`);
    logInfo(`  clarification counts: ${formatDistribution(summary.clarificationQuestionCountDistribution)}`);
    logInfo(`  coverage: ${formatCoverageSummary(summary.semanticCoverage)}`);
    if (Object.keys(summary.issueCodeDistribution).length > 0) {
      logInfo(`  issues: ${formatDistribution(summary.issueCodeDistribution)}`);
    }
  }

  if (options.output) {
    logInfo("");
    logInfo(`💾 Artifact target: ${resolve(options.output)}`);
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
  npm run cli -- wizard stability [选项]

选项:
  --output, -o <file>   将结果写入文件
  --json                以 JSON 格式输出
  --temperature <num>   设置 temperature (默认: 从 workflow 配置解析)
  --model <name>        指定模型名称
  --host <path>         可选：加载 workspace relation candidates
  --corpus <file>       stability 模式下读取 JSON corpus 文件
  --runs <num>          stability 模式下每个 prompt 采样次数 (默认: 3)
  --verbose, -v         显示详细输出
  -h, --help            显示此帮助

示例:
  npm run cli -- wizard "做一个按Q键的冲刺技能"
  npm run cli -- wizard "做一个按Q键的冲刺技能" --json
  npm run cli -- wizard "做一个按Q键的冲刺技能" --output tmp/intent-schema.json
  npm run cli -- wizard stability --output tmp/wizard-stability.json
`);
}

function loadWizardStabilityCorpus(corpusPath?: string): WizardStabilityCorpusEntry[] {
  if (!corpusPath) {
    return DEFAULT_WIZARD_STABILITY_CORPUS;
  }

  const fullPath = resolve(corpusPath);
  const raw = readFileSync(fullPath, "utf-8");
  return parseWizardStabilityCorpus(raw);
}

function formatDistribution(distribution: Record<string, number>): string {
  const entries = Object.entries(distribution);
  if (entries.length === 0) {
    return "(none)";
  }

  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCoverageSummary(summary: WizardStabilityArtifact["summary"]["semanticCoverage"]): string {
  return [
    `key=${formatRate(summary.keyPreservationRate)}`,
    `count=${formatRate(summary.countPreservationRate)}`,
    `distance=${formatRate(summary.distancePreservationRate)}`,
    `duration=${formatRate(summary.durationPreservationRate)}`,
    `relation=${formatRate(summary.relationPreservationRate)}`,
    `badQ=${formatRate(summary.inappropriateClarificationRate)}`,
  ].join(", ");
}

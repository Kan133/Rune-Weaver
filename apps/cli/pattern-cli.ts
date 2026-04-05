#!/usr/bin/env node
/**
 * Rune Weaver - Pattern CLI Module
 *
 * Pattern 验证与准入检查
 *
 * 命令:
 *   pattern validate          验证所有 pattern
 *   pattern validate <id>     验证指定 pattern
 *   pattern check-draft       检查 draft pattern 对齐
 */

import { validatePatternForAdmission, type PatternValidationResult } from "../../core/patterns/index.js";
import { dota2Patterns, validateDota2Pattern, type Dota2PatternMeta } from "../../adapters/dota2/patterns/index.js";

export interface PatternCLIOptions {
  command: string;
  patternId?: string;
  json: boolean;
  verbose: boolean;
}

function logInfo(message: string): void {
  console.error(message);
}

function logError(message: string): void {
  console.error(message);
}

export async function runPatternCLI(options: PatternCLIOptions): Promise<boolean> {
  const isJSONMode = options.json;

  if (!isJSONMode) {
    logInfo("=".repeat(60));
    logInfo("🧩 Rune Weaver - Pattern 验证");
    logInfo("=".repeat(60));
    logInfo("");
  }

  switch (options.command) {
    case "validate":
      return await runValidate(options);
    case "check-draft":
      return await runCheckDraft(options);
    default:
      logError(`❌ 未知命令: ${options.command}`);
      logError("可用命令: validate, check-draft");
      return false;
  }
}

async function runValidate(options: PatternCLIOptions): Promise<boolean> {
  const isJSONMode = options.json;

  if (options.patternId) {
    const pattern = dota2Patterns.find((p) => p.id === options.patternId);
    if (!pattern) {
      logError(`❌ Pattern 未找到: ${options.patternId}`);
      return false;
    }

    const result = validateSinglePattern(pattern);

    if (isJSONMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printValidationResult(pattern, result);
    }

    return result.core.valid && result.dota2.valid;
  }

  const results = dota2Patterns.map((pattern) => ({
    pattern,
    result: validateSinglePattern(pattern),
  }));

  const allValid = results.every((r) => r.result.core.valid && r.result.dota2.valid);

  if (isJSONMode) {
    console.log(
      JSON.stringify(
        results.map((r) => ({
          id: r.pattern.id,
          valid: r.result.core.valid && r.result.dota2.valid,
          core: r.result.core,
          dota2: r.result.dota2,
        })),
        null,
        2,
      ),
    );
  } else {
    logInfo(`📊 验证结果: ${results.length} 个 Pattern`);
    logInfo("");

    for (const { pattern, result } of results) {
      const valid = result.core.valid && result.dota2.valid;
      const icon = valid ? "✅" : "❌";
      logInfo(`${icon} ${pattern.id} (${pattern.category})`);

      if (!valid && options.verbose) {
        for (const error of [...result.core.errors, ...result.dota2.errors]) {
          logInfo(`   - ${error}`);
        }
      }
    }

    logInfo("");
    logInfo(allValid ? "✅ 所有 Pattern 验证通过" : "❌ 部分 Pattern 验证失败");
  }

  return allValid;
}

function validateSinglePattern(pattern: Dota2PatternMeta) {
  const core = validatePatternForAdmission(pattern);
  const dota2 = validateDota2Pattern(pattern);
  return { core, dota2 };
}

async function runCheckDraft(options: PatternCLIOptions): Promise<boolean> {
  const isJSONMode = options.json;

  const draftIds = [
    "input.key_binding",
    "data.weighted_pool",
    "ui.selection_modal",
  ];

  const results = draftIds.map((id) => {
    const pattern = dota2Patterns.find((p) => p.id === id);
    if (!pattern) {
      return {
        id,
        found: false,
        aligned: false,
        issues: ["Pattern 未在 catalog 中找到"],
      };
    }

    const validation = validateSinglePattern(pattern);
    const issues: string[] = [];

    if (!pattern.responsibilities || pattern.responsibilities.length === 0) {
      issues.push("缺少 responsibilities");
    }
    if (!pattern.nonGoals || pattern.nonGoals.length === 0) {
      issues.push("缺少 nonGoals");
    }
    if (!pattern.parameters || pattern.parameters.length === 0) {
      issues.push("缺少 parameters");
    }
    if (!pattern.examples || pattern.examples.length === 0) {
      issues.push("缺少 examples");
    }
    if (!pattern.hostBindings || pattern.hostBindings.length === 0) {
      issues.push("缺少 hostBindings");
    }

    return {
      id,
      found: true,
      aligned: issues.length === 0,
      issues,
      validation,
    };
  });

  const allAligned = results.every((r) => r.aligned);

  if (isJSONMode) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    logInfo("📋 Draft Pattern 对齐检查");
    logInfo("");

    for (const result of results) {
      const icon = result.aligned ? "✅" : "❌";
      logInfo(`${icon} ${result.id}`);

      if (!result.found) {
        logInfo("   未找到");
      } else if (result.issues.length > 0) {
        for (const issue of result.issues) {
          logInfo(`   - ${issue}`);
        }
      } else {
        logInfo("   已对齐");
      }
    }

    logInfo("");
    logInfo(allAligned ? "✅ 所有 Draft Pattern 已对齐" : "❌ 部分 Draft Pattern 未对齐");
  }

  return allAligned;
}

function printValidationResult(
  pattern: Dota2PatternMeta,
  result: { core: PatternValidationResult; dota2: { valid: boolean; errors: string[] } },
): void {
  const valid = result.core.valid && result.dota2.valid;

  logInfo(`${valid ? "✅" : "❌"} ${pattern.id}`);
  logInfo(`   类别: ${pattern.category}`);
  logInfo(`   摘要: ${pattern.summary}`);
  logInfo("");

  logInfo("   核心检查:");
  const checks = result.core.checks;
  logInfo(`     - ID: ${checks.hasId ? "✅" : "❌"}`);
  logInfo(`     - Summary: ${checks.hasSummary ? "✅" : "❌"}`);
  logInfo(`     - Responsibilities: ${checks.hasResponsibilities ? "✅" : "❌"}`);
  logInfo(`     - NonGoals: ${checks.hasNonGoals ? "✅" : "❌"}`);
  logInfo(`     - Parameters: ${checks.hasParameters ? "✅" : "❌"}`);
  logInfo(`     - Examples: ${checks.hasExamples ? "✅" : "❌"} ${!checks.hasExamples ? "(建议添加)" : ""}`);
  logInfo(`     - HostBinding: ${checks.hasHostBinding ? "✅" : "❌"}`);

  logInfo("   Dota2 检查:");
  logInfo(`     - 宿主目标: ${pattern.hostTarget}`);
  logInfo(`     - 输出类型: ${pattern.outputTypes.join(", ")}`);

  if (!valid) {
    logInfo("   错误:");
    for (const error of [...result.core.errors, ...result.dota2.errors]) {
      logInfo(`     - ${error}`);
    }
  }

  if (result.core.warnings.length > 0) {
    logInfo("   警告:");
    for (const warning of result.core.warnings) {
      logInfo(`     - ${warning}`);
    }
  }
}

export function showPatternHelp(): void {
  console.log(`
🧩 Rune Weaver - Pattern 命令

使用方式:
  npm run cli -- pattern <子命令> [选项]

子命令:
  validate [pattern-id]    验证 Pattern（全部或指定 ID）
  check-draft              检查 draft pattern 对齐

选项:
  --json                   以 JSON 格式输出
  --verbose, -v            显示详细输出
  -h, --help               显示此帮助

示例:
  # 验证所有 Pattern
  npm run cli -- pattern validate

  # 验证指定 Pattern
  npm run cli -- pattern validate input.key_binding

  # 检查 draft pattern 对齐
  npm run cli -- pattern check-draft

  # JSON 输出
  npm run cli -- pattern validate --json
`);
}

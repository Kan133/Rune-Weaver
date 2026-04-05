/**
 * Rune Weaver - Examples
 * 
 * 三个固定 MVP 用例
 * 
 * 使用方式:
 *   npm run examples
 * 
 * 退出码:
 *   0 - 所有用例通过
 *   1 - 至少一个用例失败
 */

import { runExample as runMicroFeature, ExampleResult as ResultA } from "./micro-feature/dash-skill";
import { runExample as runStandaloneSystem, ExampleResult as ResultB } from "./standalone-system/talent-draw";
import { runExample as runCrossSystem, ExampleResult as ResultC } from "./cross-system/skill-with-resource";

export interface AllExamplesResult {
  success: boolean;
  results: (ResultA | ResultB | ResultC)[];
  totalErrors: number;
  totalWarnings: number;
}

export function runAllExamples(): AllExamplesResult {
  console.log("\n" + "█".repeat(60));
  console.log("█" + " ".repeat(58) + "█");
  console.log("█" + "      Rune Weaver - MVP 用例验证".padEnd(58) + "█");
  console.log("█" + " ".repeat(58) + "█");
  console.log("█".repeat(60) + "\n");

  const results: (ResultA | ResultB | ResultC)[] = [];

  // 运行三个示例
  results.push(runMicroFeature());
  console.log("\n");
  results.push(runStandaloneSystem());
  console.log("\n");
  results.push(runCrossSystem());

  // 汇总结果
  const totalErrors = results.reduce((sum, r) => sum + r.hostValidation.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.hostValidation.warningCount, 0);
  const success = results.every((r) => r.success);

  // 汇总报告
  console.log("\n" + "█".repeat(60));
  console.log("█" + "      MVP 用例验证汇总".padEnd(58) + "█");
  console.log("█".repeat(60) + "\n");

  console.log(`📊 总览:`);
  console.log(`   用例总数: ${results.length}`);
  console.log(`   通过: ${results.filter((r) => r.success).length}`);
  console.log(`   失败: ${results.filter((r) => !r.success).length}`);
  console.log(`   总错误: ${totalErrors}`);
  console.log(`   总警告: ${totalWarnings}`);
  console.log();

  console.log(`📋 详细结果:`);
  for (const result of results) {
    const icon = result.success ? "✅" : "❌";
    console.log(`   ${icon} ${result.name}`);
    if (!result.success && result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`      - ${error}`);
      }
    }
  }

  console.log("\n" + "█".repeat(60));
  if (success) {
    console.log("█" + "      ✅ 所有 MVP 用例验证通过".padEnd(58) + "█");
  } else {
    console.log("█" + "      ❌ 部分 MVP 用例验证失败".padEnd(58) + "█");
  }
  console.log("█".repeat(60) + "\n");

  return {
    success,
    results,
    totalErrors,
    totalWarnings,
  };
}

if (import.meta.main) {
  const result = runAllExamples();
  process.exit(result.success ? 0 : 1);
}

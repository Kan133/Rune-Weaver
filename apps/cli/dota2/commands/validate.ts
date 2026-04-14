/**
 * Dota2 Post-Generation Validation Command
 *
 * Usage:
 *   npm run cli -- dota2 validate --host <path>
 *
 * Exit codes:
 *   0 - Validation passed
 *   1 - Validation failed
 */

import {
  validatePostGeneration,
  printPostGenerationReport,
} from "../../../../adapters/dota2/validator/post-generation-validator.js";
import {
  planPostGenerationRepairs,
  printRepairPlan,
} from "../../../../adapters/dota2/validator/post-generation-repair.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";

export async function runValidateCommand(options: Dota2CLIOptions): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("Rune Weaver - Post-Generation Validation");
  console.log("=".repeat(70));
  console.log(`\nHost: ${options.hostRoot}`);

  if (!options.hostRoot) {
    console.error("\nError: --host <path> is required");
    console.error("   Usage: npm run cli -- dota2 validate --host <path>");
    return false;
  }

  // Stage 1: Run validation
  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: Post-Generation Validation");
  console.log("=".repeat(70));

  const validationResult = validatePostGeneration(options.hostRoot);
  const report = printPostGenerationReport(validationResult);
  console.log(report);

  // Stage 2: Generate repair plan (always show on failure)
  if (!validationResult.valid) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 2: Repair Plan");
    console.log("=".repeat(70));

    const repairPlan = planPostGenerationRepairs(validationResult, options.hostRoot);
    const planReport = printRepairPlan(repairPlan);
    console.log(planReport);

    console.log("\n" + "=".repeat(70));
    console.log("Final Result: VALIDATION FAILED");
    console.log("=".repeat(70));
    console.log("\nRun the following to execute safe repairs:");
    console.log(`  npm run cli -- dota2 repair --host ${options.hostRoot} --safe`);
    console.log("\nTo see the repair plan without executing:");
    console.log(`  npm run cli -- dota2 repair --host ${options.hostRoot}`);

    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Final Result: VALIDATION PASSED");
  console.log("=".repeat(70));

  return true;
}

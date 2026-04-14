/**
 * Dota2 Post-Generation Repair Command
 *
 * Usage:
 *   npm run cli -- dota2 repair --host <path>        # Show repair plan only
 *   npm run cli -- dota2 repair --host <path> --safe # Execute safe repairs
 *
 * Exit codes:
 *   0 - Success (validation passed or no repairs needed)
 *   1 - Failure (validation failed or repairs failed)
 */

import {
  validatePostGeneration,
  printPostGenerationReport,
} from "../../../../adapters/dota2/validator/post-generation-validator.js";
import {
  planPostGenerationRepairs,
  printRepairPlan,
  executeSafePostGenerationRepairs,
  printRepairResult,
} from "../../../../adapters/dota2/validator/post-generation-repair.js";
import type { Dota2CLIOptions } from "../../dota2-cli.js";

export async function runRepairCommand(
  options: Dota2CLIOptions,
  flags: { safe: boolean }
): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("Rune Weaver - Post-Generation Repair");
  console.log("=".repeat(70));
  console.log(`\nHost: ${options.hostRoot}`);
  console.log(`Mode: ${flags.safe ? "execute safe repairs" : "show repair plan only"}`);

  if (!options.hostRoot) {
    console.error("\nError: --host <path> is required");
    console.error("   Usage: npm run cli -- dota2 repair --host <path> [--safe]");
    return false;
  }

  // Stage 1: Run validation
  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: Post-Generation Validation");
  console.log("=".repeat(70));

  const validationResult = validatePostGeneration(options.hostRoot);
  const validationReport = printPostGenerationReport(validationResult);
  console.log(validationReport);

  // If validation passed, nothing to do
  if (validationResult.valid) {
    console.log("\n" + "=".repeat(70));
    console.log("Final Result: VALIDATION PASSED - No repairs needed");
    console.log("=".repeat(70));
    return true;
  }

  // Stage 2: Generate repair plan
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Repair Plan");
  console.log("=".repeat(70));

  const repairPlan = planPostGenerationRepairs(validationResult, options.hostRoot);
  const planReport = printRepairPlan(repairPlan);
  console.log(planReport);

  // If not in safe mode, just show the plan and exit
  if (!flags.safe) {
    console.log("\n" + "=".repeat(70));
    console.log("Repair plan shown. Use --safe to execute safe repairs.");
    console.log("=".repeat(70));
    // Exit code 1 because validation failed even though we're just showing the plan
    return false;
  }

  // Check if there are any executable safe repairs
  if (repairPlan.executableActions.length === 0) {
    console.log("\n" + "=".repeat(70));
    console.log("Final Result: NO EXECUTABLE SAFE REPAIRS");
    console.log("=".repeat(70));
    console.log("\nAll detected issues require manual intervention or regeneration:");
    for (const action of repairPlan.manualActions) {
      console.log(`  - [${action.kind}] ${action.title}`);
      console.log(`    ${action.description}`);
    }
    // Exit code 1 because validation failed and we couldn't fix it
    return false;
  }

  // Stage 3: Execute safe repairs
  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Executing Safe Repairs");
  console.log("=".repeat(70));

  const repairResult = await executeSafePostGenerationRepairs(repairPlan, options.hostRoot);
  const resultReport = printRepairResult(repairResult);
  console.log(resultReport);

  if (!repairResult.success) {
    console.log("\n" + "=".repeat(70));
    console.log("Final Result: REPAIR EXECUTION FAILED");
    console.log("=".repeat(70));
    if (repairResult.errors.length > 0) {
      console.log("\nErrors:");
      for (const error of repairResult.errors) {
        console.log(`  - ${error}`);
      }
    }
    return false;
  }

  // Stage 4: Re-validate
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: Re-validation");
  console.log("=".repeat(70));

  const finalValidationResult = validatePostGeneration(options.hostRoot);
  const finalReport = printPostGenerationReport(finalValidationResult);
  console.log(finalReport);

  if (finalValidationResult.valid) {
    console.log("\n" + "=".repeat(70));
    console.log("Final Result: REPAIRS SUCCESSFUL - Validation now passing");
    console.log("=".repeat(70));
    return true;
  } else {
    console.log("\n" + "=".repeat(70));
    console.log("Final Result: REPAIRS PARTIAL - Validation still failing");
    console.log("=".repeat(70));
    console.log("\nSome issues could not be automatically fixed.");
    console.log("Manual intervention or regeneration may be required.");
    return false;
  }
}

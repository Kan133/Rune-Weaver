/**
 * Post-Generation Repair - Report
 *
 * Reporting and formatting functions for repair operations.
 */

import type { PostGenerationRepairPlan, PostGenerationRepairResult } from "./types.js";

/**
 * Print a formatted repair plan report
 */
export function printRepairPlan(plan: PostGenerationRepairPlan): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("Post-Generation Repair Plan (P0)");
  lines.push("=".repeat(60));
  lines.push(`Host Root: ${plan.sourceValidation.hostRoot}`);
  lines.push(`Needs Repair: ${plan.needsRepair ? "YES" : "NO"}`);
  lines.push("");

  if (plan.actions.length === 0) {
    lines.push("No repairs needed. All checks passed.");
    lines.push("");
    lines.push("=".repeat(60));
    return lines.join("\n");
  }

  lines.push("--- Repair Actions ---");
  lines.push("");

  // Group by kind
  const safeFixes = plan.actions.filter((a) => a.kind === "safe_fix");
  const refreshBridgeActions = plan.actions.filter((a) => a.kind === "refresh_bridge");
  const requiresRegenerateActions = plan.actions.filter((a) => a.kind === "requires_regenerate");
  const manualActions = plan.actions.filter((a) => a.kind === "manual");

  if (safeFixes.length > 0) {
    lines.push(`[Safe Fixes] (${safeFixes.length})`);
    for (const action of safeFixes) {
      lines.push(`  [${action.executable ? "AUTO" : "MANUAL"}] ${action.title}`);
      lines.push(`    Risk: ${action.risk}, File: ${action.data?.targetFile || "N/A"}`);
    }
    lines.push("");
  }

  if (refreshBridgeActions.length > 0) {
    lines.push(`[Refresh Bridge] (${refreshBridgeActions.length})`);
    for (const action of refreshBridgeActions) {
      lines.push(`  [${action.executable ? "AUTO" : "MANUAL"}] ${action.title}`);
    }
    lines.push("");
  }

  if (requiresRegenerateActions.length > 0) {
    lines.push(`[Requires Regenerate] (${requiresRegenerateActions.length})`);
    for (const action of requiresRegenerateActions) {
      lines.push(`  [!] ${action.title}`);
      lines.push(`    ${action.description}`);
    }
    lines.push("");
  }

  if (manualActions.length > 0) {
    lines.push(`[Manual Fixes Required] (${manualActions.length})`);
    for (const action of manualActions) {
      lines.push(`  [!] ${action.title}`);
      lines.push(`    ${action.description}`);
    }
    lines.push("");
  }

  lines.push("--- Summary ---");
  lines.push(`Total Actions: ${plan.summary.total}`);
  lines.push(`  Executable (auto): ${plan.summary.executable}`);
  lines.push(`  Requires Regenerate: ${plan.summary.requiresRegenerate}`);
  lines.push(`  Manual Fix Required: ${plan.summary.manual}`);
  lines.push("");
  lines.push("=".repeat(60));

  return lines.join("\n");
}

/**
 * Print a formatted repair execution report
 */
export function printRepairResult(result: PostGenerationRepairResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("Post-Generation Repair Execution Report");
  lines.push("=".repeat(60));
  lines.push("");

  if (result.executed.length === 0 && result.skipped.length === 0) {
    lines.push("No repairs were executed.");
    lines.push("");
    lines.push("=".repeat(60));
    return lines.join("\n");
  }

  if (result.executed.length > 0) {
    lines.push("--- Executed Actions ---");
    lines.push("");

    const succeeded = result.executed.filter((r) => r.success);
    const failed = result.executed.filter((r) => !r.success);

    if (succeeded.length > 0) {
      lines.push(`[Succeeded: ${succeeded.length}]`);
      for (const exec of succeeded) {
        lines.push(`  [OK] ${exec.action.title}`);
        if (exec.modifiedFile) {
          lines.push(`       Modified: ${exec.modifiedFile}`);
        }
        lines.push(`       ${exec.message}`);
      }
      lines.push("");
    }

    if (failed.length > 0) {
      lines.push(`[Failed: ${failed.length}]`);
      for (const exec of failed) {
        lines.push(`  [FAIL] ${exec.action.title}`);
        lines.push(`         ${exec.message}`);
        if (exec.errors && exec.errors.length > 0) {
          for (const error of exec.errors) {
            lines.push(`         Error: ${error}`);
          }
        }
      }
      lines.push("");
    }
  }

  if (result.skipped.length > 0) {
    lines.push("--- Skipped Actions ---");
    for (const skipped of result.skipped) {
      lines.push(`  [SKIPPED] ${skipped.title}`);
      lines.push(`            Reason: Not executable (${skipped.kind})`);
    }
    lines.push("");
  }

  lines.push("--- Summary ---");
  lines.push(`Attempted: ${result.summary.attempted}`);
  lines.push(`Succeeded: ${result.summary.succeeded}`);
  lines.push(`Failed: ${result.summary.failed}`);
  lines.push(`Skipped: ${result.summary.skipped}`);
  lines.push(`Overall: ${result.success ? "SUCCESS" : "PARTIAL/FAILURE"}`);

  if (result.errors.length > 0) {
    lines.push("");
    lines.push("--- All Errors ---");
    for (const error of result.errors.slice(0, 10)) {
      lines.push(`  - ${error}`);
    }
    if (result.errors.length > 10) {
      lines.push(`  ... and ${result.errors.length - 10} more errors`);
    }
  }

  lines.push("");
  lines.push("=".repeat(60));

  return lines.join("\n");
}

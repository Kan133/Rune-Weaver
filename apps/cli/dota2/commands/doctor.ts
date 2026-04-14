/**
 * Dota2 Runtime Doctor Command
 *
 * Performs read-only health checks on the Dota2 host.
 * Safe to run at any time - never modifies files.
 *
 * Usage:
 *   npm run cli -- dota2 doctor --host <path>
 */

import type { Dota2CLIOptions } from "../../dota2-cli.js";
import path from "path";
import { formatActionSummary, type ActionSummary } from "./action-summary.js";
import { buildDoctorActionSummary } from "./doctor-summary.js";
import {
  checkAddonConfig,
  checkDotaDirectories,
  checkPackageJson,
  checkWorkspace,
  checkPostGenerationValidation,
  checkProjectStructure,
  checkGapFillBoundaryAnchors,
  checkHostBuildArtifacts,
  checkRuntimeBridgeWiring,
  generateRecommendations,
  type DoctorCheck,
} from "./doctor-checks.js";

interface DoctorResult {
  overall: "PASS" | "WARN" | "FAIL";
  checks: DoctorCheck[];
  recommendations: string[];
  actionSummary: ActionSummary;
  nextCommand?: string;
}

/**
 * Run the doctor command - performs all health checks
 */
export async function runDoctorCommand(options: Dota2CLIOptions): Promise<boolean> {
  const addonName = options.addonName || path.basename(options.hostRoot || "") || "<addon>";
  const mapName = options.map || "temp";

  console.log("=".repeat(70));
  console.log("Rune Weaver - Runtime Doctor");
  console.log("=".repeat(70));
  console.log(`\nHost: ${options.hostRoot}`);
  console.log("Mode: Read-only health check (safe)\n");

  if (!options.hostRoot) {
    console.error("Error: --host <path> is required");
    console.error("   Usage: npm run cli -- dota2 doctor --host <path>");
    return false;
  }

  const result = runAllChecks(options.hostRoot);
  printDoctorReport(result, options.hostRoot, addonName, mapName);

  return result.overall !== "FAIL";
}

/**
 * Run all health checks
 */
function runAllChecks(hostRoot: string): DoctorResult {
  const checks: DoctorCheck[] = [
    checkAddonConfig(hostRoot),
    checkDotaDirectories(hostRoot),
    checkPackageJson(hostRoot),
    checkWorkspace(hostRoot),
    checkPostGenerationValidation(hostRoot),
    checkProjectStructure(hostRoot),
    checkRuntimeBridgeWiring(hostRoot),
    checkHostBuildArtifacts(hostRoot),
    checkGapFillBoundaryAnchors(),
  ];

  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const overall = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";
  const recommendations = generateRecommendations(checks);
  const actionSummary = buildDoctorActionSummary(checks, hostRoot);
  const nextCommand = actionSummary.command;

  return { overall, checks, recommendations, actionSummary, nextCommand };
}

/**
 * Print formatted doctor report
 */
function printDoctorReport(
  result: DoctorResult,
  hostRoot: string,
  addonName: string,
  mapName: string,
): void {
  console.log("-".repeat(70));
  console.log("Check Results");
  console.log("-".repeat(70));
  console.log();

  for (const check of result.checks) {
    const label = check.status.toUpperCase();
    console.log(`[${label}] ${check.name}`);
    console.log(`   ${check.message}`);
    if (check.suggestion) {
      console.log(`      Fix: ${check.suggestion}`);
    }
    if (check.details?.length) {
      for (const detail of check.details) {
        console.log(`      - ${detail}`);
      }
    }
    console.log();
  }

  console.log("-".repeat(70));
  console.log("Overall Status");
  console.log("-".repeat(70));
  console.log(result.overall);
  console.log();
  for (const line of formatActionSummary(result.actionSummary)) {
    console.log(line);
  }
  console.log();
  if (result.nextCommand) {
    console.log(`Next Command: ${result.nextCommand}`);
    console.log();
  }

  console.log("-".repeat(70));
  console.log("Next Steps");
  console.log("-".repeat(70));
  for (const rec of result.recommendations) {
    console.log(`  - ${rec}`);
  }
  console.log();
  console.log("Suggested Commands");
  console.log("-".repeat(70));
  console.log(`  - npm run cli -- dota2 init --host ${hostRoot} --addon-name ${addonName}`);
  console.log(`  - npm run cli -- dota2 repair --host ${hostRoot} --safe`);
  console.log(`  - cd ${hostRoot} && yarn dev`);
  console.log(`  - cd ${hostRoot} && yarn launch ${addonName} ${mapName}`);
  console.log();

  console.log("=".repeat(70));
}

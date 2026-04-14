/**
 * Dota2 Demo Preparation Runbook Command
 *
 * Generates a runbook for demo preparation.
 * Default: plan-only mode (dry-run)
 * With --write: executes safe, idempotent local file operations only
 *
 * Usage:
 *   npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map>
 *   npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map> --write
 */

import type { Dota2CLIOptions } from "../../dota2-cli.js";
import { generateRunbook, executeSafeOperations, printRunbook } from "./demo-runbook.js";
import { getScenarioAddonName, getScenarioMapName, resolveDemoScenario } from "./demo-scenarios.js";

/**
 * Run the demo preparation command
 */
export async function runDemoCommand(options: Dota2CLIOptions): Promise<boolean> {
  const scenario = resolveDemoScenario(options);
  const addonName = getScenarioAddonName(options, scenario);
  const mapName = getScenarioMapName(options, scenario);

  console.log("=".repeat(70));
  console.log(`Rune Weaver - ${scenario.displayName} Demo Preparation Runbook`);
  console.log("=".repeat(70));
  console.log(`\nHost: ${options.hostRoot}`);
  console.log(`Scenario: ${scenario.id}`);
  console.log(`Addon: ${addonName}`);
  console.log(`Map: ${mapName}`);
  console.log(`Mode: ${options.write ? "EXECUTE" : "PLAN-ONLY (dry-run)"}\n`);

  if (!options.hostRoot) {
    console.error("Error: --host <path> is required");
    console.error("   Usage: npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map>");
    return false;
  }

  const runbook = generateRunbook({ ...options, addonName, mapName }, scenario);
  printRunbook(runbook);

  if (options.write) {
    console.log("\n" + "-".repeat(70));
    console.log("Executing Safe Operations...");
    console.log("-".repeat(70) + "\n");

    const success = executeSafeOperations(runbook, options);

    console.log("\n" + "=".repeat(70));
    console.log(success ? "Safe operations completed" : "Some operations failed");
    console.log("=".repeat(70));

    return success;
  }

  console.log("\n" + "=".repeat(70));
  console.log("To execute safe operations, add --write flag");
  console.log(`Next likely command: ${scenario.createCommand({ ...options, addonName, mapName }).join(" ")}`);
  console.log("=".repeat(70));

  return true;
}

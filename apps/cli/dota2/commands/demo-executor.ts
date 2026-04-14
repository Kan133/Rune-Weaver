/**
 * Demo Command - Safe Operations Executor
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Dota2CLIOptions } from "../../dota2-cli.js";
import type { DemoRunbook, RunbookStep } from "./demo-runbook.js";

export function executeSafeOperations(runbook: DemoRunbook, options: Dota2CLIOptions): boolean {
  let allSuccess = true;

  const step1 = runbook.steps.find((s) => s.key === "addon-config");
  if (step1?.status === "NEEDS_FIX" && options.addonName) {
    console.log("[Step 1] Updating addon.config...");
    if (updateAddonConfig(options.hostRoot!, options.addonName)) {
      console.log(`  Updated to "${options.addonName}"`);
      step1.status = "OK";
    } else {
      console.log("  Failed to update");
      allSuccess = false;
    }
  }

  updateStepStatuses(runbook);
  return allSuccess;
}

function updateAddonConfig(hostRoot: string, newName: string): boolean {
  try {
    const configPath = join(hostRoot, "scripts/addon.config.ts");
    if (!existsSync(configPath)) return false;
    const content = readFileSync(configPath, "utf-8");
    const newContent = content.replace(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/, `let addon_name = '${newName}'`);
    if (newContent === content) return false;
    writeFileSync(configPath, newContent, "utf-8");
    return true;
  } catch {
    return false;
  }
}

function updateStepStatuses(runbook: DemoRunbook): void {
  const dependencies = runbook.steps.find((s) => s.key === "install-deps");
  const installOutputs = runbook.steps.find((s) => s.key === "install-outputs");
  const workspace = runbook.steps.find((s) => s.key === "workspace");

  const devServer = runbook.steps.find((s) => s.key === "build-host");
  if (devServer && dependencies?.status === "OK" && installOutputs?.status === "OK") {
    devServer.status = "READY";
  }

  const launch = runbook.steps.find((s) => s.key === "launch");
  if (launch && workspace?.status === "OK" && dependencies?.status === "OK" && installOutputs?.status === "OK") {
    launch.status = "READY";
  }
}

export function getStatusIcon(status: RunbookStep["status"]): string {
  if (status === "OK" || status === "READY") return "PASS";
  if (status === "BLOCKED") return "FAIL";
  return "WARN";
}

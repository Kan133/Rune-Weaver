/**
 * Demo Command - Runbook Types and Generator
 */

import type { Dota2CLIOptions } from "../../dota2-cli.js";
import type { DemoScenario } from "./demo-scenarios.js";
import { resolveDemoScenario } from "./demo-scenarios.js";
import type { ActionSummary } from "./action-summary.js";
import {
  checkAddonConfigStep,
  checkNodeModulesStep,
  checkPackageScriptsStep,
  checkInstallOutputsStep,
  checkWorkspaceStep,
  checkWriteFeatureStep,
  checkDoctorStep,
  checkValidateStep,
  checkDevServerStep,
  checkLaunchStep,
} from "./demo-steps.js";

export interface RunbookStep {
  key:
    | "addon-config"
    | "install-deps"
    | "install-outputs"
    | "package-scripts"
    | "workspace"
    | "write-feature"
    | "build-host"
    | "doctor"
    | "validate"
    | "launch";
  id: number;
  name: string;
  status: "OK" | "NEEDS_FIX" | "PENDING" | "BLOCKED" | "READY";
  action?: string;
  command?: string;
  details?: string[];
}

export interface DemoRunbook {
  scenarioId: string;
  scenarioName: string;
  steps: RunbookStep[];
  actionSummary: ActionSummary;
  summary: {
    overall: "READY" | "ACTION_REQUIRED" | "BLOCKED";
    ready: number;
    blocked: number;
    needsAction: number;
    total: number;
    nextStep?: string;
    nextCommand?: string;
  };
  hostRoot?: string;
  addonName?: string;
  mapName?: string;
  executed: boolean;
}

export function generateRunbook(options: Dota2CLIOptions, scenario: DemoScenario = resolveDemoScenario(options)): DemoRunbook {
  const steps: RunbookStep[] = [];
  let id = 1;

  steps.push(checkAddonConfigStep(id++, options));
  steps.push(checkNodeModulesStep(id++, options));
  steps.push(checkInstallOutputsStep(id++, options));
  steps.push(checkPackageScriptsStep(id++, options));
  steps.push(checkWorkspaceStep(id++, options));
  steps.push(checkWriteFeatureStep(id++, options, steps, scenario));
  steps.push(checkDevServerStep(id++, options, steps));
  steps.push(checkDoctorStep(id++, options, steps));
  steps.push(checkValidateStep(id++, options, steps));
  steps.push(checkLaunchStep(id++, options, steps));

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.displayName,
    steps,
    actionSummary: buildRunbookActionSummary(steps),
    summary: summarizeRunbook(steps),
    hostRoot: options.hostRoot,
    addonName: options.addonName,
    mapName: options.mapName,
    executed: false,
  };
}

export function printRunbook(runbook: DemoRunbook): void {
  console.log(`${runbook.scenarioName} Demo Preparation Runbook`);
  console.log("=".repeat(70));
  console.log();

  for (const step of runbook.steps) {
    console.log(`[STEP ${step.id}] ${step.name}`);
    console.log(`  Status: ${step.status}`);
    if (step.action) console.log(`  Action: ${step.action}`);
    if (step.command) console.log(`  Command: ${step.command}`);
    if (step.details?.length) {
      for (const d of step.details) console.log(`    ${d}`);
    }
    console.log();
  }

  console.log("-".repeat(70));
  console.log("Summary");
  console.log("-".repeat(70));
  console.log(`  Action Summary: ${runbook.actionSummary.headline}`);
  console.log(`  Reason: ${runbook.actionSummary.reason}`);
  if (runbook.actionSummary.command) {
    console.log(`  Command: ${runbook.actionSummary.command}`);
  }
  console.log();
  console.log(`  Overall: ${runbook.summary.overall}`);
  console.log(`  ${runbook.summary.ready} steps ready`);
  console.log(`  ${runbook.summary.blocked} steps blocked`);
  console.log(`  ${runbook.summary.needsAction} steps need manual action`);
  console.log(`  ${runbook.summary.total} total steps`);
  if (runbook.summary.nextStep) {
    console.log(`  Next focus: ${runbook.summary.nextStep}`);
  }
  if (runbook.summary.nextCommand) {
    console.log(`  Next command: ${runbook.summary.nextCommand}`);
  }
  console.log();
  console.log("Recommended path");
  console.log("-".repeat(70));
  console.log("  1. Fix addon name before install if needed");
  console.log("  2. Run yarn install");
  console.log("  3. Run the feature write/refresh command");
  console.log("  4. Run yarn dev");
  console.log("  5. Run doctor, then validate");
  console.log("  6. Launch the addon for manual proof");
  console.log();
  console.log("Evidence capture");
  console.log("-".repeat(70));
  if (runbook.hostRoot) {
    console.log(`  npm run demo:talent-draw:refresh -- --host ${runbook.hostRoot}`);
    console.log(`  npm run demo:talent-draw:lifecycle -- --host ${runbook.hostRoot} --write`);
  } else {
    console.log("  Run npm run demo:talent-draw:refresh -- --host <host> to capture evidence.");
  }
}

function summarizeRunbook(steps: RunbookStep[]): DemoRunbook["summary"] {
  const ready = steps.filter((step) => step.status === "OK" || step.status === "READY").length;
  const blocked = steps.filter((step) => step.status === "BLOCKED").length;
  const needsAction = steps.filter((step) => step.status === "NEEDS_FIX" || step.status === "PENDING").length;
  const pendingStep = steps.find((step) => step.status === "NEEDS_FIX" || step.status === "PENDING");
  const blockedStep = steps.find((step) => step.status === "BLOCKED");
  const nextStep = pendingStep || blockedStep;

  return {
    overall: blocked > 0 ? "BLOCKED" : needsAction > 0 ? "ACTION_REQUIRED" : "READY",
    ready,
    blocked,
    needsAction,
    total: steps.length,
    nextStep: nextStep ? `[STEP ${nextStep.id}] ${nextStep.name}` : undefined,
    nextCommand: nextStep?.command,
  };
}

function buildRunbookActionSummary(steps: RunbookStep[]): ActionSummary {
  const pendingStep = steps.find((step) => step.status === "NEEDS_FIX" || step.status === "PENDING");
  const blockedStep = steps.find((step) => step.status === "BLOCKED");
  const readyStep = steps.find((step) => step.status === "READY");
  const nextStep = pendingStep || blockedStep || readyStep;

  if (!nextStep) {
    return {
      status: "ready",
      headline: "Run the prepared demo flow",
      reason: "All runbook steps are already satisfied.",
      source: "demo-runbook",
    };
  }

  return {
    status: nextStep.status === "BLOCKED" ? "blocked" : nextStep.status === "READY" ? "ready" : "action_required",
    headline: nextStep.name,
    reason: nextStep.action || "Follow the next runbook step.",
    command: nextStep.command,
    source: "demo-runbook",
  };
}

export { executeSafeOperations, getStatusIcon } from "./demo-executor.js";

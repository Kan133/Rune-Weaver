/**
 * Demo Command - Individual Step Check Functions
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { Dota2CLIOptions } from "../../dota2-cli.js";
import type { RunbookStep } from "./demo-runbook.js";
import type { DemoScenario } from "./demo-scenarios.js";

export function checkAddonConfigStep(id: number, options: Dota2CLIOptions): RunbookStep {
  const configPath = join(options.hostRoot!, "scripts/addon.config.ts");

  if (!existsSync(configPath)) {
    return { key: "addon-config", id, name: "Fix addon.config name", status: "BLOCKED", action: "addon.config.ts not found" };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/);

    if (!match) return { key: "addon-config", id, name: "Fix addon.config name", status: "NEEDS_FIX", action: "addon_name not found" };

    const currentName = match[1];
    const targetName = options.addonName;

    if (!targetName) {
      return {
        key: "addon-config",
        id,
        name: "Fix addon.config name",
        status: currentName === "x_template" ? "NEEDS_FIX" : "OK",
        action: currentName === "x_template"
          ? "Rename addon_name before yarn install"
          : `addon_name: "${currentName}"`,
      };
    }

    if (currentName === targetName) {
      return { key: "addon-config", id, name: "Fix addon.config name", status: "OK", action: `addon_name matches: "${currentName}"` };
    }

    return {
      key: "addon-config",
      id,
      name: "Fix addon.config name",
      status: "NEEDS_FIX",
      action: `Rename before yarn install: "${currentName}" -> "${targetName}"`,
    };
  } catch {
    return { key: "addon-config", id, name: "Fix addon.config name", status: "BLOCKED", action: "Failed to read config" };
  }
}

export function checkNodeModulesStep(id: number, options: Dota2CLIOptions): RunbookStep {
  const exists = existsSync(join(options.hostRoot!, "node_modules"));
  return exists
    ? { key: "install-deps", id, name: "Install dependencies", status: "OK", action: "node_modules exists" }
    : { key: "install-deps", id, name: "Install dependencies", status: "PENDING", action: "yarn install needed after addon.config is renamed", command: "yarn install" };
}

export function checkInstallOutputsStep(id: number, options: Dota2CLIOptions): RunbookStep {
  const addonName = options.addonName || "talent_draw_demo";
  const gameOutputPath = "game";
  const contentOutputPath = "content";
  const nestedGameOutputPath = `game/dota_addons/${addonName}`;
  const nestedContentOutputPath = `content/dota_addons/${addonName}`;
  const gameExists =
    existsSync(join(options.hostRoot!, gameOutputPath)) ||
    existsSync(join(options.hostRoot!, nestedGameOutputPath));
  const contentExists =
    existsSync(join(options.hostRoot!, contentOutputPath)) ||
    existsSync(join(options.hostRoot!, nestedContentOutputPath));

  if (gameExists && contentExists) {
    return {
      key: "install-outputs",
      id,
      name: "Verify addon install outputs",
      status: "OK",
      action: "game/ and content/ install outputs exist",
    };
  }

  const details: string[] = [];
  if (!gameExists) details.push(`Missing ${gameOutputPath} or ${nestedGameOutputPath}`);
  if (!contentExists) details.push(`Missing ${contentOutputPath} or ${nestedContentOutputPath}`);

  return {
    key: "install-outputs",
    id,
    name: "Verify addon install outputs",
    status: "PENDING",
    action: "Run yarn install after addon.config is renamed",
    command: "yarn install",
    details,
  };
}

export function checkPackageScriptsStep(id: number, options: Dota2CLIOptions): RunbookStep {
  const packagePath = join(options.hostRoot!, "package.json");

  if (!existsSync(packagePath)) {
    return { key: "package-scripts", id, name: "Check package.json scripts", status: "BLOCKED", action: "package.json not found" };
  }

  try {
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
    const scripts = pkg.scripts || {};
    const hasInstall = !!scripts.postinstall;
    const hasDev = !!scripts.dev;
    const hasLaunch = !!scripts.launch;
    const details: string[] = [];
    if (hasInstall) details.push("postinstall script present");
    if (hasDev) details.push("dev script present");
    if (hasLaunch) details.push("launch script present");

    return {
      key: "package-scripts",
      id,
      name: "Check package.json scripts",
      status: hasInstall && hasDev && hasLaunch ? "OK" : "PENDING",
      action: hasInstall && hasDev && hasLaunch ? "All scripts present" : "Some scripts need verification",
      details,
    };
  } catch {
    return { key: "package-scripts", id, name: "Check package.json scripts", status: "BLOCKED", action: "Failed to parse" };
  }
}

export function checkWorkspaceStep(id: number, options: Dota2CLIOptions): RunbookStep {
  const workspacePath = join(options.hostRoot!, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");

  if (!existsSync(workspacePath)) {
    return {
      key: "workspace",
      id,
      name: "Run Rune Weaver init/write",
      status: "PENDING",
      action: "Run Rune Weaver init/write before launch",
      command: "npm run cli -- dota2 init --host <path> --addon-name <addon>",
    };
  }

  try {
    const workspace = JSON.parse(readFileSync(workspacePath, "utf-8"));
    return { key: "workspace", id, name: "Run Rune Weaver init/write", status: "OK", action: `Workspace exists (${workspace.features?.length || 0} features)` };
  } catch {
    return { key: "workspace", id, name: "Run Rune Weaver init/write", status: "NEEDS_FIX", action: "Invalid workspace - will recreate" };
  }
}

export function checkWriteFeatureStep(
  id: number,
  options: Dota2CLIOptions,
  previous: RunbookStep[],
  scenario: DemoScenario,
): RunbookStep {
  const installOutputs = findStep(previous, "install-outputs");
  const workspace = findStep(previous, "workspace");
  const writeCommand = scenario.createCommand(options).join(" ");

  if (installOutputs?.status !== "OK") {
    return {
      key: "write-feature",
      id,
      name: scenario.writeFeatureLabel,
      status: "BLOCKED",
      action: "Blocked until yarn install creates game/content outputs",
      command: writeCommand,
    };
  }

  if (workspace?.status !== "OK") {
    return {
      key: "write-feature",
      id,
      name: scenario.writeFeatureLabel,
      status: "PENDING",
      action: "Initialize Rune Weaver before writing the demo feature",
      command: `npm run cli -- dota2 init --host ${options.hostRoot} --addon-name ${options.addonName || "<addon>"}`,
    };
  }

  return {
    key: "write-feature",
    id,
    name: scenario.writeFeatureLabel,
    status: "READY",
    action: `Ready to write or refresh the canonical ${scenario.displayName} demo feature`,
    command: writeCommand,
  };
}

export function checkDevServerStep(id: number, options: Dota2CLIOptions, previous: RunbookStep[]): RunbookStep {
  const nodeModulesStep = findStep(previous, "install-deps");
  const installOutputs = findStep(previous, "install-outputs");
  const writeFeature = findStep(previous, "write-feature");
  if (writeFeature?.status === "BLOCKED") {
    return { key: "build-host", id, name: "Build TypeScript and Panorama", status: "BLOCKED", action: "Blocked: demo feature is not ready", command: "yarn dev" };
  }
  if (installOutputs?.status !== "OK") {
    return { key: "build-host", id, name: "Build TypeScript and Panorama", status: "BLOCKED", action: "Blocked: addon install outputs are not ready", command: "yarn dev" };
  }
  return nodeModulesStep?.status !== "OK"
    ? { key: "build-host", id, name: "Build TypeScript and Panorama", status: "BLOCKED", action: "Blocked: deps not installed", command: "yarn dev" }
    : { key: "build-host", id, name: "Build TypeScript and Panorama", status: "READY", action: "Ready to compile host scripts and UI", command: "yarn dev" };
}

export function checkDoctorStep(id: number, options: Dota2CLIOptions, previous: RunbookStep[]): RunbookStep {
  const writeFeature = findStep(previous, "write-feature");
  const buildStep = findStep(previous, "build-host");

  if (writeFeature?.status === "BLOCKED" || buildStep?.status === "BLOCKED") {
    return {
      key: "doctor",
      id,
      name: "Run Runtime Doctor",
      status: "BLOCKED",
      action: "Blocked: Rune Weaver write or build prerequisites are not ready",
      command: `npm run cli -- dota2 doctor --host ${options.hostRoot}`,
    };
  }

  return {
    key: "doctor",
    id,
    name: "Run Runtime Doctor",
    status: writeFeature?.status === "READY" && buildStep?.status === "READY" ? "READY" : "PENDING",
    action: "Run after Rune Weaver write and yarn dev to catch runtime wiring issues",
    command: `npm run cli -- dota2 doctor --host ${options.hostRoot}`,
  };
}

export function checkValidateStep(id: number, options: Dota2CLIOptions, previous: RunbookStep[]): RunbookStep {
  const doctorStep = findStep(previous, "doctor");
  const writeFeature = findStep(previous, "write-feature");
  if (doctorStep?.status === "BLOCKED" || writeFeature?.status === "BLOCKED") {
    return {
      key: "validate",
      id,
      name: "Run Post-Generation Validate",
      status: "BLOCKED",
      action: "Blocked: doctor or write prerequisites are not ready",
      command: `npm run cli -- dota2 validate --host ${options.hostRoot}`,
    };
  }

  return {
    key: "validate",
    id,
    name: "Run Post-Generation Validate",
    status: doctorStep?.status === "READY" && writeFeature?.status === "READY" ? "READY" : "PENDING",
    action: "Validate generated KV/Lua/UI/index consistency",
    command: `npm run cli -- dota2 validate --host ${options.hostRoot}`,
  };
}

export function checkLaunchStep(id: number, options: Dota2CLIOptions, previous: RunbookStep[]): RunbookStep {
  const devServer = findStep(previous, "build-host");
  const doctor = findStep(previous, "doctor");
  const validate = findStep(previous, "validate");
  const workspace = findStep(previous, "workspace");
  const addon = options.addonName || "<addon>";
  const map = options.mapName || "<map>";

  if (workspace?.status !== "OK") {
    return { key: "launch", id, name: "Launch Dota2", status: "BLOCKED", action: "Blocked: no workspace", command: `yarn launch ${addon} ${map}` };
  }
  if (devServer?.status === "BLOCKED") {
    return { key: "launch", id, name: "Launch Dota2", status: "BLOCKED", action: "Blocked: no deps", command: `yarn launch ${addon} ${map}` };
  }
  if (doctor?.status === "BLOCKED") {
    return { key: "launch", id, name: "Launch Dota2", status: "BLOCKED", action: "Blocked: doctor cannot run", command: `yarn launch ${addon} ${map}` };
  }
  if (validate?.status === "BLOCKED") {
    return { key: "launch", id, name: "Launch Dota2", status: "BLOCKED", action: "Blocked: validate cannot run", command: `yarn launch ${addon} ${map}` };
  }
  if (doctor?.status !== "READY" || validate?.status !== "READY") {
    return { key: "launch", id, name: "Launch Dota2", status: "PENDING", action: "Launch after doctor and validate pass", command: `yarn launch ${addon} ${map}` };
  }
  return { key: "launch", id, name: "Launch Dota2", status: "READY", action: "After doctor and validate pass, launch the host", command: `yarn launch ${addon} ${map}` };
}

function findStep(steps: RunbookStep[], key: RunbookStep["key"]): RunbookStep | undefined {
  return steps.find((step) => step.key === key);
}

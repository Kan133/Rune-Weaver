/**
 * Doctor Command - Addon and Package Checks
 */

import { existsSync, readFileSync, realpathSync } from "fs";
import { join } from "path";
import type { DoctorCheck } from "./doctor-checks.js";

export function checkAddonConfig(hostRoot: string): DoctorCheck {
  const configPath = join(hostRoot, "scripts/addon.config.ts");

  if (!existsSync(configPath)) {
    return {
      name: "Addon Config",
      status: "fail",
      message: "scripts/addon.config.ts not found",
      details: ["This file is required for Dota2 addon configuration"],
      suggestion: "Create scripts/addon.config.ts and set addon_name before running yarn install.",
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/);

    if (!match) {
      return {
        name: "Addon Config",
        status: "warn",
        message: "addon.config.ts exists but addon_name not found",
        suggestion: "Set let addon_name = '<addon_name>' in scripts/addon.config.ts.",
      };
    }

    const addonName = match[1];
    if (addonName === "x_template") {
      return {
        name: "Addon Config",
        status: "warn",
        message: `addon_name is still "${addonName}" (needs initialization)`,
        details: ["Run: npm run cli -- dota2 init --host <path>"],
        suggestion: "Rename addon_name away from x_template, then rerun yarn install so host outputs are created.",
      };
    }

    return { name: "Addon Config", status: "pass", message: `addon_name: "${addonName}"` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      name: "Addon Config",
      status: "fail",
      message: `Failed to read addon.config.ts: ${msg}`,
      suggestion: "Fix scripts/addon.config.ts syntax or encoding, then rerun doctor.",
    };
  }
}

export function checkDotaDirectories(hostRoot: string): DoctorCheck {
  const configPath = join(hostRoot, "scripts/addon.config.ts");
  let addonName: string | null = null;

  try {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf-8");
      const match = content.match(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/);
      if (match) addonName = match[1];
    }
  } catch {
    // ignore
  }

  if (!addonName || addonName === "x_template") {
    return {
      name: "Dota Directories",
      status: "warn",
      message: "Cannot check directories (addon_name not set)",
      suggestion: "Set addon_name in scripts/addon.config.ts before running yarn install.",
    };
  }

  const gameDir = join(hostRoot, "game");
  const contentDir = join(hostRoot, "content");
  const gameExists = existsSync(gameDir);
  const contentExists = existsSync(contentDir);

  if (gameExists && contentExists) {
    const details: string[] = [];
    try {
      details.push(`game -> ${realpathSync(gameDir)}`);
      details.push(`content -> ${realpathSync(contentDir)}`);
    } catch {
      // Presence is enough for the first-pass doctor.
    }
    return { name: "Dota Directories", status: "pass", message: `game/ and content/ outputs exist for "${addonName}"`, details };
  }

  const details: string[] = [];
  if (!gameExists) details.push("Missing host game/ output. Run yarn install after addon.config is renamed.");
  if (!contentExists) details.push("Missing host content/ output. Run yarn install after addon.config is renamed.");

  return {
    name: "Dota Directories",
    status: "fail",
    message: "Dota addon directories are missing",
    details,
    suggestion: "Rename addon.config.ts addon_name, then run yarn install to generate the host outputs.",
  };
}

export function checkPackageJson(hostRoot: string): DoctorCheck {
  const packagePath = join(hostRoot, "package.json");

  if (!existsSync(packagePath)) {
    return { name: "Package Scripts", status: "fail", message: "package.json not found" };
  }

  try {
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
    const scripts = pkg.scripts || {};
    const required = ["postinstall", "dev", "launch"];
    const found = required.filter((s) => scripts[s]);

    if (found.length >= 2) {
      return { name: "Package Scripts", status: "pass", message: `Found ${found.length}/3 key scripts` };
    }

    return {
      name: "Package Scripts",
      status: "warn",
      message: `Only found ${found.length}/3 key scripts`,
      details: [`Missing: ${required.filter((s) => !scripts[s]).join(", ")}`],
      suggestion: "Restore the x-template package scripts so init, dev, and launch remain available.",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      name: "Package Scripts",
      status: "fail",
      message: `Failed to parse package.json: ${msg}`,
      suggestion: "Fix package.json syntax, then rerun doctor.",
    };
  }
}

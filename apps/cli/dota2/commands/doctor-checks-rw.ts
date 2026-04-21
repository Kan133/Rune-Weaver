/**
 * Doctor Command - Rune Weaver Specific Checks
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { validatePostGeneration } from "../../../../adapters/dota2/validator/post-generation-validator.js";
import type { DoctorCheck } from "./doctor-checks.js";

function readAddonName(hostRoot: string): string | null {
  const configPath = join(hostRoot, "scripts/addon.config.ts");
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/let\s+addon_name(?::\s*\w+)?\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function normalizePath(value: string): string {
  return resolve(value).replace(/\\/g, "/").toLowerCase();
}

export function checkWorkspace(hostRoot: string): DoctorCheck {
  const workspacePath = join(hostRoot, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");

  if (!existsSync(workspacePath)) {
    return {
      name: "Rune Weaver Workspace",
      status: "fail",
      message: "workspace.json not found",
      details: ["Run: npm run cli -- dota2 init --host <path>"],
      suggestion: "Initialize the host so rune-weaver.workspace.json is created, then rerun doctor.",
    };
  }

  try {
    const workspace = JSON.parse(readFileSync(workspacePath, "utf-8"));
    const addonName = readAddonName(hostRoot);
    const workspaceHostRoot = normalizePath(workspace.hostRoot || "");
    const diskHostRoot = normalizePath(hostRoot);
    const activeFeatures = Array.isArray(workspace.features)
      ? workspace.features.filter((feature) => feature?.status === "active")
      : [];
    const missingFiles: string[] = [];

    if (workspaceHostRoot && workspaceHostRoot !== diskHostRoot) {
      return {
        name: "Rune Weaver Workspace",
        status: "warn",
        message: "workspace hostRoot does not match this host",
        details: [
          `workspace.hostRoot: ${workspace.hostRoot}`,
          `disk hostRoot: ${hostRoot}`,
        ],
        suggestion: "Re-run init or repair so workspace.json points at the current host root.",
      };
    }

    if (addonName && workspace.addonName !== addonName) {
      return {
        name: "Rune Weaver Workspace",
        status: "warn",
        message: "workspace addonName does not match addon.config.ts",
        details: [
          `workspace.addonName: ${workspace.addonName}`,
          `addon.config.ts addon_name: ${addonName}`,
        ],
        suggestion: "Refresh the workspace after renaming addon.config.ts, then rerun yarn install.",
      };
    }

    for (const feature of activeFeatures) {
      for (const file of feature.generatedFiles || []) {
        if (!existsSync(join(hostRoot, file))) {
          missingFiles.push(`${feature.featureId}: ${file}`);
        }
      }
    }

    if (missingFiles.length > 0) {
      return {
        name: "Rune Weaver Workspace",
        status: "fail",
        message: `${missingFiles.length} workspace-recorded files are missing from disk`,
        details: missingFiles.slice(0, 10),
        suggestion: "Regenerate or refresh the feature so workspace.generatedFiles matches the on-disk files.",
      };
    }

    return {
      name: "Rune Weaver Workspace",
      status: "pass",
      message: `Workspace exists (${workspace.features?.length || 0} features)`,
      details: [
        `workspace.hostRoot: ${workspace.hostRoot}`,
        `workspace.addonName: ${workspace.addonName}`,
        `active features: ${activeFeatures.length}`,
        `gap-fill ready features: ${activeFeatures.filter((feature: { gapFillBoundaries?: string[] }) => (feature.gapFillBoundaries || []).length > 0).length}`,
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      name: "Rune Weaver Workspace",
      status: "fail",
      message: `Invalid workspace file: ${msg}`,
      suggestion: "Repair or recreate rune-weaver.workspace.json before running runtime doctor again.",
    };
  }
}

function readActiveFeatureCount(hostRoot: string): number | null {
  const workspacePath = join(hostRoot, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
  if (!existsSync(workspacePath)) {
    return null;
  }

  try {
    const workspace = JSON.parse(readFileSync(workspacePath, "utf-8"));
    if (!Array.isArray(workspace.features)) {
      return 0;
    }

    return workspace.features.filter((feature: { status?: string } | null | undefined) => feature?.status === "active").length;
  } catch {
    return null;
  }
}

function findGeneratedUiLessFiles(hostRoot: string): string[] {
  const generatedUiRoot = join(hostRoot, "content/panorama/src/rune_weaver/generated/ui");
  if (!existsSync(generatedUiRoot)) {
    return [];
  }

  const files: string[] = [];
  const stack = [generatedUiRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !existsSync(current)) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.name.endsWith(".less")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export function checkPostGenerationValidation(hostRoot: string): DoctorCheck {
  const result = validatePostGeneration(hostRoot);

  if (result.valid) {
    return { name: "Post-Generation Validation", status: "pass", message: `All ${result.summary.total} checks passed` };
  }

  const details = result.issues.slice(0, 5);
  if (result.issues.length > 5) details.push(`... and ${result.issues.length - 5} more`);
  const failedCheck = result.checks.find((check) => !check.passed);

  return {
    name: "Post-Generation Validation",
    status: "fail",
    message: `${result.summary.failed}/${result.summary.total} checks failed`,
    details,
    suggestion: failedCheck?.suggestion,
  };
}

export function checkProjectStructure(hostRoot: string): DoctorCheck {
  const paths = {
    serverNs: join(hostRoot, "game/scripts/src/rune_weaver"),
    uiNs: join(hostRoot, "content/panorama/src/rune_weaver"),
    serverBridge: join(hostRoot, "game/scripts/src/rune_weaver/index.ts"),
    serverGen: join(hostRoot, "game/scripts/src/rune_weaver/generated/server/index.ts"),
    uiBridge: join(hostRoot, "content/panorama/src/rune_weaver/index.tsx"),
    uiGen: join(hostRoot, "content/panorama/src/rune_weaver/generated/ui/index.tsx"),
    hudStyles: join(hostRoot, "content/panorama/src/hud/styles.less"),
  };

  const exists = {
    serverNs: existsSync(paths.serverNs),
    uiNs: existsSync(paths.uiNs),
    serverBridge: existsSync(paths.serverBridge),
    serverGen: existsSync(paths.serverGen),
    uiBridge: existsSync(paths.uiBridge),
    uiGen: existsSync(paths.uiGen),
    hudStyles: existsSync(paths.hudStyles),
  };

  const allExist = Object.values(exists).every((v) => v);
  const anyExist = Object.values(exists).some((v) => v);

  if (allExist) {
    return {
      name: "Runtime Assets",
      status: "pass",
      message: "Bridge entry files and generated asset roots exist",
    };
  }

  if (!anyExist) {
    return {
      name: "Runtime Assets",
      status: "warn",
      message: "No Rune Weaver runtime assets found",
      details: ["Run: npm run cli -- dota2 init --host <path>"],
      suggestion: "Run init to create the Rune Weaver bridge and generated asset folders.",
    };
  }

  const missing: string[] = [];
  if (!exists.serverNs) missing.push("game/scripts/src/rune_weaver");
  if (!exists.uiNs) missing.push("content/panorama/src/rune_weaver");
  if (!exists.serverBridge) missing.push("game/scripts/src/rune_weaver/index.ts");
  if (!exists.serverGen) missing.push("game/scripts/src/rune_weaver/generated/server/index.ts");
  if (!exists.uiBridge) missing.push("content/panorama/src/rune_weaver/index.tsx");
  if (!exists.uiGen) missing.push("content/panorama/src/rune_weaver/generated/ui/index.tsx");
  if (!exists.hudStyles) missing.push("content/panorama/src/hud/styles.less");

  return {
    name: "Runtime Assets",
    status: "warn",
    message: "Some runtime asset directories are missing",
    details: missing.map((m) => `Missing: ${m}`),
    suggestion: "Refresh the bridge to regenerate the missing runtime asset directories.",
  };
}

export function checkGapFillBoundaryAnchors(): DoctorCheck {
  const requiredAnchors = [
    {
      filePath: join(process.cwd(), "adapters/dota2/generator/server/selection-flow.ts"),
      exportName: "SELECTION_FLOW_GAP_FILL_BOUNDARIES",
      marker: "GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
    },
    {
      filePath: join(process.cwd(), "adapters/dota2/generator/server/weighted-pool.ts"),
      exportName: "WEIGHTED_POOL_GAP_FILL_BOUNDARIES",
      marker: "GAP_FILL_BOUNDARY: weighted_pool.selection_policy",
    },
    {
      filePath: join(process.cwd(), "adapters/dota2/generator/ui/selection-modal.ts"),
      exportName: "SELECTION_MODAL_GAP_FILL_BOUNDARIES",
      marker: "GAP_FILL_BOUNDARY: ui.selection_modal.payload_adapter",
    },
  ];

  const missing: string[] = [];

  for (const anchor of requiredAnchors) {
    if (!existsSync(anchor.filePath)) {
      missing.push(`Missing generator file: ${anchor.filePath}`);
      continue;
    }

    const content = readFileSync(anchor.filePath, "utf-8");
    if (!content.includes(anchor.exportName)) {
      missing.push(`Missing boundary export ${anchor.exportName} in ${anchor.filePath}`);
    }
    if (!content.includes(anchor.marker)) {
      missing.push(`Missing boundary marker "${anchor.marker}" in ${anchor.filePath}`);
    }
  }

  if (missing.length === 0) {
    return {
      name: "Gap Fill Boundaries",
      status: "pass",
      message: `All ${requiredAnchors.length} Dota2 gap-fill anchor files declare boundary exports and markers`,
    };
  }

  return {
    name: "Gap Fill Boundaries",
    status: "warn",
    message: `${missing.length} boundary anchor issues found`,
    details: missing,
    suggestion: "Keep the declared gap-fill anchor exports in the generator modules before broadening more cases.",
  };
}

export function checkRuntimeBridgeWiring(hostRoot: string): DoctorCheck {
  const serverEntry = join(hostRoot, "game/scripts/src/rune_weaver/index.ts");
  const modulesEntry = join(hostRoot, "game/scripts/src/modules/index.ts");
  const hudEntry = join(hostRoot, "content/panorama/src/hud/script.tsx");
  const hudStyles = join(hostRoot, "content/panorama/src/hud/styles.less");
  const activeFeatureCount = readActiveFeatureCount(hostRoot);
  const generatedUiLessFiles = findGeneratedUiLessFiles(hostRoot);
  const issues: string[] = [];

  if (!existsSync(serverEntry)) {
    issues.push("Missing game/scripts/src/rune_weaver/index.ts");
  }

  if (!existsSync(modulesEntry)) {
    issues.push("Missing game/scripts/src/modules/index.ts");
  } else {
    const content = readFileSync(modulesEntry, "utf-8");
    if (!content.includes("activateRuneWeaverModules")) {
      issues.push("modules/index.ts does not call activateRuneWeaverModules");
    }
  }

  if (!existsSync(hudEntry)) {
    issues.push("Missing content/panorama/src/hud/script.tsx");
  } else {
    const content = readFileSync(hudEntry, "utf-8");
    if (!content.includes("RuneWeaverHUDRoot") && !content.includes("RuneWeaverGeneratedUIRoot")) {
      issues.push("hud/script.tsx does not mount Rune Weaver HUD root");
    }
  }

  if (!existsSync(hudStyles)) {
    issues.push("Missing content/panorama/src/hud/styles.less");
  } else {
    const content = readFileSync(hudStyles, "utf-8");
    if (!/\.rune-weaver-root\s*\{/.test(content)) {
      issues.push("hud/styles.less does not declare .rune-weaver-root");
    }
    if (
      (activeFeatureCount ?? 1) > 0
      && generatedUiLessFiles.length > 0
      && !/@import "\.\.\/rune_weaver\/generated\/ui\/[^"]+\.less";/.test(content)
    ) {
      issues.push("hud/styles.less does not import Rune Weaver styles");
    }
  }

  if (issues.length === 0) {
    return {
      name: "Runtime Bridge Wiring",
      status: "pass",
      message: "Server and Panorama bridge entry points are wired",
    };
  }

  return {
    name: "Runtime Bridge Wiring",
    status: "fail",
    message: `${issues.length} runtime bridge wiring issues found`,
    details: [
      ...issues,
      "Fix: run npm run cli -- dota2 repair --host <path> --safe, then run yarn dev in the host.",
    ],
    suggestion: "Refresh bridge wiring, then rebuild the host UI assets before launching Dota2.",
  };
}

export function checkHostBuildArtifacts(hostRoot: string): DoctorCheck {
  const packagePath = join(hostRoot, "package.json");
  const expectedArtifacts = [
    "content/panorama/layout/custom_game/hud/script.js",
    "content/panorama/layout/custom_game/hud/styles.css",
  ];

  if (!existsSync(packagePath)) {
    return {
      name: "Host Build Artifacts",
      status: "warn",
      message: "Cannot check build artifacts without package.json",
      details: ["Fix: verify this is an x-template host."],
      suggestion: "Restore package.json first so yarn dev can rebuild the host assets.",
    };
  }

  const missing = expectedArtifacts.filter((relativePath) => !existsSync(join(hostRoot, relativePath)));

  if (missing.length === 0) {
    return {
      name: "Host Build Artifacts",
      status: "pass",
      message: "Panorama build artifacts exist",
      details: expectedArtifacts,
    };
  }

  return {
    name: "Host Build Artifacts",
    status: "warn",
    message: `${missing.length} build artifacts are missing or stale`,
    details: [
      ...missing.map((relativePath) => `Missing: ${relativePath}`),
      "Fix: run yarn dev in the host before launching Dota2.",
    ],
    suggestion: "Run yarn dev in the host so Panorama rebuilds the missing HUD artifacts.",
  };
}

export function generateRecommendations(checks: DoctorCheck[]): string[] {
  const recs: string[] = [];
  const addon = checks.find((c) => c.name === "Addon Config");
  const workspace = checks.find((c) => c.name === "Rune Weaver Workspace");
  const postGen = checks.find((c) => c.name === "Post-Generation Validation");
  const pkg = checks.find((c) => c.name === "Package Scripts");
  const dirs = checks.find((c) => c.name === "Dota Directories");
  const structure = checks.find((c) => c.name === "Runtime Assets");
  const boundaries = checks.find((c) => c.name === "Gap Fill Boundaries");
  const bridge = checks.find((c) => c.name === "Runtime Bridge Wiring");
  const build = checks.find((c) => c.name === "Host Build Artifacts");

  if (addon?.status === "fail" || addon?.message.includes("x_template")) {
    recs.push("Initialize host: npm run cli -- dota2 init --host <path>");
  }
  if (dirs?.status === "fail") recs.push("Install host links: rename addon.config first, then run yarn install");
  if (workspace?.status !== "pass") recs.push("Repair workspace metadata: npm run cli -- dota2 init --host <path>");
  if (postGen?.status === "fail") recs.push("Fix issues: npm run cli -- dota2 repair --host <path> --safe");
  if (pkg?.status === "warn") recs.push("Install deps: yarn install");
  if (structure?.status === "warn") recs.push("Refresh Rune Weaver bridge or generated outputs if this host should contain a feature");
  if (bridge?.status === "fail") recs.push("Repair bridge wiring: npm run cli -- dota2 repair --host <path> --safe");
  if (build?.status === "warn") recs.push("Compile host assets: cd <host> && yarn dev");
  if (boundaries?.status === "warn") recs.push("Restore declared Dota2 gap-fill anchors before broadening case-specific generator edits");
  if (recs.length === 0) recs.push("All checks passed! Your host is ready.");

  return recs;
}

/**
 * Dota2 Adapter - Bridge Refresh + Host Repair
 *
 * Host bridge uses a one-time integration into the host entry files and
 * repeated refreshes of Rune Weaver owned generated indexes.
 *
 * T124: Host repair entry points in this module:
 * - repairDotaTsAdapter(): patches dota_ts_adapter _G ability registration (called by init + refresh)
 * - migrateBaselineAbilities(): migrates baseline abilities XLSXContent -> DOTAAbilities (called by refresh)
 *
 * Both repairs are idempotent and safe to re-run.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  RuneWeaverFeatureRecord,
  RuneWeaverWorkspace,
  getActiveFeatures,
} from "../../../core/workspace/index.js";
import { migrateBaselineAbilities } from "../kv/baseline-migrator.js";

export interface BridgeRefreshResult {
  success: boolean;
  serverRefreshed: boolean;
  uiRefreshed: boolean;
  adapterPatched: boolean;
  baselineMigrated: boolean;
  mountedFeatures: string[];
  errors: string[];
}

export interface DotaTsAdapterRepairResult {
  success: boolean;
  sourcePatched: boolean;
  runtimePatched: boolean;
  errors: string[];
}

/**
 * T123: Host Repair - dota_ts_adapter _G Ability Registration
 *
 * Repair entry: INIT + REFRESH
 * - Called by: dota2 init (one-time host setup)
 * - Called by: refreshBridge (repeated bridge refresh, idempotent)
 *
 * What it repairs:
 * - Source adapter (game/scripts/src/utils/dota_ts_adapter.ts): adds "(_G as any)[name] = env[name];"
 * - Runtime adapter (game/scripts/vscripts/utils/dota_ts_adapter.lua): adds "_G[name] = env[name]"
 *
 * Why: Dota2 TS adapter uses env[name] = {} for every definition, but without _G registration
 * abilities are not discoverable at runtime by the Dota2 engine's ability registration system.
 *
 * NOT a general repair framework - only fixes this specific _G registration issue.
 */

const BRIDGE_PATHS = {
  serverBridge: "game/scripts/src/rune_weaver/index.ts",
  serverGeneratedIndex: "game/scripts/src/rune_weaver/generated/server/index.ts",
  uiBridge: "content/panorama/src/rune_weaver/index.tsx",
  uiGeneratedIndex: "content/panorama/src/rune_weaver/generated/ui/index.tsx",
  sourceAdapter: "game/scripts/src/utils/dota_ts_adapter.ts",
  runtimeAdapter: "game/scripts/vscripts/utils/dota_ts_adapter.lua",
} as const;

function ensureGlobalAbilityRegistrationInSource(content: string): {
  updated: string;
  changed: boolean;
} {
  if (content.includes("(_G as any)[name] = env[name];")) {
    return { updated: content, changed: false };
  }

  const updated = content.replace(
    /(\s*env\[name\]\s*=\s*\{\};\s*\r?\n)/,
    `$1    (_G as any)[name] = env[name];\n`
  );

  return { updated, changed: updated !== content };
}

function ensureGlobalAbilityRegistrationInRuntime(content: string): {
  updated: string;
  changed: boolean;
} {
  if (content.includes("_G[name] = env[name]")) {
    return { updated: content, changed: false };
  }

  const updated = content.replace(
    /(\s*env\[name\]\s*=\s*\{\}\s*\r?\n)/,
    `$1    _G[name] = env[name]\n`
  );

  return { updated, changed: updated !== content };
}

export function repairDotaTsAdapter(projectPath: string): DotaTsAdapterRepairResult {
  const result: DotaTsAdapterRepairResult = {
    success: false,
    sourcePatched: false,
    runtimePatched: false,
    errors: [],
  };

  const sourceAdapterPath = join(projectPath, BRIDGE_PATHS.sourceAdapter);
  const runtimeAdapterPath = join(projectPath, BRIDGE_PATHS.runtimeAdapter);

  try {
    if (existsSync(sourceAdapterPath)) {
      const content = readFileSync(sourceAdapterPath, "utf-8");
      const { updated, changed } = ensureGlobalAbilityRegistrationInSource(content);
      if (changed) {
        writeFileSync(sourceAdapterPath, updated, "utf-8");
        result.sourcePatched = true;
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to patch source dota_ts_adapter.ts: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  try {
    if (existsSync(runtimeAdapterPath)) {
      const content = readFileSync(runtimeAdapterPath, "utf-8");
      const { updated, changed } = ensureGlobalAbilityRegistrationInRuntime(content);
      if (changed) {
        writeFileSync(runtimeAdapterPath, updated, "utf-8");
        result.runtimePatched = true;
      }
    }
  } catch (error) {
    result.errors.push(
      `Failed to patch runtime dota_ts_adapter.lua: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  result.success = result.errors.length === 0;
  return result;
}

function generateServerIndexContent(
  features: RuneWeaverFeatureRecord[],
  hostRoot: string
): string {
  const activeFeatures = features.filter((feature) => feature.status === "active");
  const moduleFileNames: string[] = [];
  const generatedAbilityNames: string[] = [];

  for (const feature of activeFeatures) {
    const featureKvFiles = feature.generatedFiles.filter(
      (file) => file.includes("npc_abilities_custom") && file.endsWith(".txt")
    );

    for (const kvFile of featureKvFiles) {
      const fullPath = join(hostRoot, kvFile);
      if (existsSync(fullPath)) {
        const kvContent = readFileSync(fullPath, "utf-8");
        const abilityNameMatches = kvContent.match(/"([^"]+)"\s*\{/g);
        if (abilityNameMatches) {
          for (const match of abilityNameMatches) {
            const nameMatch = match.match(/"([^"]+)"/);
            if (nameMatch && nameMatch[1] && nameMatch[1].startsWith("rw_")) {
              const abilityName = nameMatch[1];
              if (!generatedAbilityNames.includes(abilityName)) {
                generatedAbilityNames.push(abilityName);
              }
            }
          }
        }
      }
    }

    for (const file of feature.generatedFiles) {
      if (!file.includes("server") || !file.endsWith(".ts")) {
        continue;
      }

      const fileName = file.split("/").pop()?.replace(".ts", "");
      if (!fileName || fileName === "index") {
        continue;
      }

      const fullPath = join(hostRoot, file);
      if (!existsSync(fullPath)) {
        console.warn(`[Bridge] Skipping non-existent server module: ${file}`);
        continue;
      }

      moduleFileNames.push(fileName);
    }
  }

  const abilityBlocks: string[] = [];
  for (const name of generatedAbilityNames) {
    const safeName = name.replace(/-/g, "_");
    abilityBlocks.push(`    const abilityName_${safeName} = "${name}";
    if (hero.HasAbility(abilityName_${safeName})) {
      print("[Rune Weaver] Ability ${name} already exists on hero, skipping");
    } else {
      hero.AddAbility(abilityName_${safeName});
      const ability = hero.FindAbilityByName(abilityName_${safeName});
      if (ability) {
        ability.SetLevel(1);
        print("[Rune Weaver] Attached ability ${name} to hero at level 1");
      } else {
        print("[Rune Weaver] ERROR: Failed to find ability ${name} after AddAbility");
      }
    }`);
  }

  const heroAttachmentCode = generatedAbilityNames.length > 0 ? `
  // ========================================================================
  // Hero Attachment - Rune Weaver Phase 1 Minimal Implementation
  // Defers attachment until hero spawns via npc_spawned hook
  // Target: Player 0 hero via HeroList
  // ========================================================================
  let heroAttachmentDone = false;

  function tryAttachAbilities(hero: CDOTA_BaseNPC_Hero): void {
    if (heroAttachmentDone) { return; }
    const playerId = hero.GetPlayerID();
    if (playerId !== 0) { return; }
    print("[Rune Weaver] Hero attachment: detected player 0 hero spawned");
${abilityBlocks.join("\n")}
    heroAttachmentDone = true;
  }

  // Fallback: if hero already exists when modules activate
  const existingHero = HeroList.GetHero(0);
  if (existingHero) {
    tryAttachAbilities(existingHero);
  } else {
    // Listen for hero spawn
    ListenToGameEvent("npc_spawned", (event: { entindex: number }) => {
      const heroEnt = EntIndexToHScript(event.entindex as EntityIndex) as CDOTA_BaseNPC_Hero;
      if (heroEnt && heroEnt.IsHero()) {
        tryAttachAbilities(heroEnt);
      }
    }, undefined);
    print("[Rune Weaver] Hero attachment: waiting for player 0 hero to spawn");
  }` : "";

  return `// Generated by Rune Weaver
// Server modules index - refreshed at ${new Date().toISOString()}
// Do not edit manually.

// Dynamic module loading to avoid Lua local variable limit
const moduleFileNames = ${JSON.stringify(moduleFileNames)};
for (const fileName of moduleFileNames) {
  const mod = require("rune_weaver.generated.server." + fileName);
  const registerKey = "register" + fileName.split("_").map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join("");
  const registerFn = mod[registerKey];
  if (registerFn) { registerFn(); }
}

// Rune Weaver Generated Ability Names for Hero Attachment
// These abilities will be automatically attached to heroes by the host addon
// Format: abilityName = "rw_xxx"
${generatedAbilityNames.map((name) => `const ${name.replace(/-/g, "_").toUpperCase()}_ABILITY = "${name}";`).join("\n")}

export function activateRwGeneratedServer(): void {
  // Preload ability wrappers to ensure registerAbility() executes before AddAbility()
  // Using dynamic require path to avoid TSTL compile-time resolution
${generatedAbilityNames.map((name) => `  { const abilityPath = "rune_weaver.abilities.${name}"; require(abilityPath); }`).join("\n")}

  // Mount ${activeFeatures.length} active features
${heroAttachmentCode}
  print("[Rune Weaver] ${activeFeatures.length} server modules activated");
  print("[Rune Weaver] Hero attachment abilities registered: ${generatedAbilityNames.length}");
}
`;
}

function generateUIIndexContent(features: RuneWeaverFeatureRecord[]): string {
  const activeFeatures = features.filter((feature) => feature.status === "active");
  const imports: string[] = [];
  const componentUsages: string[] = [];

  for (const feature of activeFeatures) {
    for (const file of feature.generatedFiles) {
      if (!file.includes("panorama") || !file.endsWith(".tsx")) {
        continue;
      }

      const fileName = file.split("/").pop()?.replace(".tsx", "");
      if (!fileName || fileName === "index") {
        continue;
      }

      const componentName = toPascalCase(fileName);
      imports.push(`import { ${componentName} } from "./${fileName}";`);
      componentUsages.push(`      <${componentName} />`);
    }
  }

  return `// Generated by Rune Weaver
// UI components index - refreshed at ${new Date().toISOString()}
// Do not edit manually.

import React from "react";
${imports.join("\n")}

export function RuneWeaverGeneratedUIRoot() {
  return (
    <>
${componentUsages.join("\n")}
    </>
  );
}

export default RuneWeaverGeneratedUIRoot;
`;
}

export function refreshBridge(
  projectPath: string,
  workspace: RuneWeaverWorkspace
): BridgeRefreshResult {
  const result: BridgeRefreshResult = {
    success: false,
    serverRefreshed: false,
    uiRefreshed: false,
    adapterPatched: false,
    baselineMigrated: false,
    mountedFeatures: [],
    errors: [],
  };

  const activeFeatures = getActiveFeatures(workspace);
  result.mountedFeatures = activeFeatures.map((feature) => feature.featureId);

  const adapterRepair = repairDotaTsAdapter(projectPath);
  result.adapterPatched = adapterRepair.sourcePatched || adapterRepair.runtimePatched;
  if (!adapterRepair.success) {
    result.errors.push(...adapterRepair.errors);
  }

  const migrationResult = migrateBaselineAbilities({ hostRoot: projectPath });
  result.baselineMigrated = migrationResult.success;
  if (!migrationResult.success) {
    result.errors.push(...migrationResult.errors);
  }

  const serverBridgePath = join(projectPath, BRIDGE_PATHS.serverBridge);
  if (existsSync(serverBridgePath)) {
    const existingContent = readFileSync(serverBridgePath, "utf-8");
    if (!existingContent.includes("activateRwGeneratedServer")) {
      const correctContent = `// Rune Weaver Server Bridge
// This file is the entry point for Rune Weaver generated server modules
// Bridge 只做聚合与接线，业务逻辑在 generated/server/ 中

import { activateRwGeneratedServer } from "./generated/server";

export function activateRuneWeaverModules(): void {
  activateRwGeneratedServer();
}
`;
      console.warn("[Bridge] Server bridge has incorrect content, fixing...");
      writeFileSync(serverBridgePath, correctContent, "utf-8");
    }
  }

  const serverIndexPath = join(projectPath, BRIDGE_PATHS.serverGeneratedIndex);
  try {
    if (!existsSync(serverIndexPath)) {
      result.errors.push("Missing server generated index. Initialize the host first.");
      return result;
    }

    writeFileSync(serverIndexPath, generateServerIndexContent(workspace.features, projectPath), "utf-8");
    result.serverRefreshed = true;
  } catch (error) {
    result.errors.push(
      `Failed to refresh server generated index: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const uiIndexPath = join(projectPath, BRIDGE_PATHS.uiGeneratedIndex);
  try {
    if (!existsSync(uiIndexPath)) {
      result.errors.push("Missing UI generated index. Initialize the host first.");
      return result;
    }

    writeFileSync(uiIndexPath, generateUIIndexContent(workspace.features), "utf-8");
    result.uiRefreshed = true;
  } catch (error) {
    result.errors.push(
      `Failed to refresh UI generated index: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  result.success = result.serverRefreshed && result.uiRefreshed && result.errors.length === 0;
  return result;
}

export function checkBridgeFiles(projectPath: string): {
  serverBridge: boolean;
  serverIndex: boolean;
  uiBridge: boolean;
  uiIndex: boolean;
} {
  return {
    serverBridge: existsSync(join(projectPath, BRIDGE_PATHS.serverBridge)),
    serverIndex: existsSync(join(projectPath, BRIDGE_PATHS.serverGeneratedIndex)),
    uiBridge: existsSync(join(projectPath, BRIDGE_PATHS.uiBridge)),
    uiIndex: existsSync(join(projectPath, BRIDGE_PATHS.uiGeneratedIndex)),
  };
}

export function printBridgeStatus(result: BridgeRefreshResult): void {
  console.log("=".repeat(60));
  console.log("Bridge Refresh Result");
  console.log("=".repeat(60));
  console.log();

  console.log(`Status: ${result.success ? "OK" : "FAILED"}`);
  console.log(`Server index: ${result.serverRefreshed ? "refreshed" : "failed"}`);
  console.log(`UI index: ${result.uiRefreshed ? "refreshed" : "failed"}`);
  console.log(`Adapter patch: ${result.adapterPatched ? "applied" : "no-op"}`);
  console.log();

  if (result.mountedFeatures.length > 0) {
    console.log("Mounted features:");
    for (const featureId of result.mountedFeatures) {
      console.log(`  - ${featureId}`);
    }
  } else {
    console.log("Mounted features: none");
  }

  if (result.errors.length > 0) {
    console.log();
    console.log("Errors:");
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log();
  console.log("=".repeat(60));
}

export function checkHostEntryBridge(projectPath: string): {
  serverEntry: boolean;
  uiEntry: boolean;
} {
  const serverEntryPath = join(projectPath, "game/scripts/src/modules/index.ts");
  const uiEntryPath = join(projectPath, "content/panorama/src/hud/script.tsx");

  let serverEntry = false;
  let uiEntry = false;

  if (existsSync(serverEntryPath)) {
    try {
      serverEntry = hasValidServerBridge(readFileSync(serverEntryPath, "utf-8"));
    } catch {
      serverEntry = false;
    }
  }

  if (existsSync(uiEntryPath)) {
    try {
      uiEntry = hasValidUIBridge(readFileSync(uiEntryPath, "utf-8"));
    } catch {
      uiEntry = false;
    }
  }

  return { serverEntry, uiEntry };
}

export interface HostEntryInjectionResult {
  success: boolean;
  serverInjected: boolean;
  uiInjected: boolean;
  errors: string[];
}

export function injectHostEntryBridge(projectPath: string): HostEntryInjectionResult {
  const result: HostEntryInjectionResult = {
    success: false,
    serverInjected: false,
    uiInjected: false,
    errors: [],
  };

  const serverEntryPath = join(projectPath, "game/scripts/src/modules/index.ts");
  const uiEntryPath = join(projectPath, "content/panorama/src/hud/script.tsx");

  if (existsSync(serverEntryPath)) {
    try {
      const updated = injectServerBridgeContent(readFileSync(serverEntryPath, "utf-8"));
      writeFileSync(serverEntryPath, updated, "utf-8");
      result.serverInjected = hasValidServerBridge(updated);
      if (!result.serverInjected) {
        result.errors.push("Server bridge injection did not produce a valid host entry.");
      }
    } catch (error) {
      result.errors.push(
        `Server host entry injection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    result.errors.push("Missing server host entry: game/scripts/src/modules/index.ts");
  }

  if (existsSync(uiEntryPath)) {
    try {
      const updated = injectUIBridgeContent(readFileSync(uiEntryPath, "utf-8"));
      writeFileSync(uiEntryPath, updated, "utf-8");
      result.uiInjected = hasValidUIBridge(updated);
      if (!result.uiInjected) {
        result.errors.push("UI bridge injection did not produce a valid host entry.");
      }
    } catch (error) {
      result.errors.push(
        `UI host entry injection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    result.errors.push("Missing UI host entry: content/panorama/src/hud/script.tsx");
  }

  result.success = result.serverInjected && result.uiInjected;
  return result;
}

export function printInjectionResult(result: HostEntryInjectionResult): void {
  console.log("=".repeat(60));
  console.log("Host Entry Bridge Injection Result");
  console.log("=".repeat(60));
  console.log();

  console.log(`Status: ${result.success ? "OK" : "FAILED"}`);
  console.log(`Server injection: ${result.serverInjected ? "OK" : "FAILED"}`);
  console.log(`UI injection: ${result.uiInjected ? "OK" : "FAILED"}`);

  if (result.errors.length > 0) {
    console.log();
    console.log("Errors:");
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log();
  console.log("=".repeat(60));
}

function injectServerBridgeContent(content: string): string {
  let next = content;
  next = ensureImportLine(
    next,
    'import { activateRuneWeaverModules } from "../rune_weaver";'
  );
  next = next.replace(/\n\/\/ Rune Weaver Bridge \(auto-injected\)\nactivateRuneWeaverModules\(\);\s*$/m, "");

  if (hasValidServerBridge(next)) {
    return next;
  }

  const functionMatch = next.match(/export function ActivateModules\(\)\s*\{/);
  if (!functionMatch || functionMatch.index === undefined) {
    throw new Error("Could not locate ActivateModules() for server bridge injection.");
  }

  const braceStart = functionMatch.index + functionMatch[0].length - 1;
  const functionEnd = findMatchingBrace(next, braceStart);
  if (functionEnd < 0) {
    throw new Error("Could not locate the end of ActivateModules().");
  }

  const injection = "\n    // Rune Weaver Bridge (auto-injected)\n    activateRuneWeaverModules();\n";
  return `${next.slice(0, functionEnd)}${injection}${next.slice(functionEnd)}`;
}

function injectUIBridgeContent(content: string): string {
  let next = content;
  next = ensureImportLine(next, 'import { RuneWeaverHUDRoot } from "../rune_weaver";');
  next = next.replace(
    /return\s*\(\s*<\s*\r?\n\s*<RuneWeaverHUDRoot\s*\/>\s*\r?\n\s*>\s*/m,
    "return (\n        <>\n            <RuneWeaverHUDRoot />\n"
  );

  if (hasValidUIBridge(next)) {
    return next;
  }

  if (next.includes("<RuneWeaverHUDRoot />")) {
    return next;
  }

  const fragmentPattern = /return\s*\(\s*<>\s*/m;
  if (fragmentPattern.test(next)) {
    return next.replace(
      fragmentPattern,
      "return (\n        <>\n            <RuneWeaverHUDRoot />\n"
    );
  }

  const panelPattern = /return\s*\(\s*(<Panel\b[^>]*>)\s*/m;
  if (panelPattern.test(next)) {
    return next.replace(
      panelPattern,
      (_match, openTag: string) =>
        `return (\n        ${openTag}\n            <RuneWeaverHUDRoot />\n`
    );
  }

  throw new Error("Could not locate a JSX root for UI bridge injection.");
}

function ensureImportLine(content: string, importLine: string): string {
  if (content.includes(importLine)) {
    return content;
  }

  const imports = [...content.matchAll(/^import .*;$/gm)];
  if (imports.length === 0) {
    return `${importLine}\n${content}`;
  }

  const lastImport = imports[imports.length - 1];
  const insertAt = (lastImport.index ?? 0) + lastImport[0].length;
  return `${content.slice(0, insertAt)}\n${importLine}${content.slice(insertAt)}`;
}

function findMatchingBrace(content: string, openBraceIndex: number): number {
  let depth = 0;

  for (let index = openBraceIndex; index < content.length; index += 1) {
    const char = content[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function hasValidServerBridge(content: string): boolean {
  const hasImport = content.includes(
    'import { activateRuneWeaverModules } from "../rune_weaver";'
  );
  const functionBlock = content.match(/export function ActivateModules\(\)\s*\{([\s\S]*?)\n\}/m);
  const hasCallInsideFunction =
    functionBlock !== null && functionBlock[1].includes("activateRuneWeaverModules();");

  return hasImport && hasCallInsideFunction;
}

function hasValidUIBridge(content: string): boolean {
  const hasImport = content.includes('import { RuneWeaverHUDRoot } from "../rune_weaver";');
  const hasUsage = content.includes("<RuneWeaverHUDRoot />");
  const hasBrokenPattern = /return\s*\(\s*<\s*\r?\n\s*<RuneWeaverHUDRoot\s*\/>\s*\r?\n\s*>/m.test(
    content
  );

  return hasImport && hasUsage && !hasBrokenPattern;
}

function toPascalCase(value: string): string {
  return value
    .replace(/^[a-z]/, (char) => char.toUpperCase())
    .replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase())
    .replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
}

// F011: Re-export bridge export functions for CLI → UI bridge
export {
  exportWorkspaceToBridge,
  exportHostToBridge,
  getBridgeFilePath,
  BRIDGE_DEFAULTS,
  type BridgeExportConfig,
  type BridgeExportResult,
} from "./export.js";

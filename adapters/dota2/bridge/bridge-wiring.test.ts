import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { injectHostEntryBridge, ensureBridgeFiles, refreshBridge } from "./index.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createTempHost(): string {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-bridge-"));

  mkdirSync(join(hostRoot, "game", "scripts", "src", "modules"), { recursive: true });
  mkdirSync(join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "server"), { recursive: true });
  mkdirSync(join(hostRoot, "content", "panorama", "src", "hud"), { recursive: true });
  mkdirSync(join(hostRoot, "content", "panorama", "src", "rune_weaver", "generated", "ui"), { recursive: true });

  writeFileSync(
    join(hostRoot, "game", "scripts", "src", "modules", "index.ts"),
    `export function ActivateModules() {\n  print("host activate");\n}\n`,
    "utf-8"
  );

  writeFileSync(
    join(hostRoot, "content", "panorama", "src", "hud", "script.tsx"),
    `import React from "react";\nimport { render } from "react-panorama-x";\n\nfunction Root() {\n  return (\n    <>\n      <Label text="host" />\n    </>\n  );\n}\n\nrender(<Root />, $.GetContextPanel());\n`,
    "utf-8"
  );

  writeFileSync(
    join(hostRoot, "content", "panorama", "src", "hud", "styles.less"),
    `@import "../rune_weaver/generated/ui/stale_feature.less";\n\n.root {\n  width: 100%;\n}\n`,
    "utf-8"
  );

  return hostRoot;
}

console.log("=== Bridge Wiring Tests ===");

const hostRoot = createTempHost();

try {
  console.log("Test 1: ensureBridgeFiles creates reusable bridge shells");
  const ensureResult = ensureBridgeFiles(hostRoot);
  assert(ensureResult.success, "ensureBridgeFiles should succeed");
  assert(readFileSync(join(hostRoot, "game", "scripts", "src", "rune_weaver", "index.ts"), "utf-8").includes("activateRuneWeaverModules"), "server bridge should exist");
  assert(readFileSync(join(hostRoot, "content", "panorama", "src", "rune_weaver", "index.tsx"), "utf-8").includes("RuneWeaverHUDRoot"), "ui bridge should exist");
  console.log("✓ Test 1 passed");

  console.log("Test 2: injectHostEntryBridge wires server and UI host entries");
  const injectionResult = injectHostEntryBridge(hostRoot);
  assert(injectionResult.success, "injectHostEntryBridge should succeed");
  const serverEntry = readFileSync(join(hostRoot, "game", "scripts", "src", "modules", "index.ts"), "utf-8");
  const uiEntry = readFileSync(join(hostRoot, "content", "panorama", "src", "hud", "script.tsx"), "utf-8");
  assert(serverEntry.includes('import { activateRuneWeaverModules } from "../rune_weaver";'), "server host entry should import bridge");
  assert(serverEntry.includes("activateRuneWeaverModules();"), "server host entry should call bridge");
  assert(uiEntry.includes('import { RuneWeaverHUDRoot } from "../rune_weaver";'), "ui host entry should import bridge");
  assert(uiEntry.includes("<RuneWeaverHUDRoot />"), "ui host entry should mount Rune Weaver root");
  console.log("✓ Test 2 passed");

  console.log("Test 3: injectHostEntryBridge is idempotent");
  const secondResult = injectHostEntryBridge(hostRoot);
  assert(secondResult.success, "second injectHostEntryBridge should also succeed");
  const serverEntryAgain = readFileSync(join(hostRoot, "game", "scripts", "src", "modules", "index.ts"), "utf-8");
  const uiEntryAgain = readFileSync(join(hostRoot, "content", "panorama", "src", "hud", "script.tsx"), "utf-8");
  assert(serverEntryAgain.match(/activateRuneWeaverModules\(\);/g)?.length === 1, "server bridge call should not duplicate");
  assert(uiEntryAgain.match(/<RuneWeaverHUDRoot \/>/g)?.length === 1, "ui bridge mount should not duplicate");
  console.log("✓ Test 3 passed");

  console.log("Test 4: refreshBridge removes stale generated LESS imports when workspace is empty");
  const refreshResult = refreshBridge(hostRoot, {
    version: "0.1.0",
    hostType: "dota2-x-template",
    hostRoot,
    addonName: "bridge_test",
    initializedAt: new Date().toISOString(),
    features: [],
  });
  assert(refreshResult.success, "refreshBridge should succeed for empty workspace");
  const hudStyles = readFileSync(join(hostRoot, "content", "panorama", "src", "hud", "styles.less"), "utf-8");
  assert(!hudStyles.includes("stale_feature.less"), "stale generated LESS import should be removed");
  assert(hudStyles.includes(".rune-weaver-root"), "root style block should still exist");
  console.log("✓ Test 4 passed");

  console.log("Test 5: injectHostEntryBridge can create missing host entry shells");
  const missingEntryHost = mkdtempSync(join(tmpdir(), "rw-bridge-missing-"));
  try {
    mkdirSync(join(missingEntryHost, "game", "scripts", "src", "rune_weaver", "generated", "server"), { recursive: true });
    mkdirSync(join(missingEntryHost, "content", "panorama", "src", "rune_weaver", "generated", "ui"), { recursive: true });
    const ensureMissingResult = ensureBridgeFiles(missingEntryHost);
    assert(ensureMissingResult.success, "ensureBridgeFiles should succeed for missing-entry host");

    const missingInjectionResult = injectHostEntryBridge(missingEntryHost);
    assert(missingInjectionResult.success, "injectHostEntryBridge should create missing host entries");

    const createdServerEntry = readFileSync(join(missingEntryHost, "game", "scripts", "src", "modules", "index.ts"), "utf-8");
    const createdUIEntry = readFileSync(join(missingEntryHost, "content", "panorama", "src", "hud", "script.tsx"), "utf-8");
    assert(createdServerEntry.includes("activateRuneWeaverModules();"), "created server entry should mount Rune Weaver bridge");
    assert(createdUIEntry.includes("<RuneWeaverHUDRoot />"), "created UI entry should mount Rune Weaver HUD root");
    console.log("✓ Test 5 passed");
  } finally {
    rmSync(missingEntryHost, { recursive: true, force: true });
  }

  console.log("=== All tests passed ===");
} finally {
  rmSync(hostRoot, { recursive: true, force: true });
}

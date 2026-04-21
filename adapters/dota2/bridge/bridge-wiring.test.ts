import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  injectHostEntryBridge,
  ensureBridgeFiles,
  refreshBridge,
  shouldMaintainHudStyles,
} from "./index.js";

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

  console.log("Test 6: refreshBridge respects grant-only provider exports and wires selection grant handlers");
  const crossFeatureHost = createTempHost();
  try {
    mkdirSync(join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "generated", "shared"), { recursive: true });
    mkdirSync(join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "features", "skill_provider_demo"), { recursive: true });
    mkdirSync(join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "features", "consumer_draw_demo"), { recursive: true });

    writeFileSync(
      join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "generated", "server", "consumer_draw_demo_input_trigger_input_key_binding.ts"),
      "export class ConsumerDrawDemoInputTriggerInputKeyBinding {}\n",
      "utf-8",
    );
    writeFileSync(
      join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "generated", "shared", "consumer_draw_demo_weighted_pool_data_weighted_pool.ts"),
      "export class ConsumerDrawDemoWeightedPoolDataWeightedPool {}\n",
      "utf-8",
    );
    writeFileSync(
      join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "generated", "server", "consumer_draw_demo_selection_flow_rule_selection_flow.ts"),
      "export class ConsumerDrawDemoSelectionFlowRuleSelectionFlow {}\n",
      "utf-8",
    );

    writeFileSync(
      join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "features", "skill_provider_demo", "dota2-provider-ability-export.json"),
      JSON.stringify({
        adapter: "dota2_provider_ability_export",
        version: 1,
        featureId: "skill_provider_demo",
        surfaces: [
          {
            surfaceId: "grantable_primary_hero_ability",
            abilityName: "rw_skill_provider_demo",
            attachmentMode: "grant_only",
          },
        ],
      }, null, 2),
      "utf-8",
    );
    writeFileSync(
      join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "features", "consumer_draw_demo", "selection-grant-bindings.json"),
      JSON.stringify({
        adapter: "dota2_selection_grant_binding",
        version: 1,
        featureId: "consumer_draw_demo",
        bindings: [
          {
            objectId: "TL007",
            targetFeatureId: "skill_provider_demo",
            targetSurfaceId: "grantable_primary_hero_ability",
            relation: "grants",
            applyBehavior: "grant_primary_hero_ability",
          },
        ],
      }, null, 2),
      "utf-8",
    );

    const crossFeatureRefresh = refreshBridge(crossFeatureHost, {
      version: "0.1.0",
      hostType: "dota2-x-template",
      hostRoot: crossFeatureHost,
      addonName: "bridge_cross_feature_test",
      initializedAt: new Date().toISOString(),
      features: [
        {
          featureId: "skill_provider_demo",
          status: "active",
          generatedFiles: [
            "game/scripts/src/rune_weaver/features/skill_provider_demo/dota2-provider-ability-export.json",
          ],
        },
        {
          featureId: "consumer_draw_demo",
          status: "active",
          generatedFiles: [
            "game/scripts/src/rune_weaver/generated/server/consumer_draw_demo_input_trigger_input_key_binding.ts",
            "game/scripts/src/rune_weaver/generated/shared/consumer_draw_demo_weighted_pool_data_weighted_pool.ts",
            "game/scripts/src/rune_weaver/generated/server/consumer_draw_demo_selection_flow_rule_selection_flow.ts",
            "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-grant-bindings.json",
          ],
        },
      ] as any,
    });
    assert(crossFeatureRefresh.success, "refreshBridge should succeed for cross-feature grant wiring");

    const generatedServerIndex = readFileSync(
      join(crossFeatureHost, "game", "scripts", "src", "rune_weaver", "generated", "server", "index.ts"),
      "utf-8",
    );
    assert(generatedServerIndex.includes("registerSelectionGrantHandlers"), "generated server index should wire selection grant handlers");
    assert(generatedServerIndex.includes("rw_skill_provider_demo"), "generated server index should preload the grant-only provider ability");
    assert(generatedServerIndex.includes("Selection grant: granted "), "generated server index should register the grant runtime");
    assert(generatedServerIndex.includes("from feature "), "generated server index should keep the provider feature reference in the grant runtime log");
    assert(generatedServerIndex.includes('Hero attachment abilities registered: 0'), "grant-only provider should not be auto-attached on activation");
    console.log("✓ Test 6 passed");
  } finally {
    rmSync(crossFeatureHost, { recursive: true, force: true });
  }

  console.log("Test 7: refreshBridge creates hud/styles.less when generated UI LESS exists on disk even if workspace metadata lags");
  const missingStylesHost = mkdtempSync(join(tmpdir(), "rw-bridge-styles-"));
  try {
    mkdirSync(join(missingStylesHost, "game", "scripts", "src", "modules"), { recursive: true });
    mkdirSync(join(missingStylesHost, "game", "scripts", "src", "rune_weaver", "generated", "server"), { recursive: true });
    mkdirSync(join(missingStylesHost, "content", "panorama", "src", "hud"), { recursive: true });
    mkdirSync(join(missingStylesHost, "content", "panorama", "src", "rune_weaver", "generated", "ui"), { recursive: true });
    writeFileSync(
      join(missingStylesHost, "game", "scripts", "src", "modules", "index.ts"),
      `export function ActivateModules() {\n  print("host activate");\n}\n`,
      "utf-8",
    );
    writeFileSync(
      join(missingStylesHost, "content", "panorama", "src", "hud", "script.tsx"),
      `import React from "react";\nimport { render } from "react-panorama-x";\nrender(<Panel />, $.GetContextPanel());\n`,
      "utf-8",
    );
    writeFileSync(
      join(missingStylesHost, "content", "panorama", "src", "rune_weaver", "generated", "ui", "reward_panel.less"),
      `.reward-panel { width: 100%; }\n`,
      "utf-8",
    );

    const workspace = {
      version: "0.1.0",
      hostType: "dota2-x-template",
      hostRoot: missingStylesHost,
      addonName: "bridge_styles_test",
      initializedAt: new Date().toISOString(),
      features: [
        {
          featureId: "ui_reward_demo",
          status: "active",
          generatedFiles: [
            "content/panorama/src/rune_weaver/generated/ui/index.tsx",
          ],
        },
      ],
    } as any;

    assert(!shouldMaintainHudStyles(workspace.features), "workspace metadata alone should stay quiet when it does not record UI less");
    const refreshResult = refreshBridge(missingStylesHost, workspace);
    assert(refreshResult.success, "refreshBridge should succeed when creating hud/styles.less");
    const hudStylesPath = join(missingStylesHost, "content", "panorama", "src", "hud", "styles.less");
    const hudStyles = readFileSync(hudStylesPath, "utf-8");
    assert(hudStyles.includes('@import "../rune_weaver/generated/ui/reward_panel.less";'), "hud styles should import generated ui less");
    assert(hudStyles.includes(".rune-weaver-root"), "hud styles should include root mount style when generated ui less exists");
    console.log("✓ Test 7 passed");
  } finally {
    rmSync(missingStylesHost, { recursive: true, force: true });
  }

  console.log("Test 8: generated style requirement stays false when no UI LESS exists");
  assert(
    !shouldMaintainHudStyles([
      {
        featureId: "no_ui_less_demo",
        status: "active",
        generatedFiles: [
          "game/scripts/src/rune_weaver/generated/server/no_ui_less_demo.ts",
        ],
      } as any,
    ]),
    "doctor/bridge style checks should stay quiet without generated ui less",
  );
  console.log("✓ Test 8 passed");

  console.log("=== All tests passed ===");
} finally {
  rmSync(hostRoot, { recursive: true, force: true });
}

/**
 * Runtime Doctor Check Tests
 *
 * Focused tests for workspace consistency and runtime bridge wiring hints.
 */

import assert from "assert";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { checkRuntimeBridgeWiring, checkWorkspace } from "./doctor-checks-rw.js";

const TEST_ROOT = join(process.cwd(), "tmp", "test-doctor-runtime");

function resetRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
  mkdirSync(TEST_ROOT, { recursive: true });
}

function writeBaseHost(): void {
  mkdirSync(join(TEST_ROOT, "scripts"), { recursive: true });
  writeFileSync(
    join(TEST_ROOT, "scripts/addon.config.ts"),
    "let addon_name = 'test_addon'\n",
    "utf-8"
  );

  mkdirSync(join(TEST_ROOT, "game/scripts/src/rune_weaver"), { recursive: true });
  mkdirSync(join(TEST_ROOT, "game/scripts/src/modules"), { recursive: true });
  mkdirSync(join(TEST_ROOT, "content/panorama/src/hud"), { recursive: true });
  mkdirSync(join(TEST_ROOT, "content/panorama/src/rune_weaver"), { recursive: true });

  writeFileSync(
    join(TEST_ROOT, "package.json"),
    JSON.stringify(
      {
        name: "test-addon",
        scripts: { postinstall: "echo install", dev: "echo dev", launch: "echo launch" },
      },
      null,
      2
    ),
    "utf-8"
  );

  writeFileSync(
    join(TEST_ROOT, "game/scripts/src/rune_weaver/rune-weaver.workspace.json"),
    JSON.stringify(
      {
        version: "0.1",
        hostType: "dota2-x-template",
        hostRoot: TEST_ROOT,
        addonName: "test_addon",
        initializedAt: new Date().toISOString(),
        features: [
          {
            featureId: "feature_a",
            intentKind: "ability",
            status: "active",
            revision: 1,
            blueprintId: "bp",
            selectedPatterns: [],
            generatedFiles: ["game/scripts/src/rune_weaver/generated/server/missing.ts"],
            entryBindings: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      null,
      2
    ),
    "utf-8"
  );

  writeFileSync(join(TEST_ROOT, "game/scripts/src/modules/index.ts"), "export function ActivateModules() {}\n", "utf-8");
  writeFileSync(join(TEST_ROOT, "content/panorama/src/hud/script.tsx"), "export function Root() { return <Panel />; }\n", "utf-8");
  writeFileSync(join(TEST_ROOT, "content/panorama/src/hud/styles.less"), ".rune-weaver-root { width: 100%; height: 100%; }\n", "utf-8");
}

async function runTests(): Promise<void> {
  console.log("Runtime Doctor Check Tests");
  console.log("=".repeat(50));

  resetRoot();
  writeBaseHost();

  const workspaceCheck = checkWorkspace(TEST_ROOT);
  assert.strictEqual(workspaceCheck.status, "fail");
  assert(workspaceCheck.suggestion?.includes("workspace.generatedFiles"), "Workspace check should include a fix hint");

  const bridgeCheck = checkRuntimeBridgeWiring(TEST_ROOT);
  assert.strictEqual(bridgeCheck.status, "fail");
  assert(bridgeCheck.suggestion?.includes("Refresh bridge wiring"), "Bridge wiring check should include a fix hint");

  console.log("  PASS");

  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

runTests().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});

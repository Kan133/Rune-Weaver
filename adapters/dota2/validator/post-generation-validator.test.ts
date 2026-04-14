/**
 * Post-Generation Validator Tests
 *
 * Uses a temporary mock host only. Never points at a real addon directory.
 */

import assert from "assert";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { printPostGenerationReport, validatePostGeneration } from "./post-generation-validator.js";

function createMockHost(root: string): void {
  if (existsSync(root)) {
    rmSync(root, { recursive: true, force: true });
  }

  const dirs = [
    "game/scripts/npc",
    "game/scripts/vscripts/rune_weaver/abilities",
    "game/scripts/src/rune_weaver/generated/server",
    "game/scripts/src/rune_weaver/generated/shared",
    "content/panorama/src/rune_weaver/generated/ui",
    "content/panorama/src/hud",
  ];

  for (const dir of dirs) {
    mkdirSync(join(root, dir), { recursive: true });
  }

  const generatedFiles = [
    "game/scripts/src/rune_weaver/generated/server/test_feature_1.ts",
    "content/panorama/src/rune_weaver/generated/ui/test_feature_1.tsx",
    "content/panorama/src/rune_weaver/generated/ui/test_feature_1.less",
  ];

  const workspace = {
    version: "0.1",
    hostType: "dota2-x-template",
    hostRoot: root,
    addonName: "test_addon",
    initializedAt: new Date().toISOString(),
    features: [
      {
        featureId: "test_feature_1",
        intentKind: "ability",
        status: "active",
        revision: 1,
        blueprintId: "test-blueprint",
        selectedPatterns: ["ability.basic"],
        generatedFiles,
        entryBindings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  writeFileSync(
    join(root, "game/scripts/src/rune_weaver/rune-weaver.workspace.json"),
    JSON.stringify(workspace, null, 2),
    "utf-8"
  );

  writeFileSync(
    join(root, "game/scripts/src/rune_weaver/generated/server/test_feature_1.ts"),
    "export const test = 1;\n",
    "utf-8"
  );

  writeFileSync(
    join(root, "game/scripts/src/rune_weaver/generated/server/index.ts"),
    `const modulePath = "rune_weaver.generated.server.test_feature_1";\nrequire(modulePath);\n`,
    "utf-8"
  );

  writeFileSync(
    join(root, "content/panorama/src/rune_weaver/generated/ui/index.tsx"),
    `import { TestFeature1 } from "./test_feature_1";\nexport function RuneWeaverGeneratedUIRoot() { return <TestFeature1 />; }\n`,
    "utf-8"
  );

  writeFileSync(
    join(root, "content/panorama/src/rune_weaver/generated/ui/test_feature_1.tsx"),
    "export function TestFeature1() { return <Panel />; }\n",
    "utf-8"
  );

  writeFileSync(
    join(root, "content/panorama/src/rune_weaver/generated/ui/test_feature_1.less"),
    ".test_feature_1 { width: 100%; }\n",
    "utf-8"
  );

  writeFileSync(
    join(root, "content/panorama/src/hud/styles.less"),
    `@import "../rune_weaver/generated/ui/test_feature_1.less";\n.rune-weaver-root {\n  width: 100%;\n  height: 100%;\n}\n`,
    "utf-8"
  );
}

function createValidAbilitiesFile(root: string): void {
  const content = `"DOTAAbilities"
{
  "ability_test_1"
  {
    "ScriptFile" "rune_weaver/abilities/ability_test_1"
    "AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_NO_TARGET"
  }

  "ability_test_2"
  {
    "ScriptFile" "rune_weaver/abilities/ability_test_2"
    "AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET"
  }
}
`;

  writeFileSync(join(root, "game/scripts/npc/npc_abilities_custom.txt"), content, "utf-8");
  writeFileSync(join(root, "game/scripts/vscripts/rune_weaver/abilities/ability_test_1.lua"), "-- Ability 1\n", "utf-8");
  writeFileSync(join(root, "game/scripts/vscripts/rune_weaver/abilities/ability_test_2.lua"), "-- Ability 2\n", "utf-8");
}

function cleanupMockHost(root: string): void {
  if (existsSync(root)) {
    rmSync(root, { recursive: true, force: true });
  }
}

async function runTests(): Promise<void> {
  console.log("Post-Generation Validator Tests");
  console.log("=".repeat(50));

  const testHost = join(process.cwd(), "tmp/test-host-post-gen");
  createMockHost(testHost);

  try {
    console.log("\nTest 1: Basic validation runs...");
    const result1 = validatePostGeneration(testHost);
    assert(result1.checks.some((check) => check.check === "npc_abilities_structure"));
    assert(result1.checks.some((check) => check.check === "lua_scriptfile_paths"));
    console.log("  PASS");

    console.log("\nTest 2: Valid abilities and Lua files pass...");
    createValidAbilitiesFile(testHost);
    const result2 = validatePostGeneration(testHost);
    const abilitiesCheck = result2.checks.find((check) => check.check === "npc_abilities_structure");
    const scriptFileCheck = result2.checks.find((check) => check.check === "lua_scriptfile_paths");
    assert(abilitiesCheck?.passed, abilitiesCheck?.message);
    assert(abilitiesCheck.message.includes("2 abilities"), abilitiesCheck.message);
    assert(scriptFileCheck?.passed, scriptFileCheck?.message);
    console.log("  PASS");

    console.log("\nTest 3: Report generation...");
    const report = printPostGenerationReport(result2);
    assert(report.includes("Post-Generation Validation Report"));
    assert(report.includes("PASS") || report.includes("FAIL"));
    console.log("  PASS");

    console.log("\nTest 4: Missing Lua file is detected...");
    rmSync(join(testHost, "game/scripts/vscripts/rune_weaver/abilities/ability_test_2.lua"));
    const result4 = validatePostGeneration(testHost);
    const scriptCheck4 = result4.checks.find((check) => check.check === "lua_scriptfile_paths");
    assert(scriptCheck4 && !scriptCheck4.passed);
    assert(scriptCheck4?.suggestion, "Missing Lua file check should include a fix hint");
    console.log("  PASS");

    console.log("\nTest 5: Missing workspace generated file is detected...");
    rmSync(join(testHost, "game/scripts/src/rune_weaver/generated/server/test_feature_1.ts"));
    const result5 = validatePostGeneration(testHost);
    const workspaceCheck = result5.checks.find((check) => check.check === "workspace_generated_files_exist");
    assert(workspaceCheck && !workspaceCheck.passed);
    console.log("  PASS");

    console.log("\nTest 6: Missing LESS import is detected...");
    writeFileSync(
      join(testHost, "content/panorama/src/hud/styles.less"),
      `.rune-weaver-root {\n  width: 100%;\n  height: 100%;\n}\n`,
      "utf-8"
    );
    const result6 = validatePostGeneration(testHost);
    const lessCheck = result6.checks.find((check) => check.check === "less_imports");
    assert(lessCheck && !lessCheck.passed);
    assert(lessCheck?.suggestion, "Missing LESS import check should include a fix hint");
    console.log("  PASS");

    console.log("\nTest 7: Result counts are consistent...");
    assert(result6.summary.total === result6.checks.length);
    assert(result6.summary.passed + result6.summary.failed === result6.summary.total);
    assert(result6.summary.failed === result6.checks.filter((check) => !check.passed).length);
    console.log("  PASS");

    console.log("\n" + "=".repeat(50));
    console.log("All tests passed!");
  } finally {
    cleanupMockHost(testHost);
  }
}

runTests().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});

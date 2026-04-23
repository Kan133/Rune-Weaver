/**
 * Post-Generation Validator Tests
 *
 * Uses a temporary mock host only. Never points at a real addon directory.
 */

import assert from "assert";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { printPostGenerationReport, validatePostGeneration } from "./post-generation-validator.js";

function createMockHost(root: string): void {
  if (existsSync(root)) {
    rmSync(root, { recursive: true, force: true });
  }

  const dirs = [
    "game/scripts/npc",
    "game/scripts/vscripts/rune_weaver/abilities",
    "game/scripts/src/rune_weaver/features",
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

function writeProviderExportArtifact(root: string, featureId: string, abilityName: string): void {
  const providerDir = join(root, "game/scripts/src/rune_weaver/features", featureId);
  mkdirSync(providerDir, { recursive: true });
  writeFileSync(
    join(providerDir, "dota2-provider-ability-export.json"),
    JSON.stringify(
      {
        adapter: "dota2_provider_ability_export",
        version: 1,
        featureId,
        surfaces: [
          {
            surfaceId: "grantable_primary_hero_ability",
            abilityName,
            attachmentMode: "grant_only",
          },
        ],
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function writeProviderAbilityArtifacts(
  root: string,
  options?: {
    abilityName?: string;
    luaSymbol?: string;
    scriptFileName?: string;
    includeLuaFile?: boolean;
  },
): void {
  const abilityName = options?.abilityName || "rw_provider_test";
  const luaSymbol = options?.luaSymbol || abilityName;
  const scriptFileName = options?.scriptFileName || abilityName;
  const kvContent = `"DOTAAbilities"
{
  "${abilityName}"
  {
    "BaseClass" "ability_lua"
    "ScriptFile" "rune_weaver/abilities/${scriptFileName}"
    "AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_NO_TARGET"
  }
}
`;

  writeFileSync(join(root, "game/scripts/npc/npc_abilities_custom.txt"), kvContent, "utf-8");
  if (options?.includeLuaFile !== false) {
    writeFileSync(
      join(root, "game/scripts/vscripts/rune_weaver/abilities", `${scriptFileName}.lua`),
      `if ${luaSymbol} == nil then\n  ${luaSymbol} = class({})\nend\n`,
      "utf-8",
    );
  }
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

    console.log("\nTest 8: Missing key binding source is reported without throwing...");
    const workspacePath = join(testHost, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
    const workspace = JSON.parse(readFileSync(workspacePath, "utf-8"));
    workspace.features[0].selectedPatterns = ["input.key_binding"];
    workspace.features[0].generatedFiles = [
      "game/scripts/src/rune_weaver/generated/server/test_feature_1_input_input_key_binding.ts",
    ];
    writeFileSync(workspacePath, JSON.stringify(workspace, null, 2), "utf-8");
    const result8 = validatePostGeneration(testHost);
    const keyBindingCheck = result8.checks.find((check) => check.check === "active_key_binding_conflicts");
    assert(keyBindingCheck && !keyBindingCheck.passed);
    assert(keyBindingCheck.message.includes("missing their key binding sources"));
    console.log("  PASS");

    console.log("\nTest 9: Missing weighted pool source is reported without throwing...");
    workspace.features[0].selectedPatterns = ["rule.selection_flow", "data.weighted_pool"];
    workspace.features[0].generatedFiles = [
      "game/scripts/src/rune_weaver/generated/shared/test_feature_1_data_weighted_pool.ts",
    ];
    writeFileSync(workspacePath, JSON.stringify(workspace, null, 2), "utf-8");
    const result9 = validatePostGeneration(testHost);
    const seedCheck = result9.checks.find((check) => check.check === "selection_pool_seed_data");
    assert(seedCheck && !seedCheck.passed);
    assert(seedCheck.message.includes("missing weighted pool sources"));
    console.log("  PASS");

    const groundingHost = join(process.cwd(), "tmp/test-host-post-gen-grounding");
    createMockHost(groundingHost);
    try {
      console.log("\nTest 10: Partial synthesized grounding stays warning-only when canonical assessment is consistent...");
      const groundingWorkspacePath = join(groundingHost, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
      const groundingWorkspace = JSON.parse(readFileSync(groundingWorkspacePath, "utf-8"));
      groundingWorkspace.features[0].modules = [
        {
          moduleId: "reveal_runtime",
          role: "reveal_runtime",
          sourceKind: "synthesized",
          selectedPatternIds: [],
          implementationStrategy: "exploratory",
          maturity: "exploratory",
          requiresReview: true,
          reviewReasons: [],
          groundingAssessment: {
            status: "partial",
            reviewRequired: true,
            verifiedSymbolCount: 1,
            allowlistedSymbolCount: 0,
            weakSymbolCount: 1,
            unknownSymbolCount: 0,
            warnings: ["weak grounding"],
            reasonCodes: ["verified_symbols_present", "weak_symbols_present"],
            evidenceRefs: [],
          },
          metadata: {
            grounding: [
              {
                artifactId: "reveal_runtime_lua",
                verifiedSymbols: ["ApplyDamage"],
                allowlistedSymbols: [],
                weakSymbols: ["DealSplash"],
                unknownSymbols: [],
                warnings: ["weak grounding"],
              },
            ],
          },
        },
      ];
      groundingWorkspace.features[0].groundingSummary = {
        status: "partial",
        reviewRequired: true,
        verifiedSymbolCount: 1,
        allowlistedSymbolCount: 0,
        weakSymbolCount: 1,
        unknownSymbolCount: 0,
        warnings: ["weak grounding"],
        reasonCodes: ["verified_symbols_present", "weak_symbols_present"],
        evidenceRefs: [],
      };
      writeFileSync(groundingWorkspacePath, JSON.stringify(groundingWorkspace, null, 2), "utf-8");

      const groundingWarningResult = validatePostGeneration(groundingHost);
      const groundingWarningCheck = groundingWarningResult.checks.find((check) => check.check === "synthesized_grounding_governance");
      assert(groundingWarningCheck?.passed, groundingWarningCheck?.message);
      assert(groundingWarningCheck?.details?.some((detail) => detail.includes("remained partial")));
      console.log("  PASS");

      console.log("\nTest 11: Synthesized grounding fails when canonical assessment drifts from raw checks...");
      groundingWorkspace.features[0].groundingSummary.weakSymbolCount = 0;
      writeFileSync(groundingWorkspacePath, JSON.stringify(groundingWorkspace, null, 2), "utf-8");
      const groundingFailResult = validatePostGeneration(groundingHost);
      const groundingFailCheck = groundingFailResult.checks.find((check) => check.check === "synthesized_grounding_governance");
      assert(groundingFailCheck && !groundingFailCheck.passed);
      assert(groundingFailCheck.details?.some((detail) => detail.includes("does not match raw checks")));
      console.log("  PASS");
    } finally {
      cleanupMockHost(groundingHost);
    }

    const providerHost = join(process.cwd(), "tmp/test-host-post-gen-provider");
    createMockHost(providerHost);
    try {
      console.log("\nTest 12: Provider export identity passes when export, KV, and Lua agree...");
      writeProviderExportArtifact(providerHost, "provider_feature", "rw_provider_test");
      writeProviderAbilityArtifacts(providerHost);
      const providerPassResult = validatePostGeneration(providerHost);
      const providerPassCheck = providerPassResult.checks.find((check) => check.check === "provider_ability_exports");
      assert(providerPassCheck?.passed, providerPassCheck?.message);
      console.log("  PASS");

      console.log("\nTest 13: Provider export fails when exported ability is missing from KV...");
      writeProviderExportArtifact(providerHost, "provider_feature", "rw_missing_provider");
      writeProviderAbilityArtifacts(providerHost, { abilityName: "rw_provider_test" });
      const missingKvResult = validatePostGeneration(providerHost);
      const missingKvCheck = missingKvResult.checks.find((check) => check.check === "provider_ability_exports");
      assert(missingKvCheck && !missingKvCheck.passed);
      assert(missingKvCheck.details?.some((detail) => detail.includes("not found in npc_abilities_custom.txt")));
      console.log("  PASS");

      console.log("\nTest 14: Provider export fails when Lua runtime symbol drifts...");
      writeProviderExportArtifact(providerHost, "provider_feature", "rw_provider_test");
      writeProviderAbilityArtifacts(providerHost, {
        abilityName: "rw_provider_test",
        luaSymbol: "placeholder_fire_ability",
      });
      const driftResult = validatePostGeneration(providerHost);
      const driftCheck = driftResult.checks.find((check) => check.check === "provider_ability_exports");
      assert(driftCheck && !driftCheck.passed);
      assert(driftCheck.details?.some((detail) => detail.includes("does not match exported ability")));
      console.log("  PASS");

      console.log("\nTest 15: Provider export fails when ScriptFile target is missing...");
      writeProviderExportArtifact(providerHost, "provider_feature", "rw_provider_test");
      writeProviderAbilityArtifacts(providerHost, {
        abilityName: "rw_provider_test",
        scriptFileName: "rw_provider_missing",
        includeLuaFile: false,
      });
      const missingScriptResult = validatePostGeneration(providerHost);
      const missingScriptCheck = missingScriptResult.checks.find((check) => check.check === "provider_ability_exports");
      assert(missingScriptCheck && !missingScriptCheck.passed);
      assert(missingScriptCheck.details?.some((detail) => detail.includes("does not exist")));
      console.log("  PASS");
    } finally {
      cleanupMockHost(providerHost);
    }

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

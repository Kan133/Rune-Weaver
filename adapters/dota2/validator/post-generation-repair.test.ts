/**
 * Post-Generation Repair Tests
 *
 * Uses a temporary mock host only. Never points at a real addon directory.
 */

import assert from "assert";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import {
  planPostGenerationRepairs,
  executeSafePostGenerationRepairs,
  createRepairAction,
  PostGenerationRepairPlan,
  PostGenerationRepairAction,
} from "./post-generation-repair.js";
import { validatePostGeneration, PostGenerationCheck } from "./post-generation-validator.js";

const TEST_HOST = join(process.cwd(), "tmp/test-host-repair");

function createMockHost(): void {
  if (existsSync(TEST_HOST)) {
    rmSync(TEST_HOST, { recursive: true, force: true });
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
    mkdirSync(join(TEST_HOST, dir), { recursive: true });
  }

  const generatedFiles = [
    "game/scripts/src/rune_weaver/generated/server/test_feature_1.ts",
    "content/panorama/src/rune_weaver/generated/ui/test_feature_1.tsx",
    "content/panorama/src/rune_weaver/generated/ui/test_feature_1.less",
  ];

  const workspace = {
    version: "0.1",
    hostType: "dota2-x-template" as const,
    hostRoot: TEST_HOST,
    addonName: "test_addon",
    initializedAt: new Date().toISOString(),
    features: [
      {
        featureId: "test_feature_1",
        intentKind: "ability",
        status: "active" as const,
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
    join(TEST_HOST, "game/scripts/src/rune_weaver/rune-weaver.workspace.json"),
    JSON.stringify(workspace, null, 2),
    "utf-8"
  );

  writeFileSync(
    join(TEST_HOST, "game/scripts/src/rune_weaver/generated/server/test_feature_1.ts"),
    "export const test = 1;\n",
    "utf-8"
  );

  writeFileSync(
    join(TEST_HOST, "game/scripts/src/rune_weaver/generated/server/index.ts"),
    `const modulePath = "rune_weaver.generated.server.test_feature_1";\nrequire(modulePath);\n`,
    "utf-8"
  );

  writeFileSync(
    join(TEST_HOST, "content/panorama/src/rune_weaver/generated/ui/index.tsx"),
    `import { TestFeature1 } from "./test_feature_1";\nexport function RuneWeaverGeneratedUIRoot() { return <TestFeature1 />; }\n`,
    "utf-8"
  );

  writeFileSync(
    join(TEST_HOST, "content/panorama/src/rune_weaver/generated/ui/test_feature_1.tsx"),
    "export function TestFeature1() { return <Panel />; }\n",
    "utf-8"
  );

  writeFileSync(
    join(TEST_HOST, "content/panorama/src/rune_weaver/generated/ui/test_feature_1.less"),
    ".test_feature_1 { width: 100%; }\n",
    "utf-8"
  );

  writeFileSync(
    join(TEST_HOST, "content/panorama/src/hud/styles.less"),
    `@import "../rune_weaver/generated/ui/test_feature_1.less";\n.rune-weaver-root {\n  width: 100%;\n  height: 100%;\n}\n`,
    "utf-8"
  );
}

function createValidAbilitiesFile(): void {
  const content = `"DOTAAbilities"
{
  "ability_test_1"
  {
    "ScriptFile" "rune_weaver/abilities/ability_test_1"
    "AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_NO_TARGET"
  }
}
`;

  writeFileSync(join(TEST_HOST, "game/scripts/npc/npc_abilities_custom.txt"), content, "utf-8");
  writeFileSync(join(TEST_HOST, "game/scripts/vscripts/rune_weaver/abilities/ability_test_1.lua"), "-- Ability 1\n", "utf-8");
}

function writeSynthesizedGroundingWorkspace(options?: {
  includeRawGrounding?: boolean;
  includeModuleAssessment?: boolean;
  includeFeatureSummary?: boolean;
}): void {
  const workspacePath = join(TEST_HOST, "game/scripts/src/rune_weaver/rune-weaver.workspace.json");
  const workspace = JSON.parse(readFileSync(workspacePath, "utf-8"));
  const includeRawGrounding = options?.includeRawGrounding ?? true;
  const includeModuleAssessment = options?.includeModuleAssessment ?? false;
  const includeFeatureSummary = options?.includeFeatureSummary ?? false;

  const rawGrounding = includeRawGrounding
    ? [
        {
          artifactId: "reveal_runtime_lua",
          verifiedSymbols: ["ApplyDamage"],
          allowlistedSymbols: [],
          weakSymbols: ["DealSplash"],
          unknownSymbols: [],
          warnings: ["weak grounding"],
        },
      ]
    : undefined;

  workspace.features[0].modules = [
    {
      moduleId: "reveal_runtime",
      role: "reveal_runtime",
      sourceKind: "synthesized",
      selectedPatternIds: [],
      implementationStrategy: "exploratory",
      maturity: "exploratory",
      requiresReview: true,
      reviewReasons: [],
      ...(includeModuleAssessment
        ? {
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
          }
        : {}),
      metadata: includeRawGrounding ? { grounding: rawGrounding } : {},
    },
  ];

  if (includeFeatureSummary) {
    workspace.features[0].groundingSummary = {
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
  } else {
    delete workspace.features[0].groundingSummary;
  }

  writeFileSync(workspacePath, JSON.stringify(workspace, null, 2), "utf-8");
}

function cleanupMockHost(): void {
  if (existsSync(TEST_HOST)) {
    rmSync(TEST_HOST, { recursive: true, force: true });
  }
}

async function runTests(): Promise<void> {
  console.log("Post-Generation Repair Tests");
  console.log("=".repeat(50));

  // Test 1: No repairs when all checks pass
  console.log("\nTest 1: No repairs needed when validation passes...");
  createMockHost();
  createValidAbilitiesFile();
  const validResult = validatePostGeneration(TEST_HOST);
  const plan1 = planPostGenerationRepairs(validResult, TEST_HOST);
  assert(!plan1.needsRepair, "Should not need repair when validation passes");
  assert(plan1.actions.length === 0, "Should have no actions");
  assert(plan1.summary.total === 0, "Summary total should be 0");
  console.log("  PASS");
  cleanupMockHost();

  // Test 2: LESS imports repair action created
  console.log("\nTest 2: LESS imports repair action created...");
  createMockHost();
  createValidAbilitiesFile();
  // Remove the import from styles.less but keep the .less file
  writeFileSync(
    join(TEST_HOST, "content/panorama/src/hud/styles.less"),
    ".rune-weaver-root {\n  width: 100%;\n  height: 100%;\n}\n",
    "utf-8"
  );
  const result2 = validatePostGeneration(TEST_HOST);
  const lessCheck = result2.checks.find((c) => c.check === "less_imports");
  assert(lessCheck && !lessCheck.passed, "less_imports should fail");
  const plan2 = planPostGenerationRepairs(result2, TEST_HOST);
  assert(plan2.needsRepair, "Should need repair");
  assert(plan2.actions.length > 0, "Should have actions");
  const lessAction = plan2.actions.find((a) => a.sourceCheck === "less_imports");
  assert(lessAction, "Should have less_imports action");
  assert(lessAction?.kind === "safe_fix", "less_imports should be safe_fix");
  assert(lessAction?.executable === true, "less_imports should be executable");
  assert(lessAction?.data?.missingImports && lessAction.data.missingImports.length > 0, "Should have missing imports");
  console.log("  PASS");
  cleanupMockHost();

  // Test 3: LESS imports repair execution
  console.log("\nTest 3: LESS imports repair execution...");
  createMockHost();
  createValidAbilitiesFile();
  writeFileSync(
    join(TEST_HOST, "content/panorama/src/hud/styles.less"),
    ".rune-weaver-root {\n  width: 100%;\n  height: 100%;\n}\n",
    "utf-8"
  );
  const result3 = validatePostGeneration(TEST_HOST);
  const plan3 = planPostGenerationRepairs(result3, TEST_HOST);
  const execResult3 = await executeSafePostGenerationRepairs(plan3, TEST_HOST);
  assert(execResult3.summary.succeeded > 0, "Should have succeeded repairs");
  // Verify the file was updated
  const stylesContent = readFileSync(join(TEST_HOST, "content/panorama/src/hud/styles.less"), "utf-8");
  assert(stylesContent.includes('@import "../rune_weaver/generated/ui/test_feature_1.less"'), "Should have added import");
  console.log("  PASS");
  cleanupMockHost();

  // Test 4: CSS root repair action created
  console.log("\nTest 4: CSS root repair action created...");
  createMockHost();
  createValidAbilitiesFile();
  // Remove .rune-weaver-root from styles.less
  writeFileSync(
    join(TEST_HOST, "content/panorama/src/hud/styles.less"),
    `@import "../rune_weaver/generated/ui/test_feature_1.less";\n`,
    "utf-8"
  );
  const result4 = validatePostGeneration(TEST_HOST);
  const cssCheck = result4.checks.find((c) => c.check === "rune_weaver_root_css");
  assert(cssCheck && !cssCheck.passed, "rune_weaver_root_css should fail");
  const plan4 = planPostGenerationRepairs(result4, TEST_HOST);
  const cssAction = plan4.actions.find((a) => a.sourceCheck === "rune_weaver_root_css");
  assert(cssAction, "Should have rune_weaver_root_css action");
  assert(cssAction?.kind === "safe_fix", "Should be safe_fix");
  assert(cssAction?.executable === true, "Should be executable");
  console.log("  PASS");
  cleanupMockHost();

  // Test 5: CSS root repair execution - create new
  console.log("\nTest 5: CSS root repair execution - create new...");
  createMockHost();
  createValidAbilitiesFile();
  writeFileSync(
    join(TEST_HOST, "content/panorama/src/hud/styles.less"),
    `@import "../rune_weaver/generated/ui/test_feature_1.less";\n`,
    "utf-8"
  );
  const result5 = validatePostGeneration(TEST_HOST);
  const plan5 = planPostGenerationRepairs(result5, TEST_HOST);
  const execResult5 = await executeSafePostGenerationRepairs(plan5, TEST_HOST);
  assert(execResult5.summary.succeeded > 0, "Should have succeeded repairs");
  const stylesContent5 = readFileSync(join(TEST_HOST, "content/panorama/src/hud/styles.less"), "utf-8");
  assert(stylesContent5.includes(".rune-weaver-root"), "Should have added .rune-weaver-root");
  assert(stylesContent5.includes("width: 100%"), "Should have width: 100%");
  assert(stylesContent5.includes("height: 100%"), "Should have height: 100%");
  console.log("  PASS");
  cleanupMockHost();

  // Test 6: CSS root repair execution - patch incomplete
  console.log("\nTest 6: CSS root repair execution - patch incomplete...");
  createMockHost();
  createValidAbilitiesFile();
  writeFileSync(
    join(TEST_HOST, "content/panorama/src/hud/styles.less"),
    `@import "../rune_weaver/generated/ui/test_feature_1.less";\n.rune-weaver-root {\n  width: 100%;\n}\n`,
    "utf-8"
  );
  const result6 = validatePostGeneration(TEST_HOST);
  const plan6 = planPostGenerationRepairs(result6, TEST_HOST);
  const execResult6 = await executeSafePostGenerationRepairs(plan6, TEST_HOST);
  assert(execResult6.summary.succeeded > 0, "Should have succeeded repairs");
  const stylesContent6 = readFileSync(join(TEST_HOST, "content/panorama/src/hud/styles.less"), "utf-8");
  assert(stylesContent6.includes("height: 100%"), "Should have added height: 100%");
  console.log("  PASS");
  cleanupMockHost();

  // Test 7: Lua scriptfile paths marked as requires_regenerate
  console.log("\nTest 7: Lua scriptfile paths marked as requires_regenerate...");
  createMockHost();
  // Create abilities file with ScriptFile pointing to non-existent Lua
  const kvContent = `"DOTAAbilities"
{
  "ability_test_1"
  {
    "ScriptFile" "rune_weaver/abilities/missing_ability"
    "AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_NO_TARGET"
  }
}
`;
  writeFileSync(join(TEST_HOST, "game/scripts/npc/npc_abilities_custom.txt"), kvContent, "utf-8");
  const result7 = validatePostGeneration(TEST_HOST);
  const luaCheck = result7.checks.find((c) => c.check === "lua_scriptfile_paths");
  assert(luaCheck && !luaCheck.passed, "lua_scriptfile_paths should fail");
  const plan7 = planPostGenerationRepairs(result7, TEST_HOST);
  const luaAction = plan7.actions.find((a) => a.sourceCheck === "lua_scriptfile_paths");
  assert(luaAction, "Should have lua_scriptfile_paths action");
  assert(luaAction?.kind === "requires_regenerate", "Should be requires_regenerate");
  assert(luaAction?.executable === false, "Should NOT be executable");
  console.log("  PASS");
  cleanupMockHost();

  // Test 8: Workspace generated files missing marked as requires_regenerate
  console.log("\nTest 8: Workspace generated files missing marked as requires_regenerate...");
  createMockHost();
  createValidAbilitiesFile();
  // Delete a generated file that workspace expects
  const genFile = join(TEST_HOST, "game/scripts/src/rune_weaver/generated/server/test_feature_1.ts");
  if (existsSync(genFile)) {
    rmSync(genFile);
  }
  const result8 = validatePostGeneration(TEST_HOST);
  const workspaceCheck = result8.checks.find((c) => c.check === "workspace_generated_files_exist");
  assert(workspaceCheck && !workspaceCheck.passed, "workspace_generated_files_exist should fail");
  const plan8 = planPostGenerationRepairs(result8, TEST_HOST);
  const workspaceAction = plan8.actions.find((a) => a.sourceCheck === "workspace_generated_files_exist");
  assert(workspaceAction, "Should have workspace_generated_files_exist action");
  assert(workspaceAction?.kind === "requires_regenerate", "Should be requires_regenerate");
  assert(workspaceAction?.executable === false, "Should NOT be executable");
  console.log("  PASS");
  cleanupMockHost();

  // Test 9: npc_abilities_structure marked as manual
  console.log("\nTest 9: npc_abilities_structure marked as manual...");
  createMockHost();
  // Create malformed abilities file
  writeFileSync(
    join(TEST_HOST, "game/scripts/npc/npc_abilities_custom.txt"),
    `"NotDOTAAbilities" { }\n`,
    "utf-8"
  );
  const result9 = validatePostGeneration(TEST_HOST);
  const structureCheck = result9.checks.find((c) => c.check === "npc_abilities_structure");
  assert(structureCheck && !structureCheck.passed, "npc_abilities_structure should fail");
  const plan9 = planPostGenerationRepairs(result9, TEST_HOST);
  const structureAction = plan9.actions.find((a) => a.sourceCheck === "npc_abilities_structure");
  assert(structureAction, "Should have npc_abilities_structure action");
  assert(structureAction?.kind === "manual", "Should be manual");
  assert(structureAction?.executable === false, "Should NOT be executable");
  console.log("  PASS");
  cleanupMockHost();

  // Test 10: Synthesized grounding missing canonical truth becomes upgrade_workspace_grounding
  console.log("\nTest 10: Synthesized grounding missing canonical truth becomes upgrade_workspace_grounding...");
  createMockHost();
  createValidAbilitiesFile();
  writeSynthesizedGroundingWorkspace({
    includeRawGrounding: true,
    includeModuleAssessment: false,
    includeFeatureSummary: false,
  });
  const result10 = validatePostGeneration(TEST_HOST);
  const groundingCheck10 = result10.checks.find((c) => c.check === "synthesized_grounding_governance");
  assert(groundingCheck10 && !groundingCheck10.passed, "synthesized_grounding_governance should fail");
  const plan10 = planPostGenerationRepairs(result10, TEST_HOST);
  const groundingUpgradeAction = plan10.actions.find((a) => a.kind === "upgrade_workspace_grounding");
  assert(groundingUpgradeAction, "Should create upgrade_workspace_grounding action");
  assert(groundingUpgradeAction?.executable === true, "upgrade_workspace_grounding should be executable");
  assert(plan10.summary.upgradeWorkspaceGrounding === 1, "Should count one workspace grounding upgrade");
  console.log("  PASS");
  cleanupMockHost();

  // Test 11: Synthesized grounding upgrade execution writes canonical module and feature truth
  console.log("\nTest 11: Synthesized grounding upgrade execution writes canonical module and feature truth...");
  createMockHost();
  createValidAbilitiesFile();
  writeSynthesizedGroundingWorkspace({
    includeRawGrounding: true,
    includeModuleAssessment: false,
    includeFeatureSummary: false,
  });
  const result11 = validatePostGeneration(TEST_HOST);
  const plan11 = planPostGenerationRepairs(result11, TEST_HOST);
  const execResult11 = await executeSafePostGenerationRepairs(plan11, TEST_HOST);
  assert(execResult11.summary.succeeded > 0, "Should execute workspace grounding upgrade");
  const upgradedWorkspace = JSON.parse(
    readFileSync(join(TEST_HOST, "game/scripts/src/rune_weaver/rune-weaver.workspace.json"), "utf-8"),
  );
  assert(upgradedWorkspace.features[0].modules[0].groundingAssessment, "Module groundingAssessment should be written");
  assert(upgradedWorkspace.features[0].groundingSummary, "Feature groundingSummary should be written");
  const postRepairValidation = validatePostGeneration(TEST_HOST);
  const postRepairGroundingCheck = postRepairValidation.checks.find((c) => c.check === "synthesized_grounding_governance");
  assert(postRepairGroundingCheck?.passed, postRepairGroundingCheck?.message);
  console.log("  PASS");
  cleanupMockHost();

  // Test 12: Synthesized grounding without raw metadata stays requires_regenerate
  console.log("\nTest 12: Synthesized grounding without raw metadata stays requires_regenerate...");
  createMockHost();
  createValidAbilitiesFile();
  writeSynthesizedGroundingWorkspace({
    includeRawGrounding: false,
    includeModuleAssessment: false,
    includeFeatureSummary: false,
  });
  const result12 = validatePostGeneration(TEST_HOST);
  const plan12 = planPostGenerationRepairs(result12, TEST_HOST);
  const groundingRegenerateAction = plan12.actions.find(
    (a) => a.sourceCheck === "synthesized_grounding_governance",
  );
  assert(groundingRegenerateAction, "Should have synthesized grounding action");
  assert(groundingRegenerateAction?.kind === "requires_regenerate", "Should remain requires_regenerate");
  assert(
    groundingRegenerateAction?.description.includes("cannot be reconstructed honestly"),
    "Regenerate description should be honest about missing raw grounding",
  );
  console.log("  PASS");
  cleanupMockHost();

  // Test 13: createRepairAction helper function
  console.log("\nTest 13: createRepairAction helper function...");
  const mockCheck: PostGenerationCheck = {
    check: "less_imports",
    passed: false,
    message: "Test message",
    details: ["detail1", "detail2"],
  };
  const action = createRepairAction(mockCheck, TEST_HOST, 0);
  assert(action.id.startsWith("repair_less_imports_"), "ID should start with check name");
  assert(action.sourceCheck === "less_imports", "sourceCheck should match");
  assert(action.kind === "safe_fix", "Should be safe_fix");
  assert(action.executable === true, "Should be executable");
  console.log("  PASS");

  // Test 14: Non-executable actions are skipped during execution
  console.log("\nTest 14: Non-executable actions are skipped during execution...");
  createMockHost();
  // Create a plan with a non-executable action
  const manualAction: PostGenerationRepairAction = {
    id: "test_manual_1",
    sourceCheck: "npc_abilities_structure",
    title: "Test Manual Action",
    description: "Test description",
    risk: "high",
    executable: false,
    kind: "manual",
  };
  const testPlan: PostGenerationRepairPlan = {
    needsRepair: true,
    sourceValidation: {
      valid: false,
      hostRoot: TEST_HOST,
      checks: [],
      issues: [],
      summary: { passed: 0, failed: 1, total: 1 },
    },
    actions: [manualAction],
    executableActions: [],
    nonExecutableActions: [manualAction],
    manualActions: [manualAction],
    summary: { total: 1, executable: 0, upgradeWorkspaceGrounding: 0, requiresRegenerate: 0, manual: 1 },
  };
  const execResult14 = await executeSafePostGenerationRepairs(testPlan, TEST_HOST);
  assert(execResult14.summary.skipped === 1, "Should have skipped 1 action");
  assert(execResult14.summary.attempted === 0, "Should have attempted 0 actions");
  console.log("  PASS");
  cleanupMockHost();

  // Test 15: Plan summary counts are correct
  console.log("\nTest 15: Plan summary counts are correct...");
  createMockHost();
  createValidAbilitiesFile();
  writeFileSync(
    join(TEST_HOST, "content/panorama/src/hud/styles.less"),
    ".other { }\n",
    "utf-8"
  );
  // Add a malformed abilities file too
  writeFileSync(
    join(TEST_HOST, "game/scripts/npc/npc_abilities_custom.txt"),
    `"DOTAAbilities" { "ability" { "ScriptFile" "rune_weaver/abilities/missing" } }\n`,
    "utf-8"
  );
  const result15 = validatePostGeneration(TEST_HOST);
  const plan15 = planPostGenerationRepairs(result15, TEST_HOST);
  assert(plan15.summary.total === plan15.actions.length, "Total should match actions count");
  assert(plan15.summary.executable === plan15.executableActions.length, "Executable should match");
  assert(plan15.summary.manual === plan15.manualActions.length, "Manual should match");
  assert(
    plan15.nonExecutableActions.length === plan15.actions.filter((action) => !action.executable).length,
    "Non-executable should match actions that cannot be auto-run",
  );
  assert(plan15.executableActions.every((a) => a.executable), "All executableActions should be executable");
  assert(plan15.manualActions.every((a) => a.kind === "manual"), "All manualActions should be manual-only");
  console.log("  PASS");
  cleanupMockHost();

  console.log("\n" + "=".repeat(50));
  console.log("All tests passed!");
}

runTests().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});

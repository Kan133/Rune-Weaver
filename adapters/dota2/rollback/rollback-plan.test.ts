import assert from "node:assert/strict";

import { generateRollbackPlan } from "./rollback-plan.js";
import type { RuneWeaverFeatureRecord, RuneWeaverWorkspace } from "../../../core/workspace/types.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  buildAbilityKvFragmentPath,
  resolveAbilityKvScriptFile,
} from "../kv/contract.js";

function createFeatureRecord(): RuneWeaverFeatureRecord {
  return {
    featureId: "talent_draw_demo",
    intentKind: "standalone-system",
    status: "active",
    revision: 2,
    blueprintId: "talent_draw_demo",
    selectedPatterns: [
      "input.key_binding",
      "data.weighted_pool",
      "rule.selection_flow",
      "ui.selection_modal",
      "effect.modifier_applier",
    ],
    generatedFiles: [
      "game/scripts/src/rune_weaver/generated/server/talent_draw_demo_input_trigger_input_key_binding.ts",
      "game/scripts/src/rune_weaver/generated/shared/talent_draw_demo_weighted_pool_data_weighted_pool.ts",
      "content/panorama/src/rune_weaver/generated/ui/talent_draw_demo_selection_modal_ui_selection_modal.tsx",
      "content/panorama/src/rune_weaver/generated/ui/talent_draw_demo_selection_modal_ui_selection_modal.less",
      "game/scripts/vscripts/rune_weaver/abilities/talent_draw_demo_effect_application_effect_modifier_applier.lua",
      ABILITY_KV_AGGREGATE_TARGET_PATH,
    ],
    ownedArtifacts: [
      {
        kind: "generated_file",
        path: "game/scripts/src/rune_weaver/generated/server/talent_draw_demo_input_trigger_input_key_binding.ts",
      },
      {
        kind: "generated_file",
        path: "game/scripts/src/rune_weaver/generated/shared/talent_draw_demo_weighted_pool_data_weighted_pool.ts",
      },
      {
        kind: "generated_file",
        path: "content/panorama/src/rune_weaver/generated/ui/talent_draw_demo_selection_modal_ui_selection_modal.tsx",
      },
      {
        kind: "generated_file",
        path: "content/panorama/src/rune_weaver/generated/ui/talent_draw_demo_selection_modal_ui_selection_modal.less",
      },
      {
        kind: "generated_file",
        path: "game/scripts/vscripts/rune_weaver/abilities/talent_draw_demo_effect_application_effect_modifier_applier.lua",
      },
      {
        kind: "ability_kv_fragment",
        path: buildAbilityKvFragmentPath(
          "talent_draw_demo",
          "talent_draw_demo_effect_application_effect_modifier_applier",
        ),
        aggregateTargetPath: ABILITY_KV_AGGREGATE_TARGET_PATH,
        abilityName: "talent_draw_demo_effect_application_effect_modifier_applier",
        scriptFile: resolveAbilityKvScriptFile("talent_draw_demo_effect_application_effect_modifier_applier"),
        managedBy: "dota2-ability-kv-aggregate",
      },
      {
        kind: "materialized_aggregate",
        path: ABILITY_KV_AGGREGATE_TARGET_PATH,
        managedBy: "dota2-ability-kv-aggregate",
      },
    ],
    entryBindings: [
      { target: "server", file: "game/scripts/src/modules/index.ts", kind: "import" },
      { target: "ui", file: "content/panorama/src/hud/script.tsx", kind: "mount" },
    ],
    integrationPoints: ["input.key_binding:F4"],
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
  };
}

function createWorkspace(feature: RuneWeaverFeatureRecord): RuneWeaverWorkspace {
  return {
    version: "0.1.0",
    hostType: "dota2-x-template",
    hostRoot: "D:\\test3",
    addonName: "test3",
    initializedAt: "2026-04-16T00:00:00.000Z",
    features: [feature],
  };
}

function testRollbackPlanIncludesGeneratedCompanionArtifacts(): void {
  const feature = createFeatureRecord();
  const workspace = createWorkspace(feature);

  const plan = generateRollbackPlan(feature, workspace, "D:\\test3");

  assert.equal(
    plan.filesToDelete.includes(
      "game/scripts/vscripts/rune_weaver/generated/server/talent_draw_demo_input_trigger_input_key_binding.lua"
    ),
    true,
  );
  assert.equal(
    plan.filesToDelete.includes(
      "game/scripts/vscripts/rune_weaver/generated/shared/talent_draw_demo_weighted_pool_data_weighted_pool.lua"
    ),
    true,
  );
  assert.equal(
    plan.filesToDelete.includes(
      "content/panorama/layout/custom_game/rune_weaver/generated/ui/talent_draw_demo_selection_modal_ui_selection_modal.css"
    ),
    true,
  );
  assert.equal(
    plan.filesToDelete.includes(
      buildAbilityKvFragmentPath(
        "talent_draw_demo",
        "talent_draw_demo_effect_application_effect_modifier_applier",
      ),
    ),
    true,
  );
  assert.equal(plan.filesToDelete.includes(ABILITY_KV_AGGREGATE_TARGET_PATH), false);
}

function runTests(): void {
  testRollbackPlanIncludesGeneratedCompanionArtifacts();
  console.log("adapters/dota2/rollback/rollback-plan.test.ts: PASS");
}

runTests();

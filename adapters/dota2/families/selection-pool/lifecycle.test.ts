import assert from "node:assert/strict";

import type { FeatureAuthoring } from "../../../../core/schema/types.js";
import type { WritePlan } from "../../assembler/index.js";
import { buildSelectionPoolExampleParameters } from "./__fixtures__/examples.js";
import {
  appendSelectionPoolSourceModelEntry,
  resolveSelectionPoolWorkspaceFields,
} from "./index.js";

function createWritePlan(): WritePlan {
  return {
    namespaceRoots: {
      server: "game/scripts/src/rune_weaver/generated/server",
      panorama: "content/panorama/src/rune_weaver/generated/ui",
    },
    entries: [],
    executionOrder: [],
    stats: {
      total: 0,
      create: 0,
      update: 0,
      conflicts: 0,
      deferred: 0,
    },
  } as WritePlan;
}

function createSelectionPoolFeatureAuthoring(): FeatureAuthoring {
  return {
    mode: "source-backed",
    profile: "selection_pool",
    objectKind: "talent",
    parameters: buildSelectionPoolExampleParameters("talent"),
    parameterSurface: {
      triggerKey: { kind: "single_hotkey", allowList: ["F4", "F5"] },
      choiceCount: { minimum: 1, maximum: 5 },
      objectKind: { allowed: ["talent", "equipment", "skill_card_placeholder"] },
      objects: { minItems: 1, seededWhenMissing: true },
      inventory: {
        supported: true,
        capacityRange: { minimum: 1, maximum: 30 },
        fixedPresentation: "persistent_panel",
      },
      invariants: ["single trigger entry only"],
    },
  };
}

function testCreateDerivesLifecycleFieldsFromBlueprintAuthoring(): void {
  const featureAuthoring = createSelectionPoolFeatureAuthoring();
  const resolved = resolveSelectionPoolWorkspaceFields(
    createWritePlan(),
    "talent_draw_demo",
    "create",
    featureAuthoring,
  );

  assert.equal(resolved.sourceModel?.adapter, "selection_pool");
  assert.equal(
    resolved.sourceModel?.path,
    "game/scripts/src/rune_weaver/features/talent_draw_demo/selection-pool.source.json",
  );
  assert.equal(resolved.featureAuthoring?.profile, "selection_pool");
}

function testUpdateClearsSourceBackedFieldsWhenNoOwnedArtifactRemains(): void {
  const resolved = resolveSelectionPoolWorkspaceFields(
    createWritePlan(),
    "talent_draw_demo",
    "update",
  );

  assert.equal(resolved.sourceModel, null);
  assert.equal(resolved.featureAuthoring, null);
}

function testUpdateCanRehydrateLifecycleFieldsFromBlueprintAuthoring(): void {
  const featureAuthoring = createSelectionPoolFeatureAuthoring();
  const resolved = resolveSelectionPoolWorkspaceFields(
    createWritePlan(),
    "talent_draw_demo",
    "update",
    featureAuthoring,
  );

  assert.equal(resolved.sourceModel?.adapter, "selection_pool");
  assert.equal(
    resolved.sourceModel?.path,
    "game/scripts/src/rune_weaver/features/talent_draw_demo/selection-pool.source.json",
  );
  assert.equal(resolved.featureAuthoring?.profile, "selection_pool");
}

function testResolverUsesWritePlanMetadataWhenArtifactEntryExists(): void {
  const writePlan = createWritePlan();
  const featureAuthoring = createSelectionPoolFeatureAuthoring();
  appendSelectionPoolSourceModelEntry(writePlan, "talent_draw_demo", featureAuthoring);

  const resolved = resolveSelectionPoolWorkspaceFields(
    writePlan,
    "talent_draw_demo",
    "regenerate",
  );

  assert.equal(
    resolved.sourceModel?.path,
    "game/scripts/src/rune_weaver/features/talent_draw_demo/selection-pool.source.json",
  );
  assert.equal(resolved.featureAuthoring?.parameters.objects.length, 6);
}

testCreateDerivesLifecycleFieldsFromBlueprintAuthoring();
testUpdateClearsSourceBackedFieldsWhenNoOwnedArtifactRemains();
testUpdateCanRehydrateLifecycleFieldsFromBlueprintAuthoring();
testResolverUsesWritePlanMetadataWhenArtifactEntryExists();

console.log("adapters/dota2/families/selection-pool/lifecycle.test.ts passed");

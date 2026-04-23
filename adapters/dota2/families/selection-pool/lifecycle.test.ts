import assert from "node:assert/strict";

import type { FeatureAuthoring } from "../../../../core/schema/types.js";
import type { WritePlan } from "../../assembler/index.js";
import { buildSelectionPoolSyntheticParameters } from "./__fixtures__/synthetic.js";
import {
  appendSelectionPoolSourceModelEntry,
  resolveSelectionPoolWorkspaceFields,
} from "./index.js";
import { resolveSelectionPoolCompiledObjects } from "./source-model.js";

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
    parameters: buildSelectionPoolSyntheticParameters("talent"),
    parameterSurface: {
      triggerKey: { kind: "single_hotkey", allowList: ["F4", "F5"] },
      choiceCount: { minimum: 1, maximum: 5 },
      objectKind: { allowed: ["talent", "equipment", "skill_card_placeholder"] },
      poolEntries: { minItems: 1, seededWhenMissing: true },
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
  assert.equal(resolved.featureAuthoring?.parameters.poolEntries.length, 6);
  assert.equal((resolved.featureAuthoring?.parameters as any).objects, undefined);
  assert.equal((resolved.featureAuthoring?.parameters as any).effectProfile, undefined);
  const sourceEntry = writePlan.entries.find((entry) => entry.sourcePattern === "rw.feature_source_model");
  assert.equal((sourceEntry?.parameters as any).objects, undefined);
  assert.equal((sourceEntry?.parameters as any).effectProfile, undefined);
  assert.equal(Array.isArray((sourceEntry?.parameters as any).poolEntries), true);
  const compiled = resolveSelectionPoolCompiledObjects(sourceEntry?.parameters as any);
  assert.equal(compiled.objects[0]?.outcome?.kind, "attribute_bonus");
}

testCreateDerivesLifecycleFieldsFromBlueprintAuthoring();
testUpdateClearsSourceBackedFieldsWhenNoOwnedArtifactRemains();
testUpdateCanRehydrateLifecycleFieldsFromBlueprintAuthoring();
testResolverUsesWritePlanMetadataWhenArtifactEntryExists();

console.log("adapters/dota2/families/selection-pool/lifecycle.test.ts passed");

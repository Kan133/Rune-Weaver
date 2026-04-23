import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  buildProviderAbilityExportArtifact,
  buildSelectionGrantBindingArtifact,
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  ensureConsumesGrantableAbilitySurface,
  ensureGrantDependencyEdge,
  ensureGrantableAbilitySurface,
  readProviderAbilityExportArtifact,
  readSelectionGrantBindingArtifact,
} from "./grant-artifacts.js";

{
  const contract = ensureGrantableAbilitySurface(undefined);
  assert.equal(contract.exports[0]?.contractId, DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID);
}

{
  const contract = ensureConsumesGrantableAbilitySurface(undefined);
  assert.equal(contract.consumes[0]?.contractId, DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID);
}

{
  const edges = ensureGrantDependencyEdge(undefined, "skill_provider_demo");
  assert.equal(edges[0]?.targetContractId, DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID);
}

{
  const artifact = buildProviderAbilityExportArtifact(
    "skill_provider_demo",
    "rw_skill_provider_demo",
    "grant_only",
  );
  assert.equal(artifact.surfaces[0]?.kind, "capability");
  assert.equal(artifact.surfaces[0]?.contractId, DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID);
}

{
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-artifacts-"));
  try {
    const featureDir = join(hostRoot, "game", "scripts", "src", "rune_weaver", "features", "consumer_draw_demo");
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(
      join(featureDir, "selection-grant-bindings.json"),
      JSON.stringify(
        {
          adapter: "dota2_selection_grant_binding",
          version: 1,
          featureId: "consumer_draw_demo",
          bindings: [
            {
              objectId: "SEL_R001",
              targetFeatureId: "skill_provider_demo",
              targetSurfaceId: "grantable_primary_hero_ability",
              relation: "grants",
              applyBehavior: "grant_primary_hero_ability",
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );
    const bindingArtifact = readSelectionGrantBindingArtifact(hostRoot, "consumer_draw_demo");
    assert.equal(bindingArtifact?.bindings[0]?.entryId, "SEL_R001");
    assert.equal(bindingArtifact?.bindings[0]?.targetContractId, DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID);
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

{
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-provider-artifacts-"));
  try {
    const featureDir = join(hostRoot, "game", "scripts", "src", "rune_weaver", "features", "skill_provider_demo");
    mkdirSync(featureDir, { recursive: true });
    const artifact = buildProviderAbilityExportArtifact(
      "skill_provider_demo",
      "rw_skill_provider_demo",
      "grant_only",
    );
    const legacyCompatibleArtifact = {
      ...artifact,
      surfaces: artifact.surfaces.map((surface) => ({
        surfaceId: surface.surfaceId,
        abilityName: surface.abilityName,
        attachmentMode: surface.attachmentMode,
      })),
    };
    writeFileSync(
      join(featureDir, "dota2-provider-ability-export.json"),
      JSON.stringify(legacyCompatibleArtifact, null, 2),
      "utf-8",
    );
    const parsed = readProviderAbilityExportArtifact(hostRoot, "skill_provider_demo");
    assert.equal(parsed?.surfaces[0]?.contractId, DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID);
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

{
  const bindingArtifact = buildSelectionGrantBindingArtifact("consumer_draw_demo", [
    {
      entryId: "SEL_R001",
      targetFeatureId: "skill_provider_demo",
      targetSurfaceId: "grantable_primary_hero_ability",
      targetContractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
      relation: "grants",
      applyBehavior: "grant_primary_hero_ability",
    },
  ]);
  assert.equal(bindingArtifact.bindings[0]?.targetContractId, DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID);
}

console.log("adapters/dota2/cross-feature/grant-artifacts.test.ts passed");

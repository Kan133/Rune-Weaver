import assert from "node:assert/strict";

import {
  areFeatureContractSurfacesCompatible,
  ensureFeatureContractSurface,
  ensureFeatureDependencyEdge,
  findFeatureContractSurface,
} from "./feature-contract.js";

{
  const contract = ensureFeatureContractSurface(undefined, "exports", {
    id: "content_collection:default",
    kind: "data",
    summary: "Exports reusable content collection 'default'.",
    contractId: "selection_pool.object",
  });
  assert.equal(contract.exports.length, 1);
  assert.equal(contract.exports[0]?.contractId, "selection_pool.object");

  const upgraded = ensureFeatureContractSurface(contract, "exports", {
    id: "content_collection:default",
    kind: "data",
    summary: "Exports reusable content collection 'default'.",
    contractId: "selection_pool.object",
  });
  assert.equal(upgraded.exports.length, 1);
  assert.equal(upgraded.exports[0]?.contractId, "selection_pool.object");
}

{
  const legacyContract = ensureFeatureContractSurface(undefined, "consumes", {
    id: "grantable_primary_hero_ability",
    kind: "capability",
    summary: "Consumes a provider feature that can grant one primary hero ability.",
  });
  const upgraded = ensureFeatureContractSurface(legacyContract, "consumes", {
    id: "grantable_primary_hero_ability",
    kind: "capability",
    summary: "Consumes a provider feature that can grant one primary hero ability.",
    contractId: "dota2.primary_hero_ability.grantable",
  });

  assert.equal(upgraded.consumes.length, 1);
  assert.equal(upgraded.consumes[0]?.contractId, "dota2.primary_hero_ability.grantable");
  assert.deepEqual(
    findFeatureContractSurface(upgraded, "consumes", {
      id: "grantable_primary_hero_ability",
      kind: "capability",
    }),
    upgraded.consumes[0],
  );
}

{
  const legacyEdges = ensureFeatureDependencyEdge(undefined, {
    relation: "grants",
    targetFeatureId: "skill_provider_demo",
    targetSurfaceId: "grantable_primary_hero_ability",
    required: true,
  });
  const upgraded = ensureFeatureDependencyEdge(legacyEdges, {
    relation: "grants",
    targetFeatureId: "skill_provider_demo",
    targetSurfaceId: "grantable_primary_hero_ability",
    targetContractId: "dota2.primary_hero_ability.grantable",
    required: true,
  });
  assert.equal(upgraded.length, 1);
  assert.equal(upgraded[0]?.targetContractId, "dota2.primary_hero_ability.grantable");
}

{
  assert.equal(
    areFeatureContractSurfacesCompatible(
      {
        id: "grantable_primary_hero_ability",
        kind: "capability",
        contractId: "dota2.primary_hero_ability.grantable",
      },
      {
        id: "grantable_primary_hero_ability",
        kind: "capability",
        summary: "Can grant one primary hero ability through the Dota2 host ability surface.",
        contractId: "dota2.primary_hero_ability.grantable",
      },
    ),
    true,
  );

  assert.equal(
    areFeatureContractSurfacesCompatible(
      {
        id: "grantable_primary_hero_ability",
        kind: "capability",
        contractId: "dota2.primary_hero_ability.grantable",
      },
      {
        id: "grantable_primary_hero_ability",
        kind: "capability",
        summary: "Can grant one primary hero ability through the Dota2 host ability surface.",
        contractId: "dota2.other",
      },
    ),
    false,
  );
}

console.log("core/contracts/feature-contract.test.ts passed");

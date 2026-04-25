import assert from "node:assert/strict";

import { analyzeDependencyRevalidation } from "./dependency-revalidation.js";
import type { RuneWeaverWorkspace } from "./types.js";

const baseWorkspace: RuneWeaverWorkspace = {
  version: "0.1",
  hostType: "dota2-x-template",
  hostRoot: "D:\\fake-host",
  addonName: "test_addon",
  initializedAt: new Date().toISOString(),
  features: [
    {
      featureId: "skill_provider_demo",
      intentKind: "micro-feature",
      status: "active",
      revision: 1,
      blueprintId: "bp_provider",
      modules: [],
      selectedPatterns: ["gameplay_ability"],
      generatedFiles: [],
      entryBindings: [],
      featureContract: {
        exports: [
          {
            id: "grantable_primary_hero_ability",
            kind: "capability",
            summary: "Can grant one primary hero ability through the Dota2 host ability surface.",
            contractId: "dota2.primary_hero_ability.grantable",
          },
        ],
        consumes: [],
        integrationSurfaces: [],
        stateScopes: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      featureId: "consumer_draw_demo",
      intentKind: "standalone-system",
      status: "active",
      revision: 1,
      blueprintId: "bp_consumer",
      modules: [],
      selectedPatterns: ["rule.selection_flow"],
      generatedFiles: [],
      entryBindings: [],
      dependsOn: ["skill_provider_demo"],
      featureContract: {
        exports: [],
        consumes: [
          {
            id: "grantable_primary_hero_ability",
            kind: "capability",
            summary: "Consumes a provider feature that can grant one primary hero ability.",
            contractId: "dota2.primary_hero_ability.grantable",
          },
        ],
        integrationSurfaces: [],
        stateScopes: [],
      },
      dependencyEdges: [
        {
          relation: "grants",
          targetFeatureId: "skill_provider_demo",
          targetSurfaceId: "grantable_primary_hero_ability",
          targetContractId: "dota2.primary_hero_ability.grantable",
          required: true,
          summary: "cross-feature reward grants:skill_provider_demo:grantable_primary_hero_ability",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

{
  const result = analyzeDependencyRevalidation({
    workspace: baseWorkspace,
    providerFeatureId: "skill_provider_demo",
    lifecycleAction: "update",
    nextFeatureContract: {
      exports: [
        {
          id: "grantable_primary_hero_ability",
          kind: "capability",
          summary: "Can grant one primary hero ability through the Dota2 host ability surface.",
          contractId: "dota2.other_capability",
        },
      ],
      consumes: [],
      integrationSurfaces: [],
      stateScopes: [],
    },
  });

  assert.equal(result.success, false);
  assert.match(result.blockers[0] || "", /changed contract/i);
}

{
  const legacyCompatible = analyzeDependencyRevalidation({
    workspace: baseWorkspace,
    providerFeatureId: "skill_provider_demo",
    lifecycleAction: "update",
    nextFeatureContract: {
      exports: [
        {
          id: "grantable_primary_hero_ability",
          kind: "capability",
          summary: "Can grant one primary hero ability through the Dota2 host ability surface.",
        },
      ],
      consumes: [],
      integrationSurfaces: [],
      stateScopes: [],
    },
  });

  assert.equal(legacyCompatible.success, true);
}

console.log("core/workspace/dependency-revalidation.test.ts passed");

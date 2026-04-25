import assert from "node:assert/strict";

import {
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
} from "../cross-feature/index.js";
import { summarizeDota2FeatureGovernance } from "./feature-governance.js";

{
  const summary = summarizeDota2FeatureGovernance({
    selectedPatterns: ["effect.outcome_realizer", "input.key_binding"],
    modules: [
      {
        moduleId: "selection_flow",
        role: "selection_flow",
        familyId: "selection_pool",
        selectedPatternIds: ["rule.selection_flow"],
        sourceKind: "family",
        implementationStrategy: "family",
        maturity: "templated",
        requiresReview: false,
        reviewReasons: [],
      },
    ] as any,
    featureContract: {
      exports: [
        {
          id: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
          kind: "capability",
          summary: "Exports one grantable primary hero ability surface.",
          contractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
        },
      ],
      consumes: [
        {
          id: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
          kind: "capability",
          summary: "Consumes one grantable primary hero ability surface.",
          contractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
        },
      ],
      integrationSurfaces: [],
      stateScopes: [],
    },
    dependencyEdges: [
      {
        relation: "grants",
        targetFeatureId: "skill_provider_demo",
        targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
        targetContractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
        required: true,
        summary: "cross-feature reward grants:skill_provider_demo:grantable_primary_hero_ability",
      },
    ],
    implementationStrategy: "family",
    maturity: "templated",
    commitDecision: {
      outcome: "committable",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: false,
      reasons: [],
      stage: "blueprint",
    },
  });

  assert.equal(summary.familyAdmissions[0]?.status, "admitted");
  assert.equal(summary.patternAdmissions[0]?.status, "admitted");
  assert.equal(summary.patternAdmissions[1]?.status, "untracked");
  assert.equal(summary.seamAdmissions.length, 1);
  assert.equal(summary.seamAdmissions[0]?.assetId, "grant_only_provider_export_seam");
  assert.equal(summary.seamAdmissions[0]?.status, "admitted");
}

{
  const summary = summarizeDota2FeatureGovernance({
    selectedPatterns: [],
    modules: [] as any,
    featureContract: {
      exports: [],
      consumes: [],
      integrationSurfaces: [],
      stateScopes: [],
    },
    dependencyEdges: [],
    implementationStrategy: "guided_native",
    maturity: "exploratory",
    commitDecision: {
      outcome: "exploratory",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: true,
      reasons: [],
      stage: "blueprint",
    },
  });

  assert.deepEqual(summary.seamAdmissions, []);
}

console.log("adapters/dota2/governance/feature-governance.test.ts passed");

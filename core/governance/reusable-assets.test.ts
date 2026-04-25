import assert from "node:assert/strict";

import { DOTA2_X_TEMPLATE_HOST_KIND } from "../host/types.js";
import {
  getReusableAssetAdmissionStatus,
  validatePromotionPacket,
  validateReusableAssetGovernance,
  type ReusableAssetPromotionPacket,
  type ReusableAssetPromotionRegistryEntry,
} from "./reusable-assets.js";

function createExploreToSeamPacket(): ReusableAssetPromotionPacket {
  return {
    id: "dota2.grant_only_provider_export_seam.explore_to_seam.v1",
    kind: "explore_to_seam",
    assetId: "grant_only_provider_export_seam",
    assetType: "seam",
    originLevel: "explore",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    contractRefs: [
      "dota2.primary_hero_ability.grantable",
      "grantable_primary_hero_ability",
      "dota2.primary_hero_ability.grantable:grantable_primary_hero_ability",
    ],
    evidenceRefs: [
      "adapters/dota2/cross-feature/grant-seam.ts",
      "adapters/dota2/cross-feature/grant-artifacts.ts",
    ],
    acceptanceRefs: [
      "adapters/dota2/cross-feature/grant-seam.test.ts",
      "adapters/dota2/governance/promotion-readiness.test.ts",
    ],
    invariants: [
      "Provider export identity closes to one authoritative runtime abilityName.",
      "Consumer grant wiring stays explicit through contract metadata and dependency edges.",
    ],
    reviewRequiredRisks: [
      "Manual review still decides promotion; readiness proof alone does not auto-admit the seam.",
    ],
    stableCapabilities: [
      "dota2.provider_export.grant_only",
      "dota2.selection_grant_binding.explicit",
    ],
    stableInputs: [
      "dota2.primary_hero_ability.grantable",
    ],
    stableOutputs: [
      "selection-grant-bindings.json",
      "dota2-provider-ability-export.json",
    ],
    decision: {
      summary: "Manual review queued the grant-only provider export seam for formal governance tracking.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  };
}

function createSeamRegistryEntry(
  status: ReusableAssetPromotionRegistryEntry["status"] = "candidate",
): ReusableAssetPromotionRegistryEntry {
  return {
    assetId: "grant_only_provider_export_seam",
    assetType: "seam",
    originLevel: "explore",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    status,
    contractRefs: [
      "dota2.primary_hero_ability.grantable",
      "grantable_primary_hero_ability",
      "dota2.primary_hero_ability.grantable:grantable_primary_hero_ability",
    ],
    evidenceRefs: [
      "adapters/dota2/cross-feature/grant-seam.ts",
    ],
    acceptanceRefs: [
      "adapters/dota2/cross-feature/grant-seam.test.ts",
      "adapters/dota2/governance/promotion-readiness.test.ts",
    ],
    packetId: "dota2.grant_only_provider_export_seam.explore_to_seam.v1",
    decision: {
      summary: "The seam is tracked formally while awaiting an explicit admission decision.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  };
}

{
  const packet = createExploreToSeamPacket();
  const result = validatePromotionPacket(packet);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
}

{
  const packet = createExploreToSeamPacket();
  const result = validatePromotionPacket({
    ...packet,
    stableOutputs: [],
  });
  assert.equal(result.valid, false);
  assert.equal(
    result.errors.includes(
      "promotion packet 'dota2.grant_only_provider_export_seam.explore_to_seam.v1': stableOutputs are required for explore_to_seam",
    ),
    true,
  );
}

{
  const packet = createExploreToSeamPacket();
  const entry = createSeamRegistryEntry("candidate");
  const result = validateReusableAssetGovernance(
    [entry],
    [packet],
    {
      patternExists: () => false,
      familyExists: () => false,
      seamExists: () => false,
    },
  );
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(
    getReusableAssetAdmissionStatus([entry], "seam", "grant_only_provider_export_seam", DOTA2_X_TEMPLATE_HOST_KIND),
    "candidate",
  );
}

{
  const packet = createExploreToSeamPacket();
  const entry = createSeamRegistryEntry("admitted");
  const result = validateReusableAssetGovernance(
    [entry],
    [packet],
    {
      patternExists: () => false,
      familyExists: () => false,
      seamExists: () => false,
    },
  );
  assert.equal(result.valid, false);
  assert.equal(
    result.errors.includes(
      "promotion registry entry 'seam:grant_only_provider_export_seam': admitted asset has no matching code implementation",
    ),
    true,
  );
}

{
  const packet = createExploreToSeamPacket();
  const entry = createSeamRegistryEntry("admitted");
  const result = validateReusableAssetGovernance(
    [entry],
    [packet],
    {
      patternExists: () => false,
      familyExists: () => false,
      seamExists: (assetId) => assetId === "grant_only_provider_export_seam",
    },
  );
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
}

console.log("core/governance/reusable-assets.test.ts passed");

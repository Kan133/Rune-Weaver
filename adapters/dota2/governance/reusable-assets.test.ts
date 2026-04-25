import assert from "node:assert/strict";

import { validateReusableAssetGovernance } from "../../../core/governance/reusable-assets.js";
import {
  getDota2ReusableAssetAdmissionStatus,
  getDota2ReusableAssetPromotionPackets,
  getDota2ReusableAssetRegistryEntries,
  isDota2ReusableAssetFormallyAdmitted,
  validateDota2ReusableAssetGovernance,
} from "./reusable-assets.js";

{
  const result = validateDota2ReusableAssetGovernance();
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
}

{
  assert.equal(
    getDota2ReusableAssetAdmissionStatus("seam", "grant_only_provider_export_seam"),
    "admitted",
  );
  assert.equal(
    getDota2ReusableAssetAdmissionStatus("pattern", "effect.outcome_realizer"),
    "admitted",
  );
  assert.equal(
    getDota2ReusableAssetAdmissionStatus("family", "selection_pool"),
    "admitted",
  );
  assert.equal(
    getDota2ReusableAssetAdmissionStatus("pattern", "input.key_binding"),
    "untracked",
  );
}

{
  const packets = getDota2ReusableAssetPromotionPackets();
  const registryEntries = getDota2ReusableAssetRegistryEntries();
  const seamPacket = packets.find((packet) => packet.assetId === "grant_only_provider_export_seam");
  const seamEntry = registryEntries.find((entry) => entry.assetId === "grant_only_provider_export_seam");

  assert.equal(seamPacket?.assetType, "seam");
  assert.equal(seamPacket?.kind, "explore_to_seam");
  assert.equal(seamEntry?.assetType, "seam");
  assert.equal(seamEntry?.status, "admitted");
  assert.deepEqual(seamPacket?.contractRefs, [
    "dota2.primary_hero_ability.grantable",
    "dota2_provider_ability_export",
    "dota2_selection_grant_contract",
    "dota2_selection_grant_binding",
  ]);
  assert.deepEqual(seamPacket?.acceptanceRefs, [
    "docs/provider-export-seam/artifact.json",
    "docs/provider-export-seam/acceptance-summary.json",
  ]);
}

{
  assert.equal(isDota2ReusableAssetFormallyAdmitted("seam", "grant_only_provider_export_seam"), true);
  assert.equal(isDota2ReusableAssetFormallyAdmitted("pattern", "effect.outcome_realizer"), true);
  assert.equal(isDota2ReusableAssetFormallyAdmitted("family", "selection_pool"), true);
  assert.equal(isDota2ReusableAssetFormallyAdmitted("pattern", "input.key_binding"), false);
}

{
  const packets = getDota2ReusableAssetPromotionPackets();
  const registryEntries = getDota2ReusableAssetRegistryEntries();
  const admittedSeamEntries = registryEntries.map((entry) =>
    entry.assetId === "grant_only_provider_export_seam"
      ? { ...entry, status: "admitted" as const }
      : entry,
  );
  const result = validateReusableAssetGovernance(
    admittedSeamEntries,
    packets,
    {
      patternExists: () => true,
      familyExists: () => true,
      seamExists: (assetId) => assetId === "grant_only_provider_export_seam",
    },
  );
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
}

console.log("adapters/dota2/governance/reusable-assets.test.ts passed");

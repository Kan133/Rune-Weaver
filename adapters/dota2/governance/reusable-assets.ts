import { DOTA2_X_TEMPLATE_HOST_KIND } from "../../../core/host/types.js";
import {
  type ReusableAssetPromotionRegistryEntry,
  type ReusableAssetPromotionPacket,
  getReusableAssetAdmissionStatus,
  isFormallyAdmittedReusableAsset,
  validateReusableAssetGovernance,
} from "../../../core/governance/reusable-assets.js";
import {
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
} from "../cross-feature/index.js";
import { getPatternMeta } from "../patterns/index.js";
import { isKnownDota2Family } from "../families/registry.js";

const SELECTION_POOL_ADMISSION_NOTE_REF =
  "archive/docs/2026-04-session-sync-history/dota2-mainline-20260423-0232.md";
export const GRANT_ONLY_PROVIDER_EXPORT_SEAM_ID = "grant_only_provider_export_seam";
const GRANT_ONLY_PROVIDER_EXPORT_SEAM_PACKET_ID =
  "dota2.grant_only_provider_export_seam.explore_to_seam.v1";
const GRANT_ONLY_PROVIDER_EXPORT_SEAM_CONTRACT_REFS = [
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  "dota2_provider_ability_export",
  "dota2_selection_grant_contract",
  "dota2_selection_grant_binding",
] as const;
const GRANT_ONLY_PROVIDER_EXPORT_SEAM_EVIDENCE_REFS = [
  "adapters/dota2/cross-feature/grant-seam.ts",
  "adapters/dota2/cross-feature/grant-artifacts.ts",
  "adapters/dota2/governance/promotion-readiness-harness.ts",
  "docs/provider-export-seam/artifact.json",
] as const;
const GRANT_ONLY_PROVIDER_EXPORT_SEAM_ACCEPTANCE_REFS = [
  "docs/provider-export-seam/artifact.json",
  "docs/provider-export-seam/acceptance-summary.json",
] as const;
const GRANT_ONLY_PROVIDER_EXPORT_SEAM_INVARIANTS = [
  "Lua, KV, and provider export identity must close to exactly one authoritative runtime abilityName.",
  "The provider may export only one grant_only capability surface for the seam.",
  "Consumer grant binding must stay explicit and remain local to the consuming feature.",
  "Bridge wiring may preload the grant runtime but must not auto-attach it to heroes.",
  "Non-provider features must not leak the provider export sidecar.",
] as const;
const GRANT_ONLY_PROVIDER_EXPORT_SEAM_REVIEW_REQUIRED_RISKS = [
  "The seam must not collapse back into hidden attachment authority.",
  "selection_pool and other consumer-local families must not absorb provider seam authority.",
  "Exploratory success or exact grounding must not auto-promote reusable truth without manual admission.",
] as const;
const DOTA2_REUSABLE_SEAM_IMPLEMENTATIONS = new Set<string>([
  GRANT_ONLY_PROVIDER_EXPORT_SEAM_ID,
]);

const DOTA2_REUSABLE_ASSET_PROMOTION_PACKETS: ReusableAssetPromotionPacket[] = [
  {
    id: GRANT_ONLY_PROVIDER_EXPORT_SEAM_PACKET_ID,
    kind: "explore_to_seam",
    assetId: GRANT_ONLY_PROVIDER_EXPORT_SEAM_ID,
    assetType: "seam",
    originLevel: "explore",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    contractRefs: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_CONTRACT_REFS],
    evidenceRefs: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_EVIDENCE_REFS],
    acceptanceRefs: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_ACCEPTANCE_REFS],
    invariants: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_INVARIANTS],
    reviewRequiredRisks: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_REVIEW_REQUIRED_RISKS],
    stableCapabilities: [
      "dota2.provider_export.grant_only",
      "dota2.selection_grant_binding.explicit",
    ],
    stableInputs: [
      DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
      "dota2_selection_grant_contract",
    ],
    stableOutputs: [
      "dota2-provider-ability-export.json",
      "selection-grant-bindings.json",
      "selection-grant-contract.json",
    ],
    decision: {
      summary: "Manual review admitted the grant-only provider export seam after fresh-host proof, stale-host upgrade proof, and formal governance closure.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  },
  {
    id: "dota2.effect.outcome_realizer.explore_to_pattern.v1",
    kind: "explore_to_pattern",
    assetId: "effect.outcome_realizer",
    assetType: "pattern",
    originLevel: "explore",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    contractRefs: [
      "selection_outcome.request",
      "selection_outcome.realization",
    ],
    evidenceRefs: [
      "docs/talent-draw-case/demo-evidence/artifact.json",
      "docs/equipment-draw-case/demo-evidence/artifact.json",
    ],
    acceptanceRefs: [
      "docs/talent-draw-case/demo-evidence/latest/acceptance-summary.json",
      "docs/equipment-draw-case/demo-evidence/latest/acceptance-summary.json",
    ],
    invariants: [
      "Receives one normalized confirmed outcome request and keeps concrete host realization out of selection_flow.",
      "Realizes only bounded current-host outcome kinds and returns handled=true when a host-native outcome was applied.",
      "Does not own draw/session/pool state or selection UI semantics.",
    ],
    reviewRequiredRisks: [
      "New outcome kinds still require bounded admission and host realization review before promotion.",
      "Cross-feature grant semantics remain external to effect.outcome_realizer.",
    ],
    stableCapabilities: [
      "effect.realize.outcome",
      "effect.realize.attribute_bonus",
      "effect.realize.native_item_delivery",
      "effect.realize.spawn_unit",
    ],
    stableInputs: [
      "selection_outcome_request",
      "selection_commit",
    ],
    stableOutputs: [
      "selection_outcome_realized",
    ],
    decision: {
      summary: "Promote outcome realizer as the first explicit reusable pattern exemplar for bounded confirmed-outcome realization.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  },
  {
    id: "dota2.selection_pool.pattern_to_family.v1",
    kind: "pattern_to_family",
    assetId: "selection_pool",
    assetType: "family",
    originLevel: "pattern",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    contractRefs: [
      "selection_pool.source_truth.v2",
      "selection_pool.object",
      "dota2.primary_hero_ability.grantable",
    ],
    evidenceRefs: [
      "docs/talent-draw-case/demo-evidence/artifact.json",
      "docs/equipment-draw-case/demo-evidence/artifact.json",
      SELECTION_POOL_ADMISSION_NOTE_REF,
    ],
    acceptanceRefs: [
      "docs/talent-draw-case/demo-evidence/latest/acceptance-summary.json",
      "docs/equipment-draw-case/demo-evidence/latest/acceptance-summary.json",
      SELECTION_POOL_ADMISSION_NOTE_REF,
    ],
    invariants: [
      "Selection pool keeps the canonical five-module skeleton: input_trigger, weighted_pool, selection_flow, selection_outcome, selection_modal.",
      "Source-backed authority stays on selection_pool V2 truth: localCollections plus poolEntries.",
      "Concrete realization stays outside selection_flow and external grants stay on the cross-feature seam.",
    ],
    reviewRequiredRisks: [
      "Reveal-only weighted-card asks are still outside the admitted family boundary.",
      "Cross-feature reward grants must remain sidecar-driven and must not mutate local authored outcomes.",
    ],
    sourceBackedAuthority: {
      sourceModelAdapter: "selection_pool",
      updateAuthority: "Canonical V2 truth is localCollections plus poolEntries with ingress-only legacy migration.",
      ownershipBoundary: "The feature owns pool membership and local collections but may only read feature exports or external catalogs.",
      dependencyBoundary: "Cross-feature content reads and provider grants stay explicit dependency edges instead of hidden family authority.",
    },
    decision: {
      summary: "Admit selection_pool as the first explicit family exemplar after talent and equipment sibling proofs plus source-backed V2 authority cleanup.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  },
];

const DOTA2_REUSABLE_ASSET_REGISTRY: ReusableAssetPromotionRegistryEntry[] = [
  {
    assetId: GRANT_ONLY_PROVIDER_EXPORT_SEAM_ID,
    assetType: "seam",
    originLevel: "explore",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    status: "admitted",
    contractRefs: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_CONTRACT_REFS],
    evidenceRefs: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_EVIDENCE_REFS],
    acceptanceRefs: [...GRANT_ONLY_PROVIDER_EXPORT_SEAM_ACCEPTANCE_REFS],
    packetId: GRANT_ONLY_PROVIDER_EXPORT_SEAM_PACKET_ID,
    decision: {
      summary: "Manual review admitted the provider export seam as formal reusable truth after the positive stale-host upgrade proof closed.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  },
  {
    assetId: "effect.outcome_realizer",
    assetType: "pattern",
    originLevel: "explore",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    status: "admitted",
    contractRefs: [
      "selection_outcome.request",
      "selection_outcome.realization",
    ],
    evidenceRefs: [
      "docs/talent-draw-case/demo-evidence/artifact.json",
      "docs/equipment-draw-case/demo-evidence/artifact.json",
    ],
    acceptanceRefs: [
      "docs/talent-draw-case/demo-evidence/latest/acceptance-summary.json",
      "docs/equipment-draw-case/demo-evidence/latest/acceptance-summary.json",
    ],
    packetId: "dota2.effect.outcome_realizer.explore_to_pattern.v1",
    decision: {
      summary: "Manual review admitted the bounded outcome realization seam as reusable pattern truth.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  },
  {
    assetId: "selection_pool",
    assetType: "family",
    originLevel: "pattern",
    hostKinds: [DOTA2_X_TEMPLATE_HOST_KIND],
    status: "admitted",
    contractRefs: [
      "selection_pool.source_truth.v2",
      "selection_pool.object",
      "dota2.primary_hero_ability.grantable",
    ],
    evidenceRefs: [
      "docs/talent-draw-case/demo-evidence/artifact.json",
      "docs/equipment-draw-case/demo-evidence/artifact.json",
      SELECTION_POOL_ADMISSION_NOTE_REF,
    ],
    acceptanceRefs: [
      "docs/talent-draw-case/demo-evidence/latest/acceptance-summary.json",
      "docs/equipment-draw-case/demo-evidence/latest/acceptance-summary.json",
      SELECTION_POOL_ADMISSION_NOTE_REF,
    ],
    packetId: "dota2.selection_pool.pattern_to_family.v1",
    decision: {
      summary: "Manual review admitted the source-backed selection_pool family backbone for Dota2.",
      decidedBy: "manual-review",
      decidedAt: "2026-04-23",
    },
  },
];

export function getDota2ReusableAssetPromotionPackets(): ReusableAssetPromotionPacket[] {
  return DOTA2_REUSABLE_ASSET_PROMOTION_PACKETS.map((packet) => ({ ...packet }));
}

export function getDota2ReusableAssetRegistryEntries(): ReusableAssetPromotionRegistryEntry[] {
  return DOTA2_REUSABLE_ASSET_REGISTRY.map((entry) => ({ ...entry }));
}

export function validateDota2ReusableAssetGovernance() {
  return validateReusableAssetGovernance(
    DOTA2_REUSABLE_ASSET_REGISTRY,
    DOTA2_REUSABLE_ASSET_PROMOTION_PACKETS,
    {
      patternExists: (assetId) => Boolean(getPatternMeta(assetId)),
      familyExists: (assetId) => isKnownDota2Family(assetId),
      seamExists: (assetId) => DOTA2_REUSABLE_SEAM_IMPLEMENTATIONS.has(assetId),
    },
  );
}

export function getDota2ReusableAssetAdmissionStatus(
  assetType: "pattern" | "family" | "seam",
  assetId: string,
): "candidate" | "admitted" | "deprecated" | "untracked" {
  return getReusableAssetAdmissionStatus(
    DOTA2_REUSABLE_ASSET_REGISTRY,
    assetType,
    assetId,
    DOTA2_X_TEMPLATE_HOST_KIND,
  );
}

export function isDota2ReusableAssetFormallyAdmitted(
  assetType: "pattern" | "family" | "seam",
  assetId: string,
): boolean {
  return isFormallyAdmittedReusableAsset(
    DOTA2_REUSABLE_ASSET_REGISTRY,
    assetType,
    assetId,
    DOTA2_X_TEMPLATE_HOST_KIND,
  );
}

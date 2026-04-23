import { DOTA2_X_TEMPLATE_HOST_KIND } from "../../../core/host/types.js";
import {
  type ReusableAssetPromotionRegistryEntry,
  type ReusableAssetPromotionPacket,
  getReusableAssetAdmissionStatus,
  isFormallyAdmittedReusableAsset,
  validateReusableAssetGovernance,
} from "../../../core/governance/reusable-assets.js";
import { getPatternMeta } from "../patterns/index.js";
import { isKnownDota2Family } from "../families/registry.js";

const SELECTION_POOL_ADMISSION_NOTE_REF =
  "archive/docs/2026-04-session-sync-history/dota2-mainline-20260423-0232.md";

const DOTA2_REUSABLE_ASSET_PROMOTION_PACKETS: ReusableAssetPromotionPacket[] = [
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
    },
  );
}

export function getDota2ReusableAssetAdmissionStatus(
  assetType: "pattern" | "family",
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
  assetType: "pattern" | "family",
  assetId: string,
): boolean {
  return isFormallyAdmittedReusableAsset(
    DOTA2_REUSABLE_ASSET_REGISTRY,
    assetType,
    assetId,
    DOTA2_X_TEMPLATE_HOST_KIND,
  );
}

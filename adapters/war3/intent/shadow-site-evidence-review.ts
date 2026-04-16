import type { War3ShadowDraftBundle } from "../generator/shadow-draft-bundle.js";
import type {
  War3ShadowConsumedBinding,
  War3ShadowRealizationFileRole,
  War3ShadowRealizationPlan,
  War3ShadowSiteContract,
  War3ShadowSiteKind,
} from "./shadow-realization-plan.js";

export type War3ShadowSiteEvidenceDraftCheck = {
  fileRole: War3ShadowRealizationFileRole;
  pathHint: string;
  status: "all-markers-present" | "partial-markers-present" | "no-markers-present";
  presentMarkers: string[];
  missingMarkers: string[];
};

export type War3ShadowSiteEvidenceReviewSite = {
  siteId: string;
  siteKind: War3ShadowSiteKind;
  ownerUnitId: string;
  fileRole: War3ShadowRealizationFileRole;
  targetPathHint: string;
  supportingTargetPathHints: string[];
  consumedBindings: War3ShadowConsumedBinding[];
  expectedMarkers: string[];
  dependsOnSiteIds: string[];
  reviewStatus: "review-contract-defined";
  draftCheck: War3ShadowSiteEvidenceDraftCheck;
  unresolvedFacts: string[];
  rationale: string[];
};

export type War3ShadowSiteEvidenceReview = {
  schemaVersion: "war3-shadow-site-evidence-review/current-slice-v1";
  generatedAt: string;
  featureId: "setup-mid-zone-shop";
  sourceBlueprintId: string;
  status: "review-only-site-evidence";
  sites: War3ShadowSiteEvidenceReviewSite[];
  notes: string[];
};

function buildDraftEntryIndex(bundle: War3ShadowDraftBundle) {
  return {
    "bootstrap-module": bundle.draftFiles.bootstrap,
    "feature-module": bundle.draftFiles.featureModule,
    "host-binding-review": bundle.draftFiles.hostBindingReview,
  } as const;
}

function buildDraftCheck(
  contract: War3ShadowSiteContract,
  bundle: War3ShadowDraftBundle,
): War3ShadowSiteEvidenceDraftCheck {
  const draftEntry = buildDraftEntryIndex(bundle)[contract.fileRole];
  const presentMarkers = contract.expectedMarkers.filter((marker) =>
    draftEntry.content.includes(marker),
  );
  const missingMarkers = contract.expectedMarkers.filter((marker) =>
    !draftEntry.content.includes(marker),
  );

  return {
    fileRole: draftEntry.fileRole,
    pathHint: draftEntry.pathHint,
    status:
      missingMarkers.length === 0
        ? "all-markers-present"
        : presentMarkers.length > 0
          ? "partial-markers-present"
          : "no-markers-present",
    presentMarkers,
    missingMarkers,
  };
}

export function buildWar3ShadowSiteEvidenceReview(input: {
  plan: War3ShadowRealizationPlan;
  bundle: War3ShadowDraftBundle;
}): War3ShadowSiteEvidenceReview {
  return {
    schemaVersion: "war3-shadow-site-evidence-review/current-slice-v1",
    generatedAt: new Date().toISOString(),
    featureId: input.plan.featureId,
    sourceBlueprintId: input.plan.sourceBlueprintId,
    status: "review-only-site-evidence",
    sites: input.plan.siteContracts.map((contract) => ({
      siteId: contract.siteId,
      siteKind: contract.siteKind,
      ownerUnitId: contract.ownerUnitId,
      fileRole: contract.fileRole,
      targetPathHint: contract.targetPathHint,
      supportingTargetPathHints: [...contract.supportingTargetPathHints],
      consumedBindings: [...contract.consumedBindings],
      expectedMarkers: [...contract.expectedMarkers],
      dependsOnSiteIds: [...contract.dependsOnSiteIds],
      reviewStatus: contract.reviewStatus,
      draftCheck: buildDraftCheck(contract, input.bundle),
      unresolvedFacts: [...contract.unresolvedFacts],
      rationale: [...contract.rationale],
    })),
    notes: [
      "This adapter-local artifact translates plan-level site contracts into deterministic draft-evidence checks.",
      "It is review-only and helps reviewers or probe consumers see where declaration-site and realization-site markers are expected to land.",
    ],
  };
}

import {
  generateMidZoneShopTstlBootstrapDraft,
  generateMidZoneShopTstlFeatureModuleDraft,
} from "./mid-zone-shop-skeleton.js";
import type {
  War3ShadowRealizationFileRole,
  War3ShadowRealizationPlan,
  War3ShadowRealizationUnit,
} from "../intent/shadow-realization-plan.js";

export type War3ShadowDraftBundleEntry = {
  fileRole: War3ShadowRealizationFileRole;
  pathHint: string;
  contentType: "typescript" | "json";
  status: "review-only-draft";
  content: string;
  sourceUnitId: string;
  linkedSiteIds: string[];
  notes: string[];
};

export type War3ShadowDraftBundle = {
  schemaVersion: "war3-shadow-draft-bundle/current-slice-v1";
  generatedAt: string;
  featureId: "setup-mid-zone-shop";
  sourceBlueprintId: string;
  status: "review-only-draft-bundle";
  draftFiles: {
    bootstrap: War3ShadowDraftBundleEntry;
    featureModule: War3ShadowDraftBundleEntry;
    hostBindingReview: War3ShadowDraftBundleEntry;
  };
  notes: string[];
};

function getRequiredUnit(
  plan: War3ShadowRealizationPlan,
  fileRole: War3ShadowRealizationFileRole,
): War3ShadowRealizationUnit {
  const unit = plan.realizationUnits.find((candidate) => candidate.fileRole === fileRole);
  if (!unit) {
    throw new Error(`Shadow realization plan is missing required unit for fileRole='${fileRole}'.`);
  }

  return unit;
}

export function buildWar3ShadowDraftBundle(
  plan: War3ShadowRealizationPlan,
): War3ShadowDraftBundle {
  const bootstrapUnit = getRequiredUnit(plan, "bootstrap-module");
  const featureUnit = getRequiredUnit(plan, "feature-module");
  const hostBindingReviewUnit = getRequiredUnit(plan, "host-binding-review");
  const generatorInput = plan.adapterLocalDraftSeed.generatorInput;
  const hostBindingReviewContent = JSON.stringify(
    plan.adapterLocalDraftSeed.hostBindingReviewPayload,
    null,
    2,
  );
  const linkedSiteIdsForRole = (fileRole: War3ShadowRealizationFileRole) =>
    plan.siteContracts
      .filter((siteContract) => siteContract.fileRole === fileRole)
      .map((siteContract) => siteContract.siteId);

  return {
    schemaVersion: "war3-shadow-draft-bundle/current-slice-v1",
    generatedAt: new Date().toISOString(),
    featureId: "setup-mid-zone-shop",
    sourceBlueprintId: plan.sourceBlueprintId,
    status: "review-only-draft-bundle",
    draftFiles: {
      bootstrap: {
        fileRole: "bootstrap-module",
        pathHint: bootstrapUnit.targetPathHint,
        contentType: "typescript",
        status: "review-only-draft",
        content: generateMidZoneShopTstlBootstrapDraft(generatorInput),
        sourceUnitId: bootstrapUnit.unitId,
        linkedSiteIds: linkedSiteIdsForRole("bootstrap-module"),
        notes: [
          ...bootstrapUnit.rationale,
          "Generated from the adapter-local shadow realization plan.",
        ],
      },
      featureModule: {
        fileRole: "feature-module",
        pathHint: featureUnit.targetPathHint,
        contentType: "typescript",
        status: "review-only-draft",
        content: generateMidZoneShopTstlFeatureModuleDraft(generatorInput),
        sourceUnitId: featureUnit.unitId,
        linkedSiteIds: linkedSiteIdsForRole("feature-module"),
        notes: [
          ...featureUnit.rationale,
          "Generated from the adapter-local shadow realization plan.",
        ],
      },
      hostBindingReview: {
        fileRole: "host-binding-review",
        pathHint: hostBindingReviewUnit.targetPathHint,
        contentType: "json",
        status: "review-only-draft",
        content: hostBindingReviewContent,
        sourceUnitId: hostBindingReviewUnit.unitId,
        linkedSiteIds: linkedSiteIdsForRole("host-binding-review"),
        notes: [
          ...hostBindingReviewUnit.rationale,
          "Generated from the adapter-local shadow realization plan.",
        ],
      },
    },
    notes: [
      "This bundle is bounded to the current canonical War3 feature and current TSTL skeleton seams.",
      "It is review-only draft output and does not authorize writes into a live host project.",
    ],
  };
}

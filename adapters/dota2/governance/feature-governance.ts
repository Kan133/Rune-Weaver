import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import {
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
} from "../cross-feature/index.js";

import {
  GRANT_ONLY_PROVIDER_EXPORT_SEAM_ID,
  getDota2ReusableAssetAdmissionStatus,
} from "./reusable-assets.js";

type Dota2ReusableAssetAdmissionStatus = ReturnType<typeof getDota2ReusableAssetAdmissionStatus>;

interface Dota2ReusableAssetAdmissionSummary {
  assetId: string;
  status: Dota2ReusableAssetAdmissionStatus;
}

export interface Dota2FeatureGovernanceSummary {
  implementationStrategy?: RuneWeaverFeatureRecord["implementationStrategy"];
  maturity?: RuneWeaverFeatureRecord["maturity"];
  commitOutcome?: RuneWeaverFeatureRecord["commitDecision"] extends infer T
    ? T extends { outcome?: infer U }
      ? U
      : never
    : never;
  familyAdmissions: Dota2ReusableAssetAdmissionSummary[];
  patternAdmissions: Dota2ReusableAssetAdmissionSummary[];
  seamAdmissions: Dota2ReusableAssetAdmissionSummary[];
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function hasGrantablePrimaryHeroAbilityExport(
  feature: Pick<RuneWeaverFeatureRecord, "featureContract" | "dependencyEdges">,
): boolean {
  return (feature.featureContract?.exports || []).some(
    (surface) =>
      surface.kind === "capability"
      && surface.id === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
      && surface.contractId === DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  );
}

function hasGrantablePrimaryHeroAbilityConsumerBinding(
  feature: Pick<RuneWeaverFeatureRecord, "featureContract" | "dependencyEdges">,
): boolean {
  const consumesGrantableSurface = (feature.featureContract?.consumes || []).some(
    (surface) =>
      surface.kind === "capability"
      && surface.id === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
      && surface.contractId === DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  );
  const dependsOnGrantableSurface = (feature.dependencyEdges || []).some(
    (edge) =>
      edge.targetSurfaceId === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
      && edge.targetContractId === DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  );

  return consumesGrantableSurface || dependsOnGrantableSurface;
}

function collectSeamAdmissions(
  feature: Pick<RuneWeaverFeatureRecord, "featureContract" | "dependencyEdges">,
): Dota2ReusableAssetAdmissionSummary[] {
  const seamIds = dedupe([
    hasGrantablePrimaryHeroAbilityExport(feature) || hasGrantablePrimaryHeroAbilityConsumerBinding(feature)
      ? GRANT_ONLY_PROVIDER_EXPORT_SEAM_ID
      : "",
  ]);

  return summarizeReusableAssetAdmissions(seamIds, "seam");
}

function summarizeReusableAssetAdmissions(
  assetIds: string[],
  assetType: "pattern" | "family" | "seam",
): Dota2ReusableAssetAdmissionSummary[] {
  return assetIds.map((assetId) => ({
    assetId,
    status: getDota2ReusableAssetAdmissionStatus(assetType, assetId),
  }));
}

export function summarizeDota2FeatureGovernance(
  feature: Pick<
    RuneWeaverFeatureRecord,
    "modules" | "selectedPatterns" | "implementationStrategy" | "maturity" | "commitDecision" | "featureContract" | "dependencyEdges"
  >,
): Dota2FeatureGovernanceSummary {
  const familyIds = dedupe(
    (feature.modules || [])
      .map((module) => module.familyId)
      .filter((value): value is string => typeof value === "string"),
  );
  const patternIds = dedupe(feature.selectedPatterns || []);

  return {
    implementationStrategy: feature.implementationStrategy,
    maturity: feature.maturity,
    commitOutcome: feature.commitDecision?.outcome,
    familyAdmissions: summarizeReusableAssetAdmissions(familyIds, "family"),
    patternAdmissions: summarizeReusableAssetAdmissions(patternIds, "pattern"),
    seamAdmissions: collectSeamAdmissions(feature),
  };
}

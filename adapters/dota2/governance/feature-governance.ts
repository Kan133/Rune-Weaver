import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";

import { getDota2ReusableAssetAdmissionStatus } from "./reusable-assets.js";

export interface Dota2FeatureGovernanceSummary {
  implementationStrategy?: RuneWeaverFeatureRecord["implementationStrategy"];
  maturity?: RuneWeaverFeatureRecord["maturity"];
  commitOutcome?: RuneWeaverFeatureRecord["commitDecision"] extends infer T
    ? T extends { outcome?: infer U }
      ? U
      : never
    : never;
  familyAdmissions: Array<{ assetId: string; status: string }>;
  patternAdmissions: Array<{ assetId: string; status: string }>;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function summarizeDota2FeatureGovernance(
  feature: Pick<RuneWeaverFeatureRecord, "modules" | "selectedPatterns" | "implementationStrategy" | "maturity" | "commitDecision">,
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
    familyAdmissions: familyIds.map((assetId) => ({
      assetId,
      status: getDota2ReusableAssetAdmissionStatus("family", assetId),
    })),
    patternAdmissions: patternIds.map((assetId) => ({
      assetId,
      status: getDota2ReusableAssetAdmissionStatus("pattern", assetId),
    })),
  };
}

import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/types.js";
import {
  buildDota2GovernanceReadModel,
  buildDota2RepairabilityReadModel,
  type Dota2GovernanceFeatureReadModel,
  type Dota2GovernanceRepairabilityKind,
} from "../../../../adapters/dota2/governance/read-model.js";

function formatAdmissions(
  title: string,
  entries: Array<{ assetId: string; status: string }>,
): string {
  return `${title}: ${entries.length > 0 ? entries.map((entry) => `${entry.assetId}(${entry.status})`).join(", ") : "(none)"}`;
}

export function buildDota2FeatureGovernanceReadModel(
  feature: RuneWeaverFeatureRecord,
): Dota2GovernanceFeatureReadModel {
  return buildDota2GovernanceReadModel({
    hostRoot: "",
    features: [feature],
  }).features[0]!;
}

export function formatDota2FeatureGovernanceReadModel(
  model: Dota2GovernanceFeatureReadModel,
): string[] {
  return [
    `Feature Lifecycle: ${model.status} @ r${model.revision}`,
    `Lifecycle Governance: strategy=${model.lifecycle.implementationStrategy || "(unknown)"} | maturity=${model.lifecycle.maturity || "(unknown)"} | commit=${model.lifecycle.commitOutcome || "(unknown)"} | review=${model.lifecycle.requiresReview ? "yes" : "no"}`,
    `Grounding Governance: ${model.grounding.status} | verified=${model.grounding.verifiedSymbolCount} | allowlisted=${model.grounding.allowlistedSymbolCount} | weak=${model.grounding.weakSymbolCount} | unknown=${model.grounding.unknownSymbolCount} | review=${model.grounding.reviewRequired ? "yes" : "no"}`,
    `Repairability: ${model.repairability.status} | ${model.repairability.summary}`,
    formatAdmissions("Family Admissions", model.reusableGovernance.familyAdmissions),
    formatAdmissions("Pattern Admissions", model.reusableGovernance.patternAdmissions),
    formatAdmissions("Seam Admissions", model.reusableGovernance.seamAdmissions),
    `Product Verdict: ${model.productVerdict.label}${model.productVerdict.reasons.length > 0 ? ` | ${model.productVerdict.reasons.join(" | ")}` : ""}`,
  ];
}

export {
  buildDota2RepairabilityReadModel,
  type Dota2GovernanceRepairabilityKind,
};

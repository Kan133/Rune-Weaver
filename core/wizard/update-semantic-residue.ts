import type {
  CurrentFeatureTruth,
  IntentSchema,
  UpdateGovernanceDecisions,
  UpdateOpenSemanticResidueItem,
  UpdatePromptRawFact,
} from "../schema/types.js";

function dedupeResidue(items: UpdateOpenSemanticResidueItem[]): UpdateOpenSemanticResidueItem[] {
  const seen = new Set<string>();
  const deduped: UpdateOpenSemanticResidueItem[] = [];
  for (const item of items) {
    const key = `${item.id}::${item.summary}::${(item.targetPaths || []).join(",")}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function hasPromptFact(
  promptFacts: UpdatePromptRawFact[],
  code: string,
): boolean {
  return promptFacts.some((fact) => fact.code === code && fact.value === true);
}

export function deriveUpdateOpenSemanticResidue(input: {
  requestedChange: IntentSchema;
  currentFeatureTruth: CurrentFeatureTruth;
  promptFacts: UpdatePromptRawFact[];
  governanceDecisions: UpdateGovernanceDecisions;
}): UpdateOpenSemanticResidueItem[] {
  const items: UpdateOpenSemanticResidueItem[] = [];
  const { requestedChange, currentFeatureTruth, promptFacts, governanceDecisions } = input;

  for (const uncertainty of requestedChange.uncertainties || []) {
    items.push({
      id: uncertainty.id,
      summary: uncertainty.summary,
      class:
        uncertainty.affects.includes("intent") || uncertainty.affects.includes("realization")
          ? "governance_relevant"
          : uncertainty.affects.includes("blueprint") || uncertainty.affects.includes("pattern")
            ? "blueprint_relevant"
            : "bounded_detail_only",
      affects: [...uncertainty.affects],
      severity: uncertainty.severity,
      disposition: "open",
    });
  }

  for (const blocker of governanceDecisions.mutationAuthority.value.blocked) {
    const isCrossFeatureTargetBlocker =
      blocker.path.includes("composition.dependencies.target")
      && (
        hasPromptFact(promptFacts, "prompt.update.cross_feature")
        || governanceDecisions.scope.value === "cross_feature_mutation"
      );
    const isPersistenceBlocker = blocker.path.includes("external-system");
    items.push({
      id: isCrossFeatureTargetBlocker
        ? "update.cross_feature.target_missing"
        : isPersistenceBlocker
          ? "update.persistence.scope_missing"
          : `blocked:${blocker.path}`,
      summary: blocker.reason,
      class:
        blocker.impact === "structural-open-contract"
          ? "governance_relevant"
          : "blueprint_relevant",
      affects:
        blocker.impact === "structural-open-contract"
          ? ["intent", "blueprint"]
          : ["blueprint"],
      severity: "high",
      disposition: "open",
      targetPaths: [blocker.path],
    });
  }

  if (
    hasPromptFact(promptFacts, "prompt.inventory.enabled")
    && typeof requestedChange.selection?.inventory?.capacity !== "number"
    && typeof currentFeatureTruth.boundedFields.inventoryCapacity !== "number"
  ) {
    items.push({
      id: "bounded.inventory.capacity_missing",
      summary: "Inventory semantics are present, but no bounded capacity was resolved.",
      class: "bounded_detail_only",
      affects: ["intent"],
      severity: "medium",
      disposition: "open",
      targetPaths: ["selection.inventory.capacity"],
    });
  }

  if (
    hasPromptFact(promptFacts, "prompt.update.realization_rewrite")
    && governanceDecisions.scope.value !== "rewrite"
  ) {
    items.push({
      id: "update.scope.realization_signal",
      summary: "Prompt mentions realization-level concerns, but governance did not fully collapse them into a rewrite scope.",
      class: "governance_relevant",
      affects: ["intent", "realization"],
      severity: "medium",
      disposition: "open",
      targetPaths: ["composition", "integrations"],
    });
  }

  return dedupeResidue(items);
}

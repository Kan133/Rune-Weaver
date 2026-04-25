import type {
  CurrentFeatureTruth,
  GovernedUpdateSchema,
  UpdateSemanticAnalysis,
  UpdateIntent,
} from "../schema/types.js";

function dedupeStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
}

function dedupeDeltaItems<T extends { path: string; kind: string; summary: string; newValue?: unknown; oldValue?: unknown }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    const key = `${item.path}::${item.kind}::${item.summary}::${JSON.stringify(item.newValue)}::${JSON.stringify(item.oldValue)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

export function createPreserveDeltaFromTruth(
  currentFeatureTruth: CurrentFeatureTruth,
): UpdateIntent["delta"]["preserve"] {
  const backbone = currentFeatureTruth.preservedModuleBackbone.map((item) => ({
    path: `backbone.${item}`,
    kind: "composition" as const,
    summary: `Preserve module backbone ${item}.`,
  }));
  const invariants = currentFeatureTruth.preservedInvariants.map((item, index) => ({
    path: `invariant.${index + 1}`,
    kind: "generic" as const,
    summary: `Preserve invariant: ${item}`,
  }));
  return dedupeDeltaItems([...backbone, ...invariants]);
}

export function projectUpdateDelta(input: {
  currentFeatureTruth: CurrentFeatureTruth;
  governedChange: GovernedUpdateSchema;
  semanticAnalysis: UpdateSemanticAnalysis;
}): UpdateIntent["delta"] {
  const preserve = createPreserveDeltaFromTruth(input.currentFeatureTruth);
  const mutationAuthority = input.semanticAnalysis.governanceDecisions.mutationAuthority.value;

  return {
    preserve,
    add: dedupeDeltaItems(mutationAuthority.add),
    modify: dedupeDeltaItems(mutationAuthority.modify),
    remove: dedupeDeltaItems(mutationAuthority.remove),
  };
}

export function collectGovernedMutationPaths(updateIntent: UpdateIntent): string[] {
  const authority = updateIntent.semanticAnalysis?.governanceDecisions.mutationAuthority.value;
  if (!authority) {
    return [];
  }
  return dedupeStrings([
    ...authority.add.map((item) => item.path),
    ...authority.modify.map((item) => item.path),
    ...authority.remove.map((item) => item.path),
  ]);
}

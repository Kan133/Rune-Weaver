import type {
  IntentSchema,
  RelationCandidate,
  WorkspaceFeatureHandle,
  WorkspaceSemanticContext,
} from "../schema/types.js";

interface RelationResolverInput {
  rawText: string;
  schema: IntentSchema;
  workspaceSemanticContext?: WorkspaceSemanticContext;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeCandidates(candidates: RelationCandidate[]): RelationCandidate[] {
  const byFeature = new Map<string, RelationCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.relation}:${candidate.targetFeatureId}`;
    const existing = byFeature.get(key);
    if (!existing || candidate.score > existing.score) {
      byFeature.set(key, candidate);
    }
  }

  return Array.from(byFeature.values());
}

function promptHasRelationCue(rawText: string, schema: IntentSchema): boolean {
  const text = normalizeText(rawText);
  return (
    (schema.composition?.dependencies || []).length > 0
    || (schema.outcomes?.operations || []).includes("grant-feature")
    || /(?:existing|current|previous|that|this)\s+(?:feature|system|skill)/.test(text)
    || /(?:reuse|extend|hook into|integrate|sync with|depends on|grant)/.test(text)
    || /(?:现有|已有|之前那个|之前的|那个|这个)\s*(?:功能|系统|技能|仓库|背包|抽卡|抽取)/.test(text)
    || /(?:联动|耦合|复用|扩展|依赖|同步|接到|挂到|连到|授予)/.test(text)
  );
}

function inferRelationKind(rawText: string, schema: IntentSchema): RelationCandidate["relation"] {
  const text = normalizeText(rawText);
  const dependencyRelation = (schema.composition?.dependencies || []).find((dependency) => dependency.relation)?.relation;
  if (dependencyRelation) {
    return dependencyRelation;
  }
  if ((schema.outcomes?.operations || []).includes("grant-feature") || /授予|grant/.test(text)) {
    return "grants";
  }
  if (/extends?|扩展/.test(text)) {
    return "extends";
  }
  if (/conflict|冲突/.test(text)) {
    return "conflicts-with";
  }
  if (/depends on|依赖/.test(text)) {
    return "depends-on";
  }
  if (/writes?|写入|接管/.test(text)) {
    return "writes";
  }
  if (/triggers?|触发/.test(text)) {
    return "triggers";
  }
  if (/reads?|读取/.test(text)) {
    return "reads";
  }
  return "syncs-with";
}

function matchAlias(normalizedPrompt: string, alias: string): boolean {
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias || normalizedAlias.length < 2) {
    return false;
  }
  return normalizedPrompt.includes(normalizedAlias);
}

function scoreHandleMatch(
  handle: WorkspaceFeatureHandle,
  rawText: string,
  schema: IntentSchema,
): RelationCandidate[] {
  const normalizedPrompt = normalizeText(rawText);
  const relationCue = promptHasRelationCue(rawText, schema);
  const relation = inferRelationKind(rawText, schema);
  const candidates: RelationCandidate[] = [];

  for (const alias of handle.aliases) {
    if (!matchAlias(normalizedPrompt, alias)) {
      continue;
    }

    let score = 0.5;
    if (normalizeText(alias) === normalizeText(handle.featureId)) {
      score += 0.25;
    }
    if (handle.featureName && normalizeText(alias) === normalizeText(handle.featureName)) {
      score += 0.15;
    }
    if (relationCue) {
      score += 0.1;
    }
    if (handle.sourceBacked) {
      score += 0.05;
    }

    const boundedScore = Math.min(0.99, score);
    candidates.push({
      relation,
      targetFeatureId: handle.featureId,
      ...(handle.featureName ? { featureName: handle.featureName } : {}),
      matchedAlias: alias,
      confidence: boundedScore >= 0.85 ? "high" : boundedScore >= 0.65 ? "medium" : "low",
      score: boundedScore,
      reason: `Prompt references workspace feature alias "${alias}".`,
    });
  }

  return candidates;
}

export function resolveRelationCandidates(
  input: RelationResolverInput,
): RelationCandidate[] {
  const context = input.workspaceSemanticContext;
  if (!context || context.features.length === 0) {
    return [];
  }

  const relationCue = promptHasRelationCue(input.rawText, input.schema);
  const candidates = dedupeCandidates(
    context.features.flatMap((handle) => scoreHandleMatch(handle, input.rawText, input.schema)),
  ).sort((left, right) => right.score - left.score);

  if (candidates.length === 0) {
    return [];
  }

  if (!relationCue && candidates[0].confidence !== "high") {
    return [];
  }

  return candidates.slice(0, 5);
}

export function hasAmbiguousRelationCandidates(candidates: RelationCandidate[] | undefined): boolean {
  if (!candidates || candidates.length < 2) {
    return false;
  }

  return Math.abs(candidates[0].score - candidates[1].score) <= 0.12;
}

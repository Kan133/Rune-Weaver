import type {
  IntentSchema,
  RelationCandidate,
  ValidationIssue,
  WizardClarificationPlan,
} from "../schema/types";
import { hasAmbiguousRelationCandidates } from "./relation-resolver";
import {
  extractIntentSchemaGovernanceCore,
  extractIntentSchemaGovernanceDecisions,
  stableIntentGovernanceDecisionFingerprint,
} from "./intent-schema.js";

export interface WizardStabilityCorpusEntry {
  id: string;
  prompt: string;
  groupId?: string;
}

export interface WizardStabilityRunRecord {
  run: number;
  valid: boolean;
  schema: IntentSchema;
  issues: ValidationIssue[];
  clarificationPlan?: WizardClarificationPlan;
  relationCandidates?: RelationCandidate[];
}

export interface WizardStabilityPromptResult {
  entry: WizardStabilityCorpusEntry;
  runs: WizardStabilityRunRecord[];
}

export interface WizardSemanticCoverageSummary {
  keyPreservationRate: number;
  countPreservationRate: number;
  distancePreservationRate: number;
  durationPreservationRate: number;
  relationPreservationRate: number;
  governanceConsistencyRate: number;
  negativeConstraintPreservationRate: number;
  spuriousUiRate: number;
  spuriousPersistenceRate: number;
  spuriousCrossFeatureRate: number;
  inappropriateClarificationRate: number;
}

export interface WizardStabilityPromptSummary {
  id: string;
  prompt: string;
  groupId?: string;
  runCount: number;
  validRate: number;
  intentKindDistribution: Record<string, number>;
  issueCodeDistribution: Record<string, number>;
  normalizedMechanicsVariantCount: number;
  coreFacetVariantCount: number;
  governanceCoreVariantCount: number;
  uncertaintyCountDistribution: Record<string, number>;
  clarificationPlanRate: number;
  clarificationQuestionCountDistribution: Record<string, number>;
  relationHitRate: number;
  ambiguousRelationRate: number;
  semanticCoverage: WizardSemanticCoverageSummary;
}

export interface WizardStabilityGroupSummary {
  groupId: string;
  promptIds: string[];
  governanceCoreVariantCount: number;
  intentKindVariantCount: number;
  blockedLikeVariantCount: number;
}

export interface WizardStabilityArtifact {
  version: string;
  generatedAt: string;
  workflow: "wizard";
  model?: string;
  temperature: number;
  runCount: number;
  corpus: WizardStabilityCorpusEntry[];
  promptResults: WizardStabilityPromptResult[];
  promptSummaries: WizardStabilityPromptSummary[];
  groupSummaries: WizardStabilityGroupSummary[];
  summary: {
    validRate: number;
    intentKindDistribution: Record<string, number>;
    issueCodeDistribution: Record<string, number>;
    uncertaintyCountDistribution: Record<string, number>;
    clarificationPlanRate: number;
    clarificationQuestionCountDistribution: Record<string, number>;
    relationHitRate: number;
    ambiguousRelationRate: number;
    semanticCoverage: WizardSemanticCoverageSummary;
  };
}

export const DEFAULT_WIZARD_STABILITY_CORPUS: WizardStabilityCorpusEntry[] = [
  {
    id: "dash-skill",
    prompt: "Create a skill that moves the player 400 units toward the cursor when G is pressed.",
  },
  {
    id: "selection-modal",
    prompt: "Press F4 to open a repeatable three-choice selection modal and immediately apply the selected result.",
  },
  {
    id: "weighted-draw",
    prompt:
      "Press F4 to draw 3 weighted candidates from a pool, show rarity on cards, let the player pick 1, apply the chosen result immediately, and never show selected items again.",
  },
  {
    id: "passive-aura",
    prompt: "Create a passive aura that gives nearby allies bonus armor.",
  },
  {
    id: "cross-feature-persist",
    prompt: "After drawing one option, grant another feature and persist it across matches.",
  },
  {
    id: "no-ui-fire-dash",
    prompt: "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离。",
  },
  {
    id: "unfamiliar-mechanic",
    prompt: "Make a system where collected echoes tune a reality lattice and change future pulses.",
  },
  {
    id: "ambiguous-targeting",
    prompt: "Make a skill that launches a wave and does something special when it lands.",
  },
];

interface PromptExpectations {
  key?: string;
  count?: number;
  distance?: number;
  durationSeconds?: number;
  requiresUi: boolean;
  forbidsUi: boolean;
  requiresPersistence: boolean;
  persistent: boolean;
  forbidsPersistence: boolean;
  requiresCrossFeature: boolean;
  crossFeature: boolean;
  forbidsCrossFeature: boolean;
}

interface SemanticCoverageAccumulator {
  keyChecks: number;
  keyHits: number;
  countChecks: number;
  countHits: number;
  distanceChecks: number;
  distanceHits: number;
  durationChecks: number;
  durationHits: number;
  relationChecks: number;
  relationHits: number;
  governanceConsistencyChecks: number;
  governanceConsistencyHits: number;
  negativeConstraintChecks: number;
  negativeConstraintHits: number;
  spuriousUiChecks: number;
  spuriousUiHits: number;
  spuriousPersistenceChecks: number;
  spuriousPersistenceHits: number;
  spuriousCrossFeatureChecks: number;
  spuriousCrossFeatureHits: number;
  inappropriateClarificationChecks: number;
  inappropriateClarificationHits: number;
}

export function parseWizardStabilityCorpus(raw: string): WizardStabilityCorpusEntry[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Wizard stability corpus must be a JSON array.");
  }

  const corpus = parsed
    .map((entry, index) => normalizeCorpusEntry(entry, index))
    .filter((entry): entry is WizardStabilityCorpusEntry => !!entry);

  if (corpus.length === 0) {
    throw new Error("Wizard stability corpus is empty after normalization.");
  }

  return corpus;
}

export function buildWizardStabilityArtifact(input: {
  model?: string;
  temperature: number;
  runCount: number;
  corpus: WizardStabilityCorpusEntry[];
  promptResults: WizardStabilityPromptResult[];
}): WizardStabilityArtifact {
  const promptSummaries = input.promptResults.map(summarizePromptResult);
  const groupSummaries = summarizeGroups(input.promptResults);

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    workflow: "wizard",
    model: input.model,
    temperature: input.temperature,
    runCount: input.runCount,
    corpus: input.corpus,
    promptResults: input.promptResults,
    promptSummaries,
    groupSummaries,
    summary: summarizeAggregate(input.promptResults),
  };
}

export function summarizePromptResult(result: WizardStabilityPromptResult): WizardStabilityPromptSummary {
  const intentKindDistribution = countBy(result.runs.map((run) => run.schema.classification.intentKind || "unknown"));
  const issueCodeDistribution = countBy(
    result.runs.flatMap((run) => run.issues.map((issue) => `${issue.severity}:${issue.code}`)),
  );
  const normalizedMechanicsVariantCount = countVariants(
    result.runs.map((run) => stableStringify(run.schema.normalizedMechanics)),
  );
  const coreFacetVariantCount = countVariants(
    result.runs.map((run) => stableStringify(collectCoreFacetSummary(run.schema))),
  );
  const governanceCoreVariantCount = countVariants(
    result.runs.map((run) => stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(run.schema))),
  );
  const uncertaintyCountDistribution = countBy(
    result.runs.map((run) => String(run.schema.uncertainties?.length ?? 0)),
  );
  const clarificationQuestionCountDistribution = countBy(
    result.runs.map((run) => String(run.clarificationPlan?.questions.length ?? 0)),
  );
  const clarificationPlanRate = result.runs.length === 0
    ? 0
    : result.runs.filter((run) => (run.clarificationPlan?.questions.length ?? 0) > 0).length / result.runs.length;
  const relationHitRate = result.runs.length === 0
    ? 0
    : result.runs.filter((run) => (run.relationCandidates?.length ?? 0) > 0).length / result.runs.length;
  const ambiguousRelationRate = result.runs.length === 0
    ? 0
    : result.runs.filter((run) => hasAmbiguousRelationCandidates(run.relationCandidates)).length / result.runs.length;

  return {
    id: result.entry.id,
    prompt: result.entry.prompt,
    groupId: result.entry.groupId,
    runCount: result.runs.length,
    validRate: result.runs.length === 0
      ? 0
      : result.runs.filter((run) => run.valid).length / result.runs.length,
    intentKindDistribution,
    issueCodeDistribution,
    normalizedMechanicsVariantCount,
    coreFacetVariantCount,
    governanceCoreVariantCount,
    uncertaintyCountDistribution,
    clarificationPlanRate,
    clarificationQuestionCountDistribution,
    relationHitRate,
    ambiguousRelationRate,
    semanticCoverage: summarizeSemanticCoverage(result),
  };
}

export function summarizeAggregate(results: WizardStabilityPromptResult[]): WizardStabilityArtifact["summary"] {
  const allRuns = results.flatMap((result) => result.runs);
  return {
    validRate: allRuns.length === 0 ? 0 : allRuns.filter((run) => run.valid).length / allRuns.length,
    intentKindDistribution: countBy(allRuns.map((run) => run.schema.classification.intentKind || "unknown")),
    issueCodeDistribution: countBy(
      allRuns.flatMap((run) => run.issues.map((issue) => `${issue.severity}:${issue.code}`)),
    ),
    uncertaintyCountDistribution: countBy(allRuns.map((run) => String(run.schema.uncertainties?.length ?? 0))),
    clarificationPlanRate: allRuns.length === 0
      ? 0
      : allRuns.filter((run) => (run.clarificationPlan?.questions.length ?? 0) > 0).length / allRuns.length,
    clarificationQuestionCountDistribution: countBy(
      allRuns.map((run) => String(run.clarificationPlan?.questions.length ?? 0)),
    ),
    relationHitRate: allRuns.length === 0
      ? 0
      : allRuns.filter((run) => (run.relationCandidates?.length ?? 0) > 0).length / allRuns.length,
    ambiguousRelationRate: allRuns.length === 0
      ? 0
      : allRuns.filter((run) => hasAmbiguousRelationCandidates(run.relationCandidates)).length / allRuns.length,
    semanticCoverage: summarizeAggregateSemanticCoverage(results),
  };
}

export function collectCoreFacetSummary(schema: IntentSchema): Record<string, unknown> {
  return {
    interaction: schema.interaction,
    targeting: schema.targeting,
    timing: schema.timing,
    spatial: schema.spatial,
    selection: schema.selection
      ? {
          source: schema.selection.source,
          choiceMode: schema.selection.choiceMode,
          choiceCount: schema.selection.choiceCount,
          mode: schema.selection.mode,
          cardinality: schema.selection.cardinality,
          repeatability: schema.selection.repeatability,
          commitment: schema.selection.commitment,
        }
      : undefined,
    outcomes: schema.outcomes,
    contentModel: schema.contentModel,
    composition: schema.composition,
  };
}

function summarizeGroups(results: WizardStabilityPromptResult[]): WizardStabilityGroupSummary[] {
  const grouped = new Map<string, WizardStabilityPromptResult[]>();

  for (const result of results) {
    if (!result.entry.groupId) {
      continue;
    }

    const current = grouped.get(result.entry.groupId) || [];
    current.push(result);
    grouped.set(result.entry.groupId, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, groupResults]) => {
      const runs = groupResults.flatMap((result) => result.runs);
      return {
        groupId,
        promptIds: groupResults.map((result) => result.entry.id),
        governanceCoreVariantCount: countVariants(
          runs.map((run) =>
            stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(run.schema))),
        ),
        intentKindVariantCount: countVariants(
          runs.map((run) => run.schema.classification.intentKind || "unknown"),
        ),
        blockedLikeVariantCount: countVariants(
          runs.map((run) => stableStringify(collectBlockedLikeSummary(run.schema, run.issues))),
        ),
      };
    });
}

function normalizeCorpusEntry(entry: unknown, index: number): WizardStabilityCorpusEntry | undefined {
  if (typeof entry === "string" && entry.trim()) {
    return {
      id: `prompt_${index + 1}`,
      prompt: entry,
    };
  }

  if (typeof entry !== "object" || entry === null) {
    return undefined;
  }

  const raw = entry as Record<string, unknown>;
  const prompt = typeof raw.prompt === "string" && raw.prompt.trim() ? raw.prompt : undefined;
  if (!prompt) {
    return undefined;
  }

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `prompt_${index + 1}`,
    prompt,
    groupId: typeof raw.groupId === "string" && raw.groupId.trim() ? raw.groupId : undefined,
  };
}

function summarizeSemanticCoverage(result: WizardStabilityPromptResult): WizardSemanticCoverageSummary {
  const accumulator = accumulateSemanticCoverage(result);
  return finalizeSemanticCoverage(accumulator);
}

function summarizeAggregateSemanticCoverage(results: WizardStabilityPromptResult[]): WizardSemanticCoverageSummary {
  const totals = results.reduce<SemanticCoverageAccumulator>(
    (acc, result) => mergeCoverage(acc, accumulateSemanticCoverage(result)),
    createEmptyCoverageAccumulator(),
  );
  return finalizeSemanticCoverage(totals);
}

function accumulateSemanticCoverage(result: WizardStabilityPromptResult): SemanticCoverageAccumulator {
  const expectations = extractPromptExpectations(result.entry.prompt);
  const accumulator = createEmptyCoverageAccumulator();
  const governanceFingerprints = result.runs.map((run) =>
    stableIntentGovernanceDecisionFingerprint(extractIntentSchemaGovernanceDecisions(run.schema)));
  const majorityGovernanceFingerprint = selectMajorityVariant(governanceFingerprints);

  result.runs.forEach((run, index) => {
    const hasUi = hasUiSemantics(run.schema);
    const hasPersistence = hasPersistenceSemantics(run.schema);
    const hasCrossFeature = hasCrossFeatureSemantics(run.schema);

    accumulator.governanceConsistencyChecks += 1;
    if (majorityGovernanceFingerprint && governanceFingerprints[index] === majorityGovernanceFingerprint) {
      accumulator.governanceConsistencyHits += 1;
    }

    if (expectations.key) {
      accumulator.keyChecks += 1;
      if (hasKeyPreservation(run.schema, expectations.key)) {
        accumulator.keyHits += 1;
      }
    }

    if (typeof expectations.count === "number") {
      accumulator.countChecks += 1;
      if (hasCountPreservation(run.schema, expectations.count)) {
        accumulator.countHits += 1;
      }
    }

    if (typeof expectations.distance === "number") {
      accumulator.distanceChecks += 1;
      if (hasDistancePreservation(run.schema, expectations.distance)) {
        accumulator.distanceHits += 1;
      }
    }

    if (typeof expectations.durationSeconds === "number" || expectations.persistent) {
      accumulator.durationChecks += 1;
      if (hasDurationPreservation(run.schema, expectations)) {
        accumulator.durationHits += 1;
      }
    }

    if (expectations.crossFeature || expectations.persistent) {
      accumulator.relationChecks += 1;
      if (hasRelationPreservation(run.schema, expectations)) {
        accumulator.relationHits += 1;
      }
    }

    if (expectations.forbidsUi || expectations.forbidsPersistence || expectations.forbidsCrossFeature) {
      accumulator.negativeConstraintChecks += 1;
      if (
        (!expectations.forbidsUi || !hasUi) &&
        (!expectations.forbidsPersistence || !hasPersistence) &&
        (!expectations.forbidsCrossFeature || !hasCrossFeature)
      ) {
        accumulator.negativeConstraintHits += 1;
      }
    }

    if (!expectations.requiresUi) {
      accumulator.spuriousUiChecks += 1;
      if (hasUi) {
        accumulator.spuriousUiHits += 1;
      }
    }

    if (!expectations.requiresPersistence) {
      accumulator.spuriousPersistenceChecks += 1;
      if (hasPersistence) {
        accumulator.spuriousPersistenceHits += 1;
      }
    }

    if (!expectations.requiresCrossFeature) {
      accumulator.spuriousCrossFeatureChecks += 1;
      if (hasCrossFeature) {
        accumulator.spuriousCrossFeatureHits += 1;
      }
    }

    accumulator.inappropriateClarificationChecks += 1;
    if (isInappropriateClarification(result.entry.prompt, run.schema, run.clarificationPlan)) {
      accumulator.inappropriateClarificationHits += 1;
    }
  });

  return accumulator;
}

function createEmptyCoverageAccumulator(): SemanticCoverageAccumulator {
  return {
    keyChecks: 0,
    keyHits: 0,
    countChecks: 0,
    countHits: 0,
    distanceChecks: 0,
    distanceHits: 0,
    durationChecks: 0,
    durationHits: 0,
    relationChecks: 0,
    relationHits: 0,
    governanceConsistencyChecks: 0,
    governanceConsistencyHits: 0,
    negativeConstraintChecks: 0,
    negativeConstraintHits: 0,
    spuriousUiChecks: 0,
    spuriousUiHits: 0,
    spuriousPersistenceChecks: 0,
    spuriousPersistenceHits: 0,
    spuriousCrossFeatureChecks: 0,
    spuriousCrossFeatureHits: 0,
    inappropriateClarificationChecks: 0,
    inappropriateClarificationHits: 0,
  };
}

function mergeCoverage(
  left: SemanticCoverageAccumulator,
  right: SemanticCoverageAccumulator,
): SemanticCoverageAccumulator {
  return {
    keyChecks: left.keyChecks + right.keyChecks,
    keyHits: left.keyHits + right.keyHits,
    countChecks: left.countChecks + right.countChecks,
    countHits: left.countHits + right.countHits,
    distanceChecks: left.distanceChecks + right.distanceChecks,
    distanceHits: left.distanceHits + right.distanceHits,
    durationChecks: left.durationChecks + right.durationChecks,
    durationHits: left.durationHits + right.durationHits,
    relationChecks: left.relationChecks + right.relationChecks,
    relationHits: left.relationHits + right.relationHits,
    governanceConsistencyChecks: left.governanceConsistencyChecks + right.governanceConsistencyChecks,
    governanceConsistencyHits: left.governanceConsistencyHits + right.governanceConsistencyHits,
    negativeConstraintChecks: left.negativeConstraintChecks + right.negativeConstraintChecks,
    negativeConstraintHits: left.negativeConstraintHits + right.negativeConstraintHits,
    spuriousUiChecks: left.spuriousUiChecks + right.spuriousUiChecks,
    spuriousUiHits: left.spuriousUiHits + right.spuriousUiHits,
    spuriousPersistenceChecks: left.spuriousPersistenceChecks + right.spuriousPersistenceChecks,
    spuriousPersistenceHits: left.spuriousPersistenceHits + right.spuriousPersistenceHits,
    spuriousCrossFeatureChecks: left.spuriousCrossFeatureChecks + right.spuriousCrossFeatureChecks,
    spuriousCrossFeatureHits: left.spuriousCrossFeatureHits + right.spuriousCrossFeatureHits,
    inappropriateClarificationChecks: left.inappropriateClarificationChecks + right.inappropriateClarificationChecks,
    inappropriateClarificationHits: left.inappropriateClarificationHits + right.inappropriateClarificationHits,
  };
}

function finalizeSemanticCoverage(accumulator: SemanticCoverageAccumulator): WizardSemanticCoverageSummary {
  return {
    keyPreservationRate: ratio(accumulator.keyHits, accumulator.keyChecks),
    countPreservationRate: ratio(accumulator.countHits, accumulator.countChecks),
    distancePreservationRate: ratio(accumulator.distanceHits, accumulator.distanceChecks),
    durationPreservationRate: ratio(accumulator.durationHits, accumulator.durationChecks),
    relationPreservationRate: ratio(accumulator.relationHits, accumulator.relationChecks),
    governanceConsistencyRate: ratio(
      accumulator.governanceConsistencyHits,
      accumulator.governanceConsistencyChecks,
    ),
    negativeConstraintPreservationRate: ratio(
      accumulator.negativeConstraintHits,
      accumulator.negativeConstraintChecks,
    ),
    spuriousUiRate: ratio(accumulator.spuriousUiHits, accumulator.spuriousUiChecks),
    spuriousPersistenceRate: ratio(
      accumulator.spuriousPersistenceHits,
      accumulator.spuriousPersistenceChecks,
    ),
    spuriousCrossFeatureRate: ratio(
      accumulator.spuriousCrossFeatureHits,
      accumulator.spuriousCrossFeatureChecks,
    ),
    inappropriateClarificationRate: ratio(
      accumulator.inappropriateClarificationHits,
      accumulator.inappropriateClarificationChecks,
    ),
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

function extractPromptExpectations(prompt: string): PromptExpectations {
  const lower = prompt.toLowerCase();
  const forbidsUi =
    /(?:不要|不需要|无需|without|no|do not)\s*(?:ui|界面|modal|panel)/iu.test(prompt);
  const forbidsPersistence =
    /(?:不要|不需要|无需|without|no|do not)\s*(?:persist|persistent|持久|持久化|跨局)/iu.test(prompt);
  const forbidsCrossFeature =
    /(?:不要|不需要|无需|without|no|do not)\s*(?:cross[\s-]?feature|跨\s*feature|跨功能|另一个功能|另一个技能)/iu.test(prompt);
  const requiresUi =
    !forbidsUi &&
    (
      /\b(?:ui|modal|panel|cards?)\b/i.test(prompt) ||
      /界面|面板|弹窗|卡牌/.test(prompt)
    );
  const requiresPersistence =
    !forbidsPersistence &&
    (lower.includes("persist") || lower.includes("persistent") || lower.includes("across matches") || lower.includes("持久") || lower.includes("跨局"));
  const requiresCrossFeature =
    !forbidsCrossFeature &&
    (
      lower.includes("cross-feature") ||
      lower.includes("cross feature") ||
      lower.includes("grant another feature") ||
      lower.includes("另一个技能") ||
      lower.includes("授予另一个")
    );
  const keyMatch =
    prompt.match(/(?:press|hit|tap|bind|when)\s+(f\d+|[a-z])/i) ||
    prompt.match(/按(?:下)?\s*(f\d+|[a-z])/i);
  const countMatch =
    prompt.match(/(\d+)\s*(?:choices?|options?|candidates?|选项|候选)/i) ||
    prompt.match(/(\d+)\s*选\s*1/i);
  const distanceMatch =
    prompt.match(/(\d+(?:\.\d+)?)\s*(?:units?|码|yards?)/i) ||
    prompt.match(/(?:distance|range|距离|冲刺距离)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  const durationMatch = prompt.match(/(?:duration|持续(?:时间)?)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);

  return {
    key: keyMatch?.[1]?.toUpperCase(),
    count: parseNumber(countMatch?.[1]),
    distance: parseNumber(distanceMatch?.[1]),
    durationSeconds: parseNumber(durationMatch?.[1]),
    requiresUi,
    forbidsUi,
    requiresPersistence,
    persistent: requiresPersistence,
    forbidsPersistence,
    requiresCrossFeature,
    crossFeature: requiresCrossFeature,
    forbidsCrossFeature,
  };
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasKeyPreservation(schema: IntentSchema, expectedKey: string): boolean {
  const activationKey = (schema.interaction?.activations || []).find((activation) => activation.kind === "key")?.input;
  const parameterKey = typeof schema.parameters?.triggerKey === "string" ? schema.parameters.triggerKey : undefined;
  return activationKey?.toUpperCase() === expectedKey || parameterKey?.toUpperCase() === expectedKey;
}

function hasCountPreservation(schema: IntentSchema, expectedCount: number): boolean {
  return schema.selection?.choiceCount === expectedCount
    || schema.parameters?.choiceCount === expectedCount;
}

function hasDistancePreservation(schema: IntentSchema, expectedDistance: number): boolean {
  return schema.spatial?.motion?.distance === expectedDistance
    || schema.parameters?.distance === expectedDistance;
}

function hasDurationPreservation(schema: IntentSchema, expectations: PromptExpectations): boolean {
  if (expectations.persistent) {
    return schema.timing?.duration?.kind === "persistent"
      || (schema.stateModel?.states || []).some((state) => state.lifetime === "persistent")
      || (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "external-system");
  }

  if (typeof expectations.durationSeconds === "number") {
    return schema.timing?.duration?.seconds === expectations.durationSeconds
      || schema.timing?.cooldownSeconds === expectations.durationSeconds
      || schema.parameters?.durationSeconds === expectations.durationSeconds;
  }

  return true;
}

function hasRelationPreservation(schema: IntentSchema, expectations: PromptExpectations): boolean {
  let ok = true;

  if (expectations.crossFeature) {
    ok = ok && (
      (schema.outcomes?.operations || []).includes("grant-feature")
      || (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")
    );
  }

  if (expectations.persistent) {
    ok = ok && (
      schema.timing?.duration?.kind === "persistent"
      || (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "external-system")
      || (schema.stateModel?.states || []).some((state) => state.lifetime === "persistent")
    );
  }

  return ok;
}

function hasUiSemantics(schema: IntentSchema): boolean {
  return Boolean(
    schema.uiRequirements?.needed ||
    (schema.uiRequirements?.surfaces?.length ?? 0) > 0 ||
    schema.normalizedMechanics?.uiModal,
  );
}

function hasPersistenceSemantics(schema: IntentSchema): boolean {
  return (
    schema.timing?.duration?.kind === "persistent" ||
    (schema.stateModel?.states || []).some((state) => state.lifetime === "persistent") ||
    (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "external-system")
  );
}

function hasCrossFeatureSemantics(schema: IntentSchema): boolean {
  return (
    (schema.outcomes?.operations || []).includes("grant-feature") ||
    (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature")
  );
}

function isInappropriateClarification(
  prompt: string,
  schema: IntentSchema,
  clarificationPlan: WizardClarificationPlan | undefined,
): boolean {
  if (!clarificationPlan || clarificationPlan.questions.length === 0) {
    return false;
  }

  const lower = prompt.toLowerCase();
  const hasActiveTriggerGap =
    !lower.includes("passive") &&
    !lower.includes("被动") &&
    !(schema.interaction?.activations || []).length;
  const hasCrossFeatureGap =
    ((schema.outcomes?.operations || []).includes("grant-feature")
      || (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature"))
    && !(schema.composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature" && !!dependency.target);
  const hasPersistenceGap =
    (lower.includes("persist") || lower.includes("across matches") || lower.includes("持久") || lower.includes("跨局"))
    && !(
      schema.timing?.duration?.kind === "persistent"
      || (schema.stateModel?.states || []).some((state) => state.lifetime === "persistent" && !!state.owner)
      || (schema.composition?.dependencies || []).some((dependency) => dependency.kind === "external-system" && !!dependency.target)
    );
  const hasSpatialGap =
    Boolean(schema.spatial?.motion || schema.spatial?.emission || (schema.outcomes?.operations || []).includes("move"))
    && !schema.targeting?.subject
    && !schema.targeting?.selector
    && !lower.includes("cursor")
    && !lower.includes("mouse")
    && !lower.includes("鼠标");

  return !(hasActiveTriggerGap || hasCrossFeatureGap || hasPersistenceGap || hasSpatialGap);
}

function collectBlockedLikeSummary(
  schema: IntentSchema,
  issues: ValidationIssue[],
): Record<string, unknown> {
  return {
    hasErrorIssue: issues.some((issue) => issue.severity === "error"),
    persistent: hasPersistenceSemantics(schema),
    crossFeature: hasCrossFeatureSemantics(schema),
    externalWrites: (schema.composition?.dependencies || []).some((dependency) =>
      dependency.kind === "external-system" && dependency.relation === "writes"
    ),
  };
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function countVariants(values: string[]): number {
  return new Set(values).size;
}

function selectMajorityVariant(values: string[]): string | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const distribution = countBy(values);
  return Object.entries(distribution)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
}

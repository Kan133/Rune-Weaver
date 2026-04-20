import type {
  HostDescriptor,
  IntentSchema,
  IntentUncertainty,
  LegacyRequiredClarification,
} from "../../schema/types.js";
import type {
  IntentGovernanceDecisions,
  IntentOpenSemanticResidue,
  IntentOpenSemanticResidueItem,
  IntentRawFacts,
} from "./semantic-analysis.js";
import type { PromptSemanticHints } from "./shared.js";
import { normalizeStringArray } from "./shared.js";

interface DeriveIntentOpenSemanticResidueInput {
  candidate: Partial<IntentSchema>;
  rawFacts: IntentRawFacts;
  rawText: string;
  host: HostDescriptor;
  promptHints: PromptSemanticHints;
  governanceDecisions: IntentGovernanceDecisions;
}

export function deriveIntentOpenSemanticResidue(
  input: DeriveIntentOpenSemanticResidueInput,
): IntentOpenSemanticResidue {
  const directUncertainties = normalizeSchemaUncertaintyResidue(input.candidate.uncertainties);
  const legacyResidue = normalizeLegacyClarificationResidue(input.candidate);
  const assumedResidue = normalizeResolvedAssumptionResidue(
    input.candidate.resolvedAssumptions,
    input.promptHints,
  );

  return dedupeOpenSemanticResidue([...directUncertainties, ...legacyResidue, ...assumedResidue]);
}

export function projectOpenSemanticResidueToUncertainties(
  openSemanticResidue: IntentOpenSemanticResidue,
): IntentUncertainty[] | undefined {
  const uncertainties = openSemanticResidue
    .filter((item) => item.disposition === "open")
    .map((item) => ({
      id: item.id,
      summary: item.summary,
      affects: item.affects,
      severity: item.severity,
    }));

  return uncertainties.length > 0 ? uncertainties : undefined;
}

export function projectOpenSemanticResidueToResolvedAssumptions(
  openSemanticResidue: IntentOpenSemanticResidue,
): string[] {
  const assumptions = new Set(
    openSemanticResidue
      .filter((item) => item.disposition === "assumed")
      .map((item) => item.summary),
  );

  return [...assumptions];
}

export function appendResolvedAssumptionResidue(
  openSemanticResidue: IntentOpenSemanticResidue,
  input: {
    summaries: string[];
    class?: IntentOpenSemanticResidueItem["class"];
    affects?: IntentUncertainty["affects"];
    severity?: IntentUncertainty["severity"];
    source?: IntentOpenSemanticResidueItem["source"];
  },
): IntentOpenSemanticResidue {
  const next = [...openSemanticResidue];
  for (const summary of input.summaries) {
    if (!summary.trim()) {
      continue;
    }
    next.push({
      id: `assumption_${sanitizeResidueId(summary)}`,
      summary,
      class: input.class ?? "governance_relevant",
      disposition: "assumed",
      affects: input.affects ?? ["intent", "blueprint"],
      severity: input.severity ?? "low",
      source: input.source ?? "canonicalization",
    });
  }
  return dedupeOpenSemanticResidue(next);
}

export function suppressBoundedCandidateDrawOpenSemanticResidue(
  openSemanticResidue: IntentOpenSemanticResidue,
  promptHints: PromptSemanticHints,
): IntentOpenSemanticResidue {
  const filtered = openSemanticResidue.filter((item) => {
    if (item.class !== "bounded_detail_only") {
      return true;
    }
    return !shouldSuppressBoundedCandidateDrawDetailSummary(item.summary, promptHints);
  });

  return dedupeOpenSemanticResidue(filtered);
}

export function shouldSuppressBoundedCandidateDrawDetailSummary(
  value: unknown,
  promptHints: PromptSemanticHints,
): boolean {
  if (typeof value !== "string" || !isStructuredCandidateDrawPrompt(promptHints)) {
    return false;
  }

  const text = value.toLowerCase();
  const isPersistenceNoise =
    !promptHints.explicitRuntimePersistence &&
    /persist|persistence|cross match|cross-session|current session|current match|session-only|跨局|跨会话|持久|本局|当前会话/iu.test(
      value,
    );
  const isPoolDepletionNoise =
    /remaining.*less than|fewer than|pool exhaustion|exhaustion|show fewer|reset the pool|剩余.*少于|候选池耗尽|重置候选池/iu.test(
      value,
    );
  const isCatalogNoise =
    /specific|concrete|catalog|candidate contents|effect definitions|what are the choices|which choices|which options|object definitions|具体效果|具体内容|候选池内容|图标|名称|描述|label|icon|copy/iu.test(
      value,
    );
  const isPresentationNoise =
    promptHints.uiSurface &&
    /modal|dialog|panel|popup|presentation|surface|界面形式|弹窗|面板|窗口/iu.test(text);

  return isPersistenceNoise || isPoolDepletionNoise || isCatalogNoise || isPresentationNoise;
}

function normalizeSchemaUncertaintyResidue(
  uncertainties: unknown,
): IntentOpenSemanticResidue {
  if (!Array.isArray(uncertainties)) {
    return [];
  }

  return uncertainties
    .filter((item): item is IntentUncertainty => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `uncertainty_${index}`,
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified uncertainty",
      class: classifyResidue(item.summary, item.affects),
      disposition: "open" as const,
      affects: Array.isArray(item.affects) && item.affects.length > 0 ? item.affects : ["intent"],
      severity: item.severity === "low" || item.severity === "medium" || item.severity === "high" ? item.severity : "medium",
      source: "schema.uncertainty" as const,
    }));
}

function normalizeLegacyClarificationResidue(candidate: Partial<IntentSchema>): IntentOpenSemanticResidue {
  const legacyCandidate = candidate as Partial<IntentSchema> & {
    requiredClarifications?: unknown;
    openQuestions?: unknown;
  };
  const legacyClarifications = Array.isArray(legacyCandidate.requiredClarifications)
    ? legacyCandidate.requiredClarifications
    : [];
  const legacyOpenQuestions = normalizeStringArray(legacyCandidate.openQuestions) || [];

  const clarifications = legacyClarifications
    .filter((item): item is LegacyRequiredClarification => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `legacy_clarification_${index + 1}`,
      summary:
        typeof item.question === "string" && item.question.trim()
          ? item.question.trim()
          : "Legacy clarification signal retained as open semantic residue.",
      class: classifyResidue(item.question, ["intent", "blueprint"]),
      disposition: "open" as const,
      affects: ["intent", "blueprint"] as IntentUncertainty["affects"],
      severity: item.blocksFinalization === true ? ("high" as const) : ("medium" as const),
      source: "legacy.required_clarification" as const,
    }));

  const openQuestionResidue = legacyOpenQuestions.map((question, index) => ({
    id: `legacy_open_question_${index + 1}`,
    summary: question,
    class: classifyResidue(question, ["intent"]),
    disposition: "open" as const,
    affects: ["intent"] as IntentUncertainty["affects"],
    severity: "medium" as const,
    source: "legacy.open_question" as const,
  }));

  return [...clarifications, ...openQuestionResidue];
}

function normalizeResolvedAssumptionResidue(
  value: unknown,
  promptHints: PromptSemanticHints,
): IntentOpenSemanticResidue {
  const normalized = new Set(normalizeStringArray(value) || []);

  if (promptHints.noRepeatAfterSelection && !promptHints.explicitRuntimePersistence) {
    normalized.add(
      "Selection no-repeat history defaults to session scope unless persistence is explicitly requested.",
    );
  }

  return [...normalized].map((summary) => ({
    id: `assumption_${sanitizeResidueId(summary)}`,
    summary,
    class: classifyResidue(summary, ["intent", "blueprint"]),
    disposition: "assumed" as const,
    affects: ["intent", "blueprint"] as IntentUncertainty["affects"],
    severity: "low" as const,
    source: "schema.resolved_assumption" as const,
  }));
}

function dedupeOpenSemanticResidue(
  openSemanticResidue: IntentOpenSemanticResidue,
): IntentOpenSemanticResidue {
  const deduped = new Map<string, IntentOpenSemanticResidueItem>();
  for (const item of openSemanticResidue) {
    const key = [
      item.summary,
      item.class,
      item.disposition,
      item.affects.join(","),
      item.severity,
    ].join("::");
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }
  return [...deduped.values()];
}

function classifyResidue(
  summary: unknown,
  affects: IntentUncertainty["affects"] | undefined,
): IntentOpenSemanticResidueItem["class"] {
  if (typeof summary !== "string" || !summary.trim()) {
    return "governance_relevant";
  }

  if (isBoundedVariabilityQuestion(summary)) {
    return "bounded_detail_only";
  }

  if (
    /storage|owner|ownership|persistent|persist|cross-feature|cross feature|external|integrate|which system|state model|boundary|保存|存储|持久|跨功能|外部系统|归属|边界/iu.test(
      summary,
    )
  ) {
    return "governance_relevant";
  }

  if (affects?.includes("blueprint") || affects?.includes("pattern") || affects?.includes("realization")) {
    return "blueprint_relevant";
  }

  return "governance_relevant";
}

function isStructuredCandidateDrawPrompt(promptHints: PromptSemanticHints): boolean {
  return Boolean(
    promptHints.candidatePool &&
      promptHints.playerChoice &&
      (promptHints.candidateCount || promptHints.weightedDraw || promptHints.rarityDisplay),
  );
}

function sanitizeResidueId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "semantic_residue";
}

function isBoundedVariabilityQuestion(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const question = value.toLowerCase();
  const detailHints = [
    "specific",
    "specific choices",
    "specific options",
    "catalog",
    "list",
    "names",
    "descriptions",
    "available choices",
    "available options",
    "choice list",
    "option list",
    "exact effects",
    "selected result",
    "result list",
    "effect list",
    "icon",
    "resource path",
    "attribute values",
    "stat values",
    "what are the three choices",
    "which choices",
    "which options",
    "具体内容",
    "具体数值",
    "具体选项",
    "候选池内容",
    "效果列表",
    "列表",
    "名称",
    "描述",
    "图标",
    "资源路径",
    "属性",
    "选项",
    "结果",
    "效果",
  ];
  const architectureHints = [
    "what triggers",
    "trigger condition",
    "which system",
    "integrate with",
    "state model",
    "persistence",
    "owner",
    "ownership",
    "boundary",
    "跨功能",
    "系统",
    "状态模型",
    "持久",
    "归属",
    "边界",
  ];

  const mentionsDetail = detailHints.some((hint) => question.includes(hint));
  const mentionsArchitecture = architectureHints.some((hint) => question.includes(hint));

  return mentionsDetail && !mentionsArchitecture;
}

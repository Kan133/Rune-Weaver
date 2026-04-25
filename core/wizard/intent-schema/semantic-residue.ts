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
  IntentSemanticSurface,
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
  const derivedSelectionResidue = deriveSelectionFlowResolutionResidue(input);

  return dedupeOpenSemanticResidue([
    ...directUncertainties,
    ...legacyResidue,
    ...assumedResidue,
    ...derivedSelectionResidue,
  ]);
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
    surface?: IntentOpenSemanticResidueItem["surface"];
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
      surface: input.surface ?? classifyResidueSurface(summary, input.affects),
      class: input.class ?? "governance_relevant",
      disposition: "assumed",
      affects: input.affects ?? ["intent", "blueprint"],
      severity: input.severity ?? "low",
      targetPaths: resolveResidueTargetPaths(input.surface ?? classifyResidueSurface(summary, input.affects)),
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
    /specific|concrete|catalog|candidate contents|candidate subset|eligible subset|effect definitions|what are the choices|which choices|which options|which items|native items|native d(?:ota)? ?2 items|object definitions|具体效果|具体内容|候选池内容|候选范围|候选子集|哪些装备|哪些物品|图标|名称|描述|label|icon|copy/iu.test(
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
      surface: classifyResidueSurface(item.summary, item.affects),
      class: classifyResidue(item.summary, item.affects),
      disposition: "open" as const,
      affects: Array.isArray(item.affects) && item.affects.length > 0 ? item.affects : ["intent"],
      severity: item.severity === "low" || item.severity === "medium" || item.severity === "high" ? item.severity : "medium",
      targetPaths: resolveResidueTargetPaths(classifyResidueSurface(item.summary, item.affects)),
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
      surface: classifyResidueSurface(item.question, ["intent", "blueprint"]),
      class: classifyResidue(item.question, ["intent", "blueprint"]),
      disposition: "open" as const,
      affects: ["intent", "blueprint"] as IntentUncertainty["affects"],
      severity: item.blocksFinalization === true ? ("high" as const) : ("medium" as const),
      targetPaths: resolveResidueTargetPaths(
        classifyResidueSurface(item.question, ["intent", "blueprint"]),
      ),
      source: "legacy.required_clarification" as const,
    }));

  const openQuestionResidue = legacyOpenQuestions.map((question, index) => ({
    id: `legacy_open_question_${index + 1}`,
    summary: question,
    surface: classifyResidueSurface(question, ["intent"]),
    class: classifyResidue(question, ["intent"]),
    disposition: "open" as const,
    affects: ["intent"] as IntentUncertainty["affects"],
    severity: "medium" as const,
    targetPaths: resolveResidueTargetPaths(classifyResidueSurface(question, ["intent"])),
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
    surface: classifyResidueSurface(summary, ["intent", "blueprint"]),
    class: classifyResidue(summary, ["intent", "blueprint"]),
    disposition: "assumed" as const,
    affects: ["intent", "blueprint"] as IntentUncertainty["affects"],
    severity: "low" as const,
    targetPaths: resolveResidueTargetPaths(
      classifyResidueSurface(summary, ["intent", "blueprint"]),
    ),
    source: "schema.resolved_assumption" as const,
  }));
}

function deriveSelectionFlowResolutionResidue(
  input: DeriveIntentOpenSemanticResidueInput,
): IntentOpenSemanticResidue {
  const resolutionMode = input.candidate.selection?.resolutionMode ?? input.promptHints.selectionResolutionMode;
  if (resolutionMode === "player_confirm_single" || resolutionMode === "reveal_batch_immediate") {
    return [];
  }

  const choiceCount =
    input.promptHints.candidateCount ??
    input.candidate.selection?.choiceCount;
  const presentsMultipleCandidates = (choiceCount || 0) > 1;
  const revealPresentationPressure = Boolean(
    input.promptHints.candidatePool &&
      input.promptHints.uiSurface &&
      (presentsMultipleCandidates || input.promptHints.weightedDraw || input.promptHints.rarityDisplay),
  );
  const explicitPlayerChoice = Boolean(
    input.promptHints.playerChoice ||
      input.candidate.selection?.choiceMode === "user-chosen" ||
      input.candidate.selection?.choiceMode === "hybrid" ||
      input.candidate.selection?.cardinality === "single",
  );

  if (!revealPresentationPressure || explicitPlayerChoice) {
    return [];
  }

  return [{
    id: "clarify_selection_resolution_mode",
    summary:
      "The request shows multiple candidates but does not say whether the player chooses one or the revealed results resolve immediately without a follow-up choice.",
    surface: "selection_flow",
    class: "governance_relevant",
    disposition: "open",
    affects: ["intent", "blueprint"],
    severity: "high",
    targetPaths: resolveResidueTargetPaths("selection_flow"),
    source: "canonicalization",
  }];
}

function dedupeOpenSemanticResidue(
  openSemanticResidue: IntentOpenSemanticResidue,
): IntentOpenSemanticResidue {
  const deduped = new Map<string, IntentOpenSemanticResidueItem>();
  for (const item of openSemanticResidue) {
    const key = [
      item.summary,
      item.surface,
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

  const surface = classifyResidueSurface(summary, affects);
  if (surface === "candidate_catalog" || surface === "ui_presentation" || surface === "effect_profile") {
    return "blueprint_relevant";
  }

  if (surface === "activation" || surface === "state_scope" || surface === "composition_boundary") {
    return "governance_relevant";
  }

  if (
    /storage|owner|ownership|owned|session-local|persistent|persist|cross-feature|cross feature|external|integrate|which system|state model|boundary|binding|target[- ]resolution|provider|consumer|保存|存储|持久|跨功能|外部系统|归属|边界|绑定|目标解析|提供者|消费者/iu.test(
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

function classifyResidueSurface(
  summary: unknown,
  affects: IntentUncertainty["affects"] | undefined,
): IntentSemanticSurface {
  if (typeof summary === "string" && summary.trim()) {
    if (
      /(?:是否需要玩家|whether the player|after the shown|展示.*(?:选择|选中)|choose.*display|display.*choose|select.*display|仅作展示|only display|informational only|follow[- ]up choice|从中选择一张|选择一张)/iu.test(
        summary,
      )
    ) {
      return "selection_flow";
    }

    if (/(?:trigger|activation|hotkey|key binding|按键|触发键|触发方式)/iu.test(summary)) {
      return "activation";
    }

    if (/(?:cross-feature|cross feature|external system|target feature|target[- ]resolution|deferred binding|binding target|compose|composition|bridge|grant|integration|provider|consumer|跨功能|外部系统|目标功能|目标解析|绑定|提供者|消费者|边界)/iu.test(summary)) {
      return "composition_boundary";
    }

    if (/(?:persist|persistence|owner|ownership|owned|session-local|storage|state scope|session scope|inventory capacity|slot|保存|持久|归属|存储|状态范围|库存|仓库)/iu.test(summary)) {
      return "state_scope";
    }

    if (/(?:catalog|candidate contents|candidate catalog|candidate subset|eligible subset|option list|which items|native items|native d(?:ota)? ?2 items|icon|label|copy|description|object definition|候选池内容|候选目录|候选范围|候选子集|图标|名称|描述)/iu.test(summary)) {
      return "candidate_catalog";
    }

    if (/(?:modal|panel|dialog|ui surface|presentation|layout|window|界面|面板|弹窗|展示)/iu.test(summary)) {
      return "ui_presentation";
    }

    if (/(?:effect|effect profile|consequence|reward outcome|visual effect|appearance|rarity effect|占位效果|效果|后果|外观)/iu.test(summary)) {
      return "effect_profile";
    }
  }

  if (typeof summary === "string" && /(?:exact probability|exact probability weights|probability weights|weight values|exact weights|drop rate values|drop rates|odds values|rarity weights|tier weights|rarity odds|权重|加权|概率|几率|掉率|稀有度权重|品级权重)/iu.test(summary)) {
    return "candidate_catalog";
  }

  if (affects?.includes("blueprint") || affects?.includes("pattern") || affects?.includes("realization")) {
    return "selection_flow";
  }

  return "state_scope";
}

function resolveResidueTargetPaths(
  surface: IntentSemanticSurface,
): string[] {
  switch (surface) {
    case "activation":
      return ["interaction.activations", "flow.triggerSummary", "requirements.typed"];
    case "candidate_catalog":
      return ["contentModel.collections", "selection", "parameters"];
    case "ui_presentation":
      return ["uiRequirements", "integrations.expectedBindings"];
    case "effect_profile":
      return ["effects", "outcomes", "parameters"];
    case "state_scope":
      return ["stateModel.states", "composition.dependencies"];
    case "composition_boundary":
      return ["composition.dependencies", "integrations.expectedBindings"];
    case "selection_flow":
    default:
      return ["selection", "flow", "requirements.typed"];
  }
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
    "exact probability",
    "exact numeric probability",
    "exact probability weights",
    "probability weights",
    "exact numeric weighting values",
    "exact numeric probability or weighting values",
    "weighting values",
    "weight values",
    "drop rate values",
    "exact visual treatment",
    "exact visual treatments",
    "visual treatment",
    "visual treatments",
    "appearance treatment",
    "appearance details",
    "rarity visuals",
    "rarity appearance",
    "specific",
    "specific choices",
    "specific options",
    "candidate subset",
    "eligible subset",
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
    "which items",
    "native items",
    "native dota 2 items",
    "candidate range",
    "pool range",
    "duplicate candidates",
    "duplicate options",
    "duplicate choices",
    "same draw",
    "same set of draws",
    "same set of 3 draws",
    "within one draw",
    "within the same draw",
    "具体内容",
    "具体数值",
    "具体选项",
    "候选池内容",
    "候选范围",
    "候选子集",
    "装备范围",
    "物品范围",
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
    "权重数值",
    "概率数值",
    "掉率数值",
    "视觉方案",
    "视觉表现细节",
    "外观细节",
    "稀有度外观",
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

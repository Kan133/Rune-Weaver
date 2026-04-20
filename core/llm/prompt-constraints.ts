import type {
  CurrentFeatureContext,
  PromptConstraintBundle,
} from "../schema/types.js";
import type { WizardClarificationAnswer } from "../wizard/types.js";

function getPreservedModuleBackbone(currentFeatureContext: CurrentFeatureContext): string[] {
  if ((currentFeatureContext.sourceBackedInvariantRoles || []).length > 0) {
    return currentFeatureContext.sourceBackedInvariantRoles || [];
  }
  if ((currentFeatureContext.preservedModuleBackbone || []).length > 0) {
    return currentFeatureContext.preservedModuleBackbone;
  }
  return currentFeatureContext.admittedSkeleton || [];
}

export interface PromptConstraintExtractorInput {
  rawText: string;
  clarificationTranscript?: WizardClarificationAnswer[];
  currentFeatureContext?: CurrentFeatureContext;
}

interface ScalarMatch {
  key: string;
  value: string | number | boolean;
}

const EXTERNAL_PERSISTENCE_SIGNAL_PATTERN =
  /save|saved|save system|profile|profile storage|account|account profile|account storage|external storage|external system|database|nettable|across matches|across sessions|cross[- ]match|cross[- ]session|outside the current match|outside the current session|跨局|跨会话|存档|账号档案|外部存储|外部系统/iu;
const NAMED_EXTERNAL_PERSISTENCE_BOUNDARY_PATTERN =
  /save system|profile|profile storage|account|account profile|account storage|external storage|external system|database|nettable|存档系统|账号档案|外部存储|外部系统/iu;

const NEGATIVE_CONSTRAINT_PATTERNS: Array<{ summary: string; pattern: RegExp }> = [
  { summary: "Do not add UI, modal, panel, or presentation surfaces unless explicitly required.", pattern: /(?:不要|不需要|无需|别|不能|no|without)\s*(?:任何)?\s*(?:ui|界面|面板|弹窗|窗口|modal|panel|presentation)/iu },
  { summary: "Do not add inventory or stored-selection mechanics unless explicitly required.", pattern: /(?:不要|不需要|无需|别|不能|no|without)\s*(?:任何)?\s*(?:inventory|库存|仓库|背包|persistent panel|panel inventory)/iu },
  { summary: "Do not add persistence or cross-match storage unless explicitly required.", pattern: /(?:不要|不需要|无需|别|不能|no|without)\s*(?:任何)?\s*(?:persist|persistence|persistent|持久|持久化|跨局|跨会话|storage)/iu },
  { summary: "Do not add cross-feature coupling unless explicitly required.", pattern: /(?:不要|不需要|无需|别|不能|no|without)\s*(?:任何)?\s*(?:cross[\s-]?feature|跨\s*feature|跨功能|另一个功能|另一个特性)/iu },
  { summary: "Do not add bridge ownership or new runtime/UI wiring unless explicitly required.", pattern: /(?:不要|不需要|无需|别|不能|no|without)\s*(?:任何)?\s*(?:bridge|wiring|接线|桥接|同步)/iu },
  { summary: "Do not add client or UI code; keep the implementation server-only.", pattern: /(?:仅|只|only)\s*(?:server|服务端|lua)(?:[^\\n]{0,20})(?:不要|不需要|without)?\s*(?:ui|client|panorama|界面)?/iu },
  { summary: "Do not add Lua runtime logic beyond KV-owned configuration.", pattern: /(?:仅|只|only)\s*(?:kv|keyvalues|配置)(?:[^\\n]{0,20})(?:不要|不需要|without)?\s*(?:lua|runtime|script|脚本)?/iu },
];

const OPEN_GAP_PATTERNS: Array<{ summary: string; pattern: RegExp; requiresPositiveContext?: boolean }> = [
  {
    summary: "The request leaves mechanic details intentionally open and needs best-effort semantic preservation.",
    pattern: /\b(?:something|somehow|special|future pulses|reality lattice)\b|某种|特殊效果|未来脉冲/iu,
  },
  {
    summary: "Persistence is requested but the exact storage boundary is not named.",
    pattern: /(?:persist|persistent|across matches|持久|跨局)(?![\s\S]{0,40}(?:nettable|storage|数据库|save))/iu,
    requiresPositiveContext: true,
  },
  {
    summary: "Cross-feature behavior is requested but the exact target feature is not named.",
    pattern: /(?:grant another feature|cross[\s-]?feature|另一个功能|另一个技能)(?![\s\S]{0,40}(?:feature[_\s-]?[a-z0-9]+))/iu,
    requiresPositiveContext: true,
  },
];

function addUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function withGlobalFlag(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
}

function isNegatedOccurrence(sourceText: string, index: number): boolean {
  const prefix = sourceText.slice(Math.max(0, index - 24), index).toLowerCase();
  return /(?:不要|不需要|无需|别|不能|禁止|no|without|do not)\s*(?:any\s*)?$/iu.test(prefix);
}

function hasExternalPersistenceSignal(sourceText: string): boolean {
  return EXTERNAL_PERSISTENCE_SIGNAL_PATTERN.test(sourceText);
}

function hasNamedExternalPersistenceBoundary(sourceText: string): boolean {
  return NAMED_EXTERNAL_PERSISTENCE_BOUNDARY_PATTERN.test(sourceText);
}

function collectOpenSemanticGaps(sourceText: string): string[] {
  const openSemanticGaps: string[] = [];

  for (const pattern of OPEN_GAP_PATTERNS) {
    const matcher = withGlobalFlag(pattern.pattern);
    let matched = false;
    for (const match of sourceText.matchAll(matcher)) {
      const matchIndex = match.index ?? -1;
      if (pattern.requiresPositiveContext && matchIndex >= 0 && isNegatedOccurrence(sourceText, matchIndex)) {
        continue;
      }
      if (
        pattern.summary === "Persistence is requested but the exact storage boundary is not named." &&
        (!hasExternalPersistenceSignal(sourceText) || hasNamedExternalPersistenceBoundary(sourceText))
      ) {
        continue;
      }
      matched = true;
      break;
    }
    if (matched) {
      addUnique(openSemanticGaps, pattern.summary);
    }
  }

  return openSemanticGaps;
}

function collectSourceText(input: PromptConstraintExtractorInput): string {
  const transcript = (input.clarificationTranscript || [])
    .map((item) => `${item.question}: ${item.answer}`)
    .join("\n");
  const workspaceHints = input.currentFeatureContext
    ? [
        `featureId=${input.currentFeatureContext.featureId}`,
        `preservedModuleBackbone=${getPreservedModuleBackbone(input.currentFeatureContext).join(", ")}`,
        `preservedInvariants=${input.currentFeatureContext.preservedInvariants.join(", ")}`,
      ].join("\n")
    : "";

  return [input.rawText, transcript, workspaceHints].filter(Boolean).join("\n");
}

function extractExactScalars(rawText: string): Record<string, string | number | boolean> {
  const scalars: ScalarMatch[] = [];
  const push = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined) {
      scalars.push({ key, value });
    }
  };

  const keyMatch =
    rawText.match(/(?:press|hit|tap|bind|when)\s+(f\d+|[a-z])/i) ||
    rawText.match(/按(?:下)?\s*(f\d+|[a-z])/i) ||
    rawText.match(/触发键[：:\s]*(f\d+|[a-z])/i);
  push("triggerKey", keyMatch?.[1]?.toUpperCase());

  const choiceCountMatch =
    rawText.match(/(\d+)\s*(?:choices?|options?|candidates?|选项|候选)/i) ||
    rawText.match(/(?:draw|show|open|生成)\s*(\d+)/i);
  push("choiceCount", choiceCountMatch?.[1] ? Number(choiceCountMatch[1]) : undefined);

  const commitCountMatch =
    rawText.match(/pick\s*(\d+)/i) ||
    rawText.match(/choose\s*(\d+)/i) ||
    rawText.match(/选\s*(\d+)/i);
  push("commitCount", commitCountMatch?.[1] ? Number(commitCountMatch[1]) : undefined);

  const distanceMatch =
    rawText.match(/(\d+(?:\.\d+)?)\s*(?:units?|码|yards?)/i) ||
    rawText.match(/(?:distance|range|距离|冲刺距离)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("distance", distanceMatch?.[1] ? Number(distanceMatch[1]) : undefined);

  const durationMatch = rawText.match(/(?:duration|持续(?:时间)?)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("durationSeconds", durationMatch?.[1] ? Number(durationMatch[1]) : undefined);

  const cooldownMatch = rawText.match(/(?:cooldown|冷却(?:时间)?)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("cooldown", cooldownMatch?.[1] ? Number(cooldownMatch[1]) : undefined);

  const manaMatch = rawText.match(/(?:mana(?:\s*cost)?|蓝耗)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("manaCost", manaMatch?.[1] ? Number(manaMatch[1]) : undefined);

  const hpMatch = rawText.match(/(?:hp|health|生命值)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("health", hpMatch?.[1] ? Number(hpMatch[1]) : undefined);

  const strMatch = rawText.match(/(?:strength|力量)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("strength", strMatch?.[1] ? Number(strMatch[1]) : undefined);

  const agiMatch = rawText.match(/(?:agility|敏捷)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("agility", agiMatch?.[1] ? Number(agiMatch[1]) : undefined);

  const intMatch = rawText.match(/(?:intelligence|智力)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("intelligence", intMatch?.[1] ? Number(intMatch[1]) : undefined);

  const attackMatch = rawText.match(/(?:attack|攻击)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  push("attack", attackMatch?.[1] ? Number(attackMatch[1]) : undefined);

  if (/(?:不要|不需要|无需|without|no|do not)\s*(?:ui|界面|modal|panel)/iu.test(rawText)) {
    push("uiRequired", false);
  }
  if (/(?:不要|不需要|无需|without|no|do not)\s*(?:persist|persistent|持久|持久化|跨局)/iu.test(rawText)) {
    push("persistent", false);
  }

  return scalars.reduce<Record<string, string | number | boolean>>((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}

export function extractPromptConstraints(input: PromptConstraintExtractorInput): PromptConstraintBundle {
  const mustPreserve: string[] = [];
  const mustNotAdd: string[] = [];
  const openSemanticGaps: string[] = [];
  const sourceText = collectSourceText(input);

  for (const pattern of NEGATIVE_CONSTRAINT_PATTERNS) {
    if (pattern.pattern.test(sourceText)) {
      addUnique(mustNotAdd, pattern.summary);
    }
  }

  collectOpenSemanticGaps(sourceText).forEach((item) => addUnique(openSemanticGaps, item));

  if (input.currentFeatureContext) {
    addUnique(
      mustPreserve,
      `Preserve unspecified existing behavior for feature '${input.currentFeatureContext.featureId}'.`,
    );
    for (const invariant of input.currentFeatureContext.preservedInvariants) {
      addUnique(mustPreserve, invariant);
    }
    const preservedModuleBackbone = getPreservedModuleBackbone(input.currentFeatureContext);
    if (preservedModuleBackbone.length > 0) {
      addUnique(
        mustPreserve,
        `Keep the preserved module backbone stable unless the user explicitly asks for a rewrite: ${preservedModuleBackbone.join(", ")}`,
      );
    }
  }

  for (const answer of input.clarificationTranscript || []) {
    addUnique(mustPreserve, `Preserve confirmed clarification: ${answer.answer}`);
  }

  return {
    mustPreserve,
    mustNotAdd,
    exactScalars: extractExactScalars(sourceText),
    openSemanticGaps,
  };
}

export function renderPromptConstraints(bundle: PromptConstraintBundle): string {
  const lines: string[] = [];

  if (bundle.mustPreserve.length > 0) {
    lines.push("Must preserve:");
    for (const item of bundle.mustPreserve) {
      lines.push(`- ${item}`);
    }
  }

  if (bundle.mustNotAdd.length > 0) {
    lines.push("Must not add:");
    for (const item of bundle.mustNotAdd) {
      lines.push(`- ${item}`);
    }
  }

  const scalarEntries = Object.entries(bundle.exactScalars);
  if (scalarEntries.length > 0) {
    lines.push("Exact scalar facts:");
    for (const [key, value] of scalarEntries) {
      lines.push(`- ${key}: ${String(value)}`);
    }
  }

  if (bundle.openSemanticGaps.length > 0) {
    lines.push("Open semantic gaps to preserve honestly:");
    for (const item of bundle.openSemanticGaps) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join("\n");
}

export function detectMustNotAddViolations(
  content: string,
  bundle: PromptConstraintBundle,
): string[] {
  const violations: string[] = [];
  const lower = content.toLowerCase();

  if (bundle.exactScalars.uiRequired === false) {
    if (
      /<panel|<label|\bpanel\b|\blabel\b|selection_modal|inventory_panel|modal|panorama/.test(lower)
    ) {
      violations.push("Output introduced UI-facing content even though the prompt forbids UI.");
    }
  }

  if (bundle.exactScalars.persistent === false) {
    if (
      /persistent|customnettables|save|storage|database|nettable|across matches|跨局|持久/.test(lower)
    ) {
      violations.push("Output introduced persistence/storage semantics even though the prompt forbids persistence.");
    }
  }

  if (bundle.mustNotAdd.some((item) => /cross-feature/i.test(item))) {
    if (/grant[-_\s]?feature|cross[-_\s]?feature|other feature|另一个功能|另一个技能/.test(lower)) {
      violations.push("Output introduced cross-feature coupling even though the prompt forbids it.");
    }
  }

  if (bundle.mustNotAdd.some((item) => /server-only/i.test(item))) {
    if (/<panel|<label|panorama|tsx|less/.test(lower)) {
      violations.push("Output introduced client/UI artifacts even though the prompt requires server-only output.");
    }
  }

  if (bundle.mustNotAdd.some((item) => /kv-owned configuration/i.test(item))) {
    if (/function\s+[a-z_0-9]+|class\(|getcaster|onspellstart/.test(lower)) {
      violations.push("Output introduced runtime script logic even though the prompt asked for KV-only output.");
    }
  }

  return violations;
}

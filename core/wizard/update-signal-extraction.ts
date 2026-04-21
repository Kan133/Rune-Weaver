import type { IntentSchema } from "../schema/types.js";
import {
  extractRequestedTriggerKeyFromPrompt,
  extractTriggerKeySignal,
} from "./trigger-key-extraction.js";

function normalizePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function parseChineseCountToken(token: string): number | undefined {
  switch (token) {
    case "一":
      return 1;
    case "二":
      return 2;
    case "三":
      return 3;
    case "四":
      return 4;
    case "五":
      return 5;
    default:
      return undefined;
  }
}

function parseExplicitChoiceCountFromPrompt(rawPrompt: string): number | undefined {
  const numericSelection =
    rawPrompt.match(/\b(\d+)\s*选\s*[一1]\b/u)
    || rawPrompt.match(/\b(?:show|display|draw|offer|present)\s+(\d+)\b/i)
    || rawPrompt.match(/(?:restore|revert|switch\s+back|set|change|update|adjust|expand)[^\n]{0,32}\b(\d+)\b[^\n]{0,20}\b(?:choices?|candidates?|options?|cards?)\b/i)
    || rawPrompt.match(/(\d+)\s*(?:个候选|个选项|张卡|项候选|项选项|choices?|candidates?|options?|cards?)/iu);
  if (numericSelection?.[1]) {
    const parsed = normalizePositiveInteger(Number(numericSelection[1]));
    if (typeof parsed === "number") {
      return parsed;
    }
  }

  const chineseSelection =
    rawPrompt.match(/([一二三四五])\s*选\s*[一1]/u)
    || rawPrompt.match(/([一二三四五])\s*(?:个候选|个选项|张卡|项候选|项选项)/u);
  if (chineseSelection?.[1]) {
    return parseChineseCountToken(chineseSelection[1]);
  }

  return undefined;
}

function hasExplicitChoiceCountChangeSignal(rawPrompt: string): boolean {
  if (!rawPrompt.trim()) {
    return false;
  }

  return [
    /\b(?:choice|candidate|display)\s*count\b/i,
    /\b(?:show|display|draw|offer|surface|present|change|set|update|adjust|expand|restore|revert|switch\s+back)\b[^\n]{0,32}\b\d+\b[^\n]{0,20}\b(?:choices?|candidates?|options?|cards?)\b/i,
    /\b\d+\s*(?:choices?|candidates?|options?|cards?)\b/i,
    /\b\d+\s*选\s*[一1]\b/u,
    /[一二三四五]\s*选\s*[一1]/u,
    /[一二三四五]\s*(?:个候选|个选项|张卡|项候选|项选项)/u,
    /(?:候选|选项|卡牌|展示|显示)(?:数量)?[^\n]{0,12}(?:改成|改为|调整到|变成|变为|设为|到)?\s*\d+/u,
    /(?:恢复成|恢复为|恢复到|改回|回到|变回|切回|改成|改为|调整到|变成|变为|设为)\s*(?:\d+|[一二三四五])\s*(?:个候选|个选项|张卡|项展示|项候选|选\s*[一1])/u,
    /\b(?:draw|show|display)\s+\d+\b/i,
  ].some((pattern) => pattern.test(rawPrompt));
}

function normalizeTriggerKey(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toUpperCase()
    : undefined;
}

export function readRequestedTriggerKey(
  requestedChange: IntentSchema,
  currentTriggerKey?: string,
): string | undefined {
  const promptSignal = extractTriggerKeySignal(requestedChange.request.rawPrompt || "");
  if (promptSignal?.kind === "rebind" && promptSignal.key) {
    return promptSignal.key;
  }

  const promptTriggerKey = extractRequestedTriggerKeyFromPrompt(requestedChange.request.rawPrompt || "");
  if (promptTriggerKey) {
    const normalizedCurrentTriggerKey = normalizeTriggerKey(currentTriggerKey);
    if (!normalizedCurrentTriggerKey || promptTriggerKey !== normalizedCurrentTriggerKey) {
      return promptTriggerKey;
    }
  }

  const fromParameters = requestedChange.parameters?.triggerKey;
  if (typeof fromParameters === "string" && fromParameters.trim()) {
    return fromParameters.trim().toUpperCase();
  }

  const activation = (requestedChange.interaction?.activations || []).find((item) => item.kind === "key");
  if (typeof activation?.input === "string" && activation.input.trim()) {
    return activation.input.trim().toUpperCase();
  }

  return promptTriggerKey;
}

export function readExplicitRequestedChoiceCountChange(requestedChange: IntentSchema): number | undefined {
  if (!hasExplicitChoiceCountChangeSignal(requestedChange.request.rawPrompt || "")) {
    return undefined;
  }

  const fromSelection = normalizePositiveInteger(requestedChange.selection?.choiceCount);
  if (typeof fromSelection === "number") {
    return fromSelection;
  }

  const fromParameters = normalizePositiveInteger(requestedChange.parameters?.choiceCount);
  if (typeof fromParameters === "number") {
    return fromParameters;
  }

  return parseExplicitChoiceCountFromPrompt(requestedChange.request.rawPrompt || "");
}

export function readRequestedObjectCount(prompt: string): number | undefined {
  const match =
    prompt.match(/从\s*\d+\s*(?:个|项|张)?(?:[\p{Script=Han}A-Za-z_]+)?\s*(?:扩充|扩展|增加|提升|改成|改为|调整到|变成|变为)\s*(?:到|成|为)?\s*(\d+)\s*(?:个|项|张)?/iu)
    || prompt.match(/(?:扩充|扩展|增加|提升|改成|改为|调整到|变成|变为)(?:到|成|为)?\s*(\d+)\s*(?:个|项|张)?(?:对象|候选|条目|项目|cards?|objects?|items?)?/i)
    || prompt.match(/(\d+)\s*(?:个|项|张)?(?:对象|候选|条目|项目|cards?|objects?|items?).*(?:扩充|扩展|增加|提升)/i);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export function hasRealizationRewriteSignal(rawPrompt: string): boolean {
  return /\b(?:lua|typescript|type\s*script|ts|kv|scriptfile|ability shell|runtime shell|rewrite|realization|bridge wiring|runtime wiring)\b/iu.test(
    rawPrompt,
  );
}

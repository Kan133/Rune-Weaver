import type {
  CurrentFeatureContext,
  IntentSchema,
  UpdateDeltaItem,
  UpdateIntent,
} from "../schema/types.js";

function normalizePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function readRequestedChoiceCountValue(requestedChange: IntentSchema): number | undefined {
  const fromSelection = normalizePositiveInteger(requestedChange.selection?.choiceCount);
  if (typeof fromSelection === "number") {
    return fromSelection;
  }

  return normalizePositiveInteger(requestedChange.parameters?.choiceCount);
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

export function readRequestedTriggerKey(requestedChange: IntentSchema): string | undefined {
  const fromParameters = requestedChange.parameters?.triggerKey;
  if (typeof fromParameters === "string" && fromParameters.trim()) {
    return fromParameters.trim().toUpperCase();
  }

  const activation = (requestedChange.interaction?.activations || []).find((item) => item.kind === "key");
  return typeof activation?.input === "string" && activation.input.trim()
    ? activation.input.trim().toUpperCase()
    : undefined;
}

export function readExplicitRequestedChoiceCountChange(requestedChange: IntentSchema): number | undefined {
  if (!hasExplicitChoiceCountChangeSignal(requestedChange.request.rawPrompt || "")) {
    return undefined;
  }

  return readRequestedChoiceCountValue(requestedChange)
    || parseExplicitChoiceCountFromPrompt(requestedChange.request.rawPrompt || "");
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

export function collectDeterministicUpdateDelta(input: {
  currentFeatureContext: CurrentFeatureContext;
  requestedChange: IntentSchema;
}): Pick<UpdateIntent["delta"], "add" | "modify" | "remove"> {
  const { currentFeatureContext, requestedChange } = input;
  const add: UpdateDeltaItem[] = [];
  const modify: UpdateDeltaItem[] = [];
  const remove: UpdateDeltaItem[] = [];
  const rawPrompt = requestedChange.request.rawPrompt;
  const boundedFields = currentFeatureContext.boundedFields;

  if (requestedChange.selection?.inventory?.enabled === true) {
    const currentInventoryEnabled = boundedFields.inventoryEnabled === true;
    const requestedInventory = requestedChange.selection.inventory;
    const summary = currentInventoryEnabled
      ? "Refresh the existing session inventory contract on the current feature."
      : "Add the existing session inventory contract to the current feature.";
    (currentInventoryEnabled ? modify : add).push({
      path: "selection.inventory",
      kind: "ui",
      summary,
    });

    if (
      typeof requestedInventory.capacity === "number" &&
      requestedInventory.capacity !== boundedFields.inventoryCapacity
    ) {
      modify.push({
        path: "selection.inventory.capacity",
        kind: "ui",
        summary: `Change inventory capacity to ${Math.floor(requestedInventory.capacity)} within the existing bounded field.`,
      });
    }

    if (
      typeof requestedInventory.fullMessage === "string" &&
      requestedInventory.fullMessage.trim() &&
      requestedInventory.fullMessage !== boundedFields.inventoryFullMessage
    ) {
      modify.push({
        path: "selection.inventory.fullMessage",
        kind: "ui",
        summary: "Refresh the inventory-full message within the current inventory panel contract.",
      });
    }
  }

  const triggerKey = readRequestedTriggerKey(requestedChange);
  if (triggerKey && triggerKey !== boundedFields.triggerKey) {
    modify.push({
      path: "input.triggerKey",
      kind: "trigger",
      summary: `Rebind the current trigger key to ${triggerKey}.`,
    });
  }

  const choiceCount = readExplicitRequestedChoiceCountChange(requestedChange);
  if (typeof choiceCount === "number" && choiceCount !== boundedFields.choiceCount) {
    modify.push({
      path: "selection.choiceCount",
      kind: "selection",
      summary: `Change the current selection choiceCount to ${choiceCount}.`,
    });
  }

  const currentObjectCount =
    typeof boundedFields.objectCount === "number" && Number.isFinite(boundedFields.objectCount)
      ? Math.floor(boundedFields.objectCount)
      : undefined;
  const requestedObjectCount = readRequestedObjectCount(rawPrompt);
  if (
    typeof currentObjectCount === "number" &&
    typeof requestedObjectCount === "number" &&
    requestedObjectCount > currentObjectCount
  ) {
    modify.push({
      path: "content.collection.objectCount",
      kind: "content",
      summary: `Expand the same-feature owned object collection from ${currentObjectCount} to ${requestedObjectCount}.`,
    });
  }

  return {
    add,
    modify,
    remove,
  };
}

import type { PromptSemanticHints } from "./shared.js";
import { normalizePositiveInteger } from "./shared.js";

export const PERSISTENCE_SIGNAL_PATTERN =
  /persist|persistence|save|saved|persistent|across matches|across sessions|cross[- ]match|cross[- ]session|跨局|跨会话|持久|永久保存|存档/iu;
export const CROSS_FEATURE_SIGNAL_PATTERN =
  /grant another feature|grant feature|cross[- ]feature|another feature|另一个功能|另一个特性|跨功能|跨feature/iu;
export const UI_SIGNAL_PATTERN =
  /ui|modal|dialog|panel|window|cards?|界面|面板|弹窗|窗口|卡牌/iu;
export const INVENTORY_SIGNAL_PATTERN =
  /inventory|backpack|storage|stash|persistent panel|仓库|库存|背包|格子|栏位/iu;

export function withGlobalFlag(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
}

export function hasNegatedSignalPrefix(rawText: string, index: number): boolean {
  const prefix = rawText.slice(Math.max(0, index - 24), index).toLowerCase();
  return /(?:不要|不需要|无需|禁止|without|no|do not)\s*(?:any\s*)?$/iu.test(prefix);
}

export function hasUnnegatedSignal(rawText: string, pattern: RegExp): boolean {
  const matcher = withGlobalFlag(pattern);
  for (const match of rawText.matchAll(matcher)) {
    const index = match.index ?? -1;
    if (index < 0 || !hasNegatedSignalPrefix(rawText, index)) {
      return true;
    }
  }
  return false;
}

export function hasUiSignal(rawText: string): boolean {
  return hasUnnegatedSignal(rawText, UI_SIGNAL_PATTERN);
}

export function hasInventorySignal(rawText: string): boolean {
  return hasUnnegatedSignal(rawText, INVENTORY_SIGNAL_PATTERN);
}

export function hasExplicitPersistenceSignal(rawText: string): boolean {
  return hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN);
}

export function hasExplicitCrossFeatureSignal(rawText: string): boolean {
  return hasUnnegatedSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN);
}

export function hasSelectionEligibilityRemovalSignal(rawText: string): boolean {
  return /remove from future eligibility|remove from later draws|later draws|later draw|future draws|future draw|future eligibility|permanently remove|permanently removed|removed from future candidate eligibility|后续不再出现|不再出现|从未来抽取中移除|从后续候选资格中移除|后续候选资格中移除|永久移除出抽取池/iu.test(
    rawText,
  );
}

export function hasReturnToPoolSignal(rawText: string): boolean {
  return /unchosen.*return.*pool|return the unchosen.*pool|return .* to the pool|back into the pool|未选.*回池|未选.*返回池|未选.*回到池中|其他.*回池|回到池中/iu.test(
    rawText,
  );
}

export function inferInventoryStoreSelectedItems(rawText: string): boolean {
  return /store selected|store the selected|keep selected|selection goes into inventory|selected.*inventory|confirmed.*inventory|显示在仓库|放入仓库|存入仓库/iu.test(
    rawText,
  );
}

export function parsePromptCountToken(token: string | undefined): number | undefined {
  if (!token) {
    return undefined;
  }

  const trimmed = token.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const map: Record<string, number> = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  return map[trimmed];
}

export function extractPromptCount(rawText: string, pattern: RegExp): number | undefined {
  const match = rawText.match(pattern);
  return match ? parsePromptCountToken(match[1]) : undefined;
}

export function collectPromptSemanticHints(rawText: string): PromptSemanticHints {
  const normalizedText = rawText.toLowerCase();
  const triChoiceMatch = rawText.match(/([1-9一二两三四五六七八九])\s*选\s*([1-9一二两三四五六七八九])/iu);
  const candidateCount =
    (triChoiceMatch ? parsePromptCountToken(triChoiceMatch[1]) : undefined) ||
    extractPromptCount(
      rawText,
      /(\d+|[一二两三四五六七八九])\s*(?:个)?(?:候选|选项|choices?|options?|candidates?|cards?)/iu,
    ) ||
    extractPromptCount(
      rawText,
      /(?:show|draw|draft|display|抽取|抽出|展示|显示)\s*(\d+|[一二两三四五六七八九])/iu,
    );
  const committedCount =
    (triChoiceMatch ? parsePromptCountToken(triChoiceMatch[2]) : undefined) ||
    extractPromptCount(
      rawText,
      /(?:choose|select|pick|选择|选中)\s*(\d+|[一二两三四五六七八九])\s*(?:个)?/iu,
    );
  const candidatePool =
    /candidate|pool|draw|draft|deck|候选|池|抽取|抽卡|卡池/iu.test(rawText);
  const playerChoice = /choose|select|pick|选择|选中|三选一|二选一/iu.test(rawText);
  const rarityDisplay = /weight|weighted|rarity|tier|权重|加权|稀有度|稀有/iu.test(rawText);
  const weightedDraw =
    /weight|weighted|权重|加权/iu.test(rawText) ||
    (rarityDisplay && candidatePool);
  const inventory = hasInventorySignal(rawText);
  const inventoryCapacity =
    extractPromptCount(rawText, /(\d+)\s*(?:slots?|格|格子|栏位)/iu) ||
    extractPromptCount(rawText, /(?:inventory|panel|capacity|容量|仓库)(?:\s*(?:to|of|为))?\s*(\d+)/iu);
  const inventoryFullMessageMatch =
    rawText.match(/(?:inventory\s+full|仓库满了|库存已满).*?["“](.+?)["”]/iu) ||
    rawText.match(/["“](.+?)["”].*(?:inventory\s+full|仓库满了|库存已满)/iu);
  const inventoryBlocksWhenFull =
    /inventory full.*(?:stop|block|no longer|cannot)|仓库满了.*(?:不能|无法|停止)|满了.*(?:不能继续抽取|无法继续抽取)/iu.test(
      rawText,
    );
  const noRepeatAfterSelection = hasSelectionEligibilityRemovalSignal(rawText);
  const immediateOutcome =
    /immediately|immediate|apply.*immediately|apply.*now|applies.*now|立即生效|立刻生效|马上生效|选中后立即/iu.test(rawText);
  const explicitPersistence = hasExplicitPersistenceSignal(rawText);
  const uiSurface = hasUiSignal(rawText);

  return {
    normalizedText,
    candidateCount,
    committedCount,
    inventoryCapacity: normalizePositiveInteger(inventoryCapacity),
    inventoryFullMessage:
      typeof inventoryFullMessageMatch?.[1] === "string" && inventoryFullMessageMatch[1].trim()
        ? inventoryFullMessageMatch[1].trim()
        : undefined,
    candidatePool,
    weightedDraw,
    playerChoice,
    inventory,
    inventoryBlocksWhenFull,
    noRepeatAfterSelection,
    returnsUnchosenToPool: hasReturnToPoolSignal(rawText),
    immediateOutcome,
    explicitPersistence,
    explicitCrossFeature: hasExplicitCrossFeatureSignal(rawText),
    rarityDisplay,
    uiSurface,
  };
}

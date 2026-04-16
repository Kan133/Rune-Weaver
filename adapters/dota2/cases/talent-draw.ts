export interface TalentDrawEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: string;
}

export interface TalentDrawInventoryParameters {
  enabled: boolean;
  capacity: number;
  storeSelectedItems: boolean;
  blockDrawWhenFull: boolean;
  fullMessage: string;
  presentation: "persistent_panel";
}

export interface TalentDrawCanonicalParameters {
  triggerKey: string;
  choiceCount: number;
  drawMode: string;
  duplicatePolicy: string;
  poolStateTracking: string;
  selectionPolicy: string;
  applyMode: string;
  postSelectionPoolBehavior: string;
  trackSelectedItems: boolean;
  payloadShape: string;
  minDisplayCount: number;
  placeholderConfig: {
    id: string;
    name: string;
    description: string;
    disabled: boolean;
  };
  effectApplication: {
    enabled: boolean;
    rarityAttributeBonusMap: Record<string, { attribute: string; value: number }>;
  };
  entries: TalentDrawEntry[];
  inventory?: TalentDrawInventoryParameters;
}

export interface TalentDrawPromptAnalysis {
  isCanonicalBasePrompt: boolean;
  inventoryMode: "none" | "supported" | "unsupported";
  unsupportedReasons: string[];
}

export const TALENT_DRAW_CANONICAL_FEATURE_ID = "talent_draw_demo";

export const TALENT_DRAW_CANONICAL_CREATE_PROMPT =
  "做一个按 F4 触发的三选一天赋抽取系统。玩家按 F4 后，从加权天赋池抽出 3 个候选天赋，显示卡牌选择 UI。玩家选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。";

export const TALENT_DRAW_CANONICAL_UPDATE_PROMPT =
  '给现有天赋抽取功能增加一个常驻天赋库存界面：15 格。玩家每次从 F4 三选一中确认的天赋都进入库存。库存满了后，再按 F4 不再继续抽取，并在库存界面显示 "Talent inventory full"。保持现有 F4 三选一抽取逻辑、稀有度展示和已选天赋不再出现的行为不变。';

export const TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT =
  '把现有 talent_draw_demo 的天赋池从 6 个扩充到 20 个。保持当前 F4 三选一、立即生效、已选天赋后续不再出现的逻辑不变；如果当前已有库存界面，也保持其行为不变。新增 14 个天赋先使用与现有风格一致的占位符名称、描述、稀有度和权重即可。';

const TALENT_DRAW_CANONICAL_PARAMETERS: TalentDrawCanonicalParameters = {
  triggerKey: "F4",
  choiceCount: 3,
  drawMode: "multiple_without_replacement",
  duplicatePolicy: "forbid",
  poolStateTracking: "session",
  selectionPolicy: "single",
  applyMode: "immediate",
  postSelectionPoolBehavior: "remove_selected_from_remaining",
  trackSelectedItems: true,
  payloadShape: "card_with_rarity",
  minDisplayCount: 3,
  placeholderConfig: {
    id: "empty_slot",
    name: "Empty Slot",
    description: "No talent available",
    disabled: true,
  },
  effectApplication: {
    enabled: true,
    rarityAttributeBonusMap: {
      R: { attribute: "strength", value: 10 },
      SR: { attribute: "agility", value: 10 },
      SSR: { attribute: "intelligence", value: 10 },
      UR: { attribute: "all", value: 10 },
    },
  },
  entries: [
    { id: "R001", label: "Strength Boost", description: "+10 Strength", weight: 40, tier: "R" },
    { id: "R002", label: "Fortitude", description: "+10 Strength", weight: 40, tier: "R" },
    { id: "SR001", label: "Agility Boost", description: "+10 Agility", weight: 30, tier: "SR" },
    { id: "SR002", label: "Swift Reflexes", description: "+10 Agility", weight: 30, tier: "SR" },
    { id: "SSR001", label: "Intelligence Boost", description: "+10 Intelligence", weight: 20, tier: "SSR" },
    { id: "UR001", label: "Ultimate Growth", description: "+10 All Attributes", weight: 10, tier: "UR" },
  ],
};

const TALENT_DRAW_INVENTORY_PARAMETERS: TalentDrawInventoryParameters = {
  enabled: true,
  capacity: 15,
  storeSelectedItems: true,
  blockDrawWhenFull: true,
  fullMessage: "Talent inventory full",
  presentation: "persistent_panel",
};

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim().toLowerCase();
}

function hasAnyInventoryKeyword(prompt: string): boolean {
  return [
    "库存",
    "inventory",
    "背包",
    "slot",
    "格",
    "panel",
    "界面",
  ].some((keyword) => prompt.includes(keyword));
}

function isInventoryPreservationOnlyPrompt(prompt: string): boolean {
  return hasAnyInventoryKeyword(prompt) && (
    /如果当前已有库存界面/i.test(prompt) ||
    /保持其行为不变/i.test(prompt) ||
    /keep.*inventory.*unchanged/i.test(prompt)
  );
}

function hasSupportedInventoryShape(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  return (
    hasAnyInventoryKeyword(normalized) &&
    (/15\s*格/.test(normalized) || /15\s*slots?/.test(normalized)) &&
    (normalized.includes("进入库存") || normalized.includes("store") || normalized.includes("inventory")) &&
    (normalized.includes("库存满") || normalized.includes("full")) &&
    (normalized.includes("不再继续抽取") || normalized.includes("不再打开") || normalized.includes("does not open")) &&
    normalized.includes("talent inventory full")
  );
}

function collectUnsupportedInventoryReasons(prompt: string): string[] {
  const normalized = normalizePrompt(prompt);
  if (!hasAnyInventoryKeyword(normalized)) {
    return [];
  }

  if (isInventoryPreservationOnlyPrompt(normalized) && !hasSupportedInventoryShape(normalized)) {
    return [];
  }

  const reasons: string[] = [];
  const checks: Array<{ matched: boolean; reason: string }> = [
    {
      matched: /拖拽|drag|drop/.test(normalized),
      reason: "Current Talent Draw inventory lane does not support drag/drop behavior.",
    },
    {
      matched: /重排|排序|reorder|sort/.test(normalized),
      reason: "Current Talent Draw inventory lane does not support reorder behavior.",
    },
    {
      matched: /删除|移除|remove|discard/.test(normalized),
      reason: "Current Talent Draw inventory lane does not support removing stored talents.",
    },
    {
      matched: /tooltip|提示详情|深度查看|inspect/.test(normalized),
      reason: "Current Talent Draw inventory lane does not support tooltip/deep-inspection behavior.",
    },
    {
      matched: /跨局|持久化|存档|save|persist/.test(normalized),
      reason: "Current Talent Draw inventory lane is session-only and does not support persistence.",
    },
    {
      matched: /第二个按键|第二按键|toggle|切换键|f5/.test(normalized),
      reason: "Current Talent Draw inventory lane does not support adding a second inventory toggle trigger.",
    },
  ];

  for (const check of checks) {
    if (check.matched) {
      reasons.push(check.reason);
    }
  }

  if (reasons.length === 0 && !hasSupportedInventoryShape(normalized)) {
    reasons.push(
      "Inventory updates must stay inside the current canonical Talent Draw contract: persistent 15-slot panel, session-only storage, and full-state draw blocking."
    );
  }

  return reasons;
}

function countCanonicalSignals(prompt: string): number {
  const checks = [
    /f4/i.test(prompt),
    /天赋/.test(prompt),
    /三选一|3\s*个|三个/.test(prompt),
    /稀有度|rarity|R、SR、SSR、UR|R,?\s*SR,?\s*SSR,?\s*UR/i.test(prompt),
    /不重复|移除|后续不再出现|remove_selected_from_remaining/.test(prompt),
    /界面|ui|modal|卡片/.test(prompt),
  ];

  return checks.filter(Boolean).length;
}

export function resolveCanonicalTalentDrawFeatureId(prompt: string): string | undefined {
  const normalized = normalizePrompt(prompt);
  if (
    normalized === normalizePrompt(TALENT_DRAW_CANONICAL_CREATE_PROMPT) ||
    normalized === normalizePrompt(TALENT_DRAW_CANONICAL_UPDATE_PROMPT) ||
    normalized === normalizePrompt(TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT)
  ) {
    return TALENT_DRAW_CANONICAL_FEATURE_ID;
  }

  return undefined;
}

export function isCanonicalTalentDrawPrompt(prompt: string): boolean {
  return resolveCanonicalTalentDrawFeatureId(prompt) !== undefined || countCanonicalSignals(prompt) >= 4;
}

export function getCanonicalTalentDrawParameters(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(TALENT_DRAW_CANONICAL_PARAMETERS)) as Record<string, unknown>;
}

export function getCanonicalTalentDrawInventoryParameters(): TalentDrawInventoryParameters {
  return JSON.parse(JSON.stringify(TALENT_DRAW_INVENTORY_PARAMETERS)) as TalentDrawInventoryParameters;
}

export function analyzeTalentDrawPrompt(prompt: string): TalentDrawPromptAnalysis {
  const normalized = normalizePrompt(prompt);
  const unsupportedReasons = collectUnsupportedInventoryReasons(normalized);
  if (unsupportedReasons.length > 0) {
    return {
      isCanonicalBasePrompt: isCanonicalTalentDrawPrompt(prompt),
      inventoryMode: "unsupported",
      unsupportedReasons,
    };
  }

  if (hasSupportedInventoryShape(normalized)) {
    return {
      isCanonicalBasePrompt: true,
      inventoryMode: "supported",
      unsupportedReasons: [],
    };
  }

  return {
    isCanonicalBasePrompt: isCanonicalTalentDrawPrompt(prompt),
    inventoryMode: "none",
    unsupportedReasons: [],
  };
}

export function mergeCanonicalTalentDrawParameters(
  prompt: string,
  explicitParameters: Record<string, unknown>
): Record<string, unknown> {
  const analysis = analyzeTalentDrawPrompt(prompt);
  if (!analysis.isCanonicalBasePrompt) {
    return explicitParameters;
  }

  const canonical = getCanonicalTalentDrawParameters();
  const merged = {
    ...canonical,
    ...explicitParameters,
  };
  if (analysis.inventoryMode === "supported") {
    return {
      ...merged,
      inventory: getCanonicalTalentDrawInventoryParameters(),
    };
  }

  return merged;
}

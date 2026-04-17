import type {
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolObjectKind,
  SelectionPoolObjectTier,
} from "../../../../core/schema/types.js";

export interface SelectionPoolExampleObject {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier: SelectionPoolObjectTier;
}

export interface SelectionPoolFamilyExample {
  id: string;
  featureId: string;
  objectKind: SelectionPoolObjectKind;
  createPrompt: string;
  inventoryUpdatePrompt?: string;
  sourceExpansionPrompt?: string;
  parameters: SelectionPoolFeatureAuthoringParameters;
}

function createDisplayDefaults(objectKind: SelectionPoolObjectKind): NonNullable<SelectionPoolFeatureAuthoringParameters["display"]> {
  if (objectKind === "equipment") {
    return {
      title: "Choose Your Equipment",
      description: "Select one of the following equipments",
      inventoryTitle: "Equipment Inventory",
      payloadShape: "card_with_rarity",
      minDisplayCount: 3,
    };
  }

  if (objectKind === "skill_card_placeholder") {
    return {
      title: "Choose Your Skill Card",
      description: "Select one of the following skill cards",
      inventoryTitle: "Skill Card Inventory",
      payloadShape: "card_with_rarity",
      minDisplayCount: 3,
    };
  }

  return {
    title: "Choose Your Talent",
    description: "Select one of the following talents",
    inventoryTitle: "Talent Inventory",
    payloadShape: "card_with_rarity",
    minDisplayCount: 3,
  };
}

function createPlaceholderConfig(objectKind: SelectionPoolObjectKind): NonNullable<SelectionPoolFeatureAuthoringParameters["placeholderConfig"]> {
  if (objectKind === "equipment") {
    return {
      id: "empty_equipment_slot",
      name: "Empty Slot",
      description: "No equipment available",
      disabled: true,
    };
  }

  if (objectKind === "skill_card_placeholder") {
    return {
      id: "empty_skill_card_slot",
      name: "Empty Slot",
      description: "No skill card available",
      disabled: true,
    };
  }

  return {
    id: "empty_talent_slot",
    name: "Empty Slot",
    description: "No talent available",
    disabled: true,
  };
}

function createDefaultEffectProfile() {
  return {
    kind: "tier_attribute_bonus_placeholder" as const,
    rarityAttributeBonusMap: {
      R: { attribute: "strength", value: 10 },
      SR: { attribute: "agility", value: 10 },
      SSR: { attribute: "intelligence", value: 10 },
      UR: { attribute: "all", value: 10 },
    },
  };
}

function createBaseParameters(
  objectKind: SelectionPoolObjectKind,
  objects: SelectionPoolExampleObject[],
): SelectionPoolFeatureAuthoringParameters {
  return {
    triggerKey: "F4",
    choiceCount: 3,
    objectKind,
    objects,
    drawMode: "multiple_without_replacement",
    duplicatePolicy: "forbid",
    poolStateTracking: "session",
    selectionPolicy: "single",
    applyMode: "immediate",
    postSelectionPoolBehavior: "remove_selected_from_remaining",
    trackSelectedItems: true,
    display: createDisplayDefaults(objectKind),
    placeholderConfig: createPlaceholderConfig(objectKind),
    effectProfile: createDefaultEffectProfile(),
  };
}

export const TALENT_DRAW_EXAMPLE_CREATE_PROMPT =
  "做一个按 F4 触发的三选一天赋抽取系统。玩家按 F4 后，从加权天赋池抽出 3 个候选天赋，显示卡牌选择 UI。玩家选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。";

export const TALENT_DRAW_EXAMPLE_INVENTORY_UPDATE_PROMPT =
  '给现有天赋抽取功能增加一个常驻天赋库存界面:15格。玩家每次从F4三选一中确认的天赋都进入库存。库存满了后，再按F4不再继续抽取，并在库存界面显示"Talent inventory full"。保持现有F4三选一抽取逻辑、稀有度展示和已选天赋不再出现的行为不变。';

export const TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT =
  "把现有 talent_draw_demo 的天赋池从 6 个扩充到 20 个。保持当前 F4 三选一、立即生效、已选天赋后续不再出现的逻辑不变；如果当前已有库存界面，也保持其行为不变。新增 14 个天赋先使用与现有风格一致的占位符名称、描述、稀有度和权重即可。";

export const TALENT_DRAW_EXAMPLE_OBJECTS: SelectionPoolExampleObject[] = [
  { id: "R001", label: "Strength Boost", description: "+10 Strength", weight: 40, tier: "R" },
  { id: "R002", label: "Fortitude", description: "+10 Strength", weight: 40, tier: "R" },
  { id: "SR001", label: "Agility Boost", description: "+10 Agility", weight: 30, tier: "SR" },
  { id: "SR002", label: "Swift Reflexes", description: "+10 Agility", weight: 30, tier: "SR" },
  { id: "SSR001", label: "Intelligence Boost", description: "+10 Intelligence", weight: 20, tier: "SSR" },
  { id: "UR001", label: "Ultimate Growth", description: "+10 All Attributes", weight: 10, tier: "UR" },
];

export const EQUIPMENT_DRAW_EXAMPLE_CREATE_PROMPT =
  "做一个按 F4 触发的三选一装备抽取系统。玩家按 F4 后，从加权装备池抽出 3 个候选装备，显示卡牌选择 UI。玩家选择 1 个后立即应用效果，并且已选择的装备后续不再出现。";

export const EQUIPMENT_DRAW_EXAMPLE_OBJECTS: SelectionPoolExampleObject[] = [
  { id: "EQ_R001", label: "Iron Buckler", description: "+10 Strength", weight: 40, tier: "R" },
  { id: "EQ_R002", label: "Bronze Guard", description: "+10 Strength", weight: 40, tier: "R" },
  { id: "EQ_SR001", label: "Wind Step Boots", description: "+10 Agility", weight: 30, tier: "SR" },
  { id: "EQ_SR002", label: "Scout Emblem", description: "+10 Agility", weight: 30, tier: "SR" },
  { id: "EQ_SSR001", label: "Sage Lens", description: "+10 Intelligence", weight: 20, tier: "SSR" },
  { id: "EQ_UR001", label: "Crown Relic", description: "+10 All Attributes", weight: 10, tier: "UR" },
];

export const TALENT_DRAW_EXAMPLE: SelectionPoolFamilyExample = {
  id: "talent_draw_demo",
  featureId: "talent_draw_demo",
  objectKind: "talent",
  createPrompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
  inventoryUpdatePrompt: TALENT_DRAW_EXAMPLE_INVENTORY_UPDATE_PROMPT,
  sourceExpansionPrompt: TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
  parameters: createBaseParameters("talent", TALENT_DRAW_EXAMPLE_OBJECTS),
};

export const EQUIPMENT_DRAW_EXAMPLE: SelectionPoolFamilyExample = {
  id: "equipment_draw_demo",
  featureId: "equipment_draw_demo",
  objectKind: "equipment",
  createPrompt: EQUIPMENT_DRAW_EXAMPLE_CREATE_PROMPT,
  parameters: createBaseParameters("equipment", EQUIPMENT_DRAW_EXAMPLE_OBJECTS),
};

export const SELECTION_POOL_FAMILY_EXAMPLES: SelectionPoolFamilyExample[] = [
  TALENT_DRAW_EXAMPLE,
  EQUIPMENT_DRAW_EXAMPLE,
];

export function getSelectionPoolExampleById(id: string): SelectionPoolFamilyExample | undefined {
  return SELECTION_POOL_FAMILY_EXAMPLES.find((example) => example.id === id || example.featureId === id);
}

export function getSelectionPoolDefaultObjects(
  objectKind: SelectionPoolObjectKind,
): SelectionPoolExampleObject[] {
  if (objectKind === "equipment") {
    return EQUIPMENT_DRAW_EXAMPLE_OBJECTS.map((object) => ({ ...object }));
  }

  if (objectKind === "skill_card_placeholder") {
    return [
      { id: "SC_R001", label: "Battle Lesson", description: "+10 Strength", weight: 40, tier: "R" },
      { id: "SC_R002", label: "Guard Formation", description: "+10 Strength", weight: 40, tier: "R" },
      { id: "SC_SR001", label: "Shadow Drill", description: "+10 Agility", weight: 30, tier: "SR" },
      { id: "SC_SR002", label: "Quick Casting", description: "+10 Agility", weight: 30, tier: "SR" },
      { id: "SC_SSR001", label: "Arcane Study", description: "+10 Intelligence", weight: 20, tier: "SSR" },
      { id: "SC_UR001", label: "Ascension Script", description: "+10 All Attributes", weight: 10, tier: "UR" },
    ];
  }

  return TALENT_DRAW_EXAMPLE_OBJECTS.map((object) => ({ ...object }));
}

export function buildSelectionPoolExampleParameters(
  objectKind: SelectionPoolObjectKind,
): SelectionPoolFeatureAuthoringParameters {
  return createBaseParameters(objectKind, getSelectionPoolDefaultObjects(objectKind));
}

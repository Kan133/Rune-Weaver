import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type {
  BlueprintModule,
  FeatureAuthoring,
  FeatureAuthoringProposal,
  FillContract,
  FillIntentCandidate,
  IntentSchema,
  SelectionPoolAuthoredObject,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolObjectKind,
  SelectionPoolObjectTier,
  SelectionPoolParameterSurface,
} from "../../../../core/schema/types.js";
import type {
  FeatureSourceModelRef,
  RuneWeaverFeatureRecord,
} from "../../../../core/workspace/types.js";
import { dota2GapFillBoundaryProvider } from "../../gap-fill/boundaries.js";
import {
  TALENT_DRAW_EXAMPLE,
  TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
  buildSelectionPoolExampleParameters,
  getSelectionPoolDefaultObjects,
  type SelectionPoolExampleObject,
} from "./examples.js";

export type SelectionPoolFamilyMode = "create" | "update" | "regenerate";
export type SelectionPoolSourceAdapter = "selection_pool";

export interface SelectionPoolInventoryContract {
  enabled: boolean;
  capacity: number;
  storeSelectedItems: boolean;
  blockDrawWhenFull: boolean;
  fullMessage: string;
  presentation: "persistent_panel";
}

export interface SelectionPoolFeatureSourceArtifactV1 {
  adapter: SelectionPoolSourceAdapter;
  version: 1;
  featureId: string;
  objectKind: SelectionPoolObjectKind;
  triggerKey: string;
  choiceCount: number;
  drawMode: "single" | "multiple_without_replacement" | "multiple_with_replacement";
  duplicatePolicy: "allow" | "avoid_when_possible" | "forbid";
  poolStateTracking: "none" | "session";
  selectionPolicy: "single";
  applyMode: "immediate" | "deferred";
  postSelectionPoolBehavior:
    | "none"
    | "remove_selected_from_remaining"
    | "remove_selected_and_keep_unselected_eligible";
  trackSelectedItems: boolean;
  display?: NonNullable<SelectionPoolFeatureAuthoringParameters["display"]>;
  placeholderConfig?: NonNullable<SelectionPoolFeatureAuthoringParameters["placeholderConfig"]>;
  inventory?: SelectionPoolInventoryContract;
  effectProfile?: NonNullable<SelectionPoolFeatureAuthoringParameters["effectProfile"]>;
  objects: SelectionPoolAuthoredObject[];
}

export interface ResolveSelectionPoolFamilyInput {
  prompt: string;
  hostRoot: string;
  mode: SelectionPoolFamilyMode;
  featureId?: string;
  existingFeature?: RuneWeaverFeatureRecord | null;
  proposalSource: "llm" | "fallback" | "existing-feature";
}

export interface ResolveSelectionPoolFamilyResult {
  handled: boolean;
  blocked: boolean;
  reasons: string[];
  proposal?: FeatureAuthoringProposal;
  fillIntentCandidates?: FillIntentCandidate[];
  scalarParameters?: Record<string, unknown>;
  notes?: string[];
}

export interface FeatureAuthoringNormalizationResult {
  featureAuthoring?: FeatureAuthoring;
  blockers: string[];
  warnings: string[];
  notes: string[];
}

export interface SelectionPoolCompiledModuleParameters {
  input_trigger: Record<string, unknown>;
  weighted_pool: Record<string, unknown>;
  selection_flow: Record<string, unknown>;
  selection_modal: Record<string, unknown>;
}

export interface SelectionPoolLifecycleState {
  featureAuthoring: FeatureAuthoring;
  sourceArtifact: SelectionPoolFeatureSourceArtifactV1;
  sourceArtifactRef: FeatureSourceModelRef;
}

const SELECTION_POOL_SOURCE_ADAPTER: SelectionPoolSourceAdapter = "selection_pool";
const SELECTION_POOL_SOURCE_VERSION = 1;
const SELECTION_POOL_ALLOWED_HOTKEYS = [
  "Q", "W", "E", "R", "D", "F",
  "1", "2", "3", "4", "5", "6",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
] as const;
const SELECTION_POOL_OBJECT_KINDS: SelectionPoolObjectKind[] = [
  "talent",
  "equipment",
  "skill_card_placeholder",
];
const PLACEHOLDER_WEIGHT_BY_TIER: Record<SelectionPoolObjectTier, number> = {
  R: 40,
  SR: 30,
  SSR: 20,
  UR: 10,
};
const TALENT_EXPANSION_PLACEHOLDERS: SelectionPoolAuthoredObject[] = [
  { id: "R003", label: "Strength Boost 03", description: "+10 Strength", tier: "R", weight: 40 },
  { id: "R004", label: "Strength Boost 04", description: "+10 Strength", tier: "R", weight: 40 },
  { id: "R005", label: "Strength Boost 05", description: "+10 Strength", tier: "R", weight: 40 },
  { id: "R006", label: "Strength Boost 06", description: "+10 Strength", tier: "R", weight: 40 },
  { id: "R007", label: "Strength Boost 07", description: "+10 Strength", tier: "R", weight: 40 },
  { id: "R008", label: "Strength Boost 08", description: "+10 Strength", tier: "R", weight: 40 },
  { id: "SR003", label: "Agility Boost 03", description: "+10 Agility", tier: "SR", weight: 30 },
  { id: "SR004", label: "Agility Boost 04", description: "+10 Agility", tier: "SR", weight: 30 },
  { id: "SR005", label: "Agility Boost 05", description: "+10 Agility", tier: "SR", weight: 30 },
  { id: "SR006", label: "Agility Boost 06", description: "+10 Agility", tier: "SR", weight: 30 },
  { id: "SSR002", label: "Intelligence Boost 02", description: "+10 Intelligence", tier: "SSR", weight: 20 },
  { id: "SSR003", label: "Intelligence Boost 03", description: "+10 Intelligence", tier: "SSR", weight: 20 },
  { id: "SSR004", label: "Intelligence Boost 04", description: "+10 Intelligence", tier: "SSR", weight: 20 },
  { id: "UR002", label: "Ultimate Growth 02", description: "+10 All Attributes", tier: "UR", weight: 10 },
];
const FAMILY_BLOCK_PATTERNS: Array<{ test: RegExp; reason: string }> = [
  {
    test: /(?:second trigger|第二个按键|第二个触发键|第二触发|双触发|multi-trigger|toggle key)/i,
    reason: "selection_pool currently admits only one trigger owner under input.key_binding.",
  },
  {
    test: /(?:多次确认|multi-confirm|二次确认|confirm twice)/i,
    reason: "selection_pool currently admits exactly one confirm flow.",
  },
  {
    test: /(?:persist|save file|cross match|跨局|存档|持久化)/i,
    reason: "selection_pool remains session-only and does not admit persistence in the current family contract.",
  },
  {
    test: /(?:grant skill|grant another feature|cross-feature|授予技能|授予另一个(?:技能)?\s*feature|feature 耦合)/i,
    reason: "selection_pool does not yet admit cross-feature grants or feature coupling.",
  },
  {
    test: /(?:custom effect|new effect family|新的效果族|自定义效果族|dash|projectile|summon|spawn helper)/i,
    reason: "selection_pool keeps effect behavior inside the current bounded placeholder effect profile and does not admit arbitrary new effect families.",
  },
];

const SELECTION_POOL_PARAMETER_SURFACE: SelectionPoolParameterSurface = {
  triggerKey: {
    kind: "single_hotkey",
    allowList: [...SELECTION_POOL_ALLOWED_HOTKEYS],
  },
  choiceCount: {
    minimum: 1,
    maximum: 5,
  },
  objectKind: {
    allowed: [...SELECTION_POOL_OBJECT_KINDS],
  },
  objects: {
    minItems: 1,
    seededWhenMissing: true,
  },
  inventory: {
    supported: true,
    capacityRange: {
      minimum: 1,
      maximum: 30,
    },
    fixedPresentation: "persistent_panel",
  },
  invariants: [
    "single trigger entry only",
    "weighted pool candidate source",
    "confirm exactly one candidate",
    "same-feature owned object collection only",
    "same selection skeleton: input.key_binding + data.weighted_pool + rule.selection_flow + ui.selection_modal",
    "no persistence",
    "no cross-feature grants",
    "no arbitrary custom effect family",
  ],
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim().toLowerCase();
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value && value.trim().length > 0)));
}

function isSelectionPoolObjectTier(value: unknown): value is SelectionPoolObjectTier {
  return value === "R" || value === "SR" || value === "SSR" || value === "UR";
}

function isSelectionPoolInventoryContract(value: unknown): value is SelectionPoolInventoryContract {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).enabled === true &&
      typeof (value as Record<string, unknown>).capacity === "number" &&
      typeof (value as Record<string, unknown>).fullMessage === "string" &&
      (value as Record<string, unknown>).presentation === "persistent_panel",
  );
}

function isSelectionPoolAuthoredObject(value: unknown): value is SelectionPoolAuthoredObject {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).id === "string" &&
      typeof (value as Record<string, unknown>).label === "string" &&
      typeof (value as Record<string, unknown>).description === "string" &&
      typeof (value as Record<string, unknown>).weight === "number" &&
      isSelectionPoolObjectTier((value as Record<string, unknown>).tier),
  );
}

function isSelectionPoolSourceModelRef(value: unknown): value is FeatureSourceModelRef {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).adapter === SELECTION_POOL_SOURCE_ADAPTER &&
      (value as Record<string, unknown>).version === SELECTION_POOL_SOURCE_VERSION &&
      typeof (value as Record<string, unknown>).path === "string",
  );
}

function isLegacyTalentDrawSourceModelRef(value: unknown): value is FeatureSourceModelRef {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).adapter === "talent-draw" &&
      (value as Record<string, unknown>).version === 1 &&
      typeof (value as Record<string, unknown>).path === "string",
  );
}

function isSelectionPoolFeatureSourceArtifactV1(value: unknown): value is SelectionPoolFeatureSourceArtifactV1 {
  if (!value || typeof value !== "object") {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    raw.adapter === SELECTION_POOL_SOURCE_ADAPTER &&
    raw.version === SELECTION_POOL_SOURCE_VERSION &&
    typeof raw.featureId === "string" &&
    typeof raw.triggerKey === "string" &&
    typeof raw.choiceCount === "number" &&
    SELECTION_POOL_OBJECT_KINDS.includes(raw.objectKind as SelectionPoolObjectKind) &&
    Array.isArray(raw.objects) &&
    raw.objects.every((object) => isSelectionPoolAuthoredObject(object)) &&
    (raw.inventory === undefined || isSelectionPoolInventoryContract(raw.inventory))
  );
}

function isLegacyTalentDrawArtifact(value: unknown): value is {
  adapter: "talent-draw";
  version: 1;
  featureId: string;
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
  placeholderConfig: { id: string; name: string; description: string; disabled: boolean };
  effectApplication: {
    enabled: boolean;
    rarityAttributeBonusMap: Record<string, { attribute: string; value: number }>;
  };
  inventory?: SelectionPoolInventoryContract;
  talents: Array<{
    id: string;
    label: string;
    description: string;
    tier: SelectionPoolObjectTier;
    weight: number;
  }>;
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return raw.adapter === "talent-draw" && raw.version === 1 && typeof raw.featureId === "string" && Array.isArray(raw.talents);
}

function getDisplayDefaults(objectKind: SelectionPoolObjectKind): NonNullable<SelectionPoolFeatureAuthoringParameters["display"]> {
  const base = buildSelectionPoolExampleParameters(objectKind).display;
  return deepClone(base || {});
}

function getPlaceholderDefaults(objectKind: SelectionPoolObjectKind): NonNullable<SelectionPoolFeatureAuthoringParameters["placeholderConfig"]> {
  const base = buildSelectionPoolExampleParameters(objectKind).placeholderConfig;
  return deepClone(base || { id: "empty_slot", name: "Empty Slot", description: "No selection available", disabled: true });
}

function getEffectProfileDefaults(): NonNullable<SelectionPoolFeatureAuthoringParameters["effectProfile"]> {
  const base = buildSelectionPoolExampleParameters("talent").effectProfile;
  return deepClone(base || {
    kind: "tier_attribute_bonus_placeholder",
    rarityAttributeBonusMap: {
      R: { attribute: "strength", value: 10 },
      SR: { attribute: "agility", value: 10 },
      SSR: { attribute: "intelligence", value: 10 },
      UR: { attribute: "all", value: 10 },
    },
  });
}

function getInventoryDefaults(objectKind: SelectionPoolObjectKind): SelectionPoolInventoryContract {
  const label =
    objectKind === "equipment"
      ? "Equipment"
      : objectKind === "skill_card_placeholder"
        ? "Skill card"
        : "Talent";
  return {
    enabled: true,
    capacity: 15,
    storeSelectedItems: true,
    blockDrawWhenFull: true,
    fullMessage: `${label} inventory full`,
    presentation: "persistent_panel",
  };
}

function inferObjectKind(prompt: string, existingFeature?: RuneWeaverFeatureRecord | null): SelectionPoolObjectKind | undefined {
  const normalized = normalizePrompt(prompt);
  const existingKind = existingFeature?.featureAuthoring?.objectKind;
  if (existingKind && SELECTION_POOL_OBJECT_KINDS.includes(existingKind)) {
    return existingKind;
  }
  if (/\bequipment\b|装备|物品/.test(normalized)) {
    return "equipment";
  }
  if (/skill card|技能卡|卡牌技能/.test(normalized)) {
    return "skill_card_placeholder";
  }
  if (/talent|天赋/.test(normalized)) {
    return "talent";
  }
  return undefined;
}

function looksLikeSelectionPoolPrompt(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  const signals = [
    /\b(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i.test(normalized),
    /choose|选择|抽取|draft|draw/.test(normalized),
    /weighted|权重|稀有度|rarity/.test(normalized),
    /modal|ui|卡牌|界面/.test(normalized),
    /talent|equipment|skill card|天赋|装备|技能卡/.test(normalized),
  ];
  return signals.filter(Boolean).length >= 3;
}

function parseTriggerKey(prompt: string): string | undefined {
  const contextualMatch = prompt.match(
    /(?:按(?:下)?|触发键|按键|快捷键|hotkey|trigger key|press)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
  );
  if (contextualMatch) {
    return contextualMatch[1].toUpperCase();
  }

  const broadMatch = prompt.match(/\b(F(?:1[0-2]|[1-9])|[QWERDF])\b/i);
  return broadMatch ? broadMatch[1].toUpperCase() : undefined;
}

function parseChoiceCount(prompt: string): number | undefined {
  const normalized = normalizePrompt(prompt);
  const numericMatch = normalized.match(/(?:to|show|draw|抽出|抽取|展示|显示)?\s*(\d)\s*(?:choices?|candidates?|个候选|选项)/i);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }
  if (/三选一|3选1|3 选 1|3个候选|三个候选/.test(normalized)) return 3;
  if (/五选一|5选1|5 选 1|5个候选|五个候选/.test(normalized)) return 5;
  if (/单选|1选1|1 选 1|一个候选/.test(normalized)) return 1;
  return undefined;
}

function parseRequestedObjectCount(prompt: string): number | undefined {
  const normalized = normalizePrompt(prompt);
  const match = normalized.match(/(?:to|到|扩充到|提升到)\s*(\d+)\s*(?:talents?|objects?|items?|个)/i);
  return match ? Number(match[1]) : undefined;
}

function requestsSupportedInventory(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  return (
    /inventory|库存|背包|panel|面板/.test(normalized) &&
    /15\s*(?:slots?|格)/i.test(normalized) &&
    /full|满了|满仓/.test(normalized) &&
    /block|不再继续|不再抽取|不再打开/.test(normalized)
  );
}

function requestsPoolExpansionToTwenty(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  return (
    /(?:20\s*(?:talents?|objects?|items?|个))/i.test(normalized) &&
    /expand|扩充|扩展|增加|提升/.test(normalized)
  );
}

function shouldHandleSelectionPoolFeature(input: ResolveSelectionPoolFamilyInput): boolean {
  const promptKind = inferObjectKind(input.prompt, input.existingFeature);
  const normalized = normalizePrompt(input.prompt);
  const updateFamilyCue =
    input.mode !== "create" &&
    Boolean(input.featureId?.trim()) &&
    /(?:selection pool|draw system|draft system|抽取系统|抽卡系统|候选池)/.test(normalized);
  return Boolean(
    promptKind ||
      looksLikeSelectionPoolPrompt(input.prompt) ||
      updateFamilyCue ||
      input.existingFeature?.featureAuthoring?.profile === "selection_pool" ||
      isSelectionPoolSourceModelRef(input.existingFeature?.sourceModel) ||
      isLegacyTalentDrawSourceModelRef(input.existingFeature?.sourceModel) ||
      input.existingFeature?.featureId === TALENT_DRAW_EXAMPLE.featureId,
  );
}

function collectFamilyBlockReasons(prompt: string): string[] {
  return FAMILY_BLOCK_PATTERNS.filter((pattern) => pattern.test.test(prompt)).map((pattern) => pattern.reason);
}

function createSourceModelRef(featureId: string): FeatureSourceModelRef {
  return {
    adapter: SELECTION_POOL_SOURCE_ADAPTER,
    version: SELECTION_POOL_SOURCE_VERSION,
    path: getSelectionPoolSourceArtifactRelativePath(featureId),
  };
}

function sanitizeObjectList(
  objects: SelectionPoolExampleObject[] | SelectionPoolAuthoredObject[],
): SelectionPoolAuthoredObject[] {
  return objects
    .filter((object) => isSelectionPoolAuthoredObject(object))
    .map((object) => ({
      id: object.id,
      label: object.label,
      description: object.description,
      weight: object.weight,
      tier: object.tier,
    }));
}

function buildSeedParameters(objectKind: SelectionPoolObjectKind): SelectionPoolFeatureAuthoringParameters {
  const seeded = buildSelectionPoolExampleParameters(objectKind);
  return {
    triggerKey: seeded.triggerKey,
    choiceCount: seeded.choiceCount,
    objectKind,
    objects: sanitizeObjectList(seeded.objects as SelectionPoolAuthoredObject[]),
    drawMode: seeded.drawMode || "multiple_without_replacement",
    duplicatePolicy: seeded.duplicatePolicy || "forbid",
    poolStateTracking: seeded.poolStateTracking || "session",
    selectionPolicy: seeded.selectionPolicy || "single",
    applyMode: seeded.applyMode || "immediate",
    postSelectionPoolBehavior: seeded.postSelectionPoolBehavior || "remove_selected_from_remaining",
    trackSelectedItems: seeded.trackSelectedItems !== false,
    display: deepClone(seeded.display || getDisplayDefaults(objectKind)),
    placeholderConfig: deepClone(seeded.placeholderConfig || getPlaceholderDefaults(objectKind)),
    effectProfile: deepClone(seeded.effectProfile || getEffectProfileDefaults()),
  };
}

function normalizeFeatureAuthoringParameters(
  objectKind: SelectionPoolObjectKind,
  raw: Partial<SelectionPoolFeatureAuthoringParameters>,
): SelectionPoolFeatureAuthoringParameters {
  const seed = buildSeedParameters(objectKind);
  const triggerKey = String(raw.triggerKey || seed.triggerKey).trim().toUpperCase();
  const choiceCount = Math.max(1, Math.min(5, Math.floor(Number(raw.choiceCount || seed.choiceCount))));
  const inventory = raw.inventory?.enabled === true
    ? {
        enabled: true,
        capacity: Math.max(1, Math.min(30, Math.floor(Number(raw.inventory.capacity || getInventoryDefaults(objectKind).capacity)))),
        storeSelectedItems: raw.inventory.storeSelectedItems !== false,
        blockDrawWhenFull: raw.inventory.blockDrawWhenFull !== false,
        fullMessage: raw.inventory.fullMessage || getInventoryDefaults(objectKind).fullMessage,
        presentation: "persistent_panel" as const,
      }
    : undefined;
  return {
    triggerKey,
    choiceCount,
    objectKind,
    objects: sanitizeObjectList(Array.isArray(raw.objects) && raw.objects.length > 0 ? raw.objects : getSelectionPoolDefaultObjects(objectKind)),
    drawMode: raw.drawMode || seed.drawMode || "multiple_without_replacement",
    duplicatePolicy: raw.duplicatePolicy || seed.duplicatePolicy || "forbid",
    poolStateTracking: raw.poolStateTracking || seed.poolStateTracking || "session",
    selectionPolicy: "single",
    applyMode: raw.applyMode || seed.applyMode || "immediate",
    postSelectionPoolBehavior: raw.postSelectionPoolBehavior || seed.postSelectionPoolBehavior || "remove_selected_from_remaining",
    trackSelectedItems: raw.trackSelectedItems ?? seed.trackSelectedItems ?? true,
    inventory,
    display: {
      ...getDisplayDefaults(objectKind),
      ...(raw.display || {}),
      minDisplayCount: Math.max(choiceCount, Number(raw.display?.minDisplayCount || seed.display?.minDisplayCount || choiceCount)),
      payloadShape: "card_with_rarity",
    },
    placeholderConfig: {
      ...getPlaceholderDefaults(objectKind),
      ...(raw.placeholderConfig || {}),
      disabled: raw.placeholderConfig?.disabled ?? true,
    },
    effectProfile: deepClone(raw.effectProfile || seed.effectProfile || getEffectProfileDefaults()),
  };
}

function buildPlaceholderObjects(
  objectKind: SelectionPoolObjectKind,
  startIndex: number,
  targetCount: number,
): SelectionPoolAuthoredObject[] {
  if (objectKind === "talent") {
    const canonicalTalentObjects = TALENT_EXPANSION_PLACEHOLDERS.map((object) => ({ ...object }));
    if (canonicalTalentObjects.length + startIndex >= targetCount) {
      return canonicalTalentObjects.slice(0, Math.max(0, targetCount - startIndex));
    }

    const genericTail = buildGenericPlaceholderObjects(objectKind, startIndex + canonicalTalentObjects.length, targetCount);
    return [...canonicalTalentObjects, ...genericTail];
  }

  return buildGenericPlaceholderObjects(objectKind, startIndex, targetCount);
}

function buildGenericPlaceholderObjects(
  objectKind: SelectionPoolObjectKind,
  startIndex: number,
  targetCount: number,
): SelectionPoolAuthoredObject[] {
  const baseLabel =
    objectKind === "equipment"
      ? "Equipment"
      : objectKind === "skill_card_placeholder"
        ? "Skill Card"
        : "Talent";
  const tiers: SelectionPoolObjectTier[] = ["R", "R", "R", "R", "R", "R", "SR", "SR", "SR", "SR", "SSR", "SSR", "SSR", "UR"];
  const objects: SelectionPoolAuthoredObject[] = [];
  for (let index = startIndex; objects.length + startIndex < targetCount && index - startIndex < tiers.length; index++) {
    const tier = tiers[index - startIndex];
    const serial = String(index + 1).padStart(3, "0");
    objects.push({
      id: `${baseLabel.replace(/\s+/g, "_").toUpperCase()}_${serial}`,
      label: `${baseLabel} ${serial}`,
      description:
        tier === "R"
          ? "+10 Strength"
          : tier === "SR"
            ? "+10 Agility"
            : tier === "SSR"
              ? "+10 Intelligence"
              : "+10 All Attributes",
      tier,
      weight: PLACEHOLDER_WEIGHT_BY_TIER[tier],
    });
  }
  return objects;
}

function mergeObjectExpansion(
  parameters: SelectionPoolFeatureAuthoringParameters,
  targetCount: number,
): SelectionPoolFeatureAuthoringParameters {
  if (parameters.objects.length >= targetCount) {
    return parameters;
  }
  const existingIds = new Set(parameters.objects.map((object) => object.id));
  const placeholders = buildPlaceholderObjects(parameters.objectKind, parameters.objects.length, targetCount)
    .filter((object) => !existingIds.has(object.id));
  return {
    ...parameters,
    objects: [...parameters.objects, ...placeholders].slice(0, targetCount),
  };
}

function tryReadSourceArtifact(pathRoot: string, relativePath: string): unknown | undefined {
  const fullPath = join(pathRoot, relativePath);
  if (!existsSync(fullPath)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf-8"));
  } catch {
    return undefined;
  }
}

function migrateLegacyTalentDrawArtifact(
  artifact: {
    adapter: "talent-draw";
    version: 1;
    featureId: string;
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
    placeholderConfig: { id: string; name: string; description: string; disabled: boolean };
    effectApplication: {
      enabled: boolean;
      rarityAttributeBonusMap: Record<string, { attribute: string; value: number }>;
    };
    inventory?: SelectionPoolInventoryContract;
    talents: Array<{
      id: string;
      label: string;
      description: string;
      tier: SelectionPoolObjectTier;
      weight: number;
    }>;
  },
): SelectionPoolFeatureSourceArtifactV1 {
  return {
    adapter: SELECTION_POOL_SOURCE_ADAPTER,
    version: SELECTION_POOL_SOURCE_VERSION,
    featureId: artifact.featureId,
    objectKind: "talent",
    triggerKey: artifact.triggerKey,
    choiceCount: artifact.choiceCount,
    drawMode: artifact.drawMode === "single" ? "single" : "multiple_without_replacement",
    duplicatePolicy:
      artifact.duplicatePolicy === "allow" || artifact.duplicatePolicy === "avoid_when_possible"
        ? artifact.duplicatePolicy
        : "forbid",
    poolStateTracking: artifact.poolStateTracking === "none" ? "none" : "session",
    selectionPolicy: "single",
    applyMode: artifact.applyMode === "deferred" ? "deferred" : "immediate",
    postSelectionPoolBehavior:
      artifact.postSelectionPoolBehavior === "none" ||
      artifact.postSelectionPoolBehavior === "remove_selected_from_remaining" ||
      artifact.postSelectionPoolBehavior === "remove_selected_and_keep_unselected_eligible"
        ? artifact.postSelectionPoolBehavior
        : "remove_selected_from_remaining",
    trackSelectedItems: artifact.trackSelectedItems,
    inventory: artifact.inventory ? deepClone(artifact.inventory) : undefined,
    display: {
      title: "Choose Your Talent",
      description: "Select one of the following talents",
      inventoryTitle: "Talent Inventory",
      payloadShape: "card_with_rarity",
      minDisplayCount: artifact.minDisplayCount,
    },
    placeholderConfig: deepClone(artifact.placeholderConfig),
    effectProfile: {
      kind: "tier_attribute_bonus_placeholder",
      rarityAttributeBonusMap: deepClone(artifact.effectApplication.rarityAttributeBonusMap),
    },
    objects: artifact.talents.map((talent) => ({
      id: talent.id,
      label: talent.label,
      description: talent.description,
      weight: talent.weight,
      tier: talent.tier,
    })),
  };
}

function loadExistingSourceArtifact(
  input: ResolveSelectionPoolFamilyInput,
  featureId: string,
): SelectionPoolFeatureSourceArtifactV1 | undefined {
  const sourceModelRef = input.existingFeature?.sourceModel;
  if (isSelectionPoolSourceModelRef(sourceModelRef)) {
    const raw = tryReadSourceArtifact(input.hostRoot, sourceModelRef.path);
    if (isSelectionPoolFeatureSourceArtifactV1(raw)) {
      return raw;
    }
  }
  if (isLegacyTalentDrawSourceModelRef(sourceModelRef)) {
    const raw = tryReadSourceArtifact(input.hostRoot, sourceModelRef.path);
    if (isLegacyTalentDrawArtifact(raw)) {
      return migrateLegacyTalentDrawArtifact(raw);
    }
  }
  const currentPath = getSelectionPoolSourceArtifactRelativePath(featureId);
  const currentRaw = tryReadSourceArtifact(input.hostRoot, currentPath);
  if (isSelectionPoolFeatureSourceArtifactV1(currentRaw)) {
    return currentRaw;
  }
  const legacyPath = getLegacyTalentDrawSourceArtifactRelativePath(featureId);
  const legacyRaw = tryReadSourceArtifact(input.hostRoot, legacyPath);
  if (isLegacyTalentDrawArtifact(legacyRaw)) {
    return migrateLegacyTalentDrawArtifact(legacyRaw);
  }
  return undefined;
}

function createFeatureAuthoringProposal(
  featureId: string,
  objectKind: SelectionPoolObjectKind,
  parameters: SelectionPoolFeatureAuthoringParameters,
  proposalSource: ResolveSelectionPoolFamilyInput["proposalSource"],
  notes: string[] = [],
): FeatureAuthoringProposal {
  return {
    mode: "source-backed",
    profile: "selection_pool",
    objectKind,
    parameters,
    parameterSurface: SELECTION_POOL_PARAMETER_SURFACE,
    proposalSource,
    notes: notes.length > 0 ? notes : undefined,
  };
}

function createFillIntentCandidates(source: FillIntentCandidate["source"]): FillIntentCandidate[] {
  return [
    {
      boundaryId: "weighted_pool.selection_policy",
      summary: "Use authored objects and the admitted duplicate/session rules to shape weighted candidate draws.",
      source,
    },
    {
      boundaryId: "selection_flow.effect_mapping",
      summary: "Translate the authored object tier/effect profile into the admitted immediate apply hook.",
      source,
    },
    {
      boundaryId: "ui.selection_modal.payload_adapter",
      summary: "Adapt authored object display fields into the admitted card tray payload.",
      source,
    },
  ];
}

function buildProposalFromExistingFeature(
  input: ResolveSelectionPoolFamilyInput,
  featureId: string,
  objectKind: SelectionPoolObjectKind,
): FeatureAuthoringProposal {
  const existingAuthoring =
    input.existingFeature?.featureAuthoring?.profile === "selection_pool"
      ? input.existingFeature.featureAuthoring
      : undefined;
  if (existingAuthoring) {
    return createFeatureAuthoringProposal(
      featureId,
      existingAuthoring.objectKind,
      normalizeFeatureAuthoringParameters(existingAuthoring.objectKind, existingAuthoring.parameters),
      input.proposalSource,
      ["selection_pool proposal migrated from existing workspace featureAuthoring."],
    );
  }
  const existingArtifact = loadExistingSourceArtifact(input, featureId);
  if (existingArtifact) {
    return createFeatureAuthoringProposal(
      featureId,
      existingArtifact.objectKind,
      normalizeFeatureAuthoringParameters(existingArtifact.objectKind, {
        triggerKey: existingArtifact.triggerKey,
        choiceCount: existingArtifact.choiceCount,
        objectKind: existingArtifact.objectKind,
        objects: existingArtifact.objects,
        drawMode: existingArtifact.drawMode,
        duplicatePolicy: existingArtifact.duplicatePolicy,
        poolStateTracking: existingArtifact.poolStateTracking,
        selectionPolicy: existingArtifact.selectionPolicy,
        applyMode: existingArtifact.applyMode,
        postSelectionPoolBehavior: existingArtifact.postSelectionPoolBehavior,
        trackSelectedItems: existingArtifact.trackSelectedItems,
        inventory: existingArtifact.inventory,
        display: existingArtifact.display,
        placeholderConfig: existingArtifact.placeholderConfig,
        effectProfile: existingArtifact.effectProfile,
      }),
      input.proposalSource,
      ["selection_pool proposal loaded from existing source artifact."],
    );
  }
  return createFeatureAuthoringProposal(
    featureId,
    objectKind,
    buildSeedParameters(objectKind),
    input.proposalSource,
    ["selection_pool proposal seeded from family example catalog."],
  );
}

function applyPromptMerge(
  input: ResolveSelectionPoolFamilyInput,
  featureId: string,
  proposal: FeatureAuthoringProposal,
): FeatureAuthoringProposal {
  const merged = normalizeFeatureAuthoringParameters(proposal.objectKind, {
    ...proposal.parameters,
    triggerKey: parseTriggerKey(input.prompt) || proposal.parameters.triggerKey,
    choiceCount: parseChoiceCount(input.prompt) || proposal.parameters.choiceCount,
    inventory: requestsSupportedInventory(input.prompt)
      ? getInventoryDefaults(proposal.objectKind)
      : proposal.parameters.inventory,
  });
  const shouldExpandToTwenty =
    requestsPoolExpansionToTwenty(input.prompt) ||
    normalizePrompt(input.prompt) === normalizePrompt(TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT);
  const requestedObjectCount = parseRequestedObjectCount(input.prompt);
  const expansionTarget = shouldExpandToTwenty ? requestedObjectCount || 20 : undefined;
  const finalParameters =
    expansionTarget && expansionTarget > merged.objects.length
      ? mergeObjectExpansion(merged, expansionTarget)
      : merged;
  return createFeatureAuthoringProposal(
    featureId,
    proposal.objectKind,
    finalParameters,
    input.proposalSource,
    dedupeStrings([
      ...(proposal.notes || []),
      requestsSupportedInventory(input.prompt)
        ? "selection_pool merged the admitted session-only inventory contract."
        : undefined,
      shouldExpandToTwenty
        ? "selection_pool merged an object-pool expansion inside the admitted single-skeleton family."
        : undefined,
    ]),
  );
}

function createScalarParameters(proposal: FeatureAuthoringProposal): Record<string, unknown> {
  return {
    triggerKey: proposal.parameters.triggerKey,
    choiceCount: proposal.parameters.choiceCount,
    objectKind: proposal.objectKind,
  };
}

export function getSelectionPoolParameterSurface(): SelectionPoolParameterSurface {
  return SELECTION_POOL_PARAMETER_SURFACE;
}

export function getSelectionPoolSourceArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/selection-pool.source.json`;
}

export function getLegacyTalentDrawSourceArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/talent-draw.source.json`;
}

export function resolveSelectionPoolFamily(
  input: ResolveSelectionPoolFamilyInput,
): ResolveSelectionPoolFamilyResult {
  if (!shouldHandleSelectionPoolFeature(input)) {
    return {
      handled: false,
      blocked: false,
      reasons: [],
    };
  }
  const objectKind = inferObjectKind(input.prompt, input.existingFeature) || "talent";
  const featureId = input.featureId?.trim() || input.existingFeature?.featureId || TALENT_DRAW_EXAMPLE.featureId;
  const blockReasons = collectFamilyBlockReasons(input.prompt);
  if (blockReasons.length > 0) {
    return {
      handled: true,
      blocked: true,
      reasons: blockReasons,
    };
  }
  const baseProposal =
    input.mode === "create"
      ? createFeatureAuthoringProposal(
          featureId,
          objectKind,
          buildSeedParameters(objectKind),
          input.proposalSource,
          ["selection_pool proposal seeded from family example catalog."],
        )
      : buildProposalFromExistingFeature(input, featureId, objectKind);
  const proposal = applyPromptMerge(input, featureId, baseProposal);
  return {
    handled: true,
    blocked: false,
    reasons: [],
    proposal,
    fillIntentCandidates: createFillIntentCandidates(
      input.proposalSource === "llm" ? "llm" : input.proposalSource === "existing-feature" ? "existing-feature" : "fallback",
    ),
    scalarParameters: createScalarParameters(proposal),
    notes: proposal.notes,
  };
}

function schemaHasSelectionPoolSkeleton(schema: IntentSchema): boolean {
  return Boolean(
    schema.normalizedMechanics.trigger &&
      schema.normalizedMechanics.candidatePool &&
      schema.normalizedMechanics.weightedSelection &&
      schema.normalizedMechanics.playerChoice &&
      schema.normalizedMechanics.uiModal,
  );
}

export function normalizeSelectionPoolFeatureAuthoringProposal(
  schema: IntentSchema,
  proposal: FeatureAuthoringProposal | undefined,
): FeatureAuthoringNormalizationResult {
  if (!proposal) {
    return { blockers: [], warnings: [], notes: [] };
  }
  const blockers: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  if (proposal.mode !== "source-backed" || proposal.profile !== "selection_pool") {
    blockers.push("Only the bounded selection_pool source-backed profile is admitted in the current Blueprint stage.");
    return { blockers, warnings, notes };
  }
  if (!schemaHasSelectionPoolSkeleton(schema)) {
    blockers.push("Blueprint-authorized selection_pool admission requires trigger + weighted_pool + player_choice + ui_modal skeleton signals.");
  }
  if (schema.classification.intentKind === "cross-system-composition") {
    blockers.push("selection_pool remains same-feature owned and does not admit cross-system composition.");
  }
  const normalized = normalizeFeatureAuthoringParameters(proposal.objectKind, proposal.parameters);
  if (!SELECTION_POOL_PARAMETER_SURFACE.triggerKey.allowList.includes(normalized.triggerKey)) {
    blockers.push(`selection_pool only supports one admitted hotkey from ${SELECTION_POOL_PARAMETER_SURFACE.triggerKey.allowList.join(", ")}.`);
  }
  if (normalized.choiceCount < 1 || normalized.choiceCount > 5) {
    blockers.push("selection_pool choiceCount must stay inside the admitted 1..5 bounded field.");
  }
  if (!SELECTION_POOL_OBJECT_KINDS.includes(proposal.objectKind)) {
    blockers.push("selection_pool only supports talent, equipment, or skill_card_placeholder object kinds.");
  }
  if (!Array.isArray(normalized.objects) || normalized.objects.length < 1) {
    blockers.push("selection_pool requires at least one authored object in the feature-owned collection.");
  }
  if (normalized.inventory?.enabled === true) {
    if (normalized.inventory.presentation !== "persistent_panel") {
      blockers.push('selection_pool inventory currently only supports presentation "persistent_panel".');
    }
    if (normalized.inventory.capacity < 1 || normalized.inventory.capacity > 30) {
      blockers.push("selection_pool inventory capacity must stay inside the admitted 1..30 bounded field.");
    }
  }
  if (schema.selection?.cardinality && schema.selection.cardinality !== "single") {
    blockers.push("selection_pool currently requires confirming exactly one candidate.");
  }
  if (proposal.parameters.effectProfile?.kind && proposal.parameters.effectProfile.kind !== "tier_attribute_bonus_placeholder") {
    blockers.push("selection_pool currently admits only the bounded placeholder tier effect profile.");
  }
  if (blockers.length > 0) {
    return { blockers, warnings, notes };
  }
  const featureAuthoring: FeatureAuthoring = {
    mode: "source-backed",
    profile: "selection_pool",
    objectKind: proposal.objectKind,
    parameters: normalized,
    parameterSurface: SELECTION_POOL_PARAMETER_SURFACE,
    notes: proposal.notes,
  };
  if (featureAuthoring.parameters.objects.length < featureAuthoring.parameters.choiceCount) {
    warnings.push("selection_pool authored object count is smaller than choiceCount; UI payload adaptation will need placeholder padding.");
  }
  notes.push("Blueprint stage admitted a bounded selection_pool source-backed profile.");
  if (proposal.proposalSource) {
    notes.push(`featureAuthoringProposal source: ${proposal.proposalSource}`);
  }
  return { featureAuthoring, blockers, warnings, notes };
}

function compileEffectApplication(
  effectProfile: SelectionPoolFeatureAuthoringParameters["effectProfile"],
): Record<string, unknown> | undefined {
  return effectProfile
    ? {
        enabled: true,
        rarityAttributeBonusMap: deepClone(effectProfile.rarityAttributeBonusMap),
      }
    : undefined;
}

export function compileSelectionPoolModuleParameters(
  featureAuthoring: FeatureAuthoring,
): SelectionPoolCompiledModuleParameters {
  const params = featureAuthoring.parameters;
  const display = params.display || getDisplayDefaults(featureAuthoring.objectKind);
  return {
    input_trigger: {
      triggerKey: params.triggerKey,
      key: params.triggerKey,
      eventName: "rune_weaver_selection_pool_triggered",
    },
    weighted_pool: {
      entries: params.objects.map((object) => ({
        id: object.id,
        label: object.label,
        description: object.description,
        weight: object.weight,
        tier: object.tier,
      })),
      choiceCount: params.choiceCount,
      drawMode: params.drawMode || "multiple_without_replacement",
      duplicatePolicy: params.duplicatePolicy || "forbid",
      poolStateTracking: params.poolStateTracking || "session",
    },
    selection_flow: {
      choiceCount: params.choiceCount,
      selectionPolicy: "single",
      applyMode: params.applyMode || "immediate",
      postSelectionPoolBehavior: params.postSelectionPoolBehavior || "remove_selected_from_remaining",
      trackSelectedItems: params.trackSelectedItems !== false,
      ...(compileEffectApplication(params.effectProfile)
        ? { effectApplication: compileEffectApplication(params.effectProfile) }
        : {}),
      ...(params.inventory ? { inventory: deepClone(params.inventory) } : {}),
    },
    selection_modal: {
      objectKind: featureAuthoring.objectKind,
      choiceCount: params.choiceCount,
      title: display.title,
      description: display.description,
      inventoryTitle: display.inventoryTitle,
      payloadShape: display.payloadShape || "card_with_rarity",
      minDisplayCount: Math.max(params.choiceCount, Number(display.minDisplayCount || params.choiceCount)),
      placeholderConfig: deepClone(params.placeholderConfig || getPlaceholderDefaults(featureAuthoring.objectKind)),
      layoutPreset: "card_tray",
      selectionMode: "single",
      dismissBehavior: "selection_only",
      ...(params.inventory ? { inventory: deepClone(params.inventory) } : {}),
    },
  };
}

function createFillContract(
  boundaryId: "weighted_pool.selection_policy" | "selection_flow.effect_mapping" | "ui.selection_modal.payload_adapter",
  targetModuleId: string,
  targetPatternId: string,
  sourceBindings: string[],
  invariants: string[],
  expectedOutput: string,
): FillContract {
  const boundary = dota2GapFillBoundaryProvider.getBoundary(boundaryId);
  return {
    boundaryId,
    targetModuleId,
    targetPatternId,
    mode: "closed",
    sourceBindings,
    allowed: boundary?.allowed || [],
    forbidden: boundary?.forbidden || [],
    invariants,
    expectedOutput,
    fallbackPolicy: "deterministic-default",
  };
}

export function buildSelectionPoolFillContracts(modules: BlueprintModule[]): FillContract[] {
  const moduleByRole = new Map(modules.map((module) => [module.role, module] as const));
  const weightedPoolModule = moduleByRole.get("weighted_pool");
  const selectionFlowModule = moduleByRole.get("selection_flow");
  const selectionModalModule = moduleByRole.get("selection_modal");
  const contracts: FillContract[] = [];
  if (weightedPoolModule) {
    contracts.push(
      createFillContract(
        "weighted_pool.selection_policy",
        weightedPoolModule.id,
        "data.weighted_pool",
        [
          "featureAuthoring.parameters.objects",
          "featureAuthoring.parameters.choiceCount",
          "featureAuthoring.parameters.drawMode",
          "featureAuthoring.parameters.duplicatePolicy",
          "featureAuthoring.parameters.poolStateTracking",
        ],
        [
          "keep pool state ownership inside data.weighted_pool",
          "do not invent persistence or host routing changes",
        ],
        "Produce weighted candidate draw policy inside the existing weighted pool API.",
      ),
    );
  }
  if (selectionFlowModule) {
    contracts.push(
      createFillContract(
        "selection_flow.effect_mapping",
        selectionFlowModule.id,
        "rule.selection_flow",
        [
          "featureAuthoring.parameters.objects",
          "featureAuthoring.parameters.effectProfile",
          "featureAuthoring.parameters.inventory",
        ],
        [
          "do not move session ownership out of data.weighted_pool",
          "do not invent new event channels or cross-feature grants",
        ],
        "Translate the authored object/effect profile into the admitted selection confirmation and immediate-apply hook.",
      ),
    );
  }
  if (selectionModalModule) {
    contracts.push(
      createFillContract(
        "ui.selection_modal.payload_adapter",
        selectionModalModule.id,
        "ui.selection_modal",
        [
          "featureAuthoring.parameters.objects",
          "featureAuthoring.parameters.display",
          "featureAuthoring.parameters.placeholderConfig",
          "featureAuthoring.parameters.inventory",
        ],
        [
          "keep trigger ownership out of ui.selection_modal",
          "do not change transport events or root mount wiring",
        ],
        "Adapt authored object display fields into the admitted card tray payload.",
      ),
    );
  }
  return contracts;
}

export function materializeSelectionPoolSourceArtifact(
  featureId: string,
  featureAuthoring: FeatureAuthoring,
): SelectionPoolLifecycleState {
  const params = normalizeFeatureAuthoringParameters(featureAuthoring.objectKind, featureAuthoring.parameters);
  const sourceArtifactRef = createSourceModelRef(featureId);
  const sourceArtifact: SelectionPoolFeatureSourceArtifactV1 = {
    adapter: SELECTION_POOL_SOURCE_ADAPTER,
    version: SELECTION_POOL_SOURCE_VERSION,
    featureId,
    objectKind: featureAuthoring.objectKind,
    triggerKey: params.triggerKey,
    choiceCount: params.choiceCount,
    drawMode: params.drawMode || "multiple_without_replacement",
    duplicatePolicy: params.duplicatePolicy || "forbid",
    poolStateTracking: params.poolStateTracking || "session",
    selectionPolicy: "single",
    applyMode: params.applyMode || "immediate",
    postSelectionPoolBehavior: params.postSelectionPoolBehavior || "remove_selected_from_remaining",
    trackSelectedItems: params.trackSelectedItems !== false,
    display: deepClone(params.display),
    placeholderConfig: deepClone(params.placeholderConfig),
    inventory: params.inventory ? deepClone(params.inventory) : undefined,
    effectProfile: params.effectProfile ? deepClone(params.effectProfile) : undefined,
    objects: params.objects.map((object) => ({ ...object })),
  };
  return {
    featureAuthoring: {
      ...featureAuthoring,
      parameters: params,
      sourceArtifactRef,
    },
    sourceArtifact,
    sourceArtifactRef,
  };
}

export function createSelectionPoolLifecycleState(
  featureId: string,
  featureAuthoring: FeatureAuthoring | undefined,
): SelectionPoolLifecycleState | undefined {
  if (!featureAuthoring || featureAuthoring.profile !== "selection_pool") {
    return undefined;
  }
  return materializeSelectionPoolSourceArtifact(featureId, featureAuthoring);
}

export function applySelectionPoolIntentContract(
  schema: IntentSchema,
  resolution: ResolveSelectionPoolFamilyResult,
): IntentSchema {
  if (!resolution.handled) {
    return schema;
  }
  if (resolution.blocked) {
    return {
      ...schema,
      readiness: "blocked",
      isReadyForBlueprint: false,
      requiredClarifications: [
        ...(schema.requiredClarifications || []),
        ...resolution.reasons.map((reason, index) => ({
          id: `selection_pool_block_${index + 1}`,
          question: reason,
          blocksFinalization: true,
        })),
      ],
    };
  }
  const proposal = resolution.proposal;
  if (!proposal) {
    return schema;
  }
  return {
    ...schema,
    readiness: "ready",
    isReadyForBlueprint: true,
    featureAuthoringProposal: proposal,
    fillIntentCandidates: resolution.fillIntentCandidates,
    normalizedMechanics: {
      ...(schema.normalizedMechanics || {}),
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    selection: {
      ...schema.selection,
      mode: "user-chosen",
      cardinality: "single",
      repeatability: schema.selection?.repeatability || "repeatable",
      duplicatePolicy: "forbid",
      ...(proposal.parameters.inventory ? { inventory: proposal.parameters.inventory } : {}),
    },
    uiRequirements: {
      ...(schema.uiRequirements || {}),
      needed: true,
      surfaces: dedupeStrings([...(schema.uiRequirements?.surfaces || []), "selection_modal"]),
    },
    requiredClarifications: (schema.requiredClarifications || []).filter((item) => !item.blocksFinalization),
    uncertainties: [],
    openQuestions: [],
    stateModel: undefined,
    requirements: {
      ...schema.requirements,
      typed: (schema.requirements.typed || []).filter((requirement) => requirement.kind !== "state"),
    },
    resolvedAssumptions: dedupeStrings([
      ...(schema.resolvedAssumptions || []),
      "selection_pool intent contract was clamped to the admitted single-trigger weighted-choice skeleton.",
      ...(resolution.notes || []),
    ]),
  };
}

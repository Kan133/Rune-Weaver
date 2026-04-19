import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type {
  BlueprintModule,
  FeatureAuthoring as CoreFeatureAuthoring,
  FeatureAuthoringProposal as CoreFeatureAuthoringProposal,
  FillContract,
  FillIntentCandidate,
  IntentSchema,
  SelectionPoolAuthoredObject,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolObjectKind,
  SelectionPoolObjectTier,
  SelectionPoolParameterSurface,
  UpdateIntent,
} from "../../../../core/schema/types.js";
import type {
  FeatureSourceModelRef,
  RuneWeaverFeatureRecord,
} from "../../../../core/workspace/types.js";
import { dota2GapFillBoundaryProvider } from "../../gap-fill/boundaries.js";
import {
  getSelectionPoolExampleById,
  getSelectionPoolExampleExpansionObjects,
  getSelectionPoolExampleInventoryDefaults,
  type SelectionPoolExampleObject,
} from "./examples.js";

type FeatureAuthoring = CoreFeatureAuthoring<
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolParameterSurface
>;
type FeatureAuthoringProposal = CoreFeatureAuthoringProposal<
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolParameterSurface
>;

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
  objectKind?: SelectionPoolObjectKind;
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

export interface SelectionPoolCurrentContextHints {
  admittedSkeleton: string[];
  preservedInvariants: string[];
  boundedFields: Record<string, unknown>;
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
const DEFAULT_SELECTION_POOL_DISPLAY: NonNullable<SelectionPoolFeatureAuthoringParameters["display"]> = {
  title: "Choose Your Selection",
  description: "Select one of the following options",
  inventoryTitle: "Selection Inventory",
  payloadShape: "card_with_rarity",
  minDisplayCount: 3,
};
const DEFAULT_SELECTION_POOL_PLACEHOLDER: NonNullable<SelectionPoolFeatureAuthoringParameters["placeholderConfig"]> = {
  id: "empty_selection_slot",
  name: "Empty Slot",
  description: "No selection available",
  disabled: true,
};
const DEFAULT_SELECTION_POOL_EFFECT_PROFILE: NonNullable<SelectionPoolFeatureAuthoringParameters["effectProfile"]> = {
  kind: "tier_attribute_bonus_placeholder",
  rarityAttributeBonusMap: {
    R: { attribute: "strength", value: 10 },
    SR: { attribute: "agility", value: 10 },
    SSR: { attribute: "intelligence", value: 10 },
    UR: { attribute: "all", value: 10 },
  },
};
const GENERIC_SELECTION_POOL_SEED_OBJECTS: SelectionPoolAuthoredObject[] = [
  { id: "SEL_R001", label: "Selection Boost 01", description: "+10 Strength", weight: 40, tier: "R" },
  { id: "SEL_R002", label: "Selection Boost 02", description: "+10 Strength", weight: 40, tier: "R" },
  { id: "SEL_SR001", label: "Selection Edge 01", description: "+10 Agility", weight: 30, tier: "SR" },
  { id: "SEL_SR002", label: "Selection Edge 02", description: "+10 Agility", weight: 30, tier: "SR" },
  { id: "SEL_SSR001", label: "Selection Insight 01", description: "+10 Intelligence", weight: 20, tier: "SSR" },
  { id: "SEL_UR001", label: "Selection Apex 01", description: "+10 All Attributes", weight: 10, tier: "UR" },
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

function resolveSelectionPoolObjectKind(value: unknown): SelectionPoolObjectKind | undefined {
  return SELECTION_POOL_OBJECT_KINDS.includes(value as SelectionPoolObjectKind)
    ? (value as SelectionPoolObjectKind)
    : undefined;
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

export function isSelectionPoolFeatureAuthoring(
  value: CoreFeatureAuthoring | undefined | null,
): value is FeatureAuthoring {
  return Boolean(
    value &&
      value.mode === "source-backed" &&
      value.profile === "selection_pool" &&
      typeof value.parameters === "object" &&
      value.parameters !== null &&
      typeof (value.parameters as Record<string, unknown>).triggerKey === "string" &&
      typeof (value.parameters as Record<string, unknown>).choiceCount === "number" &&
      Array.isArray((value.parameters as Record<string, unknown>).objects),
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
    (raw.objectKind === undefined || resolveSelectionPoolObjectKind(raw.objectKind) !== undefined) &&
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

function getDisplayDefaults(): NonNullable<SelectionPoolFeatureAuthoringParameters["display"]> {
  return deepClone(DEFAULT_SELECTION_POOL_DISPLAY);
}

function getPlaceholderDefaults(): NonNullable<SelectionPoolFeatureAuthoringParameters["placeholderConfig"]> {
  return deepClone(DEFAULT_SELECTION_POOL_PLACEHOLDER);
}

function getEffectProfileDefaults(): NonNullable<SelectionPoolFeatureAuthoringParameters["effectProfile"]> {
  return deepClone(DEFAULT_SELECTION_POOL_EFFECT_PROFILE);
}

function getInventoryDefaults(): SelectionPoolInventoryContract {
  return {
    enabled: true,
    capacity: 15,
    storeSelectedItems: true,
    blockDrawWhenFull: true,
    fullMessage: "Selection inventory full",
    presentation: "persistent_panel",
  };
}

function inferObjectKind(prompt: string, existingFeature?: RuneWeaverFeatureRecord | null): SelectionPoolObjectKind | undefined {
  const normalized = normalizePrompt(prompt);
  const existingKind =
    isSelectionPoolFeatureAuthoring(existingFeature?.featureAuthoring)
      ? (
          resolveSelectionPoolObjectKind(existingFeature.featureAuthoring.parameters.objectKind)
          || resolveSelectionPoolObjectKind(existingFeature.featureAuthoring.objectKind)
        )
      : undefined;
  if (existingKind) {
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
  const explicitChange = prompt.match(
    /(?:from|浠?)(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\s*(?:to|鏀规垚|鏀逛负|鍒囨崲涓?|鎹㈡垚|鏇挎崲涓?)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
  );
  if (explicitChange?.[2]) {
    return explicitChange[2].toUpperCase();
  }

  const targetOnly = prompt.match(
    /(?:to|鏀规垚|鏀逛负|鍒囨崲涓?|鎹㈡垚|鏇挎崲涓?)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
  );
  if (targetOnly?.[1]) {
    return targetOnly[1].toUpperCase();
  }

  const contextualMatch = prompt.match(
    /(?:按(?:下)?|触发键|按键|快捷键|hotkey|trigger key|press)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
  );
  if (contextualMatch) {
    return contextualMatch[1].toUpperCase();
  }

  const allKeys = Array.from(prompt.matchAll(/\b(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/ig));
  const lastKey = allKeys.at(-1)?.[1];
  return lastKey ? lastKey.toUpperCase() : undefined;
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
      isLegacyTalentDrawSourceModelRef(input.existingFeature?.sourceModel),
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

function buildGenericSeedObjects(): SelectionPoolAuthoredObject[] {
  return GENERIC_SELECTION_POOL_SEED_OBJECTS.map((object) => ({ ...object }));
}

function normalizeFeatureAuthoringParameters(
  raw: Partial<SelectionPoolFeatureAuthoringParameters>,
  objectKindHint?: SelectionPoolObjectKind,
): SelectionPoolFeatureAuthoringParameters {
  const metadataObjectKind = resolveSelectionPoolObjectKind(raw.objectKind) || objectKindHint;
  const triggerKey = String(raw.triggerKey || "F4").trim().toUpperCase();
  const choiceCount = Math.max(1, Math.min(5, Math.floor(Number(raw.choiceCount || 3))));
  const inventory = raw.inventory?.enabled === true
    ? {
        enabled: true,
        capacity: Math.max(1, Math.min(30, Math.floor(Number(raw.inventory.capacity || getInventoryDefaults().capacity)))),
        storeSelectedItems: raw.inventory.storeSelectedItems !== false,
        blockDrawWhenFull: raw.inventory.blockDrawWhenFull !== false,
        fullMessage: raw.inventory.fullMessage || getInventoryDefaults().fullMessage,
        presentation: "persistent_panel" as const,
      }
    : undefined;
  const normalized: SelectionPoolFeatureAuthoringParameters = {
    triggerKey,
    choiceCount,
    objects: sanitizeObjectList(Array.isArray(raw.objects) && raw.objects.length > 0 ? raw.objects : buildGenericSeedObjects()),
    drawMode: raw.drawMode || "multiple_without_replacement",
    duplicatePolicy: raw.duplicatePolicy || "forbid",
    poolStateTracking: raw.poolStateTracking || "session",
    selectionPolicy: "single",
    applyMode: raw.applyMode || "immediate",
    postSelectionPoolBehavior: raw.postSelectionPoolBehavior || "remove_selected_from_remaining",
    trackSelectedItems: raw.trackSelectedItems ?? true,
    inventory,
    display: {
      ...getDisplayDefaults(),
      ...(raw.display || {}),
      minDisplayCount: Math.max(choiceCount, Number(raw.display?.minDisplayCount || choiceCount)),
      payloadShape: "card_with_rarity",
    },
    placeholderConfig: {
      ...getPlaceholderDefaults(),
      ...(raw.placeholderConfig || {}),
      disabled: raw.placeholderConfig?.disabled ?? true,
    },
    effectProfile: deepClone(raw.effectProfile || getEffectProfileDefaults()),
  };

  if (metadataObjectKind) {
    normalized.objectKind = metadataObjectKind;
  }

  return normalized;
}

function buildGenericSeedParameters(): SelectionPoolFeatureAuthoringParameters {
  return normalizeFeatureAuthoringParameters({
    triggerKey: "F4",
    choiceCount: 3,
    objects: buildGenericSeedObjects(),
    drawMode: "multiple_without_replacement",
    duplicatePolicy: "forbid",
    poolStateTracking: "session",
    selectionPolicy: "single",
    applyMode: "immediate",
    postSelectionPoolBehavior: "remove_selected_from_remaining",
    trackSelectedItems: true,
    display: getDisplayDefaults(),
    placeholderConfig: getPlaceholderDefaults(),
    effectProfile: getEffectProfileDefaults(),
  });
}

function buildExampleSeedParameters(featureId: string | undefined): SelectionPoolFeatureAuthoringParameters | undefined {
  const example = featureId ? getSelectionPoolExampleById(featureId) : undefined;
  if (!example) {
    return undefined;
  }

  return normalizeFeatureAuthoringParameters(
    deepClone(example.parameters),
    example.objectKind,
  );
}

function buildPlaceholderObjects(
  startIndex: number,
  targetCount: number,
): SelectionPoolAuthoredObject[] {
  return buildGenericPlaceholderObjects(startIndex, targetCount);
}

function buildGenericPlaceholderObjects(
  startIndex: number,
  targetCount: number,
): SelectionPoolAuthoredObject[] {
  const baseLabel = "Selection";
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
  const placeholders = buildPlaceholderObjects(parameters.objects.length, targetCount)
    .filter((object) => !existingIds.has(object.id));
  return {
    ...parameters,
    objects: [...parameters.objects, ...placeholders].slice(0, targetCount),
  };
}

function mergeObjectExpansionPreset(
  parameters: SelectionPoolFeatureAuthoringParameters,
  targetCount: number,
  presetObjects: SelectionPoolExampleObject[],
): SelectionPoolFeatureAuthoringParameters {
  const existingIds = new Set(parameters.objects.map((object) => object.id));
  const appended = sanitizeObjectList(presetObjects).filter((object) => !existingIds.has(object.id));
  const withPreset = {
    ...parameters,
    objects: [...parameters.objects, ...appended],
  };
  return withPreset.objects.length >= targetCount ? withPreset : mergeObjectExpansion(withPreset, targetCount);
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
      ...getDisplayDefaults(),
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
  parameters: SelectionPoolFeatureAuthoringParameters,
  proposalSource: ResolveSelectionPoolFamilyInput["proposalSource"],
  notes: string[] = [],
): FeatureAuthoringProposal {
  return {
    mode: "source-backed",
    profile: "selection_pool",
    ...(parameters.objectKind ? { objectKind: parameters.objectKind } : {}),
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
  objectKindHint: SelectionPoolObjectKind | undefined,
): FeatureAuthoringProposal {
  const existingAuthoring =
    isSelectionPoolFeatureAuthoring(input.existingFeature?.featureAuthoring)
      ? input.existingFeature.featureAuthoring
      : undefined;
  if (existingAuthoring) {
    return createFeatureAuthoringProposal(
      normalizeFeatureAuthoringParameters(
        existingAuthoring.parameters,
        resolveSelectionPoolObjectKind(existingAuthoring.parameters.objectKind)
          || resolveSelectionPoolObjectKind(existingAuthoring.objectKind)
          || objectKindHint,
      ),
      input.proposalSource,
      ["selection_pool proposal migrated from existing workspace featureAuthoring."],
    );
  }
  const existingArtifact = loadExistingSourceArtifact(input, featureId);
  if (existingArtifact) {
    return createFeatureAuthoringProposal(
      normalizeFeatureAuthoringParameters({
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
      }, resolveSelectionPoolObjectKind(existingArtifact.objectKind) || objectKindHint),
      input.proposalSource,
      ["selection_pool proposal loaded from existing source artifact."],
    );
  }

  const exampleSeed = buildExampleSeedParameters(featureId);
  if (exampleSeed) {
    return createFeatureAuthoringProposal(
      exampleSeed,
      input.proposalSource,
      ["selection_pool proposal seeded from example catalog for example replay."],
    );
  }

  return createFeatureAuthoringProposal(
    buildGenericSeedParameters(),
    input.proposalSource,
    ["selection_pool proposal seeded from generic family defaults."],
  );
}

function applyPromptMerge(
  input: ResolveSelectionPoolFamilyInput,
  featureId: string,
  proposal: FeatureAuthoringProposal,
): FeatureAuthoringProposal {
  const metadataObjectKind =
    resolveSelectionPoolObjectKind(proposal.parameters.objectKind)
    || resolveSelectionPoolObjectKind(proposal.objectKind)
    || inferObjectKind(input.prompt, input.existingFeature);
  const exampleInventoryDefaults = requestsSupportedInventory(input.prompt)
    ? getSelectionPoolExampleInventoryDefaults(featureId)
    : undefined;
  const merged = normalizeFeatureAuthoringParameters({
    ...proposal.parameters,
    triggerKey: parseTriggerKey(input.prompt) || proposal.parameters.triggerKey,
    choiceCount: parseChoiceCount(input.prompt) || proposal.parameters.choiceCount,
    inventory: requestsSupportedInventory(input.prompt)
      ? deepClone(exampleInventoryDefaults || getInventoryDefaults())
      : proposal.parameters.inventory,
  }, metadataObjectKind);
  const requestedObjectCount = parseRequestedObjectCount(input.prompt);
  const expansionTarget =
    requestedObjectCount && requestedObjectCount > merged.objects.length
      ? requestedObjectCount
      : undefined;
  const exampleExpansionObjects = expansionTarget
    ? getSelectionPoolExampleExpansionObjects(featureId, expansionTarget)
    : undefined;
  const finalParameters = expansionTarget
    ? exampleExpansionObjects
      ? mergeObjectExpansionPreset(merged, expansionTarget, exampleExpansionObjects)
      : mergeObjectExpansion(merged, expansionTarget)
    : merged;
  return createFeatureAuthoringProposal(
    finalParameters,
    input.proposalSource,
    dedupeStrings([
      ...(proposal.notes || []),
      requestsSupportedInventory(input.prompt)
        ? "selection_pool merged the admitted session-only inventory contract."
        : undefined,
      expansionTarget
        ? exampleExpansionObjects
          ? "selection_pool merged an object-pool expansion and replayed the example preset for the same feature."
          : "selection_pool merged an object-pool expansion inside the admitted single-skeleton family."
        : undefined,
    ]),
  );
}

function createScalarParameters(proposal: FeatureAuthoringProposal): Record<string, unknown> {
  return {
    triggerKey: proposal.parameters.triggerKey,
    choiceCount: proposal.parameters.choiceCount,
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

function resolveSelectionPoolParametersFromFeature(
  feature: RuneWeaverFeatureRecord,
  sourceArtifact?: Record<string, unknown>,
): SelectionPoolFeatureAuthoringParameters | undefined {
  if (isSelectionPoolFeatureAuthoring(feature.featureAuthoring)) {
    return normalizeFeatureAuthoringParameters(
      feature.featureAuthoring.parameters,
      resolveSelectionPoolObjectKind(feature.featureAuthoring.parameters.objectKind)
        || resolveSelectionPoolObjectKind(feature.featureAuthoring.objectKind),
    );
  }

  if (isSelectionPoolFeatureSourceArtifactV1(sourceArtifact)) {
    return normalizeFeatureAuthoringParameters(
      {
        triggerKey: sourceArtifact.triggerKey,
        choiceCount: sourceArtifact.choiceCount,
        objectKind: sourceArtifact.objectKind,
        objects: sourceArtifact.objects,
        drawMode: sourceArtifact.drawMode,
        duplicatePolicy: sourceArtifact.duplicatePolicy,
        poolStateTracking: sourceArtifact.poolStateTracking,
        selectionPolicy: sourceArtifact.selectionPolicy,
        applyMode: sourceArtifact.applyMode,
        postSelectionPoolBehavior: sourceArtifact.postSelectionPoolBehavior,
        trackSelectedItems: sourceArtifact.trackSelectedItems,
        inventory: sourceArtifact.inventory,
        display: sourceArtifact.display,
        placeholderConfig: sourceArtifact.placeholderConfig,
        effectProfile: sourceArtifact.effectProfile,
      },
      resolveSelectionPoolObjectKind(sourceArtifact.objectKind),
    );
  }

  if (isLegacyTalentDrawArtifact(sourceArtifact)) {
    const migrated = migrateLegacyTalentDrawArtifact(sourceArtifact);
    return normalizeFeatureAuthoringParameters(
      {
        triggerKey: migrated.triggerKey,
        choiceCount: migrated.choiceCount,
        objectKind: migrated.objectKind,
        objects: migrated.objects,
        drawMode: migrated.drawMode,
        duplicatePolicy: migrated.duplicatePolicy,
        poolStateTracking: migrated.poolStateTracking,
        selectionPolicy: migrated.selectionPolicy,
        applyMode: migrated.applyMode,
        postSelectionPoolBehavior: migrated.postSelectionPoolBehavior,
        trackSelectedItems: migrated.trackSelectedItems,
        inventory: migrated.inventory,
        display: migrated.display,
        placeholderConfig: migrated.placeholderConfig,
        effectProfile: migrated.effectProfile,
      },
      resolveSelectionPoolObjectKind(migrated.objectKind),
    );
  }

  return undefined;
}

export function deriveSelectionPoolCurrentContextHints(
  feature: RuneWeaverFeatureRecord,
  sourceArtifact?: Record<string, unknown>,
): SelectionPoolCurrentContextHints | undefined {
  const parameters = resolveSelectionPoolParametersFromFeature(feature, sourceArtifact);
  if (!parameters) {
    return undefined;
  }

  return {
    admittedSkeleton: [
      "input.key_binding",
      "data.weighted_pool",
      "rule.selection_flow",
      "ui.selection_modal",
    ],
    preservedInvariants: [...SELECTION_POOL_PARAMETER_SURFACE.invariants],
    boundedFields: {
      triggerKey: parameters.triggerKey,
      choiceCount: parameters.choiceCount,
      objectCount: parameters.objects.length,
      inventoryEnabled: parameters.inventory?.enabled === true,
      inventoryCapacity: parameters.inventory?.capacity,
      inventoryFullMessage: parameters.inventory?.fullMessage,
      ...(parameters.objectKind ? { objectKind: parameters.objectKind } : {}),
    },
  };
}

export function mergeSelectionPoolFeatureAuthoringForUpdate(input: {
  currentFeatureAuthoring: FeatureAuthoring;
  requestedChange: IntentSchema;
  updateIntent: UpdateIntent;
}): FeatureAuthoring {
  const { currentFeatureAuthoring, requestedChange, updateIntent } = input;
  const featureId = updateIntent.target.featureId;
  const metadataObjectKind =
    resolveSelectionPoolObjectKind(currentFeatureAuthoring.parameters.objectKind)
    || resolveSelectionPoolObjectKind(currentFeatureAuthoring.objectKind);
  let merged = normalizeFeatureAuthoringParameters(
    currentFeatureAuthoring.parameters,
    metadataObjectKind,
  );

  const requestedTriggerKey = parseTriggerKey(requestedChange.request.rawPrompt);
  if (requestedTriggerKey) {
    merged = normalizeFeatureAuthoringParameters(
      {
        ...merged,
        triggerKey: requestedTriggerKey,
      },
      metadataObjectKind,
    );
  }

  const requestedChoiceCount =
    (typeof requestedChange.selection?.choiceCount === "number" && requestedChange.selection.choiceCount > 0
      ? Math.floor(requestedChange.selection.choiceCount)
      : undefined)
    || parseChoiceCount(requestedChange.request.rawPrompt);
  if (typeof requestedChoiceCount === "number") {
    merged = normalizeFeatureAuthoringParameters(
      {
        ...merged,
        choiceCount: requestedChoiceCount,
      },
      metadataObjectKind,
    );
  }

  if (requestedChange.selection?.inventory?.enabled === true) {
    const requestedInventory = requestedChange.selection.inventory;
    const exampleDefaults = getSelectionPoolExampleInventoryDefaults(featureId);
    merged = normalizeFeatureAuthoringParameters(
      {
        ...merged,
        inventory: {
          enabled: true,
          capacity: requestedInventory.capacity || merged.inventory?.capacity || exampleDefaults?.capacity || getInventoryDefaults().capacity,
          storeSelectedItems: requestedInventory.storeSelectedItems !== false,
          blockDrawWhenFull: requestedInventory.blockDrawWhenFull !== false,
          fullMessage:
            requestedInventory.fullMessage
            || merged.inventory?.fullMessage
            || exampleDefaults?.fullMessage
            || getInventoryDefaults().fullMessage,
          presentation: "persistent_panel",
        },
      },
      metadataObjectKind,
    );
  }

  const requestedObjectCount = parseRequestedObjectCount(requestedChange.request.rawPrompt);
  if (requestedObjectCount && requestedObjectCount > merged.objects.length) {
    const exampleExpansionObjects = getSelectionPoolExampleExpansionObjects(featureId, requestedObjectCount);
    merged = exampleExpansionObjects
      ? mergeObjectExpansionPreset(merged, requestedObjectCount, exampleExpansionObjects)
      : mergeObjectExpansion(merged, requestedObjectCount);
  }

  return {
    ...currentFeatureAuthoring,
    ...(metadataObjectKind ? { objectKind: metadataObjectKind } : {}),
    parameters: merged,
    notes: dedupeStrings([
      ...(currentFeatureAuthoring.notes || []),
      "selection_pool update merge was normalized from workspace-backed current feature context and UpdateIntent authority.",
    ]),
  };
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
  const objectKindHint = inferObjectKind(input.prompt, input.existingFeature);
  const featureId = input.featureId?.trim() || input.existingFeature?.featureId || "";
  const blockReasons = collectFamilyBlockReasons(input.prompt);
  if (blockReasons.length > 0) {
    return {
      handled: true,
      blocked: true,
      reasons: blockReasons,
    };
  }
  const exampleSeed = buildExampleSeedParameters(featureId);
  const baseProposal =
    input.mode === "create"
      ? createFeatureAuthoringProposal(
          exampleSeed || buildGenericSeedParameters(),
          input.proposalSource,
          exampleSeed
            ? ["selection_pool proposal seeded from example catalog for example replay."]
            : ["selection_pool proposal seeded from generic family defaults."],
        )
      : buildProposalFromExistingFeature(input, featureId, objectKindHint);
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
  const metadataObjectKind =
    resolveSelectionPoolObjectKind(proposal.parameters.objectKind)
    || resolveSelectionPoolObjectKind(proposal.objectKind);
  const normalized = normalizeFeatureAuthoringParameters(proposal.parameters, metadataObjectKind);
  if (!SELECTION_POOL_PARAMETER_SURFACE.triggerKey.allowList.includes(normalized.triggerKey)) {
    blockers.push(`selection_pool only supports one admitted hotkey from ${SELECTION_POOL_PARAMETER_SURFACE.triggerKey.allowList.join(", ")}.`);
  }
  if (normalized.choiceCount < 1 || normalized.choiceCount > 5) {
    blockers.push("selection_pool choiceCount must stay inside the admitted 1..5 bounded field.");
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
    ...(normalized.objectKind ? { objectKind: normalized.objectKind } : {}),
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
  const params = normalizeFeatureAuthoringParameters(
    featureAuthoring.parameters,
    resolveSelectionPoolObjectKind(featureAuthoring.parameters.objectKind)
      || resolveSelectionPoolObjectKind(featureAuthoring.objectKind),
  );
  const display = params.display || getDisplayDefaults();
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
      choiceCount: params.choiceCount,
      title: display.title,
      description: display.description,
      inventoryTitle: display.inventoryTitle,
      payloadShape: display.payloadShape || "card_with_rarity",
      minDisplayCount: Math.max(params.choiceCount, Number(display.minDisplayCount || params.choiceCount)),
      placeholderConfig: deepClone(params.placeholderConfig || getPlaceholderDefaults()),
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
  const params = normalizeFeatureAuthoringParameters(
    featureAuthoring.parameters,
    resolveSelectionPoolObjectKind(featureAuthoring.parameters.objectKind)
      || resolveSelectionPoolObjectKind(featureAuthoring.objectKind),
  );
  const sourceArtifactRef = createSourceModelRef(featureId);
  const sourceArtifact: SelectionPoolFeatureSourceArtifactV1 = {
    adapter: SELECTION_POOL_SOURCE_ADAPTER,
    version: SELECTION_POOL_SOURCE_VERSION,
    featureId,
    ...(params.objectKind ? { objectKind: params.objectKind } : {}),
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
      mode: featureAuthoring.mode,
      profile: featureAuthoring.profile,
      ...(params.objectKind ? { objectKind: params.objectKind } : {}),
      parameters: params,
      parameterSurface: featureAuthoring.parameterSurface,
      sourceArtifactRef,
      notes: featureAuthoring.notes,
    },
    sourceArtifact,
    sourceArtifactRef,
  };
}

export function createSelectionPoolLifecycleState(
  featureId: string,
  featureAuthoring: CoreFeatureAuthoring | undefined,
): SelectionPoolLifecycleState | undefined {
  if (!isSelectionPoolFeatureAuthoring(featureAuthoring)) {
    return undefined;
  }
  return materializeSelectionPoolSourceArtifact(featureId, featureAuthoring);
}

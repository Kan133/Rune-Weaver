import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type {
  FeatureAuthoring as CoreFeatureAuthoring,
  FeatureAuthoringProposal as CoreFeatureAuthoringProposal,
  FillIntentCandidate,
  IntentSchema,
  SelectionPoolAdmissionDiagnostics,
  SelectionPoolAdmissionFinding,
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

export type FeatureAuthoring = CoreFeatureAuthoring<
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolParameterSurface
>;
export type FeatureAuthoringProposal = CoreFeatureAuthoringProposal<
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
  schema?: IntentSchema;
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
  admissionDiagnostics?: SelectionPoolAdmissionDiagnostics;
}

export interface FeatureAuthoringNormalizationResult {
  featureAuthoring?: FeatureAuthoring;
  blockers: string[];
  warnings: string[];
  notes: string[];
  admissionDiagnostics?: SelectionPoolAdmissionDiagnostics;
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

export interface SelectionPoolInventoryUpdateRequest {
  enabled: true;
  capacity?: number;
  storeSelectedItems?: boolean;
  blockDrawWhenFull?: boolean;
  fullMessage?: string;
  presentation: "persistent_panel";
}

export interface SelectionPoolRequestedUpdate {
  triggerKey?: string;
  choiceCount?: number;
  objectCount?: number;
  inventory?: SelectionPoolInventoryUpdateRequest;
}

export interface SelectionPoolSeedParameters {
  objectKindHint?: SelectionPoolObjectKind;
}

export interface SelectionPoolPromptMergeResult {
  proposal: FeatureAuthoringProposal;
  mergeActions: string[];
}

export interface SelectionPoolProposalBuildResult {
  proposal: FeatureAuthoringProposal;
  baseSource:
    | "generic_seed"
    | "existing_feature"
    | "existing_source_artifact"
    | "legacy_source_artifact";
  seedNotes: string[];
}

export interface SelectionPoolDetectionResult {
  handled: boolean;
  objectKindHint?: SelectionPoolObjectKind;
  matchedBy: string[];
  findings: SelectionPoolAdmissionFinding[];
}

export const SELECTION_POOL_SOURCE_ADAPTER: SelectionPoolSourceAdapter = "selection_pool";
export const SELECTION_POOL_SOURCE_VERSION = 1;
export const SELECTION_POOL_FAMILY_ID = "selection_pool";
export const SELECTION_POOL_ALLOWED_HOTKEYS = [
  "Q", "W", "E", "R", "D", "F",
  "1", "2", "3", "4", "5", "6",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
] as const;
export const SELECTION_POOL_OBJECT_KINDS: SelectionPoolObjectKind[] = [
  "talent",
  "equipment",
  "skill_card_placeholder",
];
export const PLACEHOLDER_WEIGHT_BY_TIER: Record<SelectionPoolObjectTier, number> = {
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

export const SELECTION_POOL_PARAMETER_SURFACE: SelectionPoolParameterSurface = {
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

const OBJECT_KIND_ID_PREFIX: Record<string, string> = {
  equipment: "EQ_",
  skill_card_placeholder: "SC_",
  talent: "SEL_",
};

const OBJECT_KIND_LABEL_BASE: Record<string, string> = {
  equipment: "Equipment",
  skill_card_placeholder: "Skill Card",
  talent: "Selection",
};

const DEFAULT_OBJECT_TIER_SEQUENCE: SelectionPoolObjectTier[] = [
  "R",
  "R",
  "SR",
  "SR",
  "SSR",
  "UR",
];

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim().toLowerCase();
}

export function dedupeStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0))));
}

export function createAdmissionFinding(
  stage: SelectionPoolAdmissionFinding["stage"],
  code: string,
  severity: SelectionPoolAdmissionFinding["severity"],
  message: string,
  options: {
    atom?: string;
    satisfied?: boolean;
    metadata?: Record<string, unknown>;
  } = {},
): SelectionPoolAdmissionFinding {
  return {
    stage,
    code,
    severity,
    message,
    ...(options.atom ? { atom: options.atom } : {}),
    ...(options.satisfied !== undefined ? { satisfied: options.satisfied } : {}),
    ...(options.metadata ? { metadata: options.metadata } : {}),
  };
}

export function resolveSelectionPoolObjectKind(value: unknown): SelectionPoolObjectKind | undefined {
  return SELECTION_POOL_OBJECT_KINDS.includes(value as SelectionPoolObjectKind)
    ? (value as SelectionPoolObjectKind)
    : undefined;
}

export function isSelectionPoolObjectTier(value: unknown): value is SelectionPoolObjectTier {
  return value === "R" || value === "SR" || value === "SSR" || value === "UR";
}

export function isSelectionPoolInventoryContract(value: unknown): value is SelectionPoolInventoryContract {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).enabled === true &&
      typeof (value as Record<string, unknown>).capacity === "number" &&
      typeof (value as Record<string, unknown>).fullMessage === "string" &&
      (value as Record<string, unknown>).presentation === "persistent_panel",
  );
}

export function isSelectionPoolAuthoredObject(value: unknown): value is SelectionPoolAuthoredObject {
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

export function isSelectionPoolSourceModelRef(value: unknown): value is FeatureSourceModelRef {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).adapter === SELECTION_POOL_SOURCE_ADAPTER &&
      (value as Record<string, unknown>).version === SELECTION_POOL_SOURCE_VERSION &&
      typeof (value as Record<string, unknown>).path === "string",
  );
}

export function isLegacyTalentDrawSourceModelRef(value: unknown): value is FeatureSourceModelRef {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).adapter === "talent-draw" &&
      (value as Record<string, unknown>).version === 1 &&
      typeof (value as Record<string, unknown>).path === "string",
  );
}

export function isSelectionPoolFeatureSourceArtifactV1(value: unknown): value is SelectionPoolFeatureSourceArtifactV1 {
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

export function isLegacyTalentDrawArtifact(value: unknown): value is {
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

export function getSelectionPoolParameterSurface(): SelectionPoolParameterSurface {
  return SELECTION_POOL_PARAMETER_SURFACE;
}

export function getSelectionPoolSourceArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/selection-pool.source.json`;
}

export function getLegacyTalentDrawSourceArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/talent-draw.source.json`;
}

export function createSourceModelRef(featureId: string): FeatureSourceModelRef {
  return {
    adapter: SELECTION_POOL_SOURCE_ADAPTER,
    version: SELECTION_POOL_SOURCE_VERSION,
    path: getSelectionPoolSourceArtifactRelativePath(featureId),
  };
}

export function getDisplayDefaults(): NonNullable<SelectionPoolFeatureAuthoringParameters["display"]> {
  return deepClone(DEFAULT_SELECTION_POOL_DISPLAY);
}

export function getPlaceholderDefaults(): NonNullable<SelectionPoolFeatureAuthoringParameters["placeholderConfig"]> {
  return deepClone(DEFAULT_SELECTION_POOL_PLACEHOLDER);
}

export function getEffectProfileDefaults(): NonNullable<SelectionPoolFeatureAuthoringParameters["effectProfile"]> {
  return deepClone(DEFAULT_SELECTION_POOL_EFFECT_PROFILE);
}

export function getInventoryDefaults(): SelectionPoolInventoryContract {
  return {
    enabled: true,
    capacity: 16,
    storeSelectedItems: true,
    blockDrawWhenFull: true,
    fullMessage: "Selection inventory full",
    presentation: "persistent_panel",
  };
}

export function inferObjectKind(
  prompt: string,
  existingFeature?: RuneWeaverFeatureRecord | null,
): SelectionPoolObjectKind | undefined {
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

export function looksLikeSelectionPoolPrompt(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  const signals = [
    /\b(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i.test(normalized),
    /choose|选择|抽取|draft|draw/.test(normalized),
    /weighted|权重|稀有度|rarity/.test(normalized),
    /modal|ui|卡牌|界面/.test(normalized),
    /talent|equipment|skill card|天赋|装备|技能卡|reward|blessing|奖励|祝福/.test(normalized),
  ];
  return signals.filter(Boolean).length >= 3;
}

export function parseTriggerKey(prompt: string): string | undefined {
  const explicitChange = prompt.match(
    /(?:from|从)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\s*(?:to|改成|改为|换成|切换为)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
  );
  if (explicitChange?.[2]) {
    return explicitChange[2].toUpperCase();
  }

  const targetOnly = prompt.match(
    /(?:to|改成|改为|换成|切换为)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
  );
  if (targetOnly?.[1]) {
    return targetOnly[1].toUpperCase();
  }

  const contextualMatch = prompt.match(
    /(?:按(?:下)?|触发键|按键|快捷键|hotkey|trigger key|press)\s*(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/i,
  );
  if (contextualMatch?.[1]) {
    return contextualMatch[1].toUpperCase();
  }

  const allKeys = Array.from(prompt.matchAll(/\b(F(?:1[0-2]|[1-9])|[QWERDF]|\d)\b/ig));
  const lastKey = allKeys.at(-1)?.[1];
  return lastKey ? lastKey.toUpperCase() : undefined;
}

export function parseChoiceCount(prompt: string): number | undefined {
  const normalized = normalizePrompt(prompt);
  const numericMatch = normalized.match(/(?:to|show|draw|抽出|抽取|展示|显示|改成)?\s*(\d)\s*(?:choices?|candidates?|个候选|选项)/i);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }
  if (/三选一|3选1|3 选 1|3个候选|三个候选/.test(normalized)) return 3;
  if (/五选一|5选1|5 选 1|5个候选|五个候选/.test(normalized)) return 5;
  if (/单选|1选1|1 选 1|一个候选/.test(normalized)) return 1;
  return undefined;
}

export function parseRequestedObjectCount(prompt: string): number | undefined {
  const normalized = normalizePrompt(prompt);
  const patterns = [
    /(?:to|到|扩充到|提升到|增加到)\s*(\d+)\s*(?:talents?|objects?|items?|entries?|rewards?|blessings?|个)/i,
    /(?:pool|collection|object|item|entry|reward|talent|blessing)(?:[\s-]+\w+){0,4}\s+(?:count|size)\s+(?:to|from\s+\d+\s+to)\s*(\d+)/i,
    /(?:with|to)\s*(\d+)\s+(?:total\s+)?(?:same-feature\s+)?(?:objects?|items?|entries?|rewards?|talents?|blessings?)/i,
    /(?:池(?:子)?数量|对象数量|池大小|总数)(?:提升到|扩充到|增加到|到)\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }

  return undefined;
}

export function parseInventoryCapacity(prompt: string): number | undefined {
  const normalized = normalizePrompt(prompt);
  const patterns = [
    /(\d+)\s*(?:slots?|格)\b/i,
    /capacity(?:\s+to)?\s*(\d+)/i,
    /(\d+)\s*slot\b/i,
    /容量(?:为|到)?\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }
  return undefined;
}

export function parseQuotedMessage(prompt: string): string | undefined {
  const match = prompt.match(/["“](.+?)["”]/);
  return match?.[1]?.trim() || undefined;
}

export function coercePositiveInteger(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return undefined;
  }
  return Math.floor(numeric);
}

export function promptHasSelectionUiSurface(prompt: string): boolean {
  if (/(?:without\s+(?:showing\s+)?ui|do\s+not\s+show\s+ui|don't\s+show\s+ui|no[\s-]?ui|不显示\s*ui|不要\s*ui|无\s*ui)/i.test(prompt)) {
    return false;
  }
  return /modal|ui|dialog|cards?|界面|卡牌|窗口|弹窗|面板/i.test(prompt);
}

export function promptHasSingleSelectionCommit(prompt: string): boolean {
  return /(?:三选一|[1-5]\s*选\s*1|choose\s+1|choose one|pick one|select one|选择(?:\s*1|一个))/i.test(prompt);
}

export function promptHasPostSelectionPoolBehavior(prompt: string): boolean {
  return /(?:已选.*不再出现|不会再出现|后续不再出现|永久移除|移出池|remove from future draws|do not appear again|not appear again|未选.*返回池|未选中的返回池中|unchosen.*return|unselected.*return|return.*pool)/i.test(
    prompt,
  );
}

export function promptRequestsInventoryContract(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  const hasStorageSurface = /inventory|storage|stash|panel|库存|仓库|存储|面板/.test(normalized);
  const hasCapacity = /(\d+)\s*(?:slots?|格)\b/i.test(normalized) || /capacity|容量/.test(normalized);
  const hasFullRule = /full|满了|满仓|存满了|格子满了/.test(normalized);
  const hasStoredResult = /store|stored|进入|加入|存入|显示在|出现在/.test(normalized);
  return (hasStorageSurface && hasCapacity) || (hasStorageSurface && hasFullRule) || (hasStorageSurface && hasStoredResult);
}

export function promptRequestsFullBlock(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  return (
    /full|满了|满仓|存满了|格子满了/.test(normalized) &&
    /block|cannot draw|can't draw|stop draw|draw invalid|不再继续|不再抽取|不能再抽|抽取无效|不再打开/.test(normalized)
  );
}

export function promptRequestsStoredSelections(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  return (
    /inventory|storage|stash|库存|仓库|存储/.test(normalized) &&
    /store|stored|加入|进入|存入|出现在|显示在/.test(normalized)
  );
}

export function sanitizeObjectList(
  objects: SelectionPoolAuthoredObject[] | undefined,
  objectKindHint?: SelectionPoolObjectKind,
): SelectionPoolAuthoredObject[] {
  const seen = new Set<string>();
  const normalized: SelectionPoolAuthoredObject[] = [];
  for (const candidate of objects || []) {
    if (!isSelectionPoolAuthoredObject(candidate)) {
      continue;
    }
    const id = String(candidate.id).trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push({
      id,
      label: String(candidate.label).trim() || id,
      description: String(candidate.description).trim() || "Selection effect placeholder",
      weight: Math.max(1, Math.floor(Number(candidate.weight) || PLACEHOLDER_WEIGHT_BY_TIER[candidate.tier])),
      tier: candidate.tier,
    });
  }
  return normalized.length > 0 ? normalized : buildGenericSeedObjects(objectKindHint);
}

function getObjectIdPrefix(objectKindHint?: SelectionPoolObjectKind): string {
  return OBJECT_KIND_ID_PREFIX[objectKindHint || "talent"] || "SEL_";
}

function getObjectLabelBase(objectKindHint?: SelectionPoolObjectKind): string {
  return OBJECT_KIND_LABEL_BASE[objectKindHint || "talent"] || "Selection";
}

function getTierDescription(tier: SelectionPoolObjectTier): string {
  if (tier === "R") return "+10 Strength";
  if (tier === "SR") return "+10 Agility";
  if (tier === "SSR") return "+10 Intelligence";
  return "+10 All Attributes";
}

function buildGeneratedObject(
  tier: SelectionPoolObjectTier,
  serial: number,
  objectKindHint?: SelectionPoolObjectKind,
): SelectionPoolAuthoredObject {
  const prefix = getObjectIdPrefix(objectKindHint);
  const serialText = String(serial).padStart(3, "0");
  const labelBase = getObjectLabelBase(objectKindHint);
  return {
    id: `${prefix}${tier}${serialText}`,
    label: `${labelBase} ${tier}${serialText}`,
    description: getTierDescription(tier),
    weight: PLACEHOLDER_WEIGHT_BY_TIER[tier],
    tier,
  };
}

export function buildGenericSeedObjects(objectKindHint?: SelectionPoolObjectKind): SelectionPoolAuthoredObject[] {
  return DEFAULT_OBJECT_TIER_SEQUENCE.map((tier, index) =>
    buildGeneratedObject(tier, index + 1, objectKindHint),
  );
}

function parseObjectIdParts(
  id: string,
): { prefix: string; tier: SelectionPoolObjectTier; serial: number } | undefined {
  const match = id.match(/^(.*?)(SSR|SR|UR|R)(\d+)$/);
  if (!match) {
    return undefined;
  }
  return {
    prefix: match[1] || "",
    tier: match[2] as SelectionPoolObjectTier,
    serial: Number(match[3]),
  };
}

function deriveObjectGenerationContext(
  objects: SelectionPoolAuthoredObject[],
  objectKindHint?: SelectionPoolObjectKind,
): {
  prefix: string;
  nextSerialByTier: Record<SelectionPoolObjectTier, number>;
} {
  const nextSerialByTier: Record<SelectionPoolObjectTier, number> = {
    R: 1,
    SR: 1,
    SSR: 1,
    UR: 1,
  };
  let prefix = getObjectIdPrefix(objectKindHint);
  for (const object of objects) {
    const parsed = parseObjectIdParts(object.id);
    if (!parsed) {
      continue;
    }
    if (parsed.prefix) {
      prefix = parsed.prefix;
    }
    nextSerialByTier[parsed.tier] = Math.max(nextSerialByTier[parsed.tier], parsed.serial + 1);
  }
  return { prefix, nextSerialByTier };
}

export function expandObjectPoolToCount(
  parameters: SelectionPoolFeatureAuthoringParameters,
  targetCount: number,
  objectKindHint?: SelectionPoolObjectKind,
): SelectionPoolFeatureAuthoringParameters {
  if (parameters.objects.length >= targetCount) {
    return parameters;
  }

  const context = deriveObjectGenerationContext(parameters.objects, objectKindHint || parameters.objectKind);
  const existingIds = new Set(parameters.objects.map((object) => object.id));
  const nextObjects = [...parameters.objects];
  let sequenceIndex = 0;

  while (nextObjects.length < targetCount) {
    const tier = DEFAULT_OBJECT_TIER_SEQUENCE[sequenceIndex % DEFAULT_OBJECT_TIER_SEQUENCE.length];
    const serial = context.nextSerialByTier[tier];
    context.nextSerialByTier[tier] += 1;
    const labelBase = getObjectLabelBase(objectKindHint || parameters.objectKind);
    const serialText = String(serial).padStart(3, "0");
    const candidate: SelectionPoolAuthoredObject = {
      id: `${context.prefix}${tier}${serialText}`,
      label: `${labelBase} ${tier}${serialText}`,
      description: getTierDescription(tier),
      weight: PLACEHOLDER_WEIGHT_BY_TIER[tier],
      tier,
    };
    sequenceIndex += 1;
    if (existingIds.has(candidate.id)) {
      continue;
    }
    existingIds.add(candidate.id);
    nextObjects.push(candidate);
  }

  return {
    ...parameters,
    objects: nextObjects,
  };
}

export function normalizeFeatureAuthoringParameters(
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
    objects: sanitizeObjectList(
      Array.isArray(raw.objects) && raw.objects.length > 0
        ? raw.objects
        : buildGenericSeedObjects(metadataObjectKind),
      metadataObjectKind,
    ),
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

export function buildGenericSeedParameters(seed: SelectionPoolSeedParameters = {}): SelectionPoolFeatureAuthoringParameters {
  return normalizeFeatureAuthoringParameters({
    triggerKey: "F4",
    choiceCount: 3,
    objectKind: seed.objectKindHint,
    objects: buildGenericSeedObjects(seed.objectKindHint),
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
  }, seed.objectKindHint);
}

export function tryReadSourceArtifact(pathRoot: string, relativePath: string): unknown | undefined {
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

export function migrateLegacyTalentDrawArtifact(
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

export function createFeatureAuthoringProposal(
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

export function createFillIntentCandidates(source: FillIntentCandidate["source"]): FillIntentCandidate[] {
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

export function resolveSelectionPoolParametersFromFeature(
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

export function createNotApplicableDiagnostics(
  detection: SelectionPoolDetectionResult,
): SelectionPoolAdmissionDiagnostics {
  return {
    familyId: SELECTION_POOL_FAMILY_ID,
    verdict: "not_applicable",
    detection: {
      handled: false,
      objectKindHint: detection.objectKindHint,
      matchedBy: [],
      findings: [
        createAdmissionFinding(
          "detection",
          "SELECTION_POOL_NOT_APPLICABLE",
          "info",
          "selection_pool detection did not find enough create/update family cues.",
        ),
      ],
    },
    proposal: {
      proposalAvailable: false,
      promptMergeApplied: false,
      promptMergeActions: [],
      findings: [],
    },
    contract: {
      assessed: false,
      skeletonMatch: false,
      findings: [],
    },
    decision: {
      verdict: "not_applicable",
      blockerCodes: [],
      findings: [
        createAdmissionFinding(
          "decision",
          "SELECTION_POOL_NOT_APPLICABLE",
          "info",
          "selection_pool family was not applicable for this prompt.",
        ),
      ],
    },
  };
}

export function createBlockedDiagnostics(
  detection: SelectionPoolDetectionResult,
  blockerCodes: string[],
  reasons: string[],
): SelectionPoolAdmissionDiagnostics {
  return {
    familyId: SELECTION_POOL_FAMILY_ID,
    verdict: "governance_blocked",
    detection: {
      handled: true,
      objectKindHint: detection.objectKindHint,
      matchedBy: detection.matchedBy,
      findings: detection.findings,
    },
    proposal: {
      proposalAvailable: false,
      promptMergeApplied: false,
      promptMergeActions: [],
      findings: [],
    },
    contract: {
      assessed: false,
      skeletonMatch: false,
      findings: [],
    },
    decision: {
      verdict: "governance_blocked",
      blockerCodes,
      findings: blockerCodes.map((code, index) =>
        createAdmissionFinding("decision", code, "error", reasons[index] || `${code} blocked selection_pool admission.`)),
    },
  };
}

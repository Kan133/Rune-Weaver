import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { RuneWeaverFeatureRecord, FeatureSourceModelRef } from "../../../core/workspace/types.js";
import {
  TALENT_DRAW_CANONICAL_FEATURE_ID,
  TALENT_DRAW_CANONICAL_CREATE_PROMPT,
  TALENT_DRAW_CANONICAL_UPDATE_PROMPT,
  TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT,
  analyzeTalentDrawPrompt,
  getCanonicalTalentDrawInventoryParameters,
  getCanonicalTalentDrawParameters,
  resolveCanonicalTalentDrawFeatureId,
  type TalentDrawCanonicalParameters,
  type TalentDrawInventoryParameters,
} from "./talent-draw.js";

export type TalentTier = "R" | "SR" | "SSR" | "UR";
export type TalentDrawAdapterMode = "create" | "update" | "regenerate";

export interface TalentDrawEffectSpec {
  kind: "rarity_attribute_bonus";
  rarity: TalentTier;
}

export interface TalentDrawFeatureTalent {
  id: string;
  label: string;
  description: string;
  tier: TalentTier;
  weight: number;
  effectSpec: TalentDrawEffectSpec;
}

export interface TalentDrawFeatureModelV1 {
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
  inventory?: TalentDrawInventoryParameters;
  talents: TalentDrawFeatureTalent[];
}

export interface ResolveTalentDrawSourceModelInput {
  prompt: string;
  hostRoot: string;
  mode: TalentDrawAdapterMode;
  featureId?: string;
  existingFeature?: RuneWeaverFeatureRecord | null;
}

export interface ResolveTalentDrawSourceModelResult {
  handled: boolean;
  blocked: boolean;
  reasons: string[];
  sourceModel?: TalentDrawFeatureModelV1;
  compiledParameters?: Record<string, unknown>;
  sourceModelRef?: FeatureSourceModelRef;
}

interface LoadedTalentDrawModelResult {
  success: boolean;
  model?: TalentDrawFeatureModelV1;
  reason?: string;
}

const TALENT_DRAW_SOURCE_MODEL_ADAPTER = "talent-draw";
const TALENT_DRAW_SOURCE_MODEL_VERSION = 1;

const CANONICAL_SOURCE_MODEL_BLOCK_REASONS: Array<{ test: RegExp; reason: string }> = [
  {
    test: /(?:\bf5\b|第二(?:个)?按键|第二触发|second trigger|toggle)/i,
    reason: "Current Talent Draw source update does not support trigger contract changes.",
  },
  {
    test: /(?:五选一|5\s*选\s*1|5选1|五个候选|5\s*个候选)/i,
    reason: "Current Talent Draw source update does not support selection contract changes.",
  },
  {
    test: /(?:持久化|存档|save|persist)/i,
    reason: "Current Talent Draw source update remains session-only and does not support persistence.",
  },
  {
    test: /(?:冲刺|dash|闪电链|lightning|反击|counterattack|向鼠标|mouse direction)/i,
    reason: "Current Talent Draw source update does not support opening a new effect family.",
  },
  {
    test: /(?:20\s*格|30\s*格|拖拽|drag|drop|reorder|排序|删除库存|remove inventory)/i,
    reason: "Current Talent Draw source update does not support expanding or redesigning the inventory contract.",
  },
];

const PLACEHOLDER_TALENTS: Array<{
  id: string;
  label: string;
  description: string;
  tier: TalentTier;
}> = [
  { id: "R003", label: "Strength Boost 03", description: "+10 Strength", tier: "R" },
  { id: "R004", label: "Strength Boost 04", description: "+10 Strength", tier: "R" },
  { id: "R005", label: "Strength Boost 05", description: "+10 Strength", tier: "R" },
  { id: "R006", label: "Strength Boost 06", description: "+10 Strength", tier: "R" },
  { id: "R007", label: "Strength Boost 07", description: "+10 Strength", tier: "R" },
  { id: "R008", label: "Strength Boost 08", description: "+10 Strength", tier: "R" },
  { id: "SR003", label: "Agility Boost 03", description: "+10 Agility", tier: "SR" },
  { id: "SR004", label: "Agility Boost 04", description: "+10 Agility", tier: "SR" },
  { id: "SR005", label: "Agility Boost 05", description: "+10 Agility", tier: "SR" },
  { id: "SR006", label: "Agility Boost 06", description: "+10 Agility", tier: "SR" },
  { id: "SSR002", label: "Intelligence Boost 02", description: "+10 Intelligence", tier: "SSR" },
  { id: "SSR003", label: "Intelligence Boost 03", description: "+10 Intelligence", tier: "SSR" },
  { id: "SSR004", label: "Intelligence Boost 04", description: "+10 Intelligence", tier: "SSR" },
  { id: "UR002", label: "Ultimate Growth 02", description: "+10 All Attributes", tier: "UR" },
];

const TIER_WEIGHT_MAP: Record<TalentTier, number> = {
  R: 40,
  SR: 30,
  SSR: 20,
  UR: 10,
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim().toLowerCase();
}

function isTalentDrawSourceModelRef(value: unknown): value is FeatureSourceModelRef {
  return !!value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).adapter === TALENT_DRAW_SOURCE_MODEL_ADAPTER &&
    (value as Record<string, unknown>).version === TALENT_DRAW_SOURCE_MODEL_VERSION &&
    typeof (value as Record<string, unknown>).path === "string";
}

function isTalentTier(value: unknown): value is TalentTier {
  return value === "R" || value === "SR" || value === "SSR" || value === "UR";
}

function isTalentDrawInventory(value: unknown): value is TalentDrawInventoryParameters {
  return !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).capacity === "number" &&
    typeof (value as Record<string, unknown>).fullMessage === "string" &&
    (value as Record<string, unknown>).presentation === "persistent_panel";
}

function isTalentDrawFeatureModelV1(value: unknown): value is TalentDrawFeatureModelV1 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    candidate.adapter !== TALENT_DRAW_SOURCE_MODEL_ADAPTER ||
    candidate.version !== TALENT_DRAW_SOURCE_MODEL_VERSION ||
    typeof candidate.featureId !== "string" ||
    typeof candidate.triggerKey !== "string" ||
    typeof candidate.choiceCount !== "number" ||
    !Array.isArray(candidate.talents)
  ) {
    return false;
  }

  if (candidate.inventory !== undefined && !isTalentDrawInventory(candidate.inventory)) {
    return false;
  }

  return candidate.talents.every((talent) => {
    if (!talent || typeof talent !== "object") {
      return false;
    }

    const entry = talent as Record<string, unknown>;
    const effectSpec = entry.effectSpec as Record<string, unknown> | undefined;
    return (
      typeof entry.id === "string" &&
      typeof entry.label === "string" &&
      typeof entry.description === "string" &&
      isTalentTier(entry.tier) &&
      typeof entry.weight === "number" &&
      !!effectSpec &&
      effectSpec.kind === "rarity_attribute_bonus" &&
      isTalentTier(effectSpec.rarity)
    );
  });
}

function createEffectSpec(rarity: TalentTier): TalentDrawEffectSpec {
  return {
    kind: "rarity_attribute_bonus",
    rarity,
  };
}

function getCanonicalParameters(): TalentDrawCanonicalParameters {
  return getCanonicalTalentDrawParameters() as unknown as TalentDrawCanonicalParameters;
}

function createTalentDrawSourceModelRef(featureId: string): FeatureSourceModelRef {
  return {
    adapter: TALENT_DRAW_SOURCE_MODEL_ADAPTER,
    version: TALENT_DRAW_SOURCE_MODEL_VERSION,
    path: getTalentDrawSourceArtifactRelativePath(featureId),
  };
}

export function getTalentDrawSourceArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/talent-draw.source.json`;
}

export function createCanonicalTalentDrawFeatureModel(
  featureId: string,
  inventory?: TalentDrawInventoryParameters,
): TalentDrawFeatureModelV1 {
  const canonical = getCanonicalParameters();

  return {
    adapter: TALENT_DRAW_SOURCE_MODEL_ADAPTER,
    version: TALENT_DRAW_SOURCE_MODEL_VERSION,
    featureId,
    triggerKey: canonical.triggerKey,
    choiceCount: canonical.choiceCount,
    drawMode: canonical.drawMode,
    duplicatePolicy: canonical.duplicatePolicy,
    poolStateTracking: canonical.poolStateTracking,
    selectionPolicy: canonical.selectionPolicy,
    applyMode: canonical.applyMode,
    postSelectionPoolBehavior: canonical.postSelectionPoolBehavior,
    trackSelectedItems: canonical.trackSelectedItems,
    payloadShape: canonical.payloadShape,
    minDisplayCount: canonical.minDisplayCount,
    placeholderConfig: deepClone(canonical.placeholderConfig),
    effectApplication: deepClone(canonical.effectApplication),
    ...(inventory ? { inventory: deepClone(inventory) } : {}),
    talents: canonical.entries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      description: entry.description,
      tier: entry.tier as TalentTier,
      weight: entry.weight,
      effectSpec: createEffectSpec(entry.tier as TalentTier),
    })),
  };
}

function readTalentDrawSourceModelFile(
  hostRoot: string,
  sourceModelRef: FeatureSourceModelRef,
): LoadedTalentDrawModelResult {
  const fullPath = join(hostRoot, sourceModelRef.path);
  if (!existsSync(fullPath)) {
    return {
      success: false,
      reason: `Source artifact does not exist: ${sourceModelRef.path}`,
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf-8"));
    if (!isTalentDrawFeatureModelV1(parsed)) {
      return {
        success: false,
        reason: `Source artifact has invalid Talent Draw model shape: ${sourceModelRef.path}`,
      };
    }
    return {
      success: true,
      model: parsed,
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function detectLegacyInventoryContract(hostRoot: string, feature: RuneWeaverFeatureRecord): boolean {
  const candidateFiles = feature.generatedFiles.filter((filePath) =>
    filePath.includes("selection_modal") || filePath.includes("selection_flow"),
  );

  for (const filePath of candidateFiles) {
    const fullPath = join(hostRoot, filePath);
    if (!existsSync(fullPath)) {
      continue;
    }

    try {
      const content = readFileSync(fullPath, "utf-8");
      if (
        content.includes("Talent inventory full") ||
        content.includes("selectedInventory") ||
        content.includes("inventory_full")
      ) {
        return true;
      }
    } catch {
      // Ignore broken legacy files and continue with the canonical seed.
    }
  }

  return false;
}

function migrateLegacyTalentDrawFeatureModel(
  hostRoot: string,
  featureId: string,
  existingFeature?: RuneWeaverFeatureRecord | null,
): TalentDrawFeatureModelV1 {
  const inventory = existingFeature && detectLegacyInventoryContract(hostRoot, existingFeature)
    ? getCanonicalTalentDrawInventoryParameters()
    : undefined;
  return createCanonicalTalentDrawFeatureModel(featureId, inventory);
}

function shouldExpandTalentsToTwenty(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  return (
    normalized === normalizePrompt(TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT) ||
    (
      /(?:20\s*个天赋|20\s*个\s*talents?|20\s*talents?)/i.test(normalized) &&
      /(?:扩充|扩展|扩容|增加|提升)/i.test(normalized) &&
      /(?:天赋池|talent pool|talents?)/i.test(normalized)
    )
  );
}

function mentionsInventoryPreservationOnly(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  const mentionsInventory = /(?:库存|inventory|库存界面|inventory panel)/i.test(normalized);
  const preservesExisting =
    /(?:保持其行为不变|保持.*不变|已有库存界面|if current.*inventory|keep.*inventory.*unchanged)/i.test(normalized);
  return mentionsInventory && preservesExisting;
}

function collectTalentDrawSourceBlockReasons(prompt: string): string[] {
  const reasons: string[] = [];
  for (const blocker of CANONICAL_SOURCE_MODEL_BLOCK_REASONS) {
    if (blocker.test.test(prompt)) {
      reasons.push(blocker.reason);
    }
  }
  return reasons;
}

function appendPlaceholderTalents(model: TalentDrawFeatureModelV1): TalentDrawFeatureModelV1 {
  const existingIds = new Set(model.talents.map((talent) => talent.id));
  const appended = PLACEHOLDER_TALENTS
    .filter((talent) => !existingIds.has(talent.id))
    .map((talent) => ({
      ...talent,
      weight: TIER_WEIGHT_MAP[talent.tier],
      effectSpec: createEffectSpec(talent.tier),
    }));

  return {
    ...model,
    talents: [...model.talents, ...appended],
  };
}

function compileTalentDrawSourceModel(model: TalentDrawFeatureModelV1): Record<string, unknown> {
  return {
    triggerKey: model.triggerKey,
    choiceCount: model.choiceCount,
    drawMode: model.drawMode,
    duplicatePolicy: model.duplicatePolicy,
    poolStateTracking: model.poolStateTracking,
    selectionPolicy: model.selectionPolicy,
    applyMode: model.applyMode,
    postSelectionPoolBehavior: model.postSelectionPoolBehavior,
    trackSelectedItems: model.trackSelectedItems,
    payloadShape: model.payloadShape,
    minDisplayCount: model.minDisplayCount,
    placeholderConfig: deepClone(model.placeholderConfig),
    effectApplication: deepClone(model.effectApplication),
    entries: model.talents.map((talent) => ({
      id: talent.id,
      label: talent.label,
      description: talent.description,
      weight: talent.weight,
      tier: talent.tier,
    })),
    ...(model.inventory ? { inventory: deepClone(model.inventory) } : {}),
    rwFeatureSourceModel: deepClone(model),
    rwFeatureSourceModelRef: createTalentDrawSourceModelRef(model.featureId),
  };
}

function loadOrMigrateTalentDrawModel(input: ResolveTalentDrawSourceModelInput): LoadedTalentDrawModelResult {
  const featureId = input.featureId;
  if (!featureId) {
    return {
      success: false,
      reason: "Talent Draw source-model handling requires a stable featureId.",
    };
  }

  const sourceModelRef = isTalentDrawSourceModelRef(input.existingFeature?.sourceModel)
    ? input.existingFeature?.sourceModel
    : createTalentDrawSourceModelRef(featureId);

  const loaded = readTalentDrawSourceModelFile(input.hostRoot, sourceModelRef);
  if (loaded.success && loaded.model) {
    return loaded;
  }

  return {
    success: true,
    model: migrateLegacyTalentDrawFeatureModel(input.hostRoot, featureId, input.existingFeature),
  };
}

export function resolveTalentDrawSourceModel(
  input: ResolveTalentDrawSourceModelInput,
): ResolveTalentDrawSourceModelResult {
  const canonicalFeatureId = resolveCanonicalTalentDrawFeatureId(input.prompt);
  const stableFeatureId = input.featureId?.trim() || canonicalFeatureId;
  const inventoryAnalysis = analyzeTalentDrawPrompt(input.prompt);
  const featureLooksLikeTalentDraw =
    stableFeatureId === TALENT_DRAW_CANONICAL_FEATURE_ID ||
    input.existingFeature?.featureId === TALENT_DRAW_CANONICAL_FEATURE_ID ||
    isTalentDrawSourceModelRef(input.existingFeature?.sourceModel) ||
    inventoryAnalysis.isCanonicalBasePrompt ||
    shouldExpandTalentsToTwenty(input.prompt);

  if (!featureLooksLikeTalentDraw) {
    return {
      handled: false,
      blocked: false,
      reasons: [],
    };
  }

  const reasons = [
    ...(
      shouldExpandTalentsToTwenty(input.prompt) && mentionsInventoryPreservationOnly(input.prompt)
        ? []
        : inventoryAnalysis.unsupportedReasons
    ),
    ...collectTalentDrawSourceBlockReasons(input.prompt),
  ];
  if (reasons.length > 0) {
    return {
      handled: true,
      blocked: true,
      reasons: Array.from(new Set(reasons)),
    };
  }

  const baseFeatureId = stableFeatureId || TALENT_DRAW_CANONICAL_FEATURE_ID;
  if (input.mode === "create") {
    let model = createCanonicalTalentDrawFeatureModel(baseFeatureId);
    if (inventoryAnalysis.inventoryMode === "supported") {
      model = {
        ...model,
        inventory: getCanonicalTalentDrawInventoryParameters(),
      };
    }

    return {
      handled: true,
      blocked: false,
      reasons: [],
      sourceModel: model,
      compiledParameters: compileTalentDrawSourceModel(model),
      sourceModelRef: createTalentDrawSourceModelRef(baseFeatureId),
    };
  }

  const loaded = loadOrMigrateTalentDrawModel({
    ...input,
    featureId: baseFeatureId,
  });
  if (!loaded.success || !loaded.model) {
    return {
      handled: true,
      blocked: true,
      reasons: [loaded.reason || "Failed to load or migrate Talent Draw source model."],
    };
  }

  let model = loaded.model;

  if (inventoryAnalysis.inventoryMode === "supported") {
    model = {
      ...model,
      inventory: getCanonicalTalentDrawInventoryParameters(),
    };
  }

  if (shouldExpandTalentsToTwenty(input.prompt)) {
    model = appendPlaceholderTalents(model);
  } else if (input.mode === "update" && inventoryAnalysis.inventoryMode !== "supported") {
    return {
      handled: true,
      blocked: true,
      reasons: [
        "Current Talent Draw update only supports the frozen inventory extension or the canonical 6-to-20 talent-pool source update.",
      ],
    };
  }

  return {
    handled: true,
    blocked: false,
    reasons: [],
    sourceModel: model,
    compiledParameters: compileTalentDrawSourceModel(model),
    sourceModelRef: createTalentDrawSourceModelRef(model.featureId),
  };
}

export function extractTalentDrawSourceModelFromParameters(
  parameters: Record<string, unknown> | undefined,
): { sourceModel?: TalentDrawFeatureModelV1; sourceModelRef?: FeatureSourceModelRef } {
  if (!parameters || typeof parameters !== "object") {
    return {};
  }

  const sourceModel = parameters.rwFeatureSourceModel;
  const sourceModelRef = parameters.rwFeatureSourceModelRef;
  return {
    sourceModel: isTalentDrawFeatureModelV1(sourceModel) ? deepClone(sourceModel) : undefined,
    sourceModelRef: isTalentDrawSourceModelRef(sourceModelRef) ? deepClone(sourceModelRef) : undefined,
  };
}

export function getTalentDrawSourceModelRefForFeature(featureId: string): FeatureSourceModelRef {
  return createTalentDrawSourceModelRef(featureId);
}

export {
  TALENT_DRAW_CANONICAL_CREATE_PROMPT,
  TALENT_DRAW_CANONICAL_FEATURE_ID,
  TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT,
  TALENT_DRAW_CANONICAL_UPDATE_PROMPT,
};

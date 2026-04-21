import type { Blueprint, GovernedUpdateSchema, IntentSchema } from "../../../core/schema/types.js";

type BlueprintModule = Blueprint["modules"][number];
type WeightedPoolProjectionSchema = IntentSchema | GovernedUpdateSchema;

export interface WeightedPoolSeedEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier?: string;
}

export interface GenericWeightedPoolProjection {
  weightedPool?: Record<string, unknown>;
  selectionFlow?: Record<string, unknown>;
  selectionModal?: Record<string, unknown>;
  inputTrigger?: Record<string, unknown>;
}

const DEFAULT_TITLE = "Choose Your Selection";
const DEFAULT_DESCRIPTION = "Select one of the available options.";
const DEFAULT_INVENTORY_TITLE = "Selection Inventory";
const DEFAULT_TIER_SEQUENCE = ["R", "R", "SR", "SR", "SSR", "UR"] as const;
const DEFAULT_WEIGHT_BY_TIER: Record<string, number> = {
  R: 40,
  SR: 30,
  SSR: 20,
  UR: 10,
};
const DEFAULT_EFFECT_PROFILE: Record<string, { attribute: string; value: number }> = {
  R: { attribute: "strength", value: 10 },
  SR: { attribute: "agility", value: 10 },
  SSR: { attribute: "intelligence", value: 10 },
  UR: { attribute: "all", value: 10 },
};

function normalizePositiveInteger(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return undefined;
  }
  return Math.max(1, Math.floor(numeric));
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value): value is string => value.length > 0),
    ),
  );
}

function hasFeatureOwnedCandidateCollection(schema: WeightedPoolProjectionSchema): boolean {
  return (schema.contentModel?.collections || []).some(
    (collection) => collection.role === "candidate-options" && collection.ownership !== "shared" && collection.ownership !== "external",
  );
}

function hasWeightedPoolRuntimeSemantics(schema: WeightedPoolProjectionSchema, blueprint: Blueprint): boolean {
  const mechanics = schema.normalizedMechanics || {};
  const hasWeightedSelectionSignal =
    schema.selection?.mode === "weighted"
    || schema.selection?.source === "weighted-pool"
    || schema.selection?.choiceMode === "weighted"
    || mechanics.weightedSelection === true;
  const hasCandidatePoolSignal =
    hasFeatureOwnedCandidateCollection(schema)
    || mechanics.candidatePool === true
    || blueprint.modules.some((module) => module.role === "weighted_pool");
  return hasWeightedSelectionSignal && hasCandidatePoolSignal;
}

function resolveChoiceCount(schema: WeightedPoolProjectionSchema, blueprint: Blueprint): number {
  return (
    normalizePositiveInteger(schema.selection?.choiceCount)
    || normalizePositiveInteger(schema.parameters?.choiceCount)
    || blueprint.modules
      .map((module) =>
        normalizePositiveInteger(module.parameters?.choiceCount)
        || normalizePositiveInteger(module.parameters?.drawCount),
      )
      .find((value): value is number => typeof value === "number")
    || 3
  );
}

function resolveTriggerKey(schema: WeightedPoolProjectionSchema, blueprint: Blueprint): string | undefined {
  const activationKey = (schema.interaction?.activations || []).find((activation) => activation.kind === "key")?.input;
  if (typeof activationKey === "string" && activationKey.trim().length > 0) {
    return activationKey.trim().toUpperCase();
  }

  const schemaKey = schema.parameters?.triggerKey;
  if (typeof schemaKey === "string" && schemaKey.trim().length > 0) {
    return schemaKey.trim().toUpperCase();
  }

  for (const module of blueprint.modules) {
    const triggerKey = module.parameters?.triggerKey || module.parameters?.key;
    if (typeof triggerKey === "string" && triggerKey.trim().length > 0) {
      return triggerKey.trim().toUpperCase();
    }
  }

  return undefined;
}

function resolveDuplicatePolicy(
  schema: WeightedPoolProjectionSchema,
): "allow" | "avoid_when_possible" | "forbid" {
  switch (schema.selection?.duplicatePolicy) {
    case "allow":
      return "allow";
    case "avoid":
      return "avoid_when_possible";
    default:
      return "forbid";
  }
}

function resolveDrawMode(
  choiceCount: number,
  duplicatePolicy: "allow" | "avoid_when_possible" | "forbid",
): "single" | "multiple_without_replacement" | "multiple_with_replacement" {
  if (choiceCount <= 1) {
    return "single";
  }
  return duplicatePolicy === "allow" ? "multiple_with_replacement" : "multiple_without_replacement";
}

function resolvePoolStateTracking(schema: WeightedPoolProjectionSchema): "none" | "session" {
  const hasSessionState = (schema.stateModel?.states || []).some(
    (state) => state.owner === "feature" || state.owner === "session" || state.lifetime === "session",
  );
  return hasSessionState || hasFeatureOwnedCandidateCollection(schema) ? "session" : "none";
}

function resolveInventory(schema: WeightedPoolProjectionSchema): Record<string, unknown> | undefined {
  if (schema.selection?.inventory?.enabled !== true) {
    return undefined;
  }

  const capacity = normalizePositiveInteger(schema.selection.inventory.capacity) || 16;
  return {
    enabled: true,
    capacity,
    storeSelectedItems: schema.selection.inventory.storeSelectedItems !== false,
    blockDrawWhenFull: schema.selection.inventory.blockDrawWhenFull !== false,
    fullMessage: schema.selection.inventory.fullMessage || "Selection inventory full",
    presentation: "persistent_panel",
  };
}

function promptHasRaritySignal(prompt: string | undefined): boolean {
  if (!prompt) {
    return false;
  }
  return /\bR\b|\bSR\b|\bSSR\b|\bUR\b|rarity|稀有度|等级/.test(prompt);
}

function resolveRarityTiers(
  schema: WeightedPoolProjectionSchema,
  blueprint: Blueprint,
  prompt?: string,
): string[] | undefined {
  const moduleRarities = blueprint.modules
    .flatMap((module) => {
      const rarities = module.parameters?.rarities;
      return Array.isArray(rarities) ? rarities : [];
    })
    .filter((value): value is string => typeof value === "string");
  const requirementRarities = (schema.requirements?.typed || [])
    .flatMap((requirement) => {
      const rarities = requirement.parameters?.rarities;
      return Array.isArray(rarities) ? rarities : [];
    })
    .filter((value): value is string => typeof value === "string");
  const normalized = dedupeStrings(
    [...moduleRarities, ...requirementRarities].map((value) => value.toUpperCase()),
  );

  if (normalized.length > 0) {
    return normalized;
  }

  const hasRarityField = (schema.contentModel?.collections || []).some((collection) =>
    (collection.itemSchema || []).some((item) =>
      item.name === "rarity"
      || item.semanticRole?.toLowerCase().includes("rarity")
      || item.semanticRole?.toLowerCase().includes("tier"),
    ),
  );
  const hasRaritySurface = (schema.uiRequirements?.surfaces || []).some((surface) => /rarity/i.test(surface));
  if (hasRarityField || hasRaritySurface || promptHasRaritySignal(prompt)) {
    return [...new Set(DEFAULT_TIER_SEQUENCE)];
  }

  return undefined;
}

function inferObjectKindSignal(prompt: string | undefined, schema: WeightedPoolProjectionSchema, blueprint: Blueprint): string {
  const text = [
    prompt || "",
    ...(schema.requirements?.functional || []),
    ...(schema.contentModel?.collections || []).map((collection) => collection.id),
    ...blueprint.modules.map((module) => module.id),
    ...blueprint.modules.map((module) => module.role),
  ]
    .join(" ")
    .toLowerCase();

  if (/\bequipment\b|装备|item|物品/.test(text)) {
    return "equipment";
  }
  if (/talent|天赋/.test(text)) {
    return "talent";
  }
  if (/skill card|技能卡|skill|技能/.test(text)) {
    return "skill";
  }
  if (/reward|奖励|blessing|祝福/.test(text)) {
    return "reward";
  }
  return "option";
}

function resolveObjectIdentity(prompt: string | undefined, schema: WeightedPoolProjectionSchema, blueprint: Blueprint): {
  idPrefix: string;
  labelBase: string;
} {
  switch (inferObjectKindSignal(prompt, schema, blueprint)) {
    case "equipment":
      return { idPrefix: "EQ_", labelBase: "Equipment" };
    case "talent":
      return { idPrefix: "TL_", labelBase: "Talent" };
    case "skill":
      return { idPrefix: "SK_", labelBase: "Skill" };
    case "reward":
      return { idPrefix: "RW_", labelBase: "Reward" };
    default:
      return { idPrefix: "OPT_", labelBase: "Option" };
  }
}

function buildTierSequence(tiers: string[] | undefined, targetCount: number): string[] {
  if (!tiers || tiers.length === 0) {
    return [];
  }

  const normalized = tiers.map((tier) => tier.toUpperCase());
  const canonical = DEFAULT_TIER_SEQUENCE.filter((tier) => normalized.includes(tier));
  const source = canonical.length > 0 ? canonical : normalized;
  const sequence: string[] = [];
  let cursor = 0;

  while (sequence.length < targetCount) {
    sequence.push(source[cursor % source.length]);
    cursor += 1;
  }

  return sequence;
}

function buildSeedEntries(
  schema: WeightedPoolProjectionSchema,
  blueprint: Blueprint,
  prompt: string | undefined,
  choiceCount: number,
): WeightedPoolSeedEntry[] {
  const tiers = resolveRarityTiers(schema, blueprint, prompt);
  const { idPrefix, labelBase } = resolveObjectIdentity(prompt, schema, blueprint);
  const targetCount = Math.max(choiceCount, tiers && tiers.length > 0 ? 6 : 4);
  const tierSequence = buildTierSequence(tiers, targetCount);
  const nextSerialByTier = new Map<string, number>();

  return Array.from({ length: targetCount }, (_unused, index) => {
    const tier = tierSequence[index];
    const serial = tier
      ? (nextSerialByTier.get(tier) || 0) + 1
      : index + 1;
    if (tier) {
      nextSerialByTier.set(tier, serial);
    }
    const serialText = String(serial).padStart(3, "0");
    return {
      id: tier ? `${idPrefix}${tier}${serialText}` : `${idPrefix}${serialText}`,
      label: tier ? `${labelBase} ${tier}${serialText}` : `${labelBase} ${serialText}`,
      description: tier
        ? `Placeholder ${tier}-tier ${labelBase.toLowerCase()}.`
        : `Placeholder ${labelBase.toLowerCase()} candidate.`,
      weight: tier ? (DEFAULT_WEIGHT_BY_TIER[tier] || 10) : Math.max(10, 40 - index * 5),
      ...(tier ? { tier } : {}),
    };
  });
}

function buildEffectApplication(
  schema: WeightedPoolProjectionSchema,
  blueprint: Blueprint,
  prompt: string | undefined,
): Record<string, unknown> | undefined {
  if (!schema.effects?.operations?.includes("apply")) {
    return undefined;
  }

  const tiers = resolveRarityTiers(schema, blueprint, prompt);
  if (!tiers || tiers.length === 0) {
    return undefined;
  }

  const rarityAttributeBonusMap = Object.fromEntries(
    tiers
      .filter((tier) => DEFAULT_EFFECT_PROFILE[tier])
      .map((tier) => [tier, DEFAULT_EFFECT_PROFILE[tier]]),
  );
  if (Object.keys(rarityAttributeBonusMap).length === 0) {
    return undefined;
  }

  return {
    enabled: true,
    rarityAttributeBonusMap,
  };
}

function buildSelectionModalDescription(
  choiceCount: number,
  prompt: string | undefined,
): string {
  if (!prompt || prompt.trim().length === 0) {
    return DEFAULT_DESCRIPTION;
  }
  return choiceCount > 1
    ? `Select one of the ${choiceCount} presented options.`
    : DEFAULT_DESCRIPTION;
}

export function compileGenericWeightedPoolProjection(
  blueprint: Blueprint,
  schema: WeightedPoolProjectionSchema,
  options: {
    prompt?: string;
    includeEntries?: boolean;
  } = {},
): GenericWeightedPoolProjection | null {
  if (!hasWeightedPoolRuntimeSemantics(schema, blueprint)) {
    return null;
  }

  const choiceCount = resolveChoiceCount(schema, blueprint);
  const duplicatePolicy = resolveDuplicatePolicy(schema);
  const drawMode = resolveDrawMode(choiceCount, duplicatePolicy);
  const poolStateTracking = resolvePoolStateTracking(schema);
  const inventory = resolveInventory(schema);
  const effectApplication = buildEffectApplication(schema, blueprint, options.prompt);
  const postSelectionPoolBehavior =
    poolStateTracking === "session" && duplicatePolicy !== "allow"
      ? "remove_selected_from_remaining"
      : "none";
  const triggerKey = resolveTriggerKey(schema, blueprint);
  const weightedPool: Record<string, unknown> = {
    choiceCount,
    drawMode,
    duplicatePolicy,
    poolStateTracking,
  };
  if (options.includeEntries !== false) {
    weightedPool.entries = buildSeedEntries(schema, blueprint, options.prompt, choiceCount);
  }

  return {
    ...(triggerKey ? { inputTrigger: { key: triggerKey, triggerKey } } : {}),
    weightedPool,
    selectionFlow: {
      choiceCount,
      selectionPolicy: "single",
      applyMode: schema.selection?.commitment === "deferred" ? "deferred" : "immediate",
      postSelectionPoolBehavior,
      trackSelectedItems: poolStateTracking === "session",
      ...(effectApplication ? { effectApplication } : {}),
      ...(inventory ? { inventory } : {}),
    },
    selectionModal: {
      choiceCount,
      title: DEFAULT_TITLE,
      description: buildSelectionModalDescription(choiceCount, options.prompt),
      inventoryTitle: DEFAULT_INVENTORY_TITLE,
      payloadShape: "card_with_rarity",
      minDisplayCount: choiceCount,
      layoutPreset: "card_tray",
      selectionMode: "single",
      dismissBehavior: "selection_only",
      ...(inventory ? { inventory } : {}),
    },
  };
}

function isInputTriggerModule(module: BlueprintModule): boolean {
  return module.role === "input_trigger" || (module.patternIds || []).includes("input.key_binding");
}

function isWeightedPoolModule(module: BlueprintModule): boolean {
  return module.role === "weighted_pool" || (module.patternIds || []).includes("data.weighted_pool");
}

function isSelectionFlowModule(module: BlueprintModule): boolean {
  return module.role === "selection_flow" || (module.patternIds || []).includes("rule.selection_flow");
}

function isSelectionModalModule(module: BlueprintModule): boolean {
  return module.role === "selection_modal" || (module.patternIds || []).includes("ui.selection_modal");
}

function mergeModuleParameters(
  existing: Record<string, unknown> | undefined,
  projected: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!projected) {
    return existing;
  }

  const next: Record<string, unknown> = { ...(existing || {}) };
  for (const [key, value] of Object.entries(projected)) {
    if (value === undefined) {
      continue;
    }
    if (key === "entries") {
      const existingEntries = existing?.entries;
      if (Array.isArray(existingEntries) && existingEntries.length > 0) {
        next.entries = existingEntries;
        continue;
      }
    }
    if (!(key in next) || next[key] === undefined) {
      next[key] = value;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function applyGenericWeightedPoolProjection<TBlueprint extends Blueprint>(
  blueprint: TBlueprint,
  schema: WeightedPoolProjectionSchema,
  options: {
    prompt?: string;
    includeEntries?: boolean;
  } = {},
): TBlueprint {
  const projection = compileGenericWeightedPoolProjection(blueprint, schema, options);
  if (!projection) {
    return blueprint;
  }

  let changed = false;
  const modules = blueprint.modules.map((module) => {
    let parameters = module.parameters;
    if (isInputTriggerModule(module)) {
      parameters = mergeModuleParameters(parameters, projection.inputTrigger);
    } else if (isWeightedPoolModule(module)) {
      parameters = mergeModuleParameters(parameters, projection.weightedPool);
    } else if (isSelectionFlowModule(module)) {
      parameters = mergeModuleParameters(parameters, projection.selectionFlow);
    } else if (isSelectionModalModule(module)) {
      parameters = mergeModuleParameters(parameters, projection.selectionModal);
    }

    if (parameters !== module.parameters) {
      changed = true;
      return {
        ...module,
        parameters,
      };
    }

    return module;
  });

  if (!changed) {
    return blueprint;
  }

  const note = "Projected generic weighted-pool runtime parameters from feature-owned candidate pool semantics.";
  return {
    ...blueprint,
    modules,
    designDraft: blueprint.designDraft
      ? {
          ...blueprint.designDraft,
          notes: blueprint.designDraft.notes?.includes(note)
            ? blueprint.designDraft.notes
            : [...(blueprint.designDraft.notes || []), note],
        }
      : blueprint.designDraft,
  };
}

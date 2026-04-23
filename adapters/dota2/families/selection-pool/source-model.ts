import type {
  OutcomeSpec,
  SelectionPoolAttributeName,
  SelectionPoolAuthoredObject,
  SelectionPoolEffectProfile,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolLocalCollection,
  SelectionPoolObjectKind,
  SelectionPoolObjectRef,
  SelectionPoolObjectTier,
  SelectionPoolPoolEntry,
  SelectionPoolReusableObject,
} from "../../../../core/schema/types.js";
import {
  buildExportedContentCollections,
  type FeatureContentCollection,
  readFeatureContentCollectionsArtifact,
} from "../../content-collections/artifact.js";
import {
  DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID,
  SELECTION_POOL_OBJECT_ITEM_CONTRACT,
  resolveExternalContentCatalogObject,
} from "./content-catalogs.js";

const DEFAULT_LOCAL_COLLECTION_ID = "default";
const DEFAULT_OBJECT_TIER_SEQUENCE: SelectionPoolObjectTier[] = ["R", "R", "SR", "SR", "SSR", "UR"];
const PLACEHOLDER_WEIGHT_BY_TIER: Record<SelectionPoolObjectTier, number> = {
  R: 40,
  SR: 30,
  SSR: 20,
  UR: 10,
};

const OBJECT_KIND_ID_PREFIX: Record<string, string> = {
  equipment: "EQ_",
  skill_card_placeholder: "SC_",
  talent: "SEL_",
};

const OBJECT_KIND_LABEL_BASE: Record<string, string> = {
  equipment: "Equipment Option",
  skill_card_placeholder: "Skill Card Option",
  talent: "Talent Option",
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function dedupeErrors(errors: string[]): string[] {
  return [...new Set(errors)];
}

function isSelectionPoolAttributeName(value: unknown): value is SelectionPoolAttributeName {
  return value === "strength" || value === "agility" || value === "intelligence" || value === "all";
}

function isSelectionPoolObjectTier(value: unknown): value is SelectionPoolObjectTier {
  return value === "R" || value === "SR" || value === "SSR" || value === "UR";
}

function isOutcomePositionPolicy(value: unknown): value is "hero_origin" | "hero_forward" | "cursor_point" {
  return value === "hero_origin" || value === "hero_forward" || value === "cursor_point";
}

function isNativeItemDeliveryMode(value: unknown): value is "hero_inventory" | "ground_drop" {
  return value === "hero_inventory" || value === "ground_drop";
}

function isNativeItemInventoryFallback(value: unknown): value is "drop_to_ground" | "skip_delivery" {
  return value === "drop_to_ground" || value === "skip_delivery";
}

function normalizeOutcomeSpec(value: unknown): OutcomeSpec | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  if (raw.kind === "attribute_bonus") {
    const numericValue = Number(raw.value);
    if (!isSelectionPoolAttributeName(raw.attribute) || !Number.isFinite(numericValue)) {
      return undefined;
    }
    return {
      kind: "attribute_bonus",
      attribute: raw.attribute,
      value: numericValue,
    };
  }

  if (raw.kind === "native_item_delivery") {
    if (
      typeof raw.itemName !== "string" ||
      raw.itemName.trim().length === 0 ||
      !isNativeItemDeliveryMode(raw.deliveryMode) ||
      !isNativeItemInventoryFallback(raw.fallbackWhenInventoryFull) ||
      !isOutcomePositionPolicy(raw.positionPolicy)
    ) {
      return undefined;
    }
    return {
      kind: "native_item_delivery",
      itemName: raw.itemName.trim(),
      deliveryMode: raw.deliveryMode,
      fallbackWhenInventoryFull: raw.fallbackWhenInventoryFull,
      positionPolicy: raw.positionPolicy,
    };
  }

  if (raw.kind === "spawn_unit") {
    if (
      typeof raw.unitName !== "string" ||
      raw.unitName.trim().length === 0 ||
      !isOutcomePositionPolicy(raw.positionPolicy)
    ) {
      return undefined;
    }
    const spawnCount = Number(raw.spawnCount);
    return {
      kind: "spawn_unit",
      unitName: raw.unitName.trim(),
      spawnCount: Number.isFinite(spawnCount) && spawnCount >= 1 ? Math.floor(spawnCount) : 1,
      positionPolicy: raw.positionPolicy,
      teamScope: raw.teamScope === "player_team" ? "player_team" : "player_team",
    };
  }

  return undefined;
}

function normalizeSelectionPoolReusableObject(value: unknown): SelectionPoolReusableObject | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.objectId !== "string" ||
    typeof raw.label !== "string" ||
    typeof raw.description !== "string"
  ) {
    return undefined;
  }
  const outcome = raw.outcome === undefined ? undefined : normalizeOutcomeSpec(raw.outcome);
  if (raw.outcome !== undefined && !outcome) {
    return undefined;
  }
  return {
    objectId: raw.objectId.trim(),
    label: raw.label.trim() || raw.objectId.trim(),
    description: raw.description.trim() || "Selection object placeholder",
    ...(outcome ? { outcome } : {}),
  };
}

function normalizeSelectionPoolObjectRef(value: unknown): SelectionPoolObjectRef | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (raw.source === "local_collection") {
    if (typeof raw.collectionId !== "string" || typeof raw.objectId !== "string") {
      return undefined;
    }
    return {
      source: "local_collection",
      collectionId: raw.collectionId.trim(),
      objectId: raw.objectId.trim(),
    };
  }
  if (raw.source === "feature_export") {
    if (
      typeof raw.featureId !== "string" ||
      typeof raw.collectionId !== "string" ||
      typeof raw.objectId !== "string"
    ) {
      return undefined;
    }
    return {
      source: "feature_export",
      featureId: raw.featureId.trim(),
      collectionId: raw.collectionId.trim(),
      objectId: raw.objectId.trim(),
    };
  }
  if (raw.source === "external_catalog") {
    if (typeof raw.catalogId !== "string" || typeof raw.objectId !== "string") {
      return undefined;
    }
    return {
      source: "external_catalog",
      catalogId: raw.catalogId.trim(),
      objectId: raw.objectId.trim(),
    };
  }
  return undefined;
}

function normalizeSelectionPoolPoolEntry(value: unknown): SelectionPoolPoolEntry | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const objectRef = normalizeSelectionPoolObjectRef(raw.objectRef);
  if (
    typeof raw.entryId !== "string" ||
    !isSelectionPoolObjectTier(raw.tier) ||
    !objectRef
  ) {
    return undefined;
  }
  const weight = Math.max(1, Math.floor(Number(raw.weight) || PLACEHOLDER_WEIGHT_BY_TIER[raw.tier]));
  const displayOverride =
    raw.displayOverride && typeof raw.displayOverride === "object"
      ? {
          ...(typeof (raw.displayOverride as Record<string, unknown>).label === "string"
            ? { label: String((raw.displayOverride as Record<string, unknown>).label).trim() }
            : {}),
          ...(typeof (raw.displayOverride as Record<string, unknown>).description === "string"
            ? { description: String((raw.displayOverride as Record<string, unknown>).description).trim() }
            : {}),
        }
      : undefined;
  return {
    entryId: raw.entryId.trim(),
    objectRef,
    weight,
    tier: raw.tier,
    ...(displayOverride && (displayOverride.label || displayOverride.description)
      ? { displayOverride }
      : {}),
  };
}

function shouldSeedDefaultOutcomes(objectKindHint?: SelectionPoolObjectKind): boolean {
  return objectKindHint === undefined || objectKindHint === "talent";
}

function buildAttributeBonusOutcomeFromTier(
  tier: SelectionPoolObjectTier,
  effectProfile: SelectionPoolEffectProfile | undefined,
): OutcomeSpec | undefined {
  const bonus = effectProfile?.rarityAttributeBonusMap?.[tier];
  if (!bonus || !isSelectionPoolAttributeName(bonus.attribute) || !Number.isFinite(Number(bonus.value))) {
    return undefined;
  }
  return {
    kind: "attribute_bonus",
    attribute: bonus.attribute,
    value: Number(bonus.value),
  };
}

function createLegacyLocalCollection(
  objects: SelectionPoolAuthoredObject[],
  compatibilityEffectProfile: SelectionPoolEffectProfile | undefined,
): SelectionPoolLocalCollection {
  return {
    collectionId: DEFAULT_LOCAL_COLLECTION_ID,
    visibility: "local",
    objects: objects.map((object) => ({
      objectId: object.id.trim(),
      label: object.label.trim() || object.id.trim(),
      description: object.description.trim() || "Selection object placeholder",
      ...(normalizeOutcomeSpec(object.outcome)
        || buildAttributeBonusOutcomeFromTier(object.tier, compatibilityEffectProfile)
        ? { outcome: normalizeOutcomeSpec(object.outcome) || buildAttributeBonusOutcomeFromTier(object.tier, compatibilityEffectProfile) }
        : {}),
    })),
  };
}

function createLegacyPoolEntries(objects: SelectionPoolAuthoredObject[]): SelectionPoolPoolEntry[] {
  return objects.map((object) => ({
    entryId: object.id.trim(),
    objectRef: {
      source: "local_collection",
      collectionId: DEFAULT_LOCAL_COLLECTION_ID,
      objectId: object.id.trim(),
    },
    weight: Math.max(1, Math.floor(Number(object.weight) || PLACEHOLDER_WEIGHT_BY_TIER[object.tier])),
    tier: object.tier,
  }));
}

function hasExplicitCanonicalSourceShape(raw: Partial<SelectionPoolFeatureAuthoringParameters>): boolean {
  return raw.localCollections !== undefined || raw.poolEntries !== undefined;
}

function hasLegacyObjectsInput(rawObjects: SelectionPoolFeatureAuthoringParameters["objects"]): boolean {
  return Array.isArray(rawObjects) && rawObjects.length > 0;
}

function shouldUseLegacyObjectFallback(raw: Partial<SelectionPoolFeatureAuthoringParameters>): boolean {
  return !hasExplicitCanonicalSourceShape(raw);
}

function collectMixedSourceTruthErrors(
  raw: Partial<SelectionPoolFeatureAuthoringParameters>,
): string[] {
  return hasExplicitCanonicalSourceShape(raw) && hasLegacyObjectsInput(raw.objects)
    ? ["Selection pool source truth cannot mix canonical 'localCollections/poolEntries' with legacy 'objects'."]
    : [];
}

function getObjectIdPrefix(objectKindHint?: SelectionPoolObjectKind): string {
  return OBJECT_KIND_ID_PREFIX[objectKindHint || "talent"] || "SEL_";
}

function getObjectLabelBase(objectKindHint?: SelectionPoolObjectKind): string {
  return OBJECT_KIND_LABEL_BASE[objectKindHint || "talent"] || "Selection Option";
}

function getPlaceholderDescription(objectKindHint: SelectionPoolObjectKind | undefined, tier: SelectionPoolObjectTier): string {
  const kindLabel = objectKindHint === "equipment"
    ? "equipment"
    : objectKindHint === "skill_card_placeholder"
      ? "skill card"
      : "selection";
  return `Placeholder ${kindLabel} option (${tier})`;
}

function buildPlaceholderSourceModel(objectKindHint?: SelectionPoolObjectKind): {
  localCollections: SelectionPoolLocalCollection[];
  poolEntries: SelectionPoolPoolEntry[];
} {
  const collection: SelectionPoolLocalCollection = {
    collectionId: DEFAULT_LOCAL_COLLECTION_ID,
    visibility: "local",
    objects: DEFAULT_OBJECT_TIER_SEQUENCE.map((tier, index) => {
      const serialText = String(index + 1).padStart(3, "0");
      const objectId = `${getObjectIdPrefix(objectKindHint)}${tier}${serialText}`;
      return {
        objectId,
        label: `${getObjectLabelBase(objectKindHint)} ${tier}${serialText}`,
        description: getPlaceholderDescription(objectKindHint, tier),
      };
    }),
  };
  return {
    localCollections: [collection],
    poolEntries: collection.objects.map((object, index) => ({
      entryId: object.objectId,
      objectRef: {
        source: "local_collection",
        collectionId: collection.collectionId,
        objectId: object.objectId,
      },
      weight: PLACEHOLDER_WEIGHT_BY_TIER[DEFAULT_OBJECT_TIER_SEQUENCE[index]],
      tier: DEFAULT_OBJECT_TIER_SEQUENCE[index],
    })),
  };
}

function normalizeLocalCollections(
  rawLocalCollections: SelectionPoolFeatureAuthoringParameters["localCollections"],
  rawObjects: SelectionPoolFeatureAuthoringParameters["objects"],
  compatibilityEffectProfile: SelectionPoolEffectProfile | undefined,
  objectKindHint?: SelectionPoolObjectKind,
  allowLegacyObjectFallback: boolean = true,
): SelectionPoolLocalCollection[] {
  const normalizedCollections: SelectionPoolLocalCollection[] = [];
  const seenCollectionIds = new Set<string>();

  for (const candidate of rawLocalCollections || []) {
    if (!candidate || typeof candidate !== "object" || typeof candidate.collectionId !== "string" || !Array.isArray(candidate.objects)) {
      continue;
    }
    const collectionId = candidate.collectionId.trim();
    if (!collectionId || seenCollectionIds.has(collectionId)) {
      continue;
    }
    const seenObjectIds = new Set<string>();
    const objects: SelectionPoolReusableObject[] = [];
    for (const object of candidate.objects) {
      const normalized = normalizeSelectionPoolReusableObject(object);
      if (!normalized || !normalized.objectId || seenObjectIds.has(normalized.objectId)) {
        continue;
      }
      seenObjectIds.add(normalized.objectId);
      objects.push(normalized);
    }
    if (objects.length === 0) {
      continue;
    }
    seenCollectionIds.add(collectionId);
    normalizedCollections.push({
      collectionId,
      visibility: candidate.visibility === "exported" ? "exported" : "local",
      objects,
    });
  }

  if (normalizedCollections.length > 0) {
    return normalizedCollections;
  }

  if (allowLegacyObjectFallback && Array.isArray(rawObjects) && rawObjects.length > 0) {
    const normalizedLegacyObjects = rawObjects.filter(
      (object): object is SelectionPoolAuthoredObject =>
        Boolean(
          object &&
            typeof object.id === "string" &&
            typeof object.label === "string" &&
            typeof object.description === "string" &&
            typeof object.weight === "number" &&
            isSelectionPoolObjectTier(object.tier),
        ),
    );
    if (normalizedLegacyObjects.length > 0) {
      return [createLegacyLocalCollection(normalizedLegacyObjects, compatibilityEffectProfile)];
    }
  }

  return allowLegacyObjectFallback ? buildPlaceholderSourceModel(objectKindHint).localCollections : [];
}

function normalizePoolEntries(
  rawPoolEntries: SelectionPoolFeatureAuthoringParameters["poolEntries"],
  rawObjects: SelectionPoolFeatureAuthoringParameters["objects"],
  objectKindHint?: SelectionPoolObjectKind,
  allowLegacyObjectFallback: boolean = true,
): SelectionPoolPoolEntry[] {
  const normalizedEntries: SelectionPoolPoolEntry[] = [];
  const seenEntryIds = new Set<string>();

  for (const candidate of rawPoolEntries || []) {
    const normalized = normalizeSelectionPoolPoolEntry(candidate);
    if (!normalized || !normalized.entryId || seenEntryIds.has(normalized.entryId)) {
      continue;
    }
    seenEntryIds.add(normalized.entryId);
    normalizedEntries.push(normalized);
  }

  if (normalizedEntries.length > 0) {
    return normalizedEntries;
  }

  if (allowLegacyObjectFallback && Array.isArray(rawObjects) && rawObjects.length > 0) {
    const normalizedLegacyObjects = rawObjects.filter(
      (object): object is SelectionPoolAuthoredObject =>
        Boolean(
          object &&
            typeof object.id === "string" &&
            typeof object.label === "string" &&
            typeof object.description === "string" &&
            typeof object.weight === "number" &&
            isSelectionPoolObjectTier(object.tier),
        ),
    );
    if (normalizedLegacyObjects.length > 0) {
      return createLegacyPoolEntries(normalizedLegacyObjects);
    }
  }

  return allowLegacyObjectFallback ? buildPlaceholderSourceModel(objectKindHint).poolEntries : [];
}

function objectRefKey(ref: SelectionPoolObjectRef): string {
  if (ref.source === "local_collection") {
    return `local:${ref.collectionId}:${ref.objectId}`;
  }
  if (ref.source === "feature_export") {
    return `feature:${ref.featureId}:${ref.collectionId}:${ref.objectId}`;
  }
  return `catalog:${ref.catalogId}:${ref.objectId}`;
}

function getLocalObjectIndex(localCollections: SelectionPoolLocalCollection[]): Map<string, SelectionPoolReusableObject> {
  const index = new Map<string, SelectionPoolReusableObject>();
  for (const collection of localCollections) {
    for (const object of collection.objects) {
      index.set(`local:${collection.collectionId}:${object.objectId}`, object);
    }
  }
  return index;
}

function resolveObjectFromRef(
  ref: SelectionPoolObjectRef,
  localObjectIndex: Map<string, SelectionPoolReusableObject>,
  hostRoot: string | undefined,
  allowDeferredFeatureExportResolution: boolean,
): { object?: SelectionPoolReusableObject; error?: string } {
  if (ref.source === "local_collection") {
    const localObject = localObjectIndex.get(objectRefKey(ref));
    return localObject
      ? { object: localObject }
      : { error: `Missing local collection object '${ref.collectionId}:${ref.objectId}'.` };
  }

  if (!hostRoot) {
    if (allowDeferredFeatureExportResolution && ref.source === "feature_export") {
      return {
        object: {
          objectId: ref.objectId,
          label: ref.objectId,
          description: `Deferred feature export ${ref.featureId}:${ref.collectionId}:${ref.objectId}`,
        },
      };
    }
    return { error: `Resolving '${objectRefKey(ref)}' requires hostRoot-backed source artifacts.` };
  }

  if (ref.source === "feature_export") {
    const artifact = readFeatureContentCollectionsArtifact(hostRoot, ref.featureId);
    if (!artifact) {
      return { error: `Missing exported content collections for feature '${ref.featureId}'.` };
    }
    const collection = artifact.collections.find((candidate) => candidate.collectionId === ref.collectionId);
    if (!collection) {
      return { error: `Missing exported collection '${ref.collectionId}' on feature '${ref.featureId}'.` };
    }
    if (collection.itemContract !== SELECTION_POOL_OBJECT_ITEM_CONTRACT) {
      return {
        error: `Exported collection '${ref.featureId}:${ref.collectionId}' has incompatible item contract '${collection.itemContract}'.`,
      };
    }
    const object = collection.items.find((candidate) => candidate.objectId === ref.objectId);
    return object
      ? { object }
      : { error: `Missing exported object '${ref.featureId}:${ref.collectionId}:${ref.objectId}'.` };
  }

  const object = resolveExternalContentCatalogObject(ref.catalogId, ref.objectId);
  return object
    ? { object }
    : { error: `Missing external catalog object '${ref.catalogId}:${ref.objectId}'.` };
}

export function countSelectionPoolEntries(parameters: SelectionPoolFeatureAuthoringParameters): number {
  return normalizeSelectionPoolSourceParameters(parameters, {
    objectKindHint: parameters.objectKind,
    compatibilityEffectProfile:
      parameters.effectProfile?.kind === "tier_attribute_bonus_placeholder"
        ? deepClone(parameters.effectProfile)
        : undefined,
  }).poolEntries?.length || 0;
}

export function normalizeSelectionPoolSourceParameters(
  raw: Partial<SelectionPoolFeatureAuthoringParameters>,
  options: {
    objectKindHint?: SelectionPoolObjectKind;
    compatibilityEffectProfile?: SelectionPoolEffectProfile;
  } = {},
): Pick<SelectionPoolFeatureAuthoringParameters, "localCollections" | "poolEntries"> {
  const allowLegacyObjectFallback = shouldUseLegacyObjectFallback(raw);
  return {
    localCollections: normalizeLocalCollections(
      raw.localCollections,
      raw.objects,
      options.compatibilityEffectProfile,
      options.objectKindHint,
      allowLegacyObjectFallback,
    ),
    poolEntries: normalizePoolEntries(
      raw.poolEntries,
      raw.objects,
      options.objectKindHint,
      allowLegacyObjectFallback,
    ),
  };
}

export function resolveSelectionPoolCompiledObjects(
  parameters: SelectionPoolFeatureAuthoringParameters,
  hostRoot?: string,
  options: { allowDeferredFeatureExportResolution?: boolean } = {},
): { objects: SelectionPoolAuthoredObject[]; errors: string[] } {
  const compatibilityEffectProfile = parameters.effectProfile?.kind === "tier_attribute_bonus_placeholder"
    ? deepClone(parameters.effectProfile)
    : undefined;
  const normalizedSource = normalizeSelectionPoolSourceParameters(parameters, {
    objectKindHint: parameters.objectKind,
    compatibilityEffectProfile:
      compatibilityEffectProfile
      || (shouldSeedDefaultOutcomes(parameters.objectKind)
        ? {
            kind: "tier_attribute_bonus_placeholder",
            rarityAttributeBonusMap: {
              R: { attribute: "strength", value: 10 },
              SR: { attribute: "agility", value: 10 },
              SSR: { attribute: "intelligence", value: 10 },
              UR: { attribute: "all", value: 10 },
            },
          }
        : undefined),
  });
  const localObjectIndex = getLocalObjectIndex(normalizedSource.localCollections || []);
  const errors: string[] = [...collectMixedSourceTruthErrors(parameters)];
  const objects: SelectionPoolAuthoredObject[] = [];
  const seenObjectRefs = new Set<string>();
  const seenEntryIds = new Set<string>();

  for (const entry of normalizedSource.poolEntries || []) {
    if (seenEntryIds.has(entry.entryId)) {
      errors.push(`Duplicate pool entry id '${entry.entryId}'.`);
      continue;
    }
    seenEntryIds.add(entry.entryId);
    const refKey = objectRefKey(entry.objectRef);
    if (seenObjectRefs.has(refKey)) {
      errors.push(`Duplicate pool object ref '${refKey}' inside one selection pool.`);
      continue;
    }
    seenObjectRefs.add(refKey);
    const resolved = resolveObjectFromRef(
      entry.objectRef,
      localObjectIndex,
      hostRoot,
      options.allowDeferredFeatureExportResolution === true,
    );
    if (!resolved.object) {
      if (resolved.error) {
        errors.push(resolved.error);
      }
      continue;
    }
    const sourceObject = resolved.object;
    objects.push({
      id: entry.entryId,
      label: entry.displayOverride?.label || sourceObject.label,
      description: entry.displayOverride?.description || sourceObject.description,
      weight: entry.weight,
      tier: entry.tier,
      ...(sourceObject.outcome ? { outcome: deepClone(sourceObject.outcome) } : {}),
    });
  }

  return { objects, errors };
}

export function collectSelectionPoolSourceValidationErrors(
  parameters: SelectionPoolFeatureAuthoringParameters,
  hostRoot?: string,
): string[] {
  const errors: string[] = [...collectMixedSourceTruthErrors(parameters)];
  const normalized = normalizeSelectionPoolSourceParameters(parameters, {
    objectKindHint: parameters.objectKind,
    compatibilityEffectProfile:
      parameters.effectProfile?.kind === "tier_attribute_bonus_placeholder"
        ? deepClone(parameters.effectProfile)
        : undefined,
  });

  const collectionIds = new Set<string>();
  for (const collection of normalized.localCollections || []) {
    if (!collection.collectionId) {
      errors.push("Selection pool local collections require non-empty collectionId.");
      continue;
    }
    if (collectionIds.has(collection.collectionId)) {
      errors.push(`Duplicate local collection id '${collection.collectionId}'.`);
      continue;
    }
    collectionIds.add(collection.collectionId);
    const objectIds = new Set<string>();
    for (const object of collection.objects) {
      if (!object.objectId) {
        errors.push(`Collection '${collection.collectionId}' contains an empty objectId.`);
        continue;
      }
      if (objectIds.has(object.objectId)) {
        errors.push(`Duplicate object '${collection.collectionId}:${object.objectId}'.`);
        continue;
      }
      objectIds.add(object.objectId);
    }
  }

  for (const entry of normalized.poolEntries || []) {
    if (!entry.entryId) {
      errors.push("Selection pool entries require non-empty entryId.");
    }
    if (entry.objectRef.source === "external_catalog" && !entry.objectRef.catalogId) {
      errors.push(`Pool entry '${entry.entryId}' is missing external catalog id.`);
    }
    if (entry.objectRef.source === "feature_export" && !entry.objectRef.featureId) {
      errors.push(`Pool entry '${entry.entryId}' is missing source featureId.`);
    }
  }

  if (hasExplicitCanonicalSourceShape(parameters) && hasLegacyObjectsInput(parameters.objects)) {
    return dedupeErrors([
      ...errors,
      ...resolveSelectionPoolCompiledObjects(parameters, hostRoot).errors,
    ]);
  }

  const resolution = resolveSelectionPoolCompiledObjects(parameters, hostRoot);
  return dedupeErrors([...errors, ...resolution.errors]);
}

export function expandSelectionPoolPoolToCount(
  parameters: SelectionPoolFeatureAuthoringParameters,
  targetCount: number,
  objectKindHint?: SelectionPoolObjectKind,
): SelectionPoolFeatureAuthoringParameters {
  const currentCount = countSelectionPoolEntries(parameters);
  if (currentCount >= targetCount) {
    return parameters;
  }

  const compatibilityEffectProfile = parameters.effectProfile?.kind === "tier_attribute_bonus_placeholder"
    ? deepClone(parameters.effectProfile)
    : undefined;
  const normalized = normalizeSelectionPoolSourceParameters(parameters, {
    objectKindHint: objectKindHint || parameters.objectKind,
    compatibilityEffectProfile,
  });
  const localCollections = deepClone(normalized.localCollections || []);
  const poolEntries = deepClone(normalized.poolEntries || []);
  const objectKind = objectKindHint || parameters.objectKind;
  const targetCollectionId = localCollections[0]?.collectionId || DEFAULT_LOCAL_COLLECTION_ID;
  const targetCollection =
    localCollections.find((collection) => collection.collectionId === targetCollectionId)
    || (() => {
      const collection: SelectionPoolLocalCollection = {
        collectionId: targetCollectionId,
        visibility: "local",
        objects: [],
      };
      localCollections.push(collection);
      return collection;
    })();

  const existingObjectIds = new Set(localCollections.flatMap((collection) => collection.objects.map((object) => object.objectId)));
  const existingEntryIds = new Set(poolEntries.map((entry) => entry.entryId));
  const nextSerialByTier: Record<SelectionPoolObjectTier, number> = { R: 1, SR: 1, SSR: 1, UR: 1 };

  for (const objectId of existingObjectIds) {
    const match = objectId.match(/^(?:.*?)(SSR|SR|UR|R)(\d+)$/);
    if (!match) {
      continue;
    }
    const tier = match[1] as SelectionPoolObjectTier;
    nextSerialByTier[tier] = Math.max(nextSerialByTier[tier], Number(match[2]) + 1);
  }

  let sequenceIndex = 0;
  while (poolEntries.length < targetCount) {
    const tier = DEFAULT_OBJECT_TIER_SEQUENCE[sequenceIndex % DEFAULT_OBJECT_TIER_SEQUENCE.length];
    const serialText = String(nextSerialByTier[tier]).padStart(3, "0");
    nextSerialByTier[tier] += 1;
    const objectId = `${getObjectIdPrefix(objectKind)}${tier}${serialText}`;
    sequenceIndex += 1;
    if (existingObjectIds.has(objectId) || existingEntryIds.has(objectId)) {
      continue;
    }
    existingObjectIds.add(objectId);
    existingEntryIds.add(objectId);
    targetCollection.objects.push({
      objectId,
      label: `${getObjectLabelBase(objectKind)} ${tier}${serialText}`,
      description: getPlaceholderDescription(objectKind, tier),
    });
    poolEntries.push({
      entryId: objectId,
      objectRef: {
        source: "local_collection",
        collectionId: targetCollection.collectionId,
        objectId,
      },
      weight: PLACEHOLDER_WEIGHT_BY_TIER[tier],
      tier,
    });
  }

  return {
    ...parameters,
    localCollections,
    poolEntries,
  };
}

export function buildExportedContentCollectionsFromParameters(
  parameters: SelectionPoolFeatureAuthoringParameters,
): FeatureContentCollection[] {
  const normalized = normalizeSelectionPoolSourceParameters(parameters, {
    objectKindHint: parameters.objectKind,
    compatibilityEffectProfile:
      parameters.effectProfile?.kind === "tier_attribute_bonus_placeholder"
        ? deepClone(parameters.effectProfile)
        : undefined,
  });
  const exportedCollections = (normalized.localCollections || [])
    .filter((collection) => collection.visibility === "exported")
    .map((collection) => ({
      collectionId: collection.collectionId,
      items: collection.objects,
    }));
  return buildExportedContentCollections(exportedCollections);
}

export function createFeatureExportEntry(
  entryId: string,
  sourceFeatureId: string,
  collectionId: string,
  objectId: string,
  weight: number,
  tier: SelectionPoolObjectTier,
): SelectionPoolPoolEntry {
  return {
    entryId,
    objectRef: {
      source: "feature_export",
      featureId: sourceFeatureId,
      collectionId,
      objectId,
    },
    weight,
    tier,
  };
}

export function createExternalCatalogEntry(
  entryId: string,
  objectId: string,
  weight: number,
  tier: SelectionPoolObjectTier,
  catalogId: string = DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID,
): SelectionPoolPoolEntry {
  return {
    entryId,
    objectRef: {
      source: "external_catalog",
      catalogId,
      objectId,
    },
    weight,
    tier,
  };
}

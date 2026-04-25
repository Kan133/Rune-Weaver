import type {
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolObjectKind,
  SelectionPoolObjectTier,
} from "../../../../core/schema/types.js";
import { DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID } from "./content-catalogs.js";
import { createExternalCatalogEntry } from "./source-model.js";

interface CatalogSeedEntry {
  entryId: string;
  objectId: string;
  weight: number;
  tier: SelectionPoolObjectTier;
}

interface SelectionPoolCatalogSeedSpec {
  catalogId: string;
  entries: CatalogSeedEntry[];
  seedNote: string;
}

const EQUIPMENT_CATALOG_SEED: SelectionPoolCatalogSeedSpec = {
  catalogId: DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID,
  entries: [
    { entryId: "EQ_R001", objectId: "item_branches", weight: 40, tier: "R" },
    { entryId: "EQ_R002", objectId: "item_magic_stick", weight: 40, tier: "R" },
    { entryId: "EQ_SR001", objectId: "item_power_treads", weight: 30, tier: "SR" },
    { entryId: "EQ_SR002", objectId: "item_phase_boots", weight: 30, tier: "SR" },
    { entryId: "EQ_SSR001", objectId: "item_blink", weight: 20, tier: "SSR" },
    { entryId: "EQ_UR001", objectId: "item_black_king_bar", weight: 10, tier: "UR" },
  ],
  seedNote: "selection_pool seeded the equipment pool from the curated native-item catalog.",
};

const CATALOG_SEEDS_BY_OBJECT_KIND: Partial<Record<SelectionPoolObjectKind, SelectionPoolCatalogSeedSpec>> = {
  equipment: EQUIPMENT_CATALOG_SEED,
};

export interface SelectionPoolCatalogBackedSeedParameters {
  localCollections: NonNullable<SelectionPoolFeatureAuthoringParameters["localCollections"]>;
  poolEntries: NonNullable<SelectionPoolFeatureAuthoringParameters["poolEntries"]>;
  seedNote: string;
}

export function getSelectionPoolCatalogBackedSeedParameters(
  objectKindHint?: SelectionPoolObjectKind,
): SelectionPoolCatalogBackedSeedParameters | undefined {
  if (!objectKindHint) {
    return undefined;
  }

  const seed = CATALOG_SEEDS_BY_OBJECT_KIND[objectKindHint];
  if (!seed) {
    return undefined;
  }

  return {
    localCollections: [],
    poolEntries: seed.entries.map((entry) =>
      createExternalCatalogEntry(
        entry.entryId,
        entry.objectId,
        entry.weight,
        entry.tier,
        seed.catalogId,
      )),
    seedNote: seed.seedNote,
  };
}

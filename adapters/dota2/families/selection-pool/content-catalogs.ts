import type { SelectionPoolReusableObject } from "../../../../core/schema/types.js";

import { DOTA2_NATIVE_ITEM_OBJECTS } from "../../reference-data/native-items-catalog.js";

export const SELECTION_POOL_OBJECT_ITEM_CONTRACT = "selection_pool.object";
export const DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID = "dota2.native_items.curated";

export interface ExternalContentCatalogProvider {
  catalogId: string;
  itemContract: typeof SELECTION_POOL_OBJECT_ITEM_CONTRACT;
  resolveObject(objectId: string): SelectionPoolReusableObject | undefined;
}

const externalCatalogProviders = new Map<string, ExternalContentCatalogProvider>();

function cloneReusableObject(object: SelectionPoolReusableObject): SelectionPoolReusableObject {
  return JSON.parse(JSON.stringify(object)) as SelectionPoolReusableObject;
}

function createCuratedNativeItemsCatalogProvider(): ExternalContentCatalogProvider {
  return {
    catalogId: DOTA2_CURATED_NATIVE_ITEMS_CATALOG_ID,
    itemContract: SELECTION_POOL_OBJECT_ITEM_CONTRACT,
    resolveObject(objectId: string): SelectionPoolReusableObject | undefined {
      const normalizedId = objectId.trim();
      const seeded = DOTA2_NATIVE_ITEM_OBJECTS[normalizedId];
      return seeded ? cloneReusableObject(seeded) : undefined;
    },
  };
}

export function registerExternalContentCatalogProvider(
  provider: ExternalContentCatalogProvider,
): void {
  externalCatalogProviders.set(provider.catalogId, provider);
}

export function resolveExternalContentCatalogObject(
  catalogId: string,
  objectId: string,
): SelectionPoolReusableObject | undefined {
  return externalCatalogProviders.get(catalogId)?.resolveObject(objectId);
}

registerExternalContentCatalogProvider(createCuratedNativeItemsCatalogProvider());

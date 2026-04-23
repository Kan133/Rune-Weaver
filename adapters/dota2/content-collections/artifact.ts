import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { SelectionPoolReusableObject } from "../../../core/schema/types.js";
import { SELECTION_POOL_OBJECT_ITEM_CONTRACT } from "../families/selection-pool/content-catalogs.js";

export const RW_CONTENT_COLLECTIONS_ADAPTER = "rw_content_collections";

export interface FeatureContentCollection {
  collectionId: string;
  role: "candidate-options" | "generic";
  itemContract: typeof SELECTION_POOL_OBJECT_ITEM_CONTRACT;
  items: SelectionPoolReusableObject[];
}

export interface FeatureContentCollectionsArtifactV1 {
  adapter: typeof RW_CONTENT_COLLECTIONS_ADAPTER;
  version: 1;
  featureId: string;
  collections: FeatureContentCollection[];
}

function cloneCollections<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isSelectionPoolReusableObject(value: unknown): value is SelectionPoolReusableObject {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).objectId === "string" &&
      typeof (value as Record<string, unknown>).label === "string" &&
      typeof (value as Record<string, unknown>).description === "string",
  );
}

function isFeatureContentCollection(value: unknown): value is FeatureContentCollection {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).collectionId === "string" &&
      (((value as Record<string, unknown>).role === "candidate-options")
        || ((value as Record<string, unknown>).role === "generic")) &&
      (value as Record<string, unknown>).itemContract === SELECTION_POOL_OBJECT_ITEM_CONTRACT &&
      Array.isArray((value as Record<string, unknown>).items) &&
      ((value as Record<string, unknown>).items as unknown[]).every((item) => isSelectionPoolReusableObject(item)),
  );
}

export function isFeatureContentCollectionsArtifactV1(
  value: unknown,
): value is FeatureContentCollectionsArtifactV1 {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).adapter === RW_CONTENT_COLLECTIONS_ADAPTER &&
      (value as Record<string, unknown>).version === 1 &&
      typeof (value as Record<string, unknown>).featureId === "string" &&
      Array.isArray((value as Record<string, unknown>).collections) &&
      ((value as Record<string, unknown>).collections as unknown[]).every((collection) => isFeatureContentCollection(collection)),
  );
}

function readJsonArtifact<T>(hostRoot: string, relativePath: string): T | undefined {
  const fullPath = join(hostRoot, relativePath);
  if (!existsSync(fullPath)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

export function getFeatureContentCollectionsArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/content-collections.json`;
}

export function buildFeatureContentCollectionsArtifact(
  featureId: string,
  collections: FeatureContentCollection[],
): FeatureContentCollectionsArtifactV1 {
  return {
    adapter: RW_CONTENT_COLLECTIONS_ADAPTER,
    version: 1,
    featureId,
    collections: cloneCollections(collections),
  };
}

export function readFeatureContentCollectionsArtifact(
  hostRoot: string,
  featureId: string,
): FeatureContentCollectionsArtifactV1 | undefined {
  const artifact = readJsonArtifact<FeatureContentCollectionsArtifactV1>(
    hostRoot,
    getFeatureContentCollectionsArtifactRelativePath(featureId),
  );
  return isFeatureContentCollectionsArtifactV1(artifact) ? artifact : undefined;
}

export function buildExportedContentCollections(
  collections: Array<{ collectionId: string; items: SelectionPoolReusableObject[] }>,
): FeatureContentCollection[] {
  return collections.map((collection) => ({
    collectionId: collection.collectionId,
    role: "candidate-options",
    itemContract: SELECTION_POOL_OBJECT_ITEM_CONTRACT,
    items: cloneCollections(collection.items),
  }));
}

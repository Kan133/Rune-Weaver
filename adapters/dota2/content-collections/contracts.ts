import type {
  FeatureContract,
  FeatureDependencyEdge,
} from "../../../core/schema/types.js";
import {
  ensureFeatureContractSurface,
  ensureFeatureDependencyEdge,
} from "../../../core/contracts/feature-contract.js";

import type { FeatureContentCollection } from "./artifact.js";
import { SELECTION_POOL_OBJECT_ITEM_CONTRACT } from "../families/selection-pool/content-catalogs.js";

export function createContentCollectionSurfaceId(collectionId: string): string {
  return `content_collection:${collectionId}`;
}

export function ensureExportsContentCollections(
  contract: FeatureContract | undefined,
  collections: FeatureContentCollection[],
): FeatureContract {
  let nextContract = contract;
  for (const collection of collections) {
    const surfaceId = createContentCollectionSurfaceId(collection.collectionId);
    nextContract = ensureFeatureContractSurface(nextContract, "exports", {
      id: surfaceId,
      kind: "data",
      summary: `Exports reusable content collection '${collection.collectionId}'.`,
      contractId: SELECTION_POOL_OBJECT_ITEM_CONTRACT,
    });
  }

  return nextContract || {
    exports: [],
    consumes: [],
    integrationSurfaces: [],
    stateScopes: [],
  };
}

export function ensureConsumesContentCollection(
  contract: FeatureContract | undefined,
  collectionId: string,
  featureId: string,
): FeatureContract {
  const surfaceId = createContentCollectionSurfaceId(collectionId);
  return ensureFeatureContractSurface(contract, "consumes", {
    id: surfaceId,
    kind: "data",
    summary: `Reads reusable content collection '${collectionId}' from feature '${featureId}'.`,
    contractId: SELECTION_POOL_OBJECT_ITEM_CONTRACT,
  });
}

export function ensureContentCollectionReadDependency(
  dependencyEdges: FeatureDependencyEdge[] | undefined,
  targetFeatureId: string,
  collectionId: string,
): FeatureDependencyEdge[] {
  const targetSurfaceId = createContentCollectionSurfaceId(collectionId);
  return ensureFeatureDependencyEdge(dependencyEdges, {
    relation: "reads",
    targetFeatureId,
    targetSurfaceId,
    targetContractId: SELECTION_POOL_OBJECT_ITEM_CONTRACT,
    required: true,
    summary: `content collection read:${targetFeatureId}:${targetSurfaceId}`,
  });
}

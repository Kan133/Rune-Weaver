import assert from "node:assert/strict";

import {
  ensureConsumesContentCollection,
  ensureContentCollectionReadDependency,
  ensureExportsContentCollections,
} from "./contracts.js";

{
  const contract = ensureExportsContentCollections(undefined, [
    {
      collectionId: "default",
      role: "candidate-options",
      itemContract: "selection_pool.object",
      items: [],
    },
  ]);

  assert.equal(contract.exports.length, 1);
  assert.equal(contract.exports[0]?.contractId, "selection_pool.object");
}

{
  const contract = ensureConsumesContentCollection(undefined, "shared_rewards", "provider_demo");
  assert.equal(contract.consumes.length, 1);
  assert.equal(contract.consumes[0]?.contractId, "selection_pool.object");
}

{
  const edges = ensureContentCollectionReadDependency(undefined, "provider_demo", "shared_rewards");
  assert.equal(edges.length, 1);
  assert.equal(edges[0]?.targetContractId, "selection_pool.object");
}

console.log("adapters/dota2/content-collections/contracts.test.ts passed");

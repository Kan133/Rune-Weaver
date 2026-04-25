import assert from "node:assert/strict";

import { HostSymbolIndex } from "./host-symbol-index.js";

function testLookupExactRespectsDomainAndKindFilters(): void {
  const index = new HostSymbolIndex([
    {
      id: "panorama::Panel",
      name: "Panel",
      normalizedName: "panel",
      kind: "api-type",
      domain: "panorama",
      sourceFile: "panorama/api.json",
      searchTokens: ["panel"],
    },
    {
      id: "vscripts::Panel",
      name: "Panel",
      normalizedName: "panel",
      kind: "api-function",
      domain: "vscripts",
      sourceFile: "vscripts/api.json",
      searchTokens: ["panel"],
    },
    {
      id: "shared::Panel",
      name: "Panel",
      normalizedName: "panel",
      kind: "api-type",
      domain: "shared",
      sourceFile: "shared/api.json",
      searchTokens: ["panel"],
    },
  ]);

  const unfiltered = index.lookupExact("Panel");
  const panoramaTypes = index.lookupExact("Panel", {
    domains: ["panorama"],
    kinds: ["api-type"],
  });

  assert.equal(unfiltered.length, 3);
  assert.equal(panoramaTypes.length, 1);
  assert.equal(panoramaTypes[0]?.entry.domain, "panorama");
  assert.equal(panoramaTypes[0]?.entry.kind, "api-type");
}

function runTests(): void {
  testLookupExactRespectsDomainAndKindFilters();
  console.log("core/retrieval/host-symbol-index.test.ts passed");
}

runTests();

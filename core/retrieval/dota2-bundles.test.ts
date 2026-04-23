import assert from "node:assert/strict";

import {
  buildDota2CorpusSourcePlan,
  buildDota2RetrievalBundle,
  DOTA2_CORPUS_REGISTRY,
  lookupDota2HostSymbolsExact,
} from "./dota2-bundles.js";

function testWizardCorpusPlanExcludesRawReference(): void {
  const plan = buildDota2CorpusSourcePlan(process.cwd(), "wizard.create");

  assert.ok(plan.some((entry) => entry.entryId === "dota2-governance"));
  assert.ok(plan.some((entry) => entry.entryId === "dota2-curated-host"));
  assert.equal(plan.some((entry) => entry.sourceKind === "raw_reference"), false);
}

function testSynthesisCorpusPlanIncludesRegistryBackedRawReference(): void {
  const plan = buildDota2CorpusSourcePlan(process.cwd(), "synthesis.module");
  const rawReference = plan.find((entry) => entry.entryId === "dota2-raw-reference");
  const curated = plan.find((entry) => entry.entryId === "dota2-curated-host");
  const rawRegistry = DOTA2_CORPUS_REGISTRY.find((entry) => entry.id === "dota2-raw-reference");

  assert.ok(rawReference);
  assert.ok(rawRegistry);
  assert.equal(rawReference!.canonicalPath, rawRegistry!.canonicalPath);
  assert.ok(rawReference!.selectedPaths.includes(rawRegistry!.canonicalPath));
  assert.ok(curated);
  assert.ok(curated!.selectedPaths.includes(curated!.canonicalPath));
  assert.equal(curated!.stability, "transitional");
}

async function testWizardBundleStaysOffRawReferenceTier(): Promise<void> {
  const bundle = await buildDota2RetrievalBundle({
    promptPackageId: "wizard.create",
    queryText: "主动技能 no ui OnSpellStart GetCaster",
    targetProfile: "lua_ability",
    symbolQueries: ["OnSpellStart", "GetCaster"],
  });
  const registryPlan = ((bundle.metadata || {}).registryPlan || []) as Array<{ sourceKind?: string }>;

  assert.equal(bundle.evidenceRefs.some((ref) => ref.sourceKind === "raw_reference"), false);
  assert.equal(registryPlan.some((entry) => entry.sourceKind === "raw_reference"), false);
}

async function testSynthesisBundleCanUseRawReferenceTier(): Promise<void> {
  const bundle = await buildDota2RetrievalBundle({
    promptPackageId: "synthesis.module",
    queryText: "主动技能 OnSpellStart GetCaster",
    targetProfile: "lua_ability",
    symbolQueries: ["OnSpellStart", "GetCaster"],
  });
  const registryPlan = ((bundle.metadata || {}).registryPlan || []) as Array<{ sourceKind?: string }>;

  assert.equal(registryPlan.some((entry) => entry.sourceKind === "raw_reference"), true);
  assert.equal(bundle.evidenceRefs.some((ref) => ref.sourceKind === "raw_reference"), true);
}

function testLuaExactLookupCanGroundVectorType(): void {
  const refs = lookupDota2HostSymbolsExact(process.cwd(), ["Vector"], { targetProfile: "lua_ability" });
  assert.ok(refs.some((ref) => ref.symbol === "Vector" || ref.title === "Vector"));
}

function testPanoramaExactLookupCanGroundStructuredIntrinsicTags(): void {
  const refs = lookupDota2HostSymbolsExact(
    process.cwd(),
    ["Panel", "Label", "TextButton", "Image"],
    { targetProfile: "panorama_tsx" },
  );
  const symbols = new Set(refs.map((ref) => ref.symbol || ref.title));

  assert.equal(symbols.has("Panel"), true);
  assert.equal(symbols.has("Label"), true);
  assert.equal(symbols.has("TextButton"), true);
  assert.equal(symbols.has("Image"), true);
}

async function runTests() {
  testWizardCorpusPlanExcludesRawReference();
  testSynthesisCorpusPlanIncludesRegistryBackedRawReference();
  testLuaExactLookupCanGroundVectorType();
  testPanoramaExactLookupCanGroundStructuredIntrinsicTags();
  await testWizardBundleStaysOffRawReferenceTier();
  await testSynthesisBundleCanUseRawReferenceTier();
  console.log("core/retrieval/dota2-bundles.test.ts passed");
}

runTests();

import assert from "node:assert/strict";

import {
  TALENT_DRAW_CANONICAL_FEATURE_ID,
  TALENT_DRAW_CANONICAL_CREATE_PROMPT,
  TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT,
  TALENT_DRAW_CANONICAL_UPDATE_PROMPT,
  analyzeTalentDrawPrompt,
  isCanonicalTalentDrawPrompt,
  mergeCanonicalTalentDrawParameters,
  resolveCanonicalTalentDrawFeatureId,
} from "./talent-draw.js";

function testCanonicalCreatePromptStaysInsideBaseContract(): void {
  const analysis = analyzeTalentDrawPrompt(TALENT_DRAW_CANONICAL_CREATE_PROMPT);
  const params = mergeCanonicalTalentDrawParameters(TALENT_DRAW_CANONICAL_CREATE_PROMPT, {});

  assert.equal(analysis.isCanonicalBasePrompt, true);
  assert.equal(analysis.inventoryMode, "none");
  assert.equal(params.triggerKey, "F4");
  assert.equal(params.choiceCount, 3);
  assert.equal(params.selectionPolicy, "single");
  assert.equal(params.applyMode, "immediate");
  assert.equal(params.inventory, undefined);
}

function testCanonicalUpdatePromptAddsFrozenInventoryContract(): void {
  const analysis = analyzeTalentDrawPrompt(TALENT_DRAW_CANONICAL_UPDATE_PROMPT);
  const params = mergeCanonicalTalentDrawParameters(TALENT_DRAW_CANONICAL_UPDATE_PROMPT, {});

  assert.equal(analysis.isCanonicalBasePrompt, true);
  assert.equal(analysis.inventoryMode, "supported");
  assert.deepEqual(params.inventory, {
    enabled: true,
    capacity: 15,
    storeSelectedItems: true,
    blockDrawWhenFull: true,
    fullMessage: "Talent inventory full",
    presentation: "persistent_panel",
  });
  assert.equal(params.triggerKey, "F4");
  assert.equal(params.choiceCount, 3);
}

function testUnsupportedInventoryPromptHonestBlocks(): void {
  const prompt =
    '给现有天赋抽取功能增加一个可拖拽库存界面，支持 F5 打开、重排、删除和跨局保存。';
  const analysis = analyzeTalentDrawPrompt(prompt);

  assert.equal(analysis.inventoryMode, "unsupported");
  assert.equal(analysis.unsupportedReasons.length > 0, true);
  assert.equal(
    analysis.unsupportedReasons.some((reason) => reason.includes("drag/drop")),
    true,
  );
  assert.equal(
    analysis.unsupportedReasons.some((reason) => reason.includes("second inventory toggle trigger")),
    true,
  );
  assert.equal(
    analysis.unsupportedReasons.some((reason) => reason.includes("session-only")),
    true,
  );
}

function testCanonicalFeatureIdResolverOnlyMatchesExactFrozenPrompts(): void {
  assert.equal(
    resolveCanonicalTalentDrawFeatureId(TALENT_DRAW_CANONICAL_CREATE_PROMPT),
    TALENT_DRAW_CANONICAL_FEATURE_ID,
  );
  assert.equal(
    resolveCanonicalTalentDrawFeatureId(`\n${TALENT_DRAW_CANONICAL_UPDATE_PROMPT}\n`),
    TALENT_DRAW_CANONICAL_FEATURE_ID,
  );
  assert.equal(
    resolveCanonicalTalentDrawFeatureId(TALENT_DRAW_CANONICAL_SOURCE_UPDATE_PROMPT),
    TALENT_DRAW_CANONICAL_FEATURE_ID,
  );

  const nearCanonicalPrompt =
    "做一个按 F4 触发的三选一天赋系统，显示卡牌 UI，选择 1 个后立即应用效果，并且已选择的天赋后续不再出现。";
  assert.equal(isCanonicalTalentDrawPrompt(nearCanonicalPrompt), true);
  assert.equal(resolveCanonicalTalentDrawFeatureId(nearCanonicalPrompt), undefined);
}

function runTests(): void {
  testCanonicalCreatePromptStaysInsideBaseContract();
  testCanonicalUpdatePromptAddsFrozenInventoryContract();
  testUnsupportedInventoryPromptHonestBlocks();
  testCanonicalFeatureIdResolverOnlyMatchesExactFrozenPrompts();
  console.log("adapters/dota2/cases/talent-draw.test.ts: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };

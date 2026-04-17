import assert from "node:assert/strict";

import {
  EQUIPMENT_DRAW_EXAMPLE_CREATE_PROMPT,
  TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
  TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
} from "./examples.js";
import { resolveSelectionPoolFamily } from "./index.js";

function testCanonicalCreateSeedsSelectionPoolAuthoring(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.blocked, false);
  assert.equal(resolution.proposal?.profile, "selection_pool");
  assert.equal(resolution.proposal?.objectKind, "talent");
  assert.equal(resolution.proposal?.parameters.triggerKey, "F4");
  assert.equal(resolution.proposal?.parameters.choiceCount, 3);
  assert.equal(resolution.proposal?.parameters.objects.length, 6);
}

function testCanonicalUpdateExpandsPoolToTwenty(): void {
  const existingResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "create",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  const updateResolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_EXAMPLE_SOURCE_UPDATE_PROMPT,
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "talent_draw_demo",
    existingFeature: {
      featureId: "talent_draw_demo",
      intentKind: "standalone-system",
      status: "active",
      revision: 1,
      blueprintId: "bp",
      selectedPatterns: [],
      generatedFiles: [],
      entryBindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featureAuthoring: {
        mode: "source-backed",
        profile: "selection_pool",
        objectKind: "talent",
        parameters: existingResolution.proposal!.parameters,
        parameterSurface: existingResolution.proposal!.parameterSurface,
      },
    },
    proposalSource: "existing-feature",
  });

  assert.equal(updateResolution.blocked, false);
  assert.equal(updateResolution.proposal?.parameters.triggerKey, "F4");
  assert.equal(updateResolution.proposal?.parameters.objects.length, 20);
  assert.deepEqual(
    updateResolution.proposal?.parameters.objects.slice(0, 6),
    existingResolution.proposal?.parameters.objects,
  );
  assert.ok(updateResolution.proposal?.parameters.objects.some((item) => item.id === "R003"));
  assert.ok(updateResolution.proposal?.parameters.objects.some((item) => item.id === "SR006"));
  assert.equal(updateResolution.proposal?.parameters.objects.at(-1)?.id, "UR002");
}

function testSiblingEquipmentPromptUsesSameFamily(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: EQUIPMENT_DRAW_EXAMPLE_CREATE_PROMPT,
    hostRoot: "D:\\test4",
    mode: "create",
    featureId: "equipment_draw_demo",
    proposalSource: "fallback",
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.blocked, false);
  assert.equal(resolution.proposal?.profile, "selection_pool");
  assert.equal(resolution.proposal?.objectKind, "equipment");
  assert.ok(resolution.proposal?.parameters.objects.every((item) => item.id.startsWith("EQ_")));
}

function testUnsupportedContractEscapeHonestBlocks(): void {
  const resolution = resolveSelectionPoolFamily({
    prompt: "给这个抽取系统再加第二个触发键，并且支持跨局保存与授予另一个技能 feature。",
    hostRoot: "D:\\test3",
    mode: "update",
    featureId: "talent_draw_demo",
    proposalSource: "fallback",
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.blocked, true);
  assert.ok(
    resolution.reasons.some((reason) => reason.includes("one trigger owner")) ||
      resolution.reasons.some((reason) => reason.includes("cross-feature grants")),
  );
}

testCanonicalCreateSeedsSelectionPoolAuthoring();
testCanonicalUpdateExpandsPoolToTwenty();
testSiblingEquipmentPromptUsesSameFamily();
testUnsupportedContractEscapeHonestBlocks();

console.log("adapters/dota2/families/selection-pool/authoring.test.ts passed");

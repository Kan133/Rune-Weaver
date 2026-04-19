import assert from "node:assert/strict";

import {
  detectMustNotAddViolations,
  extractPromptConstraints,
} from "./prompt-constraints.js";

function testExtractPromptConstraintsPreservesNegativeRequirements() {
  const bundle = extractPromptConstraints({
    rawText: "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离。",
  });

  assert.equal(bundle.exactScalars.triggerKey, "Q");
  assert.equal(bundle.exactScalars.uiRequired, false);
  assert.equal(bundle.exactScalars.persistent, false);
  assert.ok(bundle.mustNotAdd.some((item) => item.includes("Do not add UI")));
  assert.ok(bundle.mustNotAdd.some((item) => item.includes("Do not add inventory")));
  assert.ok(bundle.mustNotAdd.some((item) => item.includes("Do not add persistence")));
  assert.equal(
    bundle.openSemanticGaps.some((item) => item.includes("Persistence is requested")),
    false,
  );
}

function testExtractPromptConstraintsStillFlagsPositivePersistenceGap() {
  const bundle = extractPromptConstraints({
    rawText: "After drawing one option, persist it across matches.",
  });

  assert.equal(
    bundle.openSemanticGaps.some((item) => item.includes("Persistence is requested")),
    true,
  );
}

function testDetectMustNotAddViolationsFindsUiPersistenceAndCrossFeatureLeakage() {
  const bundle = extractPromptConstraints({
    rawText: "做一个主动技能，不要UI，不要persistence，不要cross-feature。",
  });

  const violations = detectMustNotAddViolations(
    [
      "<Panel>",
      "CustomNetTables:SetTableValue('rw', 'save', {})",
      "grant another feature to the player",
    ].join("\n"),
    bundle,
  );

  assert.ok(violations.some((item) => item.includes("UI-facing content")));
  assert.ok(violations.some((item) => item.includes("persistence/storage semantics")));
  assert.ok(violations.some((item) => item.includes("cross-feature coupling")));
}

function runTests() {
  testExtractPromptConstraintsPreservesNegativeRequirements();
  testExtractPromptConstraintsStillFlagsPositivePersistenceGap();
  testDetectMustNotAddViolationsFindsUiPersistenceAndCrossFeatureLeakage();
  console.log("core/llm/prompt-constraints.test.ts passed");
}

runTests();

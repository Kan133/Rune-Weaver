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

function testRuntimePersistenceDoesNotCreateExternalStorageGap() {
  const bundle = extractPromptConstraints({
    rawText: "Keep this shell persistent during the current match only.",
  });

  assert.equal(
    bundle.openSemanticGaps.some((item) => item.includes("Persistence is requested")),
    false,
  );
}

function testExternalPersistenceStillFlagsStorageGap() {
  const bundle = extractPromptConstraints({
    rawText: "After drawing one option, save it across matches.",
  });

  assert.equal(
    bundle.openSemanticGaps.some((item) => item.includes("Persistence is requested")),
    true,
  );
}

function testNamedExternalBoundaryDoesNotCreateStorageGap() {
  const bundle = extractPromptConstraints({
    rawText: "After drawing one option, save it across matches in profile storage.",
  });

  assert.equal(
    bundle.openSemanticGaps.some((item) => item.includes("Persistence is requested")),
    false,
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

function testExtractPromptConstraintsPrefersExplicitTriggerRebindTarget() {
  const bundle = extractPromptConstraints({
    rawText: "Change the trigger key from F5 to F7 and keep everything else the same.",
    currentFeatureContext: {
      featureId: "standalone_system_kmme",
      revision: 1,
      intentKind: "standalone-system",
      selectedPatterns: ["input.key_binding"],
      sourceBacked: false,
      preservedModuleBackbone: ["gameplay-core"],
      preservedInvariants: [],
      boundedFields: {
        triggerKey: "F5",
      },
    },
  });

  assert.equal(bundle.exactScalars.triggerKey, "F7");
}

function testExtractPromptConstraintsPrefersChineseTriggerRebindTarget() {
  const bundle = extractPromptConstraints({
    rawText: "把当前抽取系统的触发键从 F6 改成 F8，其他机制保持不变。",
  });

  assert.equal(bundle.exactScalars.triggerKey, "F8");
}

function runTests() {
  testExtractPromptConstraintsPreservesNegativeRequirements();
  testRuntimePersistenceDoesNotCreateExternalStorageGap();
  testExternalPersistenceStillFlagsStorageGap();
  testNamedExternalBoundaryDoesNotCreateStorageGap();
  testDetectMustNotAddViolationsFindsUiPersistenceAndCrossFeatureLeakage();
  testExtractPromptConstraintsPrefersExplicitTriggerRebindTarget();
  testExtractPromptConstraintsPrefersChineseTriggerRebindTarget();
  console.log("core/llm/prompt-constraints.test.ts passed");
}

runTests();

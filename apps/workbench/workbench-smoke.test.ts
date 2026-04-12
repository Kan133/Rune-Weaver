import { detectSharedIntegrationPointConflict } from "./conflict-detection.js";
import { generateFeatureReview } from "./feature-review.js";
import { collectUIIntake, detectMissingKeyParams, detectUIRequirements, extractKnownInputs } from "./request-analysis.js";
import type {
  ClarificationResult,
  ConflictCheckResult,
  FeatureOwnership,
  IntegrationPointRegistry,
  KnownInputs,
  UIDetectionResult,
} from "./types.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function testExtractKnownInputs(): void {
  const result = extractKnownInputs("做一个按Q键触发、400距离、8秒冷却的冲刺技能");

  assert(result.trigger === "Q", "should detect trigger key");
  assert(result.range === "400", "should detect range");
  assert(result.duration === "8", "should detect duration");
  assert(result.abilityType === "dash", "should detect dash ability type");
}

function testDetectUIRequirementsAndIntake(): void {
  const detection = detectUIRequirements("做一个 F4 触发的三选一天赋选择弹窗");
  const intake = collectUIIntake("做一个 F4 触发的三选一天赋选择弹窗", detection);

  assert(detection.uiNeeded, "should detect UI requirement");
  assert(detection.uiBranchRecommended, "should recommend UI branch for selection flow");
  assert(intake.surfaceType === "modal", "should infer modal surface");
  assert(intake.infoDensity === "medium", "should infer medium info density for choice-only flow");
}

function testConflictDetection(): void {
  const integrationPoints: IntegrationPointRegistry = {
    featureId: "feat_new_dash",
    points: [
      { id: "p1", key: "ability_slot:q", kind: "ability_slot", source: "test", reason: "bind hotkey" },
    ],
  };

  const workspace = {
    features: [
      {
        featureId: "feat_existing_dash",
        featureName: "Existing Dash",
        status: "active",
        identity: {
          primaryPatternId: "effect.dash",
          intentKind: "micro-feature",
        },
        integration: {
          primaryIntegrationPoints: ["ability_slot"],
        },
      },
    ],
  };

  const result = detectSharedIntegrationPointConflict("feat_new_dash", "New Dash", integrationPoints, workspace as any);

  assert(result.hasConflict, "should detect shared integration conflict");
  assert(result.status === "blocked", "ability_slot conflict should block");
  assert(result.conflicts[0]?.conflictingPoint === "ability_slot", "should report the conflicting point");
}

function testGenerateFeatureReview(): void {
  const featureOwnership: FeatureOwnership = {
    featureId: "feat_dash_001",
    expectedSurfaces: ["ability", "kv", "lua"],
    impactAreas: ["gameplay", "ability_system"],
    confidence: "high",
    isComplete: true,
  };
  const integrationPoints: IntegrationPointRegistry = {
    featureId: "feat_dash_001",
    points: [
      { id: "p1", key: "ability_slot:q", kind: "ability_slot", source: "wizard", reason: "bind hotkey" },
      { id: "p2", key: "event_hook:cast", kind: "event_hook", source: "wizard", reason: "cast event" },
    ],
    confidence: "high",
  };
  const conflictResult: ConflictCheckResult = {
    featureId: "feat_dash_001",
    hasConflict: false,
    conflicts: [],
    status: "safe",
    recommendedAction: "proceed",
    summary: "No conflicts.",
  };
  const clarification: ClarificationResult = {
    hasMissingKeyParams: false,
    missingParams: [],
    suggestions: [],
  };
  const uiDetection: UIDetectionResult = {
    uiNeeded: true,
    detectedUITriggers: ["selection"],
    uiBranchRecommended: true,
  };
  const knownInputs: KnownInputs = extractKnownInputs("做一个 F4 触发的三选一冲刺强化弹窗");

  const review = generateFeatureReview(
    "feat_dash_001",
    featureOwnership,
    integrationPoints,
    conflictResult,
    "做一个 F4 触发的三选一冲刺强化弹窗",
    {
      request: { goal: "提供一个三选一强化选择流程" },
      requirements: { functional: ["打开弹窗", "提供三个选项", "应用选中强化"] },
    },
    [],
    clarification,
    uiDetection,
    {
      entered: true,
      surfaceType: "modal",
      interactionLevel: "low",
      infoDensity: "medium",
      missingInfo: [],
      canProceed: true,
    },
    knownInputs,
  );

  assert(review.canProceed, "review should be allowed to proceed");
  assert(review.nextStep.action === "proceed", "review should recommend proceed");
  assert(review.uiNeeds?.needed, "review should retain UI needs");
  assert(review.integrationPoints.count === 2, "review should summarize integration points");
}

export function runTests(): boolean {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "extract known inputs", fn: testExtractKnownInputs },
    { name: "detect ui requirements and intake", fn: testDetectUIRequirementsAndIntake },
    { name: "detect shared integration conflicts", fn: testConflictDetection },
    { name: "generate feature review", fn: testGenerateFeatureReview },
  ];

  let passed = 0;
  let failed = 0;

  console.log("Running Workbench Smoke Tests...\n");

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
      passed += 1;
    } catch (error) {
      console.log(`FAIL ${test.name}`);
      console.log(error instanceof Error ? error.message : error);
      failed += 1;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

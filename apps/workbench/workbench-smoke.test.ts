import { detectSharedIntegrationPointConflict } from "./conflict-detection.js";
import { generateFeatureReview } from "./feature-review.js";
import { collectUIIntake, detectMissingKeyParams, detectUIRequirements, extractKnownInputs } from "./request-analysis.js";
import {
  TALENT_DRAW_CANONICAL_BOUNDARY,
  TALENT_DRAW_CANONICAL_PROMPT,
  buildCanonicalGapFillGuidance,
  deriveCanonicalAcceptanceStatus,
  deriveGapFillContinuationState,
  isTalentDrawCanonicalGapFill,
} from "../workbench-ui/src/lib/gapFillCanonical.js";
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
  assert(review.nextStep.command?.includes("npm run cli -- dota2 run"), "review should surface an executable next-step command");
  assert(review.uiNeeds?.needed, "review should retain UI needs");
  assert(review.integrationPoints.count === 2, "review should summarize integration points");
}

function testCanonicalGapFillContract(): void {
  assert(
    TALENT_DRAW_CANONICAL_BOUNDARY === "selection_flow.effect_mapping",
    "canonical boundary should stay frozen",
  );
  assert(
    TALENT_DRAW_CANONICAL_PROMPT.includes("R / SR / SSR / UR"),
    "canonical prompt should stay frozen",
  );
  assert(
    isTalentDrawCanonicalGapFill(TALENT_DRAW_CANONICAL_BOUNDARY, TALENT_DRAW_CANONICAL_PROMPT),
    "canonical helper should recognize the frozen prompt/boundary pair",
  );
  assert(
    !isTalentDrawCanonicalGapFill("weighted_pool.selection_policy", TALENT_DRAW_CANONICAL_PROMPT),
    "non-canonical boundary should not be treated as canonical acceptance evidence",
  );
}

function testCanonicalGuidanceAndContinuation(): void {
  const reviewGuidance = buildCanonicalGapFillGuidance({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "ready_to_apply",
    validationSucceeded: false,
    hostReady: false,
  });
  assert(reviewGuidance.classification === "canonical", "canonical guidance should classify frozen input as canonical");
  assert(reviewGuidance.nextStep.includes("应用补丁"), "canonical guidance should point to apply+validate before continuation");

  const exploratoryGuidance = buildCanonicalGapFillGuidance({
    boundaryId: "weighted_pool.selection_policy",
    instruction: "改一下权重池逻辑",
  });
  assert(exploratoryGuidance.classification === "exploratory", "non-frozen input should remain exploratory");

  const preValidation = deriveGapFillContinuationState({
    status: "ready_to_apply",
    validationSucceeded: false,
    hostReady: true,
  });
  assert(!preValidation.showContinuationRail, "continuation rail should stay hidden before validate succeeds");

  const hostBlocked = deriveGapFillContinuationState({
    status: "ready_to_apply",
    validationSucceeded: true,
    hostReady: false,
  });
  assert(hostBlocked.showContinuationRail, "continuation rail should appear after apply+validate");
  assert(!hostBlocked.canLaunchHost, "launch should stay blocked when host is not ready");

  const readyToLaunch = deriveGapFillContinuationState({
    status: "ready_to_apply",
    validationSucceeded: true,
    hostReady: true,
  });
  assert(readyToLaunch.canLaunchHost, "launch should only unlock after validate succeeds and host is ready");

  const exploratoryAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: "weighted_pool.selection_policy",
    instruction: "改一下权重池逻辑",
    status: "ready_to_apply",
  });
  assert(exploratoryAcceptance.classification === "exploratory", "non-canonical input should stay exploratory");

  const incompleteAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "ready_to_apply",
    validationSucceeded: false,
    hostReady: true,
    continuationVisible: false,
  });
  assert(
    incompleteAcceptance.classification === "canonical_but_incomplete",
    "canonical input without validate success should remain incomplete",
  );

  const readyAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "ready_to_apply",
    validationSucceeded: true,
    hostReady: true,
    continuationVisible: true,
  });
  assert(
    readyAcceptance.classification === "canonical_acceptance_ready",
    "canonical input with validate success and continuation should be acceptance ready",
  );
}

export function runTests(): boolean {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "extract known inputs", fn: testExtractKnownInputs },
    { name: "detect ui requirements and intake", fn: testDetectUIRequirementsAndIntake },
    { name: "detect shared integration conflicts", fn: testConflictDetection },
    { name: "generate feature review", fn: testGenerateFeatureReview },
    { name: "canonical gap-fill contract", fn: testCanonicalGapFillContract },
    { name: "canonical guidance and continuation", fn: testCanonicalGuidanceAndContinuation },
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

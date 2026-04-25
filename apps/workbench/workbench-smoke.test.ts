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
import { buildGapFillApprovalUnit } from "../workbench-ui/src/lib/gapFillApprovalUnit.js";
import { normalizeFeatureDisplay } from "../workbench-ui/src/lib/normalizeFeatureDisplay.js";
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
    TALENT_DRAW_CANONICAL_BOUNDARY === "selection_outcome.realization",
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

function testGapFillApprovalUnitStates(): void {
  const canonicalNeedsConfirmationGuidance = buildCanonicalGapFillGuidance({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "needs_confirmation",
    approvalFile: "tmp/approval.json",
  });
  const canonicalNeedsConfirmationAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "needs_confirmation",
  });
  const needsConfirmationUnit = buildGapFillApprovalUnit({
    review: {
      title: "review",
      summary: "summary",
      status: "warning",
      stages: [],
      blockers: [],
      highlights: [],
      recommendedActions: [],
      generatedFiles: ["game/scripts/src/rune_weaver/talent_draw.ts"],
      gapFillStatus: "needs_confirmation",
    },
    decisionRecord: {
      originalInstruction: TALENT_DRAW_CANONICAL_PROMPT,
      selectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      selectedBoundaryLabel: "Talent Draw Effect Mapping",
      assumptionsMade: ["Keep bridge unchanged."],
      userInputsUsed: [TALENT_DRAW_CANONICAL_PROMPT],
      inferredInputsUsed: [],
      decision: "require_confirmation",
      failureCategories: ["approval_required"],
      exactNextStep: "先确认审批单元，再应用补丁。",
    },
    readiness: {
      hostReady: true,
      workspaceConsistent: true,
      blockingItems: [],
      advisoryItems: [],
    },
    guidance: canonicalNeedsConfirmationGuidance,
    acceptance: canonicalNeedsConfirmationAcceptance,
    effectiveBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
  });
  assert(needsConfirmationUnit.classificationTone === "canonical", "needs_confirmation unit should remain canonical when frozen input matches");
  assert(needsConfirmationUnit.verdictLabel === "需要确认", "needs_confirmation unit should surface confirmation verdict");
  assert(needsConfirmationUnit.targetFile?.includes("talent_draw.ts"), "approval unit should surface target file from generated files");

  const readyGuidance = buildCanonicalGapFillGuidance({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "ready_to_apply",
    validationSucceeded: true,
    hostReady: true,
  });
  const readyAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "ready_to_apply",
    validationSucceeded: true,
    hostReady: true,
    continuationVisible: true,
  });
  const readyUnit = buildGapFillApprovalUnit({
    review: {
      title: "review",
      summary: "summary",
      status: "success",
      stages: [],
      blockers: [],
      highlights: [],
      recommendedActions: [],
      generatedFiles: ["game/scripts/src/rune_weaver/talent_draw.ts"],
      gapFillStatus: "ready_to_apply",
    },
    decisionRecord: {
      originalInstruction: TALENT_DRAW_CANONICAL_PROMPT,
      selectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      assumptionsMade: [],
      userInputsUsed: [TALENT_DRAW_CANONICAL_PROMPT],
      inferredInputsUsed: [],
      decision: "auto_apply",
      failureCategories: [],
      exactNextStep: "先应用补丁，再执行校验结果。",
    },
    readiness: {
      hostReady: true,
      workspaceConsistent: true,
      blockingItems: [],
      advisoryItems: [],
    },
    guidance: readyGuidance,
    acceptance: readyAcceptance,
    effectiveBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
  });
  assert(readyUnit.verdictLabel === "允许应用", "ready canonical unit should show apply-allowed verdict");
  assert(readyUnit.rationale.includes("repair-build"), "acceptance-ready unit should point to downstream CLI continuation");

  const policyGuidance = buildCanonicalGapFillGuidance({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "blocked_by_policy",
  });
  const policyAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "blocked_by_policy",
  });
  const policyUnit = buildGapFillApprovalUnit({
    review: {
      title: "review",
      summary: "summary",
      status: "failure",
      stages: [],
      blockers: [],
      highlights: [],
      recommendedActions: [],
      gapFillStatus: "blocked_by_policy",
    },
    decisionRecord: {
      originalInstruction: TALENT_DRAW_CANONICAL_PROMPT,
      selectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      assumptionsMade: [],
      userInputsUsed: [TALENT_DRAW_CANONICAL_PROMPT],
      inferredInputsUsed: [],
      decision: "reject",
      failureCategories: ["policy_reject"],
    },
    readiness: {
      hostReady: true,
      workspaceConsistent: true,
      blockingItems: [],
      advisoryItems: [],
    },
    guidance: policyGuidance,
    acceptance: policyAcceptance,
    effectiveBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
  });
  assert(policyUnit.verdictLabel === "策略阻塞", "policy-blocked unit should surface policy block verdict");
  assert(policyUnit.blockedReason?.includes("受保护结构"), "policy-blocked unit should explain protected-structure reason");

  const hostGuidance = buildCanonicalGapFillGuidance({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "blocked_by_host",
  });
  const hostAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: TALENT_DRAW_CANONICAL_BOUNDARY,
    instruction: TALENT_DRAW_CANONICAL_PROMPT,
    status: "blocked_by_host",
  });
  const hostUnit = buildGapFillApprovalUnit({
    review: {
      title: "review",
      summary: "summary",
      status: "warning",
      stages: [],
      blockers: [],
      highlights: [],
      recommendedActions: [],
      gapFillStatus: "blocked_by_host",
    },
    decisionRecord: {
      originalInstruction: TALENT_DRAW_CANONICAL_PROMPT,
      selectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
      assumptionsMade: [],
      userInputsUsed: [TALENT_DRAW_CANONICAL_PROMPT],
      inferredInputsUsed: [],
      decision: "auto_apply",
      failureCategories: ["host_readiness"],
    },
    readiness: {
      hostReady: false,
      workspaceConsistent: true,
      blockingItems: ["先补齐宿主构建产物。"],
      advisoryItems: [],
    },
    guidance: hostGuidance,
    acceptance: hostAcceptance,
    effectiveBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
  });
  assert(hostUnit.verdictLabel === "宿主阻塞", "host-blocked unit should surface host block verdict");
  assert(hostUnit.blockedItems[0] === "先补齐宿主构建产物。", "host-blocked unit should preserve blocking items");

  const exploratoryGuidance = buildCanonicalGapFillGuidance({
    boundaryId: "weighted_pool.selection_policy",
    instruction: "改一下权重池逻辑",
    status: "ready_to_apply",
  });
  const exploratoryAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: "weighted_pool.selection_policy",
    instruction: "改一下权重池逻辑",
    status: "ready_to_apply",
  });
  const exploratoryUnit = buildGapFillApprovalUnit({
    review: {
      title: "review",
      summary: "summary",
      status: "warning",
      stages: [],
      blockers: [],
      highlights: [],
      recommendedActions: [],
      gapFillStatus: "ready_to_apply",
    },
    decisionRecord: {
      originalInstruction: "改一下权重池逻辑",
      selectedBoundary: "weighted_pool.selection_policy",
      assumptionsMade: [],
      userInputsUsed: ["改一下权重池逻辑"],
      inferredInputsUsed: [],
      decision: "auto_apply",
      failureCategories: [],
    },
    readiness: {
      hostReady: true,
      workspaceConsistent: true,
      blockingItems: [],
      advisoryItems: [],
    },
    guidance: exploratoryGuidance,
    acceptance: exploratoryAcceptance,
    effectiveBoundary: "weighted_pool.selection_policy",
  });
  assert(exploratoryUnit.classificationTone === "exploratory", "exploratory unit should remain visually exploratory");
  assert(exploratoryUnit.evidenceLabel.includes("not acceptance-equivalent"), "exploratory unit should stay explicitly non-acceptance");
}

function testNormalizeFeatureDisplay(): void {
  const emptyNormalized = normalizeFeatureDisplay(null);
  assert(emptyNormalized === null, "normalizer should return null for the empty-state feature slot");

  const normalized = normalizeFeatureDisplay({
    id: "feature_partial",
    displayName: "Partial Feature",
    systemId: "feature_partial",
    group: "skill",
    parentId: null,
    status: "draft",
    revision: Number.NaN,
    updatedAt: "invalid-date" as unknown as Date,
    reviewSignals: {
      proposalStatus: {
        ready: false,
        percentage: 40,
        message: "partial",
      },
    },
  } as any);

  assert(normalized !== null, "normalizer should return a display model for partial features");
  assert(normalized?.updatedAt === null, "invalid updatedAt should be downgraded instead of crashing the view");
  assert(normalized?.revision === 1, "invalid revision should fall back to v1");
  assert(Array.isArray(normalized?.childrenIds) && normalized?.childrenIds.length === 0, "missing childrenIds should normalize to an empty array");
  assert(normalized?.hostRealization.syncStatus === "pending", "missing host realization should fall back to pending");
  assert(normalized?.reviewSignals.gapFillSummary.autoFilled === 0, "missing nested review signals should fall back to zeroed values");
}

export function runTests(): boolean {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "extract known inputs", fn: testExtractKnownInputs },
    { name: "detect ui requirements and intake", fn: testDetectUIRequirementsAndIntake },
    { name: "detect shared integration conflicts", fn: testConflictDetection },
    { name: "generate feature review", fn: testGenerateFeatureReview },
    { name: "canonical gap-fill contract", fn: testCanonicalGapFillContract },
    { name: "canonical guidance and continuation", fn: testCanonicalGuidanceAndContinuation },
    { name: "gap-fill approval unit states", fn: testGapFillApprovalUnitStates },
    { name: "normalize feature display", fn: testNormalizeFeatureDisplay },
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

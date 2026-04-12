import type {
  ClarificationResult,
  ConflictCheckResult,
  ConflictSummary,
  FeatureOwnership,
  FeatureReview,
  IntegrationPointRegistry,
  IntegrationPointSummary,
  KnownInputs,
  NextStepRecommendation,
  OwnershipSummary,
  UIDetectionResult,
  UIIntakeResult,
  UINeedsResult,
} from "./types.js";

export function generateFeatureReview(
  featureIdentityId: string,
  featureOwnership: FeatureOwnership,
  integrationPoints: IntegrationPointRegistry,
  conflictResult: ConflictCheckResult,
  userRequest: string,
  schema: any,
  issues: any[],
  clarification: ClarificationResult,
  uiDetection: UIDetectionResult,
  uiIntake: UIIntakeResult | undefined,
  knownInputs: KnownInputs,
): FeatureReview {
  const featureSummary = schema?.request?.goal
    ? schema.request.goal
    : `Feature based on: "${userRequest.substring(0, 50)}..."`;

  const recognizedCapabilities: string[] = [];
  if (schema?.requirements?.functional?.length > 0) {
    recognizedCapabilities.push(...schema.requirements.functional.slice(0, 3));
  }

  const missingConfirmations: string[] = [];
  if (clarification.hasMissingKeyParams) {
    missingConfirmations.push(...clarification.suggestions);
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    for (const error of errors) {
      missingConfirmations.push(`Validation error: ${error.message}`);
    }
  }

  const ownershipSummary: OwnershipSummary = {
    expectedSurfaces: featureOwnership.expectedSurfaces,
    impactAreas: featureOwnership.impactAreas,
    confidence: featureOwnership.confidence,
  };

  const integrationPointSummary: IntegrationPointSummary = {
    points: [...new Set(integrationPoints.points.map((point) => point.kind))],
    count: integrationPoints.points.length,
    confidence: integrationPoints.confidence,
  };

  const conflictSummary: ConflictSummary = {
    hasConflict: conflictResult.hasConflict,
    conflictCount: conflictResult.conflicts.length,
    status: conflictResult.status,
    recommendedAction: conflictResult.recommendedAction,
    summary: conflictResult.summary,
  };

  let uiNeeds: UINeedsResult | undefined;
  if (uiDetection.uiNeeded || uiIntake) {
    uiNeeds = {
      needed: uiDetection.uiNeeded,
      surfaceType: uiIntake?.surfaceType,
      interactionLevel: uiIntake?.interactionLevel,
      infoDensity: uiIntake?.infoDensity,
      branchEntered: !!(uiIntake && uiIntake.entered),
    };
  }

  let nextStep: NextStepRecommendation;
  const baseCanProceed = !clarification.hasMissingKeyParams &&
    errors.length === 0 &&
    (!uiIntake || uiIntake.canProceed === true);

  const canProceed = baseCanProceed && conflictResult.status !== "blocked";

  if (conflictResult.status === "blocked") {
    nextStep = {
      action: "clarify",
      reason: conflictResult.summary,
    };
  } else if (canProceed) {
    nextStep = {
      action: "proceed",
      reason: "All required information is available. Ready for controlled planning flow.",
    };
  } else if (uiDetection.uiBranchRecommended && !uiIntake) {
    nextStep = {
      action: "ui_intake",
      reason: "UI requirements detected. UI Wizard branch should be entered for more info.",
    };
  } else {
    nextStep = {
      action: "clarify",
      reason: "Missing key parameters or validation issues need to be resolved.",
    };
  }

  return {
    featureIdentityId,
    featureOwnershipId: featureOwnership.featureId,
    integrationPointsId: integrationPoints.featureId,
    featureSummary,
    recognizedCapabilities,
    knownInputs,
    missingConfirmations,
    ownership: ownershipSummary,
    integrationPoints: integrationPointSummary,
    conflict: conflictSummary,
    uiNeeds,
    nextStep,
    canProceed,
  };
}

export function printFeatureReview(review: FeatureReview): void {
  console.log(`\n📋 Feature Identity: ${review.featureIdentityId}`);
  console.log("\n📋 Feature Summary:");
  console.log(`   ${review.featureSummary}`);

  console.log("\n✅ Recognized Capabilities:");
  if (review.recognizedCapabilities.length > 0) {
    for (const capability of review.recognizedCapabilities) {
      console.log(`   - ${capability}`);
    }
  } else {
    console.log("   (None explicitly recognized)");
  }

  console.log("\n📥 Known Inputs:");
  const inputLines = Object.entries(review.knownInputs)
    .map(([key, value]) => `   ${key}: ${value}`)
    .join("\n");
  console.log(inputLines || "   (None detected)");

  if (review.ownership) {
    console.log("\n🎯 Ownership Baseline:");
    console.log(`   Expected Surfaces: ${review.ownership.expectedSurfaces.join(", ")}`);
    console.log(`   Impact Areas: ${review.ownership.impactAreas.join(", ")}`);
    console.log(`   Confidence: ${review.ownership.confidence}`);
  }

  if (review.integrationPoints) {
    console.log("\n🔗 Integration Points - Baseline:");
    console.log(`   Total Points: ${review.integrationPoints.count}`);
    console.log(`   Point Kinds: ${review.integrationPoints.points.join(", ")}`);
    console.log(`   Confidence: ${review.integrationPoints.confidence}`);
  }

  if (review.conflict) {
    const icon = review.conflict.status === "safe" ? "✅" : review.conflict.status === "blocked" ? "🚫" : "⚠️";
    console.log(`\n${icon} Conflict Governance:`);
    console.log(`   Status: ${review.conflict.status.toUpperCase()}`);
    console.log(`   Has Conflict: ${review.conflict.hasConflict ? "Yes" : "No"}`);
    console.log(`   Recommended Action: ${review.conflict.recommendedAction.toUpperCase()}`);
    console.log(`   Summary: ${review.conflict.summary}`);
  }

  if (review.missingConfirmations.length > 0) {
    console.log("\n⚠️  Missing / Needs Confirmation:");
    for (const missing of review.missingConfirmations) {
      console.log(`   - ${missing}`);
    }
  }

  if (review.uiNeeds) {
    console.log("\n🎨 UI Requirements:");
    console.log(`   Needed: ${review.uiNeeds.needed ? "Yes" : "No"}`);
    if (review.uiNeeds.needed) {
      console.log(`   Surface Type: ${review.uiNeeds.surfaceType || "unknown"}`);
      console.log(`   Interaction: ${review.uiNeeds.interactionLevel || "unknown"}`);
      console.log(`   Branch Entered: ${review.uiNeeds.branchEntered ? "Yes" : "No"}`);
    }
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log("\n🔜 Next Step:");
  console.log(`   Action: ${review.nextStep.action.toUpperCase()}`);
  console.log(`   Reason: ${review.nextStep.reason}`);

  if (review.canProceed) {
    console.log("\n✅ Status: READY TO PROCEED");
  } else {
    console.log("\n⚠️  Status: NOT READY - Please address missing items above");
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log("NOTE: This is Feature Review with Ownership + Integration Point Baseline.");
  console.log("Full blueprint generation and code generation not yet in this flow.");
}

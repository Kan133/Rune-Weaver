import { printFeatureReview } from "./feature-review.js";
import { printBlueprintProposalReport } from "./proposal-report.js";
import { printWizardDegradation } from "./wizard-runner.js";
import type { WizardRunResult } from "./wizard-runner.js";
import {
  printActionRouteSection,
  printConfirmationSection,
  printFeatureCardSection,
  printFeatureDetailSection,
  printFeatureFocusSection,
  printFeatureRoutingSection,
  printGovernanceSection,
  printLifecycleSection,
  printUpdateHandlerSection,
  printUpdateHandoffSection,
  printUpdateWriteSection,
} from "./workflow-report.js";
import type {
  ActionRouteResult,
  BlueprintProposal,
  ConfirmationAction,
  ConflictCheckResult,
  FeatureCard,
  FeatureDetail,
  FeatureFocus,
  FeatureIdentity,
  FeatureOwnership,
  FeatureReview,
  FeatureRouting,
  GapFillResult,
  GovernanceRelease,
  IntakeSession,
  IntegrationPointRegistry,
  LifecycleActions,
  SceneReference,
  UIDetectionResult,
  UIIntakeResult,
  UpdateHandoff,
  UpdateHandler,
  UpdateWriteResult,
  WizardDegradationInfo,
  WorkbenchResult,
} from "./types.js";
import type { WorkbenchPersistenceReport } from "./workspace-persistence.js";

export function printWorkbenchHeader(userRequest: string): void {
  console.log("=".repeat(60));
  console.log("RUNE WEAVER - WORKBENCH (Phase 3 Week-1 Lifecycle Demo)");
  console.log("=".repeat(60));
  console.log(">>> Entry: User Request Received");
  console.log(`    "${userRequest.substring(0, 60)}${userRequest.length > 60 ? "..." : ""}"`);
}

export function printWorkbenchBaseline(context: {
  featureIdentity: FeatureIdentity;
  featureOwnership: FeatureOwnership;
  integrationPoints: IntegrationPointRegistry;
  conflictResult: ConflictCheckResult;
  session: IntakeSession;
}): void {
  const { featureIdentity, featureOwnership, integrationPoints, conflictResult, session } = context;

  console.log(`\n[Feature Identity]`);
  console.log(`   ID: ${featureIdentity.id}`);
  console.log(`   Label: ${featureIdentity.label}`);
  console.log(`   Host: ${featureIdentity.hostScope}`);
  console.log(`   Stage: ${featureIdentity.currentStage}`);

  console.log(`\n[Feature Ownership - Baseline]`);
  console.log(`   Expected Surfaces: ${featureOwnership.expectedSurfaces.join(", ")}`);
  console.log(`   Impact Areas: ${featureOwnership.impactAreas.join(", ")}`);
  console.log(`   Confidence: ${featureOwnership.confidence}`);
  console.log(`   Complete: ${featureOwnership.isComplete ? "Yes" : "Partial"}`);

  console.log(`\n[Integration Point Registry - Baseline]`);
  console.log(`   Total Points: ${integrationPoints.points.length}`);
  console.log(
    `   Point Kinds: ${[...new Set(integrationPoints.points.map((point) => point.kind))].join(", ")}`
  );
  console.log(`   Confidence: ${integrationPoints.confidence}`);

  console.log(`\n[Conflict Check - Integration Point]`);
  console.log(`   Has Conflict: ${conflictResult.hasConflict}`);
  console.log(`   Status: ${conflictResult.status}`);
  console.log(`   Recommended Action: ${conflictResult.recommendedAction}`);
  if (conflictResult.hasConflict) {
    console.log(`   Conflict Count: ${conflictResult.conflicts.length}`);
    for (const conflict of conflictResult.conflicts) {
      console.log(
        `   - ${conflict.conflictingPoint} (${conflict.severity}) vs ${conflict.existingFeatureLabel}`
      );
    }
  }

  console.log(`\n[Session] ID: ${session.id}`);
  console.log(`User Request: "${session.originalRequest ?? ""}"`);
  console.log(`Host Root: ${session.hostRoot ?? ""}`);
}

export function printWorkbenchWizardStart(): void {
  console.log("\n[Main Wizard] Analyzing request for missing key parameters...");
}

export function printWorkbenchUIDetection(
  uiDetection: UIDetectionResult,
  uiIntake?: UIIntakeResult,
): void {
  console.log(
    `[Main Wizard] UI need detection: ${uiDetection.uiNeeded ? "UI detected" : "No UI detected"}`
  );
  if (uiIntake) {
    console.log("\n[Main Wizard] Entering UI Wizard branch...");
    console.log(`[Main Wizard] UI intake surface type: ${uiIntake.surfaceType || "unknown"}`);
  }
}

export function printWorkbenchWizardDegradationReport(
  wizardResult: WizardRunResult["wizardResult"],
  wizardDegradation?: WizardDegradationInfo,
): void {
  printWizardDegradation(wizardResult, wizardDegradation);
}

export function printWorkbenchReviewReport(review: FeatureReview): void {
  console.log("\n" + "=".repeat(60));
  console.log("FEATURE REVIEW");
  console.log("=".repeat(60));
  printFeatureReview(review);
}

export function printWorkbenchBlueprintReport(context: {
  blueprintProposal: BlueprintProposal;
  gapFillResult: GapFillResult;
  sceneReferences: SceneReference[];
}): void {
  const { blueprintProposal, gapFillResult, sceneReferences } = context;
  console.log("\n" + "=".repeat(60));
  console.log("BLUEPRINT PROPOSAL (LLM)");
  console.log("=".repeat(60));
  printBlueprintProposalReport(blueprintProposal, gapFillResult, sceneReferences);
}

export function printWorkbenchSessionStatus(session: IntakeSession): void {
  console.log("\n" + "=".repeat(60));
  console.log("SESSION & IDENTITY STATUS");
  console.log("=".repeat(60));
  console.log(`Session ID: ${session.id}`);
  console.log(`Session Status: ${session.status}`);
  console.log(`Feature ID: ${session.featureIdentity.id}`);
  console.log(`Feature Stage: ${session.featureIdentity.currentStage}`);
}

export function printWorkbenchFeatureSections(
  featureCard: FeatureCard,
  featureDetail: FeatureDetail,
): void {
  printFeatureCardSection(featureCard);
  printFeatureDetailSection(featureDetail);
}

export function printWorkbenchActionFlow(context: {
  lifecycleActions: LifecycleActions;
  actionRoute: ActionRouteResult;
  featureRouting: FeatureRouting;
  featureFocus: FeatureFocus;
  updateHandoff: UpdateHandoff;
  updateHandler: UpdateHandler;
  governanceRelease: GovernanceRelease;
  confirmationAction: ConfirmationAction;
  updateWriteResult: UpdateWriteResult;
}): void {
  const {
    lifecycleActions,
    actionRoute,
    featureRouting,
    featureFocus,
    updateHandoff,
    updateHandler,
    governanceRelease,
    confirmationAction,
    updateWriteResult,
  } = context;

  printLifecycleSection(lifecycleActions);
  printActionRouteSection(actionRoute);
  printFeatureRoutingSection(featureRouting);
  printFeatureFocusSection(featureFocus);
  printUpdateHandoffSection(updateHandoff);
  printUpdateHandlerSection(updateHandler);
  printGovernanceSection(governanceRelease);
  printConfirmationSection(confirmationAction);
  printUpdateWriteSection(updateWriteResult);
}

export function printWorkbenchPersistenceReport(report: WorkbenchPersistenceReport): void {
  if (report.status === "workspace-unavailable") {
    console.log("\n⚠️  Workspace persistence skipped: workspace not available");
    return;
  }

  if (report.status === "feature-exists") {
    console.log(`\n⚠️  Feature '${report.featureId}' already exists in workspace - skipping persist`);
    return;
  }

  if (report.status === "failed") {
    console.log(`\n❌ Workspace persistence failed: ${report.error}`);
    return;
  }

  console.log("\n✅ Feature persisted to workspace");
  console.log(`   Feature ID: ${report.featureId}`);
  console.log(`   Blueprint ID: ${report.blueprintId}`);
  console.log(
    `   Selected Patterns: ${
      report.selectedPatterns.length > 0 ? report.selectedPatterns.join(", ") : "(none)"
    }`
  );
  console.log(`   Generated Files: ${report.generatedFiles.length} from plan`);
  if (report.generatedFiles.length > 0) {
    console.log(`     Files: ${report.generatedFiles.join(", ")}`);
  }
  console.log(
    `   Entry Bindings: ${
      report.entryBindings.length > 0 ? report.entryBindings.join(", ") : "(none)"
    }`
  );
}

export function printWorkbenchCompletionSummary(result: WorkbenchResult): void {
  console.log("\n[Workbench] Done.");
  if (result.featureIdentity) {
    console.log(`Feature ID: ${result.featureIdentity.id}`);
    console.log(`Feature Label: ${result.featureIdentity.label}`);
    console.log(`Feature Stage: ${result.featureIdentity.currentStage}`);
  }
  if (result.featureOwnership) {
    console.log(`Ownership Surfaces: ${result.featureOwnership.expectedSurfaces.join(", ")}`);
    console.log(`Ownership Impact: ${result.featureOwnership.impactAreas.join(", ")}`);
    console.log(`Ownership Confidence: ${result.featureOwnership.confidence}`);
  }
  if (result.integrationPoints) {
    console.log(`Integration Points: ${result.integrationPoints.points.length}`);
    console.log(
      `Point Kinds: ${[...new Set(result.integrationPoints.points.map((point) => point.kind))].join(", ")}`
    );
    console.log(`IP Confidence: ${result.integrationPoints.confidence}`);
  }
  if (result.session) {
    console.log(`Session ID: ${result.session.id}`);
    console.log(`Session Status: ${result.session.status}`);
  }
}

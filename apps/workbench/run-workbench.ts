import { createLLMClientFromEnv, isLLMConfigured } from "../../core/llm/factory.js";
import { type WizardIntentInput, type WizardIntentOptions } from "../../core/wizard/index.js";
import { loadWorkspace, workspaceExists } from "../../core/workspace/manager.js";
import {
  WORKBENCH_WIZARD_LLM_TEMPERATURE,
  WORKBENCH_WIZARD_PROVIDER_OPTIONS,
} from "./labels.js";
import {
  printWorkbenchActionFlow,
  printWorkbenchBaseline,
  printWorkbenchBlueprintReport,
  printWorkbenchFeatureSections,
  printWorkbenchHeader,
  printWorkbenchPersistenceReport,
  printWorkbenchReviewReport,
  printWorkbenchSessionStatus,
  printWorkbenchUIDetection,
  printWorkbenchWizardDegradationReport,
  printWorkbenchWizardStart,
} from "./console-reporting.js";
import {
  createActionRoute,
  createFeatureFocus,
  createFeatureRouting,
  createLifecycleActions,
  createUpdateHandoff,
} from "./routing.js";
import {
  createUpdateHandler,
  createUpdateWriteResult,
} from "./update.js";
import {
  createConfirmationAction,
  createGovernanceRelease,
} from "./governance.js";
import { detectSharedIntegrationPointConflict } from "./conflict-detection.js";
import { createFeatureCard, createFeatureDetail } from "./feature-presentation.js";
import { generateFeatureReview } from "./feature-review.js";
import { identifyGapsAndFillAsync } from "./gap-fill.js";
import {
  createFeatureIdentity,
  createFeatureOwnership,
  createIntegrationPointRegistry,
  generateSessionId,
} from "./intake-analysis.js";
import { generateBlueprintProposal } from "./proposal.js";
import {
  collectUIIntake,
  detectMissingKeyParams,
  detectUIRequirements,
  extractKnownInputs,
} from "./request-analysis.js";
import { detectSceneAnchors } from "./scene-anchors.js";
import { runWorkbenchWizard } from "./wizard-runner.js";
import type {
  IntakeSession,
  WorkbenchOptions,
  WorkbenchResult,
} from "./types.js";
import { persistWorkbenchFeature } from "./workspace-persistence.js";

const FORCE_UPDATE_WRITE =
  process.env.RW_FORCE_UPDATE_WRITE === "1" || process.env.RW_FORCE_UPDATE_WRITE === "true";

export async function runWorkbench(
  userRequest: string,
  options: WorkbenchOptions,
): Promise<WorkbenchResult> {
  printWorkbenchHeader(userRequest);

  const featureIdentity = createFeatureIdentity(userRequest, options.hostRoot);
  const featureOwnership = createFeatureOwnership(featureIdentity.id, userRequest, options.hostRoot);
  const integrationPoints = createIntegrationPointRegistry(
    featureIdentity.id,
    userRequest,
    options.hostRoot,
  );

  const workspaceResult = workspaceExists(options.hostRoot)
    ? loadWorkspace(options.hostRoot)
    : { success: false, workspace: null, issues: ["Workspace not found"] };
  const workspace = workspaceResult.success ? workspaceResult.workspace : null;

  const conflictResult = detectSharedIntegrationPointConflict(
    featureIdentity.id,
    featureIdentity.label,
    integrationPoints,
    workspace,
  );

  const session: IntakeSession = {
    id: generateSessionId(),
    originalRequest: userRequest,
    hostRoot: options.hostRoot,
    createdAt: new Date(),
    featureIdentity,
    featureOwnership,
    integrationPoints,
    status: "initialized",
  };

  printWorkbenchBaseline({
    featureIdentity,
    featureOwnership,
    integrationPoints,
    conflictResult,
    session,
  });

  if (!isLLMConfigured()) {
    session.status = "error";
    featureIdentity.currentStage = "error";
    return {
      success: false,
      session,
      featureIdentity,
      featureOwnership,
      integrationPoints,
      conflictResult,
      error: "LLM not configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
    };
  }

  const client = createLLMClientFromEnv(process.cwd());
  const clarification = detectMissingKeyParams(userRequest);
  const uiDetection = detectUIRequirements(userRequest);

  printWorkbenchWizardStart();

  let uiIntake;
  if (uiDetection.uiBranchRecommended) {
    uiIntake = collectUIIntake(userRequest, uiDetection);
    session.uiIntake = uiIntake;
    session.status = "ui_intake_completed";
  }

  printWorkbenchUIDetection(uiDetection, uiIntake);

  const wizardInput: WizardIntentInput = {
    rawText: userRequest,
    temperature: WORKBENCH_WIZARD_LLM_TEMPERATURE,
    providerOptions: WORKBENCH_WIZARD_PROVIDER_OPTIONS,
  };

  const wizardOptions: WizardIntentOptions = {
    client,
    input: wizardInput,
  };

  const { wizardResult, wizardDegradation } = await runWorkbenchWizard(
    userRequest,
    wizardOptions,
  );

  session.wizardResult = {
    schema: wizardResult.schema,
    issues: wizardResult.issues || [],
    valid: wizardResult.valid,
  };
  session.status = "wizard_completed";

  printWorkbenchWizardDegradationReport(wizardResult, wizardDegradation);

  const knownInputs = extractKnownInputs(userRequest);
  const review = generateFeatureReview(
    featureIdentity.id,
    featureOwnership,
    integrationPoints,
    conflictResult,
    userRequest,
    wizardResult.schema,
    wizardResult.issues || [],
    clarification,
    uiDetection,
    uiIntake,
    knownInputs,
    options.hostRoot,
  );

  session.review = review;

  if (review.canProceed) {
    session.status = "ready_to_proceed";
    featureIdentity.currentStage = "review";
  } else if (review.nextStep.action === "clarify") {
    session.status = "needs_clarification";
  } else {
    session.status = "review_completed";
  }

  printWorkbenchReviewReport(review);

  const blueprintProposal = await generateBlueprintProposal(
    featureIdentity.id,
    featureIdentity.label,
    userRequest,
    integrationPoints,
    featureOwnership,
    client,
  );
  const gapFillResult = await identifyGapsAndFillAsync(blueprintProposal, client);
  const sceneReferences = detectSceneAnchors(userRequest, "dota2");

  printWorkbenchBlueprintReport({
    blueprintProposal,
    gapFillResult,
    sceneReferences,
  });
  printWorkbenchSessionStatus(session);

  const featureCard = createFeatureCard(
    featureIdentity,
    featureOwnership,
    conflictResult,
    review,
  );
  const featureDetail = createFeatureDetail(
    featureCard,
    featureIdentity,
    featureOwnership,
    integrationPoints,
    conflictResult,
    knownInputs,
    clarification,
    review.nextStep,
  );

  printWorkbenchFeatureSections(featureCard, featureDetail);

  const lifecycleActions = createLifecycleActions(
    featureCard,
    featureDetail,
    conflictResult,
    options.hostRoot,
  );
  const actionRoute = createActionRoute(featureCard, lifecycleActions);
  const featureRouting = createFeatureRouting(
    userRequest,
    featureIdentity,
    lifecycleActions,
    options.hostRoot,
  );
  const featureFocus = createFeatureFocus(featureIdentity, lifecycleActions, featureRouting);
  const updateHandoff = createUpdateHandoff(featureFocus, featureRouting, lifecycleActions);

  const initialHandler = createUpdateHandler(
    updateHandoff,
    featureFocus,
    featureCard,
    conflictResult,
    featureOwnership,
    { forceValidation: FORCE_UPDATE_WRITE },
  );
  const initialGovernanceRelease = createGovernanceRelease(
    initialHandler,
    conflictResult,
    featureCard,
  );
  const confirmedItemIds = options.confirmedItemIds || [];
  const confirmationAction = createConfirmationAction(
    initialGovernanceRelease,
    confirmedItemIds,
  );
  const updateHandler = createUpdateHandler(
    updateHandoff,
    featureFocus,
    featureCard,
    conflictResult,
    featureOwnership,
    {
      forceValidation: FORCE_UPDATE_WRITE,
      confirmationAction,
    },
  );
  const governanceRelease =
    confirmationAction.transitionResult === "released_to_ready"
      ? {
          ...initialGovernanceRelease,
          status: "released" as const,
          blockedReason: null,
          releaseHint: "所有确认项已完成，已释放到就绪状态",
          canSelfRelease: true,
          requiredConfirmations: [],
          nextAllowedTransition: null,
        }
      : initialGovernanceRelease;
  const updateWriteResult = createUpdateWriteResult(
    updateHandler.updatePlan,
    updateHandler,
    conflictResult,
    { ...options, confirmationAction },
  );

  printWorkbenchActionFlow({
    lifecycleActions,
    actionRoute,
    featureRouting,
    featureFocus,
    updateHandoff,
    updateHandler,
    governanceRelease,
    confirmationAction,
    updateWriteResult,
  });

  if (options.write && wizardResult.valid) {
    const persistenceReport = persistWorkbenchFeature({
      hostRoot: options.hostRoot,
      featureId: featureIdentity.id,
      blueprintProposal,
      integrationPoints,
    });
    printWorkbenchPersistenceReport(persistenceReport);
  }

  return {
    success: wizardResult.valid,
    session,
    featureIdentity,
    featureOwnership,
    integrationPoints,
    conflictResult,
    featureCard,
    featureDetail,
    lifecycleActions,
    actionRoute,
    wizardDegradation,
    featureRouting,
    featureFocus,
    updateHandoff,
    updateHandler,
    updateWriteResult,
    governanceRelease,
    confirmationAction,
    gapFillResult,
    failureCorpus: {
      userRequest,
      proposalStatus: blueprintProposal.status,
      proposalSource: blueprintProposal.source,
      confidence: blueprintProposal.confidence,
      invalidPatternIds: blueprintProposal.invalidPatternIds || {},
      gapFillSummary: {
        identified: gapFillResult.identifiedGaps.length,
        filled: gapFillResult.filledGaps.length,
        unfilled: gapFillResult.unfilledGaps.length,
        categoryE: gapFillResult.categoryEGaps.length,
      },
      categoryESummary: gapFillResult.categoryESummary,
      degraded:
        wizardDegradation?.status !== undefined && wizardDegradation.status !== "none",
      fallback: blueprintProposal.source === "fallback",
    },
  };
}

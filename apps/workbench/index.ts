/**
 * Rune Weaver - Workbench Entry
 * 
 * Phase 2A + Phase 2B: Feature Identity + Ownership + Integration Point Baseline
 * 
 * This is a thin entry layer that reuses existing wizard service.
 * Not to be confused with full UI Workbench - this is just the product entry point.
 */

import { createLLMClientFromEnv, isLLMConfigured } from "../../core/llm/factory.js";
import type { LLMClient } from "../../core/llm/types.js";
import { runWizardToIntentSchema, WizardIntentInput, WizardIntentOptions } from "../../core/wizard/index.js";
import type { IntentSchema } from "../../core/schema/types.js";
import { loadWorkspace, findFeatureById, workspaceExists, getActiveFeatures, saveWorkspace, deleteFeature, addFeatureToWorkspace } from "../../core/workspace/manager.js";
import type { FeatureWriteResult, RuneWeaverFeatureRecord } from "../../core/workspace/types.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { createWritePlan, WritePlanEntry } from "../../adapters/dota2/assembler/index.js";
import { updateWorkspaceState } from "../cli/helpers/workspace-integration.js";
import type { Blueprint } from "../../core/schema/types.js";

import {
  WORKBENCH_LLM_TEMPERATURE,
  WORKBENCH_WIZARD_LLM_TEMPERATURE,
  WORKBENCH_WIZARD_PROVIDER_OPTIONS,
  LABELS,
  SECTIONS,
  PLAN_LABELS,
  WRITE_LABELS,
  GOVERNANCE_LABELS,
  CONFIRMATION_LABELS,
  p,
} from "./labels.js";

import {
  createFeatureRouting,
  createFeatureFocus,
  createUpdateHandoff,
  createLifecycleActions,
  createActionRoute,
} from "./routing.js";

import {
  createUpdateDryRunPlan,
  createBlockedDryRunPlan,
  createUpdateWriteResult,
  createUpdateHandler,
  executeActualUpdateWrite,
} from "./update.js";

import {
  createGovernanceRelease,
  createConfirmationAction,
} from "./governance.js";
import { detectSharedIntegrationPointConflict } from "./conflict-detection.js";
import { createFeatureCard, createFeatureDetail } from "./feature-presentation.js";
import { generateFeatureReview, printFeatureReview } from "./feature-review.js";
import { identifyGapsAndFill, identifyGapsAndFillAsync } from "./gap-fill.js";
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
import { printBlueprintProposalReport } from "./proposal-report.js";
import { detectSceneAnchors } from "./scene-anchors.js";
import { printWizardDegradation, runWorkbenchWizard } from "./wizard-runner.js";
import { runDelete, runInspect, runList } from "./workbench-commands.js";
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
  WorkbenchOptions,
  WorkbenchResult,
  FeatureCard,
  FeatureDetail,
  LifecycleActionKind,
  LifecycleAction,
  FeaturePersistenceState,
  LifecycleActions,
  ActionRouteStatus,
  ActionRoute,
  ActionRouteResult,
  FeatureRoutingDecision,
  FeatureRoutingCandidate,
  FeatureRouting,
  FeatureFocusType,
  FeatureFocus,
  UpdateHandoffStatus,
  UpdateHandoff,
  UpdateHandlerStatus,
  UpdateHandler,
  UpdatePlanStatus,
  UpdateOperationType,
  AffectedSurface,
  UpdateDryRunPlan,
  UpdateWriteStatus,
  UpdateWriteMode,
  TouchedOutput,
  UpdateWriteResult,
  GovernanceReleaseStatus,
  RequiredConfirmationItem,
  GovernanceRelease,
  ConfirmationActionStatus,
  ConfirmedItem,
  ConfirmationAction,
  FeatureIdentity,
  FeatureStage,
  FeatureOwnership,
  IntegrationPointRegistry,
  IntakeSession,
  WizardDegradationInfo,
  FeatureReview,
  KnownInputs,
  ClarificationResult,
  UIDetectionResult,
  UIIntakeResult,
  ConflictKind,
  ConflictCheckResult,
  BlueprintProposal,
  FailureCorpus,
  ActualWriteResult,
} from "./types.js";

export async function runWorkbench(
  userRequest: string,
  options: WorkbenchOptions
): Promise<WorkbenchResult> {
  console.log("=".repeat(60));
  console.log("RUNE WEAVER - WORKBENCH (Phase 3 Week-1 Lifecycle Demo)");
  console.log("=".repeat(60));
  console.log(">>> Entry: User Request Received");
  console.log(`    "${userRequest.substring(0, 60)}${userRequest.length > 60 ? "..." : ""}"`);

  const featureIdentity = createFeatureIdentity(userRequest, options.hostRoot);
  console.log(`\n[Feature Identity]`);
  console.log(`   ID: ${featureIdentity.id}`);
  console.log(`   Label: ${featureIdentity.label}`);
  console.log(`   Host: ${featureIdentity.hostScope}`);
  console.log(`   Stage: ${featureIdentity.currentStage}`);

  const featureOwnership = createFeatureOwnership(featureIdentity.id, userRequest, options.hostRoot);
  console.log(`\n[Feature Ownership - Baseline]`);
  console.log(`   Expected Surfaces: ${featureOwnership.expectedSurfaces.join(", ")}`);
  console.log(`   Impact Areas: ${featureOwnership.impactAreas.join(", ")}`);
  console.log(`   Confidence: ${featureOwnership.confidence}`);
  console.log(`   Complete: ${featureOwnership.isComplete ? "Yes" : "Partial"}`);

  const integrationPoints = createIntegrationPointRegistry(featureIdentity.id, userRequest, options.hostRoot);
  console.log(`\n[Integration Point Registry - Baseline]`);
  console.log(`   Total Points: ${integrationPoints.points.length}`);
  console.log(`   Point Kinds: ${[...new Set(integrationPoints.points.map(p => p.kind))].join(", ")}`);
  console.log(`   Confidence: ${integrationPoints.confidence}`);

  // Load workspace for conflict detection
  const workspaceResult = workspaceExists(options.hostRoot) 
    ? loadWorkspace(options.hostRoot) 
    : { success: false, workspace: null, issues: ["Workspace not found"] };
  const workspace = workspaceResult.success ? workspaceResult.workspace : null;

  const conflictResult = detectSharedIntegrationPointConflict(featureIdentity.id, featureIdentity.label, integrationPoints, workspace);
  console.log(`\n[Conflict Check - Integration Point]`);
  console.log(`   Has Conflict: ${conflictResult.hasConflict}`);
  console.log(`   Status: ${conflictResult.status}`);
  console.log(`   Recommended Action: ${conflictResult.recommendedAction}`);
  if (conflictResult.hasConflict) {
    console.log(`   Conflict Count: ${conflictResult.conflicts.length}`);
    for (const c of conflictResult.conflicts) {
      console.log(`   - ${c.conflictingPoint} (${c.severity}) vs ${c.existingFeatureLabel}`);
    }
  }

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

  console.log(`\n[Session] ID: ${session.id}`);
  console.log(`User Request: "${userRequest}"`);
  console.log(`Host Root: ${options.hostRoot}`);

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
  console.log("\n[Main Wizard] Analyzing request for missing key parameters...");

  const uiDetection = detectUIRequirements(userRequest);
  console.log(`[Main Wizard] UI need detection: ${uiDetection.uiNeeded ? "UI detected" : "No UI detected"}`);

  let uiIntake: UIIntakeResult | undefined;
  if (uiDetection.uiBranchRecommended) {
    console.log("\n[Main Wizard] Entering UI Wizard branch...");
    uiIntake = collectUIIntake(userRequest, uiDetection);
    console.log(`[Main Wizard] UI intake surface type: ${uiIntake.surfaceType || "unknown"}`);
    session.uiIntake = uiIntake;
    session.status = "ui_intake_completed";
  }

  const wizardInput: WizardIntentInput = {
    rawText: userRequest,
    temperature: WORKBENCH_WIZARD_LLM_TEMPERATURE,
    providerOptions: WORKBENCH_WIZARD_PROVIDER_OPTIONS,
  };

  const wizardOptions: WizardIntentOptions = {
    client,
    input: wizardInput,
  };

  const { wizardResult, wizardDegradation } = await runWorkbenchWizard(userRequest, wizardOptions);

  session.wizardResult = {
    schema: wizardResult.schema,
    issues: wizardResult.issues || [],
    valid: wizardResult.valid,
  };
  session.status = "wizard_completed";

  printWizardDegradation(wizardResult, wizardDegradation);

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

  console.log("\n" + "=".repeat(60));
  console.log("FEATURE REVIEW");
  console.log("=".repeat(60));
  printFeatureReview(review);

  console.log("\n" + "=".repeat(60));
  console.log("BLUEPRINT PROPOSAL (LLM)");
  console.log("=".repeat(60));
  
  const blueprintProposal = await generateBlueprintProposal(
    featureIdentity.id,
    featureIdentity.label,
    userRequest,
    integrationPoints,
    featureOwnership,
    client
  );
  const gapFillResult = await identifyGapsAndFillAsync(blueprintProposal, client);
  const sceneReferences = detectSceneAnchors(userRequest, "dota2");
  printBlueprintProposalReport(blueprintProposal, gapFillResult, sceneReferences);

  console.log("\n" + "=".repeat(60));
  console.log("SESSION & IDENTITY STATUS");
  console.log("=".repeat(60));
  console.log(`Session ID: ${session.id}`);
  console.log(`Session Status: ${session.status}`);
  console.log(`Feature ID: ${featureIdentity.id}`);
  console.log(`Feature Stage: ${featureIdentity.currentStage}`);

  const featureCard = createFeatureCard(
    featureIdentity,
    featureOwnership,
    conflictResult,
    review
  );

  const featureDetail = createFeatureDetail(
    featureCard,
    featureIdentity,
    featureOwnership,
    integrationPoints,
    conflictResult,
    knownInputs,
    clarification,
    review.nextStep
  );
  printFeatureCardSection(featureCard);
  printFeatureDetailSection(featureDetail);

  const lifecycleActions = createLifecycleActions(
    featureCard,
    featureDetail,
    conflictResult,
    options.hostRoot
  );
  printLifecycleSection(lifecycleActions);

  const actionRoute = createActionRoute(featureCard, lifecycleActions);
  printActionRouteSection(actionRoute);

  const featureRouting = createFeatureRouting(userRequest, featureIdentity, lifecycleActions, options.hostRoot);
  printFeatureRoutingSection(featureRouting);

  const featureFocus = createFeatureFocus(featureIdentity, lifecycleActions, featureRouting);
  printFeatureFocusSection(featureFocus);

  const updateHandoff = createUpdateHandoff(featureFocus, featureRouting, lifecycleActions);
  printUpdateHandoffSection(updateHandoff);

  // T418-R1: 先创建初始 handler（用于 governance release）
  const initialHandler = createUpdateHandler(updateHandoff, featureFocus, featureCard, conflictResult, featureOwnership, { forceValidation: FORCE_UPDATE_WRITE });

  // T417: 创建 governance release（基于初始 handler）
  const initialGovernanceRelease = createGovernanceRelease(initialHandler, conflictResult, featureCard);

  // T418-R1: 创建 confirmation action（使用传入的 confirmedItemIds）
  const confirmedItemIds = options.confirmedItemIds || [];
  const confirmationAction = createConfirmationAction(initialGovernanceRelease, confirmedItemIds);

  // T418-R1: 根据 confirmation 结果重新创建 handler
  // 如果 confirmation 已释放到就绪状态，handler 应该能进入 ready_for_dry_run
  const updateHandler = createUpdateHandler(updateHandoff, featureFocus, featureCard, conflictResult, featureOwnership, {
    forceValidation: FORCE_UPDATE_WRITE,
    confirmationAction
  });

  // T418-R3: confirmation 后重算 governanceRelease，确保与 handler/plan 状态一致
  // 当 confirmation 已释放时，governanceRelease 应反映 released 状态
  // T418-R3A: 确保 released 状态是干净的，不再残留 blocked 语义
  const governanceRelease = confirmationAction.transitionResult === "released_to_ready"
    ? {
        ...initialGovernanceRelease,
        status: "released" as const,
        blockedReason: null,
        releaseHint: "所有确认项已完成，已释放到就绪状态",
        canSelfRelease: true,
        // 清理 blocked 语义残留
        requiredConfirmations: [],
        nextAllowedTransition: null,
      }
    : initialGovernanceRelease;
  printUpdateHandlerSection(updateHandler);

  // T418-R3: Pass confirmationAction to createUpdateWriteResult for normal-path awareness
  const updateWriteResult = createUpdateWriteResult(updateHandler.updatePlan, updateHandler, conflictResult, { ...options, confirmationAction });
  printGovernanceSection(governanceRelease);
  printConfirmationSection(confirmationAction);
  printUpdateWriteSection(updateWriteResult);

  if (options.write && wizardResult.valid) {
    const workspaceResult = loadWorkspace(options.hostRoot);
    if (workspaceResult.success && workspaceResult.workspace) {
      const existing = findFeatureById(workspaceResult.workspace, featureIdentity.id);
      if (existing) {
        console.log(`\n⚠️  Feature '${featureIdentity.id}' already exists in workspace - skipping persist`);
      } else {
        const selectedPatterns = blueprintProposal.proposedModules.flatMap(m => m.proposedPatternIds);

        const assemblyPlan = {
          blueprintId: blueprintProposal.id,
          selectedPatterns: blueprintProposal.proposedModules.map(m => ({
            patternId: m.proposedPatternIds[0] || "",
            role: m.role,
          })),
          writeTargets: [] as { target: "server" | "shared" | "ui" | "config"; path: string; summary: string }[],
          bridgeUpdates: [] as { target: "server" | "ui"; file: string; action: "create" | "refresh" | "inject_once" }[],
          validations: [],
          readyForHostWrite: true,
        };

        const writePlan = createWritePlan(
          assemblyPlan,
          options.hostRoot,
          featureIdentity.id
        );

        const entryBindings: import("../../core/workspace/types.js").EntryBinding[] = [];
        if (integrationPoints.points.some(p => p.kind === "trigger_binding" || p.kind === "lua_table")) {
          entryBindings.push({
            target: "server",
            file: "game/scripts/src/modules/index.ts",
            kind: "import",
          });
        }
        if (integrationPoints.points.some(p => p.kind === "ui_mount")) {
          entryBindings.push({
            target: "ui",
            file: "content/panorama/src/hud/script.tsx",
            kind: "mount",
          });
        }

        const workspaceUpdateResult = updateWorkspaceState(
          options.hostRoot,
          { id: blueprintProposal.id, sourceIntent: { intentKind: "micro-feature" } } as Blueprint,
          assemblyPlan,
          writePlan,
          "create",
          featureIdentity.id,
          null
        );

        if (workspaceUpdateResult.success) {
          const generatedFilesFromPlan = writePlan.entries
            .filter((e: WritePlanEntry) => !e.deferred)
            .map((e: WritePlanEntry) => e.targetPath);
          console.log("\n✅ Feature persisted to workspace");
          console.log(`   Feature ID: ${featureIdentity.id}`);
          console.log(`   Blueprint ID: ${blueprintProposal.id}`);
          console.log(`   Selected Patterns: ${selectedPatterns.length > 0 ? selectedPatterns.join(", ") : "(none)"}`);
          console.log(`   Generated Files: ${generatedFilesFromPlan.length} from plan`);
          if (generatedFilesFromPlan.length > 0) {
            console.log(`     Files: ${generatedFilesFromPlan.join(", ")}`);
          }
          console.log(`   Entry Bindings: ${entryBindings.length > 0 ? entryBindings.map(b => `${b.target}:${b.file}`).join(", ") : "(none)"}`);
        } else {
          console.log(`\n❌ Workspace persistence failed: ${workspaceUpdateResult.error}`);
        }
      }
    }
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
      degraded: wizardDegradation?.status !== undefined && wizardDegradation.status !== "none",
      fallback: blueprintProposal.source === "fallback",
    },
  };
}

// T413: 本地验证用的强制写入开关
const FORCE_UPDATE_WRITE = process.env.RW_FORCE_UPDATE_WRITE === "1" || process.env.RW_FORCE_UPDATE_WRITE === "true";

async function main() {
  const args = process.argv.slice(2);

  const hasInspectFlag = args.includes("--inspect");
  const inspectIndex = args.indexOf("--inspect");
  const inspectFeatureId = hasInspectFlag ? args[inspectIndex + 1] : undefined;

  if (hasInspectFlag && inspectFeatureId) {
    const nonFlagArgs = args.filter((a, i) => i !== inspectIndex && i !== inspectIndex + 1);
    const hostRoot = nonFlagArgs.find(a => !a.startsWith("--")) || "D:\\test1";
    await runInspect(inspectFeatureId, hostRoot);
    return;
  }

  const hasListFlag = args.includes("--list");
  if (hasListFlag) {
    const nonFlagArgs = args.filter(a => a !== "--list");
    const hostRoot = nonFlagArgs.find(a => !a.startsWith("--")) || "D:\\test1";
    await runList(hostRoot);
    return;
  }

  const hasDeleteFlag = args.includes("--delete");
  const deleteIndex = args.indexOf("--delete");
  const deleteFeatureId = hasDeleteFlag ? args[deleteIndex + 1] : undefined;

  if (hasDeleteFlag && deleteFeatureId) {
    const nonFlagArgs = args.filter((a, i) => i !== deleteIndex && i !== deleteIndex + 1);
    const hostRoot = nonFlagArgs.find(a => !a.startsWith("--")) || "D:\\test1";
    const hasConfirmFlag = args.includes("--confirm");
    await runDelete(deleteFeatureId, hostRoot, hasConfirmFlag);
    return;
  }

  // T416: 解析 --write 开关
  const hasWriteFlag = args.includes("--write");
  let filteredArgs = args.filter(arg => arg !== "--write");

  // T418-R3: 解析 --confirm 参数 (格式: --confirm item1,item2,item3 或 --confirm=item1,item2,item3)
  let confirmedItemIds: string[] | undefined;
  const confirmArgIndex = filteredArgs.findIndex(arg => arg.startsWith("--confirm"));
  if (confirmArgIndex !== -1) {
    const confirmArg = filteredArgs[confirmArgIndex];
    const hasEquals = confirmArg.includes("=");
    const confirmValue = hasEquals ? confirmArg.split("=")[1] : filteredArgs[confirmArgIndex + 1];
    if (confirmValue) {
      confirmedItemIds = confirmValue.split(",").map(id => id.trim()).filter(id => id.length > 0);
    }
    // Remove --confirm arg from filteredArgs
    // If using --confirm= format, only remove current arg
    // If using --confirm format, also remove the value arg (next index)
    const indicesToRemove = hasEquals 
      ? [confirmArgIndex] 
      : [confirmArgIndex, confirmArgIndex + 1];
    filteredArgs = filteredArgs.filter((_, idx) => !indicesToRemove.includes(idx));
  }

  const request = filteredArgs[0] || "a dash ability with 300 range";
  const hostRoot = filteredArgs[1] || "D:\\test1";

  // T416: 默认 dry-run，显式 --write 才进入真实写入模式
  const dryRun = !hasWriteFlag;

  try {
    const result = await runWorkbench(request, { hostRoot, dryRun, confirmedItemIds, write: hasWriteFlag });
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
      console.log(`Point Kinds: ${[...new Set(result.integrationPoints.points.map(p => p.kind))].join(", ")}`);
      console.log(`IP Confidence: ${result.integrationPoints.confidence}`);
    }
    if (result.session) {
      console.log(`Session ID: ${result.session.id}`);
      console.log(`Session Status: ${result.session.status}`);
    }
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("\n[Workbench] Error:", err);
    process.exit(1);
  }
}

main();

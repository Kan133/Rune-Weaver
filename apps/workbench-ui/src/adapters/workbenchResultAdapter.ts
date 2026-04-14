// F004-R1: Workbench Result Adapter
// Contract-first adapter that maps backend-style WorkbenchResult to frontend-facing WorkbenchState
// Uses shared types from apps/workbench/types.ts instead of mirrored definitions

import type { WorkbenchState, FeatureCard, FeatureDetail, LifecycleActions, GovernanceRelease, OutputEvidence } from "../types/workbench";

// F004-R1: Import shared types from backend - no more mirrored types
import type {
  WorkbenchResult,
  FeatureCard as BackendFeatureCard,
  FeatureDetail as BackendFeatureDetail,
  LifecycleActions as BackendLifecycleActions,
  FeatureRouting as BackendFeatureRouting,
  FeatureFocus as BackendFeatureFocus,
  UpdateHandoff as BackendUpdateHandoff,
  UpdateHandler as BackendUpdateHandler,
  GovernanceRelease as BackendGovernanceRelease,
  ConfirmationAction as BackendConfirmationAction,
  UpdateWriteResult as BackendUpdateWriteResult,
} from "../../../workbench/contract";

// F004-R1: Adapter input is now a direct Pick from shared WorkbenchResult
// This eliminates type duplication and makes the integration path clearer
// Note: featureReview is NOT in WorkbenchResult - it's a frontend-only construct
// confirmationAction in backend has different structure than frontend ConfirmationAction
export type AdapterInput = Pick<WorkbenchResult,
  | "featureCard"
  | "featureDetail"
  | "lifecycleActions"
  | "featureRouting"
  | "featureFocus"
  | "updateHandoff"
  | "updateHandler"
  | "governanceRelease"
  | "updateWriteResult"
> & {
  // Backend confirmationAction has different structure - handle separately
  confirmationAction?: BackendConfirmationAction;
};

// F004-R1: Helper type for the adapter function parameter
export type BackendWorkbenchResult = AdapterInput;

// Adapter function: Backend Result -> Frontend State
export function adaptWorkbenchResult(backendResult: BackendWorkbenchResult): WorkbenchState {
  // F004: Session is required in WorkbenchState, provide default if missing
  const session = createDefaultSession();

  return {
    session,
    featureCard: backendResult.featureCard ? adaptFeatureCard(backendResult.featureCard) : undefined,
    featureDetail: backendResult.featureDetail ? adaptFeatureDetail(backendResult.featureDetail) : undefined,
    lifecycleActions: backendResult.lifecycleActions ? adaptLifecycleActions(backendResult.lifecycleActions) : undefined,
    // F004-R1: featureReview is frontend-only, not in backend WorkbenchResult
    featureRouting: backendResult.featureRouting ? adaptFeatureRouting(backendResult.featureRouting) : undefined,
    featureFocus: backendResult.featureFocus ? adaptFeatureFocus(backendResult.featureFocus) : undefined,
    updateHandoff: backendResult.updateHandoff ? adaptUpdateHandoff(backendResult.updateHandoff) : undefined,
    updateHandler: backendResult.updateHandler ? adaptUpdateHandler(backendResult.updateHandler) : undefined,
    governanceRelease: backendResult.governanceRelease ? adaptGovernanceRelease(backendResult.governanceRelease) : undefined,
    // F004-R1: confirmationAction has different structure in backend vs frontend
    confirmationActions: backendResult.confirmationAction
      ? adaptConfirmationAction(backendResult.confirmationAction)
      : undefined,
    outputEvidence: backendResult.updateWriteResult ? adaptOutputEvidence(backendResult.updateWriteResult) : undefined,
  };
}

// F004: Create default session when backend doesn't provide one
function createDefaultSession(): WorkbenchState["session"] {
  return {
    sessionId: "default_session",
    hostRoot: "D:/Dota2CustomGame",
    status: "active",
  };
}

// Individual field adapters
// F004-R1: These now use shared backend types directly instead of mirrored types

function adaptFeatureCard(backendCard: BackendFeatureCard): FeatureCard {
  // F004: Derive beginner-friendly fields from backend data
  const category = deriveCategoryFromPatterns([]);
  const affectedAreas = deriveAffectedAreasFromSurfaces([]);
  const nextAction = deriveNextAction(backendCard.status, backendCard.needsConfirmation);

  return {
    id: backendCard.id,
    displayLabel: backendCard.displayLabel,
    systemLabel: backendCard.systemLabel,
    summary: backendCard.summary,
    host: backendCard.host,
    status: backendCard.status,
    riskLevel: backendCard.riskLevel,
    needsConfirmation: backendCard.needsConfirmation,
    // F004: Enriched with beginner-friendly derived fields
    category,
    categoryLabel: getCategoryLabel(category),
    affectedAreas,
    nextAction,
    createdAt: backendCard.createdAt instanceof Date
      ? backendCard.createdAt.toISOString()
      : String(backendCard.createdAt),
    updatedAt: backendCard.updatedAt instanceof Date
      ? backendCard.updatedAt.toISOString()
      : String(backendCard.updatedAt),
  };
}

function adaptFeatureDetail(backendDetail: BackendFeatureDetail): FeatureDetail {
  return {
    cardId: backendDetail.cardId,
    basicInfo: {
      id: backendDetail.basicInfo.id,
      displayLabel: backendDetail.basicInfo.displayLabel,
      systemLabel: backendDetail.basicInfo.systemLabel,
      intentSummary: backendDetail.basicInfo.intentSummary,
      hostScope: backendDetail.basicInfo.hostScope,
      createdAt: backendDetail.basicInfo.createdAt instanceof Date
        ? backendDetail.basicInfo.createdAt.toISOString()
        : String(backendDetail.basicInfo.createdAt),
      updatedAt: backendDetail.basicInfo.updatedAt instanceof Date
        ? backendDetail.basicInfo.updatedAt.toISOString()
        : String(backendDetail.basicInfo.updatedAt),
    },
    status: {
      status: backendDetail.status.status,
      riskLevel: backendDetail.status.riskLevel,
      needsConfirmation: backendDetail.status.needsConfirmation,
      conflictCount: backendDetail.status.conflictCount,
      lastConflictSummary: backendDetail.status.lastConflictSummary,
    },
    editableParams: {
      knownInputs: backendDetail.editableParams.knownInputs,
      missingParams: backendDetail.editableParams.missingParams,
      canEdit: backendDetail.editableParams.canEdit,
    },
    hostOutput: {
      host: backendDetail.hostOutput.host,
      expectedSurfaces: backendDetail.hostOutput.expectedSurfaces as FeatureDetail["hostOutput"]["expectedSurfaces"],
      impactAreas: backendDetail.hostOutput.impactAreas as FeatureDetail["hostOutput"]["impactAreas"],
      integrationPointCount: backendDetail.hostOutput.integrationPointCount,
      outputSummary: backendDetail.hostOutput.outputSummary,
    },
    patternBindings: {
      patterns: backendDetail.patternBindings.patterns,
      isBound: backendDetail.patternBindings.isBound,
    },
  };
}

function adaptLifecycleActions(backendActions: BackendLifecycleActions): LifecycleActions {
  return {
    cardId: backendActions.cardId,
    currentStage: backendActions.currentStage,
    persistenceState: backendActions.persistenceState,
    persistedFeatureId: backendActions.persistedFeatureId ?? null,
    persistenceReason: backendActions.persistenceReason,
    actions: backendActions.actions.map(action => ({
      kind: action.kind,
      enabled: action.enabled,
      reason: action.reason,
      nextHint: action.nextHint,
    })),
  };
}

function adaptFeatureRouting(backendRouting: BackendFeatureRouting): WorkbenchState["featureRouting"] {
  return {
    decision: backendRouting.decision,
    confidence: backendRouting.confidence,
    candidates: backendRouting.candidates,
    rationale: backendRouting.rationale,
    nextHint: backendRouting.nextHint ?? "",
  };
}

function adaptFeatureFocus(backendFocus: BackendFeatureFocus): WorkbenchState["featureFocus"] {
  return {
    focusType: backendFocus.focusType,
    featureId: backendFocus.featureId,
    featureLabel: backendFocus.featureLabel,
    reason: backendFocus.reason,
    source: backendFocus.source ?? "",
    persistenceRelation: backendFocus.persistenceRelation as "newly_created" | "runtime_only" | "persisted_match" | undefined,
  };
}

function adaptUpdateHandoff(backendHandoff: BackendUpdateHandoff): WorkbenchState["updateHandoff"] {
  return {
    status: backendHandoff.status,
    targetFeatureId: backendHandoff.targetFeatureId,
    targetFeatureLabel: backendHandoff.targetFeatureLabel,
    handoverReason: backendHandoff.handoverReason,
    nextHint: backendHandoff.nextHint ?? "",
  };
}

function adaptUpdateHandler(backendHandler: BackendUpdateHandler): WorkbenchState["updateHandler"] {
  return {
    status: backendHandler.status,
    reason: backendHandler.handlerReason,
    nextHint: backendHandler.nextHint ?? "",
  };
}

function adaptGovernanceRelease(backendRelease: BackendGovernanceRelease): GovernanceRelease {
  return {
    status: backendRelease.status,
    blockedReason: backendRelease.blockedReason ?? null,
    requiredConfirmations: backendRelease.requiredConfirmations.map(item => ({
      itemId: item.itemId,
      itemType: item.itemType,
      description: item.description,
      severity: item.severity,
      currentValue: item.currentValue,
      suggestedValue: item.suggestedValue,
    })),
    nextAllowedTransition: backendRelease.nextAllowedTransition ?? null,
    releaseHint: backendRelease.releaseHint,
    canSelfRelease: backendRelease.canSelfRelease,
  };
}

// F004-R1: Adapt backend ConfirmationAction to frontend ConfirmationAction[]
// Backend has single confirmationAction with acceptedItems/remainingItems
// Frontend expects array of ConfirmationAction with itemId/description/confirmed/required
function adaptConfirmationAction(backendAction: BackendConfirmationAction): WorkbenchState["confirmationActions"] {
  // Convert backend's acceptedItems and remainingItems to frontend's ConfirmationAction array
  const actions: NonNullable<WorkbenchState["confirmationActions"]> = [];

  // Add accepted items as confirmed
  for (const item of backendAction.acceptedItems) {
    actions.push({
      itemId: item.itemId,
      description: `Confirmed at ${item.confirmedAt}`,
      confirmed: true,
      required: true,
    });
  }

  // Add remaining items as not confirmed
  for (const item of backendAction.remainingItems) {
    actions.push({
      itemId: item.itemId,
      description: item.description,
      confirmed: false,
      required: true,
    });
  }

  return actions.length > 0 ? actions : undefined;
}

function adaptOutputEvidence(backendWriteResult: BackendUpdateWriteResult): OutputEvidence[] | undefined {
  if (!backendWriteResult.touchedOutputs || backendWriteResult.touchedOutputs.length === 0) {
    return undefined;
  }
  return backendWriteResult.touchedOutputs.map(output => ({
    filePath: output.outputPath,
    contentType: deriveContentType(output.outputKind),
    description: output.description,
    size: 0, // Backend may not provide size, use 0 as placeholder
    status: output.status,
  }));
}

// Helper functions for deriving beginner-friendly fields

function deriveCategoryFromPatterns(patterns: string[]): FeatureCard["category"] {
  // Simple heuristic based on pattern names
  const patternStr = patterns.join(" ").toLowerCase();
  if (patternStr.includes("ability") || patternStr.includes("skill")) return "ability";
  if (patternStr.includes("hero")) return "hero";
  if (patternStr.includes("item")) return "item";
  if (patternStr.includes("talent")) return "talent";
  if (patternStr.includes("ui") || patternStr.includes("panel") || patternStr.includes("modal")) return "ui_visual";
  if (patternStr.includes("rule") || patternStr.includes("mechanic")) return "rule_mechanic";
  if (patternStr.includes("input") || patternStr.includes("key")) return "input_interaction";
  if (patternStr.includes("data") || patternStr.includes("pool")) return "data_config";
  return "other";
}

function deriveAffectedAreasFromSurfaces(surfaces: string[]): string[] {
  // Map technical surfaces to user-friendly affected areas
  const areaMap: Record<string, string> = {
    ability: "技能系统",
    kv: "配置文件",
    lua: "游戏逻辑",
    ts: "类型系统",
    ui: "界面显示",
    hero: "英雄数据",
    item: "物品系统",
  };
  return surfaces.map(s => areaMap[s] || s).slice(0, 3); // Max 3 areas
}

function deriveNextAction(status: FeatureCard["status"], needsConfirmation: boolean): string {
  if (status === "blocked") return "解决阻塞问题后继续";
  if (status === "needs_clarification") return "提供更多信息";
  if (needsConfirmation) return "确认必要项后继续";
  if (status === "ready") return "点击继续生成代码";
  return "等待系统处理";
}

function getCategoryLabel(category: FeatureCard["category"]): string {
  const labels: Record<string, string> = {
    hero: "英雄",
    ability: "技能",
    talent: "天赋",
    item: "物品",
    ui_visual: "UI 表现",
    rule_mechanic: "规则机制",
    input_interaction: "输入交互",
    data_config: "数据配置",
    other: "其他",
  };
  return labels[category || "other"] || "其他";
}

function deriveContentType(outputKind: string): OutputEvidence["contentType"] {
  const kind = outputKind.toLowerCase();
  if (kind.includes("lua")) return "lua";
  if (kind.includes("kv")) return "kv";
  if (kind.includes("ts") || kind.includes("typescript")) return "ts";
  if (kind.includes("ui") || kind.includes("tsx")) return "ui";
  return "other";
}

import type {
  FeatureCard,
  FeatureDetail,
  ConflictCheckResult,
  LifecycleActions,
  ActionRouteResult,
  FeatureRouting,
  FeatureIdentity,
  FeatureFocus,
  UpdateHandoff,
} from "./types.js";
import { loadWorkspace, findFeatureById, workspaceExists } from "../../core/workspace/manager.js";

export function createLifecycleActions(
  featureCard: FeatureCard,
  featureDetail: FeatureDetail,
  conflictResult: ConflictCheckResult,
  hostRoot: string
): LifecycleActions {
  const { status: cardStatus, id: cardId } = featureCard;
  const actions: LifecycleActions["actions"] = [];

  let persistenceState: LifecycleActions["persistenceState"];
  let persistenceReason: string;

  if (workspaceExists(hostRoot)) {
    const workspaceResult = loadWorkspace(hostRoot);
    if (workspaceResult.success && workspaceResult.workspace) {
      const existing = findFeatureById(workspaceResult.workspace, cardId);
      if (existing) {
        persistenceState = "persisted";
        persistenceReason = `Feature '${cardId}' 已存在于 workspace`;
      } else {
        persistenceState = "new";
        persistenceReason = "Feature 不存在于 workspace，是新建对象";
      }
    } else {
      persistenceState = "new";
      persistenceReason = "无法加载 workspace，视为新建对象";
    }
  } else {
    persistenceState = "new";
    persistenceReason = "Workspace 不存在，视为新建对象";
  }

  const hasConflict = conflictResult.hasConflict;
  const isBlocked = cardStatus === "blocked";
  const needsConfirmation = featureCard.needsConfirmation;

  actions.push({
    kind: "create",
    enabled: !hasConflict && !isBlocked,
    reason: hasConflict || isBlocked
      ? "存在冲突或 feature 被阻塞，无法创建"
      : "Feature 可以进入创建流程",
    nextHint: hasConflict || isBlocked
      ? "请先解决冲突或确认参数"
      : "确认后即可创建 feature",
  });

  actions.push({
    kind: "read",
    enabled: true,
    reason: "始终可以查看 feature 详情",
    nextHint: "查看当前 feature 的完整信息",
  });

  actions.push({
    kind: "update",
    enabled: !needsConfirmation && !isBlocked,
    reason: needsConfirmation
      ? "Feature 需要确认后才能更新"
      : isBlocked
      ? "Feature 当前处于 blocked 状态，无法更新"
      : "Feature 状态允许更新操作",
    nextHint: needsConfirmation || isBlocked
      ? "请先满足更新前置条件"
      : "可以使用 update 命令修改 feature",
  });

  actions.push({
    kind: "archive",
    enabled: false,
    reason: "当前生命周期不支持 archive 操作",
    nextHint: "archive 功能尚在规划中",
  });

  return {
    cardId,
    actions,
    currentStage: cardStatus,
    persistenceState,
    persistenceReason,
  };
}

export function createActionRoute(
  featureCard: FeatureCard,
  lifecycleActions: LifecycleActions
): ActionRouteResult {
  const enabledActions = lifecycleActions.actions.filter(a => a.enabled);
  const nextAction = enabledActions.find(a => a.kind === "update") || enabledActions[0];

  const primaryRoute = nextAction
    ? {
        routeId: `route_${nextAction.kind}_${featureCard.id}`,
        status: "matched" as const,
        targetFeatureId: featureCard.id,
        reason: `基于当前状态，${nextAction.kind} 是可用操作`,
        requestedAction: nextAction.kind,
        targetCardId: featureCard.id,
        routeReason: nextAction.reason,
        nextHint: nextAction.nextHint,
      }
    : {
        routeId: `route_none_${featureCard.id}`,
        status: "unavailable" as const,
        reason: "当前没有可用操作",
        requestedAction: "none",
        targetCardId: featureCard.id,
        routeReason: "Feature 状态不满足任何操作前置条件",
      };

  const alternativeRoutes = lifecycleActions.actions
    .filter(a => a.kind !== nextAction?.kind && a.enabled)
    .map(a => ({
      routeId: `route_${a.kind}_alt_${featureCard.id}`,
      status: "unavailable" as const,
      reason: `备选操作: ${a.kind}`,
      requestedAction: a.kind,
      targetCardId: featureCard.id,
      routeReason: a.reason,
      nextHint: a.nextHint,
    }));

  return {
    route: primaryRoute,
    alternativeRoutes,
  };
}

export function createFeatureRouting(
  _userRequest: string,
  featureIdentity: FeatureIdentity,
  lifecycleActions: LifecycleActions,
  _hostRoot: string
): FeatureRouting {
  const enabledActions = lifecycleActions.actions;
  const hasUpdateEnabled = enabledActions.some(a => a.kind === "update" && a.enabled);
  const hasCreateEnabled = enabledActions.some(a => a.kind === "create" && a.enabled);

  let decision: FeatureRouting["decision"];
  let confidence: "high" | "medium" | "low";
  let rationale: string;
  let reason: string;
  let nextHint: string | undefined;
  let candidates: FeatureRouting["candidates"] = [];
  let candidateFeature: FeatureRouting["candidateFeature"] | undefined;

  if (hasUpdateEnabled) {
    decision = "update";
    confidence = "high";
    rationale = "Feature 已存在且处于可更新状态";
    reason = "检测到现有 feature 可以更新";
    nextHint = "请使用 update 命令进入更新流程";
  } else if (hasCreateEnabled) {
    decision = "create";
    confidence = "high";
    rationale = "Feature 不存在或处于新建状态，应进入创建流程";
    reason = "检测到需要新建 feature";
    nextHint = "请使用 create 命令进入创建流程";
  } else {
    decision = "unclear";
    confidence = "low";
    rationale = "无法判断是创建还是更新，需要更多信息";
    reason = "Feature 状态不明确，无法确定路由";
    nextHint = "请确认 feature 状态或提供明确的 feature ID";
  }

  return {
    decision,
    confidence,
    candidates,
    rationale,
    candidateFeature,
    reason,
    nextHint,
  };
}

export function createFeatureFocus(
  featureIdentity: FeatureIdentity,
  lifecycleActions: LifecycleActions,
  _featureRouting: FeatureRouting
): FeatureFocus {
  const persistenceState = lifecycleActions.persistenceState;
  const currentStage = lifecycleActions.currentStage;

  let focusType: FeatureFocus["focusType"];
  let featureId: string | undefined;
  let featureLabel: string | undefined;
  let reason: string;
  let persistenceRelation: string | undefined;
  let source: string | undefined;

  featureId = featureIdentity.id;
  featureLabel = featureIdentity.label;

  if (persistenceState === "new") {
    focusType = "newly_created";
    reason = "Feature 是新建对象，尚未持久化";
    persistenceRelation = "new";
    source = "session";
  } else if (persistenceState === "persisted") {
    focusType = "persisted_existing";
    reason = "Feature 已持久化到 workspace";
    persistenceRelation = "persisted";
    source = "workspace";
  } else if (persistenceState === "runtime") {
    focusType = "runtime_only";
    reason = "Feature 仅存在于当前运行时会话";
    persistenceRelation = "runtime";
    source = "session";
  } else {
    focusType = "newly_created";
    reason = `基于当前 stage '${currentStage}' 判断为新建`;
    persistenceRelation = "new";
    source = "inferred";
  }

  return {
    focusType,
    featureId,
    featureLabel,
    reason,
    persistenceRelation,
    source,
  };
}

export function createUpdateHandoff(
  featureFocus: FeatureFocus,
  _featureRouting: FeatureRouting,
  _lifecycleActions: LifecycleActions
): UpdateHandoff {
  const focusType = featureFocus.focusType;
  const featureId = featureFocus.featureId;
  const featureLabel = featureFocus.featureLabel;

  let status: UpdateHandoff["status"];
  let handoverReason: string;
  let confidence: "high" | "medium" | "low";
  let nextHint: string | undefined;
  let alternatives: UpdateHandoff["alternatives"];

  if (focusType === "newly_created") {
    status = "unresolved";
    handoverReason = "Feature 为新建状态，update handler 不适用";
    confidence = "high";
    nextHint = "新建 feature 请使用 create 流程，而非 update";
    alternatives = undefined;
  } else if (focusType === "persisted_existing" && featureId) {
    status = "direct_target";
    handoverReason = "Feature 已持久化，可以直接更新";
    confidence = "high";
    nextHint = "可以使用 update 命令更新此 feature";
    alternatives = undefined;
  } else if (focusType === "candidate_match") {
    status = "candidate_target";
    handoverReason = "Feature 匹配候选，需要用户确认更新目标";
    confidence = "medium";
    nextHint = "请确认是否更新此候选 feature";
    alternatives = undefined;
  } else if (focusType === "runtime_only") {
    status = "unresolved";
    handoverReason = "Feature 仅在运行时存在，需要先持久化";
    confidence = "low";
    nextHint = "请先将 feature 持久化到 workspace";
    alternatives = undefined;
  } else {
    status = "unresolved";
    handoverReason = "无法确定更新目标";
    confidence = "low";
    nextHint = "请提供明确的 feature ID";
    alternatives = undefined;
  }

  return {
    status,
    targetFeatureId: featureId,
    targetFeatureLabel: featureLabel,
    handoverReason,
    confidence,
    nextHint,
    alternatives,
  };
}

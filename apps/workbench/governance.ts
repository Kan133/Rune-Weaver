import type {
  UpdateHandler,
  ConflictCheckResult,
  FeatureCard,
  GovernanceRelease,
  ConfirmationAction,
  RequiredConfirmationItem,
} from "./types.js";

export function createGovernanceRelease(
  updateHandler: UpdateHandler,
  conflictResult: ConflictCheckResult,
  featureCard: FeatureCard
): GovernanceRelease {
  const handlerStatus = updateHandler.status;
  const hasConflicts = conflictResult.hasConflict;
  const needsConfirmation = featureCard.needsConfirmation;

  if (handlerStatus === "ready_for_dry_run") {
    return {
      status: "not_required",
      blockedReason: null,
      requiredConfirmations: [],
      nextAllowedTransition: null,
      releaseHint: "handler 已就绪，不需要额外治理释放",
      canSelfRelease: true,
    };
  }

  const requiredConfirmations: RequiredConfirmationItem[] = [];

  if (hasConflicts) {
    for (let i = 0; i < conflictResult.conflicts.length; i++) {
      const conflict = conflictResult.conflicts[i];
      requiredConfirmations.push({
        itemId: `conflict_${i}`,
        itemType: "conflict",
        description: `与现有功能冲突: ${conflict.existingFeatureLabel || conflict.existingFeatureId} - ${conflict.explanation}`,
        severity: conflict.severity === "error" ? "high" : "medium",
        currentValue: conflict.existingFeatureId,
        suggestedValue: "确认后继续或修改设计",
      });
    }
  }

  if (needsConfirmation) {
    requiredConfirmations.push({
      itemId: "card_needs_confirmation",
      itemType: "parameter",
      description: "Feature card 需要参数确认",
      severity: "medium",
      suggestedValue: "确认参数后继续",
    });
  }

  if (handlerStatus === "blocked_waiting_confirmation") {
    if (hasConflicts) {
      return {
        status: "blocked_by_conflict",
        blockedReason: "存在未解决的冲突，需要确认",
        requiredConfirmations,
        nextAllowedTransition: hasConflicts ? "requires_confirmation" : "ready_for_dry_run",
        releaseHint: requiredConfirmations.length > 0
          ? `需要确认 ${requiredConfirmations.length} 项: ${requiredConfirmations.map(c => c.description).join("; ")}`
          : "确认无冲突后可进入 dry-run",
        canSelfRelease: !hasConflicts,
      };
    } else {
      return {
        status: "blocked_pending_confirmation",
        blockedReason: "需要用户确认",
        requiredConfirmations,
        nextAllowedTransition: "ready_for_dry_run",
        releaseHint: "确认后可进入 dry-run 流程",
        canSelfRelease: true,
      };
    }
  }

  if (handlerStatus === "blocked_waiting_target") {
    return {
      status: "blocked_by_governance",
      blockedReason: "未确定更新目标",
      requiredConfirmations,
      nextAllowedTransition: "blocked",
      releaseHint: "请先明确更新目标",
      canSelfRelease: false,
    };
  }

  return {
    status: "not_required",
    blockedReason: null,
    requiredConfirmations: [],
    nextAllowedTransition: null,
    releaseHint: "当前状态不需要治理释放",
    canSelfRelease: true,
  };
}

export function createConfirmationAction(
  governanceRelease: GovernanceRelease,
  confirmedItemIds: string[]
): ConfirmationAction {
  if (governanceRelease.status === "not_required") {
    return {
      actionStatus: "not_applicable",
      targetItemIds: [],
      acceptedItems: [],
      remainingItems: [],
      transitionResult: "not_needed",
      actionHint: "当前状态不需要确认",
      canProceed: true,
    };
  }

  if (governanceRelease.requiredConfirmations.length === 0) {
    return {
      actionStatus: "accepted",
      targetItemIds: [],
      acceptedItems: [],
      remainingItems: [],
      transitionResult: "released_to_ready",
      actionHint: "无待确认项，可以继续",
      canProceed: true,
    };
  }

  const acceptedItems: ConfirmationAction["acceptedItems"] = [];
  const remainingItems: RequiredConfirmationItem[] = [];
  const confirmedSet = new Set(confirmedItemIds);

  for (const item of governanceRelease.requiredConfirmations) {
    if (confirmedSet.has(item.itemId)) {
      acceptedItems.push({
        itemId: item.itemId,
        confirmedAt: new Date().toISOString(),
        note: "已确认",
      });
    } else {
      remainingItems.push(item);
    }
  }

  let actionStatus: ConfirmationAction["actionStatus"];
  let transitionResult: ConfirmationAction["transitionResult"];
  let canProceed: boolean;
  let actionHint: string;

  if (remainingItems.length === 0) {
    actionStatus = "accepted";
    transitionResult = "released_to_ready";
    canProceed = true;
    actionHint = "所有确认项已完成，可以进入 dry-run 流程";
  } else if (acceptedItems.length > 0) {
    actionStatus = "partially_accepted";
    transitionResult = "still_blocked";
    canProceed = false;
    actionHint = `已确认 ${acceptedItems.length} 项，仍有 ${remainingItems.length} 项待确认`;
  } else {
    actionStatus = "rejected";
    transitionResult = "still_blocked";
    canProceed = false;
    actionHint = `仍有 ${remainingItems.length} 项待确认，请先完成所有确认`;
  }

  return {
    actionStatus,
    targetItemIds: confirmedItemIds,
    acceptedItems,
    remainingItems,
    transitionResult,
    actionHint,
    canProceed,
  };
}

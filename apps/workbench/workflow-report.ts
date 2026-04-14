import {
  CONFIRMATION_LABELS,
  GOVERNANCE_LABELS,
  LABELS,
  PLAN_LABELS,
  SECTIONS,
  WRITE_LABELS,
  p,
} from "./labels.js";
import type {
  ActionRouteResult,
  ConfirmationAction,
  FeatureCard,
  FeatureDetail,
  FeatureFocus,
  FeatureRouting,
  GovernanceRelease,
  LifecycleActions,
  UpdateHandler,
  UpdateHandoff,
  UpdateWriteResult,
} from "./types.js";

export function printFeatureCardSection(featureCard: FeatureCard): void {
  console.log("\n" + "=".repeat(60));
  console.log("FEATURE CARD");
  console.log("=".repeat(60));
  console.log(`   ID: ${featureCard.id}`);
  console.log(`   Display Label: ${featureCard.displayLabel}`);
  console.log(`   System Label: ${featureCard.systemLabel}`);
  console.log(`   Summary: ${featureCard.summary.substring(0, 60)}${featureCard.summary.length > 60 ? "..." : ""}`);
  console.log(`   Host: ${featureCard.host}`);
  console.log(`   Status: ${featureCard.status}`);
  console.log(`   Risk Level: ${featureCard.riskLevel}`);
  console.log(`   Needs Confirmation: ${featureCard.needsConfirmation}`);
  console.log(`   Created: ${featureCard.createdAt.toISOString()}`);
  console.log(`   Updated: ${featureCard.updatedAt.toISOString()}`);
}

export function printFeatureDetailSection(featureDetail: FeatureDetail): void {
  console.log("\n" + "=".repeat(60));
  console.log("FEATURE DETAIL");
  console.log("=".repeat(60));
  console.log("   [Primary Sections]");
  console.log(`     Basic Info: ${featureDetail.basicInfo.displayLabel} (${featureDetail.basicInfo.id})`);
  console.log(`     Status: ${featureDetail.status.status} | Risk: ${featureDetail.status.riskLevel} | Conflicts: ${featureDetail.status.conflictCount}`);
  console.log(`     Editable Params: ${Object.keys(featureDetail.editableParams.knownInputs).length} detected, ${featureDetail.editableParams.missingParams.length} missing`);
  console.log(`     Host/Output: ${featureDetail.hostOutput.host} | ${featureDetail.hostOutput.integrationPointCount} integration point(s)`);
  console.log("   [Secondary Sections]");
  console.log(`     Pattern Bindings: ${featureDetail.patternBindings.patterns.length} bound`);
}

export function printLifecycleSection(lifecycleActions: LifecycleActions): void {
  console.log("\n" + "=".repeat(60));
  console.log("LIFECYCLE ACTIONS");
  console.log("=".repeat(60));
  console.log(`   Current Stage: ${lifecycleActions.currentStage}`);
  console.log(`   Persistence State: ${lifecycleActions.persistenceState.toUpperCase()}`);
  console.log(`   ${lifecycleActions.persistenceReason}`);
  for (const action of lifecycleActions.actions) {
    const status = action.enabled ? "[ENABLED]" : "[DISABLED]";
    console.log(`   ${status} ${action.kind.toUpperCase()}: ${action.reason}`);
    if (action.nextHint) {
      console.log(`      Hint: ${action.nextHint}`);
    }
  }

  const enabledActions = lifecycleActions.actions.filter((action) => action.enabled);
  const nextAction = enabledActions.find((action) => action.kind === "update") || enabledActions[0];

  console.log("\n" + "=".repeat(60));
  console.log(">>> LIFECYCLE SUMMARY <<<");
  console.log("=".repeat(60));
  console.log(`   📍 Current Status: ${lifecycleActions.currentStage.toUpperCase()}`);
  console.log(`   📍 Available Actions: ${enabledActions.map((action) => action.kind).join(", ")}`);
  if (nextAction) {
    console.log(`   📍 Suggested Next: ${nextAction.kind.toUpperCase()}`);
    console.log(`      → ${nextAction.nextHint || nextAction.reason}`);
  }
  console.log("=".repeat(60));
}

export function printActionRouteSection(actionRoute: ActionRouteResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("ACTION ROUTE");
  console.log("=".repeat(60));
  const primaryRoute = actionRoute.route;
  const routeStatus = primaryRoute.status === "matched" ? "[MATCHED]" : "[UNAVAILABLE]";
  console.log(`   ${routeStatus} ${(primaryRoute.requestedAction ?? "unknown").toUpperCase()} -> ${primaryRoute.targetCardId}`);
  console.log(`   Reason: ${primaryRoute.routeReason}`);
  if (primaryRoute.nextHint) {
    console.log(`   Hint: ${primaryRoute.nextHint}`);
  }
  if (actionRoute.alternativeRoutes.length > 0) {
    console.log("   Alternative Routes:");
    for (const route of actionRoute.alternativeRoutes) {
      const altStatus = route.status === "matched" ? "[MATCHED]" : "[UNAVAILABLE]";
      console.log(`      ${altStatus} ${(route.requestedAction ?? "unknown").toUpperCase()} -> ${route.targetCardId}`);
    }
  }
}

export function printFeatureRoutingSection(featureRouting: FeatureRouting): void {
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.routing);
  console.log("=".repeat(60));
  console.log(p("判断", LABELS.decision[featureRouting.decision] || featureRouting.decision));
  console.log(p("置信度", LABELS.confidence[featureRouting.confidence] || featureRouting.confidence));
  console.log(p("判断依据", featureRouting.reason ?? featureRouting.rationale));
  if (featureRouting.candidateFeature) {
    console.log("   可能相关的已有 Feature:");
    console.log(`      - 名称: ${featureRouting.candidateFeature.featureLabel}`);
    console.log(`      - ID: ${featureRouting.candidateFeature.featureId}`);
  }
  if (featureRouting.nextHint) {
    console.log(p("建议操作", featureRouting.nextHint));
  }
  console.log("=".repeat(60));
}

export function printFeatureFocusSection(featureFocus: FeatureFocus): void {
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.focus);
  console.log("=".repeat(60));
  console.log(p("聚焦类型", LABELS.focusType[featureFocus.focusType] || featureFocus.focusType));
  console.log(p("Feature 名称", featureFocus.featureLabel ?? "(unknown)"));
  console.log(p("Feature ID", featureFocus.featureId ?? "(unknown)"));
  console.log(
    p(
      "持久化关系",
      featureFocus.persistenceRelation
        ? LABELS.persistence[featureFocus.persistenceRelation] || featureFocus.persistenceRelation
        : "(unknown)",
    ),
  );
  console.log(p("来源", featureFocus.source ?? "(unknown)"));
  console.log(p("聚焦原因", featureFocus.reason));
  if (featureFocus.focusType === "candidate_match") {
    console.log("   注意: 当前 focus 指向候选已有 feature，若要更新它请使用 update 命令");
  }
  console.log("=".repeat(60));
}

export function printUpdateHandoffSection(updateHandoff: UpdateHandoff): void {
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.handoff);
  console.log("=".repeat(60));
  console.log(p("交接状态", LABELS.handoffStatus[updateHandoff.status] || updateHandoff.status));
  if (updateHandoff.confidence) {
    console.log(p("置信度", LABELS.confidence[updateHandoff.confidence] || updateHandoff.confidence));
  }
  if (updateHandoff.targetFeatureId && updateHandoff.targetFeatureLabel) {
    console.log("   目标 Feature:");
    console.log(`      - 名称: ${updateHandoff.targetFeatureLabel}`);
    console.log(`      - ID: ${updateHandoff.targetFeatureId}`);
  } else {
    console.log("   目标 Feature: (无明确目标)");
  }
  console.log(p("交接原因", updateHandoff.handoverReason));
  if (updateHandoff.nextHint) {
    console.log(p("建议操作", updateHandoff.nextHint));
  }
  console.log("=".repeat(60));
}

export function printUpdateHandlerSection(updateHandler: UpdateHandler): void {
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.handler);
  console.log("=".repeat(60));
  console.log(p("Handler 状态", LABELS.handlerStatus[updateHandler.status] || updateHandler.status));
  console.log(p("置信度", LABELS.confidence[updateHandler.confidence] || updateHandler.confidence));
  console.log(p("Dry-run 模式", updateHandler.dryRunEnabled ? "已启用 ( planning-only )" : "未启用"));
  if (updateHandler.targetFeatureId && updateHandler.targetFeatureLabel) {
    console.log("   Handler 目标:");
    console.log(`      - 名称: ${updateHandler.targetFeatureLabel}`);
    console.log(`      - ID: ${updateHandler.targetFeatureId}`);
  } else {
    console.log("   Handler 目标: (未绑定)");
  }
  console.log(p("状态原因", updateHandler.handlerReason));
  if (updateHandler.nextHint) {
    console.log(p("下一步建议", updateHandler.nextHint));
  }
  console.log("=".repeat(60));

  if (updateHandler.updatePlan) {
    console.log("\n" + "=".repeat(60));
    console.log(SECTIONS.plan);
    console.log("=".repeat(60));
    console.log(p("计划状态", PLAN_LABELS.planStatus[updateHandler.updatePlan.planStatus] || updateHandler.updatePlan.planStatus));
    console.log(p("目标功能", `${updateHandler.updatePlan.targetFeatureLabel} (${updateHandler.updatePlan.targetFeatureId})`));
    console.log(p("操作类型", PLAN_LABELS.operationType[updateHandler.updatePlan.operationType] || updateHandler.updatePlan.operationType));
    console.log(p("可继续", updateHandler.updatePlan.canProceed ? "是" : "否"));

    if (updateHandler.updatePlan.affectedSurfaces.length > 0) {
      console.log("   可能影响的面:");
      for (const surface of updateHandler.updatePlan.affectedSurfaces) {
        const surfaceLabel = PLAN_LABELS.surfaceKind[surface.surfaceKind] || surface.surfaceKind;
        const riskLabel = surface.riskLevel
          ? PLAN_LABELS.riskLevel[surface.riskLevel] || surface.riskLevel
          : "unknown";
        console.log(`      - ${surfaceLabel}: ${surface.description} (风险: ${riskLabel})`);
      }
    } else {
      console.log("   可能影响的面: (无明确影响面)");
    }

    console.log(p("计划原因", updateHandler.updatePlan.planningReason));
    if (updateHandler.updatePlan.nextHint) {
      console.log(p("下一步建议", updateHandler.updatePlan.nextHint));
    }
    console.log("=".repeat(60));
  }
}

export function printGovernanceSection(governanceRelease: GovernanceRelease): void {
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.governance);
  console.log("=".repeat(60));
  console.log(p("释放状态", GOVERNANCE_LABELS.releaseStatus[governanceRelease.status] || governanceRelease.status));
  if (governanceRelease.blockedReason) {
    console.log(p("阻塞原因", governanceRelease.blockedReason));
  }
  if (governanceRelease.requiredConfirmations.length > 0) {
    console.log("   需要确认的项目:");
    for (const item of governanceRelease.requiredConfirmations) {
      const typeLabel = GOVERNANCE_LABELS.confirmationType[item.itemType] || item.itemType;
      const severityLabel = GOVERNANCE_LABELS.severity[item.severity] || item.severity;
      console.log(`      - [${typeLabel}] [${severityLabel}] ${item.description}`);
    }
  } else {
    console.log("   需要确认的项目: (无)");
  }
  if (governanceRelease.nextAllowedTransition) {
    console.log(p("下一允许状态", governanceRelease.nextAllowedTransition));
  }
  console.log(p("可自释放", governanceRelease.canSelfRelease ? "是" : "否"));
  if (governanceRelease.releaseHint) {
    console.log(p("释放提示", governanceRelease.releaseHint));
  }
  console.log("=".repeat(60));
}

export function printConfirmationSection(confirmationAction: ConfirmationAction): void {
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.confirmation);
  console.log("=".repeat(60));
  console.log(p("动作状态", CONFIRMATION_LABELS.actionStatus[confirmationAction.actionStatus] || confirmationAction.actionStatus));
  console.log(p("目标确认项", confirmationAction.targetItemIds.join(", ") || "(无)"));
  console.log(p("已接受项数", String(confirmationAction.acceptedItems.length)));
  console.log(p("剩余项数", String(confirmationAction.remainingItems.length)));
}

export function printUpdateWriteSection(updateWriteResult: UpdateWriteResult): void {
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.write);
  console.log("=".repeat(60));
  console.log(p("写入状态", WRITE_LABELS.writeStatus[updateWriteResult.writeStatus] || updateWriteResult.writeStatus));
  if (updateWriteResult.targetFeatureId && updateWriteResult.targetFeatureLabel) {
    console.log(p("目标 Feature", `${updateWriteResult.targetFeatureLabel} (${updateWriteResult.targetFeatureId})`));
  }
  console.log(p("写入模式", WRITE_LABELS.writeMode[updateWriteResult.writeMode] || updateWriteResult.writeMode));
  console.log(p("写入原因", updateWriteResult.writeReason));
  if (updateWriteResult.touchedOutputs.length > 0) {
    console.log("   影响输出:");
    for (const output of updateWriteResult.touchedOutputs) {
      const outputKind = WRITE_LABELS.outputKind[output.outputKind] || output.outputKind;
      const status = WRITE_LABELS.outputStatus[output.status] || output.status;
      console.log(`      - [${status}] ${outputKind}: ${output.outputPath}`);
      console.log(`        ${output.description}`);
    }
  } else {
    console.log("   影响输出: (无)");
  }
  if (updateWriteResult.nextHint) {
    console.log(p("下一步建议", updateWriteResult.nextHint));
  }
  console.log(p("允许重试", updateWriteResult.canRetry ? "是" : "否"));
  console.log("=".repeat(60));
}

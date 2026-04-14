import type {
  UpdateHandoff,
  FeatureFocus,
  FeatureCard,
  ConflictCheckResult,
  FeatureOwnership,
  UpdateHandler,
  UpdateDryRunPlan,
  UpdateWriteResult,
  GovernanceRelease,
  ConfirmationAction,
  ActualWriteResult,
  TouchedOutput,
} from "./types.js";

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { loadWorkspace, saveWorkspace } from "../../core/workspace/manager.js";

export function createUpdateDryRunPlan(
  handlerStatus: UpdateHandler["status"],
  targetFeatureId: string | null,
  targetFeatureLabel: string | null,
  featureOwnership: FeatureOwnership | undefined,
  conflictResult: ConflictCheckResult,
  featureCard: FeatureCard,
  options?: { forceValidation?: boolean; confirmationAction?: ConfirmationAction }
): UpdateDryRunPlan | undefined {
  if (handlerStatus !== "ready_for_dry_run") {
    return undefined;
  }

  const isForcedValidation = options?.forceValidation ?? false;
  const hasConflict = conflictResult?.hasConflict ?? false;
  // T418-R2: Check if confirmation has released to ready
  const isConfirmed = options?.confirmationAction?.transitionResult === "released_to_ready";
  
  // WB-R1B: Fix affectedSurfaces construction from actual available data
  // Use featureOwnership.expectedSurfaces if available, otherwise derive from featureCard
  const surfaces = featureOwnership?.expectedSurfaces ?? [];
  
  // If no ownership surfaces but featureCard has meaningful status, create minimal surface
  const effectiveSurfaces = surfaces.length > 0 
    ? surfaces 
    : ["ability" as const]; // Minimal fallback for valid update case

  const affectedSurfaces = effectiveSurfaces.map((surface, i) => ({
    surfaceKind: surface,
    surfaceId: `surface_${i}`,
    description: `Affects ${surface} surface`,
    riskLevel: (hasConflict ? "high" : "medium") as "low" | "medium" | "high",
  }));

  // T418-R2: Normal path confirmation can now proceed without force validation
  // If confirmed (transitionResult === "released_to_ready"), canProceed should be true
  const canProceed = isForcedValidation || isConfirmed || !hasConflict;

  // T418-R2: planStatus reflects confirmation state
  const planStatus: UpdateDryRunPlan["planStatus"] = isForcedValidation 
    ? "planning_ready" 
    : isConfirmed
      ? "planning_ready"
      : hasConflict 
        ? "planning_blocked" 
        : "planning_ready";

  return {
    planStatus,
    targetFeatureId: targetFeatureId || "unknown",
    targetFeatureLabel: targetFeatureLabel || "未知",
    operationType: "modify_existing",
    affectedSurfaces,
    // T418-R2: planningReason reflects confirmation state for normal path
    planningReason: isForcedValidation
      ? "【强制验证模式】预演计划生成（绕过治理检查）"
      : isConfirmed
        ? "【确认完成】预演计划生成，所有确认项已解决"
        : hasConflict
          ? "预演计划生成完成，但存在冲突需要解决"
          : "预演计划生成完成，可以进入 dry-run 流程",
    nextHint: canProceed
      ? "预演计划已就绪，可以执行"
      : "请先解决冲突后再继续",
    canProceed,
  };
}

export function createBlockedDryRunPlan(
  handlerStatus: UpdateHandler["status"],
  targetFeatureId: string | null,
  targetFeatureLabel: string | null,
  handlerReason: string
): UpdateDryRunPlan {
  return {
    planStatus: handlerStatus === "not_applicable" ? "planning_not_applicable" : "planning_blocked",
    targetFeatureId: targetFeatureId || "unknown",
    targetFeatureLabel: targetFeatureLabel || "未知",
    operationType: "no_op",
    affectedSurfaces: [],
    planningReason: handlerReason,
    nextHint: "当前无法生成预演计划，请先满足进入条件",
    canProceed: false,
  };
}

export function createUpdateHandler(
  updateHandoff: UpdateHandoff,
  featureFocus: FeatureFocus,
  featureCard: FeatureCard,
  conflictResult: ConflictCheckResult,
  featureOwnership: FeatureOwnership | undefined,
  options?: { forceValidation?: boolean; confirmationAction?: ConfirmationAction }
): UpdateHandler {
  const handoffStatus = updateHandoff.status;
  const focusType = featureFocus.focusType;
  const cardStatus = featureCard.status;
  const hasConflicts = conflictResult.hasConflict;
  const needsConfirmation = featureCard.needsConfirmation;
  const isForcedValidation = options?.forceValidation ?? false;
  const isConfirmed = options?.confirmationAction?.transitionResult === "released_to_ready";

  let status: UpdateHandler["status"];
  let targetFeatureId: string | null = null;
  let targetFeatureLabel: string | null = null;
  let handlerReason: string;
  let confidence: "high" | "medium" | "low";
  let nextHint: string | null;
  let dryRunEnabled: boolean;

  if (handoffStatus === "direct_target" && updateHandoff.targetFeatureId) {
    if (isForcedValidation) {
      status = "ready_for_dry_run";
      targetFeatureId = updateHandoff.targetFeatureId;
      targetFeatureLabel = updateHandoff.targetFeatureLabel ?? null;
      handlerReason = "【强制验证模式】已绕过治理阻塞，进入 dry-run 准备状态";
      confidence = "high";
      nextHint = "强制验证模式已启用";
      dryRunEnabled = true;
    } else if ((hasConflicts && needsConfirmation && !isConfirmed) || (cardStatus === "blocked" && !isConfirmed)) {
      status = "blocked_waiting_confirmation";
      targetFeatureId = updateHandoff.targetFeatureId;
      targetFeatureLabel = updateHandoff.targetFeatureLabel ?? null;
      handlerReason = "存在冲突或需要确认，无法直接进入 dry-run";
      confidence = "medium";
      nextHint = "请先解决冲突或完成确认";
      dryRunEnabled = false;
    } else {
      status = "ready_for_dry_run";
      targetFeatureId = updateHandoff.targetFeatureId;
      targetFeatureLabel = updateHandoff.targetFeatureLabel ?? null;
      handlerReason = "已确定清晰的更新目标，可以进入 dry-run";
      confidence = "high";
      nextHint = "可以开始 dry-run 流程";
      dryRunEnabled = true;
    }
  } else if (handoffStatus === "candidate_target" && updateHandoff.targetFeatureId) {
    status = "blocked_waiting_target";
    targetFeatureId = updateHandoff.targetFeatureId;
    targetFeatureLabel = updateHandoff.targetFeatureLabel ?? null;
    handlerReason = "更新目标为候选匹配，需要用户确认";
    confidence = "medium";
    nextHint = "请确认具体目标";
    dryRunEnabled = false;
  } else if (focusType === "newly_created") {
    status = "not_applicable";
    targetFeatureId = null;
    targetFeatureLabel = null;
    handlerReason = "当前为新建 feature，update handler 不适用";
    confidence = "high";
    nextHint = "请使用 create 流程";
    dryRunEnabled = false;
  } else if (focusType === "runtime_only") {
    status = "blocked_waiting_target";
    targetFeatureId = featureFocus.featureId ?? null;
    targetFeatureLabel = featureFocus.featureLabel ?? null;
    handlerReason = "Feature 仅存在于运行时会话";
    confidence = "low";
    nextHint = "请先持久化 feature";
    dryRunEnabled = false;
  } else {
    status = "not_applicable";
    targetFeatureId = null;
    targetFeatureLabel = null;
    handlerReason = "当前状态不满足进入 update handler 的条件";
    confidence = "low";
    nextHint = "请检查 feature 状态";
    dryRunEnabled = false;
  }

  // T418-R2: Pass confirmationAction to createUpdateDryRunPlan for normal path state transition
  const updatePlan = dryRunEnabled
    ? createUpdateDryRunPlan(status, targetFeatureId, targetFeatureLabel, featureOwnership, conflictResult, featureCard, { forceValidation: isForcedValidation, confirmationAction: options?.confirmationAction })
    : createBlockedDryRunPlan(status, targetFeatureId, targetFeatureLabel, handlerReason);

  return {
    status,
    targetFeatureId: targetFeatureId ?? undefined,
    targetFeatureLabel: targetFeatureLabel ?? undefined,
    handlerReason,
    confidence,
    nextHint,
    dryRunEnabled,
    updatePlan,
  };
}

export function createUpdateWriteResult(
  updatePlan: UpdateDryRunPlan | undefined,
  updateHandler: UpdateHandler,
  conflictResult: ConflictCheckResult,
  options: { hostRoot: string; dryRun?: boolean; confirmationAction?: ConfirmationAction }
): UpdateWriteResult {
  const FORCE_UPDATE_WRITE = process.env.RW_FORCE_UPDATE_WRITE === "1" || process.env.RW_FORCE_UPDATE_WRITE === "true";
  const isForcedValidation = FORCE_UPDATE_WRITE && !options.dryRun;
  // T418-R3: Check if normal-path confirmation has released to ready
  const isConfirmed = options.confirmationAction?.transitionResult === "released_to_ready";

  if (!updatePlan) {
    return {
      writeStatus: "not_applicable",
      targetFeatureId: updateHandler.targetFeatureId || "unknown",
      targetFeatureLabel: updateHandler.targetFeatureLabel || "未知",
      writeMode: "blocked",
      touchedOutputs: [],
      writeReason: "没有可用的更新预演计划",
      nextHint: "请先确保 update handler 生成了有效的预演计划",
      canRetry: true,
    };
  }

  if (!updatePlan.canProceed && !isForcedValidation) {
    return {
      writeStatus: "blocked_by_plan",
      targetFeatureId: updatePlan.targetFeatureId,
      targetFeatureLabel: updatePlan.targetFeatureLabel,
      writeMode: "blocked",
      touchedOutputs: [],
      writeReason: "预演计划显示当前条件不满足",
      nextHint: updatePlan.nextHint || "请解决阻塞条件",
      canRetry: true,
    };
  }

  // T418-R3: Normal-path confirmation can bypass conflict block
  // But still preserve target checks and workspace checks
  if (conflictResult.hasConflict && !isForcedValidation && !isConfirmed) {
    return {
      writeStatus: "blocked_by_conflict",
      targetFeatureId: updatePlan.targetFeatureId,
      targetFeatureLabel: updatePlan.targetFeatureLabel,
      writeMode: "blocked",
      touchedOutputs: [],
      writeReason: "存在未解决的冲突",
      nextHint: "请先解决冲突",
      canRetry: true,
    };
  }

  if (options.dryRun) {
    return {
      writeStatus: "simulated",
      targetFeatureId: updatePlan.targetFeatureId,
      targetFeatureLabel: updatePlan.targetFeatureLabel,
      writeMode: "dry_run",
      touchedOutputs: updatePlan.affectedSurfaces.map(surface => ({
        outputKind: surface.surfaceKind,
        outputPath: "preview://" + surface.surfaceKind,
        description: "模拟：" + surface.description,
        status: "unchanged" as const,
      })),
      writeReason: "当前处于模拟模式，仅展示预期影响面预览",
      nextHint: "这是预写入状态预览",
      canRetry: true,
    };
  }

  const actualWriteResult = executeActualUpdateWrite(
    updatePlan,
    options.hostRoot,
    updatePlan.targetFeatureId
  );

  if (actualWriteResult.success) {
    // T418-R3: Distinguish normal-path confirmation from forced validation in write result
    const writeStatus = isForcedValidation ? "forced_validation_write" : "written";
    const writeMode = isForcedValidation ? "forced_validation" : isConfirmed ? "actual" : "actual";
    const writeReason = isForcedValidation
      ? "【强制验证模式】已执行验证写入（绕过治理阻塞，非产品正常路径）"
      : isConfirmed
        ? "【确认完成】所有确认项已解决，成功执行更新写入"
        : "已确认满足写入条件，成功执行更新写入";
    const nextHint = isForcedValidation
      ? "验证完成，请检查 .update.json 和 workspace 更新。注意：这是强制验证，非正常使用流程"
      : isConfirmed
        ? "确认完成并写入成功，可通过 workspace 查看更新后的 feature 状态"
        : "写入完成，可通过 workspace 查看更新后的 feature 状态";

    return {
      writeStatus,
      targetFeatureId: updatePlan.targetFeatureId,
      targetFeatureLabel: updatePlan.targetFeatureLabel,
      writeMode,
      touchedOutputs: actualWriteResult.touchedOutputs,
      writeReason,
      nextHint,
      canRetry: false,
    };
  } else {
    return {
      writeStatus: "write_failed",
      targetFeatureId: updatePlan.targetFeatureId,
      targetFeatureLabel: updatePlan.targetFeatureLabel,
      writeMode: "blocked",
      touchedOutputs: actualWriteResult.touchedOutputs,
      writeReason: isForcedValidation
        ? `【强制验证模式】验证写入失败：${actualWriteResult.error || "未知错误"}`
        : isConfirmed
          ? `【确认完成】但写入失败：${actualWriteResult.error || "未知错误"}`
          : `写入失败：${actualWriteResult.error || "未知错误"}`,
      nextHint: "请检查文件系统权限或 workspace 状态后重试",
      canRetry: true,
    };
  }
}

export function executeActualUpdateWrite(
  updatePlan: UpdateDryRunPlan,
  hostRoot: string,
  featureId: string
): ActualWriteResult {
  const touchedOutputs: TouchedOutput[] = [];
  const timestamp = new Date().toISOString();

  try {
    const runeWeaverDir = join(hostRoot, "game", "scripts", "src", "rune_weaver");
    if (!existsSync(runeWeaverDir)) {
      mkdirSync(runeWeaverDir, { recursive: true });
    }

    const updateMetaPath = join(runeWeaverDir, `${featureId}.update.json`);
    const updateMeta = {
      featureId,
      updatedAt: timestamp,
      planStatus: updatePlan.planStatus,
      operationType: updatePlan.operationType,
      affectedSurfaces: updatePlan.affectedSurfaces.map(s => s.surfaceKind),
      version: "0.1"
    };

    writeFileSync(updateMetaPath, JSON.stringify(updateMeta, null, 2), "utf-8");
    touchedOutputs.push({
      outputKind: "data",
      outputPath: updateMetaPath,
      description: "更新元数据文件",
      status: "created"
    });

    const workspaceResult = loadWorkspace(hostRoot);
    if (!workspaceResult.success || !workspaceResult.workspace) {
      return {
        success: false,
        touchedOutputs,
        error: "无法加载 workspace，更新写入失败"
      };
    }

    const workspace = workspaceResult.workspace;
    const existingFeature = workspace.features.find(f => f.featureId === featureId);

    if (!existingFeature) {
      return {
        success: false,
        touchedOutputs,
        error: `更新目标 feature '${featureId}' 不存在于 workspace 中，无法执行更新操作`
      };
    }

    existingFeature.updatedAt = timestamp;
    existingFeature.revision += 1;
    if (!existingFeature.generatedFiles.includes(updateMetaPath)) {
      existingFeature.generatedFiles.push(updateMetaPath);
    }

    const saveResult = saveWorkspace(hostRoot, workspace);
    if (!saveResult.success) {
      return {
        success: false,
        touchedOutputs,
        error: `workspace 保存失败: ${saveResult.issues.join(", ")}`
      };
    }

    touchedOutputs.push({
      outputKind: "config",
      outputPath: join(hostRoot, "rune-weaver.workspace.json"),
      description: "工作区状态文件",
      status: "modified"
    });

    return {
      success: true,
      touchedOutputs
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      touchedOutputs,
      error: errorMessage
    };
  }
}

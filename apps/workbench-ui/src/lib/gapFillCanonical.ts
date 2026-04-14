export type GapFillProductStatusLike =
  | "ready_to_apply"
  | "needs_confirmation"
  | "blocked_by_host"
  | "blocked_by_policy";

export interface CanonicalGapFillGuidance {
  classification: "canonical" | "exploratory";
  title: string;
  summary: string;
  nextStep: string;
  evidenceMode: "acceptance" | "exploratory";
  expectedPrompt: string;
  expectedBoundary: string;
}

export interface CanonicalAcceptanceStatus {
  classification:
    | "canonical_acceptance_ready"
    | "canonical_but_incomplete"
    | "exploratory";
  summary: string;
  nextStep: string;
}

export interface GapFillContinuationStateInput {
  status?: GapFillProductStatusLike;
  validationSucceeded: boolean;
  hostReady: boolean;
}

export interface GapFillContinuationState {
  showContinuationRail: boolean;
  canLaunchHost: boolean;
  nextStep: string;
}

export const TALENT_DRAW_CANONICAL_PROMPT =
  "把稀有度映射改成 R / SR / SSR / UR 分别提供 1 / 2 / 4 / 7 点全属性，并保留现有触发键、桥接、事件通道和 UI 交互。";

export const TALENT_DRAW_CANONICAL_BOUNDARY = "selection_flow.effect_mapping";

export const TALENT_DRAW_CANONICAL_CONTINUATION_ORDER = [
  "create skeleton",
  "gap-fill review",
  "confirmation/apply",
  "validate",
  "repair-build",
  "launch",
] as const;

function normalizeInstruction(instruction?: string): string {
  return (instruction || "").replace(/\s+/gu, " ").trim();
}

export function isTalentDrawCanonicalGapFill(
  boundaryId?: string,
  instruction?: string,
): boolean {
  return (
    (boundaryId || "").trim() === TALENT_DRAW_CANONICAL_BOUNDARY &&
    normalizeInstruction(instruction) === normalizeInstruction(TALENT_DRAW_CANONICAL_PROMPT)
  );
}

export function deriveGapFillContinuationState(
  input: GapFillContinuationStateInput,
): GapFillContinuationState {
  const { status, validationSucceeded, hostReady } = input;
  const showContinuationRail =
    status === "ready_to_apply" && validationSucceeded;

  if (!showContinuationRail) {
    return {
      showContinuationRail: false,
      canLaunchHost: false,
      nextStep: "先完成应用与校验，再进入构建和启动。",
    };
  }

  if (!hostReady) {
    return {
      showContinuationRail: true,
      canLaunchHost: false,
      nextStep: "先执行修复并构建，等宿主产物补齐后再启动宿主。",
    };
  }

  return {
    showContinuationRail: true,
    canLaunchHost: true,
    nextStep: "继续执行修复并构建，然后启动宿主并采集运行时证据。",
  };
}

export function buildCanonicalGapFillGuidance(input: {
  boundaryId?: string;
  instruction?: string;
  status?: GapFillProductStatusLike;
  approvalFile?: string;
  validationSucceeded?: boolean;
  hostReady?: boolean;
}): CanonicalGapFillGuidance {
  const {
    boundaryId,
    instruction,
    status,
    approvalFile,
    validationSucceeded = false,
    hostReady = false,
  } = input;

  const isCanonical = isTalentDrawCanonicalGapFill(boundaryId, instruction);
  if (!isCanonical) {
    return {
      classification: "exploratory",
      title: "当前是探索性运行",
      summary:
        "这次输入没有命中冻结的 Talent Draw canonical prompt 和 boundary，结果只能记为 exploratory evidence。",
      nextStep:
        "如需 acceptance evidence，请切回固定 prompt 和 selection_flow.effect_mapping 边界。",
      evidenceMode: "exploratory",
      expectedPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      expectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    };
  }

  if (status === "blocked_by_policy") {
    return {
      classification: "canonical",
      title: "Canonical 演示被策略拦住",
      summary:
        "你正在走 Talent Draw canonical 路径，但当前 patch 触碰了受保护结构，不能记为 acceptance evidence。",
      nextStep: "缩小指令范围，只保留 effect mapping 的业务逻辑改动。",
      evidenceMode: "acceptance",
      expectedPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      expectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    };
  }

  if (status === "blocked_by_host") {
    return {
      classification: "canonical",
      title: "Canonical 演示宿主未就绪",
      summary:
        "canonical 的业务逻辑边界是对的，但当前宿主还没有准备好，不能直接进入 acceptance 采证。",
      nextStep: "先修复宿主阻塞项，再继续 canonical review/apply 流程。",
      evidenceMode: "acceptance",
      expectedPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      expectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    };
  }

  if (status === "needs_confirmation") {
    return {
      classification: "canonical",
      title: "Canonical 演示等待确认",
      summary:
        "当前已经命中冻结的 Talent Draw canonical 输入，下一步是阅读审批单元并确认应用。",
      nextStep: approvalFile
        ? "先确认审批单元，再应用补丁。"
        : "重新生成 review，拿到 approval file 后再应用补丁。",
      evidenceMode: "acceptance",
      expectedPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      expectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    };
  }

  if (validationSucceeded) {
    return {
      classification: "canonical",
      title: "Canonical 演示可进入 acceptance 收尾",
      summary:
        "当前 canonical 的 apply + validate 已完成，接下来只剩 repair-build、launch 和运行时采证。",
      nextStep: hostReady
        ? "执行修复并构建，然后启动宿主并采集 Workbench 与游戏内证据。"
        : "先执行修复并构建，等宿主 ready 后再启动宿主并采集证据。",
      evidenceMode: "acceptance",
      expectedPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      expectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    };
  }

  if (status === "ready_to_apply") {
    return {
      classification: "canonical",
      title: "Canonical 演示可继续应用",
      summary:
        "当前已经命中冻结的 Talent Draw canonical 输入，下一步应完成补丁应用与应用后校验。",
      nextStep: "先应用补丁，再执行校验结果。",
      evidenceMode: "acceptance",
      expectedPrompt: TALENT_DRAW_CANONICAL_PROMPT,
      expectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
    };
  }

  return {
    classification: "canonical",
    title: "Canonical 演示待开始",
    summary:
      "当前输入已经匹配 Talent Draw canonical prompt 和 boundary。先生成 review，拿到 authority payload。",
    nextStep: "先生成评审，再按 confirmation/apply -> validate -> repair-build -> launch 的顺序继续。",
    evidenceMode: "acceptance",
    expectedPrompt: TALENT_DRAW_CANONICAL_PROMPT,
    expectedBoundary: TALENT_DRAW_CANONICAL_BOUNDARY,
  };
}

export function deriveCanonicalAcceptanceStatus(input: {
  boundaryId?: string;
  instruction?: string;
  status?: GapFillProductStatusLike;
  validationSucceeded?: boolean;
  hostReady?: boolean;
  continuationVisible?: boolean;
}): CanonicalAcceptanceStatus {
  const {
    boundaryId,
    instruction,
    status,
    validationSucceeded = false,
    hostReady = false,
    continuationVisible = false,
  } = input;

  if (!isTalentDrawCanonicalGapFill(boundaryId, instruction)) {
    return {
      classification: "exploratory",
      summary: "当前判定：探索性运行",
      nextStep: "如需验收链路，请切回冻结的 Talent Draw 指令和固定边界。",
    };
  }

  const readyForAcceptance =
    status === "ready_to_apply" &&
    validationSucceeded &&
    continuationVisible &&
    hostReady;

  if (readyForAcceptance) {
    return {
      classification: "canonical_acceptance_ready",
      summary: "当前判定：可进入验收收尾",
      nextStep: "继续执行修复并构建、启动宿主，并补齐运行时证据。",
    };
  }

  return {
    classification: "canonical_but_incomplete",
    summary: "当前判定：标准案例未完成",
    nextStep: "先补齐 apply、validate、宿主 readiness 或 continuation 条件，再进入验收收尾。",
  };
}

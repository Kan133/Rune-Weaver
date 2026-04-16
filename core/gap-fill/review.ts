import type {
  GapDescriptor,
  GapFillBoundaryInfo,
  GapFillApplyResult,
  GapFillDecisionRecord,
  GapFillDecisionResult,
  GapFillFailureCategory,
  GapFillMode,
  GapFillPlanMetadata,
  GapFillRunResult,
  GapFillTargetFile,
} from "./types.js";
import { evaluateGapFillDecision } from "./decision.js";
import { validateAppliedGapFill } from "./validation.js";

export interface GapFillArtifact {
  version: string;
  generatedAt: string;
  command: "gap-fill";
  mode: GapFillMode;
  boundaryId: string;
  hostRoot: string;
  instruction: string;
  targetFile: string;
  allowed: string[];
  forbidden: string[];
  descriptor: GapDescriptor;
  llm: {
    configured: boolean;
    provider?: string;
    baseUrl?: string;
    model?: string;
    thinking?: "enabled" | "disabled";
    temperature?: number;
    configSource?: ".env";
    apiKeyPresent?: boolean;
    apiKeyFingerprint?: string;
  };
  decisionRecord: GapFillDecisionRecord;
  decision: GapFillDecisionResult;
  dryRun: {
    success: boolean;
    summary: string;
    issues: string[];
    patchPlan?: GapFillRunResult["patchPlan"];
  };
  runnerIssues: string[];
  runnerIssueDetails: Array<{
    kind: "config" | "authentication" | "request" | "unknown";
    message: string;
  }>;
  apply: {
    requested: boolean;
    attempted: boolean;
    success: boolean;
    issues: string[];
    targetPath?: string;
  };
  planMetadata?: GapFillPlanMetadata;
  validation: ReturnType<typeof validateAppliedGapFill>;
  failureCategories: GapFillFailureCategory[];
  gapFillStatus: "ready_to_apply" | "needs_confirmation" | "blocked_by_host" | "blocked_by_policy";
  recommendedNextStep?: string;
}

export interface GapFillArtifactInput {
  mode: GapFillMode;
  hostRoot: string;
  instruction: string;
  boundary: GapFillBoundaryInfo;
  targetFile: GapFillTargetFile;
  llmConfigured: boolean;
  llmProvider?: string;
  llmBaseUrl?: string;
  llmModel?: string;
  llmThinking?: "enabled" | "disabled";
  llmTemperature?: number;
  llmConfigSource?: ".env";
  llmApiKeyPresent?: boolean;
  llmApiKeyFingerprint?: string;
  runResult: GapFillRunResult;
  applyRequested: boolean;
  applyResult?: GapFillApplyResult;
  decision?: GapFillDecisionResult;
  assumptionsMade?: string[];
  userInputsUsed?: string[];
  inferredInputsUsed?: string[];
  descriptorSource?: GapDescriptor["source"];
  canonicalAssistUsed?: boolean;
  recommendedNextStep?: string;
}

export function buildGapFillArtifact(input: GapFillArtifactInput): GapFillArtifact {
  const decision = input.decision ?? evaluateGapFillDecision({
    boundary: input.boundary,
    patchPlan: input.runResult.patchPlan,
    runResult: input.runResult,
    applyRequested: input.applyRequested,
  });

  const applyIssues = input.applyResult?.issues ?? [];
  const blockedApplyIssues = input.applyRequested && decision.decision !== "auto_apply"
    ? [
        `Gap-fill apply blocked by decision: ${decision.decision}`,
        ...decision.reasons.map((reason) => `[${reason.code}] ${reason.message}`),
      ]
    : [];
  const validation = validateAppliedGapFill({
    boundary: input.boundary,
    request: {
      mode: input.mode,
      requestedBoundaryId: input.boundary.id,
      approvedBoundaryId: input.applyRequested ? input.boundary.id : undefined,
      targetFile: input.targetFile.path,
    },
    patchPlan: input.runResult.patchPlan,
    applyResult: input.applyResult
      ? {
          requested: input.applyRequested,
          attempted: input.applyRequested,
          success: input.applyResult.success,
          boundaryId: input.boundary.id,
          targetFile: input.targetFile.path,
          targetPath: input.applyResult.targetPath,
          appliedOperations: input.applyResult.appliedOperations,
          issues: input.applyResult.issues,
        }
      : undefined,
    decision,
  });
  const descriptor: GapDescriptor = {
    id: input.boundary.id,
    label: input.boundary.label,
    status: decision.decision === "reject"
      ? "blocked"
      : decision.decision === "require_confirmation"
        ? "needs_confirmation"
        : "ready",
    source: input.descriptorSource ?? "inferred",
    boundary: input.boundary,
    targetFile: input.targetFile.path,
    assumptionsMade: input.assumptionsMade ?? [],
    userInputsUsed: input.userInputsUsed ?? [input.instruction],
    inferredInputsUsed: input.inferredInputsUsed ?? [],
    canonicalAssistUsed: input.canonicalAssistUsed ?? false,
    descriptorKind: input.boundary.descriptorKind ?? "closed",
    scope: input.boundary.scope ?? "binding",
    slotDescriptor: input.boundary.slotDescriptor,
    planMetadata: validation.planMetadata,
    tags: input.boundary.tags,
  };
  const decisionRecord: GapFillDecisionRecord = {
    requestedBoundaryId: input.boundary.id,
    requestedBoundaryLabel: input.boundary.label,
    targetFile: input.targetFile.path,
    originalInstruction: input.instruction,
    source: descriptor.source,
    canonicalAssistUsed: descriptor.canonicalAssistUsed,
    assumptionsMade: descriptor.assumptionsMade,
    userInputsUsed: descriptor.userInputsUsed,
    inferredInputsUsed: descriptor.inferredInputsUsed,
    approvalDecision: decision.decision,
    failureCategories: decision.failureCategories,
    recommendedNextStep: input.recommendedNextStep,
    planMetadata: validation.planMetadata,
  };
  const gapFillStatus =
    decision.failureCategories.includes("policy_reject")
      ? "blocked_by_policy"
      : decision.decision === "require_confirmation"
        ? "needs_confirmation"
        : "ready_to_apply";
  return {
    version: "2.0",
    generatedAt: new Date().toISOString(),
    command: "gap-fill",
    mode: input.mode,
    boundaryId: input.boundary.id,
    hostRoot: input.hostRoot,
    instruction: input.instruction,
    targetFile: input.targetFile.path,
    allowed: input.boundary.allowed,
    forbidden: input.boundary.forbidden,
    descriptor,
    llm: {
      configured: input.llmConfigured,
      provider: input.llmProvider,
      baseUrl: input.llmBaseUrl,
      model: input.llmModel,
      thinking: input.llmThinking,
      temperature: input.llmTemperature,
      configSource: input.llmConfigSource,
      apiKeyPresent: input.llmApiKeyPresent,
      apiKeyFingerprint: input.llmApiKeyFingerprint,
    },
    decisionRecord,
    decision,
    dryRun: {
      success: input.runResult.success,
      summary: input.runResult.summary,
      issues: input.runResult.issues,
      patchPlan: input.runResult.patchPlan,
    },
    runnerIssues: input.runResult.issues,
    runnerIssueDetails: input.runResult.issues.map((issue) => {
      const match = issue.match(/^\[(config|authentication|request|unknown)\]\s*/);
      return {
        kind: (match?.[1] as "config" | "authentication" | "request" | "unknown") ?? "unknown",
        message: issue.replace(/^\[(config|authentication|request|unknown)\]\s*/, ""),
      };
    }),
    planMetadata: validation.planMetadata,
    apply: {
      requested: input.applyRequested,
      attempted: !!input.applyResult,
      success: input.applyResult?.success ?? false,
      issues: [...applyIssues, ...blockedApplyIssues],
      targetPath: input.applyResult?.targetPath,
    },
    validation,
    failureCategories: validation.failureCategories,
    gapFillStatus,
    recommendedNextStep: input.recommendedNextStep ?? validation.recommendedNextStep,
  };
}

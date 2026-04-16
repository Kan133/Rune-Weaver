import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import {
  createLLMClientFromEnv,
  isLLMConfigured,
  maskLLMApiKey,
  readLLMExecutionConfig,
  readLLMEnvironment,
} from "../../../../core/llm/index.js";
import type { LLMClient } from "../../../../core/llm/index.js";
import { LLMConfigError, LLMRequestError } from "../../../../core/llm/index.js";
import {
  applyGapFillPatchPlan,
  createGapFillApprovalToken,
  evaluateGapFillDecision,
  formatGapFillApplySummary,
  formatGapFillApprovalSummary,
  formatGapFillConsoleSummary,
  formatGapFillDecisionSummary,
  getGapFillErrorMessage,
  getGapFillRetryDelayMs,
  isTransientGapFillError,
  runGapFillPlan,
  sleep,
  validateAppliedGapFill,
  validateGapFillApprovalRecord,
} from "../../../../core/gap-fill/index.js";
import type {
  GapFillDecisionResult,
  GapFillMode,
  GapFillRunResult,
} from "../../../../core/gap-fill/index.js";
import {
  dota2GapFillBoundaryProvider,
  resolveDota2GapFillBoundaryIdsForPatterns,
} from "../../../../adapters/dota2/gap-fill/boundaries.js";
import { loadWorkspace } from "../../../../core/workspace/index.js";
import { persistGapFillArtifact } from "../gap-fill-artifact.js";
import { loadGapFillApprovalRecord, saveGapFillApprovalRecord } from "../gap-fill-approval.js";
import type { Dota2CLIOptions } from "../../../dota2-cli.js";

function resolveBoundaryFromFeature(
  hostRoot: string,
  featureId: string | undefined,
  requestedBoundaryId: string | undefined,
): { boundaryId?: string; issues: string[] } {
  if (requestedBoundaryId) {
    return { boundaryId: requestedBoundaryId, issues: [] };
  }

  if (!featureId) {
    return {
      issues: [
        "Missing --boundary <id>. You can also pass --feature <id> if the workspace already records exactly one applicable gap-fill boundary for that feature.",
      ],
    };
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    return {
      issues: [
        "Unable to load workspace to resolve gap-fill boundary from feature.",
        ...(workspaceResult.issues || []),
      ],
    };
  }

  const feature = workspaceResult.workspace.features.find((item) => item.featureId === featureId);
  if (!feature) {
    return {
      issues: [`Feature '${featureId}' was not found in the workspace.`],
    };
  }

  const boundaries = (feature.gapFillBoundaries && feature.gapFillBoundaries.length > 0)
    ? feature.gapFillBoundaries
    : resolveDota2GapFillBoundaryIdsForPatterns(feature.selectedPatterns || []);
  if (boundaries.length === 0) {
    return {
      issues: [
        `Feature '${featureId}' does not record any gap-fill-ready boundaries yet.`,
        "This usually means the generated skeleton does not expose a business-logic fill boundary for the selected patterns.",
      ],
    };
  }

  if (boundaries.length > 1) {
    return {
      issues: [
        `Feature '${featureId}' has multiple gap-fill boundaries. Pick one with --boundary:`,
        ...boundaries.map((boundaryId) => `- ${boundaryId}`),
      ],
    };
  }

  return { boundaryId: boundaries[0], issues: [] };
}

function classifyRunnerError(error: unknown): "config" | "authentication" | "request" | "unknown" {
  if (error instanceof LLMConfigError) {
    return "config";
  }

  if (error instanceof LLMRequestError) {
    if (/invalid authentication|unauthorized|invalid api key|authentication/i.test(error.message)) {
      return "authentication";
    }
    return "request";
  }

  const message = getGapFillErrorMessage(error);
  if (/invalid authentication|unauthorized|invalid api key|authentication/i.test(message)) {
    return "authentication";
  }
  return "unknown";
}

function resolveGapFillMode(options: Dota2CLIOptions): GapFillMode {
  if (options.gapFillMode) {
    return options.gapFillMode;
  }
  if (options.approvalFile || options.apply) {
    return "apply";
  }
  return "review";
}

function buildAssumptions(instruction: string): string[] {
  const assumptions: string[] = [];
  if (!/\b(F\d+|Q|W|E|R)\b/i.test(instruction)) {
    assumptions.push("Keep existing trigger key and bridge/event wiring unchanged.");
  }
  if (!/\bpersist|save|session\b/i.test(instruction)) {
    assumptions.push("Do not introduce persistence or session ownership changes.");
  }
  return assumptions;
}

function buildRecommendedNextStep(mode: GapFillMode, decision: GapFillDecisionResult, applySucceeded: boolean): string {
  if (mode === "review") {
    if (decision.decision === "auto_apply") {
      return "Patch is ready. Continue with apply, then repair/build and launch.";
    }
    if (decision.decision === "require_confirmation") {
      return "Review the approval record, then run gap-fill apply with that approval file.";
    }
    return "Clarify the instruction or narrow the requested boundary before retrying.";
  }

  if (mode === "apply") {
    return applySucceeded
      ? "Apply finished. Continue with host repair/build and launch."
      : "Apply did not finish cleanly. Resolve the write mismatch or approval issue before continuing.";
  }

  return "Validation finished. Resolve mismatches before continuing to runtime steps.";
}

function buildRunResultFromApproval(approvalRecord: ReturnType<typeof loadGapFillApprovalRecord>): GapFillRunResult {
  return {
    success: true,
    summary: approvalRecord.patchPlan.summary,
    promptMessages: [],
    patchPlan: approvalRecord.patchPlan,
    issues: [],
  };
}

export async function runGapFillCommand(options: Dota2CLIOptions): Promise<boolean> {
  const mode = resolveGapFillMode(options);
  const resolvedBoundary = resolveBoundaryFromFeature(
    options.hostRoot,
    options.featureId,
    options.boundaryId,
  );
  const effectiveBoundaryId = resolvedBoundary.boundaryId || options.boundaryId;

  console.log("=".repeat(70));
  console.log("Rune Weaver - Dota2 Gap Fill");
  console.log("=".repeat(70));
  console.log(`\nHost: ${options.hostRoot}`);
  console.log(`Feature: ${options.featureId || "(not specified)"}`);
  console.log(`Boundary: ${effectiveBoundaryId || "(not specified)"}`);
  console.log(`Instruction: ${options.instruction || "(not specified)"}`);
  console.log(`Approval: ${options.approvalFile || "(not specified)"}`);
  console.log(`Mode: ${mode}\n`);

  if (!options.hostRoot) {
    console.error("Error: --host <path> is required");
    return false;
  }

  if (!existsSync(options.hostRoot)) {
    console.error(`Error: host path does not exist: ${options.hostRoot}`);
    return false;
  }

  if (options.approvalFile) {
    return runGapFillApprovalCommand(options, mode);
  }

  if (!effectiveBoundaryId) {
    console.error("Error: gap-fill boundary could not be resolved.");
    for (const issue of resolvedBoundary.issues) {
      console.error(`   ${issue}`);
    }
    return false;
  }

  if (!options.instruction) {
    console.error("Error: --instruction \"...\" is required");
    return false;
  }

  const boundary = dota2GapFillBoundaryProvider.getBoundary(effectiveBoundaryId);
  if (!boundary) {
    console.error(`Error: unknown gap-fill boundary '${effectiveBoundaryId}'`);
    for (const item of dota2GapFillBoundaryProvider.listBoundaries()) {
      console.error(`   - ${item.id}`);
    }
    return false;
  }

  const targetPath = resolve(process.cwd(), boundary.filePath);
  if (!existsSync(targetPath)) {
    console.error(`Error: target generator file does not exist: ${boundary.filePath}`);
    return false;
  }

  const sourceContent = readFileSync(targetPath, "utf-8");
  if (!sourceContent.includes(boundary.anchor)) {
    console.error(`Error: boundary anchor not found in target file: ${boundary.anchor}`);
    return false;
  }

  const targetFile = {
    path: boundary.filePath,
    content: sourceContent,
    lineCount: sourceContent.split(/\r?\n/).length,
    sizeBytes: Buffer.byteLength(sourceContent, "utf-8"),
  };

  const llmConfigured = isLLMConfigured(process.cwd());
  if (!llmConfigured) {
    console.error("Error: LLM is not configured.");
    return false;
  }

  const llmEnv = readLLMEnvironment(process.cwd());
  let llmExecutionConfig;
  try {
    llmExecutionConfig = readLLMExecutionConfig(process.cwd(), "gap-fill");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedResult: GapFillRunResult = {
      success: false,
      summary: "Gap-fill LLM configuration failed",
      promptMessages: [],
      issues: [message],
    };
    const artifactPath = persistGapFillArtifact({
      mode,
      hostRoot: options.hostRoot,
      instruction: options.instruction,
      boundary,
      targetFile,
      llmConfigured,
      llmProvider: llmEnv.LLM_PROVIDER,
      llmBaseUrl: llmEnv.OPENAI_BASE_URL || llmEnv.ANTHROPIC_BASE_URL,
      llmModel: llmEnv.OPENAI_MODEL || llmEnv.ANTHROPIC_MODEL,
      llmThinking: undefined,
      llmTemperature: undefined,
      llmConfigSource: ".env",
      llmApiKeyPresent: !!(llmEnv.OPENAI_API_KEY || llmEnv.ANTHROPIC_API_KEY),
      llmApiKeyFingerprint: maskLLMApiKey(llmEnv.OPENAI_API_KEY || llmEnv.ANTHROPIC_API_KEY),
      runResult: failedResult,
      applyRequested: mode === "apply",
      recommendedNextStep: "Fix the LLM workflow configuration in .env before retrying gap-fill.",
    });
    console.log(`Gap-fill artifact: ${artifactPath}`);
    console.error(`Error: gap-fill LLM configuration failed: ${message}`);
    return false;
  }
  let llmClient: LLMClient;
  try {
    llmClient = createLLMClientFromEnv(process.cwd());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedResult: GapFillRunResult = {
      success: false,
      summary: "Gap-fill LLM client creation failed",
      promptMessages: [],
      issues: [`[config] ${message}`],
    };
    const artifactPath = persistGapFillArtifact({
      mode,
      hostRoot: options.hostRoot,
      instruction: options.instruction,
      boundary,
      targetFile,
      llmConfigured,
      llmProvider: llmEnv.LLM_PROVIDER,
      llmBaseUrl: llmEnv.OPENAI_BASE_URL || llmEnv.ANTHROPIC_BASE_URL,
      llmModel: llmEnv.OPENAI_MODEL || llmEnv.ANTHROPIC_MODEL,
      llmConfigSource: ".env",
      llmApiKeyPresent: !!(llmEnv.OPENAI_API_KEY || llmEnv.ANTHROPIC_API_KEY),
      llmApiKeyFingerprint: maskLLMApiKey(llmEnv.OPENAI_API_KEY || llmEnv.ANTHROPIC_API_KEY),
      runResult: failedResult,
      applyRequested: mode === "apply",
      recommendedNextStep: "Fix the provider credentials in .env before retrying gap-fill.",
    });
    console.log(`Gap-fill artifact: ${artifactPath}`);
    console.error(`Error: failed to create LLM client: ${message}`);
    return false;
  }

  const llmProviderOptions = llmExecutionConfig.providerOptions;
  const llmTemperature = llmExecutionConfig.temperature;
  const llmThinking = llmExecutionConfig.thinking;
  const llmBaseUrl = llmEnv.OPENAI_BASE_URL || llmEnv.ANTHROPIC_BASE_URL;
  const llmApiKey = llmEnv.OPENAI_API_KEY || llmEnv.ANTHROPIC_API_KEY;
  console.log(`[gap-fill llm] provider=${llmEnv.LLM_PROVIDER || "(unset)"}`);
  console.log(`[gap-fill llm] baseUrl=${llmBaseUrl || "(unset)"}`);
  console.log(`[gap-fill llm] model=${llmExecutionConfig.model || "(unset)"}`);
  console.log(`[gap-fill llm] thinking=${llmThinking || "(unset)"}`);
  console.log(`[gap-fill llm] temperature=${llmTemperature ?? "(unset)"}`);
  console.log(`[gap-fill llm] apiKeyPresent=${llmApiKey ? "true" : "false"} fingerprint=${maskLLMApiKey(llmApiKey) || "(missing)"}`);
  const artifactBase = {
    mode,
    hostRoot: options.hostRoot,
    instruction: options.instruction,
    boundary,
    targetFile,
    llmConfigured,
    llmProvider: llmEnv.LLM_PROVIDER,
    llmBaseUrl,
    llmModel: llmExecutionConfig.model,
    llmThinking,
    llmTemperature,
    llmConfigSource: ".env" as const,
    llmApiKeyPresent: !!llmApiKey,
    llmApiKeyFingerprint: maskLLMApiKey(llmApiKey),
    assumptionsMade: buildAssumptions(options.instruction),
    userInputsUsed: [options.instruction],
    inferredInputsUsed: [],
    descriptorSource: "user_provided" as const,
    canonicalAssistUsed: false,
  };

  let result: Awaited<ReturnType<typeof runGapFillPlan>> | undefined;
  let finalRunnerError: string | undefined;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await runGapFillPlan(
        {
          projectRoot: process.cwd(),
          hostRoot: options.hostRoot,
          llmConfigured,
          instruction: options.instruction,
          boundary,
          targetFile,
          llmProvider: llmEnv.LLM_PROVIDER,
          llmModel: llmExecutionConfig.model,
          llmTemperature,
          llmProviderOptions,
        },
        { llmClient },
      );
      finalRunnerError = undefined;
      break;
    } catch (error) {
      const message = getGapFillErrorMessage(error);
      const errorKind = classifyRunnerError(error);
      finalRunnerError = `[${errorKind}] ${message}`;

      if (attempt < 3 && isTransientGapFillError(error)) {
        const delayMs = getGapFillRetryDelayMs(attempt - 1);
        console.log(`[gap-fill] retry ${attempt + 1}/3 in ${delayMs}ms after transient LLM error: ${message}`);
        await sleep(delayMs);
        continue;
      }

      break;
    }
  }

  if (!result) {
    const failedResult: GapFillRunResult = {
      success: false,
      summary: "Gap-fill LLM request failed",
      promptMessages: [],
      issues: finalRunnerError ? [finalRunnerError] : ["Unknown gap-fill LLM request failure"],
    };
    const artifactPath = persistGapFillArtifact({
      ...artifactBase,
      runResult: failedResult,
      applyRequested: mode === "apply",
      recommendedNextStep: "Fix the LLM configuration or retry after the transient request failure is resolved.",
    });
    console.log(`Gap-fill artifact: ${artifactPath}`);
    console.error(`Error: gap-fill LLM request failed: ${failedResult.issues[0]}`);
    return false;
  }

  console.log(formatGapFillConsoleSummary({ projectRoot: process.cwd(), ...artifactBase }, result));

  const decisionResult = evaluateGapFillDecision({
    boundary,
    runResult: result,
    applyRequested: mode === "apply",
    patchPlan: result.patchPlan,
  });
  console.log(formatGapFillDecisionSummary(decisionResult));

  if (!result.success) {
    const artifactPath = persistGapFillArtifact({
      ...artifactBase,
      runResult: result,
      applyRequested: mode === "apply",
      decision: decisionResult,
      recommendedNextStep: buildRecommendedNextStep(mode, decisionResult, false),
    });
    console.log(`Gap-fill artifact: ${artifactPath}`);
    for (const issue of result.issues) {
      console.error(`Error: ${issue}`);
    }
    return false;
  }

  let approvalPath: string | undefined;
  if (result.patchPlan && decisionResult.decision === "require_confirmation") {
    const { record: approvalRecord } = createGapFillApprovalToken({
      hostRoot: options.hostRoot,
      boundaryId: boundary.id,
      instruction: options.instruction,
      targetFile,
      patchPlan: result.patchPlan,
      decision: decisionResult,
      decisionRecord: {
        requestedBoundaryId: boundary.id,
        requestedBoundaryLabel: boundary.label,
        targetFile: targetFile.path,
        originalInstruction: options.instruction,
        source: "user_provided",
        canonicalAssistUsed: false,
        assumptionsMade: artifactBase.assumptionsMade,
        userInputsUsed: artifactBase.userInputsUsed,
        inferredInputsUsed: artifactBase.inferredInputsUsed,
        approvalDecision: decisionResult.decision,
        failureCategories: decisionResult.failureCategories,
        recommendedNextStep: "Approve this record before applying the patch.",
      },
    });
    approvalPath = saveGapFillApprovalRecord(approvalRecord);
    console.log(formatGapFillApprovalSummary(approvalRecord));
    console.log(`Approval record: ${approvalPath}`);
    console.log(`Approve command: npm run cli -- dota2 gap-fill --host "${options.hostRoot}" --approve "${approvalPath}" --mode apply`);
  }

  let applyResult:
    | ReturnType<typeof applyGapFillPatchPlan>
    | undefined;
  if (mode === "apply") {
    if (decisionResult.decision !== "auto_apply") {
      const artifactPath = persistGapFillArtifact({
        ...artifactBase,
        runResult: result,
        applyRequested: true,
        decision: decisionResult,
        recommendedNextStep: buildRecommendedNextStep(mode, decisionResult, false),
      });
      console.log(`Gap-fill artifact: ${artifactPath}`);
      console.error(`Error: gap-fill apply blocked by decision '${decisionResult.decision}'`);
      for (const reason of decisionResult.reasons) {
        console.error(`Error: [${reason.code}] ${reason.message}`);
      }
      return false;
    }

    applyResult = applyGapFillPatchPlan({
      projectRoot: process.cwd(),
      boundary,
      patchPlan: result.patchPlan!,
    });

    console.log(formatGapFillApplySummary(applyResult));

    const validation = validateAppliedGapFill({
      boundary,
      request: {
        mode,
        requestedBoundaryId: boundary.id,
        approvedBoundaryId: boundary.id,
        targetFile: targetFile.path,
      },
      patchPlan: result.patchPlan,
      applyResult,
      decision: decisionResult,
    });
    for (const check of validation.checks) {
      console.log(`[gap-fill validation] ${check.passed ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
    }

    const artifactPath = persistGapFillArtifact({
      ...artifactBase,
      runResult: result,
      applyRequested: true,
      applyResult,
      decision: decisionResult,
      recommendedNextStep: buildRecommendedNextStep(mode, decisionResult, applyResult.success && validation.success),
    });
    console.log(`Gap-fill artifact: ${artifactPath}`);

    if (!applyResult.success || !validation.success) {
      for (const issue of [...applyResult.issues, ...validation.issues]) {
        console.error(`Error: ${issue}`);
      }
      return false;
    }

    return true;
  }

  const artifactPath = persistGapFillArtifact({
    ...artifactBase,
    runResult: result,
    applyRequested: false,
    decision: decisionResult,
    recommendedNextStep: buildRecommendedNextStep(mode, decisionResult, false),
  });
  console.log(`Gap-fill artifact: ${artifactPath}`);
  if (approvalPath) {
    console.log(`Approval record saved: ${approvalPath}`);
  }

  return true;
}

function runGapFillApprovalCommand(options: Dota2CLIOptions, mode: GapFillMode): boolean {
  const approvalRecord = loadGapFillApprovalRecord(options.approvalFile!);
  const hostRoot = options.hostRoot || approvalRecord.hostRoot;
  const boundary = dota2GapFillBoundaryProvider.getBoundary(approvalRecord.boundaryId);

  if (!boundary) {
    console.error(`Error: unknown gap-fill boundary '${approvalRecord.boundaryId}' from approval record.`);
    return false;
  }

  const targetPath = resolve(process.cwd(), boundary.filePath);
  if (!existsSync(targetPath)) {
    console.error(`Error: target generator file does not exist: ${boundary.filePath}`);
    return false;
  }

  const sourceContent = readFileSync(targetPath, "utf-8");
  const targetFile = {
    path: boundary.filePath,
    content: sourceContent,
    lineCount: sourceContent.split(/\r?\n/).length,
    sizeBytes: Buffer.byteLength(sourceContent, "utf-8"),
  };

  console.log(formatGapFillApprovalSummary(approvalRecord));

  const approvalValidation = validateGapFillApprovalRecord({
    record: approvalRecord,
    hostRoot,
    boundary,
    targetFile,
    allowTargetFileHashChange: mode === "validate-applied",
  });
  const runResult = buildRunResultFromApproval(approvalRecord);

  if (!approvalValidation.valid) {
    const artifactPath = persistGapFillArtifact({
      mode,
      hostRoot,
      instruction: approvalRecord.instruction,
      boundary,
      targetFile,
      llmConfigured: false,
      runResult: {
        ...runResult,
        success: false,
        issues: approvalValidation.issues,
      },
      applyRequested: mode === "apply",
      decision: approvalRecord.decision,
      assumptionsMade: approvalRecord.decisionRecord?.assumptionsMade ?? [],
      userInputsUsed: approvalRecord.decisionRecord?.userInputsUsed ?? [approvalRecord.instruction],
      inferredInputsUsed: approvalRecord.decisionRecord?.inferredInputsUsed ?? [],
      descriptorSource: approvalRecord.decisionRecord?.source ?? "user_provided",
      canonicalAssistUsed: approvalRecord.decisionRecord?.canonicalAssistUsed ?? false,
      recommendedNextStep: "Refresh the approval review because the target file or patch payload changed.",
    });
    console.log(`Gap-fill artifact: ${artifactPath}`);
    console.error("Error: approval record validation failed.");
    for (const issue of approvalValidation.issues) {
      console.error(`Error: ${issue}`);
    }
    return false;
  }

  if (mode === "validate-applied") {
    const validation = validateAppliedGapFill({
      boundary,
      request: {
        mode,
        requestedBoundaryId: approvalRecord.boundaryId,
        approvedBoundaryId: approvalRecord.boundaryId,
        approvalId: approvalRecord.approvalId,
        targetFile: approvalRecord.targetFile,
      },
      patchPlan: approvalRecord.patchPlan,
      decision: approvalRecord.decision,
      currentTargetFile: targetFile,
    });
    const artifactPath = persistGapFillArtifact({
      mode,
      hostRoot,
      instruction: approvalRecord.instruction,
      boundary,
      targetFile,
      llmConfigured: false,
      runResult,
      applyRequested: false,
      decision: approvalRecord.decision,
      assumptionsMade: approvalRecord.decisionRecord?.assumptionsMade ?? [],
      userInputsUsed: approvalRecord.decisionRecord?.userInputsUsed ?? [approvalRecord.instruction],
      inferredInputsUsed: approvalRecord.decisionRecord?.inferredInputsUsed ?? [],
      descriptorSource: approvalRecord.decisionRecord?.source ?? "user_provided",
      canonicalAssistUsed: approvalRecord.decisionRecord?.canonicalAssistUsed ?? false,
      recommendedNextStep: validation.recommendedNextStep,
    });
    console.log(`Gap-fill artifact: ${artifactPath}`);
    for (const check of validation.checks) {
      console.log(`[gap-fill validation] ${check.passed ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
    }
    return validation.success;
  }

  const applyResult = applyGapFillPatchPlan({
    projectRoot: process.cwd(),
    boundary,
    patchPlan: approvalRecord.patchPlan,
  });
  console.log(formatGapFillApplySummary(applyResult));

  const validation = validateAppliedGapFill({
    boundary,
    request: {
      mode,
      requestedBoundaryId: approvalRecord.boundaryId,
      approvedBoundaryId: approvalRecord.boundaryId,
      approvalId: approvalRecord.approvalId,
      targetFile: approvalRecord.targetFile,
    },
    patchPlan: approvalRecord.patchPlan,
    applyResult,
    decision: approvalRecord.decision,
  });
  for (const check of validation.checks) {
    console.log(`[gap-fill validation] ${check.passed ? "PASS" : "FAIL"} ${check.id}: ${check.message}`);
  }

  const artifactPath = persistGapFillArtifact({
    mode,
    hostRoot,
    instruction: approvalRecord.instruction,
    boundary,
    targetFile,
    llmConfigured: false,
    runResult,
    applyRequested: true,
    applyResult,
    decision: approvalRecord.decision,
    assumptionsMade: approvalRecord.decisionRecord?.assumptionsMade ?? [],
    userInputsUsed: approvalRecord.decisionRecord?.userInputsUsed ?? [approvalRecord.instruction],
    inferredInputsUsed: approvalRecord.decisionRecord?.inferredInputsUsed ?? [],
    descriptorSource: approvalRecord.decisionRecord?.source ?? "user_provided",
    canonicalAssistUsed: approvalRecord.decisionRecord?.canonicalAssistUsed ?? false,
    recommendedNextStep: validation.recommendedNextStep,
  });
  console.log(`Gap-fill artifact: ${artifactPath}`);

  if (!applyResult.success || !validation.success) {
    for (const issue of [...applyResult.issues, ...validation.issues]) {
      console.error(`Error: ${issue}`);
    }
    return false;
  }

  return true;
}

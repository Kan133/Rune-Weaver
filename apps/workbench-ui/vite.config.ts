import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { IncomingMessage, ServerResponse } from "http"
import { spawn } from "child_process"

import { scanDota2Project } from "../../adapters/dota2/scanner/project-scan"
import { checkHostStatus } from "../../adapters/dota2/scanner/host-status"
import { checkLaunchPreflight } from "../../adapters/dota2/launch/index"
import { validatePostGeneration } from "../../adapters/dota2/validator/post-generation-validator"
import { connectWar3Workspace } from "../../adapters/war3/workspace/connector"
import { buildWar3DerivedWorkspaceView } from "../../adapters/war3/derived/index"
import { generateMidZoneShopSkeletonModuleDraft } from "../../adapters/war3/generator/index"
import {
  buildWar3CurrentSliceIntentBridge,
  buildWar3CurrentSliceAssemblySidecarTrial,
  buildWar3WritePreviewArtifact,
  createMidZoneShopSkeletonInputFromAssemblySidecar,
  runWar3CurrentSliceBlueprintTrialFromBridge,
} from "../../adapters/war3/intent/index"
import { buildWar3HandoffBundle } from "./src/lib/war3-handoff"
import {
  buildCanonicalGapFillGuidance,
  deriveCanonicalAcceptanceStatus,
  deriveGapFillContinuationState,
} from "./src/lib/gapFillCanonical"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../..")

function getExecutable(base: "npm" | "yarn" | "powershell") {
  if (process.platform === "win32") {
    if (base === "powershell") {
      return "powershell.exe"
    }
    return `${base}.cmd`
  }
  return base
}

function getHostBin(hostRoot: string, commandName: string): string {
  const suffix = process.platform === "win32" ? ".cmd" : ""
  return path.join(hostRoot, "node_modules", ".bin", `${commandName}${suffix}`)
}

function quoteCmdArg(arg: string): string {
  if (arg.length === 0) {
    return '""'
  }

  if (!/[ \t"]/u.test(arg)) {
    return arg
  }

  return `"${arg.replace(/"/g, '""')}"`
}

function buildWindowsCommand(base: "npm" | "yarn", args: string[]): {
  executable: string
  args: string[]
} {
  const commandLine = [base, ...args].map(quoteCmdArg).join(" ")
  return {
    executable: "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
  }
}

function buildWindowsExecutableCommand(executablePath: string, args: string[]): {
  executable: string
  args: string[]
} {
  const commandLine = [executablePath, ...args].map(quoteCmdArg).join(" ")
  return {
    executable: "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
  }
}

function hasFile(hostRoot: string, fileName: string): boolean {
  return fs.existsSync(path.join(hostRoot, fileName))
}

function canonicalizeHostRoot(hostRoot: string): string {
  try {
    return fs.realpathSync.native(hostRoot)
  } catch {
    try {
      return fs.realpathSync(hostRoot)
    } catch {
      return path.resolve(hostRoot)
    }
  }
}

function detectPreferredPackageManager(hostRoot: string): "yarn" | "npm" {
  if (hasFile(hostRoot, "yarn.lock")) {
    return "yarn"
  }
  return "npm"
}

function readAddonConfigIssue(hostRoot: string): string | null {
  const addonConfigPath = path.join(hostRoot, "scripts", "addon.config.ts")
  if (!fs.existsSync(addonConfigPath)) {
    return null
  }

  const content = fs.readFileSync(addonConfigPath, "utf8")
  if (content.includes("let addon_name: string = 'x_template'") || content.includes('let addon_name: string = "x_template"')) {
    return "当前宿主的 scripts/addon.config.ts 仍然是 x_template。请先把 addon_name 改成你的项目名称。"
  }

  return null
}

function writeCliPreflightFailure(
  res: ServerResponse,
  command: string,
  message: string,
) {
  const output = [message]
  res.write(JSON.stringify({ type: "output", content: message }) + "\n")
  res.write(JSON.stringify({
    type: "result",
    result: {
      success: false,
      command,
      exitCode: 1,
      output,
      error: message,
      review: buildCommandReviewSurface(command, output, false, message),
    },
  }) + "\n")
  res.end()
}

function writeCliImmediateSuccess(
  res: ServerResponse,
  command: string,
  output: string[],
) {
  const artifactPath = extractArtifactPath(output)
  for (const line of output) {
    res.write(JSON.stringify({ type: "output", content: line }) + "\n")
  }
  res.write(JSON.stringify({
    type: "result",
    result: {
      success: true,
      command,
      exitCode: 0,
      output,
      artifactPath,
      review: buildCommandReviewSurface(command, output, true),
    },
  }) + "\n")
  res.end()
}

function createLineStreamer(
  lines: string[],
  res: ServerResponse,
) {
  return (chunk: Buffer) => {
    const parsedLines = chunk
      .toString()
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)

    for (const line of parsedLines) {
      lines.push(line)
      res.write(JSON.stringify({ type: "output", content: line }) + "\n")
    }
  }
}

type ReviewStageStatus = "success" | "failure" | "warning" | "info";

interface ReviewSurfaceStage {
  id: string
  label: string
  status: ReviewStageStatus
  summary: string
  details?: string[]
}

interface ReviewSurfaceAction {
  label: string
  command?: string
  kind: "primary" | "secondary" | "repair" | "launch" | "inspect"
}

interface ReviewSurfacePayload {
  title: string
  summary: string
  status: ReviewStageStatus
  stages: ReviewSurfaceStage[]
  blockers: string[]
  highlights: string[]
  recommendedActions: ReviewSurfaceAction[]
  artifactPath?: string
  featureId?: string
  generatedFiles?: string[]
  integrationPoints?: string[]
  gapFillStatus?: "ready_to_apply" | "needs_confirmation" | "blocked_by_host" | "blocked_by_policy"
  gapFillDecisionRecord?: {
    originalInstruction: string
    selectedBoundary: string
    selectedBoundaryLabel?: string
    assumptionsMade: string[]
    userInputsUsed: string[]
    inferredInputsUsed: string[]
    decision: string
    failureCategories: string[]
    exactNextStep?: string
    approvalFile?: string
  }
  gapFillReadiness?: {
    hostReady: boolean
    workspaceConsistent: boolean
    blockingItems: string[]
    advisoryItems: string[]
  }
  canonicalGapFillGuidance?: {
    classification: "canonical" | "exploratory"
    title: string
    summary: string
    nextStep: string
    evidenceMode: "acceptance" | "exploratory"
    expectedPrompt: string
    expectedBoundary: string
  }
  canonicalAcceptance?: {
    classification: "canonical_acceptance_ready" | "canonical_but_incomplete" | "exploratory"
    summary: string
    nextStep: string
  }
}

interface ReviewArtifactStageLike {
  success?: boolean
  skipped?: boolean
  issues?: string[]
  blockers?: string[]
  details?: Record<string, unknown>
  generatedFiles?: string[]
  createdFiles?: string[]
  modifiedFiles?: string[]
}

interface ReviewArtifactLike {
  stages?: Record<string, ReviewArtifactStageLike>
  finalVerdict?: {
    pipelineComplete?: boolean
    completionKind?: "default-safe" | "forced" | "partial" | "requires-regenerate"
    sufficientForDemo?: boolean
    weakestStage?: string
    hasUnresolvedPatterns?: boolean
    remainingRisks?: string[]
    nextSteps?: string[]
  }
  cliOptions?: {
    hostRoot?: string
  }
}

interface GapFillArtifactLike {
  mode?: "review" | "apply" | "validate-applied"
  gapFillStatus?: "ready_to_apply" | "needs_confirmation" | "blocked_by_host" | "blocked_by_policy"
  hostRoot: string
  boundaryId: string
  targetFile: string
  descriptor?: {
    label?: string
    status?: "ready" | "needs_confirmation" | "blocked"
  }
  decision?: {
    decision: "auto_apply" | "require_confirmation" | "reject"
    failureCategories?: string[]
    userSummary?: string
    reasons?: Array<{ code: string; message: string }>
  }
  decisionRecord?: {
    requestedBoundaryId?: string
    requestedBoundaryLabel?: string
    originalInstruction?: string
    assumptionsMade?: string[]
    userInputsUsed?: string[]
    inferredInputsUsed?: string[]
    approvalDecision?: string
    failureCategories?: string[]
    recommendedNextStep?: string
  }
  dryRun?: {
    summary?: string
    patchPlan?: {
      operations?: Array<{ kind: string; target: string }>
    }
  }
  apply?: {
    requested: boolean
    attempted?: boolean
    success: boolean
    issues?: string[]
    targetPath?: string
  }
  validation?: {
    success: boolean
    checks?: Array<{ id: string; passed: boolean; message: string; details?: string[] }>
    issues?: string[]
    failureCategories?: string[]
    recommendedNextStep?: string
  }
  recommendedNextStep?: string
}

function normalizeStageStatus(success: boolean | undefined, skipped: boolean | undefined): ReviewStageStatus {
  if (skipped) {
    return "info"
  }
  return success ? "success" : "failure"
}

function extractArtifactPath(outputLines: string[]): string | undefined {
  for (const line of outputLines) {
    const match = line.match(/(?:Review artifact saved|Gap-fill artifact):\s*(.+)$/)
    if (match?.[1]) {
      return match[1].trim()
    }
  }
  return undefined
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T
  } catch {
    return null
  }
}

function buildRunReviewSurface(
  artifactPath: string | undefined,
  outputLines: string[],
): ReviewSurfacePayload | undefined {
  const artifact = artifactPath ? readJsonFile<ReviewArtifactLike>(artifactPath) : null
  if (!artifact?.stages) {
    return undefined
  }

  const stageLabels: Array<[string, string]> = [
    ["intentSchema", "Intent"],
    ["blueprint", "Blueprint"],
    ["patternResolution", "Pattern Resolution"],
    ["assemblyPlan", "Assembly Plan"],
    ["hostRealization", "Host Realization"],
    ["generatorRouting", "Generator Routing"],
    ["generator", "Generator"],
    ["governanceCheck", "Governance"],
    ["writeExecutor", "Write"],
    ["hostValidation", "Host Validation"],
    ["runtimeValidation", "Runtime Validation"],
    ["workspaceState", "Workspace State"],
  ]

  const stages: ReviewSurfaceStage[] = []
  const blockers: string[] = []
  const highlights: string[] = []
  const genericFollowUpHints = new Set([
    "Improve pipeline completeness",
    "Host runtime validation",
    "Rollback support",
    "Improve feature file identification",
  ])

  for (const [stageId, label] of stageLabels) {
    const stage = artifact.stages[stageId]
    if (!stage) {
      continue
    }

    const details = [
      ...(stage.issues || []),
      ...(stage.blockers || []),
    ].slice(0, 3)

    if (!stage.success && !stage.skipped) {
      blockers.push(...details)
    }

    let summary = stage.success ? "Completed" : stage.skipped ? "Skipped" : "Needs attention"

    if (stageId === "generator" && stage.generatedFiles?.length) {
      summary = `${stage.generatedFiles.length} generated files planned`
      highlights.push(`${stage.generatedFiles.length} generated files planned`)
    }

    if (stageId === "writeExecutor") {
      const created = stage.createdFiles?.length || 0
      const modified = stage.modifiedFiles?.length || 0
      summary = stage.success
        ? `${created} created, ${modified} modified`
        : "Write did not complete"
      if (created > 0 || modified > 0) {
        highlights.push(`${created} files created, ${modified} files modified`)
      }
    }

    if (stageId === "hostValidation") {
      const issueCount = stage.issues?.length || 0
      summary = stage.success ? "Host integration checks passed" : `${issueCount} host issues found`
    }

    if (stageId === "runtimeValidation") {
      const limitations = Array.isArray(stage.details?.limitations)
        ? (stage.details?.limitations as string[])
        : []
      if (limitations.length > 0) {
        details.push(...limitations.slice(0, 2))
      }
      summary = stage.success ? "Runtime validation passed" : "Runtime validation reported issues"
    }

    stages.push({
      id: stageId,
      label,
      status: normalizeStageStatus(stage.success, stage.skipped),
      summary,
      details: details.length > 0 ? details : undefined,
    })
  }

  const generatorStage = artifact.stages.generator
  const generatedFiles = generatorStage?.generatedFiles || []
  if (generatedFiles.length > 0) {
    highlights.push(`Writes to ${generatedFiles.length} host targets`)
  }

  const recommendedActions: ReviewSurfaceAction[] = []
  const finalVerdict = artifact.finalVerdict
  for (const nextStep of finalVerdict?.nextSteps || []) {
    if (genericFollowUpHints.has(nextStep)) {
      continue
    }
    recommendedActions.push({
      label: nextStep,
      kind: /launch/i.test(nextStep) ? "launch" : /repair|build/i.test(nextStep) ? "repair" : "primary",
    })
  }

  const nextCommandLine = outputLines.find((line) => line.trim().startsWith("Next Command:"))
  if (nextCommandLine) {
    recommendedActions.unshift({
      label: "Next recommended command",
      command: nextCommandLine.replace(/^Next Command:\s*/, "").trim(),
      kind: "primary",
    })
  }

  const writeSuccess = artifact.stages.writeExecutor?.success === true
  const hostValidationSuccess = artifact.stages.hostValidation?.success === true
  const runtimeValidationSuccess =
    artifact.stages.runtimeValidation?.success === true ||
    artifact.stages.runtimeValidation?.skipped === true
  const workspaceStateHealthy =
    artifact.stages.workspaceState?.success === true ||
    artifact.stages.workspaceState?.skipped === true
  const hasMeaningfulBlockers =
    (finalVerdict?.weakestStage && finalVerdict.weakestStage !== "none") ||
    (finalVerdict?.remainingRisks?.length || 0) > 0

  let status: ReviewStageStatus = "info"
  let title = "Create review is ready"
  let summary = "The Dota2 write path completed. Review the write result and runtime readiness before launch."

  if (!writeSuccess) {
    status = "failure"
    title = "Create review found blockers"
    summary = "The Dota2 write path did not finish writing the feature. Review the blocking stage before retrying."
  } else if (hostValidationSuccess && runtimeValidationSuccess && workspaceStateHealthy && !hasMeaningfulBlockers) {
    status = "success"
    title = "Feature written and host looks healthy"
    summary = "The feature was written cleanly and the current host checks look healthy."
  } else {
    status = "warning"
    title = "Feature written with follow-up recommended"
    summary = "The feature was written to the host, but there are still follow-up checks or cleanup steps before we should call the path fully ready."
    if (recommendedActions.length === 0) {
      recommendedActions.push(
        {
          label: "Run Runtime Doctor",
          command: `npm run cli -- dota2 doctor --host ${artifact.cliOptions?.hostRoot || "<host>"}`,
          kind: "inspect",
        },
        {
          label: "Repair and rebuild host artifacts",
          command: `npm run cli -- dota2 repair --host ${artifact.cliOptions?.hostRoot || "<host>"} --safe`,
          kind: "repair",
        },
      )
    }
  }

  return {
    title,
    summary,
    status,
    stages,
    blockers: Array.from(new Set([...(finalVerdict?.remainingRisks || []), ...blockers]))
      .filter((item) => !genericFollowUpHints.has(item))
      .slice(0, 6),
    highlights: Array.from(new Set(highlights)).slice(0, 6),
    recommendedActions: recommendedActions.slice(0, 4),
    artifactPath,
    generatedFiles,
  }
}

function buildGapFillReviewSurface(
  artifactPath: string | undefined,
  outputLines: string[],
  success: boolean,
  errorMessage?: string,
): ReviewSurfacePayload | undefined {
  const artifact = artifactPath ? readJsonFile<GapFillArtifactLike>(artifactPath) : null
  if (!artifact?.boundaryId || !artifact.hostRoot) {
    return undefined
  }

  const preflight = checkLaunchPreflight(artifact.hostRoot)
  const postGeneration = validatePostGeneration(artifact.hostRoot)
  const conflictingBindings = postGeneration.checks.find((check) => check.check === "active_key_binding_conflicts")
  const approvalCommand = outputLines.find((line) => line.trim().startsWith("Approve command:"))
  const approvalFileMatch = approvalCommand?.match(/--approve\s+"([^"]+)"/) || approvalCommand?.match(/--approve\s+([^\s]+)/)
  const approvalFile = approvalFileMatch?.[1]
  const hostReady = preflight.ready && conflictingBindings?.passed !== false
  const readinessBlockingItems = [
    ...(!preflight.ready ? preflight.missingArtifacts.map((item) => `缺少运行时产物：${item}`) : []),
    ...((conflictingBindings?.details || []).map((item) => `存在冲突：${item}`)),
  ]
  const readinessAdvisoryItems = (artifact.validation?.checks || [])
    .filter((check) => check.passed)
    .slice(0, 3)
    .map((check) => check.message)

  const stages: ReviewSurfaceStage[] = [
    {
      id: "gap-boundary",
      label: "边界",
      status:
        artifact.descriptor?.status === "blocked"
          ? "failure"
          : artifact.descriptor?.status === "needs_confirmation"
            ? "warning"
            : "success",
      summary: artifact.descriptor?.label || artifact.boundaryId,
      details: [artifact.targetFile],
    },
    {
      id: "gap-decision",
      label: "决策",
      status:
        artifact.decision?.decision === "reject"
          ? "failure"
          : artifact.decision?.decision === "require_confirmation"
            ? "warning"
            : "success",
      summary: artifact.decision?.userSummary || artifact.dryRun?.summary || "业务逻辑填充评审已完成",
      details: artifact.decision?.reasons?.map((reason) => `[${reason.code}] ${reason.message}`).slice(0, 3),
    },
    {
      id: "gap-readiness",
      label: "写入前准备度",
      status: !preflight.ready || conflictingBindings?.passed === false ? "warning" : "success",
      summary: !preflight.ready
        ? `${preflight.missingArtifacts.length} 个宿主产物缺失`
        : conflictingBindings?.passed === false
          ? "宿主存在活动按键冲突"
          : "宿主产物和工作区检查已满足继续条件",
      details: [
        ...preflight.missingArtifacts.slice(0, 2),
        ...(conflictingBindings?.details || []).slice(0, 2),
      ],
    },
    {
      id: "gap-validation",
      label: "应用后校验",
      status: artifact.validation?.success === false ? "failure" : artifact.apply?.attempted ? "success" : "info",
      summary: artifact.apply?.attempted
        ? artifact.validation?.recommendedNextStep || "应用后校验已完成"
        : "应用后才会执行校验",
      details: artifact.validation?.issues?.slice(0, 3),
    },
  ]

  const blockers = [
    ...(artifact.validation?.issues || []),
    ...(artifact.apply?.issues || []),
    ...readinessBlockingItems,
  ].slice(0, 6)

  const highlights = [
    artifact.dryRun?.summary,
    artifact.decision?.userSummary,
    artifact.recommendedNextStep,
    artifact.validation?.recommendedNextStep,
    artifact.apply?.targetPath ? `已应用到目标文件：${artifact.apply.targetPath}` : undefined,
  ].filter((item): item is string => !!item).slice(0, 6)

  const recommendedActions: ReviewSurfaceAction[] = []
  if (approvalCommand) {
    recommendedActions.push({
      label: "应用确认后的 Patch",
      command: approvalCommand.replace(/^Approve command:\s*/, "").trim(),
      kind: "primary",
    })
  }
  if (artifact.decision?.decision === "auto_apply" && artifact.mode === "review") {
    recommendedActions.push({
      label: "应用当前 Review",
      kind: "primary",
    })
  }
  if (artifact.apply?.success) {
    recommendedActions.push(
      {
        label: "修复并构建宿主",
        command: `npm run cli -- dota2 repair --host ${artifact.hostRoot} --safe`,
        kind: "repair",
      },
      {
        label: "启动宿主",
        command: `npm run cli -- dota2 launch --host ${artifact.hostRoot}`,
        kind: "launch",
      },
    )
  } else {
    recommendedActions.push({
      label: "校验应用结果",
      command: approvalCommand
        ? `${approvalCommand.replace(/^Approve command:\s*/, "").trim().replace("--mode apply", "--mode validate-applied")}`
        : undefined,
      kind: "inspect",
    })
  }

  const failureCategories = artifact.validation?.failureCategories || artifact.decision?.failureCategories || []
  const artifactStatus = artifact.gapFillStatus
  const gapFillStatus =
    failureCategories.includes("policy_reject")
      ? "blocked_by_policy"
      : !hostReady
        ? "blocked_by_host"
        : artifactStatus === "blocked_by_policy"
          ? "blocked_by_policy"
          : artifactStatus === "needs_confirmation" || (artifact.decision?.decision === "require_confirmation" && !artifact.apply?.success)
            ? "needs_confirmation"
            : "ready_to_apply"
  let status: ReviewStageStatus = success ? "success" : "failure"
  let title = "Gap Fill 评审已准备好"
  let summary = artifact.recommendedNextStep || errorMessage || "业务逻辑填充已完成。"

  if (gapFillStatus === "blocked_by_policy") {
    status = "failure"
    title = "Gap Fill 被策略拦住"
    summary = artifact.recommendedNextStep || "当前 patch 触碰了受保护结构，需要缩小指令范围。"
  } else if (gapFillStatus === "blocked_by_host") {
    status = "warning"
    title = "Gap Fill 可评审，但宿主未就绪"
    summary = "业务逻辑 patch 可以评审，但宿主还有阻塞项，继续前需要先处理。"
  } else if (gapFillStatus === "needs_confirmation") {
    status = "warning"
    title = "Gap Fill 需要确认"
    summary = "请先确认审批单元，再继续应用 patch。"
  } else if (!success) {
    status = "failure"
    title = "Gap Fill 执行失败"
    summary = errorMessage || "Gap Fill 没有完成。"
  }

  const validationSucceeded = artifact.validation?.success === true
  const continuationState = deriveGapFillContinuationState({
    status: gapFillStatus,
    validationSucceeded,
    hostReady,
  })
  const canonicalGapFillGuidance = buildCanonicalGapFillGuidance({
    boundaryId: artifact.decisionRecord?.requestedBoundaryId || artifact.boundaryId,
    instruction: artifact.decisionRecord?.originalInstruction,
    status: gapFillStatus,
    approvalFile,
    validationSucceeded,
    hostReady,
  })
  const canonicalAcceptance = deriveCanonicalAcceptanceStatus({
    boundaryId: artifact.decisionRecord?.requestedBoundaryId || artifact.boundaryId,
    instruction: artifact.decisionRecord?.originalInstruction,
    status: gapFillStatus,
    validationSucceeded,
    hostReady,
    continuationVisible: continuationState.showContinuationRail,
  })

  return {
    title,
    summary,
    status,
    stages,
    blockers,
    highlights,
    recommendedActions: recommendedActions.slice(0, 4),
    artifactPath,
    generatedFiles: artifact.targetFile ? [artifact.targetFile] : undefined,
    featureId: undefined,
    integrationPoints: failureCategories,
    gapFillStatus,
    gapFillDecisionRecord: artifact.decisionRecord
      ? {
          originalInstruction: artifact.decisionRecord.originalInstruction || "",
          selectedBoundary: artifact.decisionRecord.requestedBoundaryId || artifact.boundaryId,
          selectedBoundaryLabel: artifact.decisionRecord.requestedBoundaryLabel,
          assumptionsMade: artifact.decisionRecord.assumptionsMade || [],
          userInputsUsed: artifact.decisionRecord.userInputsUsed || [],
          inferredInputsUsed: artifact.decisionRecord.inferredInputsUsed || [],
          decision: artifact.decisionRecord.approvalDecision || artifact.decision?.decision || "unknown",
          failureCategories: artifact.decisionRecord.failureCategories || failureCategories,
          exactNextStep: artifact.decisionRecord.recommendedNextStep || artifact.recommendedNextStep,
          approvalFile,
        }
      : undefined,
    gapFillReadiness: {
      hostReady,
      workspaceConsistent: conflictingBindings?.passed !== false,
      blockingItems: readinessBlockingItems,
      advisoryItems: readinessAdvisoryItems,
    },
    canonicalGapFillGuidance,
    canonicalAcceptance,
  }
}

function collectFailedChecks(outputLines: string[]): string[] {
  const failed: string[] = []
  for (const line of outputLines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("- [") || trimmed.startsWith("[FAIL]")) {
      failed.push(trimmed)
    }
  }
  return failed.slice(0, 6)
}

function buildCommandReviewSurface(
  command: string,
  outputLines: string[],
  success: boolean,
  errorMessage?: string,
): ReviewSurfacePayload | undefined {
  const artifactPath = extractArtifactPath(outputLines)
  if (command === "run" || command === "update") {
    return buildRunReviewSurface(artifactPath, outputLines)
  }
  if (command === "gap-fill") {
    return buildGapFillReviewSurface(artifactPath, outputLines, success, errorMessage)
  }

  const blockers = collectFailedChecks(outputLines)
  const commandLine = outputLines.find((line) => line.trim().startsWith("Command:"))
  const nextCommandLine = outputLines.find((line) => line.trim().startsWith("Next Command:"))
  const actionSummaryLine = outputLines.find((line) => line.trim().startsWith("Action Summary:"))
  const reasonLine = outputLines.find((line) => line.trim().startsWith("Reason:"))

  const stages: ReviewSurfaceStage[] = []
  const recommendedActions: ReviewSurfaceAction[] = []

  if (commandLine) {
    recommendedActions.push({
      label: "Recommended command",
      command: commandLine.replace(/^Command:\s*/, "").trim(),
      kind: "primary",
    })
  }
  if (nextCommandLine && nextCommandLine !== commandLine) {
    recommendedActions.push({
      label: "Next command",
      command: nextCommandLine.replace(/^Next Command:\s*/, "").trim(),
      kind: "secondary",
    })
  }

  if (command === "doctor" || command === "validate") {
    stages.push({
      id: command,
      label: command === "doctor" ? "Runtime Doctor" : "Post-Generation Validation",
      status: success ? "success" : "failure",
      summary: success ? "Checks passed without blocking issues" : "Checks found issues that need attention",
      details: blockers.length > 0 ? blockers : undefined,
    })
  } else if (command === "repair-build") {
    stages.push(
      {
        id: "repair",
        label: "Repair",
        status: success ? "success" : "failure",
        summary: success ? "Safe repair finished" : "Safe repair or build failed",
      },
      {
        id: "build",
        label: "Build",
        status: success ? "success" : "failure",
        summary: success ? "Host assets were rebuilt" : "Host assets did not rebuild cleanly",
      },
    )
  } else if (command === "launch") {
    stages.push({
      id: "launch",
      label: "Launch",
      status: success ? "success" : "failure",
      summary: success ? "Launch command was dispatched to the host" : "Launch command did not complete",
    })
  } else {
    stages.push({
      id: command,
      label: command,
      status: success ? "success" : "failure",
      summary: success ? "Command completed" : "Command failed",
    })
  }

  return {
    title: actionSummaryLine?.replace(/^Action Summary:\s*/, "").trim() || `${command} review`,
    summary: reasonLine?.replace(/^Reason:\s*/, "").trim() || errorMessage || (success ? "Command completed successfully." : "Command failed."),
    status: success ? "success" : "failure",
    stages,
    blockers,
    highlights: outputLines
      .filter((line) => line.trim().startsWith("Final Result:") || line.trim().startsWith("[PASS]"))
      .slice(0, 4),
    recommendedActions,
    artifactPath,
  }
}

async function runDetachedBuildStep(
  executable: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  outputLines: string[],
  res: ServerResponse,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const processSpec = process.platform === "win32"
      ? buildWindowsExecutableCommand(executable, args)
      : { executable, args }

    const child = spawn(processSpec.executable, processSpec.args, {
      cwd,
      shell: false,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    const streamLines = createLineStreamer(outputLines, res)
    child.stdout.on("data", streamLines)
    child.stderr.on("data", streamLines)

    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Build step failed with exit code ${code ?? 1}`))
    })
  })
}

async function runRepairBuildPipeline(
  hostRoot: string,
  outputLines: string[],
  res: ServerResponse,
): Promise<void> {
  const env = { ...process.env, FORCE_COLOR: "0" }
  const gulpBin = getHostBin(hostRoot, "gulp")
  const tstlBin = getHostBin(hostRoot, "tstl")
  const webpackBin = path.join(hostRoot, "node_modules", "webpack", "bin", "webpack.js")

  const steps: Array<{ label: string; executable: string; args: string[] }> = [
    {
      label: "运行 gulp predev",
      executable: gulpBin,
      args: ["predev"],
    },
    {
      label: "运行 gulp compile_less",
      executable: gulpBin,
      args: ["compile_less"],
    },
    {
      label: "构建 Panorama HUD",
      executable: process.platform === "win32" ? "node" : process.execPath,
      args: ["--preserve-symlinks", webpackBin, "--config", "content/panorama/webpack.dev.js"],
    },
    {
      label: "编译 Lua vscripts",
      executable: tstlBin,
      args: ["--project", "game/scripts/tsconfig.json"],
    },
  ]

  for (const step of steps) {
    outputLines.push(step.label)
    res.write(JSON.stringify({ type: "output", content: step.label }) + "\n")
    await runDetachedBuildStep(step.executable, step.args, hostRoot, env, outputLines, res)
  }
}

async function selectDirectoryViaDialog(initialPath?: string): Promise<string | null> {
  if (process.platform !== "win32") {
    return null
  }

  const safeInitialPath = initialPath ? initialPath.replace(/'/g, "''") : ""
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = '请选择 Dota2 x-template 宿主目录'",
    "$dialog.ShowNewFolderButton = $false",
    safeInitialPath ? `$dialog.SelectedPath = '${safeInitialPath}'` : "",
    "$result = $dialog.ShowDialog()",
    "if ($result -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  Write-Output $dialog.SelectedPath",
    "}",
  ].filter(Boolean).join("; ")

  return new Promise((resolve, reject) => {
    const child = spawn(
      getExecutable("powershell"),
      ["-NoProfile", "-STA", "-Command", script],
      {
        cwd: repoRoot,
        shell: false,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      }
    )

    let stdout = ""
    let stderr = ""
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error("目录选择超时或当前环境不支持桌面弹窗，请先手动粘贴路径。"))
    }, 15000)

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on("close", (code) => {
      clearTimeout(timeout)
      if (code !== 0 && stderr.trim()) {
        reject(new Error(stderr.trim()))
        return
      }
      const selected = stdout.trim()
      resolve(selected || null)
    })

    child.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

/**
 * 读取请求体
 */
async function readRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on("error", reject)
  })
}

/**
 * Local API Bridge Plugin
 * 提供 workbench-ui 与 scanner/CLI 的桥接端点
 */
function localApiBridgePlugin() {
  return {
    name: "local-api-bridge",
    configureServer(server: any) {
      // POST /api/host/scan - 扫描 Dota2 项目
      server.middlewares.use("/api/host/scan", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { hostRoot } = body

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          const result = scanDota2Project(hostRoot)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: true, result }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/host/status - 检查宿主状态
      server.middlewares.use("/api/host/status", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { hostRoot } = body

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          const result = checkHostStatus(hostRoot)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: true, result }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/war3/anchors - 加载 War3 锚点建议
      server.middlewares.use("/api/war3/anchors", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { hostRoot } = body

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          // Connect to War3 workspace
          const connectionResult = connectWar3Workspace(hostRoot)

          if (!connectionResult.success || !connectionResult.context) {
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({
              success: false,
              error: "Failed to connect to War3 workspace",
              issues: connectionResult.issues
            }))
            return
          }

          // Build derived workspace view
          const derivedView = buildWar3DerivedWorkspaceView(connectionResult.context)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: derivedView.success,
            result: derivedView,
            issues: derivedView.issues
          }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/host/launch-preflight - 检查启动前产物
      server.middlewares.use("/api/host/launch-preflight", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { hostRoot } = body

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          const result = checkLaunchPreflight(hostRoot)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: true, result }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/system/select-directory - 选择目录
      server.middlewares.use("/api/system/select-directory", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { initialPath } = body
          const selectedPath = await selectDirectoryViaDialog(initialPath)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: true,
            result: {
              path: selectedPath,
            },
          }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }))
        }
      })

      // POST /api/war3/handoff-preview - 生成 War3 LLM handoff 调用包预览
      server.middlewares.use("/api/war3/handoff-preview", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { artifact } = body

          if (!artifact) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing artifact" }))
            return
          }

          const result = buildWar3HandoffBundle(artifact)

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ success: true, result }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/war3/skeleton-preview - 生成 War3 skeleton 模块预览
      server.middlewares.use("/api/war3/skeleton-preview", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const { artifact } = body

          if (!artifact) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing artifact" }))
            return
          }

          const bridge = buildWar3CurrentSliceIntentBridge(artifact)
          const sidecarTrial = buildWar3CurrentSliceAssemblySidecarTrial(
            runWar3CurrentSliceBlueprintTrialFromBridge(bridge)
          )
          const generatorInput = createMidZoneShopSkeletonInputFromAssemblySidecar(sidecarTrial.sidecar)
          const content = generateMidZoneShopSkeletonModuleDraft(generatorInput)
          const writePreviewArtifact = buildWar3WritePreviewArtifact({
            sidecar: sidecarTrial.sidecar,
            skeletonContent: content,
            moduleName: generatorInput.moduleName,
          })

          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: true,
            result: {
              schemaVersion: "war3-skeleton-preview/v1",
              generatedAt: new Date().toISOString(),
              bridge,
              sidecar: sidecarTrial.sidecar,
              writePreviewArtifact,
              content,
            },
          }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })

      // POST /api/cli/execute - 执行 CLI 命令（流式返回）
      server.middlewares.use("/api/cli/execute", async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "POST") return next()

        try {
          const body = await readRequestBody(req)
          const {
            command,
            hostRoot,
            prompt,
            write = false,
            force = false,
            featureId,
            boundaryId,
            instruction,
            gapFillMode,
            approvalFile,
            addonName,
            mapName,
          } = body

          if (!command) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing command" }))
            return
          }

          if (!hostRoot) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing hostRoot" }))
            return
          }

          const normalizedHostRoot = canonicalizeHostRoot(hostRoot)

          if ((command === "run" || command === "update") && !prompt) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: `Missing prompt for ${command} command` }))
            return
          }

          if ((command === "update" || command === "delete") && !featureId) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: `Missing featureId for ${command} command` }))
            return
          }

          if (command === "gap-fill" && !approvalFile && (!featureId || !instruction)) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: "Missing featureId/instruction or approvalFile for gap-fill command" }))
            return
          }

          // 设置流式响应头
          res.setHeader("Content-Type", "application/x-ndjson")
          res.setHeader("Transfer-Encoding", "chunked")
          res.setHeader("Cache-Control", "no-cache")

          // 构建 CLI 参数
          let cliArgs: string[]
          const childEnv: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: "0" }
          if (command === "init") {
            cliArgs = ["run", "cli", "--", "dota2", "init", "--host", normalizedHostRoot]
            const finalAddonName = addonName || path.basename(normalizedHostRoot).toLowerCase().replace(/[^a-z0-9_]/g, "_")
            cliArgs.push("--addon-name", finalAddonName)
            cliArgs.push("--skip-install")
          } else if (command === "run") {
            cliArgs = [
              "run", "cli", "--", "dota2", "run",
              "--input-base64-env", "RW_WORKBENCH_PROMPT_B64",
              "--host", normalizedHostRoot
            ]
            childEnv.RW_WORKBENCH_PROMPT_B64 = Buffer.from(prompt!, "utf8").toString("base64")
            if (featureId) {
              cliArgs.push("--feature", featureId)
            }
            if (write) {
              cliArgs.push("--write")
            }
            if (force) {
              cliArgs.push("--force")
            }
            if (!write && !force) {
              cliArgs.push("--dry-run")
            }
          } else if (command === "update") {
            cliArgs = [
              "run", "cli", "--", "dota2", "update",
              "--input-base64-env", "RW_WORKBENCH_PROMPT_B64",
              "--host", normalizedHostRoot,
              "--feature", featureId,
            ]
            childEnv.RW_WORKBENCH_PROMPT_B64 = Buffer.from(prompt!, "utf8").toString("base64")
            if (write) {
              cliArgs.push("--write")
            } else {
              cliArgs.push("--dry-run")
            }
            if (force) {
              cliArgs.push("--force")
            }
          } else if (command === "delete") {
            cliArgs = [
              "run", "cli", "--", "dota2", "delete",
              "--host", normalizedHostRoot,
              "--feature", featureId,
            ]
            if (write) {
              cliArgs.push("--write")
            } else {
              cliArgs.push("--dry-run")
            }
          } else if (command === "demo-prepare") {
            const finalAddonName = addonName || path.basename(hostRoot).toLowerCase().replace(/[^a-z0-9_]/g, "_")
            const finalMapName = mapName || "temp"
            cliArgs = [
              "run", "cli", "--", "dota2", "demo", "prepare",
              "--host", normalizedHostRoot,
              "--addon-name", finalAddonName,
              "--map", finalMapName,
              "--write",
            ]
          } else if (command === "doctor") {
            cliArgs = ["run", "cli", "--", "dota2", "doctor", "--host", normalizedHostRoot]
          } else if (command === "validate") {
            cliArgs = ["run", "cli", "--", "dota2", "validate", "--host", normalizedHostRoot]
          } else if (command === "repair-build") {
            cliArgs = ["run", "cli", "--", "dota2", "repair", "--host", normalizedHostRoot, "--safe"]
          } else if (command === "launch") {
            cliArgs = ["run", "cli", "--", "dota2", "launch", "--host", normalizedHostRoot]
            const finalAddonName = addonName || path.basename(normalizedHostRoot).toLowerCase().replace(/[^a-z0-9_]/g, "_")
            const finalMapName = mapName || "temp"
            cliArgs.push("--addon-name", finalAddonName)
            cliArgs.push("--map", finalMapName)
          } else if (command === "gap-fill") {
            cliArgs = [
              "run", "cli", "--", "dota2", "gap-fill",
              "--host", normalizedHostRoot,
            ]
            if (featureId) {
              cliArgs.push("--feature", featureId)
            }
            if (instruction) {
              cliArgs.push("--instruction", instruction)
            }
            if (boundaryId) {
              cliArgs.push("--boundary", boundaryId)
            }
            if (gapFillMode) {
              cliArgs.push("--mode", gapFillMode)
            }
            if (approvalFile) {
              cliArgs.push("--approve", approvalFile)
            }
          } else if (command === "install") {
            const addonConfigIssue = readAddonConfigIssue(normalizedHostRoot)
            if (addonConfigIssue) {
              writeCliPreflightFailure(
                res,
                command,
                `${addonConfigIssue} 请先修改 addon_name，再执行依赖安装。`,
              )
              return
            }

            cliArgs = ["install"]
          } else if (command === "dev") {
            const addonConfigIssue = readAddonConfigIssue(normalizedHostRoot)
            if (addonConfigIssue) {
              writeCliPreflightFailure(
                res,
                command,
                `${addonConfigIssue} 请先修改 addon_name，再启动开发构建。`,
              )
              return
            }

            const packageManager = detectPreferredPackageManager(normalizedHostRoot)
            if (process.platform === "win32") {
              const startProcess = spawn(
                "cmd.exe",
                ["/d", "/s", "/c", "start", "\"RuneWeaver Host Dev\"", packageManager, "dev"],
                {
                  cwd: normalizedHostRoot,
                  shell: false,
                  env: { ...process.env, FORCE_COLOR: "0" },
                  stdio: "ignore",
                  detached: true,
                }
              )
              startProcess.unref()
            } else {
              const startProcess = spawn(
                getExecutable(packageManager),
                ["dev"],
                {
                  cwd: normalizedHostRoot,
                  shell: false,
                  env: { ...process.env, FORCE_COLOR: "0" },
                  stdio: "ignore",
                  detached: true,
                }
              )
              startProcess.unref()
            }

            writeCliImmediateSuccess(res, command, [
              `已在宿主目录后台启动 ${packageManager} dev`,
              "请等待首次构建完成，然后再启动宿主。",
            ])
            return
          } else {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ success: false, error: `Unknown command: ${command}` }))
            return
          }

          const outputLines: string[] = []

          // Spawn CLI 进程
          const childCwd = command === "install" ? normalizedHostRoot : repoRoot
          const processSpec =
            process.platform === "win32"
              ? command === "install"
                ? buildWindowsCommand(detectPreferredPackageManager(normalizedHostRoot), cliArgs)
                : buildWindowsCommand("npm", cliArgs)
              : {
                  executable: command === "install"
                    ? getExecutable(detectPreferredPackageManager(normalizedHostRoot))
                    : getExecutable("npm"),
                  args: cliArgs,
                }

          const child = spawn(processSpec.executable, processSpec.args, {
            cwd: childCwd,
            shell: false,
            env: childEnv,
            stdio: ["pipe", "pipe", "pipe"]
          })

          // 流式返回 stdout
          child.stdout.on("data", (data: Buffer) => {
            const lines = data.toString().split("\n").filter(Boolean)
            for (const line of lines) {
              outputLines.push(line)
              res.write(JSON.stringify({ type: "output", content: line }) + "\n")
            }
          })

          // 流式返回 stderr
          child.stderr.on("data", (data: Buffer) => {
            const lines = data.toString().split("\n").filter(Boolean)
            for (const line of lines) {
              outputLines.push(line)
              res.write(JSON.stringify({ type: "output", content: line }) + "\n")
            }
          })

          // 进程结束返回 result
          child.on("close", async (code: number | null) => {
            if (command === "repair-build" && code === 0) {
              try {
                outputLines.push("已完成安全修复，开始执行一次性宿主构建")
                res.write(JSON.stringify({
                  type: "output",
                  content: "已完成安全修复，开始执行一次性宿主构建",
                }) + "\n")

                await runRepairBuildPipeline(normalizedHostRoot, outputLines, res)
                const artifactPath = extractArtifactPath(outputLines)

                res.write(JSON.stringify({
                  type: "result",
                  result: {
                    success: true,
                    command,
                    exitCode: 0,
                    output: outputLines,
                    artifactPath,
                    review: buildCommandReviewSurface(command, outputLines, true),
                  }
                }) + "\n")
                res.end()
                return
              } catch (buildError) {
                const message = buildError instanceof Error ? buildError.message : String(buildError)
                outputLines.push(`Error: ${message}`)
                const artifactPath = extractArtifactPath(outputLines)
                res.write(JSON.stringify({ type: "output", content: `Error: ${message}` }) + "\n")
                res.write(JSON.stringify({
                  type: "result",
                  result: {
                    success: false,
                    command,
                    exitCode: 1,
                    output: outputLines,
                    error: message,
                    artifactPath,
                    review: buildCommandReviewSurface(command, outputLines, false, message),
                  }
                }) + "\n")
                res.end()
                return
              }
            }

            const artifactPath = extractArtifactPath(outputLines)
            res.write(JSON.stringify({
              type: "result",
              result: {
                success: code === 0,
                command,
                exitCode: code ?? 1,
                output: outputLines,
                artifactPath,
                review: buildCommandReviewSurface(
                  command,
                  outputLines,
                  code === 0,
                  code === 0 ? undefined : `CLI exited with code ${code ?? 1}`,
                ),
              }
            }) + "\n")
            res.end()
          })

          // 错误处理
          child.on("error", (error: Error) => {
            res.write(JSON.stringify({
              type: "error",
              error: error.message
            }) + "\n")
            res.end()
          })
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), localApiBridgePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

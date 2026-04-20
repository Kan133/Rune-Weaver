#!/usr/bin/env node
/**
 * Rune Weaver - Dota2 CLI Module
 *
 * T087-T089-R1: CLI Realism Tightening
 *
 * 使用方式:
 *   npm run cli -- dota2 run "<prompt>" --host D:\test1
 *   npm run cli -- dota2 run "<prompt>" --host D:\test1 --dry-run
 *   npm run cli -- dota2 run "<prompt>" --host D:\test1 --write
 *   npm run cli -- dota2 run "<prompt>" --host D:\test1 --force
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  analyzeDependencyRevalidation,
  applyDependencyRevalidationEffects,
  initializeWorkspace,
  saveWorkspace,
  checkDuplicateFeature,
  addFeatureToWorkspace,
  updateFeatureInWorkspace,
  extractEntryBindings,
  FeatureWriteResult,
} from "../../core/workspace/index.js";

import { WritePlan } from "../../adapters/dota2/assembler/index.js";
import { generateCode } from "../../adapters/dota2/generator/index.js";
import { generateAbilityKV } from "../../adapters/dota2/generator/kv/index.js";
import { KVGeneratorInput } from "../../adapters/dota2/generator/kv/types.js";
import { validateHostRuntime } from "../../adapters/dota2/validator/runtime-validator.js";
import { calculateFinalVerdict, buildDeferredEntriesInfo, buildGeneratorStage, computeAbilityName, generateCodeContent, validateHost, buildRuntimeValidationResult, performRollbackHostValidation, formatRuntimeValidationOutput, updateWorkspaceState } from "./helpers/index.js";
import type { VerdictInput, HostValidationResult, RuntimeValidationResult, WorkspaceUpdateResult } from "./helpers/index.js";
import { checkWriteConflicts } from "./helpers/governance-check.js";
import { realizeDota2Host, summarizeRealization } from "../../adapters/dota2/realization/index.js";
import { generateGeneratorRoutingPlan, getRoutesByFamily, getUnblockedRoutes } from "../../adapters/dota2/routing/index.js";
import type { AssemblyPlan, HostRealizationPlan, GeneratorRoutingPlan } from "../../core/schema/types.js";
import type {
  CurrentFeatureContext,
  IntentSchema as ReviewIntentSchema,
  RelationCandidate,
  UpdateIntent,
  SelectionPoolAdmissionDiagnostics,
  WizardClarificationAuthority,
  WizardClarificationPlan,
  WorkspaceSemanticContext,
} from "../../core/schema/types.js";
import { isHostFullyReady } from "../../adapters/dota2/scanner/host-status.js";
import {
  generateCleanupPlan,
  executeCleanup,
  formatCleanupPlan,
  formatCleanupResult,
} from "../../adapters/dota2/regenerate/index.js";
import type { CleanupPlan, CleanupExecutionResult } from "../../adapters/dota2/regenerate/index.js";
import type { RollbackPlan, RollbackExecutionResult } from "../../adapters/dota2/rollback/index.js";
import { shouldUseArtifactSynthesis } from "../../adapters/dota2/synthesis/index.js";
import { applyDota2GrantSeam } from "../../adapters/dota2/cross-feature/index.js";
import { resolveReviewArtifactOutputDir } from "./dota2/review-artifacts.js";
import { createRollbackReviewArtifact } from "./dota2/rollback-artifact.js";
import { saveCreateSemanticArtifacts, type SemanticArtifactSummary } from "./dota2/semantic-artifacts.js";
import { runDeleteCommand } from "./dota2/commands/delete.js";
import { runGapFillCommand } from "./dota2/commands/gap-fill.js";
import type { GapFillMode } from "../../core/gap-fill/index.js";
import { runRollbackCommand } from "./dota2/commands/rollback.js";
import { runRegenerateCommand } from "./dota2/commands/regenerate.js";
import { runUpdateCommand } from "./dota2/commands/update.js";
import { runValidateCommand } from "./dota2/commands/validate.js";
import { runRepairCommand } from "./dota2/commands/repair.js";
import { runDoctorCommand } from "./dota2/commands/doctor.js";
import { runDemoCommand } from "./dota2/commands/demo.js";
import { runLifecycleProofCommand } from "./dota2/commands/lifecycle-proof.js";
import {
  buildAssemblyPlan,
  buildBlueprint,
  buildUpdateBlueprint,
  createIntentSchema,
  createUpdateIntent,
  createWritePlan,
  getFeatureMode,
  resolveStableFeatureId,
  resolveExistingFeatureContext,
  resolvePatternsFromBlueprint,
} from "./dota2/planning.js";
import type { Dota2BlueprintBuildResult } from "./dota2/planning.js";
import { executeWrite } from "./dota2/write-executor.js";
import { runLocalRepairWithLLM } from "../../core/local-repair/index.js";
import { buildFinalValidationStatus, calculateFinalCommitDecision } from "../../core/pipeline/final-commit-gate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export interface Dota2CLIOptions {
  command: "run" | "dry-run" | "review" | "update" | "regenerate" | "rollback" | "delete" | "validate" | "repair" | "doctor" | "demo" | "lifecycle" | "gap-fill";
  prompt: string;
  hostRoot: string;
  featureId?: string;
  scenario?: string;
  boundaryId?: string;
  instruction?: string;
  approvalFile?: string;
  gapFillMode?: GapFillMode;
  apply?: boolean;
  dryRun: boolean;
  write: boolean;
  force: boolean;
  safe?: boolean;
  output?: string;
  verbose: boolean;
  addonName?: string;
  mapName?: string;
}

export interface Dota2ReviewArtifact {
  version: string;
  generatedAt: string;
  commandKind: "creation" | "maintenance";
  applicableStages: string[];
  cliOptions: {
    command: string;
    prompt: string;
    hostRoot: string;
    featureId?: string;
    dryRun: boolean;
    write: boolean;
    force: boolean;
  };
  input: {
    rawPrompt: string;
    goal: string;
  };
  intentSchema: {
    usedFallback: boolean;
    intentKind: string;
    uiNeeded: boolean;
    readiness?: string;
    mechanics: string[];
    promptPackageId?: string;
    promptConstraints?: {
      mustPreserve: string[];
      mustNotAdd: string[];
      exactScalars: Record<string, string | number | boolean>;
      openSemanticGaps: string[];
    };
    retrieval?: {
      summary: string;
      tiersUsed: number[];
      evidenceRefs: Array<{ title: string; sourceKind: string; path?: string }>;
    };
  };
  updateContext?: {
    currentFeatureContext: CurrentFeatureContext;
    requestedChangeIntentSchema: ReviewIntentSchema;
    updateIntent: UpdateIntent;
  };
  clarificationPlan?: WizardClarificationPlan;
  clarificationAuthority?: WizardClarificationAuthority;
  relationCandidates?: RelationCandidate[];
  workspaceSemanticContext?: WorkspaceSemanticContext;
  semanticArtifacts?: SemanticArtifactSummary;
  moduleTruth?: {
    totalModules: number;
    sourceBreakdown: { family: number; pattern: number; synthesized: number };
    unresolvedModuleNeeds: string[];
  };
  stages: {
    intentSchema: { success: boolean; summary: string; issues: string[]; usedFallback?: boolean; skipped?: boolean };
    blueprint: {
      success: boolean;
      summary: string;
      moduleCount: number;
      patternHints: string[];
      issues: string[];
      modulePlanning?: Array<{
        moduleId: string;
        role: string;
        planningKind?: string;
        backboneKind?: string;
        facetIds?: string[];
      }>;
      moduleFacets?: Array<{
        facetId: string;
        backboneModuleId: string;
        kind: string;
        role: string;
      }>;
      moduleSourceBreakdown?: { family: number; pattern: number; synthesized: number };
      familyAdmission?: SelectionPoolAdmissionDiagnostics;
      skipped?: boolean;
    };
    patternResolution: {
      success: boolean;
      resolvedPatterns: string[];
      unresolvedPatterns: string[];
      issues: string[];
      complete: boolean;
      resolvedModules?: Array<{ moduleId: string; sourceKind: string; patternId?: string; familyId?: string }>;
      unresolvedModuleNeeds?: Array<{
        moduleId: string;
        reason: string;
        category: string;
        role: string;
        backboneKind?: string;
        facetIds?: string[];
      }>;
      skipped?: boolean;
    };
    artifactSynthesis?: {
      success: boolean;
      triggered: boolean;
      strategy?: string;
      sourceKind?: string;
      promptPackageId?: string;
      artifacts: Array<{ id: string; moduleId: string; outputKind: string; targetPath: string; summary: string }>;
      bundles?: Array<{
        bundleId: string;
        kind: string;
        primaryModuleId: string;
        moduleIds: string[];
        artifactIds: string[];
      }>;
      moduleBundleMap?: Array<{ moduleId: string; bundleId: string }>;
      bundleArtifacts?: Array<{ bundleId: string; artifactIds: string[]; targetPaths: string[] }>;
      synthesizedModuleIds?: string[];
      warnings: string[];
      blockers: string[];
      retrievalSummary?: string;
      evidenceRefs?: Array<{ title: string; sourceKind: string; path?: string }>;
      mustNotAddViolations?: string[];
      grounding?: Array<{
        artifactId: string;
        verifiedSymbols: string[];
        allowlistedSymbols: string[];
        weakSymbols: string[];
        unknownSymbols: string[];
        warnings: string[];
      }>;
      skipped?: boolean;
    };
    assemblyPlan: { success: boolean; selectedPatterns: string[]; writeTargets: string[]; readyForHostWrite: boolean; blockers: string[]; skipped?: boolean };
    hostRealization: { success: boolean; units: Array<{ id: string; sourceModuleId: string; sourcePatternIds: string[]; sourceKind?: string; role: string; realizationType: string; hostTargets: string[]; confidence: string; blockers?: string[] }>; blockers: string[]; skipped?: boolean };
    /** T115: Generator routing - routes realization to generator families */
    generatorRouting?: { success: boolean; routes: Array<{ id: string; sourceUnitId: string; sourceKind?: string; generatorFamily: string; routeKind: string; hostTarget: string; rationale: string[]; blockers?: string[] }>; warnings: string[]; blockers: string[]; skipped?: boolean };
    /** Packet D: Governance pre-flight check */
    governanceCheck?: { success: boolean; hasConflict: boolean; conflicts: Array<{ kind: string; severity: string; conflictingPoint: string; existingFeatureId: string; existingFeatureLabel: string; explanation: string }>; recommendedAction: string; status: string; summary: string };
    /** T115-R2: Added deferredEntries to track deferred entries separately from generatedFiles */
    generator: { success: boolean; generatedFiles: string[]; issues: string[]; skipped?: boolean; deferredEntries?: Array<{ pattern: string; reason: string }>; /** T112-R1: Realization context from write plan */ realizationContext?: { version: string; host: string; sourceBlueprintId: string; units: Array<{ id: string; sourcePatternIds: string[]; realizationType: string; hostTargets: string[]; confidence: string }>; isFallback: boolean }; /** T112-R2: Warnings for deferred entries */ deferredWarnings?: string[] };
    localRepair?: {
      success: boolean;
      triggered: boolean;
      attempted: boolean;
      repairedTargets: string[];
      warnings: string[];
      blockers: string[];
      promptPackageId?: string;
      evidenceRefs?: Array<{ title: string; sourceKind: string; path?: string }>;
      boundaryHonored?: boolean;
      revalidationPassed?: boolean;
      skipped?: boolean;
    };
    dependencyRevalidation?: {
      success: boolean;
      impactedFeatures: Array<{ featureId: string; label: string; outcome: string; issues: string[] }>;
      blockers: string[];
      downgradedFeatures: string[];
      compatibleFeatures: string[];
      skipped?: boolean;
    };
    finalCommitDecision?: {
      success: boolean;
      outcome: string;
      requiresReview: boolean;
      reasons: string[];
      reviewModules?: string[];
      impactedFeatures: string[];
      dependencyBlockers: string[];
      downgradedFeatures: string[];
      skipped?: boolean;
    };
    writeExecutor: { success: boolean; executedActions: number; skippedActions: number; failedActions: number; createdFiles: string[]; modifiedFiles: string[]; blockedByReadinessGate?: boolean; readinessBlockers?: string[]; skipped?: boolean };
    hostValidation: { success: boolean; checks: string[]; issues: string[]; details: Record<string, unknown>; skipped?: boolean };
    runtimeValidation: { success: boolean; serverPassed: boolean; uiPassed: boolean; serverErrors: number; uiErrors: number; limitations: string[]; skipped?: boolean };
    workspaceState: { success: boolean; featureId: string; totalFeatures: number; error?: string; skipped?: boolean };
    cleanupPlan?: {
      filesToDelete: string[];
      filesToCreate: string[];
      filesToRefresh: string[];
      filesUnchanged: string[];
      previousRevision: number;
      nextRevision: number;
      canExecute: boolean;
      executedDeletes: string[];
      deleteFailures: { file: string; error: string }[];
      skippedDeletes: string[];
    };
    updateDiff?: {
      totalFiles: number;
      unchanged: number;
      refreshed: number;
      created: number;
      deleted: number;
      unchangedFiles: string[];
      refreshedFiles: string[];
      createdFiles: string[];
      deletedFiles: string[];
      requiresRegenerate: boolean;
      regenerateReasons: string[];
      canUpdate: boolean;
    };
    rollbackPlan?: {
      featureId: string;
      currentRevision: number;
      filesToDelete: string[];
      bridgeEffectsToRefresh: string[];
      ownershipValid: boolean;
      safetyIssues: string[];
      canExecute: boolean;
      executedDeletes: string[];
      deleteFailures: { file: string; error: string }[];
      skippedDeletes: string[];
      indexRefreshSuccess: boolean;
    };
  };
  finalVerdict: {
    pipelineComplete: boolean;
    completionKind: "default-safe" | "forced" | "partial" | "requires-regenerate";
    weakestStage: string;
    sufficientForDemo: boolean;
    hasUnresolvedPatterns: boolean;
    wasForceOverride: boolean;
    remainingRisks: string[];
    nextSteps: string[];
  };
}

export function showDota2Help(): void {
  console.log(`
🧙 Rune Weaver - Dota2 宿主命令

使用方式:
  npm run cli -- dota2 run "<prompt>" --host <path>
  npm run cli -- dota2 dry-run "<prompt>" --host <path>
  npm run cli -- dota2 review "<prompt>" --host <path>
  npm run cli -- dota2 regenerate "<prompt>" --host <path> --feature <id>
  npm run cli -- dota2 validate --host <path>
  npm run cli -- dota2 repair --host <path> [--safe]
  npm run cli -- dota2 doctor --host <path>
  npm run cli -- dota2 gap-fill --boundary <id> --host <path> --instruction "..." --mode review
  npm run cli -- dota2 gap-fill --feature <id> --host <path> --instruction "..." --mode review
  npm run cli -- dota2 gap-fill --boundary <id> --host <path> --instruction "..." --mode apply
  npm run cli -- dota2 gap-fill --host <path> --approve <file> --mode apply
  npm run cli -- dota2 gap-fill --host <path> --approve <file> --mode validate-applied
  npm run cli -- dota2 demo prepare --host <path> --addon-name <name> --map <map>
  npm run cli -- dota2 lifecycle prove --host <path> --write

命令:
  run        运行完整主链路（默认 dry-run 模式�?
  dry-run    预演模式，不写入文件
  review     生成 review artifact，不写入文件
  regenerate 重新生成已有 feature
  validate   验证生成的文�?  repair     bounded local repair / muscle fill  doctor     检查宿主运行准备状�?  demo       生成 demo prepare runbook
  lifecycle  运行 Talent Draw 生命周期证明计划
  launch     启动 Dota2 Tools 进行测试
  gap-fill   repair 的兼容 alias，用于 boundary-local muscle fill

选项:
  --host <path>       宿主项目根目�?(必需)
  --feature <id>      Feature ID (regenerate 必需)
  --boundary <id>     repair / muscle boundary ID
  --feature <id>      repair 可选：从 workspace 解析适用 boundary
  --instruction <s>   repair / muscle instruction text
  --mode <mode>       repair lifecycle mode: review | apply | validate-applied
  --apply             兼容旧参数：等同于 --mode apply
  --approve <file>    批准并执行先前生成的 repair approval record
  --addon-name <name> Dota2 addon 名称 (demo prepare/init 使用)
  --map <name>        Dota2 地图�?(demo prepare/launch 使用)
  --scenario <id>     lifecycle/demo scenario id
  --dry-run           预演模式，不写入文件 (默认)
  --write             正式写入模式
  --force             强制覆盖 readiness gate
  -o, --output <path> 输出 review artifact 到指定路�?
  -v, --verbose       详细输出

安全控制:
  - 默认行为: dry-run 模式，不写入文件
  - --write: 正式写入，但尊重 readiness gate
  - --force: 强制写入，覆�?readiness gate (需配合 --write)

示例:
  # 预演模式
  npm run cli -- dota2 run "做一个按Q键的冲刺技�? --host D:\\test1

  # 正式写入
  npm run cli -- dota2 run "做一个按Q键的冲刺技�? --host D:\\test1 --write

  # 强制写入
  npm run cli -- dota2 run "做一个按Q键的冲刺技�? --host D:\\test1 --write --force

  # 重新生成已有 feature (预演)
  npm run cli -- dota2 regenerate "做一个按Q键的冲刺技�? --host D:\\test1 --feature rw_dash_q

  # 重新生成已有 feature (正式写入)
  npm run cli -- dota2 regenerate "做一个按Q键的冲刺技�? --host D:\\test1 --feature rw_dash_q --write

  # 启动 Dota2 Tools
  npm run cli -- dota2 launch --host D:\\test1

  # 宿主体检
  npm run cli -- dota2 doctor --host D:\\test1

  # Demo 准备 runbook
  npm run cli -- dota2 demo prepare --host D:\\test1 --addon-name talent_draw_demo --map temp

  # Talent Draw lifecycle proof
  npm run cli -- dota2 lifecycle prove --host D:\\test1 --addon-name talent_draw_demo --map temp --write

  # Gap fill business-logic boundary by feature
  npm run cli -- dota2 gap-fill --host D:\\test1 --feature standalone_system_abcd --instruction "补全稀有度到属性加成的映射逻辑"

  # 输出 review artifact
  npm run cli -- dota2 run "做一个按Q键的冲刺技�? --host D:\\test1 -o tmp/cli-review/result.json
`);
}

export async function runDota2CLI(options: Dota2CLIOptions): Promise<boolean> {
  if (options.command === "regenerate") {
    return await runRegenerateCommand(options, {
      createIntentSchema,
      buildBlueprint,
      resolvePatternsFromBlueprint,
      buildAssemblyPlan,
      createWritePlan,
      runPipeline,
    });
  }

  if (options.command === "rollback") {
    return await runRollbackCommand(options);
  }

  if (options.command === "delete") {
    return await runDeleteCommand(options);
  }

  if (options.command === "update") {
    return await runUpdateCommand(options, {
      createUpdateIntent,
      buildUpdateBlueprint,
      resolvePatternsFromBlueprint,
      buildAssemblyPlan,
      createWritePlan,
      generateCodeContent,
    });
  }

  if (options.command === "validate") {
    return await runValidateCommand(options);
  }

  if (options.command === "repair") {
    return await runRepairCommand(options, { safe: options.safe ?? false });
  }

  if (options.command === "doctor") {
    return await runDoctorCommand(options);
  }

  if (options.command === "demo") {
    return await runDemoCommand(options);
  }

  if (options.command === "lifecycle") {
    return await runLifecycleProofCommand(options);
  }

  if (options.command === "gap-fill") {
    return await runGapFillCommand(options);
  }

  const artifact = await runPipeline(options);

  const outputDir = resolveReviewArtifactOutputDir(options.output);
  mkdirSync(outputDir, { recursive: true });

  const outputPath = options.output || join(outputDir, `dota2-review-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");

  if (!options.output) {
    console.log(`\n📄 Review artifact saved: ${outputPath}`);
  }

  return (
    artifact.stages.writeExecutor.success &&
    artifact.stages.hostValidation.success &&
    (artifact.stages.finalCommitDecision?.success ?? true) &&
    artifact.stages.workspaceState.success
  );
}

function getIntentSemanticPosture(schema: { uncertainties?: Array<unknown> }): "ready" | "weak" {
  return (schema.uncertainties?.length || 0) > 0 ? "weak" : "ready";
}

function summarizeModuleSources(
  moduleRecords: Array<{ sourceKind?: string }> | undefined,
): { family: number; pattern: number; synthesized: number } {
  const summary = { family: 0, pattern: 0, synthesized: 0 };
  if (!moduleRecords) {
    return summary;
  }

  for (const record of moduleRecords) {
    if (record.sourceKind === "family") {
      summary.family += 1;
    } else if (record.sourceKind === "pattern") {
      summary.pattern += 1;
    } else if (record.sourceKind === "synthesized") {
      summary.synthesized += 1;
    }
  }

  return summary;
}

function buildSynthesisBundleView(plan: AssemblyPlan | null | undefined): NonNullable<Dota2ReviewArtifact["stages"]["artifactSynthesis"]>["bundles"] {
  if (!plan?.artifactSynthesisResult?.bundles || plan.artifactSynthesisResult.bundles.length === 0) {
    return [];
  }

  return plan.artifactSynthesisResult.bundles.map((bundle) => ({
    bundleId: bundle.bundleId,
    kind: bundle.kind,
    primaryModuleId: bundle.primaryModuleId,
    moduleIds: bundle.moduleIds,
    artifactIds: (plan.artifactSynthesisResult?.artifacts || [])
      .filter((artifact) => artifact.bundleId === bundle.bundleId)
      .map((artifact) => artifact.id),
  }));
}

function buildSynthesisModuleBundleMap(plan: AssemblyPlan | null | undefined): NonNullable<Dota2ReviewArtifact["stages"]["artifactSynthesis"]>["moduleBundleMap"] {
  if (!plan?.moduleRecords || plan.moduleRecords.length === 0) {
    return [];
  }

  return plan.moduleRecords
    .filter((record) => record.sourceKind === "synthesized" && typeof record.bundleId === "string")
    .map((record) => ({
      moduleId: record.moduleId,
      bundleId: record.bundleId!,
    }));
}

function buildSynthesisBundleArtifacts(plan: AssemblyPlan | null | undefined): NonNullable<Dota2ReviewArtifact["stages"]["artifactSynthesis"]>["bundleArtifacts"] {
  if (!plan?.artifactSynthesisResult?.bundles || plan.artifactSynthesisResult.bundles.length === 0) {
    return [];
  }

  return plan.artifactSynthesisResult.bundles.map((bundle) => {
    const artifacts = (plan.artifactSynthesisResult?.artifacts || []).filter(
      (artifact) => artifact.bundleId === bundle.bundleId,
    );
    return {
      bundleId: bundle.bundleId,
      artifactIds: artifacts.map((artifact) => artifact.id),
      targetPaths: artifacts.map((artifact) => artifact.targetPath),
    };
  });
}

async function runPipeline(options: Dota2CLIOptions): Promise<Dota2ReviewArtifact> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Dota2 Pipeline");
  console.log("=".repeat(70));
  console.log(`\n📝 Input: "${options.prompt}"`);
  console.log(`📁 Host: ${options.hostRoot}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : options.write ? (options.force ? "write (force)" : "write") : "dry-run"}`);
  const reviewArtifactOutputDir = resolveReviewArtifactOutputDir(options.output);

  const artifact: Dota2ReviewArtifact = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "creation",
    applicableStages: [
      "intentSchema",
      "blueprint",
      "patternResolution",
      "artifactSynthesis",
      "assemblyPlan",
      "hostRealization",
      "generatorRouting",
      "generator",
      "localRepair",
      "dependencyRevalidation",
      "finalCommitDecision",
      "writeExecutor",
      "hostValidation",
      "runtimeValidation",
      "workspaceState"
    ],
    cliOptions: {
      command: options.command,
      prompt: options.prompt,
      hostRoot: options.hostRoot,
      featureId: options.featureId,
      dryRun: options.dryRun,
      write: options.write,
      force: options.force,
    },
    input: {
      rawPrompt: options.prompt,
      goal: options.prompt,
    },
    intentSchema: {
      usedFallback: false,
      intentKind: "unknown",
      uiNeeded: false,
      mechanics: [],
    },
    stages: {
      intentSchema: { success: false, summary: "", issues: [] },
      blueprint: { success: false, summary: "", moduleCount: 0, patternHints: [], issues: [] },
      patternResolution: { success: false, resolvedPatterns: [], unresolvedPatterns: [], issues: [], complete: false },
      artifactSynthesis: { success: true, triggered: false, artifacts: [], warnings: [], blockers: [], skipped: true },
      assemblyPlan: { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers: [] },
      hostRealization: { success: false, units: [], blockers: [] },
      generator: { success: false, generatedFiles: [], issues: [] },
      localRepair: { success: true, triggered: false, attempted: false, repairedTargets: [], warnings: [], blockers: [], skipped: true },
      dependencyRevalidation: { success: true, impactedFeatures: [], blockers: [], downgradedFeatures: [], compatibleFeatures: [], skipped: true },
      finalCommitDecision: { success: false, outcome: "blocked", requiresReview: true, reasons: [], reviewModules: [], impactedFeatures: [], dependencyBlockers: [], downgradedFeatures: [], skipped: true },
      writeExecutor: { success: false, executedActions: 0, skippedActions: 0, failedActions: 0, createdFiles: [], modifiedFiles: [] },
      hostValidation: { success: false, checks: [], issues: [], details: {} },
      runtimeValidation: { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [] },
      workspaceState: { success: true, featureId: "", totalFeatures: 0, skipped: true },
    },
    finalVerdict: {
      pipelineComplete: false,
      completionKind: "partial",
      weakestStage: "",
      sufficientForDemo: false,
      hasUnresolvedPatterns: false,
      wasForceOverride: false,
      remainingRisks: [],
      nextSteps: [],
    },
  };

  const featureMode = getFeatureMode(options.command);
  const existingFeatureContext = resolveExistingFeatureContext(
    options.hostRoot,
    options.featureId,
    featureMode
  );

  if (!existingFeatureContext.success) {
    artifact.stages.workspaceState = {
      success: false,
      featureId: options.featureId || "",
      totalFeatures: 0,
      error: existingFeatureContext.error,
      skipped: false,
    };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks = [existingFeatureContext.error];
    return artifact;
  }

  // Stage 0: Host Readiness Preflight
  // T149: dota2 init �?CLI authoritative create 的正式前置条�?
  // T149-FIX: --force 参数可以绕过初始化检�?
  if (!options.force && !isHostFullyReady(options.hostRoot)) {
    const msg = [
      "宿主未完成初始化，无法执行 create。",
      "",
      "原因: 宿主尚未执行 dota2 init，或初始化未完成。",
      "",
      "请先执行: dota2 init --host " + options.hostRoot,
      "",
      "查看详细状态: dota2 check-host --host " + options.hostRoot,
      "",
      "或者使用 --force 参数绕过此检查（不推荐）。",
    ].join("\n");
    throw new Error(msg);
  }

  if (options.force) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 0: Host Readiness Preflight");
    console.log("=".repeat(70));
    console.log("  ⚠️  Force mode: skipping host readiness check");
    console.log("     This may cause unexpected behavior if the host is not properly initialized.");
  }

  // Stage 1: IntentSchema (try real Wizard first, fallback if needed)
  const intentSchemaResult = await createIntentSchema(options.prompt, options.hostRoot, {
    mode: featureMode,
    featureId: options.featureId || existingFeatureContext.feature?.featureId,
    existingFeature: existingFeatureContext.feature,
    interactive: process.stdin.isTTY && process.stdout.isTTY,
  });
  const {
    schema,
    usedFallback,
    clarificationPlan,
    clarificationAuthority,
    relationCandidates,
    workspaceSemanticContext,
  } = intentSchemaResult;
  artifact.stages.intentSchema = {
    success: schema !== null,
    summary: schema ? `${schema.request.goal} [${getIntentSemanticPosture(schema)}]` : "",
    issues: schema ? [`IntentSchema uncertainties: ${schema.uncertainties?.length || 0}`] : [],
    usedFallback,
  };

  artifact.intentSchema = {
    usedFallback,
    intentKind: schema?.classification.intentKind || "unknown",
    uiNeeded: schema?.uiRequirements?.needed || false,
    readiness: schema ? getIntentSemanticPosture(schema) : undefined,
    mechanics: schema ? Object.entries(schema.normalizedMechanics)
      .filter(([, v]) => v === true)
      .map(([k]) => k) : [],
    promptPackageId: intentSchemaResult.promptPackageId,
    promptConstraints: intentSchemaResult.promptConstraints
      ? {
          mustPreserve: intentSchemaResult.promptConstraints.mustPreserve,
          mustNotAdd: intentSchemaResult.promptConstraints.mustNotAdd,
          exactScalars: intentSchemaResult.promptConstraints.exactScalars,
          openSemanticGaps: intentSchemaResult.promptConstraints.openSemanticGaps,
        }
      : undefined,
    retrieval: intentSchemaResult.retrievalBundle
      ? {
          summary: intentSchemaResult.retrievalBundle.summary,
          tiersUsed: intentSchemaResult.retrievalBundle.tiersUsed,
          evidenceRefs: intentSchemaResult.retrievalBundle.evidenceRefs.map((item) => ({
            title: item.title,
            sourceKind: item.sourceKind,
            path: item.path,
          })),
        }
      : undefined,
  };
  artifact.clarificationPlan = clarificationPlan;
  artifact.clarificationAuthority = clarificationAuthority;
  artifact.relationCandidates = relationCandidates;
  artifact.workspaceSemanticContext = workspaceSemanticContext;

  if (!schema) {
    artifact.finalVerdict.weakestStage = "intentSchema";
    artifact.finalVerdict.remainingRisks = ["Failed to create IntentSchema"];
    return artifact;
  }

  if (clarificationAuthority.blocksBlueprint) {
    artifact.finalVerdict.weakestStage = "intentSchema";
    artifact.finalVerdict.remainingRisks = clarificationAuthority.reasons.length > 0
      ? clarificationAuthority.reasons
      : ["IntentSchema requires clarification before Blueprint generation can continue."];
    artifact.finalVerdict.nextSteps = ["Answer the clarification questions and rerun the command."];
    return artifact;
  }

  // Stage 2: Blueprint
  const {
    blueprint: blueprintDraft,
    finalBlueprint,
    issues: blueprintIssues,
    status: blueprintStatus,
    moduleNeedsCount,
    admissionDiagnostics,
  }: Dota2BlueprintBuildResult = buildBlueprint(
    schema,
    {
      prompt: options.prompt,
      hostRoot: options.hostRoot,
      mode: featureMode,
      featureId: options.featureId || existingFeatureContext.feature?.featureId,
      existingFeature: existingFeatureContext.feature,
      proposalSource: usedFallback ? "fallback" : "llm",
    },
    clarificationAuthority,
  );
  let blueprint = finalBlueprint;
  const blueprintView = finalBlueprint || blueprintDraft;
  const canContinueBlueprint = blueprint?.commitDecision?.canAssemble ?? false;
  artifact.stages.blueprint = {
    success: blueprint !== null && canContinueBlueprint,
    summary: `FinalBlueprint ${blueprintStatus} (moduleNeeds: ${moduleNeedsCount})`,
    moduleCount: blueprintView?.modules.length || 0,
    patternHints: blueprintView?.patternHints.flatMap((h) => h.suggestedPatterns) || [],
    issues: blueprintIssues,
    modulePlanning: blueprintView?.modules.map((module) => ({
      moduleId: module.id,
      role: module.role,
      planningKind: module.planningKind,
      backboneKind: module.backboneKind,
      facetIds: module.facetIds,
    })),
    moduleFacets: blueprintView?.moduleFacets?.map((facet) => ({
      facetId: facet.facetId,
      backboneModuleId: facet.backboneModuleId,
      kind: facet.kind,
      role: facet.role,
    })),
    moduleSourceBreakdown: summarizeModuleSources(blueprintView?.moduleRecords),
    familyAdmission: admissionDiagnostics,
  };

  if (!blueprint || !canContinueBlueprint) {
    artifact.finalVerdict.weakestStage = "blueprint";
    artifact.finalVerdict.remainingRisks = blueprintIssues.length > 0
      ? blueprintIssues
      : [`FinalBlueprint ${blueprintStatus}`];
    return artifact;
  }

  const stableFeatureId = resolveStableFeatureId({
    existingFeatureId: existingFeatureContext.feature?.featureId,
    explicitFeatureId: options.featureId,
    prompt: options.prompt,
    blueprintId: blueprint.id,
  });
  try {
    artifact.semanticArtifacts = saveCreateSemanticArtifacts({
      hostRoot: options.hostRoot,
      featureId: stableFeatureId,
      dryRun: options.dryRun || !options.write,
      reviewOutputDir: reviewArtifactOutputDir,
      intentSchema: schema,
      blueprint: blueprintDraft || undefined,
      finalBlueprint: blueprint || undefined,
      commandKind: "create",
      generatedAt: artifact.generatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    artifact.finalVerdict.remainingRisks.push(`Failed to export create semantic artifacts: ${message}`);
  }

  // Stage 3: Pattern Resolution
  const resolutionResult = resolvePatternsFromBlueprint(blueprint);
  const usesArtifactSynthesis = shouldUseArtifactSynthesis(blueprint, resolutionResult);
  const resolvedModuleSourceBreakdown = summarizeModuleSources(resolutionResult.moduleRecords);
  artifact.stages.patternResolution = {
    success: resolutionResult.patterns.length > 0 || usesArtifactSynthesis,
    resolvedPatterns: resolutionResult.patterns.map((p) => p.patternId),
    unresolvedPatterns: resolutionResult.unresolved.map((u) => u.requestedId),
    issues: resolutionResult.issues.map((i) => i.message),
    complete: resolutionResult.complete,
    resolvedModules: resolutionResult.moduleRecords.map((record) => ({
      moduleId: record.moduleId,
      sourceKind: record.sourceKind,
      patternId: record.patternId,
      familyId: record.familyId,
    })),
    unresolvedModuleNeeds: resolutionResult.unresolvedModuleNeeds.map((need) => ({
      moduleId: need.moduleId,
      reason: need.reason,
      category: need.category,
      role: need.semanticRole,
      backboneKind: need.backboneKind,
      facetIds: need.facetIds,
    })),
  };

  console.log(`  Resolved modules: ${resolutionResult.moduleRecords.length}`);
  console.log(
    `    - family: ${resolvedModuleSourceBreakdown.family}, pattern: ${resolvedModuleSourceBreakdown.pattern}, synthesized: ${resolvedModuleSourceBreakdown.synthesized}`,
  );
  console.log(`  Unresolved module needs: ${resolutionResult.unresolvedModuleNeeds.length}`);

  if (resolutionResult.patterns.length === 0 && !usesArtifactSynthesis) {
    artifact.finalVerdict.weakestStage = "patternResolution";
    artifact.finalVerdict.remainingRisks = ["No patterns resolved"];
    return artifact;
  }

  // Stage 4: AssemblyPlan
  const { plan, blockers } = await buildAssemblyPlan(
    blueprint,
    resolutionResult,
    options.hostRoot,
    stableFeatureId,
  );
  artifact.stages.assemblyPlan = {
    success: plan !== null,
    selectedPatterns: plan?.selectedPatterns.map((p) => p.patternId) || [],
    writeTargets: plan?.writeTargets.map((t) => t.path) || [],
    readyForHostWrite: plan?.readyForHostWrite || false,
    blockers,
  };

  artifact.stages.artifactSynthesis = plan?.artifactSynthesisResult
    ? {
        success: plan.artifactSynthesisResult.success,
        triggered: true,
        strategy: plan.artifactSynthesisResult.strategy,
        sourceKind: plan.artifactSynthesisResult.sourceKind,
        promptPackageId: plan.artifactSynthesisResult.promptPackageId,
        artifacts: plan.artifactSynthesisResult.artifacts.map((item) => ({
          id: item.id,
          moduleId: item.moduleId,
          outputKind: item.outputKind,
          targetPath: item.targetPath,
          summary: item.summary,
        })),
        bundles: buildSynthesisBundleView(plan),
        moduleBundleMap: buildSynthesisModuleBundleMap(plan),
        bundleArtifacts: buildSynthesisBundleArtifacts(plan),
        synthesizedModuleIds: plan.artifactSynthesisResult.moduleResults?.map((item) => item.moduleId) || [],
        warnings: plan.artifactSynthesisResult.warnings,
        blockers: plan.artifactSynthesisResult.blockers,
        retrievalSummary: plan.artifactSynthesisResult.retrievalSummary?.tiersUsed.length
          ? `${plan.artifactSynthesisResult.retrievalSummary.evidenceCount} refs across tiers ${plan.artifactSynthesisResult.retrievalSummary.tiersUsed.join(", ")}`
          : undefined,
        evidenceRefs: plan.artifactSynthesisResult.evidenceRefs?.map((item) => ({
          title: item.title,
          sourceKind: item.sourceKind,
          path: item.path,
        })),
        mustNotAddViolations: plan.artifactSynthesisResult.moduleResults?.flatMap((item) => item.mustNotAddViolations || []) || [],
        grounding: plan.artifactSynthesisResult.grounding?.map((item) => ({
          artifactId: item.artifactId,
          verifiedSymbols: item.verifiedSymbols,
          allowlistedSymbols: item.allowlistedSymbols,
          weakSymbols: item.weakSymbols,
          unknownSymbols: item.unknownSymbols,
          warnings: item.warnings,
        })),
      }
    : {
        success: true,
        triggered: false,
        artifacts: [],
        warnings: [],
        blockers: [],
        skipped: true,
      };

  if (!plan) {
    artifact.finalVerdict.weakestStage = "assemblyPlan";
    artifact.finalVerdict.remainingRisks = blockers;
    return artifact;
  }

  if (plan.artifactSynthesisResult?.bundles?.length) {
    console.log(`     Synthesized Bundles: ${plan.artifactSynthesisResult.bundles.length}`);
    for (const bundle of plan.artifactSynthesisResult.bundles) {
      const bundleArtifacts = plan.artifactSynthesisResult.artifacts.filter(
        (artifactItem) => artifactItem.bundleId === bundle.bundleId,
      );
      console.log(
        `       - ${bundle.bundleId}: ${bundle.kind} | modules=${bundle.moduleIds.join(", ")} | artifacts=${bundleArtifacts.length}`,
      );
    }
  }

  // Stage 4.5: Host Realization
  let hostRealizationPlan: HostRealizationPlan | null = null;
  try {
    hostRealizationPlan = realizeDota2Host(plan);
    console.log("\n" + "=".repeat(70));
    console.log("Stage 4.5: Host Realization");
    console.log("=".repeat(70));
    console.log(summarizeRealization(hostRealizationPlan));

    artifact.stages.hostRealization = {
      success: hostRealizationPlan.blockers.length === 0,
      units: hostRealizationPlan.units.map((u) => ({
        id: u.id,
        sourceModuleId: u.sourceModuleId,
        sourcePatternIds: u.sourcePatternIds,
        sourceKind: u.sourceKind,
        role: u.role,
        realizationType: u.realizationType,
        hostTargets: u.hostTargets,
        confidence: u.confidence,
        blockers: u.blockers,
      })),
      blockers: hostRealizationPlan.blockers,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  �?Host Realization failed: ${message}`);
    artifact.stages.hostRealization = {
      success: false,
      units: [],
      blockers: [message],
    };
    artifact.finalVerdict.weakestStage = "hostRealization";
    artifact.finalVerdict.remainingRisks = [message];
    return artifact;
  }

  // Stage 4.6: Generator Routing (T115)
  // Routes HostRealizationPlan to concrete generator families
  let generatorRoutingPlan: GeneratorRoutingPlan | null = null;
  try {
    generatorRoutingPlan = generateGeneratorRoutingPlan(hostRealizationPlan);
    
    console.log("\n" + "=".repeat(70));
    console.log("Stage 4.6: Generator Routing");
    console.log("=".repeat(70));
    
    // Summarize routing results
    const tsRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "ts");
    const uiRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "ui");
    const kvRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "kv");
    const luaRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "lua");
    const bridgeRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "bridge");
    
    console.log(`  Routes: ${generatorRoutingPlan.routes.length} total`);
    console.log(`    - TS routes: ${tsRoutes.length} (${tsRoutes.filter(r => !r.blockers?.length).length} unblocked)`);
    console.log(`    - UI routes: ${uiRoutes.length} (${uiRoutes.filter(r => !r.blockers?.length).length} unblocked)`);
    console.log(`    - KV routes: ${kvRoutes.length} (${kvRoutes.filter(r => !r.blockers?.length).length} unblocked, ${kvRoutes.filter(r => r.blockers?.length).length} blocked)`);
    console.log(`    - Lua routes: ${luaRoutes.length} (${luaRoutes.filter(r => !r.blockers?.length).length} unblocked)`);
    console.log(`    - Bridge routes: ${bridgeRoutes.length}`);
    
    if (generatorRoutingPlan.warnings.length > 0) {
      console.log(`  Warnings:`);
      for (const warning of generatorRoutingPlan.warnings) {
        console.log(`    - ${warning}`);
      }
    }
    
    if (generatorRoutingPlan.blockers.length > 0) {
      console.log(`  Blockers:`);
      for (const blocker of generatorRoutingPlan.blockers) {
        console.log(`    - ${blocker}`);
      }
    }
    
    artifact.stages.generatorRouting = {
      success: generatorRoutingPlan.blockers.length === 0,
      routes: generatorRoutingPlan.routes.map(r => ({
        id: r.id,
        sourceUnitId: r.sourceUnitId,
        sourceKind: r.sourceKind,
        generatorFamily: r.generatorFamily,
        routeKind: r.routeKind,
        hostTarget: r.hostTarget,
        rationale: r.rationale,
        blockers: r.blockers,
      })),
      warnings: generatorRoutingPlan.warnings,
      blockers: generatorRoutingPlan.blockers,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  �?Generator Routing failed: ${message}`);
    artifact.stages.generatorRouting = {
      success: false,
      routes: [],
      warnings: [],
      blockers: [message],
    };
    artifact.finalVerdict.weakestStage = "generatorRouting";
    artifact.finalVerdict.remainingRisks = [message];
    return artifact;
  }

  // Stage 5: Generator
  const { writePlan, issues: generatorIssues } = createWritePlan(
    plan,
    options.hostRoot,
    existingFeatureContext.feature,
    featureMode,
    hostRealizationPlan ?? undefined,
    generatorRoutingPlan ?? undefined,
    stableFeatureId
  );

  if (writePlan && blueprint) {
    const workspaceForGrantSeam = initializeWorkspace(options.hostRoot);
    const grantSeam = applyDota2GrantSeam({
      hostRoot: options.hostRoot,
      featureId: stableFeatureId,
      prompt: options.prompt,
      schema,
      blueprint,
      writePlan,
      relationCandidates,
      clarificationAuthority,
      currentFeature: existingFeatureContext.feature,
      workspaceFeatures: workspaceForGrantSeam.success && workspaceForGrantSeam.workspace
        ? workspaceForGrantSeam.workspace.features
        : [],
    });
    blueprint = grantSeam.blueprint;
    if (grantSeam.notes.length > 0) {
      artifact.stages.blueprint.issues.push(...grantSeam.notes);
    }
    artifact.stages.assemblyPlan.readyForHostWrite = writePlan.readyForHostWrite;
    artifact.stages.assemblyPlan.blockers = [...new Set([...(artifact.stages.assemblyPlan.blockers || []), ...(writePlan.readinessBlockers || [])])];
  }

  // T120-R1: Use helper for generator stage assembly
  artifact.stages.generator = buildGeneratorStage(writePlan, generatorIssues);

  // T120-R1: Build deferred entries info for host validation
  const deferredEntriesInfo = buildDeferredEntriesInfo(writePlan?.entries || []);

  if (!writePlan) {
    artifact.finalVerdict.weakestStage = "generator";
    artifact.finalVerdict.remainingRisks = generatorIssues;
    return artifact;
  }

  artifact.moduleTruth = {
    totalModules: plan.moduleRecords?.length || resolutionResult.moduleRecords.length,
    sourceBreakdown: summarizeModuleSources(plan.moduleRecords || resolutionResult.moduleRecords),
    unresolvedModuleNeeds: (plan.unresolvedModuleNeeds || resolutionResult.unresolvedModuleNeeds).map((need) => need.moduleId),
  };

  const localRepairResult = await runLocalRepairWithLLM(blueprint, writePlan);
  artifact.stages.localRepair = {
    success: localRepairResult.success,
    triggered: localRepairResult.triggered,
    attempted: localRepairResult.attempted,
    repairedTargets: localRepairResult.repairedTargets,
    warnings: localRepairResult.warnings,
    blockers: localRepairResult.blockers,
    promptPackageId: localRepairResult.promptPackageId,
    evidenceRefs: localRepairResult.evidenceRefs.map((item) => ({
      title: item.title,
      sourceKind: item.sourceKind,
      path: item.path,
    })),
    boundaryHonored: localRepairResult.boundaryHonored,
    revalidationPassed: localRepairResult.revalidationPassed,
    skipped: !localRepairResult.triggered,
  };

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5.4: Local Repair");
  console.log("=".repeat(70));
  console.log(`  Triggered: ${localRepairResult.triggered ? "yes" : "no"}`);
  console.log(`  Attempted: ${localRepairResult.attempted ? "yes" : "no"}`);
  if (localRepairResult.repairedTargets.length > 0) {
    console.log(`  Repaired Targets: ${localRepairResult.repairedTargets.length}`);
  }
  if (localRepairResult.warnings.length > 0) {
    for (const warning of localRepairResult.warnings) {
      console.log(`    - ${warning}`);
    }
  }

  if (!localRepairResult.success) {
    artifact.finalVerdict.weakestStage = "localRepair";
    artifact.finalVerdict.remainingRisks = localRepairResult.blockers;
    return artifact;
  }

  // Stage 5.5: Governance Pre-flight Check
  console.log("\n" + "=".repeat(70));
  console.log("Stage 5.5: Governance Pre-flight Check");
  console.log("=".repeat(70));

  const workspaceResult = initializeWorkspace(options.hostRoot);
  const governanceCheck = checkWriteConflicts(
    writePlan,
    workspaceResult.success ? workspaceResult.workspace : null,
    stableFeatureId
  );

  if (governanceCheck.hasConflict && governanceCheck.recommendedAction === "block") {
    artifact.stages.governanceCheck = {
      success: false,
      ...governanceCheck,
    };
    artifact.finalVerdict.weakestStage = "governanceCheck";
    artifact.finalVerdict.remainingRisks = governanceCheck.conflicts.map(c => c.explanation);

    console.log("\n[Governance Check] BLOCKED");
    console.log(governanceCheck.summary);
    for (const conflict of governanceCheck.conflicts) {
      console.log(`  - [${conflict.severity.toUpperCase()}] ${conflict.explanation}`);
    }

    return artifact;
  }

  artifact.stages.governanceCheck = {
    success: true,
    ...governanceCheck,
  };

  if (governanceCheck.hasConflict) {
    console.log(`\n  ⚠️  ${governanceCheck.summary}`);
    for (const conflict of governanceCheck.conflicts) {
      console.log(`     - [${conflict.severity.toUpperCase()}] ${conflict.explanation}`);
    }
  } else {
    console.log(`\n  �?${governanceCheck.summary}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5.6: Dependency Revalidation");
  console.log("=".repeat(70));

  const dependencyRevalidation = analyzeDependencyRevalidation({
    workspace: workspaceResult.success ? workspaceResult.workspace : null,
    providerFeatureId: stableFeatureId,
    nextFeatureContract: blueprint.featureContract,
    lifecycleAction: featureMode,
  });
  artifact.stages.dependencyRevalidation = {
    success: dependencyRevalidation.success,
    impactedFeatures: dependencyRevalidation.impactedFeatures,
    blockers: dependencyRevalidation.blockers,
    downgradedFeatures: dependencyRevalidation.downgradedFeatures,
    compatibleFeatures: dependencyRevalidation.compatibleFeatures,
    skipped: dependencyRevalidation.impactedFeatures.length === 0,
  };

  if (dependencyRevalidation.impactedFeatures.length > 0) {
    console.log(`  Impacted Features: ${dependencyRevalidation.impactedFeatures.length}`);
    for (const impact of dependencyRevalidation.impactedFeatures) {
      console.log(`    - ${impact.featureId}: ${impact.outcome}`);
      for (const issue of impact.issues) {
        console.log(`      * ${issue}`);
      }
    }
  } else {
    console.log("  ✅ No dependent features impacted");
  }
  console.log(`  Compatible dependents: ${dependencyRevalidation.compatibleFeatures.length}`);
  console.log(`  Downgraded dependents: ${dependencyRevalidation.downgradedFeatures.length}`);

  if (!dependencyRevalidation.success) {
    artifact.finalVerdict.weakestStage = "dependencyRevalidation";
    artifact.finalVerdict.remainingRisks = dependencyRevalidation.blockers;
    return artifact;
  }

  // Stage 6: Write Executor
  const { result, review } = await executeWrite(writePlan, options, stableFeatureId);
  const dryRunExecution = Boolean(options.dryRun || !options.write);
  artifact.stages.writeExecutor = {
    success: result?.success || false,
    executedActions: dryRunExecution ? 0 : result?.executed.length || 0,
    skippedActions: dryRunExecution ? (result?.executed.length || 0) + (result?.skipped.length || 0) : result?.skipped.length || 0,
    failedActions: result?.failed.length || 0,
    createdFiles: dryRunExecution ? [] : result?.createdFiles || [],
    modifiedFiles: dryRunExecution ? [] : result?.modifiedFiles || [],
    blockedByReadinessGate: result?.blockedByReadinessGate,
    readinessBlockers: result?.readinessBlockers,
    skipped: dryRunExecution,
  };

  if (!result || !result.success) {
    artifact.finalVerdict.weakestStage = "writeExecutor";
    artifact.finalVerdict.remainingRisks = result?.failed.map((f) => f.error) || ["Unknown error"];
    return artifact;
  }

  // Stage 7: Host Validation (enhanced)
  const hostValidation = validateHost(
    options.hostRoot,
    writePlan,
    result,
    stableFeatureId,
    deferredEntriesInfo,
    dryRunExecution,
  );
  artifact.stages.hostValidation = {
    success: hostValidation.success,
    checks: hostValidation.checks,
    issues: hostValidation.issues,
    details: hostValidation.details,
    skipped: hostValidation.skipped,
  };

  // Stage 8: Runtime Validation
  let runtimeValidationResult: RuntimeValidationResult = 
    { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [], skipped: true };

  if (!options.dryRun && result.success) {
    try {
      const runtimeArtifact = await validateHostRuntime(options.hostRoot);
      runtimeValidationResult = buildRuntimeValidationResult(
        options.dryRun,
        result.success,
        runtimeArtifact
      );
      formatRuntimeValidationOutput(runtimeValidationResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  �?Runtime validation failed: ${errorMessage}`);
      runtimeValidationResult = {
        success: false,
        serverPassed: false,
        uiPassed: false,
        serverErrors: 0,
        uiErrors: 0,
        limitations: [`Runtime validation error: ${errorMessage}`],
      };
    }
  } else {
    runtimeValidationResult = buildRuntimeValidationResult(
      options.dryRun,
      result.success
    );
    formatRuntimeValidationOutput(runtimeValidationResult);
  }

  artifact.stages.runtimeValidation = runtimeValidationResult;

  const finalCommitDecision = calculateFinalCommitDecision({
    blueprint,
    hostBlockers: hostRealizationPlan?.blockers,
    routingBlockers: generatorRoutingPlan?.blockers,
    governanceBlockers:
      governanceCheck.hasConflict && governanceCheck.recommendedAction === "block"
        ? governanceCheck.conflicts.map((conflict) => conflict.explanation)
        : [],
    localRepair: {
      success: localRepairResult.success,
      blockers: localRepairResult.blockers,
      warnings: localRepairResult.warnings,
    },
    dependencyRevalidation,
    hostValidation: {
      success: hostValidation.success,
      issues: hostValidation.issues,
    },
    runtimeValidation: {
      success: runtimeValidationResult.success,
      limitations: runtimeValidationResult.limitations,
      skipped: runtimeValidationResult.skipped,
    },
    dryRun: options.dryRun,
  });
  const finalValidationStatus = buildFinalValidationStatus(
    blueprint,
    {
      blueprint,
      hostBlockers: hostRealizationPlan?.blockers,
      routingBlockers: generatorRoutingPlan?.blockers,
      governanceBlockers:
        governanceCheck.hasConflict && governanceCheck.recommendedAction === "block"
          ? governanceCheck.conflicts.map((conflict) => conflict.explanation)
          : [],
      localRepair: {
        success: localRepairResult.success,
        blockers: localRepairResult.blockers,
        warnings: localRepairResult.warnings,
      },
      dependencyRevalidation,
      hostValidation: {
        success: hostValidation.success,
        issues: hostValidation.issues,
      },
      runtimeValidation: {
        success: runtimeValidationResult.success,
        limitations: runtimeValidationResult.limitations,
        skipped: runtimeValidationResult.skipped,
      },
      dryRun: options.dryRun,
    },
    finalCommitDecision,
  );

  artifact.stages.finalCommitDecision = {
    success: finalCommitDecision.outcome !== "blocked",
    outcome: finalCommitDecision.outcome,
    requiresReview: finalCommitDecision.requiresReview,
    reasons: finalCommitDecision.reasons,
    reviewModules: finalCommitDecision.reviewModules || [],
    impactedFeatures: finalCommitDecision.impactedFeatures || [],
    dependencyBlockers: finalCommitDecision.dependencyBlockers || [],
    downgradedFeatures: finalCommitDecision.downgradedFeatures || [],
  };

  console.log("\n" + "=".repeat(70));
  console.log("Stage 9: Final Commit Decision");
  console.log("=".repeat(70));
  console.log(`  Outcome: ${finalCommitDecision.outcome}`);
  console.log(`  Requires Review: ${finalCommitDecision.requiresReview ? "yes" : "no"}`);
  if ((finalCommitDecision.reviewModules || []).length > 0) {
    console.log(`  Review Modules: ${(finalCommitDecision.reviewModules || []).join(", ")}`);
  }
  if (finalCommitDecision.reasons.length > 0) {
    for (const reason of finalCommitDecision.reasons) {
      console.log(`    - ${reason}`);
    }
  }

  // Stage 10: Workspace State Update (only on real write, and only after final gate)
  let workspaceStateResult: { success: boolean; featureId: string; totalFeatures: number; error?: string; skipped?: boolean } =
    { success: true, featureId: "", totalFeatures: 0, skipped: true };

  if (!options.dryRun && result.success && finalCommitDecision.outcome !== "blocked") {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 10: Workspace State Update");
    console.log("=".repeat(70));

    const finalizedBlueprint = {
      ...blueprint,
      commitDecision: finalCommitDecision,
      validationStatus: finalValidationStatus,
    };

    const workspaceUpdate = updateWorkspaceState(
      options.hostRoot,
      finalizedBlueprint,
      plan,
      writePlan,
      featureMode,
      stableFeatureId,
      existingFeatureContext.feature,
      result
    );

    workspaceStateResult = {
      success: workspaceUpdate.success,
      featureId: workspaceUpdate.featureId,
      totalFeatures: workspaceUpdate.totalFeatures,
      error: workspaceUpdate.error,
      skipped: false,
    };

    if (workspaceUpdate.success && dependencyRevalidation.impactedFeatures.length > 0) {
      const refreshedWorkspace = initializeWorkspace(options.hostRoot);
      if (refreshedWorkspace.success && refreshedWorkspace.workspace) {
        const updatedWorkspace = applyDependencyRevalidationEffects(
          refreshedWorkspace.workspace,
          dependencyRevalidation,
        );
        const saveDependentResult = saveWorkspace(options.hostRoot, updatedWorkspace);
        if (!saveDependentResult.success) {
          workspaceStateResult.success = false;
          workspaceStateResult.error = `Workspace saved, but dependent revalidation state failed: ${saveDependentResult.issues.join(", ")}`;
        }
      }
    }

    if (workspaceStateResult.success) {
      console.log(`  ✅ Workspace state updated`);
      console.log(`     Feature ID: ${workspaceStateResult.featureId}`);
      console.log(`     Total features: ${workspaceStateResult.totalFeatures}`);
    } else {
      console.log(`  ⚠️  Failed to update workspace state: ${workspaceStateResult.error}`);
    }
  } else if (options.dryRun) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 10: Workspace State Update");
    console.log("=".repeat(70));
    console.log(`  ℹ️  Skipped (dry-run mode)`);
  } else if (finalCommitDecision.outcome === "blocked") {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 10: Workspace State Update");
    console.log("=".repeat(70));
    console.log("  ⚠️  Skipped because final commit decision is blocked");
  }

  artifact.stages.workspaceState = {
    success: workspaceStateResult.success,
    featureId: workspaceStateResult.featureId,
    totalFeatures: workspaceStateResult.totalFeatures,
    error: workspaceStateResult.error,
    skipped: workspaceStateResult.skipped,
  };

  // T120-R1: Use helper for final verdict calculation
  const verdictInput: VerdictInput = {
    stages: artifact.stages,
    options: {
      force: options.force,
      dryRun: options.dryRun,
    },
    writePlan,
    runtimeValidationResult: {
      success: runtimeValidationResult.success,
    },
    workspaceStateResult: {
      success: workspaceStateResult.success,
      error: workspaceStateResult.error,
      skipped: workspaceStateResult.skipped,
    },
    hostValidationDetails: hostValidation.details,
  };
  const verdict = calculateFinalVerdict(verdictInput);
  artifact.finalVerdict = verdict;

  return artifact;
}


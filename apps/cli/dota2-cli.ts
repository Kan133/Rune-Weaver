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

import { IntentSchema, Blueprint, AssemblyPlan } from "../../core/schema/types.js";
import { BlueprintBuilder } from "../../core/blueprint/builder.js";
import { resolvePatterns, PatternResolutionResult } from "../../core/patterns/resolver.js";
import { AssemblyPlanBuilder, AssemblyPlanConfig } from "../../core/pipeline/assembly-plan.js";
import { createLLMClientFromEnv, isLLMConfigured } from "../../core/llm/factory.js";
import { runWizardToIntentSchema, extractNumericParameters } from "../../core/wizard/index.js";
import {
  initializeWorkspace,
  saveWorkspace,
  checkDuplicateFeature,
  addFeatureToWorkspace,
  updateFeatureInWorkspace,
  rollbackFeatureInWorkspace,
  extractEntryBindings,
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
  FeatureWriteResult,
  findFeatureById,
} from "../../core/workspace/index.js";

import { createWritePlan as assemblerCreateWritePlan, WritePlan, WritePlanEntry } from "../../adapters/dota2/assembler/index.js";
import { generateCode } from "../../adapters/dota2/generator/index.js";
import { generateAbilityKV } from "../../adapters/dota2/generator/kv/index.js";
import { KVGeneratorInput } from "../../adapters/dota2/generator/kv/types.js";
import {
  executeWritePlan,
  generateWriteReview,
  WritePlan as ExecutorWritePlan,
  WriteAction,
  WriteExecutorOptions,
  WriteReviewArtifact,
  WriteResult,
} from "../../adapters/dota2/executor/index.js";
import {
} from "../../adapters/dota2/validator/runtime-validator.js";
import { calculateFinalVerdict, buildDeferredEntriesInfo, buildGeneratorStage, computeAbilityName, generateKVContentWithIndex, generateCodeContent, alignWritePlanWithExistingFeature, validateHost, buildRuntimeValidationResult, performUpdateHostValidation, performRollbackHostValidation, formatRuntimeValidationOutput, updateWorkspaceState } from "./helpers/index.js";
import type { VerdictInput, HostValidationResult, RuntimeValidationResult, WorkspaceUpdateResult } from "./helpers/index.js";
import { checkWriteConflicts } from "./helpers/governance-check.js";
import { realizeDota2Host, summarizeRealization } from "../../adapters/dota2/realization/index.js";
import type { HostRealizationPlan, GeneratorRoutingPlan } from "../../core/schema/types.js";
import { generateGeneratorRoutingPlan, getRoutesByFamily, getUnblockedRoutes } from "../../adapters/dota2/routing/index.js";
import { isHostFullyReady } from "../../adapters/dota2/scanner/host-status.js";
import {
  generateCleanupPlan,
  executeCleanup,
  formatCleanupPlan,
  formatCleanupResult,
} from "../../adapters/dota2/regenerate/index.js";
import type { CleanupPlan, CleanupExecutionResult } from "../../adapters/dota2/regenerate/index.js";
import {
  executeRollback,
  formatRollbackPlan,
  formatRollbackResult,
} from "../../adapters/dota2/rollback/index.js";
import type { RollbackPlan, RollbackExecutionResult } from "../../adapters/dota2/rollback/index.js";
import {
  classifyUpdateDiff,
  executeSelectiveUpdate,
  formatUpdateDiffResult,
  formatSelectiveUpdateResult,
} from "../../adapters/dota2/update/index.js";
import type { UpdateDiffResult, SelectiveUpdateResult } from "../../adapters/dota2/update/index.js";
import { getDefaultReviewArtifactOutputDir, saveDefaultReviewArtifact, saveReviewArtifact } from "./dota2/review-artifacts.js";
import { createDeleteReviewArtifact } from "./dota2/delete-artifact.js";
import { runDeleteCommand } from "./dota2/commands/delete.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export interface Dota2CLIOptions {
  command: "run" | "dry-run" | "review" | "update" | "regenerate" | "rollback" | "delete";
  prompt: string;
  hostRoot: string;
  featureId?: string;
  dryRun: boolean;
  write: boolean;
  force: boolean;
  output?: string;
  verbose: boolean;
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
    mechanics: string[];
  };
  stages: {
    intentSchema: { success: boolean; summary: string; issues: string[]; usedFallback?: boolean; skipped?: boolean };
    blueprint: { success: boolean; summary: string; moduleCount: number; patternHints: string[]; issues: string[]; skipped?: boolean };
    patternResolution: { success: boolean; resolvedPatterns: string[]; unresolvedPatterns: string[]; issues: string[]; complete: boolean; skipped?: boolean };
    assemblyPlan: { success: boolean; selectedPatterns: string[]; writeTargets: string[]; readyForHostWrite: boolean; blockers: string[]; skipped?: boolean };
    hostRealization: { success: boolean; units: Array<{ id: string; sourceModuleId: string; sourcePatternIds: string[]; role: string; realizationType: string; hostTargets: string[]; confidence: string; blockers?: string[] }>; blockers: string[]; skipped?: boolean };
    /** T115: Generator routing - routes realization to generator families */
    generatorRouting?: { success: boolean; routes: Array<{ id: string; sourceUnitId: string; generatorFamily: string; routeKind: string; hostTarget: string; rationale: string[]; blockers?: string[] }>; warnings: string[]; blockers: string[]; skipped?: boolean };
    /** Packet D: Governance pre-flight check */
    governanceCheck?: { success: boolean; hasConflict: boolean; conflicts: Array<{ kind: string; severity: string; conflictingPoint: string; existingFeatureId: string; existingFeatureLabel: string; explanation: string }>; recommendedAction: string; status: string; summary: string };
    /** T115-R2: Added deferredEntries to track deferred entries separately from generatedFiles */
    generator: { success: boolean; generatedFiles: string[]; issues: string[]; skipped?: boolean; deferredEntries?: Array<{ pattern: string; reason: string }>; /** T112-R1: Realization context from write plan */ realizationContext?: { version: string; host: string; sourceBlueprintId: string; units: Array<{ id: string; sourcePatternIds: string[]; realizationType: string; hostTargets: string[]; confidence: string }>; isFallback: boolean }; /** T112-R2: Warnings for deferred entries */ deferredWarnings?: string[] };
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

命令:
  run        运行完整主链路（默认 dry-run 模式）
  dry-run    预演模式，不写入文件
  review     生成 review artifact，不写入文件
  regenerate 重新生成已有 feature
  launch     启动 Dota2 Tools 进行测试

选项:
  --host <path>       宿主项目根目录 (必需)
  --feature <id>      Feature ID (regenerate 必需)
  --dry-run           预演模式，不写入文件 (默认)
  --write             正式写入模式
  --force             强制覆盖 readiness gate
  -o, --output <path> 输出 review artifact 到指定路径
  -v, --verbose       详细输出

安全控制:
  - 默认行为: dry-run 模式，不写入文件
  - --write: 正式写入，但尊重 readiness gate
  - --force: 强制写入，覆盖 readiness gate (需配合 --write)

示例:
  # 预演模式
  npm run cli -- dota2 run "做一个按Q键的冲刺技能" --host D:\\test1

  # 正式写入
  npm run cli -- dota2 run "做一个按Q键的冲刺技能" --host D:\\test1 --write

  # 强制写入
  npm run cli -- dota2 run "做一个按Q键的冲刺技能" --host D:\\test1 --write --force

  # 重新生成已有 feature (预演)
  npm run cli -- dota2 regenerate "做一个按Q键的冲刺技能" --host D:\\test1 --feature rw_dash_q

  # 重新生成已有 feature (正式写入)
  npm run cli -- dota2 regenerate "做一个按Q键的冲刺技能" --host D:\\test1 --feature rw_dash_q --write

  # 启动 Dota2 Tools
  npm run cli -- dota2 launch --host D:\\test1

  # 输出 review artifact
  npm run cli -- dota2 run "做一个按Q键的冲刺技能" --host D:\\test1 -o tmp/cli-review/result.json
`);
}

export async function runDota2CLI(options: Dota2CLIOptions): Promise<boolean> {
  if (options.command === "regenerate") {
    return await runRegenerateCommand(options);
  }

  if (options.command === "rollback") {
    return await runRollbackCommand(options);
  }

  if (options.command === "delete") {
    return await runDeleteCommand(options);
  }

  if (options.command === "update") {
    return await runUpdateCommand(options);
  }

  const artifact = await runPipeline(options);

  const outputDir = join(process.cwd(), "tmp", "cli-review");
  mkdirSync(outputDir, { recursive: true });

  const outputPath = options.output || join(outputDir, `dota2-review-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");

  if (!options.output) {
    console.log(`\n📄 Review artifact saved: ${outputPath}`);
  }

  return (
    artifact.stages.writeExecutor.success &&
    artifact.stages.hostValidation.success &&
    artifact.stages.workspaceState.success
  );
}

async function runPipeline(options: Dota2CLIOptions): Promise<Dota2ReviewArtifact> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Dota2 Pipeline");
  console.log("=".repeat(70));
  console.log(`\n📝 Input: "${options.prompt}"`);
  console.log(`📁 Host: ${options.hostRoot}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : options.write ? (options.force ? "write (force)" : "write") : "dry-run"}`);

  const artifact: Dota2ReviewArtifact = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "creation",
    applicableStages: [
      "intentSchema",
      "blueprint",
      "patternResolution",
      "assemblyPlan",
      "hostRealization",
      "generatorRouting",
      "generator",
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
      assemblyPlan: { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers: [] },
      hostRealization: { success: false, units: [], blockers: [] },
      generator: { success: false, generatedFiles: [], issues: [] },
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
  // T149: dota2 init 是 CLI authoritative create 的正式前置条件
  // T149-FIX: --force 参数可以绕过初始化检查
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
  const { schema, usedFallback } = await createIntentSchema(options.prompt, options.hostRoot);
  artifact.stages.intentSchema = {
    success: schema !== null,
    summary: schema?.request.goal || "",
    issues: [],
    usedFallback,
  };

  artifact.intentSchema = {
    usedFallback,
    intentKind: schema?.classification.intentKind || "unknown",
    uiNeeded: schema?.uiRequirements?.needed || false,
    mechanics: schema ? Object.entries(schema.normalizedMechanics)
      .filter(([, v]) => v === true)
      .map(([k]) => k) : [],
  };

  if (!schema) {
    artifact.finalVerdict.weakestStage = "intentSchema";
    artifact.finalVerdict.remainingRisks = ["Failed to create IntentSchema"];
    return artifact;
  }

  // Stage 2: Blueprint
  const { blueprint, issues: blueprintIssues } = buildBlueprint(schema);
  artifact.stages.blueprint = {
    success: blueprint !== null,
    summary: blueprint?.summary || "",
    moduleCount: blueprint?.modules.length || 0,
    patternHints: blueprint?.patternHints.flatMap((h) => h.suggestedPatterns) || [],
    issues: blueprintIssues,
  };

  if (!blueprint) {
    artifact.finalVerdict.weakestStage = "blueprint";
    artifact.finalVerdict.remainingRisks = blueprintIssues;
    return artifact;
  }

  const stableFeatureId = existingFeatureContext.feature?.featureId || blueprint.id;

  // Stage 3: Pattern Resolution
  const resolutionResult = resolvePatternsFromBlueprint(blueprint);
  artifact.stages.patternResolution = {
    success: resolutionResult.patterns.length > 0,
    resolvedPatterns: resolutionResult.patterns.map((p) => p.patternId),
    unresolvedPatterns: resolutionResult.unresolved.map((u) => u.requestedId),
    issues: resolutionResult.issues.map((i) => i.message),
    complete: resolutionResult.complete,
  };

  if (resolutionResult.patterns.length === 0) {
    artifact.finalVerdict.weakestStage = "patternResolution";
    artifact.finalVerdict.remainingRisks = ["No patterns resolved"];
    return artifact;
  }

  // Stage 4: AssemblyPlan
  const { plan, blockers } = buildAssemblyPlan(blueprint, resolutionResult, options.hostRoot);
  artifact.stages.assemblyPlan = {
    success: plan !== null,
    selectedPatterns: plan?.selectedPatterns.map((p) => p.patternId) || [],
    writeTargets: plan?.writeTargets.map((t) => t.path) || [],
    readyForHostWrite: plan?.readyForHostWrite || false,
    blockers,
  };

  if (!plan) {
    artifact.finalVerdict.weakestStage = "assemblyPlan";
    artifact.finalVerdict.remainingRisks = blockers;
    return artifact;
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
    console.log(`  ❌ Host Realization failed: ${message}`);
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
    console.log(`  ❌ Generator Routing failed: ${message}`);
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
    generatorRoutingPlan ?? undefined
  );

  // T120-R1: Use helper for generator stage assembly
  artifact.stages.generator = buildGeneratorStage(writePlan, generatorIssues);

  // T120-R1: Build deferred entries info for host validation
  const deferredEntriesInfo = buildDeferredEntriesInfo(writePlan?.entries || []);

  if (!writePlan) {
    artifact.finalVerdict.weakestStage = "generator";
    artifact.finalVerdict.remainingRisks = generatorIssues;
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
    artifact.finalVerdict.overallSuccess = false;

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
    console.log(`\n  ✅ ${governanceCheck.summary}`);
  }

  // Stage 6: Write Executor
  const { result, review } = await executeWrite(writePlan, options, stableFeatureId);
  artifact.stages.writeExecutor = {
    success: result?.success || false,
    executedActions: result?.executed.length || 0,
    skippedActions: result?.skipped.length || 0,
    failedActions: result?.failed.length || 0,
    createdFiles: result?.createdFiles || [],
    modifiedFiles: result?.modifiedFiles || [],
    blockedByReadinessGate: result?.blockedByReadinessGate,
    readinessBlockers: result?.readinessBlockers,
  };

  if (!result || !result.success) {
    artifact.finalVerdict.weakestStage = "writeExecutor";
    artifact.finalVerdict.remainingRisks = result?.failed.map((f) => f.error) || ["Unknown error"];
    return artifact;
  }

  // Stage 7: Host Validation (enhanced)
  const hostValidation = validateHost(options.hostRoot, writePlan, result, stableFeatureId, deferredEntriesInfo);
  artifact.stages.hostValidation = {
    success: hostValidation.success,
    checks: hostValidation.checks,
    issues: hostValidation.issues,
    details: hostValidation.details,
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
      console.log(`  ❌ Runtime validation failed: ${errorMessage}`);
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

  // Stage 9: Workspace State Update (only on real write, not dry-run)
  let workspaceStateResult: { success: boolean; featureId: string; totalFeatures: number; error?: string; skipped?: boolean } = 
    { success: true, featureId: "", totalFeatures: 0, skipped: true };
  
  if (!options.dryRun && result.success) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 9: Workspace State Update");
    console.log("=".repeat(70));

    const workspaceResult = updateWorkspaceState(
      options.hostRoot,
      blueprint,
      plan,
      writePlan,
      featureMode,
      stableFeatureId,
      existingFeatureContext.feature,
      result
    );

    workspaceStateResult = {
      success: workspaceResult.success,
      featureId: workspaceResult.featureId,
      totalFeatures: workspaceResult.totalFeatures,
      error: workspaceResult.error,
      skipped: false,
    };

    if (workspaceResult.success) {
      console.log(`  ✅ Workspace state updated`);
      console.log(`     Feature ID: ${workspaceResult.featureId}`);
      console.log(`     Total features: ${workspaceResult.totalFeatures}`);
    } else {
      console.log(`  ⚠️  Failed to update workspace state: ${workspaceResult.error}`);
    }
  } else if (options.dryRun) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 8: Workspace State Update");
    console.log("=".repeat(70));
    console.log(`  ℹ️  Skipped (dry-run mode)`);
    workspaceStateResult = { success: true, featureId: "", totalFeatures: 0, skipped: true };
  } else {
    // Write failed, skip workspace state update
    workspaceStateResult = { success: true, featureId: "", totalFeatures: 0, skipped: true };
  }

  // Update artifact with workspace state result
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

async function createIntentSchema(prompt: string, hostRoot: string): Promise<{ schema: IntentSchema | null; usedFallback: boolean }> {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: IntentSchema");
  console.log("=".repeat(70));

  // Check if LLM is configured before trying to use it
  if (!isLLMConfigured(process.cwd())) {
    console.log(`  ⚠️  LLM not configured, using fallback`);
    const schema = createFallbackIntentSchema(prompt, hostRoot);
    console.log(`  ℹ️  IntentSchema created via fallback (prompt analysis)`);
    console.log(`     Goal: ${schema.request.goal}`);
    console.log(`     Intent Kind: ${schema.classification.intentKind}`);
    console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);
    return { schema, usedFallback: true };
  }

  // Try to use real Wizard with LLM
  try {
    const client = createLLMClientFromEnv(process.cwd());
    
    const result = await runWizardToIntentSchema({
      client,
      input: {
        rawText: prompt,
        temperature: 1,
        providerOptions: { thinking: { type: "enabled" } },
      },
    });

    if (result.valid && result.schema) {
      const extractedParams = extractNumericParameters(prompt);
      
      const schema = {
        ...result.schema,
        host: {
          kind: "dota2-x-template" as const,
          projectRoot: hostRoot,
        },
        isReadyForBlueprint: true,
        normalizedMechanics: result.schema.normalizedMechanics ?? {
          trigger: false,
          candidatePool: false,
          weightedSelection: false,
          playerChoice: false,
          uiModal: false,
          outcomeApplication: false,
          resourceConsumption: false,
        },
      };

      if (Object.keys(extractedParams).length > 0) {
        (schema as any).parameters = extractedParams;
      }

      console.log(`  ✅ IntentSchema created via LLM Wizard`);
      console.log(`     Goal: ${schema.request.goal}`);
      console.log(`     Intent Kind: ${schema.classification.intentKind}`);
      console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

      return { schema, usedFallback: false };
    } else {
      console.log(`  ⚠️  LLM Wizard returned invalid schema, using fallback`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ⚠️  LLM not available (${message}), using fallback`);
  }

  // Fallback: Analyze prompt to infer intent
  const schema = createFallbackIntentSchema(prompt, hostRoot);
  console.log(`  ℹ️  IntentSchema created via fallback (prompt analysis)`);
  console.log(`     Goal: ${schema.request.goal}`);
  console.log(`     Intent Kind: ${schema.classification.intentKind}`);
  console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

  return { schema, usedFallback: true };
}

function createFallbackIntentSchema(prompt: string, hostRoot: string): IntentSchema {
  const lowerPrompt = prompt.toLowerCase();

  // T138-R1: Extract numeric parameters from prompt
  const extractedParams = extractNumericParameters(prompt);

  // Infer intent kind - be conservative
  let intentKind: "micro-feature" | "standalone-system" = "micro-feature";
  if (lowerPrompt.includes("系统") || lowerPrompt.includes("天赋")) {
    intentKind = "standalone-system";
  }

  // Infer UI requirements - be conservative
  const uiKeywords = ["ui", "界面", "显示", "天赋", "modal", "窗口"];
  const uiNeeded = uiKeywords.some(kw => lowerPrompt.includes(kw));

  // Infer normalized mechanics - only use mechanics that can be resolved by existing patterns
  // Available patterns: input.key_binding, effect.dash, effect.modifier_applier, 
  //                    effect.resource_consume, data.weighted_pool, rule.selection_flow,
  //                    ui.selection_modal, resource.basic_pool
  const normalizedMechanics = {
    trigger: lowerPrompt.includes("按") || lowerPrompt.includes("键") || lowerPrompt.includes("触发"),
    candidatePool: lowerPrompt.includes("选择") && lowerPrompt.includes("天赋"),
    weightedSelection: lowerPrompt.includes("权重") || lowerPrompt.includes("随机"),
    playerChoice: lowerPrompt.includes("选择") && !lowerPrompt.includes("天赋"),
    uiModal: lowerPrompt.includes("天赋") || lowerPrompt.includes("窗口"),
    outcomeApplication: lowerPrompt.includes("冲刺") || lowerPrompt.includes("效果") || lowerPrompt.includes("应用"),
    resourceConsumption: lowerPrompt.includes("消耗") || lowerPrompt.includes("资源"),
  };

  const schema: IntentSchema = {
    version: "1.0",
    host: {
      kind: "dota2-x-template",
      projectRoot: hostRoot,
    },
    request: {
      rawPrompt: prompt,
      goal: prompt,
      nameHint: prompt.replace(/\s+/g, "_").toLowerCase().substring(0, 20),
    },
    classification: {
      intentKind,
      confidence: "medium",
    },
    requirements: {
      functional: [prompt],
      interactions: uiNeeded ? ["UI交互"] : [],
      outputs: [],
    },
    constraints: {
      hostConstraints: ["Dota2 x-template"],
    },
    uiRequirements: {
      needed: uiNeeded,
      surfaces: uiNeeded ? ["selection_modal"] : [],
    },
    normalizedMechanics,
    openQuestions: [],
    resolvedAssumptions: ["Using fallback intent analysis"],
    isReadyForBlueprint: true,
  };

  // T138-R1: Attach extracted parameters to the schema
  // These will flow through Blueprint -> AssemblyPlan -> WritePlanEntry -> KV Generator
  if (Object.keys(extractedParams).length > 0) {
    (schema as any).parameters = extractedParams;
  }

  return schema;
}

function buildBlueprint(schema: IntentSchema): { blueprint: Blueprint | null; issues: string[] } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const builder = new BlueprintBuilder();
  const result = builder.build(schema);

  if (!result.success || !result.blueprint) {
    console.log(`  ❌ Blueprint build failed`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    return { blueprint: null, issues: result.issues.map((i) => i.message) };
  }

  const blueprint = result.blueprint;
  console.log(`  ✅ Blueprint created`);
  console.log(`     ID: ${blueprint.id}`);
  console.log(`     Modules: ${blueprint.modules.length}`);
  console.log(`     Pattern Hints: ${blueprint.patternHints.length}`);

  return { blueprint, issues: [] };
}

function resolvePatternsFromBlueprint(blueprint: Blueprint): PatternResolutionResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Pattern Resolution");
  console.log("=".repeat(70));

  const result = resolvePatterns(blueprint);

  console.log(`  Patterns resolved: ${result.patterns.length}`);
  for (const p of result.patterns) {
    console.log(`    ✅ ${p.patternId}`);
  }

  if (result.unresolved.length > 0) {
    console.log(`  Unresolved patterns: ${result.unresolved.length}`);
    for (const u of result.unresolved) {
      console.log(`    ⚠️  ${u.requestedId}`);
    }
  }

  console.log(`  Complete: ${result.complete}`);
  return result;
}

function buildAssemblyPlan(
  blueprint: Blueprint,
  resolutionResult: PatternResolutionResult,
  hostRoot: string
): { plan: AssemblyPlan | null; blockers: string[] } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: AssemblyPlan");
  console.log("=".repeat(70));

  const config: AssemblyPlanConfig = {
    allowFallback: true,
    allowUnresolved: false,
    hostRoot: hostRoot,
  };

  const builder = new AssemblyPlanBuilder(config);

  try {
    const plan = builder.build(blueprint, resolutionResult);

    console.log(`  ✅ AssemblyPlan created`);
    console.log(`     Blueprint ID: ${plan.blueprintId}`);
    console.log(`     Selected Patterns: ${plan.selectedPatterns.length}`);
    console.log(`     Ready for Host Write: ${plan.readyForHostWrite}`);

    const blockers = plan.hostWriteReadiness?.blockers || [];
    return { plan, blockers };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ AssemblyPlan build failed: ${message}`);
    return { plan: null, blockers: [message] };
  }
}

type FeatureMode = "create" | "update" | "regenerate";

function getFeatureMode(command: Dota2CLIOptions["command"]): FeatureMode {
  if (command === "update") return "update";
  if (command === "regenerate") return "regenerate";
  return "create";
}

function resolveExistingFeatureContext(
  hostRoot: string,
  featureId: string | undefined,
  mode: FeatureMode
): { success: true; workspace: RuneWeaverWorkspace | null; feature: RuneWeaverFeatureRecord | null } | { success: false; error: string } {
  if (mode === "create") {
    return { success: true, workspace: null, feature: null };
  }

  if (!featureId) {
    return { success: false, error: `${mode} requires --feature <featureId>` };
  }

  const workspaceResult = initializeWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    return { success: false, error: `Failed to load workspace for ${mode}: ${workspaceResult.issues.join(", ")}` };
  }

  const feature = findFeatureById(workspaceResult.workspace, featureId);
  if (!feature) {
    return { success: false, error: `Feature '${featureId}' does not exist in workspace` };
  }

  if (feature.status !== "active") {
    return { success: false, error: `Feature '${featureId}' has status '${feature.status}' and cannot be ${mode}d` };
  }

  return { success: true, workspace: workspaceResult.workspace, feature };
}

function createWritePlan(
  assemblyPlan: AssemblyPlan,
  hostRoot: string,
  existingFeature: RuneWeaverFeatureRecord | null,
  mode: FeatureMode,
  hostRealizationPlan?: HostRealizationPlan,
  generatorRoutingPlan?: GeneratorRoutingPlan
): { writePlan: WritePlan | null; issues: string[] } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Generator");
  console.log("=".repeat(70));

  try {
    // T115: Pass routing plan as primary input, realization plan as fallback
    const writePlan = assemblerCreateWritePlan(
      assemblyPlan,
      hostRoot,
      existingFeature?.featureId,
      generatorRoutingPlan ?? undefined,
      hostRealizationPlan ?? undefined
    );

    if (existingFeature) {
      const alignment = alignWritePlanWithExistingFeature(writePlan, existingFeature, mode);
      if (!alignment.ok) {
        return { writePlan: null, issues: alignment.issues };
      }
    }

    console.log(`  ✅ WritePlan created`);
    console.log(`     ID: ${writePlan.id}`);
    console.log(`     Entries: ${writePlan.entries.length}`);

    // T112-R2: Show deferred status and generator family hints
    if (writePlan.stats.deferred > 0) {
      console.log(`     ⚠️  Deferred entries: ${writePlan.stats.deferred} (KV side not yet implemented)`);
    }

    // T112-R2: Show generator family hint distribution
    const familyHints = writePlan.entries.reduce((acc: Record<string, number>, e: WritePlanEntry) => {
      if (e.generatorFamilyHint) {
        acc[e.generatorFamilyHint] = (acc[e.generatorFamilyHint] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    if (Object.keys(familyHints).length > 0) {
      console.log(`     Generator hints: ${Object.entries(familyHints).map(([k, v]) => `${k}:${v}`).join(", ")}`);
    }

    // T112-R2: Show deferred warnings
    if (writePlan.deferredWarnings && writePlan.deferredWarnings.length > 0) {
      console.log(`     Deferred warnings:`);
      for (const warning of writePlan.deferredWarnings) {
        console.log(`       - ${warning}`);
      }
    }

    return { writePlan, issues: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ Generator failed: ${message}`);
    return { writePlan: null, issues: [message] };
  }
}

async function executeWrite(
  writePlan: WritePlan,
  options: Dota2CLIOptions,
  stableFeatureId: string
): Promise<{ result: WriteResult | null; review: WriteReviewArtifact | null }> {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 6: Write Executor");
  console.log("=".repeat(70));

  // T115-R2: Filter out deferred entries - they should not become WriteActions
  // Deferred entries remain in artifact/stats for traceability but don't generate files
  const deferredEntries = writePlan.entries.filter((e) => e.deferred);
  const executableEntries = writePlan.entries.filter((e) => !e.deferred);

  if (deferredEntries.length > 0) {
    console.log(`  ⚠️  Deferred entries (not executing): ${deferredEntries.length}`);
    for (const entry of deferredEntries) {
      console.log(`    - ${entry.sourcePattern}: ${entry.deferredReason || "Generator not yet implemented"}`);
    }
  }

  // T118-R1: Aggregate KV entries by target file to avoid overwriting
  // Multiple KV entries can target the same npc_abilities_custom.txt
  const kvEntries = executableEntries.filter((e) => e.contentType === "kv");
  const nonKvEntries = executableEntries.filter((e) => e.contentType !== "kv");

  // Build aggregated KV actions if any KV entries exist
  const kvActions: WriteAction[] = [];
  if (kvEntries.length > 0) {
    const kvEntriesByTarget = new Map<string, WritePlanEntry[]>();
    for (const entry of kvEntries) {
      const existing = kvEntriesByTarget.get(entry.targetPath) || [];
      existing.push(entry);
      kvEntriesByTarget.set(entry.targetPath, existing);
    }

    for (const [targetPath, entries] of kvEntriesByTarget) {
      // T118-R2: Generate unique ability names for each entry by adding index suffix
      // T121-R6-R1: Also generate Lua wrapper for each ability_lua entry
      // T125-R4: REMOVED - old KV-side lua wrapper generation removed.
      // The normal pipeline now produces proper lua entries via Pattern.outputTypes.
      // Lua abilities generated from normal pipeline carry full metadata and
      // generate complete ability+modifier code (generateLuaAbilityCode).
      // This old wrapper path is superseded and kept only as a compat fallback
      // if any legacy code still references it. It does NOT use pattern metadata.
      const combinedContent = entries.map((e, idx) => {
        return generateKVContentWithIndex(e, idx);
      }).join("\n\n");
      const aggregatedDescription = `KV aggregation: ${entries.length} abilities -> ${targetPath}`;
      console.log(`  [KV] Aggregated ${entries.length} entries into ${targetPath}`);
      kvActions.push({
        type: "create",
        targetPath,
        content: combinedContent,
        rwOwned: true,
        description: aggregatedDescription,
      });
    }
  }

  // Non-KV actions are generated individually
  const nonKvActions: WriteAction[] = nonKvEntries.map((entry) => ({
    type: entry.operation === "create" ? "create" : "refresh",
    targetPath: entry.targetPath,
    content: generateCodeContent(entry),
    rwOwned: true,
    description: entry.contentSummary,
  }));

  const actions: WriteAction[] = [...nonKvActions, ...kvActions];

  // T118-R2: Compute file lists from aggregated actions, not from raw executableEntries
  // This ensures KV targets appear once even if multiple KV entries were aggregated
  const executorPlan: ExecutorWritePlan = {
    featureId: stableFeatureId,
    actions,
    filesToCreate: actions
      .filter((a) => a.type === "create")
      .map((a) => a.targetPath),
    filesToModify: actions
      .filter((a) => a.type === "refresh")
      .map((a) => a.targetPath),
    readyForHostWrite: writePlan.readyForHostWrite,
    readinessBlockers: writePlan.readinessBlockers,
  };

  const executorOptions: WriteExecutorOptions = {
    hostRoot: options.hostRoot,
    dryRun: options.dryRun || !options.write,
    force: options.force,
  };

  const review = generateWriteReview(executorPlan, executorOptions);
  console.log(`  Write Review:`);
  console.log(`    Ready to execute: ${review.readyToExecute}`);
  console.log(`    Files to create: ${review.filesToCreate.length}`);
  console.log(`    Blockers: ${review.blockers.length}`);

  if (!options.write && !options.dryRun) {
    console.log(`\n  ℹ️  Running in dry-run mode (use --write to actually write files)`);
  }

  const result = await executeWritePlan(executorPlan, executorOptions);

  console.log(`\n  Execution Result:`);
  console.log(`    Success: ${result.success}`);

  if (result.blockedByReadinessGate) {
    console.log(`    ⚠️  Blocked by Readiness Gate: ${result.readinessBlockers?.join(", ")}`);
    console.log(`    (Use --force to override)`);
  }

  console.log(`    Executed: ${result.executed.length}`);
  console.log(`    Skipped: ${result.skipped.length}`);
  console.log(`    Failed: ${result.failed.length}`);

  if (result.createdFiles.length > 0 && options.verbose) {
    console.log(`    Created Files:`);
    for (const f of result.createdFiles) {
      console.log(`      - ${f}`);
    }
  }

  return { result, review };
}

async function runRegenerateCommand(options: Dota2CLIOptions): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Regenerate Feature");
  console.log("=".repeat(70));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📝 Feature: ${options.featureId || "(not specified)"}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : "write"}`);

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for regenerate");
    return false;
  }

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be regenerated`);
    return false;
  }

  console.log(`\n📋 Existing Feature:`);
  console.log(`   Feature ID: ${existingFeature.featureId}`);
  console.log(`   Revision: ${existingFeature.revision}`);
  console.log(`   Generated Files: ${existingFeature.generatedFiles.length}`);
  console.log(`   Status: ${existingFeature.status}`);

  const { schema, usedFallback } = await createIntentSchema(options.prompt, options.hostRoot);
  if (!schema) {
    console.error("\n❌ Failed to create IntentSchema");
    return false;
  }

  const { blueprint, issues: blueprintIssues } = buildBlueprint(schema);
  if (!blueprint) {
    console.error(`\n❌ Failed to build Blueprint: ${blueprintIssues.join(", ")}`);
    return false;
  }

  const resolutionResult = resolvePatternsFromBlueprint(blueprint);
  if (resolutionResult.patterns.length === 0) {
    console.error("\n❌ No patterns resolved");
    return false;
  }

  const { plan, blockers } = buildAssemblyPlan(blueprint, resolutionResult, options.hostRoot);
  if (!plan) {
    console.error(`\n❌ Failed to build AssemblyPlan: ${blockers.join(", ")}`);
    return false;
  }

  // T112-R1: Build HostRealizationPlan for generator awareness
  const hostRealizationPlan = realizeDota2Host(plan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.5: Host Realization (for regenerate)");
  console.log("=".repeat(70));
  console.log(summarizeRealization(hostRealizationPlan));

  // T115: Build GeneratorRoutingPlan for route-aware generation
  const generatorRoutingPlan = generateGeneratorRoutingPlan(hostRealizationPlan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.6: Generator Routing (for regenerate)");
  console.log("=".repeat(70));
  const tsRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "ts");
  const uiRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "ui");
  const kvRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "kv");
  console.log(`  Routes: ${generatorRoutingPlan.routes.length} total`);
  console.log(`    - TS: ${tsRoutes.length}, UI: ${uiRoutes.length}, KV: ${kvRoutes.length} (${kvRoutes.filter(r => r.blockers?.length).length} blocked)`);

  const { writePlan, issues: generatorIssues } = createWritePlan(
    plan,
    options.hostRoot,
    existingFeature,
    "regenerate",
    hostRealizationPlan,
    generatorRoutingPlan
  );
  if (!writePlan) {
    console.error(`\n❌ Failed to create WritePlan: ${generatorIssues.join(", ")}`);
    return false;
  }

  const cleanupPlan = generateCleanupPlan(
    existingFeature,
    writePlan,
    options.hostRoot
  );

  console.log("\n" + "=".repeat(70));
  console.log("Cleanup Plan");
  console.log("=".repeat(70));
  console.log(formatCleanupPlan(cleanupPlan));

  if (!cleanupPlan.canExecute) {
    console.error("\n❌ Cleanup plan cannot be executed due to safety issues:");
    for (const issue of cleanupPlan.safetyIssues) {
      console.error(`   - ${issue}`);
    }
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Executing Cleanup");
  console.log("=".repeat(70));

  const cleanupResult = executeCleanup(cleanupPlan, options.hostRoot, options.dryRun);
  console.log(formatCleanupResult(cleanupResult));

  if (!cleanupResult.success) {
    console.error("\n❌ Cleanup execution failed");
    return false;
  }

  const regenerateOptions: Dota2CLIOptions = {
    ...options,
    command: "regenerate",
    featureId: existingFeature.featureId,
  };

  const artifact = await runPipeline(regenerateOptions);

  artifact.commandKind = "maintenance";
  artifact.applicableStages = [
    "cleanupPlan",
    "intentSchema",
    "blueprint",
    "patternResolution",
    "assemblyPlan",
    "hostRealization",
    "generator",
    "writeExecutor",
    "hostValidation",
    "runtimeValidation",
    "workspaceState"
  ];

  (artifact.stages as Record<string, unknown>).cleanupPlan = {
    filesToDelete: cleanupPlan.filesToDelete,
    filesToCreate: cleanupPlan.filesToCreate,
    filesToRefresh: cleanupPlan.filesToRefresh,
    filesUnchanged: cleanupPlan.filesUnchanged,
    previousRevision: cleanupPlan.previousRevision,
    nextRevision: cleanupPlan.nextRevision,
    canExecute: cleanupPlan.canExecute,
    executedDeletes: cleanupResult.deleted,
    deleteFailures: cleanupResult.failed,
    skippedDeletes: cleanupResult.skipped,
  };

  const outputDir = join(process.cwd(), "tmp", "cli-review");
  const outputPath = saveReviewArtifact(artifact, outputDir);

  // T134-FIX: Ensure workspace state is persisted after regenerate
  // runPipeline skips workspace state update for regenerate mode, so we need to manually update it
  if (!options.dryRun && artifact.stages.workspaceState?.skipped && artifact.stages.generator?.generatedFiles) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 9: Workspace State Update (Post-Regenerate)");
    console.log("=".repeat(70));

    const initResult = initializeWorkspace(options.hostRoot);
    if (!initResult.success) {
      console.error("  ❌ Failed to initialize workspace");
    } else {
      const workspace = initResult.workspace!;
      const featureIdToUpdate = options.featureId;
      const existingFeature = findFeatureById(workspace, featureIdToUpdate);
      
      if (existingFeature) {
        const generatedFiles = artifact.stages.generator.generatedFiles as string[];
        const updatedFeature: RuneWeaverFeatureRecord = {
          ...existingFeature,
          revision: existingFeature.revision + 1,
          generatedFiles,
          blueprintId: artifact.stages.blueprint?.summary || existingFeature.blueprintId,
          selectedPatterns: artifact.stages.patternResolution?.resolvedPatterns || existingFeature.selectedPatterns,
          updatedAt: new Date().toISOString(),
        };

        const updatedFeatures = workspace.features.map(f =>
          f.featureId === featureIdToUpdate ? updatedFeature : f
        );

        const updatedWorkspace = {
          ...workspace,
          features: updatedFeatures,
        };

        const saveResult = saveWorkspace(options.hostRoot, updatedWorkspace);
        if (saveResult.success) {
          console.log("  ✅ Workspace state updated");
          console.log(`     Feature ID: ${featureIdToUpdate}`);
          console.log(`     Revision: ${existingFeature.revision} -> ${updatedFeature.revision}`);
          console.log(`     Generated Files: ${generatedFiles.length}`);
        } else {
          console.error(`  ❌ Failed to save workspace: ${saveResult.issues.join(", ")}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Final Verdict");
  console.log("=".repeat(70));
  console.log(`  Pipeline Complete: ${artifact.finalVerdict.pipelineComplete ? "✅" : "❌"}`);
  console.log(`  Completion Kind: ${artifact.finalVerdict.completionKind}`);
  console.log(`  Sufficient for Demo: ${artifact.finalVerdict.sufficientForDemo ? "✅" : "❌"}`);
  console.log(`  Has Unresolved Patterns: ${artifact.finalVerdict.hasUnresolvedPatterns ? "⚠️" : "✅"}`);
  console.log(`  Was Force Override: ${artifact.finalVerdict.wasForceOverride ? "⚠️" : "✅"}`);

  if (artifact.finalVerdict.remainingRisks.length > 0) {
    console.log("\n  Remaining Risks:");
    for (const risk of artifact.finalVerdict.remainingRisks) {
      console.log(`    - ${risk}`);
    }
  }

  if (artifact.finalVerdict.nextSteps.length > 0) {
    console.log("\n  Next Steps:");
    for (const step of artifact.finalVerdict.nextSteps) {
      console.log(`    → ${step}`);
    }
  }

  console.log(`\n📄 Review artifact saved: ${outputPath}`);

  return artifact.finalVerdict.pipelineComplete;
}

async function runRollbackCommand(options: Dota2CLIOptions): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Rollback Feature (Maintenance Command)");
  console.log("=".repeat(70));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📝 Feature: ${options.featureId || "(not specified)"}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : "write"}`);

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for rollback");
    return false;
  }

  const artifact: Dota2ReviewArtifact = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "maintenance",
    applicableStages: ["rollbackPlan", "workspaceState", "hostValidation", "runtimeValidation"],
    cliOptions: {
      command: options.command,
      prompt: options.prompt || "",
      hostRoot: options.hostRoot,
      featureId: options.featureId,
      dryRun: options.dryRun,
      write: options.write,
      force: options.force,
    },
    input: {
      rawPrompt: options.prompt || "",
      goal: `Rollback feature: ${options.featureId}`,
    },
    intentSchema: {
      usedFallback: true,
      intentKind: "rollback",
      uiNeeded: false,
      mechanics: [],
    },
    stages: {
      intentSchema: { success: true, summary: "Not applicable for maintenance command", issues: [], usedFallback: true, skipped: true },
      blueprint: { success: true, summary: "Not applicable for maintenance command", moduleCount: 0, patternHints: [], issues: [], skipped: true },
      patternResolution: { success: true, resolvedPatterns: [], unresolvedPatterns: [], issues: [], complete: true, skipped: true },
      assemblyPlan: { success: true, selectedPatterns: [], writeTargets: [], readyForHostWrite: true, blockers: [], skipped: true },
      hostRealization: { success: true, units: [], blockers: [], skipped: true },
      generator: { success: true, generatedFiles: [], issues: [], skipped: true },
      writeExecutor: { success: true, executedActions: 0, skippedActions: 0, failedActions: 0, createdFiles: [], modifiedFiles: [], skipped: true },
      hostValidation: { success: true, checks: [], issues: [], details: {}, skipped: false },
      runtimeValidation: { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [], skipped: false },
      workspaceState: { success: true, featureId: options.featureId, totalFeatures: 0, skipped: false },
    },
    finalVerdict: {
      pipelineComplete: false,
      completionKind: "default-safe",
      weakestStage: "",
      sufficientForDemo: false,
      hasUnresolvedPatterns: false,
      wasForceOverride: false,
      remainingRisks: [],
      nextSteps: [],
    },
  };

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: workspaceResult.issues.join(", ") };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Failed to load workspace");
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: "Feature not found" };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature '${options.featureId}' not found`);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be rolled back`);
    console.error(`   Only features with status 'active' can be rolled back`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: `Feature status is '${existingFeature.status}', not 'active'` };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature status is '${existingFeature.status}', only 'active' features can be rolled back`);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log(`\n📋 Existing Feature:`);
  console.log(`   Feature ID: ${existingFeature.featureId}`);
  console.log(`   Revision: ${existingFeature.revision}`);
  console.log(`   Generated Files: ${existingFeature.generatedFiles.length}`);
  console.log(`   Status: ${existingFeature.status}`);

  // T149: Check dependency risk before rollback
  console.log("\n" + "=".repeat(70));
  console.log("Stage 0: Dependency Risk Check");
  console.log("=".repeat(70));

  if (options.force) {
    console.log("  ⚠️  Force mode: skipping dependency risk check");
    console.log("     This may break features that depend on this feature.");
  } else {
    const dependencyConflicts = checkDeleteDependencyRisk(options.featureId, workspaceResult.workspace);

    if (dependencyConflicts.length > 0) {
      console.error("\n❌ Cannot rollback feature: other features depend on it");
      console.error("\n  Dependent features:");
      for (const conflict of dependencyConflicts) {
        console.error(`    - ${conflict.existingFeatureLabel} (${conflict.existingFeatureId})`);
      }
      console.error("\n  Recommendation:");
      console.error("    1. Remove the dependency from dependent features first");
      console.error("    2. Or use --force to force rollback (not recommended)");

      artifact.stages.governanceCheck = {
        success: false,
        hasConflict: true,
        conflicts: dependencyConflicts,
        recommendedAction: "block",
        status: "blocked",
        summary: `Cannot rollback feature: ${dependencyConflicts.length} dependent feature(s) found.`,
      };
      artifact.finalVerdict.pipelineComplete = false;
      artifact.finalVerdict.weakestStage = "governanceCheck";
      artifact.finalVerdict.remainingRisks.push(...dependencyConflicts.map(c => c.explanation));
      saveDefaultReviewArtifact(artifact);
      return false;
    }

    console.log("  ✅ No dependency conflicts detected");
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: Rollback Plan");
  console.log("=".repeat(70));

  const rollbackPlan = generateRollbackPlan(
    existingFeature,
    workspaceResult.workspace,
    options.hostRoot
  );

  console.log(formatRollbackPlan(rollbackPlan));

  if (!rollbackPlan.canExecute) {
    console.error("\n❌ Rollback plan cannot be executed due to safety issues:");
    for (const issue of rollbackPlan.safetyIssues) {
      console.error(`   - ${issue}`);
    }
    artifact.stages.rollbackPlan = {
      featureId: rollbackPlan.featureId,
      currentRevision: rollbackPlan.currentRevision,
      filesToDelete: rollbackPlan.filesToDelete,
      bridgeEffectsToRefresh: rollbackPlan.bridgeEffectsToRefresh,
      ownershipValid: rollbackPlan.ownershipValid,
      safetyIssues: rollbackPlan.safetyIssues,
      canExecute: false,
      executedDeletes: [],
      deleteFailures: [],
      skippedDeletes: [],
      indexRefreshSuccess: false,
    };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "rollbackPlan";
    artifact.finalVerdict.remainingRisks.push(...rollbackPlan.safetyIssues);
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Rollback Execution");
  console.log("=".repeat(70));

  const rollbackResult = executeRollback(
    rollbackPlan,
    workspaceResult.workspace,
    options.hostRoot,
    options.dryRun
  );
  console.log(formatRollbackResult(rollbackResult));

  artifact.stages.rollbackPlan = {
    featureId: rollbackPlan.featureId,
    currentRevision: rollbackPlan.currentRevision,
    filesToDelete: rollbackPlan.filesToDelete,
    bridgeEffectsToRefresh: rollbackPlan.bridgeEffectsToRefresh,
    ownershipValid: rollbackPlan.ownershipValid,
    safetyIssues: rollbackPlan.safetyIssues,
    canExecute: rollbackPlan.canExecute,
    executedDeletes: rollbackResult.deleted,
    deleteFailures: rollbackResult.failed,
    skippedDeletes: rollbackResult.skipped,
    indexRefreshSuccess: rollbackResult.indexRefreshSuccess,
  };

  if (!rollbackResult.success) {
    console.error("\n❌ Rollback execution failed");
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "rollbackPlan";
    artifact.finalVerdict.remainingRisks.push("Rollback execution failed");
    if (rollbackResult.failed.length > 0) {
      artifact.finalVerdict.remainingRisks.push(`${rollbackResult.failed.length} file deletions failed`);
    }
    saveDefaultReviewArtifact(artifact);
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Workspace State Update");
  console.log("=".repeat(70));

  let workspaceStateResult: { success: boolean; featureId: string; totalFeatures: number; error?: string; skipped?: boolean } = 
    { success: true, featureId: options.featureId, totalFeatures: 0, skipped: true };

  if (!options.dryRun) {
    const updatedWorkspace = rollbackFeatureInWorkspace(
      workspaceResult.workspace,
      options.featureId
    );
    const saveResult = saveWorkspace(options.hostRoot, updatedWorkspace);
    if (!saveResult.success) {
      console.error(`\n❌ Failed to update workspace state: ${saveResult.issues.join(", ")}`);
      workspaceStateResult = {
        success: false,
        featureId: options.featureId,
        totalFeatures: updatedWorkspace.features.length,
        error: saveResult.issues.join(", "),
        skipped: false,
      };
    } else {
      console.log("✅ Workspace state updated - feature marked as rolled_back");
      workspaceStateResult = {
        success: true,
        featureId: options.featureId,
        totalFeatures: updatedWorkspace.features.length,
        skipped: false,
      };
      
      // T134-FIX: Export workspace to bridge after successful rollback
      const bridgeExportResult = exportWorkspaceToBridge(updatedWorkspace, {
        hostRoot: options.hostRoot,
      });
      if (bridgeExportResult.success) {
        console.log(`✅ Bridge export updated: ${bridgeExportResult.outputPath}`);
      } else {
        console.error(`⚠️ Bridge export failed: ${bridgeExportResult.issues.join(", ")}`);
      }
    }
  } else {
    console.log("🔍 DRY-RUN MODE - Workspace state would be updated to mark feature as rolled_back");
    workspaceStateResult = {
      success: true,
      featureId: options.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
      skipped: true,
    };
  }

  artifact.stages.workspaceState = workspaceStateResult;

  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: Host Validation");
  console.log("=".repeat(70));

  const hostValidationResult = performRollbackHostValidation(
    options.hostRoot,
    rollbackPlan,
    rollbackResult
  );

  artifact.stages.hostValidation = hostValidationResult;

  for (const check of hostValidationResult.checks) {
    console.log(`  ${check}`);
  }

  if (hostValidationResult.issues.length > 0) {
    console.log("\n  Issues:");
    for (const issue of hostValidationResult.issues) {
      console.log(`    - ${issue}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Runtime Validation");
  console.log("=".repeat(70));

  let runtimeValidationResult: { success: boolean; serverPassed: boolean; uiPassed: boolean; serverErrors: number; uiErrors: number; limitations: string[] } = 
    { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [] };

  if (!options.dryRun && rollbackResult.success) {
    try {
      const runtimeArtifact = await validateHostRuntime(options.hostRoot);
      
      runtimeValidationResult = {
        success: runtimeArtifact.overall.success,
        serverPassed: runtimeArtifact.overall.serverPassed,
        uiPassed: runtimeArtifact.overall.uiPassed,
        serverErrors: runtimeArtifact.server.errorCount,
        uiErrors: runtimeArtifact.ui.errorCount,
        limitations: runtimeArtifact.overall.limitations,
      };

      console.log(`  Server: ${runtimeArtifact.server.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.server.errorCount}`);
      console.log(`    - Checked: ${runtimeArtifact.server.checked}`);
      
      console.log(`  UI: ${runtimeArtifact.ui.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.ui.errorCount}`);
      console.log(`    - Checked: ${runtimeArtifact.ui.checked}`);

      if (runtimeArtifact.overall.limitations.length > 0) {
        console.log(`  Limitations:`);
        for (const limitation of runtimeArtifact.overall.limitations) {
          console.log(`    - ${limitation}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Runtime validation failed: ${errorMessage}`);
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
    console.log("  ⏭️  Skipped (dry-run mode or rollback failed)");
    runtimeValidationResult.limitations = ["Skipped due to dry-run mode or rollback failure"];
  }

  artifact.stages.runtimeValidation = runtimeValidationResult;

  const allStages = [
    { name: "rollbackPlan", success: artifact.stages.rollbackPlan?.canExecute ?? false },
    { name: "workspaceState", success: artifact.stages.workspaceState.success },
    { name: "hostValidation", success: artifact.stages.hostValidation.success },
    { name: "runtimeValidation", success: artifact.stages.runtimeValidation.success },
  ];

  const failedStages = allStages.filter(s => !s.success);
  const weakestStage = failedStages.length > 0 ? failedStages[0].name : "";
  const pipelineComplete = failedStages.length === 0;

  artifact.finalVerdict.pipelineComplete = pipelineComplete;
  artifact.finalVerdict.weakestStage = weakestStage;
  artifact.finalVerdict.completionKind = options.dryRun ? "default-safe" : (pipelineComplete ? "default-safe" : "partial");
  artifact.finalVerdict.sufficientForDemo = pipelineComplete;

  if (!pipelineComplete) {
    if (!artifact.stages.rollbackPlan?.canExecute) {
      artifact.finalVerdict.remainingRisks.push("Rollback plan has safety issues");
    }
    if (!artifact.stages.workspaceState.success) {
      artifact.finalVerdict.remainingRisks.push("Workspace state update failed");
    }
    if (!artifact.stages.hostValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Host validation failed");
    }
    if (!artifact.stages.runtimeValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Runtime validation failed");
    }
  }

  if (options.dryRun) {
    artifact.finalVerdict.nextSteps.push("Run with --write to execute the rollback plan.");
  } else if (pipelineComplete) {
    artifact.finalVerdict.nextSteps.push("Verify the feature has been completely removed.");
    artifact.finalVerdict.nextSteps.push("Check that no residual files remain.");
  } else {
    artifact.finalVerdict.nextSteps.push("Fix the issues before retrying.");
  }

  const outputDir = getDefaultReviewArtifactOutputDir();
  const outputPath = saveReviewArtifact(artifact, outputDir);

  console.log("\n" + "=".repeat(70));
  console.log("Final Verdict");
  console.log("=".repeat(70));
  console.log(`  Pipeline Complete: ${pipelineComplete ? "✅" : "❌"}`);
  console.log(`  Completion Kind: ${artifact.finalVerdict.completionKind}`);
  console.log(`  Weakest Stage: ${weakestStage || "(none)"}`);
  console.log(`  Sufficient for Demo: ${artifact.finalVerdict.sufficientForDemo ? "✅" : "❌"}`);

  if (artifact.finalVerdict.remainingRisks.length > 0) {
    console.log("\n  Remaining Risks:");
    for (const risk of artifact.finalVerdict.remainingRisks) {
      console.log(`    - ${risk}`);
    }
  }

  if (artifact.finalVerdict.nextSteps.length > 0) {
    console.log("\n  Next Steps:");
    for (const step of artifact.finalVerdict.nextSteps) {
      console.log(`    → ${step}`);
    }
  }

  console.log(`\n📄 Review artifact saved: ${outputPath}`);

  return pipelineComplete;
}

async function runUpdateCommand(options: Dota2CLIOptions): Promise<boolean> {
  console.log("=".repeat(70));
  console.log("🧙 Rune Weaver - Update Feature (Maintenance Command)");
  console.log("=".repeat(70));
  console.log(`\n📁 Host: ${options.hostRoot}`);
  console.log(`📝 Feature: ${options.featureId || "(not specified)"}`);
  console.log(`⚙️  Mode: ${options.dryRun ? "dry-run" : "write"}`);

  const artifact: Dota2ReviewArtifact = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commandKind: "maintenance",
    applicableStages: [
      "intentSchema",
      "blueprint",
      "patternResolution",
      "assemblyPlan",
      "hostRealization",
      "generator",
      "updateDiff",
      "writeExecutor",
      "hostValidation",
      "runtimeValidation",
      "workspaceState",
    ],
    cliOptions: {
      command: options.command,
      prompt: options.prompt || "",
      hostRoot: options.hostRoot,
      featureId: options.featureId,
      dryRun: options.dryRun,
      write: options.write,
      force: options.force,
    },
    input: {
      rawPrompt: options.prompt || "",
      goal: `Update feature: ${options.featureId}`,
    },
    intentSchema: {
      usedFallback: false,
      intentKind: "",
      uiNeeded: false,
      mechanics: [],
    },
    stages: {
      intentSchema: { success: false, summary: "", issues: [] },
      blueprint: { success: false, summary: "", moduleCount: 0, patternHints: [], issues: [] },
      patternResolution: { success: false, resolvedPatterns: [], unresolvedPatterns: [], issues: [], complete: false },
      assemblyPlan: { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers: [] },
      hostRealization: { success: false, units: [], blockers: [] },
      generator: { success: false, generatedFiles: [], issues: [] },
      writeExecutor: { success: false, executedActions: 0, skippedActions: 0, failedActions: 0, createdFiles: [], modifiedFiles: [] },
      hostValidation: { success: false, checks: [], issues: [], details: {} },
      runtimeValidation: { success: false, serverPassed: false, uiPassed: false, serverErrors: 0, uiErrors: 0, limitations: [] },
      workspaceState: { success: false, featureId: options.featureId || "", totalFeatures: 0 },
    },
    finalVerdict: {
      pipelineComplete: false,
      completionKind: "default-safe",
      weakestStage: "",
      sufficientForDemo: false,
      hasUnresolvedPatterns: false,
      wasForceOverride: false,
      remainingRisks: [],
      nextSteps: [],
    },
  };

  if (!options.featureId) {
    console.error("\n❌ Error: --feature <featureId> is required for update");
    artifact.stages.workspaceState = { success: false, featureId: "", totalFeatures: 0, error: "Missing featureId" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Missing featureId");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  if (!options.prompt) {
    console.error("\n❌ Error: Prompt is required for update to generate new write plan");
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: "Missing prompt" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Missing prompt");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  const workspaceResult = initializeWorkspace(options.hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: 0, error: workspaceResult.issues.join(", ") };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Failed to load workspace");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: "Feature not found" };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push("Feature not found");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be updated`);
    console.error(`   Only features with status 'active' can be updated`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: `Feature status is '${existingFeature.status}'` };
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature status is '${existingFeature.status}', only 'active' features can be updated`);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  console.log(`\n📋 Existing Feature:`);
  console.log(`   Feature ID: ${existingFeature.featureId}`);
  console.log(`   Revision: ${existingFeature.revision}`);
  console.log(`   Generated Files: ${existingFeature.generatedFiles.length}`);
  console.log(`   Status: ${existingFeature.status}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 0: Host Readiness Preflight");
  console.log("=".repeat(70));

  const CRITICAL_HOST_FILES = [
    { path: "game/scripts/npc/abilities.txt", reason: "Required for baseline ability migration during bridge refresh" },
  ];

  let preflightPassed = true;
  for (const file of CRITICAL_HOST_FILES) {
    const fullPath = join(options.hostRoot, file.path);
    if (existsSync(fullPath)) {
      console.log(`  ✅ ${file.path}`);
    } else {
      console.error(`  ❌ ${file.path} - missing`);
      console.error(`     Reason: ${file.reason}`);
      preflightPassed = false;
    }
  }

  if (!preflightPassed) {
    console.error("\n⚠️  Host readiness check failed - critical files are missing");
    console.error("   The update can continue in dry-run mode,");
    console.error("   but write mode will fail at bridge refresh stage.");
    artifact.finalVerdict.remainingRisks.push("Missing critical host files");
    if (!options.dryRun) {
      console.error("\n   Recommendation: Run with --dry-run first to verify the update plan,");
      console.error("   or initialize the host properly before running write mode.");
    }
  } else {
    console.log("  ✅ Host readiness check passed");
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: IntentSchema");
  console.log("=".repeat(70));

  const { schema, usedFallback } = await createIntentSchema(options.prompt, options.hostRoot);
  if (!schema) {
    console.error("\n❌ Failed to create IntentSchema");
    artifact.stages.intentSchema = { success: false, summary: "Failed to create IntentSchema", issues: ["Failed to create IntentSchema"] };
    artifact.finalVerdict.weakestStage = "intentSchema";
    artifact.finalVerdict.remainingRisks.push("Failed to create IntentSchema");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  artifact.intentSchema = {
    usedFallback,
    intentKind: schema.classification.intentKind,
    uiNeeded: schema.uiRequirements?.needed || false,
    mechanics: Object.entries(schema.normalizedMechanics)
      .filter(([, v]) => v === true)
      .map(([k]) => k),
  };
  artifact.stages.intentSchema = { success: true, summary: `IntentSchema created (${usedFallback ? "fallback" : "LLM"})`, issues: [], usedFallback };
  console.log(`  ✅ IntentSchema created (${usedFallback ? "fallback" : "LLM"})`);
  console.log(`     Goal: ${schema.request.goal}`);
  console.log(`     Intent Kind: ${schema.classification.intentKind}`);
  console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const { blueprint, issues: blueprintIssues } = buildBlueprint(schema);
  if (!blueprint) {
    console.error(`\n❌ Failed to build Blueprint: ${blueprintIssues.join(", ")}`);
    artifact.stages.blueprint = { success: false, summary: "Failed to build Blueprint", moduleCount: 0, patternHints: [], issues: blueprintIssues };
    artifact.finalVerdict.weakestStage = "blueprint";
    artifact.finalVerdict.remainingRisks.push(...blueprintIssues);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  artifact.stages.blueprint = { success: true, summary: "Blueprint created", moduleCount: blueprint.modules.length, patternHints: blueprint.patternHints.flatMap((h) => h.suggestedPatterns), issues: [] };
  console.log(`  ✅ Blueprint created`);
  console.log(`     ID: ${blueprint.id}`);
  console.log(`     Modules: ${blueprint.modules.length}`);
  console.log(`     Pattern Hints: ${blueprint.patternHints.length}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Pattern Resolution");
  console.log("=".repeat(70));

  const resolutionResult = resolvePatternsFromBlueprint(blueprint);
  if (resolutionResult.patterns.length === 0) {
    console.error("\n❌ No patterns resolved");
    artifact.stages.patternResolution = { success: false, resolvedPatterns: [], unresolvedPatterns: resolutionResult.unresolved.map((u) => u.requestedId), issues: ["No patterns resolved"], complete: false };
    artifact.finalVerdict.weakestStage = "patternResolution";
    artifact.finalVerdict.hasUnresolvedPatterns = true;
    artifact.finalVerdict.remainingRisks.push("No patterns resolved");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  // T113: 继承原始 feature 的 selectedPatterns，避免创建新文件
  // 修正逻辑：保留所有原始 patterns，同时合并新 intent 需要的 patterns
  if (existingFeature.selectedPatterns && existingFeature.selectedPatterns.length > 0) {
    const existingPatternIds = new Set(existingFeature.selectedPatterns);
    const newPatternIds = new Set(resolutionResult.patterns.map(p => p.patternId));
    const originalCount = resolutionResult.patterns.length;

    // 辅助函数：从文件路径推断 role
    const inferRoleFromFiles = (patternId: string, generatedFiles: string[], featureId: string): string => {
      // patternId 格式: "category.sub_pattern" -> "category_sub_pattern"
      const patternSegment = patternId.replace(/\./g, "_");
      
      // 查找匹配的文件
      for (const filePath of generatedFiles) {
        // 文件路径格式: {namespace}/{featureId}_{role}_{patternSegment}.{ext}
        // 或: {namespace}/{featureId}_{patternSegment}.{ext} (当 role === patternSegment)
        const fileName = filePath.split("/").pop() || "";
        const baseName = fileName.replace(/\.[^.]+$/, ""); // 移除扩展名
        
        // 检查是否包含 patternSegment
        if (baseName.includes(patternSegment)) {
          // 提取 role: {featureId}_{role}_{patternSegment} -> role
          const prefix = `${featureId}_`;
          if (baseName.startsWith(prefix)) {
            const suffix = baseName.slice(prefix.length);
            // suffix 可能是 "role_patternSegment" 或 "patternSegment"
            if (suffix === patternSegment) {
              // role === patternSegment
              return patternSegment;
            } else if (suffix.endsWith(`_${patternSegment}`)) {
              // role_patternSegment -> role
              return suffix.slice(0, -`_${patternSegment}`.length);
            }
          }
        }
      }
      
      // 如果无法推断，使用 patternId 作为默认 role
      return patternSegment;
    };

    // 构建合并后的 patterns 列表
    const mergedPatterns: typeof resolutionResult.patterns = [];
    const addedPatternIds = new Set<string>();

    // 1. 首先添加原始 patterns
    for (const patternId of existingFeature.selectedPatterns) {
      // 检查新 intent 是否也解析了这个 pattern
      const newPattern = resolutionResult.patterns.find(p => p.patternId === patternId);
      if (newPattern) {
        // 使用新 intent 的参数更新
        mergedPatterns.push(newPattern);
        addedPatternIds.add(patternId);
      } else {
        // 保留原始 pattern（创建最小化的 ResolvedPattern）
        // 从文件路径推断 role
        const inferredRole = inferRoleFromFiles(
          patternId,
          existingFeature.generatedFiles,
          existingFeature.featureId
        );
        
        mergedPatterns.push({
          patternId,
          role: inferredRole,
          priority: "required" as const,
          source: "hint" as const,
        });
        addedPatternIds.add(patternId);
      }
    }

    // 2. 检查新 intent 独有的 patterns（原始 feature 没有的）
    const newOnlyPatterns = resolutionResult.patterns.filter(p => !addedPatternIds.has(p.patternId));
    if (newOnlyPatterns.length > 0) {
      // 注意：这里跳过新 patterns，因为 Packet B 的目标是保持文件集合不变
      console.log(`\n  ⚠️  Pattern Inheritance: Skipping ${newOnlyPatterns.length} new patterns not in original feature`);
      for (const p of newOnlyPatterns) {
        console.log(`     - ${p.patternId}`);
      }
    }

    resolutionResult.patterns = mergedPatterns;

    console.log(`\n  🔒 Pattern Inheritance: Merged patterns`);
    console.log(`     Original patterns: ${existingFeature.selectedPatterns.join(", ")}`);
    console.log(`     New intent patterns: ${Array.from(newPatternIds).join(", ") || "(none)"}`);
    console.log(`     Final patterns: ${resolutionResult.patterns.map(p => p.patternId).join(", ")}`);
  }

  artifact.stages.patternResolution = {
    success: true,
    resolvedPatterns: resolutionResult.patterns.map(p => p.patternId),
    unresolvedPatterns: resolutionResult.unresolved.map((u) => u.requestedId),
    issues: [],
    complete: resolutionResult.complete,
  };
  console.log(`  Patterns resolved: ${resolutionResult.patterns.length}`);
  for (const pattern of resolutionResult.patterns) {
    console.log(`    ✅ ${pattern.patternId}`);
  }
  if (resolutionResult.unresolved.length > 0) {
    console.log(`  Unresolved patterns: ${resolutionResult.unresolved.length}`);
    for (const unresolved of resolutionResult.unresolved) {
      console.log(`    ⚠️  ${unresolved.requestedId}`);
    }
  }
  console.log(`  Complete: ${resolutionResult.complete}`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: AssemblyPlan");
  console.log("=".repeat(70));

  const { plan, blockers } = buildAssemblyPlan(blueprint, resolutionResult, options.hostRoot);
  if (!plan) {
    console.error(`\n❌ Failed to build AssemblyPlan: ${blockers.join(", ")}`);
    artifact.stages.assemblyPlan = { success: false, selectedPatterns: [], writeTargets: [], readyForHostWrite: false, blockers };
    artifact.finalVerdict.weakestStage = "assemblyPlan";
    artifact.finalVerdict.remainingRisks.push(...blockers);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  artifact.stages.assemblyPlan = {
    success: true,
    selectedPatterns: plan.selectedPatterns.map((p) => p.patternId),
    writeTargets: plan.writeTargets.map((t) => t.path),
    readyForHostWrite: plan.readyForHostWrite ?? false,
    blockers,
  };
  console.log(`  ✅ AssemblyPlan created`);
  console.log(`     Blueprint ID: ${plan.blueprintId}`);
  console.log(`     Selected Patterns: ${plan.selectedPatterns.length}`);
  console.log(`     Ready for Host Write: ${plan.readyForHostWrite ?? false}`);

  // T112-R1: Build HostRealizationPlan for generator awareness
  const hostRealizationPlan = realizeDota2Host(plan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.5: Host Realization (for update)");
  console.log("=".repeat(70));
  console.log(summarizeRealization(hostRealizationPlan));

  // T115: Build GeneratorRoutingPlan for route-aware generation
  const generatorRoutingPlan = generateGeneratorRoutingPlan(hostRealizationPlan);
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4.6: Generator Routing (for update)");
  console.log("=".repeat(70));
  const tsRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "ts");
  const uiRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "ui");
  const kvRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "kv");
  console.log(`  Routes: ${generatorRoutingPlan.routes.length} total`);
  console.log(`    - TS: ${tsRoutes.length}, UI: ${uiRoutes.length}, KV: ${kvRoutes.length} (${kvRoutes.filter(r => r.blockers?.length).length} blocked)`);

  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Generator");
  console.log("=".repeat(70));

  const { writePlan, issues: generatorIssues } = createWritePlan(
    plan,
    options.hostRoot,
    existingFeature,
    "update",
    hostRealizationPlan,
    generatorRoutingPlan
  );
  if (!writePlan) {
    console.error(`\n❌ Failed to create WritePlan: ${generatorIssues.join(", ")}`);
    artifact.stages.generator = { success: false, generatedFiles: [], issues: generatorIssues };
    artifact.finalVerdict.weakestStage = "generator";
    artifact.finalVerdict.remainingRisks.push(...generatorIssues);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  // T115-R2-FIX: Filter out deferred entries from generatedFiles
  // T118-R2: Apply KV aggregation to generatedFiles
  const executableEntries = writePlan.entries.filter((e) => !e.deferred);
  const kvEntriesForGen = executableEntries.filter((e) => e.contentType === "kv");
  const nonKvEntriesForGen = executableEntries.filter((e) => e.contentType !== "kv");
  const kvTargetPathsForGen = new Set(kvEntriesForGen.map((e) => e.targetPath));
  const aggregatedKvFilesForGen = Array.from(kvTargetPathsForGen);
  const nonKvFilesForGen = nonKvEntriesForGen.map((e) => e.targetPath);
  const aggregatedGeneratedFiles = [...nonKvFilesForGen, ...aggregatedKvFilesForGen];

  artifact.stages.generator = {
    success: true,
    generatedFiles: aggregatedGeneratedFiles,
    issues: [],
    realizationContext: writePlan.realizationContext,
    deferredWarnings: writePlan.deferredWarnings,
  };
  console.log(`  ✅ WritePlan created`);
  console.log(`     ID: ${writePlan.id}`);
  console.log(`     Entries: ${writePlan.entries.length}`);

  // T112-R2: Show deferred status and generator family hints
  if (writePlan.stats.deferred > 0) {
    console.log(`     ⚠️  Deferred entries: ${writePlan.stats.deferred} (KV side not yet implemented)`);
  }

  // T112-R2: Show generator family hint distribution
  const familyHints = writePlan.entries.reduce((acc, e) => {
    if (e.generatorFamilyHint) {
      acc[e.generatorFamilyHint] = (acc[e.generatorFamilyHint] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  if (Object.keys(familyHints).length > 0) {
    console.log(`     Generator hints: ${Object.entries(familyHints).map(([k, v]) => `${k}:${v}`).join(", ")}`);
  }

  // T112-R2: Show deferred warnings
  if (writePlan.deferredWarnings && writePlan.deferredWarnings.length > 0) {
    console.log(`     Deferred warnings:`);
    for (const warning of writePlan.deferredWarnings) {
      console.log(`       - ${warning}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 6: Update Diff Classification");
  console.log("=".repeat(70));

  const diffResult = classifyUpdateDiff(existingFeature, writePlan, options.hostRoot);
  console.log(formatUpdateDiffResult(diffResult));

  artifact.stages.updateDiff = {
    totalFiles: diffResult.summary.totalFiles,
    unchanged: diffResult.summary.unchanged,
    refreshed: diffResult.summary.refreshed,
    created: diffResult.summary.created,
    deleted: diffResult.summary.deleted,
    unchangedFiles: diffResult.unchangedFiles.map(f => f.path),
    refreshedFiles: diffResult.refreshedFiles.map(f => f.path),
    createdFiles: diffResult.createdFiles.map(f => f.path),
    deletedFiles: diffResult.deletedFiles.map(f => f.path),
    requiresRegenerate: diffResult.requiresRegenerate,
    regenerateReasons: diffResult.regenerateReasons,
    canUpdate: diffResult.canUpdate,
  };

  if (diffResult.requiresRegenerate) {
    console.log("\n" + "=".repeat(70));
    console.log("⚠️  UPDATE SAFETY GATE: Requires Regenerate");
    console.log("=".repeat(70));
    console.log("\n  The update classifier has determined that this change is too significant");
    console.log("  for a selective update. A full regenerate is recommended instead.\n");
    console.log("  Reasons:");
    for (const reason of diffResult.regenerateReasons) {
      console.log(`    - ${reason}`);
    }
    console.log("\n  This is NOT an execution failure.");
    console.log("  This is a safety gate to prevent unsafe partial updates.\n");
    console.log("  Recommended action:");
    console.log("    → Use 'dota2 regenerate --feature <id>' instead");
    console.log("");
    
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.completionKind = "requires-regenerate";
    artifact.finalVerdict.weakestStage = "updateDiff";
    artifact.finalVerdict.sufficientForDemo = false;
    artifact.finalVerdict.remainingRisks.push("Update requires regenerate (safety gate)", ...diffResult.regenerateReasons);
    artifact.finalVerdict.nextSteps.push("Use 'dota2 regenerate --feature <id>' instead");
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 7: Selective Update Execution");
  console.log("=".repeat(70));

  const contentMap = new Map<string, string>();
  for (const entry of writePlan.entries) {
    const content = generateCodeContent(entry);
    const relativePath = entry.targetPath.replace(options.hostRoot.replace(/\\/g, "/"), "").replace(/^\//, "");
    contentMap.set(relativePath, content);
  }

  const updateResult = executeSelectiveUpdate(
    existingFeature,
    writePlan,
    diffResult,
    options.hostRoot,
    workspaceResult.workspace,
    contentMap,
    options.dryRun
  );
  console.log(formatSelectiveUpdateResult(updateResult));

  const executedActions = updateResult.refreshedCount + updateResult.createdCount + updateResult.deletedCount;
  artifact.stages.writeExecutor = {
    success: updateResult.success,
    executedActions,
    skippedActions: updateResult.unchangedCount,
    failedActions: updateResult.failedFiles.length,
    createdFiles: updateResult.createdFiles,
    modifiedFiles: updateResult.refreshedFiles,
  };

  if (!updateResult.success) {
    console.error("\n❌ Selective update execution failed");
    artifact.finalVerdict.weakestStage = "writeExecutor";
    artifact.finalVerdict.remainingRisks.push("Selective update execution failed");
    for (const failed of updateResult.failedFiles) {
      artifact.finalVerdict.remainingRisks.push(`${failed.path}: ${failed.error}`);
    }
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 8: Workspace State Update");
  console.log("=".repeat(70));

  if (!options.dryRun) {
    // T122-FIX: Use diffResult to compute workspace generatedFiles consistency
    // This ensures deleted files are removed from workspace even if not in writePlan
    const deletedFiles = diffResult.deletedFiles.map(f => f.path);
    const refreshAndCreateFiles = [
      ...diffResult.refreshedFiles.map(f => f.path),
      ...diffResult.createdFiles.map(f => f.path),
    ];
    const executableEntries = writePlan.entries.filter((e) => !e.deferred);
    const kvEntriesForRegen = executableEntries.filter((e) => e.contentType === "kv");
    const nonKvEntriesForRegen = executableEntries.filter((e) => e.contentType !== "kv");
    const kvTargetPathsForRegen = new Set(kvEntriesForRegen.map((e) => e.targetPath));
    const aggregatedKvFilesForRegen = Array.from(kvTargetPathsForRegen);
    const nonKvFilesForRegen = nonKvEntriesForRegen.map((e) => e.targetPath);
    const generatedFilesForRegen = [...nonKvFilesForRegen, ...aggregatedKvFilesForRegen];
    const generatedFilesForUpdate = generatedFilesForRegen.filter(f => !deletedFiles.includes(f));

    const updatedFeature: RuneWeaverFeatureRecord = {
      ...existingFeature,
      revision: existingFeature.revision + 1,
      blueprintId: existingFeature.blueprintId, // 保持原有 blueprintId
      entryBindings: extractEntryBindings(plan.bridgeUpdates),
      generatedFiles: generatedFilesForUpdate,
      selectedPatterns: resolutionResult.patterns.map(p => p.patternId),
      updatedAt: new Date().toISOString(),
    };

    const updatedFeatures = workspaceResult.workspace.features.map(f =>
      f.featureId === existingFeature.featureId ? updatedFeature : f
    );

    const updatedWorkspace = {
      ...workspaceResult.workspace,
      features: updatedFeatures,
    };

    const saveResult = saveWorkspace(options.hostRoot, updatedWorkspace);
    if (!saveResult.success) {
      console.error(`\n❌ Failed to update workspace state: ${saveResult.issues.join(", ")}`);
      artifact.stages.workspaceState = {
        success: false,
        featureId: existingFeature.featureId,
        totalFeatures: workspaceResult.workspace.features.length,
        error: saveResult.issues.join(", "),
      };
      artifact.finalVerdict.weakestStage = "workspaceState";
      artifact.finalVerdict.remainingRisks.push("Failed to update workspace state");
    } else {
      console.log("✅ Workspace state updated");
      console.log(`   Revision: ${existingFeature.revision} -> ${updatedFeature.revision}`);
      artifact.stages.workspaceState = {
        success: true,
        featureId: existingFeature.featureId,
        totalFeatures: updatedFeatures.length,
      };
    }
  } else {
    console.log("🔍 DRY-RUN MODE - Workspace state would be updated");
    artifact.stages.workspaceState = {
      success: true,
      featureId: existingFeature.featureId,
      totalFeatures: workspaceResult.workspace.features.length,
    };
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 9: Host Validation");
  console.log("=".repeat(70));

  const hostValidationResult = performUpdateHostValidation(
    options.hostRoot,
    diffResult,
    updateResult
  );

  artifact.stages.hostValidation = {
    success: hostValidationResult.success,
    checks: hostValidationResult.checks,
    issues: hostValidationResult.issues,
    details: {},
  };

  for (const check of hostValidationResult.checks) {
    console.log(`  ${check}`);
  }

  if (hostValidationResult.issues.length > 0) {
    console.log("\n  Issues:");
    for (const issue of hostValidationResult.issues) {
      console.log(`    - ${issue}`);
    }
    if (!hostValidationResult.success) {
      artifact.finalVerdict.weakestStage = "hostValidation";
      artifact.finalVerdict.remainingRisks.push(...hostValidationResult.issues);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Stage 10: Runtime Validation");
  console.log("=".repeat(70));

  if (!options.dryRun && updateResult.success) {
    try {
      const runtimeArtifact = await validateHostRuntime(options.hostRoot);
      
      artifact.stages.runtimeValidation = {
        success: runtimeArtifact.overall.success,
        serverPassed: runtimeArtifact.overall.serverPassed,
        uiPassed: runtimeArtifact.overall.uiPassed,
        serverErrors: runtimeArtifact.server.errorCount,
        uiErrors: runtimeArtifact.ui.errorCount,
        limitations: [],
      };

      console.log(`  Server: ${runtimeArtifact.server.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.server.errorCount}`);
      
      console.log(`  UI: ${runtimeArtifact.ui.success ? "✅ Passed" : "❌ Failed"}`);
      console.log(`    - Errors: ${runtimeArtifact.ui.errorCount}`);

      if (!runtimeArtifact.overall.success) {
        artifact.finalVerdict.weakestStage = "runtimeValidation";
        if (!runtimeArtifact.overall.serverPassed) {
          artifact.finalVerdict.remainingRisks.push(`Server runtime validation failed with ${runtimeArtifact.server.errorCount} errors`);
        }
        if (!runtimeArtifact.overall.uiPassed) {
          artifact.finalVerdict.remainingRisks.push(`UI runtime validation failed with ${runtimeArtifact.ui.errorCount} errors`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Runtime validation failed: ${errorMessage}`);
      artifact.stages.runtimeValidation = {
        success: false,
        serverPassed: false,
        uiPassed: false,
        serverErrors: 0,
        uiErrors: 0,
        limitations: [errorMessage],
      };
      artifact.finalVerdict.weakestStage = "runtimeValidation";
      artifact.finalVerdict.remainingRisks.push(`Runtime validation failed: ${errorMessage}`);
    }
  } else {
    console.log("  ⏭️  Skipped (dry-run mode or update failed)");
    artifact.stages.runtimeValidation = {
      success: true,
      serverPassed: true,
      uiPassed: true,
      serverErrors: 0,
      uiErrors: 0,
      limitations: ["Skipped due to dry-run mode or update failed"],
    };
  }

  const pipelineComplete = 
    artifact.stages.intentSchema.success &&
    artifact.stages.blueprint.success &&
    artifact.stages.patternResolution.success &&
    artifact.stages.assemblyPlan.success &&
    artifact.stages.generator.success &&
    artifact.stages.writeExecutor.success &&
    artifact.stages.workspaceState.success &&
    artifact.stages.hostValidation.success &&
    artifact.stages.runtimeValidation.success;

  artifact.finalVerdict.pipelineComplete = pipelineComplete;
  artifact.finalVerdict.hasUnresolvedPatterns = resolutionResult.unresolved.length > 0;
  artifact.finalVerdict.wasForceOverride = options.force;

  if (pipelineComplete) {
    artifact.finalVerdict.completionKind = options.force ? "forced" : "default-safe";
    artifact.finalVerdict.sufficientForDemo = true;
    if (options.dryRun) {
      artifact.finalVerdict.nextSteps.push("Run with --write to execute the selective update");
    } else {
      artifact.finalVerdict.nextSteps.push("Update completed successfully");
    }
  } else {
    artifact.finalVerdict.completionKind = "partial";
    if (!artifact.stages.writeExecutor.success) {
      artifact.finalVerdict.remainingRisks.push("Selective update execution failed");
    }
    if (!artifact.stages.workspaceState.success) {
      artifact.finalVerdict.remainingRisks.push("Workspace state update failed");
    }
    if (!artifact.stages.hostValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Host validation failed");
    }
    if (!artifact.stages.runtimeValidation.success) {
      artifact.finalVerdict.remainingRisks.push("Runtime validation failed");
    }
    artifact.finalVerdict.nextSteps.push("Fix the issues before retrying");
  }

  const outputPath = saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));

  console.log("\n" + "=".repeat(70));
  console.log("Final Verdict");
  console.log("=".repeat(70));
  console.log(`  Pipeline Complete: ${pipelineComplete ? "✅" : "❌"}`);
  console.log(`  Completion Kind: ${artifact.finalVerdict.completionKind}`);
  console.log(`  Sufficient for Demo: ${artifact.finalVerdict.sufficientForDemo ? "✅" : "❌"}`);
  console.log(`  Has Unresolved Patterns: ${artifact.finalVerdict.hasUnresolvedPatterns ? "⚠️" : "✅"}`);
  console.log(`  Was Force Override: ${artifact.finalVerdict.wasForceOverride ? "⚠️" : "✅"}`);

  if (artifact.finalVerdict.remainingRisks.length > 0) {
    console.log("\n  Remaining Risks:");
    for (const risk of artifact.finalVerdict.remainingRisks) {
      console.log(`    - ${risk}`);
    }
  }

  if (artifact.finalVerdict.nextSteps.length > 0) {
    console.log("\n  Next Steps:");
    for (const step of artifact.finalVerdict.nextSteps) {
      console.log(`    → ${step}`);
    }
  }

  console.log(`\n📄 Review artifact saved: ${outputPath}`);

  return pipelineComplete;
}

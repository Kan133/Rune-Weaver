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
import type { HostRealizationPlan, GeneratorRoutingPlan } from "../../core/schema/types.js";
import { isHostFullyReady } from "../../adapters/dota2/scanner/host-status.js";
import {
  generateCleanupPlan,
  executeCleanup,
  formatCleanupPlan,
  formatCleanupResult,
} from "../../adapters/dota2/regenerate/index.js";
import type { CleanupPlan, CleanupExecutionResult } from "../../adapters/dota2/regenerate/index.js";
import type { RollbackPlan, RollbackExecutionResult } from "../../adapters/dota2/rollback/index.js";
import { getDefaultReviewArtifactOutputDir, saveDefaultReviewArtifact, saveReviewArtifact } from "./dota2/review-artifacts.js";
import { createRollbackReviewArtifact } from "./dota2/rollback-artifact.js";
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
  createIntentSchema,
  createWritePlan,
  getFeatureMode,
  resolveExistingFeatureContext,
  resolvePatternsFromBlueprint,
} from "./dota2/planning.js";
import { executeWrite } from "./dota2/write-executor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export interface Dota2CLIOptions {
  command: "run" | "dry-run" | "review" | "update" | "regenerate" | "rollback" | "delete" | "validate" | "repair" | "doctor" | "demo" | "lifecycle" | "gap-fill";
  prompt: string;
  hostRoot: string;
  featureId?: string;
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
  validate   验证生成的文�?  repair     修复验证失败的问�?  doctor     检查宿主运行准备状�?  demo       生成 demo prepare runbook
  lifecycle  运行 Talent Draw 生命周期证明计划
  launch     启动 Dota2 Tools 进行测试
  gap-fill   生成 boundary �?dry-run patch plan

选项:
  --host <path>       宿主项目根目�?(必需)
  --feature <id>      Feature ID (regenerate 必需)
  --boundary <id>     gap-fill boundary ID
  --feature <id>      gap-fill 可选：从 workspace 解析适用 boundary
  --instruction <s>   gap-fill instruction text
  --mode <mode>       gap-fill lifecycle mode: review | apply | validate-applied
  --apply             兼容旧参数：等同于 --mode apply
  --approve <file>    批准并执行先前生成的 gap-fill approval record
  --addon-name <name> Dota2 addon 名称 (demo prepare/init 使用)
  --map <name>        Dota2 地图�?(demo prepare/launch 使用)
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
      createIntentSchema,
      buildBlueprint,
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

  // Stage 7: Workspace State Update (only on real write, not dry-run)
  let workspaceStateResult: { success: boolean; featureId: string; totalFeatures: number; error?: string; skipped?: boolean } = 
    { success: true, featureId: "", totalFeatures: 0, skipped: true };
  
  if (!options.dryRun && result.success) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 7: Workspace State Update");
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
      console.log(`  �?Workspace state updated`);
      console.log(`     Feature ID: ${workspaceResult.featureId}`);
      console.log(`     Total features: ${workspaceResult.totalFeatures}`);
    } else {
      console.log(`  ⚠️  Failed to update workspace state: ${workspaceResult.error}`);
    }
  } else if (options.dryRun) {
    console.log("\n" + "=".repeat(70));
    console.log("Stage 7: Workspace State Update");
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

  // Stage 8: Host Validation (enhanced)
  const hostValidation = validateHost(options.hostRoot, writePlan, result, stableFeatureId, deferredEntriesInfo);
  artifact.stages.hostValidation = {
    success: hostValidation.success,
    checks: hostValidation.checks,
    issues: hostValidation.issues,
    details: hostValidation.details,
  };

  // Stage 9: Runtime Validation
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


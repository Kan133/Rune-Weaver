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
import { createLLMClientFromEnv } from "../../core/llm/factory.js";
import { runWizardToIntentSchema } from "../../core/wizard/intent-schema.js";
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
  validateHostRuntime,
} from "../../adapters/dota2/validator/runtime-validator.js";
import { calculateFinalVerdict, buildDeferredEntriesInfo, buildGeneratorStage } from "./helpers/index.js";
import type { VerdictInput } from "./helpers/index.js";
import { realizeDota2Host, summarizeRealization } from "../../adapters/dota2/realization/index.js";
import type { HostRealizationPlan, GeneratorRoutingPlan } from "../../core/schema/types.js";
import { generateGeneratorRoutingPlan, getRoutesByFamily, getUnblockedRoutes } from "../../adapters/dota2/routing/index.js";
import { refreshBridge } from "../../adapters/dota2/bridge/index.js";
import {
  generateCleanupPlan,
  executeCleanup,
  formatCleanupPlan,
  formatCleanupResult,
} from "../../adapters/dota2/regenerate/index.js";
import type { CleanupPlan, CleanupExecutionResult } from "../../adapters/dota2/regenerate/index.js";
import {
  generateRollbackPlan,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Dota2CLIOptions {
  command: "run" | "dry-run" | "review" | "update" | "regenerate" | "rollback";
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
    const bridgeRoutes = generatorRoutingPlan.routes.filter(r => r.routeKind === "bridge");
    
    console.log(`  Routes: ${generatorRoutingPlan.routes.length} total`);
    console.log(`    - TS routes: ${tsRoutes.length} (${tsRoutes.filter(r => !r.blockers?.length).length} unblocked)`);
    console.log(`    - UI routes: ${uiRoutes.length} (${uiRoutes.filter(r => !r.blockers?.length).length} unblocked)`);
    console.log(`    - KV routes: ${kvRoutes.length} (${kvRoutes.filter(r => !r.blockers?.length).length} unblocked, ${kvRoutes.filter(r => r.blockers?.length).length} blocked)`);
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
  console.log("\n" + "=".repeat(70));
  console.log("Stage 8: Runtime Validation");
  console.log("=".repeat(70));

  let runtimeValidationResult: { success: boolean; serverPassed: boolean; uiPassed: boolean; serverErrors: number; uiErrors: number; limitations: string[] } = 
    { success: true, serverPassed: true, uiPassed: true, serverErrors: 0, uiErrors: 0, limitations: [] };

  if (!options.dryRun && result.success) {
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
    console.log("  ⏭️  Skipped (dry-run mode or write failed)");
    runtimeValidationResult.limitations = ["Skipped due to dry-run mode or write failure"];
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
      existingFeatureContext.feature
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

  // Try to use real Wizard with LLM
  try {
    const client = createLLMClientFromEnv(process.cwd());
    
    const result = await runWizardToIntentSchema({
      client,
      input: {
        rawText: prompt,
        temperature: 1,
      },
    });

    if (result.valid && result.schema) {
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

function alignWritePlanWithExistingFeature(
  writePlan: WritePlan,
  existingFeature: RuneWeaverFeatureRecord,
  mode: FeatureMode
): { ok: true } | { ok: false; issues: string[] } {
  const consumedExistingPaths = new Set<string>();

  writePlan.entries = writePlan.entries.map((entry) => {
    if (existingFeature.generatedFiles.includes(entry.targetPath)) {
      consumedExistingPaths.add(entry.targetPath);
      return { ...entry, operation: "update" };
    }

    const remappedTarget = findCompatibleExistingTarget(entry, existingFeature.generatedFiles, consumedExistingPaths);
    if (remappedTarget) {
      consumedExistingPaths.add(remappedTarget);
      return {
        ...entry,
        targetPath: remappedTarget,
        operation: "update",
      };
    }

    return { ...entry, operation: "create" };
  });

  const plannedPaths = new Set(writePlan.entries.map((entry) => entry.targetPath));
  const orphanedPaths = existingFeature.generatedFiles.filter((path) => !plannedPaths.has(path));

  if (orphanedPaths.length > 0 && mode === "create") {
    return {
      ok: false,
      issues: [
        `${mode} would orphan existing generated files for feature '${existingFeature.featureId}': ${orphanedPaths.join(", ")}`,
        "Use 'dota2 update --feature <id>' or 'dota2 regenerate --feature <id>' to handle file changes.",
      ],
    };
  }

  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((entry) => entry.operation === "create").length,
    update: writePlan.entries.filter((entry) => entry.operation === "update").length,
    conflicts: writePlan.entries.filter(
      (entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0)
    ).length,
    deferred: writePlan.entries.filter((entry) => entry.deferred).length,
  };

  return { ok: true };
}

function findCompatibleExistingTarget(
  entry: WritePlanEntry,
  existingPaths: string[],
  consumedExistingPaths: Set<string>
): string | null {
  const patternSegment = entry.sourcePattern.replace(/\./g, "_");
  const extension = getEntryExtension(entry);
  const qualifier = getEntryQualifier(entry);

  const entryIsServer = entry.targetPath.includes("/server/") || entry.targetPath.includes("\\server\\");
  const entryIsUI = entry.targetPath.includes("/ui/") || entry.targetPath.includes("\\ui\\");
  const entryIsShared = entry.targetPath.includes("/shared/") || entry.targetPath.includes("\\shared\\");

  const candidates = existingPaths.filter((path) => {
    if (consumedExistingPaths.has(path)) {
      return false;
    }
    if (!path.includes(patternSegment) || !path.endsWith(extension)) {
      return false;
    }

    const pathIsServer = path.includes("/server/") || path.includes("\\server\\");
    const pathIsUI = path.includes("/ui/") || path.includes("\\ui\\");
    const pathIsShared = path.includes("/shared/") || path.includes("\\shared\\");

    if (entryIsServer !== pathIsServer || entryIsUI !== pathIsUI || entryIsShared !== pathIsShared) {
      return false;
    }

    if (qualifier === "ability") {
      return path.endsWith("_ability.ts");
    }
    if (qualifier === "modifier") {
      return path.endsWith("_modifier.ts");
    }
    if (extension === ".ts") {
      return !path.endsWith("_ability.ts") && !path.endsWith("_modifier.ts");
    }

    return true;
  });

  return candidates.length === 1 ? candidates[0] : null;
}

function getEntryExtension(entry: WritePlanEntry): string {
  switch (entry.contentType) {
    case "tsx":
      return ".tsx";
    case "less":
    case "css":
      return ".less";
    case "json":
      return ".json";
    case "lua":
      return ".lua";
    default:
      return ".ts";
  }
}

function getEntryQualifier(entry: WritePlanEntry): "ability" | "modifier" | "main" {
  if (entry.targetPath.endsWith("_ability.ts") || entry.contentSummary.includes("Ability")) {
    return "ability";
  }
  if (entry.targetPath.endsWith("_modifier.ts") || entry.contentSummary.includes("Modifier")) {
    return "modifier";
  }
  return "main";
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

function computeAbilityName(entry: WritePlanEntry, index: number): string {
  const patternSegment = entry.sourcePattern.includes(".")
    ? entry.sourcePattern.split(".").pop() || entry.sourcePattern
    : entry.sourcePattern;
  const baseName = patternSegment;
  const featureSegment = entry.targetPath.includes("feature_")
    ? entry.targetPath.match(/feature_([^/]+)/)?.[1]
    : entry.targetPath.includes("micro_feature_")
      ? entry.targetPath.match(/micro_feature_([^/]+)/)?.[1]
      : null;
  return featureSegment
    ? `rw_${featureSegment}_${baseName}_${index}`
    : `rw_${baseName}_${index}`;
}

/**
 * @deprecated T125-R4: This function is no longer used by the mainline lua path.
 *   The normal pipeline now produces proper lua entries via Pattern.outputTypes,
 *   which use generateLuaAbilityCode() with full metadata. This stub remains only
 *   as a compat marker; it generates a hardcoded modifier_rw_buff wrapper that
 *   is NOT driven by pattern metadata.
 */
function generateLuaWrapperContent(abilityName: string): string {
  return `local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local __TS__ClassExtends = ____lualib.__TS__ClassExtends
local __TS__DecorateLegacy = ____lualib.__TS__DecorateLegacy
local ____exports = {}
local ____dota_ts_adapter = require("utils.dota_ts_adapter")
local BaseAbility = ____dota_ts_adapter.BaseAbility
local registerAbility = ____dota_ts_adapter.registerAbility

____exports.${abilityName} = __TS__Class()
local ${abilityName} = ____exports.${abilityName}
${abilityName}.name = "${abilityName}"
__TS__ClassExtends(${abilityName}, BaseAbility)

function ${abilityName}.prototype.OnSpellStart(self)
    local caster = self:GetCaster()
    local duration = self:GetSpecialValueFor("duration") or 5.0
    caster:AddNewModifier(caster, self, "modifier_rw_buff", {duration = duration})
    self:PlayEffects()
end

function ${abilityName}.prototype.PlayEffects(self)
    local particle = "particles/generic_gameplay/generic_slowed_cold.vpcf"
    local sound = "Hero_Crystal.CrystalNova"
    local effect = ParticleManager:CreateParticle(particle, ParticleAttachment.ABSORIGIN_FOLLOW, self:GetCaster())
    ParticleManager:ReleaseParticleIndex(effect)
    EmitSoundOn(sound, self:GetCaster())
end

${abilityName} = __TS__DecorateLegacy({registerAbility(nil)}, ${abilityName})
____exports.${abilityName} = ${abilityName}
return ____exports
`;
}

function generateKVContentWithIndex(entry: WritePlanEntry, index: number): string {
  const abilityName = computeAbilityName(entry, index);

  const kvInput: KVGeneratorInput = {
    routeId: `route_${entry.sourcePattern}_kv`,
    sourceUnitId: entry.sourceModule,
    generatorFamily: "dota2-kv",
    hostTarget: "ability_kv",
    abilityConfig: {
      abilityName,
      baseClass: "ability_lua",
      abilityType: "DOTA_ABILITY_TYPE_BASIC",
      behavior: "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
      abilityCooldown: "8.0",
      abilityManaCost: "50",
      abilityCastRange: "0",
      abilityCastPoint: "0.1",
      maxLevel: "4",
      requiredLevel: "1",
      levelsBetweenUpgrades: "3",
      scriptFile: `rune_weaver/abilities/${abilityName}`,
    },
    rationale: [
      `Generated from pattern: ${entry.sourcePattern}`,
      `Module: ${entry.sourceModule}`,
      `Feature: ${abilityName}`,
    ],
    blockers: entry.deferred ? [entry.deferredReason || "Entry marked deferred"] : [],
  };

  try {
    const kvOutput = generateAbilityKV(kvInput);
    console.log(`  [KV] Generated ability: ${kvOutput.abilityName} -> ${entry.targetPath}`);
    return kvOutput.kvBlock;
  } catch (error) {
    console.log(`  [KV] Error generating KV: ${error}`);
    return `// KV generation failed: ${error}\n`;
  }
}

function generateKVContent(entry: WritePlanEntry): string {
  // T118-R1: Build KVGeneratorInput from WritePlanEntry
  // T118-R1: Use semantic naming from sourceModule + sourcePattern, NOT target file basename
  // Extract meaningful segment from pattern (e.g., "modifier_applier" from "effect.modifier_applier")
  const patternSegment = entry.sourcePattern.includes(".")
    ? entry.sourcePattern.split(".").pop() || entry.sourcePattern
    : entry.sourcePattern;
  // Use patternSegment as baseName - sourceModule may be generic (e.g., "effect")
  const baseName = patternSegment;
  // Try to extract feature ID from targetPath if present
  const featureSegment = entry.targetPath.includes("feature_")
    ? entry.targetPath.match(/feature_([^/]+)/)?.[1]
    : entry.targetPath.includes("micro_feature_")
      ? entry.targetPath.match(/micro_feature_([^/]+)/)?.[1]
      : null;
  const abilityName = featureSegment
    ? `rw_${featureSegment}_${baseName}`
    : `rw_${baseName}`;

  const kvInput: KVGeneratorInput = {
    routeId: `route_${entry.sourcePattern}_kv`,
    sourceUnitId: entry.sourceModule,
    generatorFamily: "dota2-kv",
    hostTarget: "ability_kv",
    abilityConfig: {
      abilityName,
      baseClass: "ability_datadriven",
      abilityType: "DOTA_ABILITY_TYPE_BASIC",
      behavior: "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
      abilityCooldown: "8.0",
      abilityManaCost: "50",
      abilityCastRange: "0",
      abilityCastPoint: "0.1",
      maxLevel: "4",
      requiredLevel: "1",
      levelsBetweenUpgrades: "3",
    },
    rationale: [
      `Generated from pattern: ${entry.sourcePattern}`,
      `Module: ${entry.sourceModule}`,
      `Feature: ${featureSegment}`,
    ],
    blockers: entry.deferred ? [entry.deferredReason || "Entry marked deferred"] : [],
  };

  try {
    const kvOutput = generateAbilityKV(kvInput);
    console.log(`  [KV] Generated ability: ${kvOutput.abilityName} -> ${entry.targetPath}`);
    return kvOutput.kvBlock;
  } catch (error) {
    console.log(`  [KV] Error generating KV: ${error}`);
    return `// KV generation failed: ${error}\n`;
  }
}

function generateCodeContent(entry: WritePlanEntry): string {
  // T115-R1/R2: Implement minimal generator-family dispatch
  const familyHint = entry.generatorFamilyHint;

  // T115-R2: Deferred entries are already filtered before this function is called
  // This check is a safety net for any edge cases
  if (entry.deferred) {
    return `// Deferred: ${entry.deferredReason || "Generator not yet implemented"}\n`;
  }

  // Family-specific dispatch
  switch (familyHint) {
    case "dota2-ui":
      // T115-R2: Option A - Transitional UI Path
      // UI family is transitional: it works via generic TS generation
      // but is NOT a dedicated dota2-ui generator family
      // This is intentional until dota2-ui generator is implemented
      console.log(`  [TRANSITIONAL] UI family entry using generic generation: ${entry.sourcePattern}`);
      break;

    case "dota2-kv":
      // T118: KV family now implemented - call KV generator
      // Build minimal KVGeneratorInput from entry
      return generateKVContent(entry);

    case "bridge-support":
      // T115-R1: Bridge support is separate path
      return `// Bridge support: handled via bridge adapter\n`;

    case "dota2-ts":
    default:
      // T115-R1: TS family dispatch (default)
      break;
  }

  const generated = generateCode(entry, entry.sourcePattern);
  return generated.content;
}

function validateHost(
  hostRoot: string,
  writePlan: WritePlan,
  writeResult: WriteResult,
  stableFeatureId: string,
  deferredEntries?: Array<{ pattern: string; reason: string }>
): { success: boolean; checks: string[]; issues: string[]; details: Record<string, unknown> } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 7: Host Validation");
  console.log("=".repeat(70));

  const checks: string[] = [];
  const issues: string[] = [];
  const details: Record<string, unknown> = {};

  // 1. Check namespace directories
  const serverNsPath = join(hostRoot, "game/scripts/src/rune_weaver");
  const uiNsPath = join(hostRoot, "content/panorama/src/rune_weaver");

  if (existsSync(serverNsPath)) {
    checks.push("✅ Server namespace exists");
  } else {
    checks.push("❌ Server namespace missing");
    issues.push("Server namespace directory not found");
  }

  if (existsSync(uiNsPath)) {
    checks.push("✅ UI namespace exists");
  } else {
    checks.push("❌ UI namespace missing");
    issues.push("UI namespace directory not found");
  }

  // 2. Check bridge files
  const serverBridgePath = join(hostRoot, "game/scripts/src/modules/index.ts");
  const uiBridgePath = join(hostRoot, "content/panorama/src/hud/script.tsx");

  if (existsSync(serverBridgePath)) {
    checks.push("✅ Server bridge file exists");
    
    // Check bridge content
    const bridgeContent = readFileSync(serverBridgePath, "utf-8");
    const hasActivateCall = bridgeContent.includes("activateRuneWeaverModules");
    const callCount = (bridgeContent.match(/activateRuneWeaverModules\(\)/g) || []).length;
    
    if (hasActivateCall && callCount === 1) {
      checks.push("✅ Server bridge correctly injected (1 call)");
    } else if (callCount > 1) {
      checks.push("❌ Server bridge has duplicate calls");
      issues.push(`Server bridge has ${callCount} activateRuneWeaverModules calls (expected 1)`);
    } else {
      checks.push("⚠️  Server bridge missing activation call");
    }
    
    details.serverBridgeCalls = callCount;
  } else {
    checks.push("❌ Server bridge file missing");
    issues.push("Server bridge file not found");
  }

  if (existsSync(uiBridgePath)) {
    checks.push("✅ UI bridge file exists");
    
    const uiBridgeContent = readFileSync(uiBridgePath, "utf-8");
    const hasUIBridge = uiBridgeContent.includes("rune_weaver");
    
    if (hasUIBridge) {
      checks.push("✅ UI bridge correctly connected");
    } else {
      checks.push("⚠️  UI bridge missing rune_weaver reference");
    }
    
    details.uiBridgeConnected = hasUIBridge;
  } else {
    checks.push("❌ UI bridge file missing");
    issues.push("UI bridge file not found");
  }

  // 3. Check generated directories
  const generatedServerPath = join(hostRoot, "game/scripts/src/rune_weaver/generated/server");
  const generatedUIPath = join(hostRoot, "content/panorama/src/rune_weaver/generated/ui");

  if (existsSync(generatedServerPath)) {
    checks.push("✅ Generated server directory exists");
  } else {
    checks.push("⚠️  Generated server directory missing");
  }

  if (existsSync(generatedUIPath)) {
    checks.push("✅ Generated UI directory exists");
  } else {
    checks.push("⚠️  Generated UI directory missing");
  }

  // 4. Check write plan vs write result consistency
  // T115-R2: Exclude deferred entries from planned files check
  // Deferred entries are intentionally not executed
  const nonDeferredEntries = writePlan.entries.filter((e) => !e.deferred);
  const plannedFiles = nonDeferredEntries.map((e) => e.targetPath);
  const realizedFiles = [
    ...writeResult.createdFiles,
    ...writeResult.modifiedFiles.filter((file) => file.startsWith("game/scripts/src/rune_weaver/") || file.startsWith("content/panorama/src/rune_weaver/")),
  ];

  const missingFiles = plannedFiles.filter((f) => !realizedFiles.includes(f));
  const extraFiles = realizedFiles.filter((f) => !plannedFiles.includes(f));

  if (missingFiles.length === 0) {
    checks.push("✅ All planned files were created");
  } else {
    checks.push(`❌ ${missingFiles.length} planned files not created`);
    issues.push(`Missing files: ${missingFiles.slice(0, 3).join(", ")}${missingFiles.length > 3 ? "..." : ""}`);
  }

  // T115-R2: Report deferred entries as informational, not as missing files
  if (deferredEntries && deferredEntries.length > 0) {
    checks.push(`ℹ️  ${deferredEntries.length} deferred entries not executed (expected - KV generator not implemented)`);
  }

  details.plannedFilesCount = plannedFiles.length;
  details.createdFilesCount = realizedFiles.length;
  details.missingFiles = missingFiles;
  details.extraFiles = extraFiles;

  // 5. Check feature-specific generated files exist
  // writePlan.id format: writeplan_<feature_type>_<feature_id>_<timestamp>
  // file name format: <feature_type>_<feature_id>_...
  // So we need to extract <feature_type>_<feature_id> from writePlan.id
  const featureFiles = realizedFiles.filter((f) => f.includes(stableFeatureId));
  
  if (featureFiles.length > 0) {
    checks.push(`✅ Feature files created (${featureFiles.length})`);
  } else {
    checks.push("❌ No feature-specific files found");
    issues.push("Cannot identify feature-specific files from write result");
  }
  
  details.featureFilesCount = featureFiles.length;

  console.log(`  Validation Checks:`);
  for (const check of checks) {
    console.log(`    ${check}`);
  }

  const success = issues.length === 0;
  console.log(`\n  Overall: ${success ? "✅ PASSED" : "❌ FAILED"}`);

  return { success, checks, issues, details };
}

function updateWorkspaceState(
  hostRoot: string,
  blueprint: Blueprint,
  assemblyPlan: AssemblyPlan,
  writePlan: WritePlan,
  mode: FeatureMode,
  featureId: string,
  existingFeature: RuneWeaverFeatureRecord | null
): { success: boolean; featureId: string; totalFeatures: number; error?: string } {
  // Initialize workspace if not exists
  const initResult = initializeWorkspace(hostRoot);
  if (!initResult.success) {
    return {
      success: false,
      featureId,
      totalFeatures: 0,
      error: "Failed to initialize workspace",
    };
  }

  const workspace = initResult.workspace!;

  // Persist normalized workspace shape before applying new updates.
  const normalizedSave = saveWorkspace(hostRoot, workspace);
  if (!normalizedSave.success) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: "Failed to normalize existing workspace state",
    };
  }

  if (mode === "create") {
    const duplicatePolicy = checkDuplicateFeature(workspace, featureId);
    if (duplicatePolicy.action === "reject") {
      const existing = workspace.features.find((f) => f.featureId === featureId);
      if (existing) {
        return {
          success: false,
          featureId,
          totalFeatures: workspace.features.length,
          error: duplicatePolicy.message,
        };
      }
    }
  } else if (!existingFeature) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: `Feature '${featureId}' does not exist for ${mode}`,
    };
  }

  // Extract entry bindings
  const entryBindings = extractEntryBindings(assemblyPlan.bridgeUpdates);
  // T115-R2-FIX: Only include non-deferred entries in generatedFiles
  // T118-R2: Apply KV aggregation to generatedFiles for workspace state
  const executableEntries = writePlan.entries.filter((e) => !e.deferred);
  const kvEntriesForWs = executableEntries.filter((e) => e.contentType === "kv");
  const nonKvEntriesForWs = executableEntries.filter((e) => e.contentType !== "kv");
  const kvTargetPathsForWs = new Set(kvEntriesForWs.map((e) => e.targetPath));
  const aggregatedKvFilesForWs = Array.from(kvTargetPathsForWs);
  const nonKvFilesForWs = nonKvEntriesForWs.map((e) => e.targetPath);
  const generatedFiles = [...nonKvFilesForWs, ...aggregatedKvFilesForWs];

  // Create feature write result
  const featureResult: FeatureWriteResult = {
    featureId,
    blueprintId: blueprint.id,
    selectedPatterns: assemblyPlan.selectedPatterns.map((p) => p.patternId),
    generatedFiles,
    entryBindings,
  };

  const intentKind = blueprint.sourceIntent.intentKind;
  const updatedWorkspace =
    mode === "create"
      ? addFeatureToWorkspace(workspace, featureResult, intentKind)
      : updateFeatureInWorkspace(workspace, featureId, featureResult, intentKind);

  const saveResult = saveWorkspace(hostRoot, updatedWorkspace);
  if (!saveResult.success) {
    return {
      success: false,
      featureId,
      totalFeatures: workspace.features.length,
      error: "Failed to save workspace state",
    };
  }

  const bridgeRefresh = refreshBridge(hostRoot, updatedWorkspace);
  if (!bridgeRefresh.success) {
    return {
      success: false,
      featureId,
      totalFeatures: updatedWorkspace.features.length,
      error: `Failed to refresh generated bridge indexes: ${bridgeRefresh.errors.join(", ")}`,
    };
  }

  return {
    success: true,
    featureId,
    totalFeatures: updatedWorkspace.features.length,
  };
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

function saveReviewArtifact(artifact: Dota2ReviewArtifact, outputDir: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `dota2-review-${artifact.cliOptions.command}-${timestamp}.json`;
  const outputPath = join(outputDir, filename);

  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");

  return outputPath;
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
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  const existingFeature = findFeatureById(workspaceResult.workspace, options.featureId);
  if (!existingFeature) {
    console.error(`\n❌ Feature '${options.featureId}' not found in workspace`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: "Feature not found" };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature '${options.featureId}' not found`);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  if (existingFeature.status !== "active") {
    console.error(`\n❌ Feature '${options.featureId}' has status '${existingFeature.status}' and cannot be rolled back`);
    console.error(`   Only features with status 'active' can be rolled back`);
    artifact.stages.workspaceState = { success: false, featureId: options.featureId, totalFeatures: workspaceResult.workspace.features.length, error: `Feature status is '${existingFeature.status}', not 'active'` };
    artifact.finalVerdict.pipelineComplete = false;
    artifact.finalVerdict.weakestStage = "workspaceState";
    artifact.finalVerdict.remainingRisks.push(`Feature status is '${existingFeature.status}', only 'active' features can be rolled back`);
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
    return false;
  }

  console.log(`\n📋 Existing Feature:`);
  console.log(`   Feature ID: ${existingFeature.featureId}`);
  console.log(`   Revision: ${existingFeature.revision}`);
  console.log(`   Generated Files: ${existingFeature.generatedFiles.length}`);
  console.log(`   Status: ${existingFeature.status}`);

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
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
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
    saveReviewArtifact(artifact, join(process.cwd(), "tmp", "cli-review"));
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

  const outputDir = join(process.cwd(), "tmp", "cli-review");
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

function performUpdateHostValidation(
  hostRoot: string,
  diffResult: UpdateDiffResult,
  updateResult: SelectiveUpdateResult
): { success: boolean; checks: string[]; issues: string[] } {
  const checks: string[] = [];
  const issues: string[] = [];

  const serverNsPath = join(hostRoot, "game/scripts/src/rune_weaver");
  const uiNsPath = join(hostRoot, "content/panorama/src/rune_weaver");

  if (existsSync(serverNsPath)) {
    checks.push("✅ Server namespace exists");
  } else {
    checks.push("❌ Server namespace missing");
    issues.push("Server namespace directory not found");
  }

  if (existsSync(uiNsPath)) {
    checks.push("✅ UI namespace exists");
  } else {
    checks.push("❌ UI namespace missing");
    issues.push("UI namespace directory not found");
  }

  if (updateResult.refreshedCount > 0) {
    checks.push(`✅ Refreshed ${updateResult.refreshedCount} files`);
  }

  if (updateResult.createdCount > 0) {
    checks.push(`✅ Created ${updateResult.createdCount} files`);
  }

  if (updateResult.deletedCount > 0) {
    checks.push(`✅ Deleted ${updateResult.deletedCount} files`);
  }

  if (updateResult.failedFiles.length > 0) {
    checks.push(`❌ ${updateResult.failedFiles.length} files failed`);
    for (const file of updateResult.failedFiles) {
      issues.push(`Failed: ${file.path} - ${file.error}`);
    }
  }

  if (updateResult.bridgeRefreshResult) {
    if (updateResult.bridgeRefreshResult.success) {
      checks.push("✅ Bridge indexes refreshed");
    } else {
      checks.push("❌ Bridge refresh failed");
      issues.push("Bridge index refresh failed");
    }
  }

  const success = issues.length === 0;
  return { success, checks, issues };
}

function performRollbackHostValidation(
  hostRoot: string,
  rollbackPlan: RollbackPlan,
  rollbackResult: RollbackExecutionResult
): { success: boolean; checks: string[]; issues: string[]; details: Record<string, unknown> } {
  const checks: string[] = [];
  const issues: string[] = [];
  const details: Record<string, unknown> = {};

  const serverNsPath = join(hostRoot, "game/scripts/src/rune_weaver");
  const uiNsPath = join(hostRoot, "content/panorama/src/rune_weaver");

  if (existsSync(serverNsPath)) {
    checks.push("✅ Server namespace exists");
  } else {
    checks.push("❌ Server namespace missing");
    issues.push("Server namespace directory not found");
  }

  if (existsSync(uiNsPath)) {
    checks.push("✅ UI namespace exists");
  } else {
    checks.push("❌ UI namespace missing");
    issues.push("UI namespace directory not found");
  }

  const serverIndexPath = join(hostRoot, "game/scripts/src/modules/index.ts");
  if (existsSync(serverIndexPath)) {
    checks.push("✅ Server bridge index exists");
  } else {
    checks.push("❌ Server bridge index missing");
    issues.push("Server bridge index not found");
  }

  const uiScriptPath = join(hostRoot, "content/panorama/src/hud/script.tsx");
  if (existsSync(uiScriptPath)) {
    checks.push("✅ UI bridge script exists");
  } else {
    checks.push("❌ UI bridge script missing");
    issues.push("UI bridge script not found");
  }

  if (rollbackResult.deleted.length > 0) {
    checks.push(`✅ Deleted ${rollbackResult.deleted.length} files`);
  }
  if (rollbackResult.failed.length > 0) {
    checks.push(`❌ ${rollbackResult.failed.length} file deletions failed`);
    issues.push(`${rollbackResult.failed.length} file deletions failed`);
  }
  if (rollbackResult.skipped.length > 0) {
    checks.push(`⏭️  Skipped ${rollbackResult.skipped.length} files (dry-run or not found)`);
  }

  if (rollbackResult.indexRefreshSuccess) {
    checks.push("✅ Bridge indexes refreshed");
  } else {
    checks.push("❌ Bridge index refresh failed");
    issues.push("Bridge index refresh failed");
  }

  details.deletedFiles = rollbackResult.deleted;
  details.failedFiles = rollbackResult.failed;
  details.skippedFiles = rollbackResult.skipped;
  details.indexRefreshSuccess = rollbackResult.indexRefreshSuccess;

  const success = issues.length === 0;

  return { success, checks, issues, details };
}

import { existsSync } from "fs";
import { extractNumericParameters } from "../../core/wizard/index.js";
import { buildBlueprint } from "../../core/blueprint/builder.js";
import { createAssemblyPlan } from "../../core/pipeline/assembly-plan.js";
import { resolvePatterns } from "../../core/patterns/resolver.js";
import { createWritePlan } from "../../adapters/dota2/assembler/index.js";
import { generateCode } from "../../adapters/dota2/generator/index.js";
import { realizeDota2Host } from "../../adapters/dota2/realization/index.js";
import { generateGeneratorRoutingPlan } from "../../adapters/dota2/routing/index.js";
import { executeWrite } from "../../apps/cli/dota2/write-executor.js";
import { updateWorkspaceState } from "../../apps/cli/helpers/workspace-integration.js";
import { findFeatureById, initializeWorkspace } from "../../core/workspace/index.js";
import type { Dota2CLIOptions } from "../../apps/cli/dota2-cli.js";
import type { IntentSchema, ValidationIssue } from "../../core/schema/types.js";
import { enrichDota2CreateBlueprint } from "../../adapters/dota2/blueprint/index.js";
import {
  getTalentDrawParameters,
  type TalentDrawFixture,
} from "../../apps/workbench/fixtures/talent-draw.fixture.js";
import { REQUIRED_PATTERNS, TALENT_DRAW_FEATURE_ID } from "./config.js";
import type { CLIOptions, FullPipelineResult, WriteExecutionResult, WriteModeConfig } from "./types.js";

function createIntentSchemaWithFixture(fixture: TalentDrawFixture): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: fixture.prompt,
      goal: "三选一天赋抽取系统",
      nameHint: "talent_draw",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    requirements: {
      functional: [],
      interactions: ["F4 按键输入", "卡牌点击选择"],
      dataNeeds: ["加权天赋池", "会话状态追踪"],
      outputs: ["属性加成效果", "UI 状态更新"],
    },
    constraints: {
      requiredPatterns: REQUIRED_PATTERNS,
    },
    uiRequirements: {
      needed: true,
      surfaces: ["天赋选择弹窗"],
      feedbackNeeds: ["选择确认", "属性变化反馈"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    parameters: getTalentDrawParameters(),
    openQuestions: [],
    resolvedAssumptions: [
      "Session-scoped pool state",
      "F4 as dedicated talent draw key",
      "R/SR/SSR/UR rarity tiers",
    ],
    isReadyForBlueprint: true,
  };
}

export function runFullPipeline(fixture: TalentDrawFixture, options: CLIOptions): FullPipelineResult {
  console.log("[Pipeline] Pre-check: Extracting parameters from prompt via Wizard...");
  const wizardExtractedParams = extractNumericParameters(fixture.prompt);
  console.log(`  ✓ Wizard extracted: ${Object.keys(wizardExtractedParams).join(", ") || "(none)"}`);

  console.log("[Pipeline] Step 1: Creating IntentSchema with fixture parameters...");
  const schema = createIntentSchemaWithFixture(fixture);
  console.log(`  ✓ Schema created with parameters: ${Object.keys(schema.parameters || {}).join(", ")}`);

  console.log("[Pipeline] Step 2: Building Blueprint...");
  const blueprintResult = buildBlueprint(schema);
  const baseBlueprint = blueprintResult.finalBlueprint || blueprintResult.blueprint || null;
  const enrichedBlueprint = baseBlueprint
    ? enrichDota2CreateBlueprint(baseBlueprint, {
        schema,
        prompt: fixture.prompt,
        hostRoot: options.host,
        mode: "create",
        featureId: TALENT_DRAW_FEATURE_ID,
        proposalSource: "fallback",
      })
    : null;
  const blueprint = enrichedBlueprint?.blueprint || baseBlueprint;
  if (!blueprintResult.success || !blueprint) {
    throw new Error(`Blueprint build failed: ${JSON.stringify(blueprintResult.issues)}`);
  }
  console.log(`  ✓ Blueprint created: ${blueprint.id}`);
  console.log(`    - Modules: ${blueprint.modules.length} (${blueprint.modules.map((m) => m.category).join(", ")})`);
  if (blueprint.featureAuthoring?.profile === "selection_pool") {
    console.log("    - Enriched with selection_pool source-backed authoring");
  }

  console.log("[Pipeline] Step 3: Resolving Patterns...");
  const resolution = resolvePatterns(blueprint);
  console.log(`  ✓ Patterns resolved: ${resolution.patterns.length}`);
  console.log(`    - Selected: ${resolution.patterns.map((p) => p.patternId).join(", ")}`);

  console.log("[Pipeline] Step 4: Creating AssemblyPlan...");
  const assemblyResult = createAssemblyPlan(blueprint, {
    allowFallback: true,
    targetKinds: ["server", "shared", "ui", "config"],
  });

  const allIssues: ValidationIssue[] = [
    ...(blueprintResult.issues || []),
    ...((enrichedBlueprint?.issues || []).map((message) => ({
      code: "DOTA2_BLUEPRINT_ENRICHMENT",
      scope: "blueprint" as const,
      severity: "warning" as const,
      message,
    }))),
    ...resolution.issues.map((issue) => ({ ...issue, scope: issue.scope as ValidationIssue["scope"] })),
    ...(assemblyResult.issues || []),
  ];

  const assemblyPlan = assemblyResult.plan;
  console.log(`  ✓ AssemblyPlan created: ${assemblyPlan ? "success" : "failed"}`);

  let hostRealizationPlan = null;
  if (assemblyPlan) {
    console.log("[Pipeline] Step 5: Running Host Realization...");
    hostRealizationPlan = realizeDota2Host(assemblyPlan);
    console.log(`  ✓ HostRealizationPlan created (${hostRealizationPlan.units.length} units)`);
  }

  let generatorRoutingPlan = null;
  if (hostRealizationPlan) {
    console.log("[Pipeline] Step 6: Generating Generator Routing Plan...");
    generatorRoutingPlan = generateGeneratorRoutingPlan(hostRealizationPlan);
    console.log(`  ✓ GeneratorRoutingPlan created (${generatorRoutingPlan.routes.length} routes)`);
  }

  let writePlan = null;
  if (assemblyPlan) {
    console.log("[Pipeline] Step 7: Creating Write Plan...");
    writePlan = createWritePlan(
      assemblyPlan,
      options.host,
      TALENT_DRAW_FEATURE_ID,
      generatorRoutingPlan ?? undefined,
      hostRealizationPlan ?? undefined
    );
    console.log(`  ✓ WritePlan created: ${writePlan.id}`);
    console.log(`    - Target: ${writePlan.targetProject}`);
    console.log(`    - Entries: ${writePlan.entries.length}`);
  }

  const generatedFiles: FullPipelineResult["generatedFiles"] = [];
  if (writePlan) {
    console.log("[Pipeline] Step 8: Generating Code...");
    for (const entry of writePlan.entries) {
      generatedFiles.push({ entry, code: generateCode(entry, TALENT_DRAW_FEATURE_ID) });
    }
    console.log(`  ✓ Generated ${generatedFiles.length} files`);
  }

  return {
    schema,
    blueprint,
    resolution,
    assemblyPlan,
    hostRealizationPlan,
    generatorRoutingPlan,
    writePlan,
    generatedFiles,
    issues: allIssues,
    wizardExtractedParams,
  };
}

export async function executeWriteToHost(
  result: FullPipelineResult,
  writeConfig: WriteModeConfig
): Promise<WriteExecutionResult> {
  if (!result.writePlan) {
    return {
      success: false,
      writeResult: null,
      review: null,
      evidence: { filesCreated: [], filesModified: [], filesSkipped: [], dryRunArtifacts: [] },
    };
  }

  if (writeConfig.mode === "write" && !existsSync(writeConfig.hostRoot)) {
    throw new Error(`Host root does not exist: ${writeConfig.hostRoot}`);
  }

  const cliOptions: Dota2CLIOptions = {
    command: "run",
    prompt: result.schema.request.rawPrompt,
    hostRoot: writeConfig.hostRoot,
    featureId: writeConfig.stableFeatureId,
    dryRun: writeConfig.mode === "dry-run",
    write: writeConfig.mode === "write",
    force: writeConfig.mode === "dry-run" ? true : writeConfig.force,
    verbose: false,
  };

  const { result: writeResult, review } = await executeWrite(
    result.writePlan,
    cliOptions,
    writeConfig.stableFeatureId
  );

  if (writeConfig.mode === "write" && writeResult?.success && result.assemblyPlan) {
    const workspaceResult = initializeWorkspace(writeConfig.hostRoot);
    const existingFeature = workspaceResult.workspace
      ? findFeatureById(workspaceResult.workspace, writeConfig.stableFeatureId) ?? null
      : null;
    const workspaceUpdate = updateWorkspaceState(
      writeConfig.hostRoot,
      result.blueprint,
      result.assemblyPlan,
      result.writePlan,
      existingFeature ? "update" : "create",
      writeConfig.stableFeatureId,
      existingFeature,
      writeResult
    );

    if (!workspaceUpdate.success) {
      throw new Error(workspaceUpdate.error || "Failed to update workspace and refresh bridges");
    }
  }

  return {
    success: writeConfig.mode === "dry-run" ? true : writeResult?.success ?? false,
    writeResult,
    review,
    evidence: {
      filesCreated: writeConfig.mode === "dry-run" ? [] : writeResult?.createdFiles || [],
      filesModified: writeConfig.mode === "dry-run" ? [] : writeResult?.modifiedFiles || [],
      filesSkipped: writeResult?.skipped.map((item) => item.action.targetPath) || [],
      dryRunArtifacts: result.generatedFiles.map(({ entry, code }) => ({
        path: entry.targetPath,
        wouldCreate: true,
        preview: code.content.substring(0, 200).replace(/\n/g, " "),
      })),
    },
  };
}

export async function runCompletePipeline(
  fixture: TalentDrawFixture,
  options: CLIOptions
): Promise<{
  pipelineResult: FullPipelineResult;
  writeExecution: WriteExecutionResult | null;
}> {
  const pipelineResult = runFullPipeline(fixture, options);
  const writeExecution = await executeWriteToHost(pipelineResult, {
    mode: options.write ? "write" : "dry-run",
    hostRoot: options.host,
    stableFeatureId: TALENT_DRAW_FEATURE_ID,
    force: options.force,
  });

  return { pipelineResult, writeExecution };
}

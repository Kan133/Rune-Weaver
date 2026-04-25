import { existsSync } from "fs";

import { createWritePlan } from "../../adapters/dota2/assembler/index.js";
import { generateCode } from "../../adapters/dota2/generator/index.js";
import { realizeDota2Host } from "../../adapters/dota2/realization/index.js";
import { generateGeneratorRoutingPlan } from "../../adapters/dota2/routing/index.js";
import type { Dota2CLIOptions } from "../../apps/cli/dota2-cli.js";
import {
  buildBlueprint as buildDota2Blueprint,
  createIntentSchema as createDota2IntentSchema,
} from "../../apps/cli/dota2/planning.js";
import { executeWrite } from "../../apps/cli/dota2/write-executor.js";
import { updateWorkspaceState } from "../../apps/cli/helpers/workspace-integration.js";
import { createAssemblyPlan } from "../../core/pipeline/assembly-plan.js";
import { resolvePatterns } from "../../core/patterns/resolver.js";
import type { IntentSchema, ValidationIssue, WizardClarificationAuthority } from "../../core/schema/types.js";
import { findFeatureById, initializeWorkspace } from "../../core/workspace/index.js";
import type { IntentSemanticAnalysis } from "../../core/wizard/index.js";
import { extractNumericParameters } from "../../core/wizard/index.js";
import type { SelectionCaseSpec } from "../../adapters/dota2/cases/selection-demo-registry.js";
import type { CLIOptions, FullPipelineResult, WriteExecutionResult, WriteModeConfig } from "./types.js";

async function createIntentSchemaWithCaseSpec(
  caseSpec: SelectionCaseSpec,
  options: CLIOptions,
): Promise<{
  schema: IntentSchema;
  usedFallback: boolean;
  semanticAnalysis: IntentSemanticAnalysis | null;
  clarificationAuthority: WizardClarificationAuthority;
}> {
  const result = await createDota2IntentSchema(caseSpec.prompt, options.host, {
    mode: "create",
    featureId: caseSpec.featureId,
    interactive: false,
  });

  if (!result.schema) {
    throw new Error(`Failed to create IntentSchema for ${caseSpec.caseId}.`);
  }

  if (result.clarificationAuthority.blocksBlueprint || result.requiresClarification) {
    throw new Error(
      `${caseSpec.caseId} unexpectedly requires clarification: ${result.clarificationAuthority.reasons.join("; ")}`,
    );
  }

  return {
    schema: {
      ...result.schema,
      request: {
        ...result.schema.request,
        nameHint: caseSpec.featureId,
      },
      constraints: {
        ...(result.schema.constraints || {}),
        requiredPatterns: caseSpec.smokeExpectations.requiredPatternIds,
      },
      parameters: JSON.parse(JSON.stringify(caseSpec.authoringParameters)) as Record<string, unknown>,
    },
    usedFallback: result.usedFallback,
    semanticAnalysis: result.semanticAnalysis,
    clarificationAuthority: result.clarificationAuthority,
  };
}

export async function runFullPipeline(
  caseSpec: SelectionCaseSpec,
  options: CLIOptions,
): Promise<FullPipelineResult> {
  console.log("[Pipeline] Pre-check: Extracting parameters from prompt via Wizard...");
  const wizardExtractedParams = extractNumericParameters(caseSpec.prompt);
  console.log(`  ✓ Wizard extracted: ${Object.keys(wizardExtractedParams).join(", ") || "(none)"}`);

  console.log("[Pipeline] Step 1: Creating IntentSchema with CLI planning flow plus case authoring parameters...");
  const {
    schema,
    usedFallback,
    semanticAnalysis,
    clarificationAuthority,
  } = await createIntentSchemaWithCaseSpec(caseSpec, options);
  console.log(`  ✓ Schema created with parameters: ${Object.keys(schema.parameters || {}).join(", ")}`);

  console.log("[Pipeline] Step 2: Building Blueprint via Dota2 planning...");
  const blueprintResult = buildDota2Blueprint(
    schema,
    {
      prompt: caseSpec.prompt,
      hostRoot: options.host,
      semanticAnalysis: semanticAnalysis || undefined,
      mode: "create",
      featureId: caseSpec.featureId,
      proposalSource: usedFallback ? "fallback" : "llm",
    },
    clarificationAuthority,
  );
  const blueprint = blueprintResult.finalBlueprint || blueprintResult.blueprint || null;
  if (!blueprint || blueprintResult.status === "blocked" || blueprintResult.status === "error") {
    throw new Error(`Blueprint build failed: ${JSON.stringify(blueprintResult.issues)}`);
  }
  console.log(`  ✓ Blueprint created: ${blueprint.id}`);
  console.log(
    `    - Modules: ${blueprint.modules.length} (${blueprint.modules.map((module) => module.category).join(", ")})`,
  );
  if (blueprint.featureAuthoring?.profile === "selection_pool") {
    console.log("    - Enriched with selection_pool source-backed authoring");
  }

  console.log("[Pipeline] Step 3: Resolving Patterns...");
  const resolution = resolvePatterns(blueprint);
  console.log(`  ✓ Patterns resolved: ${resolution.patterns.length}`);
  console.log(`    - Selected: ${resolution.patterns.map((pattern) => pattern.patternId).join(", ")}`);

  console.log("[Pipeline] Step 4: Creating AssemblyPlan...");
  const assemblyResult = createAssemblyPlan(blueprint, {
    allowFallback: true,
    targetKinds: ["server", "shared", "ui", "config"],
  });

  const allIssues: ValidationIssue[] = [
    ...(blueprintResult.issues || []).map((message) => ({
      code: "DOTA2_BLUEPRINT_ENRICHMENT",
      scope: "blueprint" as const,
      severity: "warning" as const,
      message,
    })),
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
      caseSpec.featureId,
      generatorRoutingPlan ?? undefined,
      hostRealizationPlan ?? undefined,
    );
    console.log(`  ✓ WritePlan created: ${writePlan.id}`);
    console.log(`    - Target: ${writePlan.targetProject}`);
    console.log(`    - Entries: ${writePlan.entries.length}`);
  }

  const generatedFiles: FullPipelineResult["generatedFiles"] = [];
  if (writePlan) {
    console.log("[Pipeline] Step 8: Generating Code...");
    for (const entry of writePlan.entries) {
      generatedFiles.push({ entry, code: generateCode(entry, caseSpec.featureId) });
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
  writeConfig: WriteModeConfig,
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
    writeConfig.stableFeatureId,
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
      writeResult,
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
  caseSpec: SelectionCaseSpec,
  options: CLIOptions,
): Promise<{
  pipelineResult: FullPipelineResult;
  writeExecution: WriteExecutionResult | null;
}> {
  const pipelineResult = await runFullPipeline(caseSpec, options);
  const writeExecution = await executeWriteToHost(pipelineResult, {
    mode: options.write ? "write" : "dry-run",
    hostRoot: options.host,
    stableFeatureId: caseSpec.featureId,
    force: options.force,
  });

  return { pipelineResult, writeExecution };
}

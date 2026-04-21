import {
  IntentSchema,
  Blueprint,
  FinalBlueprint,
  AssemblyPlan,
  HostRealizationPlan,
  GeneratorRoutingPlan,
  IntentReadiness,
  CurrentFeatureContext,
  RelationCandidate,
  PromptConstraintBundle,
  RetrievalBundle,
  SelectionPoolAdmissionDiagnostics,
  UpdateIntent,
  WizardClarificationAuthority,
  WizardClarificationPlan,
  WorkspaceSemanticContext,
} from "../../../core/schema/types.js";
import { BlueprintBuilder } from "../../../core/blueprint/builder.js";
import { resolvePatterns, PatternResolutionResult } from "../../../core/patterns/resolver.js";
import { AssemblyPlanBuilder, AssemblyPlanConfig } from "../../../core/pipeline/assembly-plan.js";
import { createLLMClientFromEnv, isLLMConfigured, readLLMExecutionConfig } from "../../../core/llm/factory.js";
import {
  analyzeIntentSemanticLayers,
  buildWizardClarificationPlan,
  buildCurrentFeatureContext,
  createFallbackIntentSchema as createGenericFallbackIntentSchema,
  createUpdateIntentFromRequestedChange,
  deriveWizardClarificationAuthority,
  finalizeCreateIntentSchema,
  resolveRelationCandidates,
} from "../../../core/wizard/index.js";
import type { IntentSemanticAnalysis } from "../../../core/wizard/index.js";
import { enrichDota2CreateBlueprint, enrichDota2UpdateBlueprint } from "../../../adapters/dota2/blueprint/index.js";
import type { CreateReadinessDecision } from "../../../adapters/dota2/blueprint/index.js";
import {
  initializeWorkspace,
  findFeatureById,
  loadWorkspaceSemanticContext,
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
} from "../../../core/workspace/index.js";
import { createWritePlan as assemblerCreateWritePlan, WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import {
  buildSynthesizedAssemblyPlanWithLLM,
  shouldUseArtifactSynthesis,
} from "../../../adapters/dota2/synthesis/index.js";
import { refreshWeightedPoolWritePlan } from "../../../adapters/dota2/weighted-pool/index.js";
import { alignWritePlanWithExistingFeature } from "../helpers/index.js";
import { resolveCreateWizardFlow, resolveUpdateWizardFlow } from "../helpers/wizard-flow.js";

export type FeatureMode = "create" | "update" | "regenerate";

export interface CreateIntentSchemaContext {
  mode?: FeatureMode;
  featureId?: string;
  existingFeature?: RuneWeaverFeatureRecord | null;
  interactive?: boolean;
}

export interface CreateIntentSchemaResult {
  schema: IntentSchema | null;
  semanticAnalysis: IntentSemanticAnalysis | null;
  usedFallback: boolean;
  clarificationPlan?: WizardClarificationPlan;
  clarificationAuthority: WizardClarificationAuthority;
  relationCandidates?: RelationCandidate[];
  workspaceSemanticContext?: WorkspaceSemanticContext;
  promptPackageId?: string;
  promptConstraints?: PromptConstraintBundle;
  retrievalBundle?: RetrievalBundle;
  requiresClarification: boolean;
}

export interface CreateUpdateIntentResult {
  currentFeatureContext: CurrentFeatureContext | null;
  requestedChange: IntentSchema | null;
  updateIntent: UpdateIntent | null;
  usedFallback: boolean;
  clarificationPlan?: WizardClarificationPlan;
  clarificationAuthority: WizardClarificationAuthority;
  relationCandidates?: RelationCandidate[];
  workspaceSemanticContext?: WorkspaceSemanticContext;
  promptPackageId?: string;
  promptConstraints?: PromptConstraintBundle;
  retrievalBundle?: RetrievalBundle;
  requiresClarification: boolean;
}

export interface Dota2BlueprintBuildResult {
  blueprint: Blueprint | null;
  finalBlueprint: FinalBlueprint | null;
  status: IntentReadiness | "error";
  issues: string[];
  moduleNeedsCount: number;
  admissionDiagnostics?: SelectionPoolAdmissionDiagnostics;
  createReadinessDecision?: CreateReadinessDecision;
}

export interface Dota2BlueprintBuildContext {
  prompt: string;
  hostRoot: string;
  semanticAnalysis?: IntentSemanticAnalysis;
  mode?: FeatureMode;
  featureId?: string;
  existingFeature?: RuneWeaverFeatureRecord | null;
  proposalSource?: "llm" | "fallback";
}

export function getCreateSemanticPosture(
  semanticAnalysis: Pick<IntentSemanticAnalysis, "openSemanticResidue"> | null | undefined,
): "ready" | "weak" {
  if (!semanticAnalysis) {
    return "weak";
  }

  return semanticAnalysis.openSemanticResidue.some(
    (item) => item.disposition === "open" && item.class !== "bounded_detail_only",
  )
    ? "weak"
    : "ready";
}

function getUpdateIntentSemanticPosture(updateIntent: UpdateIntent): "ready" | "weak" {
  if (!updateIntent.semanticAnalysis) {
    return "weak";
  }

  const scope = updateIntent.semanticAnalysis.governanceDecisions.scope.value;
  const blocked = updateIntent.semanticAnalysis.governanceDecisions.mutationAuthority.value.blocked;
  const hasRelevantResidue = updateIntent.semanticAnalysis.openSemanticResidue.some((item) =>
    item.disposition === "open" && item.class !== "bounded_detail_only",
  );

  return scope === "ambiguous" || blocked.length > 0 || hasRelevantResidue
    ? "weak"
    : "ready";
}

function resolveClarificationState(
  prompt: string,
  schema: IntentSchema,
  hostRoot: string,
  semanticAnalysis?: IntentSemanticAnalysis,
  currentFeatureContext?: CurrentFeatureContext,
): {
  clarificationPlan?: WizardClarificationPlan;
  clarificationAuthority: WizardClarificationAuthority;
  relationCandidates?: RelationCandidate[];
  workspaceSemanticContext?: WorkspaceSemanticContext;
  requiresClarification: boolean;
} {
  const workspaceContextResult = loadWorkspaceSemanticContext(hostRoot);
  const workspaceSemanticContext = workspaceContextResult.success ? workspaceContextResult.context : undefined;
  const relationCandidates = resolveRelationCandidates({
    rawText: prompt,
    schema,
    workspaceSemanticContext,
  });
  const clarificationPlan = buildWizardClarificationPlan({
    rawText: prompt,
    schema,
    semanticAnalysis,
    currentFeatureContext,
    workspaceSemanticContext,
    relationCandidates,
  });

  return {
    ...(clarificationPlan ? { clarificationPlan } : {}),
    clarificationAuthority: deriveWizardClarificationAuthority(clarificationPlan),
    ...(relationCandidates.length > 0 ? { relationCandidates } : {}),
    ...(workspaceSemanticContext ? { workspaceSemanticContext } : {}),
    requiresClarification: Boolean(clarificationPlan?.questions.length),
  };
}

function countModuleNeeds(blueprint: Blueprint | null | undefined): number {
  const runtimeBlueprint = blueprint as (Blueprint & { moduleNeeds?: unknown }) | null | undefined;
  return Array.isArray(runtimeBlueprint?.moduleNeeds) ? runtimeBlueprint.moduleNeeds.length : 0;
}

function describeBlueprintStatus(status: Dota2BlueprintBuildResult["status"]): string {
  switch (status) {
    case "weak":
      return "needs review (weak)";
    case "blocked":
      return "honest-blocked";
    case "ready":
      return "ready";
    default:
      return "build failed";
  }
}

const TRANSIENT_INTENT_SCHEMA_PATTERNS = [
  /overloaded/i,
  /rate limit/i,
  /too many requests/i,
  /\b429\b/,
  /temporarily unavailable/i,
  /timeout/i,
  /timed out/i,
  /connection reset/i,
  /econnreset/i,
  /etimedout/i,
  /eai_again/i,
  /service unavailable/i,
];

const TRANSIENT_INTENT_SCHEMA_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const INTENT_SCHEMA_RETRY_DELAYS_MS = [800, 1600];
const INTENT_SCHEMA_MAX_LLM_ATTEMPTS = INTENT_SCHEMA_RETRY_DELAYS_MS.length + 1;

function getIntentSchemaErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return String(error);
}

function hasTransientIntentSchemaStatusCode(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const status = record.status ?? record.statusCode;
  return typeof status === "number" && TRANSIENT_INTENT_SCHEMA_STATUS_CODES.has(status);
}

function shouldRetryIntentSchemaError(error: unknown): boolean {
  if (hasTransientIntentSchemaStatusCode(error)) {
    return true;
  }

  const message = getIntentSchemaErrorMessage(error);
  return TRANSIENT_INTENT_SCHEMA_PATTERNS.some((pattern) => pattern.test(message));
}

function getIntentSchemaRetryDelayMs(attemptIndex: number): number {
  return INTENT_SCHEMA_RETRY_DELAYS_MS[attemptIndex] ?? INTENT_SCHEMA_RETRY_DELAYS_MS[INTENT_SCHEMA_RETRY_DELAYS_MS.length - 1];
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function getFeatureMode(command: "run" | "dry-run" | "review" | "update" | "regenerate" | "rollback" | "delete"): FeatureMode {
  if (command === "update") return "update";
  if (command === "regenerate") return "regenerate";
  return "create";
}

export function resolveStableFeatureId(input: {
  existingFeatureId?: string | null;
  explicitFeatureId?: string;
  prompt: string;
  blueprintId: string;
}): string {
  const existingFeatureId = input.existingFeatureId?.trim();
  if (existingFeatureId) {
    return existingFeatureId;
  }

  const explicitFeatureId = input.explicitFeatureId?.trim();
  if (explicitFeatureId) {
    return explicitFeatureId;
  }

  return input.blueprintId;
}

export function resolveExistingFeatureContext(
  hostRoot: string,
  featureId: string | undefined,
  mode: FeatureMode,
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

export async function createIntentSchema(
  prompt: string,
  hostRoot: string,
  context: CreateIntentSchemaContext = {},
): Promise<CreateIntentSchemaResult> {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: IntentSchema");
  console.log("=".repeat(70));

  if (!isLLMConfigured(process.cwd())) {
    console.log("  ⚠️  LLM not configured, using fallback");
    const schema = createFallbackIntentSchema(prompt, hostRoot);
    const semanticAnalysis = analyzeIntentSemanticLayers(schema, prompt, {
      kind: "dota2-x-template",
      projectRoot: hostRoot,
    });
    const clarificationState = resolveClarificationState(prompt, schema, hostRoot, semanticAnalysis);
    console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
    console.log(`     Goal: ${schema.request.goal}`);
    console.log(`     Intent Kind: ${schema.classification.intentKind}`);
    console.log(`     Semantic Posture: ${getCreateSemanticPosture(semanticAnalysis)}`);
    console.log(`     Uncertainties: ${schema.uncertainties?.length || 0}`);
    console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);
    return {
      schema,
      semanticAnalysis,
      usedFallback: true,
      promptPackageId: "wizard.create",
      ...clarificationState,
    };
  }

  try {
    const client = createLLMClientFromEnv(process.cwd());
    const llmConfig = readLLMExecutionConfig(process.cwd(), "dota2-planning");
    // Give transient provider/schema noise a couple more chances before fallback
    // so the admitted supported family does not collapse after a single bad sample.
    for (let attempt = 1; attempt <= INTENT_SCHEMA_MAX_LLM_ATTEMPTS; attempt++) {
      try {
        const result = await resolveCreateWizardFlow({
          client,
          rawText: prompt,
          hostRoot,
          allowInteractive: context.interactive,
          temperature: llmConfig.temperature,
          model: llmConfig.model,
          providerOptions: llmConfig.providerOptions,
        });

        if (result.valid && result.schema) {
          const schema = finalizeCreateIntentSchema(result.schema, prompt);
          const semanticAnalysis = analyzeIntentSemanticLayers(schema, prompt, {
            kind: "dota2-x-template",
            projectRoot: hostRoot,
          });
          const clarificationState = resolveClarificationState(
            prompt,
            schema,
            hostRoot,
            semanticAnalysis,
          );

          console.log("  ✅ IntentSchema created via LLM Wizard");
          console.log(`     Goal: ${schema.request.goal}`);
          console.log(`     Intent Kind: ${schema.classification.intentKind}`);
          console.log(`     Semantic Posture: ${getCreateSemanticPosture(semanticAnalysis)}`);
          console.log(`     Uncertainties: ${schema.uncertainties?.length || 0}`);
          console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

          return {
            schema,
            semanticAnalysis,
            usedFallback: result.usedFallback,
            promptPackageId: result.promptPackageId,
            promptConstraints: result.promptConstraints,
            retrievalBundle: result.retrievalBundle,
            ...clarificationState,
          };
        }

        if (attempt < INTENT_SCHEMA_MAX_LLM_ATTEMPTS) {
          const delayMs = getIntentSchemaRetryDelayMs(attempt - 1);
          console.log(
            `  ⚠️  LLM Wizard returned invalid schema, retry ${attempt + 1}/${INTENT_SCHEMA_MAX_LLM_ATTEMPTS} in ${delayMs}ms`
          );
          await sleep(delayMs);
          continue;
        }

        console.log("  ⚠️  LLM Wizard returned invalid schema, using fallback");
      } catch (error) {
        const message = getIntentSchemaErrorMessage(error);

        if (attempt < INTENT_SCHEMA_MAX_LLM_ATTEMPTS && shouldRetryIntentSchemaError(error)) {
          const delayMs = getIntentSchemaRetryDelayMs(attempt - 1);
          console.log(
            `  ⚠️  LLM not available (${message}), retry ${attempt + 1}/${INTENT_SCHEMA_MAX_LLM_ATTEMPTS} in ${delayMs}ms`
          );
          await sleep(delayMs);
          continue;
        }

        console.log(`  ⚠️  LLM not available (${message}), using fallback`);
      }

      break;
    }
  } catch (error) {
    const message = getIntentSchemaErrorMessage(error);
    console.log(`  ⚠️  LLM not available (${message}), using fallback`);
  }

  const schema = createFallbackIntentSchema(prompt, hostRoot);
  const semanticAnalysis = analyzeIntentSemanticLayers(schema, prompt, {
    kind: "dota2-x-template",
    projectRoot: hostRoot,
  });
  const clarificationState = resolveClarificationState(prompt, schema, hostRoot, semanticAnalysis);
  console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
  console.log(`     Goal: ${schema.request.goal}`);
  console.log(`     Intent Kind: ${schema.classification.intentKind}`);
  console.log(`     Semantic Posture: ${getCreateSemanticPosture(semanticAnalysis)}`);
  console.log(`     Uncertainties: ${schema.uncertainties?.length || 0}`);
  console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

  return {
    schema,
    semanticAnalysis,
    usedFallback: true,
    promptPackageId: "wizard.create",
    ...clarificationState,
  };
}

export async function createUpdateIntent(
  prompt: string,
  hostRoot: string,
  existingFeature: RuneWeaverFeatureRecord,
  interactive = false,
): Promise<CreateUpdateIntentResult> {
  const currentFeatureContext = buildCurrentFeatureContext(existingFeature, hostRoot);

  if (!isLLMConfigured(process.cwd())) {
    console.log("  ⚠️  LLM not configured, using fallback update intent analysis");
    const requestedChange = createFallbackIntentSchema(prompt, hostRoot);
    const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
    const clarificationState = resolveClarificationState(
      prompt,
      requestedChange,
      hostRoot,
      undefined,
      currentFeatureContext,
    );
    return {
      currentFeatureContext,
      requestedChange,
      updateIntent,
      usedFallback: true,
      promptPackageId: "wizard.update",
      ...clarificationState,
    };
  }

  try {
    const client = createLLMClientFromEnv(process.cwd());
    const llmConfig = readLLMExecutionConfig(process.cwd(), "dota2-planning");
    for (let attempt = 1; attempt <= INTENT_SCHEMA_MAX_LLM_ATTEMPTS; attempt++) {
      try {
        const result = await resolveUpdateWizardFlow({
          client,
          rawText: prompt,
          hostRoot,
          currentFeatureContext,
          allowInteractive: interactive,
          temperature: llmConfig.temperature,
          model: llmConfig.model,
          providerOptions: llmConfig.providerOptions,
        });

        if (result.valid && result.schema && result.updateIntent) {
          return {
            currentFeatureContext,
            requestedChange: result.schema,
            updateIntent: result.updateIntent,
            usedFallback: result.usedFallback,
            clarificationPlan: result.clarificationPlan,
            clarificationAuthority: result.clarificationAuthority,
            relationCandidates: result.relationCandidates,
            workspaceSemanticContext: result.workspaceSemanticContext,
            promptPackageId: result.promptPackageId,
            promptConstraints: result.promptConstraints,
            retrievalBundle: result.retrievalBundle,
            requiresClarification: result.requiresClarification,
          };
        }

        if (attempt < INTENT_SCHEMA_MAX_LLM_ATTEMPTS) {
          const delayMs = getIntentSchemaRetryDelayMs(attempt - 1);
          console.log(
            `  ⚠️  Update wizard returned invalid schema, retry ${attempt + 1}/${INTENT_SCHEMA_MAX_LLM_ATTEMPTS} in ${delayMs}ms`
          );
          await sleep(delayMs);
          continue;
        }

        console.log("  ⚠️  Update wizard returned invalid schema, using fallback");
      } catch (error) {
        const message = getIntentSchemaErrorMessage(error);
        if (attempt < INTENT_SCHEMA_MAX_LLM_ATTEMPTS && shouldRetryIntentSchemaError(error)) {
          const delayMs = getIntentSchemaRetryDelayMs(attempt - 1);
          console.log(
            `  ⚠️  Update wizard not available (${message}), retry ${attempt + 1}/${INTENT_SCHEMA_MAX_LLM_ATTEMPTS} in ${delayMs}ms`
          );
          await sleep(delayMs);
          continue;
        }

        console.log(`  ⚠️  Update wizard not available (${message}), using fallback`);
      }

      break;
    }
  } catch (error) {
    const message = getIntentSchemaErrorMessage(error);
    console.log(`  ⚠️  Update wizard not available (${message}), using fallback`);
  }

  const requestedChange = createFallbackIntentSchema(prompt, hostRoot);
  const updateIntent = createUpdateIntentFromRequestedChange(currentFeatureContext, requestedChange);
  const clarificationState = resolveClarificationState(
    prompt,
    requestedChange,
    hostRoot,
    undefined,
    currentFeatureContext,
  );

  return {
    currentFeatureContext,
    requestedChange,
    updateIntent,
    usedFallback: true,
    promptPackageId: "wizard.update",
    ...clarificationState,
  };
}

function createFallbackIntentSchema(
  prompt: string,
  hostRoot: string,
): IntentSchema {
  return finalizeCreateIntentSchema(
    createGenericFallbackIntentSchema(prompt, {
      kind: "dota2-x-template",
      projectRoot: hostRoot,
    }),
    prompt,
  );
}

export function buildBlueprint(
  schema: IntentSchema,
  context: Dota2BlueprintBuildContext,
  clarificationAuthority?: WizardClarificationAuthority,
): Dota2BlueprintBuildResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const builder = new BlueprintBuilder();
  const result = builder.build(schema);
  const baseBlueprint = result.draftBlueprint || result.blueprint || null;
  const baseFinalBlueprint = result.finalBlueprint || null;
  const semanticAnalysis = context.semanticAnalysis || analyzeIntentSemanticLayers(schema, context.prompt, {
    kind: "dota2-x-template",
    projectRoot: context.hostRoot,
  });
  const baseStatus = baseFinalBlueprint?.status || getCreateSemanticPosture(semanticAnalysis);
  const rawBaseIssues = result.issues.map((issue) => `${issue.code}: ${issue.message}`);
  const enrichedBlueprint = baseBlueprint
    ? enrichDota2CreateBlueprint(baseBlueprint, {
        schema,
        semanticAnalysis,
        prompt: context.prompt,
        hostRoot: context.hostRoot,
        mode: context.mode,
        featureId: context.featureId,
        existingFeature: context.existingFeature,
        proposalSource: context.proposalSource,
      })
    : { blueprint: null, status: baseStatus, issues: [] };
  const enrichedFinalBlueprint = baseFinalBlueprint
    ? enrichDota2CreateBlueprint(baseFinalBlueprint, {
        schema,
        semanticAnalysis,
        prompt: context.prompt,
        hostRoot: context.hostRoot,
        mode: context.mode,
        featureId: context.featureId,
        existingFeature: context.existingFeature,
        proposalSource: context.proposalSource,
      })
    : { blueprint: null, status: baseStatus, issues: [] };
  const stagedBlueprint = applyWriteBlockingClarificationWeakness(
    enrichedBlueprint.blueprint,
    clarificationAuthority,
  );
  const stagedFinalBlueprint = applyWriteBlockingClarificationWeakness(
    enrichedFinalBlueprint.blueprint,
    clarificationAuthority,
  );
  const blueprint = stagedBlueprint.blueprint;
  const finalBlueprint = stagedFinalBlueprint.blueprint;
  const admissionDiagnostics = enrichedFinalBlueprint.admissionDiagnostics || enrichedBlueprint.admissionDiagnostics;
  const createReadinessDecision =
    enrichedFinalBlueprint.createReadinessDecision || enrichedBlueprint.createReadinessDecision;
  const baseIssues = filterSupersededBlueprintIssues(rawBaseIssues, admissionDiagnostics);
  const status = finalBlueprint?.status || enrichedFinalBlueprint.status || baseStatus;
  const issues = [
    ...new Set([
      ...baseIssues,
      ...enrichedBlueprint.issues,
      ...enrichedFinalBlueprint.issues,
      ...stagedBlueprint.issues,
      ...stagedFinalBlueprint.issues,
    ]),
  ];
  const moduleNeedsCount = countModuleNeeds(finalBlueprint || blueprint);
  const canContinue = finalBlueprint?.commitDecision?.canAssemble ?? result.success;

  if (!finalBlueprint) {
    console.log("  ❌ Blueprint build failed");
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    for (const issue of issues) {
      console.log(`     - ${issue}`);
    }
    return {
      blueprint,
      finalBlueprint: null,
      status: baseBlueprint ? status : "error",
      issues,
      moduleNeedsCount,
      admissionDiagnostics,
      createReadinessDecision,
    };
  }

  if (!canContinue) {
    console.log(`  ⚠️  FinalBlueprint ${describeBlueprintStatus(status)}`);
    console.log(`     ID: ${finalBlueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${finalBlueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    return { blueprint, finalBlueprint, status, issues, moduleNeedsCount, admissionDiagnostics, createReadinessDecision };
  }

  if (!result.success) {
    console.log(`  ⚠️  Continuing with reviewable FinalBlueprint (${describeBlueprintStatus(status)})`);
    console.log(`     ID: ${finalBlueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${finalBlueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
  }

  console.log("  ✅ FinalBlueprint created");
  console.log(`     ID: ${finalBlueprint.id}`);
  console.log(`     Status: ${status}`);
  console.log(`     Modules: ${finalBlueprint.modules.length}`);
  console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
  if (admissionDiagnostics && admissionDiagnostics.verdict !== "not_applicable") {
    console.log(`     Selection Pool Admission: ${admissionDiagnostics.verdict}`);
  }
  const backboneModules = finalBlueprint.modules.filter((module) => module.planningKind === "backbone");
  if (backboneModules.length > 0) {
    console.log(`     Gameplay Backbones: ${backboneModules.length}`);
    for (const module of backboneModules) {
      const facetCount = (finalBlueprint.moduleFacets || []).filter((facet) => facet.backboneModuleId === module.id).length;
      console.log(`       - ${module.id}: ${module.role} | facets=${facetCount}`);
    }
  }
  console.log(`     Pattern Hints: ${finalBlueprint.patternHints.length}`);

  if (issues.length > 0) {
    console.log("  ℹ️  Blueprint notes:");
    for (const issue of issues) {
      console.log(`     - ${issue}`);
    }
  }

  return { blueprint, finalBlueprint, status, issues, moduleNeedsCount, admissionDiagnostics, createReadinessDecision };
}

export function buildUpdateBlueprint(
  updateIntent: UpdateIntent,
  clarificationAuthority?: WizardClarificationAuthority,
): Dota2BlueprintBuildResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const builder = new BlueprintBuilder();
  const result = builder.buildUpdate(updateIntent);
  const baseBlueprint = result.draftBlueprint || result.blueprint || null;
  const baseFinalBlueprint = result.finalBlueprint || null;
  const baseStatus = baseFinalBlueprint?.status || getUpdateIntentSemanticPosture(updateIntent);
  const enrichedBlueprint = baseBlueprint
    ? enrichDota2UpdateBlueprint(baseBlueprint, updateIntent)
    : { blueprint: null, status: baseStatus, issues: [] };
  const enrichedFinalBlueprint = baseFinalBlueprint
    ? enrichDota2UpdateBlueprint(baseFinalBlueprint, updateIntent)
    : { blueprint: null, status: baseStatus, issues: [] };
  const stagedBlueprint = applyWriteBlockingClarificationWeakness(
    enrichedBlueprint.blueprint,
    clarificationAuthority,
  );
  const stagedFinalBlueprint = applyWriteBlockingClarificationWeakness(
    enrichedFinalBlueprint.blueprint,
    clarificationAuthority,
  );
  const blueprint = stagedBlueprint.blueprint;
  const finalBlueprint = stagedFinalBlueprint.blueprint;
  const status = finalBlueprint?.status || enrichedFinalBlueprint.status || baseStatus;
  const issues = [
    ...new Set([
      ...result.issues.map((issue) => `${issue.code}: ${issue.message}`),
      ...enrichedBlueprint.issues,
      ...enrichedFinalBlueprint.issues,
      ...stagedBlueprint.issues,
      ...stagedFinalBlueprint.issues,
    ]),
  ];
  const moduleNeedsCount = countModuleNeeds(finalBlueprint || blueprint);
  const canContinue = finalBlueprint?.commitDecision?.canAssemble ?? result.success;

  if (!finalBlueprint) {
    console.log("  ❌ Update Blueprint build failed");
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    for (const issue of issues) {
      console.log(`     - ${issue}`);
    }
    return {
      blueprint,
      finalBlueprint: null,
      status: baseBlueprint ? status : "error",
      issues,
      moduleNeedsCount,
    };
  }

  if (!canContinue) {
    console.log(`  ⚠️  FinalBlueprint ${describeBlueprintStatus(status)}`);
    console.log(`     ID: ${finalBlueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${finalBlueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    return { blueprint, finalBlueprint, status, issues, moduleNeedsCount };
  }

  if (!result.success) {
    console.log(`  ⚠️  Continuing with reviewable FinalBlueprint (${describeBlueprintStatus(status)})`);
    console.log(`     ID: ${finalBlueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${finalBlueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
  }

  console.log("  ✅ FinalBlueprint created");
  console.log(`     ID: ${finalBlueprint.id}`);
  console.log(`     Status: ${status}`);
  console.log(`     Modules: ${finalBlueprint.modules.length}`);
  console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
  const backboneModules = finalBlueprint.modules.filter((module) => module.planningKind === "backbone");
  if (backboneModules.length > 0) {
    console.log(`     Gameplay Backbones: ${backboneModules.length}`);
    for (const module of backboneModules) {
      const facetCount = (finalBlueprint.moduleFacets || []).filter((facet) => facet.backboneModuleId === module.id).length;
      console.log(`       - ${module.id}: ${module.role} | facets=${facetCount}`);
    }
  }
  console.log(`     Pattern Hints: ${finalBlueprint.patternHints.length}`);

  if (issues.length > 0) {
    console.log("  ℹ️  Blueprint notes:");
    for (const issue of issues) {
      console.log(`     - ${issue}`);
    }
  }

  return { blueprint, finalBlueprint, status, issues, moduleNeedsCount };
}

export function resolvePatternsFromBlueprint(blueprint: Blueprint): PatternResolutionResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 3: Pattern Resolution");
  console.log("=".repeat(70));

  const result = resolvePatterns(blueprint);

  console.log(`  Patterns resolved: ${result.patterns.length}`);
  for (const pattern of result.patterns) {
    console.log(`    ✅ ${pattern.patternId}`);
  }

  if (result.unresolved.length > 0) {
    console.log(`  Unresolved patterns: ${result.unresolved.length}`);
    for (const unresolved of result.unresolved) {
      console.log(`    ⚠️  ${unresolved.requestedId}`);
    }
  }

  console.log(`  Complete: ${result.complete}`);
  return result;
}

export async function buildAssemblyPlan(
  blueprint: Blueprint,
  resolutionResult: PatternResolutionResult,
  hostRoot: string,
  stableFeatureId?: string,
): Promise<{ plan: AssemblyPlan | null; blockers: string[] }> {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: AssemblyPlan");
  console.log("=".repeat(70));

  const usesArtifactSynthesis = shouldUseArtifactSynthesis(blueprint, resolutionResult);
  let templatedPlan: AssemblyPlan | null = null;

  if (resolutionResult.patterns.length > 0) {
    const config: AssemblyPlanConfig = {
      allowFallback: true,
      allowUnresolved: usesArtifactSynthesis,
      hostRoot,
    };
    const builder = new AssemblyPlanBuilder(config);

    try {
      templatedPlan = builder.build(blueprint, resolutionResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!usesArtifactSynthesis) {
        console.log(`  ❌ AssemblyPlan build failed: ${message}`);
        return { plan: null, blockers: [message] };
      }
      console.log(`  ⚠️  Templated assembly partial build failed, continuing into synthesis: ${message}`);
    }
  }

  if (usesArtifactSynthesis) {
    const { plan, synthesis } = await buildSynthesizedAssemblyPlanWithLLM(
      blueprint,
      stableFeatureId || blueprint.id,
      resolutionResult,
      templatedPlan || undefined,
    );
    console.log(
      templatedPlan
        ? "  ✅ AssemblyPlan created via templated reuse + ArtifactSynthesis"
        : "  ✅ AssemblyPlan created via ArtifactSynthesis",
    );
    console.log(`     Blueprint ID: ${plan.blueprintId}`);
    console.log(`     Strategy: ${blueprint.implementationStrategy || blueprint.designDraft?.chosenImplementationStrategy}`);
    if (templatedPlan) {
      console.log(`     Selected Patterns: ${plan.selectedPatterns.length}`);
    }
    console.log(`     Synthesized Artifacts: ${synthesis.artifacts.length}`);
    console.log(`     Remaining Unresolved Modules: ${plan.unresolvedModuleNeeds?.length || 0}`);
    console.log(`     Ready for Host Write: ${plan.readyForHostWrite}`);
    return { plan, blockers: plan.hostWriteReadiness?.blockers || synthesis.blockers };
  }

  if (templatedPlan) {
    console.log("  ✅ AssemblyPlan created");
    console.log(`     Blueprint ID: ${templatedPlan.blueprintId}`);
    console.log(`     Selected Patterns: ${templatedPlan.selectedPatterns.length}`);
    console.log(`     Ready for Host Write: ${templatedPlan.readyForHostWrite}`);

    const blockers = templatedPlan.hostWriteReadiness?.blockers || [];
    return { plan: templatedPlan, blockers };
  }

  const fallbackBlocker =
    resolutionResult.unresolvedModuleNeeds.length > 0
      ? resolutionResult.unresolvedModuleNeeds.map((need) => need.reason)
      : ["No assembly-capable reusable modules or synthesize-capable unresolved needs were produced."];
  console.log("  ❌ AssemblyPlan build failed");
  for (const blocker of fallbackBlocker) {
    console.log(`     - ${blocker}`);
  }
  return { plan: null, blockers: fallbackBlocker };
}

export function createWritePlan(
  assemblyPlan: AssemblyPlan,
  hostRoot: string,
  existingFeature?: RuneWeaverFeatureRecord | null,
  mode: FeatureMode = "create",
  hostRealizationPlan?: HostRealizationPlan,
  generatorRoutingPlan?: GeneratorRoutingPlan,
  stableFeatureId?: string,
): { writePlan: WritePlan | null; issues: string[] } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Generator");
  console.log("=".repeat(70));

  try {
    const writePlan = assemblerCreateWritePlan(
      assemblyPlan,
      hostRoot,
      existingFeature?.featureId || stableFeatureId,
      generatorRoutingPlan ?? undefined,
      hostRealizationPlan ?? undefined,
    );

    refreshWeightedPoolWritePlan(writePlan, {
      hostRoot,
      existingFeature: existingFeature || null,
    });

    if (existingFeature) {
      const alignment = alignWritePlanWithExistingFeature(writePlan, existingFeature, mode);
      if (!alignment.ok) {
        return { writePlan: null, issues: alignment.issues };
      }
    }

    recalculateWritePlanStats(writePlan);

    console.log("  ✅ WritePlan created");
    console.log(`     ID: ${writePlan.id}`);
    console.log(`     Entries: ${writePlan.entries.length}`);

    if (writePlan.stats.deferred > 0) {
      console.log(`     ⚠️  Deferred entries: ${writePlan.stats.deferred} (see deferred warnings)`);
    }

    const familyHints = writePlan.entries.reduce((acc: Record<string, number>, entry: WritePlanEntry) => {
      if (entry.generatorFamilyHint) {
        acc[entry.generatorFamilyHint] = (acc[entry.generatorFamilyHint] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    if (Object.keys(familyHints).length > 0) {
      console.log(`     Generator hints: ${Object.entries(familyHints).map(([key, value]) => `${key}:${value}`).join(", ")}`);
    }

    if (writePlan.deferredWarnings && writePlan.deferredWarnings.length > 0) {
      console.log("     Deferred warnings:");
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

function hasAdmittedSelectionPoolFamily(
  verdict?: SelectionPoolAdmissionDiagnostics["verdict"],
): boolean {
  return verdict === "admitted_explicit" || verdict === "admitted_compressed";
}

function filterSupersededBlueprintIssues(
  issues: string[],
  admissionDiagnostics?: SelectionPoolAdmissionDiagnostics,
): string[] {
  if (!hasAdmittedSelectionPoolFamily(admissionDiagnostics?.verdict)) {
    return issues;
  }

  return issues.filter((issue) => !issue.startsWith("FINAL_BLUEPRINT_"));
}

function applyWriteBlockingClarificationWeakness(
  blueprint: Blueprint | null,
  clarificationAuthority?: WizardClarificationAuthority,
): { blueprint: Blueprint | null; issues: string[] } {
  if (
    !blueprint
    || !clarificationAuthority
    || clarificationAuthority.blocksBlueprint
    || !clarificationAuthority.blocksWrite
  ) {
    return { blueprint, issues: [] };
  }

  const unresolvedDependencies = clarificationAuthority.unresolvedDependencies.filter(
    (dependency) =>
      dependency.kind === "cross-feature-target"
      || dependency.kind === "existing-feature-target",
  );
  if (unresolvedDependencies.length === 0) {
    return { blueprint, issues: [] };
  }

  const note =
    "Cross-feature planning can continue, but host write remains blocked until the target feature/provider surface is resolved.";
  const reasons = [
    ...(blueprint.commitDecision?.reasons || []),
    ...unresolvedDependencies.map((dependency) => dependency.summary),
    note,
  ];

  return {
    blueprint: {
      ...blueprint,
      status: blueprint.status === "blocked" ? "blocked" : "weak",
      commitDecision: blueprint.commitDecision
        ? {
            ...blueprint.commitDecision,
            outcome: blueprint.commitDecision.outcome === "blocked" ? "blocked" : "exploratory",
            canAssemble: blueprint.commitDecision.outcome === "blocked"
              ? blueprint.commitDecision.canAssemble
              : true,
            canWriteHost: false,
            requiresReview: true,
            reasons: [...new Set(reasons)],
          }
        : undefined,
      validationStatus: blueprint.validationStatus
        ? {
            ...blueprint.validationStatus,
            status: blueprint.validationStatus.status === "failed" ? "failed" : "needs_review",
            warnings: [...new Set([...(blueprint.validationStatus.warnings || []), note])],
          }
        : undefined,
    },
    issues: [
      note,
      ...unresolvedDependencies.map(
        (dependency) => `Unresolved cross-feature dependency: ${dependency.summary}`,
      ),
    ],
  };
}

function recalculateWritePlanStats(writePlan: WritePlan): void {
  writePlan.stats = {
    total: writePlan.entries.length,
    create: writePlan.entries.filter((entry) => entry.operation === "create").length,
    update: writePlan.entries.filter((entry) => entry.operation === "update").length,
    conflicts: writePlan.entries.filter(
      (entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0)
    ).length,
    deferred: writePlan.entries.filter((entry) => entry.deferred).length,
  };
}

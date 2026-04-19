import {
  IntentSchema,
  Blueprint,
  AssemblyPlan,
  HostRealizationPlan,
  GeneratorRoutingPlan,
  IntentReadiness,
  CurrentFeatureContext,
  RelationCandidate,
  PromptConstraintBundle,
  RetrievalBundle,
  UpdateIntent,
  WizardClarificationPlan,
  WorkspaceSemanticContext,
} from "../../../core/schema/types.js";
import { BlueprintBuilder } from "../../../core/blueprint/builder.js";
import { resolvePatterns, PatternResolutionResult } from "../../../core/patterns/resolver.js";
import { AssemblyPlanBuilder, AssemblyPlanConfig } from "../../../core/pipeline/assembly-plan.js";
import { createLLMClientFromEnv, isLLMConfigured, readLLMExecutionConfig } from "../../../core/llm/factory.js";
import {
  buildWizardClarificationPlan,
  buildCurrentFeatureContext,
  createFallbackIntentSchema as createGenericFallbackIntentSchema,
  createUpdateIntentFromRequestedChange,
  extractNumericParameters,
  resolveRelationCandidates,
} from "../../../core/wizard/index.js";
import { enrichDota2CreateBlueprint, enrichDota2UpdateBlueprint } from "../../../adapters/dota2/blueprint/index.js";
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
  usedFallback: boolean;
  clarificationPlan?: WizardClarificationPlan;
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
  relationCandidates?: RelationCandidate[];
  workspaceSemanticContext?: WorkspaceSemanticContext;
  promptPackageId?: string;
  promptConstraints?: PromptConstraintBundle;
  retrievalBundle?: RetrievalBundle;
  requiresClarification: boolean;
}

function inferFallbackInventoryContract(prompt: string): {
  enabled: boolean;
  capacity: number;
  storeSelectedItems: boolean;
  blockDrawWhenFull: boolean;
  fullMessage: string;
  presentation: "persistent_panel";
} | undefined {
  const lowerPrompt = prompt.toLowerCase();
  const mentionsInventory = hasAnyKeyword(lowerPrompt, [
    "inventory",
    "panel",
    "仓库",
    "库存",
    "背包",
    "格",
  ]);

  if (!mentionsInventory) {
    return undefined;
  }

  const capacityMatch =
    prompt.match(/(\d+)\s*(?:slot|slots|格)/i) ||
    prompt.match(/(?:capacity|容量)\s*(?:to|为|=)?\s*(\d+)/i);
  const messageMatch =
    prompt.match(/["“](.+?)["”]/) ||
    prompt.match(/显示\s*[:：]\s*(.+)$/i);

  return {
    enabled: true,
    capacity: Math.max(1, parseInt(capacityMatch?.[1] || "15", 10)),
    storeSelectedItems: true,
    blockDrawWhenFull: true,
    fullMessage: (messageMatch?.[1] || "Inventory full").trim(),
    presentation: "persistent_panel",
  };
}

export interface Dota2BlueprintBuildResult {
  blueprint: Blueprint | null;
  status: IntentReadiness | "error";
  issues: string[];
  moduleNeedsCount: number;
}

export interface Dota2BlueprintBuildContext {
  prompt: string;
  hostRoot: string;
  mode?: FeatureMode;
  featureId?: string;
  existingFeature?: RuneWeaverFeatureRecord | null;
  proposalSource?: "llm" | "fallback";
}

function getIntentSemanticPosture(schema: Pick<IntentSchema, "uncertainties">): "ready" | "weak" {
  return (schema.uncertainties?.length || 0) > 0 ? "weak" : "ready";
}

function resolveClarificationState(
  prompt: string,
  schema: IntentSchema,
  hostRoot: string,
  currentFeatureContext?: CurrentFeatureContext,
): {
  clarificationPlan?: WizardClarificationPlan;
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
    currentFeatureContext,
    workspaceSemanticContext,
    relationCandidates,
  });

  return {
    ...(clarificationPlan ? { clarificationPlan } : {}),
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
    const clarificationState = resolveClarificationState(prompt, schema, hostRoot);
    console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
    console.log(`     Goal: ${schema.request.goal}`);
    console.log(`     Intent Kind: ${schema.classification.intentKind}`);
    console.log(`     Semantic Posture: ${getIntentSemanticPosture(schema)}`);
    console.log(`     Uncertainties: ${schema.uncertainties?.length || 0}`);
    console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);
    return {
      schema,
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
          const baseParams = extractNumericParameters(prompt);
          const normalizedMechanics = applyMechanicHints(
            {
              trigger: false,
              candidatePool: false,
              weightedSelection: false,
              playerChoice: false,
              uiModal: false,
              outcomeApplication: false,
              resourceConsumption: false,
              ...(result.schema.normalizedMechanics || {}),
            },
            baseParams
          );
          let schema = {
            ...result.schema,
            host: {
              kind: "dota2-x-template" as const,
              projectRoot: hostRoot,
            },
            normalizedMechanics,
          };

          if (Object.keys(baseParams).length > 0) {
            (schema as any).parameters = baseParams;
          }

          console.log("  ✅ IntentSchema created via LLM Wizard");
          console.log(`     Goal: ${schema.request.goal}`);
          console.log(`     Intent Kind: ${schema.classification.intentKind}`);
          console.log(`     Semantic Posture: ${getIntentSemanticPosture(schema)}`);
          console.log(`     Uncertainties: ${schema.uncertainties?.length || 0}`);
          console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

          return {
            schema,
            usedFallback: result.usedFallback,
            clarificationPlan: result.clarificationPlan,
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
  const clarificationState = resolveClarificationState(prompt, schema, hostRoot);
  console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
  console.log(`     Goal: ${schema.request.goal}`);
  console.log(`     Intent Kind: ${schema.classification.intentKind}`);
  console.log(`     Semantic Posture: ${getIntentSemanticPosture(schema)}`);
  console.log(`     Uncertainties: ${schema.uncertainties?.length || 0}`);
  console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

  return {
    schema,
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
  return createGenericFallbackIntentSchema(prompt, {
    kind: "dota2-x-template",
    projectRoot: hostRoot,
  });
}

function hasAnyKeyword(input: string, keywords: string[]): boolean {
  return keywords.some((keyword) => input.includes(keyword));
}

function createFallbackTypedRequirements(
  mechanics: IntentSchema["normalizedMechanics"],
  flags: {
    hasCandidatePoolLanguage: boolean;
    hasBridgeSyncLanguage: boolean;
    hasStatusDisplayLanguage: boolean;
    inventoryEnabled: boolean;
  }
): IntentSchema["requirements"]["typed"] | undefined {
  const typed: NonNullable<IntentSchema["requirements"]["typed"]> = [];

  if (mechanics.trigger) {
    typed.push({
      id: "fallback-trigger",
      kind: "trigger",
      summary: "Capture the configured player input and open the supported flow",
      priority: "must",
    });
  }

  if (mechanics.candidatePool || flags.hasCandidatePoolLanguage) {
    typed.push({
      id: "fallback-candidate-pool",
      kind: "state",
      summary: flags.inventoryEnabled
        ? "Maintain a candidate pool, current selection state, and session-only selected inventory for the player-facing choice flow"
        : "Maintain a candidate pool and current selection state for the player-facing choice flow",
      invariants: ["candidate choices must remain distinct within the active selection set"],
      priority: "must",
    });
  }

  if (mechanics.playerChoice) {
    typed.push({
      id: "fallback-selection-flow",
      kind: "rule",
      summary: "Resolve a player-confirmed selection from the active candidate set",
      priority: "must",
    });
  }

  if (mechanics.outcomeApplication) {
    typed.push({
      id: "fallback-effect-application",
      kind: "effect",
      summary: "Apply the selected outcome to the active player state immediately after selection",
      priority: "must",
    });
  }

  if (mechanics.uiModal || flags.hasStatusDisplayLanguage) {
    typed.push({
      id: "fallback-ui-surface",
      kind: "ui",
      summary: flags.inventoryEnabled
        ? "Render the current choice surface and the persistent session-only inventory panel"
        : "Render the current choice surface and any active selection status display",
      priority: "must",
    });
  }

  if (flags.hasBridgeSyncLanguage) {
    typed.push({
      id: "fallback-integration-bridge",
      kind: "integration",
      summary: "Synchronize supported runtime state across runtime and UI surfaces",
      priority: "must",
    });
  }

  return typed.length > 0 ? typed : undefined;
}

function createFallbackSelection(
  mechanics: IntentSchema["normalizedMechanics"],
  flags: {
    hasCandidatePoolLanguage: boolean;
    hasPersistentSelectionLanguage: boolean;
    inventory?: {
      enabled: boolean;
      capacity: number;
      storeSelectedItems: boolean;
      blockDrawWhenFull: boolean;
      fullMessage: string;
      presentation: "persistent_panel";
    };
  }
): IntentSchema["selection"] | undefined {
  if (!mechanics.playerChoice && !flags.hasCandidatePoolLanguage) {
    return undefined;
  }

  return {
    mode: "user-chosen",
    cardinality: "single",
    repeatability: flags.hasPersistentSelectionLanguage ? "repeatable" : "one-shot",
    duplicatePolicy: flags.hasCandidatePoolLanguage ? "avoid" : undefined,
    ...(flags.inventory ? { inventory: flags.inventory } : {}),
  };
}

function createFallbackEffects(
  mechanics: IntentSchema["normalizedMechanics"],
  hasPersistentSelectionLanguage: boolean
): IntentSchema["effects"] | undefined {
  if (!mechanics.outcomeApplication) {
    return undefined;
  }

  return {
    operations: ["apply"],
    durationSemantics: hasPersistentSelectionLanguage ? "persistent" : "instant",
  };
}

function createFallbackIntegrations(
  mechanics: IntentSchema["normalizedMechanics"],
  flags: {
    hasBridgeSyncLanguage: boolean;
    uiNeeded: boolean;
  }
): IntentSchema["integrations"] | undefined {
  if (!flags.hasBridgeSyncLanguage) {
    return undefined;
  }

  const expectedBindings: NonNullable<NonNullable<IntentSchema["integrations"]>["expectedBindings"]> = [];

  if (mechanics.trigger) {
    expectedBindings.push({
      id: "fallback-input-binding",
      kind: "entry-point",
      summary: "Authoritative input binding for the supported trigger flow",
      required: true,
    });
  }

  expectedBindings.push({
    id: "fallback-state-sync",
    kind: "bridge-point",
    summary: "Synchronize the current supported selection state between runtime and UI",
    required: true,
  });

  if (flags.uiNeeded) {
    expectedBindings.push({
      id: "fallback-selection-surface",
      kind: "ui-surface",
      summary: "Selection UI surface for the active choice flow",
      required: true,
    });
  }

  return expectedBindings.length > 0 ? { expectedBindings } : undefined;
}

function createFallbackStateModel(
  mechanics: IntentSchema["normalizedMechanics"],
  flags: {
    hasCandidatePoolLanguage: boolean;
    hasPersistentSelectionLanguage: boolean;
    uiNeeded: boolean;
    hasBridgeSyncLanguage: boolean;
    inventoryEnabled: boolean;
  }
): IntentSchema["stateModel"] | undefined {
  const states: NonNullable<NonNullable<IntentSchema["stateModel"]>["states"]> = [];

  if (mechanics.candidatePool || flags.hasCandidatePoolLanguage) {
    states.push({
      id: "candidate-pool",
      summary: "Current candidate selection pool for the active choice flow",
      owner: "session",
      lifetime: "ephemeral",
      mutationMode: "create",
    });
  }

  if (mechanics.outcomeApplication || flags.hasPersistentSelectionLanguage || flags.hasBridgeSyncLanguage) {
    states.push({
      id: "active-selection",
      summary: "Currently active selection state that must remain visible and synchronized",
      owner: "session",
      lifetime: flags.hasPersistentSelectionLanguage ? "persistent" : "session",
      mutationMode: "update",
    });
  }

  if (flags.inventoryEnabled) {
    states.push({
      id: "selected-inventory",
      summary: "Session-only stored selections shown in the persistent inventory panel",
      owner: "session",
      lifetime: "session",
      mutationMode: "update",
    });
  }

  if (flags.uiNeeded && flags.hasBridgeSyncLanguage) {
    states.push({
      id: "ui-surface-state",
      summary: "UI-visible selection status mirrored from runtime state",
      owner: "session",
      lifetime: "ephemeral",
      mutationMode: "update",
    });
  }

  return states.length > 0 ? { states } : undefined;
}

function applyMechanicHints(
  mechanics: IntentSchema["normalizedMechanics"],
  extractedParams: Record<string, unknown>
): IntentSchema["normalizedMechanics"] {
  const hasCanonicalSelectionPool = Array.isArray(extractedParams.entries) && extractedParams.entries.length > 0;
  const hasEffectApplication =
    typeof extractedParams.effectApplication === "object" &&
    extractedParams.effectApplication !== null;

  return {
    ...mechanics,
    trigger: mechanics.trigger || typeof extractedParams.triggerKey === "string",
    candidatePool: mechanics.candidatePool || hasCanonicalSelectionPool,
    weightedSelection:
      mechanics.weightedSelection ||
      typeof extractedParams.drawMode === "string" ||
      typeof extractedParams.duplicatePolicy === "string",
    playerChoice:
      mechanics.playerChoice ||
      typeof extractedParams.selectionPolicy === "string" ||
      typeof extractedParams.choiceCount === "number",
    uiModal:
      mechanics.uiModal ||
      typeof extractedParams.payloadShape === "string" ||
      typeof extractedParams.minDisplayCount === "number",
    outcomeApplication: mechanics.outcomeApplication || hasEffectApplication,
  };
}

export function buildBlueprint(
  schema: IntentSchema,
  context: Dota2BlueprintBuildContext,
): Dota2BlueprintBuildResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const builder = new BlueprintBuilder();
  const result = builder.build(schema);
  const baseBlueprint = result.finalBlueprint || result.blueprint || null;
  const baseStatus = result.finalBlueprint?.status || getIntentSemanticPosture(schema);
  const baseIssues = result.issues.map((issue) => `${issue.code}: ${issue.message}`);
  const enriched = baseBlueprint
    ? enrichDota2CreateBlueprint(baseBlueprint, {
        schema,
        prompt: context.prompt,
        hostRoot: context.hostRoot,
        mode: context.mode,
        featureId: context.featureId,
        existingFeature: context.existingFeature,
        proposalSource: context.proposalSource,
      })
    : { blueprint: null, status: baseStatus, issues: [] };
  const blueprint = enriched.blueprint;
  const status = enriched.blueprint ? enriched.status : enriched.status;
  const issues = [...baseIssues, ...enriched.issues];
  const moduleNeedsCount = countModuleNeeds(blueprint);
  const canContinue = blueprint?.commitDecision?.canAssemble ?? result.success;

  if (!blueprint) {
    console.log("  ❌ Blueprint build failed");
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    for (const issue of enriched.issues) {
      console.log(`     - ${issue}`);
    }
    return { blueprint: null, status: baseBlueprint ? enriched.status : "error", issues, moduleNeedsCount };
  }

  if (!canContinue) {
    console.log(`  ⚠️  FinalBlueprint ${describeBlueprintStatus(status)}`);
    console.log(`     ID: ${blueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${blueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    return { blueprint: null, status, issues, moduleNeedsCount };
  }

  if (!result.success) {
    console.log(`  ⚠️  Continuing with reviewable FinalBlueprint (${describeBlueprintStatus(status)})`);
    console.log(`     ID: ${blueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${blueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
  }

  console.log("  ✅ FinalBlueprint created");
  console.log(`     ID: ${blueprint.id}`);
  console.log(`     Status: ${status}`);
  console.log(`     Modules: ${blueprint.modules.length}`);
  console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
  console.log(`     Pattern Hints: ${blueprint.patternHints.length}`);

  if (issues.length > 0) {
    console.log("  ℹ️  Blueprint notes:");
    for (const issue of issues) {
      console.log(`     - ${issue}`);
    }
  }

  return { blueprint, status, issues, moduleNeedsCount };
}

export function buildUpdateBlueprint(
  updateIntent: UpdateIntent,
): Dota2BlueprintBuildResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const builder = new BlueprintBuilder();
  const result = builder.buildUpdate(updateIntent);
  const baseBlueprint = result.finalBlueprint || result.blueprint || null;
  const enriched = baseBlueprint
    ? enrichDota2UpdateBlueprint(baseBlueprint, updateIntent)
    : { blueprint: null, status: result.finalBlueprint?.status || getIntentSemanticPosture(updateIntent.requestedChange), issues: [] };
  const blueprint = enriched.blueprint;
  const status = enriched.status || result.finalBlueprint?.status || getIntentSemanticPosture(updateIntent.requestedChange);
  const issues = [
    ...result.issues.map((issue) => `${issue.code}: ${issue.message}`),
    ...enriched.issues,
  ];
  const moduleNeedsCount = countModuleNeeds(blueprint);
  const canContinue = blueprint?.commitDecision?.canAssemble ?? result.success;

  if (!blueprint) {
    console.log("  ❌ Update Blueprint build failed");
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    for (const issue of enriched.issues) {
      console.log(`     - ${issue}`);
    }
    return { blueprint: null, status: baseBlueprint ? enriched.status : "error", issues, moduleNeedsCount };
  }

  if (!canContinue) {
    console.log(`  ⚠️  FinalBlueprint ${describeBlueprintStatus(status)}`);
    console.log(`     ID: ${blueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${blueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    return { blueprint: null, status, issues, moduleNeedsCount };
  }

  if (!result.success) {
    console.log(`  ⚠️  Continuing with reviewable FinalBlueprint (${describeBlueprintStatus(status)})`);
    console.log(`     ID: ${blueprint.id}`);
    console.log(`     Status: ${status}`);
    console.log(`     Modules: ${blueprint.modules.length}`);
    console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
  }

  console.log("  ✅ FinalBlueprint created");
  console.log(`     ID: ${blueprint.id}`);
  console.log(`     Status: ${status}`);
  console.log(`     Modules: ${blueprint.modules.length}`);
  console.log(`     ModuleNeeds: ${moduleNeedsCount}`);
  console.log(`     Pattern Hints: ${blueprint.patternHints.length}`);

  if (issues.length > 0) {
    console.log("  ℹ️  Blueprint notes:");
    for (const issue of issues) {
      console.log(`     - ${issue}`);
    }
  }

  return { blueprint, status, issues, moduleNeedsCount };
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

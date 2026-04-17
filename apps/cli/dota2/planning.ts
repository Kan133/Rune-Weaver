import { IntentSchema, Blueprint, AssemblyPlan, HostRealizationPlan, GeneratorRoutingPlan, IntentReadiness } from "../../../core/schema/types.js";
import { BlueprintBuilder } from "../../../core/blueprint/builder.js";
import { resolvePatterns, PatternResolutionResult } from "../../../core/patterns/resolver.js";
import { AssemblyPlanBuilder, AssemblyPlanConfig } from "../../../core/pipeline/assembly-plan.js";
import { createLLMClientFromEnv, isLLMConfigured, readLLMExecutionConfig } from "../../../core/llm/factory.js";
import { runWizardToIntentSchema, extractNumericParameters } from "../../../core/wizard/index.js";
import {
  applySelectionPoolIntentContract,
  resolveSelectionPoolFamily,
} from "../../../adapters/dota2/families/selection-pool/index.js";
import {
  initializeWorkspace,
  findFeatureById,
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
} from "../../../core/workspace/index.js";
import { createWritePlan as assemblerCreateWritePlan, WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import { alignWritePlanWithExistingFeature } from "../helpers/index.js";

export type FeatureMode = "create" | "update" | "regenerate";

export interface CreateIntentSchemaContext {
  mode?: FeatureMode;
  featureId?: string;
  existingFeature?: RuneWeaverFeatureRecord | null;
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function hasSelectionPoolInventoryParameters(value: unknown): value is {
  enabled: boolean;
  capacity: number;
  storeSelectedItems: boolean;
  blockDrawWhenFull: boolean;
  fullMessage: string;
  presentation: "persistent_panel";
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).enabled === true &&
      typeof (value as Record<string, unknown>).capacity === "number" &&
      typeof (value as Record<string, unknown>).fullMessage === "string" &&
      (value as Record<string, unknown>).presentation === "persistent_panel",
  );
}

export interface Dota2BlueprintBuildResult {
  blueprint: Blueprint | null;
  status: IntentReadiness | "error";
  issues: string[];
  moduleNeedsCount: number;
}

function getIntentReadiness(schema: Pick<IntentSchema, "readiness" | "isReadyForBlueprint">): IntentReadiness {
  if (schema.readiness) {
    return schema.readiness;
  }
  return schema.isReadyForBlueprint ? "ready" : "blocked";
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
): Promise<{ schema: IntentSchema | null; usedFallback: boolean }> {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: IntentSchema");
  console.log("=".repeat(70));

  if (!isLLMConfigured(process.cwd())) {
    console.log("  ⚠️  LLM not configured, using fallback");
    const schema = createFallbackIntentSchema(prompt, hostRoot, context);
    console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
    console.log(`     Goal: ${schema.request.goal}`);
    console.log(`     Intent Kind: ${schema.classification.intentKind}`);
    console.log(`     Readiness: ${getIntentReadiness(schema)}`);
    console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);
    return { schema, usedFallback: true };
  }

  try {
    const client = createLLMClientFromEnv(process.cwd());
    const llmConfig = readLLMExecutionConfig(process.cwd(), "dota2-planning");
    // Give transient provider/schema noise a couple more chances before fallback
    // so the admitted supported family does not collapse after a single bad sample.
    for (let attempt = 1; attempt <= INTENT_SCHEMA_MAX_LLM_ATTEMPTS; attempt++) {
      try {
        const result = await runWizardToIntentSchema({
          client,
          input: {
            rawText: prompt,
            temperature: llmConfig.temperature,
            model: llmConfig.model,
            providerOptions: llmConfig.providerOptions,
          },
        });

        if (result.valid && result.schema) {
          const baseParams = extractNumericParameters(prompt);
          const selectionPoolResolution = resolveSelectionPoolFamily({
            prompt,
            hostRoot,
            mode: context.mode || "create",
            featureId: context.featureId,
            existingFeature: context.existingFeature || null,
            proposalSource: "llm",
          });
          const extractedParams = {
            ...baseParams,
            ...(selectionPoolResolution.scalarParameters || {}),
          };
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
            extractedParams
          );
          let schema = {
            ...result.schema,
            host: {
              kind: "dota2-x-template" as const,
              projectRoot: hostRoot,
            },
            normalizedMechanics,
          };

          if (Object.keys(extractedParams).length > 0) {
            (schema as any).parameters = extractedParams;
          }

          schema = applySelectionPoolIntentContract(schema, selectionPoolResolution);

          console.log("  ✅ IntentSchema created via LLM Wizard");
          console.log(`     Goal: ${schema.request.goal}`);
          console.log(`     Intent Kind: ${schema.classification.intentKind}`);
          console.log(`     Readiness: ${getIntentReadiness(schema)}`);
          console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

          return { schema, usedFallback: false };
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

  const schema = createFallbackIntentSchema(prompt, hostRoot, context);
  console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
  console.log(`     Goal: ${schema.request.goal}`);
  console.log(`     Intent Kind: ${schema.classification.intentKind}`);
  console.log(`     Readiness: ${getIntentReadiness(schema)}`);
  console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

  return { schema, usedFallback: true };
}

function createFallbackIntentSchema(
  prompt: string,
  hostRoot: string,
  context: CreateIntentSchemaContext = {},
): IntentSchema {
  const lowerPrompt = prompt.toLowerCase();
  const baseParams = extractNumericParameters(prompt);
  const selectionPoolResolution = resolveSelectionPoolFamily({
    prompt,
    hostRoot,
    mode: context.mode || "create",
    featureId: context.featureId,
    existingFeature: context.existingFeature || null,
    proposalSource: "fallback",
  });
  const extractedParams = {
    ...baseParams,
    ...(selectionPoolResolution.scalarParameters || {}),
  };
  const hasTriChoiceLanguage = hasAnyKeyword(lowerPrompt, [
    "三选一",
    "3选1",
    "三个候选",
    "3个候选",
    "3 个候选",
    "三个不重复",
    "3个不重复",
    "3 个不重复",
  ]);
  const hasCandidatePoolLanguage =
    hasTriChoiceLanguage || hasAnyKeyword(lowerPrompt, ["候选", "候选池", "不重复候选"]);
  const hasBridgeSyncLanguage = hasAnyKeyword(lowerPrompt, [
    "桥接",
    "事件桥接",
    "状态同步",
    "同步",
    "nettable",
    "net table",
    "custom event",
    "bridge",
    "sync",
  ]);
  const hasStatusDisplayLanguage = hasAnyKeyword(lowerPrompt, [
    "当前选择状态",
    "当前状态",
    "状态显示",
    "状态同步",
    "当前增益",
    "当前激活",
    "hud",
    "status",
  ]);
  const hasPersistentSelectionLanguage =
    hasStatusDisplayLanguage || hasAnyKeyword(lowerPrompt, ["保留", "当前选择", "持续", "active"]);

  let intentKind: "micro-feature" | "standalone-system" = "micro-feature";
  if (lowerPrompt.includes("系统") || hasAnyKeyword(lowerPrompt, ["天赋", "装备", "技能卡", "skill card", "equipment", "talent"])) {
    intentKind = "standalone-system";
  }

  const uiKeywords = ["ui", "界面", "显示", "modal", "窗口", "卡牌", "选择", "天赋", "装备", "技能卡"];
  const uiNeeded = uiKeywords.some((kw) => lowerPrompt.includes(kw));

  const normalizedMechanics = applyMechanicHints({
    trigger: lowerPrompt.includes("按") || lowerPrompt.includes("键") || lowerPrompt.includes("触发"),
    candidatePool: (lowerPrompt.includes("选择") && hasAnyKeyword(lowerPrompt, ["天赋", "装备", "技能卡"])) || hasCandidatePoolLanguage,
    weightedSelection: lowerPrompt.includes("权重") || lowerPrompt.includes("随机"),
    playerChoice: lowerPrompt.includes("选择") || hasTriChoiceLanguage,
    uiModal: hasAnyKeyword(lowerPrompt, ["天赋", "装备", "技能卡", "窗口", "modal", "卡牌"]) || hasTriChoiceLanguage || hasStatusDisplayLanguage,
    outcomeApplication:
      lowerPrompt.includes("冲刺") ||
      lowerPrompt.includes("效果") ||
      lowerPrompt.includes("应用") ||
      lowerPrompt.includes("生效") ||
      lowerPrompt.includes("属性"),
    resourceConsumption: lowerPrompt.includes("消耗") || lowerPrompt.includes("资源"),
  }, extractedParams);
  const requiredClarifications = createFallbackRequiredClarifications(lowerPrompt, normalizedMechanics);
  const readiness: IntentReadiness = (requiredClarifications ?? []).some((item) => item.blocksFinalization)
    ? "blocked"
    : "ready";

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
    readiness,
    requirements: {
      functional: [prompt],
      typed: createFallbackTypedRequirements(normalizedMechanics, {
        hasCandidatePoolLanguage,
        hasBridgeSyncLanguage,
        hasStatusDisplayLanguage,
        inventoryEnabled: hasSelectionPoolInventoryParameters(extractedParams.inventory),
      }),
      interactions: uiNeeded ? ["UI交互"] : [],
      outputs: [],
    },
    constraints: {
      hostConstraints: ["Dota2 x-template"],
    },
    selection: createFallbackSelection(normalizedMechanics, {
      hasCandidatePoolLanguage,
      hasPersistentSelectionLanguage,
      inventory: hasSelectionPoolInventoryParameters(extractedParams.inventory) ? extractedParams.inventory : undefined,
    }),
    effects: createFallbackEffects(normalizedMechanics, hasPersistentSelectionLanguage),
    integrations: createFallbackIntegrations(normalizedMechanics, {
      hasBridgeSyncLanguage,
      uiNeeded,
    }),
    stateModel: createFallbackStateModel(normalizedMechanics, {
      hasCandidatePoolLanguage,
      hasPersistentSelectionLanguage,
      uiNeeded,
      hasBridgeSyncLanguage,
      inventoryEnabled: hasSelectionPoolInventoryParameters(extractedParams.inventory),
    }),
    uiRequirements: {
      needed: uiNeeded,
      surfaces: uiNeeded ? ["selection_modal"] : [],
    },
    normalizedMechanics,
    requiredClarifications,
    openQuestions: [],
    resolvedAssumptions: [
      "Using fallback intent analysis",
      ...(hasBridgeSyncLanguage ? ["Fallback preserved bridge/state-sync semantics"] : []),
      ...(hasCandidatePoolLanguage ? ["Fallback preserved candidate-pool semantics"] : []),
    ],
    isReadyForBlueprint: readiness === "ready",
  };

  if (Object.keys(extractedParams).length > 0) {
    (schema as any).parameters = extractedParams;
  }

  return applySelectionPoolIntentContract(schema, selectionPoolResolution);
}

function createFallbackRequiredClarifications(
  lowerPrompt: string,
  mechanics: IntentSchema["normalizedMechanics"]
): NonNullable<IntentSchema["requiredClarifications"]> | undefined {
  const clarifications: NonNullable<IntentSchema["requiredClarifications"]> = [];

  const looksLikeBroadCombatGrowthAsk = hasAnyKeyword(lowerPrompt, [
    "战斗成长",
    "成长系统",
    "成长",
    "随机强化",
    "随机增益",
    "不断获得",
  ]);
  const reopensExistingSystemIntegration =
    lowerPrompt.includes("与已有系统联动") ||
    lowerPrompt.includes("和已有系统联动") ||
    lowerPrompt.includes("与现有系统联动") ||
    lowerPrompt.includes("已有系统联动");

  if (looksLikeBroadCombatGrowthAsk && !hasFallbackConcreteTriggerSemantics(lowerPrompt, mechanics)) {
    clarifications.push({
      id: "fallback-clarify-trigger-semantics",
      question: "战斗成长系统的具体触发机制是什么？例如击杀、时间、回合、升级、受击，还是明确的输入/事件触发？",
      blocksFinalization: true,
    });
  }

  if (reopensExistingSystemIntegration && !hasFallbackConcreteIntegrationTargetSemantics(lowerPrompt)) {
    clarifications.push({
      id: "fallback-clarify-integration-target",
      question: "该系统需要与哪些已有系统联动？请明确目标系统以及联动方式，而不是仅说明“与已有系统联动”。",
      blocksFinalization: true,
    });
  }

  return clarifications.length > 0 ? clarifications : undefined;
}

function hasFallbackConcreteTriggerSemantics(
  lowerPrompt: string,
  mechanics: IntentSchema["normalizedMechanics"]
): boolean {
  if (mechanics.trigger) {
    return true;
  }

  return hasAnyKeyword(lowerPrompt, [
    "击杀",
    "助攻",
    "升级",
    "回合",
    "波次",
    "定时",
    "定期",
    "每秒",
    "每隔",
    "时间",
    "造成伤害",
    "受到伤害",
    "进入战斗",
    "离开战斗",
    "拾取",
    "使用技能",
    "施法",
    "事件触发",
  ]);
}

function hasFallbackConcreteIntegrationTargetSemantics(lowerPrompt: string): boolean {
  return hasAnyKeyword(lowerPrompt, [
    "技能",
    "背包",
    "物品",
    "装备",
    "商店",
    "任务",
    "天赋",
    "属性面板",
    "击杀奖励",
    "经验",
    "金币",
    "buff",
    "modifier",
    "nettable",
    "net table",
    "custom event",
  ]);
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

export function buildBlueprint(schema: IntentSchema): Dota2BlueprintBuildResult {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const builder = new BlueprintBuilder();
  const result = builder.build(schema);
  const blueprint = result.finalBlueprint || result.blueprint || null;
  const status = result.finalBlueprint?.status || getIntentReadiness(schema);
  const issues = result.issues.map((issue) => `${issue.code}: ${issue.message}`);
  const moduleNeedsCount = countModuleNeeds(blueprint);

  if (!blueprint) {
    console.log("  ❌ Blueprint build failed");
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    return { blueprint: null, status: "error", issues, moduleNeedsCount };
  }

  if (!result.success) {
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

export function buildAssemblyPlan(
  blueprint: Blueprint,
  resolutionResult: PatternResolutionResult,
  hostRoot: string,
): { plan: AssemblyPlan | null; blockers: string[] } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 4: AssemblyPlan");
  console.log("=".repeat(70));

  const config: AssemblyPlanConfig = {
    allowFallback: true,
    allowUnresolved: false,
    hostRoot,
  };

  const builder = new AssemblyPlanBuilder(config);

  try {
    const plan = builder.build(blueprint, resolutionResult);

    console.log("  ✅ AssemblyPlan created");
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

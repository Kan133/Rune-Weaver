import { IntentSchema, Blueprint, AssemblyPlan, HostRealizationPlan, GeneratorRoutingPlan } from "../../../core/schema/types.js";
import { BlueprintBuilder } from "../../../core/blueprint/builder.js";
import { resolvePatterns, PatternResolutionResult } from "../../../core/patterns/resolver.js";
import { AssemblyPlanBuilder, AssemblyPlanConfig } from "../../../core/pipeline/assembly-plan.js";
import { createLLMClientFromEnv, isLLMConfigured } from "../../../core/llm/factory.js";
import { runWizardToIntentSchema, extractNumericParameters } from "../../../core/wizard/index.js";
import { mergeCanonicalTalentDrawParameters } from "../../../adapters/dota2/cases/talent-draw.js";
import {
  initializeWorkspace,
  findFeatureById,
  RuneWeaverWorkspace,
  RuneWeaverFeatureRecord,
} from "../../../core/workspace/index.js";
import { createWritePlan as assemblerCreateWritePlan, WritePlan, WritePlanEntry } from "../../../adapters/dota2/assembler/index.js";
import { alignWritePlanWithExistingFeature } from "../helpers/index.js";

export type FeatureMode = "create" | "update" | "regenerate";

export function getFeatureMode(command: "run" | "dry-run" | "review" | "update" | "regenerate" | "rollback" | "delete"): FeatureMode {
  if (command === "update") return "update";
  if (command === "regenerate") return "regenerate";
  return "create";
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
): Promise<{ schema: IntentSchema | null; usedFallback: boolean }> {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 1: IntentSchema");
  console.log("=".repeat(70));

  if (!isLLMConfigured(process.cwd())) {
    console.log("  ⚠️  LLM not configured, using fallback");
    const schema = createFallbackIntentSchema(prompt, hostRoot);
    console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
    console.log(`     Goal: ${schema.request.goal}`);
    console.log(`     Intent Kind: ${schema.classification.intentKind}`);
    console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);
    return { schema, usedFallback: true };
  }

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
      const extractedParams = mergeCanonicalTalentDrawParameters(prompt, extractNumericParameters(prompt));
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
      const schema = {
        ...result.schema,
        host: {
          kind: "dota2-x-template" as const,
          projectRoot: hostRoot,
        },
        isReadyForBlueprint: true,
        normalizedMechanics,
      };

      if (Object.keys(extractedParams).length > 0) {
        (schema as any).parameters = extractedParams;
      }

      console.log("  ✅ IntentSchema created via LLM Wizard");
      console.log(`     Goal: ${schema.request.goal}`);
      console.log(`     Intent Kind: ${schema.classification.intentKind}`);
      console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

      return { schema, usedFallback: false };
    }

    console.log("  ⚠️  LLM Wizard returned invalid schema, using fallback");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ⚠️  LLM not available (${message}), using fallback`);
  }

  const schema = createFallbackIntentSchema(prompt, hostRoot);
  console.log("  ℹ️  IntentSchema created via fallback (prompt analysis)");
  console.log(`     Goal: ${schema.request.goal}`);
  console.log(`     Intent Kind: ${schema.classification.intentKind}`);
  console.log(`     UI Needed: ${schema.uiRequirements?.needed || false}`);

  return { schema, usedFallback: true };
}

function createFallbackIntentSchema(prompt: string, hostRoot: string): IntentSchema {
  const lowerPrompt = prompt.toLowerCase();
  const extractedParams = mergeCanonicalTalentDrawParameters(prompt, extractNumericParameters(prompt));

  let intentKind: "micro-feature" | "standalone-system" = "micro-feature";
  if (lowerPrompt.includes("系统") || lowerPrompt.includes("天赋")) {
    intentKind = "standalone-system";
  }

  const uiKeywords = ["ui", "界面", "显示", "天赋", "modal", "窗口"];
  const uiNeeded = uiKeywords.some((kw) => lowerPrompt.includes(kw));

  const normalizedMechanics = applyMechanicHints({
    trigger: lowerPrompt.includes("按") || lowerPrompt.includes("键") || lowerPrompt.includes("触发"),
    candidatePool: lowerPrompt.includes("选择") && lowerPrompt.includes("天赋"),
    weightedSelection: lowerPrompt.includes("权重") || lowerPrompt.includes("随机"),
    playerChoice: lowerPrompt.includes("选择") && !lowerPrompt.includes("天赋"),
    uiModal: lowerPrompt.includes("天赋") || lowerPrompt.includes("窗口"),
    outcomeApplication:
      lowerPrompt.includes("冲刺") ||
      lowerPrompt.includes("效果") ||
      lowerPrompt.includes("应用") ||
      lowerPrompt.includes("生效") ||
      lowerPrompt.includes("属性"),
    resourceConsumption: lowerPrompt.includes("消耗") || lowerPrompt.includes("资源"),
  }, extractedParams);

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

  if (Object.keys(extractedParams).length > 0) {
    (schema as any).parameters = extractedParams;
  }

  return schema;
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

export function buildBlueprint(schema: IntentSchema): { blueprint: Blueprint | null; issues: string[] } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 2: Blueprint");
  console.log("=".repeat(70));

  const builder = new BlueprintBuilder();
  const result = builder.build(schema);

  if (!result.success || !result.blueprint) {
    console.log("  ❌ Blueprint build failed");
    for (const issue of result.issues) {
      console.log(`     - ${issue.code}: ${issue.message}`);
    }
    return { blueprint: null, issues: result.issues.map((issue) => issue.message) };
  }

  const blueprint = result.blueprint;
  console.log("  ✅ Blueprint created");
  console.log(`     ID: ${blueprint.id}`);
  console.log(`     Modules: ${blueprint.modules.length}`);
  console.log(`     Pattern Hints: ${blueprint.patternHints.length}`);

  return { blueprint, issues: [] };
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
): { writePlan: WritePlan | null; issues: string[] } {
  console.log("\n" + "=".repeat(70));
  console.log("Stage 5: Generator");
  console.log("=".repeat(70));

  try {
    const writePlan = assemblerCreateWritePlan(
      assemblyPlan,
      hostRoot,
      existingFeature?.featureId,
      generatorRoutingPlan ?? undefined,
      hostRealizationPlan ?? undefined,
    );

    if (existingFeature) {
      const alignment = alignWritePlanWithExistingFeature(writePlan, existingFeature, mode);
      if (!alignment.ok) {
        return { writePlan: null, issues: alignment.issues };
      }
    }

    console.log("  ✅ WritePlan created");
    console.log(`     ID: ${writePlan.id}`);
    console.log(`     Entries: ${writePlan.entries.length}`);

    if (writePlan.stats.deferred > 0) {
      console.log(`     ⚠️  Deferred entries: ${writePlan.stats.deferred} (KV side not yet implemented)`);
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

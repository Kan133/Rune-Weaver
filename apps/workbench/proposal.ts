import { isCanonicalPatternAvailable } from "../../core/patterns/canonical-patterns.js";
import type { LLMClient } from "../../core/llm/types.js";
import { WORKBENCH_LLM_PROVIDER_OPTIONS, WORKBENCH_LLM_TEMPERATURE } from "./labels.js";
import { BUILTIN_EXPERIENCES, findRelevantExperiences } from "./experience-library.js";
import type {
  BlueprintProposal,
  FeatureOwnership,
  IntegrationPointRegistry,
  OwnershipConfidence,
  ProposalStatus,
  ProposedConnection,
  ProposedModule,
} from "./types.js";

function buildProposalMessages(
  userRequest: string,
  integrationPointKinds: string[],
  expectedSurfaces: string,
  impactAreas: string,
  experienceContext: string,
): { role: "user"; content: string }[] {
  const prompt = `You are a game feature blueprint proposal generator for Dota2 modding.

Given the following feature request, generate a minimal blueprint proposal.

Feature Request: "${userRequest}"

Detected Integration Points: ${integrationPointKinds.join(", ") || "none"}
Expected Surfaces: ${expectedSurfaces}
Impact Areas: ${impactAreas}${experienceContext}

OUTPUT RULES:
- 2-5 modules ONLY. Reject generating more.
- Each module MUST have a role that is a concrete gameplay noun, NOT a generic label.
- GOOD role examples: "ability_trigger", "dash_execution", "buff_effect", "talent_pool", "selection_ui", "movespeed_buff"
- BAD role examples: "system", "handler", "logic_module", "effect_handler", "generic"
- Effect modules MUST include at least one parameter intent: duration, damage, radius, movespeedBonus, cooldown, manaCost, or similar concrete numeric field
- Proposed pattern IDs MUST be from this exact catalog only. Do NOT invent new patterns:
  input.key_binding, data.weighted_pool, rule.selection_flow, effect.dash, effect.modifier_applier, effect.resource_consume, resource.basic_pool, ui.selection_modal, ui.key_hint, ui.resource_bar, dota2.short_time_buff
- proposedPatternIds can reference 1-2 patterns per module maximum.
- Module count target: 2-5. If 2-3 modules can cover the feature, prefer fewer modules.`;

  return [{ role: "user" as const, content: prompt }];
}

const PROPOSAL_SCHEMA = {
  version: "string",
  proposedModules: [
    {
      id: "string (must be unique per module)",
      role: "string (concrete gameplay noun like ability_trigger, dash_execution, buff_effect - NOT generic like system, handler, logic_module)",
      category: "enum: data|trigger|effect|ui|rule (choose based on role semantics)",
      proposedPatternIds: "array of 1-2 pattern IDs from catalog only: input.key_binding, data.weighted_pool, rule.selection_flow, effect.dash, effect.modifier_applier, effect.resource_consume, resource.basic_pool, ui.selection_modal, ui.key_hint, ui.resource_bar, dota2.short_time_buff",
      proposedParameters: "object with concrete numeric parameter intents for effect modules (min: duration OR damage OR cooldown OR manaCost OR movespeedBonus OR radius)",
    },
  ],
  notes: ["string"],
  issues: ["string (only if something cannot be resolved)"],
};

export async function generateBlueprintProposal(
  featureId: string,
  featureLabel: string,
  userRequest: string,
  integrationPoints: IntegrationPointRegistry,
  featureOwnership: FeatureOwnership,
  client: LLMClient,
): Promise<BlueprintProposal> {
  const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const integrationPointKinds = [...new Set(integrationPoints.points.map((point) => point.kind))];
  const expectedSurfaces = featureOwnership.expectedSurfaces.join(", ");
  const impactAreas = featureOwnership.impactAreas.join(", ");

  const experienceReferences = findRelevantExperiences(featureLabel, integrationPoints, featureOwnership);
  const relevantExperiences = BUILTIN_EXPERIENCES.filter((experience) =>
    experienceReferences.some((reference) => reference.experienceId === experience.id),
  );

  let experienceContext = "";
  if (relevantExperiences.length > 0) {
    experienceContext = "\n\nRelevant experience entries for reference:\n";
    for (const experience of relevantExperiences) {
      experienceContext += `- ${experience.id} (${experience.maturity}): suggested patterns: ${(experience.suggestedPatternIds ?? []).join(", ")}\n`;
      experienceContext += `  Notes: ${(experience.notes ?? []).join("; ")}\n`;
    }
  }

  try {
    const result = await client.generateObject<{
      proposedModules: ProposedModule[];
      notes: string[];
      issues: string[];
    }>({
      messages: buildProposalMessages(userRequest, integrationPointKinds, expectedSurfaces, impactAreas, experienceContext),
      schemaName: "BlueprintProposal",
      schemaDescription: "Generate a minimal blueprint proposal for Dota2 feature",
      schema: PROPOSAL_SCHEMA,
      temperature: WORKBENCH_LLM_TEMPERATURE,
      providerOptions: WORKBENCH_LLM_PROVIDER_OPTIONS,
    });

    const parsed = result.object;
    const parsedModules: ProposedModule[] = (parsed.proposedModules || []).map((module: ProposedModule) => ({
      id: module.id || `module_${Math.random().toString(36).substring(2, 9)}`,
      role: module.role || "unknown",
      category: module.category || "data",
      proposedPatternIds: Array.isArray(module.proposedPatternIds) ? module.proposedPatternIds : [],
      proposedParameters: module.proposedParameters || {},
    }));

    const invalidPatternNotes: string[] = [];
    const invalidPatternIdsMap: Record<string, string[]> = {};
    for (const module of parsedModules) {
      const validPatternIds = module.proposedPatternIds.filter((id) => isCanonicalPatternAvailable(id));
      const invalidPatternIds = module.proposedPatternIds.filter((id) => !isCanonicalPatternAvailable(id));
      if (invalidPatternIds.length > 0) {
        invalidPatternNotes.push(`Module ${module.id}: invalid pattern IDs filtered: ${invalidPatternIds.join(", ")}`);
        invalidPatternIdsMap[module.id] = invalidPatternIds;
      }
      module.proposedPatternIds = validPatternIds;
    }
    if (invalidPatternNotes.length > 0) {
      console.log(`   [Pattern Validation] ${invalidPatternNotes.join("; ")}`);
    }

    const proposedConnections: ProposedConnection[] = [];
    for (let index = 0; index < parsedModules.length - 1; index++) {
      proposedConnections.push({
        sourceModuleId: parsedModules[index].id,
        targetModuleId: parsedModules[index + 1].id,
        connectionType: "implicit_sequence",
      });
    }

    for (const module of parsedModules) {
      if (module.proposedPatternIds.length === 0) {
        module.missingPatterns = true;
      }
      if (parsedModules.length >= 2) {
        const hasConnections = proposedConnections.some(
          (connection) => connection.sourceModuleId === module.id || connection.targetModuleId === module.id,
        );
        if (!hasConnections) {
          module.missingIntegration = true;
        }
      }
      if (!module.role || module.role === "unknown") {
        module.missingOwnership = true;
      }
      const params = module.proposedParameters || {};
      const hasEffectParams = "duration" in params || "damage" in params || "radius" in params ||
        "movespeedBonus" in params || "cooldown" in params || "manaCost" in params ||
        "distance" in params || "speed" in params;
      if (module.category === "effect" && !hasEffectParams) {
        module.missingCapability = true;
      }
    }

    const notes: string[] = Array.isArray(parsed.notes) ? parsed.notes : [];
    const issues: string[] = Array.isArray(parsed.issues) ? parsed.issues : [];

    if (parsedModules.length === 0) {
      throw new Error("No modules parsed from LLM response");
    }

    const confidence: OwnershipConfidence = parsedModules.length >= 3 ? "high" :
      parsedModules.length >= 2 ? "medium" : "low";

    let status: ProposalStatus = "draft";
    if (issues.length > 0) {
      status = "needs_review";
    } else if (confidence === "high") {
      status = "usable";
    }

    return {
      id: proposalId,
      source: "llm",
      status,
      featureId,
      userRequest,
      proposedModules: parsedModules,
      proposedConnections,
      confidence,
      notes,
      issues,
      referencedExperiences: experienceReferences,
      generatedAt: new Date(),
      invalidPatternIds: Object.keys(invalidPatternIdsMap).length > 0 ? invalidPatternIdsMap : undefined,
    };
  } catch (llmError) {
    const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);
    const errorStatus =
      typeof llmError === "object" &&
      llmError !== null &&
      "status" in llmError &&
      typeof (llmError as { status?: unknown }).status === "number"
        ? (llmError as { status: number }).status
        : undefined;

    console.log(`   [Blueprint Proposal] LLM structured generation failed: ${errorMessage}`);
    if (errorStatus !== undefined) {
      console.log(`   [Blueprint Proposal] LLM error status: ${errorStatus}`);
    }

    const fallbackModules: ProposedModule[] = [];
    const fallbackNotes: string[] = ["LLM unavailable - using fallback proposal"];
    const fallbackIssues: string[] = [
      `LLM proposal generation failed - this is a fallback: ${errorMessage}`,
    ];

    if (featureOwnership.expectedSurfaces.includes("trigger") ||
      integrationPoints.points.some((point) => point.kind === "trigger_binding")) {
      fallbackModules.push({
        id: "ability_trigger",
        role: "ability_trigger",
        category: "trigger",
        proposedPatternIds: ["input.key_binding"],
        proposedParameters: { triggerKey: "Q" },
      });
    }

    if (featureOwnership.expectedSurfaces.includes("data") ||
      integrationPoints.points.some((point) => point.kind === "kv_entry" || point.kind === "data_pool")) {
      fallbackModules.push({
        id: "ability_data",
        role: "ability_data",
        category: "data",
        proposedPatternIds: ["data.weighted_pool"],
        proposedParameters: { entries: [] },
      });
    }

    if (featureOwnership.expectedSurfaces.includes("effect") ||
      integrationPoints.points.some((point) => point.kind === "effect_slot" || point.kind === "modifier_slot")) {
      fallbackModules.push({
        id: "ability_effect",
        role: "ability_effect",
        category: "effect",
        proposedPatternIds: ["effect.modifier_applier"],
        proposedParameters: { duration: 5.0 },
      });
    }

    if (featureOwnership.expectedSurfaces.includes("ui") ||
      integrationPoints.points.some((point) => point.kind === "ui_mount")) {
      fallbackModules.push({
        id: "ability_ui",
        role: "ability_ui",
        category: "ui",
        proposedPatternIds: ["ui.key_hint"],
        proposedParameters: { showHotkey: true },
      });
    }

    if (fallbackModules.length === 0) {
      fallbackModules.push({
        id: "generic_module",
        role: "generic",
        category: "data",
        proposedPatternIds: ["data.weighted_pool"],
        proposedParameters: {},
      });
    }

    return {
      id: proposalId,
      source: "fallback",
      status: "needs_review",
      featureId,
      userRequest,
      proposedModules: fallbackModules,
      proposedConnections: [],
      confidence: "low",
      notes: fallbackNotes,
      issues: fallbackIssues,
      referencedExperiences: [],
      generatedAt: new Date(),
    };
  }
}

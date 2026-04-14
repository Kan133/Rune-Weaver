import type { LLMClient } from "../../core/llm/types.js";
import type { BlueprintProposal, GapFillEntry, GapFillResult, GapKind, ProposedModule } from "./types.js";

const REAL_LLM_GAP_KINDS: GapKind[] = ["title", "description"];

export function identifyGapsAndFill(
  proposal: BlueprintProposal,
  client: any,
): GapFillResult {
  const identifiedGaps: GapFillEntry[] = [];
  const filledGaps: GapFillEntry[] = [];
  const unfilledGaps: GapFillEntry[] = [];

  for (const module of proposal.proposedModules) {
    const moduleGaps = detectModuleGaps(module, proposal);
    identifiedGaps.push(...moduleGaps);
  }

  for (const gap of identifiedGaps) {
    const fillResult = fillSingleGap(gap, client);
    if (fillResult) {
      filledGaps.push(fillResult);
    } else {
      unfilledGaps.push(gap);
    }
  }

  const categoryEGaps = identifiedGaps.filter((gap) => gap.fillSource === "clarification_needed");
  const categoryESummary = categoryEGaps.map((gap) =>
    `[${gap.gapKind}] ${gap.targetModuleId}: ${gap.notes?.[0] || "requires clarification"}`,
  );

  return {
    identifiedGaps,
    filledGaps,
    unfilledGaps,
    categoryEGaps,
    categoryESummary,
  };
}

export async function identifyGapsAndFillAsync(
  proposal: BlueprintProposal,
  client: LLMClient,
): Promise<GapFillResult> {
  const identifiedGaps: GapFillEntry[] = [];
  const filledGaps: GapFillEntry[] = [];
  const unfilledGaps: GapFillEntry[] = [];

  for (const module of proposal.proposedModules) {
    const moduleGaps = detectModuleGaps(module, proposal);
    identifiedGaps.push(...moduleGaps);
  }

  for (const gap of identifiedGaps) {
    if (gap.fillSource === "llm" && REAL_LLM_GAP_KINDS.includes(gap.gapKind)) {
      const llmFill = await fillSingleGapWithLLM(gap, client, proposal);
      if (llmFill) {
        filledGaps.push(llmFill);
        continue;
      } else {
        console.log(`   [Gap Fill] ⚠️ LLM fill failed for ${gap.gapKind} in ${gap.targetModuleId}, gap remains unfilled`);
      }
    } else if (gap.fillSource === "llm" && !REAL_LLM_GAP_KINDS.includes(gap.gapKind)) {
      console.log(`   [Gap Fill] ⏭️ Skipped LLM for ${gap.gapKind} in ${gap.targetModuleId} (not in whitelist: ${REAL_LLM_GAP_KINDS.join(", ")})`);
    }

    const fillResult = fillSingleGap(gap, client);
    if (fillResult) {
      filledGaps.push(fillResult);
    } else {
      unfilledGaps.push(gap);
    }
  }

  const categoryEGaps = identifiedGaps.filter((gap) => gap.fillSource === "clarification_needed");
  const categoryESummary = categoryEGaps.map((gap) =>
    `[${gap.gapKind}] ${gap.targetModuleId}: ${gap.notes?.[0] || "requires clarification"}`,
  );

  return {
    identifiedGaps,
    filledGaps,
    unfilledGaps,
    categoryEGaps,
    categoryESummary,
  };
}

function detectModuleGaps(module: ProposedModule, proposal: BlueprintProposal): GapFillEntry[] {
  const gaps: GapFillEntry[] = [];
  const params = module.proposedParameters || {};

  if (module.category === "data" || module.role.includes("pool") || module.role.includes("data")) {
    if (!params.title && !params.label) {
      gaps.push({
        id: `gap_${module.id}_title`,
        gapKind: "title",
        targetField: "title",
        targetModuleId: module.id,
        fillSource: "llm",
        suggestedValue: null,
        confidence: "medium",
        notes: ["Category B: Missing title, requires LLM inference"],
        risks: ["UI may display without context"],
      });
    }

    if (!params.entries && !params.items) {
      gaps.push({
        id: `gap_${module.id}_entries`,
        gapKind: "description",
        targetField: "entries",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: [],
        confidence: "low",
        notes: ["Default empty entries - structural field, not content description"],
        risks: ["Pool may be empty at runtime"],
      });
    }
  }

  if (module.category === "effect" || module.role.includes("effect") || module.role.includes("buff")) {
    if (params.duration === undefined || params.duration === null) {
      gaps.push({
        id: `gap_${module.id}_duration`,
        gapKind: "duration",
        targetField: "duration",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: 5.0,
        confidence: "medium",
        notes: ["Default duration from experience layer"],
        risks: ["User may want different duration"],
      });
    }

    if (params.cooldown === undefined || params.cooldown === null) {
      gaps.push({
        id: `gap_${module.id}_cooldown`,
        gapKind: "cooldown",
        targetField: "cooldown",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: 30.0,
        confidence: "medium",
        notes: ["Default cooldown from experience layer"],
        risks: ["User may want different cooldown"],
      });
    }
  }

  if (module.category === "rule" || module.role.includes("rule") || module.role.includes("selection")) {
    if (params.choiceCount === undefined || params.choiceCount === null) {
      gaps.push({
        id: `gap_${module.id}_choiceCount`,
        gapKind: "choiceCount",
        targetField: "choiceCount",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: 3,
        confidence: "medium",
        notes: ["Default choice count from experience"],
        risks: ["User may want different choice count"],
      });
    }
  }

  if (module.category === "ui" || module.role.includes("ui") || module.role.includes("modal")) {
    if (!params.title && !params.label) {
      gaps.push({
        id: `gap_${module.id}_title`,
        gapKind: "title",
        targetField: "title",
        targetModuleId: module.id,
        fillSource: "llm",
        suggestedValue: null,
        confidence: "medium",
        notes: ["Category B: Missing UI title, requires LLM inference"],
        risks: ["User may want custom title"],
      });
    }

    if (!params.description && !params.copy_hint) {
      gaps.push({
        id: `gap_${module.id}_description`,
        gapKind: "description",
        targetField: "description",
        targetModuleId: module.id,
        fillSource: "llm",
        suggestedValue: null,
        confidence: "low",
        notes: ["Category B: Missing UI description, requires LLM inference"],
        risks: ["User may want custom description"],
      });
    }
  }

  if (module.missingPatterns) {
    gaps.push({
      id: `gap_${module.id}_pattern`,
      gapKind: "pattern",
      targetField: "proposedPatternIds",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: proposedPatternIds is empty - no pattern selected"],
      risks: ["Core functionality depends on pattern selection"],
    });
  }

  if (module.missingIntegration) {
    gaps.push({
      id: `gap_${module.id}_integration`,
      gapKind: "integration",
      targetField: "integration",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: multi-module proposal but this module has no connections in proposedConnections"],
      risks: ["Feature may not work in isolation"],
    });
  }

  if (module.missingOwnership) {
    gaps.push({
      id: `gap_${module.id}_ownership`,
      gapKind: "ownership",
      targetField: "role",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: role is undefined or 'unknown' - ownership boundary unclear"],
      risks: ["Module ownership boundary not defined"],
    });
  }

  if (module.missingCapability) {
    gaps.push({
      id: `gap_${module.id}_capability`,
      gapKind: "capability",
      targetField: "capability",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: effect module missing all of duration/damage/radius - capability unclear"],
      risks: ["Effect behavior undefined"],
    });
  }

  return gaps;
}

function fillSingleGap(gap: GapFillEntry, client: any): GapFillEntry | null {
  if (gap.fillSource === "rule" && gap.suggestedValue !== null) {
    return {
      ...gap,
      suggestedValue: gap.suggestedValue,
    };
  }

  if (gap.fillSource === "llm") {
    return null;
  }

  if (gap.fillSource === "clarification_needed") {
    return null;
  }

  return null;
}

async function fillSingleGapWithLLM(
  gap: GapFillEntry,
  client: LLMClient,
  proposalContext: BlueprintProposal,
): Promise<GapFillEntry | null> {
  if (gap.fillSource !== "llm" || !REAL_LLM_GAP_KINDS.includes(gap.gapKind)) {
    return null;
  }

  const module = proposalContext.proposedModules.find((entry) => entry.id === gap.targetModuleId);
  const moduleContext = module
    ? `Module role: ${module.role}, category: ${module.category}`
    : "Unknown module";

  const prompt = `You are a game feature parameter filler.

Given the following gap context, suggest an appropriate value for the field.

Gap Information:
- Field: ${gap.targetField}
- Kind: ${gap.gapKind}
- ${moduleContext}

Proposal Summary:
- ${proposalContext.proposedModules.length} modules proposed
- Notes: ${proposalContext.notes.join("; ") || "none"}

Suggest a concise, appropriate value for "${gap.targetField}" that fits the Dota2 modding context.
Respond with only the value, no explanation.`;

  try {
    const result = await client.generateText({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 100,
      providerOptions: { thinking: { type: "disabled" } },
    });

    const suggestedValue = result.text.trim();

    if (!suggestedValue || suggestedValue.length === 0) {
      return null;
    }

    return {
      ...gap,
      suggestedValue,
      confidence: "medium",
      notes: [...(gap.notes || []), "Filled via LLM inference"],
    };
  } catch (error) {
    console.warn(`   [Gap Fill] LLM inference failed for ${gap.targetField}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

import type { BlueprintProposal, GapFillResult, SceneReference } from "./types.js";

export function printBlueprintProposalReport(
  blueprintProposal: BlueprintProposal,
  gapFillResult: GapFillResult,
  sceneReferences: SceneReference[],
): void {
  console.log(`   Proposal ID: ${blueprintProposal.id}`);
  console.log(`   Source: ${blueprintProposal.source.toUpperCase()}`);
  if (blueprintProposal.source === "fallback") {
    console.log("   ⚠️ LLM was unavailable, using fallback proposal");
  }
  console.log(`   Status: ${blueprintProposal.status.toUpperCase()}`);
  console.log(`   Confidence: ${blueprintProposal.confidence}`);
  console.log(`   Proposed Modules: ${blueprintProposal.proposedModules.length}`);
  for (const module of blueprintProposal.proposedModules) {
    console.log(`      - ${module.role}: ${module.proposedPatternIds.join(", ")}`);
  }
  if (blueprintProposal.notes.length > 0) {
    console.log(`   Notes: ${blueprintProposal.notes.join("; ")}`);
  }
  if (blueprintProposal.issues.length > 0) {
    console.log(`   Issues: ${blueprintProposal.issues.join("; ")}`);
  }
  if (blueprintProposal.referencedExperiences && blueprintProposal.referencedExperiences.length > 0) {
    console.log(`   Referenced Experiences: ${blueprintProposal.referencedExperiences.length}`);
    for (const experienceRef of blueprintProposal.referencedExperiences) {
      console.log(`      - ${experienceRef.experienceId} (${experienceRef.reason})`);
    }
    console.log("   📌 Experience layer is for reference only - NOT a final rule");
  }

  if (gapFillResult.identifiedGaps.length > 0) {
    console.log(`   Gap-Fill: ${gapFillResult.filledGaps.length}/${gapFillResult.identifiedGaps.length} gaps identified and filled`);
    const llmFilled = gapFillResult.filledGaps.filter((gap) => gap.fillSource === "llm");
    const ruleFilled = gapFillResult.filledGaps.filter((gap) => gap.fillSource === "rule");
    if (llmFilled.length > 0) {
      console.log(`      🔮 LLM-filled (Category B): ${llmFilled.length}`);
      for (const filled of llmFilled) {
        console.log(`         - ${filled.gapKind} for ${filled.targetModuleId}: "${filled.suggestedValue}"`);
      }
    }
    if (ruleFilled.length > 0) {
      console.log(`      📋 Rule-filled (Category A): ${ruleFilled.length}`);
      for (const filled of ruleFilled) {
        console.log(`         - ${filled.gapKind} for ${filled.targetModuleId}: ${filled.suggestedValue}`);
      }
    }
    if (gapFillResult.categoryEGaps.length > 0) {
      console.log(`   ⚠️  Category E Clarification Needed: ${gapFillResult.categoryEGaps.length} gaps`);
      for (const gap of gapFillResult.categoryEGaps) {
        console.log(`      - [${gap.gapKind}] ${gap.targetModuleId}: ${gap.notes?.[0] || "requires clarification"}`);
      }
    }
    if (gapFillResult.unfilledGaps.length > 0) {
      console.log(`   Unfilled gaps: ${gapFillResult.unfilledGaps.length}`);
    }
    console.log("   📌 Gap-fill is for reference only - NOT a final parameter");
  }

  if (sceneReferences.length > 0) {
    console.log(`   Scene/Map References: ${sceneReferences.length} anchor(s) detected`);
    for (const reference of sceneReferences) {
      console.log(`      - ${reference.anchorName} (${reference.anchorKind})`);
    }
    console.log("   📌 Scene references are READ-ONLY - no map editing performed");
  }

  console.log("   ⚠️ NOTE: This is a PROPOSAL only, not a final blueprint.");
  console.log("   System still retains final authority for blueprint decisions.");
}

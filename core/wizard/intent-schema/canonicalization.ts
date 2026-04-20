import type { IntentSchema } from "../../schema/types.js";
import { analyzeIntentSemanticLayers } from "./semantic-analysis.js";
import { CANDIDATE_DRAW_CANONICALIZATION_PASS } from "./canonicalization-pass-candidate-draw.js";
import { DEFINITION_ONLY_PROVIDER_CANONICALIZATION_PASS } from "./canonicalization-pass-definition-only-provider.js";
import type {
  IntentSchemaCanonicalizationPass,
  IntentSchemaCanonicalizationPassResult,
  IntentSchemaNormalizationContext,
} from "./shared.js";

interface IntentSchemaCanonicalizationResult extends IntentSchemaCanonicalizationPassResult {
  semanticAnalysis: ReturnType<typeof analyzeIntentSemanticLayers>;
  appliedPassIds: string[];
}

const INTENT_SCHEMA_CANONICALIZATION_PASSES: IntentSchemaCanonicalizationPass[] = [
  CANDIDATE_DRAW_CANONICALIZATION_PASS,
  DEFINITION_ONLY_PROVIDER_CANONICALIZATION_PASS,
].sort((left, right) => right.priority - left.priority);

export function runIntentSchemaCanonicalizationPasses(input: {
  candidate: Partial<IntentSchema>;
  context: IntentSchemaNormalizationContext;
  semanticAnalysis: ReturnType<typeof analyzeIntentSemanticLayers>;
}): IntentSchemaCanonicalizationResult {
  let currentCandidate = input.candidate;
  let currentSemanticAnalysis = input.semanticAnalysis;
  const appliedPassIds: string[] = [];

  for (const pass of INTENT_SCHEMA_CANONICALIZATION_PASSES) {
    if (!pass.matches(currentCandidate, input.context, currentSemanticAnalysis)) {
      continue;
    }

    const result = pass.apply({
      candidate: currentCandidate,
      context: input.context,
      semanticAnalysis: currentSemanticAnalysis,
    });
    currentCandidate = result.candidate;
    currentSemanticAnalysis = analyzeIntentSemanticLayers(
      currentCandidate,
      input.context.rawText,
      input.context.host,
      {
        promptHints: input.context.promptHints,
        rawFacts: currentSemanticAnalysis.rawFacts,
        openSemanticResidue: result.openSemanticResidue,
      },
    );
    appliedPassIds.push(pass.id);
  }

  return {
    candidate: currentCandidate,
    openSemanticResidue: currentSemanticAnalysis.openSemanticResidue,
    semanticAnalysis: currentSemanticAnalysis,
    appliedPassIds,
  };
}

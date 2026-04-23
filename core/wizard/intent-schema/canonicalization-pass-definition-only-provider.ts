import { appendResolvedAssumptionResidue } from "./semantic-residue.js";
import type { IntentSchemaCanonicalizationPass } from "./shared.js";
import {
  analyzeDefinitionOnlyProviderSemantics,
  canonicalizeDefinitionOnlyProviderCandidate,
  reconcileDefinitionOnlyProviderOpenSemanticResidue,
} from "./definition-only-provider.js";

export const DEFINITION_ONLY_PROVIDER_CANONICALIZATION_PASS: IntentSchemaCanonicalizationPass = {
  id: "definition-only-provider-export",
  priority: 90,
  changedSemanticAreas: [
    "interaction",
    "selection",
    "timing",
    "effects",
    "outcomes",
    "composition",
    "integrations",
    "uiRequirements",
    "openSemanticResidue",
  ],
  matches(candidate, context) {
    const semantics = analyzeDefinitionOnlyProviderSemantics(candidate, context.rawText);
    return semantics.matches;
  },
  apply({ candidate, semanticAnalysis }) {
    const normalizedCandidate = canonicalizeDefinitionOnlyProviderCandidate(candidate);
    const openSemanticResidue = appendResolvedAssumptionResidue(
      reconcileDefinitionOnlyProviderOpenSemanticResidue(semanticAnalysis.openSemanticResidue),
      {
        summaries: [
          "Definition-only provider shells stay feature-owned and session-local; downstream grant or attachment logic belongs to consumers, not this feature.",
        ],
        class: "governance_relevant",
        source: "canonicalization",
      },
    );

    return {
      candidate: normalizedCandidate,
      openSemanticResidue,
    };
  },
};

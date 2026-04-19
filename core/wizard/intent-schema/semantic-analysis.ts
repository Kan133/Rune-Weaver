import type {
  HostDescriptor,
  IntentClassification,
  IntentCompositionContract,
  IntentContentModelContract,
  IntentEffectContract,
  IntentInteractionContract,
  IntentSchema,
  IntentSelectionContract,
  IntentStateContract,
  IntentTimingContract,
  IntentUncertainty,
  NormalizedMechanics,
  UIRequirementSummary,
} from "../../schema/types.js";
import { collectPromptSemanticHints } from "./prompt-hints.js";
import { buildIntentRawFacts } from "./raw-facts.js";
import { deriveIntentGovernanceDecisions } from "./governance-decisions.js";
import { deriveIntentOpenSemanticResidue } from "./semantic-residue.js";
import type { PromptSemanticHints } from "./shared.js";

export interface IntentRawFact {
  code: string;
  value: unknown;
  source: "prompt_text" | "prompt_hints" | "schema_candidate" | "parameters" | "legacy_projection";
  confidence: "low" | "medium" | "high";
  evidenceText?: string;
}

export type IntentRawFacts = IntentRawFact[];

export interface IntentGovernanceDecision<TValue = unknown> {
  code: string;
  value: TValue;
  confidence: "low" | "medium" | "high";
  rationaleFactCodes?: string[];
}

export interface IntentGovernanceActivationContract {
  interactive: boolean;
  kinds?: string[];
  inputs?: string[];
  phases?: string[];
  repeatability?: string[];
}

export interface IntentGovernanceSelectionContract {
  present: boolean;
  source?: IntentSelectionContract["source"];
  choiceMode?: IntentSelectionContract["choiceMode"];
  cardinality?: IntentSelectionContract["cardinality"];
  choiceCount?: number;
  repeatability?: IntentSelectionContract["repeatability"];
  duplicatePolicy?: IntentSelectionContract["duplicatePolicy"];
  commitment?: IntentSelectionContract["commitment"];
  inventory?: {
    enabled: boolean;
    capacity?: number;
    blockDrawWhenFull?: boolean;
    storeSelectedItems?: boolean;
    presentation?: NonNullable<IntentSelectionContract["inventory"]>["presentation"];
  };
}

export interface IntentGovernanceUiContract {
  needed: boolean;
  surfaces?: string[];
  feedbackNeeds?: string[];
}

export interface IntentGovernanceTimingContract {
  cooldownSeconds?: number;
  intervalSeconds?: number;
  durationKind?: IntentTimingContract["duration"] extends infer TDuration
    ? TDuration extends { kind?: infer TKind }
      ? TKind
      : never
    : never;
}

export interface IntentGovernanceEffectContract {
  operations?: IntentEffectContract["operations"];
  targets?: string[];
  durationSemantics?: IntentEffectContract["durationSemantics"];
}

export interface IntentGovernanceOutcomeContract {
  operations?: NonNullable<IntentSchema["outcomes"]>["operations"];
}

export interface IntentGovernanceStateContract {
  states?: Array<{
    owner?: IntentStateContract["states"][number]["owner"];
    lifetime?: IntentStateContract["states"][number]["lifetime"];
    kind?: IntentStateContract["states"][number]["kind"];
    mutationMode?: IntentStateContract["states"][number]["mutationMode"];
  }>;
}

export interface IntentGovernanceContentContract {
  collections?: Array<{
    role?: NonNullable<IntentContentModelContract["collections"]>[number]["role"];
    ownership?: NonNullable<IntentContentModelContract["collections"]>[number]["ownership"];
    updateMode?: NonNullable<IntentContentModelContract["collections"]>[number]["updateMode"];
    itemSchema?: Array<{
      type?: NonNullable<
        NonNullable<IntentContentModelContract["collections"]>[number]["itemSchema"]
      >[number]["type"];
      semanticRole?: NonNullable<
        NonNullable<IntentContentModelContract["collections"]>[number]["itemSchema"]
      >[number]["semanticRole"];
      required?: boolean;
    }>;
  }>;
}

export interface IntentGovernanceCompositionContract {
  dependencies?: Array<{
    kind?: NonNullable<IntentCompositionContract["dependencies"]>[number]["kind"];
    relation?: NonNullable<IntentCompositionContract["dependencies"]>[number]["relation"];
    target?: NonNullable<IntentCompositionContract["dependencies"]>[number]["target"];
    required?: boolean;
  }>;
}

export interface IntentGovernanceDecisions {
  intentKind: IntentGovernanceDecision<IntentClassification["intentKind"]>;
  normalizedMechanics: IntentGovernanceDecision<NormalizedMechanics>;
  crossSystemComposition: IntentGovernanceDecision<boolean>;
  nonUiGameplayPresent: IntentGovernanceDecision<boolean>;
  canonicalizationEligible: IntentGovernanceDecision<string[]>;
  activationContract: IntentGovernanceDecision<IntentGovernanceActivationContract>;
  selectionContract: IntentGovernanceDecision<IntentGovernanceSelectionContract>;
  uiContract: IntentGovernanceDecision<IntentGovernanceUiContract>;
  timingContract: IntentGovernanceDecision<IntentGovernanceTimingContract>;
  effectContract: IntentGovernanceDecision<IntentGovernanceEffectContract>;
  outcomeContract: IntentGovernanceDecision<IntentGovernanceOutcomeContract>;
  stateContract: IntentGovernanceDecision<IntentGovernanceStateContract>;
  contentContract: IntentGovernanceDecision<IntentGovernanceContentContract>;
  compositionContract: IntentGovernanceDecision<IntentGovernanceCompositionContract>;
}

export interface IntentOpenSemanticResidueItem {
  id: string;
  summary: string;
  class: "governance_relevant" | "blueprint_relevant" | "bounded_detail_only";
  disposition: "open" | "assumed";
  affects: IntentUncertainty["affects"];
  severity: IntentUncertainty["severity"];
  source:
    | "schema.uncertainty"
    | "legacy.required_clarification"
    | "legacy.open_question"
    | "schema.resolved_assumption"
    | "canonicalization";
}

export type IntentOpenSemanticResidue = IntentOpenSemanticResidueItem[];

export interface IntentSemanticAnalysis {
  rawFacts: IntentRawFacts;
  governanceDecisions: IntentGovernanceDecisions;
  openSemanticResidue: IntentOpenSemanticResidue;
}

export function analyzeIntentSemanticLayers(
  candidate: Partial<IntentSchema>,
  rawText: string,
  host: HostDescriptor,
  options?: {
    promptHints?: PromptSemanticHints;
    rawFacts?: IntentRawFacts;
    openSemanticResidue?: IntentOpenSemanticResidue;
  },
): IntentSemanticAnalysis {
  const promptHints = options?.promptHints ?? collectPromptSemanticHints(rawText);
  const rawFacts =
    options?.rawFacts ??
    buildIntentRawFacts({
      candidate,
      rawText,
      host,
      promptHints,
    });
  const governanceDecisions = deriveIntentGovernanceDecisions({
    candidate,
    rawFacts,
    rawText,
    host,
    promptHints,
  });
  const openSemanticResidue =
    options?.openSemanticResidue ??
    deriveIntentOpenSemanticResidue({
      candidate,
      rawFacts,
      rawText,
      host,
      promptHints,
      governanceDecisions,
    });

  return {
    rawFacts,
    governanceDecisions,
    openSemanticResidue,
  };
}

export function extractIntentSchemaGovernanceDecisions(
  schema: IntentSchema,
): IntentGovernanceDecisions {
  return analyzeIntentSemanticLayers(schema, schema.request.rawPrompt, schema.host).governanceDecisions;
}

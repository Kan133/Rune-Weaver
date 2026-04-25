/**
 * Rune Weaver - Wizard Types
 */

import type {
  CurrentFeatureContext,
  HostDescriptor,
  IntentSchema,
  UpdateIntent,
  UpdateWizardInterpretation,
  ValidationIssue,
  WizardClarificationPlan,
  WizardInterpretation,
} from "../schema/types";
import type { LLMClient } from "../llm/types";

export interface WizardClarificationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface WizardRefinementContext {
  priorSchema?: IntentSchema;
  clarificationTranscript?: WizardClarificationAnswer[];
}

export interface WizardIntentInput {
  rawText: string;
  host?: HostDescriptor;
  model?: string;
  temperature?: number;
  providerOptions?: Record<string, unknown>;
  refinementContext?: WizardRefinementContext;
}

export interface WizardIntentOptions {
  client: LLMClient;
  input: WizardIntentInput;
}

export interface WizardIntentResult {
  schema: IntentSchema;
  interpretation: WizardInterpretation;
  clarificationPlan?: WizardClarificationPlan;
  issues: ValidationIssue[];
  valid: boolean;
  raw?: unknown;
}

export interface UpdateWizardInput extends WizardIntentInput {
  currentFeatureContext: CurrentFeatureContext;
}

export interface UpdateWizardOptions {
  client: LLMClient;
  input: UpdateWizardInput;
}

export interface UpdateWizardResult {
  requestedChange: IntentSchema;
  updateIntent: UpdateIntent;
  interpretation: UpdateWizardInterpretation;
  clarificationPlan?: WizardClarificationPlan;
  issues: ValidationIssue[];
  valid: boolean;
  raw?: unknown;
}

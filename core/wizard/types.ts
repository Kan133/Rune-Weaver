/**
 * Rune Weaver - Wizard Types
 */

import type { HostDescriptor, IntentSchema, ValidationIssue } from "../schema/types";
import type { LLMClient } from "../llm/types";

export interface WizardIntentInput {
  rawText: string;
  host?: HostDescriptor;
  model?: string;
  temperature?: number;
  providerOptions?: Record<string, unknown>;
}

export interface WizardIntentOptions {
  client: LLMClient;
  input: WizardIntentInput;
}

export interface WizardIntentResult {
  schema: IntentSchema;
  issues: ValidationIssue[];
  valid: boolean;
  raw?: unknown;
}

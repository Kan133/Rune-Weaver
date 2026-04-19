import type { HostDescriptor, IntentSchema, ValidationIssue } from "../../schema/types.js";
import { buildWizardCreatePromptPackage } from "../../llm/prompt-packages.js";
import { buildDota2RetrievalBundle } from "../../retrieval/index.js";
import { validateIntentSchema } from "../../validation";
import { buildWizardClarificationPlan } from "../clarification-plan";
import type { WizardIntentOptions, WizardIntentResult } from "../types";
import { createFallbackIntentSchema } from "./fallback.js";
import { normalizeIntentSchema } from "./normalize.js";
import { INTENT_SCHEMA_REFERENCE } from "./reference.js";
import { DEFAULT_HOST } from "./shared.js";

export async function runWizardToIntentSchema(
  options: WizardIntentOptions,
): Promise<WizardIntentResult> {
  const host = options.input.host ?? DEFAULT_HOST;
  let schema: IntentSchema;
  let raw: unknown;
  const preValidationIssues: ValidationIssue[] = [];
  const retrievalBundle = await buildDota2RetrievalBundle({
    promptPackageId: "wizard.create",
    queryText: options.input.rawText,
    projectRoot: host.projectRoot || process.cwd(),
  });
  const promptPackage = buildWizardCreatePromptPackage({
    rawText: options.input.rawText,
    hostSummary: JSON.stringify(host),
    retrievalBundle,
    refinementContext: options.input.refinementContext,
  });

  try {
    const result = await options.client.generateObject<Partial<IntentSchema>>({
      messages: promptPackage.messages,
      schemaName: "IntentSchema",
      schemaDescription:
        "Transform a Rune Weaver user request into a stable IntentSchema for blueprint generation.",
      schema: INTENT_SCHEMA_REFERENCE,
      model: options.input.model,
      temperature: options.input.temperature,
      providerOptions: options.input.providerOptions,
    });

    raw = result.raw;
    schema = normalizeIntentSchema(result.object, options.input.rawText, host);
  } catch (error) {
    schema = createFallbackIntentSchema(options.input.rawText, host);
    preValidationIssues.push({
      code: "WIZARD_GENERIC_FALLBACK",
      scope: "schema",
      severity: "warning",
      message: `Wizard fell back to generic semantic interpretation: ${error instanceof Error ? error.message : String(error)}`,
      path: "wizard",
    });
  }

  const clarificationPlan = buildWizardClarificationPlan({
    rawText: options.input.rawText,
    schema,
  });
  const issues = [...preValidationIssues, ...validateIntentSchema(schema)];

  return {
    schema,
    interpretation: {
      intentSchema: schema,
      ...(clarificationPlan ? { clarificationPlan } : {}),
      promptPackageId: promptPackage.id,
      promptConstraints: promptPackage.promptConstraints,
      ...(promptPackage.retrievalBundle ? { retrievalBundle: promptPackage.retrievalBundle } : {}),
    },
    ...(clarificationPlan ? { clarificationPlan } : {}),
    issues,
    valid: !issues.some((issue) => issue.severity === "error"),
    raw,
  };
}

export function buildWizardMessages(
  rawText: string,
  host: HostDescriptor,
  refinementContext?: WizardIntentOptions["input"]["refinementContext"],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return buildWizardCreatePromptPackage({
    rawText,
    hostSummary: JSON.stringify(host),
    refinementContext,
  }).messages;
}

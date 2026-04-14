/**
 * Rune Weaver - Wizard -> IntentSchema
 * 
 * 与 docs/SCHEMA.md 4.2 节对齐
 */

import type {
  HostDescriptor,
  IntentClassification,
  IntentConstraints,
  IntentRequirements,
  IntentSchema,
  NormalizedMechanics,
  UIRequirementSummary,
  UserRequestSummary,
} from "../schema/types";
import {
  DOTA2_X_TEMPLATE_HOST_KIND,
} from "../host/types.js";
import { validateIntentSchema } from "../validation";
import type { WizardIntentOptions, WizardIntentResult } from "./types";

const DEFAULT_HOST: HostDescriptor = {
  kind: DOTA2_X_TEMPLATE_HOST_KIND,
};

const INTENT_SCHEMA_REFERENCE = {
  version: "string",
  host: {
    kind: "string",
    projectRoot: "string?",
    capabilities: ["string?"],
  },
  request: {
    rawPrompt: "string",
    goal: "string",
    nameHint: "string?",
  },
  classification: {
    intentKind: "micro-feature | standalone-system | cross-system-composition | ui-surface | unknown",
    confidence: "low | medium | high",
  },
  requirements: {
    functional: ["string"],
    interactions: ["string?"],
    dataNeeds: ["string?"],
    outputs: ["string?"],
  },
  constraints: {
    requiredPatterns: ["string?"],
    forbiddenPatterns: ["string?"],
    hostConstraints: ["string?"],
    nonFunctional: ["string?"],
  },
  uiRequirements: {
    needed: "boolean",
    surfaces: ["string?"],
    feedbackNeeds: ["string?"],
  },
  normalizedMechanics: {
    trigger: "boolean?",
    candidatePool: "boolean?",
    weightedSelection: "boolean?",
    playerChoice: "boolean?",
    uiModal: "boolean?",
    outcomeApplication: "boolean?",
    resourceConsumption: "boolean?",
  },
  openQuestions: ["string"],
  resolvedAssumptions: ["string"],
  isReadyForBlueprint: "boolean",
};

export async function runWizardToIntentSchema(
  options: WizardIntentOptions
): Promise<WizardIntentResult> {
  const host = options.input.host ?? DEFAULT_HOST;

  const result = await options.client.generateObject<Partial<IntentSchema>>({
    messages: buildWizardMessages(options.input.rawText, host),
    schemaName: "IntentSchema",
    schemaDescription:
      "Transform a Rune Weaver user request into a stable IntentSchema for blueprint generation.",
    schema: INTENT_SCHEMA_REFERENCE,
    model: options.input.model,
    temperature: options.input.temperature,
    providerOptions: options.input.providerOptions,
  });

  const schema = normalizeIntentSchema(result.object, options.input.rawText, host);
  const issues = validateIntentSchema(schema);

  return {
    schema,
    issues,
    valid: !issues.some((issue) => issue.severity === "error"),
    raw: result.raw,
  };
}

export function buildWizardMessages(
  rawText: string,
  host: HostDescriptor
): Array<{ role: "system" | "user"; content: string }> {
  return [
    {
      role: "system",
      content: [
        "You are Rune Weaver's wizard layer.",
        "Do not write code.",
        "Convert the user request into a stable IntentSchema.",
        "Prefer explicit structure over vague prose.",
        "If requirements are incomplete, keep openQuestions and set isReadyForBlueprint to false.",
        "Use the new simplified schema structure aligned with SCHEMA.md.",
        `Current host: ${JSON.stringify(host)}`,
      ].join("\n"),
    },
    {
      role: "user",
      content: rawText,
    },
  ];
}

export function normalizeIntentSchema(
  candidate: Partial<IntentSchema>,
  rawText: string,
  host: HostDescriptor
): IntentSchema {
  return {
    version: typeof candidate.version === "string" ? candidate.version : "1.0",
    host: normalizeHost(candidate.host, host),
    request: normalizeRequest(candidate.request, rawText),
    classification: normalizeClassification(candidate.classification),
    requirements: normalizeRequirements(candidate.requirements),
    constraints: normalizeConstraints(candidate.constraints),
    uiRequirements: normalizeUIRequirements(candidate.uiRequirements),
    normalizedMechanics: normalizeNormalizedMechanics(candidate.normalizedMechanics),
    openQuestions: normalizeStringArray(candidate.openQuestions),
    resolvedAssumptions: normalizeStringArray(candidate.resolvedAssumptions),
    isReadyForBlueprint: candidate.isReadyForBlueprint === true,
  };
}

function normalizeHost(
  host: Partial<HostDescriptor> | undefined,
  fallback: HostDescriptor
): HostDescriptor {
  return {
    kind: typeof host?.kind === "string" && host.kind.trim()
      ? host.kind
      : fallback.kind,
    projectRoot: typeof host?.projectRoot === "string" 
      ? host.projectRoot 
      : fallback.projectRoot,
    capabilities: Array.isArray(host?.capabilities)
      ? host.capabilities.filter((value): value is string => typeof value === "string")
      : fallback.capabilities,
  };
}

function normalizeRequest(
  request: Partial<UserRequestSummary> | undefined,
  rawText: string
): UserRequestSummary {
  return {
    rawPrompt: rawText,
    goal: typeof request?.goal === "string" && request.goal.trim()
      ? request.goal
      : rawText,
    nameHint: typeof request?.nameHint === "string" 
      ? request.nameHint 
      : undefined,
  };
}

function normalizeClassification(
  classification: Partial<IntentClassification> | undefined
): IntentClassification {
  const validKinds = new Set([
    "micro-feature",
    "standalone-system",
    "cross-system-composition",
    "ui-surface",
    "unknown",
  ]);

  return {
    intentKind:
      typeof classification?.intentKind === "string" && validKinds.has(classification.intentKind)
        ? classification.intentKind
        : "unknown",
    confidence: isOneOf(classification?.confidence, ["low", "medium", "high"])
      ? classification.confidence
      : "medium",
  };
}

function normalizeRequirements(
  requirements: Partial<IntentRequirements> | undefined
): IntentRequirements {
  return {
    functional: normalizeStringArray(requirements?.functional),
    interactions: normalizeStringArray(requirements?.interactions),
    dataNeeds: normalizeStringArray(requirements?.dataNeeds),
    outputs: normalizeStringArray(requirements?.outputs),
  };
}

function normalizeConstraints(
  constraints: Partial<IntentConstraints> | undefined
): IntentConstraints {
  return {
    requiredPatterns: normalizeStringArray(constraints?.requiredPatterns),
    forbiddenPatterns: normalizeStringArray(constraints?.forbiddenPatterns),
    hostConstraints: normalizeStringArray(constraints?.hostConstraints),
    nonFunctional: normalizeStringArray(constraints?.nonFunctional),
  };
}

function normalizeUIRequirements(
  ui: Partial<UIRequirementSummary> | undefined
): UIRequirementSummary | undefined {
  if (!ui) {
    return undefined;
  }

  return {
    needed: ui.needed === true,
    surfaces: normalizeStringArray(ui.surfaces),
    feedbackNeeds: normalizeStringArray(ui.feedbackNeeds),
  };
}

function normalizeNormalizedMechanics(
  mechanics: Partial<NormalizedMechanics> | undefined
): NormalizedMechanics {
  return {
    trigger: mechanics?.trigger === true,
    candidatePool: mechanics?.candidatePool === true,
    weightedSelection: mechanics?.weightedSelection === true,
    playerChoice: mechanics?.playerChoice === true,
    uiModal: mechanics?.uiModal === true,
    outcomeApplication: mechanics?.outcomeApplication === true,
    resourceConsumption: mechanics?.resourceConsumption === true,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

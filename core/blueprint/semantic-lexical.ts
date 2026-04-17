import { IntentSchema } from "../schema/types";

export function collectIntentStrings(schema: IntentSchema): string[] {
  const values: string[] = [];
  values.push(schema.request.goal);
  values.push(schema.flow?.triggerSummary || "");
  values.push(...(schema.flow?.sequence || []));
  values.push(...schema.requirements.functional);
  values.push(...(schema.requirements.interactions || []));
  values.push(...(schema.requirements.dataNeeds || []));
  values.push(...(schema.requirements.outputs || []));
  values.push(...(schema.uiRequirements?.surfaces || []));
  values.push(...(schema.uiRequirements?.feedbackNeeds || []));
  values.push(...schema.openQuestions);
  values.push(...schema.resolvedAssumptions);

  for (const requirement of schema.requirements.typed || []) {
    values.push(requirement.summary);
    values.push(...(requirement.inputs || []));
    values.push(...(requirement.outputs || []));
    values.push(...(requirement.invariants || []));
  }

  for (const binding of schema.integrations?.expectedBindings || []) {
    values.push(binding.summary);
    values.push(binding.id);
  }

  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export function collectTypedParameterKeys(schema: IntentSchema): Set<string> {
  const keys = new Set<string>();
  for (const requirement of schema.requirements.typed || []) {
    for (const key of Object.keys(requirement.parameters || {})) {
      keys.add(key);
    }
  }
  return keys;
}

export function readPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

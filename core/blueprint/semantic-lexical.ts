import { IntentSchema } from "../schema/types";

const NEGATIVE_CONSTRAINT_PATTERNS = [
  /\bwith\s+no\s+(?:ui|inventory|persistence|persist(?:ent|ence)?|cross-feature(?:\s+coupling)?|cross feature(?:\s+coupling)?)(?:\s*(?:,|and|or)\s*(?:no\s+)?(?:ui|inventory|persistence|persist(?:ent|ence)?|cross-feature(?:\s+coupling)?|cross feature(?:\s+coupling)?))*\b/giu,
  /\bwithout\s+(?:ui|inventory|persistence|persist(?:ent|ence)?|cross-feature(?:\s+coupling)?|cross feature(?:\s+coupling)?)\b/giu,
  /\b(?:do not|don't|must not|mustn't|should not)\s+add\s+(?:ui|inventory|persistence|persist(?:ent|ence)?|cross-feature(?:\s+coupling)?|cross feature(?:\s+coupling)?)\b/giu,
  /\bno\s+(?:ui|inventory|persistence|persist(?:ent|ence)?|cross-feature(?:\s+coupling)?|cross feature(?:\s+coupling)?)\b/giu,
  /(?:不要|不需要|无需|别)\s*(?:ui|界面|inventory|背包|库存|persistence|持久化|跨\s*feature|跨feature|跨功能|跨特性)/giu,
];

export function stripNegativeConstraintFragments(value: string): string {
  let normalized = value;
  for (const pattern of NEGATIVE_CONSTRAINT_PATTERNS) {
    normalized = normalized.replace(pattern, " ");
  }

  return normalized
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[,\s]*(?:and|or)[,\s]*(?=[,.;:]|$)/giu, " ")
    .replace(/[ ,.;:]+$/g, "")
    .trim();
}

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
  values.push(...((schema.uncertainties || []).map((item) => item.summary)));
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

  return values
    .map((value) => stripNegativeConstraintFragments(value))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
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

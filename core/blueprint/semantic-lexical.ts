import { IntentSchema } from "../schema/types";

const NEGATIVE_CONSTRAINT_PATTERNS = [
  /\bwith\s+no\s+(?:ui|inventory(?:\s+mechanics?)?|persistence|persist(?:ent|ence)?|cross-feature(?:\s+(?:coupling|composition))?|cross feature(?:\s+(?:coupling|composition))?)(?:\s*(?:,|and|or)\s*(?:no\s+)?(?:ui|inventory(?:\s+mechanics?)?|persistence|persist(?:ent|ence)?|cross-feature(?:\s+(?:coupling|composition))?|cross feature(?:\s+(?:coupling|composition))?))*\b/giu,
  /\bwithout\s+(?:ui|inventory(?:\s+mechanics?)?|persistence|persist(?:ent|ence)?|cross-feature(?:\s+(?:coupling|composition))?|cross feature(?:\s+(?:coupling|composition))?)\b/giu,
  /\b(?:with|without|has|have)\s+no\s+(?:direct\s+)?(?:trigger|activation)\s+key\b/giu,
  /\bno\s+(?:direct\s+)?(?:trigger|activation)\s+key\b/giu,
  /\b(?:do not|don't|must not|mustn't|should not)\s+add\s+(?:ui|inventory|persistence|persist(?:ent|ence)?|cross-feature(?:\s+coupling)?|cross feature(?:\s+coupling)?)\b/giu,
  /\b(?:do not|don't|must not|mustn't|should not)\s+(?:use|include|introduce|require|depend on|couple to)\s+(?:any\s+)?(?:ui|inventory(?:\s+mechanics?)?|persistence|persist(?:ent|ence)?|cross-feature(?:\s+(?:coupling|composition))?|cross feature(?:\s+(?:coupling|composition))?)\b/giu,
  /\b(?:does|do)\s+not\s+auto-attach(?:\s+to\s+the\s+hero)?\b/giu,
  /\bnot\s+auto-attach(?:ed|ing)?(?:\s+to\s+the\s+hero)?\b/giu,
  /\bno\s+(?:ui|inventory|inventory\s+mechanics|persistence|persist(?:ent|ence)?|cross-feature(?:\s+(?:coupling|composition))?|cross feature(?:\s+(?:coupling|composition))?)\b/giu,
  /\b(?:is|are|be|remain|stays?)\s+not\s+(?:persistent|persist(?:ent|ence)?|cross-feature(?:\s+(?:coupling|composition))?|cross feature(?:\s+(?:coupling|composition))?)\b/giu,
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

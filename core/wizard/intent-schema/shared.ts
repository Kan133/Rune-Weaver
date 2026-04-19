import type { HostDescriptor, IntentSchema } from "../../schema/types.js";
import { DOTA2_X_TEMPLATE_HOST_KIND } from "../../host/types.js";
import type { IntentOpenSemanticResidue, IntentSemanticAnalysis } from "./semantic-analysis.js";

export const DEFAULT_HOST: HostDescriptor = {
  kind: DOTA2_X_TEMPLATE_HOST_KIND,
};

export interface PromptSemanticHints {
  normalizedText: string;
  candidateCount?: number;
  committedCount?: number;
  inventoryCapacity?: number;
  inventoryFullMessage?: string;
  candidatePool: boolean;
  weightedDraw: boolean;
  playerChoice: boolean;
  inventory: boolean;
  inventoryBlocksWhenFull: boolean;
  noRepeatAfterSelection: boolean;
  returnsUnchosenToPool?: boolean;
  immediateOutcome: boolean;
  explicitPersistence: boolean;
  explicitCrossFeature?: boolean;
  rarityDisplay: boolean;
  uiSurface: boolean;
}

export interface LegacyRequiredClarification {
  id?: string;
  question?: string;
  blocksFinalization?: boolean;
}

export interface IntentSchemaNormalizationTrace {
  appliedCanonicalizationPassIds: string[];
}

export interface IntentSchemaNormalizationContext {
  rawText: string;
  host: HostDescriptor;
  promptHints: PromptSemanticHints;
  trace: IntentSchemaNormalizationTrace;
}

export interface IntentSchemaCanonicalizationPassResult {
  candidate: Partial<IntentSchema>;
  openSemanticResidue?: IntentOpenSemanticResidue;
}

export interface IntentSchemaCanonicalizationPass {
  id: string;
  priority: number;
  changedSemanticAreas: string[];
  matches(
    candidate: Partial<IntentSchema>,
    context: IntentSchemaNormalizationContext,
    semanticAnalysis: IntentSemanticAnalysis,
  ): boolean;
  apply(input: {
    candidate: Partial<IntentSchema>;
    context: IntentSchemaNormalizationContext;
    semanticAnalysis: IntentSemanticAnalysis;
  }): IntentSchemaCanonicalizationPassResult;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

export function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

export function normalizePositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

export function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return undefined;
}

export function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = new Set(
    value
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim()),
  );

  if (normalized.size === 0) {
    return undefined;
  }

  return [...normalized];
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
}

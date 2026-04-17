import type { FeatureAuthoringProposal, IntentSchema } from "../schema/types";
import {
  normalizeSelectionPoolFeatureAuthoringProposal,
  type FeatureAuthoringNormalizationResult,
} from "../../adapters/dota2/families/selection-pool/index.js";

function isFeatureAuthoringProposal(value: unknown): value is FeatureAuthoringProposal {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).mode === "source-backed" &&
      typeof (value as Record<string, unknown>).profile === "string" &&
      typeof (value as Record<string, unknown>).objectKind === "string" &&
      typeof (value as Record<string, unknown>).parameters === "object" &&
      typeof (value as Record<string, unknown>).parameterSurface === "object",
  );
}

export type { FeatureAuthoringNormalizationResult } from "../../adapters/dota2/families/selection-pool/index.js";

export function deriveFeatureAuthoringProposal(
  schema: IntentSchema,
): FeatureAuthoringProposal | undefined {
  return isFeatureAuthoringProposal(schema.featureAuthoringProposal)
    ? schema.featureAuthoringProposal
    : undefined;
}

export function normalizeFeatureAuthoringProposal(
  schema: IntentSchema,
  proposal: FeatureAuthoringProposal | undefined,
): FeatureAuthoringNormalizationResult {
  return normalizeSelectionPoolFeatureAuthoringProposal(schema, proposal);
}

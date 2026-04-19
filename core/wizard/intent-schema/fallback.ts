import type { HostDescriptor, IntentSchema } from "../../schema/types.js";
import { collectPromptSemanticHints } from "./prompt-hints.js";
import { buildFallbackIntentSchemaCandidate } from "./fallback-builders.js";
import { normalizeIntentSchema } from "./normalize.js";
import { buildIntentRawFacts } from "./raw-facts.js";
import { DEFAULT_HOST } from "./shared.js";

export function createFallbackIntentSchema(
  rawText: string,
  host: HostDescriptor = DEFAULT_HOST,
): IntentSchema {
  const promptHints = collectPromptSemanticHints(rawText);
  const rawFacts = buildIntentRawFacts({
    candidate: {},
    rawText,
    host,
    promptHints,
  });

  return normalizeIntentSchema(
    buildFallbackIntentSchemaCandidate({
      rawText,
      host,
      rawFacts,
    }),
    rawText,
    host,
  );
}

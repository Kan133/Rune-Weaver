import type { RuneWeaverFeatureRecord } from "../../../../core/workspace/types.js";
import {
  createAdmissionFinding,
  dedupeStrings,
  inferObjectKind,
  looksLikeSelectionPoolPrompt,
  type SelectionPoolDetectionResult,
} from "./shared.js";

export interface DetectSelectionPoolFallbackIntentInput {
  prompt: string;
  mode: "create" | "update" | "regenerate";
  featureId?: string;
  existingFeature?: RuneWeaverFeatureRecord | null;
}

export function detectSelectionPoolFallbackIntent(
  input: DetectSelectionPoolFallbackIntentInput,
): SelectionPoolDetectionResult {
  const promptKind = inferObjectKind(input.prompt, input.existingFeature);
  const normalized = input.prompt.toLowerCase();
  const promptShape = looksLikeSelectionPoolPrompt(input.prompt);
  const updateFamilyCue =
    input.mode !== "create"
    && Boolean(input.featureId?.trim())
    && /(?:selection pool|draw system|draft system|抽取系统|抽卡系统|候选池)/.test(normalized);
  const matchedBy = dedupeStrings([
    promptKind ? `object_kind:${promptKind}` : undefined,
    promptShape ? "prompt_shape" : undefined,
    updateFamilyCue ? "update_family_cue" : undefined,
    input.existingFeature?.featureAuthoring?.profile === "selection_pool" ? "existing_feature_authoring" : undefined,
    input.existingFeature?.sourceModel?.adapter === "selection_pool" ? "existing_source_model" : undefined,
    input.existingFeature?.sourceModel?.adapter === "talent-draw" ? "legacy_source_model" : undefined,
  ]);
  const findings = matchedBy.map((match) =>
    createAdmissionFinding(
      "detection",
      "SELECTION_POOL_DETECTION_MATCH",
      "info",
      `selection_pool detection matched via ${match}.`,
      { metadata: { match } },
    ),
  );

  return {
    handled: matchedBy.length > 0,
    objectKindHint: promptKind,
    matchedBy,
    findings,
  };
}

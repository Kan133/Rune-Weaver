import type { IntentSchema } from "../../../core/schema/types.js";
import {
  listWar3CurrentSliceOpenBindingNotes,
  type War3CurrentSliceHostBindingManifest,
  type War3CurrentSliceIntentBridge,
} from "./current-slice-bridge.js";

type IntentSchemaWithParameters = IntentSchema & {
  parameters?: Record<string, unknown>;
};

export type War3PreBlueprintNormalizationResult = {
  schemaVersion: "war3-pre-blueprint-normalization/current-slice-v1";
  normalizedIntentSchema: IntentSchema;
  review: {
    uiHintDisposition: "feedback-only";
    injectedAssumptions: string[];
    hostBindingManifest: War3CurrentSliceHostBindingManifest;
    openHostBindingNotes: string[];
    sidecarPath: "blueprint.parameters.war3PreBlueprintReview";
  };
  notes: string[];
};

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function isHintOnlySurface(schema: IntentSchema): boolean {
  const surfaces = schema.uiRequirements?.surfaces || [];
  if (surfaces.length !== 1) {
    return false;
  }

  const surface = surfaces[0]?.trim().toLowerCase();
  return surface === "hint" || surface === "提示";
}

export function normalizeWar3CurrentSliceIntentForBlueprint(
  bridge: War3CurrentSliceIntentBridge,
): War3PreBlueprintNormalizationResult {
  const baseSchema = bridge.intentSchema as IntentSchemaWithParameters;
  const notes: string[] = [];
  const openHostBindingNotes = listWar3CurrentSliceOpenBindingNotes(bridge.hostBinding.bindingManifest);
  const unresolvedBindingAssumptions = openHostBindingNotes.map(
    (item) => `[war3-host-binding unresolved] ${item}`,
  );
  const injectedAssumptions = dedupeStrings([
    ...baseSchema.resolvedAssumptions,
    ...unresolvedBindingAssumptions,
  ]);

  const normalizedSchema: IntentSchemaWithParameters = {
    ...baseSchema,
    resolvedAssumptions: injectedAssumptions,
  };

  if (isHintOnlySurface(baseSchema) && !baseSchema.normalizedMechanics.uiModal) {
    normalizedSchema.uiRequirements = {
      needed: false,
      surfaces: [],
      feedbackNeeds: dedupeStrings([
        ...(baseSchema.uiRequirements?.feedbackNeeds || []),
        "timed text hint for entering player",
      ]),
    };
    normalizedSchema.constraints = {
      ...baseSchema.constraints,
      forbiddenPatterns: dedupeStrings([
        ...(baseSchema.constraints.forbiddenPatterns || []),
        "ui.selection_modal",
      ]),
    };
    notes.push(
      "Hint-only feedback is kept out of the generic UI module path so BlueprintBuilder does not widen it into selection_modal.",
    );
  }

  normalizedSchema.parameters = {
    ...(baseSchema.parameters || {}),
    war3PreBlueprintReview: {
      source: "war3-current-slice",
      sliceKind: bridge.sliceKind,
      uiHintDisposition: "feedback-only",
      hint: {
        text: bridge.hostBinding.hint.text,
        durationSeconds: bridge.hostBinding.hint.durationSeconds,
      },
      hostBindingManifest: bridge.hostBinding.bindingManifest,
      openHostBindingNotes,
      hostBindingSchemaVersion: bridge.hostBinding.schemaVersion,
    },
  };

  if (unresolvedBindingAssumptions.length > 0) {
    notes.push("Unresolved War3 host bindings were copied into Blueprint-facing assumptions and sidecar review parameters.");
  }

  return {
    schemaVersion: "war3-pre-blueprint-normalization/current-slice-v1",
    normalizedIntentSchema: normalizedSchema,
    review: {
      uiHintDisposition: "feedback-only",
      injectedAssumptions,
      hostBindingManifest: bridge.hostBinding.bindingManifest,
      openHostBindingNotes,
      sidecarPath: "blueprint.parameters.war3PreBlueprintReview",
    },
    notes,
  };
}

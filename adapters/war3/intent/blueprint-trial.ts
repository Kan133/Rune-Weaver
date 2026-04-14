import { buildBlueprint, validateBlueprint } from "../../../core/blueprint/index.js";
import type { Blueprint, ValidationIssue } from "../../../core/schema/types.js";
import {
  buildWar3CurrentSliceIntentBridge,
  countWar3CurrentSliceOpenBindings,
  type War3CurrentSliceArtifactInput,
  type War3CurrentSliceIntentBridge,
} from "./current-slice-bridge.js";
import {
  normalizeWar3CurrentSliceIntentForBlueprint,
  type War3PreBlueprintNormalizationResult,
} from "./pre-blueprint-normalization.js";

export type War3CurrentSliceBlueprintTrial = {
  schemaVersion: "war3-blueprint-trial/current-slice-v1";
  generatedAt: string;
  bridge: War3CurrentSliceIntentBridge;
  normalization: War3PreBlueprintNormalizationResult;
  blueprint: Blueprint | null;
  buildIssues: ValidationIssue[];
  validation: {
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  } | null;
  driftSignals: string[];
  notes: string[];
};

function collectDriftSignals(
  bridge: War3CurrentSliceIntentBridge,
  normalization: War3PreBlueprintNormalizationResult,
  blueprint: Blueprint | null,
): string[] {
  const signals: string[] = [];

  if (!blueprint) {
    signals.push("Blueprint was not produced, so downstream War3 fit cannot be evaluated.");
    return signals;
  }

  const uiModules = blueprint.modules.filter((module) => module.category === "ui");
  const uiSurfaceTypes = blueprint.uiDesignSpec?.surfaces?.map((surface) => surface.type) || [];
  const uiPatternIds = uiModules.flatMap((module) => module.patternIds || []);
  const blueprintParameters = (blueprint as Blueprint & { parameters?: Record<string, unknown> }).parameters;
  const reviewSidecar = blueprintParameters?.war3PreBlueprintReview as
    | { openHostBindingNotes?: string[]; uiHintDisposition?: string }
    | undefined;

  if (normalization.review.uiHintDisposition === "feedback-only") {
    if (uiPatternIds.includes("ui.selection_modal")) {
      signals.push("Pre-Blueprint normalization marked hint as feedback-only, but Blueprint still emitted ui.selection_modal.");
    }

    if (uiModules.length > 0) {
      signals.push("Pre-Blueprint normalization suppressed standalone UI modules for the current hint slice, but Blueprint still emitted ui modules.");
    }

    if (uiSurfaceTypes.length > 0) {
      signals.push(`Pre-Blueprint normalization expected no standalone UI surfaces, but Blueprint kept surfaces (${uiSurfaceTypes.join(", ")}).`);
    }
  }

  if (countWar3CurrentSliceOpenBindings(bridge.hostBinding.bindingManifest) > 0) {
    const hostBindingMentioned = blueprint.assumptions.some((assumption) =>
      normalization.review.openHostBindingNotes.some((unresolved) => assumption.includes(unresolved)),
    );
    if (!hostBindingMentioned) {
      signals.push("Unresolved War3 host bindings are not propagated into Blueprint assumptions, so the Blueprint surface can look cleaner than the actual slice.");
    }

    if (!reviewSidecar?.openHostBindingNotes?.length) {
      signals.push("Unresolved War3 host bindings are missing from the Blueprint review sidecar.");
    }
  }

  const effectModules = blueprint.modules.filter((module) => module.category === "effect");
  if (effectModules.length === 0) {
    signals.push("Current slice expects an outcome application path, but Blueprint has no effect module.");
  }

  return signals;
}

export function runWar3CurrentSliceBlueprintTrialFromBridge(
  bridge: War3CurrentSliceIntentBridge,
): War3CurrentSliceBlueprintTrial {
  const normalization = normalizeWar3CurrentSliceIntentForBlueprint(bridge);
  const buildResult = buildBlueprint(normalization.normalizedIntentSchema);
  const blueprint = buildResult.success ? buildResult.blueprint || null : null;
  const validationResult = blueprint ? validateBlueprint(blueprint) : null;
  const driftSignals = collectDriftSignals(bridge, normalization, blueprint);

  return {
    schemaVersion: "war3-blueprint-trial/current-slice-v1",
    generatedAt: new Date().toISOString(),
    bridge,
    normalization,
    blueprint,
    buildIssues: buildResult.issues,
    validation: validationResult
      ? {
          valid: validationResult.valid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        }
      : null,
    driftSignals,
    notes: [
      "This is a narrow validation artifact only; it does not claim War3 is integrated into the full core pipeline.",
      "The Blueprint is produced from an adapter-local normalized intent seam, while War3 host-binding remains attached on the side via bridge.hostBinding.",
      "Unresolved War3 host bindings stay visible through normalization.review, Blueprint assumptions, and blueprint.parameters.war3PreBlueprintReview.",
      ...normalization.notes,
    ],
  };
}

export function runWar3CurrentSliceBlueprintTrial(
  artifact: War3CurrentSliceArtifactInput,
): War3CurrentSliceBlueprintTrial {
  const bridge = buildWar3CurrentSliceIntentBridge(artifact);
  return runWar3CurrentSliceBlueprintTrialFromBridge(bridge);
}

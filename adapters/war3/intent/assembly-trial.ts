import { createAssemblyPlan } from "../../../core/pipeline/assembly-plan.js";
import type { AssemblyPlan, Blueprint, ValidationIssue } from "../../../core/schema/types.js";
import {
  runWar3CurrentSliceBlueprintTrial,
  runWar3CurrentSliceBlueprintTrialFromBridge,
  type War3CurrentSliceBlueprintTrial,
} from "./blueprint-trial.js";
import type {
  War3CurrentSliceArtifactInput,
  War3CurrentSliceIntentBridge,
} from "./current-slice-bridge.js";
import {
  buildWar3CurrentSliceAssemblySidecar,
  type War3CurrentSliceAssemblySidecar,
} from "./war3-assembly-sidecar.js";

type BlueprintParametersWithWar3Review = Blueprint["parameters"] & {
  war3PreBlueprintReview?: {
    source?: string;
    sliceKind?: string;
    uiHintDisposition?: string;
    openHostBindingNotes?: string[];
    hostBindingSchemaVersion?: string;
  };
};

type AssemblyParametersWithWar3Review = AssemblyPlan["parameters"] & {
  war3PreBlueprintReview?: {
    source?: string;
    sliceKind?: string;
    uiHintDisposition?: string;
    openHostBindingNotes?: string[];
    hostBindingSchemaVersion?: string;
  };
};

export type War3CurrentSliceAssemblyTrial = {
  schemaVersion: "war3-assembly-trial/current-slice-v1";
  generatedAt: string;
  blueprintTrial: War3CurrentSliceBlueprintTrial;
  sidecar: War3CurrentSliceAssemblySidecar;
  assemblyPlan: AssemblyPlan | null;
  assemblyIssues: ValidationIssue[];
  driftSignals: string[];
  blockers: string[];
  notes: string[];
};

function collectAssemblyDriftSignals(
  blueprintTrial: War3CurrentSliceBlueprintTrial,
  sidecar: War3CurrentSliceAssemblySidecar,
  assemblyPlan: AssemblyPlan | null,
  assemblyIssues: ValidationIssue[],
): string[] {
  const signals: string[] = [];

  if (!blueprintTrial.blueprint) {
    signals.push("Blueprint trial did not produce a Blueprint, so Assembly drift cannot be evaluated.");
    return signals;
  }

  if (!assemblyPlan) {
    signals.push("AssemblyPlan was not produced from the normalized Blueprint.");
    return signals;
  }

  const selectedPatternIds = assemblyPlan.selectedPatterns.map((pattern) => pattern.patternId);
  const uiPatterns = selectedPatternIds.filter((patternId) => patternId.startsWith("ui."));
  const reviewSidecar = (assemblyPlan.parameters as AssemblyParametersWithWar3Review | undefined)
    ?.war3PreBlueprintReview;
  const blueprintReviewSidecar = (blueprintTrial.blueprint.parameters as BlueprintParametersWithWar3Review | undefined)
    ?.war3PreBlueprintReview;

  if (blueprintTrial.normalization.review.uiHintDisposition === "feedback-only") {
    if (selectedPatternIds.includes("ui.selection_modal")) {
      signals.push("Normalized current slice marked hint as feedback-only, but Assembly selected ui.selection_modal.");
    }

    if (uiPatterns.length > 0) {
      signals.push(`Normalized current slice expected no standalone UI patterns, but Assembly selected ${uiPatterns.join(", ")}.`);
    }

    const uiModules = (assemblyPlan.modules || []).filter((module) => module.role === "ui-surface");
    if (uiModules.length > 0) {
      signals.push("Normalized current slice suppressed standalone UI modules, but Assembly still produced ui-surface modules.");
    }

    if ((assemblyPlan.writeTargets || []).some((target) => target.target === "ui")) {
      signals.push("Normalized current slice suppressed standalone UI output, but Assembly still proposed UI write targets.");
    }
  }

  if (selectedPatternIds.some((patternId) => patternId.startsWith("dota2."))) {
    signals.push("Assembly selected dota2.* patterns for a War3 current slice.");
  }

  if (selectedPatternIds.includes("input.key_binding")) {
    signals.push("War3 current slice trigger semantics widened into generic input.key_binding.");
  }

  const hasEffectLikePattern = selectedPatternIds.some(
    (patternId) => patternId.startsWith("effect.") || patternId.startsWith("rule."),
  );
  if (!hasEffectLikePattern) {
    signals.push("Assembly did not retain an effect/rule pattern for the current slice outcome path.");
  }

  if (blueprintTrial.normalization.review.openHostBindingNotes.length > 0) {
    if (!blueprintReviewSidecar?.openHostBindingNotes?.length) {
      signals.push("Normalized Blueprint lost the War3 unresolved host-binding review sidecar before Assembly.");
    }

    if (!reviewSidecar?.openHostBindingNotes?.length) {
      signals.push("AssemblyPlan parameters no longer expose unresolved War3 host binding review context.");
    }
  }

  if ((assemblyPlan.writeTargets || []).some((target) => target.path === `server/${assemblyPlan.blueprintId}.ts`)) {
    signals.push(
      `Assembly proposed generic write target server/${assemblyPlan.blueprintId}.ts instead of a War3-local review target such as ${sidecar.writeTargets[0]?.pathHint}.`,
    );
  }

  const dotaStyleBridgeUpdates = (assemblyPlan.bridgeUpdates || []).filter(
    (update) =>
      update.file.includes("game/scripts/src/modules/index.ts") ||
      update.file.includes("content/panorama/src/hud/script.tsx") ||
      update.file.includes("rune_weaver/index.ts"),
  );
  if (dotaStyleBridgeUpdates.length > 0) {
    signals.push(
      "Assembly emitted Dota2-oriented bridge update actions instead of War3-local review-only bridge update hints.",
    );
  }

  if (assemblyIssues.some((issue) => issue.severity === "error")) {
    signals.push("AssemblyPlan creation produced error-level issues.");
  }

  return signals;
}

function collectAssemblyBlockers(
  blueprintTrial: War3CurrentSliceBlueprintTrial,
  assemblyPlan: AssemblyPlan | null,
  assemblyIssues: ValidationIssue[],
): string[] {
  const blockers: string[] = [];

  blockers.push(...blueprintTrial.driftSignals);
  blockers.push(
    ...assemblyIssues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.code}: ${issue.message}`),
  );

  if (assemblyPlan?.hostWriteReadiness?.blockers?.length) {
    blockers.push(
      ...assemblyPlan.hostWriteReadiness.blockers.map(
        (blocker) => `host-write-readiness: ${blocker}`,
      ),
    );
  }

  return [...new Set(blockers)];
}

export function runWar3CurrentSliceAssemblyTrialFromBlueprintTrial(
  blueprintTrial: War3CurrentSliceBlueprintTrial,
): War3CurrentSliceAssemblyTrial {
  const sidecar = buildWar3CurrentSliceAssemblySidecar(blueprintTrial);
  if (!blueprintTrial.blueprint) {
    return {
      schemaVersion: "war3-assembly-trial/current-slice-v1",
      generatedAt: new Date().toISOString(),
      blueprintTrial,
      sidecar,
      assemblyPlan: null,
      assemblyIssues: [
        {
          code: "WAR3_BLUEPRINT_REQUIRED",
          scope: "assembly",
          severity: "error",
          message: "Assembly trial requires a Blueprint from the normalized Blueprint trial.",
        },
      ],
      driftSignals: [
        "Assembly trial could not start because normalized Blueprint trial did not produce a Blueprint.",
      ],
      blockers: ["No Blueprint available for Assembly trial."],
      notes: [
        "This is an adapter-local validation artifact only; it does not perform host write.",
      ],
    };
  }

  const assemblyResult = createAssemblyPlan(blueprintTrial.blueprint, {
    hostRoot: blueprintTrial.bridge.hostBinding.host.hostRoot,
  });
  const driftSignals = collectAssemblyDriftSignals(
    blueprintTrial,
    sidecar,
    assemblyResult.plan,
    assemblyResult.issues,
  );
  const blockers = collectAssemblyBlockers(
    blueprintTrial,
    assemblyResult.plan,
    assemblyResult.issues,
  );

  return {
    schemaVersion: "war3-assembly-trial/current-slice-v1",
    generatedAt: new Date().toISOString(),
    blueprintTrial,
    sidecar,
    assemblyPlan: assemblyResult.plan,
    assemblyIssues: assemblyResult.issues,
    driftSignals,
    blockers,
    notes: [
      "This is an adapter-local validation artifact only; it does not perform host write.",
      "The trial checks whether normalized War3 current slice intent survives generic AssemblyPlanBuilder without widening trigger semantics, write targets, or bridge updates.",
      "Unresolved War3 host-binding remains visible through sidecar.hostBindingManifest, blueprintTrial.normalization.review, and assemblyPlan.parameters.war3PreBlueprintReview when preserved.",
    ],
  };
}

export function runWar3CurrentSliceAssemblyTrialFromBridge(
  bridge: War3CurrentSliceIntentBridge,
): War3CurrentSliceAssemblyTrial {
  const blueprintTrial = runWar3CurrentSliceBlueprintTrialFromBridge(bridge);
  return runWar3CurrentSliceAssemblyTrialFromBlueprintTrial(blueprintTrial);
}

export function runWar3CurrentSliceAssemblyTrial(
  artifact: War3CurrentSliceArtifactInput,
): War3CurrentSliceAssemblyTrial {
  const blueprintTrial = runWar3CurrentSliceBlueprintTrial(artifact);
  return runWar3CurrentSliceAssemblyTrialFromBlueprintTrial(blueprintTrial);
}

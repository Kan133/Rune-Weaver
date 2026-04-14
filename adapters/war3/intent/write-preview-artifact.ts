import type { War3CurrentSliceAssemblySidecar } from "./war3-assembly-sidecar.js";
import { countWar3CurrentSliceOpenBindings } from "./current-slice-bridge.js";

export type War3WritePreviewArtifact = {
  schemaVersion: "war3-write-preview/current-slice-v1";
  generatedAt: string;
  summary: {
    sliceKind: "mid-zone-shop";
    blueprintId: string;
    targetBindingSymbol: string;
    unresolvedBindingCount: number;
  };
  hostBindingManifest: {
    bindings: War3CurrentSliceAssemblySidecar["hostBindingManifest"]["bindings"];
    openBindingCount: number;
    writeTargets: War3CurrentSliceAssemblySidecar["writeTargets"];
    bridgeUpdates: War3CurrentSliceAssemblySidecar["bridgeUpdates"];
    hostTargetHints: War3CurrentSliceAssemblySidecar["hostTargetHints"];
  };
  skeletonModule: {
    moduleName: string;
    content: string;
  };
  hostTargetReview: {
    schemaVersion: "war3-write-preview-host-target-review/current-slice-v1";
    hints: War3CurrentSliceAssemblySidecar["hostTargetHints"];
    notes: string[];
  };
  hostBindingDraft: War3CurrentSliceAssemblySidecar["hostBindingDraft"];
  tstlHostDraft: {
    schemaVersion: "war3-tstl-host-draft/current-slice-v1";
    bootstrapModule: {
      pathHint: string;
      content: string;
      status: "review-only";
    };
    featureModule: {
      pathHint: string;
      content: string;
      status: "review-only";
    };
    hostBindingReview: {
      pathHint: string;
      status: "review-only";
      notes: string[];
    };
    notes: string[];
  };
  notes: string[];
};

export function buildWar3WritePreviewArtifact(input: {
  sidecar: War3CurrentSliceAssemblySidecar;
  skeletonContent: string;
  tstlBootstrapContent: string;
  tstlFeatureModuleContent: string;
  moduleName?: string;
}): War3WritePreviewArtifact {
  return {
    schemaVersion: "war3-write-preview/current-slice-v1",
    generatedAt: new Date().toISOString(),
    summary: {
      sliceKind: "mid-zone-shop",
      blueprintId: input.sidecar.sourceBlueprintId,
      targetBindingSymbol: input.sidecar.effectSemantics.targetBindingSymbol,
      unresolvedBindingCount: countWar3CurrentSliceOpenBindings(input.sidecar.hostBindingManifest),
    },
    hostBindingManifest: {
      bindings: input.sidecar.hostBindingManifest.bindings,
      openBindingCount: countWar3CurrentSliceOpenBindings(input.sidecar.hostBindingManifest),
      writeTargets: input.sidecar.writeTargets,
      bridgeUpdates: input.sidecar.bridgeUpdates,
      hostTargetHints: input.sidecar.hostTargetHints,
    },
    skeletonModule: {
      moduleName: input.moduleName || "setupMidZoneShop",
      content: input.skeletonContent,
    },
    hostTargetReview: {
      schemaVersion: "war3-write-preview-host-target-review/current-slice-v1",
      hints: input.sidecar.hostTargetHints,
      notes: [
        "These TSTL target hints remain review-only and are not direct write instructions.",
      ],
    },
    hostBindingDraft: input.sidecar.hostBindingDraft,
    tstlHostDraft: {
      schemaVersion: "war3-tstl-host-draft/current-slice-v1",
      bootstrapModule: {
        pathHint: input.sidecar.hostTargetHints.entries.runtimeHook.path,
        content: input.tstlBootstrapContent,
        status: "review-only",
      },
      featureModule: {
        pathHint: input.sidecar.hostTargetHints.entries.featureModule.path,
        content: input.tstlFeatureModuleContent,
        status: "review-only",
      },
      hostBindingReview: {
        pathHint: input.sidecar.hostTargetHints.entries.hostBindingReview.path,
        status: "review-only",
        notes: [...input.sidecar.hostTargetHints.entries.hostBindingReview.notes],
      },
      notes: [
        "These TSTL host drafts are companion review artifacts only.",
        "They align with the current TSTL skeleton seams without claiming direct write readiness.",
        "Use hostBindingDraft to keep slot-level TSTL review semantics explicit beside the generated draft modules.",
      ],
    },
    notes: [
      "This preview artifact is review-oriented and does not claim War3 host write readiness.",
      "Use the hostBindingManifest to keep unresolved runtime wiring visible beside the generated module draft.",
    ],
  };
}

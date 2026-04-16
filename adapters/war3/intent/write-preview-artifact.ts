import { countWar3CurrentSliceOpenBindings } from "./current-slice-bridge.js";
import type { War3CurrentSliceAssemblySidecar } from "./war3-assembly-sidecar.js";
import type { War3ShadowRealizationPlan } from "./shadow-realization-plan.js";
import type { War3ShadowDraftBundle } from "../generator/shadow-draft-bundle.js";

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
      linkedSiteIds: string[];
    };
    featureModule: {
      pathHint: string;
      content: string;
      status: "review-only";
      linkedSiteIds: string[];
    };
    hostBindingReview: {
      pathHint: string;
      status: "review-only";
      linkedSiteIds: string[];
      notes: string[];
    };
    notes: string[];
  };
  notes: string[];
};

export function buildWar3WritePreviewArtifact(input: {
  sidecar: War3CurrentSliceAssemblySidecar;
  shadowRealizationPlan: War3ShadowRealizationPlan;
  shadowDraftBundle: War3ShadowDraftBundle;
  skeletonContent: string;
  moduleName?: string;
}): War3WritePreviewArtifact {
  return {
    schemaVersion: "war3-write-preview/current-slice-v1",
    generatedAt: new Date().toISOString(),
    summary: {
      sliceKind: "mid-zone-shop",
      blueprintId: input.shadowRealizationPlan.sourceBlueprintId,
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
      moduleName:
        input.moduleName || input.shadowRealizationPlan.adapterLocalDraftSeed.generatorInput.moduleName,
      content: input.skeletonContent,
    },
    hostTargetReview: {
      schemaVersion: "war3-write-preview-host-target-review/current-slice-v1",
      hints: input.shadowRealizationPlan.adapterLocalDraftSeed.hostBindingReviewPayload.hostTargetHints,
      notes: [
        "These TSTL target hints remain review-only and are not direct write instructions.",
        "They are threaded from the adapter-local shadow realization plan.",
      ],
    },
    hostBindingDraft: input.sidecar.hostBindingDraft,
    tstlHostDraft: {
      schemaVersion: "war3-tstl-host-draft/current-slice-v1",
      bootstrapModule: {
        pathHint: input.shadowDraftBundle.draftFiles.bootstrap.pathHint,
        content: input.shadowDraftBundle.draftFiles.bootstrap.content,
        status: "review-only",
        linkedSiteIds: [...input.shadowDraftBundle.draftFiles.bootstrap.linkedSiteIds],
      },
      featureModule: {
        pathHint: input.shadowDraftBundle.draftFiles.featureModule.pathHint,
        content: input.shadowDraftBundle.draftFiles.featureModule.content,
        status: "review-only",
        linkedSiteIds: [...input.shadowDraftBundle.draftFiles.featureModule.linkedSiteIds],
      },
      hostBindingReview: {
        pathHint: input.shadowDraftBundle.draftFiles.hostBindingReview.pathHint,
        status: "review-only",
        linkedSiteIds: [...input.shadowDraftBundle.draftFiles.hostBindingReview.linkedSiteIds],
        notes: [...input.shadowDraftBundle.draftFiles.hostBindingReview.notes],
      },
      notes: [
        "These TSTL host drafts are compatibility review artifacts derived from the shadow draft bundle.",
        "They align with the current TSTL skeleton seams without claiming direct write readiness.",
        "Use hostBindingDraft to keep slot-level TSTL review semantics explicit beside the generated draft modules.",
      ],
    },
    notes: [
      "This preview artifact is review-oriented and does not claim War3 host write readiness.",
      "Its TSTL draft surfaces are derived from the adapter-local shadow realization plan and shadow draft bundle.",
    ],
  };
}

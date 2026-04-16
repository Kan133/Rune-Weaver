import type { MidZoneShopSkeletonGeneratorInput } from "../generator/mid-zone-shop-skeleton.js";
import {
  createMidZoneShopSkeletonInputFromAssemblySidecar,
  type War3CurrentSliceAssemblySidecar,
} from "./war3-assembly-sidecar.js";

export type War3ShadowRealizationFileRole =
  | "bootstrap-module"
  | "feature-module"
  | "host-binding-review";

export type War3ShadowConsumedBinding =
  | "runtime-hook"
  | "trigger-area"
  | "shop-target";

export type War3ShadowRealizationClass =
  | "adapter-local-shadow-bootstrap"
  | "adapter-local-shadow-feature-module"
  | "adapter-local-shadow-host-binding-review";

export type War3ShadowSiteKind =
  | "runtime-hook-integration-site"
  | "shop-target-declaration-site"
  | "trigger-area-realization-site"
  | "host-binding-review-surface";

export type War3ShadowSiteContract = {
  siteId: string;
  siteKind: War3ShadowSiteKind;
  ownerUnitId: string;
  fileRole: War3ShadowRealizationFileRole;
  targetPathHint: string;
  supportingTargetPathHints: string[];
  consumedBindings: War3ShadowConsumedBinding[];
  expectedMarkers: string[];
  dependsOnSiteIds: string[];
  reviewStatus: "review-contract-defined";
  unresolvedFacts: string[];
  rationale: string[];
};

export type War3ShadowHostBindingReviewPayload = {
  schemaVersion: "war3-tstl-host-binding-review/current-slice-v1";
  hostBindingManifest: War3CurrentSliceAssemblySidecar["hostBindingManifest"];
  hostBindingDraft: War3CurrentSliceAssemblySidecar["hostBindingDraft"];
  hostTargetHints: War3CurrentSliceAssemblySidecar["hostTargetHints"];
  siteContracts: War3ShadowSiteContract[];
  notes: string[];
};

export type War3ShadowRealizationDraftSeed = {
  generatorInput: MidZoneShopSkeletonGeneratorInput;
  hostBindingReviewPayload: War3ShadowHostBindingReviewPayload;
};

export type War3ShadowRealizationUnit = {
  unitId: string;
  fileRole: War3ShadowRealizationFileRole;
  realizationClass: War3ShadowRealizationClass;
  targetPathHint: string;
  consumedBindings: War3ShadowConsumedBinding[];
  status: "review-only-draft";
  unresolvedFacts: string[];
  rationale: string[];
};

export type War3ShadowRealizationPlan = {
  schemaVersion: "war3-shadow-realization-plan/current-slice-v1";
  generatedAt: string;
  featureId: "setup-mid-zone-shop";
  sourceBlueprintId: string;
  workspaceFlavor: "tstl-skeleton";
  status: "review-only-shadow-path";
  realizationUnits: War3ShadowRealizationUnit[];
  siteContracts: War3ShadowSiteContract[];
  realizedAsDraft: Array<{
    unitId: string;
    fileRole: War3ShadowRealizationFileRole;
    targetPathHint: string;
  }>;
  unresolvedFacts: string[];
  explicitNonGoals: string[];
  adapterLocalDraftSeed: War3ShadowRealizationDraftSeed;
  notes: string[];
};

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function collectOpenBindingNotes(sidecar: War3CurrentSliceAssemblySidecar): string[] {
  return Object.values(sidecar.hostBindingManifest.bindings)
    .filter((binding) => binding.status !== "resolved")
    .map((binding) => binding.note);
}

export function buildWar3ShadowRealizationPlan(
  sidecar: War3CurrentSliceAssemblySidecar,
): War3ShadowRealizationPlan {
  const generatorInput = createMidZoneShopSkeletonInputFromAssemblySidecar(sidecar);
  const openBindingNotes = collectOpenBindingNotes(sidecar);

  const explicitNonGoals = [
    "This shadow path does not connect War3 to shared HostRealizationPlan routing.",
    "This shadow path does not claim War3 is write-ready.",
    "This shadow path does not claim War3 runtime proof or KK 1.29 behavior proof.",
  ];

  const realizationUnits: War3ShadowRealizationUnit[] = [
    {
      unitId: "shadow-runtime-hook-bootstrap",
      fileRole: "bootstrap-module",
      realizationClass: "adapter-local-shadow-bootstrap",
      targetPathHint: sidecar.hostTargetHints.entries.runtimeHook.path,
      consumedBindings: ["runtime-hook"],
      status: "review-only-draft",
      unresolvedFacts: uniqueStrings([
        sidecar.hostBindingDraft.runtimeHook.integrationSite.note,
        "Bootstrap remains a review seam until real host project integration exists.",
      ]),
      rationale: [
        "Current canonical feature needs a visible runtime-hook landing site.",
        "Bootstrap is the narrowest review-oriented host seam in the current TSTL skeleton.",
      ],
    },
    {
      unitId: "shadow-feature-module",
      fileRole: "feature-module",
      realizationClass: "adapter-local-shadow-feature-module",
      targetPathHint: sidecar.hostTargetHints.entries.featureModule.path,
      consumedBindings: ["trigger-area", "shop-target", "runtime-hook"],
      status: "review-only-draft",
      unresolvedFacts: uniqueStrings([
        sidecar.hostBindingDraft.triggerArea.realizationSite.note,
        sidecar.hostBindingDraft.shopTarget.declarationSite.note,
        "Feature module content remains review-only and does not prove runtime behavior.",
      ]),
      rationale: [
        "Current canonical feature needs one bounded feature module review target.",
        "The feature module is the clearest place to keep trigger-area and shop-target draft semantics together.",
      ],
    },
    {
      unitId: "shadow-host-binding-review",
      fileRole: "host-binding-review",
      realizationClass: "adapter-local-shadow-host-binding-review",
      targetPathHint: sidecar.hostTargetHints.entries.hostBindingReview.path,
      consumedBindings: ["runtime-hook", "trigger-area", "shop-target"],
      status: "review-only-draft",
      unresolvedFacts: uniqueStrings([
        ...openBindingNotes,
        "RW-owned JSON review output exists to preserve unresolved facts, not to authorize writes.",
      ]),
      rationale: [
        "Current shadow path needs one RW-owned artifact that keeps unresolved bindings reviewable.",
        "The JSON handoff is bounded, deterministic, and aligned with the current skeleton review lane.",
      ],
    },
  ];

  const siteContracts: War3ShadowSiteContract[] = [
    {
      siteId: "runtime-hook-bootstrap-call-site",
      siteKind: "runtime-hook-integration-site",
      ownerUnitId: "shadow-runtime-hook-bootstrap",
      fileRole: "bootstrap-module",
      targetPathHint: sidecar.hostBindingDraft.runtimeHook.integrationSite.pathHint,
      supportingTargetPathHints: [sidecar.hostBindingDraft.featureModulePathHint],
      consumedBindings: ["runtime-hook"],
      expectedMarkers: [
        'siteId: "runtime-hook-bootstrap-call-site"',
        "bootstrapHost",
        `${generatorInput.moduleName}(context);`,
        `runtimeHookPathHint: ${sidecar.hostBindingDraft.runtimeHook.targetPathHint}`,
        `featureModulePathHint: ${sidecar.hostBindingDraft.featureModulePathHint}`,
      ],
      dependsOnSiteIds: [
        "shop-target-declaration-site",
        "trigger-area-realization-site",
      ],
      reviewStatus: "review-contract-defined",
      unresolvedFacts: uniqueStrings([
        sidecar.hostBindingDraft.runtimeHook.integrationSite.note,
        "A real host lifecycle hook is still unresolved and intentionally omitted from this draft path.",
      ]),
      rationale: [
        "Reviewers need one explicit bootstrap call-site contract instead of only a path hint.",
        "The bootstrap draft is the narrowest adapter-local site that explains how the feature module would be reached.",
      ],
    },
    {
      siteId: "shop-target-declaration-site",
      siteKind: "shop-target-declaration-site",
      ownerUnitId: "shadow-feature-module",
      fileRole: "feature-module",
      targetPathHint: sidecar.hostBindingDraft.shopTarget.declarationSite.pathHint,
      supportingTargetPathHints: [sidecar.hostBindingDraft.hostBindingReviewPathHint],
      consumedBindings: ["shop-target"],
      expectedMarkers: [
        'siteId: "shop-target-declaration-site"',
        `bindingSymbol: "${sidecar.hostBindingDraft.shopTarget.bindingSymbol}"`,
        `declarationSitePathHint: "${sidecar.hostBindingDraft.shopTarget.declarationSite.pathHint}"`,
        `sourceAnchorSemanticName: "${sidecar.hostBindingDraft.shopTarget.sourceAnchorSemanticName}"`,
      ],
      dependsOnSiteIds: [],
      reviewStatus: "review-contract-defined",
      unresolvedFacts: uniqueStrings([
        sidecar.hostBindingDraft.shopTarget.declarationSite.note,
        "The concrete declaration/binding site remains review-only until a host project proves the symbol source.",
      ]),
      rationale: [
        "Shop-target declaration evidence should point at one named declaration site and one expected binding symbol.",
        "The feature module stays the adapter-local declaration review seam for the canonical feature.",
      ],
    },
    {
      siteId: "trigger-area-realization-site",
      siteKind: "trigger-area-realization-site",
      ownerUnitId: "shadow-feature-module",
      fileRole: "feature-module",
      targetPathHint: sidecar.hostBindingDraft.triggerArea.realizationSite.pathHint,
      supportingTargetPathHints: [sidecar.hostBindingDraft.hostBindingReviewPathHint],
      consumedBindings: ["trigger-area"],
      expectedMarkers: [
        'siteId: "trigger-area-realization-site"',
        `sourceAnchorSemanticName: "${sidecar.hostBindingDraft.triggerArea.sourceAnchorSemanticName}"`,
        `realizationSitePathHint: "${sidecar.hostBindingDraft.triggerArea.realizationSite.pathHint}"`,
        '"Rect("',
        '"CreateRegion"',
        '"RegionAddRect"',
        '"TriggerRegisterEnterRegion"',
      ],
      dependsOnSiteIds: [],
      reviewStatus: "review-contract-defined",
      unresolvedFacts: uniqueStrings([
        sidecar.hostBindingDraft.triggerArea.realizationSite.note,
        "Rect/region materialization markers remain declaration-site evidence only, not runtime-proven handles.",
      ]),
      rationale: [
        "Trigger-area realization evidence should name the target site and the expected materialization markers.",
        "The feature module keeps the rect/region review story local to the canonical feature draft.",
      ],
    },
    {
      siteId: "host-binding-review-surface",
      siteKind: "host-binding-review-surface",
      ownerUnitId: "shadow-host-binding-review",
      fileRole: "host-binding-review",
      targetPathHint: sidecar.hostBindingDraft.hostBindingReviewPathHint,
      supportingTargetPathHints: [
        sidecar.hostBindingDraft.runtimeHook.integrationSite.pathHint,
        sidecar.hostBindingDraft.featureModulePathHint,
      ],
      consumedBindings: ["runtime-hook", "trigger-area", "shop-target"],
      expectedMarkers: [
        '"hostBindingDraft"',
        '"siteId": "runtime-hook-bootstrap-call-site"',
        '"siteId": "shop-target-declaration-site"',
        '"siteId": "trigger-area-realization-site"',
      ],
      dependsOnSiteIds: [
        "runtime-hook-bootstrap-call-site",
        "shop-target-declaration-site",
        "trigger-area-realization-site",
      ],
      reviewStatus: "review-contract-defined",
      unresolvedFacts: uniqueStrings([
        ...openBindingNotes,
        "RW-owned host-binding review remains a review surface, not a write authorization artifact.",
      ]),
      rationale: [
        "Reviewers need one RW-owned JSON surface that cross-references the declaration and realization sites.",
        "This keeps adapter-local unresolved facts visible even when downstream consumers only read exported JSON.",
      ],
    },
  ];

  const hostBindingReviewPayload: War3ShadowHostBindingReviewPayload = {
    schemaVersion: "war3-tstl-host-binding-review/current-slice-v1",
    hostBindingManifest: sidecar.hostBindingManifest,
    hostBindingDraft: sidecar.hostBindingDraft,
    hostTargetHints: sidecar.hostTargetHints,
    siteContracts,
    notes: [
      "This file is a review-only host-binding handoff for the TSTL skeleton.",
      "It keeps unresolved adapter-local host facts visible beside the shadow drafts.",
      "The embedded siteContracts list documents declaration-site and realization-site review markers without claiming runtime proof.",
    ],
  };

  return {
    schemaVersion: "war3-shadow-realization-plan/current-slice-v1",
    generatedAt: new Date().toISOString(),
    featureId: "setup-mid-zone-shop",
    sourceBlueprintId: sidecar.sourceBlueprintId,
    workspaceFlavor: "tstl-skeleton",
    status: "review-only-shadow-path",
    realizationUnits,
    siteContracts,
    realizedAsDraft: realizationUnits.map((unit) => ({
      unitId: unit.unitId,
      fileRole: unit.fileRole,
      targetPathHint: unit.targetPathHint,
    })),
    unresolvedFacts: uniqueStrings([
      ...openBindingNotes,
      ...sidecar.hostBindingDraft.notes,
      "KK 1.29 runtime behavior remains unproven.",
      "TypeScript -> TypeScriptToLua -> Lua output remains an authoring seam, not runtime proof.",
    ]),
    explicitNonGoals,
    adapterLocalDraftSeed: {
      generatorInput,
      hostBindingReviewPayload,
    },
    notes: [
      "This is an adapter-local shadow realization plan for the current canonical War3 feature only.",
      "It intentionally mirrors long-term realization vocabulary without claiming shared-core adoption.",
      "siteContracts make declaration-site and realization-site evidence reviewable without widening into shared host realization.",
    ],
  };
}

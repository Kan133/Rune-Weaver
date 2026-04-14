import type { MidZoneShopSkeletonGeneratorInput } from "../generator/index.js";
import type { BridgeUpdate, WriteTarget } from "../../../core/schema/types.js";
import type { War3CurrentSliceBlueprintTrial } from "./blueprint-trial.js";
import {
  countWar3CurrentSliceOpenBindings,
  type War3CurrentSliceHostBindingManifest,
} from "./current-slice-bridge.js";

export type War3LocalAssemblyTriggerSemantics = {
  mode: "area-enter";
  source: "generated-radius";
  playerFilter: "human-player-controlled-only";
  sourceAnchorSemanticName: string;
  centerX: number;
  centerY: number;
  radius: number;
};

export type War3LocalAssemblyWriteTarget = {
  target: WriteTarget["target"];
  pathHint: string;
  status: "review-only";
  rationale: string;
};

export type War3LocalAssemblyBridgeUpdate = {
  target: BridgeUpdate["target"];
  action: "review_only";
  pathHint: string;
  rationale: string;
};

export type War3TstlHostTargetHintEntry = {
  purpose: "runtime-hook" | "feature-module" | "host-binding-review";
  path: string;
  status: "review-only";
  expectedToExistInSkeleton: boolean;
  reviewIntent: string;
  notes: string[];
};

export type War3TstlHostTargetHints = {
  schemaVersion: "war3-tstl-host-target-hints/current-slice-v1";
  workspaceFlavor: "tstl-skeleton";
  entries: {
    runtimeHook: War3TstlHostTargetHintEntry;
    featureModule: War3TstlHostTargetHintEntry;
    hostBindingReview: War3TstlHostTargetHintEntry;
  };
};

export type War3TstlTriggerAreaDraft = {
  kind: "trigger-area";
  status: "review-only";
  triggerAreaMode: "generated-radius";
  sourceAnchorRawId: string;
  sourceAnchorSemanticName: string;
  center: {
    x: number;
    y: number;
    z: number;
  };
  radius: number;
  regionHandleSource: "generated-from-anchor-radius";
  rectMaterialization: "center-radius-bounds";
  realizationSite: {
    pathHint: string;
    siteKind: "feature-module";
    status: "needs-host-project";
    note: string;
  };
};

export type War3TstlShopTargetDraft = {
  kind: "shop-target";
  status: "review-only";
  targetMode: "existing-anchor";
  sourceAnchorRawId: string;
  sourceAnchorSemanticName: string;
  bindingSymbol: string;
  declarationSite: {
    pathHint: string;
    siteKind: "feature-module";
    status: "needs-host-project";
    note: string;
  };
};

export type War3TstlRuntimeHookDraft = {
  kind: "runtime-hook";
  status: "review-only";
  hookKind: "unit-enters-generated-radius-area";
  targetPathHint: string;
  integrationSite: {
    pathHint: string;
    siteKind: "bootstrap-module";
    status: "needs-host-project";
    note: string;
  };
};

export type War3TstlHostBindingDraft = {
  schemaVersion: "war3-tstl-host-binding-draft/current-slice-v1";
  workspaceFlavor: "tstl-skeleton";
  featureModulePathHint: string;
  hostBindingReviewPathHint: string;
  triggerArea: War3TstlTriggerAreaDraft;
  shopTarget: War3TstlShopTargetDraft;
  runtimeHook: War3TstlRuntimeHookDraft;
  notes: string[];
};

export type War3CurrentSliceAssemblySidecar = {
  schemaVersion: "war3-assembly-sidecar/current-slice-v1";
  generatedAt: string;
  sourceBlueprintId: string;
  sourceBridgeSchemaVersion: string;
  triggerSemantics: War3LocalAssemblyTriggerSemantics;
  effectSemantics: {
    mode: "neutral-shop-order-dispatch";
    targetAnchorSemanticName: string;
    targetBindingSymbol: string;
    orderMode: string;
    orderId: number | null;
    hintText: string;
    hintDurationSeconds: number;
  };
  writeTargets: War3LocalAssemblyWriteTarget[];
  bridgeUpdates: War3LocalAssemblyBridgeUpdate[];
  hostTargetHints: War3TstlHostTargetHints;
  hostBindingDraft: War3TstlHostBindingDraft;
  hostBindingManifest: War3CurrentSliceHostBindingManifest;
  notes: string[];
};

export type War3CurrentSliceAssemblySidecarTrial = {
  schemaVersion: "war3-assembly-sidecar-trial/current-slice-v1";
  generatedAt: string;
  sidecar: War3CurrentSliceAssemblySidecar;
  driftSignals: string[];
};

export function buildWar3CurrentSliceAssemblySidecar(
  blueprintTrial: War3CurrentSliceBlueprintTrial,
): War3CurrentSliceAssemblySidecar {
  const bridge = blueprintTrial.bridge;
  const triggerArea = bridge.hostBinding.triggerArea;
  const shopTarget = bridge.hostBinding.shopTarget;

  return {
    schemaVersion: "war3-assembly-sidecar/current-slice-v1",
    generatedAt: new Date().toISOString(),
    sourceBlueprintId: blueprintTrial.blueprint?.id || "blueprint-not-produced",
    sourceBridgeSchemaVersion: bridge.schemaVersion,
    triggerSemantics: {
      mode: "area-enter",
      source: "generated-radius",
      playerFilter: "human-player-controlled-only",
      sourceAnchorSemanticName: triggerArea.sourceAnchorSemanticName,
      centerX: bridge.hostBinding.triggerArea.center.x,
      centerY: bridge.hostBinding.triggerArea.center.y,
      radius: triggerArea.radius,
    },
    effectSemantics: {
      mode: "neutral-shop-order-dispatch",
      targetAnchorSemanticName: shopTarget.sourceAnchorSemanticName,
      targetBindingSymbol: shopTarget.bindingSymbol,
      orderMode: bridge.hostBinding.shopAction.orderMode,
      orderId: bridge.hostBinding.shopAction.orderId,
      hintText: bridge.hostBinding.hint.text,
      hintDurationSeconds: bridge.hostBinding.hint.durationSeconds,
    },
    writeTargets: [
      {
        target: "server",
        pathHint: "war3/current-slice/trigger-entry.ts",
        status: "review-only",
        rationale:
          "Current slice trigger logic should be reviewed as War3 area-entry logic, not a generic server/<id>.ts output.",
      },
      {
        target: "shared",
        pathHint: "war3/current-slice/host-binding-review.json",
        status: "review-only",
        rationale:
          "Unresolved host-binding should stay visible in a review sidecar rather than disappear into generic shared output assumptions.",
      },
    ],
    bridgeUpdates: [
      {
        target: "server",
        action: "review_only",
        pathHint: "war3/current-slice/runtime-hook",
        rationale:
          "Current slice needs a War3-local runtime hook review, not Dota2-oriented bridge injection actions.",
      },
      {
        target: "server",
        action: "review_only",
        pathHint: `war3/current-slice/shop-target/${shopTarget.sourceAnchorSemanticName || "unknown-anchor"}`,
        rationale:
          "Anchored shop target binding remains a War3-local review concern until the host declaration site is validated.",
      },
    ],
    hostTargetHints: {
      schemaVersion: "war3-tstl-host-target-hints/current-slice-v1",
      workspaceFlavor: "tstl-skeleton",
      entries: {
        runtimeHook: {
          purpose: "runtime-hook",
          path: "src/host/bootstrap.ts",
          status: "review-only",
          expectedToExistInSkeleton: true,
          reviewIntent: "Review the TSTL host runtime seam here.",
          notes: [
            "Use this as the preferred TSTL runtime-hook seam for review.",
          ],
        },
        featureModule: {
          purpose: "feature-module",
          path: "src/features/setupMidZoneShop.ts",
          status: "review-only",
          expectedToExistInSkeleton: true,
          reviewIntent: "Review the generated feature draft against the current skeleton module seam here.",
          notes: [
            "Use this as the preferred TSTL feature draft seam for review.",
          ],
        },
        hostBindingReview: {
          purpose: "host-binding-review",
          path: "rune_weaver/generated/host-binding/current-slice.json",
          status: "review-only",
          expectedToExistInSkeleton: false,
          reviewIntent: "Keep unresolved host-binding review output visible as a RW-owned review artifact.",
          notes: [
            "This is a review-oriented RW-owned target and may not already exist in the current skeleton.",
          ],
        },
      },
    },
    hostBindingDraft: {
      schemaVersion: "war3-tstl-host-binding-draft/current-slice-v1",
      workspaceFlavor: "tstl-skeleton",
      featureModulePathHint: "src/features/setupMidZoneShop.ts",
      hostBindingReviewPathHint: "rune_weaver/generated/host-binding/current-slice.json",
      triggerArea: {
        kind: "trigger-area",
        status: "review-only",
        triggerAreaMode: "generated-radius",
        sourceAnchorRawId: triggerArea.sourceAnchorRawId,
        sourceAnchorSemanticName: triggerArea.sourceAnchorSemanticName,
        center: {
          x: bridge.hostBinding.triggerArea.center.x,
          y: bridge.hostBinding.triggerArea.center.y,
          z: bridge.hostBinding.triggerArea.center.z,
        },
        radius: triggerArea.radius,
        regionHandleSource: "generated-from-anchor-radius",
        rectMaterialization: "center-radius-bounds",
        realizationSite: {
          pathHint: "src/features/setupMidZoneShop.ts",
          siteKind: "feature-module",
          status: "needs-host-project",
          note:
            "The feature module is the review seam for rect/region materialization; downstream stages must not claim a concrete generated region handle yet.",
        },
      },
      shopTarget: {
        kind: "shop-target",
        status: "review-only",
        targetMode: "existing-anchor",
        sourceAnchorRawId: shopTarget.sourceAnchorRawId,
        sourceAnchorSemanticName: shopTarget.sourceAnchorSemanticName,
        bindingSymbol: shopTarget.bindingSymbol,
        declarationSite: {
          pathHint: "src/features/setupMidZoneShop.ts",
          siteKind: "feature-module",
          status: "needs-host-project",
          note:
            "The feature module is the review seam for shop target declaration/binding; downstream stages must not invent a declaration site outside the host project.",
        },
      },
      runtimeHook: {
        kind: "runtime-hook",
        status: "review-only",
        hookKind: "unit-enters-generated-radius-area",
        targetPathHint: "src/host/bootstrap.ts",
        integrationSite: {
          pathHint: "src/host/bootstrap.ts",
          siteKind: "bootstrap-module",
          status: "needs-host-project",
          note:
            "Bootstrap remains the review seam for attaching the feature into host runtime; this is not write-ready proof.",
        },
      },
      notes: [
        "This draft narrows the current TSTL implementation seam without claiming runtime proof.",
        "Use these path hints to keep trigger-area, shop-target, and runtime-hook review visible beside the generated drafts.",
      ],
    },
    hostBindingManifest: bridge.hostBinding.bindingManifest,
    notes: [
      "This sidecar is adapter-local and review-only; it does not claim real host write readiness.",
      "It captures how War3 current slice wants to look just before generic AssemblyPlanBuilder would otherwise widen trigger semantics, write targets, and bridge updates.",
    ],
  };
}

export function buildWar3CurrentSliceAssemblySidecarTrial(
  blueprintTrial: War3CurrentSliceBlueprintTrial,
): War3CurrentSliceAssemblySidecarTrial {
  const sidecar = buildWar3CurrentSliceAssemblySidecar(blueprintTrial);
  const driftSignals: string[] = [];

  if (sidecar.writeTargets.some((target) => target.pathHint.startsWith("server/") || target.pathHint.startsWith("ui/"))) {
    driftSignals.push("Sidecar write targets fell back to generic server/ui placeholders.");
  }

  if (sidecar.bridgeUpdates.some((update) => update.pathHint.includes("modules/index.ts") || update.pathHint.includes("hud/script.tsx"))) {
    driftSignals.push("Sidecar bridge updates leaked Dota2-oriented host entry assumptions.");
  }

  if (
    countWar3CurrentSliceOpenBindings(sidecar.hostBindingManifest) !==
    countWar3CurrentSliceOpenBindings(blueprintTrial.bridge.hostBinding.bindingManifest)
  ) {
    driftSignals.push("Structured host-binding manifest did not preserve the same open binding count in the sidecar.");
  }

  return {
    schemaVersion: "war3-assembly-sidecar-trial/current-slice-v1",
    generatedAt: new Date().toISOString(),
    sidecar,
    driftSignals,
  };
}

export function createMidZoneShopSkeletonInputFromAssemblySidecar(
  sidecar: War3CurrentSliceAssemblySidecar,
): MidZoneShopSkeletonGeneratorInput {
  if (sidecar.effectSemantics.orderId === null) {
    throw new Error("Current sidecar requires a concrete orderId for skeleton generation.");
  }

  if (!sidecar.effectSemantics.targetBindingSymbol.trim()) {
    throw new Error("Current sidecar requires a concrete targetBindingSymbol for skeleton generation.");
  }

  return {
    moduleName: "setupMidZoneShop",
    triggerCenterX: sidecar.triggerSemantics.centerX,
    triggerCenterY: sidecar.triggerSemantics.centerY,
    triggerRadius: sidecar.triggerSemantics.radius,
    triggerAreaSourceAnchorSemanticName: sidecar.triggerSemantics.sourceAnchorSemanticName,
    triggerAreaSourceAnchorRawId: sidecar.hostBindingManifest.bindings.triggerArea.sourceAnchorRawId,
    hintText: sidecar.effectSemantics.hintText,
    hintDurationSeconds: sidecar.effectSemantics.hintDurationSeconds,
    shopOrderId: sidecar.effectSemantics.orderId,
    shopTargetSymbol: sidecar.effectSemantics.targetBindingSymbol,
    shopTargetSourceAnchorSemanticName: sidecar.effectSemantics.targetAnchorSemanticName,
    shopTargetSourceAnchorRawId: sidecar.hostBindingManifest.bindings.shopTarget.sourceAnchorRawId,
    runtimeHookPathHint: sidecar.hostBindingDraft.runtimeHook.targetPathHint,
    featureModulePathHint: sidecar.hostBindingDraft.featureModulePathHint,
    hostBindingReviewPathHint: sidecar.hostBindingDraft.hostBindingReviewPathHint,
  };
}

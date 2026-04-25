import type { IntentSchema } from "../../../core/schema/types.js";
import type { MidZoneShopSkeletonGeneratorInput } from "../generator/index.js";

type War3CurrentSliceAnchor = {
  rawId: string;
  semanticName: string;
  role: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
};

type War3CurrentSliceInputs = {
  hintDurationSeconds: number | null;
  explicitHintText: string;
  shopObjectId: string;
  shopUnlockMechanism: string;
  shopTargetMode: string;
  shopTargetSourceId: string;
  shopOrderMode: string;
  shopOrderId: string;
  triggerAreaMode: string;
  triggerAreaSourceId: string;
  triggerAreaRadius: number | null;
};

export type War3CurrentSliceArtifactInput = {
  host: {
    hostKind: "war3-classic";
    platform: "kk";
    warcraftVersion: "1.29";
    scriptMode: "typescript-to-lua";
    jassSupported: false;
    hostRoot: string;
  };
  anchors: War3CurrentSliceAnchor[];
  feature: {
    description: string;
    inputs: War3CurrentSliceInputs;
  };
};

export type War3CurrentSliceHostBinding = {
  schemaVersion: "war3-host-binding/current-slice-v1";
  sliceKind: "mid-zone-shop";
  host: {
    hostKind: "war3-classic";
    platform: "kk";
    warcraftVersion: "1.29";
    scriptMode: "typescript-to-lua";
    jassSupported: false;
    hostRoot: string;
  };
  triggerArea: {
    mode: "generated-radius";
    sourceAnchorRawId: string;
    sourceAnchorSemanticName: string;
    center: {
      x: number;
      y: number;
      z: number;
    };
    radius: number;
    rectMaterialization: "center-radius-bounds";
  };
  playerFilter: {
    mode: "human-player-controlled-only";
  };
  hint: {
    text: string;
    durationSeconds: number;
  };
  shopTarget: {
    mode: "existing-anchor";
    sourceAnchorRawId: string;
    sourceAnchorSemanticName: string;
    bindingSymbol: string;
    shopObjectId?: string;
  };
  shopAction: {
    unlockMechanism: "issue-order" | "unknown";
    orderMode: "neutral-target-order-by-id" | "unknown";
    orderId: number | null;
  };
  bindingManifest: War3CurrentSliceHostBindingManifest;
  notes: string[];
};

export type War3CurrentSliceBindingStatus =
  | "resolved"
  | "explicit-unknown"
  | "needs-host-binding";

export type War3CurrentSliceBindingOwner =
  | "artifact-contract"
  | "runtime-host"
  | "host-project";

export type War3CurrentSliceTriggerAreaBindingSlot = {
  kind: "trigger-area";
  status: War3CurrentSliceBindingStatus;
  owner: War3CurrentSliceBindingOwner;
  triggerAreaMode: "generated-radius";
  sourceAnchorRawId: string;
  sourceAnchorSemanticName: string;
  regionHandleSource: "generated-from-anchor-radius";
  rectMaterialization: "center-radius-bounds";
  realizationSiteStatus: "needs-host-project";
  note: string;
};

export type War3CurrentSliceShopTargetBindingSlot = {
  kind: "shop-target";
  status: War3CurrentSliceBindingStatus;
  owner: War3CurrentSliceBindingOwner;
  targetMode: "existing-anchor";
  sourceAnchorRawId: string;
  sourceAnchorSemanticName: string;
  bindingSymbol: string;
  declarationSiteStatus: "resolved" | "needs-host-project";
  note: string;
};

export type War3CurrentSliceShopActionBindingSlot = {
  kind: "shop-action";
  status: War3CurrentSliceBindingStatus;
  owner: War3CurrentSliceBindingOwner;
  unlockMechanism: "issue-order" | "unknown";
  orderMode: "neutral-target-order-by-id" | "unknown";
  orderId: number | null;
  note: string;
};

export type War3CurrentSliceRuntimeHookBindingSlot = {
  kind: "runtime-hook";
  status: War3CurrentSliceBindingStatus;
  owner: War3CurrentSliceBindingOwner;
  hookKind: "unit-enters-generated-radius-area";
  targetPathHint: string;
  integrationSiteStatus: "needs-host-project";
  note: string;
};

export type War3CurrentSliceHostBindingManifest = {
  schemaVersion: "war3-host-binding-manifest/current-slice-v1";
  bindings: {
    triggerArea: War3CurrentSliceTriggerAreaBindingSlot;
    shopTarget: War3CurrentSliceShopTargetBindingSlot;
    shopAction: War3CurrentSliceShopActionBindingSlot;
    runtimeHook: War3CurrentSliceRuntimeHookBindingSlot;
  };
};

export type War3CurrentSliceIntentBridge = {
  schemaVersion: "war3-intent-bridge/current-slice-v1";
  generatedAt: string;
  sliceKind: "mid-zone-shop";
  intentSchema: IntentSchema;
  hostBinding: War3CurrentSliceHostBinding;
  warnings: string[];
  blockers: string[];
};

function normalizeWhitespace(value: string | undefined): string {
  return (value || "").trim();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function countWar3CurrentSliceOpenBindings(
  manifest: War3CurrentSliceHostBindingManifest,
): number {
  return Object.values(manifest.bindings).filter((binding) => binding.status !== "resolved").length;
}

export function listWar3CurrentSliceOpenBindingNotes(
  manifest: War3CurrentSliceHostBindingManifest,
): string[] {
  return Object.values(manifest.bindings)
    .filter((binding) => binding.status !== "resolved")
    .map((binding) => `${binding.kind}: ${binding.note}`);
}

function resolveTriggerAnchor(
  anchors: War3CurrentSliceAnchor[],
  explicitSourceId: string,
): { anchor: War3CurrentSliceAnchor | null; warnings: string[]; blockers: string[] } {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const sourceId = normalizeWhitespace(explicitSourceId);

  if (sourceId) {
    const explicit = anchors.find((anchor) => anchor.rawId === sourceId || anchor.semanticName === sourceId);
    if (!explicit) {
      blockers.push(`triggerAreaSourceId '${sourceId}' did not resolve to a confirmed anchor.`);
      return { anchor: null, warnings, blockers };
    }

    return { anchor: explicit, warnings, blockers };
  }

  const triggerAnchors = anchors.filter((anchor) => anchor.role === "trigger");
  if (triggerAnchors.length === 1) {
    warnings.push("triggerAreaSourceId is empty; using the single confirmed trigger anchor.");
    return { anchor: triggerAnchors[0], warnings, blockers };
  }

  if (triggerAnchors.length === 0) {
    blockers.push("Current slice requires a confirmed trigger anchor or explicit triggerAreaSourceId.");
    return { anchor: null, warnings, blockers };
  }

  blockers.push("Multiple trigger anchors exist; triggerAreaSourceId must be explicit for current slice.");
  return { anchor: null, warnings, blockers };
}

function resolveShopAnchor(
  anchors: War3CurrentSliceAnchor[],
  sourceId: string,
): { anchor: War3CurrentSliceAnchor | null; blockers: string[] } {
  const normalized = normalizeWhitespace(sourceId);
  if (!normalized) {
    return {
      anchor: null,
      blockers: ["Current slice requires shopTargetSourceId for existing-anchor targeting."],
    };
  }

  const anchor = anchors.find((item) => item.rawId === normalized || item.semanticName === normalized);
  if (!anchor) {
    return {
      anchor: null,
      blockers: [`shopTargetSourceId '${normalized}' did not resolve to a confirmed anchor.`],
    };
  }

  return { anchor, blockers: [] };
}

export function buildWar3CurrentSliceIntentBridge(
  artifact: War3CurrentSliceArtifactInput,
): War3CurrentSliceIntentBridge {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const inputs = artifact.feature?.inputs;

  if (!inputs) {
    throw new Error("Artifact is missing feature inputs.");
  }

  const triggerResolution = resolveTriggerAnchor(artifact.anchors || [], inputs.triggerAreaSourceId);
  warnings.push(...triggerResolution.warnings);
  blockers.push(...triggerResolution.blockers);

  const shopResolution = resolveShopAnchor(artifact.anchors || [], inputs.shopTargetSourceId);
  blockers.push(...shopResolution.blockers);

  if (inputs.triggerAreaMode !== "generated-radius") {
    blockers.push("Current slice only supports triggerAreaMode='generated-radius'.");
  }

  if (!isFiniteNumber(inputs.triggerAreaRadius)) {
    blockers.push("Current slice requires a finite triggerAreaRadius.");
  }

  const hintText = normalizeWhitespace(inputs.explicitHintText);
  if (!hintText) {
    blockers.push("Current slice requires explicitHintText.");
  }

  if (!isFiniteNumber(inputs.hintDurationSeconds)) {
    blockers.push("Current slice requires a finite hintDurationSeconds.");
  }

  if (inputs.shopTargetMode !== "existing-anchor") {
    blockers.push("Current slice only supports shopTargetMode='existing-anchor'.");
  }

  const parsedOrderId = Number(inputs.shopOrderId);
  if (!Number.isFinite(parsedOrderId)) {
    blockers.push("Current slice requires a numeric shopOrderId.");
  }

  const unlockMechanism = inputs.shopUnlockMechanism === "issue-order" ? "issue-order" : "unknown";
  const orderMode =
    inputs.shopOrderMode === "neutral-target-order-by-id"
      ? "neutral-target-order-by-id"
      : "unknown";

  const intentSchema: IntentSchema = {
    version: "1.0",
    host: {
      kind: artifact.host.hostKind,
      projectRoot: artifact.host.hostRoot,
    },
    request: {
      rawPrompt: artifact.feature.description,
      goal: artifact.feature.description,
      nameHint: "war3_mid_zone_shop",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: blockers.length === 0 ? "high" : "medium",
    },
    requirements: {
      functional: [
        "Detect when a player-controlled unit enters the configured mid-area trigger.",
        "Show the explicit hint text for the configured duration.",
        "Apply the shop interaction to the anchored shop target through host-bound order dispatch.",
      ],
      interactions: ["Area entry by player-controlled units"],
      outputs: ["Timed hint feedback", "Shop interaction dispatch"],
    },
    constraints: {
      hostConstraints: [
        "Host is Warcraft III Classic on KK platform.",
        "Runtime is fixed to Warcraft III 1.29.",
        "Script mode is TypeScript to Lua only.",
        "Jass is not supported.",
      ],
      forbiddenPatterns: ["jass", "free host-binding invention"],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["hint"],
      feedbackNeeds: ["timed text hint for entering player"],
    },
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [
      "The current slice is treated as a local area-entry micro-feature.",
      "Player gating is limited to human player-controlled units.",
      "The shop target is an existing anchored object, not a generated runtime proxy.",
    ],
  };

  const hostBinding: War3CurrentSliceHostBinding = {
    schemaVersion: "war3-host-binding/current-slice-v1",
    sliceKind: "mid-zone-shop",
    host: {
      ...artifact.host,
    },
    triggerArea: {
      mode: "generated-radius",
      sourceAnchorRawId: triggerResolution.anchor?.rawId || "",
      sourceAnchorSemanticName: triggerResolution.anchor?.semanticName || "",
      center: {
        x: triggerResolution.anchor?.position.x || 0,
        y: triggerResolution.anchor?.position.y || 0,
        z: triggerResolution.anchor?.position.z || 0,
      },
      radius: isFiniteNumber(inputs.triggerAreaRadius) ? inputs.triggerAreaRadius : 0,
      rectMaterialization: "center-radius-bounds",
    },
    playerFilter: {
      mode: "human-player-controlled-only",
    },
    hint: {
      text: hintText,
      durationSeconds: isFiniteNumber(inputs.hintDurationSeconds) ? inputs.hintDurationSeconds : 0,
    },
    shopTarget: {
      mode: "existing-anchor",
      sourceAnchorRawId: shopResolution.anchor?.rawId || "",
      sourceAnchorSemanticName: shopResolution.anchor?.semanticName || "",
      bindingSymbol: shopResolution.anchor?.semanticName || normalizeWhitespace(inputs.shopTargetSourceId),
      shopObjectId: normalizeWhitespace(inputs.shopObjectId) || undefined,
    },
    shopAction: {
      unlockMechanism,
      orderMode,
      orderId: Number.isFinite(parsedOrderId) ? parsedOrderId : null,
    },
    bindingManifest: {
      schemaVersion: "war3-host-binding-manifest/current-slice-v1",
      bindings: {
        triggerArea: {
          kind: "trigger-area",
          status: "needs-host-binding",
          owner: "host-project",
          triggerAreaMode: "generated-radius",
          sourceAnchorRawId: triggerResolution.anchor?.rawId || "",
          sourceAnchorSemanticName: triggerResolution.anchor?.semanticName || "",
          regionHandleSource: "generated-from-anchor-radius",
          rectMaterialization: "center-radius-bounds",
          realizationSiteStatus: "needs-host-project",
          note:
            "Generated-radius semantics are known, but the concrete rect/region handle still has to be materialized in the War3 host project.",
        },
        shopTarget: {
          kind: "shop-target",
          status: shopResolution.anchor ? "needs-host-binding" : "explicit-unknown",
          owner: "host-project",
          targetMode: "existing-anchor",
          sourceAnchorRawId: shopResolution.anchor?.rawId || "",
          sourceAnchorSemanticName: shopResolution.anchor?.semanticName || "",
          bindingSymbol: shopResolution.anchor?.semanticName || normalizeWhitespace(inputs.shopTargetSourceId),
          declarationSiteStatus: shopResolution.anchor ? "needs-host-project" : "needs-host-project",
          note: shopResolution.anchor
            ? "The anchored shop target is known semantically, but the runtime handle/declaration site remains a host-project concern."
            : "No anchored shop target was resolved; downstream stages must not invent a declaration site.",
        },
        shopAction: {
          kind: "shop-action",
          status: unlockMechanism === "issue-order" && orderMode === "neutral-target-order-by-id"
            ? "resolved"
            : "explicit-unknown",
          owner: unlockMechanism === "issue-order" && orderMode === "neutral-target-order-by-id"
            ? "artifact-contract"
            : "runtime-host",
          unlockMechanism,
          orderMode,
          orderId: Number.isFinite(parsedOrderId) ? parsedOrderId : null,
          note:
            unlockMechanism === "issue-order" && orderMode === "neutral-target-order-by-id"
              ? "Order dispatch mechanism is explicit for the current slice."
              : "Unlock/order dispatch remains explicit-unknown and must not be invented by downstream stages.",
        },
        runtimeHook: {
          kind: "runtime-hook",
          status: "needs-host-binding",
          owner: "host-project",
          hookKind: "unit-enters-generated-radius-area",
          targetPathHint: "war3/current-slice/runtime-hook",
          integrationSiteStatus: "needs-host-project",
          note:
            "The runtime entry hook that watches unit-enter-area events is still a host-project integration responsibility.",
        },
      },
    },
    notes: [
      "This bridge isolates current validated War3 slice meaning from host realization details.",
      "Coordinates stay in host binding; they are not promoted into intent meaning.",
    ],
  };

  if (hostBinding.shopAction.unlockMechanism !== "issue-order") {
    blockers.push("Current skeleton path requires shopUnlockMechanism='issue-order'.");
  }
  if (hostBinding.shopAction.orderMode !== "neutral-target-order-by-id") {
    blockers.push("Current skeleton path requires shopOrderMode='neutral-target-order-by-id'.");
  }

  return {
    schemaVersion: "war3-intent-bridge/current-slice-v1",
    generatedAt: new Date().toISOString(),
    sliceKind: "mid-zone-shop",
    intentSchema,
    hostBinding,
    warnings,
    blockers,
  };
}

export function createMidZoneShopSkeletonInputFromBridge(
  bridge: War3CurrentSliceIntentBridge,
): MidZoneShopSkeletonGeneratorInput {
  if (bridge.blockers.length > 0) {
    throw new Error(`Current slice is not ready for skeleton generation: ${bridge.blockers.join(" | ")}`);
  }

  return {
    moduleName: "setupMidZoneShop",
    triggerCenterX: bridge.hostBinding.triggerArea.center.x,
    triggerCenterY: bridge.hostBinding.triggerArea.center.y,
    triggerRadius: bridge.hostBinding.triggerArea.radius,
    triggerAreaSourceAnchorSemanticName: bridge.hostBinding.triggerArea.sourceAnchorSemanticName,
    triggerAreaSourceAnchorRawId: bridge.hostBinding.triggerArea.sourceAnchorRawId,
    hintText: bridge.hostBinding.hint.text,
    hintDurationSeconds: bridge.hostBinding.hint.durationSeconds,
    shopOrderId: bridge.hostBinding.shopAction.orderId ?? 0,
    shopTargetSymbol: bridge.hostBinding.shopTarget.bindingSymbol,
    shopTargetSourceAnchorSemanticName: bridge.hostBinding.shopTarget.sourceAnchorSemanticName,
    shopTargetSourceAnchorRawId: bridge.hostBinding.shopTarget.sourceAnchorRawId,
    runtimeHookPathHint: "src/host/bootstrap.ts",
    featureModulePathHint: "src/features/setupMidZoneShop.ts",
    hostBindingReviewPathHint: "rune_weaver/generated/host-binding/current-slice.json",
  };
}

export type War3ShopUnlockMechanism =
  | "unknown"
  | "issue-order"
  | "enable-ability"
  | "custom-event";

export type War3ShopTargetMode =
  | "unknown"
  | "existing-anchor"
  | "existing-unit-id"
  | "generated-proxy";

export type War3ShopOrderMode =
  | "unknown"
  | "target-order-by-id"
  | "neutral-target-order-by-id"
  | "neutral-immediate-order-by-id";

export type War3TriggerAreaMode =
  | "unknown"
  | "existing-region"
  | "generated-rect"
  | "generated-radius";

export interface War3MidZoneShopSliceArtifactLike {
  schemaVersion?: string;
  host: {
    hostKind: "war3-classic";
    platform: "kk";
    warcraftVersion: "1.29";
    scriptMode: "typescript-to-lua";
    jassSupported: false;
    hostRoot: string;
  };
  anchors: Array<{
    semanticName: string;
    rawId: string;
    label: string;
    role: string;
    regionHint: string;
    owner?: number;
  }>;
  feature: {
    description: string;
    inputs: {
      shopUnlockMechanism: War3ShopUnlockMechanism;
      targetPlayers: string;
      hintDurationSeconds: number | null;
      explicitHintText: string;
      shopObjectId: string;
      shopTargetMode: War3ShopTargetMode;
      shopTargetSourceId: string;
      shopOrderMode: War3ShopOrderMode;
      shopOrderId: string;
      triggerAreaMode: War3TriggerAreaMode;
      triggerAreaSourceId: string;
      triggerAreaRadius: number | null;
      triggerAreaWidth: number | null;
      triggerAreaHeight: number | null;
    };
  };
}

export interface War3AnchorReference {
  rawId: string;
  semanticName: string;
  label: string;
  role: string;
  regionHint: string;
  owner?: number;
}

export interface War3ExplicitHostBinding<TKnown> {
  known: TKnown;
  unresolved: string[];
}

export interface War3MidZoneShopIntentLikeMeaning {
  sliceKind: "war3-mid-zone-shop";
  intentKind: "micro-feature";
  goal: string;
  normalizedMechanics: {
    trigger: true;
    outcomeApplication: true;
    uiModal: false;
  };
  playerFacingHint: {
    text: string;
    durationSeconds: number | null;
  };
  triggerArea: {
    shape: "region" | "rect" | "radius" | "unknown";
    source: "generated" | "existing" | "unknown";
  };
  shopUnlock: {
    mechanism: War3ShopUnlockMechanism;
    operation: "unlock-shop";
    targetKind: "anchored-shop";
    executionStyle: "in-order";
    targetPlayers: string;
  };
  openQuestions: string[];
}

export interface War3MidZoneShopHostBindingPayload {
  host: War3MidZoneShopSliceArtifactLike["host"];
  triggerAreaBinding: War3ExplicitHostBinding<{
    mode: War3TriggerAreaMode;
    sourceId: string;
    radius: number | null;
    width: number | null;
    height: number | null;
  }>;
  shopTargetBinding: War3ExplicitHostBinding<{
    mode: War3ShopTargetMode;
    sourceId: string;
    shopObjectId: string;
    anchorRef: War3AnchorReference | null;
  }>;
  orderDispatchBinding: War3ExplicitHostBinding<{
    mechanism: War3ShopUnlockMechanism;
    orderMode: War3ShopOrderMode;
    orderId: string;
  }>;
}

export interface War3MidZoneShopBridgeArtifact {
  schemaVersion: "war3-bridge/mid-zone-shop/v1";
  sourceSchemaVersion?: string;
  meaning: War3MidZoneShopIntentLikeMeaning;
  hostBinding: War3MidZoneShopHostBindingPayload;
}

function findAnchorRef(
  artifact: War3MidZoneShopSliceArtifactLike,
  rawId: string,
): War3AnchorReference | null {
  const match = artifact.anchors.find((anchor) => anchor.rawId === rawId);
  if (!match) {
    return null;
  }

  return {
    rawId: match.rawId,
    semanticName: match.semanticName,
    label: match.label,
    role: match.role,
    regionHint: match.regionHint,
    owner: match.owner,
  };
}

function toTriggerAreaShape(
  mode: War3TriggerAreaMode,
): War3MidZoneShopIntentLikeMeaning["triggerArea"]["shape"] {
  if (mode === "existing-region") {
    return "region";
  }
  if (mode === "generated-rect") {
    return "rect";
  }
  if (mode === "generated-radius") {
    return "radius";
  }
  return "unknown";
}

function toTriggerAreaSource(
  mode: War3TriggerAreaMode,
): War3MidZoneShopIntentLikeMeaning["triggerArea"]["source"] {
  if (mode === "existing-region") {
    return "existing";
  }
  if (mode === "generated-rect" || mode === "generated-radius") {
    return "generated";
  }
  return "unknown";
}

function collectMeaningOpenQuestions(
  artifact: War3MidZoneShopSliceArtifactLike,
): string[] {
  const questions: string[] = [];
  const inputs = artifact.feature.inputs;

  if (!inputs.explicitHintText.trim()) {
    questions.push("Player-facing hint text is still unspecified.");
  }
  if (inputs.hintDurationSeconds === null) {
    questions.push("Hint duration is still unspecified.");
  }
  if (inputs.targetPlayers.trim().length === 0) {
    questions.push("Target player scope is still unspecified.");
  }

  return questions;
}

function buildTriggerAreaBinding(
  artifact: War3MidZoneShopSliceArtifactLike,
): War3MidZoneShopHostBindingPayload["triggerAreaBinding"] {
  const inputs = artifact.feature.inputs;
  const unresolved: string[] = [];

  if (inputs.triggerAreaMode === "generated-radius") {
    unresolved.push(
      "Generated radius area still needs host-side materialization in War3 trigger/region data.",
    );
  } else if (inputs.triggerAreaMode === "generated-rect") {
    unresolved.push(
      "Generated rect area still needs host-side materialization in War3 trigger/region data.",
    );
  } else if (inputs.triggerAreaMode === "existing-region") {
    unresolved.push(
      "Existing region source still needs runtime-safe resolution to a concrete host region handle.",
    );
  } else {
    unresolved.push("Trigger area binding mode is still unknown.");
  }

  return {
    known: {
      mode: inputs.triggerAreaMode,
      sourceId: inputs.triggerAreaSourceId,
      radius: inputs.triggerAreaRadius,
      width: inputs.triggerAreaWidth,
      height: inputs.triggerAreaHeight,
    },
    unresolved,
  };
}

function buildShopTargetBinding(
  artifact: War3MidZoneShopSliceArtifactLike,
): War3MidZoneShopHostBindingPayload["shopTargetBinding"] {
  const inputs = artifact.feature.inputs;
  const anchorRef = inputs.shopTargetSourceId
    ? findAnchorRef(artifact, inputs.shopTargetSourceId)
    : null;
  const unresolved: string[] = [];

  if (inputs.shopTargetMode === "existing-anchor") {
    unresolved.push(
      "Existing anchor still needs host-specific resolution to the actual shop unit/handle.",
    );
  } else if (inputs.shopTargetMode === "existing-unit-id") {
    unresolved.push(
      "Existing unit id still needs validation against a concrete War3 host object reference.",
    );
  } else if (inputs.shopTargetMode === "generated-proxy") {
    unresolved.push(
      "Generated proxy target is not yet materialized for the current validated slice.",
    );
  } else {
    unresolved.push("Shop target binding mode is still unknown.");
  }

  if (inputs.shopTargetSourceId && !anchorRef) {
    unresolved.push("Referenced shop target source id does not resolve to a known intake anchor.");
  }

  return {
    known: {
      mode: inputs.shopTargetMode,
      sourceId: inputs.shopTargetSourceId,
      shopObjectId: inputs.shopObjectId,
      anchorRef,
    },
    unresolved,
  };
}

function buildOrderDispatchBinding(
  artifact: War3MidZoneShopSliceArtifactLike,
): War3MidZoneShopHostBindingPayload["orderDispatchBinding"] {
  const inputs = artifact.feature.inputs;
  const unresolved: string[] = [];

  if (inputs.shopOrderMode === "unknown") {
    unresolved.push("Order dispatch mode is still unknown.");
  } else {
    unresolved.push(
      "Concrete War3 dispatch wiring remains unresolved and must stay explicit at host-binding time.",
    );
  }

  if (!inputs.shopOrderId.trim()) {
    unresolved.push("Order id is still unspecified.");
  } else {
    unresolved.push(
      "Current order id must remain a host fact, not promoted into portable intent meaning.",
    );
  }

  if (inputs.shopUnlockMechanism === "unknown") {
    unresolved.push("Shop unlock mechanism is still unknown.");
  }

  return {
    known: {
      mechanism: inputs.shopUnlockMechanism,
      orderMode: inputs.shopOrderMode,
      orderId: inputs.shopOrderId,
    },
    unresolved,
  };
}

export function deriveWar3MidZoneShopBridgeArtifact(
  artifact: War3MidZoneShopSliceArtifactLike,
): War3MidZoneShopBridgeArtifact {
  const inputs = artifact.feature.inputs;

  return {
    schemaVersion: "war3-bridge/mid-zone-shop/v1",
    sourceSchemaVersion: artifact.schemaVersion,
    meaning: {
      sliceKind: "war3-mid-zone-shop",
      intentKind: "micro-feature",
      goal:
        artifact.feature.description.trim() ||
        "Show a timed hint, then unlock an anchored shop through an ordered action.",
      normalizedMechanics: {
        trigger: true,
        outcomeApplication: true,
        uiModal: false,
      },
      playerFacingHint: {
        text: inputs.explicitHintText,
        durationSeconds: inputs.hintDurationSeconds,
      },
      triggerArea: {
        shape: toTriggerAreaShape(inputs.triggerAreaMode),
        source: toTriggerAreaSource(inputs.triggerAreaMode),
      },
      shopUnlock: {
        mechanism: inputs.shopUnlockMechanism,
        operation: "unlock-shop",
        targetKind: "anchored-shop",
        executionStyle: "in-order",
        targetPlayers: inputs.targetPlayers,
      },
      openQuestions: collectMeaningOpenQuestions(artifact),
    },
    hostBinding: {
      host: artifact.host,
      triggerAreaBinding: buildTriggerAreaBinding(artifact),
      shopTargetBinding: buildShopTargetBinding(artifact),
      orderDispatchBinding: buildOrderDispatchBinding(artifact),
    },
  };
}

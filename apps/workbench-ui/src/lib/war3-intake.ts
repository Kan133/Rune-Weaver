export interface CanvasHintDTO {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface MapSummaryDTO {
  formatVersion?: number;
  mapVersion?: number;
  editorVersion?: number;
  gameVersion?: {
    major: number;
    minor: number;
    patch: number;
    build: number;
  };
  name?: string;
  author?: string;
  description?: string;
  suggestedPlayers?: string;
  playableWidth?: number;
  playableHeight?: number;
  tileset?: string;
  scriptType?: number;
  playersCount?: number;
}

export interface ConfirmedArtifactItem {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: "unit" | "doodad" | "manual";
  regionHint: string;
  label: string;
  reason: string;
  owner?: number;
  semanticName: string;
  confirmed: boolean;
  anchorRole?: string;
  roleLabel?: string;
}

export type War3TriggerAreaMode =
  | "unknown"
  | "existing-region"
  | "generated-rect"
  | "generated-radius";

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

export interface War3IntakeArtifact {
  schemaVersion: "war3-intake/v1";
  generatedAt: string;
  host: {
    hostKind: "war3-classic";
    platform: "kk";
    warcraftVersion: "1.29";
    scriptMode: "typescript-to-lua";
    jassSupported: false;
    hostRoot: string;
  };
  map: {
    canvasHint: CanvasHintDTO | null;
    summary: MapSummaryDTO | null;
  };
  anchors: Array<{
    order: number;
    semanticName: string;
    source: "unit" | "doodad" | "manual";
    rawId: string;
    label: string;
    role: string;
    regionHint: string;
    position: {
      x: number;
      y: number;
      z: number;
    };
    owner?: number;
    reason: string;
  }>;
  feature: {
    description: string;
    contextDraft: string;
    finalHandoffPrompt: string;
    inputs: {
      shopInteractionMode: string;
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
  workbench: {
    confirmedCount: number;
    issueCount: number;
    issues: string[];
  };
}

function toRoleLabel(item: ConfirmedArtifactItem): string {
  if (item.anchorRole === "custom" && item.roleLabel?.trim()) {
    return item.roleLabel.trim();
  }

  return item.anchorRole?.trim() || "poi";
}

function normalizeRegionHint(regionHint: string): string {
  const normalized = regionHint.trim().toLowerCase();
  const regionMap: Record<string, string> = {
    "top-left": "northwest",
    "top-center": "north",
    "top-right": "northeast",
    "middle-left": "west",
    "middle-center": "center",
    "middle-right": "east",
    "bottom-left": "southwest",
    "bottom-center": "south",
    "bottom-right": "southeast",
  };

  return regionMap[normalized] || normalized;
}

function normalizeTriggerAreaMode(value: string): War3TriggerAreaMode {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "existing-region" ||
    normalized === "generated-rect" ||
    normalized === "generated-radius"
  ) {
    return normalized;
  }

  return "unknown";
}

function normalizeShopUnlockMechanism(value: string): War3ShopUnlockMechanism {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "issue-order" ||
    normalized === "enable-ability" ||
    normalized === "custom-event"
  ) {
    return normalized;
  }

  return "unknown";
}

function normalizeShopTargetMode(value: string): War3ShopTargetMode {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "existing-anchor" ||
    normalized === "existing-unit-id" ||
    normalized === "generated-proxy"
  ) {
    return normalized;
  }

  return "unknown";
}

function normalizeShopOrderMode(value: string): War3ShopOrderMode {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "target-order-by-id" ||
    normalized === "neutral-target-order-by-id" ||
    normalized === "neutral-immediate-order-by-id"
  ) {
    return normalized;
  }

  return "unknown";
}

export function buildWar3IntakeArtifact(input: {
  hostRoot: string;
  canvasHint: CanvasHintDTO | null;
  mapSummary: MapSummaryDTO | null;
  confirmedItems: ConfirmedArtifactItem[];
  featureDescription: string;
  contextDraft: string;
  finalHandoffPrompt: string;
  shopInteractionMode: string;
  shopUnlockMechanism: string;
  targetPlayers: string;
  hintDurationSeconds: number | null;
  explicitHintText: string;
  shopObjectId: string;
  shopTargetMode: string;
  shopTargetSourceId: string;
  shopOrderMode: string;
  shopOrderId: string;
  triggerAreaMode: War3TriggerAreaMode;
  triggerAreaSourceId: string;
  triggerAreaRadius: number | null;
  triggerAreaWidth: number | null;
  triggerAreaHeight: number | null;
  issues: string[];
}): War3IntakeArtifact {
  return {
    schemaVersion: "war3-intake/v1",
    generatedAt: new Date().toISOString(),
    host: {
      hostKind: "war3-classic",
      platform: "kk",
      warcraftVersion: "1.29",
      scriptMode: "typescript-to-lua",
      jassSupported: false,
      hostRoot: input.hostRoot,
    },
    map: {
      canvasHint: input.canvasHint,
      summary: input.mapSummary,
    },
    anchors: input.confirmedItems.map((item, index) => ({
      order: index + 1,
      semanticName: item.semanticName.trim() || item.label || item.id,
      source: item.kind === "manual" ? "manual" : item.kind,
      rawId: item.id,
      label: item.label,
      role: toRoleLabel(item),
      regionHint: normalizeRegionHint(item.regionHint),
      position: {
        x: item.x,
        y: item.y,
        z: item.z,
      },
      owner: item.owner,
      reason: item.reason,
    })),
    feature: {
      description: input.featureDescription.trim(),
      contextDraft: input.contextDraft,
      finalHandoffPrompt: input.finalHandoffPrompt,
      inputs: {
        shopInteractionMode: input.shopInteractionMode.trim(),
        shopUnlockMechanism: normalizeShopUnlockMechanism(input.shopUnlockMechanism),
        targetPlayers: input.targetPlayers.trim(),
        hintDurationSeconds: input.hintDurationSeconds,
        explicitHintText: input.explicitHintText.trim(),
        shopObjectId: input.shopObjectId.trim(),
        shopTargetMode: normalizeShopTargetMode(input.shopTargetMode),
        shopTargetSourceId: input.shopTargetSourceId.trim(),
        shopOrderMode: normalizeShopOrderMode(input.shopOrderMode),
        shopOrderId: input.shopOrderId.trim(),
        triggerAreaMode: normalizeTriggerAreaMode(input.triggerAreaMode),
        triggerAreaSourceId: input.triggerAreaSourceId.trim(),
        triggerAreaRadius: input.triggerAreaRadius,
        triggerAreaWidth: input.triggerAreaWidth,
        triggerAreaHeight: input.triggerAreaHeight,
      },
    },
    workbench: {
      confirmedCount: input.confirmedItems.length,
      issueCount: input.issues.length,
      issues: input.issues,
    },
  };
}

/**
 * Selection Modal Component Generator
 */

import { WritePlanEntry } from "../../assembler/index.js";

// Dota2 gap-fill boundary anchors.
export const SELECTION_MODAL_GAP_FILL_BOUNDARIES = {
  payloadAdapter: {
    id: "ui.selection_modal.payload_adapter",
    allowed: ["item_normalization", "placeholder_padding", "defensive_fallback_values", "card_presentation_formatting"],
    forbidden: ["root_mount_changes", "transport_event_changes", "less_wiring_changes"],
  },
} as const;

export interface SelectionModalParams {
  choiceCount?: number;
  objectKind?: "talent" | "equipment" | "skill_card_placeholder";
  minDisplayCount?: number;
  placeholderConfig?: {
    id: string;
    name: string;
    description?: string;
    disabled?: boolean;
  };
  payloadShape?: "simple_text" | "card" | "card_with_rarity";
  title?: string;
  description?: string;
  dismissBehavior?: "selection_only" | "manual" | "auto";
  layoutPreset?: "card_tray";
  selectionMode?: "single";
  inventory?: {
    enabled: boolean;
    capacity: number;
    storeSelectedItems: boolean;
    blockDrawWhenFull: boolean;
    fullMessage: string;
    presentation: "persistent_panel";
  };
  inventoryTitle?: string;
}

function resolveLayoutPreset(value: unknown): "card_tray" {
  if (value === undefined || value === null || value === "card_tray") {
    return "card_tray";
  }

  throw new Error(
    `ui.selection_modal currently only supports layoutPreset "card_tray"; received ${JSON.stringify(value)}`,
  );
}

function resolveSelectionMode(value: unknown): "single" {
  if (value === undefined || value === null || value === "single") {
    return "single";
  }

  throw new Error(
    `ui.selection_modal currently only supports selectionMode "single"; received ${JSON.stringify(value)}`,
  );
}

function resolveChoiceCount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return 1;
  }
  return Math.max(1, Math.floor(numeric));
}

export function generateSelectionModalComponent(
  componentName: string,
  featureId: string,
  entry: WritePlanEntry,
): string {
  const params = (entry.parameters || {}) as SelectionModalParams;
  const choiceCount = resolveChoiceCount(params.choiceCount);
  const minDisplayCount = Math.max(choiceCount, resolveChoiceCount(params.minDisplayCount ?? choiceCount));
  const payloadShape = params.payloadShape || "card";
  const title = params.title || "Choose Your Selection";
  const description = params.description || "Select one of the following options";
  const dismissBehavior = params.dismissBehavior || "selection_only";
  const layoutPreset = resolveLayoutPreset(params.layoutPreset);
  const selectionMode = resolveSelectionMode(params.selectionMode);
  const inventory = params.inventory;
  const hasInventory = inventory?.enabled === true;
  const inventoryCapacity = hasInventory ? Math.max(1, Math.floor(inventory?.capacity || 15)) : 0;
  const inventoryFullMessage =
    hasInventory && inventory?.fullMessage ? inventory.fullMessage : "Selection inventory full";
  const inventoryPresentation =
    hasInventory && inventory?.presentation ? inventory.presentation : "persistent_panel";
  const inventoryTitle = params.inventoryTitle || "Selection Inventory";
  const hasPlaceholderSupport = minDisplayCount > 0 && params.placeholderConfig !== undefined;
  const cssBaseName = entry.targetPath.split("/").pop()?.replace(".tsx", "").toLowerCase() || componentName.toLowerCase();

  const placeholderConfigCode = hasPlaceholderSupport
    ? `
  const placeholderConfig = {
    id: "${params.placeholderConfig!.id}",
    name: "${params.placeholderConfig!.name}",
    description: ${params.placeholderConfig!.description ? `"${params.placeholderConfig!.description}"` : "undefined"},
    disabled: ${params.placeholderConfig!.disabled !== undefined ? params.placeholderConfig!.disabled : true}
  };
  const minDisplayCount = ${minDisplayCount};
`
    : "";

  const inventoryConfigCode = hasInventory
    ? `
  const inventoryEnabled = true;
  const inventoryCapacity = ${inventoryCapacity};
  const inventoryFullMessage = "${inventoryFullMessage}";
  const inventoryPresentation = "${inventoryPresentation}";
  const inventoryTitle = "${inventoryTitle}";
`
    : `
  const inventoryEnabled = false;
  const inventoryCapacity = 0;
  const inventoryFullMessage = "Selection inventory full";
  const inventoryPresentation = "persistent_panel";
  const inventoryTitle = "Selection Inventory";
`;

  const placeholderPaddingLogic = hasPlaceholderSupport
    ? `
  const padWithPlaceholders = (sourceItems: SelectionItem[]): SelectionItem[] => {
    if (sourceItems.length >= minDisplayCount) {
      return sourceItems;
    }

    const paddedItems = [...sourceItems];
    const placeholderCount = minDisplayCount - sourceItems.length;
    for (let index = 0; index < placeholderCount; index++) {
      paddedItems.push({
        id: \`\${placeholderConfig.id}_\${index}\`,
        name: placeholderConfig.name,
        description: placeholderConfig.description,
        disabled: placeholderConfig.disabled,
        isPlaceholder: true,
      });
    }
    return paddedItems;
  };
`
    : "";

  return `/**
 * ${componentName}
 * Generated selection modal
 *
 * Features:
 * - choiceCount: ${choiceCount}
 * - payloadShape: "${payloadShape}"
 * - dismissBehavior: "${dismissBehavior}"
 * - layoutPreset: "${layoutPreset}"
 * - selectionMode: "${selectionMode}"
 * ${hasPlaceholderSupport ? `- minDisplayCount: ${minDisplayCount}` : ""}
 * ${hasInventory ? `- inventory: ${inventoryPresentation} (${inventoryCapacity} slots)` : ""}
 */

import React, { useEffect, useRef, useState } from "react";

interface SelectionItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tier?: string;
  rarity?: string;
  disabled?: boolean;
  isPlaceholder?: boolean;
}

interface InventoryPayload {
  enabled?: boolean;
  capacity?: number;
  items?: unknown;
  isFull?: boolean;
  fullMessage?: string;
  presentation?: string;
}

interface ${componentName}Props {
  items?: SelectionItem[];
  title?: string;
  description?: string;
  onSelect?: (index: number) => void;
  onConfirm?: () => void;
  onDismiss?: () => void;
  visible?: boolean;
}

export function ${componentName}(props: ${componentName}Props) {
  const {
    items,
    title = "${title}",
    description = "${description}",
    onSelect,
    onConfirm,
    onDismiss,
    visible = false,
  } = props;

  const featureId = "${featureId}";
  const sendCustomEvent = (eventName: string, payload: Record<string, unknown>) => {
    (GameEvents.SendCustomGameEventToServer as any)(eventName, payload);
  };
${placeholderConfigCode}${inventoryConfigCode}
  // GAP_FILL_BOUNDARY: ui.selection_modal.payload_adapter
  // Allowed: item normalization, placeholder padding, defensive fallback values, card presentation formatting.
  // Forbidden: root mount changes, transport event changes, LESS/HUD wiring changes.
  const normalizeSelectionItems = (rawItems?: unknown): SelectionItem[] => {
    if (rawItems === undefined || rawItems === null) {
      return [];
    }

    const itemsArray: unknown[] = Array.isArray(rawItems) ? rawItems : Object.values(rawItems ?? {});

    return itemsArray
      .filter((item): item is Record<string, unknown> => {
        return item !== null && item !== undefined && typeof item === "object";
      })
      .map((item, index): SelectionItem => {
        const rarityValue = item.rarity ?? item.tier;
        const tierValue = item.tier ?? item.rarity;
        return {
          id: typeof item.id === "string" ? item.id : typeof item.id === "number" ? String(item.id) : \`unknown_\${index}\`,
          name: typeof item.name === "string" ? item.name : "Unknown",
          description: typeof item.description === "string" ? item.description : undefined,
          icon: typeof item.icon === "string" ? item.icon : undefined,
          tier: typeof tierValue === "string" ? tierValue : undefined,
          rarity: typeof rarityValue === "string" ? rarityValue : undefined,
          disabled: typeof item.disabled === "boolean" ? item.disabled : false,
          isPlaceholder: typeof item.isPlaceholder === "boolean" ? item.isPlaceholder : false,
        };
      });
  };

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isVisible, setIsVisible] = useState(visible);
  const [modalItems, setModalItems] = useState<SelectionItem[]>(() => normalizeSelectionItems(items));
  const [modalTitle, setModalTitle] = useState(title);
  const [modalDescription, setModalDescription] = useState(description);
  const [inventoryItems, setInventoryItems] = useState<SelectionItem[]>([]);
  const [inventoryIsFull, setInventoryIsFull] = useState(false);

  const titleRef = useRef(title);
  const descriptionRef = useRef(description);
  const featureIdRef = useRef(featureId);

  useEffect(() => {
    titleRef.current = title;
    descriptionRef.current = description;
    featureIdRef.current = featureId;
  });

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  useEffect(() => {
    setModalItems(normalizeSelectionItems(items));
  }, [items]);

  useEffect(() => {
    setModalTitle(title);
  }, [title]);

  useEffect(() => {
    setModalDescription(description);
  }, [description]);

${hasInventory ? `
  const applyInventoryPayload = (payload?: InventoryPayload) => {
    if (!inventoryEnabled || !payload) {
      return;
    }

    const normalizedItems = normalizeSelectionItems(payload.items);
    setInventoryItems(normalizedItems.slice(0, inventoryCapacity));
    setInventoryIsFull(payload.isFull === true || normalizedItems.length >= inventoryCapacity);
  };
` : ""}  useEffect(() => {
    console.log("[Rune Weaver] ${componentName} mounted for feature ${featureId}");

    const showSelectionSub = GameEvents.Subscribe("rune_weaver_show_selection", (data: {
      featureId?: string;
      options?: unknown;
      title?: string;
      description?: string;
      inventory?: InventoryPayload;
    }) => {
      if (data.featureId && data.featureId !== featureIdRef.current) {
        return;
      }

      const normalizedItems = normalizeSelectionItems(data.options);
      console.log(\`[Rune Weaver] ${componentName} received selection event: options=\${normalizedItems.length}\`);
      setModalItems(normalizedItems);
      setModalTitle(data.title || titleRef.current);
      setModalDescription(data.description || descriptionRef.current);
      setSelectedIndex(-1);
      setIsVisible(true);
${hasInventory ? "      applyInventoryPayload(data.inventory);\n" : ""}    });

${hasInventory ? `
    const inventorySub = GameEvents.Subscribe("rune_weaver_selection_inventory_state", (data: {
      featureId?: string;
      inventory?: InventoryPayload;
    }) => {
      if (data.featureId && data.featureId !== featureIdRef.current) {
        return;
      }
      applyInventoryPayload(data.inventory);
    });
` : ""}    const confirmSub = GameEvents.Subscribe("rune_weaver_selection_confirmed", (data: { featureId?: string }) => {
      if (data.featureId && data.featureId !== featureIdRef.current) {
        return;
      }
      setIsVisible(false);
      setSelectedIndex(-1);
    });

    return () => {
      GameEvents.Unsubscribe(showSelectionSub);
${hasInventory ? "      GameEvents.Unsubscribe(inventorySub);\n" : ""}      GameEvents.Unsubscribe(confirmSub);
    };
  }, []);
${placeholderPaddingLogic}
  const displayItems = ${hasPlaceholderSupport ? "padWithPlaceholders(modalItems)" : "modalItems"};
  const inventorySlots = inventoryEnabled
    ? Array.from({ length: inventoryCapacity }, (_, index) => inventoryItems[index] ?? null)
    : [];

  const selectedItem = selectedIndex >= 0 && selectedIndex < displayItems.length
    ? displayItems[selectedIndex]
    : null;
  const isConfirmDisabled = selectedIndex === -1 ||
    selectedItem?.disabled === true ||
    selectedItem?.isPlaceholder === true;
  const shouldRenderModal = isVisible && displayItems.length > 0;

  if (!shouldRenderModal && !inventoryEnabled) {
    return null;
  }

  const handleSelect = (index: number) => {
    const item = displayItems[index];
    if (!item) {
      return;
    }

    if (item.disabled || item.isPlaceholder) {
      return;
    }

    setSelectedIndex(index);
    console.log(\`[Rune Weaver] ${componentName} selected item id=\${item.id}\`);
    sendCustomEvent("rune_weaver_player_select", {
      PlayerID: Game.GetLocalPlayerID(),
      optionIndex: index,
      featureId: featureIdRef.current,
    });
    onSelect?.(index);
  };

  const handleConfirm = () => {
    if (selectedIndex === -1) {
      return;
    }

    const item = displayItems[selectedIndex];
    if (!item) {
      return;
    }

    if (item.disabled || item.isPlaceholder) {
      console.log(\`[Rune Weaver] ${componentName} confirm blocked for disabled/placeholder item id=\${item.id}\`);
      return;
    }

    console.log(\`[Rune Weaver] ${componentName} confirmed item id=\${item.id}\`);
    sendCustomEvent("rune_weaver_player_confirm", {
      PlayerID: Game.GetLocalPlayerID(),
      optionIndex: selectedIndex,
      featureId: featureIdRef.current,
    });
    onConfirm?.();
    ${dismissBehavior === "selection_only" || dismissBehavior === "auto" ? "setIsVisible(false);" : ""}
  };

  const handleDismiss = () => {
    ${dismissBehavior === "manual" || dismissBehavior === "auto"
      ? `
    onDismiss?.();
    setIsVisible(false);
`
      : "// Dismiss not allowed in selection_only mode"}
  };

  return (
    <Panel className="${cssBaseName}-root">
      {inventoryEnabled && (
        <Panel className="${cssBaseName}-inventory-panel">
          <Panel className="inventory-header">
            <Label
              className={\`inventory-title \${inventoryIsFull ? "full" : ""}\`}
              text={inventoryIsFull ? inventoryFullMessage : inventoryTitle}
            />
            <Label className="inventory-subtitle" text={\`\${inventoryItems.length} / \${inventoryCapacity}\`} />
          </Panel>

          <Panel className="inventory-grid">
            {inventorySlots.map((item, index) => (
              <Panel
                key={item?.id || \`inventory_slot_\${index}\`}
                className={\`inventory-slot \${item ? "filled" : "empty"}\`}
              >
                {item ? (
                  <>
                    <Label className="inventory-slot-name" text={item.name} />
                    <Label
                      className={\`inventory-slot-tier \${item.tier ? \`tier-\${item.tier.toLowerCase()}\` : "tier-none"}\`}
                      text={item.tier || ""}
                    />
                  </>
                ) : (
                  <Label className="inventory-slot-placeholder" text="Empty" />
                )}
              </Panel>
            ))}
          </Panel>
        </Panel>
      )}

      {shouldRenderModal && (
        <Panel className="${cssBaseName}-overlay">
          <Panel className="${cssBaseName}-modal">
            <Panel className="modal-header">
              <Label text={modalTitle} />
              <Label className="modal-description" text={modalDescription || ""} />
            </Panel>

            <Panel className="modal-content">
              {displayItems.map((item, index) => (
                <Panel
                  key={item.id}
                  className={\`selection-card \${selectedIndex === index ? "selected" : ""} \${item.disabled ? "disabled" : ""} \${item.isPlaceholder ? "placeholder" : ""}\`}
                  onactivate={() => handleSelect(index)}
                >
                  ${payloadShape === "simple_text"
                    ? `
                  <Label className="card-name" text={item.name} />
                  {item.description && <Label className="card-description" text={item.description} />}
`
                    : payloadShape === "card_with_rarity"
                      ? `
                  {item.icon && <Image src={item.icon} />}
                  <Label className="card-name" text={item.name} />
                  <Label className="card-description" text={item.description || ""} />
                  <Label className={\`card-tier \${item.tier ? \`tier-\${item.tier.toLowerCase()}\` : "tier-none"}\`} text={item.tier || ""} />
`
                      : `
                  {item.icon && <Image src={item.icon} />}
                  <Label className="card-name" text={item.name} />
                  <Label className="card-description" text={item.description || ""} />
`}
                </Panel>
              ))}
            </Panel>

            <Panel className="modal-footer">
              <Panel
                className={\`btn-confirm \${isConfirmDisabled ? "disabled" : ""}\`}
                onactivate={handleConfirm}
              >
                <Label text="确认选择" />
              </Panel>
              ${dismissBehavior === "manual" || dismissBehavior === "auto"
                ? `
              <Panel className="btn-dismiss" onactivate={handleDismiss}>
                <Label text="关闭" />
              </Panel>
`
                : ""}
            </Panel>
          </Panel>
        </Panel>
      )}
    </Panel>
  );
}

export default ${componentName};
`;
}

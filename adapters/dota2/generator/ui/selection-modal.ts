/**
 * Selection Modal Component Generator - GP-4
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
  triggerKey?: string;
  choiceCount?: number;
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
}

export function generateSelectionModalComponent(
  componentName: string,
  featureId: string,
  entry: WritePlanEntry
): string {
  const caseParams = (entry.parameters || {}) as SelectionModalParams;
  const triggerKey = caseParams.triggerKey || "F4";
  const choiceCount = caseParams.choiceCount || 3;
  const minDisplayCount = caseParams.minDisplayCount || choiceCount;
  const placeholderConfig = caseParams.placeholderConfig;
  const payloadShape = caseParams.payloadShape || "card";
  const title = caseParams.title || "Choose Your Talent";
  const description = caseParams.description || "Select one of the following talents";
  const dismissBehavior = caseParams.dismissBehavior || "selection_only";
  const hasPlaceholderSupport = minDisplayCount > 0 && placeholderConfig !== undefined;
  const cssBaseName = entry.targetPath.split("/").pop()?.replace(".tsx", "").toLowerCase() || componentName.toLowerCase();

  const placeholderConfigCode = hasPlaceholderSupport
    ? `
  const placeholderConfig = {
    id: "${placeholderConfig!.id}",
    name: "${placeholderConfig!.name}",
    description: ${placeholderConfig!.description ? `"${placeholderConfig!.description}"` : "undefined"},
    disabled: ${placeholderConfig!.disabled !== undefined ? placeholderConfig!.disabled : true}
  };
  const minDisplayCount = ${minDisplayCount};
`
    : "";

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

  const payloadShapeRenderCode = generatePayloadShapeRender(payloadShape);
  const dismissBehaviorLogic = generateDismissBehaviorLogic(dismissBehavior);

  return `/**
 * ${componentName}
 * Generated selection modal
 *
 * Features:
 * - triggerKey: "${triggerKey}"
 * - choiceCount: ${choiceCount}
 * - payloadShape: "${payloadShape}"
 * - dismissBehavior: "${dismissBehavior}"
 * ${hasPlaceholderSupport ? `- minDisplayCount: ${minDisplayCount}` : ""}
 */

import React, { useEffect, useRef, useState } from "react";
import { registerCustomKey } from "../../../utils/keybinding";
import { setKeyDownCallback } from "../../../hooks/useKeyboard";

const rwRegisteredKeys = new Set<string>();

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
  const triggerKey = "${triggerKey}";
  const sendCustomEvent = (eventName: string, payload: Record<string, unknown>) => {
    (GameEvents.SendCustomGameEventToServer as any)(eventName, payload);
  };
${placeholderConfigCode}
  // GAP_FILL_BOUNDARY: ui.selection_modal.payload_adapter
  // Allowed: item normalization, placeholder padding, defensive fallback values, card presentation formatting.
  // Forbidden: root mount changes, transport event changes, LESS/HUD wiring changes.
  const normalizeSelectionItems = (rawItems?: unknown): SelectionItem[] => {
    // Defensive fallback: treat null/undefined/empty as empty array
    if (rawItems === undefined || rawItems === null) {
      return [];
    }

    // Handle array-like values or object-like values from Lua
    const itemsArray: unknown[] = Array.isArray(rawItems) ? rawItems : Object.values(rawItems ?? {});

    return itemsArray
      .filter((item): item is Record<string, unknown> => {
        // Filter out non-object/null/undefined entries
        return item !== null && item !== undefined && typeof item === "object";
      })
      .map((item, index): SelectionItem => {
        // Normalize rarity/tier: support both rarity and tier, prefer tier for display
        // rarityValue: used for card presentation formatting (visual theming)
        // tierValue: used for display label and CSS class generation
        const rarityValue = item.rarity ?? item.tier;
        const tierValue = item.tier ?? item.rarity;
        // Defensive fallback values: preserve type safety for downstream card presentation
        // - id: coerce numbers, generate indexed fallback for missing/invalid values
        // - name: required string fallback to "Unknown"
        // - description/icon/tier/rarity: optional strings, undefined if invalid
        // - disabled/isPlaceholder: boolean defaults to false for safety
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
      })
  };

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isVisible, setIsVisible] = useState(visible);
  const [modalItems, setModalItems] = useState<SelectionItem[]>(() => normalizeSelectionItems(items));
  const [modalTitle, setModalTitle] = useState(title);
  const [modalDescription, setModalDescription] = useState(description);

  // Use refs for stable effect dependencies
  const titleRef = useRef(title);
  const descriptionRef = useRef(description);
  const featureIdRef = useRef(featureId);
  const triggerKeyRef = useRef(triggerKey);

  // Update refs when values change
  useEffect(() => {
    titleRef.current = title;
    descriptionRef.current = description;
    featureIdRef.current = featureId;
    triggerKeyRef.current = triggerKey;
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

  useEffect(() => {
    console.log("[Rune Weaver] ${componentName} mounted for feature ${featureId}");

    if (!rwRegisteredKeys.has(triggerKeyRef.current)) {
      registerCustomKey(triggerKeyRef.current);
      rwRegisteredKeys.add(triggerKeyRef.current);
    }

    setKeyDownCallback(triggerKeyRef.current, () => {
      sendCustomEvent("player_key_pressed", {
        key: triggerKeyRef.current,
        featureId: featureIdRef.current,
        playerId: Game.GetLocalPlayerID(),
      });
    });

    const showSelectionSub = GameEvents.Subscribe("rune_weaver_show_selection", (data: {
      featureId?: string;
      options?: unknown;
      title?: string;
      description?: string;
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
    });

    const confirmSub = GameEvents.Subscribe("rune_weaver_selection_confirmed", (data: { featureId?: string }) => {
      if (data.featureId && data.featureId !== featureIdRef.current) {
        return;
      }
      setIsVisible(false);
      setSelectedIndex(-1);
    });

    return () => {
      setKeyDownCallback(triggerKeyRef.current, () => {});
      GameEvents.Unsubscribe(showSelectionSub);
      GameEvents.Unsubscribe(confirmSub);
    };
  }, []);
${placeholderPaddingLogic}${dismissBehaviorLogic}
  const displayItems = ${hasPlaceholderSupport ? "padWithPlaceholders(modalItems)" : "modalItems"};

  // Get selected item for debug logging and validation
  const selectedItem = selectedIndex >= 0 && selectedIndex < displayItems.length 
    ? displayItems[selectedIndex] 
    : null;

  // Check if confirm should be disabled
  const isConfirmDisabled = selectedIndex === -1 || 
    selectedItem?.disabled === true || 
    selectedItem?.isPlaceholder === true;

  if (!isVisible || displayItems.length === 0) {
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

    // Prevent selection of disabled or placeholder items
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
              <Label className="card-name" text={item.name} />
              <Label className="card-description" text={item.description || ""} />
              ${payloadShape === "card_with_rarity"
                ? `<Label className={\`card-tier \${item.tier ? \`tier-\${item.tier.toLowerCase()}\` : "tier-none"}\`} text={item.tier || ""} />`
                : ""}
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
  );
}

export default ${componentName};
`;
}

function generatePayloadShapeRender(payloadShape: string): string {
  switch (payloadShape) {
    case "simple_text":
      return `
              <Label className="card-name" text={item.name} />
              {item.description && <Label className="card-description" text={item.description} />}
`;
    case "card_with_rarity":
      return `
              {item.icon && <Image src={item.icon} />}
              <Label className="card-name" text={item.name} />
              <Label className="card-description" text={item.description} />
              {item.tier && <Label className={\`card-tier tier-\${item.tier.toLowerCase()}\`} text={item.tier} />}
`;
    case "card":
    default:
      return `
              {item.icon && <Image src={item.icon} />}
              <Label className="card-name" text={item.name} />
              <Label className="card-description" text={item.description} />
`;
  }
}

function generateDismissBehaviorLogic(dismissBehavior: string): string {
  switch (dismissBehavior) {
    case "selection_only":
      return `
  // Dismiss behavior: selection_only
`;
    case "manual":
      return `
  // Dismiss behavior: manual
`;
    case "auto":
      return `
  // Dismiss behavior: auto
`;
    default:
      return "";
  }
}

/**
 * Selection Flow Generator
 *
 * Owns:
 * - active round orchestration
 * - confirm-one flow
 * - effect application hook
 * - admitted inventory/progression hooks
 *
 * Does not own:
 * - trigger hotkey capture
 * - weighted pool session state (remaining / owned / currentChoice)
 */

import { WritePlanEntry } from "../../assembler/index.js";

// Dota2 gap-fill boundary anchors.
// GAP_FILL_BOUNDARY: selection_flow.effect_mapping
export const SELECTION_FLOW_GAP_FILL_BOUNDARIES = {
  effectMapping: {
    id: "selection_flow.effect_mapping",
    allowed: ["rarity_formula", "case_value_mapping", "option_to_effect_translation"],
    forbidden: ["event_channel_changes", "session_ownership_changes", "pattern_binding_changes"],
  },
} as const;

export interface SelectionFlowParams {
  choiceCount?: number;
  selectionPolicy?: "single" | "multi";
  applyMode?: "immediate" | "deferred";
  postSelectionPoolBehavior?: "none" | "remove_selected_from_remaining" | "remove_selected_and_keep_unselected_eligible";
  trackSelectedItems?: boolean;
  effectApplication?: {
    enabled: boolean;
    rarityAttributeBonusMap?: Record<string, { attribute: string; value: number }>;
  };
  inventory?: {
    enabled: boolean;
    capacity: number;
    storeSelectedItems: boolean;
    blockDrawWhenFull: boolean;
    fullMessage: string;
    presentation: "persistent_panel";
  };
  progression?: {
    enabled: boolean;
    progressThreshold: number;
    progressStateId: string;
    levelStateId: string;
  };
}

function normalizeChoiceCount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return 1;
  }
  return Math.max(1, Math.floor(numeric));
}

export function generateSelectionFlowCode(
  className: string,
  featureId: string,
  entry: WritePlanEntry
): string {
  const params = (entry.parameters || {}) as SelectionFlowParams;
  const choiceCount = normalizeChoiceCount(params.choiceCount);
  const selectionPolicy = params.selectionPolicy || "single";
  const applyMode = params.applyMode || "immediate";
  const postSelectionPoolBehavior = params.postSelectionPoolBehavior || "none";
  const trackSelectedItems = params.trackSelectedItems !== false;
  const effectApplication = params.effectApplication;
  const inventory = params.inventory;
  const progression = params.progression;

  const hasPoolCommit = postSelectionPoolBehavior !== "none";
  const hasEffectApplication = effectApplication?.enabled === true;
  const hasInventory = inventory?.enabled === true;
  const inventoryCapacity = hasInventory ? Math.max(1, Math.floor(inventory?.capacity || 15)) : 0;
  const inventoryStoreSelectedItems = hasInventory ? inventory?.storeSelectedItems !== false : false;
  const inventoryBlockDrawWhenFull = hasInventory ? inventory?.blockDrawWhenFull !== false : false;
  const inventoryFullMessage =
    hasInventory && inventory?.fullMessage ? inventory.fullMessage : "Selection inventory full";
  const inventoryPresentation =
    hasInventory && inventory?.presentation ? inventory.presentation : "persistent_panel";
  const hasProgression =
    progression?.enabled === true &&
    Number.isFinite(progression.progressThreshold) &&
    progression.progressThreshold > 0 &&
    typeof progression.progressStateId === "string" &&
    progression.progressStateId.trim().length > 0 &&
    typeof progression.levelStateId === "string" &&
    progression.levelStateId.trim().length > 0;
  const progressionThreshold = hasProgression
    ? Math.max(1, Math.floor(progression!.progressThreshold))
    : 0;
  const progressionStateId = hasProgression ? progression!.progressStateId.trim() : "selection_progress";
  const progressionLevelStateId = hasProgression ? progression!.levelStateId.trim() : "selection_level";
  const hasValidRarityMap =
    hasEffectApplication &&
    effectApplication?.rarityAttributeBonusMap &&
    Object.keys(effectApplication.rarityAttributeBonusMap).length > 0;

  const rarityAttributeBonusMapCode = hasValidRarityMap
    ? Object.entries(effectApplication!.rarityAttributeBonusMap!)
        .map(
          ([rarity, config]) =>
            `      "${rarity}": { attribute: "${config.attribute}", value: ${config.value} }`,
        )
        .join(",\n")
    : "";

  const inventoryStateDeclaration = hasInventory
    ? `
  private playerInventoryStates: Map<number, { selectedInventory: SelectionOption[] }> = new Map();
`
    : "";

  const progressionStateDeclaration = hasProgression
    ? `
  private playerProgressionStates: Map<number, { completedRounds: number; rewardLevel: number }> = new Map();
`
    : "";

  const inventoryMethods = hasInventory
    ? `
  private ensureInventoryState(playerId: number): void {
    if (!this.playerInventoryStates.has(playerId)) {
      this.playerInventoryStates.set(playerId, { selectedInventory: [] });
    }
  }

  private getSelectedInventory(playerId: number): SelectionOption[] {
    this.ensureInventoryState(playerId);
    return this.playerInventoryStates.get(playerId)?.selectedInventory || [];
  }

  private isInventoryFull(playerId: number): boolean {
    return this.getSelectedInventory(playerId).length >= ${inventoryCapacity};
  }

  private appendToInventory(playerId: number, option: SelectionOption): void {
    this.ensureInventoryState(playerId);
    const inventoryState = this.playerInventoryStates.get(playerId);
    if (!inventoryState) {
      return;
    }

    if (inventoryState.selectedInventory.some((item) => item.id === option.id)) {
      return;
    }

    if (inventoryState.selectedInventory.length >= ${inventoryCapacity}) {
      return;
    }

    inventoryState.selectedInventory.push({
      id: option.id,
      name: option.name,
      description: option.description,
      icon: option.icon,
      tier: option.tier,
    });
  }

  private buildInventoryPayload(playerId: number): {
    enabled: boolean;
    capacity: number;
    items: SelectionOption[];
    isFull: boolean;
    fullMessage: string;
    presentation: string;
  } {
    const items = this.getSelectedInventory(playerId);
    return {
      enabled: true,
      capacity: ${inventoryCapacity},
      items,
      isFull: items.length >= ${inventoryCapacity},
      fullMessage: "${inventoryFullMessage}",
      presentation: "${inventoryPresentation}",
    };
  }

  private sendInventoryStateToClient(playerId: number): void {
    if (!CustomGameEventManager) {
      return;
    }

    const player = PlayerResource.GetPlayer(playerId as PlayerID);
    if (!player) {
      return;
    }

    (CustomGameEventManager.Send_ServerToPlayer as any)(
      player,
      "rune_weaver_selection_inventory_state",
      {
        featureId: "${featureId}",
        inventory: this.buildInventoryPayload(playerId),
      }
    );
  }
`
    : "";

  const progressionMethods = hasProgression
    ? `
  private readonly progressionThreshold = ${progressionThreshold};
  private readonly progressionStateId = "${progressionStateId}";
  private readonly progressionLevelStateId = "${progressionLevelStateId}";

  private ensureProgressionState(playerId: number): void {
    if (!this.playerProgressionStates.has(playerId)) {
      this.playerProgressionStates.set(playerId, { completedRounds: 0, rewardLevel: 0 });
    }
  }

  private advanceProgression(playerId: number): void {
    this.ensureProgressionState(playerId);
    const progressionState = this.playerProgressionStates.get(playerId);
    if (!progressionState) {
      return;
    }

    progressionState.completedRounds += 1;
    progressionState.rewardLevel = Math.floor(progressionState.completedRounds / this.progressionThreshold);
    print(
      \`[Rune Weaver] ${className}: progression update player=\${playerId} \${this.progressionStateId}=\${progressionState.completedRounds} \${this.progressionLevelStateId}=\${progressionState.rewardLevel}\`
    );
  }
`
    : "";

  const effectApplicationCode = hasEffectApplication
    ? `
  private applyEffectByRarity(playerId: number, option: SelectionOption): void {
    const hero = PlayerResource.GetSelectedHeroEntity(playerId as PlayerID);
    if (!hero) {
      print(\`[Rune Weaver] ${className}: no hero found for player \${playerId}\`);
      return;
    }

    const rarity = option.tier || "R";
    const bonusConfig = this.rarityAttributeBonusMap[rarity];
    if (!bonusConfig) {
      print(\`[Rune Weaver] ${className}: no bonus config for rarity \${rarity}\`);
      return;
    }

    const { attribute, value } = bonusConfig;
    switch (attribute) {
      case "strength":
        hero.ModifyStrength(value);
        break;
      case "agility":
        hero.ModifyAgility(value);
        break;
      case "intelligence":
        hero.ModifyIntellect(value);
        break;
      case "all":
        hero.ModifyStrength(value);
        hero.ModifyAgility(value);
        hero.ModifyIntellect(value);
        break;
      default:
        print(\`[Rune Weaver] ${className}: unknown attribute \${attribute}\`);
    }

    this.fireEffectAppliedEvent(playerId, option, bonusConfig);
  }

  private fireEffectAppliedEvent(
    playerId: number,
    option: SelectionOption,
    bonusConfig: { attribute: string; value: number }
  ): void {
    if (CustomGameEventManager) {
      (CustomGameEventManager.Send_ServerToPlayer as any)(
        PlayerResource.GetPlayer(playerId as PlayerID),
        "rune_weaver_effect_applied",
        {
          featureId: "${featureId}",
          optionId: option.id,
          optionName: option.name,
          attribute: bonusConfig.attribute,
          value: bonusConfig.value,
          rarity: option.tier || "R",
        }
      );
    }
  }
`
    : "";

  const poolCommitLogic = hasPoolCommit
    ? `
    if (selection.poolCommit) {
      selection.poolCommit(selectedOption.id, { trackOwned: ${trackSelectedItems} });
    }
${postSelectionPoolBehavior === "remove_selected_and_keep_unselected_eligible"
    ? `    const unselectedIds = selection.options
      .filter((option) => option.id !== selectedOption.id)
      .map((option) => option.id);
    print(\`[Rune Weaver] ${className}: unselected candidates \${unselectedIds.join(", ")} remain eligible\`);
`
    : ""}`
    : "";

  const inventoryCommitLogic = hasInventory
    ? inventoryStoreSelectedItems
      ? `
    this.appendToInventory(playerId, selectedOption);
    this.sendInventoryStateToClient(playerId);
`
      : `
    this.sendInventoryStateToClient(playerId);
`
    : "";

  const progressionCommitLogic = hasProgression
    ? `
    this.advanceProgression(playerId);
`
    : "";

  const effectApplicationCall = hasEffectApplication && applyMode === "immediate"
    ? `
    this.applyEffectByRarity(playerId, selectedOption);
`
    : hasEffectApplication && applyMode === "deferred"
      ? `
    selection.deferredEffect = selectedOption;
`
      : "";

  const inventoryHeader = hasInventory
    ? `
 * - inventory: enabled (${inventoryCapacity} slots, ${inventoryPresentation})
 * - inventoryBlockDrawWhenFull: ${inventoryBlockDrawWhenFull}
 * - inventoryFullMessage: "${inventoryFullMessage}"
`
    : "";

  const progressionHeader = hasProgression
    ? `
 * - progression: enabled (threshold ${progressionThreshold}, progressStateId "${progressionStateId}", levelStateId "${progressionLevelStateId}")
`
    : "";

  const poolCommitBinding = hasPoolCommit
    ? `
      pool && typeof pool.commitSelection === "function"
        ? (selectedId, options) => pool.commitSelection(selectedId, options)
        : undefined`
    : `
      undefined`;

  return `/**
 * ${className}
 * 选择流程管理器 - Generated by Rune Weaver
 *
 * Features:
 * - choiceCount: ${choiceCount}
 * - selectionPolicy: "${selectionPolicy}"
 * - applyMode: "${applyMode}"
 * - postSelectionPoolBehavior: "${postSelectionPoolBehavior}"
 * - trackSelectedItems: ${trackSelectedItems}
${inventoryHeader}${progressionHeader}${hasEffectApplication && applyMode === "immediate" ? " * - Apply effect immediately\n" : ""}${hasEffectApplication && applyMode === "deferred" ? " * - Apply effect on deferred confirmation\n" : ""} */

interface SelectionOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
  tier?: string;
}

interface PoolCandidate {
  id: string;
  name?: string;
  label?: string;
  description?: string;
  icon?: string;
  tier?: string;
}

interface PoolCommitOptions {
  trackOwned?: boolean;
}

interface PlayerSelection {
  playerId: number;
  options: SelectionOption[];
  selectedIndex: number;
  isConfirmed: boolean;
  deferredEffect?: SelectionOption;
  poolCommit?: (selectedId: string, options?: PoolCommitOptions) => void;
}

export class ${className} {
  private static instance: ${className};
  private activeSelections: Map<number, PlayerSelection> = new Map();
  private selectionCallbacks: Map<number, (option: SelectionOption) => void> = new Map();
${inventoryStateDeclaration}${progressionStateDeclaration}${hasEffectApplication ? `
  private rarityAttributeBonusMap: Record<string, { attribute: string; value: number }> = {
${rarityAttributeBonusMapCode}
  };
` : ""}

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }
${inventoryMethods}${progressionMethods}
  startSelection(
    playerId: number,
    options: SelectionOption[],
    onSelected: (option: SelectionOption) => void,
    poolCommit?: (selectedId: string, options?: PoolCommitOptions) => void
  ): void {
    if (options.length === 0) {
      print("[Rune Weaver] Cannot start selection with empty options");
      return;
    }

    this.activeSelections.set(playerId, {
      playerId,
      options,
      selectedIndex: -1,
      isConfirmed: false,
      poolCommit,
    });
    this.selectionCallbacks.set(playerId, onSelected);
${hasInventory ? "    this.sendInventoryStateToClient(playerId);\n" : ""}    this.sendToClient(playerId, options);
  }

  onPlayerSelect(playerId: number, optionIndex: number): void {
    const selection = this.activeSelections.get(playerId);
    if (!selection) return;
    if (optionIndex < 0 || optionIndex >= selection.options.length) return;

    selection.selectedIndex = optionIndex;
    this.fireSelectionEvent(playerId, selection.options[optionIndex]);
  }

  onPlayerConfirm(playerId: number): void {
    const selection = this.activeSelections.get(playerId);
    if (!selection || selection.selectedIndex === -1) return;

    selection.isConfirmed = true;
    const selectedOption = selection.options[selection.selectedIndex];
${poolCommitLogic}${inventoryCommitLogic}${progressionCommitLogic}${effectApplicationCall}
    const callback = this.selectionCallbacks.get(playerId);
    if (callback) {
      callback(selectedOption);
    }

    this.fireConfirmationEvent(playerId, selectedOption);
    this.activeSelections.delete(playerId);
    this.selectionCallbacks.delete(playerId);
  }
${effectApplicationCode}
  private fireSelectionEvent(playerId: number, option: SelectionOption): void {
    if (CustomGameEventManager) {
      (CustomGameEventManager.Send_ServerToPlayer as any)(
        PlayerResource.GetPlayer(playerId as PlayerID),
        "rune_weaver_selection_made",
        {
          featureId: "${featureId}",
          optionId: option.id,
          optionName: option.name,
          rarity: option.tier || "R",
        }
      );
    }
  }

  private fireConfirmationEvent(playerId: number, option: SelectionOption): void {
    if (CustomGameEventManager) {
      (CustomGameEventManager.Send_ServerToPlayer as any)(
        PlayerResource.GetPlayer(playerId as PlayerID),
        "rune_weaver_selection_confirmed",
        {
          featureId: "${featureId}",
          optionId: option.id,
          optionName: option.name,
          rarity: option.tier || "R",
          timestamp: GameRules.GetGameTime(),${hasInventory ? `
          inventoryCount: this.getSelectedInventory(playerId).length,
          inventoryFull: this.isInventoryFull(playerId),` : ""}
        }
      );
    }
  }

  private sendToClient(playerId: number, options: SelectionOption[]): void {
    if ((GameRules as any).XNetTable) {
      (GameRules as any).XNetTable.SetTableValue(
        "rune_weaver_selection",
        \`player_\${playerId}_feature_${featureId}\`,
        {
          featureId: "${featureId}",
          options,
          status: "waiting",${hasInventory ? `
          inventory: this.buildInventoryPayload(playerId),` : ""}
        }
      );
    }

    if (CustomGameEventManager) {
      const payload = {
        featureId: "${featureId}",
        options,
        choiceCount: ${choiceCount},
        selectionPolicy: "${selectionPolicy}",${hasInventory ? `
        inventory: this.buildInventoryPayload(playerId),` : ""}
      };
      const player = PlayerResource.GetPlayer(playerId as PlayerID);
      print(\`[Rune Weaver] ${className}: sending selection UI to player \${playerId}, options=\${options.length}, player=\${player ? "ok" : "missing"}\`);
      if (player) {
        (CustomGameEventManager.Send_ServerToPlayer as any)(
          player,
          "rune_weaver_show_selection",
          payload
        );
      } else {
        (CustomGameEventManager.Send_ServerToAllClients as any)(
          "rune_weaver_show_selection",
          payload
        );
      }
    }
  }

  generateOptionsFromPool<T extends SelectionOption>(
    pool: any,
    count: number
  ): T[] {
    const normalizeCandidates = (candidates: PoolCandidate[]): T[] => {
      return candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name || candidate.label || candidate.id,
        description: candidate.description || "",
        icon: candidate.icon,
        tier: candidate.tier,
      })) as T[];
    };

    if (pool && typeof pool.drawForSelection === "function") {
      return normalizeCandidates(pool.drawForSelection(count) as PoolCandidate[]);
    }

    if (pool && typeof pool.drawMultiple === "function") {
      return normalizeCandidates(pool.drawMultiple(count) as PoolCandidate[]);
    }

    return [];
  }

  triggerSelectionFromPool(playerId: number, pool: any): void {
    if (!pool) {
      print(\`[Rune Weaver] ${className}: no pool available\`);
      return;
    }
${hasInventory ? `
    this.ensureInventoryState(playerId);
    this.sendInventoryStateToClient(playerId);
${inventoryBlockDrawWhenFull ? `
    if (this.isInventoryFull(playerId)) {
      print(\`[Rune Weaver] ${className}: inventory full for player \${playerId}, draw blocked before modal open\`);
      return;
    }
` : ""}` : ""}${hasProgression ? `
    this.ensureProgressionState(playerId);
` : ""}
    const options = this.generateOptionsFromPool(pool, ${choiceCount});
    if (!options || options.length === 0) {
      print(\`[Rune Weaver] ${className}: no options generated for player \${playerId}\`);
      return;
    }

    this.startSelection(
      playerId,
      options,
      () => {},
${poolCommitBinding}
    );
  }
}

export function register${className}(): void {
  const flow = ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");

  if (CustomGameEventManager) {
    CustomGameEventManager.RegisterListener("rune_weaver_player_select", (_eventSourceIndex: number, event: any) => {
      if (event.featureId && event.featureId !== "${featureId}") {
        return;
      }
      const playerId = Number(event.PlayerID ?? event.playerId ?? -1);
      const optionIndex = Number(event.optionIndex ?? -1);
      if (playerId >= 0 && optionIndex >= 0) {
        flow.onPlayerSelect(playerId, optionIndex);
      }
    });

    CustomGameEventManager.RegisterListener("rune_weaver_player_confirm", (_eventSourceIndex: number, event: any) => {
      if (event.featureId && event.featureId !== "${featureId}") {
        return;
      }
      const playerId = Number(event.PlayerID ?? event.playerId ?? -1);
      if (playerId >= 0) {
        flow.onPlayerConfirm(playerId);
      }
    });
  }
}
`;
}

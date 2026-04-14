/**
 * Selection Flow Generator - GP-2 & GP-3
 *
 * GP-2: Selection Flow Commit/Events
 * GP-3: Effect Application Mapping
 */

import { WritePlanEntry } from "../../assembler/index.js";

// Dota2 gap-fill boundary anchors.
// These constants intentionally live in the Dota2 generator layer so A group
// can harden case-specific logic without touching shared host contracts.
export const SELECTION_FLOW_GAP_FILL_BOUNDARIES = {
  effectMapping: {
    id: "selection_flow.effect_mapping",
    allowed: ["rarity_formula", "case_value_mapping", "option_to_effect_translation"],
    forbidden: ["event_channel_changes", "session_ownership_changes", "pattern_binding_changes"],
  },
} as const;

export interface SelectionFlowParams {
  triggerKey?: string;
  choiceCount?: number;
  selectionPolicy?: "single" | "multi";
  applyMode?: "immediate" | "deferred";
  postSelectionPoolBehavior?: "none" | "remove_selected_from_remaining" | "remove_selected_and_keep_unselected_eligible";
  trackSelectedItems?: boolean;
  effectApplication?: {
    enabled: boolean;
    rarityAttributeBonusMap?: Record<string, { attribute: string; value: number }>;
  };
}

export function generateSelectionFlowCode(
  className: string,
  featureId: string,
  entry: WritePlanEntry
): string {
  const caseParams = (entry.parameters || {}) as SelectionFlowParams;
  const triggerKey = caseParams.triggerKey || "F4";
  const choiceCount = caseParams.choiceCount || 3;
  const selectionPolicy = caseParams.selectionPolicy || "single";
  const applyMode = caseParams.applyMode || "immediate";
  const postSelectionPoolBehavior = caseParams.postSelectionPoolBehavior || "none";
  const trackSelectedItems = caseParams.trackSelectedItems || false;
  const effectApplication = caseParams.effectApplication;

  // GAP_FILL_BOUNDARY: selection_flow.effect_mapping
  // Allowed: rarity-driven formula, case value mapping, option-to-effect translation.
  // Forbidden: event channel changes, session ownership model changes, pattern binding changes.
  const hasPoolStateManagement = postSelectionPoolBehavior !== "none";
  const hasEffectApplication = effectApplication?.enabled || false;
  const hasValidRarityMap =
    hasEffectApplication &&
    effectApplication?.rarityAttributeBonusMap &&
    Object.keys(effectApplication.rarityAttributeBonusMap).length > 0;

  const rarityAttributeBonusMapCode = hasValidRarityMap
    ? Object.entries(effectApplication!.rarityAttributeBonusMap!)
        .map(
          ([rarity, config]) =>
            `      "${rarity}": { attribute: "${config.attribute}", value: ${config.value} }`
        )
        .join(",\n")
    : "";

  const sessionStateDeclaration = hasPoolStateManagement
    ? `
  private playerSessionStates: Map<number, {
    remainingIds: string[];
    ownedIds: string[];
    currentChoiceIds: string[];
  }> = new Map();
`
    : "";

  const sessionStateMethods = hasPoolStateManagement
    ? `
  initPlayerSession(playerId: number, allIds: string[]): void {
    this.playerSessionStates.set(playerId, {
      remainingIds: [...allIds],
      ownedIds: [],
      currentChoiceIds: [],
    });
    print(\`[Rune Weaver] ${className}: Initialized session for player \${playerId}\`);
  }

  getPlayerSession(
    playerId: number
  ): { remainingIds: string[]; ownedIds: string[]; currentChoiceIds: string[] } | undefined {
    return this.playerSessionStates.get(playerId);
  }

  private removeFromRemaining(playerId: number, optionId: string): void {
    const session = this.playerSessionStates.get(playerId);
    if (!session) return;

    const index = session.remainingIds.indexOf(optionId);
    if (index > -1) {
      session.remainingIds.splice(index, 1);
    }
  }

  private addToOwned(playerId: number, optionId: string): void {
    const session = this.playerSessionStates.get(playerId);
    if (!session) return;

    if (!session.ownedIds.includes(optionId)) {
      session.ownedIds.push(optionId);
    }
  }

  private updateCurrentChoices(playerId: number, choiceIds: string[]): void {
    const session = this.playerSessionStates.get(playerId);
    if (!session) return;
    session.currentChoiceIds = [...choiceIds];
  }
`
    : "";

  const effectApplicationCode = hasEffectApplication
    ? `
  private applyEffectByRarity(playerId: number, option: SelectionOption): void {
    const hero = PlayerResource.GetSelectedHeroEntity(playerId as PlayerID);
    if (!hero) {
      print(\`[Rune Weaver] ${className}: No hero found for player \${playerId}\`);
      return;
    }

    const DEFAULT_RARITY = "R";
    const rarity = option.tier || DEFAULT_RARITY;
    const bonusConfig = this.rarityAttributeBonusMap[rarity];
    if (!bonusConfig) {
      print(\`[Rune Weaver] ${className}: No bonus config for rarity \${rarity}\`);
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
        print(\`[Rune Weaver] ${className}: Unknown attribute \${attribute}\`);
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

  const trackSelectedCode = trackSelectedItems ? "this.addToOwned(playerId, selectedOption.id);" : "";
  const commitSelectionLogic = hasPoolStateManagement
    ? postSelectionPoolBehavior === "remove_selected_and_keep_unselected_eligible"
      ? `
    this.removeFromRemaining(playerId, selectedOption.id);
    ${trackSelectedCode}
    const unselectedIds = selection.options
      .filter((option) => option.id !== selectedOption.id)
      .map((option) => option.id);
    print(\`[Rune Weaver] ${className}: Unselected candidates \${unselectedIds.join(", ")} remain eligible\`);
`
      : `
    this.removeFromRemaining(playerId, selectedOption.id);
    ${trackSelectedCode}
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

  return `/**
 * ${className}
 * 选择流程管理器 - Generated by Rune Weaver
 *
 * Features:
 * - triggerKey: "${triggerKey}"
 * - choiceCount: ${choiceCount}
 * - selectionPolicy: "${selectionPolicy}"
 * - applyMode: "${applyMode}"
 * - postSelectionPoolBehavior: "${postSelectionPoolBehavior}"
 * - trackSelectedItems: ${trackSelectedItems}
 * ${hasEffectApplication && applyMode === "immediate" ? "- Apply effect immediately" : ""}
 * ${hasEffectApplication && applyMode === "deferred" ? "- Apply effect on deferred confirmation" : ""}
 */

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

interface PlayerSelection {
  playerId: number;
  options: SelectionOption[];
  selectedIndex: number;
  isConfirmed: boolean;
  deferredEffect?: SelectionOption;
}

export class ${className} {
  private static instance: ${className};
  private activeSelections: Map<number, PlayerSelection> = new Map();
  private selectionCallbacks: Map<number, (option: SelectionOption) => void> = new Map();
${sessionStateDeclaration}${hasEffectApplication ? `
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
${sessionStateMethods}
  startSelection(
    playerId: number,
    options: SelectionOption[],
    onSelected: (option: SelectionOption) => void
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
    });
    this.selectionCallbacks.set(playerId, onSelected);

    ${hasPoolStateManagement ? "this.updateCurrentChoices(playerId, options.map((option) => option.id));" : ""}
    this.sendToClient(playerId, options);
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
    ${commitSelectionLogic}${effectApplicationCall}

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
          timestamp: GameRules.GetGameTime(),
        }
      );
    }
  }

  private sendToClient(playerId: number, options: SelectionOption[]): void {
    if ((GameRules as any).XNetTable) {
      (GameRules as any).XNetTable.SetTableValue(
        "rune_weaver_selection",
        \`player_\${playerId}_feature_${featureId}\`,
        { featureId: "${featureId}", options, status: "waiting" }
      );
    }

    if (CustomGameEventManager) {
      const payload = {
        featureId: "${featureId}",
        options,
        choiceCount: ${choiceCount},
        selectionPolicy: "${selectionPolicy}",
        title: "Choose Your Talent",
        description: "Press ${triggerKey} to open talent draw",
      };
      const player = PlayerResource.GetPlayer(playerId as PlayerID);
      print(\`[Rune Weaver] ${className}: Sending selection UI to player \${playerId}, options=\${options.length}, player=\${player ? "ok" : "missing"}\`);
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
    playerId: number,
    pool: any,
    count: number
  ): T[] {
    const normalizeCandidates = (candidates: PoolCandidate[]): T[] => {
      const options = candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name || candidate.label || candidate.id,
        description: candidate.description || "",
        icon: candidate.icon,
        tier: candidate.tier,
      })) as T[];

      return options;
    };

    if (pool && typeof pool.drawForSelection === "function") {
      const candidates = normalizeCandidates(pool.drawForSelection(count) as PoolCandidate[]);
      ${
        hasPoolStateManagement
          ? `const candidateIds: string[] = [];
      for (const candidate of candidates as T[]) {
        candidateIds.push(candidate.id);
      }
      this.updateCurrentChoices(playerId, candidateIds);`
          : ""
      }
      return candidates;
    }

    if (pool && typeof pool.drawMultiple === "function") {
      return normalizeCandidates(pool.drawMultiple(count) as PoolCandidate[]);
    }

    return [];
  }

  triggerSelectionFromPool(playerId: number, pool: any): void {
    if (!pool) {
      print(\`[Rune Weaver] ${className}: No pool available\`);
      return;
    }

    ${hasPoolStateManagement ? `
    if (!this.getPlayerSession(playerId) && typeof this.initPlayerSession === "function") {
      const remainingIds: string[] =
        typeof pool.getRemainingTalentIds === "function"
          ? pool.getRemainingTalentIds()
          : (() => {
              const ids: string[] = [];
              if (typeof pool.getAllItems === "function") {
                for (const item of pool.getAllItems()) {
                  ids.push(item.item.id);
                }
              }
              return ids;
            })();
      if (remainingIds.length > 0) {
        this.initPlayerSession(playerId, remainingIds);
      }
    }
` : ""}

    const options = this.generateOptionsFromPool(playerId, pool, ${choiceCount});
    if (!options || options.length === 0) {
      print(\`[Rune Weaver] ${className}: No options generated for player \${playerId}\`);
      return;
    }

    this.startSelection(playerId, options, (selectedOption) => {
      if (pool && typeof pool.commitSelection === "function") {
        pool.commitSelection(selectedOption.id);
      }
    });
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

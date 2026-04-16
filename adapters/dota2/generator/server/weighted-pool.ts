/**
 * Weighted Pool Generator - Session State Support
 * 
 * GP-1: Weighted Pool Session State
 * 
 * Supports:
 * - poolStateTracking="session" - Session state variables
 * - remainingTalentIds, ownedTalentIds, currentChoiceIds state
 * - drawMode="multiple_without_replacement" support
 * - duplicatePolicy="forbid" check
 * - Session state persistence (selected talents removed from remaining)
 */

import { WritePlanEntry } from "../../assembler/index.js";

// Dota2 gap-fill boundary anchors.
export const WEIGHTED_POOL_GAP_FILL_BOUNDARIES = {
  selectionPolicy: {
    id: "weighted_pool.selection_policy",
    allowed: ["draw_policy_details", "duplicate_handling", "session_filtering"],
    forbidden: ["pool_contract_changes", "host_routing_changes", "undeclared_persistence"],
  },
} as const;

/**
 * Weighted Pool Parameters
 */
export interface WeightedPoolParams {
  entries: Array<{ id: string; label: string; description: string; weight: number; tier?: string }>;
  weights?: Record<string, number>;
  tiers?: string[];
  choiceCount?: number;
  drawMode?: "single" | "multiple_without_replacement" | "multiple_with_replacement";
  duplicatePolicy?: "allow" | "avoid_when_possible" | "forbid";
  poolStateTracking?: "none" | "session";
}

/**
 * Generate weighted pool code with session state support
 */
export function generateWeightedPoolCode(
  className: string,
  featureId: string,
  entry: WritePlanEntry
): string {
  // Extract parameters from entry
  const caseParams = entry.parameters as WeightedPoolParams | undefined;
  const entries = caseParams?.entries;
  const tiers = caseParams?.tiers;
  const choiceCount = caseParams?.choiceCount || 3;
  const drawMode = caseParams?.drawMode || "single";
  const duplicatePolicy = caseParams?.duplicatePolicy || "allow";
  const poolStateTracking = caseParams?.poolStateTracking || "none";

  // Generate entries initialization code
  const entriesCode = entries && entries.length > 0
    ? entries.map(e => `    { id: "${e.id}", label: "${e.label}", description: "${e.description}", weight: ${e.weight}, tier: "${e.tier || 'R'}" }`).join(',\n')
    : '    // TODO: Add talent entries';

  // Determine if session state is needed
  const hasSessionState = poolStateTracking === "session";

  // Generate session state code if needed
  const sessionStateDeclaration = hasSessionState
    ? `
  // Session state (poolStateTracking="session")
  private sessionState: {
    remainingTalentIds: string[];
    ownedTalentIds: string[];
    currentChoiceIds: string[];
  } = {
    remainingTalentIds: [],
    ownedTalentIds: [],
    currentChoiceIds: [],
  };
`
    : "";

  // Generate session state initialization in constructor
  const sessionStateInit = hasSessionState
    ? `
    // Initialize session state with all entry IDs
    this.sessionState.remainingTalentIds = initialEntries.map(e => e.id);
    this.sessionState.ownedTalentIds = [];
    this.sessionState.currentChoiceIds = [];
`
    : "";

  // Generate drawForSelection method for multiple_without_replacement
  const drawForSelectionMethod = drawMode === "multiple_without_replacement"
    ? `
  /**
   * Draw multiple candidates for selection (without replacement)
   * Supports duplicatePolicy="forbid" to prevent duplicates
   */
  drawForSelection(count: number = ${choiceCount}): T[] {
    if (this.items.length === 0) {
      print(\`[Rune Weaver] ${className}: No items in pool\`);
      return [];
    }

    const result: T[] = [];
    const drawnIds = new Set<string>();
    const drawnTiers = new Set<number>();${hasSessionState ? `
    let availableItems = this.items.filter(item => 
      this.sessionState.remainingTalentIds.includes((item.item as any).id)
    );` : `
    let availableItems = [...this.items];`}

    if (availableItems.length === 0) {
      print(\`[Rune Weaver] ${className}: No available items in session pool\`);
      return [];
    }

    // Phase 1: Try to draw one from each distinct tier to avoid duplicate rarity in same round
    const tierGroups = new Map<number, WeightedItem<T>[]>();
    for (const item of availableItems) {
      const tier = item.tier || 0;
      if (!tierGroups.has(tier)) {
        tierGroups.set(tier, []);
      }
      tierGroups.get(tier)!.push(item);
    }

    // Sort tiers by priority (higher tier = higher priority for diversity)
    const sortedTiers = Array.from(tierGroups.keys()).sort((a, b) => b - a);

    for (const tier of sortedTiers) {
      if (result.length >= count) break;
      if (drawnTiers.has(tier)) continue;

      const tierItems = tierGroups.get(tier)!.filter(item => {
        const itemId = (item.item as any).id;
        return !drawnIds.has(itemId);
      });

      if (tierItems.length === 0) continue;

      const tierTotalWeight = tierItems.reduce((sum, item) => sum + item.weight, 0);
      if (tierTotalWeight <= 0) continue;

      let random = RandomFloat(0, tierTotalWeight);
      let drawnItem: WeightedItem<T> | null = null;

      for (const item of tierItems) {
        random -= item.weight;
        if (random <= 0) {
          drawnItem = item;
          break;
        }
      }

      if (drawnItem) {
        const itemId = (drawnItem.item as any).id;
        result.push(drawnItem.item);
        drawnIds.add(itemId);
        drawnTiers.add(tier);

        // Remove from available items
        const index = availableItems.indexOf(drawnItem);
        if (index > -1) {
          availableItems.splice(index, 1);
        }
      }
    }

${hasSessionState ? `    // Update currentChoiceIds in session state
    this.sessionState.currentChoiceIds = result.map(item => (item as any).id);` : ""}

    return result;
  }
`
    : "";

  // GAP_FILL_BOUNDARY: weighted_pool.selection_policy
  // Allowed: draw policy details, duplicate handling, session-aware filtering.
  // Forbidden: pool contract changes, host routing changes, undeclared persistence semantics.
  // Generate commitSelection method if session state is enabled
  const commitSelectionMethod = hasSessionState
    ? `
  /**
   * Commit player selection
   * Remove selected item from remainingTalentIds
   * Add selected item to ownedTalentIds
   */
  commitSelection(selectedId: string): void {
    // Remove from remaining
    const remainingIndex = this.sessionState.remainingTalentIds.indexOf(selectedId);
    if (remainingIndex > -1) {
      this.sessionState.remainingTalentIds.splice(remainingIndex, 1);
    }

    // Add to owned
    if (!this.sessionState.ownedTalentIds.includes(selectedId)) {
      this.sessionState.ownedTalentIds.push(selectedId);
    }

    // Clear current choices
    this.sessionState.currentChoiceIds = [];

    print(\`[Rune Weaver] ${className}: Committed selection \${selectedId}, remaining: \${this.sessionState.remainingTalentIds.length}\`);
  }
`
    : "";

  // Generate getter methods if session state is enabled
  const getterMethods = hasSessionState
    ? `
  /**
   * Get remaining talent IDs in session
   */
  getRemainingTalentIds(): string[] {
    return [...this.sessionState.remainingTalentIds];
  }

  /**
   * Get owned talent IDs in session
   */
  getOwnedTalentIds(): string[] {
    return [...this.sessionState.ownedTalentIds];
  }

  /**
   * Get current choice IDs in session
   */
  getCurrentChoiceIds(): string[] {
    return [...this.sessionState.currentChoiceIds];
  }

  /**
   * Reset session state
   */
  resetSessionState(): void {
    this.sessionState.remainingTalentIds = this.items.map(item => (item.item as any).id);
    this.sessionState.ownedTalentIds = [];
    this.sessionState.currentChoiceIds = [];
    print(\`[Rune Weaver] ${className}: Session state reset\`);
  }
`
    : "";

  return `/**
 * ${className}
 * 加权随机池 - Generated by Rune Weaver
 * 
 * Features:
 * - drawMode: ${drawMode}
 * - duplicatePolicy: ${duplicatePolicy}
 * - poolStateTracking: ${poolStateTracking}
 */

interface TalentEntry {
  id: string;
  label: string;
  description: string;
  weight: number;
  tier?: string;
}

interface WeightedItem<T> {
  item: T;
  weight: number;
  tier?: number;
}

export class ${className}<T extends TalentEntry = TalentEntry> {
  private static instance?: ${className}<any>;
  private items: WeightedItem<T>[] = [];
  private totalWeight: number = 0;
${sessionStateDeclaration}
  static getInstance<U extends TalentEntry = TalentEntry>(): ${className}<U> {
    if (!${className}.instance) {
      ${className}.instance = new ${className}<U>();
    }
    return ${className}.instance as ${className}<U>;
  }

  constructor() {
${entries ? `    // Initialize with case-specific entries
    const initialEntries = [
${entriesCode}
    ] as T[];
    for (const entry of initialEntries) {
      this.add(entry, entry.weight, entry.tier ? this.tierToNumber(entry.tier) : 0);
    }${sessionStateInit}` : `    // TODO: Add initial talent entries`}
  }

  private tierToNumber(tier: string): number {
    const tierMap: Record<string, number> = { 'R': 1, 'SR': 2, 'SSR': 4, 'UR': 7 };
    return tierMap[tier] || 1;
  }

  /**
   * 添加条目
   */
  add(item: T, weight: number, tier?: number): void {
    this.items.push({ item, weight, tier });
    this.totalWeight += weight;
  }

  /**
   * 移除条目
   */
  remove(item: T): boolean {
    const index = this.items.findIndex(i => i.item === item);
    if (index === -1) return false;
    
    this.totalWeight -= this.items[index].weight;
    this.items.splice(index, 1);
    return true;
  }

  /**
   * 清空池子
   */
  clear(): void {
    this.items = [];
    this.totalWeight = 0;
  }

  /**
   * 按权重随机抽取一个
   */
  draw(): T | null {
    if (this.items.length === 0 || this.totalWeight <= 0) {
      return null;
    }

    let random = RandomFloat(0, this.totalWeight);
    
    for (const item of this.items) {
      random -= item.weight;
      if (random <= 0) {
        return item.item;
      }
    }
    
    return this.items[this.items.length - 1]?.item || null;
  }

  /**
   * 按权重随机抽取多个（不重复）
   */
  drawMultiple(count: number): T[] {
    const result: T[] = [];
    const tempPool = new ${className}<T>();
    
    // 复制所有条目
    for (const item of this.items) {
      tempPool.add(item.item, item.weight, item.tier);
    }
    
    // 抽取指定数量
    for (let i = 0; i < count && i < this.items.length; i++) {
      const drawn = tempPool.draw();
      if (drawn !== null) {
        result.push(drawn);
        tempPool.remove(drawn);
      }
    }
    
    return result;
  }
${drawForSelectionMethod}${commitSelectionMethod}${getterMethods}
  /**
   * 按 tier 过滤后抽取
   */
  drawByTier(tier: number): T | null {
    const tierItems = this.items.filter(i => i.tier === tier);
    if (tierItems.length === 0) return null;
    
    const tierTotalWeight = tierItems.reduce((sum, i) => sum + i.weight, 0);
    let random = RandomFloat(0, tierTotalWeight);
    
    for (const item of tierItems) {
      random -= item.weight;
      if (random <= 0) {
        return item.item;
      }
    }
    
    return tierItems[tierItems.length - 1]?.item || null;
  }

  /**
   * 获取所有条目
   */
  getAllItems(): WeightedItem<T>[] {
    return [...this.items];
  }

  /**
   * 获取条目数量
   */
  getCount(): number {
    return this.items.length;
  }
}

/**
 * 注册函数 - 由 Bridge 调用
 */
export function register${className}(): void {
  ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");
}
`;
}

/**
 * Generate Lua ability wrapper code for Dota2 ability_lua system.
 *
 * T125-R1: Mainline integration of generateAbilityLuaWrapper().
 *
 * Delegates to lua-ability generator with same-file modifier support.
 * Extracts config from WritePlanEntry's metadata when available,
 * or uses sensible defaults from patternId.
 */
function generateLuaAbilityCode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): GeneratedCode {
  // T172-R1: Prefer entry.parameters for case-specific fill, fallback to entry.metadata
  const caseParams = entry.parameters || entry.metadata || {};
  const abilityName = caseParams.abilityName as string || patternId.replace(/[^a-zA-Z0-9_]/g, "_");
  const modifierConfig = caseParams.modifierConfig as AbilityModifierConfig | undefined;

  const config: AbilityLuaWrapperConfig = {
    abilityName,
    onSpellStart: caseParams.onSpellStart as string | undefined,
    additionalMethods: caseParams.additionalMethods as string | undefined,
    modifierConfig,
  };

  const content = generateAbilityLuaWrapper(config);

  return {
    content,
    language: "lua",
    exports: [abilityName, ...(modifierConfig ? [modifierConfig.name] : [])],
  };
}

function generateKVCode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): GeneratedCode {
  const patternSegment = patternId.includes(".")
    ? patternId.split(".").pop() || patternId
    : patternId;
  const baseName = patternSegment;
  const featureSegment = entry.targetPath.includes("feature_")
    ? entry.targetPath.match(/feature_([^/]+)/)?.[1]
    : entry.targetPath.includes("micro_feature_")
      ? entry.targetPath.match(/micro_feature_([^/]+)/)?.[1]
      : featureId;
  const abilityName = featureSegment
    ? `rw_${featureSegment}_${baseName}`
    : `rw_${baseName}`;

  const entryMetadata = entry.metadata || {};
  const params = {
    cooldown: entryMetadata.abilityCooldown as string | undefined,
    manaCost: entryMetadata.abilityManaCost as string | undefined,
    duration: entryMetadata.abilityDuration as string | undefined,
    castRange: entryMetadata.abilityCastRange as string | undefined,
  };

  const kvInput: KVGeneratorInput = {
    routeId: `route_${patternId}_kv`,
    sourceUnitId: entry.sourceModule,
    generatorFamily: "dota2-kv",
    hostTarget: "ability_kv",
    abilityConfig: {
      abilityName,
      baseClass: "ability_datadriven",
      abilityType: "DOTA_ABILITY_TYPE_BASIC",
      behavior: "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
      abilityCooldown: params.cooldown || "8.0",
      abilityManaCost: params.manaCost || "50",
      abilityCastRange: params.castRange || "0",
      abilityCastPoint: "0.1",
      maxLevel: "4",
      requiredLevel: "1",
      levelsBetweenUpgrades: "3",
      precache: [],
    },
    rationale: [
      `Generated from pattern: ${patternId}`,
      `Module: ${entry.sourceModule}`,
      `Feature: ${featureSegment}`,
    ],
    blockers: entry.deferred ? [entry.deferredReason || "Entry marked deferred"] : [],
  };

  const kvOutput = generateAbilityKV(kvInput);

  return {
    content: kvOutput.kvBlock,
    language: "kv",
    exports: [abilityName],
  };
}

/**
 * Dota2 Adapter - Code Generator
 * 
 * 根据 WritePlanEntry 生成真实可执行的宿主代码
 * T034 修复：从 contentSummary 改为生成真实代码
 */

import { WritePlanEntry } from "../assembler/index.js";
import { generateAbilityLuaWrapper, AbilityLuaWrapperConfig, AbilityModifierConfig } from "./lua-ability/index.js";
import { generateAbilityKV, KVGeneratorInput } from "./kv/index.js";

/**
 * 生成结果
 */
export interface GeneratedCode {
  /** 完整代码内容 */
  content: string;
  /** 代码语言 */
  language: "typescript" | "tsx" | "less" | "css" | "json" | "lua" | "kv";
  /** 导出的符号名 */
  exports: string[];
}

/**
 * 根据 Pattern ID 生成服务端代码
 */
function generateServerCode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): string {
  const baseName = entry.targetPath.split("/").pop()?.replace(".ts", "") || "module";
  const className = toPascalCase(baseName);
  
  switch (patternId) {
    case "input.key_binding":
      return generateKeyBindingCode(className, featureId, entry);
    case "effect.dash":
      return generateDashEffectCode(className, featureId, entry);
    case "resource.basic_pool":
      return generateResourcePoolCode(className, featureId, entry);
    case "data.weighted_pool":
      return generateWeightedPoolCode(className, featureId, entry);
    case "rule.selection_flow":
      return generateSelectionFlowCode(className, featureId, entry);
    case "ui.key_hint":
    case "ui.selection_modal":
    case "ui.resource_bar":
      // UI patterns 应该生成在 panorama，这里返回空或注释
      return `// UI Pattern '${patternId}' should be generated in panorama directory\n`;
    default:
      return generateDefaultServerCode(className, featureId, entry);
  }
}

/**
 * 生成按键绑定代码
 */
function generateKeyBindingCode(className: string, featureId: string, entry: WritePlanEntry): string {
  return `/**
 * ${className}
 * 按键绑定模块 - Generated by Rune Weaver
 */

export class ${className} {
  private static instance: ${className};
  private boundKeys: Set<string> = new Set();

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  /**
   * 绑定按键
   */
  bindKey(key: string, callback: () => void): void {
    if (this.boundKeys.has(key)) {
      print(\`[Rune Weaver] Key \${key} already bound, skipping\`);
      return;
    }
    
    this.boundKeys.add(key);
    
    // 监听按键事件 - 使用 GameRules 和自定义事件系统
    if (GameRules && (GameRules as any).XNetTable) {
      // 通过 XNetTable 或自定义事件监听按键
      CustomGameEventManager.RegisterListener("player_key_pressed", (event: any) => {
        if (event.key === key) {
          callback();
        }
      });
    }
    
    print(\`[Rune Weaver] Bound key: \${key}\`);
  }

  /**
   * 解绑按键
   */
  unbindKey(key: string): void {
    this.boundKeys.delete(key);
    print(\`[Rune Weaver] Unbound key: \${key}\`);
  }
}

/**
 * 注册函数 - 由 Bridge 调用
 */
export function register${className}(): void {
  const binding = ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");
  
  // TODO: Add your key bindings here
  // Example: binding.bindKey("Q", () => { /* your logic */ });
}
`;
}

/**
 * 生成冲刺效果代码
 */
function generateDashEffectCode(className: string, featureId: string, entry: WritePlanEntry): string {
  return `import { BaseAbility } from "../../../utils/dota_ts_adapter";

/**
 * ${className}
 * 冲刺效果 - Generated by Rune Weaver
 */

export class ${className} extends BaseAbility {
  private readonly DEFAULT_DISTANCE: number = 300;
  private readonly DEFAULT_SPEED: number = 1200;

  /**
   * 执行冲刺
   */
  executeDash(): void {
    const caster = this.GetCaster();
    if (!caster || !IsServer()) return;

    const direction = caster.GetForwardVector();
    const distance = this.GetSpecialValueFor("distance") || this.DEFAULT_DISTANCE;
    const speed = this.GetSpecialValueFor("speed") || this.DEFAULT_SPEED;

    // 计算目标位置
    const startPos = caster.GetAbsOrigin();
    const endPos = startPos.__add(direction.__mul(distance)) as Vector;

    // 执行位移
    caster.AddNewModifier(
      caster,
      this,
      "modifier_${className.toLowerCase()}_motion",
      {
        duration: distance / speed,
        x: endPos.x,
        y: endPos.y,
        z: endPos.z,
      }
    );

    // 播放特效
    const particleId = ParticleManager.CreateParticle(
      "particles/units/heroes/hero_phantom_assassin/phantom_assassin_phantom_strike_start.vpcf",
      ParticleAttachment.ABSORIGIN_FOLLOW,
      caster
    );
    ParticleManager.ReleaseParticleIndex(particleId);

    // 播放音效
    caster.EmitSound("Hero_PhantomAssassin.PhantomStrike");
  }

  /**
   * 施法时调用
   */
  OnSpellStart(): void {
    this.executeDash();
  }
}

/**
 * 注册函数 - 由 Bridge 调用
 */
export function register${className}(): void {
  print("[Rune Weaver] ${className} registered");
}
`;
}

/**
 * 生成资源池代码
 */
function generateResourcePoolCode(className: string, featureId: string, entry: WritePlanEntry): string {
  return `/**
 * ${className}
 * 资源池（冷却/能量系统）- Generated by Rune Weaver
 */

interface ResourceState {
  current: number;
  max: number;
  lastUsedTime: number;
}

export class ${className} {
  private static instance: ${className};
  private playerResources: Map<number, ResourceState> = new Map();
  private readonly defaultMax: number = 100;
  private readonly regenRate: number = 0;

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  /**
   * 初始化玩家资源
   */
  initPlayer(playerId: number, maxValue?: number): void {
    this.playerResources.set(playerId, {
      current: maxValue || this.defaultMax,
      max: maxValue || this.defaultMax,
      lastUsedTime: 0,
    });
    print(\`[Rune Weaver] Initialized resource for player \${playerId}\`);
  }

  /**
   * 检查是否有足够资源
   */
  hasEnough(playerId: number, amount: number): boolean {
    const res = this.playerResources.get(playerId);
    if (!res) return false;
    return res.current >= amount;
  }

  /**
   * 消耗资源
   */
  consume(playerId: number, amount: number): boolean {
    if (!this.hasEnough(playerId, amount)) return false;
    
    const res = this.playerResources.get(playerId)!;
    res.current -= amount;
    res.lastUsedTime = GameRules.GetGameTime();
    
    this.syncToClient(playerId);
    return true;
  }

  /**
   * 恢复资源
   */
  restore(playerId: number, amount: number): void {
    const res = this.playerResources.get(playerId);
    if (!res) return;
    
    res.current = math.min(res.current + amount, res.max);
    this.syncToClient(playerId);
  }

  /**
   * 获取当前值
   */
  getCurrent(playerId: number): number {
    return this.playerResources.get(playerId)?.current || 0;
  }

  /**
   * 获取最大值
   */
  getMax(playerId: number): number {
    return this.playerResources.get(playerId)?.max || 0;
  }

  /**
   * 同步到客户端（通过 NetTable）
   */
  private syncToClient(playerId: number): void {
    const res = this.playerResources.get(playerId);
    if (!res) return;
    
    // 使用 XNetTable 同步（如果可用）
    if ((GameRules as any).XNetTable) {
      (GameRules as any).XNetTable.SetTableValue(
        "rune_weaver_resources",
        \`player_\${playerId}\`,
        { current: res.current, max: res.max }
      );
    }
  }

  /**
   * 每帧更新
   */
  onTick(): void {
    if (this.regenRate <= 0) return;
    
    const now = GameRules.GetGameTime();
    for (const [playerId, res] of this.playerResources) {
      if (res.current < res.max) {
        // 简单的自动恢复逻辑
        // 实际实现可能需要更复杂的计时器
      }
    }
  }
}

/**
 * 注册函数 - 由 Bridge 调用
 */
export function register${className}(): void {
  const pool = ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");
  
  // 监听玩家连接事件 - 使用 GameRules 和自定义事件
  ListenToGameEvent("player_connect_full", (event: any) => {
    const playerId = event.PlayerID;
    if (playerId !== undefined) {
      pool.initPlayer(playerId);
    }
  }, undefined);
}
`;
}

/**
 * 生成加权池代码
 */
function generateWeightedPoolCode(className: string, featureId: string, entry: WritePlanEntry): string {
  // T172-R1: Use entry.parameters for case-specific data if available
  const caseParams = entry.parameters as { entries?: Array<{ id: string; label: string; description: string; weight: number; tier?: string }>, tiers?: string[] } | undefined;
  const entries = caseParams?.entries;
  const tiers = caseParams?.tiers;

  const entriesCode = entries && entries.length > 0
    ? entries.map(e => `    { id: "${e.id}", label: "${e.label}", description: "${e.description}", weight: ${e.weight}, tier: "${e.tier || 'R'}" }`).join(',\n')
    : '    // TODO: Add talent entries';

  return `/**
 * ${className}
 * 加权随机池 - Generated by Rune Weaver
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

export class ${className}<T = TalentEntry> {
  private items: WeightedItem<T>[] = [];
  private totalWeight: number = 0;

  constructor() {
${entries ? `    // T172-R1: Initialize with case-specific entries
    const initialEntries: T[] = [
${entriesCode}
    ];
    for (const entry of initialEntries) {
      this.add(entry, entry.weight, entry.tier ? this.tierToNumber(entry.tier) : 0);
    }` : `    // TODO: Add initial talent entries`}
  }

  private tierToNumber(tier: string): number {
    const tierMap: Record<string, number> = { 'R': 1, 'SR': 2, 'SSR': 3, 'UR': 4 };
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
  print("[Rune Weaver] ${className} registered");
}
`;
}

/**
 * 生成选择流程代码
 */
function generateSelectionFlowCode(className: string, featureId: string, entry: WritePlanEntry): string {
  // T172-R1: Use entry.parameters for case-specific data if available
  const caseParams = entry.parameters as { choiceCount?: number; selectionPolicy?: string } | undefined;
  const choiceCount = caseParams?.choiceCount || 3;
  const selectionPolicy = caseParams?.selectionPolicy || 'single';

  return `// Pool import removed - only used if data.weighted_pool pattern is selected

/**
 * ${className}
 * 选择流程（如三选一天赋）- Generated by Rune Weaver
 */

interface SelectionOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface PlayerSelection {
  playerId: number;
  options: SelectionOption[];
  selectedIndex: number;
  isConfirmed: boolean;
}

export class ${className} {
  private static instance: ${className};
  private activeSelections: Map<number, PlayerSelection> = new Map();
  private selectionCallbacks: Map<number, (option: SelectionOption) => void> = new Map();

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  /**
   * 开始选择流程
   */
  startSelection(
    playerId: number,
    options: SelectionOption[],
    onSelected: (option: SelectionOption) => void
  ): void {
    if (options.length === 0) {
      print(\`[Rune Weaver] Cannot start selection with empty options\`);
      return;
    }

    this.activeSelections.set(playerId, {
      playerId,
      options,
      selectedIndex: -1,
      isConfirmed: false,
    });
    this.selectionCallbacks.set(playerId, onSelected);

    // 发送到客户端显示选择 UI
    this.sendToClient(playerId, options);
    
    print(\`[Rune Weaver] Started selection for player \${playerId} with \${options.length} options\`);
  }

  /**
   * 玩家选择了一个选项
   */
  onPlayerSelect(playerId: number, optionIndex: number): void {
    const selection = this.activeSelections.get(playerId);
    if (!selection) return;

    if (optionIndex < 0 || optionIndex >= selection.options.length) {
      print(\`[Rune Weaver] Invalid option index: \${optionIndex}\`);
      return;
    }

    selection.selectedIndex = optionIndex;
    print(\`[Rune Weaver] Player \${playerId} selected option \${optionIndex}\`);
  }

  /**
   * 玩家确认选择
   */
  onPlayerConfirm(playerId: number): void {
    const selection = this.activeSelections.get(playerId);
    if (!selection) return;

    if (selection.selectedIndex === -1) {
      print(\`[Rune Weaver] Player \${playerId} has not selected any option\`);
      return;
    }

    selection.isConfirmed = true;
    const selectedOption = selection.options[selection.selectedIndex];
    
    // 调用回调
    const callback = this.selectionCallbacks.get(playerId);
    if (callback) {
      callback(selectedOption);
    }

    // 清理
    this.activeSelections.delete(playerId);
    this.selectionCallbacks.delete(playerId);
    
    print(\`[Rune Weaver] Player \${playerId} confirmed selection: \${selectedOption.name}\`);
  }

  /**
   * 发送到客户端
   */
  private sendToClient(playerId: number, options: SelectionOption[]): void {
    // 使用 XNetTable 发送到客户端
    if ((GameRules as any).XNetTable) {
      (GameRules as any).XNetTable.SetTableValue(
        "rune_weaver_selection",
        \`player_\${playerId}\`,
        { options, status: "waiting" }
      );
    }
  }

  /**
   * 从加权池生成选项
   */
  generateOptionsFromPool<T extends SelectionOption>(
    pool: any,
    count: number
  ): T[] {
    if (pool && typeof pool.drawMultiple === "function") {
      return pool.drawMultiple(count);
    }
    print(\`[Rune Weaver] Pool not available for \${className}, using default options\`);
    return [];
  }
}

/**
 * 注册函数 - 由 Bridge 调用
 */
export function register${className}(): void {
  const flow = ${className}.getInstance();
  print("[Rune Weaver] ${className} registered");
  
  // TODO: 设置网络监听，接收客户端的选择确认
}
`;
}

/**
 * 生成默认服务端代码
 */
function generateDefaultServerCode(className: string, featureId: string, entry: WritePlanEntry): string {
  return `/**
 * ${className}
 * 默认模块 - Generated by Rune Weaver
 */

export class ${className} {
  private static instance: ${className};

  static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  /**
   * 初始化
   */
  init(): void {
    print("[Rune Weaver] ${className} initialized");
  }
}

/**
 * 注册函数 - 由 Bridge 调用
 */
export function register${className}(): void {
  const instance = ${className}.getInstance();
  instance.init();
  print("[Rune Weaver] ${className} registered");
}
`;
}

/**
 * 生成 UI 代码 (TSX)
 */
function generateUICode(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): string {
  const baseName = entry.targetPath.split("/").pop()?.replace(".tsx", "") || "Component";
  const componentName = toPascalCase(baseName);
  
  switch (patternId) {
    case "ui.key_hint":
      return generateKeyHintComponent(componentName, featureId);
    case "ui.selection_modal":
      return generateSelectionModalComponent(componentName, featureId, entry);
    case "ui.resource_bar":
      return generateResourceBarComponent(componentName, featureId);
    default:
      return generateDefaultUIComponent(componentName, featureId);
  }
}

/**
 * 生成按键提示组件
 */
function generateKeyHintComponent(componentName: string, featureId: string): string {
  return `import React, { useState, useEffect } from "react";

interface ${componentName}Props {
  keyText?: string;
  description?: string;
  showDescription?: boolean;
  isActive?: boolean;
}

/**
 * ${componentName}
 * 按键提示组件 - Generated by Rune Weaver
 */
export function ${componentName}(props: ${componentName}Props) {
  const { 
    keyText = "Q", 
    description = "冲刺技能", 
    showDescription = true,
    isActive = true 
  } = props;

  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    // 监听按键事件
    const onKeyPressed = () => setIsPressed(true);
    const onKeyReleased = () => setIsPressed(false);
    
    // TODO: 绑定到实际的按键事件
    
    return () => {
      // 清理事件监听
    };
  }, []);

  return (
    <Panel className={\`${componentName.toLowerCase()}-root \${isActive ? "active" : "inactive"} \${isPressed ? "pressed" : ""}\`}>
      <Panel className="key-icon">
        <Label text={keyText} />
      </Panel>
      {showDescription && (
        <Label className="key-description" text={description} />
      )}
    </Panel>
  );
}

export default ${componentName};
`;
}

/**
 * 生成选择模态框组件
 */
function generateSelectionModalComponent(componentName: string, featureId: string, entry: WritePlanEntry): string {
  // T172-R1: Use entry.parameters for case-specific data if available
  const caseParams = entry.parameters as { title?: string; description?: string } | undefined;
  const title = caseParams?.title || "Choose Your Talent";
  const description = caseParams?.description || "Select one of the following talents";

  return `import React, { useState, useEffect } from "react";

interface SelectionItem {
  id: string;
  name: string;
  description: string;
  icon?: string;
  tier?: string;
}

interface ${componentName}Props {
  items?: SelectionItem[];
  title?: string;
  onSelect?: (index: number) => void;
  onConfirm?: () => void;
  visible?: boolean;
}

/**
 * ${componentName}
 * 选择模态框 - Generated by Rune Weaver
 */
export function ${componentName}(props: ${componentName}Props) {
  const {
    items = [],
    title = "${title}",
    description = "${description}",
    onSelect,
    onConfirm,
    visible = false,
  } = props;

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    // 监听服务端发送的选择选项
    // TODO: 绑定到 XNetTable 或 CustomNetTables
    
    return () => {
      // 清理
    };
  }, []);

  if (!visible || items.length === 0) {
    return null;
  }

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelect?.(index);
  };

  const handleConfirm = () => {
    if (selectedIndex !== -1) {
      onConfirm?.();
    }
  };

  return (
    <Panel className="${componentName.toLowerCase()}-overlay">
      <Panel className="${componentName.toLowerCase()}-modal">
        <Panel className="modal-header">
          <Label text={title} />
          {description && <Label className="modal-description" text={description} />}
        </Panel>
        
        <Panel className="modal-content">
          {items.map((item, index) => (
            <Panel
              key={item.id}
              className={\`selection-card \${selectedIndex === index ? "selected" : ""}\`}
              onactivate={() => handleSelect(index)}
            >
              {item.icon && <Image src={item.icon} />}
              <Label className="card-name" text={item.name} />
              <Label className="card-description" text={item.description} />
              {item.tier && <Label className={\`card-tier tier-\${item.tier.toLowerCase()}\`} text={item.tier} />}
            </Panel>
          ))}
        </Panel>
        
        <Panel className="modal-footer">
          <Button
            className={\`btn-confirm \${selectedIndex === -1 ? "disabled" : ""}\`}
            onactivate={handleConfirm}
          >
            <Label text="确认选择" />
          </Button>
        </Panel>
      </Panel>
    </Panel>
  );
}

export default ${componentName};
`;
}

/**
 * 生成资源条组件
 */
function generateResourceBarComponent(componentName: string, featureId: string): string {
  return `import React, { useState, useEffect } from "react";

interface ${componentName}Props {
  currentValue?: number;
  maxValue?: number;
  label?: string;
  color?: string;
  showText?: boolean;
}

/**
 * ${componentName}
 * 资源条组件 - Generated by Rune Weaver
 */
export function ${componentName}(props: ${componentName}Props) {
  const {
    currentValue = 100,
    maxValue = 100,
    label = "Mana",
    color = "#3498db",
    showText = true,
  } = props;

  const [current, setCurrent] = useState(currentValue);
  const [max, setMax] = useState(maxValue);

  useEffect(() => {
    // 监听 NetTable 更新
    // TODO: 绑定到 CustomNetTables 或 XNetTable
    
    const checkResource = () => {
      // 示例：从 NetTable 读取值
      // const data = CustomNetTables.GetTableValue("rune_weaver_resources", "player_0");
      // if (data) {
      //   setCurrent(data.current);
      //   setMax(data.max);
      // }
    };

    const intervalId = setInterval(checkResource, 100);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const percentage = max > 0 ? (current / max) * 100 : 0;

  return (
    <Panel className="${componentName.toLowerCase()}-root">
      {label && <Label className="resource-label" text={label} />}
      <ProgressBar
        className="resource-bar"
        value={percentage}
        min={0}
        max={100}
        style={{ backgroundColor: color }}
      />
      {showText && (
        <Label
          className="resource-text"
          text={\`\${Math.floor(current)} / \${max}\`}
        />
      )}
    </Panel>
  );
}

export default ${componentName};
`;
}

/**
 * 生成默认 UI 组件
 */
function generateDefaultUIComponent(componentName: string, featureId: string): string {
  return `import React from "react";

interface ${componentName}Props {
  data?: any;
}

/**
 * ${componentName}
 * 默认 UI 组件 - Generated by Rune Weaver
 */
export function ${componentName}(props: ${componentName}Props) {
  return (
    <Panel className="${componentName.toLowerCase()}-root">
      <Label text="${componentName}" />
    </Panel>
  );
}

export default ${componentName};
`;
}

/**
 * 生成 LESS 样式
 */
function generateLessStyles(
  patternId: string,
  entry: WritePlanEntry,
  featureId: string
): string {
  const baseName = entry.targetPath.split("/").pop()?.replace(".less", "") || "component";
  
  return `/* Generated by Rune Weaver */
/* ${featureId} - ${patternId} */

.${baseName.toLowerCase()}-root {
  // 基础样式
  width: 100%;
  height: fit-children;
  
  // TODO: 添加组件特定样式
}
`;
}

/**
 * 主生成函数
 */
export function generateCode(
  entry: WritePlanEntry,
  featureId: string
): GeneratedCode {
  const patternId = entry.sourcePattern;
  const isUI = entry.targetPath.includes("panorama");
  const isLess = entry.targetPath.endsWith(".less");
  const isLua = entry.contentType === "lua" || entry.targetPath.endsWith(".lua");
  const isKV = entry.contentType === "kv";

  if (isLua) {
    return generateLuaAbilityCode(patternId, entry, featureId);
  }

  if (isKV) {
    return generateKVCode(patternId, entry, featureId);
  }

  let content: string;
  let language: "typescript" | "tsx" | "less" | "css" | "json";
  let exports: string[] = [];

  if (isLess) {
    content = generateLessStyles(patternId, entry, featureId);
    language = "less";
  } else if (isUI) {
    content = generateUICode(patternId, entry, featureId);
    language = "tsx";
    // 提取导出的组件名
    const baseName = entry.targetPath.split("/").pop()?.replace(".tsx", "") || "Component";
    exports = [toPascalCase(baseName)];
  } else {
    content = generateServerCode(patternId, entry, featureId);
    language = "typescript";
    // 提取导出的类名和函数名
    const baseName = entry.targetPath.split("/").pop()?.replace(".ts", "") || "Module";
    exports = [toPascalCase(baseName), `register${toPascalCase(baseName)}`];
  }

  return {
    content,
    language,
    exports,
  };
}

/**
 * 工具函数：转换为 PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

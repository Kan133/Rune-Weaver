/**
 * Dota2 Adapter - Pattern Library
 * 
 * Dota2 宿主特定的 Pattern 实现元数据
 * 对齐 PATTERN-SPEC.md 与 PatternMeta 升级规范
 */

import type {
  PatternMeta,
  PatternResponsibility,
  PatternNonGoal,
  PatternHostBinding,
  PatternExample,
  PatternDependency,
  PatternValidationHint,
  PatternParam,
} from "../../../core/patterns";

/**
 * Dota2 Pattern 元数据
 * 扩展 PatternMeta 添加 Dota2 特定字段
 */
export interface Dota2PatternMeta extends PatternMeta {
  /** 宿主目标（向后兼容） */
  hostTarget: "dota2.server" | "dota2.panorama" | "dota2.shared" | "dota2.config";
  /** 输出文件类型（向后兼容） */
  outputTypes: ("typescript" | "tsx" | "less" | "kv" | "json" | "lua")[];
  /** Dota2 特定参数 */
  dota2Params?: {
    /** 是否需要自定义 Ability */
    requiresAbility?: boolean;
    /** 是否需要 Modifier */
    requiresModifier?: boolean;
    /** 是否需要 Panorama 面板 */
    requiresPanel?: boolean;
  };
}

/**
 * 创建 Dota2 Pattern 的辅助函数
 */
function createDota2Pattern(params: {
  id: string;
  category: string;
  summary: string;
  description?: string;
  responsibilities: PatternResponsibility[];
  nonGoals: PatternNonGoal[];
  capabilities: string[];
  inputs: PatternMeta["inputs"];
  outputs: PatternMeta["outputs"];
  parameters?: PatternParam[];
  constraints?: string[];
  dependencies?: PatternDependency[];
  validationHints?: PatternValidationHint[];
  examples?: PatternExample[];
  hostTarget: Dota2PatternMeta["hostTarget"];
  outputTypes: Dota2PatternMeta["outputTypes"];
  dota2Params?: Dota2PatternMeta["dota2Params"];
}): Dota2PatternMeta {
  // 自动构建 hostBindings
  const hostBindings: PatternHostBinding[] = [{
    hostId: "dota2",
    target: hostTargetMap[params.hostTarget],
    outputTypes: params.outputTypes,
  }];

  return {
    ...params,
    hostBindings,
  };
}

/**
 * Dota2 host binding 目标映射
 * 对齐 docs/HOST-INTEGRATION-DOTA2.md 的命名空间规范
 */
const hostTargetMap: Record<Dota2PatternMeta["hostTarget"], string> = {
  "dota2.server": "game/scripts/src/rune_weaver/generated/server",
  "dota2.shared": "game/scripts/src/rune_weaver/generated/shared",
  "dota2.panorama": "content/panorama/src/rune_weaver/generated/ui",
  "dota2.config": "game/scripts/src/rune_weaver/generated/config",
};

/**
 * 首批 Dota2 Pattern 定义 - 升级后完整版
 */
export const dota2Patterns: Dota2PatternMeta[] = [
  // ============================================================================
  // 输入类
  // ============================================================================
  createDota2Pattern({
    id: "input.key_binding",
    category: "input",
    summary: "按键输入绑定",
    description: "监听玩家按键输入并转换为游戏内事件，支持任意键盘按键绑定",
    responsibilities: [
      { text: "监听指定按键的按下/释放事件", core: true },
      { text: "将按键事件转换为游戏内自定义事件", core: true },
      { text: "处理按键冲突检测", core: false },
    ],
    nonGoals: [
      { text: "不处理鼠标点击/移动输入", alternative: "使用 input.mouse_binding" },
      { text: "不处理组合键（如 Ctrl+Q）", alternative: "使用 input.combo_binding" },
    ],
    capabilities: ["key_detection", "event_emission"],
    inputs: [{ name: "key", type: "string", required: true }],
    outputs: [{ name: "event", type: "event" }],
    parameters: [
      { name: "key", type: "string", required: true, description: "绑定的按键，如 Q、F4" },
      { name: "triggerMode", type: "enum", required: false, description: "触发模式", defaultValue: "keypress" },
      { name: "eventName", type: "string", required: true, description: "触发的事件名称" },
    ],
    constraints: [
      "key 必须是有效的 Dota2 键位名称",
      "不能与现有技能按键冲突",
    ],
    validationHints: [
      {
        stage: "host",
        rule: "key 必须在 Dota2 支持的键位列表中",
        message: "指定的按键可能不被 Dota2 支持",
        severity: "warning",
      },
    ],
    examples: [
      {
        name: "Q键技能",
        description: "将 Q 键绑定到技能释放",
        params: { key: "Q", eventName: "ability_q_cast" },
        useCase: "主动技能按键",
      },
    ],
    hostTarget: "dota2.server",
    outputTypes: ["typescript"],
    dota2Params: { requiresAbility: true },
  }),

  // ============================================================================
  // 数据类
  // ============================================================================
  createDota2Pattern({
    id: "data.weighted_pool",
    category: "data",
    summary: "带权重的数据池",
    description: "管理带权重的数据集合，支持按权重随机抽取，可选支持当前会话池状态追踪",
    responsibilities: [
      { text: "存储带权重的数据项", core: true },
      { text: "执行加权随机抽取", core: true },
      { text: "支持分层（如稀有度）管理", core: true },
      { text: "可选追踪当前会话池状态（remaining/owned/currentChoice）", core: false },
    ],
    nonGoals: [
      { text: "不处理跨局持久化", alternative: "MVP 只需单局持久化" },
      { text: "不处理网络同步", alternative: "使用 data.networked_pool" },
      { text: "不负责 selection-confirmed commit 行为", alternative: "由 rule.selection_flow 负责" },
      { text: "不删除静态 talent definitions", alternative: "静态定义不可变，只追踪会话状态" },
    ],
    capabilities: ["weighted_selection", "tier_management", "random_draw", "session_state_tracking"],
    inputs: [
      { name: "tiers", type: "string[]", required: true },
      { name: "weights", type: "Record<string, number>", required: false },
    ],
    outputs: [
      { name: "selected", type: "any" },
      { name: "remainingTalentIds", type: "string[]", required: false },
      { name: "ownedTalentIds", type: "string[]", required: false },
      { name: "currentChoiceIds", type: "string[]", required: false },
    ],
    parameters: [
      { name: "entries", type: "array", required: true, description: "候选条目列表" },
      { name: "weights", type: "object", required: false, description: "权重映射表" },
      { name: "tiers", type: "string[]", required: false, description: "稀有度层级，如 [R, SR, SSR, UR]" },
      { name: "choiceCount", type: "number", required: false, description: "每次抽取数量", defaultValue: 1 },
      { name: "drawMode", type: "enum", required: false, description: "抽取模式：single/multiple_without_replacement/multiple_with_replacement", defaultValue: "single" },
      { name: "duplicatePolicy", type: "enum", required: false, description: "重复策略：allow/avoid_when_possible/forbid", defaultValue: "allow" },
      { name: "poolStateTracking", type: "enum", required: false, description: "池状态追踪范围：none/session", defaultValue: "none" },
    ],
    constraints: [
      "tiers 不能为空数组",
      "weights 如果不提供将使用均等权重",
      "如果 duplicatePolicy=forbid，抽取实现必须不产生重复候选项",
      "如果 poolStateTracking=session，生成的代码必须创建当前会话可变状态",
      "静态条目定义必须保持不可变",
    ],
    validationHints: [
      {
        stage: "host",
        rule: "poolStateTracking=session 时必须生成 remainingTalentIds/ownedTalentIds 状态",
        message: "会话状态追踪需要生成对应的状态变量",
        severity: "warning",
      },
    ],
    examples: [
      {
        name: "天赋抽取池",
        description: "带 R/SR/SSR/UR 稀有度的天赋池，支持会话状态追踪",
        params: { tiers: ["R", "SR", "SSR", "UR"], weights: { R: 50, SR: 30, SSR: 15, UR: 5 }, choiceCount: 3, drawMode: "multiple_without_replacement", duplicatePolicy: "forbid", poolStateTracking: "session" },
        useCase: "三选一天赋系统",
      },
    ],
    hostTarget: "dota2.server",
    outputTypes: ["typescript"],
  }),

  // ============================================================================
  // 规则类
  // ============================================================================
  createDota2Pattern({
    id: "rule.selection_flow",
    category: "rule",
    summary: "多选一选择流程",
    description: "管理完整的多选一流程：展示候选项、接收选择、应用结果、提交池状态变更",
    responsibilities: [
      { text: "从数据池获取候选项", core: true },
      { text: "展示选择界面（通过 UI Pattern）", core: true },
      { text: "等待并接收玩家选择", core: true },
      { text: "应用选择结果", core: true },
      { text: "提交 selection-confirmed 后的池状态变更", core: true },
    ],
    nonGoals: [
      { text: "不管理数据池本身", alternative: "使用 data.weighted_pool" },
      { text: "不渲染 UI", alternative: "使用 ui.selection_modal" },
      { text: "不处理跨局持久化", alternative: "MVP 只需单局持久化" },
    ],
    capabilities: ["multi_choice", "player_selection", "result_apply", "pool_state_commit", "effect_mapping"],
    inputs: [
      { name: "candidates", type: "any[]", required: false },
      { name: "choiceCount", type: "number", required: true },
    ],
    outputs: [
      { name: "selected", type: "any" },
      { name: "unselected", type: "any[]" },
    ],
    parameters: [
      { name: "choiceCount", type: "number", required: true, description: "选项数量" },
      { name: "selectionPolicy", type: "enum", required: false, description: "选择策略", defaultValue: "single" },
      { name: "applyMode", type: "enum", required: false, description: "应用模式", defaultValue: "immediate" },
      { name: "postSelectionPoolBehavior", type: "enum", required: false, description: "选择后池行为：none/remove_selected_from_remaining/remove_selected_and_keep_unselected_eligible", defaultValue: "none" },
      { name: "trackSelectedItems", type: "boolean", required: false, description: "是否追踪已选项目到 owned 列表", defaultValue: false },
      { name: "effectApplication", type: "object", required: false, description: "效果应用配置，包含 enabled 和 rarityAttributeBonusMap" },
    ],
    constraints: [
      "choiceCount 必须大于 0",
      "candidates 长度必须大于等于 choiceCount",
      "如果 postSelectionPoolBehavior !== none，需要兼容的池状态源",
      "如果 trackSelectedItems = true，已选 id 必须追加到会话 owned 列表",
      "未选中的候选项必须保持 eligible（Talent Draw MVP）",
    ],
    dependencies: [
      { patternId: "data.weighted_pool", relation: "optional", reason: "用于获取候选项和池状态" },
      { patternId: "ui.selection_modal", relation: "optional", reason: "用于展示选择界面" },
    ],
    validationHints: [
      {
        stage: "host",
        rule: "postSelectionPoolBehavior 需要 poolStateTracking=session 的数据池",
        message: "池状态变更需要数据池支持会话状态追踪",
        severity: "warning",
      },
      {
        stage: "host",
        rule: "effectApplication.enabled=true 时效果映射必须包含所有稀有度",
        message: "效果映射必须完整覆盖候选项的稀有度",
        severity: "error",
      },
    ],
    examples: [
      {
        name: "三选一天赋",
        description: "展示3个天赋供玩家选择，选中后从剩余池移除，未选中保持可抽取",
        params: { choiceCount: 3, postSelectionPoolBehavior: "remove_selected_and_keep_unselected_eligible", trackSelectedItems: true },
        useCase: "天赋抽取系统",
      },
    ],
    hostTarget: "dota2.server",
    outputTypes: ["typescript"],
    dota2Params: { requiresAbility: false },
  }),

  // ============================================================================
  // 效果类
  // ============================================================================
  createDota2Pattern({
    id: "effect.dash",
    category: "effect",
    summary: "冲刺位移效果",
    description: "朝指定方向执行带有动画的位移",
    responsibilities: [
      { text: "计算位移目标位置", core: true },
      { text: "执行平滑位移（带速度控制）", core: true },
      { text: "播放冲刺特效", core: false },
    ],
    nonGoals: [
      { text: "不处理无敌/免控状态", alternative: "配合 modifier.invulnerable" },
      { text: "不处理碰撞检测", alternative: "使用 effect.blink 实现无视地形" },
    ],
    capabilities: ["displacement", "directional", "speed_control"],
    inputs: [
      { name: "direction", type: "vector", required: false },
      { name: "distance", type: "number", required: true },
      { name: "speed", type: "number", required: false },
    ],
    outputs: [{ name: "completed", type: "boolean" }],
    parameters: [
      { name: "directionMode", type: "enum", required: false, description: "方向模式", defaultValue: "facing" },
      { name: "distance", type: "number", required: true, description: "位移距离" },
      { name: "speed", type: "number", required: false, description: "位移速度", defaultValue: 1200 },
    ],
    constraints: [
      "distance 必须为正数",
      "speed 必须为正数",
    ],
    examples: [
      {
        name: "向前冲刺",
        description: "朝面对方向冲刺300距离",
        params: { distance: 300, speed: 1200 },
        useCase: "位移技能",
      },
    ],
    hostTarget: "dota2.server",
    outputTypes: ["typescript"],
    dota2Params: { requiresModifier: true },
  }),

  createDota2Pattern({
    id: "effect.modifier_applier",
    category: "effect",
    summary: "修改器应用器",
    description: "将指定的 modifier（增益/减益效果）应用到目标实体，支持持续时间和层数控制",
    responsibilities: [
      { text: "创建并应用 modifier 到目标", core: true },
      { text: "管理 modifier 持续时间和层数", core: true },
      { text: "支持刷新和叠加逻辑", core: true },
    ],
    nonGoals: [
      { text: "不定义 modifier 的具体效果", alternative: "modifier 效果由具体定义决定" },
      { text: "不处理 modifier 的视觉效果", alternative: "使用 effect.visual_effect" },
      { text: "不管理 modifier 的触发逻辑", alternative: "使用 rule.trigger_condition" },
    ],
    capabilities: ["modifier_application", "duration_control", "stack_management", "refresh_logic"],
    inputs: [
      { name: "target", type: "entity", required: true },
      { name: "modifierId", type: "string", required: true },
      { name: "duration", type: "number", required: false },
      { name: "stacks", type: "number", required: false },
    ],
    outputs: [
      { name: "applied", type: "boolean" },
      { name: "modifierHandle", type: "any" },
    ],
    parameters: [
      { name: "modifierId", type: "string", required: true, description: "modifier 定义标识" },
      { name: "duration", type: "number", required: false, description: "持续时间（秒），-1表示永久", defaultValue: -1 },
      { name: "stacks", type: "number", required: false, description: "初始层数", defaultValue: 1 },
      { name: "refreshPolicy", type: "enum", required: false, description: "刷新策略", defaultValue: "refresh_duration" },
    ],
    constraints: [
      "modifierId 必须对应已定义的 modifier",
      "duration 为 -1 时表示永久 modifier",
      "stacks 必须为正整数",
    ],
    validationHints: [
      {
        stage: "host",
        rule: "modifierId 必须在 Dota2 的 modifier 定义中存在",
        message: "指定的 modifier 可能未定义",
        severity: "error",
      },
    ],
    examples: [
      {
        name: "天赋效果应用",
        description: "将选中的天赋效果应用到英雄",
        params: { modifierId: "talent_bonus_strength", duration: -1, stacks: 1 },
        useCase: "天赋选择系统",
      },
      {
        name: "临时增益",
        description: "给予英雄持续10秒的攻击力加成",
        params: { modifierId: "buff_attack_damage", duration: 10, stacks: 1 },
        useCase: "战斗增益",
      },
    ],
    hostTarget: "dota2.server",
    outputTypes: ["typescript", "kv"],
    dota2Params: { requiresModifier: true },
  }),

  createDota2Pattern({
    id: "effect.resource_consume",
    category: "effect",
    summary: "资源消耗效果",
    description: "执行资源（法力/能量等）扣除，支持不足检测",
    responsibilities: [
      { text: "检查资源是否充足", core: true },
      { text: "扣除指定数量的资源", core: true },
      { text: "返回扣除结果", core: true },
    ],
    nonGoals: [
      { text: "不管理资源总量", alternative: "使用 resource.basic_pool" },
      { text: "不处理资源回复", alternative: "使用 resource.regen" },
    ],
    capabilities: ["resource_deduction", "cost_validation", "insufficient_handling"],
    inputs: [
      { name: "amount", type: "number", required: true },
      { name: "resourceType", type: "string", required: false },
    ],
    outputs: [
      { name: "success", type: "boolean" },
      { name: "remaining", type: "number" },
    ],
    parameters: [
      { name: "amount", type: "number", required: true, description: "消耗数量" },
      { name: "resourceType", type: "string", required: false, description: "资源类型", defaultValue: "mana" },
      { name: "failBehavior", type: "enum", required: false, description: "不足时的行为", defaultValue: "block" },
    ],
    constraints: [
      "amount 必须为正数",
      "resourceType 必须是已定义的资源类型",
    ],
    dependencies: [
      { patternId: "resource.basic_pool", relation: "requires", reason: "需要资源池提供当前值" },
    ],
    examples: [
      {
        name: "法力消耗",
        description: "施法时消耗100点法力",
        params: { amount: 100, resourceType: "mana" },
        useCase: "技能施法消耗",
      },
    ],
    hostTarget: "dota2.server",
    outputTypes: ["typescript"],
  }),

  // ============================================================================
  // 资源类
  // ============================================================================
  createDota2Pattern({
    id: "resource.basic_pool",
    category: "resource",
    summary: "基础资源池",
    description: "管理数值型资源（法力、能量、怒气等）的存储、消耗和回复",
    responsibilities: [
      { text: "存储当前值和最大值", core: true },
      { text: "处理数值变化事件", core: true },
      { text: "支持自动回复", core: false },
    ],
    nonGoals: [
      { text: "不处理复杂资源类型（如充能层数）", alternative: "使用 resource.charge_pool" },
      { text: "不处理资源转换（如法力转怒气）", alternative: "使用 resource.converter" },
    ],
    capabilities: ["value_storage", "min_max_bounds", "change_events"],
    inputs: [
      { name: "max", type: "number", required: true },
      { name: "initial", type: "number", required: false },
      { name: "regenRate", type: "number", required: false },
    ],
    outputs: [
      { name: "current", type: "number" },
      { name: "max", type: "number" },
    ],
    parameters: [
      { name: "resourceId", type: "string", required: true, description: "资源标识" },
      { name: "maxValue", type: "number", required: true, description: "最大值" },
      { name: "regen", type: "number", required: false, description: "回复速率", defaultValue: 0 },
      { name: "visible", type: "boolean", required: false, description: "是否可见", defaultValue: true },
    ],
    constraints: [
      "max 必须为正数",
      "initial 如果提供必须在 [0, max] 范围内",
    ],
    examples: [
      {
        name: "法力池",
        description: "500点法力，每秒回复2点",
        params: { resourceId: "mana", maxValue: 500, regen: 2 },
        useCase: "英雄法力系统",
      },
    ],
    hostTarget: "dota2.shared",
    outputTypes: ["typescript"],
  }),

  // ============================================================================
  // UI 类
  // ============================================================================
  createDota2Pattern({
    id: "ui.selection_modal",
    category: "ui",
    summary: "选择弹窗",
    description: "模态弹窗展示多个选项供玩家选择，支持卡片布局、动画和占位符槽位",
    responsibilities: [
      { text: "展示多个可选项卡片", core: true },
      { text: "接收玩家点击选择", core: true },
      { text: "支持固定可见槽位数量", core: true },
      { text: "支持占位符槽位显示（当候选项不足时）", core: true },
      { text: "播放打开/选择动画", core: false },
    ],
    nonGoals: [
      { text: "不管理选择逻辑", alternative: "使用 rule.selection_flow" },
      { text: "不存储选择结果", alternative: "由调用方管理状态" },
      { text: "占位符槽位不可选择", alternative: "占位符仅用于显示，不触发选择事件" },
    ],
    capabilities: ["multi_card_display", "player_selection", "animation", "dismiss", "fixed_slot_count", "placeholder_slots"],
    inputs: [
      { name: "items", type: "any[]", required: false },
      { name: "layout", type: "'horizontal' | 'vertical' | 'grid'", required: false },
    ],
    outputs: [{ name: "selectedIndex", type: "number" }],
    parameters: [
      { name: "choiceCount", type: "number", required: true, description: "展示选项数量" },
      { name: "layoutPreset", type: "enum", required: false, description: "布局预设", defaultValue: "card_tray" },
      { name: "selectionMode", type: "enum", required: false, description: "选择模式", defaultValue: "single" },
      { name: "dismissBehavior", type: "enum", required: false, description: "关闭行为", defaultValue: "selection_only" },
      { name: "payloadShape", type: "enum", required: false, description: "展示载荷类型：simple_text/card/card_with_rarity/custom", defaultValue: "card" },
      { name: "minDisplayCount", type: "number", required: false, description: "最小可见槽位数量", defaultValue: 0 },
      { name: "placeholderConfig", type: "object", required: false, description: "占位符槽位配置，包含 id/name/description/disabled" },
    ],
    constraints: [
      "items 不能为空",
      "modal 打开时会暂停游戏（默认）",
      "minDisplayCount >= 0",
      "如果 minDisplayCount > choiceCount，警告除非明确需要固定槽位显示",
      "占位符配置必须至少包含 id 和 name",
      "占位符项目不可触发选择事件",
    ],
    validationHints: [
      {
        stage: "host",
        rule: "placeholderConfig 必须包含 id 和 name 字段",
        message: "占位符配置不完整",
        severity: "error",
      },
    ],
    examples: [
      {
        name: "天赋选择",
        description: "横向排列的三个天赋卡，支持稀有度显示和占位符",
        params: { choiceCount: 3, minDisplayCount: 3, payloadShape: "card_with_rarity", placeholderConfig: { id: "empty", name: "空槽位", disabled: true } },
        useCase: "天赋抽取系统",
      },
    ],
    hostTarget: "dota2.panorama",
    outputTypes: ["tsx", "less"],
    dota2Params: { requiresPanel: true },
  }),

  createDota2Pattern({
    id: "ui.key_hint",
    category: "ui",
    summary: "按键提示",
    description: "显示按键绑定提示，支持冷却指示",
    responsibilities: [
      { text: "显示按键图标和名称", core: true },
      { text: "显示冷却进度（如适用）", core: false },
    ],
    nonGoals: [
      { text: "不处理按键绑定逻辑", alternative: "使用 input.key_binding" },
      { text: "不显示复杂技能信息", alternative: "使用 ui.ability_tooltip" },
    ],
    capabilities: ["key_display", "binding_show", "cooldown_indicator"],
    inputs: [
      { name: "key", type: "string", required: true },
      { name: "abilityName", type: "string", required: false },
    ],
    outputs: [],
    parameters: [
      { name: "key", type: "string", required: true, description: "按键" },
      { name: "text", type: "string", required: false, description: "显示文本" },
      { name: "positionHint", type: "string", required: false, description: "位置提示" },
    ],
    constraints: [
      "key 显示为 Dota2 键位图标",
    ],
    examples: [
      {
        name: "Q键提示",
        description: "显示 Q 键图标",
        params: { key: "Q" },
        useCase: "技能按键提示",
      },
    ],
    hostTarget: "dota2.panorama",
    outputTypes: ["tsx", "less"],
    dota2Params: { requiresPanel: true },
  }),

  createDota2Pattern({
    id: "ui.resource_bar",
    category: "ui",
    summary: "资源条",
    description: "显示数值型资源的当前/最大值，支持变化动画",
    responsibilities: [
      { text: "以条形图显示资源量", core: true },
      { text: "播放数值变化动画", core: false },
      { text: "显示回复趋势指示", core: false },
    ],
    nonGoals: [
      { text: "不管理资源数值", alternative: "使用 resource.basic_pool" },
      { text: "不显示复杂资源详情", alternative: "使用 ui.resource_detail" },
    ],
    capabilities: ["value_display", "max_reference", "change_animation", "regen_indicator"],
    inputs: [
      { name: "current", type: "number", required: false },
      { name: "max", type: "number", required: false },
      { name: "color", type: "string", required: false },
    ],
    outputs: [],
    parameters: [
      { name: "resourceId", type: "string", required: true, description: "资源标识" },
      { name: "displayName", type: "string", required: false, description: "显示名称" },
      { name: "stylePreset", type: "string", required: false, description: "样式预设" },
    ],
    constraints: [
      "current 显示为 max 的百分比",
      "支持数值变化动画",
    ],
    examples: [
      {
        name: "法力条",
        description: "蓝色法力条",
        params: { resourceId: "mana", displayName: "法力" },
        useCase: "英雄法力显示",
      },
    ],
    hostTarget: "dota2.panorama",
    outputTypes: ["tsx", "less"],
    dota2Params: { requiresPanel: true },
  }),
];

/**
 * T125-R2: Short-Time Buff Ability Pattern
 *
 * T121 E2E verified: cast ability → apply short-duration buff modifier.
 * Produces BOTH lua wrapper (ability + same-file modifier) AND KV definition.
 *
 * This is the first pattern that naturally emits "lua" contentType entries
 * through the normal pipeline (no manual WritePlanEntry construction).
 */
const PATTERN_SHORT_TIME_BUFF: Dota2PatternMeta = createDota2Pattern({
  id: "dota2.short_time_buff",
  category: "ability",
  summary: "施放后获得短时增益/减益效果",
  description:
    "创建一个无目标技能，施放后对自身施加一个有持续时间的 modifier。" +
    "modifier 与 ability 定义在同一 Lua 文件中（same-file 策略）。" +
    "T121 验证：rw_test_v2 成功实现此模式。",
  responsibilities: [
    { text: "提供可施放的技能按钮和效果", core: true },
    { text: "管理技能冷却、法力消耗、持续时间", core: true },
    { text: "通过 ScriptFile 将 Lua 代码挂载到 Dota2 引擎", core: false },
  ],
  nonGoals: [
    { text: "不处理 Panorama 面板或 tooltip", alternative: "使用 ui.ability_tooltip" },
    { text: "不处理物品或被动效果", alternative: "使用 item.passive_modifiers" },
    { text: "不处理单位生成或 AI 行为", alternative: "使用 unit.spawn 或 unit.ai_behavior" },
  ],
  capabilities: [
    "ability_lua_shell",
    "modifier_same_file",
    "kv_ability_definition",
    "hero_attachment",
  ],
  inputs: [
    { name: "abilityName", type: "string", required: true, description: "能力名称（如 rw_my_buff）" },
    {
      name: "modifierName",
      type: "string",
      required: false,
      description: "modifier 名称（如 modifier_rw_my_buff），默认基于 abilityName 生成",
    },
    { name: "duration", type: "number", required: false, description: "buff 持续时间（秒）" },
    {
      name: "movespeedBonus",
      type: "number",
      required: false,
      description: "移速加成数值",
    },
    { name: "manaCost", type: "number", required: false, description: "法力消耗" },
    { name: "cooldown", type: "number", required: false, description: "冷却时间（秒）" },
  ],
  outputs: [
    { name: "lua_ability", type: "lua", description: "Lua ability + modifier wrapper" },
    { name: "kv_ability", type: "kv", description: "DOTAAbilities KV 条目" },
  ],
  parameters: [
    {
      name: "abilityName",
      type: "string",
      required: true,
      description: "生成的 ability 名称标识",
    },
    {
      name: "statusEffectParticle",
      type: "string",
      required: false,
      description: "状态特效粒子路径",
      defaultValue: "particles/status_fx/status_effect_frost.vpcf",
    },
  ],
  constraints: [
    "需要 x-template 或兼容 Dota2 addon 宿主",
    "需要 vscripts 加载器支持 ability_lua BaseClass",
  ],
  dependencies: [
    { patternId: "dota_ts_adapter", relation: "requires", reason: "_G registration for ability/modifier classes" },
    { patternId: "npc_abilities_custom", relation: "requires", reason: "KV definition must be under DOTAAbilities root" },
  ],
  validationHints: [
    {
      stage: "host",
      rule: "kv_in_dotaabilities",
      message: "KV 必须写在 npc_abilities_custom.txt 的 DOTAAbilities 根下",
      severity: "error",
    },
    {
      stage: "host",
      rule: "lua_same_file",
      message: "modifier 类必须在同一 Lua 文件中定义",
      severity: "error",
    },
    {
      stage: "host",
      rule: "use_addnewmodifier",
      message: "OnSpellStart 使用 caster:AddNewModifier() 而非 .apply()",
      severity: "error",
    },
    {
      stage: "host",
      rule: "pattch_constants",
      message: "粒子播放使用 PATTACH_* 全局常量",
      severity: "warning",
    },
  ],
  examples: [
    {
      name: "基础移速 buff",
      description: "生成 swift_buff.lua（含 modifier 同文件）+ KV 条目",
      params: { abilityName: "swift_buff", duration: 5, movespeedBonus: 60 },
      useCase: "施放后短时加速效果",
    },
  ],
  hostTarget: "dota2.server",
  // T125-R2: KEY — this enables lua contentType emission from normal pipeline
  outputTypes: ["lua", "kv"],
  dota2Params: {
    requiresAbility: true,
    requiresModifier: true,
  },
});

// Push all patterns into registry
dota2Patterns.push(PATTERN_SHORT_TIME_BUFF);

export function getPatternMeta(patternId: string): Dota2PatternMeta | undefined {
  return dota2Patterns.find((p) => p.id === patternId);
}

/**
 * 按类别获取 Pattern
 */
export function getPatternsByCategory(category: string): Dota2PatternMeta[] {
  return dota2Patterns.filter((p) => p.category === category);
}

/**
 * 按宿主目标获取 Pattern
 */
export function getPatternsByHostTarget(
  target: Dota2PatternMeta["hostTarget"]
): Dota2PatternMeta[] {
  return dota2Patterns.filter((p) => p.hostTarget === target);
}

/**
 * 验证 Dota2 Pattern 完整性
 */
export function validateDota2Pattern(pattern: Dota2PatternMeta): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 核心字段检查
  if (!pattern.id) errors.push("缺少 id");
  if (!pattern.summary) errors.push("缺少 summary");
  if (!pattern.responsibilities || pattern.responsibilities.length === 0) {
    errors.push("缺少 responsibilities");
  }
  
  // PATTERN-SPEC.md 入库最低标准
  if (!pattern.nonGoals || pattern.nonGoals.length === 0) {
    errors.push("缺少 nonGoals");
  }
  if (!pattern.parameters || pattern.parameters.length === 0) {
    errors.push("缺少 parameters");
  }
  if (!pattern.hostBindings || pattern.hostBindings.length === 0) {
    errors.push("缺少 hostBindings");
  }
  
  // Dota2 特定字段
  if (!pattern.hostTarget) errors.push("缺少 hostTarget");
  if (!pattern.outputTypes || pattern.outputTypes.length === 0) {
    errors.push("缺少 outputTypes");
  }

  return { valid: errors.length === 0, errors };
}

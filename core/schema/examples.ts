/**
 * Rune Weaver - Schema Examples
 * 
 * 与 docs/SCHEMA.md 对齐的示例数据
 */

import type {
  IntentSchema,
  Blueprint,
  ValidationIssue,
  AssemblyPlan,
  UIDesignSpec,
} from "./types";

// ============================================================================
// IntentSchema Examples
// ============================================================================

/**
 * 微功能示例：冲刺技能
 */
export const dashIntentSchemaExample: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "做一个按Q键向前冲刺的技能",
    goal: "实现一个可触发的位移技能",
  },
  classification: {
    intentKind: "micro-feature",
    confidence: "high",
  },
  requirements: {
    functional: [
      "按键触发技能",
      "向前位移效果",
      "冷却时间管理",
    ],
    interactions: ["Q键触发"],
    outputs: ["位移效果", "视觉反馈"],
  },
  constraints: {
    hostConstraints: ["Dota2 技能系统"],
  },
  normalizedMechanics: {
    trigger: true,
    outcomeApplication: true,
  },
  resolvedAssumptions: [
    "Q键作为默认触发键",
    "向前方向为英雄面朝方向",
  ],
};

/**
 * 系统型示例：三选一天赋系统
 */
export const talentSystemIntentSchemaExample: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "做一个升级时三选一天赋的系统",
    goal: "实现一个等级提升时的天赋选择系统",
  },
  classification: {
    intentKind: "standalone-system",
    confidence: "high",
  },
  requirements: {
    functional: [
      "检测英雄升级事件",
      "从天赋池随机抽取3个选项",
      "显示选择界面",
      "应用选中的天赋效果",
    ],
    dataNeeds: ["天赋定义表", "玩家选择记录"],
    outputs: ["天赋效果", "UI界面"],
  },
  constraints: {
    requiredPatterns: ["data.weighted_pool", "rule.selection_flow", "ui.selection_modal"],
  },
  normalizedMechanics: {
    trigger: true,
    candidatePool: true,
    weightedSelection: true,
    playerChoice: true,
    uiModal: true,
    outcomeApplication: true,
  },
  resolvedAssumptions: [
    "每级升级触发一次",
    "三选一机制",
    "从预定义天赋池中抽取",
  ],
};

// ============================================================================
// Blueprint Examples
// ============================================================================

export const dashBlueprintExample: Blueprint = {
  id: "dash_ability",
  version: "1.0",
  summary: "Q键触发的向前冲刺技能",
  sourceIntent: {
    intentKind: "micro-feature",
    goal: "实现一个可触发的位移技能",
    normalizedMechanics: {
      trigger: true,
      outcomeApplication: true,
    },
  },
  modules: [
    {
      id: "input_trigger",
      role: "Q键输入捕获",
      category: "trigger",
      responsibilities: ["监听Q键按下事件"],
      inputs: [],
      outputs: ["trigger_event"],
    },
    {
      id: "dash_effect",
      role: "冲刺效果应用",
      category: "effect",
      responsibilities: ["执行向前位移", "播放冲刺特效"],
      inputs: ["trigger_event"],
      outputs: ["dash_completed"],
    },
    {
      id: "cooldown_manager",
      role: "冷却时间管理",
      category: "resource",
      responsibilities: ["跟踪技能冷却", "阻止冷却中使用"],
      inputs: ["dash_completed"],
      outputs: ["cooldown_ready"],
    },
  ],
  connections: [
    { from: "input_trigger", to: "dash_effect", purpose: "触发冲刺效果" },
    { from: "dash_effect", to: "cooldown_manager", purpose: "开始冷却计时" },
  ],
  patternHints: [
    {
      category: "input",
      suggestedPatterns: ["input.key_binding"],
      rationale: "需要按键触发",
    },
    {
      category: "effect",
      suggestedPatterns: ["effect.dash"],
      rationale: "需要位移效果",
    },
  ],
  assumptions: [
    "Q键可用（未被其他技能占用）",
    "冲刺方向为英雄面朝方向",
  ],
  validations: [
    { scope: "assembly", rule: "必须绑定到可用按键", severity: "error" },
    { scope: "host", rule: "Dota2 客户端必须支持自定义技能", severity: "error" },
  ],
  readyForAssembly: true,
};

export const talentSystemBlueprintExample: Blueprint = {
  id: "talent_selection_system",
  version: "1.0",
  summary: "英雄升级时的三选一天赋系统",
  sourceIntent: {
    intentKind: "standalone-system",
    goal: "实现一个等级提升时的天赋选择系统",
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
  },
  modules: [
    {
      id: "level_tracker",
      role: "等级提升追踪",
      category: "trigger",
      responsibilities: ["监听英雄升级事件"],
      inputs: [],
      outputs: ["level_up_event"],
    },
    {
      id: "talent_pool",
      role: "天赋池管理",
      category: "data",
      responsibilities: ["存储可用天赋定义", "按权重随机抽取"],
      inputs: ["level_up_event"],
      outputs: ["selected_talents"],
    },
    {
      id: "selection_flow",
      role: "选择流程控制",
      category: "rule",
      responsibilities: ["管理选择状态", "处理玩家输入"],
      inputs: ["selected_talents", "player_choice"],
      outputs: ["chosen_talent"],
    },
    {
      id: "talent_ui",
      role: "选择界面",
      category: "ui",
      responsibilities: ["显示三个天赋选项", "响应玩家点击"],
      inputs: ["selected_talents"],
      outputs: ["player_choice"],
    },
    {
      id: "talent_applier",
      role: "天赋效果应用",
      category: "effect",
      responsibilities: ["将选中天赋应用到英雄"],
      inputs: ["chosen_talent"],
      outputs: ["talent_applied"],
    },
  ],
  connections: [
    { from: "level_tracker", to: "talent_pool", purpose: "触发天赋抽取" },
    { from: "talent_pool", to: "selection_flow", purpose: "提供候选天赋" },
    { from: "talent_pool", to: "talent_ui", purpose: "显示选项数据" },
    { from: "talent_ui", to: "selection_flow", purpose: "传递玩家选择" },
    { from: "selection_flow", to: "talent_applier", purpose: "触发效果应用" },
  ],
  patternHints: [
    {
      category: "data",
      suggestedPatterns: ["data.weighted_pool"],
      rationale: "需要加权随机抽取天赋",
    },
    {
      category: "rule",
      suggestedPatterns: ["rule.selection_flow"],
      rationale: "需要管理选择流程",
    },
    {
      category: "ui",
      suggestedPatterns: ["ui.selection_modal"],
      rationale: "需要模态选择界面",
    },
  ],
  uiDesignSpec: {
    surfaces: [
      { id: "talent_modal", type: "modal", purpose: "显示三选一天赋" },
    ],
  },
  assumptions: [
    "每个等级只触发一次",
    "玩家必须做出选择才能继续",
    "天赋效果可叠加",
  ],
  validations: [
    { scope: "blueprint", rule: "模块数必须在合理范围内", severity: "warning" },
    { scope: "assembly", rule: "所有 Pattern 必须可解析", severity: "error" },
  ],
  readyForAssembly: true,
};

// ============================================================================
// AssemblyPlan Examples
// ============================================================================

export const dashAssemblyPlanExample: AssemblyPlan = {
  blueprintId: "dash_ability",
  selectedPatterns: [
    { patternId: "input.key_binding", role: "输入捕获" },
    { patternId: "effect.dash", role: "位移效果" },
    { patternId: "resource.basic_pool", role: "冷却管理" },
  ],
  writeTargets: [
    { target: "server", path: "abilities/dash.lua", summary: "冲刺技能实现" },
    { target: "config", path: "npc_abilities_custom.txt", summary: "技能配置" },
  ],
  validations: [
    { scope: "host", rule: "按键未被占用", severity: "error" },
  ],
  readyForHostWrite: true,
};

export const talentSystemAssemblyPlanExample: AssemblyPlan = {
  blueprintId: "talent_selection_system",
  selectedPatterns: [
    { patternId: "data.weighted_pool", role: "天赋池" },
    { patternId: "rule.selection_flow", role: "选择流程" },
    { patternId: "ui.selection_modal", role: "选择界面" },
    { patternId: "effect.resource_consume", role: "效果应用" },
  ],
  writeTargets: [
    { target: "server", path: "systems/talent_system.lua", summary: "天赋系统核心" },
    { target: "shared", path: "data/talent_pool.ts", summary: "天赋数据定义" },
    { target: "ui", path: "components/talent_modal.tsx", summary: "选择界面" },
  ],
  bridgeUpdates: [
    { target: "server", file: "index.ts", action: "refresh" },
    { target: "ui", file: "App.tsx", action: "inject_once" },
  ],
  validations: [
    { scope: "host", rule: "UI 层可用", severity: "error" },
  ],
  readyForHostWrite: true,
};

// ============================================================================
// ValidationIssue Examples
// ============================================================================

export const validationIssueExamples: ValidationIssue[] = [
  {
    code: "MISSING_INTENT_KIND",
    scope: "schema",
    severity: "error",
    message: "classification.intentKind 必须存在",
    path: "classification.intentKind",
  },
  {
    code: "EMPTY_FUNCTIONAL_REQUIREMENTS",
    scope: "schema",
    severity: "error",
    message: "requirements.functional 不能为空",
    path: "requirements.functional",
  },
  {
    code: "LOW_CONFIDENCE",
    scope: "schema",
    severity: "warning",
    message: "置信度较低，建议进一步澄清",
    path: "classification.confidence",
  },
];

// ============================================================================
// UIDesignSpec Examples
// ============================================================================

export const talentSelectionUIDesignSpec: UIDesignSpec = {
  surfaces: [
    {
      id: "talent_selection_modal",
      type: "modal",
      purpose: "显示三选一天赋选项",
      inputs: ["candidate_talents"],
      outputs: ["selected_talent_id"],
      layoutHints: ["三列布局", "居中显示"],
    },
  ],
  visualStyle: {
    tone: "game",
    density: "medium",
    themeKeywords: ["talent", "upgrade", "choice"],
  },
  copyHints: ["使用游戏内术语", "保持简洁明了"],
};

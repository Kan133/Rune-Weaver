/**
 * 示例 C: 跨系统组合 - 技能系统（含资源管理和UI）
 * 
 * 验证 Blueprint 的组合表达能力
 * - 至少包含 3 类模块
 * - 至少有 2 条连接
 */

import { IntentSchema, Blueprint, AssemblyPlan } from "../../core/schema/types";
import { validateDota2AssemblyPlan } from "../../adapters/dota2/validator";

// ============================================================================
// 1. 自然语言需求
// ============================================================================

export const userRequest = "创建一个火焰冲击技能系统：按E键消耗100点法力值释放，朝鼠标方向造成范围伤害，并在UI上显示法力条和冷却时间";

// ============================================================================
// 2. IntentSchema
// ============================================================================

export const skillSystemIntent: IntentSchema = {
  version: "0.1",
  host: { id: "dota2", mode: "mvp" },
  request: {
    rawText: userRequest,
    userGoal: "实现一个完整的技能系统，包含资源管理、效果释放和UI反馈",
    domainTerms: ["法力值", "火焰冲击", "伤害", "冷却", "法力条", "E键"],
  },
  classification: {
    intentKind: "cross-system-composition",
    confidence: 0.88,
    rationale: ["涉及多个子系统", "需要资源管理", "需要UI联动", "输入+资源+效果组合"],
  },
  requirements: {
    functional: [
      {
        id: "fire_burst_effect",
        type: "effect",
        summary: "释放火焰冲击造成范围伤害",
        parameters: { damage: 150, radius: 250, direction: "mouse" },
      },
      {
        id: "mana_resource",
        type: "resource_system",
        summary: "管理法力值资源",
        parameters: { maxMana: 500, regenRate: 2, castCost: 100 },
      },
      {
        id: "cooldown_system",
        type: "resource_system",
        summary: "技能冷却管理",
        parameters: { cooldown: 5 },
      },
      {
        id: "mana_cost_rule",
        type: "rule_flow",
        summary: "释放技能时消耗法力值",
      },
    ],
    interaction: [
      {
        triggerType: "key",
        triggerDetail: "E",
        feedback: ["播放施法动画", "显示伤害数字", "法力消耗提示", "冷却动画"],
      },
    ],
    ui: {
      needed: true,
      surfaces: [
        {
          type: "resource_bar",
          purpose: "显示当前法力值",
          priority: "required",
        },
        {
          type: "key_hint",
          purpose: "提示E键释放技能",
          priority: "required",
        },
      ],
      interactionHints: ["法力不足时显示红色提示", "冷却中显示灰色遮罩"],
    },
    rules: [
      {
        id: "mana_check",
        trigger: "按键E",
        condition: "法力值 >= 100 且 不在冷却中",
        outcome: "释放技能，消耗100法力，进入5秒冷却",
      },
      {
        id: "insufficient_mana",
        trigger: "按键E",
        condition: "法力值 < 100",
        outcome: "阻止释放，显示「法力不足」提示",
      },
    ],
  },
  constraints: {
    hard: [
      {
        id: "mana_cost",
        type: "interaction",
        text: "每次释放消耗100点法力",
      },
      {
        id: "cooldown_time",
        type: "interaction",
        text: "技能冷却时间5秒",
      },
      {
        id: "damage_amount",
        type: "design",
        text: "火焰冲击造成150点伤害",
      },
    ],
    soft: [
      {
        id: "mana_regen",
        type: "design",
        text: "建议法力回复速度为每秒2点",
      },
    ],
  },
  assumptions: {
    resolved: [
      {
        id: "target_mouse",
        text: "技能向鼠标方向释放",
        source: "wizard",
      },
      {
        id: "aoe_damage",
        text: "伤害对范围内所有敌人有效",
        source: "wizard",
      },
    ],
  },
  openQuestions: [],
  completion: {
    isReadyForBlueprint: true,
    score: 0.9,
  },
};

// ============================================================================
// 3. Blueprint
// ============================================================================

export const skillSystemBlueprint: Blueprint = {
  version: "0.1",
  id: "skill_system_fire_burst",
  host: { id: "dota2", mode: "mvp" },
  summary: {
    name: "火焰冲击技能系统",
    description: "按键触发、消耗法力、造成伤害、显示UI的完整技能系统",
    sourceIntentKind: "cross-system-composition",
    confidence: 0.88,
  },
  modules: [
    {
      id: "mod_input_e",
      kind: "input_binding",
      summary: "监听E键触发",
      responsibilities: ["捕获E键按下", "触发施法请求"],
      outputs: [
        { name: "cast_request", direction: "output", dataType: "event", required: true },
      ],
      preferredPatterns: [{ id: "input.key_binding", priority: "required" }],
    },
    {
      id: "mod_mana_pool",
      kind: "resource_system",
      summary: "法力值资源池",
      responsibilities: ["存储当前法力", "计算法力消耗", "法力回复", "提供查询"],
      outputs: [
        { name: "current_mana", direction: "output", dataType: "number", required: true },
        { name: "max_mana", direction: "output", dataType: "number", required: true },
        { name: "has_enough", direction: "output", dataType: "boolean", required: true },
      ],
      params: { maxMana: 500, regenRate: 2, castCost: 100 },
      preferredPatterns: [{ id: "resource.basic_pool", priority: "required" }],
    },
    {
      id: "mod_cooldown",
      kind: "resource_system",
      summary: "技能冷却管理",
      responsibilities: ["追踪5秒冷却", "提供冷却状态查询"],
      outputs: [
        { name: "is_ready", direction: "output", dataType: "boolean", required: true },
        { name: "remaining_time", direction: "output", dataType: "number", required: true },
      ],
      params: { cooldown: 5 },
    },
    {
      id: "mod_cast_validator",
      kind: "rule_engine",
      summary: "施法条件验证",
      responsibilities: ["检查法力是否充足", "检查冷却状态", "决定是否允许施法"],
      inputs: [
        { name: "cast_request", direction: "input", dataType: "event", required: true },
        { name: "current_mana", direction: "input", dataType: "number", required: true },
        { name: "is_cooldown_ready", direction: "input", dataType: "boolean", required: true },
      ],
      outputs: [
        { name: "cast_approved", direction: "output", dataType: "boolean", required: true },
        { name: "reject_reason", direction: "output", dataType: "string", required: false },
      ],
    },
    {
      id: "mod_mana_consumer",
      kind: "effect",
      summary: "法力消耗效果",
      responsibilities: ["扣除100点法力", "触发资源更新"],
      inputs: [
        { name: "trigger", direction: "input", dataType: "event", required: true },
      ],
      outputs: [
        { name: "consumed", direction: "output", dataType: "number", required: true },
      ],
      params: { amount: 100 },
      preferredPatterns: [{ id: "effect.resource_consume", priority: "required" }],
    },
    {
      id: "mod_fire_burst",
      kind: "effect",
      summary: "火焰冲击伤害效果",
      responsibilities: ["计算鼠标方向", "检测250范围内敌人", "造成150伤害", "播放特效"],
      inputs: [
        { name: "trigger", direction: "input", dataType: "event", required: true },
      ],
      outputs: [
        { name: "damage_dealt", direction: "output", dataType: "number", required: true },
        { name: "targets_hit", direction: "output", dataType: "number", required: true },
      ],
      params: { damage: 150, radius: 250 },
    },
    {
      id: "mod_cooldown_applier",
      kind: "effect",
      summary: "应用冷却",
      responsibilities: ["触发5秒冷却"],
      inputs: [
        { name: "trigger", direction: "input", dataType: "event", required: true },
      ],
    },
    {
      id: "mod_mana_bar",
      kind: "ui_surface",
      summary: "法力条显示",
      responsibilities: ["显示当前法力值", "显示法力变化动画", "法力不足变红"],
      inputs: [
        { name: "current_mana", direction: "input", dataType: "number", required: true },
        { name: "max_mana", direction: "input", dataType: "number", required: true },
      ],
      preferredPatterns: [{ id: "ui.resource_bar", priority: "required" }],
    },
    {
      id: "mod_cast_bar",
      kind: "ui_surface",
      summary: "技能按键提示",
      responsibilities: ["显示E键图标", "显示冷却进度", "法力不足变灰"],
      inputs: [
        { name: "cooldown_remaining", direction: "input", dataType: "number", required: false },
        { name: "has_mana", direction: "input", dataType: "boolean", required: true },
      ],
      preferredPatterns: [{ id: "ui.key_hint", priority: "required" }],
    },
  ],
  connections: [
    { id: "c1", from: "mod_input_e", to: "mod_cast_validator", type: "event", mapping: { cast_request: "cast_request" } },
    { id: "c2", from: "mod_mana_pool", to: "mod_cast_validator", type: "data", mapping: { current_mana: "current_mana", has_enough: "has_mana_check" } },
    { id: "c3", from: "mod_cooldown", to: "mod_cast_validator", type: "data", mapping: { is_ready: "is_cooldown_ready" } },
    { id: "c4", from: "mod_cast_validator", to: "mod_mana_consumer", type: "control", condition: "cast_approved" },
    { id: "c5", from: "mod_cast_validator", to: "mod_fire_burst", type: "control", condition: "cast_approved" },
    { id: "c6", from: "mod_cast_validator", to: "mod_cooldown_applier", type: "control", condition: "cast_approved" },
    { id: "c7", from: "mod_mana_consumer", to: "mod_mana_pool", type: "data", mapping: { consumed: "consume_amount" } },
    { id: "c8", from: "mod_mana_pool", to: "mod_mana_bar", type: "data", mapping: { current_mana: "current", max_mana: "max" } },
    { id: "c9", from: "mod_cooldown", to: "mod_cast_bar", type: "data", mapping: { remaining_time: "cooldown_remaining" } },
    { id: "c10", from: "mod_mana_pool", to: "mod_cast_bar", type: "data", mapping: { has_enough: "has_mana" } },
  ],
  uiPlan: {
    requiredSurfaces: [
      {
        id: "surface_mana_bar",
        type: "resource_bar",
        purpose: "显示当前法力值",
        dataBindings: ["current_mana", "max_mana"],
      },
      {
        id: "surface_cast_bar",
        type: "key_hint",
        purpose: "提示E键释放技能",
        dataBindings: ["cooldown_remaining", "has_mana"],
      },
    ],
    requiresDesignSpec: true,
  },
};

// ============================================================================
// 4. AssemblyPlan
// ============================================================================

export const skillSystemAssemblyPlan: AssemblyPlan = {
  version: "0.1",
  blueprintId: "skill_system_fire_burst",
  host: { id: "dota2", mode: "mvp" },
  resolvedPatterns: [
    {
      moduleId: "mod_input_e",
      patternId: "input.key_binding",
      params: { key: "E", eventName: "OnFireBurstCast" },
      priority: "required",
    },
    {
      moduleId: "mod_mana_pool",
      patternId: "resource.basic_pool",
      params: { max: 500, regenRate: 2, castCost: 100 },
      priority: "required",
    },
    {
      moduleId: "mod_mana_consumer",
      patternId: "effect.resource_consume",
      params: { amount: 100 },
      priority: "required",
    },
    {
      moduleId: "mod_mana_bar",
      patternId: "ui.resource_bar",
      params: { color: "#4d8cff", lowColor: "#ff4d4f" },
      priority: "required",
    },
    {
      moduleId: "mod_cast_bar",
      patternId: "ui.key_hint",
      params: { key: "E", showCooldown: true },
      priority: "required",
    },
  ],
  generatedTargets: [
    {
      kind: "code",
      targetId: "dota2.server.skill_system",
      summary: "生成技能系统服务端代码",
    },
    {
      kind: "ui",
      targetId: "dota2.panorama.mana_bar",
      summary: "生成法力条UI",
    },
    {
      kind: "ui",
      targetId: "dota2.panorama.cast_bar",
      summary: "生成技能按键提示",
    },
  ],
};

// ============================================================================
// 5. 运行示例
// ============================================================================

export interface ExampleResult {
  name: string;
  success: boolean;
  hostValidation: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
  };
  errors: string[];
}

export function runExample(): ExampleResult {
  const errors: string[] = [];
  
  console.log("=".repeat(60));
  console.log("示例 C: 跨系统组合 - 技能系统（含资源管理和UI）");
  console.log("=".repeat(60));

  console.log("\n📝 用户需求:");
  console.log(`   ${userRequest}`);

  console.log("\n📄 IntentSchema:");
  console.log(`   分类: ${skillSystemIntent.classification.intentKind}`);
  console.log(`   功能数: ${skillSystemIntent.requirements.functional.length}`);
  console.log(`   规则数: ${skillSystemIntent.requirements.rules?.length || 0}`);

  console.log("\n🏗️  Blueprint:");
  console.log(`   模块数: ${skillSystemBlueprint.modules.length}`);
  console.log(`   连接数: ${skillSystemBlueprint.connections.length}`);

  const moduleKinds = new Map<string, number>();
  for (const mod of skillSystemBlueprint.modules) {
    moduleKinds.set(mod.kind, (moduleKinds.get(mod.kind) || 0) + 1);
  }
  console.log("   模块分布:");
  for (const [kind, count] of moduleKinds) {
    console.log(`     - ${kind}: ${count}`);
  }

  console.log("\n📦 AssemblyPlan:");
  console.log(`   Pattern 绑定数: ${skillSystemAssemblyPlan.resolvedPatterns.length}`);
  console.log(`   生成目标数: ${skillSystemAssemblyPlan.generatedTargets.length}`);

  console.log("\n🔍 Dota2 宿主验证:");
  const validation = validateDota2AssemblyPlan(skillSystemAssemblyPlan);
  console.log(`   结果: ${validation.valid ? "✅ 通过" : "❌ 未通过"}`);
  console.log(`   错误: ${validation.errors.length}, 警告: ${validation.warnings.length}`);
  console.log(`   服务端文件: ${validation.hostSpecific.serverFiles.length} 个`);
  console.log(`   Panorama 文件: ${validation.hostSpecific.panoramaFiles.length} 个`);

  if (validation.errors.length > 0) {
    console.log("   错误详情:");
    for (const error of validation.errors) {
      console.log(`     ❌ ${error.message}`);
      errors.push(`[Dota2] ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  const success = validation.valid && errors.length === 0;
  console.log(success ? "✅ 示例 C 验证通过" : "❌ 示例 C 验证失败");
  console.log("   覆盖：输入 + 资源 + 效果 + UI");
  console.log("=".repeat(60));

  return {
    name: "示例 C: 跨系统组合 - 技能系统",
    success,
    hostValidation: {
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
    errors,
  };
}

if (import.meta.main) {
  const result = runExample();
  process.exit(result.success ? 0 : 1);
}

/**
 * 示例 A: 微功能 - Q键冲刺技能
 * 
 * 最小能力链路验证
 * - 有输入
 * - 有效果
 * - 无复杂 UI 依赖
 */

import { IntentSchema, Blueprint, AssemblyPlan } from "../../core/schema/types";
import { buildBlueprint } from "../../core/blueprint/builder";
import { createAssemblyPlan } from "../../core/pipeline/assembly-plan";
import { validateDota2AssemblyPlan } from "../../adapters/dota2/validator";

// ============================================================================
// 1. 自然语言需求
// ============================================================================

export const userRequest = "做一个按Q键触发的朝鼠标方向冲刺技能，冷却8秒";

// ============================================================================
// 2. IntentSchema (Wizard 输出)
// ============================================================================

export const dashSkillIntent: IntentSchema = {
  version: "0.1",
  host: { id: "dota2", mode: "mvp" },
  request: {
    rawText: userRequest,
    userGoal: "实现一个冲刺位移技能",
    domainTerms: ["冲刺", "位移", "冷却"],
  },
  classification: {
    intentKind: "micro-feature",
    confidence: 0.95,
    rationale: ["单一功能", "直接效果", "无复杂交互"],
  },
  requirements: {
    functional: [
      {
        id: "dash_effect",
        type: "effect",
        summary: "朝鼠标方向进行短距离位移",
        parameters: { distance: 300, speed: 1200 },
      },
      {
        id: "cooldown_system",
        type: "resource_system",
        summary: "技能冷却管理",
        parameters: { cooldown: 8 },
      },
    ],
    interaction: [
      {
        triggerType: "key",
        triggerDetail: "Q",
        feedback: ["播放冲刺动画", "播放音效"],
      },
    ],
    ui: {
      needed: true,
      surfaces: [
        {
          type: "key_hint",
          purpose: "提示Q键可触发冲刺",
          priority: "optional",
        },
      ],
    },
  },
  constraints: {
    hard: [
      {
        id: "cooldown_time",
        type: "interaction",
        text: "技能冷却时间8秒",
      },
      {
        id: "distance_limit",
        type: "design",
        text: "冲刺距离固定300单位",
      },
    ],
  },
  assumptions: {
    resolved: [
      {
        id: "direction_mouse",
        text: "位移方向以鼠标位置为准",
        source: "wizard",
      },
    ],
  },
  openQuestions: [],
  completion: {
    isReadyForBlueprint: true,
    score: 0.92,
  },
};

// ============================================================================
// 3. Blueprint (实现编排层)
// ============================================================================

export const dashSkillBlueprint: Blueprint = {
  version: "0.1",
  id: "micro_feature_dash_skill",
  host: { id: "dota2", mode: "mvp" },
  summary: {
    name: "Q键冲刺技能",
    description: "一个按键触发的朝鼠标方向冲刺技能",
    sourceIntentKind: "micro-feature",
    confidence: 0.95,
  },
  modules: [
    {
      id: "mod_input_q",
      kind: "input_binding",
      summary: "监听玩家Q键触发",
      responsibilities: ["捕获Q键按下事件", "检查冷却状态", "触发冲刺"],
      outputs: [
        { name: "trigger_event", direction: "output", dataType: "event", required: true },
      ],
      preferredPatterns: [
        { id: "input.key_binding", priority: "required", reason: "Q键绑定" },
      ],
    },
    {
      id: "mod_cooldown",
      kind: "resource_system",
      summary: "技能冷却管理",
      responsibilities: ["追踪8秒冷却", "阻止冷却中触发"],
      params: { cooldown: 8 },
      preferredPatterns: [
        { id: "resource.basic_pool", priority: "required" },
      ],
    },
    {
      id: "mod_dash_effect",
      kind: "effect",
      summary: "执行冲刺位移效果",
      responsibilities: ["计算鼠标方向", "执行300单位位移", "播放特效"],
      inputs: [
        { name: "trigger", direction: "input", dataType: "event", required: true },
      ],
      params: { distance: 300, speed: 1200 },
      preferredPatterns: [
        { id: "effect.dash", priority: "required" },
      ],
    },
    {
      id: "mod_key_hint",
      kind: "ui_surface",
      summary: "Q键提示",
      responsibilities: ["显示Q键图标", "显示冷却状态"],
      preferredPatterns: [
        { id: "ui.key_hint", priority: "optional" },
      ],
    },
  ],
  connections: [
    {
      id: "conn_input_to_cooldown",
      from: "mod_input_q",
      to: "mod_cooldown",
      type: "event",
    },
    {
      id: "conn_cooldown_to_effect",
      from: "mod_cooldown",
      to: "mod_dash_effect",
      type: "control",
      condition: "cooldown ready",
    },
  ],
  uiPlan: {
    requiredSurfaces: [
      {
        id: "surface_key_hint",
        type: "key_hint",
        purpose: "提示Q键可触发冲刺",
      },
    ],
    requiresDesignSpec: false,
  },
  validationContracts: [
    {
      id: "contract_cooldown_positive",
      scope: "blueprint",
      rule: "冷却时间必须为正数",
      severity: "error",
    },
    {
      id: "contract_distance_positive",
      scope: "blueprint",
      rule: "冲刺距离必须为正数",
      severity: "error",
    },
  ],
};

// ============================================================================
// 4. AssemblyPlan (Pattern Resolution 输出)
// ============================================================================

export const dashSkillAssemblyPlan: AssemblyPlan = {
  version: "0.1",
  blueprintId: "micro_feature_dash_skill",
  host: { id: "dota2", mode: "mvp" },
  selectedPatterns: [
    {
      moduleId: "mod_input_q",
      patternId: "input.key_binding",
      role: "Q_key_trigger",
      parameters: { key: "Q", eventName: "OnDashCast" },
      priority: "required",
    },
    {
      moduleId: "mod_cooldown",
      patternId: "resource.basic_pool",
      role: "cooldown_tracker",
      parameters: { max: 1, regenRate: 0.125 },
      priority: "required",
    },
    {
      moduleId: "mod_dash_effect",
      patternId: "effect.dash",
      role: "dash_movement",
      parameters: { distance: 300, speed: 1200 },
      priority: "required",
    },
    {
      moduleId: "mod_key_hint",
      patternId: "ui.key_hint",
      role: "key_hint_display",
      parameters: { key: "Q", showCooldown: true },
      priority: "optional",
    },
  ],
  writeTargets: [
    {
      kind: "code",
      targetId: "dota2.server.dash_skill",
      summary: "生成冲刺技能服务端代码",
    },
    {
      kind: "ui",
      targetId: "dota2.panorama.key_hint",
      summary: "生成Q键提示UI",
    },
  ],
};

// ============================================================================
// 5. 运行完整流程验证
// ============================================================================

export interface ExampleResult {
  name: string;
  success: boolean;
  schemaValid: boolean;
  blueprintValid: boolean;
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
  console.log("示例 A: 微功能 - Q键冲刺技能");
  console.log("=".repeat(60));

  console.log("\n📝 用户需求:");
  console.log(`   ${userRequest}`);

  console.log("\n📄 IntentSchema:");
  console.log(`   分类: ${dashSkillIntent.classification.intentKind}`);
  console.log(`   置信度: ${dashSkillIntent.classification.confidence}`);
  console.log(`   功能数: ${dashSkillIntent.requirements.functional.length}`);

  console.log("\n🏗️  Blueprint:");
  console.log(`   ID: ${dashSkillBlueprint.id}`);
  console.log(`   模块数: ${dashSkillBlueprint.modules.length}`);
  console.log(`   连接数: ${dashSkillBlueprint.connections.length}`);

  console.log("\n📦 AssemblyPlan:");
  console.log(`   Pattern 绑定:`);
  for (const binding of dashSkillAssemblyPlan.selectedPatterns) {
    console.log(`     - ${binding.moduleId} -> ${binding.patternId}`);
  }

  console.log("\n🔍 Dota2 宿主验证:");
  const validation = validateDota2AssemblyPlan(dashSkillAssemblyPlan);
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
  console.log(success ? "✅ 示例 A 验证通过" : "❌ 示例 A 验证失败");
  console.log("=".repeat(60));

  return {
    name: "示例 A: 微功能 - Q键冲刺技能",
    success,
    schemaValid: true,
    blueprintValid: true,
    hostValidation: {
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
    errors,
  };
}

// 如果直接运行此文件
if (import.meta.main) {
  const result = runExample();
  process.exit(result.success ? 0 : 1);
}

/**
 * 示例 B: 独立系统 - 三选一天赋抽取系统
 * 
 * 验证系统级蓝图编排能力
 * - 有数据池
 * - 有选择流程
 * - 有 UI 需求
 */

import { IntentSchema, Blueprint, AssemblyPlan } from "../../core/schema/types";
import { validateDota2AssemblyPlan } from "../../adapters/dota2/validator";

// ============================================================================
// 1. 自然语言需求
// ============================================================================

export const userRequest = "做一个按F4触发的三选一天赋抽取系统，有R/SR/SSR/UR稀有度，玩家可以抽取天赋卡片";

// ============================================================================
// 2. IntentSchema
// ============================================================================

export const talentDrawIntent: IntentSchema = {
  version: "0.1",
  host: { id: "dota2", mode: "mvp" },
  request: {
    rawText: userRequest,
    userGoal: "实现一个带稀有度分层的天赋抽取系统",
    domainTerms: ["天赋", "抽取", "稀有度", "三选一", "R", "SR", "SSR", "UR"],
  },
  classification: {
    intentKind: "standalone-system",
    confidence: 0.93,
    rationale: ["完整系统", "包含数据池和选择流程", "有UI需求"],
  },
  requirements: {
    functional: [
      {
        id: "draw_system",
        type: "selection_flow",
        summary: "玩家可触发一次三选一抽取",
        parameters: { choiceCount: 3 },
      },
      {
        id: "talent_pool",
        type: "data_pool",
        summary: "存在带稀有度分层的天赋池",
        parameters: { 
          tiers: ["R", "SR", "SSR", "UR"],
          weights: { R: 50, SR: 30, SSR: 15, UR: 5 },
        },
      },
      {
        id: "draw_resource",
        type: "resource_system",
        summary: "抽取次数资源管理",
        parameters: { maxDraws: 3, regenPerRound: 1 },
      },
    ],
    interaction: [
      {
        triggerType: "key",
        triggerDetail: "F4",
        feedback: ["显示抽取界面", "播放抽取动画", "显示结果"],
      },
    ],
    ui: {
      needed: true,
      surfaces: [
        {
          type: "selection_modal",
          purpose: "展示三选一天赋卡",
          priority: "required",
        },
        {
          type: "resource_bar",
          purpose: "显示剩余抽取次数",
          priority: "required",
        },
        {
          type: "key_hint",
          purpose: "提示F4可触发抽取",
          priority: "optional",
        },
      ],
    },
    data: {
      collections: [
        {
          id: "talent_pool_data",
          kind: "pool",
          summary: "带权重的天赋数据池",
          sizeHint: 50,
        },
      ],
      persistence: "persistent",
      synchronization: "local",
    },
  },
  constraints: {
    hard: [
      {
        id: "choice_count",
        type: "interaction",
        text: "每次必须只展示3个可选项",
      },
      {
        id: "rarity_weights",
        type: "design",
        text: "R:SR:SSR:UR 的权重比例为 50:30:15:5",
      },
    ],
    soft: [
      {
        id: "draw_limit",
        type: "interaction",
        text: "建议每轮最多3次抽取",
      },
    ],
  },
  assumptions: {
    resolved: [
      {
        id: "manual_trigger",
        text: "抽取由玩家主动触发，不是自动触发",
        source: "wizard",
      },
      {
        id: "single_player",
        text: "当前仅考虑单人选择，非投票机制",
        source: "wizard",
      },
    ],
  },
  openQuestions: [],
  completion: {
    isReadyForBlueprint: true,
    score: 0.94,
  },
};

// ============================================================================
// 3. Blueprint
// ============================================================================

export const talentDrawBlueprint: Blueprint = {
  version: "0.1",
  id: "talent_draw_system",
  host: { id: "dota2", mode: "mvp" },
  summary: {
    name: "天赋抽取系统",
    description: "一个由按键触发的三选一天赋抽取系统",
    sourceIntentKind: "standalone-system",
    confidence: 0.9,
  },
  modules: [
    {
      id: "mod_input_f4",
      kind: "input_binding",
      summary: "监听玩家F4触发",
      responsibilities: ["将玩家按键输入转换为抽取事件"],
      outputs: [
        { name: "trigger_event", direction: "output", dataType: "event", required: true },
      ],
      preferredPatterns: [{ id: "input.key_binding", priority: "required" }],
    },
    {
      id: "mod_draw_resource",
      kind: "resource_system",
      summary: "抽取次数资源管理",
      responsibilities: ["追踪剩余抽取次数", "每轮恢复1次", "阻止无次数时触发"],
      params: { maxDraws: 3, regenPerRound: 1 },
      preferredPatterns: [{ id: "resource.basic_pool", priority: "required" }],
    },
    {
      id: "mod_talent_pool",
      kind: "data_pool",
      summary: "存放带稀有度的天赋集合",
      responsibilities: ["提供抽取候选项", "管理稀有度权重"],
      params: { 
        tiers: ["R", "SR", "SSR", "UR"],
        weights: { R: 50, SR: 30, SSR: 15, UR: 5 },
        choiceCount: 3,
      },
      outputs: [
        { name: "candidates", direction: "output", dataType: "talent[]", required: true },
      ],
      preferredPatterns: [{ id: "data.weighted_pool", priority: "required" }],
    },
    {
      id: "mod_draw_flow",
      kind: "selection_flow",
      summary: "执行一次三选一抽取流程",
      responsibilities: [
        "验证资源充足",
        "从数据池抽取3项",
        "发起选择流程",
        "等待玩家选择",
        "应用所选项",
        "消耗抽取次数",
      ],
      inputs: [
        { name: "trigger", direction: "input", dataType: "event", required: true },
        { name: "pool_data", direction: "input", dataType: "talent[]", required: true },
      ],
      outputs: [
        { name: "selected_talent", direction: "output", dataType: "talent", required: true },
        { name: "display_candidates", direction: "output", dataType: "talent[]", required: true },
      ],
      preferredPatterns: [{ id: "rule.selection_flow", priority: "required" }],
    },
    {
      id: "mod_draw_modal",
      kind: "ui_surface",
      summary: "展示三选一界面",
      responsibilities: ["显示3个候选项卡片", "接收玩家选择", "播放选择动画"],
      inputs: [
        { name: "candidates", direction: "input", dataType: "talent[]", required: true },
      ],
      outputs: [
        { name: "player_choice", direction: "output", dataType: "number", required: true },
      ],
      preferredPatterns: [{ id: "ui.selection_modal", priority: "required" }],
    },
    {
      id: "mod_draw_count_bar",
      kind: "ui_surface",
      summary: "剩余抽取次数显示",
      responsibilities: ["显示当前剩余次数", "变化时播放动画"],
      inputs: [
        { name: "current_draws", direction: "input", dataType: "number", required: true },
        { name: "max_draws", direction: "input", dataType: "number", required: true },
      ],
      preferredPatterns: [{ id: "ui.resource_bar", priority: "required" }],
    },
    {
      id: "mod_f4_hint",
      kind: "ui_surface",
      summary: "F4键提示",
      responsibilities: ["显示F4键图标", "提示可触发抽取"],
      preferredPatterns: [{ id: "ui.key_hint", priority: "optional" }],
    },
    {
      id: "mod_talent_applier",
      kind: "effect",
      summary: "应用选中的天赋效果",
      responsibilities: ["解析天赋效果", "应用到玩家", "持久化选择"],
      inputs: [
        { name: "talent", direction: "input", dataType: "talent", required: true },
      ],
    },
  ],
  connections: [
    { id: "c1", from: "mod_input_f4", to: "mod_draw_resource", type: "event" },
    { id: "c2", from: "mod_draw_resource", to: "mod_draw_flow", type: "control", condition: "has available draw" },
    { id: "c3", from: "mod_talent_pool", to: "mod_draw_flow", type: "data", mapping: { candidates: "pool_data" } },
    { id: "c4", from: "mod_draw_flow", to: "mod_draw_modal", type: "visual", mapping: { display_candidates: "candidates" } },
    { id: "c5", from: "mod_draw_modal", to: "mod_draw_flow", type: "control", mapping: { player_choice: "selected_index" } },
    { id: "c6", from: "mod_draw_flow", to: "mod_talent_applier", type: "data", mapping: { selected_talent: "talent" } },
    { id: "c7", from: "mod_draw_resource", to: "mod_draw_count_bar", type: "data", mapping: { current: "current_draws", max: "max_draws" } },
  ],
  uiPlan: {
    requiredSurfaces: [
      {
        id: "surface_draw_modal",
        type: "selection_modal",
        purpose: "天赋三选一展示",
        dataBindings: ["candidates", "selected_talent"],
      },
      {
        id: "surface_draw_count",
        type: "resource_bar",
        purpose: "显示剩余抽取次数",
        dataBindings: ["current_draws", "max_draws"],
      },
      {
        id: "surface_f4_hint",
        type: "key_hint",
        purpose: "提示F4可触发抽取",
      },
    ],
    requiresDesignSpec: true,
    designSpecRef: "talent_draw_ui_spec",
  },
  validationContracts: [
    {
      id: "contract_pool_size",
      scope: "blueprint",
      rule: "数据池必须包含至少3个可选项",
      severity: "error",
    },
    {
      id: "contract_choice_count",
      scope: "blueprint",
      rule: "每次展示必须是3个选项",
      severity: "error",
    },
    {
      id: "contract_weight_sum",
      scope: "blueprint",
      rule: "稀有度权重总和必须为正",
      severity: "error",
    },
  ],
};

// ============================================================================
// 4. AssemblyPlan
// ============================================================================

export const talentDrawAssemblyPlan: AssemblyPlan = {
  version: "0.1",
  blueprintId: "talent_draw_system",
  host: { id: "dota2", mode: "mvp" },
  resolvedPatterns: [
    {
      moduleId: "mod_input_f4",
      patternId: "input.key_binding",
      params: { key: "F4", eventName: "OnTalentDraw" },
      priority: "required",
    },
    {
      moduleId: "mod_draw_resource",
      patternId: "resource.basic_pool",
      params: { max: 3, regenRate: 1, regenInterval: "per_round" },
      priority: "required",
    },
    {
      moduleId: "mod_talent_pool",
      patternId: "data.weighted_pool",
      params: { 
        tiers: ["R", "SR", "SSR", "UR"],
        weights: { R: 50, SR: 30, SSR: 15, UR: 5 },
        choiceCount: 3,
      },
      priority: "required",
    },
    {
      moduleId: "mod_draw_flow",
      patternId: "rule.selection_flow",
      params: { choiceCount: 3, allowReroll: false },
      priority: "required",
    },
    {
      moduleId: "mod_draw_modal",
      patternId: "ui.selection_modal",
      params: { layout: "horizontal", cardCount: 3 },
      priority: "required",
    },
    {
      moduleId: "mod_draw_count_bar",
      patternId: "ui.resource_bar",
      params: { color: "#4d8cff", showMax: true },
      priority: "required",
    },
    {
      moduleId: "mod_f4_hint",
      patternId: "ui.key_hint",
      params: { key: "F4" },
      priority: "optional",
    },
  ],
  generatedTargets: [
    {
      kind: "code",
      targetId: "dota2.server.draw_system",
      summary: "生成抽取流程相关服务端模块",
    },
    {
      kind: "ui",
      targetId: "dota2.panorama.draw_modal",
      summary: "生成三选一 UI 组件",
    },
    {
      kind: "ui",
      targetId: "dota2.panorama.draw_count_bar",
      summary: "生成抽取次数显示",
    },
    {
      kind: "config",
      targetId: "dota2.kv.talent_pool",
      summary: "生成天赋池配置",
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
  console.log("示例 B: 独立系统 - 三选一天赋抽取");
  console.log("=".repeat(60));

  console.log("\n📝 用户需求:");
  console.log(`   ${userRequest}`);

  console.log("\n📄 IntentSchema:");
  console.log(`   分类: ${talentDrawIntent.classification.intentKind}`);
  console.log(`   功能数: ${talentDrawIntent.requirements.functional.length}`);
  console.log(`   UI需求: ${talentDrawIntent.requirements.ui?.needed ? "是" : "否"}`);

  console.log("\n🏗️  Blueprint:");
  console.log(`   模块数: ${talentDrawBlueprint.modules.length}`);
  console.log(`   连接数: ${talentDrawBlueprint.connections.length}`);
  console.log(`   UI界面: ${talentDrawBlueprint.uiPlan?.requiredSurfaces.length || 0} 个`);

  console.log("\n📦 AssemblyPlan:");
  console.log(`   Pattern 绑定数: ${talentDrawAssemblyPlan.resolvedPatterns.length}`);

  console.log("\n🔍 Dota2 宿主验证:");
  const validation = validateDota2AssemblyPlan(talentDrawAssemblyPlan);
  console.log(`   结果: ${validation.valid ? "✅ 通过" : "❌ 未通过"}`);
  console.log(`   错误: ${validation.errors.length}, 警告: ${validation.warnings.length}`);
  console.log(`   服务端文件: ${validation.hostSpecific.serverFiles.length} 个`);
  console.log(`   Panorama 文件: ${validation.hostSpecific.panoramaFiles.length} 个`);
  console.log(`   配置文件: ${validation.hostSpecific.configFiles.length} 个`);

  if (validation.errors.length > 0) {
    console.log("   错误详情:");
    for (const error of validation.errors) {
      console.log(`     ❌ ${error.message}`);
      errors.push(`[Dota2] ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  const success = validation.valid && errors.length === 0;
  console.log(success ? "✅ 示例 B 验证通过" : "❌ 示例 B 验证失败");
  console.log("=".repeat(60));

  return {
    name: "示例 B: 独立系统 - 三选一天赋抽取",
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

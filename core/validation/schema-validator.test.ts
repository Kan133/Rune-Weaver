/**
 * Rune Weaver - Schema Validator Tests
 * 
 * 验证 Schema Validator 的正确性
 * 与新版 SCHEMA.md 对齐
 */

import { validateIntentSchema, getValidationSummary } from "./schema-validator";
import { IntentSchema, ValidationIssue } from "../schema/types";

// ============================================================================
// 测试用例 1: 合法的微功能 IntentSchema
// ============================================================================

const validMicroFeature: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "做一个按Q键触发的朝鼠标方向冲刺技能",
    goal: "实现一个冲刺位移技能",
  },
  classification: {
    intentKind: "micro-feature",
    confidence: "high",
  },
  requirements: {
    functional: ["按键触发技能", "朝鼠标方向位移", "冷却时间管理"],
    interactions: ["Q键触发", "鼠标方向定位"],
    outputs: ["位移效果", "视觉反馈"],
  },
  constraints: {
    requiredPatterns: ["input.key_binding", "effect.dash"],
  },
  normalizedMechanics: {
    trigger: true,
    outcomeApplication: true,
  },
  openQuestions: [],
  resolvedAssumptions: ["Q键作为默认触发键"],
  isReadyForBlueprint: true,
};

// ============================================================================
// 测试用例 2: 合法的独立系统 IntentSchema
// ============================================================================

const validStandaloneSystem: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "做一个按F4触发的三选一天赋抽取系统",
    goal: "实现天赋抽取系统",
  },
  classification: {
    intentKind: "standalone-system",
    confidence: "high",
  },
  requirements: {
    functional: ["F4键触发抽取", "三选一选择界面", "应用选中的天赋"],
    dataNeeds: ["天赋定义池", "玩家选择记录"],
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
  openQuestions: [],
  resolvedAssumptions: ["三选一机制", "从预定义天赋池抽取"],
  isReadyForBlueprint: true,
};

// ============================================================================
// 测试用例 3: 缺少 intentKind（非法）
// ============================================================================

const invalidMissingIntentKind: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "测试",
    goal: "测试",
  },
  // @ts-expect-error - Testing invalid case
  classification: {},
  requirements: {
    functional: ["测试功能"],
  },
  normalizedMechanics: {},
  openQuestions: [],
  resolvedAssumptions: [],
  isReadyForBlueprint: false,
};

// ============================================================================
// 测试用例 4: 空 functional（非法）
// ============================================================================

const invalidEmptyFunctional: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "测试",
    goal: "测试",
  },
  classification: {
    intentKind: "micro-feature",
    confidence: "medium",
  },
  requirements: {
    functional: [],
  },
  constraints: {},
  normalizedMechanics: {},
  openQuestions: [],
  resolvedAssumptions: [],
  isReadyForBlueprint: false,
};

// ============================================================================
// 测试用例 5: 矛盾的完成状态
// ============================================================================

const invalidContradictoryCompletion: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "测试",
    goal: "测试",
  },
  classification: {
    intentKind: "micro-feature",
    confidence: "medium",
  },
  requirements: {
    functional: ["测试功能"],
  },
  constraints: {},
  normalizedMechanics: {},
  openQuestions: ["缺少什么参数？"],
  resolvedAssumptions: [],
  isReadyForBlueprint: true, // 矛盾：有未解决的问题但标记为 ready
};

// ============================================================================
// 测试用例 6: 合法的跨系统组合
// ============================================================================

const validCrossSystem: IntentSchema = {
  version: "1.0",
  host: { kind: "dota2-x-template" },
  request: {
    rawPrompt: "做一个资源消耗 + 技能释放的完整系统",
    goal: "实现资源管理与技能释放的联动",
  },
  classification: {
    intentKind: "cross-system-composition",
    confidence: "high",
  },
  requirements: {
    functional: ["资源池管理", "技能消耗检查", "技能效果释放"],
    dataNeeds: ["资源数值", "技能配置"],
    outputs: ["资源变化", "技能效果"],
  },
  constraints: {},
  normalizedMechanics: {
    trigger: true,
    resourceConsumption: true,
    outcomeApplication: true,
  },
  openQuestions: [],
  resolvedAssumptions: ["资源可以是魔法值、能量等"],
  isReadyForBlueprint: true,
};

// ============================================================================
// 测试执行
// ============================================================================

function runTests() {
  console.log("Running Schema Validator Tests...\n");
  let passed = 0;
  let failed = 0;

  // Test 1: Valid micro-feature
  {
    const issues = validateIntentSchema(validMicroFeature);
    const summary = getValidationSummary(issues);
    if (summary.valid && summary.errorCount === 0) {
      console.log("✅ Test 1: Valid micro-feature - PASS");
      passed++;
    } else {
      console.log("❌ Test 1: Valid micro-feature - FAIL");
      console.log("Issues:", issues);
      failed++;
    }
  }

  // Test 2: Valid standalone system
  {
    const issues = validateIntentSchema(validStandaloneSystem);
    const summary = getValidationSummary(issues);
    if (summary.valid && summary.errorCount === 0) {
      console.log("✅ Test 2: Valid standalone system - PASS");
      passed++;
    } else {
      console.log("❌ Test 2: Valid standalone system - FAIL");
      console.log("Issues:", issues);
      failed++;
    }
  }

  // Test 3: Invalid - missing intentKind
  {
    const issues = validateIntentSchema(invalidMissingIntentKind);
    const summary = getValidationSummary(issues);
    if (!summary.valid && summary.errorCount > 0) {
      console.log("✅ Test 3: Invalid missing intentKind - PASS");
      passed++;
    } else {
      console.log("❌ Test 3: Invalid missing intentKind - FAIL");
      failed++;
    }
  }

  // Test 4: Invalid - empty functional
  {
    const issues = validateIntentSchema(invalidEmptyFunctional);
    const summary = getValidationSummary(issues);
    if (!summary.valid && summary.errorCount > 0) {
      console.log("✅ Test 4: Invalid empty functional - PASS");
      passed++;
    } else {
      console.log("❌ Test 4: Invalid empty functional - FAIL");
      failed++;
    }
  }

  // Test 5: Invalid - contradictory completion
  {
    const issues = validateIntentSchema(invalidContradictoryCompletion);
    const summary = getValidationSummary(issues);
    if (!summary.valid && summary.errorCount > 0) {
      console.log("✅ Test 5: Invalid contradictory completion - PASS");
      passed++;
    } else {
      console.log("❌ Test 5: Invalid contradictory completion - FAIL");
      failed++;
    }
  }

  // Test 6: Valid cross-system
  {
    const issues = validateIntentSchema(validCrossSystem);
    const summary = getValidationSummary(issues);
    if (summary.valid && summary.errorCount === 0) {
      console.log("✅ Test 6: Valid cross-system - PASS");
      passed++;
    } else {
      console.log("❌ Test 6: Valid cross-system - FAIL");
      console.log("Issues:", issues);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  return failed === 0;
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

export { runTests };

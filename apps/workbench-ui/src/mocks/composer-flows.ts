// Mock Composer Flows for F002
// Three scenarios: create, update, governance_blocked

import type { ComposerFlow, ComposerMessage } from "../types/composer";

const baseTimestamp = new Date().toISOString();

// Helper to create messages
function createMessage(
  id: string,
  type: ComposerMessage["type"],
  content: string,
  metadata?: ComposerMessage["metadata"]
): ComposerMessage {
  return {
    id,
    type,
    content,
    timestamp: baseTimestamp,
    metadata,
  };
}

// Create Scenario Flow
export const createComposerFlow: ComposerFlow = {
  sessionId: "session_create_001",
  messages: [
    createMessage("msg_1", "user_request", "做一个按Q键的冲刺技能，向前冲刺400距离"),
    createMessage("msg_2", "system_clarification", "已理解您的需求：创建一个冲刺技能，按键绑定为Q，冲刺距离400。"),
    createMessage("msg_3", "feature_update", "Feature 'dash_skill_q' 已创建，状态：ready"),
    createMessage("msg_4", "next_step_hint", "系统已准备好生成代码。您可以选择继续生成或修改参数。", {
      suggestedInputs: ["修改冲刺距离为500", "添加无敌帧效果", "确认生成"],
    }),
  ],
  currentStage: "reviewing",
  suggestedActions: [
    { id: "act_1", type: "continue", label: "继续生成", description: "进入代码生成阶段", enabled: true, primary: true },
    { id: "act_2", type: "update", label: "修改参数", description: "调整技能参数", enabled: true },
    { id: "act_3", type: "cancel", label: "取消", description: "放弃当前feature", enabled: true },
  ],
  inputPlaceholder: "输入修改意见或确认继续...",
  isAwaitingInput: true,
};

// Update Scenario Flow
export const updateComposerFlow: ComposerFlow = {
  sessionId: "session_update_001",
  messages: [
    createMessage("msg_1", "user_request", "把冲刺技能的距离改成500，冷却降到8秒"),
    createMessage("msg_2", "system_clarification", "检测到更新意图：修改现有技能参数。"),
    createMessage("msg_3", "feature_update", "已定位 Feature 'dash_skill_q'，当前状态：persisted"),
    createMessage("msg_4", "feature_update", "参数变更：distance 400→500, cooldown 10→8"),
    createMessage("msg_5", "next_step_hint", "检测到参数变更，需要确认是否应用到所有相关文件。", {
      suggestedInputs: ["确认更新", "仅修改距离", "取消"],
    }),
  ],
  currentStage: "confirming",
  suggestedActions: [
    { id: "act_1", type: "confirm", label: "确认更新", description: "应用所有变更", enabled: true, primary: true },
    { id: "act_2", type: "update", label: "调整变更", description: "选择部分变更应用", enabled: true },
    { id: "act_3", type: "cancel", label: "取消", description: "放弃更新", enabled: true },
  ],
  inputPlaceholder: "确认变更或提出修改...",
  isAwaitingInput: true,
};

// Governance Blocked Scenario Flow
export const governanceBlockedComposerFlow: ComposerFlow = {
  sessionId: "session_blocked_001",
  messages: [
    createMessage("msg_1", "user_request", "做一个天赋抽取系统，按F4打开面板"),
    createMessage("msg_2", "system_clarification", "检测到创建意图：天赋系统 + UI面板。"),
    createMessage("msg_3", "governance_prompt", "⚠️ 检测到冲突：F4 按键已被 'stats_panel' 占用", {
      governanceItemIds: ["conflict_0"],
      requiresInput: true,
    }),
    createMessage("msg_4", "governance_prompt", "⚠️ 缺少数据定义：talent_pool 未定义", {
      governanceItemIds: ["parameter_0"],
      requiresInput: true,
    }),
    createMessage("msg_5", "action_submission", "当前状态：blocked，需要解决上述问题才能继续。"),
  ],
  currentStage: "confirming",
  suggestedActions: [
    { id: "act_1", type: "clarify", label: "提供澄清", description: "解决冲突和缺失项", enabled: true, primary: true },
    { id: "act_2", type: "retry", label: "重试", description: "重新检查状态", enabled: true },
    { id: "act_3", type: "cancel", label: "取消", description: "放弃当前请求", enabled: true, danger: true },
  ],
  inputPlaceholder: "输入解决方案，如：改用F5按键...",
  isAwaitingInput: true,
};

// Get flow by scenario
export function getComposerFlow(scenario: "create" | "update" | "governance_blocked"): ComposerFlow {
  switch (scenario) {
    case "create":
      return createComposerFlow;
    case "update":
      return updateComposerFlow;
    case "governance_blocked":
      return governanceBlockedComposerFlow;
    default:
      return createComposerFlow;
  }
}

export const WORKBENCH_LLM_TEMPERATURE = 1;
export const WORKBENCH_WIZARD_LLM_TEMPERATURE = 1;
export const WORKBENCH_LLM_PROVIDER_OPTIONS = {};
export const WORKBENCH_WIZARD_PROVIDER_OPTIONS = {};

export const LABELS: Record<string, Record<string, string>> = {
  decision: {
    create: "创建",
    update: "更新",
    possible_match: "可能匹配",
    unclear: "未明确",
  },
  confidence: {
    high: "高",
    medium: "中",
    low: "低",
  },
  focusType: {
    newly_created: "新建",
    persisted_existing: "已持久化",
    candidate_match: "候选匹配",
    runtime_only: "仅运行时",
  },
  persistence: {
    new: "新建对象",
    persisted: "已持久化",
    runtime: "运行时",
  },
  handoffStatus: {
    direct_target: "直接目标",
    candidate_target: "候选目标",
    unresolved: "未解析",
  },
  handlerStatus: {
    ready_for_dry_run: "就绪",
    blocked_waiting_target: "等待目标",
    blocked_waiting_confirmation: "等待确认",
    not_applicable: "不适用",
  },
};

export const SECTIONS: Record<string, string> = {
  routing: "ROUTING / 路由判断",
  focus: "FOCUS / 焦点追踪",
  handoff: "HANDOFF / 交接",
  handler: "UPDATE HANDLER / 更新处理器",
  plan: "UPDATE PLAN / 更新计划",
  governance: "GOVERNANCE / 治理释放",
  confirmation: "CONFIRMATION / 确认动作",
  write: "WRITE / 写入结果",
};

export const PLAN_LABELS: Record<string, Record<string, string>> = {
  planStatus: {
    planning_ready: "就绪",
    planning_blocked: "阻塞",
    planning_not_applicable: "不适用",
  },
  operationType: {
    no_op: "无操作",
    modify_existing: "修改现有",
    attach_parameter_update: "附加参数更新",
  },
  surfaceKind: {
    trigger: "触发器",
    data: "数据",
    effect: "效果",
    ui: "界面",
    rule: "规则",
    kv: "KV配置",
    lua: "Lua逻辑",
    ts: "TypeScript",
  },
  riskLevel: {
    low: "低",
    medium: "中",
    high: "高",
  },
};

export const WRITE_LABELS: Record<string, Record<string, string>> = {
  writeStatus: {
    not_applicable: "不适用",
    blocked_by_plan: "被计划阻塞",
    blocked_by_conflict: "被冲突阻塞",
    simulated: "模拟",
    simulated_write: "模拟写入",
    written: "已写入",
    write_failed: "写入失败",
    forced_validation: "强制验证",
    forced_validation_write: "强制验证写入",
  },
  writeMode: {
    dry_run: "预演模式",
    actual: "实际模式",
    simulated: "模拟",
    forced_validation: "强制验证",
    actual_write: "实际写入",
  },
  outputStatus: {
    created: "创建",
    modified: "修改",
    deleted: "删除",
    unchanged: "未变",
  },
};

export const GOVERNANCE_LABELS: Record<string, Record<string, string>> = {
  releaseStatus: {
    not_required: "不需要",
    awaiting_confirmation: "等待确认",
    released: "已释放",
    blocked: "已阻塞",
    blocked_by_conflict: "被冲突阻塞",
    blocked_pending_confirmation: "待确认阻塞",
    blocked_by_governance: "被治理阻塞",
  },
  confirmationType: {
    conflict: "冲突",
    parameter: "参数",
    ownership: "所有权",
  },
  severity: {
    high: "高",
    medium: "中",
    low: "低",
  },
};

export const CONFIRMATION_LABELS: Record<string, Record<string, string>> = {
  actionStatus: {
    not_applicable: "不适用",
    awaiting_items: "等待项",
    partially_accepted: "部分接受",
    accepted: "已接受",
    partially_confirmed: "部分确认",
    fully_confirmed: "全部确认",
    rejected: "已拒绝",
  },
  transitionResult: {
    released_to_ready: "已释放至就绪",
    still_blocked: "仍被阻塞",
    not_needed: "不需要",
  },
};

export function p(label: string, value: string): string {
  return `   ${label}: ${value}`;
}

// F003: Process Stage Card - Shows current lifecycle/governance/update stage
// Secondary visual element that helps users understand where they are in the workflow

import type { LifecycleActions, UpdateHandoff, UpdateHandler, GovernanceRelease } from "../types/workbench";

interface ProcessStageCardProps {
  lifecycleActions?: LifecycleActions;
  updateHandoff?: UpdateHandoff;
  updateHandler?: UpdateHandler;
  governanceRelease?: GovernanceRelease;
}

const stageConfig: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: "草稿", color: "#8b949e", icon: "📝" },
  needs_clarification: { label: "需澄清", color: "#f0883e", icon: "❓" },
  ready: { label: "就绪", color: "#3fb950", icon: "✓" },
  blocked: { label: "阻塞", color: "#f85149", icon: "⚠️" },
  new: { label: "新建", color: "#58a6ff", icon: "✨" },
  persisted: { label: "已保存", color: "#3fb950", icon: "💾" },
  runtime: { label: "运行时", color: "#f0883e", icon: "⚡" },
  not_required: { label: "无需发布", color: "#8b949e", icon: "➖" },
  awaiting_confirmation: { label: "等待确认", color: "#f0883e", icon: "⏳" },
};

export function ProcessStageCard({
  lifecycleActions,
  updateHandler,
  governanceRelease,
}: ProcessStageCardProps) {
  // F003: updateHandoff intentionally unused - reserved for future detailed view
  // Determine current stage context
  const currentStage = lifecycleActions?.currentStage || "draft";
  const persistenceState = lifecycleActions?.persistenceState || "new";
  const governanceStatus = governanceRelease?.status || "not_required";
  const updateStatus = updateHandler?.status || "not_applicable";

  const stage = stageConfig[currentStage] || stageConfig.draft;

  // Build stage steps
  const steps: Array<{ label: string; status: "completed" | "current" | "pending"; icon: string }> = [
    {
      label: persistenceState === "new" ? "创建功能" : "定位功能",
      status: persistenceState === "new" ? "current" : "completed",
      icon: persistenceState === "new" ? "✨" : "📍",
    },
  ];

  // Add governance step if needed
  if (governanceStatus !== "not_required") {
    steps.push({
      label: governanceStatus === "blocked" ? "解决冲突" : "确认发布",
      status: governanceStatus === "blocked" ? "current" : governanceStatus === "awaiting_confirmation" ? "current" : "completed",
      icon: governanceStatus === "blocked" ? "⚠️" : "🔒",
    });
  }

  // Add update step if applicable
  if (updateStatus !== "not_applicable") {
    steps.push({
      label: "应用更新",
      status: updateStatus === "ready_for_dry_run" || updateStatus === "blocked_waiting_confirmation" ? "current" : "pending",
      icon: "🔄",
    });
  }

  // Add final step
  steps.push({
    label: "生成代码",
    status: currentStage === "ready" && governanceStatus !== "blocked" ? "current" : "pending",
    icon: "🚀",
  });

  return (
    <div className="panel" style={{ padding: "20px" }}>
      <div
        style={{
          fontSize: "12px",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "16px",
        }}
      >
        当前阶段
      </div>

      {/* Current Stage Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px",
          backgroundColor: `${stage.color}15`,
          borderRadius: "var(--radius-md)",
          border: `1px solid ${stage.color}30`,
          marginBottom: "20px",
        }}
      >
        <span style={{ fontSize: "32px" }}>{stage.icon}</span>
        <div>
          <div
            style={{
              fontSize: "14px",
              color: "var(--color-text-muted)",
              marginBottom: "2px",
            }}
          >
            {persistenceState === "new" ? "新建功能" : persistenceState === "persisted" ? "更新功能" : "功能状态"}
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: stage.color,
            }}
          >
            {stage.label}
          </div>
        </div>
      </div>

      {/* Process Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "flex-start" }}>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: "31px",
                  top: `${120 + idx * 44}px`,
                  width: "2px",
                  height: "32px",
                  backgroundColor:
                    step.status === "completed"
                      ? "#3fb950"
                      : "var(--color-border)",
                }}
              />
            )}

            {/* Step indicator */}
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                marginRight: "12px",
                flexShrink: 0,
                backgroundColor:
                  step.status === "completed"
                    ? "#3fb950"
                    : step.status === "current"
                    ? "var(--color-accent)"
                    : "var(--color-bg-tertiary)",
                color:
                  step.status === "completed" || step.status === "current"
                    ? "white"
                    : "var(--color-text-muted)",
              }}
            >
              {step.status === "completed" ? "✓" : step.icon}
            </div>

            {/* Step label */}
            <div
              style={{
                padding: "4px 0",
                fontSize: "14px",
                color:
                  step.status === "current"
                    ? "var(--color-text-primary)"
                    : step.status === "completed"
                    ? "var(--color-text-secondary)"
                    : "var(--color-text-muted)",
                fontWeight: step.status === "current" ? 500 : 400,
              }}
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>

      {/* Available Actions */}
      {lifecycleActions?.actions && lifecycleActions.actions.length > 0 && (
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
          <div
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              marginBottom: "12px",
            }}
          >
            可用操作
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {lifecycleActions.actions
              .filter(a => a.enabled)
              .map((action, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: action.kind === "create" || action.kind === "update"
                      ? "rgba(63, 185, 80, 0.15)"
                      : "var(--color-bg-tertiary)",
                    color: action.kind === "create" || action.kind === "update"
                      ? "#3fb950"
                      : "var(--color-text-secondary)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    fontWeight: action.kind === "create" || action.kind === "update" ? 500 : 400,
                  }}
                >
                  {action.kind === "create" && "创建"}
                  {action.kind === "read" && "查看"}
                  {action.kind === "update" && "更新"}
                  {action.kind === "archive" && "删除"}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

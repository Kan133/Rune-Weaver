import type { LifecycleActions, FeatureFocus, UpdateHandoff, UpdateHandler } from "../types/workbench";

interface LifecyclePanelProps {
  lifecycleActions: LifecycleActions;
  featureFocus?: FeatureFocus;
  updateHandoff?: UpdateHandoff;
  updateHandler?: UpdateHandler;
}

export function LifecyclePanel({
  lifecycleActions,
  featureFocus,
  updateHandoff,
  updateHandler,
}: LifecyclePanelProps) {
  const actionLabels: Record<string, string> = {
    create: "创建",
    read: "读取",
    update: "更新",
    archive: "归档",
  };

  const focusTypeLabels: Record<string, string> = {
    newly_created: "新创建",
    persisted_existing: "已存在",
    candidate_match: "候选匹配",
    runtime_only: "仅运行时",
  };

  const handoffStatusLabels: Record<string, string> = {
    direct_target: "直接目标",
    candidate_target: "候选目标",
    unresolved: "未解决",
  };

  const handlerStatusLabels: Record<string, string> = {
    ready_for_dry_run: "准备预演",
    blocked_waiting_target: "等待目标",
    blocked_waiting_confirmation: "等待确认",
    not_applicable: "不适用",
  };

  return (
    <div className="panel">
      <div className="panel-header">生命周期 / 更新链</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Lifecycle Actions */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            可用操作
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {lifecycleActions.actions.map((action, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  opacity: action.enabled ? 1 : 0.5,
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 500,
                      color: action.enabled
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    {actionLabels[action.kind] || action.kind}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      marginLeft: "8px",
                    }}
                  >
                    {action.reason}
                  </span>
                </div>
                {action.enabled && action.nextHint && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-accent)",
                    }}
                  >
                    {action.nextHint}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Persistence State */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            持久化状态
          </div>
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
            }}
          >
            <div>
              <span className="text-muted">状态: </span>
              <span className="tag">{lifecycleActions.persistenceState}</span>
            </div>
            {lifecycleActions.persistedFeatureId && (
              <div style={{ marginTop: "6px" }}>
                <span className="text-muted">功能ID: </span>
                <span className="font-mono">{lifecycleActions.persistedFeatureId}</span>
              </div>
            )}
            <div style={{ marginTop: "6px" }}>
              <span className="text-muted">原因: </span>
              <span>{lifecycleActions.persistenceReason}</span>
            </div>
          </div>
        </div>

        {/* Feature Focus */}
        {featureFocus && (
          <div>
            <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
              当前聚焦
            </div>
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
              }}
            >
              <div>
                <span className="text-muted">类型: </span>
                <span>{focusTypeLabels[featureFocus.focusType] || featureFocus.focusType}</span>
              </div>
              {featureFocus.featureId && (
                <div style={{ marginTop: "6px" }}>
                  <span className="text-muted">功能: </span>
                  <span className="font-mono">{featureFocus.featureLabel}</span>
                </div>
              )}
              <div style={{ marginTop: "6px" }}>
                <span className="text-muted">原因: </span>
                <span>{featureFocus.reason}</span>
              </div>
            </div>
          </div>
        )}

        {/* Update Handoff */}
        {updateHandoff && updateHandoff.status !== "unresolved" && (
          <div>
            <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
              更新交接
            </div>
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
              }}
            >
              <div>
                <span className="text-muted">状态: </span>
                <span>{handoffStatusLabels[updateHandoff.status] || updateHandoff.status}</span>
              </div>
              {updateHandoff.targetFeatureId && (
                <div style={{ marginTop: "6px" }}>
                  <span className="text-muted">目标: </span>
                  <span className="font-mono">{updateHandoff.targetFeatureLabel}</span>
                </div>
              )}
              <div style={{ marginTop: "6px" }}>
                <span className="text-muted">原因: </span>
                <span>{updateHandoff.handoverReason}</span>
              </div>
            </div>
          </div>
        )}

        {/* Update Handler */}
        {updateHandler && updateHandler.status !== "not_applicable" && (
          <div>
            <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
              更新处理
            </div>
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
              }}
            >
              <div>
                <span className="text-muted">状态: </span>
                <span>{handlerStatusLabels[updateHandler.status] || updateHandler.status}</span>
              </div>
              <div style={{ marginTop: "6px" }}>
                <span className="text-muted">原因: </span>
                <span>{updateHandler.reason}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import type { OutputEvidence, GovernanceRelease, ConfirmationAction } from "../types/workbench";

interface OutputEvidencePanelProps {
  outputEvidence?: OutputEvidence[];
  governanceRelease?: GovernanceRelease;
  confirmationActions?: ConfirmationAction[];
}

export function OutputEvidencePanel({
  outputEvidence,
  governanceRelease,
  confirmationActions,
}: OutputEvidencePanelProps) {
  const contentTypeLabels: Record<string, string> = {
    kv: "KV",
    ts: "TypeScript",
    lua: "Lua",
    tsx: "TSX",
    less: "Less",
  };

  const contentTypeColors: Record<string, string> = {
    kv: "var(--color-warning-light)",
    ts: "var(--color-accent)",
    lua: "var(--color-success-light)",
    tsx: "var(--color-accent)",
    less: "var(--color-danger-light)",
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    not_required: { bg: "rgba(35, 134, 54, 0.1)", text: "var(--color-success-light)" },
    awaiting_confirmation: { bg: "rgba(245, 158, 11, 0.1)", text: "rgb(245, 158, 11)" },
    released: { bg: "rgba(35, 134, 54, 0.1)", text: "var(--color-success-light)" },
    blocked: { bg: "rgba(218, 54, 51, 0.1)", text: "var(--color-danger-light)" },
    blocked_by_conflict: { bg: "rgba(218, 54, 51, 0.1)", text: "var(--color-danger-light)" },
    blocked_pending_confirmation: { bg: "rgba(245, 158, 11, 0.1)", text: "rgb(245, 158, 11)" },
    blocked_by_governance: { bg: "rgba(218, 54, 51, 0.1)", text: "var(--color-danger-light)" },
  };

  const statusLabels: Record<string, string> = {
    not_required: "不需要",
    awaiting_confirmation: "等待确认",
    released: "已释放",
    blocked: "已阻塞",
    blocked_by_conflict: "被冲突阻塞",
    blocked_pending_confirmation: "待确认阻塞",
    blocked_by_governance: "被治理阻塞",
  };

  return (
    <div className="panel">
      <div className="panel-header">输出 / 治理</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Governance Release */}
        {governanceRelease && (
          <div>
            <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
              治理状态
            </div>
            <div
              style={{
                padding: "12px",
                backgroundColor: statusColors[governanceRelease.status]?.bg || "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <span className="text-muted">状态: </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: statusColors[governanceRelease.status]?.text || "var(--color-text-primary)",
                  }}
                >
                  {statusLabels[governanceRelease.status] || governanceRelease.status}
                </span>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <span className="text-muted">可自行释放: </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: governanceRelease.canSelfRelease
                      ? "var(--color-success-light)"
                      : "var(--color-danger-light)",
                  }}
                >
                  {governanceRelease.canSelfRelease ? "是" : "否"}
                </span>
              </div>
              {governanceRelease.blockedReason && (
                <div style={{ marginBottom: "8px" }}>
                  <span className="text-muted">阻塞原因: </span>
                  <span style={{ color: "var(--color-danger-light)" }}>
                    {governanceRelease.blockedReason}
                  </span>
                </div>
              )}
              {governanceRelease.requiredConfirmations.filter(c => c.severity === "high").length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <span className="text-muted">高优先级确认项: </span>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    {governanceRelease.requiredConfirmations
                      .filter(c => c.severity === "high")
                      .map((conf, idx) => (
                        <li key={idx} style={{ color: "var(--color-danger-light)" }}>
                          {conf.description}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {governanceRelease.releaseHint && (
                <div>
                  <span className="text-muted">提示: </span>
                  <span style={{ color: "var(--color-accent)" }}>
                    {governanceRelease.releaseHint}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Actions */}
        {confirmationActions && confirmationActions.length > 0 && (
          <div>
            <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
              确认项 ({confirmationActions.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {confirmationActions.map((action) => (
                <div
                  key={action.itemId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "var(--color-bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                    opacity: action.confirmed ? 0.6 : 1,
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px" }}>{action.description}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {action.required ? "必需" : "可选"}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      action.confirmed ? "badge-success" : "badge-warning"
                    }`}
                  >
                    {action.confirmed ? "已确认" : "待确认"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output Evidence */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            生成文件 ({outputEvidence?.length || 0})
          </div>
          {outputEvidence && outputEvidence.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {outputEvidence.map((evidence, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "var(--color-bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      className="tag"
                      style={{
                        color: contentTypeColors[evidence.contentType] || "var(--color-text-secondary)",
                      }}
                    >
                      {contentTypeLabels[evidence.contentType] || evidence.contentType}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {evidence.size} bytes
                    </span>
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {evidence.filePath}
                  </div>
                  <div style={{ fontSize: "12px", marginTop: "4px" }}>
                    {evidence.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "13px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              暂无生成文件
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import type { SessionSummary as SessionSummaryType } from "../types/workbench";

interface SessionSummaryProps {
  session: SessionSummaryType;
}

export function SessionSummary({ session }: SessionSummaryProps) {
  const statusColors: Record<string, string> = {
    active: "var(--color-accent)",
    completed: "var(--color-success-light)",
    error: "var(--color-danger-light)",
  };

  return (
    <div className="panel" style={{ marginBottom: "16px" }}>
      <div className="panel-header">会话信息</div>
      <div
        style={{
          display: "flex",
          gap: "24px",
          fontSize: "13px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="text-muted">Session ID: </span>
          <span className="font-mono">{session.sessionId}</span>
        </div>
        <div>
          <span className="text-muted">状态: </span>
          <span
            style={{
              color: statusColors[session.status] || "var(--color-text-secondary)",
              fontWeight: 500,
            }}
          >
            {session.status}
          </span>
        </div>
        <div>
          <span className="text-muted">当前功能: </span>
          <span className="font-mono">
            {session.currentFeatureId || "-"}
          </span>
        </div>
        <div>
          <span className="text-muted">Host Root: </span>
          <span className="font-mono">{session.hostRoot}</span>
        </div>
      </div>
    </div>
  );
}

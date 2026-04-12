import type { FeatureCard as FeatureCardType } from "../types/workbench";

interface FeatureCardPanelProps {
  featureCard: FeatureCardType;
}

export function FeatureCardPanel({ featureCard }: FeatureCardPanelProps) {
  const riskClass = `risk-${featureCard.riskLevel}`;

  return (
    <div className="panel">
      <div className="panel-header">功能卡片</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Header */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span className="text-xl font-semibold">
              {featureCard.displayLabel}
            </span>
            <span
              className={`badge ${
                featureCard.status === "ready"
                  ? "badge-success"
                  : featureCard.status === "blocked"
                  ? "badge-danger"
                  : "badge-warning"
              }`}
            >
              {featureCard.status}
            </span>
          </div>
          <span className="font-mono text-sm text-muted">
            {featureCard.systemLabel}
          </span>
        </div>

        {/* Summary */}
        <div
          style={{
            padding: "12px",
            backgroundColor: "var(--color-bg-tertiary)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          {featureCard.summary}
        </div>

        {/* Metadata */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="text-muted">Host: </span>
            <span className="tag">{featureCard.host}</span>
          </div>
          <div>
            <span className="text-muted">风险: </span>
            <span className={riskClass} style={{ fontWeight: 500 }}>
              {featureCard.riskLevel}
            </span>
          </div>
          <div>
            <span className="text-muted">需要确认: </span>
            <span>{featureCard.needsConfirmation ? "是" : "否"}</span>
          </div>
        </div>

        {/* Timestamps */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "11px",
            color: "var(--color-text-muted)",
          }}
        >
          <span>创建: {new Date(featureCard.createdAt).toLocaleString()}</span>
          <span>更新: {new Date(featureCard.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

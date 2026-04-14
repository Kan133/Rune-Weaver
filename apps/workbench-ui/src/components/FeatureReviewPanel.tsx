import type { FeatureReview as FeatureReviewType } from "../types/workbench";

interface FeatureReviewPanelProps {
  featureReview: FeatureReviewType;
}

export function FeatureReviewPanel({ featureReview }: FeatureReviewPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">功能评审</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Summary */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "4px" }}>
            评审摘要
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
            }}
          >
            {featureReview.summary}
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            识别能力
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {featureReview.recognizedCapabilities.map((cap, idx) => (
              <span key={idx} className="badge badge-success">
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Known Inputs */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            已知输入
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "8px",
            }}
          >
            {Object.entries(featureReview.knownInputs).map(([key, value]) => (
              <div
                key={key}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                }}
              >
                <span className="text-muted">{key}: </span>
                <span className="font-mono">
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Conflict Summary */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "4px" }}>
            冲突摘要
          </div>
          <div
            style={{
              padding: "10px 12px",
              backgroundColor:
                featureReview.conflictSummary === "无冲突"
                  ? "rgba(35, 134, 54, 0.1)"
                  : "rgba(218, 54, 51, 0.1)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              color:
                featureReview.conflictSummary === "无冲突"
                  ? "var(--color-success-light)"
                  : "var(--color-danger-light)",
            }}
          >
            {featureReview.conflictSummary}
          </div>
        </div>

        {/* Next Step */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "4px" }}>
            下一步
          </div>
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              borderLeft: "3px solid var(--color-accent)",
            }}
          >
            {featureReview.nextStep}
          </div>
        </div>
      </div>
    </div>
  );
}

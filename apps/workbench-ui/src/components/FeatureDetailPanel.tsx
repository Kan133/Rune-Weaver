import type { FeatureDetail } from "../types/workbench";

interface FeatureDetailPanelProps {
  featureDetail: FeatureDetail;
}

export function FeatureDetailPanel({ featureDetail }: FeatureDetailPanelProps) {
  const { basicInfo, status, editableParams, hostOutput, patternBindings } = featureDetail;

  return (
    <div className="panel">
      <div className="panel-header">功能详情</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Basic Info */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            基本信息
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <span className="text-muted">意图: </span>
              <span>{basicInfo.intentSummary}</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <span className="text-muted">Host Scope: </span>
              <span className="tag">{basicInfo.hostScope}</span>
            </div>
            <div>
              <span className="text-muted">ID: </span>
              <span className="font-mono">{basicInfo.id}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            状态
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div className="text-muted text-sm">状态</div>
              <div
                className={`status-${status.status}`}
                style={{ fontWeight: 500, marginTop: "4px" }}
              >
                {status.status}
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div className="text-muted text-sm">风险等级</div>
              <div
                className={`risk-${status.riskLevel}`}
                style={{ fontWeight: 500, marginTop: "4px" }}
              >
                {status.riskLevel}
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div className="text-muted text-sm">冲突数</div>
              <div style={{ fontWeight: 500, marginTop: "4px" }}>
                {status.conflictCount}
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div className="text-muted text-sm">需要确认</div>
              <div style={{ fontWeight: 500, marginTop: "4px" }}>
                {status.needsConfirmation ? "是" : "否"}
              </div>
            </div>
          </div>
        </div>

        {/* Known Inputs */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            已知参数
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
            }}
          >
            {Object.entries(editableParams.knownInputs).map(([key, value]) => (
              <div key={key} style={{ marginBottom: "6px" }}>
                <span className="text-muted">{key}: </span>
                <span className="font-mono">
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </span>
              </div>
            ))}
            {editableParams.missingParams.length > 0 && (
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--color-border)" }}>
                <span className="text-muted">缺失参数: </span>
                <span style={{ color: "var(--color-warning-light)" }}>
                  {editableParams.missingParams.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Host Output */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            Host 输出预期
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <span className="text-muted">Host: </span>
              <span className="tag">{hostOutput.host}</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <span className="text-muted">影响层面: </span>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                {hostOutput.impactAreas.map((area) => (
                  <span key={area} className="badge">
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <span className="text-muted">预期Surface: </span>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                {hostOutput.expectedSurfaces.map((surface) => (
                  <span key={surface} className="tag">
                    {surface}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-muted">集成点: </span>
              <span>{hostOutput.integrationPointCount} 个</span>
            </div>
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--color-border)" }}>
              <span className="text-muted">输出摘要: </span>
              <span>{hostOutput.outputSummary}</span>
            </div>
          </div>
        </div>

        {/* Pattern Bindings */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            Pattern 绑定
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <span className="text-muted">状态: </span>
              <span className={patternBindings.isBound ? "status-ready" : "status-blocked"}>
                {patternBindings.isBound ? "已绑定" : "未绑定"}
              </span>
            </div>
            <div>
              <span className="text-muted">Patterns: </span>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                {patternBindings.patterns.map((pattern) => (
                  <span key={pattern} className="tag">
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

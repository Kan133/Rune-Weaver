import type { BlueprintProposal } from "../types/workbench";

interface BlueprintPanelProps {
  blueprint: BlueprintProposal;
}

export function BlueprintPanel({ blueprint }: BlueprintPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">Blueprint / Pattern</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Blueprint Info */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            Blueprint 信息
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
              <span className="text-muted">ID: </span>
              <span className="font-mono">{blueprint.blueprintId}</span>
            </div>
            <div>
              <span className="text-muted">关联功能: </span>
              <span className="font-mono">{blueprint.featureId}</span>
            </div>
          </div>
        </div>

        {/* Rationale */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            设计 rationale
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--color-bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              borderLeft: "3px solid var(--color-accent)",
            }}
          >
            {blueprint.rationale}
          </div>
        </div>

        {/* Modules */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            模块组成 ({blueprint.modules.length} 个)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {blueprint.modules.map((module) => (
              <div
                key={module.moduleId}
                style={{
                  padding: "12px",
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <span className="font-mono text-sm">{module.moduleId}</span>
                  <span className="badge">{module.role}</span>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: "8px",
                  }}
                >
                  {module.description}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {module.patternIds.map((patternId) => (
                    <span key={patternId} className="tag">
                      {patternId}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Affected Surfaces */}
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: "8px" }}>
            影响层面
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {blueprint.affectedSurfaces.map((surface) => (
              <span key={surface} className="badge badge-warning">
                {surface}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

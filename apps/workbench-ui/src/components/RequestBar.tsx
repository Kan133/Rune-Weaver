import type { MockScenario } from "../types/workbench";
import { allScenarios } from "../mocks/scenarios";

interface RequestBarProps {
  currentScenario: MockScenario;
  onScenarioChange: (scenario: MockScenario) => void;
  requestInput: string;
  onRequestInputChange: (value: string) => void;
  onSubmit: () => void;
  hostRoot: string;
  dryRun: boolean;
  onDryRunChange: (value: boolean) => void;
}

export function RequestBar({
  currentScenario,
  onScenarioChange,
  requestInput,
  onRequestInputChange,
  onSubmit,
  hostRoot,
  dryRun,
  onDryRunChange,
}: RequestBarProps) {
  return (
    <div className="panel" style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Scenario Selector */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {allScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => onScenarioChange(scenario.id)}
              className={`btn ${currentScenario === scenario.id ? "btn-primary" : ""}`}
              style={{
                fontSize: "12px",
                padding: "6px 12px",
              }}
            >
              {scenario.label}
            </button>
          ))}
        </div>

        {/* Request Input */}
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            value={requestInput}
            onChange={(e) => onRequestInputChange(e.target.value)}
            placeholder="描述你想要的功能..."
            style={{
              flex: 1,
              padding: "10px 14px",
              fontSize: "14px",
              backgroundColor: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
          <button onClick={onSubmit} className="btn btn-primary">
            提交
          </button>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--color-text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span className="font-mono">Host: {hostRoot}</span>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => onDryRunChange(e.target.checked)}
            />
            <span>Dry Run</span>
          </label>
        </div>
      </div>
    </div>
  );
}

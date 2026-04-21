import { useState } from "react";
import type { GovernanceRelease } from "../types/workbench";

interface ConfirmationPanelProps {
  governanceRelease?: GovernanceRelease;
  onConfirm: (itemId: string) => void;
  onSubmitConfirmations: () => void;
}

interface LocalConfirmationState {
  [itemId: string]: boolean;
}

const severityConfig = {
  high: { color: "#f85149", label: "高", bg: "rgba(248, 81, 73, 0.1)" },
  medium: { color: "#f0883e", label: "中", bg: "rgba(240, 136, 62, 0.1)" },
  low: { color: "#8b949e", label: "低", bg: "rgba(139, 148, 158, 0.1)" },
};

const itemTypeLabels = {
  conflict: "冲突",
  parameter: "参数",
  ownership: "所有权",
};

export function ConfirmationPanel({
  governanceRelease,
  onConfirm,
  onSubmitConfirmations,
}: ConfirmationPanelProps) {
  const [localConfirmed, setLocalConfirmed] = useState<LocalConfirmationState>({});

  const requiredItems = governanceRelease?.requiredConfirmations || [];

  if (requiredItems.length === 0) {
    return null;
  }

  const handleItemToggle = (itemId: string) => {
    const newState = { ...localConfirmed, [itemId]: !localConfirmed[itemId] };
    setLocalConfirmed(newState);
  };

  const confirmedCount = Object.values(localConfirmed).filter(Boolean).length;
  const totalCount = requiredItems.length;
  const allConfirmed = confirmedCount === totalCount;
  const hasAtLeastOneConfirmed = confirmedCount > 0;

  const handleSubmit = () => {
    Object.entries(localConfirmed)
      .filter(([, confirmed]) => confirmed)
      .forEach(([itemId]) => {
        onConfirm(itemId);
      });
    onSubmitConfirmations();
  };

  const getSubmitButtonText = () => {
    if (allConfirmed) return "确认并继续";
    if (hasAtLeastOneConfirmed) return `继续处理 (${confirmedCount}/${totalCount})`;
    return "确认";
  };

  const getStatusMessage = () => {
    if (allConfirmed) {
      return { text: "✓ 所有确认项已就绪", color: "#3fb950" };
    }
    if (hasAtLeastOneConfirmed) {
      return { 
        text: `已选择 ${confirmedCount}/${totalCount} 项，继续后可处理剩余项`, 
        color: "#f0883e" 
      };
    }
    return { 
      text: "请选择需要确认的项", 
      color: "var(--color-text-muted)" 
    };
  };

  const statusMessage = getStatusMessage();

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            需要确认
          </span>
          <span
            style={{
              padding: "2px 8px",
              backgroundColor: "var(--color-accent)",
              color: "white",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
            }}
          >
            {confirmedCount}/{totalCount}
          </span>
        </div>
        {governanceRelease?.releaseHint && (
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            {governanceRelease.releaseHint}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {requiredItems.map((item) => {
          const severity = severityConfig[item.severity];
          const isChecked = localConfirmed[item.itemId] || false;

          return (
            <label
              key={item.itemId}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "12px",
                backgroundColor: isChecked ? "rgba(63, 185, 80, 0.08)" : "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${isChecked ? "rgba(63, 185, 80, 0.3)" : "var(--color-border)"}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleItemToggle(item.itemId)}
                style={{
                  width: "18px",
                  height: "18px",
                  marginTop: "2px",
                  accentColor: "var(--color-accent)",
                  cursor: "pointer",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      padding: "2px 6px",
                      backgroundColor: severity.bg,
                      color: severity.color,
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11px",
                      fontWeight: 500,
                    }}
                  >
                    {severity.label}
                  </span>
                  <span
                    style={{
                      padding: "2px 6px",
                      backgroundColor: "var(--color-bg-primary)",
                      color: "var(--color-text-muted)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11px",
                    }}
                  >
                    {itemTypeLabels[item.itemType]}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>
                  {item.description}
                </div>
                {item.currentValue && (
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    当前值: <span style={{ fontFamily: "monospace" }}>{item.currentValue}</span>
                  </div>
                )}
                {item.suggestedValue && (
                  <div style={{ fontSize: "12px", color: "var(--color-accent)", marginTop: "2px" }}>
                    建议值: <span style={{ fontFamily: "monospace" }}>{item.suggestedValue}</span>
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "13px", color: statusMessage.color }}>
          {statusMessage.text}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!hasAtLeastOneConfirmed}
          style={{
            padding: "8px 20px",
            backgroundColor: hasAtLeastOneConfirmed 
              ? (allConfirmed ? "var(--color-accent)" : "#f0883e") 
              : "var(--color-bg-tertiary)",
            color: hasAtLeastOneConfirmed ? "white" : "var(--color-text-muted)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: hasAtLeastOneConfirmed ? "pointer" : "not-allowed",
            opacity: hasAtLeastOneConfirmed ? 1 : 0.6,
            transition: "all 0.2s ease",
          }}
        >
          {getSubmitButtonText()}
        </button>
      </div>
    </div>
  );
}

export function getConfirmationResult(
  governanceRelease: GovernanceRelease | undefined,
  confirmedItemIds: string[]
): {
  actionStatus: "not_applicable" | "partially_confirmed" | "fully_confirmed";
  transitionResult: "released_to_ready" | "still_blocked" | "not_needed";
  canProceed: boolean;
  remainingCount: number;
} {
  if (!governanceRelease || governanceRelease.requiredConfirmations.length === 0) {
    return {
      actionStatus: "not_applicable",
      transitionResult: "not_needed",
      canProceed: true,
      remainingCount: 0,
    };
  }

  const totalRequired = governanceRelease.requiredConfirmations.length;
  const confirmedCount = confirmedItemIds.length;
  const remainingCount = totalRequired - confirmedCount;

  if (remainingCount === 0) {
    return {
      actionStatus: "fully_confirmed",
      transitionResult: "released_to_ready",
      canProceed: true,
      remainingCount: 0,
    };
  }

  return {
    actionStatus: "partially_confirmed",
    transitionResult: "still_blocked",
    canProceed: false,
    remainingCount,
  };
}

// F003: Feature Hero Card - The primary visual element
// Shows the most important feature info for beginners
// Replaces the scattered FeatureCard + FeatureReview + FeatureDetail combo

import { useState } from "react";
import type { FeatureCard, FeatureReview, FeatureDetail, GovernanceRelease, ConfirmationAction } from "../types/workbench";
import { ConfirmationPanel, getConfirmationResult } from "./ConfirmationPanel";

interface FeatureHeroCardProps {
  featureCard?: FeatureCard;
  featureReview?: FeatureReview;
  featureDetail?: FeatureDetail;
  governanceRelease?: GovernanceRelease;
  confirmationActions?: ConfirmationAction[];
  onConfirm?: (itemId: string) => void;
  onConfirmationsSubmitted?: () => void;
  // F009: Source context for confirmation awareness
  sourceMode?: string;
  isFallback?: boolean;
  fallbackChain?: string[];
}

const statusConfig = {
  draft: { color: "#8b949e", bg: "rgba(139, 148, 158, 0.15)", label: "草稿" },
  needs_clarification: { color: "#f0883e", bg: "rgba(240, 136, 62, 0.15)", label: "需澄清" },
  ready: { color: "#3fb950", bg: "rgba(63, 185, 80, 0.15)", label: "就绪" },
  blocked: { color: "#f85149", bg: "rgba(248, 81, 73, 0.15)", label: "阻塞" },
};

const riskConfig = {
  low: { color: "#3fb950", label: "低风险" },
  medium: { color: "#f0883e", label: "中风险" },
  high: { color: "#f85149", label: "高风险" },
};

export function FeatureHeroCard({
  featureCard,
  featureDetail,
  governanceRelease,
  confirmationActions,
  onConfirm,
  onConfirmationsSubmitted,
  // F009: Source context for confirmation awareness
  sourceMode,
  isFallback,
  fallbackChain,
}: FeatureHeroCardProps) {
  // F003: featureReview intentionally unused - reserved for future detailed view
  const [showDetails, setShowDetails] = useState(false);
  // F007: Local confirmation state tracking
  const [confirmedItems, setConfirmedItems] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!featureCard) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
        <div style={{ fontSize: "18px", color: "var(--color-text-secondary)" }}>
          输入功能描述开始创建
        </div>
      </div>
    );
  }

  const status = statusConfig[featureCard.status];
  const risk = riskConfig[featureCard.riskLevel];
  const pendingConfirmations = confirmationActions?.filter(c => !c.confirmed && c.required).length || 0;

  // F007: Determine if we show the confirmation panel
  const showConfirmationPanel = governanceRelease?.requiredConfirmations && 
    governanceRelease.requiredConfirmations.length > 0 && 
    !isSubmitted;

  // F007: Calculate canProceed based on confirmed items
  const confirmationResult = getConfirmationResult(governanceRelease, confirmedItems);

  // F007: Handle individual item confirmation
  const handleItemConfirm = (itemId: string) => {
    if (!confirmedItems.includes(itemId)) {
      setConfirmedItems([...confirmedItems, itemId]);
      onConfirm?.(itemId);
    }
  };

  // F007: Handle submit
  const handleSubmitConfirmations = () => {
    setIsSubmitted(true);
    onConfirmationsSubmitted?.();
  };

  return (
    <div className="panel" style={{ position: "relative" }}>
      {/* Header with Category and Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        {featureCard.categoryLabel && (
          <span
            style={{
              padding: "4px 12px",
              backgroundColor: "var(--color-accent)",
              color: "white",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            {featureCard.categoryLabel}
          </span>
        )}
        <span
          style={{
            padding: "4px 12px",
            backgroundColor: status.bg,
            color: status.color,
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          {status.label}
        </span>
        <span
          style={{
            padding: "4px 12px",
            backgroundColor: "var(--color-bg-tertiary)",
            color: risk.color,
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
          }}
        >
          {risk.label}
        </span>
      </div>

      {/* Main Title */}
      <h2
        style={{
          fontSize: "28px",
          fontWeight: 600,
          margin: "0 0 12px 0",
          color: "var(--color-text-primary)",
        }}
      >
        {featureCard.displayLabel}
      </h2>

      {/* Summary */}
      <p
        style={{
          fontSize: "15px",
          color: "var(--color-text-secondary)",
          margin: "0 0 20px 0",
          lineHeight: 1.6,
        }}
      >
        {featureCard.summary}
      </p>

      {/* Affected Areas - Beginner Friendly */}
      {featureCard.affectedAreas && featureCard.affectedAreas.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            影响范围
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {featureCard.affectedAreas.map((area, idx) => (
              <span
                key={idx}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next Action - Prominent */}
      {featureCard.nextAction && (
        <div
          style={{
            padding: "16px",
            backgroundColor: featureCard.status === "blocked"
              ? "rgba(248, 81, 73, 0.1)"
              : "rgba(63, 185, 80, 0.1)",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${featureCard.status === "blocked"
              ? "rgba(248, 81, 73, 0.3)"
              : "rgba(63, 185, 80, 0.3)"}`,
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              marginBottom: "4px",
            }}
          >
            下一步
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 500,
              color: featureCard.status === "blocked"
                ? "#f85149"
                : "#3fb950",
            }}
          >
            {featureCard.nextAction}
          </div>
          {pendingConfirmations > 0 && (
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
              还有 {pendingConfirmations} 项需要确认
            </div>
          )}
        </div>
      )}

      {/* F007: Confirmation Panel - Interactive confirmation for governance blocked state */}
      {showConfirmationPanel && (
        <ConfirmationPanel
          governanceRelease={governanceRelease}
          onConfirm={handleItemConfirm}
          onSubmitConfirmations={handleSubmitConfirmations}
        />
      )}

      {/* F007-R2: Post-confirmation result display */}
      {isSubmitted && governanceRelease?.requiredConfirmations && governanceRelease.requiredConfirmations.length > 0 && (
        <div
          style={{
            padding: "16px",
            backgroundColor: confirmationResult.canProceed 
              ? "rgba(63, 185, 80, 0.1)" 
              : "rgba(248, 81, 73, 0.1)",
            borderRadius: "var(--radius-md)",
            marginBottom: "16px",
            border: `1px solid ${confirmationResult.canProceed 
              ? "rgba(63, 185, 80, 0.3)" 
              : "rgba(248, 81, 73, 0.3)"}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "16px" }}>
              {confirmationResult.canProceed ? "✅" : "⏳"}
            </span>
            <span style={{ fontWeight: 600, color: confirmationResult.canProceed ? "#3fb950" : "#f0883e" }}>
              {confirmationResult.transitionResult === "released_to_ready" 
                ? "已确认完成" 
                : "部分确认，待处理"}
            </span>
            {/* F009: Source context badge in confirmation result */}
            {sourceMode && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: sourceMode === "local-bridge"
                    ? "rgba(34, 197, 94, 0.2)"
                    : sourceMode === "local-backend"
                    ? "rgba(59, 130, 246, 0.2)"
                    : sourceMode === "shared-fixture"
                    ? "rgba(168, 85, 247, 0.2)"
                    : "rgba(107, 114, 128, 0.2)",
                  color: sourceMode === "local-bridge"
                    ? "rgb(21, 128, 61)"
                    : sourceMode === "local-backend"
                    ? "rgb(29, 78, 216)"
                    : sourceMode === "shared-fixture"
                    ? "rgb(126, 34, 206)"
                    : "rgb(75, 85, 99)",
                  marginLeft: "auto",
                  fontWeight: 500,
                }}
              >
                {sourceMode === "local-bridge" && "🌉 Bridge"}
                {sourceMode === "local-backend" && "💾 Local"}
                {sourceMode === "shared-fixture" && "📦 Shared"}
                {sourceMode === "mock" && "🔧 Mock"}
              </span>
            )}
          </div>
          {/* F009: Fallback warning in confirmation result */}
          {isFallback && (
            <div
              style={{
                fontSize: "11px",
                padding: "6px 10px",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderRadius: "var(--radius-sm)",
                color: "rgb(180, 83, 9)",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>⚠️</span>
              <span>
                当前为 fallback 数据
                {fallbackChain && fallbackChain.length > 0 && (
                  <span style={{ opacity: 0.8 }}> ({fallbackChain.join(" → ")})</span>
                )}
              </span>
            </div>
          )}
          
          {confirmationResult.canProceed ? (
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
              <p style={{ margin: "0 0 8px 0" }}>所有确认项已完成，功能已准备好进入下一阶段</p>
              <button
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--color-accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                继续下一步 →
              </button>
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
              <p style={{ margin: "0 0 12px 0" }}>
                已确认 {governanceRelease.requiredConfirmations.length - confirmationResult.remainingCount} 项，还有 {confirmationResult.remainingCount} 项待确认
              </p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--color-bg-tertiary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
              >
                ← 返回继续确认
              </button>
            </div>
          )}
        </div>
      )}

      {/* Governance Blockers */}
      {!showConfirmationPanel && governanceRelease?.blockedReason && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(248, 81, 73, 0.1)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "16px",
          }}
        >
          <span style={{ color: "#f85149", fontSize: "13px" }}>
            ⚠️ {governanceRelease.blockedReason}
          </span>
        </div>
      )}

      {/* Toggle Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {showDetails ? "收起详情 ▲" : "查看详情 ▼"}
      </button>

      {/* Collapsible Details Section */}
      {showDetails && featureDetail && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {/* Intent Summary */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                marginBottom: "4px",
              }}
            >
              意图理解
            </div>
            <div style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
              {featureDetail.basicInfo.intentSummary}
            </div>
          </div>

          {/* Known Inputs */}
          {Object.keys(featureDetail.editableParams.knownInputs).length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  marginBottom: "8px",
                }}
              >
                已知参数
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(featureDetail.editableParams.knownInputs).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      backgroundColor: "var(--color-bg-tertiary)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ color: "var(--color-text-muted)" }}>{key}</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pattern Bindings - Collapsed by default in details */}
          {featureDetail.patternBindings.patterns.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  marginBottom: "8px",
                }}
              >
                使用的模式
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {featureDetail.patternBindings.patterns.map((pattern, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "rgba(88, 166, 255, 0.15)",
                      color: "#58a6ff",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

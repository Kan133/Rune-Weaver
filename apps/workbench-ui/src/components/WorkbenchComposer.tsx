// Workbench Composer - F002
// Conversation flow panel that drives feature lifecycle
// NOT a chat-first UI - this is a workflow control console

import { useState } from "react";
import type {
  ComposerFlow,
  ComposerMessage,
  ComposerSuggestedAction,
} from "../types/composer";

interface WorkbenchComposerProps {
  flow: ComposerFlow;
  onSendMessage?: (content: string) => void;
  onActionClick?: (action: ComposerSuggestedAction) => void;
}

const messageTypeLabels: Record<ComposerMessage["type"], string> = {
  user_request: "请求",
  system_clarification: "澄清",
  governance_prompt: "治理",
  next_step_hint: "下一步",
  action_submission: "动作",
  feature_update: "功能更新",
  confirmation_response: "确认",
};

const messageTypeStyles: Record<ComposerMessage["type"], { bg: string; border: string; icon: string }> = {
  user_request: {
    bg: "var(--color-bg-tertiary)",
    border: "var(--color-border)",
    icon: "👤",
  },
  system_clarification: {
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    icon: "💡",
  },
  governance_prompt: {
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.3)",
    icon: "⚠️",
  },
  next_step_hint: {
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.3)",
    icon: "👉",
  },
  action_submission: {
    bg: "var(--color-bg-tertiary)",
    border: "var(--color-border)",
    icon: "⚡",
  },
  feature_update: {
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.3)",
    icon: "📦",
  },
  confirmation_response: {
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.3)",
    icon: "✅",
  },
};

const stageLabels: Record<ComposerFlow["currentStage"], string> = {
  initial: "初始",
  clarifying: "澄清中",
  routing: "路由中",
  reviewing: "评审中",
  confirming: "确认中",
  planning: "规划中",
  generating: "生成中",
  writing: "写入中",
  complete: "完成",
  error: "错误",
};

export function WorkbenchComposer({
  flow,
  onSendMessage,
  onActionClick,
}: WorkbenchComposerProps) {
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage?.(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="panel"
      style={{
        position: "sticky",
        bottom: "20px",
        marginTop: "16px",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Header */}
      <div
        className="panel-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🎮</span>
          <span>Workbench Composer</span>
          <span
            className="badge"
            style={{
              backgroundColor:
                flow.currentStage === "confirming"
                  ? "rgba(245, 158, 11, 0.2)"
                  : flow.currentStage === "reviewing"
                  ? "rgba(59, 130, 246, 0.2)"
                  : "var(--color-bg-tertiary)",
              color:
                flow.currentStage === "confirming"
                  ? "rgb(245, 158, 11)"
                  : flow.currentStage === "reviewing"
                  ? "rgb(59, 130, 246)"
                  : "var(--color-text-secondary)",
            }}
          >
            {stageLabels[flow.currentStage]}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          {isExpanded ? "收起 ▼" : "展开 ▲"}
        </span>
      </div>

      {isExpanded && (
        <>
          {/* Messages */}
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              marginBottom: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {flow.messages.map((message) => {
              const styles = messageTypeStyles[message.type];
              return (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    gap: "8px",
                    padding: "10px 12px",
                    backgroundColor: styles.bg,
                    border: `1px solid ${styles.border}`,
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{styles.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                        marginBottom: "2px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {messageTypeLabels[message.type]}
                    </div>
                    <div style={{ color: "var(--color-text-primary)" }}>
                      {message.content}
                    </div>
                    {message.metadata?.suggestedInputs && (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginTop: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {message.metadata.suggestedInputs.map((input, idx) => (
                          <button
                            key={idx}
                            onClick={() => setInputValue(input)}
                            style={{
                              padding: "4px 10px",
                              fontSize: "11px",
                              backgroundColor: "var(--color-bg-secondary)",
                              border: "1px solid var(--color-border)",
                              borderRadius: "var(--radius-sm)",
                              color: "var(--color-text-secondary)",
                              cursor: "pointer",
                            }}
                          >
                            {input}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          {flow.suggestedActions.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              {flow.suggestedActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onActionClick?.(action)}
                  disabled={!action.enabled}
                  className={`btn ${action.primary ? "btn-primary" : ""}`}
                  style={{
                    fontSize: "12px",
                    padding: "8px 16px",
                    opacity: action.enabled ? 1 : 0.5,
                    backgroundColor: action.danger
                      ? "rgba(239, 68, 68, 0.2)"
                      : action.primary
                      ? undefined
                      : "var(--color-bg-tertiary)",
                    color: action.danger
                      ? "rgb(239, 68, 68)"
                      : action.primary
                      ? undefined
                      : "var(--color-text-secondary)",
                    borderColor: action.danger
                      ? "rgba(239, 68, 68, 0.3)"
                      : undefined,
                  }}
                >
                  {action.label}
                  {action.description && (
                    <span
                      style={{
                        display: "block",
                        fontSize: "10px",
                        opacity: 0.7,
                        marginTop: "2px",
                        fontWeight: 400,
                      }}
                    >
                      {action.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={flow.inputPlaceholder || "输入消息..."}
              disabled={!flow.isAwaitingInput}
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
            <button
              onClick={handleSend}
              disabled={!flow.isAwaitingInput || !inputValue.trim()}
              className="btn btn-primary"
              style={{
                padding: "10px 20px",
                opacity: flow.isAwaitingInput && inputValue.trim() ? 1 : 0.5,
              }}
            >
              发送
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// F003: Workflow Console - Replaces message-heavy composer
// Shows current stage, system prompt, recommended actions, and input
// NOT a chat feed - more like a workflow control panel

import { useState, useRef, useEffect } from "react";
import type { WorkbenchState } from "../types/workbench";

interface WorkflowConsoleProps {
  state?: WorkbenchState;
  onSubmit: (message: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  variant: "primary" | "secondary" | "danger";
}

export function WorkflowConsole({ state, onSubmit }: WorkflowConsoleProps) {
  const [input, setInput] = useState("");
  const [recentHistory, setRecentHistory] = useState<Array<{ type: "user" | "system"; text: string; timestamp: number }>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    // Add to recent history (keep only last 3)
    setRecentHistory(prev => [
      ...prev.slice(-2),
      { type: "user", text: input.trim(), timestamp: Date.now() }
    ]);
    
    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Generate quick actions based on current state
  const getQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];
    
    if (!state?.featureCard) {
      return [
        { id: "create_ability", label: "创建技能", icon: "⚡", variant: "primary" },
        { id: "create_ui", label: "创建UI", icon: "🎨", variant: "secondary" },
        { id: "create_rule", label: "创建规则", icon: "📋", variant: "secondary" },
      ];
    }

    const status = state.featureCard.status;
    const governance = state.governanceRelease;

    if (status === "blocked" && governance?.blockedReason) {
      actions.push({ id: "resolve", label: "解决冲突", icon: "🔧", variant: "primary" });
      actions.push({ id: "cancel", label: "取消", icon: "❌", variant: "danger" });
    } else if (status === "ready") {
      if (state.lifecycleActions?.persistenceState === "new") {
        actions.push({ id: "generate", label: "生成代码", icon: "🚀", variant: "primary" });
      } else {
        actions.push({ id: "apply", label: "应用更新", icon: "✓", variant: "primary" });
      }
      actions.push({ id: "modify", label: "修改参数", icon: "✏️", variant: "secondary" });
    } else if (status === "needs_clarification") {
      actions.push({ id: "clarify", label: "提供更多信息", icon: "💬", variant: "primary" });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  // Get current stage context for display
  const getStageContext = () => {
    if (!state?.featureCard) {
      return {
        stage: "开始",
        prompt: '描述你想要创建的功能，例如：做一个按Q键的冲刺技能向前冲刺400距离',
        hint: "支持自然语言描述",
      };
    }

    const { status, nextAction } = state.featureCard;
    
    if (status === "blocked") {
      return {
        stage: "需要解决",
        prompt: state.governanceRelease?.releaseHint || "存在需要解决的问题",
        hint: nextAction || "请查看上方的冲突详情",
      };
    }

    if (status === "ready") {
      return {
        stage: state.lifecycleActions?.persistenceState === "new" ? "准备创建" : "准备更新",
        prompt: nextAction || "功能已准备好",
        hint: "确认信息无误后可以继续",
      };
    }

    if (status === "needs_clarification") {
      return {
        stage: "需要澄清",
        prompt: "需要更多信息来理解你的意图",
        hint: "请提供更多细节",
      };
    }

    return {
      stage: "编辑中",
      prompt: "正在处理你的请求",
      hint: "",
    };
  };

  const stageContext = getStageContext();

  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-secondary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Current Stage Header */}
      <div
        style={{
          padding: "12px 20px",
          backgroundColor: "var(--color-bg-tertiary)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span
          style={{
            padding: "4px 10px",
            backgroundColor: "var(--color-accent)",
            color: "white",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          {stageContext.stage}
        </span>
        <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          {stageContext.hint}
        </span>
      </div>

      {/* System Prompt */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: state?.featureCard?.status === "blocked" 
            ? "rgba(248, 81, 73, 0.05)" 
            : "transparent",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            color: "var(--color-text-primary)",
            lineHeight: 1.6,
          }}
        >
          {stageContext.prompt}
        </div>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div
          style={{
            padding: "0 20px 12px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                setInput(action.label);
                // Optional: auto-submit for quick actions
                // handleSubmit();
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor:
                  action.variant === "primary"
                    ? "var(--color-accent)"
                    : action.variant === "danger"
                    ? "rgba(248, 81, 73, 0.15)"
                    : "var(--color-bg-tertiary)",
                color:
                  action.variant === "primary"
                    ? "white"
                    : action.variant === "danger"
                    ? "#f85149"
                    : "var(--color-text-secondary)",
              }}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Minimal Recent History (max 2 items) */}
      {recentHistory.length > 0 && (
        <div
          style={{
            padding: "0 20px 12px",
            maxHeight: "80px",
            overflow: "hidden",
          }}
        >
          {recentHistory.map((item, idx) => (
            <div
              key={idx}
              style={{
                fontSize: "13px",
                color: "var(--color-text-muted)",
                padding: "4px 0",
                opacity: idx === recentHistory.length - 1 ? 1 : 0.5,
              }}
            >
              {item.type === "user" ? "→" : "←"} {item.text}
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          padding: "12px 20px 20px",
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            flex: 1,
            position: "relative",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入指令或描述..."
            style={{
              width: "100%",
              minHeight: "44px",
              maxHeight: "120px",
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              lineHeight: 1.5,
              resize: "none",
              outline: "none",
            }}
            rows={1}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          style={{
            padding: "12px 20px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: input.trim() ? "var(--color-accent)" : "var(--color-bg-tertiary)",
            color: input.trim() ? "white" : "var(--color-text-muted)",
            fontSize: "14px",
            fontWeight: 500,
            cursor: input.trim() ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>➤</span>
          <span>发送</span>
        </button>
      </div>
    </div>
  );
}

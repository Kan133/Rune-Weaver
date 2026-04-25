import { AlertCircle } from "lucide-react";

import type { WorkspaceRefreshHint } from "../../data/workspaceRefreshHint";
import { cn } from "../../lib/utils";

interface WorkspaceRefreshAdvisoryProps {
  hint: WorkspaceRefreshHint;
  variant?: "full" | "compact";
  className?: string;
}

export function WorkspaceRefreshAdvisory({
  hint,
  variant = "full",
  className,
}: WorkspaceRefreshAdvisoryProps) {
  if (variant === "compact") {
    return (
      <span
        className={cn("inline-flex max-w-[420px] items-center gap-1.5 truncate text-xs text-amber-300", className)}
        title={hint.command || hint.summary}
        data-testid="workspace-refresh-advisory-compact"
      >
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{hint.summary}</span>
      </span>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2", className)}
      data-testid="workspace-refresh-advisory-full"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
        <AlertCircle className="h-3 w-3" />
        <span>Workspace Source Advisory</span>
      </div>
      <p className="mt-1 text-[10px] text-amber-200">{hint.summary}</p>
      {hint.command && (
        <code className="mt-1 block break-all text-[10px] text-white/60">{hint.command}</code>
      )}
    </div>
  );
}

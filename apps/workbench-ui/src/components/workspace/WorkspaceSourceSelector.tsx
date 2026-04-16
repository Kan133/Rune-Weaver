// F010: Workspace Source Selector
// Provides visible UI for switching workspace data sources
// Shows current source, allows switching, displays light status feedback

import { Database, AlertCircle, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureStore } from "@/hooks/useFeatureStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceSourceConfig } from "@/data/workspaceSource";

export function WorkspaceSourceSelector() {
  const workspaceSource = useFeatureStore((state) => state.workspaceSource);
  const workspaceIssues = useFeatureStore((state) => state.workspaceIssues);
  const availableSources = useFeatureStore((state) => state.availableSources);
  const switchSource = useFeatureStore((state) => state.switchWorkspaceSource);
  const reloadSource = useFeatureStore((state) => state.reloadCurrentSource);

  const hasIssues = workspaceIssues.length > 0;

  const handleSwitchSource = async (source: WorkspaceSourceConfig) => {
    if (source.path === workspaceSource?.path) return;
    await switchSource(source);
  };

  return (
    <div className="p-3 border-b border-white/10 bg-[#1a1a1a]">
      {/* Current Source Display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40">
          Workspace Source
        </span>
        {hasIssues && (
          <div className="flex items-center gap-1 text-amber-400" title={workspaceIssues.join("; ")}>
            <AlertCircle className="h-3 w-3" />
            <span className="text-[10px]">注意</span>
          </div>
        )}
      </div>

      {/* Source Selector Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg",
              "bg-[#252525] border border-white/10",
              "hover:border-white/20 hover:bg-[#2a2a2a]",
              "transition-colors group"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Database className="h-4 w-4 text-[#6366f1] flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm text-white font-medium truncate">
                  {workspaceSource?.label || "选择 Debug Source"}
                </span>
                {workspaceSource?.description && (
                  <span className="text-[10px] text-white/40 truncate">
                    {workspaceSource.description}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0 group-hover:text-white/60" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-64 bg-[#1e1e1e] border-white/10"
        >
          {availableSources.map((source, index) => (
            <div key={source.path}>
              {index > 0 && <DropdownMenuSeparator className="bg-white/10" />}
              <DropdownMenuItem
                onClick={() => handleSwitchSource(source)}
                className={cn(
                  "flex flex-col items-start py-2.5 px-3 cursor-pointer",
                  "hover:bg-white/5 focus:bg-white/5",
                  workspaceSource?.path === source.path && "bg-[#6366f1]/10"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className={cn(
                      "text-sm",
                      workspaceSource?.path === source.path
                        ? "text-white"
                        : "text-white/70"
                    )}
                  >
                    {source.label}
                  </span>
                  {workspaceSource?.path === source.path && (
                    <span className="ml-auto text-[10px] text-[#6366f1]">当前</span>
                  )}
                </div>
                {source.description && (
                  <span className="text-[11px] text-white/40 mt-0.5">
                    {source.description}
                  </span>
                )}
              </DropdownMenuItem>
            </div>
          ))}

          <DropdownMenuSeparator className="bg-white/10" />

          {/* Reload Action */}
          <DropdownMenuItem
            onClick={reloadSource}
            className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-white/5 focus:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-white/50" />
            <span className="text-sm text-white/70">刷新当前 Source</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Light Status Indicator */}
      {workspaceSource && (
        <div className="mt-2 flex items-center gap-2">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              hasIssues ? "bg-amber-400" : "bg-emerald-400"
            )}
          />
          <span className="text-[10px] text-white/40">
            {hasIssues
              ? workspaceIssues[0]
              : `${workspaceSource.type === "sample" ? "示例" : workspaceSource.type === "bridge" ? "桥接" : "自定义"}数据已加载`}
          </span>
        </div>
      )}
    </div>
  );
}

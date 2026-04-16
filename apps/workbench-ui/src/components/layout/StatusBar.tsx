import { CheckCircle2, Circle } from 'lucide-react';
import { useFeatureStore } from '@/hooks/useFeatureStore';

export function StatusBar() {
  const features = useFeatureStore((state) => state.features);
  const selectedFeatureId = useFeatureStore((state) => state.selectedFeatureId);
  const connectedHostRoot = useFeatureStore((state) => state.connectedHostRoot);
  const isWorkspaceConnected = useFeatureStore((state) => state.isWorkspaceConnected);
  const workspace = useFeatureStore((state) => state.workspace);
  const workspaceIssues = useFeatureStore((state) => state.workspaceIssues);

  const activeCount = features.filter((f) => f.status === 'active').length;
  const draftCount = features.filter((f) => f.status === 'draft').length;
  const errorCount = features.filter((f) => f.status === 'error').length;

  return (
    <footer className="h-7 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-[#22c55e]" />
          <span className="text-xs text-white/50">{activeCount} 活跃</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="h-3 w-3 text-[#f59e0b]" />
          <span className="text-xs text-white/50">{draftCount} 草稿</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
            <span className="text-xs text-[#ef4444]">{errorCount} 错误</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-white/40">
          {connectedHostRoot
            ? `宿主: ${workspace?.addonName || connectedHostRoot}`
            : '宿主: 未连接'}
        </span>
        {selectedFeatureId && (
          <span className="text-xs text-white/40">
            已选择: {features.find((f) => f.id === selectedFeatureId)?.displayName}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              connectedHostRoot && isWorkspaceConnected
                ? 'bg-[#22c55e] animate-pulse'
                : connectedHostRoot
                ? 'bg-[#f59e0b]'
                : 'bg-white/30'
            }`}
          />
          <span className="text-xs text-white/50">
            {connectedHostRoot
              ? isWorkspaceConnected
                ? `已连接 workspace${workspaceIssues.length > 0 ? ` · ${workspaceIssues[0]}` : ''}`
                : `宿主已连接，未发现 workspace${workspaceIssues[0] ? ` · ${workspaceIssues[0]}` : ''}`
              : '等待连接宿主'}
          </span>
        </div>
      </div>
    </footer>
  );
}

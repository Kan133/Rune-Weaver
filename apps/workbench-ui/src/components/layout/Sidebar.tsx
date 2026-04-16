import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { FeatureTree } from '@/components/feature/FeatureTree';
import { WorkspaceSourceSelector } from '@/components/workspace/WorkspaceSourceSelector';
import { ProjectSetupPanel } from '@/components/project-setup/ProjectSetupPanel';

export function Sidebar() {
  const features = useFeatureStore((state) => state.features);
  const connectedHostRoot = useFeatureStore((state) => state.connectedHostRoot);
  const isWorkspaceConnected = useFeatureStore((state) => state.isWorkspaceConnected);
  const rootFeatures = features.filter((f) => f.parentId === null);
  const showDebugSources =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debugSources');

  return (
    <div className="w-80 min-w-[320px] bg-[#1a1a1a] border-r border-white/10 flex flex-col flex-shrink-0 min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col">
          {showDebugSources && <WorkspaceSourceSelector />}

          {/* Project Setup Panel */}
          <ProjectSetupPanel />

          {/* Feature Tree */}
          <div className="p-3">
            <div className="px-2 mb-2">
              <p className="text-[11px] uppercase tracking-wider text-white/30">
                Feature Tree
              </p>
              <p className="text-[12px] text-white/40 mt-1">
                {connectedHostRoot
                  ? isWorkspaceConnected
                    ? '当前连接宿主的真实 workspace 结构'
                    : '宿主已连接，但还没有可展示的 workspace'
                  : '连接宿主后，这里会显示真实 feature 目录'}
              </p>
            </div>
            {rootFeatures.length > 0 ? (
              <FeatureTree features={rootFeatures} />
            ) : (
              <div className="rounded border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-[12px] text-white/35">
                {connectedHostRoot
                  ? isWorkspaceConnected
                    ? '当前 workspace 里还没有 feature。'
                    : '请先 init 或重新连接已初始化的宿主。'
                  : '尚未连接宿主。'}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

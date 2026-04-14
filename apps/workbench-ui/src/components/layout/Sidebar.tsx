import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { FeatureTree } from '@/components/feature/FeatureTree';
import { WorkspaceSourceSelector } from '@/components/workspace/WorkspaceSourceSelector';
import { ProjectSetupPanel } from '@/components/project-setup/ProjectSetupPanel';

export function Sidebar() {
  const features = useFeatureStore((state) => state.features);
  const rootFeatures = features.filter((f) => f.parentId === null);

  return (
    <div className="w-80 min-w-[320px] bg-[#1a1a1a] border-r border-white/10 flex flex-col flex-shrink-0 min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col">
          {/* Workspace Source Selector */}
          <WorkspaceSourceSelector />

          {/* Project Setup Panel */}
          <ProjectSetupPanel />

          {/* Feature Tree */}
          <div className="p-3">
            <div className="px-2 mb-2">
              <p className="text-[11px] uppercase tracking-wider text-white/30">
                Feature Tree
              </p>
              <p className="text-[12px] text-white/40 mt-1">
                当前工作台的结构视图
              </p>
            </div>
            <FeatureTree features={rootFeatures} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

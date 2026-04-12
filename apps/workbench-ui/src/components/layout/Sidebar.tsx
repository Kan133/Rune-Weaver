import { Layers, Zap, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { FeatureTree } from '@/components/feature/FeatureTree';
import { WorkspaceSourceSelector } from '@/components/workspace/WorkspaceSourceSelector';

const iconMap: Record<string, React.ReactNode> = {
  Layers: <Layers className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  User: <User className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
};

export function Sidebar() {
  const groups = useFeatureStore((state) => state.groups);
  const selectedGroupId = useFeatureStore((state) => state.selectedGroupId);
  const selectGroup = useFeatureStore((state) => state.selectGroup);
  const rootFeatures = useFeatureStore((state) => state.getRootFeatures());

  return (
    <div className="w-64 bg-[#1a1a1a] border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Workspace Source Selector */}
      <WorkspaceSourceSelector />

      {/* Groups */}
      <div className="p-3 border-b border-white/5">
        <div className="space-y-1">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => selectGroup(group.id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                selectedGroupId === group.id
                  ? 'bg-[#6366f1]/20 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  'transition-colors',
                  selectedGroupId === group.id ? 'text-[#818cf8]' : 'text-white/40'
                )}>
                  {iconMap[group.icon]}
                </span>
                <span>{group.name}</span>
              </div>
              <span className={cn(
                'text-xs',
                selectedGroupId === group.id ? 'text-[#818cf8]' : 'text-white/30'
              )}>
                {group.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Tree */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 px-2">
            Feature Tree
          </p>
          <FeatureTree features={rootFeatures} />
        </div>
      </ScrollArea>
    </div>
  );
}

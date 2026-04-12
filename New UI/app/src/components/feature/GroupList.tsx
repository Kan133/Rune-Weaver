import { Layers, Zap, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import type { Group } from '@/types/feature';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Layers,
  Zap,
  User,
  Settings,
};

interface GroupItemProps {
  group: Group;
  isSelected: boolean;
  onClick: () => void;
}

function GroupItem({ group, isSelected, onClick }: GroupItemProps) {
  const Icon = iconMap[group.icon] || Layers;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150',
        'hover:bg-[#252525]',
        isSelected && 'bg-[#252525] relative'
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#6366f1] rounded-r" />
      )}
      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          isSelected ? 'text-[#818cf8]' : 'text-white/50'
        )}
      />
      <span
        className={cn(
          'flex-1 text-sm',
          isSelected ? 'text-white font-medium' : 'text-white/70'
        )}
      >
        {group.name}
      </span>
      <span
        className={cn(
          'text-xs px-1.5 py-0.5 rounded-full',
          isSelected
            ? 'bg-[#6366f1]/20 text-[#818cf8]'
            : 'bg-white/5 text-white/40'
        )}
      >
        {group.count}
      </span>
    </button>
  );
}

export function GroupList() {
  const groups = useFeatureStore((state) => state.groups);
  const selectedGroupId = useFeatureStore((state) => state.selectedGroupId);
  const selectGroup = useFeatureStore((state) => state.selectGroup);

  return (
    <div className="px-2">
      <h3 className="px-3 py-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">
        Groups
      </h3>
      <div className="space-y-0.5">
        {groups.map((group) => (
          <GroupItem
            key={group.id}
            group={group}
            isSelected={selectedGroupId === group.id}
            onClick={() => selectGroup(group.id)}
          />
        ))}
      </div>
    </div>
  );
}

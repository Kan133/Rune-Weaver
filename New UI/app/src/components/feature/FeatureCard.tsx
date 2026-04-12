import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/feature';
import { StatusDot } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface FeatureCardProps {
  feature: Feature;
  isSelected: boolean;
  onClick: () => void;
}

export function FeatureCard({ feature, isSelected, onClick }: FeatureCardProps) {
  const groupNames: Record<string, string> = {
    skill: '技能',
    hero: '英雄',
    system: '系统',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl cursor-pointer transition-all duration-200',
        'bg-[#252525] border border-white/5',
        'hover:bg-[#2a2a2a] hover:border-white/10',
        isSelected && 'bg-[#2a2a2a] border-[#6366f1]'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={feature.status} />
          <h4 className="text-sm font-medium text-white truncate">
            {feature.displayName}
          </h4>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <MoreHorizontal className="h-4 w-4 text-white/40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-[#1e1e1e] border-white/10">
            <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/5 text-xs">
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/5 text-xs">
              复制 ID
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/70 hover:text-white focus:bg-white/5 text-xs">
              重建
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-red-400 hover:text-red-300 focus:bg-red-500/10 text-xs">
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* System ID */}
      <p className="mt-1 text-xs font-mono text-white/40 truncate">
        #{feature.systemId}
      </p>

      {/* Tags */}
      <div className="mt-3 flex items-center gap-2">
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/50 border-0"
        >
          {groupNames[feature.group] || feature.group}
        </Badge>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/50 border-0 font-mono"
        >
          v{feature.revision}
        </Badge>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-white/30">
          更新于 {formatDistanceToNow(feature.updatedAt, { locale: zhCN, addSuffix: true })}
        </span>
        {feature.childrenIds.length > 0 && (
          <span className="text-[10px] text-white/30">
            {feature.childrenIds.length} 个子项
          </span>
        )}
      </div>
    </div>
  );
}

import { FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Feature } from '@/types/feature';
import { normalizeFeatureDisplay } from '@/lib/normalizeFeatureDisplay';

interface FeatureCardProps {
  feature: Feature;
  isSelected: boolean;
  onClick: () => void;
}

export function FeatureCard({ feature, isSelected, onClick }: FeatureCardProps) {
  const normalizedFeature = normalizeFeatureDisplay(feature);

  if (!normalizedFeature) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all duration-150',
        isSelected
          ? 'bg-[#6366f1]/10 border-[#6366f1]/30'
          : 'bg-[#252525] border-white/5 hover:border-white/10 hover:bg-[#2a2a2a]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2
            className={cn(
              'h-4 w-4 flex-shrink-0',
              isSelected ? 'text-[#818cf8]' : 'text-white/30'
            )}
          />
          <span className={cn(
            'text-sm font-medium truncate',
            isSelected ? 'text-white' : 'text-white/80'
          )}>
            {normalizedFeature.displayName}
          </span>
        </div>
        <StatusBadge status={normalizedFeature.status} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
        <span className="font-mono">#{normalizedFeature.systemId}</span>
        <span>·</span>
        <span>v{normalizedFeature.revision}</span>
        {normalizedFeature.childrenIds.length > 0 && (
          <>
            <span>·</span>
            <span>{normalizedFeature.childrenIds.length} 个子项</span>
          </>
        )}
      </div>
    </button>
  );
}

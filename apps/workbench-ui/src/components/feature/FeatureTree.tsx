import { ChevronRight, ChevronDown, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import type { Feature } from '@/types/feature';

interface FeatureTreeProps {
  features: Feature[];
  level?: number;
}

export function FeatureTree({ features, level = 0 }: FeatureTreeProps) {
  const selectedFeatureId = useFeatureStore((state) => state.selectedFeatureId);
  const selectFeature = useFeatureStore((state) => state.selectFeature);
  const expandedNodes = useFeatureStore((state) => state.expandedNodes);
  const toggleNode = useFeatureStore((state) => state.toggleNode);
  const allFeatures = useFeatureStore((state) => state.features);

  if (features.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {features.map((feature) => {
        const isExpanded = expandedNodes.has(feature.id);
        const hasChildren = feature.childrenIds.length > 0;
        const children = allFeatures.filter((f) => feature.childrenIds.includes(f.id));

        return (
          <div key={feature.id}>
            <button
              onClick={() => selectFeature(feature.id)}
              className={cn(
                'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                selectedFeatureId === feature.id
                  ? 'bg-[#6366f1]/20 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
              style={{ paddingLeft: `${8 + level * 16}px` }}
            >
              {hasChildren ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(feature.id);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-white/40" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                  )}
                </span>
              ) : (
                <span className="w-5" />
              )}
              <FileCode2
                className={cn(
                  'h-3.5 w-3.5',
                  selectedFeatureId === feature.id ? 'text-[#818cf8]' : 'text-white/30'
                )}
              />
              <span className="truncate">{feature.displayName}</span>
            </button>
            {isExpanded && hasChildren && (
              <FeatureTree features={children} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

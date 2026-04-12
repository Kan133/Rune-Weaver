import { CheckCircle2, Circle } from 'lucide-react';
import { useFeatureStore } from '@/hooks/useFeatureStore';

export function StatusBar() {
  const features = useFeatureStore((state) => state.features);
  const selectedFeatureId = useFeatureStore((state) => state.selectedFeatureId);

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
        {selectedFeatureId && (
          <span className="text-xs text-white/40">
            已选择: {features.find((f) => f.id === selectedFeatureId)?.displayName}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-xs text-white/50">系统就绪</span>
        </div>
      </div>
    </footer>
  );
}

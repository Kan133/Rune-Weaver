import { useFeatureStore } from '@/hooks/useFeatureStore';
import { RefreshCw, Settings2 } from 'lucide-react';

export function StatusBar() {
  const features = useFeatureStore((state) => state.features);
  const groups = useFeatureStore((state) => state.groups);

  const activeCount = features.filter((f) => f.status === 'active').length;
  const errorCount = features.filter((f) => f.status === 'error').length;

  return (
    <footer className="h-7 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span>{features.length} Features</span>
        <span className="text-white/20">|</span>
        <span>{groups.length - 1} Groups</span>
        <span className="text-white/20">|</span>
        <span className="text-green-400">{activeCount} Active</span>
        {errorCount > 0 && (
          <>
            <span className="text-white/20">|</span>
            <span className="text-red-400">{errorCount} Error</span>
          </>
        )}
        <span className="text-white/20">|</span>
        <span>Host: Dota2</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>同步中...</span>
        </div>
        <button className="p-1 rounded hover:bg-white/5 transition-colors">
          <Settings2 className="h-3 w-3 text-white/40" />
        </button>
      </div>
    </footer>
  );
}

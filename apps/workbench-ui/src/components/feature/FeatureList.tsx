import { Search, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { FeatureCard } from './FeatureCard';
import { motion } from 'framer-motion';
import { listVariants, itemVariants } from '@/hooks/useAnimationConfig';

export function FeatureList() {
  const groups = useFeatureStore((state) => state.groups);
  const selectedGroupId = useFeatureStore((state) => state.selectedGroupId);
  const selectedFeatureId = useFeatureStore((state) => state.selectedFeatureId);
  const searchQuery = useFeatureStore((state) => state.searchQuery);
  const selectFeature = useFeatureStore((state) => state.selectFeature);
  const setSearchQuery = useFeatureStore((state) => state.setSearchQuery);
  const getFilteredFeatures = useFeatureStore((state) => state.getFilteredFeatures);
  const startWizard = useFeatureStore((state) => state.startWizard);
  const selectGroup = useFeatureStore((state) => state.selectGroup);

  const filteredFeatures = getFilteredFeatures();
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="w-80 min-w-[320px] max-w-[520px] resize-x overflow-auto bg-[#1e1e1e] border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">
            {selectedGroup?.name || '全部 Features'}
          </h2>
          <Button
            size="sm"
            onClick={startWizard}
            className="h-8 px-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm"
          >
            <Wand2 className="h-3.5 w-3.5 mr-1" />
            Create
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索 features..."
            className="h-9 pl-9 bg-[#252525] border-white/10 text-[15px] text-white placeholder:text-white/40 focus:border-[#6366f1] focus:ring-[#6366f1]/20"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => selectGroup(group.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors',
                selectedGroupId === group.id
                  ? 'border-[#6366f1]/40 bg-[#6366f1]/15 text-white'
                  : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/8 hover:text-white/80'
              )}
            >
              <span>{group.name}</span>
              <span className={cn(
                'text-[11px]',
                selectedGroupId === group.id ? 'text-[#a5b4fc]' : 'text-white/35'
              )}>
                {group.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 p-3">
        {filteredFeatures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-white/30" />
            </div>
            <p className="text-sm text-white/50">未找到 features</p>
            <p className="text-xs text-white/30 mt-1">尝试其他搜索词</p>
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {filteredFeatures.map((feature) => (
              <motion.div key={feature.id} variants={itemVariants}>
                <FeatureCard
                  feature={feature}
                  isSelected={selectedFeatureId === feature.id}
                  onClick={() => selectFeature(feature.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <p className="text-xs text-white/30 text-center">
          当前显示 {filteredFeatures.length} / {groups.find((g) => g.id === selectedGroupId)?.count || 0}
        </p>
        <p className="text-[11px] text-white/20 text-center mt-1">
          可拖动此栏右侧边缘调整宽度
        </p>
      </div>
    </div>
  );
}

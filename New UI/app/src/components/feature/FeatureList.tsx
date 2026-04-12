import { Plus, Search } from 'lucide-react';
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

  const filteredFeatures = getFilteredFeatures();
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="w-80 bg-[#1e1e1e] border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">
            {selectedGroup?.name || '全部 Features'}
          </h2>
          <Button
            size="sm"
            className="h-7 px-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索 features..."
            className="h-8 pl-9 bg-[#252525] border-white/10 text-sm text-white placeholder:text-white/40 focus:border-[#6366f1] focus:ring-[#6366f1]/20"
          />
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
      <div className="px-4 py-2 border-t border-white/5">
        <p className="text-xs text-white/40">
          {filteredFeatures.length} 个 feature
          {searchQuery && ` (筛选自全部)`}
        </p>
      </div>
    </div>
  );
}

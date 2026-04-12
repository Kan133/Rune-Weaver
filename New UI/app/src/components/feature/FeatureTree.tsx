import { useFeatureStore } from '@/hooks/useFeatureStore';

export function FeatureTree() {
  const features = useFeatureStore((state) => state.features);
  const rootFeatures = features.filter((f) => f.parentId === null);

  return (
    <div className="px-2">
      <h3 className="px-3 py-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">
        Feature Tree
      </h3>
      <div className="space-y-0.5">
        {rootFeatures.map((feature) => (
          <div key={feature.id} className="px-3 py-1.5 text-sm text-white/60">
            {feature.displayName}
          </div>
        ))}
      </div>
    </div>
  );
}

import { CheckCircle2, AlertTriangle, Info, FileWarning } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Feature } from '@/types/feature';

interface ReviewSignalsProps {
  feature: Feature;
}

export function ReviewSignals({ feature }: ReviewSignalsProps) {
  const { reviewSignals } = feature;

  return (
    <div className="space-y-4">
      {/* Proposal Status */}
      <div className="bg-[#252525] rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
          <h4 className="text-sm font-medium text-white">Proposal 状态</h4>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">准备度</span>
            <span className="text-white">{reviewSignals.proposalStatus.percentage}%</span>
          </div>
          <Progress
            value={reviewSignals.proposalStatus.percentage}
            className="h-1.5 bg-white/10"
          />
          <p className="text-xs text-white/50">{reviewSignals.proposalStatus.message}</p>
        </div>
      </div>

      {/* Gap Fill Summary */}
      <div className="bg-[#252525] rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-[#3b82f6]" />
          <h4 className="text-sm font-medium text-white">Gap Fill 摘要</h4>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-[#22c55e]">
              {reviewSignals.gapFillSummary.autoFilled}
            </span>
            <span className="text-xs text-white/50">自动填充</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-semibold ${
                reviewSignals.gapFillSummary.needsAttention > 0
                  ? 'text-[#f59e0b]'
                  : 'text-white/30'
              }`}
            >
              {reviewSignals.gapFillSummary.needsAttention}
            </span>
            <span className="text-xs text-white/50">需关注</span>
          </div>
        </div>
      </div>

      {/* Category E Clarification */}
      {reviewSignals.categoryEClarification.count > 0 && (
        <div className="bg-[#252525] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-[#818cf8]" />
            <h4 className="text-sm font-medium text-white">Category E 澄清</h4>
          </div>
          <p className="text-xs text-white/60 mb-2">
            {reviewSignals.categoryEClarification.count} 项已澄清
          </p>
          <div className="space-y-1">
            {reviewSignals.categoryEClarification.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs text-white/50"
              >
                <span className="w-1 h-1 rounded-full bg-[#818cf8]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invalid Pattern IDs */}
      {reviewSignals.invalidPatternIds.length > 0 && (
        <div className="bg-[#252525] rounded-xl p-4 border border-[#ef4444]/20">
          <div className="flex items-center gap-2 mb-3">
            <FileWarning className="h-4 w-4 text-[#ef4444]" />
            <h4 className="text-sm font-medium text-white">无效 Pattern</h4>
          </div>
          <div className="space-y-1">
            {reviewSignals.invalidPatternIds.map((id, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs text-[#ef4444]"
              >
                <span className="w-1 h-1 rounded-full bg-[#ef4444]" />
                {id}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readiness Score */}
      <div className="bg-[#252525] rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle
            className={`h-4 w-4 ${
              reviewSignals.readiness.score >= 80
                ? 'text-[#22c55e]'
                : reviewSignals.readiness.score >= 50
                ? 'text-[#f59e0b]'
                : 'text-[#ef4444]'
            }`}
          />
          <h4 className="text-sm font-medium text-white">就绪评分</h4>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-2xl font-bold ${
              reviewSignals.readiness.score >= 80
                ? 'text-[#22c55e]'
                : reviewSignals.readiness.score >= 50
                ? 'text-[#f59e0b]'
                : 'text-[#ef4444]'
            }`}
          >
            {reviewSignals.readiness.score}
          </span>
          <span className="text-xs text-white/50">/ 100</span>
        </div>
        {reviewSignals.readiness.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {reviewSignals.readiness.warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs text-[#f59e0b]"
              >
                <span className="w-1 h-1 rounded-full bg-[#f59e0b]" />
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

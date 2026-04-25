import { AlertTriangle, CheckCircle2, Info, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Feature } from '@/types/feature';
import { normalizeFeatureDisplay } from '@/lib/normalizeFeatureDisplay';

interface ReviewSignalsProps {
  feature: Feature | null | undefined;
}

function toneClass(tone: 'success' | 'warning' | 'danger' | 'neutral'): string {
  if (tone === 'success') return 'text-[#22c55e]';
  if (tone === 'warning') return 'text-[#f59e0b]';
  if (tone === 'danger') return 'text-[#ef4444]';
  return 'text-white/70';
}

function borderToneClass(tone: 'success' | 'warning' | 'danger' | 'neutral'): string {
  if (tone === 'success') return 'border-[#22c55e]/20';
  if (tone === 'warning') return 'border-[#f59e0b]/20';
  if (tone === 'danger') return 'border-[#ef4444]/20';
  return 'border-white/5';
}

function SectionCard({
  title,
  tone,
  icon,
  summary,
  lines,
}: {
  title: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  icon: ReactNode;
  summary: string;
  lines: string[];
}) {
  return (
    <div className={`rounded-xl border bg-[#252525] p-4 ${borderToneClass(tone)}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={toneClass(tone)}>{icon}</span>
        <h4 className="text-sm font-medium text-white">{title}</h4>
      </div>
      <p className="text-xs leading-5 text-white/70">{summary}</p>
      {lines.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {lines.map((line) => (
            <div key={line} className="flex items-start gap-2 text-xs text-white/55">
              <span className={`mt-1 h-1 w-1 rounded-full ${tone === 'success' ? 'bg-[#22c55e]' : tone === 'warning' ? 'bg-[#f59e0b]' : tone === 'danger' ? 'bg-[#ef4444]' : 'bg-white/30'}`} />
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewSignals({ feature }: ReviewSignalsProps) {
  const normalizedFeature = normalizeFeatureDisplay(feature);

  if (!normalizedFeature) {
    return null;
  }

  const { reviewSignals } = normalizedFeature;
  const isCompatibilityOnly = reviewSignals.compatibilitySource === 'compatibility-only';
  const governanceSourceLabel =
    !isCompatibilityOnly
      ? 'bridge governance read-model'
      : 'compatibility-only warning: legacy fallback payload';
  const lifecycleTone =
    isCompatibilityOnly
      ? 'warning'
      : reviewSignals.lifecycle.commitOutcome === 'blocked'
    || reviewSignals.lifecycle.featureStatus === 'rolled_back'
      ? 'danger'
      : reviewSignals.lifecycle.requiresReview || reviewSignals.lifecycle.commitOutcome === 'exploratory'
        ? 'warning'
        : reviewSignals.lifecycle.featureStatus === 'active'
          ? 'success'
          : 'neutral';
  const reusableTone =
    reviewSignals.reusableGovernance.attentionCount > 0
      ? 'warning'
      : reviewSignals.reusableGovernance.admittedCount > 0
        ? 'success'
        : 'neutral';
  const groundingTone =
    isCompatibilityOnly
      ? 'warning'
      : reviewSignals.grounding.status === 'insufficient'
      ? 'danger'
      : reviewSignals.grounding.status === 'partial'
        ? 'warning'
        : reviewSignals.grounding.status === 'exact' || reviewSignals.grounding.status === 'none_required'
          ? 'success'
          : 'neutral';
  const repairabilityTone =
    isCompatibilityOnly
      ? 'warning'
      : reviewSignals.repairability.status === 'requires_regenerate'
      ? 'danger'
      : reviewSignals.repairability.status === 'review_required'
        || reviewSignals.repairability.status === 'upgrade_workspace_grounding'
        || reviewSignals.repairability.status === 'repair_safe'
        ? 'warning'
        : reviewSignals.repairability.status === 'clean'
          ? 'success'
          : 'neutral';

  const lifecycleLines = [
    `Feature status: ${reviewSignals.lifecycle.featureStatus}`,
    reviewSignals.lifecycle.maturity ? `Maturity: ${reviewSignals.lifecycle.maturity}` : '',
    reviewSignals.lifecycle.implementationStrategy ? `Strategy: ${reviewSignals.lifecycle.implementationStrategy}` : '',
    reviewSignals.lifecycle.commitOutcome ? `Commit outcome: ${reviewSignals.lifecycle.commitOutcome}` : '',
    reviewSignals.lifecycle.canWriteHost !== null ? `Can write host: ${reviewSignals.lifecycle.canWriteHost ? 'yes' : 'no'}` : '',
    reviewSignals.lifecycle.requiresReview ? 'Manual review is still required.' : '',
    ...reviewSignals.lifecycle.reasons.slice(0, 3),
  ].filter(Boolean);

  const reusableLines = [
    `Admitted assets: ${reviewSignals.reusableGovernance.admittedCount}`,
    `Attention assets: ${reviewSignals.reusableGovernance.attentionCount}`,
    ...reviewSignals.reusableGovernance.familyAdmissions.slice(0, 2).map((entry) => `Family ${entry.assetId}: ${entry.status}`),
    ...reviewSignals.reusableGovernance.patternAdmissions.slice(0, 2).map((entry) => `Pattern ${entry.assetId}: ${entry.status}`),
    ...reviewSignals.reusableGovernance.seamAdmissions.slice(0, 2).map((entry) => `Seam ${entry.assetId}: ${entry.status}`),
  ].filter(Boolean);

  const groundingLines = [
    `Review required: ${reviewSignals.grounding.reviewRequired ? 'yes' : 'no'}`,
    `Verified: ${reviewSignals.grounding.verifiedSymbolCount}`,
    `Allowlisted: ${reviewSignals.grounding.allowlistedSymbolCount}`,
    `Weak: ${reviewSignals.grounding.weakSymbolCount}`,
    `Unknown: ${reviewSignals.grounding.unknownSymbolCount}`,
    ...reviewSignals.grounding.warnings.slice(0, 3),
  ];

  const repairabilityLines = [
    `Repairability status: ${reviewSignals.repairability.status}`,
    ...reviewSignals.repairability.reasons.slice(0, 4),
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-[#202020] px-4 py-3 text-[11px] text-white/45">
        Governance source: {governanceSourceLabel}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Lifecycle"
          tone={lifecycleTone}
          icon={<CheckCircle2 className="h-4 w-4" />}
          summary={reviewSignals.lifecycle.summary}
          lines={lifecycleLines}
        />
        <SectionCard
          title="Reusable Governance"
          tone={reusableTone}
          icon={<Info className="h-4 w-4" />}
          summary={reviewSignals.reusableGovernance.summary}
          lines={reusableLines}
        />
        <SectionCard
          title="Grounding"
          tone={groundingTone}
          icon={<AlertTriangle className="h-4 w-4" />}
          summary={reviewSignals.grounding.summary || `Grounding status: ${reviewSignals.grounding.status}`}
          lines={groundingLines}
        />
        <SectionCard
          title="Repairability"
          tone={repairabilityTone}
          icon={<Wrench className="h-4 w-4" />}
          summary={reviewSignals.repairability.summary || 'No repairability summary recorded.'}
          lines={repairabilityLines}
        />
      </div>
    </div>
  );
}

import type { Feature } from '@/types/feature';
import type { RuneWeaverFeatureRecord } from '@/types/workspace';

export type LegacyGovernancePayloadKind =
  | 'bridge-payload-missing-read-model'
  | 'raw-workspace-payload'
  | 'host-status-payload';

const LEGACY_DISPLAY_BOUNDARY_WARNING =
  'Governance read-model is unavailable on this payload; UI is using the compatibility-only legacy display boundary.';

function deriveWorkspaceStatusMessage(status: RuneWeaverFeatureRecord['status']): string | null {
  switch (status) {
    case 'active':
      return 'Feature is active on the persisted workspace record.';
    case 'disabled':
      return 'Feature is disabled on the persisted workspace record.';
    case 'archived':
      return 'Feature is archived on the persisted workspace record.';
    case 'rolled_back':
      return 'Feature is rolled back on the persisted workspace record.';
    default:
      return null;
  }
}

function deriveWorkspaceWarnings(status: RuneWeaverFeatureRecord['status']): string[] {
  switch (status) {
    case 'disabled':
      return ['Feature is currently disabled on the persisted workspace record.'];
    case 'rolled_back':
      return ['Feature is currently rolled back on the persisted workspace record.'];
    default:
      return [];
  }
}

export function buildLegacyGovernanceIssues(kind: LegacyGovernancePayloadKind): string[] {
  switch (kind) {
    case 'bridge-payload-missing-read-model':
      return [
        'Bridge payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ];
    case 'host-status-payload':
      return [
        'Connected host-status payload is missing governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ];
    case 'raw-workspace-payload':
    default:
      return [
        'Raw workspace payload has no governanceReadModel; UI is using the compatibility-only legacy display boundary.',
      ];
  }
}

export function buildLegacyCompatibilityReviewSignals(
  record: RuneWeaverFeatureRecord,
): Feature['reviewSignals'] {
  const statusWarnings = deriveWorkspaceWarnings(record.status);
  const readinessWarnings = [LEGACY_DISPLAY_BOUNDARY_WARNING, ...statusWarnings];

  return {
    lifecycle: {
      featureStatus: record.status,
      maturity: null,
      implementationStrategy: null,
      commitOutcome: null,
      canAssemble: null,
      canWriteHost: null,
      requiresReview: statusWarnings.length > 0,
      reasons: statusWarnings,
      summary:
        deriveWorkspaceStatusMessage(record.status)
        || 'Compatibility-only legacy display boundary: canonical lifecycle governance is unavailable on this payload.',
    },
    reusableGovernance: {
      admittedCount: 0,
      attentionCount: 0,
      familyAdmissions: [],
      patternAdmissions: [],
      seamAdmissions: [],
      summary: 'Compatibility-only legacy display boundary: reusable-governance detail is unavailable on this payload.',
    },
    proposalStatus: {
      ready: false,
      percentage: null,
      message: LEGACY_DISPLAY_BOUNDARY_WARNING,
    },
    gapFillSummary: {
      autoFilled: 0,
      needsAttention: 0,
    },
    categoryEClarification: {
      count: 0,
      items: [],
    },
    invalidPatternIds: [],
    readiness: {
      score: null,
      warnings: readinessWarnings,
    },
    compatibilitySource: 'compatibility-only',
    grounding: {
      status: 'none_required',
      reviewRequired: false,
      verifiedSymbolCount: 0,
      allowlistedSymbolCount: 0,
      weakSymbolCount: 0,
      unknownSymbolCount: 0,
      warningCount: 0,
      warnings: [],
      reasonCodes: ['legacy_display_boundary'],
      summary: 'Compatibility-only legacy display boundary: canonical grounding detail is unavailable on this payload.',
    },
    repairability: {
      status: 'not_checked',
      reasons: [],
      summary: 'Compatibility-only legacy display boundary: no live repairability observation was requested for this payload.',
    },
  };
}

import type { WorkbenchResult } from '../../../workbench/contract';
import type { RuneWeaverFeatureRecord } from '@/types/workspace';

const SYSTEM_INTENT_KINDS = new Set([
  'standalone-system',
  'cross-system-composition',
  'ui-surface',
]);

function normalizeValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function deriveFeatureGroupFromIntentKind(intentKind: string | null | undefined): string | null {
  const normalizedIntentKind = normalizeValue(intentKind);
  if (!normalizedIntentKind) {
    return null;
  }

  if (SYSTEM_INTENT_KINDS.has(normalizedIntentKind)) {
    return 'system';
  }

  return null;
}

export function deriveFeatureGroupFromWorkspaceRecord(
  record: Pick<RuneWeaverFeatureRecord, 'intentKind'>,
): string | null {
  return deriveFeatureGroupFromIntentKind(record.intentKind);
}

export function deriveFeatureGroupFromWorkbenchResult(
  result: Pick<WorkbenchResult, 'session'>,
): string | null {
  return deriveFeatureGroupFromIntentKind(result.session?.wizardResult?.schema.classification.intentKind);
}

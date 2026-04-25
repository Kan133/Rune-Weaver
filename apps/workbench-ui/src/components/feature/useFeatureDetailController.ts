import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { useCLIExecutor } from '@/hooks/useCLIExecutor';
import type { CLIExecutionResult, CLIReviewAction, GapFillProductStatus } from '@/hooks/useCLIExecutor';
import { describeGapFillBoundary } from '@/types/gapFill';
import {
  buildCanonicalGapFillGuidance,
  deriveCanonicalAcceptanceStatus,
  deriveGapFillContinuationState,
} from '@/lib/gapFillCanonical';
import { buildGapFillApprovalUnit } from '@/lib/gapFillApprovalUnit';
import { normalizeFeatureDisplay } from '@/lib/normalizeFeatureDisplay';

function extractApprovalFile(command?: string): string | undefined {
  if (!command) {
    return undefined;
  }
  const quoted = command.match(/--approve\s+"([^"]+)"/);
  if (quoted?.[1]) {
    return quoted[1];
  }
  const bare = command.match(/--approve\s+([^\s]+)/);
  return bare?.[1];
}

export function shouldRefreshAfterUpdateSuccess(params: {
  currentCommand: string | null;
  isRunning: boolean;
  result: CLIExecutionResult | null;
}): boolean {
  return params.currentCommand === 'update' && !params.isRunning && params.result?.success === true;
}

export async function refreshFeatureAfterUpdate(
  reloadConnectedWorkspace: (preferredFeatureId?: string | null) => Promise<void>,
  featureId: string,
): Promise<void> {
  await reloadConnectedWorkspace(featureId);
}

function shouldRefreshAfterDeleteSuccess(params: {
  currentCommand: string | null;
  isRunning: boolean;
  result: CLIExecutionResult | null;
}): boolean {
  return params.currentCommand === 'delete' && !params.isRunning && params.result?.success === true;
}

export function useFeatureDetailController() {
  const selectedFeature = useFeatureStore((state) => state.getSelectedFeature());
  const connectedHostRoot = useFeatureStore((state) => state.connectedHostRoot);
  const reloadConnectedWorkspace = useFeatureStore((state) => state.reloadConnectedWorkspace);
  const workspace = useFeatureStore((state) => state.workspace);
  const hostConfig = useFeatureStore((state) => state.hostConfig);
  const allFeatures = useFeatureStore((state) => state.features);
  const cli = useCLIExecutor();

  const [filesOpen, setFilesOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(true);
  const [updateOpen, setUpdateOpen] = useState(true);
  const [gapFillOpen, setGapFillOpen] = useState(true);
  const [updatePrompt, setUpdatePrompt] = useState('');
  const [selectedBoundary, setSelectedBoundary] = useState<string>('');
  const [gapFillInstruction, setGapFillInstruction] = useState('');
  const handledUpdateResultRef = useRef<string | null>(null);
  const handledDeleteResultRef = useRef<string | null>(null);
  const lastUpdateWriteModeRef = useRef(false);

  const feature = normalizeFeatureDisplay(selectedFeature);
  const featureId = feature?.id ?? '';
  const hostRoot = connectedHostRoot || '';
  const parentFeature = feature?.parentId ? allFeatures.find((entry) => entry.id === feature.parentId) ?? null : null;
  const childrenFeatures = useMemo(
    () => allFeatures.filter((entry) => feature?.childrenIds.includes(entry.id) ?? false),
    [allFeatures, feature?.childrenIds],
  );

  useEffect(() => {
    if (!featureId) {
      return;
    }
    handledUpdateResultRef.current = null;
    handledDeleteResultRef.current = null;
    lastUpdateWriteModeRef.current = false;
    setUpdatePrompt('');
    setSelectedBoundary('');
    setGapFillInstruction('');
  }, [featureId]);

  useEffect(() => {
    if (!feature?.id) {
      return;
    }
    if (!shouldRefreshAfterUpdateSuccess({ currentCommand: cli.currentCommand, isRunning: cli.isRunning, result: cli.result })) {
      return;
    }
    if (!lastUpdateWriteModeRef.current) {
      return;
    }
    const handledKey =
      cli.result?.artifactPath ||
      `${feature.id}:${cli.result?.exitCode}:${cli.result?.output.length ?? 0}`;
    if (handledUpdateResultRef.current === handledKey) {
      return;
    }
    handledUpdateResultRef.current = handledKey;
    void refreshFeatureAfterUpdate(reloadConnectedWorkspace, feature.id);
  }, [cli.currentCommand, cli.isRunning, cli.result, feature?.id, reloadConnectedWorkspace]);

  useEffect(() => {
    if (!feature?.id) {
      return;
    }
    if (!shouldRefreshAfterDeleteSuccess({ currentCommand: cli.currentCommand, isRunning: cli.isRunning, result: cli.result })) {
      return;
    }
    const handledKey =
      cli.result?.artifactPath ||
      `${feature.id}:${cli.result?.exitCode}:${cli.result?.output.length ?? 0}`;
    if (handledDeleteResultRef.current === handledKey) {
      return;
    }
    handledDeleteResultRef.current = handledKey;
    void reloadConnectedWorkspace(null);
  }, [cli.currentCommand, cli.isRunning, cli.result, feature?.id, reloadConnectedWorkspace]);

  const canRunUpdate =
    !!hostRoot &&
    feature?.status === 'active' &&
    featureId.length > 0 &&
    updatePrompt.trim().length > 0 &&
    !cli.isRunning;

  const gapFillBoundaries = feature?.gapFillBoundaries ?? [];
  const effectiveBoundary = selectedBoundary || gapFillBoundaries[0] || '';
  const canRunGapFill =
    !!hostRoot &&
    feature?.status === 'active' &&
    gapFillBoundaries.length > 0 &&
    gapFillInstruction.trim().length > 0 &&
    !cli.isRunning;

  const review = cli.result?.review ?? null;
  const gapFillStatus = review?.gapFillStatus;
  const decisionRecord = review?.gapFillDecisionRecord;
  const structuredReadiness = review?.gapFillReadiness;
  const readinessScore = feature?.reviewSignals.readiness.score ?? null;
  const reviewActions = review?.recommendedActions || [];
  const approvalAction =
    reviewActions.find((action) => action.kind === 'primary' || action.kind === 'launch') ||
    reviewActions[0];
  const applyAction =
    reviewActions.find((action) => action.kind === 'repair') || reviewActions[1];
  const validateAction =
    reviewActions.find((action) => action.kind === 'inspect' || action.kind === 'secondary') ||
    reviewActions[2];
  const approvalFile = extractApprovalFile(approvalAction?.command) || extractApprovalFile(validateAction?.command);
  const canContinueAfterApply =
    gapFillStatus === 'ready_to_apply' &&
    review?.stages.some((stage) => stage.id === 'gap-validation' && stage.status === 'success');
  const continuationState = deriveGapFillContinuationState({
    status: gapFillStatus,
    validationSucceeded: !!canContinueAfterApply,
    hostReady: structuredReadiness?.hostReady ?? true,
  });

  const canonicalGuidance =
    review?.canonicalGapFillGuidance ||
    buildCanonicalGapFillGuidance({
      boundaryId: effectiveBoundary || decisionRecord?.selectedBoundary,
      instruction: gapFillInstruction.trim() || decisionRecord?.originalInstruction,
      status: gapFillStatus,
      approvalFile,
      validationSucceeded: !!canContinueAfterApply,
      hostReady: structuredReadiness?.hostReady ?? false,
    });

  const canonicalAcceptance =
    review?.canonicalAcceptance ||
    deriveCanonicalAcceptanceStatus({
      boundaryId: effectiveBoundary || decisionRecord?.selectedBoundary,
      instruction: gapFillInstruction.trim() || decisionRecord?.originalInstruction,
      status: gapFillStatus,
      validationSucceeded: !!canContinueAfterApply,
      hostReady: structuredReadiness?.hostReady ?? false,
      continuationVisible: continuationState.showContinuationRail,
    });

  const approvalUnit = buildGapFillApprovalUnit({
    review,
    decisionRecord,
    readiness: structuredReadiness,
    guidance: canonicalGuidance,
    acceptance: canonicalAcceptance,
    effectiveBoundary,
  });

  const groupLabel = feature?.group || 'unknown';
  const updatedLabel = feature?.updatedAt
    ? formatDistanceToNow(feature.updatedAt, { locale: zhCN, addSuffix: true })
    : 'unknown';

  return {
    cli,
    selectedFeature,
    feature,
    parentFeature,
    childrenFeatures,
    filesOpen,
    setFilesOpen,
    hostOpen,
    setHostOpen,
    updateOpen,
    setUpdateOpen,
    gapFillOpen,
    setGapFillOpen,
    updatePrompt,
    setUpdatePrompt,
    selectedBoundary,
    setSelectedBoundary,
    gapFillInstruction,
    setGapFillInstruction,
    hostRoot,
    canRunUpdate,
    canRunGapFill,
    gapFillBoundaries,
    effectiveBoundary,
    groupLabel,
    updatedLabel,
    readinessScore,
    review,
    reviewActions,
    approvalAction,
    applyAction,
    validateAction,
    approvalFile,
    structuredReadiness,
    continuationState,
    approvalUnit,
    canonicalGuidance,
    canonicalAcceptance,
    handlePreviewUpdate: async () => {
      if (!hostRoot || !updatePrompt.trim() || !feature) {
        return;
      }
      lastUpdateWriteModeRef.current = false;
      await cli.executeUpdate(hostRoot, feature.id, updatePrompt.trim(), false);
    },
    handleApplyUpdate: async () => {
      if (!hostRoot || !updatePrompt.trim() || !feature) {
        return;
      }
      lastUpdateWriteModeRef.current = true;
      await cli.executeUpdate(hostRoot, feature.id, updatePrompt.trim(), true);
    },
    handleDeleteFeature: async () => {
      if (!hostRoot || !feature) {
        return;
      }
      await cli.executeDelete(hostRoot, feature.id, true);
    },
    handleRunGapFill: async () => {
      if (!hostRoot || !gapFillInstruction.trim() || !feature) {
        return;
      }
      await cli.executeGapFill(hostRoot, feature.id, gapFillInstruction.trim(), effectiveBoundary || undefined, 'review');
    },
    handleApplyGapFill: async () => {
      if (!hostRoot || !gapFillInstruction.trim() || !feature) {
        return;
      }
      await cli.executeGapFill(hostRoot, feature.id, gapFillInstruction.trim(), effectiveBoundary || undefined, 'apply', approvalFile);
    },
    handleValidateGapFill: async () => {
      if (!hostRoot || (!gapFillInstruction.trim() && !approvalFile) || !feature) {
        return;
      }
      await cli.executeGapFill(
        hostRoot,
        feature.id,
        gapFillInstruction.trim(),
        effectiveBoundary || undefined,
        'validate-applied',
        approvalFile,
      );
    },
    handleRepairBuild: async () => {
      if (!hostRoot) {
        return;
      }
      await cli.executeRepairBuild(hostRoot);
    },
    handleLaunchHost: async () => {
      if (!hostRoot) {
        return;
      }
      await cli.executeLaunch(hostRoot, workspace?.addonName || hostConfig.addonName, hostConfig.mapName);
    },
    describeGapFillBoundary,
  };
}

export type FeatureDetailController = ReturnType<typeof useFeatureDetailController>;

export function getGapFillStatusLabel(status: GapFillProductStatus | undefined): string {
  if (status === 'ready_to_apply') return 'Ready to apply';
  if (status === 'needs_confirmation') return 'Needs confirmation';
  if (status === 'blocked_by_host') return 'Blocked by host';
  if (status === 'blocked_by_policy') return 'Blocked by policy';
  return 'No review yet';
}

export function getActionCommand(action?: CLIReviewAction): string {
  return action?.command || 'Waiting for structured action';
}

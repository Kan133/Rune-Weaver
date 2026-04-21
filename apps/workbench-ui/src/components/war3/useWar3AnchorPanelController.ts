import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { buildWar3IntakeArtifact, type CanvasHintDTO, type MapSummaryDTO } from '@/lib/war3-intake';
import {
  buildConfirmedItems,
  buildContextDraft,
  buildFeaturePrompt,
  buildHandoffStats,
  copyTextWithFallback,
  determineRegionHint,
  getSelectedSuggestionData,
  parseOptionalNumber,
} from './war3AnchorPanel.utils';
import type {
  AnchorRole,
  ApiResponse,
  ConfirmedAnchor,
  ConfirmedLandmark,
  HandoffPreviewResponse,
  SelectedSuggestionRef,
  SkeletonPreviewResponse,
} from './war3AnchorPanel.types';

let manualAnchorIdCounter = 0;

function replaceItemAtIndex<T>(items: T[], index: number, update: (item: T) => T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? update(item) : item));
}

function moveItem<T>(items: T[], index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function useWar3AnchorPanelController() {
  const hostRoot = useFeatureStore((state) => state.hostConfig.hostRoot);
  const [localHostRoot, setLocalHostRoot] = useState(hostRoot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasHint, setCanvasHint] = useState<CanvasHintDTO | null>(null);
  const [mapSummary, setMapSummary] = useState<MapSummaryDTO | null>(null);
  const [anchorSuggestions, setAnchorSuggestions] = useState<ConfirmedAnchor[]>([]);
  const [doodadSuggestions, setDoodadSuggestions] = useState<ConfirmedLandmark[]>([]);
  const [manualAnchors, setManualAnchors] = useState<ConfirmedAnchor[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SelectedSuggestionRef>(null);
  const [featureDescription, setFeatureDescription] = useState('');
  const [shopInteractionMode, setShopInteractionMode] = useState('open-shop-ui');
  const [shopUnlockMechanism, setShopUnlockMechanism] = useState('unknown');
  const [targetPlayers, setTargetPlayers] = useState('all-players');
  const [hintDurationSeconds, setHintDurationSeconds] = useState('5');
  const [explicitHintText, setExplicitHintText] = useState('');
  const [shopObjectId, setShopObjectId] = useState('');
  const [shopTargetMode, setShopTargetMode] = useState('unknown');
  const [shopTargetSourceId, setShopTargetSourceId] = useState('');
  const [shopOrderMode, setShopOrderMode] = useState('unknown');
  const [shopOrderId, setShopOrderId] = useState('');
  const [triggerAreaMode, setTriggerAreaMode] = useState('unknown');
  const [triggerAreaSourceId, setTriggerAreaSourceId] = useState('');
  const [triggerAreaRadius, setTriggerAreaRadius] = useState('');
  const [triggerAreaWidth, setTriggerAreaWidth] = useState('');
  const [triggerAreaHeight, setTriggerAreaHeight] = useState('');
  const [isManualAnchorMode, setIsManualAnchorMode] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [artifactCopyStatus, setArtifactCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [handoffPreviewLoading, setHandoffPreviewLoading] = useState(false);
  const [handoffPreviewError, setHandoffPreviewError] = useState<string | null>(null);
  const [handoffPreview, setHandoffPreview] = useState<HandoffPreviewResponse['result'] | null>(null);
  const [handoffBundleCopyStatus, setHandoffBundleCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [skeletonPreviewLoading, setSkeletonPreviewLoading] = useState(false);
  const [skeletonPreviewError, setSkeletonPreviewError] = useState<string | null>(null);
  const [skeletonPreview, setSkeletonPreview] = useState<SkeletonPreviewResponse['result'] | null>(null);
  const [skeletonCopyStatus, setSkeletonCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const parsedHintDurationSeconds = useMemo(() => parseOptionalNumber(hintDurationSeconds), [hintDurationSeconds]);
  const parsedTriggerAreaRadius = useMemo(() => parseOptionalNumber(triggerAreaRadius), [triggerAreaRadius]);
  const parsedTriggerAreaWidth = useMemo(() => parseOptionalNumber(triggerAreaWidth), [triggerAreaWidth]);
  const parsedTriggerAreaHeight = useMemo(() => parseOptionalNumber(triggerAreaHeight), [triggerAreaHeight]);

  const allConfirmedItems = useMemo(
    () => buildConfirmedItems(anchorSuggestions, doodadSuggestions, manualAnchors),
    [anchorSuggestions, doodadSuggestions, manualAnchors],
  );
  const contextDraft = useMemo(
    () => buildContextDraft(anchorSuggestions, doodadSuggestions, manualAnchors),
    [anchorSuggestions, doodadSuggestions, manualAnchors],
  );
  const featurePrompt = useMemo(
    () => buildFeaturePrompt(anchorSuggestions, doodadSuggestions, manualAnchors, featureDescription),
    [anchorSuggestions, doodadSuggestions, manualAnchors, featureDescription],
  );
  const handoffStats = useMemo(
    () => buildHandoffStats(anchorSuggestions, doodadSuggestions, manualAnchors),
    [anchorSuggestions, doodadSuggestions, manualAnchors],
  );
  const selectedData = useMemo(
    () => getSelectedSuggestionData(selectedSuggestion, anchorSuggestions, doodadSuggestions, manualAnchors),
    [selectedSuggestion, anchorSuggestions, doodadSuggestions, manualAnchors],
  );

  const intakeArtifact = useMemo(() => {
    if (!localHostRoot.trim() || allConfirmedItems.length === 0) {
      return null;
    }

    return buildWar3IntakeArtifact({
      hostRoot: localHostRoot.trim(),
      canvasHint,
      mapSummary,
      confirmedItems: allConfirmedItems.map((item) => item.data),
      featureDescription,
      contextDraft,
      finalHandoffPrompt: featurePrompt,
      shopInteractionMode,
      shopUnlockMechanism,
      targetPlayers,
      hintDurationSeconds: parsedHintDurationSeconds,
      explicitHintText,
      shopObjectId,
      shopTargetMode,
      shopTargetSourceId,
      shopOrderMode,
      shopOrderId,
      triggerAreaMode: (triggerAreaMode.trim() || 'unknown') as 'unknown' | 'existing-region' | 'generated-rect' | 'generated-radius',
      triggerAreaSourceId,
      triggerAreaRadius: parsedTriggerAreaRadius,
      triggerAreaWidth: parsedTriggerAreaWidth,
      triggerAreaHeight: parsedTriggerAreaHeight,
      issues,
    });
  }, [
    allConfirmedItems,
    canvasHint,
    contextDraft,
    explicitHintText,
    featureDescription,
    featurePrompt,
    issues,
    localHostRoot,
    mapSummary,
    parsedHintDurationSeconds,
    parsedTriggerAreaHeight,
    parsedTriggerAreaRadius,
    parsedTriggerAreaWidth,
    shopInteractionMode,
    shopObjectId,
    shopOrderId,
    shopOrderMode,
    shopTargetMode,
    shopTargetSourceId,
    shopUnlockMechanism,
    targetPlayers,
    triggerAreaMode,
    triggerAreaSourceId,
  ]);

  const intakeArtifactText = useMemo(() => (intakeArtifact ? JSON.stringify(intakeArtifact, null, 2) : ''), [intakeArtifact]);
  const handoffBundleText = useMemo(() => (handoffPreview ? JSON.stringify(handoffPreview, null, 2) : ''), [handoffPreview]);
  const skeletonPreviewText = useMemo(() => skeletonPreview?.content || '', [skeletonPreview]);
  const bridgePreview = skeletonPreview?.bridge || null;
  const sidecarPreview = skeletonPreview?.sidecar || null;
  const writePreviewArtifact = skeletonPreview?.writePreviewArtifact || null;

  const bridgeMechanics = useMemo(() => {
    if (!bridgePreview) {
      return [];
    }

    return Object.entries(bridgePreview.intentSchema.normalizedMechanics)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
  }, [bridgePreview]);

  const hasData = Boolean(canvasHint || anchorSuggestions.length || doodadSuggestions.length || manualAnchors.length);
  const totalSuggestions = anchorSuggestions.length + doodadSuggestions.length + manualAnchors.length;
  const confirmedCount = allConfirmedItems.length;

  const setCopyStatusWithReset = useCallback((setter: Dispatch<SetStateAction<'idle' | 'copied' | 'error'>>, ok: boolean) => {
    setter(ok ? 'copied' : 'error');
    setTimeout(() => setter('idle'), 2000);
  }, []);

  const handleLoadAnchors = useCallback(async () => {
    if (!localHostRoot.trim()) {
      setError('请输入 hostRoot 路径');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedSuggestion(null);

    try {
      const response = await fetch('/api/war3/anchors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostRoot: localHostRoot.trim() }),
      });
      const data: ApiResponse = await response.json();

      if (!data.success || !data.result) {
        setError(data.error || '加载失败');
        setCanvasHint(null);
        setMapSummary(null);
        setAnchorSuggestions([]);
        setDoodadSuggestions([]);
        setManualAnchors([]);
        return;
      }

      const result = data.result;
      setMapSummary(result.mapSummary || null);
      setCanvasHint(result.planarMap?.canvasHint || null);
      setHandoffPreview(null);
      setHandoffPreviewError(null);
      setSkeletonPreview(null);
      setSkeletonPreviewError(null);
      setAnchorSuggestions(result.anchorCandidates?.suggestions?.map((item) => ({ ...item, semanticName: '', confirmed: false })) || []);
      setDoodadSuggestions(result.doodadCandidates?.suggestions?.map((item) => ({ ...item, semanticName: '', confirmed: false })) || []);
      setManualAnchors([]);
      setIssues(result.issues || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }, [localHostRoot]);

  const handleMapClick = useCallback((x: number, y: number) => {
    if (!isManualAnchorMode || !canvasHint) {
      return;
    }

    const newAnchor: ConfirmedAnchor = {
      id: `manual-${Date.now()}-${manualAnchorIdCounter++}`,
      x,
      y,
      z: 0,
      kind: 'manual',
      regionHint: determineRegionHint(x, y, canvasHint),
      label: '手动锚点',
      reason: 'manual-map-click',
      semanticName: '',
      confirmed: false,
    };

    setManualAnchors((previous) => {
      const next = [...previous, newAnchor];
      setSelectedSuggestion({ type: 'manual', index: next.length - 1 });
      return next;
    });
    setIsManualAnchorMode(false);
  }, [canvasHint, isManualAnchorMode]);

  const updateAnchorSemanticName = useCallback((index: number, name: string) => {
    setAnchorSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, semanticName: name })));
  }, []);
  const updateDoodadSemanticName = useCallback((index: number, name: string) => {
    setDoodadSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, semanticName: name })));
  }, []);
  const updateManualAnchorSemanticName = useCallback((index: number, name: string) => {
    setManualAnchors((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, semanticName: name })));
  }, []);

  const updateAnchorRole = useCallback((index: number, role: AnchorRole) => {
    setAnchorSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, anchorRole: role, roleLabel: role === 'custom' ? item.roleLabel : undefined })));
  }, []);
  const updateDoodadRole = useCallback((index: number, role: AnchorRole) => {
    setDoodadSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, anchorRole: role, roleLabel: role === 'custom' ? item.roleLabel : undefined })));
  }, []);
  const updateManualAnchorRole = useCallback((index: number, role: AnchorRole) => {
    setManualAnchors((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, anchorRole: role, roleLabel: role === 'custom' ? item.roleLabel : undefined })));
  }, []);

  const updateAnchorRoleLabel = useCallback((index: number, label: string) => {
    setAnchorSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, roleLabel: label })));
  }, []);
  const updateDoodadRoleLabel = useCallback((index: number, label: string) => {
    setDoodadSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, roleLabel: label })));
  }, []);
  const updateManualAnchorRoleLabel = useCallback((index: number, label: string) => {
    setManualAnchors((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, roleLabel: label })));
  }, []);

  const moveConfirmedItem = useCallback((type: 'anchor' | 'doodad' | 'manual', index: number, direction: 'up' | 'down') => {
    if (type === 'anchor') {
      setAnchorSuggestions((previous) => moveItem(previous, index, direction));
    } else if (type === 'doodad') {
      setDoodadSuggestions((previous) => moveItem(previous, index, direction));
    } else {
      setManualAnchors((previous) => moveItem(previous, index, direction));
    }

    if (selectedSuggestion?.type === type) {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0) {
        setSelectedSuggestion({ type, index: targetIndex });
      }
    }
  }, [selectedSuggestion]);

  const confirmAnchor = useCallback((index: number) => {
    setAnchorSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, confirmed: true, anchorRole: item.anchorRole || 'poi' })));
  }, []);
  const confirmDoodad = useCallback((index: number) => {
    setDoodadSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, confirmed: true, anchorRole: item.anchorRole || 'poi' })));
  }, []);
  const confirmManualAnchor = useCallback((index: number) => {
    setManualAnchors((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, confirmed: true, anchorRole: item.anchorRole || 'poi' })));
  }, []);
  const unconfirmAnchor = useCallback((index: number) => {
    setAnchorSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, confirmed: false })));
  }, []);
  const unconfirmDoodad = useCallback((index: number) => {
    setDoodadSuggestions((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, confirmed: false })));
  }, []);
  const unconfirmManualAnchor = useCallback((index: number) => {
    setManualAnchors((previous) => replaceItemAtIndex(previous, index, (item) => ({ ...item, confirmed: false })));
  }, []);

  const removeManualAnchor = useCallback((index: number) => {
    setManualAnchors((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    if (selectedSuggestion?.type === 'manual' && selectedSuggestion.index === index) {
      setSelectedSuggestion(null);
    }
  }, [selectedSuggestion]);

  const handleSelectAnchor = useCallback((index: number) => setSelectedSuggestion({ type: 'anchor', index }), []);
  const handleSelectDoodad = useCallback((index: number) => setSelectedSuggestion({ type: 'doodad', index }), []);
  const handleSelectManualAnchor = useCallback((index: number) => setSelectedSuggestion({ type: 'manual', index }), []);

  const updateSelectedSemanticName = useCallback((name: string) => {
    if (!selectedSuggestion) {
      return;
    }
    if (selectedSuggestion.type === 'anchor') {
      updateAnchorSemanticName(selectedSuggestion.index, name);
    } else if (selectedSuggestion.type === 'doodad') {
      updateDoodadSemanticName(selectedSuggestion.index, name);
    } else {
      updateManualAnchorSemanticName(selectedSuggestion.index, name);
    }
  }, [selectedSuggestion, updateAnchorSemanticName, updateDoodadSemanticName, updateManualAnchorSemanticName]);

  const updateSelectedRole = useCallback((role: AnchorRole) => {
    if (!selectedSuggestion) {
      return;
    }
    if (selectedSuggestion.type === 'anchor') {
      updateAnchorRole(selectedSuggestion.index, role);
    } else if (selectedSuggestion.type === 'doodad') {
      updateDoodadRole(selectedSuggestion.index, role);
    } else {
      updateManualAnchorRole(selectedSuggestion.index, role);
    }
  }, [selectedSuggestion, updateAnchorRole, updateDoodadRole, updateManualAnchorRole]);

  const updateSelectedRoleLabel = useCallback((label: string) => {
    if (!selectedSuggestion) {
      return;
    }
    if (selectedSuggestion.type === 'anchor') {
      updateAnchorRoleLabel(selectedSuggestion.index, label);
    } else if (selectedSuggestion.type === 'doodad') {
      updateDoodadRoleLabel(selectedSuggestion.index, label);
    } else {
      updateManualAnchorRoleLabel(selectedSuggestion.index, label);
    }
  }, [selectedSuggestion, updateAnchorRoleLabel, updateDoodadRoleLabel, updateManualAnchorRoleLabel]);

  const toggleSelectedConfirmation = useCallback(() => {
    if (!selectedSuggestion) {
      return;
    }
    if (selectedSuggestion.type === 'anchor') {
      if (anchorSuggestions[selectedSuggestion.index]?.confirmed) {
        unconfirmAnchor(selectedSuggestion.index);
      } else {
        confirmAnchor(selectedSuggestion.index);
      }
      return;
    }
    if (selectedSuggestion.type === 'doodad') {
      if (doodadSuggestions[selectedSuggestion.index]?.confirmed) {
        unconfirmDoodad(selectedSuggestion.index);
      } else {
        confirmDoodad(selectedSuggestion.index);
      }
      return;
    }
    if (manualAnchors[selectedSuggestion.index]?.confirmed) {
      unconfirmManualAnchor(selectedSuggestion.index);
    } else {
      confirmManualAnchor(selectedSuggestion.index);
    }
  }, [anchorSuggestions, confirmAnchor, confirmDoodad, confirmManualAnchor, doodadSuggestions, manualAnchors, selectedSuggestion, unconfirmAnchor, unconfirmDoodad, unconfirmManualAnchor]);

  const handleCopyHandoff = useCallback(async () => {
    if (!featurePrompt) {
      return;
    }
    setCopyStatusWithReset(setCopyStatus, await copyTextWithFallback(featurePrompt));
  }, [featurePrompt, setCopyStatusWithReset]);
  const handleCopyArtifact = useCallback(async () => {
    if (!intakeArtifactText) {
      return;
    }
    setCopyStatusWithReset(setArtifactCopyStatus, await copyTextWithFallback(intakeArtifactText));
  }, [intakeArtifactText, setCopyStatusWithReset]);
  const handleCopyHandoffBundle = useCallback(async () => {
    if (!handoffBundleText) {
      return;
    }
    setCopyStatusWithReset(setHandoffBundleCopyStatus, await copyTextWithFallback(handoffBundleText));
  }, [handoffBundleText, setCopyStatusWithReset]);
  const handleCopySkeletonPreview = useCallback(async () => {
    if (!skeletonPreviewText) {
      return;
    }
    setCopyStatusWithReset(setSkeletonCopyStatus, await copyTextWithFallback(skeletonPreviewText));
  }, [setCopyStatusWithReset, skeletonPreviewText]);

  const handleGenerateHandoffPreview = useCallback(async () => {
    if (!intakeArtifact) {
      return;
    }
    setHandoffPreviewLoading(true);
    setHandoffPreviewError(null);

    try {
      const response = await fetch('/api/war3/handoff-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact: intakeArtifact }),
      });
      const data: HandoffPreviewResponse = await response.json();
      if (!data.success || !data.result) {
        setHandoffPreviewError(data.error || '生成 handoff preview 失败');
        setHandoffPreview(null);
        return;
      }
      setHandoffPreview(data.result);
    } catch (caught) {
      setHandoffPreviewError(caught instanceof Error ? caught.message : '生成 handoff preview 失败');
      setHandoffPreview(null);
    } finally {
      setHandoffPreviewLoading(false);
    }
  }, [intakeArtifact]);

  const handleGenerateSkeletonPreview = useCallback(async () => {
    if (!intakeArtifact) {
      return;
    }
    setSkeletonPreviewLoading(true);
    setSkeletonPreviewError(null);

    try {
      const response = await fetch('/api/war3/skeleton-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact: intakeArtifact }),
      });
      const data: SkeletonPreviewResponse = await response.json();
      if (!data.success || !data.result) {
        setSkeletonPreviewError(data.error || '生成 skeleton preview 失败');
        setSkeletonPreview(null);
        return;
      }
      setSkeletonPreview(data.result);
    } catch (caught) {
      setSkeletonPreviewError(caught instanceof Error ? caught.message : '生成 skeleton preview 失败');
      setSkeletonPreview(null);
    } finally {
      setSkeletonPreviewLoading(false);
    }
  }, [intakeArtifact]);

  return {
    localHostRoot,
    setLocalHostRoot,
    loading,
    error,
    canvasHint,
    mapSummary,
    anchorSuggestions,
    doodadSuggestions,
    manualAnchors,
    issues,
    selectedSuggestion,
    selectedData,
    featureDescription,
    setFeatureDescription,
    shopInteractionMode,
    setShopInteractionMode,
    shopUnlockMechanism,
    setShopUnlockMechanism,
    targetPlayers,
    setTargetPlayers,
    hintDurationSeconds,
    setHintDurationSeconds,
    explicitHintText,
    setExplicitHintText,
    shopObjectId,
    setShopObjectId,
    shopTargetMode,
    setShopTargetMode,
    shopTargetSourceId,
    setShopTargetSourceId,
    shopOrderMode,
    setShopOrderMode,
    shopOrderId,
    setShopOrderId,
    triggerAreaMode,
    setTriggerAreaMode,
    triggerAreaSourceId,
    setTriggerAreaSourceId,
    triggerAreaRadius,
    setTriggerAreaRadius,
    triggerAreaWidth,
    setTriggerAreaWidth,
    triggerAreaHeight,
    setTriggerAreaHeight,
    isManualAnchorMode,
    setIsManualAnchorMode,
    copyStatus,
    artifactCopyStatus,
    handoffPreviewLoading,
    handoffPreviewError,
    handoffPreview,
    handoffBundleCopyStatus,
    skeletonPreviewLoading,
    skeletonPreviewError,
    skeletonPreview,
    skeletonCopyStatus,
    contextDraft,
    featurePrompt,
    handoffStats,
    allConfirmedItems,
    intakeArtifact,
    intakeArtifactText,
    handoffBundleText,
    skeletonPreviewText,
    bridgePreview,
    sidecarPreview,
    writePreviewArtifact,
    bridgeMechanics,
    hasData,
    totalSuggestions,
    confirmedCount,
    handleLoadAnchors,
    handleMapClick,
    updateAnchorSemanticName,
    updateDoodadSemanticName,
    updateManualAnchorSemanticName,
    moveConfirmedItem,
    confirmAnchor,
    confirmDoodad,
    confirmManualAnchor,
    unconfirmAnchor,
    unconfirmDoodad,
    unconfirmManualAnchor,
    removeManualAnchor,
    handleSelectAnchor,
    handleSelectDoodad,
    handleSelectManualAnchor,
    updateSelectedSemanticName,
    updateSelectedRole,
    updateSelectedRoleLabel,
    toggleSelectedConfirmation,
    handleCopyHandoff,
    handleCopyArtifact,
    handleGenerateHandoffPreview,
    handleCopyHandoffBundle,
    handleGenerateSkeletonPreview,
    handleCopySkeletonPreview,
    setSelectedSuggestion,
  };
}

export type War3AnchorPanelController = ReturnType<typeof useWar3AnchorPanelController>;

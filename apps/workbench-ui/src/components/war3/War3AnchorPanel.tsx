/**
 * War3 Anchor Panel
 * 
 * Minimal UI panel for loading and reviewing War3 anchor suggestions.
 * Supports two layouts: main (full workspace) and side (narrow sidebar).
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import { Anchor, MapPin, Box, Loader2, Compass, Eye, FileText, CheckCircle2, XCircle, Plus, MousePointer2, Sparkles, ChevronUp, ChevronDown, Copy, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useFeatureStore } from '@/hooks/useFeatureStore';
import { buildWar3IntakeArtifact, type CanvasHintDTO, type MapSummaryDTO } from '@/lib/war3-intake';

interface AnchorSuggestionDTO {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: 'unit' | 'doodad' | 'manual';
  regionHint: string;
  label: string;
  reason: string;
  owner?: number;
}

interface LandmarkSuggestionDTO {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: 'doodad';
  regionHint: string;
  label: string;
  reason: string;
}

interface PlanarMapDTO {
  canvasHint?: CanvasHintDTO;
}

interface AnchorCandidatesDTO {
  suggestions?: AnchorSuggestionDTO[];
}

interface DoodadCandidatesDTO {
  suggestions?: LandmarkSuggestionDTO[];
}

interface War3DerivedWorkspaceViewDTO {
  success: boolean;
  mapSummary: MapSummaryDTO | null;
  planarMap: PlanarMapDTO | null;
  anchorCandidates: AnchorCandidatesDTO | null;
  doodadCandidates: DoodadCandidatesDTO | null;
  issues: string[];
}

const REGION_ROWS = ["top", "middle", "bottom"] as const;
const REGION_COLS = ["left", "center", "right"] as const;

// Anchor roles for organization
const ANCHOR_ROLES = [
  { value: 'spawn', label: '出生点', color: '#22c55e' },
  { value: 'shop', label: '商店', color: '#f59e0b' },
  { value: 'boss', label: 'Boss', color: '#ef4444' },
  { value: 'objective', label: '目标点', color: '#3b82f6' },
  { value: 'trigger', label: '触发器', color: '#a855f7' },
  { value: 'poi', label: '兴趣点', color: '#06b6d4' },
  { value: 'custom', label: '自定义', color: '#6b7280' },
] as const;

type AnchorRole = typeof ANCHOR_ROLES[number]['value'];

function determineRegionHint(x: number, y: number, canvasHint: CanvasHintDTO | null) {
  if (!canvasHint) {
    return "unknown";
  }

  const worldWidth = Math.max(canvasHint.width * 128, 1);
  const worldHeight = Math.max(canvasHint.height * 128, 1);
  const offsetX = canvasHint.offsetX ?? 0;
  const offsetY = canvasHint.offsetY ?? 0;

  const normalizedX = Math.max(0, Math.min(1, (x - offsetX) / worldWidth));
  const normalizedY = Math.max(0, Math.min(1, (y - offsetY) / worldHeight));

  const colIndex = Math.min(2, Math.max(0, Math.floor(normalizedX * 3)));
  const rowIndex = Math.min(2, Math.max(0, Math.floor(normalizedY * 3)));

  return `${REGION_ROWS[rowIndex]}-${REGION_COLS[colIndex]}`;
}

interface ApiResponse {
  success: boolean;
  result?: War3DerivedWorkspaceViewDTO;
  error?: string;
}

interface HandoffPreviewResponse {
  success: boolean;
  result?: {
    schemaVersion: string;
    generatedAt: string;
    systemPrompt: string;
    userPrompt: string;
    checks: string[];
    summary: {
      mapName?: string;
      tileset?: string;
      scriptType?: string;
      confirmedAnchors: number;
      hasFeatureDescription: boolean;
    };
  };
  error?: string;
}

interface SkeletonPreviewResponse {
  success: boolean;
  result?: {
    schemaVersion: string;
    generatedAt: string;
    bridge?: {
      schemaVersion: string;
      generatedAt: string;
      sliceKind: string;
      intentSchema: {
        classification: {
          intentKind: string;
          confidence?: string;
        };
        request: {
          goal: string;
        };
        normalizedMechanics: Record<string, boolean | undefined>;
      };
      hostBinding: {
        schemaVersion: string;
        triggerArea: {
          mode: string;
          sourceAnchorSemanticName: string;
          radius: number;
          rectMaterialization: string;
        };
        shopTarget: {
          mode: string;
          sourceAnchorSemanticName: string;
          bindingSymbol: string;
          shopObjectId?: string;
        };
        shopAction: {
          unlockMechanism: string;
          orderMode: string;
          orderId: number | null;
        };
        unresolvedBindings: string[];
      };
      warnings: string[];
      blockers: string[];
    };
    sidecar?: {
      schemaVersion: string;
      sourceBlueprintId: string;
      triggerSemantics: {
        mode: string;
        source: string;
        playerFilter: string;
        sourceAnchorSemanticName: string;
        centerX: number;
        centerY: number;
        radius: number;
      };
      effectSemantics: {
        mode: string;
        targetAnchorSemanticName: string;
        targetBindingSymbol: string;
        orderMode: string;
        orderId: number | null;
        hintText: string;
        hintDurationSeconds: number;
      };
      writeTargets: Array<{
        target: string;
        pathHint: string;
        status: string;
        rationale: string;
      }>;
      bridgeUpdates: Array<{
        target: string;
        action: string;
        pathHint: string;
        rationale: string;
      }>;
      unresolvedHostBindings: string[];
      notes: string[];
    };
    writePreviewArtifact?: {
      schemaVersion: string;
      summary: {
        sliceKind: string;
        blueprintId: string;
        targetBindingSymbol: string;
        unresolvedBindingCount: number;
      };
      hostBindingManifest: {
        unresolvedHostBindings: string[];
        writeTargets: Array<{
          target: string;
          pathHint: string;
          status: string;
          rationale: string;
        }>;
        bridgeUpdates: Array<{
          target: string;
          action: string;
          pathHint: string;
          rationale: string;
        }>;
      };
      skeletonModule: {
        moduleName: string;
        content: string;
      };
      notes: string[];
    };
    content: string;
  };
  error?: string;
}

interface ConfirmedAnchor extends AnchorSuggestionDTO {
  semanticName: string;
  confirmed: boolean;
  anchorRole?: AnchorRole;
  roleLabel?: string;
}

interface ConfirmedLandmark extends LandmarkSuggestionDTO {
  semanticName: string;
  confirmed: boolean;
  anchorRole?: AnchorRole;
  roleLabel?: string;
}

type SuggestionItem = ConfirmedAnchor | ConfirmedLandmark;

interface War3AnchorPanelProps {
  variant?: 'main' | 'side';
}

// Generate unique ID for manual anchors
let manualAnchorIdCounter = 0;

export function War3AnchorPanel({ variant = 'main' }: War3AnchorPanelProps) {
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
  const [selectedSuggestion, setSelectedSuggestion] = useState<{ type: 'anchor' | 'doodad' | 'manual'; index: number } | null>(null);
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

  const handleLoadAnchors = async () => {
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
      
      setAnchorSuggestions(
        result.anchorCandidates?.suggestions?.map((s) => ({
          ...s,
          semanticName: '',
          confirmed: false,
        })) || []
      );
      
      setDoodadSuggestions(
        result.doodadCandidates?.suggestions?.map((s) => ({
          ...s,
          semanticName: '',
          confirmed: false,
        })) || []
      );
      
      // Clear manual anchors when loading new map
      setManualAnchors([]);
      setIssues(result.issues || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  // Manual anchor creation
  const handleMapClick = useCallback((x: number, y: number) => {
    if (!isManualAnchorMode || !canvasHint) return;

    const regionHint = determineRegionHint(x, y, canvasHint);
    const newAnchor: ConfirmedAnchor = {
      id: `manual-${Date.now()}-${manualAnchorIdCounter++}`,
      x,
      y,
      z: 0,
      kind: 'manual',
      regionHint,
      label: '手动锚点',
      reason: 'manual-map-click',
      semanticName: '',
      confirmed: false,
    };

    setManualAnchors(prev => [...prev, newAnchor]);
    setSelectedSuggestion({ type: 'manual', index: manualAnchors.length });
    setIsManualAnchorMode(false);
  }, [isManualAnchorMode, canvasHint, manualAnchors.length]);

  const updateAnchorSemanticName = (index: number, name: string) => {
    setAnchorSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, semanticName: name } : s))
    );
  };

  const updateDoodadSemanticName = (index: number, name: string) => {
    setDoodadSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, semanticName: name } : s))
    );
  };

  const updateManualAnchorSemanticName = (index: number, name: string) => {
    setManualAnchors((prev) =>
      prev.map((s, i) => (i === index ? { ...s, semanticName: name } : s))
    );
  };

  const updateAnchorRole = (index: number, role: AnchorRole) => {
    setAnchorSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, anchorRole: role, roleLabel: role === 'custom' ? s.roleLabel : undefined } : s))
    );
  };

  const updateDoodadRole = (index: number, role: AnchorRole) => {
    setDoodadSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, anchorRole: role, roleLabel: role === 'custom' ? s.roleLabel : undefined } : s))
    );
  };

  const updateManualAnchorRole = (index: number, role: AnchorRole) => {
    setManualAnchors((prev) =>
      prev.map((s, i) => (i === index ? { ...s, anchorRole: role, roleLabel: role === 'custom' ? s.roleLabel : undefined } : s))
    );
  };

  const updateAnchorRoleLabel = (index: number, label: string) => {
    setAnchorSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, roleLabel: label } : s))
    );
  };

  const updateDoodadRoleLabel = (index: number, label: string) => {
    setDoodadSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, roleLabel: label } : s))
    );
  };

  const updateManualAnchorRoleLabel = (index: number, label: string) => {
    setManualAnchors((prev) =>
      prev.map((s, i) => (i === index ? { ...s, roleLabel: label } : s))
    );
  };

  // Reordering functions for confirmed anchors
  const moveConfirmedItem = (type: 'anchor' | 'doodad' | 'manual', index: number, direction: 'up' | 'down') => {
    if (type === 'anchor') {
      setAnchorSuggestions(prev => {
        const newArr = [...prev];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
        [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
        return newArr;
      });
    } else if (type === 'doodad') {
      setDoodadSuggestions(prev => {
        const newArr = [...prev];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
        [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
        return newArr;
      });
    } else {
      setManualAnchors(prev => {
        const newArr = [...prev];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
        [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
        return newArr;
      });
    }
    // Update selected suggestion index if needed
    if (selectedSuggestion?.type === type) {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0) {
        setSelectedSuggestion({ type, index: targetIndex });
      }
    }
  };

  const confirmAnchor = (index: number) => {
    setAnchorSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, confirmed: true, anchorRole: s.anchorRole || 'poi' } : s))
    );
  };

  const confirmDoodad = (index: number) => {
    setDoodadSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, confirmed: true, anchorRole: s.anchorRole || 'poi' } : s))
    );
  };

  const confirmManualAnchor = (index: number) => {
    setManualAnchors((prev) =>
      prev.map((s, i) => (i === index ? { ...s, confirmed: true, anchorRole: s.anchorRole || 'poi' } : s))
    );
  };

  const unconfirmAnchor = (index: number) => {
    setAnchorSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, confirmed: false } : s))
    );
  };

  const unconfirmDoodad = (index: number) => {
    setDoodadSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, confirmed: false } : s))
    );
  };

  const unconfirmManualAnchor = (index: number) => {
    setManualAnchors((prev) =>
      prev.map((s, i) => (i === index ? { ...s, confirmed: false } : s))
    );
  };

  const removeManualAnchor = (index: number) => {
    setManualAnchors(prev => prev.filter((_, i) => i !== index));
    if (selectedSuggestion?.type === 'manual' && selectedSuggestion.index === index) {
      setSelectedSuggestion(null);
    }
  };

  const handleSelectAnchor = (index: number) => {
    setSelectedSuggestion({ type: 'anchor', index });
  };

  const handleSelectDoodad = (index: number) => {
    setSelectedSuggestion({ type: 'doodad', index });
  };

  const handleSelectManualAnchor = (index: number) => {
    setSelectedSuggestion({ type: 'manual', index });
  };

  const getSelectedSuggestionData = (): SuggestionItem | null => {
    if (!selectedSuggestion) return null;
    if (selectedSuggestion.type === 'anchor') {
      return anchorSuggestions[selectedSuggestion.index] || null;
    }
    if (selectedSuggestion.type === 'doodad') {
      return doodadSuggestions[selectedSuggestion.index] || null;
    }
    return manualAnchors[selectedSuggestion.index] || null;
  };

  const updateSelectedSemanticName = (name: string) => {
    if (!selectedSuggestion) return;
    if (selectedSuggestion.type === 'anchor') {
      updateAnchorSemanticName(selectedSuggestion.index, name);
    } else if (selectedSuggestion.type === 'doodad') {
      updateDoodadSemanticName(selectedSuggestion.index, name);
    } else {
      updateManualAnchorSemanticName(selectedSuggestion.index, name);
    }
  };

  const updateSelectedRole = (role: AnchorRole) => {
    if (!selectedSuggestion) return;
    if (selectedSuggestion.type === 'anchor') {
      updateAnchorRole(selectedSuggestion.index, role);
    } else if (selectedSuggestion.type === 'doodad') {
      updateDoodadRole(selectedSuggestion.index, role);
    } else {
      updateManualAnchorRole(selectedSuggestion.index, role);
    }
  };

  const updateSelectedRoleLabel = (label: string) => {
    if (!selectedSuggestion) return;
    if (selectedSuggestion.type === 'anchor') {
      updateAnchorRoleLabel(selectedSuggestion.index, label);
    } else if (selectedSuggestion.type === 'doodad') {
      updateDoodadRoleLabel(selectedSuggestion.index, label);
    } else {
      updateManualAnchorRoleLabel(selectedSuggestion.index, label);
    }
  };

  const toggleSelectedConfirmation = () => {
    if (!selectedSuggestion) return;
    if (selectedSuggestion.type === 'anchor') {
      const isConfirmed = anchorSuggestions[selectedSuggestion.index]?.confirmed;
      if (isConfirmed) {
        unconfirmAnchor(selectedSuggestion.index);
      } else {
        confirmAnchor(selectedSuggestion.index);
      }
    } else if (selectedSuggestion.type === 'doodad') {
      const isConfirmed = doodadSuggestions[selectedSuggestion.index]?.confirmed;
      if (isConfirmed) {
        unconfirmDoodad(selectedSuggestion.index);
      } else {
        confirmDoodad(selectedSuggestion.index);
      }
    } else {
      const isConfirmed = manualAnchors[selectedSuggestion.index]?.confirmed;
      if (isConfirmed) {
        unconfirmManualAnchor(selectedSuggestion.index);
      } else {
        confirmManualAnchor(selectedSuggestion.index);
      }
    }
  };

  // Get role display info
  const getRoleDisplay = (item: SuggestionItem) => {
    if (!item.anchorRole) return null;
    const role = ANCHOR_ROLES.find(r => r.value === item.anchorRole);
    if (!role) return null;
    const label = item.anchorRole === 'custom' && item.roleLabel 
      ? item.roleLabel 
      : role.label;
    return { ...role, displayLabel: label };
  };

  // Generate context draft from confirmed items (with role info)
  const contextDraft = useMemo(() => {
    const confirmedAnchors = anchorSuggestions.filter(a => a.confirmed);
    const confirmedDoodads = doodadSuggestions.filter(d => d.confirmed);
    const confirmedManual = manualAnchors.filter(m => m.confirmed);
    
    if (confirmedAnchors.length === 0 && confirmedDoodads.length === 0 && confirmedManual.length === 0) {
      return '';
    }

    const lines: string[] = ['已确认地图锚点：'];
    
    confirmedAnchors.forEach((anchor, idx) => {
      const name = anchor.semanticName || anchor.label || anchor.id;
      const roleDisplay = getRoleDisplay(anchor);
      const roleText = roleDisplay ? `[${roleDisplay.displayLabel}] ` : '';
      lines.push(`${idx + 1}. ${roleText}${name} 位于 ${anchor.regionHint} (${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)}, ${anchor.z.toFixed(0)})`);
    });
    
    confirmedDoodads.forEach((doodad, idx) => {
      const name = doodad.semanticName || doodad.label || doodad.id;
      const roleDisplay = getRoleDisplay(doodad);
      const roleText = roleDisplay ? `[${roleDisplay.displayLabel}] ` : '';
      lines.push(`${confirmedAnchors.length + idx + 1}. ${roleText}${name} [装饰物] 位于 ${doodad.regionHint} (${doodad.x.toFixed(0)}, ${doodad.y.toFixed(0)}, ${doodad.z.toFixed(0)})`);
    });

    confirmedManual.forEach((manual, idx) => {
      const name = manual.semanticName || manual.label || manual.id;
      const roleDisplay = getRoleDisplay(manual);
      const roleText = roleDisplay ? `[${roleDisplay.displayLabel}] ` : '';
      lines.push(`${confirmedAnchors.length + confirmedDoodads.length + idx + 1}. ${roleText}${name} [手动] 位于 ${manual.regionHint} (${manual.x.toFixed(0)}, ${manual.y.toFixed(0)}, ${manual.z.toFixed(0)})`);
    });

    return lines.join('\n');
  }, [anchorSuggestions, doodadSuggestions, manualAnchors]);

  // Generate final feature prompt (with role/order info)
  const featurePrompt = useMemo(() => {
    if (!featureDescription.trim()) {
      return '';
    }

    const lines: string[] = [];
    lines.push('在 Warcraft 3 地图中，已确认位置包括：');
    lines.push('');
    
    const confirmedAnchors = anchorSuggestions.filter(a => a.confirmed);
    const confirmedDoodads = doodadSuggestions.filter(d => d.confirmed);
    const confirmedManual = manualAnchors.filter(m => m.confirmed);

    if (confirmedAnchors.length === 0 && confirmedDoodads.length === 0 && confirmedManual.length === 0) {
      lines.push('（暂无已确认的位置锚点）');
    } else {
      confirmedAnchors.forEach((anchor, idx) => {
        const name = anchor.semanticName || anchor.label || anchor.id;
        const roleDisplay = getRoleDisplay(anchor);
        const roleText = roleDisplay ? ` [${roleDisplay.displayLabel}]` : '';
        lines.push(`${idx + 1}. 单位 "${name}"${roleText} 位于 ${anchor.regionHint} 坐标(${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)})`);
      });
      
      confirmedDoodads.forEach((doodad, idx) => {
        const name = doodad.semanticName || doodad.label || doodad.id;
        const roleDisplay = getRoleDisplay(doodad);
        const roleText = roleDisplay ? ` [${roleDisplay.displayLabel}]` : '';
        lines.push(`${confirmedAnchors.length + idx + 1}. 装饰物 "${name}"${roleText} 位于 ${doodad.regionHint} 坐标(${doodad.x.toFixed(0)}, ${doodad.y.toFixed(0)})`);
      });

      confirmedManual.forEach((manual, idx) => {
        const name = manual.semanticName || manual.label || manual.id;
        const roleDisplay = getRoleDisplay(manual);
        const roleText = roleDisplay ? ` [${roleDisplay.displayLabel}]` : '';
        lines.push(`${confirmedAnchors.length + confirmedDoodads.length + idx + 1}. 手动锚点 "${name}"${roleText} 位于 ${manual.regionHint} 坐标(${manual.x.toFixed(0)}, ${manual.y.toFixed(0)})`);
      });
    }

    lines.push('');
    lines.push('请基于这些位置实现以下功能：');
    lines.push(featureDescription.trim());

    return lines.join('\n');
  }, [anchorSuggestions, doodadSuggestions, manualAnchors, featureDescription]);

  // Handoff summary stats
  const handoffStats = useMemo(() => {
    const confirmedAnchors = anchorSuggestions.filter(a => a.confirmed);
    const confirmedDoodads = doodadSuggestions.filter(d => d.confirmed);
    const confirmedManual = manualAnchors.filter(m => m.confirmed);
    const total = confirmedAnchors.length + confirmedDoodads.length + confirmedManual.length;
    
    const roleCount = new Map<string, number>();
    [...confirmedAnchors, ...confirmedDoodads, ...confirmedManual].forEach(item => {
      if (item.anchorRole) {
        const display = getRoleDisplay(item);
        const key = display?.displayLabel || item.anchorRole;
        roleCount.set(key, (roleCount.get(key) || 0) + 1);
      }
    });
    
    const keyRoles = Array.from(roleCount.entries())
      .filter(([, count]) => count > 0)
      .slice(0, 3)
      .map(([role]) => role);
    
    return { total, keyRoles };
  }, [anchorSuggestions, doodadSuggestions, manualAnchors]);

  // Copy to clipboard
  const handleCopyHandoff = async () => {
    if (!featurePrompt) return;
    
    try {
      await navigator.clipboard.writeText(featurePrompt);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      // Fallback: create temporary textarea
      try {
        const textarea = document.createElement('textarea');
        textarea.value = featurePrompt;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } catch {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), 2000);
      }
    }
  };

  const isMain = variant === 'main';
  const hasData = canvasHint || anchorSuggestions.length > 0 || doodadSuggestions.length > 0 || manualAnchors.length > 0;
  const totalSuggestions = anchorSuggestions.length + doodadSuggestions.length + manualAnchors.length;
  const confirmedCount = 
    anchorSuggestions.filter(a => a.confirmed).length + 
    doodadSuggestions.filter(d => d.confirmed).length +
    manualAnchors.filter(m => m.confirmed).length;
  const selectedData = getSelectedSuggestionData();

  // Collect all confirmed items for the confirmed list
  const allConfirmedItems = useMemo(() => {
    const items: Array<{
      type: 'anchor' | 'doodad' | 'manual';
      index: number;
      data: ConfirmedAnchor | ConfirmedLandmark;
    }> = [];
    
    anchorSuggestions.forEach((a, i) => {
      if (a.confirmed) items.push({ type: 'anchor', index: i, data: a });
    });
    doodadSuggestions.forEach((d, i) => {
      if (d.confirmed) items.push({ type: 'doodad', index: i, data: d });
    });
    manualAnchors.forEach((m, i) => {
      if (m.confirmed) items.push({ type: 'manual', index: i, data: m });
    });
    
    return items;
  }, [anchorSuggestions, doodadSuggestions, manualAnchors]);

  const parsedHintDurationSeconds = useMemo(() => {
    const trimmed = hintDurationSeconds.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }, [hintDurationSeconds]);

  const parsedTriggerAreaRadius = useMemo(() => {
    const trimmed = triggerAreaRadius.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }, [triggerAreaRadius]);

  const parsedTriggerAreaWidth = useMemo(() => {
    const trimmed = triggerAreaWidth.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }, [triggerAreaWidth]);

  const parsedTriggerAreaHeight = useMemo(() => {
    const trimmed = triggerAreaHeight.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }, [triggerAreaHeight]);

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
  }, [allConfirmedItems, canvasHint, contextDraft, explicitHintText, featurePrompt, featureDescription, issues, localHostRoot, mapSummary, parsedHintDurationSeconds, parsedTriggerAreaHeight, parsedTriggerAreaRadius, parsedTriggerAreaWidth, shopInteractionMode, shopObjectId, shopOrderId, shopOrderMode, shopTargetMode, shopTargetSourceId, shopUnlockMechanism, targetPlayers, triggerAreaMode, triggerAreaSourceId]);

  const intakeArtifactText = useMemo(() => {
    if (!intakeArtifact) {
      return '';
    }

    return JSON.stringify(intakeArtifact, null, 2);
  }, [intakeArtifact]);

  const handleCopyArtifact = async () => {
    if (!intakeArtifactText) return;

    try {
      await navigator.clipboard.writeText(intakeArtifactText);
      setArtifactCopyStatus('copied');
      setTimeout(() => setArtifactCopyStatus('idle'), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = intakeArtifactText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setArtifactCopyStatus('copied');
        setTimeout(() => setArtifactCopyStatus('idle'), 2000);
      } catch {
        setArtifactCopyStatus('error');
        setTimeout(() => setArtifactCopyStatus('idle'), 2000);
      }
    }
  };

  const handoffBundleText = useMemo(() => {
    if (!handoffPreview) {
      return '';
    }

    return JSON.stringify(handoffPreview, null, 2);
  }, [handoffPreview]);

  const skeletonPreviewText = useMemo(() => {
    if (!skeletonPreview) {
      return '';
    }

    return skeletonPreview.content;
  }, [skeletonPreview]);

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

  const handleGenerateHandoffPreview = async () => {
    if (!intakeArtifact) return;

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
    } catch (e) {
      setHandoffPreviewError(e instanceof Error ? e.message : '生成 handoff preview 失败');
      setHandoffPreview(null);
    } finally {
      setHandoffPreviewLoading(false);
    }
  };

  const handleCopyHandoffBundle = async () => {
    if (!handoffBundleText) return;

    try {
      await navigator.clipboard.writeText(handoffBundleText);
      setHandoffBundleCopyStatus('copied');
      setTimeout(() => setHandoffBundleCopyStatus('idle'), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = handoffBundleText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setHandoffBundleCopyStatus('copied');
        setTimeout(() => setHandoffBundleCopyStatus('idle'), 2000);
      } catch {
        setHandoffBundleCopyStatus('error');
        setTimeout(() => setHandoffBundleCopyStatus('idle'), 2000);
      }
    }
  };

  const handleGenerateSkeletonPreview = async () => {
    if (!intakeArtifact) return;

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
    } catch (e) {
      setSkeletonPreviewError(e instanceof Error ? e.message : '生成 skeleton preview 失败');
      setSkeletonPreview(null);
    } finally {
      setSkeletonPreviewLoading(false);
    }
  };

  const handleCopySkeletonPreview = async () => {
    if (!skeletonPreviewText) return;

    try {
      await navigator.clipboard.writeText(skeletonPreviewText);
      setSkeletonCopyStatus('copied');
      setTimeout(() => setSkeletonCopyStatus('idle'), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = skeletonPreviewText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setSkeletonCopyStatus('copied');
        setTimeout(() => setSkeletonCopyStatus('idle'), 2000);
      } catch {
        setSkeletonCopyStatus('error');
        setTimeout(() => setSkeletonCopyStatus('idle'), 2000);
      }
    }
  };

  return (
    <div className={cn(
      'h-full bg-[#1a1a1a] flex flex-col',
      isMain ? 'flex-1 min-w-0' : 'min-w-[320px] w-[360px] border-l border-white/5'
    )}>
      {/* Header with HostRoot Input */}
      <div className={cn(
        'border-b border-white/5',
        isMain ? 'px-6 py-4' : 'px-4 py-3'
      )}>
        <div className={cn(
          'flex items-center gap-2 mb-3',
          isMain && 'mb-4'
        )}>
          <Anchor className={cn('text-[#818cf8]', isMain ? 'h-5 w-5' : 'h-4 w-4')} />
          <h3 className={cn('font-medium text-white', isMain ? 'text-lg' : 'text-sm')}>
            War3 锚点工作台
          </h3>
        </div>
        
        {/* HostRoot Input - full width in main mode */}
        <div className={cn(
          'flex gap-3',
          isMain ? 'flex-row items-center' : 'flex-col space-y-2'
        )}>
          <Input
            value={localHostRoot}
            onChange={(e) => setLocalHostRoot(e.target.value)}
            placeholder="输入地图目录路径..."
            className={cn(
              'bg-[#252525] border-white/10 text-white placeholder:text-white/30',
              isMain ? 'flex-1 h-10 text-sm' : 'h-8 text-xs'
            )}
          />
          <Button
            onClick={handleLoadAnchors}
            disabled={loading}
            className={cn(
              'bg-[#818cf8] hover:bg-[#6366f1] text-white shrink-0',
              isMain ? 'h-10 px-6 text-sm' : 'h-8 text-xs w-full'
            )}
          >
            {loading ? (
              <>
                <Loader2 className={cn('mr-1.5 animate-spin', isMain ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
                加载中...
              </>
            ) : (
              <>
                <MapPin className={cn('mr-1.5', isMain ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
                加载锚点
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className={cn(
            'mt-3 rounded bg-[#ef4444]/10 text-[#ef4444]',
            isMain ? 'px-3 py-2 text-sm' : 'px-2 py-1.5 text-xs'
          )}>
            {error}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        <ScrollArea className="flex-1">
          <div className={cn(
            'space-y-4',
            isMain ? 'p-6' : 'p-4'
          )}>
            {/* Map Preview Section */}
            {hasData && (
              <div className={cn(
                'bg-[#252525] rounded-lg border border-white/5',
                isMain ? 'p-4' : 'p-3'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white/70">地图预览</span>
                  {canvasHint && (
                    <span className="text-xs text-white/40 ml-auto">
                      {canvasHint.width} × {canvasHint.height}
                    </span>
                  )}
                </div>
                <MapPreview
                  canvasHint={canvasHint}
                  anchorSuggestions={anchorSuggestions}
                  doodadSuggestions={doodadSuggestions}
                  manualAnchors={manualAnchors}
                  selectedSuggestion={selectedSuggestion}
                  onSelectAnchor={handleSelectAnchor}
                  onSelectDoodad={handleSelectDoodad}
                  onSelectManual={handleSelectManualAnchor}
                  onMapClick={handleMapClick}
                  isManualAnchorMode={isManualAnchorMode}
                  compact={!isMain}
                />
                {/* Manual anchor mode toggle */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-white/40">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      <span>单位</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#f59e0b]" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                      <span>装饰物</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
                      <span>手动</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsManualAnchorMode(!isManualAnchorMode)}
                    disabled={!canvasHint}
                    className={cn(
                      'h-7 text-xs px-3',
                      isManualAnchorMode
                        ? 'bg-[#a855f7] hover:bg-[#9333ea] text-white'
                        : 'bg-[#333] hover:bg-[#444] text-white/70'
                    )}
                  >
                    {isManualAnchorMode ? (
                      <><MousePointer2 className="h-3 w-3 mr-1" /> 点击地图添加</>
                    ) : (
                      <><Plus className="h-3 w-3 mr-1" /> 手动锚点</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Selected Suggestion Details */}
            {selectedData && (
              <div className={cn(
                'bg-[#252525] rounded-lg border border-[#818cf8]/30',
                isMain ? 'p-4' : 'p-3'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-[#818cf8]" />
                  <span className="text-sm font-medium text-white/70">选中点详情</span>
                  <Badge 
                    className={cn(
                      'text-[10px] px-1.5 py-0 border-0 ml-auto',
                      selectedData.confirmed 
                        ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                        : 'bg-white/10 text-white/50'
                    )}
                  >
                    {selectedData.confirmed ? '已确认' : '未确认'}
                  </Badge>
                </div>
                <SuggestionDetails
                  suggestion={selectedData}
                  onSemanticNameChange={updateSelectedSemanticName}
                  onToggleConfirm={toggleSelectedConfirmation}
                  onRoleChange={selectedData.confirmed ? updateSelectedRole : undefined}
                  onRoleLabelChange={selectedData.confirmed ? updateSelectedRoleLabel : undefined}
                  compact={!isMain}
                />
              </div>
            )}

            {/* Confirmed Anchors List with Reordering */}
            {confirmedCount > 0 && (
              <div className={cn(
                'bg-[#252525] rounded-lg border border-[#22c55e]/20',
                isMain ? 'p-4' : 'p-3'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                  <span className="text-sm font-medium text-white/70">已确认锚点</span>
                  <Badge className="text-[10px] px-1.5 py-0 bg-[#22c55e]/20 text-[#22c55e] border-0 ml-auto">
                    {confirmedCount} 个
                  </Badge>
                </div>
                <div className="space-y-2">
                  {allConfirmedItems.map((item, listIndex) => {
                    const roleDisplay = getRoleDisplay(item.data);
                    const isFirst = listIndex === 0;
                    const isLast = listIndex === allConfirmedItems.length - 1;
                    
                    return (
                      <div
                        key={`${item.type}-${item.index}`}
                        onClick={() => setSelectedSuggestion({ type: item.type, index: item.index })}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors',
                          selectedSuggestion?.type === item.type && selectedSuggestion?.index === item.index
                            ? 'bg-[#333] border-[#818cf8]/50'
                            : 'bg-[#1a1a1a] border-white/5 hover:border-white/10'
                        )}
                      >
                        <span className="text-[10px] text-white/30 w-5 text-center">{listIndex + 1}</span>
                        
                        {roleDisplay && (
                          <Badge 
                            className="text-[10px] px-1.5 py-0 border-0 shrink-0"
                            style={{ backgroundColor: `${roleDisplay.color}20`, color: roleDisplay.color }}
                          >
                            {roleDisplay.displayLabel}
                          </Badge>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 truncate">
                            {item.data.semanticName || item.data.label || item.data.id}
                          </p>
                          <p className="text-[10px] text-white/40 truncate">
                            {item.type === 'anchor' ? '单位' : item.type === 'doodad' ? '装饰物' : '手动'} · {item.data.regionHint}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveConfirmedItem(item.type, item.index, 'up');
                            }}
                            disabled={isFirst}
                            className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ChevronUp className="h-3 w-3 text-white/50" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveConfirmedItem(item.type, item.index, 'down');
                            }}
                            disabled={isLast}
                            className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ChevronDown className="h-3 w-3 text-white/50" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-white/30 mt-2">
                  点击项目查看详情，使用箭头调整顺序
                </p>
              </div>
            )}

            {/* Feature Prompt Builder Section */}
            {hasData && (
              <div className={cn(
                'bg-[#252525] rounded-lg border border-[#818cf8]/20',
                isMain ? 'p-4' : 'p-3'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-[#818cf8]" />
                  <span className="text-sm font-medium text-white/70">Feature Prompt Builder</span>
                  {confirmedCount > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-[#818cf8]/20 text-[#818cf8] border-0 ml-auto">
                      {confirmedCount} 个已确认锚点
                    </Badge>
                  )}
                </div>
                
                {/* Feature Description Input */}
                <div className="mb-3">
                  <p className="text-[10px] text-white/40 mb-1.5">描述你想实现的功能</p>
                  <Textarea
                    value={featureDescription}
                    onChange={(e) => setFeatureDescription(e.target.value)}
                    placeholder="例如：在地图中央创建一个商店区域，玩家可以在这里购买装备..."
                    className={cn(
                      'bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 resize-none',
                      isMain ? 'min-h-[80px] text-sm' : 'min-h-[60px] text-xs'
                    )}
                  />
                </div>

                <div className="mb-3">
                  <p className="text-[10px] text-white/40 mb-1.5">补充输入</p>
                  <div className={cn(
                    'grid gap-2',
                    isMain ? 'grid-cols-2' : 'grid-cols-1'
                  )}>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">商店交互模式</p>
                      <Input
                        value={shopInteractionMode}
                        onChange={(e) => setShopInteractionMode(e.target.value)}
                        placeholder="open-shop-ui / grant-item / unlock-purchase"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">目标玩家</p>
                      <Input
                        value={targetPlayers}
                        onChange={(e) => setTargetPlayers(e.target.value)}
                        placeholder="all-players / player-1 / owner-only"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">欢迎提示时长（秒）</p>
                      <Input
                        value={hintDurationSeconds}
                        onChange={(e) => setHintDurationSeconds(e.target.value)}
                        placeholder="5"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">显式提示文案</p>
                      <Input
                        value={explicitHintText}
                        onChange={(e) => setExplicitHintText(e.target.value)}
                        placeholder="Welcome to the mid zone!"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">商店对象 ID / 代理单位 ID</p>
                      <Input
                        value={shopObjectId}
                        onChange={(e) => setShopObjectId(e.target.value)}
                        placeholder="nmrk / hfoo / custom-shop-proxy"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">商店目标模式</p>
                      <Input
                        value={shopTargetMode}
                        onChange={(e) => setShopTargetMode(e.target.value)}
                        placeholder="unknown / existing-anchor / existing-unit-id / generated-proxy"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">商店目标来源 ID</p>
                      <Input
                        value={shopTargetSourceId}
                        onChange={(e) => setShopTargetSourceId(e.target.value)}
                        placeholder="central_shop_proxy / gg_unit_nmrk_0001"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">商店解锁机制</p>
                      <Input
                        value={shopUnlockMechanism}
                        onChange={(e) => setShopUnlockMechanism(e.target.value)}
                        placeholder="unknown / issue-order / enable-ability / custom-event"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">商店命令模式</p>
                      <Input
                        value={shopOrderMode}
                        onChange={(e) => setShopOrderMode(e.target.value)}
                        placeholder="unknown / target-order-by-id / neutral-target-order-by-id"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">商店命令 ID</p>
                      <Input
                        value={shopOrderId}
                        onChange={(e) => setShopOrderId(e.target.value)}
                        placeholder="852566"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">触发区域模式</p>
                      <Input
                        value={triggerAreaMode}
                        onChange={(e) => setTriggerAreaMode(e.target.value)}
                        placeholder="unknown / existing-region / generated-radius / generated-rect"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">触发区域来源 ID</p>
                      <Input
                        value={triggerAreaSourceId}
                        onChange={(e) => setTriggerAreaSourceId(e.target.value)}
                        placeholder="gg_rct_mid_trigger_zone / editor-region-id"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">触发区域半径</p>
                      <Input
                        value={triggerAreaRadius}
                        onChange={(e) => setTriggerAreaRadius(e.target.value)}
                        placeholder="256"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">触发区域宽度</p>
                      <Input
                        value={triggerAreaWidth}
                        onChange={(e) => setTriggerAreaWidth(e.target.value)}
                        placeholder="512"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">触发区域高度</p>
                      <Input
                        value={triggerAreaHeight}
                        onChange={(e) => setTriggerAreaHeight(e.target.value)}
                        placeholder="512"
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Generated Prompt Output */}
                <div>
                  <p className="text-[10px] text-white/40 mb-1.5">生成的完整 Prompt</p>
                  {featurePrompt ? (
                    <Textarea
                      value={featurePrompt}
                      readOnly
                      className={cn(
                        'bg-[#1a1a1a] border-white/10 text-white/80 font-mono resize-none',
                        isMain ? 'min-h-[140px] text-xs' : 'min-h-[100px] text-[10px]'
                      )}
                    />
                  ) : (
                    <div className="rounded bg-[#1a1a1a] border border-white/5 px-3 py-6 text-center">
                      <p className="text-white/40 text-xs">
                        {confirmedCount > 0 
                          ? '输入功能描述以生成完整 Prompt' 
                          : '确认锚点后，输入功能描述以生成 Prompt'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Handoff Entry */}
                {(featurePrompt || intakeArtifactText) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight className="h-4 w-4 text-[#22c55e]" />
                      <span className="text-sm font-medium text-white/70">下一步入口</span>
                    </div>
                    
                    <div className="bg-[#1a1a1a] rounded-lg border border-[#22c55e]/20 p-3">
                      {/* Summary */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-white/80">
                            {handoffStats.total} 个已确认锚点
                            {handoffStats.keyRoles.length > 0 && (
                              <span className="text-white/50"> · 包含 {handoffStats.keyRoles.join('、')} 等关键角色</span>
                            )}
                          </p>
                          {(mapSummary?.name || mapSummary?.tileset || mapSummary?.scriptType !== undefined) && (
                            <p className="text-[10px] text-white/45 mt-1">
                              {mapSummary?.name || '未命名地图'}
                              {mapSummary?.tileset ? ` · Tileset ${mapSummary.tileset}` : ''}
                              {mapSummary?.scriptType !== undefined ? ` · ${mapSummary.scriptType === 1 ? 'Lua' : 'Jass'}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Handoff Prompt Preview */}
                      {featurePrompt && (
                        <div className="mb-3">
                          <p className="text-[10px] text-white/40 mb-1.5">Prompt 预览</p>
                          <div className="bg-[#252525] rounded border border-white/5 p-2 max-h-24 overflow-y-auto">
                            <pre className="text-[10px] text-white/60 font-mono whitespace-pre-wrap">
                              {featurePrompt.slice(0, 200)}{featurePrompt.length > 200 ? '...' : ''}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Structured intake artifact */}
                      {intakeArtifactText && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-[10px] text-white/40">Intake Artifact</p>
                            <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/60 border-0">
                              war3-intake/v1
                            </Badge>
                          </div>
                          <Textarea
                            value={intakeArtifactText}
                            readOnly
                            className={cn(
                              'bg-[#252525] border-white/5 text-white/70 font-mono resize-none',
                              isMain ? 'min-h-[220px] text-[10px]' : 'min-h-[160px] text-[10px]'
                            )}
                          />
                        </div>
                      )}

                      {handoffPreview && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-[10px] text-white/40">LLM Handoff Bundle</p>
                            <Badge className="text-[10px] px-1.5 py-0 bg-[#22c55e]/15 text-[#22c55e] border-0">
                              {handoffPreview.schemaVersion}
                            </Badge>
                          </div>
                          <Textarea
                            value={handoffBundleText}
                            readOnly
                            className={cn(
                              'bg-[#252525] border-white/5 text-white/70 font-mono resize-none',
                              isMain ? 'min-h-[240px] text-[10px]' : 'min-h-[180px] text-[10px]'
                            )}
                          />
                        </div>
                      )}

                      {skeletonPreview && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-[10px] text-white/40">War3 Skeleton Preview</p>
                            <Badge className="text-[10px] px-1.5 py-0 bg-[#f59e0b]/15 text-[#f59e0b] border-0">
                              {skeletonPreview.schemaVersion}
                            </Badge>
                          </div>
                          <Textarea
                            value={skeletonPreviewText}
                            readOnly
                            className={cn(
                              'bg-[#252525] border-white/5 text-white/70 font-mono resize-none',
                              isMain ? 'min-h-[220px] text-[10px]' : 'min-h-[160px] text-[10px]'
                            )}
                          />
                        </div>
                      )}

                      {bridgePreview && (
                        <div className="mb-3 rounded-lg border border-[#818cf8]/20 bg-[#818cf8]/8 px-3 py-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div>
                              <p className="text-[10px] text-white/40">War3 Bridge Preview</p>
                              <p className="text-[11px] text-white/70 mt-0.5">
                                {bridgePreview.sliceKind} {" to "} intent / host binding
                              </p>
                            </div>
                            <Badge className="text-[10px] px-1.5 py-0 bg-[#818cf8]/15 text-[#818cf8] border-0">
                              {bridgePreview.schemaVersion}
                            </Badge>
                          </div>

                          <div className="grid gap-2 mb-2">
                            <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-[10px] text-white/40">Intent</p>
                                <div className="flex items-center gap-1.5">
                                  <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/80 border-0">
                                    {bridgePreview.intentSchema.classification.intentKind}
                                  </Badge>
                                  {bridgePreview.intentSchema.classification.confidence && (
                                    <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/60 border-0">
                                      {bridgePreview.intentSchema.classification.confidence}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-white/80 leading-relaxed">
                                {bridgePreview.intentSchema.request.goal}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {bridgeMechanics.length > 0 ? (
                                  bridgeMechanics.map((mechanic) => (
                                    <Badge
                                      key={mechanic}
                                      className="text-[10px] px-1.5 py-0 bg-[#22c55e]/15 text-[#22c55e] border-0"
                                    >
                                      {mechanic}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-white/35">no enabled normalized mechanics</span>
                                )}
                              </div>
                            </div>

                            <div className="grid gap-2 md:grid-cols-3">
                              <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
                                <p className="text-[10px] text-white/40 mb-1">Trigger Area</p>
                                <p className="text-[11px] text-white/75">mode: {bridgePreview.hostBinding.triggerArea.mode}</p>
                                <p className="text-[11px] text-white/75">anchor: {bridgePreview.hostBinding.triggerArea.sourceAnchorSemanticName || 'unknown'}</p>
                                <p className="text-[11px] text-white/75">radius: {bridgePreview.hostBinding.triggerArea.radius}</p>
                                <p className="text-[11px] text-white/55 mt-1">
                                  {bridgePreview.hostBinding.triggerArea.rectMaterialization}
                                </p>
                              </div>

                              <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
                                <p className="text-[10px] text-white/40 mb-1">Shop Target</p>
                                <p className="text-[11px] text-white/75">mode: {bridgePreview.hostBinding.shopTarget.mode}</p>
                                <p className="text-[11px] text-white/75">anchor: {bridgePreview.hostBinding.shopTarget.sourceAnchorSemanticName || 'unknown'}</p>
                                <p className="text-[11px] text-white/75">symbol: {bridgePreview.hostBinding.shopTarget.bindingSymbol || 'unknown'}</p>
                                <p className="text-[11px] text-white/55 mt-1">
                                  shopObjectId: {bridgePreview.hostBinding.shopTarget.shopObjectId || 'unknown'}
                                </p>
                              </div>

                              <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
                                <p className="text-[10px] text-white/40 mb-1">Shop Action</p>
                                <p className="text-[11px] text-white/75">unlock: {bridgePreview.hostBinding.shopAction.unlockMechanism}</p>
                                <p className="text-[11px] text-white/75">order mode: {bridgePreview.hostBinding.shopAction.orderMode}</p>
                                <p className="text-[11px] text-white/75">
                                  order id: {bridgePreview.hostBinding.shopAction.orderId ?? 'unknown'}
                                </p>
                              </div>
                            </div>

                            <div className="grid gap-2 md:grid-cols-3">
                              <BridgeListCard
                                title="Warnings"
                                items={bridgePreview.warnings}
                                emptyLabel="no warnings"
                                tone="warning"
                              />
                              <BridgeListCard
                                title="Blockers"
                                items={bridgePreview.blockers}
                                emptyLabel="no blockers"
                                tone="error"
                              />
                              <BridgeListCard
                                title="Unresolved Bindings"
                                items={bridgePreview.hostBinding.unresolvedBindings}
                                emptyLabel="no unresolved bindings"
                                tone="neutral"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {sidecarPreview && (
                        <div className="mb-3 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/8 px-3 py-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div>
                              <p className="text-[10px] text-white/40">War3 Assembly Sidecar</p>
                              <p className="text-[11px] text-white/70 mt-0.5">
                                blueprint: {sidecarPreview.sourceBlueprintId}
                              </p>
                            </div>
                            <Badge className="text-[10px] px-1.5 py-0 bg-[#22c55e]/15 text-[#22c55e] border-0">
                              {sidecarPreview.schemaVersion}
                            </Badge>
                          </div>

                          <div className="grid gap-2 mb-2 md:grid-cols-2">
                            <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
                              <p className="text-[10px] text-white/40 mb-1">Trigger Semantics</p>
                              <p className="text-[11px] text-white/75">mode: {sidecarPreview.triggerSemantics.mode}</p>
                              <p className="text-[11px] text-white/75">source: {sidecarPreview.triggerSemantics.source}</p>
                              <p className="text-[11px] text-white/75">
                                anchor: {sidecarPreview.triggerSemantics.sourceAnchorSemanticName || 'unknown'}
                              </p>
                              <p className="text-[11px] text-white/75">
                                center: {sidecarPreview.triggerSemantics.centerX}, {sidecarPreview.triggerSemantics.centerY}
                              </p>
                              <p className="text-[11px] text-white/55 mt-1">
                                radius: {sidecarPreview.triggerSemantics.radius} / filter: {sidecarPreview.triggerSemantics.playerFilter}
                              </p>
                            </div>

                            <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
                              <p className="text-[10px] text-white/40 mb-1">Effect Semantics</p>
                              <p className="text-[11px] text-white/75">mode: {sidecarPreview.effectSemantics.mode}</p>
                              <p className="text-[11px] text-white/75">
                                target: {sidecarPreview.effectSemantics.targetAnchorSemanticName || 'unknown'}
                              </p>
                              <p className="text-[11px] text-white/75">
                                symbol: {sidecarPreview.effectSemantics.targetBindingSymbol || 'unknown'}
                              </p>
                              <p className="text-[11px] text-white/75">
                                order: {sidecarPreview.effectSemantics.orderMode} / {sidecarPreview.effectSemantics.orderId ?? 'unknown'}
                              </p>
                              <p className="text-[11px] text-white/55 mt-1">
                                hint: {sidecarPreview.effectSemantics.hintText} ({sidecarPreview.effectSemantics.hintDurationSeconds}s)
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-3">
                            <BridgeListCard
                              title="Write Targets"
                              items={sidecarPreview.writeTargets.map((item) => `${item.target}: ${item.pathHint}`)}
                              emptyLabel="no write target hints"
                              tone="neutral"
                            />
                            <BridgeListCard
                              title="Bridge Updates"
                              items={sidecarPreview.bridgeUpdates.map((item) => `${item.action}: ${item.pathHint}`)}
                              emptyLabel="no bridge update hints"
                              tone="neutral"
                            />
                            <BridgeListCard
                              title="Unresolved Bindings"
                              items={sidecarPreview.unresolvedHostBindings}
                              emptyLabel="no unresolved bindings"
                              tone="warning"
                            />
                          </div>
                        </div>
                      )}

                      {writePreviewArtifact && (
                        <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div>
                              <p className="text-[10px] text-white/40">War3 Write Preview Artifact</p>
                              <p className="text-[11px] text-white/70 mt-0.5">
                                {writePreviewArtifact.summary.sliceKind} / {writePreviewArtifact.summary.blueprintId}
                              </p>
                            </div>
                            <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white/80 border-0">
                              {writePreviewArtifact.schemaVersion}
                            </Badge>
                          </div>

                          <div className="grid gap-2 md:grid-cols-3">
                            <div className="rounded border border-white/6 bg-[#202020] px-2.5 py-2">
                              <p className="text-[10px] text-white/40 mb-1">Summary</p>
                              <p className="text-[11px] text-white/75">
                                symbol: {writePreviewArtifact.summary.targetBindingSymbol || 'unknown'}
                              </p>
                              <p className="text-[11px] text-white/75">
                                unresolved: {writePreviewArtifact.summary.unresolvedBindingCount}
                              </p>
                            </div>
                            <BridgeListCard
                              title="Manifest Targets"
                              items={writePreviewArtifact.hostBindingManifest.writeTargets.map((item) => `${item.target}: ${item.pathHint}`)}
                              emptyLabel="no manifest targets"
                              tone="neutral"
                            />
                            <BridgeListCard
                              title="Manifest Updates"
                              items={writePreviewArtifact.hostBindingManifest.bridgeUpdates.map((item) => `${item.action}: ${item.pathHint}`)}
                              emptyLabel="no manifest updates"
                              tone="neutral"
                            />
                          </div>
                        </div>
                      )}

                      {handoffPreviewError && (
                        <div className="mb-3 rounded border border-[#ef4444]/20 bg-[#ef4444]/10 px-3 py-2">
                          <p className="text-[10px] text-[#ef4444]">{handoffPreviewError}</p>
                        </div>
                      )}

                      {skeletonPreviewError && (
                        <div className="mb-3 rounded border border-[#ef4444]/20 bg-[#ef4444]/10 px-3 py-2">
                          <p className="text-[10px] text-[#ef4444]">{skeletonPreviewError}</p>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {featurePrompt && (
                          <Button
                            onClick={handleCopyHandoff}
                            className={cn(
                              'flex-1 text-xs h-8',
                              copyStatus === 'copied' 
                                ? 'bg-[#22c55e] hover:bg-[#22c55e] text-white'
                                : copyStatus === 'error'
                                ? 'bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444]'
                                : 'bg-[#818cf8] hover:bg-[#6366f1] text-white'
                            )}
                          >
                            {copyStatus === 'copied' ? (
                              <><Check className="h-3.5 w-3.5 mr-1.5" /> 已复制 Prompt</>
                            ) : copyStatus === 'error' ? (
                              <><XCircle className="h-3.5 w-3.5 mr-1.5" /> Prompt 复制失败</>
                            ) : (
                              <><Copy className="h-3.5 w-3.5 mr-1.5" /> 复制 Prompt</>
                            )}
                          </Button>
                        )}
                        {intakeArtifactText && (
                          <Button
                            onClick={handleCopyArtifact}
                            className={cn(
                              'flex-1 text-xs h-8',
                              artifactCopyStatus === 'copied'
                                ? 'bg-[#22c55e] hover:bg-[#22c55e] text-white'
                                : artifactCopyStatus === 'error'
                                ? 'bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444]'
                                : 'bg-white/10 hover:bg-white/15 text-white'
                            )}
                          >
                            {artifactCopyStatus === 'copied' ? (
                              <><Check className="h-3.5 w-3.5 mr-1.5" /> 已复制 Artifact</>
                            ) : artifactCopyStatus === 'error' ? (
                              <><XCircle className="h-3.5 w-3.5 mr-1.5" /> Artifact 复制失败</>
                            ) : (
                              <><Copy className="h-3.5 w-3.5 mr-1.5" /> 复制 Artifact</>
                            )}
                          </Button>
                        )}
                        {intakeArtifactText && (
                          <Button
                            onClick={handleGenerateHandoffPreview}
                            disabled={handoffPreviewLoading}
                            className="flex-1 text-xs h-8 bg-[#22c55e]/15 hover:bg-[#22c55e]/25 text-[#22c55e]"
                          >
                            {handoffPreviewLoading ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 生成 Bundle...</>
                            ) : (
                              <><ArrowRight className="h-3.5 w-3.5 mr-1.5" /> 生成 LLM Bundle</>
                            )}
                          </Button>
                        )}
                        {handoffBundleText && (
                          <Button
                            onClick={handleCopyHandoffBundle}
                            className={cn(
                              'flex-1 text-xs h-8',
                              handoffBundleCopyStatus === 'copied'
                                ? 'bg-[#22c55e] hover:bg-[#22c55e] text-white'
                                : handoffBundleCopyStatus === 'error'
                                ? 'bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444]'
                                : 'bg-white/10 hover:bg-white/15 text-white'
                            )}
                          >
                            {handoffBundleCopyStatus === 'copied' ? (
                              <><Check className="h-3.5 w-3.5 mr-1.5" /> 已复制 Bundle</>
                            ) : handoffBundleCopyStatus === 'error' ? (
                              <><XCircle className="h-3.5 w-3.5 mr-1.5" /> Bundle 复制失败</>
                            ) : (
                              <><Copy className="h-3.5 w-3.5 mr-1.5" /> 复制 Bundle</>
                            )}
                          </Button>
                        )}
                        {intakeArtifactText && (
                          <Button
                            onClick={handleGenerateSkeletonPreview}
                            disabled={skeletonPreviewLoading}
                            className="flex-1 text-xs h-8 bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#f59e0b]"
                          >
                            {skeletonPreviewLoading ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 生成 Skeleton...</>
                            ) : (
                              <><ArrowRight className="h-3.5 w-3.5 mr-1.5" /> 生成 Skeleton Preview</>
                            )}
                          </Button>
                        )}
                        {skeletonPreviewText && (
                          <Button
                            onClick={handleCopySkeletonPreview}
                            className={cn(
                              'flex-1 text-xs h-8',
                              skeletonCopyStatus === 'copied'
                                ? 'bg-[#22c55e] hover:bg-[#22c55e] text-white'
                                : skeletonCopyStatus === 'error'
                                ? 'bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444]'
                                : 'bg-white/10 hover:bg-white/15 text-white'
                            )}
                          >
                            {skeletonCopyStatus === 'copied' ? (
                              <><Check className="h-3.5 w-3.5 mr-1.5" /> 已复制 Skeleton</>
                            ) : skeletonCopyStatus === 'error' ? (
                              <><XCircle className="h-3.5 w-3.5 mr-1.5" /> Skeleton 复制失败</>
                            ) : (
                              <><Copy className="h-3.5 w-3.5 mr-1.5" /> 复制 Skeleton</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Context Draft Section (kept for reference) */}
            {(anchorSuggestions.length > 0 || doodadSuggestions.length > 0 || manualAnchors.length > 0) && (
              <div className={cn(
                'bg-[#252525] rounded-lg border border-white/5',
                isMain ? 'p-4' : 'p-3'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white/70">锚点上下文草稿</span>
                  {confirmedCount > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-[#818cf8]/20 text-[#818cf8] border-0 ml-auto">
                      {confirmedCount} 个已确认
                    </Badge>
                  )}
                </div>
                {contextDraft ? (
                  <Textarea
                    value={contextDraft}
                    readOnly
                    className={cn(
                      'bg-[#1a1a1a] border-white/10 text-white/80 font-mono resize-none',
                      isMain ? 'min-h-[100px] text-xs' : 'min-h-[60px] text-[10px]'
                    )}
                  />
                ) : (
                  <div className="rounded bg-[#1a1a1a] border border-white/5 px-3 py-4 text-center">
                    <p className="text-white/40 text-xs">暂无已确认的锚点</p>
                    <p className="text-white/30 text-[10px] mt-1">确认锚点后将在此处生成上下文文本</p>
                  </div>
                )}
              </div>
            )}

            {/* Map Overview & Stats */}
            {canvasHint && (
              <div className={cn(
                'bg-[#252525] rounded-lg border border-white/5',
                isMain ? 'p-4' : 'p-3'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <Box className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white/70">地图概览</span>
                </div>
                <div className={cn(
                  'grid gap-4',
                  isMain ? 'grid-cols-4' : 'grid-cols-2 gap-2'
                )}>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">尺寸</p>
                    <p className="text-sm font-mono text-white/80">{canvasHint.width} × {canvasHint.height}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">偏移</p>
                    <p className="text-sm font-mono text-white/80">({canvasHint.offsetX}, {canvasHint.offsetY})</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">总建议</p>
                    <p className="text-sm font-mono text-white/80">{totalSuggestions}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">已确认</p>
                    <p className={cn(
                      'text-sm font-mono',
                      confirmedCount > 0 ? 'text-[#22c55e]' : 'text-white/80'
                    )}>
                      {confirmedCount}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Anchors Section */}
            {manualAnchors.length > 0 && (
              <div className={cn(
                'bg-[#252525] rounded-lg border border-white/5',
                isMain ? 'p-4' : 'p-3'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <MousePointer2 className="h-4 w-4 text-[#a855f7]" />
                  <span className="text-sm font-medium text-white/70">
                    手动锚点 ({manualAnchors.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {manualAnchors.map((anchor, index) => (
                    <ManualAnchorCard
                      key={anchor.id}
                      anchor={anchor}
                      selected={selectedSuggestion?.type === 'manual' && selectedSuggestion.index === index}
                      onSemanticNameChange={(name) => updateManualAnchorSemanticName(index, name)}
                      onConfirm={() => confirmManualAnchor(index)}
                      onUnconfirm={() => unconfirmManualAnchor(index)}
                      onSelect={() => handleSelectManualAnchor(index)}
                      onRemove={() => removeManualAnchor(index)}
                      compact={!isMain}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions Grid - 2 columns in main mode */}
            {(anchorSuggestions.length > 0 || doodadSuggestions.length > 0) && (
              <div className={cn(
                'grid gap-4',
                isMain ? 'grid-cols-2' : 'grid-cols-1'
              )}>
                {/* Anchor Suggestions */}
                {anchorSuggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Anchor className="h-4 w-4 text-[#22c55e]" />
                      <span className="text-sm font-medium text-white/70">
                        单位锚点 ({anchorSuggestions.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {anchorSuggestions.map((suggestion, index) => (
                        <SuggestionCard
                          key={`anchor-${index}`}
                          suggestion={suggestion}
                          semanticName={suggestion.semanticName}
                          confirmed={suggestion.confirmed}
                          selected={selectedSuggestion?.type === 'anchor' && selectedSuggestion.index === index}
                          onSemanticNameChange={(name) => updateAnchorSemanticName(index, name)}
                          onConfirm={() => confirmAnchor(index)}
                          onUnconfirm={() => unconfirmAnchor(index)}
                          onSelect={() => handleSelectAnchor(index)}
                          showOwner
                          compact={!isMain}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Doodad Suggestions */}
                {doodadSuggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Box className="h-4 w-4 text-[#f59e0b]" />
                      <span className="text-sm font-medium text-white/70">
                        装饰物地标 ({doodadSuggestions.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {doodadSuggestions.map((suggestion, index) => (
                        <SuggestionCard
                          key={`doodad-${index}`}
                          suggestion={suggestion}
                          semanticName={suggestion.semanticName}
                          confirmed={suggestion.confirmed}
                          selected={selectedSuggestion?.type === 'doodad' && selectedSuggestion.index === index}
                          onSemanticNameChange={(name) => updateDoodadSemanticName(index, name)}
                          onConfirm={() => confirmDoodad(index)}
                          onUnconfirm={() => unconfirmDoodad(index)}
                          onSelect={() => handleSelectDoodad(index)}
                          compact={!isMain}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Issues */}
            {issues.length > 0 && (
              <div className="bg-[#f59e0b]/10 rounded-lg p-3 border border-[#f59e0b]/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[#f59e0b]">注意</span>
                </div>
                <ul className="space-y-1">
                  {issues.map((issue, i) => (
                    <li key={i} className="text-xs text-white/50">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty State - Gentle Guidance */}
            {!loading && !error && !hasData && (
              <div className={cn(
                'text-center',
                isMain ? 'py-16' : 'py-8'
              )}>
                <div className={cn(
                  'rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4',
                  isMain ? 'w-20 h-20' : 'w-16 h-16'
                )}>
                  <Compass className={cn('text-white/20', isMain ? 'h-10 w-10' : 'h-8 w-8')} />
                </div>
                <p className={cn('text-white/50 mb-2', isMain ? 'text-base' : 'text-xs')}>
                  输入地图目录路径并点击"加载锚点"
                </p>
                <p className={cn('text-white/30', isMain ? 'text-sm' : 'text-[10px]')}>
                  系统将解析 War3 地图中的单位和装饰物数据
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Map Preview Component
interface MapPreviewProps {
  canvasHint: CanvasHintDTO | null;
  anchorSuggestions: ConfirmedAnchor[];
  doodadSuggestions: ConfirmedLandmark[];
  manualAnchors: ConfirmedAnchor[];
  selectedSuggestion: { type: 'anchor' | 'doodad' | 'manual'; index: number } | null;
  onSelectAnchor: (index: number) => void;
  onSelectDoodad: (index: number) => void;
  onSelectManual: (index: number) => void;
  onMapClick: (x: number, y: number) => void;
  isManualAnchorMode: boolean;
  compact?: boolean;
}

function MapPreview({
  canvasHint,
  anchorSuggestions,
  doodadSuggestions,
  manualAnchors,
  selectedSuggestion,
  onSelectAnchor,
  onSelectDoodad,
  onSelectManual,
  onMapClick,
  isManualAnchorMode,
  compact = false,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Default dimensions when no canvasHint (world-space)
  const defaultWidth = 512;
  const defaultHeight = 512;
  
  // Map canvas grid dimensions to world-space: width * 128, height * 128
  const mapWidth = canvasHint ? canvasHint.width * 128 : defaultWidth;
  const mapHeight = canvasHint ? canvasHint.height * 128 : defaultHeight;
  const offsetX = canvasHint?.offsetX ?? 0;
  const offsetY = canvasHint?.offsetY ?? 0;

  // Calculate map bounds for coordinate mapping
  const minX = offsetX;
  const minY = offsetY;

  // Map world coordinates to percentage positions
  const worldToPercent = (x: number, y: number) => {
    const px = ((x - minX) / mapWidth) * 100;
    const py = ((y - minY) / mapHeight) * 100;
    return { x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, py)) };
  };

  // Convert percentage to world coordinates
  const percentToWorld = (px: number, py: number) => {
    const x = (px / 100) * mapWidth + minX;
    const y = (py / 100) * mapHeight + minY;
    return { x, y };
  };

  const hasValidHint = canvasHint !== null;

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!isManualAnchorMode || !containerRef.current || !hasValidHint) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const worldPos = percentToWorld(px, py);
    
    onMapClick(worldPos.x, worldPos.y);
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleContainerClick}
      className={cn(
        'relative bg-[#1a1a1a] rounded border border-white/10 overflow-hidden',
        isManualAnchorMode && hasValidHint && 'cursor-crosshair',
        compact ? 'h-40' : 'h-64'
      )}
    >
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20% 20%',
        }}
      />

      {/* Manual anchor mode indicator */}
      {isManualAnchorMode && hasValidHint && (
        <div className="absolute top-2 left-2 bg-[#a855f7]/90 text-white text-[10px] px-2 py-1 rounded z-10">
          点击地图添加锚点
        </div>
      )}

      {!hasValidHint && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/30 text-xs">无地图尺寸信息</span>
        </div>
      )}

      {/* Anchor points */}
      {anchorSuggestions.map((suggestion, index) => {
        const pos = worldToPercent(suggestion.x, suggestion.y);
        const isSelected = selectedSuggestion?.type === 'anchor' && selectedSuggestion.index === index;
        const isConfirmed = suggestion.confirmed;
        
        return (
          <button
            key={`map-anchor-${index}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAnchor(index);
            }}
            className={cn(
              'absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all',
              'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/50',
              isConfirmed ? 'bg-[#22c55e]' : 'bg-[#22c55e]/60',
              isSelected && 'ring-2 ring-white scale-125 shadow-lg shadow-[#22c55e]/50'
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
            title={`${suggestion.label || suggestion.id} (${suggestion.x.toFixed(0)}, ${suggestion.y.toFixed(0)})`}
          />
        );
      })}

      {/* Doodad points */}
      {doodadSuggestions.map((suggestion, index) => {
        const pos = worldToPercent(suggestion.x, suggestion.y);
        const isSelected = selectedSuggestion?.type === 'doodad' && selectedSuggestion.index === index;
        const isConfirmed = suggestion.confirmed;
        
        return (
          <button
            key={`map-doodad-${index}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDoodad(index);
            }}
            className={cn(
              'absolute w-3 h-3 transform -translate-x-1/2 -translate-y-1/2 transition-all',
              'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/50',
              isConfirmed ? 'bg-[#f59e0b]' : 'bg-[#f59e0b]/60',
              isSelected && 'ring-2 ring-white scale-125 shadow-lg shadow-[#f59e0b]/50'
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
            title={`${suggestion.label || suggestion.id} (${suggestion.x.toFixed(0)}, ${suggestion.y.toFixed(0)})`}
          />
        );
      })}

      {/* Manual anchor points */}
      {manualAnchors.map((anchor, index) => {
        const pos = worldToPercent(anchor.x, anchor.y);
        const isSelected = selectedSuggestion?.type === 'manual' && selectedSuggestion.index === index;
        const isConfirmed = anchor.confirmed;
        
        return (
          <button
            key={`map-manual-${anchor.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectManual(index);
            }}
            className={cn(
              'absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all',
              'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/50',
              isConfirmed ? 'bg-[#a855f7]' : 'bg-[#a855f7]/60',
              isSelected && 'ring-2 ring-white scale-125 shadow-lg shadow-[#a855f7]/50'
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
            title={`${anchor.semanticName || anchor.label} (${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)})`}
          />
        );
      })}

      {/* Legend - moved to bottom section */}
    </div>
  );
}

interface BridgeListCardProps {
  title: string;
  items: string[];
  emptyLabel: string;
  tone: 'neutral' | 'warning' | 'error';
}

function BridgeListCard({ title, items, emptyLabel, tone }: BridgeListCardProps) {
  const toneClassName =
    tone === 'error'
      ? 'border-[#ef4444]/20 bg-[#ef4444]/8'
      : tone === 'warning'
      ? 'border-[#f59e0b]/20 bg-[#f59e0b]/8'
      : 'border-white/6 bg-[#202020]';

  const textClassName =
    tone === 'error'
      ? 'text-[#ef4444]'
      : tone === 'warning'
      ? 'text-[#f59e0b]'
      : 'text-white/70';

  return (
    <div className={cn('rounded border px-2.5 py-2', toneClassName)}>
      <p className="text-[10px] text-white/40 mb-1.5">{title}</p>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item, index) => (
            <p key={`${title}-${index}`} className={cn('text-[11px] leading-relaxed', textClassName)}>
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-white/35">{emptyLabel}</p>
      )}
    </div>
  );
}

// Suggestion Details Component
interface SuggestionDetailsProps {
  suggestion: SuggestionItem;
  onSemanticNameChange: (name: string) => void;
  onToggleConfirm: () => void;
  onRoleChange?: (role: AnchorRole) => void;
  onRoleLabelChange?: (label: string) => void;
  compact?: boolean;
}

function SuggestionDetails({
  suggestion,
  onSemanticNameChange,
  onToggleConfirm,
  onRoleChange,
  onRoleLabelChange,
  compact = false,
}: SuggestionDetailsProps) {
  const isAnchor = 'owner' in suggestion;
  const isManual = 'kind' in suggestion && suggestion.kind === 'manual';
  
  return (
    <div className="space-y-3">
      {/* Info Grid */}
      <div className={cn(
        'grid gap-2',
        compact ? 'grid-cols-2' : 'grid-cols-3'
      )}>
        <div className="bg-[#1a1a1a] rounded px-2 py-1.5">
          <p className="text-[10px] text-white/40">ID</p>
          <p className="text-xs text-white/70 truncate font-mono">{suggestion.id}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded px-2 py-1.5">
          <p className="text-[10px] text-white/40">类型</p>
          <p className="text-xs text-white/70">{isManual ? '手动' : isAnchor ? '单位' : '装饰物'}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded px-2 py-1.5">
          <p className="text-[10px] text-white/40">区域</p>
          <p className="text-xs text-white/70">{suggestion.regionHint}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded px-2 py-1.5">
          <p className="text-[10px] text-white/40">坐标</p>
          <p className="text-xs text-white/70 font-mono">
            {suggestion.x.toFixed(0)}, {suggestion.y.toFixed(0)}, {suggestion.z.toFixed(0)}
          </p>
        </div>
        {isAnchor && suggestion.owner !== undefined && (
          <div className="bg-[#1a1a1a] rounded px-2 py-1.5">
            <p className="text-[10px] text-white/40">所有者</p>
            <p className="text-xs text-white/70">P{suggestion.owner}</p>
          </div>
        )}
        <div className={cn(
          'bg-[#1a1a1a] rounded px-2 py-1.5',
          compact ? 'col-span-2' : 'col-span-1'
        )}>
          <p className="text-[10px] text-white/40">标签</p>
          <p className="text-xs text-white/70 truncate">{suggestion.label}</p>
        </div>
      </div>

      {/* Role selection - only for confirmed items */}
      {suggestion.confirmed && onRoleChange && (
        <div>
          <p className="text-[10px] text-white/40 mb-1.5">锚点角色</p>
          <div className={cn(
            'flex flex-wrap gap-1.5',
            compact ? 'max-h-16 overflow-y-auto' : ''
          )}>
            {ANCHOR_ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => onRoleChange(role.value)}
                className={cn(
                  'px-2 py-1 rounded text-[10px] transition-colors border',
                  suggestion.anchorRole === role.value
                    ? 'text-white'
                    : 'bg-transparent text-white/50 border-white/10 hover:border-white/20'
                )}
                style={{
                  backgroundColor: suggestion.anchorRole === role.value ? `${role.color}30` : undefined,
                  borderColor: suggestion.anchorRole === role.value ? role.color : undefined,
                  color: suggestion.anchorRole === role.value ? role.color : undefined,
                }}
              >
                {role.label}
              </button>
            ))}
          </div>
          
          {/* Custom role label input */}
          {suggestion.anchorRole === 'custom' && onRoleLabelChange && (
            <div className="mt-2">
              <Input
                value={suggestion.roleLabel || ''}
                onChange={(e) => onRoleLabelChange(e.target.value)}
                placeholder="输入自定义角色名称..."
                className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-7 text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      <div className="bg-[#1a1a1a] rounded px-2 py-1.5">
        <p className="text-[10px] text-white/40">原因</p>
        <p className="text-xs text-white/50">{suggestion.reason}</p>
      </div>

      {/* Semantic Name Input */}
      <div>
        <p className="text-[10px] text-white/40 mb-1">语义名称</p>
        <div className="flex gap-2">
          <Input
            value={suggestion.semanticName}
            onChange={(e) => onSemanticNameChange(e.target.value)}
            placeholder="输入语义名称..."
            disabled={suggestion.confirmed}
            className="flex-1 bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
          />
          <Button
            onClick={onToggleConfirm}
            className={cn(
              'shrink-0 h-8 text-xs px-3',
              suggestion.confirmed
                ? 'bg-transparent border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10'
                : 'bg-[#22c55e] hover:bg-[#16a34a] text-white'
            )}
          >
            {suggestion.confirmed ? (
              <><XCircle className="h-3.5 w-3.5 mr-1" /> 取消</>
            ) : (
              <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 确认</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: AnchorSuggestionDTO | LandmarkSuggestionDTO;
  semanticName: string;
  confirmed: boolean;
  selected?: boolean;
  onSemanticNameChange: (name: string) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onSelect: () => void;
  showOwner?: boolean;
  compact?: boolean;
}

function SuggestionCard({
  suggestion,
  semanticName,
  confirmed,
  selected = false,
  onSemanticNameChange,
  onConfirm,
  onUnconfirm,
  onSelect,
  showOwner,
  compact = false,
}: SuggestionCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border transition-colors cursor-pointer',
        confirmed
          ? 'bg-[#22c55e]/10 border-[#22c55e]/30'
          : 'bg-[#252525] border-white/5',
        selected && 'ring-2 ring-[#818cf8]/50 border-[#818cf8]/30',
        compact ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-mono text-white/80 truncate">
              {suggestion.id}
            </span>
            {confirmed && (
              <Badge className="text-[10px] px-1 py-0 bg-[#22c55e]/20 text-[#22c55e] border-0">
                已确认
              </Badge>
            )}
          </div>
          <Input
            value={semanticName}
            onChange={(e) => onSemanticNameChange(e.target.value)}
            placeholder="输入语义名称..."
            disabled={confirmed}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30',
              compact ? 'h-7 text-xs' : 'h-8 text-sm'
            )}
          />
        </div>
      </div>

      <div className={cn(
        'flex flex-wrap gap-x-4 gap-y-1 text-white/40 mb-2',
        compact ? 'text-[10px]' : 'text-xs'
      )}>
        <span>区域: <span className="text-white/60">{suggestion.regionHint}</span></span>
        <span>坐标: <span className="text-white/60">{suggestion.x.toFixed(0)}, {suggestion.y.toFixed(0)}, {suggestion.z.toFixed(0)}</span></span>
        {showOwner && 'owner' in suggestion && suggestion.owner !== undefined && (
          <span>所有者: <span className="text-white/60">P{suggestion.owner}</span></span>
        )}
      </div>

      <div className={cn(
        'text-white/30 mb-3',
        compact ? 'text-[10px]' : 'text-xs'
      )}>
        原因: {suggestion.reason}
      </div>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          confirmed ? onUnconfirm() : onConfirm();
        }}
        className={cn(
          'w-full text-xs',
          confirmed
            ? 'bg-transparent border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10'
            : 'bg-[#818cf8] hover:bg-[#6366f1] text-white',
          compact ? 'h-7' : 'h-8'
        )}
      >
        {confirmed ? '取消确认' : '确认锚点'}
      </Button>
    </div>
  );
}

// Manual Anchor Card Component
interface ManualAnchorCardProps {
  anchor: ConfirmedAnchor;
  selected?: boolean;
  onSemanticNameChange: (name: string) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onSelect: () => void;
  onRemove: () => void;
  compact?: boolean;
}

function ManualAnchorCard({
  anchor,
  selected = false,
  onSemanticNameChange,
  onConfirm,
  onUnconfirm,
  onSelect,
  onRemove,
  compact = false,
}: ManualAnchorCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border transition-colors cursor-pointer',
        anchor.confirmed
          ? 'bg-[#a855f7]/10 border-[#a855f7]/30'
          : 'bg-[#252525] border-white/5',
        selected && 'ring-2 ring-[#a855f7]/50 border-[#a855f7]/30',
        compact ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-mono text-white/80 truncate">
              {anchor.id}
            </span>
            {anchor.confirmed && (
              <Badge className="text-[10px] px-1 py-0 bg-[#a855f7]/20 text-[#a855f7] border-0">
                已确认
              </Badge>
            )}
          </div>
          <Input
            value={anchor.semanticName}
            onChange={(e) => onSemanticNameChange(e.target.value)}
            placeholder="输入语义名称..."
            disabled={anchor.confirmed}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30',
              compact ? 'h-7 text-xs' : 'h-8 text-sm'
            )}
          />
        </div>
      </div>

      <div className={cn(
        'flex flex-wrap gap-x-4 gap-y-1 text-white/40 mb-2',
        compact ? 'text-[10px]' : 'text-xs'
      )}>
        <span>区域: <span className="text-white/60">{anchor.regionHint}</span></span>
        <span>坐标: <span className="text-white/60">{anchor.x.toFixed(0)}, {anchor.y.toFixed(0)}, {anchor.z.toFixed(0)}</span></span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            anchor.confirmed ? onUnconfirm() : onConfirm();
          }}
          className={cn(
            'flex-1 text-xs',
            anchor.confirmed
              ? 'bg-transparent border border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/10'
              : 'bg-[#a855f7] hover:bg-[#9333ea] text-white',
            compact ? 'h-7' : 'h-8'
          )}
        >
          {anchor.confirmed ? '取消确认' : '确认锚点'}
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'bg-transparent border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 text-xs',
            compact ? 'h-7 px-2' : 'h-8 px-3'
          )}
        >
          删除
        </Button>
      </div>
    </div>
  );
}

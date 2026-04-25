import type { CanvasHintDTO, MapSummaryDTO } from '@/lib/war3-intake';

export interface AnchorSuggestionDTO {
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

export interface LandmarkSuggestionDTO {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: 'doodad';
  regionHint: string;
  label: string;
  reason: string;
}

export interface PlanarMapDTO {
  canvasHint?: CanvasHintDTO;
}

export interface AnchorCandidatesDTO {
  suggestions?: AnchorSuggestionDTO[];
}

export interface DoodadCandidatesDTO {
  suggestions?: LandmarkSuggestionDTO[];
}

export interface War3DerivedWorkspaceViewDTO {
  success: boolean;
  mapSummary: MapSummaryDTO | null;
  planarMap: PlanarMapDTO | null;
  anchorCandidates: AnchorCandidatesDTO | null;
  doodadCandidates: DoodadCandidatesDTO | null;
  issues: string[];
}

export const ANCHOR_ROLES = [
  { value: 'spawn', label: '出生点', color: '#22c55e' },
  { value: 'shop', label: '商店', color: '#f59e0b' },
  { value: 'boss', label: 'Boss', color: '#ef4444' },
  { value: 'objective', label: '目标点', color: '#3b82f6' },
  { value: 'trigger', label: '触发器', color: '#a855f7' },
  { value: 'poi', label: '兴趣点', color: '#06b6d4' },
  { value: 'custom', label: '自定义', color: '#6b7280' },
] as const;

export type AnchorRole = (typeof ANCHOR_ROLES)[number]['value'];

export interface ApiResponse {
  success: boolean;
  result?: War3DerivedWorkspaceViewDTO;
  error?: string;
}

export interface HandoffPreviewResponse {
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

export interface SkeletonPreviewResponse {
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

export interface ConfirmedAnchor extends AnchorSuggestionDTO {
  semanticName: string;
  confirmed: boolean;
  anchorRole?: AnchorRole;
  roleLabel?: string;
}

export interface ConfirmedLandmark extends LandmarkSuggestionDTO {
  semanticName: string;
  confirmed: boolean;
  anchorRole?: AnchorRole;
  roleLabel?: string;
}

export type SuggestionItem = ConfirmedAnchor | ConfirmedLandmark;

export type SelectedSuggestionRef = {
  type: 'anchor' | 'doodad' | 'manual';
  index: number;
} | null;

export interface ConfirmedListItem {
  type: 'anchor' | 'doodad' | 'manual';
  index: number;
  data: ConfirmedAnchor | ConfirmedLandmark;
}

export interface RoleDisplay {
  value: AnchorRole;
  label: string;
  color: string;
  displayLabel: string;
}

export interface War3AnchorPanelProps {
  variant?: 'main' | 'side';
}

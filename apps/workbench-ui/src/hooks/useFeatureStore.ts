import { create } from 'zustand';
import type { Feature, Group, CreateFeatureData, WizardState, WizardMessage } from '@/types/feature';
import { mockFeatures } from '@/data/mockData';
import { adaptWorkbenchResultsToFeatures, deriveGroupsFromFeatures } from '@/data/featureAdapter';
import { getLocalBackendResult } from '@/data/backendResults';
import {
  adaptWorkspaceToFeatures,
  deriveGroupsFromWorkspace,
} from '@/data/workspaceAdapter';
import {
  loadWorkspaceFromSource,
  switchWorkspaceSource,
  getAvailableSources,
  WORKSPACE_SOURCES,
  BRIDGE_ARTIFACT_CONTRACT,
  type WorkspaceSourceConfig,
} from '@/data/workspaceSource';
import type { RuneWeaverWorkspace } from '@/types/workspace';

// F011: Bridge artifact metadata from CLI export
export interface BridgeArtifactMeta {
  exportedAt: string;
  exportedBy: string;
  sourceHostRoot: string;
  version: string;
}

// Product Entry Integration: Execution state for CLI operations
export interface ExecutionState {
  isRunning: boolean;
  command: string | null;
  output: string[];
  result: 'success' | 'failure' | null;
  error: string | null;
  artifactPath: string | null;
}

// Product Entry Integration: Host configuration state
export interface HostConfigState {
  hostRoot: string;
  hostValid: boolean;
  hostType: 'dota2-x-template' | 'unknown';
  scanErrors: string[];
  integrationStatus: {
    initialized: boolean;
    namespaceReady: boolean;
    workspaceReady: boolean;
    serverBridge: boolean;
    uiBridge: boolean;
    ready: boolean;
  } | null;
}

interface FeatureStore {
  // Data
  features: Feature[];
  groups: Group[];
  dataSource: 'mock' | 'real' | 'hybrid' | 'workspace';
  workspace: RuneWeaverWorkspace | null;
  workspaceSource: WorkspaceSourceConfig | null;
  workspaceIssues: string[];
  // F011: Bridge artifact metadata when using bridge source
  bridgeArtifactMeta: BridgeArtifactMeta | null;
  // Available workspace sources (cached)
  availableSources: WorkspaceSourceConfig[];

  // Selection state
  selectedGroupId: string;
  selectedFeatureId: string | null;

  // UI state
  expandedNodes: Set<string>;
  searchQuery: string;

  // Wizard state
  wizard: WizardState;

  // Product Entry Integration: Execution state
  execution: ExecutionState;
  // Product Entry Integration: Host configuration state
  hostConfig: HostConfigState;

  // Actions
  selectGroup: (id: string) => void;
  selectFeature: (id: string | null) => void;
  toggleNode: (id: string) => void;
  createFeature: (data: CreateFeatureData) => void;
  updateFeature: (id: string, data: Partial<Feature>) => void;
  deleteFeature: (id: string) => void;
  setSearchQuery: (query: string) => void;
  regenerateFeature: (id: string) => void;

  // Wizard actions
  startWizard: () => void;
  closeWizard: () => void;
  addWizardMessage: (message: Omit<WizardMessage, 'id' | 'timestamp'>) => void;
  setWizardStep: (step: WizardState['currentStep']) => void;
  setDraftFeature: (feature: Partial<Feature> | null) => void;

  // Product Entry Integration: Execution actions
  setExecutionRunning: (isRunning: boolean, command?: string | null) => void;
  addExecutionOutput: (line: string) => void;
  setExecutionResult: (result: 'success' | 'failure', artifactPath?: string | null) => void;
  setExecutionError: (error: string | null) => void;
  clearExecutionOutput: () => void;
  resetExecution: () => void;

  // Product Entry Integration: Host config actions
  setHostRoot: (hostRoot: string) => void;
  setHostScanResult: (valid: boolean, hostType: 'dota2-x-template' | 'unknown', errors: string[]) => void;
  setIntegrationStatus: (status: HostConfigState['integrationStatus']) => void;

  // Data loading
  loadRealData: () => void;
  loadHybridData: () => void;
  loadWorkspaceData: () => Promise<void>;
  switchWorkspaceSource: (source: WorkspaceSourceConfig) => Promise<void>;
  reloadCurrentSource: () => Promise<void>;

  // Source info
  getAvailableSources: () => WorkspaceSourceConfig[];
  getCurrentSource: () => WorkspaceSourceConfig | null;
  // F011: Bridge artifact contract and metadata
  getBridgeArtifactContract: () => typeof BRIDGE_ARTIFACT_CONTRACT;
  getBridgeArtifactMeta: () => BridgeArtifactMeta | null;

  // Derived data
  getFilteredFeatures: () => Feature[];
  getSelectedFeature: () => Feature | null;
  getFeatureChildren: (parentId: string) => Feature[];
  getRootFeatures: () => Feature[];
}

// F007: Load real data from local backend results
function loadRealFeatures(): Feature[] {
  const results = [
    getLocalBackendResult('create'),
    getLocalBackendResult('governance-blocked'),
    getLocalBackendResult('write-success'),
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  return adaptWorkbenchResultsToFeatures(results);
}

// F007: Hybrid mode - mix real and mock data
function loadHybridFeatures(): Feature[] {
  const realFeatures = loadRealFeatures();
  // Keep some mock features for completeness
  const mockFeaturesSubset = mockFeatures.slice(3);
  return [...realFeatures, ...mockFeaturesSubset];
}

// F009: Default workspace data loader with source selection
// F011: Also returns bridge metadata
async function loadDefaultWorkspace(): Promise<{
  features: Feature[];
  groups: Group[];
  workspace: RuneWeaverWorkspace | null;
  source: WorkspaceSourceConfig | null;
  issues: string[];
  bridgeMeta: BridgeArtifactMeta | null;
}> {
  const { workspace, source, issues, bridgeMeta } = await loadWorkspaceFromSource();

  if (workspace) {
    return {
      features: adaptWorkspaceToFeatures(workspace),
      groups: deriveGroupsFromWorkspace(workspace),
      workspace,
      source,
      issues,
      bridgeMeta: bridgeMeta || null,
    };
  }

  // Fallback to hybrid if workspace not found
  const hybridFeatures = loadHybridFeatures();
  return {
    features: hybridFeatures,
    groups: deriveGroupsFromFeatures(hybridFeatures),
    workspace: null,
    source: null,
    issues,
    bridgeMeta: null,
  };
}

export const useFeatureStore = create<FeatureStore>((set, get) => ({
  // F009: Initial state will be set asynchronously
  features: [],
  groups: [],
  dataSource: 'workspace',
  workspace: null,
  workspaceSource: null,
  workspaceIssues: [],
  // F011: Bridge artifact metadata
  bridgeArtifactMeta: null,
  // Available workspace sources (cached)
  availableSources: WORKSPACE_SOURCES,

  selectedGroupId: 'all',
  selectedFeatureId: null,
  expandedNodes: new Set(['1', '5', '8']),
  searchQuery: '',

  wizard: {
    isActive: false,
    messages: [],
    currentStep: 'intent',
    draftFeature: null,
  },

  // Product Entry Integration: Initial execution state
  execution: {
    isRunning: false,
    command: null,
    output: [],
    result: null,
    error: null,
    artifactPath: null,
  },

  // Product Entry Integration: Initial host config state
  hostConfig: {
    hostRoot: '',
    hostValid: false,
    hostType: 'unknown',
    scanErrors: [],
    integrationStatus: null,
  },

  selectGroup: (id) => {
    set({ selectedGroupId: id, selectedFeatureId: null });
  },

  selectFeature: (id) => {
    set({ selectedFeatureId: id });
  },

  toggleNode: (id) => {
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedNodes: newExpanded };
    });
  },

  createFeature: (data) => {
    const newFeature: Feature = {
      id: Date.now().toString(),
      displayName: data.displayName,
      systemId: data.systemId || data.displayName.toLowerCase().replace(/\s+/g, '-'),
      group: data.group,
      parentId: data.parentId || null,
      childrenIds: [],
      status: 'draft',
      revision: 1,
      updatedAt: new Date(),
      patterns: [],
      generatedFiles: [],
      hostRealization: {
        host: 'Dota2',
        context: '',
        syncStatus: 'pending',
      },
      reviewSignals: {
        proposalStatus: {
          ready: false,
          percentage: 25,
          message: '新创建的功能，等待处理',
        },
        gapFillSummary: {
          autoFilled: 0,
          needsAttention: 3,
        },
        categoryEClarification: {
          count: 0,
          items: [],
        },
        invalidPatternIds: [],
        readiness: {
          score: 25,
          warnings: ['需要补充更多参数'],
        },
      },
    };

    set((state) => {
      const newFeatures = [newFeature, ...state.features];
      return {
        features: newFeatures,
        groups: deriveGroupsFromFeatures(newFeatures),
        selectedFeatureId: newFeature.id,
        wizard: {
          ...state.wizard,
          isActive: false,
          messages: [],
          currentStep: 'intent',
        },
      };
    });
  },

  updateFeature: (id, data) => {
    set((state) => {
      const newFeatures = state.features.map((f) =>
        f.id === id ? { ...f, ...data, updatedAt: new Date() } : f
      );
      return {
        features: newFeatures,
        groups: deriveGroupsFromFeatures(newFeatures),
      };
    });
  },

  deleteFeature: (id) => {
    set((state) => {
      const newFeatures = state.features.filter((f) => f.id !== id);
      return {
        features: newFeatures,
        groups: deriveGroupsFromFeatures(newFeatures),
        selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId,
      };
    });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  regenerateFeature: (id) => {
    set((state) => {
      const newFeatures = state.features.map((f) =>
        f.id === id
          ? {
              ...f,
              revision: f.revision + 1,
              updatedAt: new Date(),
              status: 'active' as const,
              hostRealization: {
                ...f.hostRealization,
                syncStatus: 'synced' as const,
              },
            }
          : f
      );
      return {
        features: newFeatures,
        groups: deriveGroupsFromFeatures(newFeatures),
      };
    });
  },

  startWizard: () => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        isActive: true,
        messages: [
          {
            id: 'welcome',
            role: 'assistant',
            content: '你好！我是 Rune Weaver Wizard。请描述你想要创建的功能，我会帮你分析和生成代码。',
            timestamp: new Date(),
          },
        ],
        currentStep: 'intent',
      },
    }));
  },

  closeWizard: () => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        isActive: false,
        draftFeature: null,
      },
    }));
  },

  addWizardMessage: (message) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        messages: [
          ...state.wizard.messages,
          {
            ...message,
            id: Date.now().toString(),
            timestamp: new Date(),
          },
        ],
      },
    }));
  },

  setWizardStep: (step) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        currentStep: step,
      },
    }));
  },

  setDraftFeature: (feature) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        draftFeature: feature,
      },
    }));
  },

  // Product Entry Integration: Execution actions implementation
  setExecutionRunning: (isRunning, command = null) => {
    set((state) => ({
      execution: {
        ...state.execution,
        isRunning,
        command: isRunning ? command : state.execution.command,
        result: isRunning ? null : state.execution.result,
        error: isRunning ? null : state.execution.error,
      },
    }));
  },

  addExecutionOutput: (line) => {
    set((state) => ({
      execution: {
        ...state.execution,
        output: [...state.execution.output, line],
      },
    }));
  },

  setExecutionResult: (result, artifactPath = null) => {
    set((state) => ({
      execution: {
        ...state.execution,
        isRunning: false,
        result,
        artifactPath,
      },
    }));
  },

  setExecutionError: (error) => {
    set((state) => ({
      execution: {
        ...state.execution,
        isRunning: false,
        error,
        result: error ? 'failure' : state.execution.result,
      },
    }));
  },

  clearExecutionOutput: () => {
    set((state) => ({
      execution: {
        ...state.execution,
        output: [],
      },
    }));
  },

  resetExecution: () => {
    set({
      execution: {
        isRunning: false,
        command: null,
        output: [],
        result: null,
        error: null,
        artifactPath: null,
      },
    });
  },

  // Product Entry Integration: Host config actions implementation
  setHostRoot: (hostRoot) => {
    set((state) => ({
      hostConfig: {
        ...state.hostConfig,
        hostRoot,
      },
    }));
  },

  setHostScanResult: (valid, hostType, errors) => {
    set((state) => ({
      hostConfig: {
        ...state.hostConfig,
        hostValid: valid,
        hostType,
        scanErrors: errors,
      },
    }));
  },

  setIntegrationStatus: (status) => {
    set((state) => ({
      hostConfig: {
        ...state.hostConfig,
        integrationStatus: status,
      },
    }));
  },

  // F007: Load real data from backend results
  loadRealData: () => {
    const realFeatures = loadRealFeatures();
    set({
      features: realFeatures,
      groups: deriveGroupsFromFeatures(realFeatures),
      dataSource: 'real',
      workspace: null,
      workspaceSource: null,
      workspaceIssues: [],
    });
  },

  // F007: Load hybrid data (real + mock)
  loadHybridData: () => {
    const hybridFeatures = loadHybridFeatures();
    set({
      features: hybridFeatures,
      groups: deriveGroupsFromFeatures(hybridFeatures),
      dataSource: 'hybrid',
      workspace: null,
      workspaceSource: null,
      workspaceIssues: [],
    });
  },

  // F009: Load workspace data from effective source
  // F011: Also captures bridge metadata
  loadWorkspaceData: async () => {
    const { workspace, source, issues, bridgeMeta } = await loadWorkspaceFromSource();

    if (workspace) {
      set({
        features: adaptWorkspaceToFeatures(workspace),
        groups: deriveGroupsFromWorkspace(workspace),
        dataSource: 'workspace',
        workspace,
        workspaceSource: source,
        workspaceIssues: issues,
        bridgeArtifactMeta: bridgeMeta || null,
      });
    } else {
      // Fallback to hybrid
      const hybridFeatures = loadHybridFeatures();
      set({
        features: hybridFeatures,
        groups: deriveGroupsFromFeatures(hybridFeatures),
        dataSource: 'hybrid',
        workspace: null,
        workspaceSource: source,
        workspaceIssues: issues,
        bridgeArtifactMeta: null,
      });
    }
  },

  // F009: Switch to a different workspace source
  // F011: Also captures bridge metadata
  switchWorkspaceSource: async (source) => {
    const { workspace, source: effectiveSource, issues, bridgeMeta } = await switchWorkspaceSource(source);

    if (workspace) {
      set({
        features: adaptWorkspaceToFeatures(workspace),
        groups: deriveGroupsFromWorkspace(workspace),
        dataSource: 'workspace',
        workspace,
        workspaceSource: effectiveSource,
        workspaceIssues: issues,
        bridgeArtifactMeta: bridgeMeta || null,
      });
    } else {
      // Fallback to hybrid
      const hybridFeatures = loadHybridFeatures();
      set({
        features: hybridFeatures,
        groups: deriveGroupsFromFeatures(hybridFeatures),
        dataSource: 'hybrid',
        workspace: null,
        workspaceSource: effectiveSource,
        workspaceIssues: issues,
        bridgeArtifactMeta: null,
      });
    }
  },

  // F009: Reload from current source
  reloadCurrentSource: async () => {
    const currentSource = get().workspaceSource;
    if (currentSource) {
      await get().switchWorkspaceSource(currentSource);
    } else {
      await get().loadWorkspaceData();
    }
  },

  // F009: Get available sources
  getAvailableSources: () => {
    return getAvailableSources();
  },

  // F009: Get current source
  getCurrentSource: () => {
    return get().workspaceSource;
  },

  // F011: Get bridge artifact contract (static)
  getBridgeArtifactContract: () => {
    return BRIDGE_ARTIFACT_CONTRACT;
  },

  // F011: Get bridge artifact metadata (if using bridge source)
  getBridgeArtifactMeta: () => {
    return get().bridgeArtifactMeta;
  },

  getFilteredFeatures: () => {
    const state = get();
    let features = state.features;

    if (state.selectedGroupId !== 'all') {
      features = features.filter((f) => f.group === state.selectedGroupId);
    }

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      features = features.filter(
        (f) =>
          f.displayName.toLowerCase().includes(query) ||
          f.systemId.toLowerCase().includes(query)
      );
    }

    return features;
  },

  getSelectedFeature: () => {
    const state = get();
    return state.features.find((f) => f.id === state.selectedFeatureId) || null;
  },

  getFeatureChildren: (parentId) => {
    const state = get();
    return state.features.filter((f) => f.parentId === parentId);
  },

  getRootFeatures: () => {
    const state = get();
    return state.features.filter((f) => f.parentId === null);
  },
}));

// F009: Initialize store with effective workspace source on load
// F011: Also initialize bridge metadata
loadDefaultWorkspace().then(({ features, groups, workspace, source, issues, bridgeMeta }) => {
  useFeatureStore.setState({
    features,
    groups,
    workspace,
    workspaceSource: source,
    workspaceIssues: issues,
    bridgeArtifactMeta: bridgeMeta,
    dataSource: workspace ? 'workspace' : 'hybrid',
  });
});

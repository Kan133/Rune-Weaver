import { create } from 'zustand';
import type { Feature, Group, WizardState, WizardMessage } from '@/types/feature';
import { deriveGroupsFromFeatures } from '@/data/featureAdapter';
import {
  adaptWorkspaceToFeatures,
  deriveGroupsFromWorkspace,
} from '@/data/workspaceAdapter';
import {
  switchWorkspaceSource as loadWorkspaceFromExplicitSource,
  getAvailableSources,
  WORKSPACE_SOURCES,
  BRIDGE_ARTIFACT_CONTRACT,
  type WorkspaceSourceConfig,
} from '@/data/workspaceSource';
import type { RuneWeaverWorkspace } from '@/types/workspace';
import { fetchHostStatus, type HostStatusResult } from '@/hooks/useHostScanner';

export interface BridgeArtifactMeta {
  exportedAt: string;
  exportedBy: string;
  sourceHostRoot: string;
  version: string;
}

export interface HostConfigState {
  hostRoot: string;
  addonName: string;
  mapName: string;
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
  features: Feature[];
  groups: Group[];
  workspace: RuneWeaverWorkspace | null;
  workspaceSource: WorkspaceSourceConfig | null;
  workspaceIssues: string[];
  bridgeArtifactMeta: BridgeArtifactMeta | null;
  availableSources: WorkspaceSourceConfig[];
  connectedHostRoot: string | null;
  isWorkspaceConnected: boolean;

  selectedGroupId: string;
  selectedFeatureId: string | null;
  expandedNodes: Set<string>;
  searchQuery: string;

  wizard: WizardState;
  hostConfig: HostConfigState;

  selectGroup: (id: string) => void;
  selectFeature: (id: string | null) => void;
  toggleNode: (id: string) => void;
  setSearchQuery: (query: string) => void;

  startWizard: () => void;
  closeWizard: () => void;
  addWizardMessage: (message: Omit<WizardMessage, 'id' | 'timestamp'>) => void;
  setWizardStep: (step: WizardState['currentStep']) => void;
  setDraftFeature: (feature: Partial<Feature> | null) => void;

  setHostRoot: (hostRoot: string) => void;
  setAddonName: (addonName: string) => void;
  setMapName: (mapName: string) => void;
  setHostScanResult: (
    valid: boolean,
    hostType: 'dota2-x-template' | 'unknown',
    errors: string[],
  ) => void;
  setIntegrationStatus: (status: HostConfigState['integrationStatus']) => void;

  connectHostWorkspace: (hostStatus: HostStatusResult, preferredFeatureId?: string | null) => void;
  reloadConnectedWorkspace: (preferredFeatureId?: string | null) => Promise<void>;
  clearConnectedWorkspace: () => void;

  switchWorkspaceSource: (source: WorkspaceSourceConfig) => Promise<void>;
  reloadCurrentSource: () => Promise<void>;

  getAvailableSources: () => WorkspaceSourceConfig[];
  getCurrentSource: () => WorkspaceSourceConfig | null;
  getBridgeArtifactContract: () => typeof BRIDGE_ARTIFACT_CONTRACT;
  getBridgeArtifactMeta: () => BridgeArtifactMeta | null;

  getFilteredFeatures: () => Feature[];
  getSelectedFeature: () => Feature | null;
  getFeatureChildren: (parentId: string) => Feature[];
  getRootFeatures: () => Feature[];
}

function buildEmptyGroups(): Group[] {
  return deriveGroupsFromFeatures([]);
}

function chooseSelectedFeatureId(features: Feature[], preferredFeatureId?: string | null): string | null {
  if (preferredFeatureId && features.some((feature) => feature.id === preferredFeatureId)) {
    return preferredFeatureId;
  }

  return features.find((feature) => feature.status === 'active')?.id || features[0]?.id || null;
}

function chooseSelectedGroupId(groups: Group[], preferredGroupId: string): string {
  return groups.some((group) => group.id === preferredGroupId) ? preferredGroupId : 'all';
}

function mapWorkspaceIssues(hostStatus: HostStatusResult): string[] {
  return hostStatus.issues.map((issue) =>
    issue.suggestion ? `${issue.message} (${issue.suggestion})` : issue.message
  );
}

function mapIntegrationStatus(
  hostStatus: HostStatusResult,
): HostConfigState['integrationStatus'] {
  return {
    initialized: hostStatus.rwStatus.initialized,
    namespaceReady: hostStatus.rwStatus.namespaceReady,
    workspaceReady: hostStatus.rwStatus.workspaceReady,
    serverBridge: hostStatus.rwStatus.serverBridge.ready,
    uiBridge: hostStatus.rwStatus.uiBridge.ready,
    ready: hostStatus.rwStatus.ready,
  };
}

function buildWorkspaceSnapshot(
  workspace: RuneWeaverWorkspace | null,
  selectedGroupId: string,
  preferredFeatureId?: string | null,
): Pick<FeatureStore, 'features' | 'groups' | 'selectedFeatureId' | 'selectedGroupId'> {
  const features = workspace ? adaptWorkspaceToFeatures(workspace) : [];
  const groups = workspace ? deriveGroupsFromWorkspace(workspace) : buildEmptyGroups();

  return {
    features,
    groups,
    selectedFeatureId: chooseSelectedFeatureId(features, preferredFeatureId),
    selectedGroupId: chooseSelectedGroupId(groups, selectedGroupId),
  };
}

export const useFeatureStore = create<FeatureStore>((set, get) => ({
  features: [],
  groups: buildEmptyGroups(),
  workspace: null,
  workspaceSource: null,
  workspaceIssues: [],
  bridgeArtifactMeta: null,
  availableSources: getAvailableSources() || WORKSPACE_SOURCES,
  connectedHostRoot: null,
  isWorkspaceConnected: false,

  selectedGroupId: 'all',
  selectedFeatureId: null,
  expandedNodes: new Set<string>(),
  searchQuery: '',

  wizard: {
    isActive: false,
    messages: [],
    currentStep: 'intent',
    draftFeature: null,
  },

  hostConfig: {
    hostRoot: '',
    addonName: '',
    mapName: 'temp',
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
      const expandedNodes = new Set(state.expandedNodes);
      if (expandedNodes.has(id)) {
        expandedNodes.delete(id);
      } else {
        expandedNodes.add(id);
      }
      return { expandedNodes };
    });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
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
            content: '你好！我是 Rune Weaver Wizard。请描述你想要创建的功能，我会帮你分析并通过真实 CLI 写入宿主。',
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

  setHostRoot: (hostRoot) => {
    set((state) => ({
      hostConfig: {
        ...state.hostConfig,
        hostRoot,
      },
    }));
  },

  setAddonName: (addonName) => {
    set((state) => ({
      hostConfig: {
        ...state.hostConfig,
        addonName,
      },
    }));
  },

  setMapName: (mapName) => {
    set((state) => ({
      hostConfig: {
        ...state.hostConfig,
        mapName,
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

  connectHostWorkspace: (hostStatus, preferredFeatureId) => {
    set((state) => {
      const snapshot = buildWorkspaceSnapshot(
        hostStatus.workspace ?? null,
        state.selectedGroupId,
        preferredFeatureId ?? state.selectedFeatureId,
      );

      return {
        ...snapshot,
        workspace: hostStatus.workspace ?? null,
        workspaceSource: null,
        workspaceIssues: mapWorkspaceIssues(hostStatus),
        bridgeArtifactMeta: null,
        connectedHostRoot: hostStatus.hostRoot,
        isWorkspaceConnected: !!hostStatus.workspace,
        hostConfig: {
          ...state.hostConfig,
          hostRoot: hostStatus.hostRoot,
          addonName: state.hostConfig.addonName || hostStatus.workspace?.addonName || state.hostConfig.addonName,
          hostValid: hostStatus.supported,
          hostType: hostStatus.hostType === 'dota2-x-template' ? 'dota2-x-template' : 'unknown',
          scanErrors: [],
          integrationStatus: mapIntegrationStatus(hostStatus),
        },
      };
    });
  },

  reloadConnectedWorkspace: async (preferredFeatureId) => {
    const targetHostRoot = get().connectedHostRoot;
    if (!targetHostRoot) {
      return;
    }

    const hostStatus = await fetchHostStatus(targetHostRoot);
    if (!hostStatus) {
      set((state) => ({
        features: [],
        groups: buildEmptyGroups(),
        workspace: null,
        workspaceIssues: ['无法重新读取当前连接宿主的 workspace。'],
        bridgeArtifactMeta: null,
        isWorkspaceConnected: false,
        selectedFeatureId: null,
        selectedGroupId: 'all',
        hostConfig: {
          ...state.hostConfig,
          integrationStatus: null,
        },
      }));
      return;
    }

    get().connectHostWorkspace(hostStatus, preferredFeatureId ?? get().selectedFeatureId);
  },

  clearConnectedWorkspace: () => {
    set((state) => ({
      features: [],
      groups: buildEmptyGroups(),
      workspace: null,
      workspaceSource: null,
      workspaceIssues: [],
      bridgeArtifactMeta: null,
      connectedHostRoot: null,
      isWorkspaceConnected: false,
      selectedFeatureId: null,
      selectedGroupId: 'all',
      hostConfig: {
        ...state.hostConfig,
        integrationStatus: null,
      },
    }));
  },

  switchWorkspaceSource: async (source) => {
    const { workspace, source: effectiveSource, issues, bridgeMeta } =
      await loadWorkspaceFromExplicitSource(source);

    const snapshot = buildWorkspaceSnapshot(
      workspace,
      get().selectedGroupId,
      get().selectedFeatureId,
    );

    set((state) => ({
      ...snapshot,
      workspace,
      workspaceSource: effectiveSource,
      workspaceIssues: issues,
      bridgeArtifactMeta: bridgeMeta || null,
      connectedHostRoot: null,
      isWorkspaceConnected: false,
      hostConfig: {
        ...state.hostConfig,
        integrationStatus: null,
      },
    }));
  },

  reloadCurrentSource: async () => {
    const currentSource = get().workspaceSource;
    if (currentSource) {
      await get().switchWorkspaceSource(currentSource);
      return;
    }

    await get().reloadConnectedWorkspace(get().selectedFeatureId);
  },

  getAvailableSources: () => {
    return getAvailableSources();
  },

  getCurrentSource: () => {
    return get().workspaceSource;
  },

  getBridgeArtifactContract: () => {
    return BRIDGE_ARTIFACT_CONTRACT;
  },

  getBridgeArtifactMeta: () => {
    return get().bridgeArtifactMeta;
  },

  getFilteredFeatures: () => {
    const state = get();
    let features = state.features;

    if (state.selectedGroupId !== 'all') {
      features = features.filter((feature) => feature.group === state.selectedGroupId);
    }

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      features = features.filter(
        (feature) =>
          feature.displayName.toLowerCase().includes(query) ||
          feature.systemId.toLowerCase().includes(query),
      );
    }

    return features;
  },

  getSelectedFeature: () => {
    const state = get();
    return state.features.find((feature) => feature.id === state.selectedFeatureId) || null;
  },

  getFeatureChildren: (parentId) => {
    const state = get();
    return state.features.filter((feature) => feature.parentId === parentId);
  },

  getRootFeatures: () => {
    const state = get();
    return state.features.filter((feature) => feature.parentId === null);
  },
}));

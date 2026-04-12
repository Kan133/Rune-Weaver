import { create } from 'zustand';
import type { Feature, Group, CreateFeatureData, FeatureStatus } from '@/types/feature';
import { mockFeatures, mockGroups } from '@/data/mockData';

interface FeatureStore {
  // 数据
  features: Feature[];
  groups: Group[];

  // 选中状态
  selectedGroupId: string;
  selectedFeatureId: string | null;

  // UI 状态
  expandedNodes: Set<string>;
  searchQuery: string;

  // 操作
  selectGroup: (id: string) => void;
  selectFeature: (id: string | null) => void;
  toggleNode: (id: string) => void;
  createFeature: (data: CreateFeatureData) => void;
  updateFeature: (id: string, data: Partial<Feature>) => void;
  deleteFeature: (id: string) => void;
  setSearchQuery: (query: string) => void;
  regenerateFeature: (id: string) => void;

  // 派生数据
  getFilteredFeatures: () => Feature[];
  getSelectedFeature: () => Feature | null;
  getFeatureChildren: (parentId: string) => Feature[];
  getRootFeatures: () => Feature[];
}

export const useFeatureStore = create<FeatureStore>((set, get) => ({
  features: mockFeatures,
  groups: mockGroups,
  selectedGroupId: 'all',
  selectedFeatureId: '1',
  expandedNodes: new Set(['1', '5', '8']),
  searchQuery: '',

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
          percentage: 0,
          message: '等待 proposal',
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
          score: 0,
          warnings: [],
        },
      },
    };

    set((state) => {
      const features = [...state.features, newFeature];
      // 更新父节点的 childrenIds
      if (data.parentId) {
        const parentIndex = features.findIndex((f) => f.id === data.parentId);
        if (parentIndex !== -1) {
          features[parentIndex] = {
            ...features[parentIndex],
            childrenIds: [...features[parentIndex].childrenIds, newFeature.id],
          };
        }
      }
      return { features, selectedFeatureId: newFeature.id };
    });
  },

  updateFeature: (id, data) => {
    set((state) => ({
      features: state.features.map((f) =>
        f.id === id ? { ...f, ...data, updatedAt: new Date() } : f
      ),
    }));
  },

  deleteFeature: (id) => {
    set((state) => {
      const feature = state.features.find((f) => f.id === id);
      if (!feature) return state;

      let features = state.features.filter((f) => f.id !== id);

      // 从父节点的 childrenIds 中移除
      if (feature.parentId) {
        const parentIndex = features.findIndex((f) => f.id === feature.parentId);
        if (parentIndex !== -1) {
          features[parentIndex] = {
            ...features[parentIndex],
            childrenIds: features[parentIndex].childrenIds.filter((cid) => cid !== id),
          };
        }
      }

      // 删除子节点
      const childrenIds = feature.childrenIds;
      features = features.filter((f) => !childrenIds.includes(f.id));

      return {
        features,
        selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId,
      };
    });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  regenerateFeature: (id) => {
    set((state) => ({
      features: state.features.map((f) =>
        f.id === id
          ? {
              ...f,
              status: 'active' as FeatureStatus,
              revision: f.revision + 1,
              updatedAt: new Date(),
              reviewSignals: {
                ...f.reviewSignals,
                proposalStatus: {
                  ready: true,
                  percentage: 100,
                  message: '重建完成',
                },
              },
            }
          : f
      ),
    }));
  },

  getFilteredFeatures: () => {
    const state = get();
    let features = state.features;

    // 按分组筛选
    if (state.selectedGroupId !== 'all') {
      features = features.filter((f) => f.group === state.selectedGroupId);
    }

    // 按搜索筛选
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

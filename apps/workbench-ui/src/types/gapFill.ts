export interface GapFillBoundaryMeta {
  label: string;
  description?: string;
}

export const GAP_FILL_BOUNDARY_META: Record<string, GapFillBoundaryMeta> = {
  'selection_flow.effect_mapping': {
    label: '选择流程效果映射',
    description: '只改选择结果与实际效果的映射，不改触发键、桥接或 UI 通道。',
  },
  'weighted_pool.selection_policy': {
    label: '权重池选择策略',
    description: '控制每次抽取如何从权重池里选项，不改外部事件与界面。',
  },
  'ui.selection_modal.payload_adapter': {
    label: '选择弹窗载荷适配',
    description: '调整弹窗输入如何变成运行时载荷，不改业务效果本身。',
  },
};

function humanizeBoundaryId(boundaryId: string): string {
  const segments = boundaryId.split('.');
  return segments
    .map((segment) =>
      segment
        .split(/[_-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    )
    .join(' / ');
}

export function describeGapFillBoundary(boundaryId: string): { id: string } & GapFillBoundaryMeta {
  const entry = GAP_FILL_BOUNDARY_META[boundaryId];
  if (entry) {
    return { id: boundaryId, ...entry };
  }
  return {
    id: boundaryId,
    label: humanizeBoundaryId(boundaryId),
  };
}

import type { CanvasHintDTO } from '@/lib/war3-intake';
import type {
  ConfirmedAnchor,
  ConfirmedLandmark,
  ConfirmedListItem,
  RoleDisplay,
  SelectedSuggestionRef,
  SuggestionItem,
} from './war3AnchorPanel.types';
import { ANCHOR_ROLES } from './war3AnchorPanel.types';

const REGION_ROWS = ['top', 'middle', 'bottom'] as const;
const REGION_COLS = ['left', 'center', 'right'] as const;

export function determineRegionHint(x: number, y: number, canvasHint: CanvasHintDTO | null) {
  if (!canvasHint) {
    return 'unknown';
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

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getRoleDisplay(item: SuggestionItem): RoleDisplay | null {
  if (!item.anchorRole) {
    return null;
  }

  const role = ANCHOR_ROLES.find((candidate) => candidate.value === item.anchorRole);
  if (!role) {
    return null;
  }

  return {
    ...role,
    displayLabel: item.anchorRole === 'custom' && item.roleLabel ? item.roleLabel : role.label,
  };
}

export function buildConfirmedItems(
  anchorSuggestions: ConfirmedAnchor[],
  doodadSuggestions: ConfirmedLandmark[],
  manualAnchors: ConfirmedAnchor[],
): ConfirmedListItem[] {
  const items: ConfirmedListItem[] = [];

  anchorSuggestions.forEach((item, index) => {
    if (item.confirmed) {
      items.push({ type: 'anchor', index, data: item });
    }
  });
  doodadSuggestions.forEach((item, index) => {
    if (item.confirmed) {
      items.push({ type: 'doodad', index, data: item });
    }
  });
  manualAnchors.forEach((item, index) => {
    if (item.confirmed) {
      items.push({ type: 'manual', index, data: item });
    }
  });

  return items;
}

export function buildContextDraft(
  anchorSuggestions: ConfirmedAnchor[],
  doodadSuggestions: ConfirmedLandmark[],
  manualAnchors: ConfirmedAnchor[],
): string {
  const confirmedAnchors = anchorSuggestions.filter((item) => item.confirmed);
  const confirmedDoodads = doodadSuggestions.filter((item) => item.confirmed);
  const confirmedManual = manualAnchors.filter((item) => item.confirmed);

  if (confirmedAnchors.length === 0 && confirmedDoodads.length === 0 && confirmedManual.length === 0) {
    return '';
  }

  const lines: string[] = ['已确认地图锚点：'];

  confirmedAnchors.forEach((anchor, index) => {
    const name = anchor.semanticName || anchor.label || anchor.id;
    const roleText = getRoleDisplay(anchor)?.displayLabel;
    lines.push(`${index + 1}. ${roleText ? `[${roleText}] ` : ''}${name} 位于 ${anchor.regionHint} (${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)}, ${anchor.z.toFixed(0)})`);
  });
  confirmedDoodads.forEach((doodad, index) => {
    const name = doodad.semanticName || doodad.label || doodad.id;
    const roleText = getRoleDisplay(doodad)?.displayLabel;
    lines.push(`${confirmedAnchors.length + index + 1}. ${roleText ? `[${roleText}] ` : ''}${name} [装饰物] 位于 ${doodad.regionHint} (${doodad.x.toFixed(0)}, ${doodad.y.toFixed(0)}, ${doodad.z.toFixed(0)})`);
  });
  confirmedManual.forEach((manual, index) => {
    const name = manual.semanticName || manual.label || manual.id;
    const roleText = getRoleDisplay(manual)?.displayLabel;
    lines.push(`${confirmedAnchors.length + confirmedDoodads.length + index + 1}. ${roleText ? `[${roleText}] ` : ''}${name} [手动] 位于 ${manual.regionHint} (${manual.x.toFixed(0)}, ${manual.y.toFixed(0)}, ${manual.z.toFixed(0)})`);
  });

  return lines.join('\n');
}

export function buildFeaturePrompt(
  anchorSuggestions: ConfirmedAnchor[],
  doodadSuggestions: ConfirmedLandmark[],
  manualAnchors: ConfirmedAnchor[],
  featureDescription: string,
): string {
  if (!featureDescription.trim()) {
    return '';
  }

  const confirmedAnchors = anchorSuggestions.filter((item) => item.confirmed);
  const confirmedDoodads = doodadSuggestions.filter((item) => item.confirmed);
  const confirmedManual = manualAnchors.filter((item) => item.confirmed);
  const lines: string[] = ['在 Warcraft 3 地图中，已确认位置包括：', ''];

  if (confirmedAnchors.length === 0 && confirmedDoodads.length === 0 && confirmedManual.length === 0) {
    lines.push('（暂无已确认的位置锚点）');
  } else {
    confirmedAnchors.forEach((anchor, index) => {
      const name = anchor.semanticName || anchor.label || anchor.id;
      const roleText = getRoleDisplay(anchor)?.displayLabel;
      lines.push(`${index + 1}. 单位 "${name}"${roleText ? ` [${roleText}]` : ''} 位于 ${anchor.regionHint} 坐标(${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)})`);
    });
    confirmedDoodads.forEach((doodad, index) => {
      const name = doodad.semanticName || doodad.label || doodad.id;
      const roleText = getRoleDisplay(doodad)?.displayLabel;
      lines.push(`${confirmedAnchors.length + index + 1}. 装饰物 "${name}"${roleText ? ` [${roleText}]` : ''} 位于 ${doodad.regionHint} 坐标(${doodad.x.toFixed(0)}, ${doodad.y.toFixed(0)})`);
    });
    confirmedManual.forEach((manual, index) => {
      const name = manual.semanticName || manual.label || manual.id;
      const roleText = getRoleDisplay(manual)?.displayLabel;
      lines.push(`${confirmedAnchors.length + confirmedDoodads.length + index + 1}. 手动锚点 "${name}"${roleText ? ` [${roleText}]` : ''} 位于 ${manual.regionHint} 坐标(${manual.x.toFixed(0)}, ${manual.y.toFixed(0)})`);
    });
  }

  lines.push('', '请基于这些位置实现以下功能：', featureDescription.trim());
  return lines.join('\n');
}

export function buildHandoffStats(
  anchorSuggestions: ConfirmedAnchor[],
  doodadSuggestions: ConfirmedLandmark[],
  manualAnchors: ConfirmedAnchor[],
) {
  const confirmedItems = [
    ...anchorSuggestions.filter((item) => item.confirmed),
    ...doodadSuggestions.filter((item) => item.confirmed),
    ...manualAnchors.filter((item) => item.confirmed),
  ];
  const roleCount = new Map<string, number>();

  confirmedItems.forEach((item) => {
    if (!item.anchorRole) {
      return;
    }

    const key = getRoleDisplay(item)?.displayLabel || item.anchorRole;
    roleCount.set(key, (roleCount.get(key) || 0) + 1);
  });

  return {
    total: confirmedItems.length,
    keyRoles: Array.from(roleCount.entries())
      .filter(([, count]) => count > 0)
      .slice(0, 3)
      .map(([role]) => role),
  };
}

export function getSelectedSuggestionData(
  selectedSuggestion: SelectedSuggestionRef,
  anchorSuggestions: ConfirmedAnchor[],
  doodadSuggestions: ConfirmedLandmark[],
  manualAnchors: ConfirmedAnchor[],
): SuggestionItem | null {
  if (!selectedSuggestion) {
    return null;
  }

  if (selectedSuggestion.type === 'anchor') {
    return anchorSuggestions[selectedSuggestion.index] || null;
  }
  if (selectedSuggestion.type === 'doodad') {
    return doodadSuggestions[selectedSuggestion.index] || null;
  }
  return manualAnchors[selectedSuggestion.index] || null;
}

export async function copyTextWithFallback(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

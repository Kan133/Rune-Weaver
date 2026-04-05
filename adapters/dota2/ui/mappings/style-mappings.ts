/**
 * Style Mappings for Dota2 UI Adapter
 * 
 * 将 UIDesignSpec 的 visualStyle 映射到 LESS 变量
 */

import { UIVisualStyle, UISurfaceSpec } from "../../../../core/schema/types.js";

export interface StyleVariables {
  // Layout
  modalWidth: number;
  optionWidth: number;
  optionHeight: number;
  gap: number;
  padding: number;
  fontBase: number;
  keySize: number;
  barWidth: number;
  barHeight: number;
  margin: number;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  textMuted: string;
  keyBg: string;
  keyBorder: string;
  trackBg: string;
  trackBorder: string;
  defaultColor: string;
  
  // Animation
  transitionDuration: number;
  
  // Layout flow
  layoutFlow: string;
  layoutDirection: string;
}

// Density presets
const densityMappings = {
  low: {
    modalWidth: 600,
    optionWidth: 220,
    optionHeight: 300,
    gap: 20,
    padding: 30,
    fontBase: 16,
    keySize: 48,
    barWidth: 350,
    barHeight: 24,
    margin: 24,
  },
  medium: {
    modalWidth: 700,
    optionWidth: 200,
    optionHeight: 280,
    gap: 10,
    padding: 20,
    fontBase: 14,
    keySize: 40,
    barWidth: 300,
    barHeight: 20,
    margin: 20,
  },
  high: {
    modalWidth: 900,
    optionWidth: 180,
    optionHeight: 240,
    gap: 5,
    padding: 12,
    fontBase: 12,
    keySize: 32,
    barWidth: 280,
    barHeight: 16,
    margin: 16,
  },
};

// Theme color presets
const themeMappings: Record<string, {
  primary: string;
  secondary: string;
  bg: string;
  border: string;
  text: string;
  textMuted: string;
  keyBg: string;
  keyBorder: string;
  trackBg: string;
  trackBorder: string;
  defaultColor: string;
}> = {
  mystery: {
    primary: "#6b4c9a",
    secondary: "#4a9a8a",
    bg: "#1a1a2e",
    border: "#2d2d44",
    text: "#e0e0ff",
    textMuted: "#8888aa",
    keyBg: "#1a1a2eaa",
    keyBorder: "#6b4c9a",
    trackBg: "#2d2d44",
    trackBorder: "#3d3d5c",
    defaultColor: "#6b4c9a",
  },
  tech: {
    primary: "#4a90d9",
    secondary: "#5cb85c",
    bg: "#0d1117",
    border: "#30363d",
    text: "#c9d1d9",
    textMuted: "#8b949e",
    keyBg: "#0d1117aa",
    keyBorder: "#4a90d9",
    trackBg: "#21262d",
    trackBorder: "#30363d",
    defaultColor: "#4a90d9",
  },
  battle: {
    primary: "#d9534f",
    secondary: "#f0ad4e",
    bg: "#2e1a1a",
    border: "#4d3333",
    text: "#ffe0e0",
    textMuted: "#aa8888",
    keyBg: "#2e1a1aaa",
    keyBorder: "#d9534f",
    trackBg: "#3d2a2a",
    trackBorder: "#4d3333",
    defaultColor: "#d9534f",
  },
  nature: {
    primary: "#5cb85c",
    secondary: "#8fbc8f",
    bg: "#1a2e1a",
    border: "#2d442d",
    text: "#e0ffe0",
    textMuted: "#88aa88",
    keyBg: "#1a2e1aaa",
    keyBorder: "#5cb85c",
    trackBg: "#2d3d2d",
    trackBorder: "#3d5c3d",
    defaultColor: "#5cb85c",
  },
  default: {
    primary: "#4a90d9",
    secondary: "#666666",
    bg: "#000000ee",
    border: "#444444",
    text: "#ffffff",
    textMuted: "#aaaaaa",
    keyBg: "#000000aa",
    keyBorder: "#ffffff",
    trackBg: "#333333",
    trackBorder: "#555555",
    defaultColor: "#4a90d9",
  },
};

export function generateStyleVariables(
  visualStyle: UIVisualStyle = {},
  surfaceSpec?: UISurfaceSpec
): StyleVariables {
  const density = densityMappings[visualStyle.density || "medium"];
  const themeKey = visualStyle.themeKeywords?.[0] || "default";
  const theme = themeMappings[themeKey] || themeMappings.default;

  // Layout hints processing
  const layoutHints = surfaceSpec?.layoutHints || [];
  const layoutFlow = layoutHints.includes("vertical") ? "down" : "right";
  const layoutDirection = layoutHints.includes("vertical") ? "vertical" : "horizontal";

  return {
    ...density,
    primaryColor: theme.primary,
    secondaryColor: theme.secondary,
    bgColor: theme.bg,
    borderColor: theme.border,
    textColor: theme.text,
    textMuted: theme.textMuted,
    keyBg: theme.keyBg,
    keyBorder: theme.keyBorder,
    trackBg: theme.trackBg,
    trackBorder: theme.trackBorder,
    defaultColor: theme.defaultColor,
    transitionDuration: 0.2,
    layoutFlow,
    layoutDirection,
  };
}

export function variablesToLess(vars: StyleVariables): Record<string, string | number> {
  return {
    MODAL_WIDTH: vars.modalWidth,
    OPTION_WIDTH: vars.optionWidth,
    OPTION_HEIGHT: vars.optionHeight,
    GAP: vars.gap,
    PADDING: vars.padding,
    FONT_BASE: vars.fontBase,
    KEY_SIZE: vars.keySize,
    BAR_WIDTH: vars.barWidth,
    BAR_HEIGHT: vars.barHeight,
    MARGIN: vars.margin,
    PRIMARY_COLOR: vars.primaryColor,
    SECONDARY_COLOR: vars.secondaryColor,
    BG_COLOR: vars.bgColor,
    BORDER_COLOR: vars.borderColor,
    TEXT_COLOR: vars.textColor,
    TEXT_MUTED: vars.textMuted,
    KEY_BG: vars.keyBg,
    KEY_BORDER: vars.keyBorder,
    TRACK_BG: vars.trackBg,
    TRACK_BORDER: vars.trackBorder,
    DEFAULT_COLOR: vars.defaultColor,
    TRANSITION_DURATION: vars.transitionDuration,
    LAYOUT_FLOW: vars.layoutFlow,
    LAYOUT_DIRECTION: vars.layoutDirection,
  };
}

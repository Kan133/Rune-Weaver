/**
 * Dota2 UI Adapter
 * 
 * Main entry point for UI generation
 */

export { generateUIComponent, generateUIComponents } from "./generator.js";
export { generateUIIndex, generateSingleFeatureIndex, generateComboIndex } from "./refresh-ui-index.js";
export type {
  UITemplate,
  UIGenerationOptions,
  GeneratedUIComponent,
  UIIndexGenerationOptions,
  GeneratedUIIndex,
} from "./types.js";

// T068-T070: AssemblyPlan -> UI Adapter Integration
export {
  // Core functions
  recognizeUIPatterns,
  generateUIFromAssembly,
  generateUIFromMultipleAssemblies,
  generateUIReviewArtifact,
  checkUIReadinessGates,
  // Utilities
  SUPPORTED_UI_PATTERNS,
  isUIPattern,
  isSupportedUIPattern,
} from "./assembly-ui-adapter.js";

export type {
  UIPatternRecognition,
  AssemblyUIResult,
  UnresolvedUIItem,
  UIAssemblyReviewArtifact,
  UIReadinessGate,
} from "./assembly-ui-adapter.js";

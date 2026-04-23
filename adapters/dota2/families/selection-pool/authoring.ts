import {
  type FeatureAuthoring,
  type FeatureAuthoringNormalizationResult,
  type FeatureAuthoringProposal,
  type ResolveSelectionPoolFamilyInput,
  type ResolveSelectionPoolFamilyResult,
  type SelectionPoolCompiledModuleParameters,
  type SelectionPoolCurrentContextHints,
  type SelectionPoolFamilyMode,
  type SelectionPoolFeatureSourceArtifact,
  type SelectionPoolFeatureSourceArtifactV1,
  type SelectionPoolFeatureSourceArtifactV2,
  type SelectionPoolInventoryContract,
  type SelectionPoolLifecycleState,
  type SelectionPoolSourceAdapter,
  getLegacyTalentDrawSourceArtifactRelativePath,
  getSelectionPoolParameterSurface,
  getSelectionPoolSourceArtifactRelativePath,
  isSelectionPoolFeatureAuthoring,
} from "./shared.js";
import {
  normalizeSelectionPoolFeatureAuthoringProposal,
  resolveSelectionPoolFamily,
} from "./admission.js";
import { extractSelectionPoolAdmissionBlockers } from "./diagnostics.js";
import { detectSelectionPoolFallbackIntent, type DetectSelectionPoolFallbackIntentInput } from "./fallback-detection.js";
import {
  deriveSelectionPoolCurrentContextHints,
  mergeSelectionPoolFeatureAuthoringForUpdate,
} from "./update-merge.js";
import {
  buildSelectionPoolFillContracts,
  compileSelectionPoolModuleParameters,
  createSelectionPoolLifecycleState,
  materializeSelectionPoolSourceArtifact,
} from "./materialization.js";

export type {
  DetectSelectionPoolFallbackIntentInput,
  FeatureAuthoring,
  FeatureAuthoringNormalizationResult,
  FeatureAuthoringProposal,
  ResolveSelectionPoolFamilyInput,
  ResolveSelectionPoolFamilyResult,
  SelectionPoolCompiledModuleParameters,
  SelectionPoolCurrentContextHints,
  SelectionPoolFamilyMode,
  SelectionPoolFeatureSourceArtifact,
  SelectionPoolFeatureSourceArtifactV1,
  SelectionPoolFeatureSourceArtifactV2,
  SelectionPoolInventoryContract,
  SelectionPoolLifecycleState,
  SelectionPoolSourceAdapter,
};

export {
  buildSelectionPoolFillContracts,
  compileSelectionPoolModuleParameters,
  createSelectionPoolLifecycleState,
  detectSelectionPoolFallbackIntent,
  deriveSelectionPoolCurrentContextHints,
  extractSelectionPoolAdmissionBlockers,
  getLegacyTalentDrawSourceArtifactRelativePath,
  getSelectionPoolParameterSurface,
  getSelectionPoolSourceArtifactRelativePath,
  isSelectionPoolFeatureAuthoring,
  materializeSelectionPoolSourceArtifact,
  mergeSelectionPoolFeatureAuthoringForUpdate,
  normalizeSelectionPoolFeatureAuthoringProposal,
  resolveSelectionPoolFamily,
};

export { refreshSelectionPoolWritePlanEntries } from "./lifecycle.js";

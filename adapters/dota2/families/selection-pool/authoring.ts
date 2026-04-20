import {
  type FeatureAuthoring,
  type FeatureAuthoringNormalizationResult,
  type FeatureAuthoringProposal,
  type ResolveSelectionPoolFamilyInput,
  type ResolveSelectionPoolFamilyResult,
  type SelectionPoolCompiledModuleParameters,
  type SelectionPoolCurrentContextHints,
  type SelectionPoolFamilyMode,
  type SelectionPoolFeatureSourceArtifactV1,
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
  FeatureAuthoring,
  FeatureAuthoringNormalizationResult,
  FeatureAuthoringProposal,
  ResolveSelectionPoolFamilyInput,
  ResolveSelectionPoolFamilyResult,
  SelectionPoolCompiledModuleParameters,
  SelectionPoolCurrentContextHints,
  SelectionPoolFamilyMode,
  SelectionPoolFeatureSourceArtifactV1,
  SelectionPoolInventoryContract,
  SelectionPoolLifecycleState,
  SelectionPoolSourceAdapter,
};

export {
  buildSelectionPoolFillContracts,
  compileSelectionPoolModuleParameters,
  createSelectionPoolLifecycleState,
  deriveSelectionPoolCurrentContextHints,
  getLegacyTalentDrawSourceArtifactRelativePath,
  getSelectionPoolParameterSurface,
  getSelectionPoolSourceArtifactRelativePath,
  isSelectionPoolFeatureAuthoring,
  materializeSelectionPoolSourceArtifact,
  mergeSelectionPoolFeatureAuthoringForUpdate,
  normalizeSelectionPoolFeatureAuthoringProposal,
  resolveSelectionPoolFamily,
};

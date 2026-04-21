import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type {
  FeatureContract,
  FeatureDependencyEdge,
} from "../../../core/schema/types.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import type { FeatureAuthoring as SelectionPoolFeatureAuthoring } from "../families/selection-pool/shared.js";

export const GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID = "grantable_primary_hero_ability";
export const DOTA2_PROVIDER_EXPORT_ADAPTER = "dota2_provider_ability_export";
export const DOTA2_SELECTION_GRANT_CONTRACT_ADAPTER = "dota2_selection_grant_contract";
export const DOTA2_SELECTION_GRANT_BINDING_ADAPTER = "dota2_selection_grant_binding";

export type Dota2AbilityExportAttachmentMode = "grant_only" | "auto_on_activate";

export interface Dota2ProviderAbilityExportSurface {
  surfaceId: typeof GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID;
  abilityName: string;
  attachmentMode: Dota2AbilityExportAttachmentMode;
}

export interface Dota2ProviderAbilityExportArtifactV1 {
  adapter: typeof DOTA2_PROVIDER_EXPORT_ADAPTER;
  version: 1;
  featureId: string;
  surfaces: Dota2ProviderAbilityExportSurface[];
}

export interface Dota2SelectionGrantContractSlot {
  objectId: string;
  objectLabel: string;
  targetSurfaceId: typeof GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID;
  relation: "grants";
  applyBehavior: "grant_primary_hero_ability";
}

export interface Dota2SelectionGrantContractArtifactV1 {
  adapter: typeof DOTA2_SELECTION_GRANT_CONTRACT_ADAPTER;
  version: 1;
  featureId: string;
  slots: Dota2SelectionGrantContractSlot[];
}

export interface Dota2SelectionGrantBinding {
  objectId: string;
  targetFeatureId: string;
  targetSurfaceId: typeof GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID;
  relation: "grants";
  applyBehavior: "grant_primary_hero_ability";
}

export interface Dota2SelectionGrantBindingArtifactV1 {
  adapter: typeof DOTA2_SELECTION_GRANT_BINDING_ADAPTER;
  version: 1;
  featureId: string;
  bindings: Dota2SelectionGrantBinding[];
}

export interface Dota2SelectionGrantRuntimePlan {
  featureId: string;
  selectionFlowFile: string;
  selectionFlowClass: string;
  bindings: Array<{ objectId: string; targetFeatureId: string; abilityName: string }>;
}

function readJsonArtifact<T>(hostRoot: string, relativePath: string): T | undefined {
  const fullPath = join(hostRoot, relativePath);
  if (!existsSync(fullPath)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(fullPath, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

export function getProviderExportArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/dota2-provider-ability-export.json`;
}

export function getSelectionGrantContractArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/selection-grant-contract.json`;
}

export function getSelectionGrantBindingArtifactRelativePath(featureId: string): string {
  return `game/scripts/src/rune_weaver/features/${featureId}/selection-grant-bindings.json`;
}

export function readProviderAbilityExportArtifact(
  hostRoot: string,
  featureId: string,
): Dota2ProviderAbilityExportArtifactV1 | undefined {
  const artifact = readJsonArtifact<Dota2ProviderAbilityExportArtifactV1>(
    hostRoot,
    getProviderExportArtifactRelativePath(featureId),
  );
  if (!artifact || artifact.adapter !== DOTA2_PROVIDER_EXPORT_ADAPTER || artifact.version !== 1) {
    return undefined;
  }
  if (!Array.isArray(artifact.surfaces)) {
    return undefined;
  }
  return artifact;
}

export function readSelectionGrantContractArtifact(
  hostRoot: string,
  featureId: string,
): Dota2SelectionGrantContractArtifactV1 | undefined {
  const artifact = readJsonArtifact<Dota2SelectionGrantContractArtifactV1>(
    hostRoot,
    getSelectionGrantContractArtifactRelativePath(featureId),
  );
  if (!artifact || artifact.adapter !== DOTA2_SELECTION_GRANT_CONTRACT_ADAPTER || artifact.version !== 1) {
    return undefined;
  }
  if (!Array.isArray(artifact.slots)) {
    return undefined;
  }
  return artifact;
}

export function readSelectionGrantBindingArtifact(
  hostRoot: string,
  featureId: string,
): Dota2SelectionGrantBindingArtifactV1 | undefined {
  const artifact = readJsonArtifact<Dota2SelectionGrantBindingArtifactV1>(
    hostRoot,
    getSelectionGrantBindingArtifactRelativePath(featureId),
  );
  if (!artifact || artifact.adapter !== DOTA2_SELECTION_GRANT_BINDING_ADAPTER || artifact.version !== 1) {
    return undefined;
  }
  if (!Array.isArray(artifact.bindings)) {
    return undefined;
  }
  return artifact;
}

export function buildProviderAbilityExportArtifact(
  featureId: string,
  abilityName: string,
  attachmentMode: Dota2AbilityExportAttachmentMode,
): Dota2ProviderAbilityExportArtifactV1 {
  return {
    adapter: DOTA2_PROVIDER_EXPORT_ADAPTER,
    version: 1,
    featureId,
    surfaces: [
      {
        surfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
        abilityName,
        attachmentMode,
      },
    ],
  };
}

export function buildSelectionGrantContractArtifact(
  featureId: string,
  featureAuthoring: SelectionPoolFeatureAuthoring,
): Dota2SelectionGrantContractArtifactV1 {
  return {
    adapter: DOTA2_SELECTION_GRANT_CONTRACT_ADAPTER,
    version: 1,
    featureId,
    slots: featureAuthoring.parameters.objects.map((object) => ({
      objectId: object.id,
      objectLabel: object.label,
      targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
      relation: "grants",
      applyBehavior: "grant_primary_hero_ability",
    })),
  };
}

export function buildSelectionGrantBindingArtifact(
  featureId: string,
  bindings: Dota2SelectionGrantBinding[],
): Dota2SelectionGrantBindingArtifactV1 {
  return {
    adapter: DOTA2_SELECTION_GRANT_BINDING_ADAPTER,
    version: 1,
    featureId,
    bindings,
  };
}

export function appendJsonEntry(
  writePlan: WritePlan,
  targetPath: string,
  contentSummary: string,
  parameters: Record<string, unknown>,
  metadata: Record<string, unknown>,
  refreshWritePlanDerivedFields: (writePlan: WritePlan) => void,
): void {
  const existingIndex = writePlan.entries.findIndex((entry) => entry.targetPath === targetPath);
  const nextEntry: WritePlanEntry = {
    operation: existingIndex >= 0 ? writePlan.entries[existingIndex].operation : "create",
    targetPath,
    contentType: "json",
    contentSummary,
    sourcePattern: metadata.sourcePattern as string,
    sourceModule: metadata.sourceModule as string,
    safe: true,
    parameters,
    metadata,
  };

  if (existingIndex >= 0) {
    writePlan.entries[existingIndex] = nextEntry;
    refreshWritePlanDerivedFields(writePlan);
    return;
  }

  writePlan.entries.push(nextEntry);
  refreshWritePlanDerivedFields(writePlan);
}

export function appendProviderExportEntry(
  writePlan: WritePlan,
  featureId: string,
  artifact: Dota2ProviderAbilityExportArtifactV1,
  refreshWritePlanDerivedFields: (writePlan: WritePlan) => void,
): void {
  appendJsonEntry(
    writePlan,
    getProviderExportArtifactRelativePath(featureId),
    `dota2 provider ability export (${artifact.surfaces[0].attachmentMode})`,
    artifact as unknown as Record<string, unknown>,
    {
      adapter: DOTA2_PROVIDER_EXPORT_ADAPTER,
      sourcePattern: "rw.dota2_provider_ability_export",
      sourceModule: "dota2_provider_ability_export",
    },
    refreshWritePlanDerivedFields,
  );
}

export function appendSelectionGrantContractEntry(
  writePlan: WritePlan,
  featureId: string,
  artifact: Dota2SelectionGrantContractArtifactV1,
  refreshWritePlanDerivedFields: (writePlan: WritePlan) => void,
): void {
  appendJsonEntry(
    writePlan,
    getSelectionGrantContractArtifactRelativePath(featureId),
    `dota2 selection grant contract (${artifact.slots.length})`,
    artifact as unknown as Record<string, unknown>,
    {
      adapter: DOTA2_SELECTION_GRANT_CONTRACT_ADAPTER,
      sourcePattern: "rw.dota2_selection_grant_contract",
      sourceModule: "dota2_selection_grant_contract",
    },
    refreshWritePlanDerivedFields,
  );
}

export function appendSelectionGrantBindingEntry(
  writePlan: WritePlan,
  featureId: string,
  artifact: Dota2SelectionGrantBindingArtifactV1,
  refreshWritePlanDerivedFields: (writePlan: WritePlan) => void,
): void {
  appendJsonEntry(
    writePlan,
    getSelectionGrantBindingArtifactRelativePath(featureId),
    `dota2 selection grant bindings (${artifact.bindings.length})`,
    artifact as unknown as Record<string, unknown>,
    {
      adapter: DOTA2_SELECTION_GRANT_BINDING_ADAPTER,
      sourcePattern: "rw.dota2_selection_grant_binding",
      sourceModule: "dota2_selection_grant_binding",
    },
    refreshWritePlanDerivedFields,
  );
}

export function ensureGrantableAbilitySurface(contract?: FeatureContract): FeatureContract {
  const exports = [...(contract?.exports || [])];
  if (!exports.some((item) => item.id === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID)) {
    exports.push({
      id: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
      kind: "capability",
      summary: "Can grant one primary hero ability through the Dota2 host ability surface.",
    });
  }

  return {
    exports,
    consumes: [...(contract?.consumes || [])],
    integrationSurfaces: [...(contract?.integrationSurfaces || [])],
    stateScopes: [...(contract?.stateScopes || [])],
  };
}

export function ensureConsumesGrantableAbilitySurface(contract?: FeatureContract): FeatureContract {
  const consumes = [...(contract?.consumes || [])];
  if (!consumes.some((item) => item.id === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID)) {
    consumes.push({
      id: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
      kind: "capability",
      summary: "Consumes a provider feature that can grant one primary hero ability.",
    });
  }

  return {
    exports: [...(contract?.exports || [])],
    consumes,
    integrationSurfaces: [...(contract?.integrationSurfaces || [])],
    stateScopes: [...(contract?.stateScopes || [])],
  };
}

export function ensureGrantDependencyEdge(
  dependencyEdges: FeatureDependencyEdge[] | undefined,
  targetFeatureId: string,
): FeatureDependencyEdge[] {
  const existing = dependencyEdges || [];
  if (
    existing.some(
      (edge) =>
        edge.targetFeatureId === targetFeatureId
        && edge.targetSurfaceId === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
        && edge.relation === "grants",
    )
  ) {
    return existing;
  }

  return [
    ...existing,
    {
      relation: "grants",
      targetFeatureId,
      targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
      required: true,
      summary: `cross-feature reward grants:${targetFeatureId}:${GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID}`,
    },
  ];
}

function isGeneratedSelectionFlowModule(fileName: string): boolean {
  return fileName.endsWith("_rule_selection_flow");
}

function toPascalCase(value: string): string {
  return value
    .replace(/^[a-z]/, (char) => char.toUpperCase())
    .replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase())
    .replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
}

export function buildSelectionGrantRuntimePlans(
  hostRoot: string,
  features: RuneWeaverFeatureRecord[],
): Dota2SelectionGrantRuntimePlan[] {
  const plans: Dota2SelectionGrantRuntimePlan[] = [];

  for (const feature of features.filter((candidate) => candidate.status === "active")) {
    const bindingArtifact = readSelectionGrantBindingArtifact(hostRoot, feature.featureId);
    if (!bindingArtifact?.bindings?.length) {
      continue;
    }

    const selectionFlowFile = feature.generatedFiles
      .map((file) => file.split("/").pop()?.replace(".ts", ""))
      .find((fileName): fileName is string => Boolean(fileName && isGeneratedSelectionFlowModule(fileName)));
    if (!selectionFlowFile) {
      continue;
    }

    const bindings = bindingArtifact.bindings.flatMap((binding) => {
      const providerArtifact = readProviderAbilityExportArtifact(hostRoot, binding.targetFeatureId);
      const providerSurface = providerArtifact?.surfaces.find(
        (surface) => surface.surfaceId === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
      );
      if (!providerSurface) {
        return [];
      }
      return [{
        objectId: binding.objectId,
        targetFeatureId: binding.targetFeatureId,
        abilityName: providerSurface.abilityName,
      }];
    });
    if (bindings.length === 0) {
      continue;
    }

    plans.push({
      featureId: feature.featureId,
      selectionFlowFile,
      selectionFlowClass: toPascalCase(selectionFlowFile),
      bindings,
    });
  }

  return plans;
}

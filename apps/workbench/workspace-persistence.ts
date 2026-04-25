import { createWritePlan, type WritePlanEntry } from "../../adapters/dota2/assembler/index.js";
import type { AssemblyPlan, Blueprint } from "../../core/schema/types.js";
import { findFeatureById, loadWorkspace } from "../../core/workspace/manager.js";
import type { EntryBinding } from "../../core/workspace/types.js";
import { updateWorkspaceState } from "../cli/helpers/workspace-integration.js";
import type { BlueprintProposal, IntegrationPointRegistry } from "./types.js";

export type WorkbenchPersistenceReport =
  | { status: "workspace-unavailable" }
  | { status: "feature-exists"; featureId: string }
  | { status: "failed"; error: string }
  | {
      status: "persisted";
      featureId: string;
      blueprintId: string;
      selectedPatterns: string[];
      generatedFiles: string[];
      entryBindings: string[];
    };

function buildWorkbenchAssemblyPlan(blueprintProposal: BlueprintProposal): AssemblyPlan {
  return {
    blueprintId: blueprintProposal.id,
    selectedPatterns: blueprintProposal.proposedModules.map((module) => ({
      patternId: module.proposedPatternIds[0] || "",
      role: module.role,
    })),
    writeTargets: [],
    bridgeUpdates: [],
    validations: [],
    readyForHostWrite: true,
  };
}

function buildEntryBindings(integrationPoints: IntegrationPointRegistry): EntryBinding[] {
  const entryBindings: EntryBinding[] = [];

  if (
    integrationPoints.points.some(
      (point) => point.kind === "trigger_binding" || point.kind === "lua_table",
    )
  ) {
    entryBindings.push({
      target: "server",
      file: "game/scripts/src/modules/index.ts",
      kind: "import",
    });
  }

  if (integrationPoints.points.some((point) => point.kind === "ui_mount")) {
    entryBindings.push({
      target: "ui",
      file: "content/panorama/src/hud/script.tsx",
      kind: "mount",
    });
  }

  return entryBindings;
}

export function persistWorkbenchFeature(input: {
  hostRoot: string;
  featureId: string;
  blueprintProposal: BlueprintProposal;
  integrationPoints: IntegrationPointRegistry;
}): WorkbenchPersistenceReport {
  const { hostRoot, featureId, blueprintProposal, integrationPoints } = input;
  const workspaceResult = loadWorkspace(hostRoot);

  if (!workspaceResult.success || !workspaceResult.workspace) {
    return { status: "workspace-unavailable" };
  }

  const existing = findFeatureById(workspaceResult.workspace, featureId);
  if (existing) {
    return {
      status: "feature-exists",
      featureId,
    };
  }

  const assemblyPlan = buildWorkbenchAssemblyPlan(blueprintProposal);
  const writePlan = createWritePlan(assemblyPlan, hostRoot, featureId);
  const entryBindings = buildEntryBindings(integrationPoints);

  const workspaceUpdateResult = updateWorkspaceState(
    hostRoot,
    { id: blueprintProposal.id, sourceIntent: { intentKind: "micro-feature" } } as Blueprint,
    assemblyPlan,
    writePlan,
    "create",
    featureId,
    null,
  );

  if (!workspaceUpdateResult.success) {
    return {
      status: "failed",
      error: workspaceUpdateResult.error ?? "Unknown workspace update error",
    };
  }

  const selectedPatterns = blueprintProposal.proposedModules.flatMap(
    (module) => module.proposedPatternIds,
  );
  const generatedFiles = writePlan.entries
    .filter((entry: WritePlanEntry) => !entry.deferred)
    .map((entry: WritePlanEntry) => entry.targetPath);

  return {
    status: "persisted",
    featureId,
    blueprintId: blueprintProposal.id,
    selectedPatterns,
    generatedFiles,
    entryBindings: entryBindings.map((binding) => `${binding.target}:${binding.file}`),
  };
}

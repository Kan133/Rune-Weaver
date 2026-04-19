import type {
  Blueprint,
  FeatureAuthoring as CoreFeatureAuthoring,
  ModuleImplementationRecord,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolParameterSurface,
  NormalizedBlueprintStatus,
  IntentSchema,
  UpdateIntent,
} from "../../../core/schema/types.js";
import type { RuneWeaverFeatureRecord } from "../../../core/workspace/types.js";
import {
  buildSelectionPoolFillContracts,
  compileSelectionPoolModuleParameters,
  isSelectionPoolFeatureAuthoring,
  mergeSelectionPoolFeatureAuthoringForUpdate,
  normalizeSelectionPoolFeatureAuthoringProposal,
  resolveSelectionPoolFamily,
} from "../families/selection-pool/index.js";

type SelectionPoolFeatureAuthoring = CoreFeatureAuthoring<
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolParameterSurface
>;

const SELECTION_POOL_FAMILY_ID = "selection_pool";

export interface Dota2BlueprintEnrichmentResult<TBlueprint extends Blueprint = Blueprint> {
  blueprint: TBlueprint | null;
  status: NormalizedBlueprintStatus;
  issues: string[];
}

function weakenUnlessBlocked(status: NormalizedBlueprintStatus | undefined): NormalizedBlueprintStatus {
  return status === "blocked" ? "blocked" : "weak";
}

function applySelectionPoolModuleParameters<TBlueprint extends Blueprint>(
  blueprint: TBlueprint,
  featureAuthoring: SelectionPoolFeatureAuthoring,
): TBlueprint {
  const compiled = compileSelectionPoolModuleParameters(featureAuthoring);
  const modules = blueprint.modules.map((module) => {
    const override =
      module.role === "input_trigger"
        ? compiled.input_trigger
        : module.role === "weighted_pool"
          ? compiled.weighted_pool
          : module.role === "selection_flow"
            ? compiled.selection_flow
            : module.role === "selection_modal"
              ? compiled.selection_modal
              : undefined;

    return override
      ? {
          ...module,
          parameters: {
            ...(module.parameters || {}),
            ...override,
          },
        }
      : module;
  });
  const fillContracts = buildSelectionPoolFillContracts(modules);
  const fillContractIdsByModule = new Map<string, string[]>();
  for (const fillContract of fillContracts) {
    const existing = fillContractIdsByModule.get(fillContract.targetModuleId) || [];
    existing.push(fillContract.boundaryId);
    fillContractIdsByModule.set(fillContract.targetModuleId, existing);
  }
  const moduleRecords: ModuleImplementationRecord[] = modules.map((module) => ({
    moduleId: module.id,
    role: module.role,
    category: module.category,
    sourceKind: "family",
    familyId: SELECTION_POOL_FAMILY_ID,
    patternId: module.patternIds?.[0],
    selectedPatternIds: module.patternIds || [],
    artifactTargets: deriveModuleArtifactTargets(module.category),
    ownedPaths: [],
    fillContractIds: fillContractIdsByModule.get(module.id) || [],
    reviewRequired: false,
    requiresReview: false,
    reviewReasons: [],
    implementationStrategy: "family",
    maturity: "templated",
    outputKinds: deriveModuleOutputKinds(module.category),
    resolvedFrom: "family",
    summary: `Selection pool family skeleton for module '${module.role}'`,
  }));
  const existingFamilies = new Set(blueprint.designDraft?.retrievedFamilyCandidates || []);
  existingFamilies.add(SELECTION_POOL_FAMILY_ID);

  return {
    ...blueprint,
    modules,
    featureAuthoring,
    moduleRecords,
    designDraft: blueprint.designDraft
      ? {
          ...blueprint.designDraft,
          retrievedFamilyCandidates: [...existingFamilies],
          chosenImplementationStrategy: "family",
          reuseConfidence: "high",
          notes: [
            ...(blueprint.designDraft.notes || []),
            "Selection pool family matched and authored as the bounded source-backed skeleton.",
          ],
        }
      : blueprint.designDraft,
    implementationStrategy: "family",
    maturity: "templated",
    ...(fillContracts.length > 0 ? { fillContracts } : {}),
  };
}

function deriveModuleArtifactTargets(
  category: NonNullable<Blueprint["modules"][number]>["category"],
): string[] {
  switch (category) {
    case "ui":
      return ["ui"];
    case "integration":
      return ["bridge"];
    case "effect":
      return ["server", "config", "lua"];
    case "data":
      return ["server", "shared"];
    default:
      return ["server"];
  }
}

function deriveModuleOutputKinds(
  category: NonNullable<Blueprint["modules"][number]>["category"],
): Array<"server" | "shared" | "ui" | "bridge"> {
  switch (category) {
    case "ui":
      return ["ui"];
    case "integration":
      return ["bridge"];
    case "data":
      return ["server", "shared"];
    default:
      return ["server"];
  }
}

export function enrichDota2CreateBlueprint<TBlueprint extends Blueprint>(
  blueprint: TBlueprint,
  input: {
    schema: IntentSchema;
    prompt: string;
    hostRoot: string;
    mode?: "create" | "update" | "regenerate";
    featureId?: string;
    existingFeature?: RuneWeaverFeatureRecord | null;
    proposalSource?: "llm" | "fallback";
  },
): Dota2BlueprintEnrichmentResult<TBlueprint> {
  const resolution = resolveSelectionPoolFamily({
    prompt: input.prompt,
    hostRoot: input.hostRoot,
    mode: input.mode || "create",
    featureId: input.featureId,
    existingFeature: input.existingFeature || null,
    proposalSource: input.proposalSource || "llm",
  });

  if (!resolution.handled || !resolution.proposal) {
    return {
      blueprint,
      status: (blueprint.status || "ready") as NormalizedBlueprintStatus,
      issues: [],
    };
  }

  if (resolution.blocked) {
    return {
      blueprint: {
        ...blueprint,
        status: weakenUnlessBlocked(blueprint.status as NormalizedBlueprintStatus | undefined),
      },
      status: weakenUnlessBlocked(blueprint.status as NormalizedBlueprintStatus | undefined),
      issues: resolution.reasons,
    };
  }

  const normalized = normalizeSelectionPoolFeatureAuthoringProposal(input.schema, resolution.proposal);
  if (!normalized.featureAuthoring || normalized.blockers.length > 0) {
    return {
      blueprint: {
        ...blueprint,
        status: weakenUnlessBlocked(blueprint.status as NormalizedBlueprintStatus | undefined),
      },
      status: weakenUnlessBlocked(blueprint.status as NormalizedBlueprintStatus | undefined),
      issues: [...normalized.blockers, ...normalized.warnings],
    };
  }

  const enriched = applySelectionPoolModuleParameters(blueprint, normalized.featureAuthoring);
  const status: NormalizedBlueprintStatus =
    normalized.warnings.length > 0 && (enriched.status || "ready") === "ready"
      ? "weak"
      : (enriched.status || "ready") as NormalizedBlueprintStatus;

  return {
    blueprint: {
      ...enriched,
      status,
    },
    status,
    issues: [...normalized.warnings],
  };
}

export function enrichDota2UpdateBlueprint<TBlueprint extends Blueprint>(
  blueprint: TBlueprint,
  updateIntent: UpdateIntent,
): Dota2BlueprintEnrichmentResult<TBlueprint> {
  const currentFeatureAuthoring = updateIntent.currentFeatureContext.featureAuthoring;
  if (!isSelectionPoolFeatureAuthoring(currentFeatureAuthoring)) {
    return {
      blueprint,
      status: (blueprint.status || "ready") as NormalizedBlueprintStatus,
      issues: [],
    };
  }

  const mergedFeatureAuthoring = mergeSelectionPoolFeatureAuthoringForUpdate({
    currentFeatureAuthoring,
    requestedChange: updateIntent.requestedChange,
    updateIntent,
  });

  return {
    blueprint: applySelectionPoolModuleParameters(blueprint, mergedFeatureAuthoring),
    status: (blueprint.status || "ready") as NormalizedBlueprintStatus,
    issues: [],
  };
}

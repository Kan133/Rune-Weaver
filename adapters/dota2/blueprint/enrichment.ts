import type {
  Blueprint,
  FeatureAuthoring as CoreFeatureAuthoring,
  ModuleImplementationRecord,
  PatternHint,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolAdmissionDiagnostics,
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
const SELECTION_POOL_PATTERN_IDS = {
  input_trigger: "input.key_binding",
  weighted_pool: "data.weighted_pool",
  selection_flow: "rule.selection_flow",
  selection_modal: "ui.selection_modal",
} as const;

export interface Dota2BlueprintEnrichmentResult<TBlueprint extends Blueprint = Blueprint> {
  blueprint: TBlueprint | null;
  status: NormalizedBlueprintStatus;
  issues: string[];
  admissionDiagnostics?: SelectionPoolAdmissionDiagnostics;
}

function applySelectionPoolModuleParameters<TBlueprint extends Blueprint>(
  blueprint: TBlueprint,
  featureAuthoring: SelectionPoolFeatureAuthoring,
): TBlueprint {
  const modules = buildSelectionPoolFamilyModules(featureAuthoring);
  const connections = buildSelectionPoolFamilyConnections();
  const patternHints = buildSelectionPoolFamilyPatternHints();
  const fillContracts = buildSelectionPoolFillContracts(modules);
  const fillContractIdsByModule = new Map<string, string[]>();
  for (const fillContract of fillContracts) {
    const existing = fillContractIdsByModule.get(fillContract.targetModuleId) || [];
    existing.push(fillContract.boundaryId);
    fillContractIdsByModule.set(fillContract.targetModuleId, existing);
  }
  const moduleRecords = buildSelectionPoolModuleRecords(modules, fillContractIdsByModule);
  const existingFamilies = new Set(blueprint.designDraft?.retrievedFamilyCandidates || []);
  existingFamilies.add(SELECTION_POOL_FAMILY_ID);
  const existingPatterns = new Set(blueprint.designDraft?.retrievedPatternCandidates || []);
  for (const hint of patternHints) {
    for (const patternId of hint.suggestedPatterns) {
      existingPatterns.add(patternId);
    }
  }

  return {
    ...blueprint,
    modules,
    moduleFacets: [],
    moduleNeeds: [],
    unresolvedModuleNeeds: [],
    connections,
    patternHints,
    featureAuthoring,
    moduleRecords,
    readyForAssembly: true,
    status: blueprint.status === "blocked" ? "blocked" : "ready",
    designDraft: blueprint.designDraft
      ? {
          ...blueprint.designDraft,
          retrievedFamilyCandidates: [...existingFamilies],
          retrievedPatternCandidates: [...existingPatterns],
          chosenImplementationStrategy: "family",
          reuseConfidence: "high",
          artifactTargets: ["server", "shared", "ui"],
          notes: [
            ...(blueprint.designDraft.notes || []),
            "Selection pool family matched and authored as the bounded source-backed skeleton.",
          ],
        }
      : blueprint.designDraft,
    implementationStrategy: "family",
    maturity: "templated",
    ...(blueprint.commitDecision
      ? {
          commitDecision: {
            ...blueprint.commitDecision,
            canAssemble: true,
          },
        }
      : {}),
    ...(fillContracts.length > 0 ? { fillContracts } : {}),
  };
}

function buildSelectionPoolFamilyModules(
  featureAuthoring: SelectionPoolFeatureAuthoring,
): Blueprint["modules"] {
  const compiled = compileSelectionPoolModuleParameters(featureAuthoring);
  return [
    {
      id: "selection_input",
      role: "input_trigger",
      category: "trigger",
      patternIds: [SELECTION_POOL_PATTERN_IDS.input_trigger],
      responsibilities: [
        "Listen for the admitted selection_pool trigger key.",
        "Emit the family-local selection trigger event.",
      ],
      outputs: ["selection_open_request"],
      parameters: compiled.input_trigger,
    },
    {
      id: "selection_pool",
      role: "weighted_pool",
      category: "data",
      patternIds: [SELECTION_POOL_PATTERN_IDS.weighted_pool],
      responsibilities: [
        "Keep the feature-owned weighted candidate pool inside the current feature boundary.",
        "Expose bounded draw inputs for the selection flow.",
      ],
      outputs: ["candidate_options"],
      parameters: compiled.weighted_pool,
    },
    {
      id: "selection_flow",
      role: "selection_flow",
      category: "rule",
      patternIds: [SELECTION_POOL_PATTERN_IDS.selection_flow],
      responsibilities: [
        "Draw weighted candidates and enforce single-choice confirmation.",
        "Apply post-selection pool behavior inside the bounded family contract.",
      ],
      inputs: ["selection_open_request", "candidate_options", "selection_confirm"],
      outputs: ["selection_ui_payload", "selection_commit"],
      parameters: compiled.selection_flow,
    },
    {
      id: "selection_modal",
      role: "selection_modal",
      category: "ui",
      patternIds: [SELECTION_POOL_PATTERN_IDS.selection_modal],
      responsibilities: [
        "Render the current-feature selection UI surface.",
        "Collect the player's confirmed choice for the selection flow.",
      ],
      inputs: ["selection_ui_payload"],
      outputs: ["selection_confirm"],
      parameters: compiled.selection_modal,
    },
  ];
}

function buildSelectionPoolFamilyConnections(): Blueprint["connections"] {
  return [
    {
      from: "selection_input",
      to: "selection_flow",
      purpose: "Start the bounded selection flow from the admitted trigger.",
    },
    {
      from: "selection_pool",
      to: "selection_flow",
      purpose: "Provide weighted candidate data and pool-state inputs.",
    },
    {
      from: "selection_flow",
      to: "selection_modal",
      purpose: "Project draw results into the current-feature selection UI.",
    },
    {
      from: "selection_modal",
      to: "selection_flow",
      purpose: "Return the player's confirmed choice to the selection flow.",
    },
  ];
}

function buildSelectionPoolFamilyPatternHints(): PatternHint[] {
  return [
    {
      category: "trigger",
      suggestedPatterns: [SELECTION_POOL_PATTERN_IDS.input_trigger],
      rationale: "selection_pool uses one local input trigger surface.",
    },
    {
      category: "data",
      suggestedPatterns: [SELECTION_POOL_PATTERN_IDS.weighted_pool],
      rationale: "selection_pool keeps a feature-owned weighted candidate pool.",
    },
    {
      category: "rule",
      suggestedPatterns: [SELECTION_POOL_PATTERN_IDS.selection_flow],
      rationale: "selection_pool commits one confirmed candidate per draw.",
    },
    {
      category: "ui",
      suggestedPatterns: [SELECTION_POOL_PATTERN_IDS.selection_modal],
      rationale: "selection_pool exposes a current-feature selection modal surface.",
    },
  ];
}

function buildSelectionPoolModuleRecords(
  modules: Blueprint["modules"],
  fillContractIdsByModule: Map<string, string[]>,
): ModuleImplementationRecord[] {
  const records: ModuleImplementationRecord[] = modules.map((module) => ({
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
    summary: `Selection pool family module '${module.role}' projected from source-backed authoring truth.`,
  }));

  records.push({
    moduleId: "selection_effect",
    role: "effect_application",
    category: "effect",
    sourceKind: "family",
    familyId: SELECTION_POOL_FAMILY_ID,
    selectedPatternIds: [],
    artifactTargets: ["server"],
    ownedPaths: [],
    fillContractIds: [],
    reviewRequired: false,
    requiresReview: false,
    reviewReasons: [],
    implementationStrategy: "family",
    maturity: "templated",
    outputKinds: ["server"],
    resolvedFrom: "family",
    summary: "Selection pool keeps chosen-effect application inside the bounded family contract.",
  });

  return records;
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

function projectAdmissionIssues(
  diagnostics: SelectionPoolAdmissionDiagnostics | undefined,
  warnings: string[] = [],
): string[] {
  if (!diagnostics) {
    return warnings;
  }

  if (diagnostics.verdict === "admitted_explicit" || diagnostics.verdict === "admitted_compressed") {
    return warnings;
  }

  return [];
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
    schema: input.schema,
    featureId: input.featureId,
    existingFeature: input.existingFeature || null,
    proposalSource: input.proposalSource || "llm",
  });

  if (!resolution.handled || !resolution.proposal) {
    return {
      blueprint,
      status: (blueprint.status || "ready") as NormalizedBlueprintStatus,
      issues: projectAdmissionIssues(resolution.admissionDiagnostics),
      admissionDiagnostics: resolution.admissionDiagnostics,
    };
  }

  if (resolution.blocked) {
    return {
      blueprint,
      status: (blueprint.status || "ready") as NormalizedBlueprintStatus,
      issues: projectAdmissionIssues(resolution.admissionDiagnostics),
      admissionDiagnostics: resolution.admissionDiagnostics,
    };
  }

  const normalized = normalizeSelectionPoolFeatureAuthoringProposal(
    input.schema,
    resolution.proposal,
    resolution.admissionDiagnostics,
  );
  if (!normalized.featureAuthoring) {
    return {
      blueprint,
      status: (blueprint.status || "ready") as NormalizedBlueprintStatus,
      issues: projectAdmissionIssues(normalized.admissionDiagnostics, normalized.warnings),
      admissionDiagnostics: normalized.admissionDiagnostics,
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
    issues: projectAdmissionIssues(normalized.admissionDiagnostics, normalized.warnings),
    admissionDiagnostics: normalized.admissionDiagnostics,
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

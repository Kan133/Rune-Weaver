import type {
  BlueprintModule,
  IntentSchema,
  ModuleFacetSpec,
} from "../schema/types.js";
import {
  inferIntegrationHints,
  inferInvariants,
  inferOptionalCapabilities,
  inferRequiredCapabilities,
  inferRequiredOutputs,
  inferStateExpectations,
} from "./blueprint-semantic-shaping.js";
import {
  classifySchedulerTimerRisk,
  classifySpawnEmissionRisk,
  detectFollowOwnerMotionSignals,
  detectSelectionFlowAsk,
} from "./seam-authority.js";

export interface ModulePlanningResult {
  modules: BlueprintModule[];
  moduleFacets: ModuleFacetSpec[];
}

export function buildModulePlanning(
  schema: IntentSchema,
  flatModules: BlueprintModule[],
  modulePrefix: string,
): ModulePlanningResult {
  if (!isGameplayAbilityBackboneEligible(schema, flatModules)) {
    return {
      modules: flatModules.map((module) => ({
        ...module,
        planningKind: module.planningKind || "templated_module",
      })),
      moduleFacets: [],
    };
  }

  return buildGameplayAbilityBackbonePlan(schema, flatModules, modulePrefix);
}

export function isGameplayAbilityBackboneEligible(
  schema: IntentSchema,
  flatModules: BlueprintModule[],
): boolean {
  if (detectSelectionFlowAsk(schema)) {
    return false;
  }
  if ((schema.requirements.typed || []).some((requirement) => requirement.kind === "integration")) {
    return false;
  }
  if ((schema.composition?.dependencies?.length || 0) > 0) {
    return false;
  }
  if ((schema.integrations?.expectedBindings || []).some((binding) => binding.kind === "data-source")) {
    return false;
  }
  if ((schema.stateModel?.states || []).some((state) =>
    state.owner === "external"
      || state.owner === "session"
      || state.lifetime === "persistent",
  )) {
    return false;
  }

  const schedulerRisk = classifySchedulerTimerRisk(schema);
  const spawnRisk = classifySpawnEmissionRisk(schema);
  const hasSessionStateFacet = flatModules.some((module) => module.role === "session_state");
  const typedKinds = new Set((schema.requirements.typed || []).map((requirement) => requirement.kind));
  const hasAbilityLifecycleSignal =
    typedKinds.has("trigger")
      || typedKinds.has("effect")
      || schema.normalizedMechanics.trigger
      || schema.normalizedMechanics.outcomeApplication
      || (schema.interaction?.activations?.length || 0) > 0;
  const hasBackboneSignal =
    hasAbilityLifecycleSignal
      && (
        schedulerRisk === "synthesis_required"
          || spawnRisk === "synthesis_required"
          || hasSessionStateFacet
      );
  if (!hasBackboneSignal) {
    return false;
  }

  return flatModules.some((module) =>
    ["trigger", "data", "rule", "effect", "resource"].includes(module.category),
  );
}

function buildGameplayAbilityBackbonePlan(
  schema: IntentSchema,
  flatModules: BlueprintModule[],
  modulePrefix: string,
): ModulePlanningResult {
  const backboneModuleId = `${modulePrefix}gameplay_backbone_0`;
  const collapseCandidates = flatModules.filter((module) => module.category !== "ui" && module.category !== "integration");
  const moduleFacets: ModuleFacetSpec[] = collapseCandidates.map((module, index) =>
    createFacetFromModule(module, schema, backboneModuleId, index),
  );

  if (detectFollowOwnerMotionSignals(schema) && !moduleFacets.some((facet) => facet.kind === "motion")) {
    moduleFacets.push({
      facetId: `${backboneModuleId}__motion_follow_owner`,
      backboneModuleId,
      kind: "motion",
      role: "follow_owner_motion",
      category: "effect",
      requiredCapabilities: [],
      optionalCapabilities: ["entity.motion.follow_owner"],
      integrationHints: ["entity.motion.follow_owner"],
    });
  }

  const backboneModule: BlueprintModule = {
    id: backboneModuleId,
    role: "gameplay_ability",
    category: "effect",
    planningKind: "backbone",
    backboneKind: "gameplay_ability",
    facetIds: moduleFacets.map((facet) => facet.facetId),
    responsibilities: Array.from(new Set(collapseCandidates.flatMap((module) => module.responsibilities || []))),
    inputs: Array.from(new Set(collapseCandidates.flatMap((module) => module.inputs || []))),
    outputs: Array.from(new Set(collapseCandidates.flatMap((module) => module.outputs || []))),
    parameters: collapseCandidates.reduce<Record<string, unknown>>(
      (merged, module) => ({ ...merged, ...(module.parameters || {}) }),
      {},
    ),
  };

  const separateModules = flatModules
    .filter((module) => module.category === "ui" || module.category === "integration")
    .map((module) => ({
      ...module,
      planningKind: "templated_module" as const,
    }));

  return {
    modules: [backboneModule, ...separateModules],
    moduleFacets,
  };
}

function createFacetFromModule(
  module: BlueprintModule,
  schema: IntentSchema,
  backboneModuleId: string,
  index: number,
): ModuleFacetSpec {
  return {
    facetId: `${backboneModuleId}__${module.role}_${index}`,
    backboneModuleId,
    kind: resolveFacetKind(module),
    role: module.role,
    category: module.category,
    requiredCapabilities: inferRequiredCapabilities(module, schema),
    optionalCapabilities: inferOptionalCapabilities(module, schema),
    requiredOutputs: inferRequiredOutputs(module, schema),
    stateExpectations: inferStateExpectations(module, schema),
    integrationHints: inferIntegrationHints(module, schema),
    invariants: inferInvariants(module, schema),
  };
}

function resolveFacetKind(
  module: BlueprintModule,
): ModuleFacetSpec["kind"] {
  if (module.category === "trigger") {
    return "trigger";
  }
  if (module.category === "resource") {
    return "resource";
  }
  if (module.category === "data") {
    return "state";
  }
  if (module.category === "rule") {
    return module.role === "timed_rule" ? "timing" : "effect";
  }
  if (module.role === "spawn_emitter") {
    return "spawn";
  }
  return "effect";
}

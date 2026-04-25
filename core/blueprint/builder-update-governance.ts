import type { IntentSchema, UpdateIntent } from "../schema/types.js";
import { requireGovernedUpdateExecutionView } from "./update-execution-view.js";
import {
  applyUpdateRemovalDirectives,
  buildPreservedUpdateMechanics,
  buildPreservedUpdateSelection,
  collectUpdateRemovalDirectives,
  filterUpdateFunctionalRequirements,
  filterUpdateTypedRequirements,
  mergeUpdateUISurfaces,
  resolveAuthoritativeUpdateChoiceCount,
  resolveAuthoritativeUpdateTriggerKey,
  resolveUpdatePreservationAuthority,
  shouldUseAuthoritativeSourceBackedUpdateProjection,
} from "./update-preservation.js";

function shouldCollapsePatternOwnedState(
  executionSchema: IntentSchema,
  preservedModuleRoles: string[],
): boolean {
  if (executionSchema.selection?.inventory?.enabled !== true) {
    return false;
  }

  return preservedModuleRoles.includes("weighted_pool")
    || preservedModuleRoles.includes("selection_flow");
}

export function buildEffectiveUpdateSchema(
  updateIntent: UpdateIntent,
): IntentSchema {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "Build effective update schema",
  );
  const executionSchema = executionView.executionSchema;
  const currentFeatureContext = updateIntent.currentFeatureContext;
  const preservationAuthority = resolveUpdatePreservationAuthority(currentFeatureContext);
  const removalDirectives = collectUpdateRemovalDirectives(updateIntent);
  const preservedModuleRoles = applyUpdateRemovalDirectives(
    preservationAuthority.preservedRoles,
    preservationAuthority.sourceBackedInvariantRoles,
    removalDirectives,
  );
  const choiceCount = resolveAuthoritativeUpdateChoiceCount(updateIntent);
  const triggerKey = resolveAuthoritativeUpdateTriggerKey(updateIntent);
  const collapsePatternOwnedState = shouldCollapsePatternOwnedState(
    executionSchema,
    preservedModuleRoles,
  );
  const useAuthoritativeSourceBackedProjection = shouldUseAuthoritativeSourceBackedUpdateProjection(
    updateIntent,
    preservationAuthority,
    removalDirectives,
  );
  const mergedFunctional = useAuthoritativeSourceBackedProjection
    ? []
    : Array.from(
        new Set(
          filterUpdateFunctionalRequirements(
            executionSchema.requirements.functional || [],
            currentFeatureContext,
          ),
        ),
      );
  const mergedTypedRequirements = useAuthoritativeSourceBackedProjection
    ? []
    : filterUpdateTypedRequirements(
        executionSchema.requirements.typed || [],
        currentFeatureContext,
      );
  const mergedSurfaces = mergeUpdateUISurfaces(
    executionSchema,
    preservedModuleRoles,
    preservationAuthority.sourceBackedInvariantRoles,
    removalDirectives,
  );

  return {
    ...executionSchema,
    request: {
      ...executionSchema.request,
      goal: executionSchema.request.goal || `Update feature ${updateIntent.target.featureId}`,
    },
    classification: {
      ...executionSchema.classification,
      intentKind:
        executionSchema.classification.intentKind === "unknown"
          ? (currentFeatureContext.intentKind as IntentSchema["classification"]["intentKind"])
          : executionSchema.classification.intentKind,
    },
    requirements: {
      ...executionSchema.requirements,
      functional: mergedFunctional,
      typed: collapsePatternOwnedState
        ? mergedTypedRequirements.filter((requirement) => requirement.kind !== "state")
        : mergedTypedRequirements,
    },
    constraints: {
      ...(executionSchema.constraints || {}),
    },
    selection: buildPreservedUpdateSelection(
      executionSchema,
      preservedModuleRoles,
      preservationAuthority.sourceBackedInvariantRoles,
      choiceCount,
      removalDirectives,
    ),
    uiRequirements: mergedSurfaces.length > 0
      ? {
          ...(executionSchema.uiRequirements || {}),
          needed: true,
          surfaces: mergedSurfaces,
        }
      : removalDirectives.removeUi && !preservationAuthority.sourceBackedInvariantRoles.includes("selection_modal")
        ? {
            ...(executionSchema.uiRequirements || {}),
            needed: false,
            surfaces: [],
          }
        : executionSchema.uiRequirements,
    stateModel: useAuthoritativeSourceBackedProjection
      ? undefined
      : collapsePatternOwnedState
        ? undefined
        : executionSchema.stateModel,
    composition: useAuthoritativeSourceBackedProjection
      ? undefined
      : executionSchema.composition,
    integrations: useAuthoritativeSourceBackedProjection
      ? undefined
      : executionSchema.integrations,
    normalizedMechanics: buildPreservedUpdateMechanics(
      executionSchema,
      preservedModuleRoles,
      preservationAuthority.sourceBackedInvariantRoles,
      removalDirectives,
    ),
    parameters: {
      ...(executionSchema.parameters || {}),
      ...(triggerKey ? { triggerKey } : {}),
      ...(typeof choiceCount === "number" ? { choiceCount } : {}),
    },
    resolvedAssumptions: Array.from(
      new Set([
        ...(executionSchema.resolvedAssumptions || []),
        ...updateIntent.resolvedAssumptions,
        ...(useAuthoritativeSourceBackedProjection
          ? [
              "Authoritative source-backed bounded update projection is active; preserved structure comes from current feature truth rather than re-derived update prose.",
            ]
          : []),
      ]),
    ),
  };
}

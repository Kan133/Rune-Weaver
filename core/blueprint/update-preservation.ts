import type {
  CurrentFeatureContext,
  IntentRequirement,
  IntentSchema,
  UpdateIntent,
  ValidationIssue,
} from "../schema/types.js";
import { CORE_PATTERN_IDS } from "../patterns/canonical-patterns.js";
import { requireGovernedUpdateExecutionView } from "./update-execution-view.js";

export interface UpdatePreservationAuthority {
  sourceBackedInvariantRoles: string[];
  preservedRoles: string[];
}

export interface UpdateRemovalDirectives {
  removeUi: boolean;
  removeSelectionFlow: boolean;
  removeTrigger: boolean;
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function mapPatternIdToModuleRole(patternId: string): string | undefined {
  switch (patternId) {
    case CORE_PATTERN_IDS.INPUT_KEY_BINDING:
      return "input_trigger";
    case CORE_PATTERN_IDS.DATA_WEIGHTED_POOL:
      return "weighted_pool";
    case CORE_PATTERN_IDS.RULE_SELECTION_FLOW:
      return "selection_flow";
    case CORE_PATTERN_IDS.EFFECT_OUTCOME_REALIZER:
      return "selection_outcome";
    case CORE_PATTERN_IDS.UI_SELECTION_MODAL:
      return "selection_modal";
    case CORE_PATTERN_IDS.UI_RESOURCE_BAR:
      return "resource_bar";
    case CORE_PATTERN_IDS.UI_KEY_HINT:
      return "key_hint";
    case "effect.modifier_applier":
    case "dota2.short_time_buff":
    case "dota2.linear_projectile_emit":
    case "effect.dash":
      return "effect_application";
    default:
      return undefined;
  }
}

export function hasExplicitUpdateDeltaPath(
  updateIntent: Pick<UpdateIntent, "delta">,
  path: string,
): boolean {
  return [
    ...(updateIntent.delta.add || []),
    ...(updateIntent.delta.modify || []),
  ].some((item) => item.path === path);
}

function normalizePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function normalizeTriggerKey(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().toUpperCase()
    : undefined;
}

function readRequestedTriggerKey(requestedChange: {
  parameters?: Record<string, unknown>;
  interaction?: {
    activations?: Array<{
      kind?: string;
      input?: string;
    }>;
  };
}): string | undefined {
  return normalizeTriggerKey(requestedChange.parameters?.triggerKey)
    || normalizeTriggerKey(
      (requestedChange.interaction?.activations || []).find((item) => item.kind === "key")?.input,
    );
}

export function resolveUpdatePreservationAuthority(
  currentFeatureContext: CurrentFeatureContext,
): UpdatePreservationAuthority {
  const sourceBackedInvariantRoles = Array.from(
    new Set(currentFeatureContext.sourceBackedInvariantRoles || []),
  );
  if (sourceBackedInvariantRoles.length > 0) {
    return {
      sourceBackedInvariantRoles,
      preservedRoles: [...sourceBackedInvariantRoles],
    };
  }

  const authoritativeRoles = Array.from(
    new Set([
      ...(currentFeatureContext.moduleRecords || []).map((moduleRecord) => moduleRecord.role),
      ...sourceBackedInvariantRoles,
    ]),
  );
  if (authoritativeRoles.length > 0) {
    return {
      sourceBackedInvariantRoles,
      preservedRoles: authoritativeRoles,
    };
  }

  const advisoryRoles = dedupeStrings(
    [
      ...(currentFeatureContext.preservedModuleBackbone || []),
      ...(currentFeatureContext.admittedSkeleton || []),
    ].map((item) => mapPatternIdToModuleRole(item) || item),
  );

  return {
    sourceBackedInvariantRoles,
    preservedRoles: advisoryRoles,
  };
}

export function collectUpdateRemovalDirectives(
  updateIntent: UpdateIntent,
): UpdateRemovalDirectives {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "Update removal directive resolution",
  );
  const removeItems = executionView.semanticAnalysis.governanceDecisions.mutationAuthority.value.remove?.length
    ? executionView.semanticAnalysis.governanceDecisions.mutationAuthority.value.remove
    : executionView.delta.remove || [];
  const removeUi = executionView.governedChange.uiRequirements?.needed === false
    || removeItems.some((item) =>
      item.kind === "ui" || /ui|modal|panel|selection_modal/i.test(`${item.path} ${item.summary}`),
    );
  const removeSelectionFlow = removeItems.some((item) =>
    item.kind === "selection" || /selection|weighted_pool|selection_flow|candidatepool|playerchoice/i.test(`${item.path} ${item.summary}`),
  );
  const removeTrigger = removeItems.some((item) =>
    item.kind === "trigger" || /trigger|hotkey|input\.triggerkey|key/i.test(`${item.path} ${item.summary}`),
  );

  return {
    removeUi,
    removeSelectionFlow,
    removeTrigger,
  };
}

export function applyUpdateRemovalDirectives(
  preservedRoles: string[],
  sourceBackedInvariantRoles: string[],
  removalDirectives: UpdateRemovalDirectives,
): string[] {
  const roles = new Set(preservedRoles);
  const invariantRoles = new Set(sourceBackedInvariantRoles);
  const removeRoleIfAllowed = (role: string): void => {
    if (!invariantRoles.has(role)) {
      roles.delete(role);
    }
  };

  if (removalDirectives.removeTrigger) {
    removeRoleIfAllowed("input_trigger");
  }
  if (removalDirectives.removeSelectionFlow) {
    removeRoleIfAllowed("weighted_pool");
    removeRoleIfAllowed("selection_flow");
    removeRoleIfAllowed("selection_outcome");
    removeRoleIfAllowed("selection_modal");
  }
  if (removalDirectives.removeUi) {
    removeRoleIfAllowed("selection_modal");
    removeRoleIfAllowed("resource_bar");
    removeRoleIfAllowed("key_hint");
  }

  return Array.from(roles);
}

export function resolveAuthoritativeUpdateTriggerKey(
  updateIntent: UpdateIntent,
): string | undefined {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "Authoritative update trigger resolution",
  );
  const currentValue = normalizeTriggerKey(updateIntent.currentFeatureContext.boundedFields.triggerKey);
  if (!hasExplicitUpdateDeltaPath(updateIntent, "input.triggerKey")) {
    return currentValue;
  }

  return readRequestedTriggerKey(executionView.executionSchema)
    || currentValue;
}

export function resolveAuthoritativeUpdateChoiceCount(
  updateIntent: UpdateIntent,
): number | undefined {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "Authoritative update choice-count resolution",
  );
  const currentValue = normalizePositiveInteger(updateIntent.currentFeatureContext.boundedFields.choiceCount);
  if (!hasExplicitUpdateDeltaPath(updateIntent, "selection.choiceCount")) {
    return currentValue;
  }

  return normalizePositiveInteger(executionView.executionSchema.selection?.choiceCount)
    || normalizePositiveInteger(executionView.executionSchema.parameters?.choiceCount)
    || currentValue;
}

export function shouldUseAuthoritativeSourceBackedUpdateProjection(
  updateIntent: UpdateIntent,
  preservationAuthority: UpdatePreservationAuthority,
  removalDirectives: UpdateRemovalDirectives,
): boolean {
  const executionView = requireGovernedUpdateExecutionView(
    updateIntent,
    "Authoritative source-backed update projection",
  );
  if (!updateIntent.target.sourceBacked) {
    return false;
  }
  if (preservationAuthority.sourceBackedInvariantRoles.length === 0) {
    return false;
  }
  if (
    removalDirectives.removeUi
    || removalDirectives.removeSelectionFlow
    || removalDirectives.removeTrigger
  ) {
    return false;
  }

  const deltaKinds = new Set(
    [
      ...(updateIntent.delta.add || []),
      ...(updateIntent.delta.modify || []),
      ...(updateIntent.delta.remove || []),
    ]
      .map((item) => item.kind)
      .filter((kind) => kind && kind !== "generic"),
  );

  if (deltaKinds.size === 0) {
    return false;
  }
  if ((["integration", "composition", "effect"] as const).some((kind) => deltaKinds.has(kind))) {
    return false;
  }
  if ((executionView.governedChange.composition?.dependencies || []).some((dependency) => dependency.kind !== "same-feature")) {
    return false;
  }
  if (
    deltaKinds.has("state")
    && (executionView.governedChange.stateModel?.states || []).some((state) =>
      state.lifetime === "persistent"
      || state.owner === "external"
      || state.owner === "session",
    )
  ) {
    return false;
  }

  return true;
}

export function buildPreservedUpdateMechanics(
  executionSchema: IntentSchema,
  preservedModuleRoles: string[],
  sourceBackedInvariantRoles: string[],
  removalDirectives: UpdateRemovalDirectives,
): IntentSchema["normalizedMechanics"] {
  const mechanics = {
    ...(executionSchema.normalizedMechanics || {}),
  };
  const preserved = new Set(preservedModuleRoles);
  const invariantRoles = new Set(sourceBackedInvariantRoles);

  if (removalDirectives.removeTrigger && !invariantRoles.has("input_trigger")) {
    mechanics.trigger = false;
  }
  if (removalDirectives.removeSelectionFlow) {
    if (!invariantRoles.has("weighted_pool")) {
      mechanics.candidatePool = false;
      mechanics.weightedSelection = false;
    }
    if (!invariantRoles.has("selection_flow")) {
      mechanics.playerChoice = false;
    }
  }
  if (removalDirectives.removeUi && !invariantRoles.has("selection_modal")) {
    mechanics.uiModal = false;
  }

  if (preserved.has("input_trigger")) {
    mechanics.trigger = true;
  }
  if (preserved.has("weighted_pool")) {
    mechanics.candidatePool = true;
    mechanics.weightedSelection = true;
  }
  if (preserved.has("selection_flow")) {
    mechanics.playerChoice = true;
  }
  if (preserved.has("selection_modal")) {
    mechanics.uiModal = true;
  }
  if (preserved.has("selection_outcome") || preserved.has("effect_application") || preserved.has("spawn_emitter")) {
    mechanics.outcomeApplication = true;
  }
  if (preserved.has("resource_pool")) {
    mechanics.resourceConsumption = true;
  }

  return mechanics;
}

export function mergeUpdateUISurfaces(
  executionSchema: IntentSchema,
  preservedModuleRoles: string[],
  sourceBackedInvariantRoles: string[],
  removalDirectives: Pick<UpdateRemovalDirectives, "removeUi">,
): string[] {
  const surfaces = new Set<string>(
    removalDirectives.removeUi ? [] : (executionSchema.uiRequirements?.surfaces || []),
  );
  const preserved = new Set(preservedModuleRoles);
  const invariantRoles = new Set(sourceBackedInvariantRoles);
  if (preserved.has("selection_modal") || invariantRoles.has("selection_modal")) {
    surfaces.add("selection_modal");
  }
  return Array.from(surfaces);
}

export function buildPreservedUpdateSelection(
  executionSchema: IntentSchema,
  preservedModuleRoles: string[],
  sourceBackedInvariantRoles: string[],
  choiceCount: number | undefined,
  removalDirectives: Pick<UpdateRemovalDirectives, "removeSelectionFlow" | "removeUi">,
): IntentSchema["selection"] {
  const preserved = new Set(preservedModuleRoles);
  const invariantRoles = new Set(sourceBackedInvariantRoles);
  const hasInvariantSelectionRole =
    invariantRoles.has("weighted_pool")
    || invariantRoles.has("selection_flow")
    || invariantRoles.has("selection_modal");
  if (removalDirectives.removeSelectionFlow && !hasInvariantSelectionRole) {
    return undefined;
  }
  const hasSelectionSkeleton =
    executionSchema.selection !== undefined
    || preserved.has("weighted_pool")
    || preserved.has("selection_flow")
    || (preserved.has("selection_modal") && !removalDirectives.removeUi)
    || invariantRoles.has("selection_modal");

  if (!hasSelectionSkeleton) {
    return executionSchema.selection;
  }

  return {
    mode: executionSchema.selection?.mode || "user-chosen",
    ...(preserved.has("weighted_pool") || executionSchema.selection?.source
      ? {
          source: executionSchema.selection?.source || "weighted-pool",
        }
      : {}),
    choiceMode: executionSchema.selection?.choiceMode || "user-chosen",
    cardinality: executionSchema.selection?.cardinality || "single",
    ...(typeof choiceCount === "number" ? { choiceCount } : {}),
    repeatability: executionSchema.selection?.repeatability || "repeatable",
    duplicatePolicy: executionSchema.selection?.duplicatePolicy || "forbid",
    commitment: executionSchema.selection?.commitment || "confirm",
    ...(executionSchema.selection?.inventory
      ? { inventory: executionSchema.selection.inventory }
      : {}),
  };
}

export function collectUpdateInvariantConflictIssues(
  updateIntent: UpdateIntent,
  preservationAuthority?: UpdatePreservationAuthority,
  removalDirectives?: UpdateRemovalDirectives,
): ValidationIssue[] {
  const effectiveAuthority = preservationAuthority || resolveUpdatePreservationAuthority(updateIntent.currentFeatureContext);
  if (effectiveAuthority.sourceBackedInvariantRoles.length === 0) {
    return [];
  }

  const effectiveRemovalDirectives = removalDirectives || collectUpdateRemovalDirectives(updateIntent);
  const profile = updateIntent.target.profile || "source-backed feature";
  const issues: ValidationIssue[] = [];
  const pushConflict = (role: string, summary: string): void => {
    if (!effectiveAuthority.sourceBackedInvariantRoles.includes(role)) {
      return;
    }
    issues.push({
      code: "UPDATE_INVARIANT_CONFLICT",
      scope: "blueprint",
      severity: "error",
      path: `currentFeatureContext.sourceBackedInvariantRoles.${role}`,
      message:
        `Update conflicts with source-backed invariant role '${role}' on profile '${profile}'. ${summary}`,
    });
  };

  if (effectiveRemovalDirectives.removeUi) {
    pushConflict(
      "selection_modal",
      "This round blocks explicit UI removal instead of silently breaking the family backbone.",
    );
  }
  if (effectiveRemovalDirectives.removeSelectionFlow) {
    pushConflict(
      "weighted_pool",
      "This round blocks removing the weighted selection backbone from a source-backed family update.",
    );
    pushConflict(
      "selection_flow",
      "This round blocks removing the selection flow backbone from a source-backed family update.",
    );
    pushConflict(
      "selection_outcome",
      "This round blocks removing the selection outcome realizer from a source-backed family update.",
    );
  }
  if (effectiveRemovalDirectives.removeTrigger) {
    pushConflict(
      "input_trigger",
      "This round blocks removing the trigger owner from a source-backed family update.",
    );
  }

  return issues;
}

export function filterUpdateFunctionalRequirements(
  functionalRequirements: string[],
  currentFeatureContext: UpdateIntent["currentFeatureContext"],
): string[] {
  const authoritativeTruthAvailable =
    (currentFeatureContext.moduleRecords?.length || 0) > 0
    || (currentFeatureContext.sourceBackedInvariantRoles?.length || 0) > 0;
  if (!authoritativeTruthAvailable) {
    return functionalRequirements;
  }

  return functionalRequirements.filter((requirement) =>
    !isPreservationOnlyUpdateText(requirement),
  );
}

export function filterUpdateTypedRequirements(
  typedRequirements: IntentRequirement[],
  currentFeatureContext: UpdateIntent["currentFeatureContext"],
): IntentRequirement[] {
  const authoritativeTruthAvailable =
    (currentFeatureContext.moduleRecords?.length || 0) > 0
    || (currentFeatureContext.sourceBackedInvariantRoles?.length || 0) > 0;
  if (!authoritativeTruthAvailable) {
    return typedRequirements;
  }

  return typedRequirements.filter((requirement) => {
    const requirementText = [
      requirement.summary,
      ...(requirement.inputs || []),
      ...(requirement.outputs || []),
      ...(requirement.invariants || []),
    ].join(" ");
    return !isPreservationOnlyUpdateText(requirementText);
  });
}

function isPreservationOnlyUpdateText(
  text: string,
): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const hasPreservationSignal = [
    /\bpreserve\b/u,
    /\bkeep\b/u,
    /\bunchanged\b/u,
    /\bremain(?:s)?\s+unchanged\b/u,
    /\bexisting\s+behavior\b/u,
    /\bcurrent\s+feature\s+skeleton\b/u,
    /\bmodule\s+backbone\b/u,
    /保持现有/u,
    /维持现有/u,
    /其余.*不变/u,
    /其他.*不变/u,
    /不要动/u,
  ].some((pattern) => pattern.test(normalized));

  if (!hasPreservationSignal) {
    return false;
  }

  const hasDeltaSignal = [
    /\brebind\b/u,
    /\bchange\b/u,
    /\bupdate\b/u,
    /\badd\b/u,
    /\bremove\b/u,
    /\bexpand\b/u,
    /\bincrease\b/u,
    /\bdecrease\b/u,
    /\bmodify\b/u,
    /\badjust\b/u,
    /\bset\b/u,
    /改成/u,
    /改为/u,
    /修改/u,
    /更新/u,
    /新增/u,
    /移除/u,
    /删除/u,
    /扩充/u,
    /增加/u,
    /减少/u,
    /调整/u,
  ].some((pattern) => pattern.test(normalized));

  return !hasDeltaSignal;
}

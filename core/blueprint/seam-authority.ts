import {
  BlueprintModule,
  BlueprintProposal,
  IntentRequirement,
  IntentSchema,
  ModuleNeed,
} from "../schema/types";
import { collectIntentStrings, collectTypedParameterKeys, readPositiveNumber } from "./semantic-lexical";

export interface SemanticAssessment {
  blockers: string[];
  warnings: string[];
  notes: string[];
}

type StateModelState = NonNullable<IntentSchema["stateModel"]>["states"][number];

export function assessSemanticCompleteness(
  schema: IntentSchema,
  modules: BlueprintModule[],
  moduleNeeds: ModuleNeed[],
  proposal: BlueprintProposal
): SemanticAssessment {
  const blockers = new Set<string>();
  const warnings = new Set<string>();
  const notes = new Set<string>();
  const typedRequirements = schema.requirements.typed || [];

  if (proposal.blockedBy && proposal.blockedBy.length > 0) {
    for (const blocker of proposal.blockedBy) {
      blockers.add(`Blocked by clarification: ${blocker}`);
    }
  }

  if (typedRequirements.length === 0 && schema.requirements.functional.length === 0) {
    blockers.add("IntentSchema does not provide any functional or typed requirements for FinalBlueprint normalization.");
  }

  for (const requirement of typedRequirements) {
    if (requirement.priority !== "must") {
      continue;
    }

    const category = resolveRequirementCategoryForAssessment(requirement, schema);
    const matchingNeed = moduleNeeds.find((need) => {
      const module = modules.find((item) => item.id === need.moduleId);
      return module?.category === category;
    });

    if (!matchingNeed) {
      blockers.add(`Missing canonical ModuleNeed for must requirement '${requirement.id}'.`);
      continue;
    }

    if (matchingNeed.requiredCapabilities.length === 0) {
      blockers.add(`Must requirement '${requirement.id}' does not resolve requiredCapabilities.`);
    }

    if (category === "effect" && (schema.effects?.operations || []).length === 0) {
      warnings.add(`Must effect requirement '${requirement.id}' is underspecified because no effect operations were provided.`);
    }

    if (category === "rule" && !schema.selection?.mode) {
      warnings.add(`Must rule requirement '${requirement.id}' is underspecified because selection.mode is missing.`);
    }

    if (category === "ui" && !matchingNeed.requiredOutputs?.length) {
      warnings.add(`Must ui requirement '${requirement.id}' is underspecified because no UI surface/output was captured.`);
    }

    if (category === "integration" && !matchingNeed.integrationHints?.length) {
      warnings.add(`Must integration requirement '${requirement.id}' is underspecified because no integration binding was captured.`);
    }

    if (category === "data" && !matchingNeed.stateExpectations?.length) {
      warnings.add(`Must state requirement '${requirement.id}' is underspecified because no state expectations were captured.`);
    }
  }

  addUnsupportedFamilyGapBlockers(schema, blockers);
  addCoarseCapabilityWarnings(moduleNeeds, warnings);

  const uncertaintyCount = schema.uncertainties?.length ?? 0;
  if (uncertaintyCount > 0) {
    notes.add(`Normalization retained ${uncertaintyCount} uncertainty item(s).`);
  }

  const clarificationCount = schema.requiredClarifications?.length ?? 0;
  if (clarificationCount > 0) {
    notes.add(`Normalization retained ${clarificationCount} clarification item(s).`);
  }

  return {
    blockers: [...blockers],
    warnings: [...warnings],
    notes: [...notes],
  };
}

export function shouldUseShortTimeBuffCapability(
  effects: IntentSchema["effects"] | undefined
): boolean {
  if (!effects) {
    return false;
  }

  const operations = effects.operations || [];
  if (operations.length !== 1 || operations[0] !== "apply") {
    return false;
  }

  if (effects.durationSemantics !== "timed") {
    return false;
  }

  const targets = effects.targets || [];
  if (targets.length === 0) {
    return false;
  }

  return targets.every((target) => isSelfTargetedEffectTarget(target));
}

export function isAdmittedLocalCooldownSchedulerSlice(schema: IntentSchema): boolean {
  if (!hasLocalCooldownOnlySchedulerSignals(schema)) {
    return false;
  }

  if (!shouldUseShortTimeBuffCapability(schema.effects)) {
    return false;
  }

  if (hasSelectionSchedulerPressure(schema)) {
    return false;
  }

  if (
    hasUnsupportedRewardProgressionSignals(schema) ||
    hasUnsupportedSpawnEmissionSignals(schema)
  ) {
    return false;
  }

  return true;
}

export function hasUnsupportedSchedulerTimerSignals(schema: IntentSchema): boolean {
  if (!hasAnySchedulerTimerSignals(schema)) {
    return false;
  }

  return !isAdmittedLocalCooldownSchedulerSlice(schema);
}

export function isSelectionLocalProgressionStateRequirement(
  req: IntentRequirement,
  schema: IntentSchema
): boolean {
  return (
    req.kind === "state" &&
    isAdmittedSelectionLocalProgressionSlice(schema) &&
    stateRequirementLooksLikeProgression(req, schema)
  );
}

export function isAdmittedSelectionLocalProgressionSlice(schema: IntentSchema): boolean {
  if (!hasAnyRewardProgressionSignals(schema)) {
    return false;
  }

  if (hasForbiddenRewardProgressionScope(schema)) {
    return false;
  }

  if (hasAnySchedulerTimerSignals(schema) || hasAnySpawnEmissionSignals(schema)) {
    return false;
  }

  if (
    !schema.normalizedMechanics.candidatePool ||
    !schema.normalizedMechanics.weightedSelection ||
    !schema.normalizedMechanics.playerChoice
  ) {
    return false;
  }

  if (schema.selection?.inventory) {
    return false;
  }

  if ((schema.requirements.typed || []).some((req) => ["effect", "resource", "integration"].includes(req.kind))) {
    return false;
  }

  const progressionRequirement = (schema.requirements.typed || []).find(
    (requirement) => stateRequirementLooksLikeProgression(requirement, schema)
  );
  if (!progressionRequirement) {
    return false;
  }

  return buildSelectionLocalProgressionConfig(progressionRequirement, schema) !== undefined;
}

export function hasUnsupportedRewardProgressionSignals(schema: IntentSchema): boolean {
  if (!hasAnyRewardProgressionSignals(schema)) {
    return false;
  }

  return !isAdmittedSelectionLocalProgressionSlice(schema);
}

export function buildSelectionLocalProgressionConfig(
  req: IntentRequirement,
  schema: IntentSchema
): Record<string, unknown> | undefined {
  if (req.kind !== "state" || !stateRequirementLooksLikeProgression(req, schema)) {
    return undefined;
  }

  const progressThreshold = readPositiveNumber(req.parameters?.progressThreshold);
  if (progressThreshold === undefined) {
    return undefined;
  }

  const stateIds = getSelectionLocalProgressionStateIds(schema);
  if (!stateIds.progressStateId || !stateIds.levelStateId) {
    return undefined;
  }

  return {
    enabled: true,
    progressThreshold,
    progressStateId: stateIds.progressStateId,
    levelStateId: stateIds.levelStateId,
  };
}

export function stateRequirementLooksLikeProgression(
  req: IntentRequirement,
  schema: IntentSchema
): boolean {
  if (req.kind !== "state") {
    return false;
  }

  if (readPositiveNumber(req.parameters?.progressThreshold) !== undefined) {
    return true;
  }

  const signals = [req.id, req.summary, ...(req.inputs || []), ...(req.outputs || [])];
  if (
    signals.some((value) => {
      const normalized = value.toLowerCase();
      return (
        normalized.includes("progress") ||
        normalized.includes("reward level") ||
        normalized.includes("level") ||
        normalized.includes("round") ||
        normalized.includes("进度") ||
        normalized.includes("等级") ||
        normalized.includes("轮")
      );
    })
  ) {
    return true;
  }

  return schema.stateModel?.states?.some((state) => stateLooksLikeProgressionState(state)) || false;
}

export function isAdmittedForwardLinearProjectileSlice(schema: IntentSchema): boolean {
  if (!hasAnySpawnEmissionSignals(schema)) {
    return false;
  }

  if (
    hasAnySchedulerTimerSignals(schema) ||
    hasAnyRewardProgressionSignals(schema)
  ) {
    return false;
  }

  if (
    schema.normalizedMechanics.candidatePool ||
    schema.normalizedMechanics.weightedSelection ||
    schema.normalizedMechanics.playerChoice ||
    schema.normalizedMechanics.uiModal
  ) {
    return false;
  }

  if (
    schema.selection?.mode !== undefined ||
    schema.selection?.cardinality !== undefined ||
    schema.selection?.repeatability !== undefined ||
    schema.selection?.duplicatePolicy !== undefined ||
    schema.selection?.inventory !== undefined
  ) {
    return false;
  }

  if ((schema.requirements.typed || []).some((req) => ["rule", "state", "resource", "ui", "integration"].includes(req.kind))) {
    return false;
  }

  if (hasBlockedSpawnEmissionText(schema)) {
    return false;
  }

  return getForwardLinearProjectileRequirement(schema) !== undefined;
}

export function hasUnsupportedSpawnEmissionSignals(schema: IntentSchema): boolean {
  if (!hasAnySpawnEmissionSignals(schema)) {
    return false;
  }

  return !isAdmittedForwardLinearProjectileSlice(schema);
}

export function hasStandaloneEntitySessionStateGap(schema: IntentSchema): boolean {
  const typedStateRequirements = (schema.requirements.typed || []).filter(
    (requirement) => requirement.kind === "state"
  );
  const states = schema.stateModel?.states || [];

  if (typedStateRequirements.length === 0 && states.length === 0) {
    return false;
  }

  if (
    typedStateRequirements.some((requirement) => {
      if (isSelectionLocalProgressionStateRequirement(requirement, schema)) {
        return false;
      }

      return !schema.normalizedMechanics.candidatePool;
    })
  ) {
    return true;
  }

  return states.some((state) => !isAdmittedPatternOwnedState(state, schema));
}

export function stateLooksLikeCommittedSelection(state: StateModelState): boolean {
  const summary = state.summary.toLowerCase();
  const id = state.id.toLowerCase();
  return (
    summary.includes("selected") ||
    summary.includes("current choice") ||
    summary.includes("active buff") ||
    summary.includes("current buff") ||
    summary.includes("当前选择") ||
    summary.includes("当前增益") ||
    id.includes("selected") ||
    id.includes("choice") ||
    id.includes("active_buff") ||
    id.includes("current_buff")
  );
}

export function stateLooksLikePoolState(state: StateModelState): boolean {
  const summary = state.summary.toLowerCase();
  const id = state.id.toLowerCase();
  return (
    summary.includes("pool") ||
    summary.includes("candidate") ||
    summary.includes("候选池") ||
    summary.includes("候选") ||
    id.includes("pool") ||
    id.includes("candidate")
  );
}

export function stateLooksLikePersistedChoiceState(state: StateModelState): boolean {
  const summary = state.summary.toLowerCase();
  const id = state.id.toLowerCase();
  return (
    (state.lifetime === "persistent" || state.lifetime === "session") &&
    (
      stateLooksLikeCommittedSelection(state) ||
      summary.includes("active state") ||
      summary.includes("current selection") ||
      summary.includes("current choice") ||
      summary.includes("selected state") ||
      summary.includes("selection state") ||
      summary.includes("当前状态") ||
      summary.includes("已选择") ||
      summary.includes("选择状态") ||
      summary.includes("状态同步") ||
      id.includes("active_state") ||
      id.includes("current_selection") ||
      id.includes("current_choice") ||
      id.includes("selected_state") ||
      id.includes("selection_state")
    )
  );
}

function addCoarseCapabilityWarnings(
  moduleNeeds: ModuleNeed[],
  warnings: Set<string>
): void {
  for (const need of moduleNeeds) {
    for (const capability of need.requiredCapabilities) {
      if (capability === "selection.flow.resolve") {
        warnings.add(
          `ModuleNeed '${need.semanticRole}' falls back to coarse capability 'selection.flow.resolve'; selection semantics remain underspecified on the current seam.`
        );
      }
      if (capability === "state.session.snapshot") {
        warnings.add(
          `ModuleNeed '${need.semanticRole}' falls back to coarse capability 'state.session.snapshot'; state semantics remain underspecified on the current seam.`
        );
      }
    }
  }
}

function addUnsupportedFamilyGapBlockers(
  schema: IntentSchema,
  blockers: Set<string>
): void {
  if (hasUnsupportedSchedulerTimerSignals(schema)) {
    blockers.add(
      "Scheduler/timer semantics exceed the current admitted cooldown-local effect slice; delay/periodic and cross-module/post-selection scheduler orchestration remain outside the current seam."
    );
  }

  if (hasUnsupportedRewardProgressionSignals(schema)) {
    blockers.add(
      "Reward/progression semantics exceed the current admitted selection-local threshold progression slice; persistence, economy, inventory grant, and cross-feature reward remain outside the current seam."
    );
  }

  if (hasUnsupportedSpawnEmissionSignals(schema)) {
    blockers.add(
      "Spawn/emission semantics exceed the current admitted forward-linear-projectile slice; helper-unit / follow / effect-coupled spawn choreography remain outside the current seam."
    );
  }

  if (hasStandaloneEntitySessionStateGap(schema)) {
    blockers.add(
      "Standalone entity/session state semantics are requested, but grammar-v1 currently only admits pattern-owned session-local state inside data.weighted_pool / rule.selection_flow; standalone session store and shared state bus remain outside the current seam."
    );
  }
}

function resolveRequirementCategoryForAssessment(
  req: IntentRequirement,
  schema: IntentSchema
): BlueprintModule["category"] {
  if (isSelectionLocalProgressionStateRequirement(req, schema)) {
    return "rule";
  }

  switch (req.kind) {
    case "trigger":
      return "trigger";
    case "state":
      return "data";
    case "rule":
      return "rule";
    case "effect":
      return "effect";
    case "resource":
      return "resource";
    case "ui":
      return "ui";
    case "integration":
      return "integration";
    default:
      return "effect";
  }
}

function hasAnySchedulerTimerSignals(schema: IntentSchema): boolean {
  const parameterKeys = collectTypedParameterKeys(schema);
  if (
    parameterKeys.has("initialDelaySeconds") ||
    parameterKeys.has("tickSeconds") ||
    parameterKeys.has("delaySeconds") ||
    parameterKeys.has("intervalSeconds")
  ) {
    return true;
  }

  if (hasLocalCooldownSignal(schema)) {
    return true;
  }

  return hasDisallowedSchedulerOrchestrationText(schema);
}

function hasLocalCooldownOnlySchedulerSignals(schema: IntentSchema): boolean {
  const parameterKeys = collectTypedParameterKeys(schema);
  if (
    parameterKeys.has("initialDelaySeconds") ||
    parameterKeys.has("tickSeconds") ||
    parameterKeys.has("delaySeconds") ||
    parameterKeys.has("intervalSeconds")
  ) {
    return false;
  }

  if (!hasLocalCooldownSignal(schema)) {
    return false;
  }

  return !hasDisallowedSchedulerOrchestrationText(schema);
}

function hasLocalCooldownSignal(schema: IntentSchema): boolean {
  const parameterKeys = collectTypedParameterKeys(schema);
  if (
    parameterKeys.has("cooldownSeconds") ||
    parameterKeys.has("cooldown") ||
    parameterKeys.has("abilityCooldown")
  ) {
    return true;
  }

  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("cooldown") ||
      normalized.includes("冷却") ||
      normalized.includes("reopen it for") ||
      normalized.includes("reopen for") ||
      normalized.includes("cannot reopen") ||
      normalized.includes("cannot open again") ||
      normalized.includes("open again after") ||
      normalized.includes("30 秒内不能再次打开")
    );
  });
}

function hasDisallowedSchedulerOrchestrationText(schema: IntentSchema): boolean {
  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("delay resolution") ||
      normalized.includes("resolve the chosen result after") ||
      normalized.includes("不是立刻生效") ||
      normalized.includes("延迟") ||
      normalized.includes("结算后") ||
      normalized.includes("每 1 秒") ||
      normalized.includes("每秒") ||
      normalized.includes("every 1 second") ||
      normalized.includes("every second") ||
      normalized.includes("periodic") ||
      normalized.includes("periodically") ||
      normalized.includes("tick every") ||
      normalized.includes("trigger every")
    );
  });
}

function hasSelectionSchedulerPressure(schema: IntentSchema): boolean {
  if (
    schema.normalizedMechanics.candidatePool === true ||
    schema.normalizedMechanics.weightedSelection === true ||
    schema.normalizedMechanics.playerChoice === true ||
    schema.normalizedMechanics.uiModal === true
  ) {
    return true;
  }

  if (
    schema.selection?.mode !== undefined ||
    schema.selection?.cardinality !== undefined ||
    schema.selection?.repeatability !== undefined ||
    schema.selection?.duplicatePolicy !== undefined ||
    schema.selection?.inventory !== undefined
  ) {
    return true;
  }

  return (schema.constraints.requiredPatterns || []).some(
    (patternId) =>
      patternId === "data.weighted_pool" ||
      patternId === "rule.selection_flow" ||
      patternId === "ui.selection_modal"
  );
}

function hasAnyRewardProgressionSignals(schema: IntentSchema): boolean {
  if ((schema.requirements.typed || []).some((requirement) => stateRequirementLooksLikeProgression(requirement, schema))) {
    return true;
  }

  if (schema.stateModel?.states?.some((state) => stateLooksLikeProgressionState(state))) {
    return true;
  }

  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("reward progress") ||
      normalized.includes("reward level") ||
      normalized.includes("level up") ||
      normalized.includes("progression") ||
      normalized.includes("奖励进度") ||
      normalized.includes("奖励循环") ||
      normalized.includes("累计三轮") ||
      normalized.includes("提升一级") ||
      normalized.includes("升级") ||
      normalized.includes("progress track") ||
      normalized.includes("after each selection round")
    );
  });
}

function hasForbiddenRewardProgressionScope(schema: IntentSchema): boolean {
  if (
    schema.selection?.inventory ||
    schema.stateModel?.states?.some(
      (state) => state.lifetime === "persistent" || state.owner === "external"
    )
  ) {
    return true;
  }

  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("persist") ||
      normalized.includes("persistence") ||
      normalized.includes("economy") ||
      normalized.includes("inventory") ||
      normalized.includes("unlock") ||
      normalized.includes("meta progression") ||
      normalized.includes("meta-progression") ||
      normalized.includes("cross-feature") ||
      normalized.includes("cross feature") ||
      normalized.includes("grant") ||
      normalized.includes("持久化") ||
      normalized.includes("经济") ||
      normalized.includes("库存") ||
      normalized.includes("解锁") ||
      normalized.includes("跨功能") ||
      normalized.includes("跨特性")
    );
  });
}

function getSelectionLocalProgressionStateIds(schema: IntentSchema): {
  progressStateId?: string;
  levelStateId?: string;
} {
  const states = schema.stateModel?.states || [];
  const progressState = states.find(
    (state) => isSessionLocalFeatureState(state) && stateLooksLikeProgressCounter(state)
  );
  const levelState = states.find(
    (state) => isSessionLocalFeatureState(state) && stateLooksLikeProgressLevel(state)
  );

  return {
    progressStateId: progressState?.id,
    levelStateId: levelState?.id,
  };
}

function hasAnySpawnEmissionSignals(schema: IntentSchema): boolean {
  if (getForwardLinearProjectileRequirement(schema)) {
    return true;
  }

  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("spawn") ||
      normalized.includes("summon") ||
      normalized.includes("projectile") ||
      normalized.includes("helper unit") ||
      normalized.includes("helper entity") ||
      normalized.includes("companion") ||
      normalized.includes("生成一个") ||
      normalized.includes("生成帮助单位") ||
      normalized.includes("投射物") ||
      normalized.includes("帮助单位") ||
      normalized.includes("跟随玩家")
    );
  });
}

function getForwardLinearProjectileRequirement(schema: IntentSchema): IntentRequirement | undefined {
  return (schema.requirements.typed || []).find((requirement) => {
    if (requirement.kind !== "effect") {
      return false;
    }

    const distance = readPositiveNumber(
      requirement.parameters?.projectileDistance ?? requirement.parameters?.distance
    );
    const speed = readPositiveNumber(
      requirement.parameters?.projectileSpeed ?? requirement.parameters?.speed
    );
    const radius = readPositiveNumber(
      requirement.parameters?.projectileRadius ?? requirement.parameters?.radius
    );

    return distance !== undefined && speed !== undefined && radius !== undefined;
  });
}

function hasBlockedSpawnEmissionText(schema: IntentSchema): boolean {
  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("helper unit") ||
      normalized.includes("helper entity") ||
      normalized.includes("summon") ||
      normalized.includes("companion") ||
      normalized.includes("follow") ||
      normalized.includes("tracking") ||
      normalized.includes("on hit") ||
      normalized.includes("apply a short-time effect") ||
      normalized.includes("applies a short-time effect") ||
      normalized.includes("wave") ||
      normalized.includes("orchestration") ||
      normalized.includes("帮助单位") ||
      normalized.includes("跟随玩家") ||
      normalized.includes("命中后")
    );
  });
}

function isAdmittedPatternOwnedState(
  state: StateModelState,
  schema: IntentSchema
): boolean {
  if (stateLooksLikePoolState(state) && schema.normalizedMechanics.candidatePool) {
    return true;
  }

  if (
    stateLooksLikeCommittedSelection(state) &&
    (schema.normalizedMechanics.weightedSelection || schema.normalizedMechanics.playerChoice || !!schema.selection?.mode)
  ) {
    return true;
  }

  if (
    isAdmittedSelectionLocalProgressionSlice(schema) &&
    stateLooksLikeProgressionState(state) &&
    isSessionLocalFeatureState(state)
  ) {
    return true;
  }

  return false;
}

function stateLooksLikeProgressionState(state: StateModelState): boolean {
  return stateLooksLikeProgressCounter(state) || stateLooksLikeProgressLevel(state);
}

function stateLooksLikeProgressCounter(state: StateModelState): boolean {
  const summary = state.summary.toLowerCase();
  const id = state.id.toLowerCase();
  return (
    summary.includes("progress") ||
    summary.includes("completed round") ||
    summary.includes("round counter") ||
    summary.includes("奖励进度") ||
    summary.includes("轮次") ||
    summary.includes("累计") ||
    id.includes("progress") ||
    id.includes("round") ||
    id.includes("counter")
  );
}

function stateLooksLikeProgressLevel(state: StateModelState): boolean {
  const summary = state.summary.toLowerCase();
  const id = state.id.toLowerCase();
  return (
    summary.includes("reward level") ||
    summary.includes("current level") ||
    summary.includes("奖励等级") ||
    summary.includes("等级") ||
    id.includes("reward_level") ||
    id.includes("level")
  );
}

function isSessionLocalFeatureState(state: StateModelState): boolean {
  const owner = state.owner || "feature";
  return state.lifetime === "session" && (owner === "feature" || owner === "session");
}

function isSelfTargetedEffectTarget(target: string): boolean {
  const normalized = target.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return [
    "self",
    "selftargeted",
    "selfcast",
    "selfonly",
    "caster",
    "hero",
    "ownhero",
    "playerhero",
  ].includes(normalized);
}

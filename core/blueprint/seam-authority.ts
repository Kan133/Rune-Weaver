import {
  BlueprintModule,
  BlueprintProposal,
  IntentRequirement,
  IntentSchema,
  ModuleFacetSpec,
  ModuleNeed,
} from "../schema/types";
import { collectIntentStrings, collectTypedParameterKeys, readPositiveNumber } from "./semantic-lexical";
import {
  getIntentGovernanceView,
  hasGovernanceExternalOrSharedOwnership,
  hasGovernancePersistentScope,
  hasGovernanceRevealBatchResolution,
  hasGovernanceSelectionFlowContract,
} from "../wizard/intent-governance-view.js";
import {
  isDefinitionOnlyProviderBoundary,
  isDefinitionOnlyProviderDerivedState,
} from "../wizard/intent-schema/definition-only-provider.js";

export type SemanticRiskDisposition =
  | "reusable_fit"
  | "synthesis_required"
  | "governance_blocked";

export interface SemanticRiskFinding {
  code:
    | "proposal_legality"
    | "scheduler_timer"
    | "reward_progression"
    | "spawn_emission"
    | "session_state";
  severity: "info" | "warning" | "error";
  message: string;
  family:
    | "proposal_legality"
    | "scheduler_timer"
    | "reward_progression"
    | "spawn_emission"
    | "session_state";
  disposition: SemanticRiskDisposition;
  summary: string;
}

export interface SemanticAssessment {
  riskFindings: SemanticRiskFinding[];
  findings?: SemanticRiskFinding[];
  blockers: string[];
  warnings: string[];
  notes: string[];
}

type StateModelState = NonNullable<IntentSchema["stateModel"]>["states"][number];

export function assessSemanticCompleteness(
  schema: IntentSchema,
  modules: BlueprintModule[],
  moduleNeeds: ModuleNeed[],
  proposal: BlueprintProposal,
  moduleFacets: ModuleFacetSpec[] = [],
): SemanticAssessment {
  const governance = getIntentGovernanceView(schema);
  const findings: SemanticRiskFinding[] = [];
  const blockers = new Set<string>();
  const warnings = new Set<string>();
  const notes = new Set<string>();
  const typedRequirements = schema.requirements.typed || [];
  const facetsByBackbone = new Map<string, ModuleFacetSpec[]>();

  for (const facet of moduleFacets) {
    const existing = facetsByBackbone.get(facet.backboneModuleId) || [];
    existing.push(facet);
    facetsByBackbone.set(facet.backboneModuleId, existing);
  }

  if (proposal.blockedBy && proposal.blockedBy.length > 0) {
    for (const blocker of proposal.blockedBy) {
      const summary = `Blocked by proposal/legality authority: ${blocker}`;
      findings.push({
        code: "proposal_legality",
        severity: "error",
        message: summary,
        family: "proposal_legality",
        disposition: "governance_blocked",
        summary,
      });
      blockers.add(summary);
    }
  }

  const hasSemanticInputs =
    typedRequirements.length > 0
    || schema.requirements.functional.length > 0
    || Object.values(governance.mechanics || {}).some((value) => value === true);

  if (!hasSemanticInputs) {
    warnings.add("IntentSchema does not provide any functional or typed requirements for FinalBlueprint normalization.");
  }

  for (const requirement of typedRequirements) {
    if (requirement.priority !== "must") {
      continue;
    }

    const category = resolveRequirementCategoryForAssessment(requirement, schema);
    const matchingNeed = moduleNeeds.find((need) => {
      const module = modules.find((item) => item.id === need.moduleId);
      if (!module) {
        return false;
      }
      if (module.category === category) {
        return true;
      }
      if (module.planningKind !== "backbone") {
        return false;
      }
      const facets = facetsByBackbone.get(module.id) || [];
      return facets.some((facet) => facet.category === category);
    });

    if (!matchingNeed) {
      warnings.add(`Missing canonical ModuleNeed for must requirement '${requirement.id}'.`);
      continue;
    }

    if (matchingNeed.requiredCapabilities.length === 0) {
      warnings.add(`Must requirement '${requirement.id}' does not resolve requiredCapabilities.`);
    }

    if (
      category === "effect"
      && matchingNeed.semanticRole !== "gameplay_ability"
      && (governance.effect.operations || []).length === 0
    ) {
      warnings.add(`Must effect requirement '${requirement.id}' is underspecified because no effect operations were provided.`);
    }

    const matchingModule = modules.find((item) => item.id === matchingNeed.moduleId);
    if (category === "rule" && matchingModule?.role === "selection_flow" && !governance.selection.present) {
      warnings.add(`Must rule requirement '${requirement.id}' is underspecified because selection governance is missing.`);
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

  addSemanticRiskFindings(schema, findings, warnings, blockers);
  addCoarseCapabilityWarnings(moduleNeeds, warnings);

  const uncertaintyCount = schema.uncertainties?.length ?? 0;
  if (uncertaintyCount > 0) {
    notes.add(`Normalization retained ${uncertaintyCount} uncertainty item(s).`);
  }

  const contentCollectionCount = schema.contentModel?.collections?.length ?? 0;
  if (contentCollectionCount > 0) {
    const featureOwnedCount =
      schema.contentModel?.collections?.filter((collection) => collection.ownership === "feature").length ?? 0;
    notes.add(
      featureOwnedCount > 0
        ? `IntentSchema carries ${featureOwnedCount} feature-owned content collection(s); keep them as Blueprint evidence for possible source-backed authoring instead of collapsing them into parameters.`
        : `IntentSchema carries ${contentCollectionCount} content collection semantic hint(s).`,
    );
  }

  return {
    riskFindings: findings,
    findings,
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

export function detectLocalCooldownSchedulerReusableFit(schema: IntentSchema): boolean {
  if (!hasLocalCooldownOnlySchedulerSignals(schema)) {
    return false;
  }

  if (!shouldUseShortTimeBuffCapability(schema.effects)) {
    return false;
  }

  if (detectSelectionFlowAsk(schema)) {
    return false;
  }

  if (
    classifyRewardProgressionRisk(schema) === "governance_blocked" ||
    classifySpawnEmissionRisk(schema) === "governance_blocked"
  ) {
    return false;
  }

  return true;
}

export function classifySchedulerTimerRisk(
  schema: IntentSchema
): SemanticRiskDisposition | undefined {
  if (!hasAnySchedulerTimerSignals(schema)) {
    return undefined;
  }

  if (detectLocalCooldownSchedulerReusableFit(schema)) {
    return "reusable_fit";
  }

  return "synthesis_required";
}

export function detectSelectionLocalProgressionStateRequirement(
  req: IntentRequirement,
  schema: IntentSchema
): boolean {
  return (
    req.kind === "state" &&
    detectSelectionLocalProgressionReusableFit(schema) &&
    stateRequirementLooksLikeProgression(req, schema)
  );
}

export function detectSelectionLocalProgressionReusableFit(schema: IntentSchema): boolean {
  const governance = getIntentGovernanceView(schema);
  if (!hasAnyRewardProgressionSignals(schema)) {
    return false;
  }

  if (hasForbiddenRewardProgressionScope(schema)) {
    return false;
  }

  if (hasAnySchedulerTimerSignals(schema) || detectSpawnEmitterSignals(schema)) {
    return false;
  }

  if (
    !governance.mechanics.candidatePool ||
    !governance.mechanics.weightedSelection ||
    !governance.mechanics.playerChoice
  ) {
    return false;
  }

  if (governance.selection.inventory) {
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

export function classifyRewardProgressionRisk(
  schema: IntentSchema
): SemanticRiskDisposition | undefined {
  if (!hasAnyRewardProgressionSignals(schema)) {
    return undefined;
  }

  if (detectSelectionLocalProgressionReusableFit(schema)) {
    return "reusable_fit";
  }

  if (hasForbiddenRewardProgressionScope(schema)) {
    return "governance_blocked";
  }

  return "synthesis_required";
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

export function detectForwardLinearProjectileReusableFit(schema: IntentSchema): boolean {
  const governance = getIntentGovernanceView(schema);
  if (!detectSpawnEmitterSignals(schema)) {
    return false;
  }

  if (
    hasAnySchedulerTimerSignals(schema) ||
    hasAnyRewardProgressionSignals(schema)
  ) {
    return false;
  }

  if (
    governance.mechanics.candidatePool ||
    governance.mechanics.weightedSelection ||
    governance.mechanics.playerChoice ||
    governance.mechanics.uiModal
  ) {
    return false;
  }

  if (
    governance.selection.present ||
    governance.selection.cardinality !== undefined ||
    governance.selection.repeatability !== undefined ||
    governance.selection.duplicatePolicy !== undefined ||
    governance.selection.inventory !== undefined
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

export function classifySpawnEmissionRisk(
  schema: IntentSchema
): SemanticRiskDisposition | undefined {
  if (!detectSpawnEmitterSignals(schema)) {
    return undefined;
  }

  if (detectForwardLinearProjectileReusableFit(schema)) {
    return "reusable_fit";
  }

  return "synthesis_required";
}

export function classifyStandaloneSessionStateRisk(
  schema: IntentSchema
): SemanticRiskDisposition | undefined {
  const governance = getIntentGovernanceView(schema);
  const definitionOnlyProvider = isDefinitionOnlyProviderBoundary(schema, schema.request?.rawPrompt);
  const typedStateRequirements = (schema.requirements.typed || []).filter(
    (requirement) => requirement.kind === "state"
  );
  const states = (governance.state.states || []).filter((state) => {
    if (!definitionOnlyProvider) {
      return true;
    }
    const definitionOnlyState = state as {
      id?: string;
      stateId?: string;
      summary?: string;
      owner?: "feature" | "session" | "external";
      lifetime?: "ephemeral" | "session" | "persistent";
      mutationMode?: "create" | "update" | "consume" | "expire" | "remove";
    };
    return !isDefinitionOnlyProviderDerivedState({
      id: definitionOnlyState.id || definitionOnlyState.stateId || "",
      summary: definitionOnlyState.summary || "",
      owner: definitionOnlyState.owner,
      lifetime: definitionOnlyState.lifetime,
      mutationMode: definitionOnlyState.mutationMode,
    });
  });
  const rawStates = (schema.stateModel?.states || []).filter((state) =>
    !definitionOnlyProvider || !isDefinitionOnlyProviderDerivedState(state),
  );

  if (typedStateRequirements.length === 0 && rawStates.length === 0) {
    return undefined;
  }

  if (states.some((state) => state.lifetime === "persistent" || state.owner === "external" || state.owner === "session")) {
    return "governance_blocked";
  }

  if (
    typedStateRequirements.some((requirement) => {
      if (detectSelectionLocalProgressionStateRequirement(requirement, schema)) {
        return false;
      }

      return !governance.mechanics.candidatePool;
    })
  ) {
    return "synthesis_required";
  }

  return rawStates.some((state) => !isPatternOwnedStateReusableFit(state, schema))
    ? "synthesis_required"
    : "reusable_fit";
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
          `ModuleNeed '${need.semanticRole}' falls back to coarse capability 'selection.flow.resolve'; selection semantics remain underspecified and should continue via synthesis or stronger pattern grounding.`
        );
      }
      if (capability === "state.session.feature_owned") {
        warnings.add(
          `ModuleNeed '${need.semanticRole}' falls back to coarse capability 'state.session.feature_owned'; state semantics remain underspecified and should continue via synthesis or stronger pattern grounding.`
        );
      }
    }
  }
}

function addSemanticRiskFindings(
  schema: IntentSchema,
  findings: SemanticRiskFinding[],
  warnings: Set<string>,
  blockers: Set<string>
): void {
  const schedulerRisk = classifySchedulerTimerRisk(schema);
  if (schedulerRisk) {
    pushRiskFinding(
      findings,
      warnings,
      blockers,
      "scheduler_timer",
      schedulerRisk,
      schedulerRisk === "reusable_fit"
        ? "Scheduler/timer semantics match the reusable local-cooldown slice."
        : "Scheduler/timer semantics need synthesis (delay/periodic/cooldown orchestration is synthesis-safe on this seam)."
    );
  }

  const progressionRisk = classifyRewardProgressionRisk(schema);
  if (progressionRisk) {
    pushRiskFinding(
      findings,
      warnings,
      blockers,
      "reward_progression",
      progressionRisk,
      progressionRisk === "reusable_fit"
        ? "Reward/progression semantics match the reusable selection-local threshold slice."
        : progressionRisk === "governance_blocked"
          ? "Reward/progression semantics request persistent/economy/inventory scope and are governance-blocked."
          : "Reward/progression semantics require synthesis beyond the reusable local-threshold slice."
    );
  }

  const spawnRisk = classifySpawnEmissionRisk(schema);
  if (spawnRisk) {
    pushRiskFinding(
      findings,
      warnings,
      blockers,
      "spawn_emission",
      spawnRisk,
      spawnRisk === "reusable_fit"
        ? "Spawn/emission semantics match the reusable forward-linear-projectile slice."
        : "Spawn/emission semantics require synthesis but remain seam-safe via feature-owned spawn emitter composition."
    );
  }

  const stateRisk = classifyStandaloneSessionStateRisk(schema);
  if (stateRisk) {
    pushRiskFinding(
      findings,
      warnings,
      blockers,
      "session_state",
      stateRisk,
      stateRisk === "reusable_fit"
        ? "Session state semantics remain within pattern-owned reusable state handling."
        : stateRisk === "governance_blocked"
          ? "Standalone entity/session state semantics request persistent/external/shared ownership and are governance-blocked."
          : "Standalone entity/session state semantics require synthesis via feature-owned session state."
    );
  }
}

function pushRiskFinding(
  findings: SemanticRiskFinding[],
  warnings: Set<string>,
  blockers: Set<string>,
  family: SemanticRiskFinding["family"],
  disposition: SemanticRiskDisposition,
  summary: string
): void {
  const severity =
    disposition === "governance_blocked"
      ? "error"
      : disposition === "synthesis_required"
        ? "warning"
        : "info";
  findings.push({
    code: family,
    severity,
    message: summary,
    family,
    disposition,
    summary,
  });
  if (disposition === "governance_blocked") {
    blockers.add(summary);
    return;
  }

  if (disposition === "synthesis_required") {
    warnings.add(summary);
  }
}

function resolveRequirementCategoryForAssessment(
  req: IntentRequirement,
  schema: IntentSchema
): BlueprintModule["category"] {
  if (detectSelectionLocalProgressionStateRequirement(req, schema)) {
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
  const governance = getIntentGovernanceView(schema);
  const parameterKeys = collectTypedParameterKeys(schema);
  if (
    governance.timing.intervalSeconds !== undefined ||
    governance.timing.cooldownSeconds !== undefined ||
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
  const governance = getIntentGovernanceView(schema);
  const parameterKeys = collectTypedParameterKeys(schema);
  if (
    governance.timing.intervalSeconds !== undefined ||
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
  const governance = getIntentGovernanceView(schema);
  const parameterKeys = collectTypedParameterKeys(schema);
  if (
    governance.timing.cooldownSeconds !== undefined ||
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

export function detectSelectionFlowAsk(schema: IntentSchema): boolean {
  if (hasGovernanceRevealBatchResolution(schema)) {
    return false;
  }

  if (hasGovernanceSelectionFlowContract(schema)) {
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
  const governance = getIntentGovernanceView(schema);
  if (governance.selection.inventory || hasGovernancePersistentScope(schema) || hasGovernanceExternalOrSharedOwnership(schema)) {
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

export function detectSpawnEmitterSignals(schema: IntentSchema): boolean {
  const governance = getIntentGovernanceView(schema);
  if (getForwardLinearProjectileRequirement(schema)) {
    return true;
  }

  if ((governance.outcome.operations || []).includes("spawn")) {
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

export function detectFollowOwnerMotionSignals(schema: IntentSchema): boolean {
  return collectIntentStrings(schema).some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("follow") ||
      normalized.includes("follow owner") ||
      normalized.includes("following the player") ||
      normalized.includes("tracking") ||
      normalized.includes("跟随玩家") ||
      normalized.includes("跟随")
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

function isPatternOwnedStateReusableFit(
  state: StateModelState,
  schema: IntentSchema
): boolean {
  const governance = getIntentGovernanceView(schema);
  if (stateLooksLikePoolState(state) && governance.mechanics.candidatePool) {
    return true;
  }

  if (
    stateLooksLikeCommittedSelection(state) &&
    (governance.mechanics.weightedSelection || governance.mechanics.playerChoice || governance.selection.present)
  ) {
    return true;
  }

  if (
    detectSelectionLocalProgressionReusableFit(schema) &&
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

import {
  BlueprintModule,
  IntentRequirement,
  IntentSchema,
  ModuleFacetSpec,
  ModuleNeed,
} from "../schema/types";
import { CORE_PATTERN_IDS } from "../patterns/canonical-patterns";
import {
  buildSelectionLocalProgressionConfig,
  classifySchedulerTimerRisk,
  detectFollowOwnerMotionSignals,
  detectForwardLinearProjectileReusableFit,
  detectLocalCooldownSchedulerReusableFit,
  detectSelectionFlowAsk,
  detectSelectionLocalProgressionReusableFit,
  detectSelectionLocalProgressionStateRequirement,
  detectSpawnEmitterSignals,
  shouldUseShortTimeBuffCapability,
  stateLooksLikeCommittedSelection,
  stateLooksLikePoolState,
} from "./seam-authority";
import { stripNegativeConstraintFragments } from "./semantic-lexical";
import { getIntentGovernanceView } from "../wizard/intent-governance-view.js";

export function inferCategoriesFromMechanics(
  schema: IntentSchema
): BlueprintModule["category"][] {
  const mechanics = getIntentGovernanceView(schema).mechanics;
  const categories: BlueprintModule["category"][] = [];

  if (mechanics.trigger) {
    categories.push("trigger");
  }
  if (mechanics.candidatePool) {
    categories.push("data");
  }
  if (
    mechanics.weightedSelection ||
    mechanics.playerChoice ||
    classifySchedulerTimerRisk(schema) === "synthesis_required"
  ) {
    categories.push("rule");
  }
  if (mechanics.uiModal) {
    categories.push("ui");
  }
  if (mechanics.outcomeApplication) {
    categories.push("effect");
  }
  if (mechanics.resourceConsumption) {
    categories.push("resource");
  }

  return categories;
}

export function resolveRequirementCategory(
  req: IntentRequirement,
  schema: IntentSchema
): BlueprintModule["category"] {
  if (detectSelectionLocalProgressionStateRequirement(req, schema)) {
    return "rule";
  }
  if (req.kind === "generic" && looksLikeDefinitionResourceRequirement(req)) {
    return "resource";
  }

  return mapRequirementKindToCategory(req.kind);
}

export function resolveRequirementRole(
  req: IntentRequirement,
  category: BlueprintModule["category"],
  schema: IntentSchema,
  contextSignals: string[]
): string {
  const governance = getIntentGovernanceView(schema);
  if (req.kind === "state") {
    if (category === "rule" && detectSelectionLocalProgressionStateRequirement(req, schema)) {
      return "selection_flow";
    }

    if (!governance.mechanics.candidatePool) {
      return "session_state";
    }
  }

  if (category === "rule") {
    return inferRuleSemanticRole(contextSignals, detectSelectionFlowAsk(schema));
  }

  if (
    category === "effect" &&
    detectSpawnEmitterSignals(schema) &&
    !detectForwardLinearProjectileReusableFit(schema)
  ) {
    return "spawn_emitter";
  }

  return inferRoleFromCategory(category, contextSignals);
}

export function resolveRequirementParameters(
  req: IntentRequirement,
  category: BlueprintModule["category"],
  schemaParams: Record<string, unknown>,
  schema: IntentSchema
): Record<string, unknown> {
  const parameters = {
    ...extractModuleParameters(category, schemaParams),
    ...(req.parameters || {}),
  };

  const progressionConfig =
    category === "rule"
      ? buildSelectionLocalProgressionConfig(req, schema)
      : undefined;
  if (progressionConfig) {
    parameters.progression = progressionConfig;
  }

  return parameters;
}

export function describeMechanicResponsibility(
  category: BlueprintModule["category"]
): string {
  switch (category) {
    case "trigger":
      return "Trigger flow activation";
    case "data":
      return "Provide candidate data and pool state";
    case "rule":
      return "Orchestrate rule evaluation, timing, and commit behavior";
    case "ui":
      return "Present interactive selection surface";
    case "effect":
      return "Apply selected outcome";
    case "resource":
      return "Track resource state and consumption";
    case "integration":
      return "Bridge integration boundaries";
    default:
      return "Handle feature behavior";
  }
}

export function inferRoleFromCategory(
  category: BlueprintModule["category"],
  contextSignals: string[] = [],
  allowSelectionFlow = false,
): string {
  const sanitizedSignals = contextSignals
    .map((signal) => stripNegativeConstraintFragments(signal))
    .filter((signal) => signal.trim().length > 0);

  if (category === "ui") {
    return inferUISemanticRole(sanitizedSignals);
  }

  if (category === "rule") {
    return inferRuleSemanticRole(sanitizedSignals, allowSelectionFlow);
  }

  const roleMap: Record<BlueprintModule["category"], string> = {
    trigger: "input_trigger",
    data: "weighted_pool",
    rule: "rule_orchestrator",
    effect: "effect_application",
    ui: "selection_modal",
    resource: "resource_pool",
    integration: "integration_bridge",
  };
  return roleMap[category];
}

export function extractModuleParameters(
  category: BlueprintModule["category"],
  schemaParams: Record<string, unknown>
): Record<string, unknown> {
  switch (category) {
    case "trigger":
      return extractTriggerParams(schemaParams);
    case "data":
      return extractPoolParams(schemaParams);
    case "rule":
      return extractSelectionParams(schemaParams);
    case "ui":
      return extractUIParams(schemaParams);
    case "effect":
      return extractEffectParams(schemaParams);
    default:
      return {};
  }
}

export function inferCategoryFromRequirement(
  req: string
): BlueprintModule["category"] {
  const reqLower = stripNegativeConstraintFragments(req).toLowerCase();

  if (reqLower.includes("按键") || reqLower.includes("触发") || reqLower.includes("输入")) {
    return "trigger";
  }
  if (reqLower.includes("数据") || reqLower.includes("池") || reqLower.includes("集合")) {
    return "data";
  }
  if (reqLower.includes("规则") || reqLower.includes("流程") || reqLower.includes("选择")) {
    return "rule";
  }
  if (reqLower.includes("效果") || reqLower.includes("技能") || reqLower.includes("冲刺")) {
    return "effect";
  }
  if (
    /\bresource\b/i.test(reqLower) ||
    /\bshell\b/i.test(reqLower) ||
    /\bdefinition\b/i.test(reqLower) ||
    reqLower.includes("资源") ||
    reqLower.includes("定义")
  ) {
    return "resource";
  }
  if (
    /\bui\b/i.test(reqLower) ||
    /\bpanel\b/i.test(reqLower) ||
    /\bmodal\b/i.test(reqLower) ||
    /\bhud\b/i.test(reqLower) ||
    reqLower.includes("界面") ||
    reqLower.includes("显示")
  ) {
    return "ui";
  }
  if (reqLower.includes("资源") || reqLower.includes("消耗")) {
    return "resource";
  }

  return "effect";
}

export function getCanonicalPatternIds(
  category: BlueprintModule["category"],
  role?: string
): string[] {
  switch (category) {
    case "trigger":
      return [CORE_PATTERN_IDS.INPUT_KEY_BINDING];
    case "data":
      if (role === "session_state") {
        return [];
      }
      return [CORE_PATTERN_IDS.DATA_WEIGHTED_POOL];
    case "rule":
      return role === "selection_flow" ? [CORE_PATTERN_IDS.RULE_SELECTION_FLOW] : [];
    case "ui":
      if (role === "resource_bar") {
        return [CORE_PATTERN_IDS.UI_RESOURCE_BAR];
      }
      if (role === "key_hint") {
        return [CORE_PATTERN_IDS.UI_KEY_HINT];
      }
      return [CORE_PATTERN_IDS.UI_SELECTION_MODAL];
    case "effect":
      return [];
    case "resource":
      return [];
    case "integration":
      return [];
    default:
      return [];
  }
}

export function buildModuleNeeds(
  schema: IntentSchema,
  modules: BlueprintModule[],
  moduleFacets: ModuleFacetSpec[] = [],
): ModuleNeed[] {
  const facetsByBackbone = new Map<string, ModuleFacetSpec[]>();
  for (const facet of moduleFacets) {
    const existing = facetsByBackbone.get(facet.backboneModuleId) || [];
    existing.push(facet);
    facetsByBackbone.set(facet.backboneModuleId, existing);
  }

  return modules.map((module) => {
    const facets = facetsByBackbone.get(module.id) || [];
    if (module.planningKind === "backbone" && facets.length > 0) {
      return {
        moduleId: module.id,
        semanticRole: module.role,
        backboneKind: module.backboneKind,
        facetIds: facets.map((facet) => facet.facetId),
        coLocatePreferred: true,
        requiredCapabilities: uniqueStrings(facets.flatMap((facet) => facet.requiredCapabilities || [])) || [],
        optionalCapabilities: uniqueStrings(facets.flatMap((facet) => facet.optionalCapabilities || [])),
        requiredOutputs: uniqueStrings(facets.flatMap((facet) => facet.requiredOutputs || [])),
        stateExpectations: uniqueStrings(facets.flatMap((facet) => facet.stateExpectations || [])),
        integrationHints: uniqueStrings(facets.flatMap((facet) => facet.integrationHints || [])),
        invariants: uniqueStrings(facets.flatMap((facet) => facet.invariants || [])),
        boundedVariability: inferBoundedVariability(module),
        explicitPatternHints: inferExplicitPatternHints(module, schema),
        prohibitedTraits: undefined,
      };
    }

    return {
      moduleId: module.id,
      semanticRole: module.role,
      backboneKind: module.backboneKind,
      facetIds: module.facetIds,
      coLocatePreferred: module.planningKind === "backbone",
      requiredCapabilities: inferRequiredCapabilities(module, schema),
      optionalCapabilities: inferOptionalCapabilities(module, schema),
      requiredOutputs: inferRequiredOutputs(module, schema),
      stateExpectations: inferStateExpectations(module, schema),
      integrationHints: inferIntegrationHints(module, schema),
      invariants: inferInvariants(module, schema),
      boundedVariability: inferBoundedVariability(module),
      explicitPatternHints: inferExplicitPatternHints(module, schema),
      prohibitedTraits: undefined,
    };
  });
}

function uniqueStrings(values: Array<string | undefined>): string[] | undefined {
  const deduped = Array.from(new Set(values.filter((value): value is string => !!value && value.trim().length > 0)));
  return deduped.length > 0 ? deduped : undefined;
}

function mapRequirementKindToCategory(
  kind: IntentRequirement["kind"]
): BlueprintModule["category"] {
  switch (kind) {
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

function looksLikeDefinitionResourceRequirement(
  req: IntentRequirement,
): boolean {
  const text = [
    req.summary,
    ...(req.outputs || []),
    ...(req.invariants || []),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  return (
    /\bresource\b/.test(text) ||
    /\bshell\b/.test(text) ||
    /\bdefinition\b/.test(text) ||
    text.includes("资源") ||
    text.includes("定义")
  );
}

function inferUISemanticRole(
  contextSignals: string[]
): "selection_modal" | "key_hint" | "resource_bar" {
  const context = contextSignals
    .flatMap((signal) => signal.split(/\s+/))
    .join(" ")
    .toLowerCase();

  if (
    contextSignalsContainAny(context, [
      "resource_bar",
      "resource bar",
      "mana",
      "energy",
      "resource",
      "法力",
      "蓝量",
      "资源",
      "bar",
      "条",
    ])
  ) {
    return "resource_bar";
  }

  if (
    contextSignalsContainAny(context, [
      "key_hint",
      "key hint",
      "hotkey",
      "按键",
      "键位",
      "hint",
      "cooldown",
    ])
  ) {
    return "key_hint";
  }

  return "selection_modal";
}

function inferRuleSemanticRole(
  contextSignals: string[],
  allowSelectionFlow: boolean
): "selection_flow" | "timed_rule" | "rule_orchestrator" {
  const context = contextSignals
    .flatMap((signal) => signal.split(/\s+/))
    .join(" ")
    .toLowerCase();

  if (
    allowSelectionFlow &&
    contextSignalsContainAny(context, [
      "selection",
      "select",
      "choice",
      "choose",
      "pick",
      "candidate",
      "draw",
      "draft",
      "weighted",
      "modal",
      "候选",
      "选择",
      "选项",
      "抽取",
      "抽卡",
      "加权",
      "稀有",
    ])
  ) {
    return "selection_flow";
  }

  if (
    contextSignalsContainAny(context, [
      "periodic",
      "interval",
      "tick",
      "timer",
      "timed",
      "duration",
      "cooldown",
      "scheduler",
      "every",
      "burn",
      "damage over time",
      "每隔",
      "周期",
      "持续",
      "定时",
      "冷却",
    ])
  ) {
    return "timed_rule";
  }

  return "rule_orchestrator";
}

function extractTriggerParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.triggerKey) {
    result.key = params.triggerKey;
  }
  if (params.eventName) {
    result.eventName = params.eventName;
  }
  return result;
}

function extractPoolParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.entries) {
    result.entries = params.entries;
  }
  if (params.weights) {
    result.weights = params.weights;
  }
  if (params.tiers) {
    result.tiers = params.tiers;
  }
  if (params.choiceCount) {
    result.choiceCount = params.choiceCount;
  }
  if (params.drawMode) {
    result.drawMode = params.drawMode;
  }
  if (params.duplicatePolicy) {
    result.duplicatePolicy = params.duplicatePolicy;
  }
  if (params.poolStateTracking) {
    result.poolStateTracking = params.poolStateTracking;
  }
  return result;
}

function extractSelectionParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.choiceCount) {
    result.choiceCount = params.choiceCount;
  }
  if (params.selectionPolicy) {
    result.selectionPolicy = params.selectionPolicy;
  }
  if (params.applyMode) {
    result.applyMode = params.applyMode;
  }
  if (params.postSelectionPoolBehavior) {
    result.postSelectionPoolBehavior = params.postSelectionPoolBehavior;
  }
  if (params.trackSelectedItems !== undefined) {
    result.trackSelectedItems = params.trackSelectedItems;
  }
  if (params.effectApplication) {
    result.effectApplication = params.effectApplication;
  }
  if (params.inventory) {
    result.inventory = params.inventory;
  }
  return result;
}

function extractUIParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.choiceCount) {
    result.choiceCount = params.choiceCount;
  }
  if (params.layoutPreset) {
    result.layoutPreset = params.layoutPreset;
  }
  if (params.selectionMode) {
    result.selectionMode = params.selectionMode;
  }
  if (params.dismissBehavior) {
    result.dismissBehavior = params.dismissBehavior;
  }
  if (params.payloadShape) {
    result.payloadShape = params.payloadShape;
  }
  if (params.minDisplayCount !== undefined) {
    result.minDisplayCount = params.minDisplayCount;
  }
  if (params.placeholderConfig) {
    result.placeholderConfig = params.placeholderConfig;
  }
  if (params.inventory) {
    result.inventory = params.inventory;
  }
  return result;
}

function extractEffectParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (params.effectMapping) {
    result.effectMapping = params.effectMapping;
  }
  if (params.effectApplication) {
    result.effectApplication = params.effectApplication;
  }
  return result;
}

export function inferExplicitPatternHints(
  module: BlueprintModule,
  schema: IntentSchema
): string[] | undefined {
  const hints = new Set<string>();
  const defaultPatternIds = new Set(getCanonicalPatternIds(module.category, module.role));

  for (const patternId of schema.constraints.requiredPatterns || []) {
    if (patternMatchesModuleCategory(patternId, module.category)) {
      hints.add(patternId);
    }
  }

  for (const patternId of module.patternIds || []) {
    if (!defaultPatternIds.has(patternId)) {
      hints.add(patternId);
    }
  }

  return hints.size > 0 ? [...hints] : undefined;
}

function patternMatchesModuleCategory(
  patternId: string,
  category: BlueprintModule["category"]
): boolean {
  const family = patternId.split(".")[0];
  switch (category) {
    case "trigger":
      return family === "input";
    case "data":
      return family === "data";
    case "rule":
      return family === "rule";
    case "effect":
      return family === "effect";
    case "resource":
      return family === "resource";
    case "ui":
      return family === "ui";
    case "integration":
      return family === "integration";
    default:
      return false;
  }
}

export function inferRequiredCapabilities(
  module: BlueprintModule,
  schema: IntentSchema
): string[] {
  const governance = getIntentGovernanceView(schema);
  const capabilities = new Set<string>();

  switch (module.category) {
    case "trigger":
      capabilities.add("input.trigger.capture");
      break;
    case "data":
      if (module.role === "session_state") {
        capabilities.add("state.session.feature_owned");
      } else if (governance.mechanics.candidatePool) {
        capabilities.add("selection.pool.weighted_candidates");
      } else {
        capabilities.add("state.session.feature_owned");
      }
      break;
    case "rule":
      if (module.role === "selection_flow" && (
        governance.mechanics.playerChoice ||
        governance.selection.choiceMode === "user-chosen" ||
        governance.selection.choiceMode === "hybrid" ||
        governance.ui.needed ||
        governance.mechanics.uiModal
      )) {
        capabilities.add("selection.flow.player_confirmed");
      } else if (
        module.role === "selection_flow" &&
        (
          governance.selection.source === "weighted-pool" ||
          governance.selection.choiceMode === "weighted" ||
          governance.selection.choiceMode === "hybrid" ||
          governance.mechanics.weightedSelection
        )
      ) {
        capabilities.add("selection.flow.weighted_resolve");
      } else if (module.role === "timed_rule") {
        if (hasDelayTimingSignal(schema, module)) {
          capabilities.add("timing.delay.local");
        }
        if (hasIntervalTimingSignal(schema, module)) {
          capabilities.add("timing.interval.local");
        }
        if (hasCooldownTimingSignal(schema, module)) {
          capabilities.add("timing.cooldown.local");
        }
        if (capabilities.size === 0) {
          capabilities.add("rule.execution.orchestrate");
        }
      } else {
        capabilities.add("rule.execution.orchestrate");
      }
      break;
    case "effect":
      if (module.role === "spawn_emitter") {
        capabilities.add("emission.spawn.feature_owned");
        break;
      }
      if (detectForwardLinearProjectileReusableFit(schema)) {
        capabilities.add("emission.projectile.linear.forward");
        break;
      }
      if (shouldUseShortTimeBuffCapability(schema.effects)) {
        capabilities.add("ability.buff.short_duration");
        break;
      }
      for (const operation of governance.effect.operations || []) {
        capabilities.add(mapEffectOperationToCapability(operation));
      }
      if ((governance.effect.operations || []).length === 0) {
        capabilities.add("effect.modifier.apply");
      }
      break;
    case "resource":
      capabilities.add("resource.pool.numeric");
      break;
    case "ui":
      if (module.role === "resource_bar") {
        capabilities.add("ui.resource.bar");
      } else if (module.role === "key_hint") {
        capabilities.add("ui.input.key_hint");
      } else {
        capabilities.add("ui.selection.modal");
      }
      break;
    case "integration":
      capabilities.add("integration.bridge.sync");
      break;
  }

  return [...capabilities];
}

export function inferOptionalCapabilities(
  module: BlueprintModule,
  schema: IntentSchema
): string[] | undefined {
  const governance = getIntentGovernanceView(schema);
  const optional = new Set<string>();

  if (
    module.category === "rule" &&
    module.role === "selection_flow" &&
    detectSelectionLocalProgressionReusableFit(schema)
  ) {
    optional.add("progression.selection.local_threshold");
  }
  if (module.category === "rule" && governance.selection.repeatability) {
    optional.add(`selection-repeatability/${governance.selection.repeatability}`);
  }
  if (
    module.category === "rule" &&
    (
      governance.selection.source === "weighted-pool" ||
      governance.selection.choiceMode === "weighted" ||
      governance.selection.choiceMode === "hybrid" ||
      governance.mechanics.weightedSelection
    )
  ) {
    optional.add("selection.flow.weighted_resolve");
  }
  if (module.category === "ui" && governance.ui.feedbackNeeds) {
    for (const need of governance.ui.feedbackNeeds) {
      optional.add(`ui-feedback/${need}`);
    }
  }
  if (module.category === "effect" && governance.effect.durationSemantics) {
    optional.add(`effect-duration/${governance.effect.durationSemantics}`);
  }
  if (module.category === "effect" && detectLocalCooldownSchedulerReusableFit(schema)) {
    optional.add("timing.cooldown.local");
  }
  if (
    module.category === "effect" &&
    module.role === "spawn_emitter" &&
    detectSpawnEmitterSignals(schema) &&
    detectFollowOwnerMotionSignals(schema)
  ) {
    optional.add("entity.motion.follow_owner");
  }

  return optional.size > 0 ? [...optional] : undefined;
}

export function inferRequiredOutputs(
  module: BlueprintModule,
  schema: IntentSchema
): string[] | undefined {
  const governance = getIntentGovernanceView(schema);
  const outputs = new Set<string>();

  if (module.outputs) {
    for (const output of module.outputs) {
      outputs.add(output);
    }
  }
  if (module.category === "ui" && (governance.ui.needed || (governance.ui.surfaces || []).length > 0)) {
    outputs.add("ui.surface");
  }
  if (module.category === "trigger") {
    outputs.add("server.runtime");
  }
  if (
    module.category === "data" &&
    module.role === "weighted_pool" &&
    governance.mechanics.candidatePool
  ) {
    outputs.add("shared.runtime");
  }
  if (module.category === "rule") {
    outputs.add("server.runtime");
  }
  if (module.category === "effect") {
    outputs.add("server.runtime");
    outputs.add("host.config.kv");
    if (
      shouldUseShortTimeBuffCapability(schema.effects) ||
      detectForwardLinearProjectileReusableFit(schema)
    ) {
      outputs.add("host.runtime.lua");
    }
    for (const output of schema.requirements.outputs || []) {
      outputs.add(output);
    }
    for (const requirement of schema.requirements.typed || []) {
      if (resolveRequirementCategory(requirement, schema) === "effect") {
        for (const output of requirement.outputs || []) {
          outputs.add(output);
        }
      }
    }
  }
  if (module.category === "integration") {
    outputs.add("server.runtime");
    for (const binding of schema.integrations?.expectedBindings || []) {
      outputs.add(`${binding.kind}:${binding.id}`);
    }
  }

  return outputs.size > 0 ? [...outputs] : undefined;
}

export function inferStateExpectations(
  module: BlueprintModule,
  schema: IntentSchema
): string[] | undefined {
  const governance = getIntentGovernanceView(schema);
  const rawStates = schema.stateModel?.states || [];
  const governanceStates = governance.state.states || [];

  if (rawStates.length === 0 && governanceStates.length === 0) {
    return undefined;
  }

  if (!["data", "rule", "resource", "effect"].includes(module.category)) {
    return undefined;
  }

  const expectations = new Set<string>();

  const hasCandidatePoolState =
    governance.mechanics.candidatePool ||
    (governance.content.collections || []).some((collection) => collection.role === "candidate-options") ||
    rawStates.some((state) => stateLooksLikePoolState(state));
  if (module.category === "data" && hasCandidatePoolState) {
    expectations.add("selection.pool_state");
  }

  const hasCommittedSelectionState =
    governance.selection.present &&
    (
      governance.mechanics.playerChoice ||
      governance.mechanics.outcomeApplication ||
      governance.selection.commitment !== undefined
    );
  if (
    ["rule", "effect"].includes(module.category) &&
    (hasCommittedSelectionState || rawStates.some((state) => stateLooksLikeCommittedSelection(state)))
  ) {
    expectations.add("selection.commit_state");
  }

  if (
    module.category === "rule" &&
    module.role === "selection_flow" &&
    detectSelectionLocalProgressionReusableFit(schema)
  ) {
    expectations.add("progression.round_counter_state");
    expectations.add("progression.level_state");
  }

  for (const state of governanceStates) {
    if (state.owner) {
      expectations.add(`owner:${state.owner}`);
    }
    if (state.lifetime) {
      expectations.add(`lifetime:${state.lifetime}`);
    }
    if (state.mutationMode) {
      expectations.add(`mutation:${state.mutationMode}`);
    }
  }

  return [...expectations];
}

export function inferIntegrationHints(
  module: BlueprintModule,
  schema: IntentSchema
): string[] | undefined {
  const bindings = schema.integrations?.expectedBindings || [];
  if (bindings.length === 0 && module.category !== "ui") {
    return undefined;
  }

  const hints = new Set<string>();
  if (module.category === "ui") {
    hints.add("ui.surface");
    if (module.role === "resource_bar") {
      hints.add("resource.ui_surface");
    } else if (module.role === "key_hint") {
      hints.add("input.binding");
    }
  }

  for (const binding of bindings) {
    if (module.category === "integration" || (module.category === "ui" && binding.kind === "ui-surface")) {
      if (binding.kind === "ui-surface") {
        if (module.role === "resource_bar") {
          hints.add("resource.ui_surface");
        } else if (module.role === "key_hint") {
          hints.add("input.binding");
        } else {
          hints.add("selection.ui_surface");
        }
      }
      if (module.category === "ui") {
        hints.add("ui.surface");
      }
      if (binding.kind === "bridge-point" || module.category === "integration") {
        hints.add("server.runtime");
      }
      hints.add(`binding:${binding.kind}`);
      if (binding.required) {
        hints.add(`required-binding:${binding.kind}`);
      }
    }
  }

  return hints.size > 0 ? [...hints] : undefined;
}

function hasDelayTimingSignal(
  schema: IntentSchema,
  module: BlueprintModule,
): boolean {
  return schema.timing?.delaySeconds !== undefined
    || typeof module.parameters?.initialDelaySeconds === "number"
    || typeof module.parameters?.delaySeconds === "number";
}

function hasIntervalTimingSignal(
  schema: IntentSchema,
  module: BlueprintModule,
): boolean {
  return schema.timing?.intervalSeconds !== undefined
    || typeof module.parameters?.tickSeconds === "number"
    || typeof module.parameters?.intervalSeconds === "number";
}

function hasCooldownTimingSignal(
  schema: IntentSchema,
  module: BlueprintModule,
): boolean {
  return schema.timing?.cooldownSeconds !== undefined
    || typeof module.parameters?.cooldownSeconds === "number"
    || typeof module.parameters?.cooldown === "number"
    || typeof module.parameters?.abilityCooldown === "number";
}

export function inferInvariants(
  module: BlueprintModule,
  schema: IntentSchema
): string[] | undefined {
  const invariants = new Set<string>();

  for (const requirement of schema.requirements.typed || []) {
    if (resolveRequirementCategory(requirement, schema) === module.category) {
      for (const invariant of requirement.invariants || []) {
        invariants.add(invariant);
      }
    }
  }

  return invariants.size > 0 ? [...invariants] : undefined;
}

function inferBoundedVariability(
  module: BlueprintModule
): string[] | undefined {
  const variability = new Set<string>();

  if (module.parameters) {
    for (const key of Object.keys(module.parameters)) {
      variability.add(`parameter:${key}`);
    }
  }

  return variability.size > 0 ? [...variability] : undefined;
}

function mapEffectOperationToCapability(
  operation: NonNullable<IntentSchema["effects"]>["operations"][number]
): string {
  switch (operation) {
    case "apply":
      return "effect.modifier.apply";
    case "remove":
      return "effect.modifier.remove";
    case "stack":
      return "effect.modifier.stack";
    case "expire":
      return "effect.modifier.expire";
    case "consume":
      return "effect.resource.consume";
    case "restore":
      return "effect.resource.restore";
    default:
      return "effect.modifier.apply";
  }
}

function contextSignalsContainAny(context: string, terms: string[]): boolean {
  return terms.some((term) => context.includes(term.toLowerCase()));
}

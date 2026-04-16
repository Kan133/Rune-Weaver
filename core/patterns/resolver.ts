/**
 * Rune Weaver - Pattern Resolver
 *
 * Capability-fit-first resolver:
 * ModuleNeed -> capability fit -> compatibility scoring -> hint tie-break.
 *
 * The shared ModuleNeed seam is not yet available in core/schema/types.ts,
 * so this resolver consumes it opportunistically when present on the runtime
 * Blueprint object and otherwise derives a provisional need surface from the
 * existing Blueprint modules/mechanics without mutating the shared schema.
 */

import {
  Blueprint,
  BlueprintModule,
  PatternHint,
  SelectedPattern as BaseSelectedPattern,
  NormalizedMechanics,
} from "../schema/types";
import {
  getCanonicalPatternMeta,
  getCanonicalPatterns,
  isCanonicalPatternAvailable,
} from "./canonical-patterns";
import type { PatternMeta } from "./index.js";

type ResolutionSource = "need" | "hint-tiebreak" | "fallback";
type NeedSource = "module-need" | "derived-module" | "derived-mechanic";

export interface ResolvedPattern extends BaseSelectedPattern {
  priority: "required" | "preferred" | "fallback";
  source: ResolutionSource;
  moduleId?: string;
  score?: number;
}

export interface UnresolvedPattern {
  requestedId: string;
  reason: string;
  suggestedAlternative?: string;
  moduleId?: string;
  missingCapabilities?: string[];
}

export interface PatternResolutionResult {
  patterns: ResolvedPattern[];
  unresolved: UnresolvedPattern[];
  issues: ResolutionIssue[];
  complete: boolean;
}

export interface ResolutionIssue {
  code: string;
  scope: "schema" | "blueprint" | "assembly" | "host";
  severity: "error" | "warning";
  message: string;
  path?: string;
  moduleId?: string;
}

interface RuntimeModuleNeed {
  moduleId: string;
  semanticRole: string;
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  requiredOutputs: string[];
  stateExpectations: string[];
  integrationHints: string[];
  invariants: string[];
  boundedVariability: string[];
  explicitPatternHints: string[];
  prohibitedTraits: string[];
  sourceModule?: BlueprintModule;
  source: NeedSource;
}

interface CandidatePatternScore {
  meta: PatternMeta;
  score: number;
  matchedOutputs: string[];
  matchedStates: string[];
  matchedIntegrationHints: string[];
  matchedOptionalCapabilities: string[];
}

const MODULE_NEED_FAMILY_HINT = "family";

export function resolvePatterns(blueprint: Blueprint): PatternResolutionResult {
  const patterns: ResolvedPattern[] = [];
  const unresolved: UnresolvedPattern[] = [];
  const issues: ResolutionIssue[] = [];
  const selectedById = new Map<string, ResolvedPattern>();

  const needs = extractRuntimeModuleNeeds(blueprint, issues);

  for (const need of needs) {
    const result = resolveFromNeed(need, blueprint);

    if (result.resolved) {
      const existing = selectedById.get(result.resolved.patternId);
      if (!existing) {
        selectedById.set(result.resolved.patternId, result.resolved);
      } else {
        existing.parameters = {
          ...existing.parameters,
          ...result.resolved.parameters,
        };
        existing.priority =
          priorityValue(result.resolved.priority) > priorityValue(existing.priority)
            ? result.resolved.priority
            : existing.priority;
        existing.score = Math.max(existing.score || 0, result.resolved.score || 0);
      }
    }

    if (result.unresolved) {
      unresolved.push(result.unresolved);
      issues.push({
        code: "MODULE_NEED_UNRESOLVED",
        scope: "assembly",
        severity: "warning",
        message: result.unresolved.reason,
        moduleId: need.moduleId,
      });
    }
  }

  // Keep legacy hints as diagnostics only if they reference missing patterns.
  for (const hint of blueprint.patternHints || []) {
    for (const patternId of hint.suggestedPatterns || []) {
      if (!isCanonicalPatternAvailable(patternId)) {
        unresolved.push({
          requestedId: patternId,
          reason: `Pattern hint '${patternId}' not found in current catalog`,
        });
      }
    }
  }

  const selectedPatterns = Array.from(selectedById.values()).sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return a.patternId.localeCompare(b.patternId);
  });

  if (selectedPatterns.length === 0) {
    issues.push({
      code: "NO_PATTERNS_RESOLVED",
      scope: "assembly",
      severity: "error",
      message: "No patterns could be resolved from capability-fit evaluation",
    });
  }

  return {
    patterns: selectedPatterns,
    unresolved,
    issues,
    complete:
      selectedPatterns.length > 0 &&
      unresolved.length === 0 &&
      !issues.some((issue) => issue.severity === "error"),
  };
}

function resolveFromNeed(
  need: RuntimeModuleNeed,
  blueprint: Blueprint
): { resolved: ResolvedPattern | null; unresolved: UnresolvedPattern | null } {
  const candidates = getCanonicalPatterns()
    .filter((pattern) => supportsRequiredCapabilities(pattern, need.requiredCapabilities))
    .filter((pattern) => !violatesProhibitedTraits(pattern, need.prohibitedTraits))
    .filter((pattern) => satisfiesInvariants(pattern, need.invariants));

  if (candidates.length === 0) {
    return {
      resolved: null,
      unresolved: {
        requestedId: `<module:${need.moduleId}>`,
        moduleId: need.moduleId,
        reason: `No admitted pattern satisfies required capabilities for module '${need.semanticRole}'`,
        missingCapabilities: [...need.requiredCapabilities],
        suggestedAlternative: "Add an admitted pattern family path or mark the mechanic unsupported",
      },
    };
  }

  const scored = candidates.map((pattern) => scoreCandidate(pattern, need));
  const bestScore = Math.max(...scored.map((candidate) => candidate.score));
  const bestCandidates = scored.filter((candidate) => candidate.score === bestScore);

  if (
    bestScore === 0 &&
    (need.requiredOutputs.length > 0 ||
      need.stateExpectations.length > 0 ||
      need.integrationHints.length > 0 ||
      need.invariants.length > 0)
  ) {
    return {
      resolved: null,
      unresolved: {
        requestedId: `<module:${need.moduleId}>`,
        moduleId: need.moduleId,
        reason:
          `Patterns matched required capabilities for module '${need.semanticRole}' ` +
          `but none satisfied output/state/integration compatibility strongly enough`,
        suggestedAlternative:
          "Refine the admitted pattern metadata or narrow the declared ModuleNeed compatibility surface",
      },
    };
  }

  const selected = applyHintTieBreak(bestCandidates, need.explicitPatternHints);
  const source: ResolutionSource =
    need.explicitPatternHints.includes(selected.meta.id) && bestCandidates.length > 1
      ? "hint-tiebreak"
      : "need";

  return {
    resolved: {
      patternId: selected.meta.id,
      role: need.semanticRole,
      parameters: extractParametersForNeed(need, blueprint, selected.meta.id),
      priority: "required",
      source,
      moduleId: need.moduleId,
      score: selected.score,
    },
    unresolved: null,
  };
}

function extractRuntimeModuleNeeds(
  blueprint: Blueprint,
  issues: ResolutionIssue[]
): RuntimeModuleNeed[] {
  const explicitNeeds = extractExplicitModuleNeeds(blueprint, issues);
  if (explicitNeeds.length > 0) {
    return explicitNeeds;
  }

  const derivedFromModules = blueprint.modules.map((module) =>
    deriveNeedFromBlueprintModule(module, blueprint)
  );
  if (derivedFromModules.length > 0) {
    issues.push({
      code: "MODULE_NEED_DERIVED",
      scope: "blueprint",
      severity: "warning",
      message:
        "Blueprint does not expose canonical ModuleNeed[] at runtime yet; resolver derived provisional needs from Blueprint modules",
    });
    return derivedFromModules;
  }

  return deriveNeedsFromMechanics(blueprint.sourceIntent.normalizedMechanics);
}

function extractExplicitModuleNeeds(
  blueprint: Blueprint,
  issues: ResolutionIssue[]
): RuntimeModuleNeed[] {
  const runtimeNeeds = (blueprint as Blueprint & { moduleNeeds?: unknown }).moduleNeeds;
  if (!Array.isArray(runtimeNeeds)) return [];

  const legacyHints = collectGlobalHintIds(blueprint.patternHints);

  return runtimeNeeds
    .filter((need) => typeof need === "object" && !!need)
    .map((need, index) => {
      const runtimeNeed = need as Record<string, unknown>;
      const normalized: RuntimeModuleNeed = {
        moduleId: readString(runtimeNeed.moduleId) || `module_need_${index}`,
        semanticRole: readString(runtimeNeed.semanticRole) || `module_need_${index}`,
        requiredCapabilities: normalizeStringArray(runtimeNeed.requiredCapabilities),
        optionalCapabilities: normalizeStringArray(runtimeNeed.optionalCapabilities),
        requiredOutputs: normalizeStringArray(runtimeNeed.requiredOutputs),
        stateExpectations: normalizeStringArray(runtimeNeed.stateExpectations),
        integrationHints: normalizeStringArray(runtimeNeed.integrationHints),
        invariants: normalizeStringArray(runtimeNeed.invariants),
        boundedVariability: normalizeStringArray(runtimeNeed.boundedVariability),
        explicitPatternHints: mergeUniqueStrings(
          normalizeStringArray(runtimeNeed.explicitPatternHints),
          legacyHints
        ),
        prohibitedTraits: normalizeStringArray(runtimeNeed.prohibitedTraits),
        source: "module-need",
      };

      if (normalized.requiredCapabilities.length === 0) {
        issues.push({
          code: "MODULE_NEED_MISSING_CAPABILITY",
          scope: "blueprint",
          severity: "warning",
          message:
            `ModuleNeed '${normalized.moduleId}' has no requiredCapabilities; ` +
            "resolver may honest-block until Lane B emits stronger semantics",
          moduleId: normalized.moduleId,
        });
      }

      return normalized;
    });
}

function deriveNeedFromBlueprintModule(
  module: BlueprintModule,
  blueprint: Blueprint
): RuntimeModuleNeed {
  const context = buildModuleContext(module);
  const requiredCapabilities = deriveRequiredCapabilities(module, blueprint.sourceIntent.normalizedMechanics, context);
  const requiredOutputs = deriveRequiredOutputs(module, context);
  const stateExpectations = deriveStateExpectations(module, context);
  const integrationHints = deriveIntegrationHints(module, context);
  const invariants = deriveInvariants(module, context);
  const globalHints = collectGlobalHintIds(blueprint.patternHints, module.category);

  return {
    moduleId: module.id,
    semanticRole: module.role,
    requiredCapabilities,
    optionalCapabilities: deriveOptionalCapabilities(module, blueprint.sourceIntent.normalizedMechanics, context),
    requiredOutputs,
    stateExpectations,
    integrationHints,
    invariants,
    boundedVariability: [],
    explicitPatternHints: mergeUniqueStrings(module.patternIds || [], globalHints),
    prohibitedTraits: deriveProhibitedTraits(module, context),
    sourceModule: module,
    source: "derived-module",
  };
}

function deriveNeedsFromMechanics(mechanics: NormalizedMechanics): RuntimeModuleNeed[] {
  const needs: RuntimeModuleNeed[] = [];

  if (mechanics.trigger) {
    needs.push({
      moduleId: "mechanic_trigger",
      semanticRole: "trigger",
      requiredCapabilities: ["input.trigger.capture"],
      optionalCapabilities: [],
      requiredOutputs: ["server.runtime"],
      stateExpectations: [],
      integrationHints: ["input.binding"],
      invariants: [],
      boundedVariability: [],
      explicitPatternHints: [],
      prohibitedTraits: [],
      source: "derived-mechanic",
    });
  }

  if (mechanics.weightedSelection || mechanics.candidatePool) {
    needs.push({
      moduleId: "mechanic_candidate_pool",
      semanticRole: "candidate_pool",
      requiredCapabilities: ["data.pool.weighted"],
      optionalCapabilities: ["selection.candidate_pool"],
      requiredOutputs: ["shared.runtime"],
      stateExpectations: ["selection.pool_state"],
      integrationHints: ["selection.candidate_source"],
      invariants: [],
      boundedVariability: [],
      explicitPatternHints: [],
      prohibitedTraits: [],
      source: "derived-mechanic",
    });
  }

  if (mechanics.playerChoice) {
    needs.push({
      moduleId: "mechanic_selection_flow",
      semanticRole: "selection_flow",
      requiredCapabilities: ["selection.flow.player_confirmed"],
      optionalCapabilities: ["selection.flow.pool_commit"],
      requiredOutputs: ["server.runtime"],
      stateExpectations: ["selection.commit_state"],
      integrationHints: ["selection.ui_surface"],
      invariants: [],
      boundedVariability: [],
      explicitPatternHints: [],
      prohibitedTraits: [],
      source: "derived-mechanic",
    });
  }

  if (mechanics.outcomeApplication) {
    needs.push({
      moduleId: "mechanic_outcome_application",
      semanticRole: "outcome_application",
      requiredCapabilities: ["effect.modifier.apply"],
      optionalCapabilities: [],
      requiredOutputs: ["server.runtime", "host.config.kv"],
      stateExpectations: [],
      integrationHints: ["ability.execution"],
      invariants: [],
      boundedVariability: [],
      explicitPatternHints: [],
      prohibitedTraits: [],
      source: "derived-mechanic",
    });
  }

  if (mechanics.resourceConsumption) {
    needs.push({
      moduleId: "mechanic_resource_consumption",
      semanticRole: "resource_consumption",
      requiredCapabilities: ["effect.resource.consume"],
      optionalCapabilities: [],
      requiredOutputs: ["server.runtime"],
      stateExpectations: ["resource.current_value"],
      integrationHints: ["resource.pool"],
      invariants: [],
      boundedVariability: [],
      explicitPatternHints: [],
      prohibitedTraits: [],
      source: "derived-mechanic",
    });
  }

  return needs;
}

function deriveRequiredCapabilities(
  module: BlueprintModule,
  mechanics: NormalizedMechanics,
  context: string
): string[] {
  switch (module.category) {
    case "trigger":
      return ["input.trigger.capture"];
    case "data":
      return ["data.pool.weighted"];
    case "rule":
      return ["selection.flow.player_confirmed"];
    case "resource":
      return ["resource.pool.numeric"];
    case "ui":
      if (includesAny(context, ["resource", "mana", "energy", "bar"])) {
        return ["ui.resource.bar"];
      }
      if (includesAny(context, ["key", "按键", "cooldown", "hint"])) {
        return ["ui.input.key_hint"];
      }
      return ["ui.selection.modal"];
    case "effect":
      if (includesAny(context, ["dash", "冲刺", "位移", "blink", "jump", "leap", "突进"])) {
        return ["effect.displacement.dash"];
      }
      if (includesAny(context, ["consume", "cost", "消耗", "mana", "energy", "resource", "扣除"])) {
        return ["effect.resource.consume"];
      }
      if (
        includesAny(context, ["buff", "增益", "movespeed", "移速", "speed bonus"]) &&
        !includesAny(context, ["debuff", "减益", "damage", "伤害", "slow", "stun"])
      ) {
        return ["ability.buff.short_duration"];
      }
      if (mechanics.outcomeApplication || includesAny(context, ["modifier", "apply", "应用", "效果"])) {
        return ["effect.modifier.apply"];
      }
      return ["effect.unspecified"];
    case "integration":
      return ["integration.bridge"];
    default:
      return [`${module.category}.unspecified`];
  }
}

function deriveOptionalCapabilities(
  module: BlueprintModule,
  mechanics: NormalizedMechanics,
  context: string
): string[] {
  const optional: string[] = [];

  if (module.category === "data" && (mechanics.weightedSelection || mechanics.candidatePool)) {
    optional.push("selection.candidate_pool");
  }

  if (module.category === "rule") {
    optional.push("selection.flow.pool_commit");
    if (includesAny(context, ["effect", "modifier", "奖励", "reward"])) {
      optional.push("selection.flow.effect_mapping");
    }
  }

  if (module.category === "effect" && includesAny(context, ["self", "自身", "自己", "hero"])) {
    optional.push("effect.modifier.apply_self");
  }

  if (module.category === "resource" && includesAny(context, ["regen", "回复", "恢复"])) {
    optional.push("resource.pool.regen");
  }

  return optional;
}

function deriveRequiredOutputs(module: BlueprintModule, context: string): string[] {
  const outputs = normalizeStringArray(module.outputs);
  if (outputs.length > 0) {
    return outputs.flatMap(mapOutputSignal);
  }

  switch (module.category) {
    case "data":
    case "resource":
      return ["shared.runtime"];
    case "ui":
      return ["ui.surface"];
    case "effect":
      if (includesAny(context, ["buff", "增益", "modifier", "ability", "lua"])) {
        return ["server.runtime", "host.config.kv"];
      }
      if (includesAny(context, ["dash", "冲刺", "位移"])) {
        return ["server.runtime", "host.config.kv"];
      }
      return ["server.runtime"];
    default:
      return ["server.runtime"];
  }
}

function deriveStateExpectations(module: BlueprintModule, context: string): string[] {
  switch (module.category) {
    case "data":
      return includesAny(context, ["session", "remaining", "owned", "choice", "状态"])
        ? ["selection.pool_state"]
        : [];
    case "rule":
      return ["selection.commit_state"];
    case "resource":
      return ["resource.current_value", "resource.max_value"];
    case "effect":
      if (includesAny(context, ["duration", "持续", "stack", "层数", "modifier"])) {
        return ["modifier.duration_state"];
      }
      return [];
    default:
      return [];
  }
}

function deriveIntegrationHints(module: BlueprintModule, context: string): string[] {
  switch (module.category) {
    case "trigger":
      return ["input.binding", "event.dispatch"];
    case "data":
      return ["selection.candidate_source"];
    case "rule":
      return ["selection.ui_surface", "selection.candidate_source"];
    case "resource":
      return ["resource.ui_surface", "resource.cost_source"];
    case "ui":
      return includesAny(context, ["resource", "mana", "energy"])
        ? ["resource.ui_surface"]
        : ["selection.ui_surface"];
    case "effect":
      return includesAny(context, ["modifier", "buff", "ability"])
        ? ["ability.execution", "modifier.runtime"]
        : ["ability.execution"];
    default:
      return [];
  }
}

function deriveInvariants(module: BlueprintModule, context: string): string[] {
  if (module.category === "effect" && includesAny(context, ["dash", "冲刺", "位移"])) {
    return ["distance and speed must remain positive"];
  }
  if (module.category === "data" && includesAny(context, ["session", "remaining", "owned", "choice"])) {
    return ["session state tracking must be explicit when enabled"];
  }
  return [];
}

function deriveProhibitedTraits(module: BlueprintModule, context: string): string[] {
  if (module.category === "effect" && includesAny(context, ["debuff", "减益", "damage", "伤害"])) {
    return ["self_targeted_effect"];
  }
  return [];
}

function scoreCandidate(pattern: PatternMeta, need: RuntimeModuleNeed): CandidatePatternScore {
  const matchedOutputs = need.requiredOutputs.filter((output) =>
    patternSupportsSignal(pattern.semanticOutputs, output)
  );
  const matchedStates = need.stateExpectations.filter((state) =>
    patternSupportsSignal(pattern.stateAffordances, state)
  );
  const matchedIntegrationHints = need.integrationHints.filter((hint) =>
    patternSupportsSignal(pattern.integrationHints, hint)
  );
  const matchedOptionalCapabilities = need.optionalCapabilities.filter((capability) =>
    pattern.capabilities.includes(capability)
  );

  const score =
    matchedOutputs.length * 4 +
    matchedStates.length * 3 +
    matchedIntegrationHints.length * 2 +
    matchedOptionalCapabilities.length;

  return {
    meta: pattern,
    score,
    matchedOutputs,
    matchedStates,
    matchedIntegrationHints,
    matchedOptionalCapabilities,
  };
}

function applyHintTieBreak(
  candidates: CandidatePatternScore[],
  hints: string[]
): CandidatePatternScore {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const hinted = candidates.find((candidate) => hints.includes(candidate.meta.id));
  if (hinted) {
    return hinted;
  }

  return [...candidates].sort((a, b) => a.meta.id.localeCompare(b.meta.id))[0];
}

function supportsRequiredCapabilities(pattern: PatternMeta, requiredCapabilities: string[]): boolean {
  return requiredCapabilities.every((capability) => pattern.capabilities.includes(capability));
}

function violatesProhibitedTraits(pattern: PatternMeta, prohibitedTraits: string[]): boolean {
  if (!pattern.traits || prohibitedTraits.length === 0) return false;
  return prohibitedTraits.some((trait) => pattern.traits?.includes(trait));
}

function satisfiesInvariants(pattern: PatternMeta, invariants: string[]): boolean {
  if (invariants.length === 0) return true;
  return invariants.every((invariant) => pattern.invariants?.includes(invariant));
}

function extractParametersForNeed(
  need: RuntimeModuleNeed,
  blueprint: Blueprint,
  patternId: string
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const sourceModule =
    need.sourceModule || blueprint.modules.find((module) => module.id === need.moduleId);

  if (sourceModule?.parameters) {
    Object.assign(params, sourceModule.parameters);
  }

  if (patternId.startsWith("effect.")) {
    Object.assign(
      params,
      extractEffectParameters(
        sourceModule?.role || need.semanticRole,
        sourceModule?.responsibilities || []
      )
    );
  }

  if (Object.keys(params).length === 0 && blueprint.parameters) {
    Object.assign(params, blueprint.parameters);
  }

  return params;
}

function buildModuleContext(module: BlueprintModule): string {
  return [module.role, ...(module.responsibilities || []), ...(module.inputs || []), ...(module.outputs || [])]
    .join(" ")
    .toLowerCase();
}

function collectGlobalHintIds(hints: PatternHint[] = [], category?: string): string[] {
  const filtered = hints.filter((hint) => {
    if (!category) return true;
    return !hint.category || hint.category === category;
  });

  return mergeUniqueStrings(
    ...filtered.map((hint) => hint.suggestedPatterns || [])
  );
}

function mergeUniqueStrings(...values: string[][]): string[] {
  return Array.from(new Set(values.flat().filter(Boolean)));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function patternSupportsSignal(values: string[] | undefined, signal: string): boolean {
  if (!values || values.length === 0) return false;

  const normalizedSignal = normalizeSignal(signal);
  return values.some((value) => {
    const normalizedValue = normalizeSignal(value);
    return (
      normalizedValue === normalizedSignal ||
      normalizedValue.includes(normalizedSignal) ||
      normalizedSignal.includes(normalizedValue)
    );
  });
}

function mapOutputSignal(output: string): string[] {
  const normalized = normalizeSignal(output);
  if (!normalized) return [];

  if (normalized.includes("ui")) return ["ui.surface"];
  if (normalized.includes("shared")) return ["shared.runtime"];
  if (normalized.includes("lua")) return ["host.runtime.lua"];
  if (normalized.includes("kv") || normalized.includes("config")) return ["host.config.kv"];
  if (normalized.includes("server") || normalized.includes("ts") || normalized.includes("runtime")) {
    return ["server.runtime"];
  }
  return [output];
}

function normalizeSignal(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ".");
}

function includesAny(context: string, terms: string[]): boolean {
  return terms.some((term) => context.includes(term.toLowerCase()));
}

function extractEffectParameters(role: string, responsibilities: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const context = (role + " " + responsibilities.join(" ")).toLowerCase();

  const distanceMatch =
    context.match(/(\d+)\s*(?:units?|distance|距离|码|米)/i) ||
    context.match(/(?:向前|向后|向\w+)?\s*(?:冲刺|位移|dash|move)\s*(\d+)/i);
  if (distanceMatch) {
    params.dashDistance = parseInt(distanceMatch[1], 10);
  }

  const healMatch =
    context.match(/(\d+)\s*(?:hp|health|生命值|生命)/i) ||
    context.match(/(?:恢复|回复|regen|heal)\s*(\d+)/i);
  if (healMatch) {
    params.healAmount = parseInt(healMatch[1], 10);
  }

  const intervalMatch =
    context.match(/(\d+(?:\.\d+)?)\s*(?:second|秒)/i) ||
    context.match(/(?:per|every|每)\s*(\d+(?:\.\d+)?)\s*(?:second|秒)/i);
  if (intervalMatch) {
    params.tickInterval = parseFloat(intervalMatch[1] || intervalMatch[2] || "1");
  }

  const durationMatch =
    context.match(/(?:for|持续|duration)\s*(\d+(?:\.\d+)?)\s*(?:second|秒)/i) ||
    context.match(/(\d+)\s*(?:second|秒)\s*(?:duration|持续)/i);
  if (durationMatch) {
    params.duration = parseFloat(durationMatch[1]);
  }

  const cooldownMatch =
    context.match(/cooldown\s*(\d+(?:\.\d+)?)/i) ||
    context.match(/(?:冷却|cd)\s*(\d+(?:\.\d+)?)/i);
  if (cooldownMatch) {
    params.cooldown = parseFloat(cooldownMatch[1]);
  }

  const manaMatch =
    context.match(/mana\s*(\d+)/i) ||
    context.match(/(?:法力|蓝量)\s*(\d+)/i) ||
    context.match(/(\d+)\s*(?:mana|法力)/i);
  if (manaMatch) {
    params.manaCost = parseInt(manaMatch[1] || manaMatch[2], 10);
  }

  return params;
}

function priorityValue(priority: ResolvedPattern["priority"]): number {
  const values: Record<ResolvedPattern["priority"], number> = {
    required: 3,
    preferred: 2,
    fallback: 1,
  };
  return values[priority] || 0;
}

export function mergeDuplicatePatterns(patterns: ResolvedPattern[]): ResolvedPattern[] {
  const patternMap = new Map<string, ResolvedPattern>();

  for (const pattern of patterns) {
    const existing = patternMap.get(pattern.patternId);
    if (!existing) {
      patternMap.set(pattern.patternId, pattern);
      continue;
    }

    if (priorityValue(pattern.priority) > priorityValue(existing.priority)) {
      patternMap.set(pattern.patternId, {
        ...pattern,
        parameters: { ...existing.parameters, ...pattern.parameters },
      });
      continue;
    }

    existing.parameters = { ...existing.parameters, ...pattern.parameters };
    existing.score = Math.max(existing.score || 0, pattern.score || 0);
  }

  return Array.from(patternMap.values());
}

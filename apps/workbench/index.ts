/**
 * Rune Weaver - Workbench Entry
 * 
 * Phase 2A + Phase 2B: Feature Identity + Ownership + Integration Point Baseline
 * 
 * This is a thin entry layer that reuses existing wizard service.
 * Not to be confused with full UI Workbench - this is just the product entry point.
 */

import { createLLMClientFromEnv, isLLMConfigured } from "../../core/llm/factory.js";
import type { LLMClient } from "../../core/llm/types.js";
import { runWizardToIntentSchema, WizardIntentInput, WizardIntentOptions } from "../../core/wizard/index.js";
import type { IntentSchema } from "../../core/schema/types.js";
import { isCanonicalPatternAvailable } from "../../core/patterns/canonical-patterns.js";
import { loadWorkspace, findFeatureById, workspaceExists, getActiveFeatures, saveWorkspace, deleteFeature, addFeatureToWorkspace } from "../../core/workspace/manager.js";
import type { FeatureWriteResult, RuneWeaverFeatureRecord } from "../../core/workspace/types.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { createWritePlan, WritePlanEntry } from "../../adapters/dota2/assembler/index.js";
import { updateWorkspaceState } from "../cli/helpers/workspace-integration.js";
import type { Blueprint } from "../../core/schema/types.js";

import {
  WORKBENCH_LLM_TEMPERATURE,
  WORKBENCH_WIZARD_LLM_TEMPERATURE,
  WORKBENCH_LLM_PROVIDER_OPTIONS,
  WORKBENCH_WIZARD_PROVIDER_OPTIONS,
  LABELS,
  SECTIONS,
  PLAN_LABELS,
  WRITE_LABELS,
  GOVERNANCE_LABELS,
  CONFIRMATION_LABELS,
  p,
} from "./labels.js";

import {
  createFeatureRouting,
  createFeatureFocus,
  createUpdateHandoff,
  createLifecycleActions,
  createActionRoute,
} from "./routing.js";

import {
  createUpdateDryRunPlan,
  createBlockedDryRunPlan,
  createUpdateWriteResult,
  createUpdateHandler,
  executeActualUpdateWrite,
} from "./update.js";

import {
  createGovernanceRelease,
  createConfirmationAction,
} from "./governance.js";
import { BUILTIN_EXPERIENCES, findRelevantExperiences } from "./experience-library.js";
import { detectSceneAnchors } from "./scene-anchors.js";

import type {
  WorkbenchOptions,
  WorkbenchResult,
  FeatureCardStatus,
  FeatureCard,
  FeatureDetailBasicInfo,
  FeatureDetailStatus,
  FeatureDetailEditableParams,
  FeatureDetailHostOutput,
  FeatureDetailPatternBindings,
  FeatureDetail,
  LifecycleActionKind,
  LifecycleAction,
  FeaturePersistenceState,
  LifecycleActions,
  ActionRouteStatus,
  ActionRoute,
  ActionRouteResult,
  FeatureRoutingDecision,
  FeatureRoutingCandidate,
  FeatureRouting,
  FeatureFocusType,
  FeatureFocus,
  UpdateHandoffStatus,
  UpdateHandoff,
  UpdateHandlerStatus,
  UpdateHandler,
  UpdatePlanStatus,
  UpdateOperationType,
  AffectedSurface,
  UpdateDryRunPlan,
  UpdateWriteStatus,
  UpdateWriteMode,
  TouchedOutput,
  UpdateWriteResult,
  GovernanceReleaseStatus,
  RequiredConfirmationItem,
  GovernanceRelease,
  ConfirmationActionStatus,
  ConfirmedItem,
  ConfirmationAction,
  FeatureIdentity,
  FeatureStage,
  FeatureOwnership,
  OwnershipSurface,
  ImpactArea,
  OwnershipConfidence,
  IntegrationPointRegistry,
  IntegrationPoint,
  IntegrationPointKind,
  IntakeSession,
  WizardDegradationStatus,
  WizardDegradationInfo,
  FeatureReview,
  OwnershipSummary,
  IntegrationPointSummary,
  ConflictSummary,
  KnownInputs,
  UINeedsResult,
  NextStepRecommendation,
  ClarificationResult,
  UIDetectionResult,
  UIIntakeResult,
  ConflictKind,
  ConflictSeverity,
  ConflictStatus,
  RecommendedAction,
  IntegrationPointConflict,
  ConflictCheckResult,
  ProposalStatus,
  ProposedModule,
  ProposedConnection,
  BlueprintProposal,
  ExperienceKind,
  ExperienceMaturity,
  ExperienceEntry,
  ExperienceReference,
  GapKind,
  FillSource,
  GapFillEntry,
  GapFillResult,
  FailureCorpus,
  ActualWriteResult,
} from "./types.js";

function identifyGapsAndFill(
  proposal: BlueprintProposal,
  client: any
): GapFillResult {
  const identifiedGaps: GapFillEntry[] = [];
  const filledGaps: GapFillEntry[] = [];
  const unfilledGaps: GapFillEntry[] = [];
  
  for (const module of proposal.proposedModules) {
    const moduleGaps = detectModuleGaps(module, proposal);
    identifiedGaps.push(...moduleGaps);
  }
  
  for (const gap of identifiedGaps) {
    const fillResult = fillSingleGap(gap, client);
    if (fillResult) {
      filledGaps.push(fillResult);
    } else {
      unfilledGaps.push(gap);
    }
  }
  
  const categoryEGaps = identifiedGaps.filter(g => g.fillSource === "clarification_needed");
  const categoryESummary = categoryEGaps.map(g => 
    `[${g.gapKind}] ${g.targetModuleId}: ${g.notes?.[0] || "requires clarification"}`
  );
  
  return {
    identifiedGaps,
    filledGaps,
    unfilledGaps,
    categoryEGaps,
    categoryESummary,
  };
}

const REAL_LLM_GAP_KINDS: GapKind[] = ["title", "description"];

async function identifyGapsAndFillAsync(
  proposal: BlueprintProposal,
  client: LLMClient
): Promise<GapFillResult> {
  const identifiedGaps: GapFillEntry[] = [];
  const filledGaps: GapFillEntry[] = [];
  const unfilledGaps: GapFillEntry[] = [];
  
  for (const module of proposal.proposedModules) {
    const moduleGaps = detectModuleGaps(module, proposal);
    identifiedGaps.push(...moduleGaps);
  }
  
  for (const gap of identifiedGaps) {
    if (gap.fillSource === "llm" && REAL_LLM_GAP_KINDS.includes(gap.gapKind)) {
      const llmFill = await fillSingleGapWithLLM(gap, client, proposal);
      if (llmFill) {
        filledGaps.push(llmFill);
        continue;
      } else {
        console.log(`   [Gap Fill] ⚠️ LLM fill failed for ${gap.gapKind} in ${gap.targetModuleId}, gap remains unfilled`);
      }
    } else if (gap.fillSource === "llm" && !REAL_LLM_GAP_KINDS.includes(gap.gapKind)) {
      console.log(`   [Gap Fill] ⏭️ Skipped LLM for ${gap.gapKind} in ${gap.targetModuleId} (not in whitelist: ${REAL_LLM_GAP_KINDS.join(", ")})`);
    }
    
    const fillResult = fillSingleGap(gap, client);
    if (fillResult) {
      filledGaps.push(fillResult);
    } else {
      unfilledGaps.push(gap);
    }
  }
  
  const categoryEGaps = identifiedGaps.filter(g => g.fillSource === "clarification_needed");
  const categoryESummary = categoryEGaps.map(g => 
    `[${g.gapKind}] ${g.targetModuleId}: ${g.notes?.[0] || "requires clarification"}`
  );
  
  return {
    identifiedGaps,
    filledGaps,
    unfilledGaps,
    categoryEGaps,
    categoryESummary,
  };
}

function detectModuleGaps(module: ProposedModule, proposal: BlueprintProposal): GapFillEntry[] {
  const gaps: GapFillEntry[] = [];
  const params = module.proposedParameters || {};
  
  if (module.category === "data" || module.role.includes("pool") || module.role.includes("data")) {
    if (!params.title && !params.label) {
      gaps.push({
        id: `gap_${module.id}_title`,
        gapKind: "title",
        targetField: "title",
        targetModuleId: module.id,
        fillSource: "llm",
        suggestedValue: null,
        confidence: "medium",
        notes: ["Category B: Missing title, requires LLM inference"],
        risks: ["UI may display without context"],
      });
    }
    
    if (!params.entries && !params.items) {
      gaps.push({
        id: `gap_${module.id}_entries`,
        gapKind: "description",
        targetField: "entries",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: [],
        confidence: "low",
        notes: ["Default empty entries - structural field, not content description"],
        risks: ["Pool may be empty at runtime"],
      });
    }
  }
  
  if (module.category === "effect" || module.role.includes("effect") || module.role.includes("buff")) {
    const userRequestLower = proposal.userRequest.toLowerCase();
    
    if (params.duration === undefined || params.duration === null) {
      gaps.push({
        id: `gap_${module.id}_duration`,
        gapKind: "duration",
        targetField: "duration",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: 5.0,
        confidence: "medium",
        notes: ["Default duration from experience layer"],
        risks: ["User may want different duration"],
      });
    }
    
    if (params.cooldown === undefined || params.cooldown === null) {
      gaps.push({
        id: `gap_${module.id}_cooldown`,
        gapKind: "cooldown",
        targetField: "cooldown",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: 30.0,
        confidence: "medium",
        notes: ["Default cooldown from experience layer"],
        risks: ["User may want different cooldown"],
      });
    }
  }
  
  if (module.category === "rule" || module.role.includes("rule") || module.role.includes("selection")) {
    if (params.choiceCount === undefined || params.choiceCount === null) {
      gaps.push({
        id: `gap_${module.id}_choiceCount`,
        gapKind: "choiceCount",
        targetField: "choiceCount",
        targetModuleId: module.id,
        fillSource: "rule",
        suggestedValue: 3,
        confidence: "medium",
        notes: ["Default choice count from experience"],
        risks: ["User may want different choice count"],
      });
    }
  }
  
  if (module.category === "ui" || module.role.includes("ui") || module.role.includes("modal")) {
    if (!params.title && !params.label) {
      gaps.push({
        id: `gap_${module.id}_title`,
        gapKind: "title",
        targetField: "title",
        targetModuleId: module.id,
        fillSource: "llm",
        suggestedValue: null,
        confidence: "medium",
        notes: ["Category B: Missing UI title, requires LLM inference"],
        risks: ["User may want custom title"],
      });
    }
    
    if (!params.description && !params.copy_hint) {
      gaps.push({
        id: `gap_${module.id}_description`,
        gapKind: "description",
        targetField: "description",
        targetModuleId: module.id,
        fillSource: "llm",
        suggestedValue: null,
        confidence: "low",
        notes: ["Category B: Missing UI description, requires LLM inference"],
        risks: ["User may want custom description"],
      });
    }
  }
  
  if (module.missingPatterns) {
    gaps.push({
      id: `gap_${module.id}_pattern`,
      gapKind: "pattern",
      targetField: "proposedPatternIds",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: proposedPatternIds is empty - no pattern selected"],
      risks: ["Core functionality depends on pattern selection"],
    });
  }
  
  if (module.missingIntegration) {
    gaps.push({
      id: `gap_${module.id}_integration`,
      gapKind: "integration",
      targetField: "integration",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: multi-module proposal but this module has no connections in proposedConnections"],
      risks: ["Feature may not work in isolation"],
    });
  }
  
  if (module.missingOwnership) {
    gaps.push({
      id: `gap_${module.id}_ownership`,
      gapKind: "ownership",
      targetField: "role",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: role is undefined or 'unknown' - ownership boundary unclear"],
      risks: ["Module ownership boundary not defined"],
    });
  }
  
  if (module.missingCapability) {
    gaps.push({
      id: `gap_${module.id}_capability`,
      gapKind: "capability",
      targetField: "capability",
      targetModuleId: module.id,
      fillSource: "clarification_needed",
      suggestedValue: null,
      confidence: "low",
      notes: ["Category E: effect module missing all of duration/damage/radius - capability unclear"],
      risks: ["Effect behavior undefined"],
    });
  }
  
  return gaps;
}

function fillSingleGap(gap: GapFillEntry, client: any): GapFillEntry | null {
  if (gap.fillSource === "rule" && gap.suggestedValue !== null) {
    return {
      ...gap,
      suggestedValue: gap.suggestedValue,
    };
  }
  
  if (gap.fillSource === "llm") {
    return null;
  }
  
  if (gap.fillSource === "clarification_needed") {
    return null;
  }
  
  return null;
}

async function fillSingleGapWithLLM(
  gap: GapFillEntry,
  client: LLMClient,
  proposalContext: BlueprintProposal
): Promise<GapFillEntry | null> {
  if (gap.fillSource !== "llm" || !REAL_LLM_GAP_KINDS.includes(gap.gapKind)) {
    return null;
  }
  
  const module = proposalContext.proposedModules.find(m => m.id === gap.targetModuleId);
  const moduleContext = module 
    ? `Module role: ${module.role}, category: ${module.category}`
    : "Unknown module";
  
  const prompt = `You are a game feature parameter filler.

Given the following gap context, suggest an appropriate value for the field.

Gap Information:
- Field: ${gap.targetField}
- Kind: ${gap.gapKind}
- ${moduleContext}

Proposal Summary:
- ${proposalContext.proposedModules.length} modules proposed
- Notes: ${proposalContext.notes.join("; ") || "none"}

Suggest a concise, appropriate value for "${gap.targetField}" that fits the Dota2 modding context.
Respond with only the value, no explanation.`;

  try {
    const result = await client.generateText({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 100,
      providerOptions: { thinking: { type: "disabled" } },
    });
    
    const suggestedValue = result.text.trim();
    
    if (!suggestedValue || suggestedValue.length === 0) {
      return null;
    }
    
    return {
      ...gap,
      suggestedValue: suggestedValue,
      confidence: "medium",
      notes: [...(gap.notes || []), "Filled via LLM inference"],
    };
  } catch (error) {
    console.warn(`   [Gap Fill] LLM inference failed for ${gap.targetField}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const UI_TRIGGER_KEYWORDS = [
  "ui", "modal", "dialog", "panel", "button", "menu", "hud", "screen",
  "interface", "selection", "choose", "pick", "talent", "upgrade", "inventory",
  "tooltip", "icon", "display", "show", "hide", "popup", "窗口", "界面",
  "选择", "抽取", "天赋", "菜单", "按钮", "提示", "显示"
];

const UI_SURFACE_KEYWORDS: Record<string, string[]> = {
  modal: ["modal", "dialog", "弹出", "选择", "抽取", "talent", "天赋"],
  panel: ["panel", "hud", "界面", "窗口", "screen", "menu", "菜单"],
  selection: ["selection", "choose", "pick", "选择", "三选一", "四选一"],
  tooltip: ["tooltip", "提示", "信息"],
  bar: ["bar", "进度条", "资源条"],
};

const UI_INTERACTION_LEVELS = ["minimal", "low", "medium", "high"];

const KEY_PARAM_PATTERNS = {
  trigger: ["按", "key", "trigger", "按键", "绑定", "press", "Q", "W", "E", "R", "F"],
  damage: ["damage", "伤害", "dps", "damage", "数值", "50", "100", "200"],
  range: ["range", "范围", "距离", "300", "400", "500", "600"],
  duration: ["duration", "持续", "秒", "时间", "10", "30", "60"],
  cooldown: ["cooldown", "冷却", "cd", "30", "60", "120"],
  target: ["target", "目标", "enemy", "self", "友方", "敌方"],
};

function generateFeatureId(): string {
  return `feature_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function extractFeatureLabel(request: string): string {
  const requestLower = request.toLowerCase();
  
  const abilityKeywords = ["ability", "技能", "法", "ability"];
  const buffKeywords = ["buff", "增益", "增强", "提升"];
  const damageKeywords = ["damage", "伤害", "dps"];
  const dashKeywords = ["dash", "冲刺", "位移", "闪避"];
  const talentKeywords = ["talent", "天赋", "升级"];
  const selectionKeywords = ["selection", "选择", "抽取", "三选一", "四选一"];
  
  if (talentKeywords.some(k => requestLower.includes(k))) {
    return "talent_system";
  }
  if (selectionKeywords.some(k => requestLower.includes(k))) {
    return "selection_system";
  }
  if (dashKeywords.some(k => requestLower.includes(k))) {
    return "dash_ability";
  }
  if (buffKeywords.some(k => requestLower.includes(k))) {
    return "buff_effect";
  }
  if (damageKeywords.some(k => requestLower.includes(k))) {
    return "damage_ability";
  }
  if (abilityKeywords.some(k => requestLower.includes(k))) {
    return "ability";
  }
  
  return "general_feature";
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createFeatureIdentity(request: string, hostRoot: string): FeatureIdentity {
  const featureId = generateFeatureId();
  const featureLabel = extractFeatureLabel(request);
  
  return {
    id: featureId,
    label: featureLabel,
    intentSummary: request.substring(0, 80),
    hostScope: hostRoot,
    currentStage: "intake",
    createdAt: new Date(),
  };
}

function createFeatureOwnership(featureId: string, request: string, hostRoot: string): FeatureOwnership {
  const requestLower = request.toLowerCase();
  const expectedSurfaces: OwnershipSurface[] = [];
  const impactAreas: ImpactArea[] = [];
  
  expectedSurfaces.push("trigger");
  
  if (requestLower.includes("data") || requestLower.includes("pool") || requestLower.includes("list") ||
      requestLower.includes("数据") || requestLower.includes("列表") || requestLower.includes("池")) {
    expectedSurfaces.push("data");
  }
  
  if (requestLower.includes("rule") || requestLower.includes("logic") || requestLower.includes("condition") ||
      requestLower.includes("规则") || requestLower.includes("逻辑")) {
    expectedSurfaces.push("rule");
  }
  
  if (UI_TRIGGER_KEYWORDS.some(k => requestLower.includes(k))) {
    expectedSurfaces.push("ui");
    impactAreas.push("ui_surface");
  }
  
  if (requestLower.includes("buff") || requestLower.includes("effect") || requestLower.includes("damage") ||
      requestLower.includes("增益") || requestLower.includes("效果") || requestLower.includes("伤害")) {
    expectedSurfaces.push("effect");
    impactAreas.push("gameplay");
    impactAreas.push("ability_system");
  }
  
  if (requestLower.includes("shared") || requestLower.includes("global") ||
      requestLower.includes("全局") || requestLower.includes("共享")) {
    expectedSurfaces.push("shared");
  }
  
  if (expectedSurfaces.length < 2) {
    expectedSurfaces.push("data");
    expectedSurfaces.push("effect");
    impactAreas.push("gameplay");
  }
  
  if (!impactAreas.includes("gameplay")) {
    impactAreas.push("gameplay");
  }
  
  if (expectedSurfaces.includes("ui") && !impactAreas.includes("ui_surface")) {
    impactAreas.push("ui_surface");
  }
  
  let confidence: OwnershipConfidence = "low";
  if (expectedSurfaces.length >= 3 && impactAreas.length >= 2) {
    confidence = "high";
  } else if (expectedSurfaces.length >= 2) {
    confidence = "medium";
  }
  
  const isComplete = confidence !== "low";
  
  return {
    featureId,
    expectedSurfaces,
    impactAreas,
    confidence,
    isComplete,
  };
}

function buildProposalMessages(
  userRequest: string,
  integrationPointKinds: string[],
  expectedSurfaces: string,
  impactAreas: string,
  experienceContext: string
): { role: "user"; content: string }[] {
  const prompt = `You are a game feature blueprint proposal generator for Dota2 modding.

Given the following feature request, generate a minimal blueprint proposal.

Feature Request: "${userRequest}"

Detected Integration Points: ${integrationPointKinds.join(", ") || "none"}
Expected Surfaces: ${expectedSurfaces}
Impact Areas: ${impactAreas}${experienceContext}

OUTPUT RULES:
- 2-5 modules ONLY. Reject generating more.
- Each module MUST have a role that is a concrete gameplay noun, NOT a generic label.
- GOOD role examples: "ability_trigger", "dash_execution", "buff_effect", "talent_pool", "selection_ui", "movespeed_buff"
- BAD role examples: "system", "handler", "logic_module", "effect_handler", "generic"
- Effect modules MUST include at least one parameter intent: duration, damage, radius, movespeedBonus, cooldown, manaCost, or similar concrete numeric field
- Proposed pattern IDs MUST be from this exact catalog only. Do NOT invent new patterns:
  input.key_binding, data.weighted_pool, rule.selection_flow, effect.dash, effect.modifier_applier, effect.resource_consume, resource.basic_pool, ui.selection_modal, ui.key_hint, ui.resource_bar, dota2.short_time_buff
- proposedPatternIds can reference 1-2 patterns per module maximum.
- Module count target: 2-5. If 2-3 modules can cover the feature, prefer fewer modules.`;

  return [{ role: "user" as const, content: prompt }];
}

const PROPOSAL_SCHEMA = {
  version: "string",
  proposedModules: [
    {
      id: "string (must be unique per module)",
      role: "string (concrete gameplay noun like ability_trigger, dash_execution, buff_effect - NOT generic like system, handler, logic_module)",
      category: "enum: data|trigger|effect|ui|rule (choose based on role semantics)",
      proposedPatternIds: "array of 1-2 pattern IDs from catalog only: input.key_binding, data.weighted_pool, rule.selection_flow, effect.dash, effect.modifier_applier, effect.resource_consume, resource.basic_pool, ui.selection_modal, ui.key_hint, ui.resource_bar, dota2.short_time_buff",
      proposedParameters: "object with concrete numeric parameter intents for effect modules (min: duration OR damage OR cooldown OR manaCost OR movespeedBonus OR radius)",
    },
  ],
  notes: ["string"],
  issues: ["string (only if something cannot be resolved)"],
};

async function generateBlueprintProposal(
  featureId: string,
  featureLabel: string,
  userRequest: string,
  integrationPoints: IntegrationPointRegistry,
  featureOwnership: FeatureOwnership,
  client: LLMClient
): Promise<BlueprintProposal> {
  const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const integrationPointKinds = [...new Set(integrationPoints.points.map(p => p.kind))];
  const expectedSurfaces = featureOwnership.expectedSurfaces.join(", ");
  const impactAreas = featureOwnership.impactAreas.join(", ");
  
  const experienceReferences = findRelevantExperiences(featureLabel, integrationPoints, featureOwnership);
  const relevantExperiences = BUILTIN_EXPERIENCES.filter(exp => 
    experienceReferences.some(ref => ref.experienceId === exp.id)
  );
  
  let experienceContext = "";
  if (relevantExperiences.length > 0) {
    experienceContext = "\n\nRelevant experience entries for reference:\n";
    for (const exp of relevantExperiences) {
      experienceContext += `- ${exp.id} (${exp.maturity}): suggested patterns: ${(exp.suggestedPatternIds ?? []).join(", ")}\n`;
      experienceContext += `  Notes: ${(exp.notes ?? []).join("; ")}\n`;
    }
  }
  
  try {
    const result = await client.generateObject<{
      proposedModules: ProposedModule[];
      notes: string[];
      issues: string[];
    }>({
      messages: buildProposalMessages(userRequest, integrationPointKinds, expectedSurfaces, impactAreas, experienceContext),
      schemaName: "BlueprintProposal",
      schemaDescription: "Generate a minimal blueprint proposal for Dota2 feature",
      schema: PROPOSAL_SCHEMA,
      temperature: WORKBENCH_LLM_TEMPERATURE,
      providerOptions: WORKBENCH_LLM_PROVIDER_OPTIONS,
    });
    
    const parsed = result.object;
    const parsedModules: ProposedModule[] = (parsed.proposedModules || []).map((m: ProposedModule) => ({
      id: m.id || `module_${Math.random().toString(36).substring(2, 9)}`,
      role: m.role || "unknown",
      category: m.category || "data",
      proposedPatternIds: Array.isArray(m.proposedPatternIds) ? m.proposedPatternIds : [],
      proposedParameters: m.proposedParameters || {},
    }));
    
    const invalidPatternNotes: string[] = [];
    const invalidPatternIdsMap: Record<string, string[]> = {};
    for (const mod of parsedModules) {
      const validPatternIds = mod.proposedPatternIds.filter(id => isCanonicalPatternAvailable(id));
      const invalidPatternIds = mod.proposedPatternIds.filter(id => !isCanonicalPatternAvailable(id));
      if (invalidPatternIds.length > 0) {
        invalidPatternNotes.push(`Module ${mod.id}: invalid pattern IDs filtered: ${invalidPatternIds.join(", ")}`);
        invalidPatternIdsMap[mod.id] = invalidPatternIds;
      }
      mod.proposedPatternIds = validPatternIds;
    }
    if (invalidPatternNotes.length > 0) {
      console.log(`   [Pattern Validation] ${invalidPatternNotes.join("; ")}`);
    }
    
    const proposedConnections: ProposedConnection[] = [];
    for (let i = 0; i < parsedModules.length - 1; i++) {
      proposedConnections.push({
        sourceModuleId: parsedModules[i].id,
        targetModuleId: parsedModules[i + 1].id,
        connectionType: "implicit_sequence",
      });
    }
    
    for (const mod of parsedModules) {
      if (mod.proposedPatternIds.length === 0) {
        mod.missingPatterns = true;
      }
      if (parsedModules.length >= 2) {
        const hasConnections = proposedConnections.some(
          c => c.sourceModuleId === mod.id || c.targetModuleId === mod.id
        );
        if (!hasConnections) {
          mod.missingIntegration = true;
        }
      }
      if (!mod.role || mod.role === "unknown") {
        mod.missingOwnership = true;
      }
      const params = mod.proposedParameters || {};
      const hasEffectParams = "duration" in params || "damage" in params || "radius" in params ||
        "movespeedBonus" in params || "cooldown" in params || "manaCost" in params ||
        "distance" in params || "speed" in params;
      if (mod.category === "effect" && !hasEffectParams) {
        mod.missingCapability = true;
      }
    }
    
    const notes: string[] = Array.isArray(parsed.notes) ? parsed.notes : [];
    const issues: string[] = Array.isArray(parsed.issues) ? parsed.issues : [];
    
    if (parsedModules.length === 0) {
      throw new Error("No modules parsed from LLM response");
    }
    
    const confidence: OwnershipConfidence = parsedModules.length >= 3 ? "high" : 
                                            parsedModules.length >= 2 ? "medium" : "low";
    
    let status: ProposalStatus = "draft";
    if (issues.length > 0) {
      status = "needs_review";
    } else if (confidence === "high") {
      status = "usable";
    }
    
    return {
      id: proposalId,
      source: "llm",
      status,
      featureId,
      userRequest,
      proposedModules: parsedModules,
      proposedConnections,
      confidence,
      notes,
      issues,
      referencedExperiences: experienceReferences,
      generatedAt: new Date(),
      invalidPatternIds: Object.keys(invalidPatternIdsMap).length > 0 ? invalidPatternIdsMap : undefined,
    };
  } catch (llmError) {
    const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);
    const errorStatus =
      typeof llmError === "object" &&
      llmError !== null &&
      "status" in llmError &&
      typeof (llmError as { status?: unknown }).status === "number"
        ? (llmError as { status: number }).status
        : undefined;

    console.log(`   [Blueprint Proposal] LLM structured generation failed: ${errorMessage}`);
    if (errorStatus !== undefined) {
      console.log(`   [Blueprint Proposal] LLM error status: ${errorStatus}`);
    }

    const fallbackModules: ProposedModule[] = [];
    const fallbackNotes: string[] = ["LLM unavailable - using fallback proposal"];
    const fallbackIssues: string[] = [
      `LLM proposal generation failed - this is a fallback: ${errorMessage}`,
    ];
    
    if (featureOwnership.expectedSurfaces.includes("trigger") || 
        integrationPoints.points.some(p => p.kind === "trigger_binding")) {
      fallbackModules.push({
        id: "ability_trigger",
        role: "ability_trigger",
        category: "trigger",
        proposedPatternIds: ["input.key_binding"],
        proposedParameters: { triggerKey: "Q" },
      });
    }
    
    if (featureOwnership.expectedSurfaces.includes("data") || 
        integrationPoints.points.some(p => p.kind === "kv_entry" || p.kind === "data_pool")) {
      fallbackModules.push({
        id: "ability_data",
        role: "ability_data",
        category: "data",
        proposedPatternIds: ["data.weighted_pool"],
        proposedParameters: { entries: [] },
      });
    }
    
    if (featureOwnership.expectedSurfaces.includes("effect") || 
        integrationPoints.points.some(p => p.kind === "effect_slot" || p.kind === "modifier_slot")) {
      fallbackModules.push({
        id: "ability_effect",
        role: "ability_effect",
        category: "effect",
        proposedPatternIds: ["effect.modifier_applier"],
        proposedParameters: { duration: 5.0 },
      });
    }
    
    if (featureOwnership.expectedSurfaces.includes("ui") || 
        integrationPoints.points.some(p => p.kind === "ui_mount")) {
      fallbackModules.push({
        id: "ability_ui",
        role: "ability_ui",
        category: "ui",
        proposedPatternIds: ["ui.key_hint"],
        proposedParameters: { showHotkey: true },
      });
    }
    
    if (fallbackModules.length === 0) {
      fallbackModules.push({
        id: "generic_module",
        role: "generic",
        category: "data",
        proposedPatternIds: ["data.weighted_pool"],
        proposedParameters: {},
      });
    }
    
    return {
      id: proposalId,
      source: "fallback",
      status: "needs_review",
      featureId,
      userRequest,
      proposedModules: fallbackModules,
      proposedConnections: [],
      confidence: "low",
      notes: fallbackNotes,
      issues: fallbackIssues,
      referencedExperiences: [],
      generatedAt: new Date(),
    };
  }
}

function createIntegrationPointRegistry(featureId: string, request: string, hostRoot: string): IntegrationPointRegistry {
  const requestLower = request.toLowerCase();
  const points: IntegrationPoint[] = [];
  
  points.push({
    id: `${featureId}_trigger_1`,
    key: "ability_trigger",
    kind: "trigger_binding",
    source: "keyword: trigger/key/QWER",
    reason: "User requested ability activation mechanism",
  });
  
  points.push({
    id: `${featureId}_kv_1`,
    key: "ability_kv",
    kind: "kv_entry",
    source: "keyword: ability/damage/range",
    reason: "Dota2 ability requires KV definition",
  });
  
  if (requestLower.includes("buff") || requestLower.includes("effect") || requestLower.includes("增益") || requestLower.includes("效果")) {
    points.push({
      id: `${featureId}_modifier_1`,
      key: "modifier_handler",
      kind: "modifier_slot",
      source: "keyword: buff/effect",
      reason: "Ability applies buff/modifier effect",
    });
  }
  
  if (requestLower.includes("damage") || requestLower.includes("伤害") || requestLower.includes("dps")) {
    points.push({
      id: `${featureId}_damage_1`,
      key: "damage_handler",
      kind: "effect_slot",
      source: "keyword: damage",
      reason: "Ability deals damage",
    });
  }
  
  if (UI_TRIGGER_KEYWORDS.some(k => requestLower.includes(k))) {
    points.push({
      id: `${featureId}_ui_1`,
      key: "ui_panel",
      kind: "ui_mount",
      source: "keyword: ui/modal/panel",
      reason: "Feature includes UI component",
    });
    
    points.push({
      id: `${featureId}_panel_event_1`,
      key: "panel_click_event",
      kind: "panel_event",
      source: "keyword: ui/button/interaction",
      reason: "UI requires event handling",
    });
  }
  
  if (requestLower.includes("event") || requestLower.includes("hook") || requestLower.includes("事件")) {
    points.push({
      id: `${featureId}_event_1`,
      key: "event_hook",
      kind: "event_hook",
      source: "keyword: event/hook",
      reason: "Feature hooks into game events",
    });
  }
  
  if (requestLower.includes("talent") || requestLower.includes("天赋") || requestLower.includes("升级")) {
    points.push({
      id: `${featureId}_talent_1`,
      key: "talent_pool",
      kind: "data_pool",
      source: "keyword: talent/pool",
      reason: "Talent system requires data pool",
    });
    
    points.push({
      id: `${featureId}_talent_2`,
      key: "talent_selection",
      kind: "ability_slot",
      source: "keyword: talent/selection",
      reason: "Talent occupies ability slot",
    });
  }
  
  if (requestLower.includes("selection") || requestLower.includes("choose") || requestLower.includes("选择") || requestLower.includes("抽取")) {
    points.push({
      id: `${featureId}_selection_1`,
      key: "selection_logic",
      kind: "event_hook",
      source: "keyword: selection/choose",
      reason: "Selection requires event handling",
    });
  }
  
  if (points.length < 3) {
    points.push({
      id: `${featureId}_lua_1`,
      key: "lua_ability",
      kind: "lua_table",
      source: "default: ability logic",
      reason: "Ability requires Lua runtime logic",
    });
  }
  
  let confidence: OwnershipConfidence = "low";
  if (points.length >= 4) {
    confidence = "high";
  } else if (points.length >= 2) {
    confidence = "medium";
  }
  
  return {
    featureId,
    points,
    confidence,
  };
}

/**
 * Extract integration points from a feature record
 * Analyzes entryBindings and generatedFiles to infer integration points
 */
function extractIntegrationPoints(feature: RuneWeaverFeatureRecord): IntegrationPointKind[] {
  const points: IntegrationPointKind[] = [];

  // Extract from entryBindings
  if (feature.entryBindings) {
    for (const binding of feature.entryBindings) {
      if (binding.kind === "import" || binding.kind === "register") {
        points.push("trigger_binding");
      }
      if (binding.kind === "mount" || binding.kind === "append_index") {
        points.push("ui_mount");
      }
    }
  }

  // Infer from generatedFiles
  if (feature.generatedFiles) {
    for (const file of feature.generatedFiles) {
      if (file.includes("kv/") || file.includes("abilities")) {
        points.push("kv_entry");
      }
      if (file.includes("effect") || file.includes("modifier")) {
        points.push("effect_slot");
      }
      if (file.includes("lua")) {
        points.push("lua_table");
      }
      if (file.includes("panorama") || file.includes("ui")) {
        points.push("ui_mount");
      }
    }
  }

  return [...new Set(points)];
}

function detectSharedIntegrationPointConflict(
  featureId: string,
  featureLabel: string,
  integrationPoints: IntegrationPointRegistry,
  workspace: { features: RuneWeaverFeatureRecord[] } | null
): ConflictCheckResult {
  const currentPointKinds = integrationPoints.points.map(p => p.kind);
  const conflicts: IntegrationPointConflict[] = [];

  // Query real workspace for existing features
  if (workspace && workspace.features) {
    const existingFeatures = workspace.features.filter((f: RuneWeaverFeatureRecord) => 
      f.featureId !== featureId && f.status === "active"
    );

    for (const existingFeature of existingFeatures) {
      // Extract integration points from existing feature
      const existingPoints = extractIntegrationPoints(existingFeature);
      
      for (const existingPoint of existingPoints) {
        if (currentPointKinds.includes(existingPoint)) {
          const severity: ConflictSeverity = 
            existingPoint === "ability_slot" || existingPoint === "data_pool"
              ? "error" 
              : "warning";

          conflicts.push({
            kind: "shared_integration_point",
            severity,
            conflictingPoint: existingPoint,
            existingFeatureId: existingFeature.featureId,
            existingFeatureLabel: existingFeature.featureName || existingFeature.intentKind || existingFeature.featureId,
            explanation: `Both this feature and existing feature '${existingFeature.featureId}' require '${existingPoint}' integration point.`,
          });
        }
      }
    }
  }

  let status: ConflictStatus;
  let recommendedAction: RecommendedAction;
  let summary: string;

  if (conflicts.length === 0) {
    status = "safe";
    recommendedAction = "proceed";
    summary = "No integration point conflicts detected with existing features.";
  } else {
    const hasError = conflicts.some(c => c.severity === "error");
    if (hasError) {
      status = "blocked";
      recommendedAction = "block";
      summary = `Detected ${conflicts.length} conflict(s) including critical shared integration point(s). Review required before proceeding.`;
    } else {
      status = "needs_confirmation";
      recommendedAction = "confirm";
      summary = `Detected ${conflicts.length} conflict(s) with existing features. Please confirm to proceed.`;
    }
  }

  return {
    featureId,
    hasConflict: conflicts.length > 0,
    conflicts,
    status,
    recommendedAction,
    summary,
  };
}

export async function runWorkbench(
  userRequest: string,
  options: WorkbenchOptions
): Promise<WorkbenchResult> {
  console.log("=".repeat(60));
  console.log("RUNE WEAVER - WORKBENCH (Phase 3 Week-1 Lifecycle Demo)");
  console.log("=".repeat(60));
  console.log(">>> Entry: User Request Received");
  console.log(`    "${userRequest.substring(0, 60)}${userRequest.length > 60 ? "..." : ""}"`);

  const featureIdentity = createFeatureIdentity(userRequest, options.hostRoot);
  console.log(`\n[Feature Identity]`);
  console.log(`   ID: ${featureIdentity.id}`);
  console.log(`   Label: ${featureIdentity.label}`);
  console.log(`   Host: ${featureIdentity.hostScope}`);
  console.log(`   Stage: ${featureIdentity.currentStage}`);

  const featureOwnership = createFeatureOwnership(featureIdentity.id, userRequest, options.hostRoot);
  console.log(`\n[Feature Ownership - Baseline]`);
  console.log(`   Expected Surfaces: ${featureOwnership.expectedSurfaces.join(", ")}`);
  console.log(`   Impact Areas: ${featureOwnership.impactAreas.join(", ")}`);
  console.log(`   Confidence: ${featureOwnership.confidence}`);
  console.log(`   Complete: ${featureOwnership.isComplete ? "Yes" : "Partial"}`);

  const integrationPoints = createIntegrationPointRegistry(featureIdentity.id, userRequest, options.hostRoot);
  console.log(`\n[Integration Point Registry - Baseline]`);
  console.log(`   Total Points: ${integrationPoints.points.length}`);
  console.log(`   Point Kinds: ${[...new Set(integrationPoints.points.map(p => p.kind))].join(", ")}`);
  console.log(`   Confidence: ${integrationPoints.confidence}`);

  // Load workspace for conflict detection
  const workspaceResult = workspaceExists(options.hostRoot) 
    ? loadWorkspace(options.hostRoot) 
    : { success: false, workspace: null, issues: ["Workspace not found"] };
  const workspace = workspaceResult.success ? workspaceResult.workspace : null;

  const conflictResult = detectSharedIntegrationPointConflict(featureIdentity.id, featureIdentity.label, integrationPoints, workspace);
  console.log(`\n[Conflict Check - Integration Point]`);
  console.log(`   Has Conflict: ${conflictResult.hasConflict}`);
  console.log(`   Status: ${conflictResult.status}`);
  console.log(`   Recommended Action: ${conflictResult.recommendedAction}`);
  if (conflictResult.hasConflict) {
    console.log(`   Conflict Count: ${conflictResult.conflicts.length}`);
    for (const c of conflictResult.conflicts) {
      console.log(`   - ${c.conflictingPoint} (${c.severity}) vs ${c.existingFeatureLabel}`);
    }
  }

  const session: IntakeSession = {
    id: generateSessionId(),
    originalRequest: userRequest,
    hostRoot: options.hostRoot,
    createdAt: new Date(),
    featureIdentity,
    featureOwnership,
    integrationPoints,
    status: "initialized",
  };

  console.log(`\n[Session] ID: ${session.id}`);
  console.log(`User Request: "${userRequest}"`);
  console.log(`Host Root: ${options.hostRoot}`);

  if (!isLLMConfigured()) {
    session.status = "error";
    featureIdentity.currentStage = "error";
    return {
      success: false,
      session,
      featureIdentity,
      featureOwnership,
      integrationPoints,
      conflictResult,
      error: "LLM not configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
    };
  }

  const client = createLLMClientFromEnv(process.cwd());

  const clarification = detectMissingKeyParams(userRequest);
  console.log("\n[Main Wizard] Analyzing request for missing key parameters...");

  const uiDetection = detectUIRequirements(userRequest);
  console.log(`[Main Wizard] UI need detection: ${uiDetection.uiNeeded ? "UI detected" : "No UI detected"}`);

  let uiIntake: UIIntakeResult | undefined;
  if (uiDetection.uiBranchRecommended) {
    console.log("\n[Main Wizard] Entering UI Wizard branch...");
    uiIntake = collectUIIntake(userRequest, uiDetection);
    console.log(`[Main Wizard] UI intake surface type: ${uiIntake.surfaceType || "unknown"}`);
    session.uiIntake = uiIntake;
    session.status = "ui_intake_completed";
  }

  const wizardInput: WizardIntentInput = {
    rawText: userRequest,
    temperature: WORKBENCH_WIZARD_LLM_TEMPERATURE,
    providerOptions: WORKBENCH_WIZARD_PROVIDER_OPTIONS,
  };

  const wizardOptions: WizardIntentOptions = {
    client,
    input: wizardInput,
  };

  console.log("\n[Main Wizard] Running wizard to generate IntentSchema...");

  let wizardResult: Awaited<ReturnType<typeof runWizardToIntentSchema>>;
  let wizardDegradation: WizardDegradationInfo | undefined;

  const forceDegrade = process.env.RW_FORCE_WIZARD_DEGRADE === "1";

  if (forceDegrade) {
    const forcedError = new Error("FORCED_WIZARD_DEGRADATION: Debug validation hook triggered");
    console.log(`\n⚠️ [Main Wizard] Forced degradation triggered by RW_FORCE_WIZARD_DEGRADE=1`);

    const fallbackSchema: IntentSchema = {
      version: "1.0",
      host: {
        kind: "dota2-x-template",
      },
      request: {
        rawPrompt: userRequest,
        goal: `Partial feature based on: "${userRequest.substring(0, 50)}..."`,
      },
      classification: {
        intentKind: "unknown",
        confidence: "low",
      },
      requirements: {
        functional: [],
      },
      constraints: {
        nonFunctional: [],
      },
      uiRequirements: {
        needed: false,
      },
      normalizedMechanics: {},
      openQuestions: [],
      resolvedAssumptions: [],
      isReadyForBlueprint: false,
    };

    wizardResult = {
      valid: false,
      schema: fallbackSchema,
      issues: [{
        severity: "error" as const,
        code: "WIZARD_FORCED_DEGRADATION",
        scope: "schema" as const,
        message: forcedError.message,
      }],
    };

    wizardDegradation = {
      status: "partial",
      reason: "Forced degradation for local validation (RW_FORCE_WIZARD_DEGRADE=1)",
      availableObjects: [
        "featureIdentity",
        "featureOwnership",
        "integrationPoints", 
        "conflictResult",
        "knownInputs",
        "featureCard",
        "featureDetail",
        "lifecycleActions",
        "actionRoute",
      ],
    };
  } else {
    try {
      wizardResult = await runWizardToIntentSchema(wizardOptions);
      wizardDegradation = {
        status: "none",
        reason: "Wizard completed successfully",
        availableObjects: ["schema", "issues"],
      };
    } catch (wizardError) {
    const errorMessage = wizardError instanceof Error ? wizardError.message : String(wizardError);
    const isOverload = errorMessage.includes("429") || 
                       errorMessage.includes("overload") || 
                       errorMessage.includes("Overloaded");

    console.log(`\n⚠️ [Main Wizard] Wizard failed: ${errorMessage}`);

   const fallbackSchema: IntentSchema = {
    version: "1.0",
    host: {
      kind: "dota2-x-template",
    },
    request: {
      rawPrompt: userRequest,
      goal: `Partial feature based on: "${userRequest.substring(0, 50)}..."`,
    },
    classification: {
      intentKind: "unknown",
      confidence: "low",
    },
    requirements: {
      functional: [],
    },
    constraints: {
      nonFunctional: [],
    },
    uiRequirements: {
      needed: false,
    },
    normalizedMechanics: {},
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: false,
  };


    wizardResult = {
      valid: false,
      schema: fallbackSchema,
      issues: [{
        severity: "error" as const,
        code: isOverload ? "WIZARD_OVERLOAD" : "WIZARD_ERROR",
        scope: "schema" as const,
        message: errorMessage,
      }],
    };

    wizardDegradation = {
      status: "partial",
      reason: isOverload 
        ? `Wizard overloaded (429), lifecycle objects may still render` 
        : `Wizard failed: ${errorMessage}, lifecycle objects may still render`,
      availableObjects: [
        "featureIdentity",
        "featureOwnership",
        "integrationPoints", 
        "conflictResult",
        "knownInputs",
        "featureCard",
        "featureDetail",
        "lifecycleActions",
        "actionRoute",
      ],
    };
  }
  }

  session.wizardResult = {
    schema: wizardResult.schema,
    issues: wizardResult.issues || [],
    valid: wizardResult.valid,
  };
  session.status = "wizard_completed";

  if (wizardDegradation && wizardDegradation.status !== "none") {
    console.log("\n" + "=".repeat(60));
    console.log("⚠️ WIZARD DEGRADATION STATUS");
    console.log("=".repeat(60));
    console.log(`   Status: ${wizardDegradation.status.toUpperCase()}`);
    console.log(`   Reason: ${wizardDegradation.reason}`);
    console.log(`   Available Objects: ${(wizardDegradation.availableObjects ?? []).join(", ") || "(none)"}`);
    console.log("=".repeat(60));
  } else if (!wizardResult.valid) {
    console.log("\n[Main Wizard] Wizard generated issues:");
    for (const issue of wizardResult.issues || []) {
      console.log(`  - ${issue.severity}: ${issue.message}`);
    }
  }

  const knownInputs = extractKnownInputs(userRequest);
  const review = generateFeatureReview(
    featureIdentity.id,
    featureOwnership,
    integrationPoints,
    conflictResult,
    userRequest,
    wizardResult.schema,
    wizardResult.issues || [],
    clarification,
    uiDetection,
    uiIntake,
    knownInputs
  );

  session.review = review;
  
  if (review.canProceed) {
    session.status = "ready_to_proceed";
    featureIdentity.currentStage = "review";
  } else if (review.nextStep.action === "clarify") {
    session.status = "needs_clarification";
  } else {
    session.status = "review_completed";
  }

  console.log("\n" + "=".repeat(60));
  console.log("FEATURE REVIEW");
  console.log("=".repeat(60));
  printFeatureReview(review);

  console.log("\n" + "=".repeat(60));
  console.log("BLUEPRINT PROPOSAL (LLM)");
  console.log("=".repeat(60));
  
  const blueprintProposal = await generateBlueprintProposal(
    featureIdentity.id,
    featureIdentity.label,
    userRequest,
    integrationPoints,
    featureOwnership,
    client
  );
  
  console.log(`   Proposal ID: ${blueprintProposal.id}`);
  console.log(`   Source: ${blueprintProposal.source.toUpperCase()}`);
  if (blueprintProposal.source === "fallback") {
    console.log(`   ⚠️ LLM was unavailable, using fallback proposal`);
  }
  console.log(`   Status: ${blueprintProposal.status.toUpperCase()}`);
  console.log(`   Confidence: ${blueprintProposal.confidence}`);
  console.log(`   Proposed Modules: ${blueprintProposal.proposedModules.length}`);
  for (const mod of blueprintProposal.proposedModules) {
    console.log(`      - ${mod.role}: ${mod.proposedPatternIds.join(", ")}`);
  }
  if (blueprintProposal.notes.length > 0) {
    console.log(`   Notes: ${blueprintProposal.notes.join("; ")}`);
  }
  if (blueprintProposal.issues.length > 0) {
    console.log(`   Issues: ${blueprintProposal.issues.join("; ")}`);
  }
  if (blueprintProposal.referencedExperiences && blueprintProposal.referencedExperiences.length > 0) {
    console.log(`   Referenced Experiences: ${blueprintProposal.referencedExperiences.length}`);
    for (const expRef of blueprintProposal.referencedExperiences) {
      console.log(`      - ${expRef.experienceId} (${expRef.reason})`);
    }
    console.log(`   📌 Experience layer is for reference only - NOT a final rule`);
  }
  
  const gapFillResult = await identifyGapsAndFillAsync(blueprintProposal, client);
  if (gapFillResult.identifiedGaps.length > 0) {
    console.log(`   Gap-Fill: ${gapFillResult.filledGaps.length}/${gapFillResult.identifiedGaps.length} gaps identified and filled`);
    const llmFilled = gapFillResult.filledGaps.filter(g => g.fillSource === "llm");
    const ruleFilled = gapFillResult.filledGaps.filter(g => g.fillSource === "rule");
    if (llmFilled.length > 0) {
      console.log(`      🔮 LLM-filled (Category B): ${llmFilled.length}`);
      for (const filled of llmFilled) {
        console.log(`         - ${filled.gapKind} for ${filled.targetModuleId}: "${filled.suggestedValue}"`);
      }
    }
    if (ruleFilled.length > 0) {
      console.log(`      📋 Rule-filled (Category A): ${ruleFilled.length}`);
      for (const filled of ruleFilled) {
        console.log(`         - ${filled.gapKind} for ${filled.targetModuleId}: ${filled.suggestedValue}`);
      }
    }
    if (gapFillResult.categoryEGaps.length > 0) {
      console.log(`   ⚠️  Category E Clarification Needed: ${gapFillResult.categoryEGaps.length} gaps`);
      for (const eg of gapFillResult.categoryEGaps) {
        console.log(`      - [${eg.gapKind}] ${eg.targetModuleId}: ${eg.notes?.[0] || "requires clarification"}`);
      }
    }
    if (gapFillResult.unfilledGaps.length > 0) {
      console.log(`   Unfilled gaps: ${gapFillResult.unfilledGaps.length}`);
    }
    console.log(`   📌 Gap-fill is for reference only - NOT a final parameter`);
  }
  
  const sceneReferences = detectSceneAnchors(userRequest, "dota2");
  if (sceneReferences.length > 0) {
    console.log(`   Scene/Map References: ${sceneReferences.length} anchor(s) detected`);
    for (const ref of sceneReferences) {
      console.log(`      - ${ref.anchorName} (${ref.anchorKind})`);
    }
    console.log(`   📌 Scene references are READ-ONLY - no map editing performed`);
  }
  
  console.log(`   ⚠️ NOTE: This is a PROPOSAL only, not a final blueprint.`);
  console.log(`   System still retains final authority for blueprint decisions.`);

  console.log("\n" + "=".repeat(60));
  console.log("SESSION & IDENTITY STATUS");
  console.log("=".repeat(60));
  console.log(`Session ID: ${session.id}`);
  console.log(`Session Status: ${session.status}`);
  console.log(`Feature ID: ${featureIdentity.id}`);
  console.log(`Feature Stage: ${featureIdentity.currentStage}`);

  const featureCard = createFeatureCard(
    featureIdentity,
    featureOwnership,
    conflictResult,
    review
  );

  console.log("\n" + "=".repeat(60));
  console.log("FEATURE CARD");
  console.log("=".repeat(60));
  console.log(`   ID: ${featureCard.id}`);
  console.log(`   Display Label: ${featureCard.displayLabel}`);
  console.log(`   System Label: ${featureCard.systemLabel}`);
  console.log(`   Summary: ${featureCard.summary.substring(0, 60)}${featureCard.summary.length > 60 ? "..." : ""}`);
  console.log(`   Host: ${featureCard.host}`);
  console.log(`   Status: ${featureCard.status}`);
  console.log(`   Risk Level: ${featureCard.riskLevel}`);
  console.log(`   Needs Confirmation: ${featureCard.needsConfirmation}`);
  console.log(`   Created: ${featureCard.createdAt.toISOString()}`);
  console.log(`   Updated: ${featureCard.updatedAt.toISOString()}`);

  const featureDetail = createFeatureDetail(
    featureCard,
    featureIdentity,
    featureOwnership,
    integrationPoints,
    conflictResult,
    knownInputs,
    clarification
  );

  console.log("\n" + "=".repeat(60));
  console.log("FEATURE DETAIL");
  console.log("=".repeat(60));
  console.log("   [Primary Sections]");
  console.log(`     Basic Info: ${featureDetail.basicInfo.displayLabel} (${featureDetail.basicInfo.id})`);
  console.log(`     Status: ${featureDetail.status.status} | Risk: ${featureDetail.status.riskLevel} | Conflicts: ${featureDetail.status.conflictCount}`);
  console.log(`     Editable Params: ${Object.keys(featureDetail.editableParams.knownInputs).length} detected, ${featureDetail.editableParams.missingParams.length} missing`);
  console.log(`     Host/Output: ${featureDetail.hostOutput.host} | ${featureDetail.hostOutput.integrationPointCount} integration point(s)`);
  console.log("   [Secondary Sections]");
  console.log(`     Pattern Bindings: ${featureDetail.patternBindings.patterns.length} bound`);

  const lifecycleActions = createLifecycleActions(
    featureCard,
    featureDetail,
    conflictResult,
    options.hostRoot
  );

  console.log("\n" + "=".repeat(60));
  console.log("LIFECYCLE ACTIONS");
  console.log("=".repeat(60));
  console.log(`   Current Stage: ${lifecycleActions.currentStage}`);
  console.log(`   Persistence State: ${lifecycleActions.persistenceState.toUpperCase()}`);
  console.log(`   ${lifecycleActions.persistenceReason}`);
  for (const action of lifecycleActions.actions) {
    const status = action.enabled ? "[ENABLED]" : "[DISABLED]";
    console.log(`   ${status} ${action.kind.toUpperCase()}: ${action.reason}`);
    if (action.nextHint) {
      console.log(`      Hint: ${action.nextHint}`);
    }
  }

  const enabledActions = lifecycleActions.actions.filter(a => a.enabled);
  const nextAction = enabledActions.find(a => a.kind === "update") || enabledActions[0];
  
  console.log("\n" + "=".repeat(60));
  console.log(">>> LIFECYCLE SUMMARY <<<");
  console.log("=".repeat(60));
  console.log(`   📍 Current Status: ${lifecycleActions.currentStage.toUpperCase()}`);
  console.log(`   📍 Available Actions: ${enabledActions.map(a => a.kind).join(", ")}`);
  if (nextAction) {
    console.log(`   📍 Suggested Next: ${nextAction.kind.toUpperCase()}`);
    console.log(`      → ${nextAction.nextHint || nextAction.reason}`);
  }
  console.log("=".repeat(60));

  const actionRoute = createActionRoute(featureCard, lifecycleActions);

  console.log("\n" + "=".repeat(60));
  console.log("ACTION ROUTE");
  console.log("=".repeat(60));
  const primaryRoute = actionRoute.route;
  const routeStatus = primaryRoute.status === "matched" ? "[MATCHED]" : "[UNAVAILABLE]";
  console.log(`   ${routeStatus} ${(primaryRoute.requestedAction ?? "unknown").toUpperCase()} -> ${primaryRoute.targetCardId}`);
  console.log(`   Reason: ${primaryRoute.routeReason}`);
  if (primaryRoute.nextHint) {
    console.log(`   Hint: ${primaryRoute.nextHint}`);
  }
  if (actionRoute.alternativeRoutes.length > 0) {
    console.log("   Alternative Routes:");
    for (const route of actionRoute.alternativeRoutes) {
      const altStatus = route.status === "matched" ? "[MATCHED]" : "[UNAVAILABLE]";
      console.log(`      ${altStatus} ${(route.requestedAction ?? "unknown").toUpperCase()} -> ${route.targetCardId}`);
    }
  }

  const featureRouting = createFeatureRouting(userRequest, featureIdentity, lifecycleActions, options.hostRoot);

  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.routing);
  console.log("=".repeat(60));
  console.log(p("判断", LABELS.decision[featureRouting.decision] || featureRouting.decision));
  console.log(p("置信度", LABELS.confidence[featureRouting.confidence] || featureRouting.confidence));
  console.log(p("判断依据", featureRouting.reason ?? featureRouting.rationale));
  if (featureRouting.candidateFeature) {
    console.log("   可能相关的已有 Feature:");
    console.log(`      - 名称: ${featureRouting.candidateFeature.featureLabel}`);
    console.log(`      - ID: ${featureRouting.candidateFeature.featureId}`);
  }
  if (featureRouting.nextHint) {
    console.log(p("建议操作", featureRouting.nextHint));
  }
  console.log("=".repeat(60));

  const featureFocus = createFeatureFocus(featureIdentity, lifecycleActions, featureRouting);

  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.focus);
  console.log("=".repeat(60));
  console.log(p("聚焦类型", LABELS.focusType[featureFocus.focusType] || featureFocus.focusType));
  console.log(p("Feature 名称", featureFocus.featureLabel ?? "(unknown)"));
  console.log(p("Feature ID", featureFocus.featureId ?? "(unknown)"));
  console.log(
    p(
      "持久化关系",
      featureFocus.persistenceRelation
        ? LABELS.persistence[featureFocus.persistenceRelation] || featureFocus.persistenceRelation
        : "(unknown)"
    )
  );
  console.log(p("来源", featureFocus.source ?? "(unknown)"));
  console.log(p("聚焦原因", featureFocus.reason));
  if (featureFocus.focusType === "candidate_match") {
    console.log("   注意: 当前 focus 指向候选已有 feature，若要更新它请使用 update 命令");
  }
  console.log("=".repeat(60));

  const updateHandoff = createUpdateHandoff(featureFocus, featureRouting, lifecycleActions);

  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.handoff);
  console.log("=".repeat(60));
  console.log(p("交接状态", LABELS.handoffStatus[updateHandoff.status] || updateHandoff.status));
  if (updateHandoff.confidence) {
    console.log(p("置信度", LABELS.confidence[updateHandoff.confidence] || updateHandoff.confidence));
  }
  if (updateHandoff.targetFeatureId && updateHandoff.targetFeatureLabel) {
    console.log("   目标 Feature:");
    console.log(`      - 名称: ${updateHandoff.targetFeatureLabel}`);

    console.log(`      - ID: ${updateHandoff.targetFeatureId}`);
  } else {
    console.log("   目标 Feature: (无明确目标)");
  }
  console.log(p("交接原因", updateHandoff.handoverReason));
  if (updateHandoff.nextHint) {
    console.log(p("建议操作", updateHandoff.nextHint));
  }
  console.log("=".repeat(60));

  // T418-R1: 先创建初始 handler（用于 governance release）
  const initialHandler = createUpdateHandler(updateHandoff, featureFocus, featureCard, conflictResult, featureOwnership, { forceValidation: FORCE_UPDATE_WRITE });

  // T417: 创建 governance release（基于初始 handler）
  const initialGovernanceRelease = createGovernanceRelease(initialHandler, conflictResult, featureCard);

  // T418-R1: 创建 confirmation action（使用传入的 confirmedItemIds）
  const confirmedItemIds = options.confirmedItemIds || [];
  const confirmationAction = createConfirmationAction(initialGovernanceRelease, confirmedItemIds);

  // T418-R1: 根据 confirmation 结果重新创建 handler
  // 如果 confirmation 已释放到就绪状态，handler 应该能进入 ready_for_dry_run
  const updateHandler = createUpdateHandler(updateHandoff, featureFocus, featureCard, conflictResult, featureOwnership, {
    forceValidation: FORCE_UPDATE_WRITE,
    confirmationAction
  });

  // T418-R3: confirmation 后重算 governanceRelease，确保与 handler/plan 状态一致
  // 当 confirmation 已释放时，governanceRelease 应反映 released 状态
  // T418-R3A: 确保 released 状态是干净的，不再残留 blocked 语义
  const governanceRelease = confirmationAction.transitionResult === "released_to_ready"
    ? {
        ...initialGovernanceRelease,
        status: "released" as const,
        blockedReason: null,
        releaseHint: "所有确认项已完成，已释放到就绪状态",
        canSelfRelease: true,
        // 清理 blocked 语义残留
        requiredConfirmations: [],
        nextAllowedTransition: null,
      }
    : initialGovernanceRelease;

  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.handler);
  console.log("=".repeat(60));
  console.log(p("Handler 状态", LABELS.handlerStatus[updateHandler.status] || updateHandler.status));
  console.log(p("置信度", LABELS.confidence[updateHandler.confidence] || updateHandler.confidence));
  console.log(p("Dry-run 模式", updateHandler.dryRunEnabled ? "已启用 ( planning-only )" : "未启用"));
  if (updateHandler.targetFeatureId && updateHandler.targetFeatureLabel) {
    console.log("   Handler 目标:");
    console.log(`      - 名称: ${updateHandler.targetFeatureLabel}`);
    console.log(`      - ID: ${updateHandler.targetFeatureId}`);
  } else {
    console.log("   Handler 目标: (未绑定)");
  }
  console.log(p("状态原因", updateHandler.handlerReason));
  if (updateHandler.nextHint) {
    console.log(p("下一步建议", updateHandler.nextHint));
  }
  console.log("=".repeat(60));

  if (updateHandler.updatePlan) {
    console.log("\n" + "=".repeat(60));
    console.log(SECTIONS.plan);
    console.log("=".repeat(60));
    console.log(p("计划状态", PLAN_LABELS.planStatus[updateHandler.updatePlan.planStatus] || updateHandler.updatePlan.planStatus));
    console.log(p("目标功能", updateHandler.updatePlan.targetFeatureLabel + " (" + updateHandler.updatePlan.targetFeatureId + ")"));
    console.log(p("操作类型", PLAN_LABELS.operationType[updateHandler.updatePlan.operationType] || updateHandler.updatePlan.operationType));
    console.log(p("可继续", updateHandler.updatePlan.canProceed ? "是" : "否"));
    
    if (updateHandler.updatePlan.affectedSurfaces.length > 0) {
      console.log("   可能影响的面:");
      for (const surface of updateHandler.updatePlan.affectedSurfaces) {
        const surfaceLabel = PLAN_LABELS.surfaceKind[surface.surfaceKind] || surface.surfaceKind;
        const riskLabel = surface.riskLevel
          ? PLAN_LABELS.riskLevel[surface.riskLevel] || surface.riskLevel
          : "unknown";
        console.log(`      - ${surfaceLabel}: ${surface.description} (风险: ${riskLabel})`);
      }
    } else {
      console.log("   可能影响的面: (无明确影响面)");
    }
    
    console.log(p("计划原因", updateHandler.updatePlan.planningReason));
    if (updateHandler.updatePlan.nextHint) {
      console.log(p("下一步建议", updateHandler.updatePlan.nextHint));
    }
    console.log("=".repeat(60));
  }

  // T418-R3: Pass confirmationAction to createUpdateWriteResult for normal-path awareness
  const updateWriteResult = createUpdateWriteResult(updateHandler.updatePlan, updateHandler, conflictResult, { ...options, confirmationAction });

  // T417: 输出治理释放 section
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.governance);
  console.log("=".repeat(60));
  console.log(p("释放状态", GOVERNANCE_LABELS.releaseStatus[governanceRelease.status] || governanceRelease.status));
  if (governanceRelease.blockedReason) {
    console.log(p("阻塞原因", governanceRelease.blockedReason));
  }
  if (governanceRelease.requiredConfirmations.length > 0) {
    console.log("   需要确认的项目:");
    for (const item of governanceRelease.requiredConfirmations) {
      const typeLabel = GOVERNANCE_LABELS.confirmationType[item.itemType] || item.itemType;
      const severityLabel = GOVERNANCE_LABELS.severity[item.severity] || item.severity;
      console.log(`      - [${typeLabel}] [${severityLabel}] ${item.description}`);
    }
  } else {
    console.log("   需要确认的项目: (无)");
  }
  if (governanceRelease.nextAllowedTransition) {
    console.log(p("下一允许状态", governanceRelease.nextAllowedTransition));
  }
  console.log(p("可自释放", governanceRelease.canSelfRelease ? "是" : "否"));
  if (governanceRelease.releaseHint) {
    console.log(p("释放提示", governanceRelease.releaseHint));
  }
  console.log("=".repeat(60));

  // T418: 输出确认动作 section
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.confirmation);
  console.log("=".repeat(60));
  console.log(p("动作状态", CONFIRMATION_LABELS.actionStatus[confirmationAction.actionStatus] || confirmationAction.actionStatus));
  console.log(p("目标确认项", confirmationAction.targetItemIds.join(", ") || "(无)"));
  console.log(p("已接受项数", String(confirmationAction.acceptedItems.length)));
  console.log(p("剩余项数", String(confirmationAction.remainingItems.length)));
  console.log(p("转换结果", CONFIRMATION_LABELS.transitionResult[confirmationAction.transitionResult] || confirmationAction.transitionResult));
  console.log(p("可继续", confirmationAction.canProceed ? "是" : "否"));
  if (confirmationAction.actionHint) {
    console.log(p("动作提示", confirmationAction.actionHint));
  }
  if (confirmationAction.acceptedItems.length > 0) {
    console.log("   已接受的确认项:");
    for (const item of confirmationAction.acceptedItems) {
      console.log(`      - ${item.itemId} (${item.confirmedAt})`);
    }
  }
  if (confirmationAction.remainingItems.length > 0) {
    console.log("   仍需确认的项:");
    for (const item of confirmationAction.remainingItems) {
      console.log(`      - ${item.itemId}: ${item.description}`);
    }
  }
  console.log("=".repeat(60));

  // 输出写入结果 section
  console.log("\n" + "=".repeat(60));
  console.log(SECTIONS.write);
  console.log("=".repeat(60));
  console.log(p("写入状态", WRITE_LABELS.writeStatus[updateWriteResult.writeStatus] || updateWriteResult.writeStatus));
  console.log(p("目标功能", updateWriteResult.targetFeatureLabel + " (" + updateWriteResult.targetFeatureId + ")"));
  console.log(p("写入模式", WRITE_LABELS.writeMode[updateWriteResult.writeMode] || updateWriteResult.writeMode));
  console.log(p("可重试", updateWriteResult.canRetry ? "是" : "否"));

  if (updateWriteResult.touchedOutputs.length > 0) {
    console.log("   触及的输出:");
    for (const output of updateWriteResult.touchedOutputs) {
      const statusLabel = WRITE_LABELS.outputStatus[output.status] || output.status;
      console.log(`      - [${statusLabel}] ${output.outputKind}: ${output.outputPath}`);
      console.log(`        ${output.description}`);
    }
  } else {
    console.log("   触及的输出: (无)");
  }

  console.log(p("写入原因", updateWriteResult.writeReason));
  if (updateWriteResult.nextHint) {
    console.log(p("下一步建议", updateWriteResult.nextHint));
  }
  console.log("=".repeat(60));

  if (options.write && wizardResult.valid) {
    const workspaceResult = loadWorkspace(options.hostRoot);
    if (workspaceResult.success && workspaceResult.workspace) {
      const existing = findFeatureById(workspaceResult.workspace, featureIdentity.id);
      if (existing) {
        console.log(`\n⚠️  Feature '${featureIdentity.id}' already exists in workspace - skipping persist`);
      } else {
        const selectedPatterns = blueprintProposal.proposedModules.flatMap(m => m.proposedPatternIds);

        const assemblyPlan = {
          blueprintId: blueprintProposal.id,
          selectedPatterns: blueprintProposal.proposedModules.map(m => ({
            patternId: m.proposedPatternIds[0] || "",
            role: m.role,
          })),
          writeTargets: [] as { target: "server" | "shared" | "ui" | "config"; path: string; summary: string }[],
          bridgeUpdates: [] as { target: "server" | "ui"; file: string; action: "create" | "refresh" | "inject_once" }[],
          validations: [],
          readyForHostWrite: true,
        };

        const writePlan = createWritePlan(
          assemblyPlan,
          options.hostRoot,
          featureIdentity.id
        );

        const entryBindings: import("../../core/workspace/types.js").EntryBinding[] = [];
        if (integrationPoints.points.some(p => p.kind === "trigger_binding" || p.kind === "lua_table")) {
          entryBindings.push({
            target: "server",
            file: "game/scripts/src/modules/index.ts",
            kind: "import",
          });
        }
        if (integrationPoints.points.some(p => p.kind === "ui_mount")) {
          entryBindings.push({
            target: "ui",
            file: "content/panorama/src/hud/script.tsx",
            kind: "mount",
          });
        }

        const workspaceUpdateResult = updateWorkspaceState(
          options.hostRoot,
          { id: blueprintProposal.id, sourceIntent: { intentKind: "micro-feature" } } as Blueprint,
          assemblyPlan,
          writePlan,
          "create",
          featureIdentity.id,
          null
        );

        if (workspaceUpdateResult.success) {
          const generatedFilesFromPlan = writePlan.entries
            .filter((e: WritePlanEntry) => !e.deferred)
            .map((e: WritePlanEntry) => e.targetPath);
          console.log("\n✅ Feature persisted to workspace");
          console.log(`   Feature ID: ${featureIdentity.id}`);
          console.log(`   Blueprint ID: ${blueprintProposal.id}`);
          console.log(`   Selected Patterns: ${selectedPatterns.length > 0 ? selectedPatterns.join(", ") : "(none)"}`);
          console.log(`   Generated Files: ${generatedFilesFromPlan.length} from plan`);
          if (generatedFilesFromPlan.length > 0) {
            console.log(`     Files: ${generatedFilesFromPlan.join(", ")}`);
          }
          console.log(`   Entry Bindings: ${entryBindings.length > 0 ? entryBindings.map(b => `${b.target}:${b.file}`).join(", ") : "(none)"}`);
        } else {
          console.log(`\n❌ Workspace persistence failed: ${workspaceUpdateResult.error}`);
        }
      }
    }
  }

  return {
    success: wizardResult.valid,
    session,
    featureIdentity,
    featureOwnership,
    integrationPoints,
    conflictResult,
    featureCard,
    featureDetail,
    lifecycleActions,
    actionRoute,
    wizardDegradation,
    featureRouting,
    featureFocus,
    updateHandoff,
    updateHandler,
    updateWriteResult,
    governanceRelease,
    confirmationAction,
    gapFillResult,
    failureCorpus: {
      userRequest,
      proposalStatus: blueprintProposal.status,
      proposalSource: blueprintProposal.source,
      confidence: blueprintProposal.confidence,
      invalidPatternIds: blueprintProposal.invalidPatternIds || {},
      gapFillSummary: {
        identified: gapFillResult.identifiedGaps.length,
        filled: gapFillResult.filledGaps.length,
        unfilled: gapFillResult.unfilledGaps.length,
        categoryE: gapFillResult.categoryEGaps.length,
      },
      categoryESummary: gapFillResult.categoryESummary,
      degraded: wizardDegradation?.status !== undefined && wizardDegradation.status !== "none",
      fallback: blueprintProposal.source === "fallback",
    },
  };
}

function createFeatureCard(
  featureIdentity: FeatureIdentity,
  featureOwnership: FeatureOwnership,
  conflictResult: ConflictCheckResult,
  review: FeatureReview
): FeatureCard {
  const statusMap: Record<string, FeatureCardStatus> = {
    "intake": "draft",
    "review": "draft",
    "blueprint_pending": "draft",
    "generating": "draft",
    "ready": "ready",
    "error": "blocked",
  };

  const conflictStatusMap: Record<string, FeatureCardStatus> = {
    "safe": "ready",
    "needs_confirmation": "needs_clarification",
    "blocked": "blocked",
  };

  const currentStage = featureIdentity.currentStage ?? "intake";
  const cardStatus = conflictResult.status !== "safe" 
    ? conflictStatusMap[conflictResult.status] || "draft"
    : statusMap[currentStage] || "draft";

  const needsConfirmation = conflictResult.status === "needs_confirmation" || 
                          conflictResult.status === "blocked" ||
                          review.nextStep.action === "clarify";

  const riskLevel: "low" | "medium" | "high" = 
    conflictResult.status === "blocked" ? "high" :
    conflictResult.status === "needs_confirmation" ? "medium" :
    "low";

  const now = new Date();

  return {
    id: featureIdentity.id,
    displayLabel: featureIdentity.label,
    systemLabel: featureIdentity.label.toLowerCase().replace(/\s+/g, "_"),
    summary: review.featureSummary || `Feature: ${featureIdentity.label}`,
    host: "dota2",
    status: cardStatus,
    riskLevel,
    needsConfirmation,
    createdAt: featureIdentity.createdAt || now,
    updatedAt: now,
  };
}

function createFeatureDetail(
  featureCard: FeatureCard,
  featureIdentity: FeatureIdentity,
  featureOwnership: FeatureOwnership,
  integrationPoints: IntegrationPointRegistry,
  conflictResult: ConflictCheckResult,
  knownInputs: KnownInputs,
  clarification: ClarificationResult
): FeatureDetail {
  const now = new Date();

  const basicInfo: FeatureDetailBasicInfo = {
    id: featureIdentity.id,
    displayLabel: featureIdentity.label,
    systemLabel: featureCard.systemLabel,
    intentSummary: featureIdentity.intentSummary,
    hostScope: featureIdentity.hostScope,
    createdAt: featureIdentity.createdAt || now,
    updatedAt: now,
  };

  const status: FeatureDetailStatus = {
    status: featureCard.status,
    riskLevel: featureCard.riskLevel,
    needsConfirmation: featureCard.needsConfirmation,
    conflictCount: conflictResult.conflicts.length,
    lastConflictSummary: conflictResult.summary,
  };

  const editableParams: FeatureDetailEditableParams = {
    knownInputs,
    missingParams: clarification.missingParams,
    canEdit: clarification.hasMissingKeyParams,
  };

  const hostOutput: FeatureDetailHostOutput = {
    host: featureCard.host,
    expectedSurfaces: featureOwnership.expectedSurfaces,
    impactAreas: featureOwnership.impactAreas,
    integrationPointCount: integrationPoints.points.length,
    outputSummary: `Expected ${integrationPoints.points.length} integration point(s) on ${featureCard.host}`,
  };

  const patternBindings: FeatureDetailPatternBindings = {
    patterns: [],
    isBound: false,
  };

  return {
    cardId: featureCard.id,
    basicInfo,
    status,
    editableParams,
    hostOutput,
    patternBindings,
  };
}

// T413: 本地验证用的强制写入开关
const FORCE_UPDATE_WRITE = process.env.RW_FORCE_UPDATE_WRITE === "1" || process.env.RW_FORCE_UPDATE_WRITE === "true";

function extractKnownInputs(request: string): KnownInputs {
  const requestLower = request.toLowerCase();
  const known: KnownInputs = {};

  const triggerMatch = requestLower.match(/按([QWERF])|(Q|W|E|R|F)键/);
  if (triggerMatch) {
    known.trigger = triggerMatch[1] || triggerMatch[2] || "detected";
  }

  const damageMatch = requestLower.match(/(\d+)\s*(damage|伤害|dps)/);
  if (damageMatch) {
    known.damage = damageMatch[1];
  } else if (/\d+/.test(request)) {
    const numMatch = request.match(/\b(\d+)\b/);
    if (numMatch && !known.trigger) {
      known.damage = numMatch[1];
    }
  }

  const rangeMatch = requestLower.match(/(\d+)\s*(range|范围|距离)/);
  if (rangeMatch) {
    known.range = rangeMatch[1];
  }

  const durationMatch = requestLower.match(/(\d+)\s*(秒|second|duration|持续)/);
  if (durationMatch) {
    known.duration = durationMatch[1];
  }

  const cooldownMatch = requestLower.match(/(\d+)\s*(cooldown|冷却|cd)/);
  if (cooldownMatch) {
    known.cooldown = cooldownMatch[1];
  }

  if (requestLower.includes("enemy") || requestLower.includes("敌方") || requestLower.includes("目标")) {
    known.target = "enemy";
  } else if (requestLower.includes("self") || requestLower.includes("自身") || requestLower.includes("自己")) {
    known.target = "self";
  }

  if (requestLower.includes("dash") || requestLower.includes("冲刺") || requestLower.includes("位移") || 
      requestLower.includes("blink") || requestLower.includes("闪现") || requestLower.includes("jump")) {
    known.abilityType = "dash";
  } else if (requestLower.includes("buff") || requestLower.includes("增益") || requestLower.includes("增强") || 
             requestLower.includes("debuff") || requestLower.includes("负面")) {
    known.abilityType = "buff";
  } else if (requestLower.includes("talent") || requestLower.includes("天赋") || requestLower.includes("抽取")) {
    known.abilityType = "talent";
  } else if (requestLower.includes("damage") || requestLower.includes("伤害") || requestLower.includes("攻击")) {
    known.abilityType = "damage";
  } else if (requestLower.includes("heal") || requestLower.includes("治疗") || requestLower.includes("恢复")) {
    known.abilityType = "heal";
  }

  if (requestLower.includes("zone") || requestLower.includes("区域") || requestLower.includes("地点") || 
      requestLower.includes("location") || requestLower.includes("rw_")) {
    known.zone = "detected";
  }

  if (requestLower.includes("选择") || requestLower.includes("选") || requestLower.includes("select") || 
      requestLower.includes("modal") || requestLower.includes("弹窗") || requestLower.includes("panel")) {
    known.uiType = "selection";
  } else if (requestLower.includes("hint") || requestLower.includes("提示") || requestLower.includes("hotkey")) {
    known.uiType = "hint";
  }

  if (requestLower.includes("choice") || requestLower.includes("三选") || requestLower.includes("多选") || 
      requestLower.includes("随机") || requestLower.includes("random")) {
    known.choiceCount = "detected";
  }

  return known;
}

function generateFeatureReview(
  featureIdentityId: string,
  featureOwnership: FeatureOwnership,
  integrationPoints: IntegrationPointRegistry,
  conflictResult: ConflictCheckResult,
  userRequest: string,
  schema: any,
  issues: any[],
  clarification: ClarificationResult,
  uiDetection: UIDetectionResult,
  uiIntake: UIIntakeResult | undefined,
  knownInputs: KnownInputs
): FeatureReview {
  const featureSummary = schema?.request?.goal 
    ? schema.request.goal 
    : `Feature based on: "${userRequest.substring(0, 50)}..."`;

  const recognizedCapabilities: string[] = [];
  if (schema?.requirements?.functional?.length > 0) {
    recognizedCapabilities.push(...schema.requirements.functional.slice(0, 3));
  }

  const missingConfirmations: string[] = [];
  if (clarification.hasMissingKeyParams) {
    missingConfirmations.push(...clarification.suggestions);
  }

  const errors = issues.filter(i => i.severity === "error");
  if (errors.length > 0) {
    for (const error of errors) {
      missingConfirmations.push(`Validation error: ${error.message}`);
    }
  }

  const ownershipSummary: OwnershipSummary = {
    expectedSurfaces: featureOwnership.expectedSurfaces,
    impactAreas: featureOwnership.impactAreas,
    confidence: featureOwnership.confidence,
  };

  const integrationPointSummary: IntegrationPointSummary = {
    points: [...new Set(integrationPoints.points.map(p => p.kind))],
    count: integrationPoints.points.length,
    confidence: integrationPoints.confidence,
  };

  const conflictSummary: ConflictSummary = {
    hasConflict: conflictResult.hasConflict,
    conflictCount: conflictResult.conflicts.length,
    status: conflictResult.status,
    recommendedAction: conflictResult.recommendedAction,
    summary: conflictResult.summary,
  };

  let uiNeeds: UINeedsResult | undefined;
  if (uiDetection.uiNeeded || uiIntake) {
    uiNeeds = {
      needed: uiDetection.uiNeeded,
      surfaceType: uiIntake?.surfaceType,
      interactionLevel: uiIntake?.interactionLevel,
      infoDensity: uiIntake?.infoDensity,
      branchEntered: !!(uiIntake && uiIntake.entered),
    };
  }

  let nextStep: NextStepRecommendation;
  const baseCanProceed = !clarification.hasMissingKeyParams && 
    errors.length === 0 &&
    (!uiIntake || uiIntake.canProceed === true);
  
  const canProceed = baseCanProceed && conflictResult.status !== "blocked";

  if (conflictResult.status === "blocked") {
    nextStep = {
      action: "clarify",
      reason: conflictResult.summary,
    };
  } else if (canProceed) {
    nextStep = {
      action: "proceed",
      reason: "All required information is available. Ready for controlled planning flow.",
    };
  } else if (uiDetection.uiBranchRecommended && !uiIntake) {
    nextStep = {
      action: "ui_intake",
      reason: "UI requirements detected. UI Wizard branch should be entered for more info.",
    };
  } else {
    nextStep = {
      action: "clarify",
      reason: "Missing key parameters or validation issues need to be resolved.",
    };
  }

  return {
    featureIdentityId,
    featureOwnershipId: featureOwnership.featureId,
    integrationPointsId: integrationPoints.featureId,
    featureSummary,
    recognizedCapabilities,
    knownInputs,
    missingConfirmations,
    ownership: ownershipSummary,
    integrationPoints: integrationPointSummary,
    conflict: conflictSummary,
    uiNeeds,
    nextStep,
    canProceed,
  };
}

function printFeatureReview(review: FeatureReview): void {
  console.log(`\n📋 Feature Identity: ${review.featureIdentityId}`);
  console.log(`\n📋 Feature Summary:`);
  console.log(`   ${review.featureSummary}`);

  console.log(`\n✅ Recognized Capabilities:`);
  if (review.recognizedCapabilities.length > 0) {
    for (const cap of review.recognizedCapabilities) {
      console.log(`   - ${cap}`);
    }
  } else {
    console.log(`   (None explicitly recognized)`);
  }

  console.log(`\n📥 Known Inputs:`);
  const inputLines = Object.entries(review.knownInputs)
    .map(([k, v]) => `   ${k}: ${v}`)
    .join("\n");
  console.log(inputLines || "   (None detected)");

  if (review.ownership) {
    console.log(`\n🎯 Ownership Baseline:`);
    console.log(`   Expected Surfaces: ${review.ownership.expectedSurfaces.join(", ")}`);
    console.log(`   Impact Areas: ${review.ownership.impactAreas.join(", ")}`);
    console.log(`   Confidence: ${review.ownership.confidence}`);
  }

  if (review.integrationPoints) {
    console.log(`\n🔗 Integration Points - Baseline:`);
    console.log(`   Total Points: ${review.integrationPoints.count}`);
    console.log(`   Point Kinds: ${review.integrationPoints.points.join(", ")}`);
    console.log(`   Confidence: ${review.integrationPoints.confidence}`);
  }

  if (review.conflict) {
    const icon = review.conflict.status === "safe" ? "✅" : review.conflict.status === "blocked" ? "🚫" : "⚠️";
    console.log(`\n${icon} Conflict Governance:`);
    console.log(`   Status: ${review.conflict.status.toUpperCase()}`);
    console.log(`   Has Conflict: ${review.conflict.hasConflict ? "Yes" : "No"}`);
    console.log(`   Recommended Action: ${review.conflict.recommendedAction.toUpperCase()}`);
    console.log(`   Summary: ${review.conflict.summary}`);
  }

  if (review.missingConfirmations.length > 0) {
    console.log(`\n⚠️  Missing / Needs Confirmation:`);
    for (const miss of review.missingConfirmations) {
      console.log(`   - ${miss}`);
    }
  }

  if (review.uiNeeds) {
    console.log(`\n🎨 UI Requirements:`);
    console.log(`   Needed: ${review.uiNeeds.needed ? "Yes" : "No"}`);
    if (review.uiNeeds.needed) {
      console.log(`   Surface Type: ${review.uiNeeds.surfaceType || "unknown"}`);
      console.log(`   Interaction: ${review.uiNeeds.interactionLevel || "unknown"}`);
      console.log(`   Branch Entered: ${review.uiNeeds.branchEntered ? "Yes" : "No"}`);
    }
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log(`\n🔜 Next Step:`);
  console.log(`   Action: ${review.nextStep.action.toUpperCase()}`);
  console.log(`   Reason: ${review.nextStep.reason}`);

  if (review.canProceed) {
    console.log(`\n✅ Status: READY TO PROCEED`);
  } else {
    console.log(`\n⚠️  Status: NOT READY - Please address missing items above`);
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log(`NOTE: This is Feature Review with Ownership + Integration Point Baseline.`);
  console.log(`Full blueprint generation and code generation not yet in this flow.`);
}

function detectMissingKeyParams(request: string): ClarificationResult {
  const requestLower = request.toLowerCase();
  const missingParams: string[] = [];
  const suggestions: string[] = [];

  const isTalentOrSelection = requestLower.includes("talent") || requestLower.includes("天赋") || 
                               requestLower.includes("选择") || requestLower.includes("modal") || 
                               requestLower.includes("selection") || requestLower.includes("抽取");
  const isDashOrMovement = requestLower.includes("dash") || requestLower.includes("冲刺") || 
                            requestLower.includes("位移") || requestLower.includes("blink") || 
                            requestLower.includes("movement") || requestLower.includes("移动");
  const isHealOrBuff = requestLower.includes("heal") || requestLower.includes("治疗") || 
                       requestLower.includes("buff") || requestLower.includes("增益");

  for (const [param, keywords] of Object.entries(KEY_PARAM_PATTERNS)) {
    const hasParam = keywords.some(kw => requestLower.includes(kw.toLowerCase()));
    if (!hasParam) {
      let shouldAsk = true;
      
      if (isTalentOrSelection && ["damage", "range"].includes(param)) {
        shouldAsk = false;
      } else if (isDashOrMovement && param === "damage") {
        shouldAsk = false;
      } else if (isHealOrBuff && param === "damage") {
        shouldAsk = false;
      } else if (requestLower.includes("simple") || requestLower.includes("简单") || 
                 requestLower.includes("基础") || requestLower.includes("basic")) {
        shouldAsk = false;
      }
      
      if (shouldAsk) {
        switch (param) {
          case "trigger":
            if (!isTalentOrSelection) {
              missingParams.push("trigger/key_binding");
              suggestions.push("Consider specifying trigger key (e.g., Q, W, E, R, F)");
            }
            break;
          case "damage":
            if (!isTalentOrSelection && !isDashOrMovement && !isHealOrBuff) {
              missingParams.push("damage_value");
              suggestions.push("Consider specifying damage value");
            }
            break;
          case "range":
            if (!isTalentOrSelection) {
              missingParams.push("range");
              suggestions.push("Consider specifying ability range");
            }
            break;
          case "duration":
            missingParams.push("duration");
            suggestions.push("Consider specifying effect duration");
            break;
          case "cooldown":
            missingParams.push("cooldown");
            suggestions.push("Consider specifying cooldown");
            break;
          case "target":
            missingParams.push("target_type");
            suggestions.push("Consider specifying target type (enemy/self/ally)");
            break;
        }
      }
    }
  }

  const hasAnyKeyParam = Object.entries(KEY_PARAM_PATTERNS).some(
    ([_, keywords]) => keywords.some(kw => requestLower.includes(kw.toLowerCase()))
  );

  return {
    hasMissingKeyParams: missingParams.length > 0 && !hasAnyKeyParam,
    missingParams: missingParams.slice(0, 3),
    suggestions: suggestions.slice(0, 3),
  };
}

function detectUIRequirements(request: string): UIDetectionResult {
  const requestLower = request.toLowerCase();
  const detectedUITriggers: string[] = [];

  for (const keyword of UI_TRIGGER_KEYWORDS) {
    if (requestLower.includes(keyword.toLowerCase())) {
      detectedUITriggers.push(keyword);
    }
  }

  const uiNeeded = detectedUITriggers.length > 0;
  
  return {
    uiNeeded,
    detectedUITriggers: detectedUITriggers.slice(0, 5),
    uiBranchRecommended: uiNeeded && detectedUITriggers.some(t => 
      ["modal", "dialog", "selection", "choose", "pick", "talent", "选择", "抽取", "天赋"].includes(t)
    ),
  };
}

function collectUIIntake(request: string, uiDetection: UIDetectionResult): UIIntakeResult {
  const requestLower = request.toLowerCase();
  const missingInfo: string[] = [];

  let surfaceType: string | undefined;
  for (const [type, keywords] of Object.entries(UI_SURFACE_KEYWORDS)) {
    if (keywords.some(kw => requestLower.includes(kw.toLowerCase()))) {
      surfaceType = type;
      break;
    }
  }
  if (!surfaceType) {
    surfaceType = "modal";
    missingInfo.push("surface_type_inferred_as_modal");
  }

  let interactionLevel: string | undefined;
  if (requestLower.includes("简单") || requestLower.includes("simple") || requestLower.includes("minimal")) {
    interactionLevel = "minimal";
  } else if (requestLower.includes("复杂") || requestLower.includes("complex") || requestLower.includes("many")) {
    interactionLevel = "high";
  } else if (requestLower.includes("中等") || requestLower.includes("medium")) {
    interactionLevel = "medium";
  } else {
    interactionLevel = "low";
  }

  const hasChoices = requestLower.includes("选择") || requestLower.includes("choice") || requestLower.includes("pick");
  const hasTimer = requestLower.includes("倒计时") || requestLower.includes("timer") || requestLower.includes("时间");
  let infoDensity = "low";
  if (hasChoices && hasTimer) {
    infoDensity = "high";
  } else if (hasChoices || hasTimer) {
    infoDensity = "medium";
  }

  if (!surfaceType) {
    missingInfo.push("surface_type");
  }

  const canProceed = surfaceType !== undefined;

  return {
    entered: true,
    surfaceType,
    interactionLevel,
    infoDensity,
    missingInfo,
    canProceed,
  };
}

async function runList(hostRoot: string): Promise<void> {
  console.log("=".repeat(60));
  console.log("RUNE WEAVER - LIST");
  console.log("=".repeat(60));

  if (!workspaceExists(hostRoot)) {
    console.error(`\n❌ Workspace not found at: ${hostRoot}`);
    console.error("   Please provide a valid host root path");
    return;
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return;
  }

  const features = workspaceResult.workspace.features;
  console.log(`\n📦 Workspace: ${hostRoot}`);
  console.log(`   Total Features: ${features.length}`);

  if (features.length === 0) {
    console.log("\n   No features found. Use 'run' to create one.");
    return;
  }

  console.log("\n   ID                    | Status    | Revision | Patterns | Files | Updated");
  console.log("   " + "-".repeat(75));
  for (const f of features) {
    const id = f.featureId.padEnd(20);
    const status = f.status.padEnd(9);
    const rev = String(f.revision).padEnd(8);
    const patterns = String(f.selectedPatterns.length).padEnd(8);
    const files = String(f.generatedFiles.length).padEnd(5);
    const updated = f.updatedAt.split("T")[0];
    console.log(`   ${id} | ${status} | ${rev} | ${patterns} | ${files} | ${updated}`);
  };
}

async function runDelete(featureId: string, hostRoot: string, confirmed: boolean): Promise<void> {
  console.log("=".repeat(60));
  console.log("RUNE WEAVER - DELETE");
  console.log("=".repeat(60));

  if (!workspaceExists(hostRoot)) {
    console.error(`\n❌ Workspace not found at: ${hostRoot}`);
    console.error("   Please provide a valid host root path");
    return;
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return;
  }

  const feature = findFeatureById(workspaceResult.workspace, featureId);
  if (!feature) {
    console.error(`\n❌ Feature '${featureId}' not found in workspace`);
    return;
  }

  console.log(`\n⚠️  DELETE PREVIEW: ${feature.featureId}`);
  console.log(`   Intent Kind: ${feature.intentKind}`);
  console.log(`   Status: ${feature.status}`);
  console.log(`   Revision: ${feature.revision}`);
  console.log(`   Selected Patterns: ${feature.selectedPatterns.join(", ")}`);

  const rwOwnedFiles = feature.generatedFiles.filter(f =>
    f.includes("game/scripts/src/rune_weaver/") ||
    f.includes("game/scripts/vscripts/rune_weaver/") ||
    f.includes("content/panorama/src/rune_weaver/")
  );
  const nonRwOwnedFiles = feature.generatedFiles.filter(f => !rwOwnedFiles.includes(f));

  console.log(`\n📁 Impact Summary:`);
  console.log(`   Total Generated Files: ${feature.generatedFiles.length}`);
  console.log(`   RW-Owned Files: ${rwOwnedFiles.length}`);
  console.log(`   Non-RW-Owned Files: ${nonRwOwnedFiles.length}`);

  if (rwOwnedFiles.length > 0) {
    console.log(`\n   RW-Owned Files (will be deleted):`);
    for (const file of rwOwnedFiles) {
      console.log(`     - ${file}`);
    }
  }

  if (nonRwOwnedFiles.length > 0) {
    console.log(`\n   ⚠️  Non-RW-Owned Files (CANNOT delete - outside RW scope):`);
    for (const file of nonRwOwnedFiles) {
      console.log(`     - ${file}`);
    }
  }

  console.log(`\n💡 Dependency Hints:`);
  if (feature.dependsOn && feature.dependsOn.length > 0) {
    console.log(`   Dependencies: ${feature.dependsOn.join(", ")}`);
  } else {
    console.log(`   Dependencies: None recorded`);
  }
  console.log(`   Bridge Points: Check manually if referenced in:`);
  console.log(`     - game/scripts/src/modules/index.ts`);
  console.log(`     - content/panorama/src/hud/script.tsx`);

  if (!confirmed) {
    console.log(`\n❌ DELETE ABORTED: --confirm flag required`);
    console.log(`   To delete, run with --confirm flag:`);
    console.log(`   npx tsx apps/workbench/index.ts --delete ${featureId} ${hostRoot} --confirm`);
    return;
  }

  console.log(`\n🔥 Executing DELETE...`);

  const deleteResult = deleteFeature(workspaceResult.workspace, featureId);
  if (!deleteResult.success) {
    console.error(`\n❌ Delete failed: ${deleteResult.issues.join(", ")}`);
    return;
  }

  if (!deleteResult.workspace) {
    console.error(`\n❌ Delete failed: no workspace returned`);
    return;
  }

  const saveResult = saveWorkspace(hostRoot, deleteResult.workspace);
  if (!saveResult.success) {
    console.error(`\n❌ Failed to save workspace: ${saveResult.issues.join(", ")}`);
    return;
  }

  console.log(`\n✅ Feature '${featureId}' deleted from workspace`);
  console.log(`   Note: Only workspace record removed.`);
  console.log(`   Files still present on disk must be reviewed below.`);

  console.log(`\n📋 ORPHANED FILE REVIEW (post-delete):`);
  const orphanedFiles: string[] = [];
  for (const file of rwOwnedFiles) {
    const fullPath = join(hostRoot, file);
    if (existsSync(fullPath)) {
      orphanedFiles.push(file);
    }
  }

  if (orphanedFiles.length === 0) {
    console.log(`   No orphaned RW-owned files detected.`);
  } else {
    console.log(`   ⚠️  ${orphanedFiles.length} orphaned RW-owned file(s) still on disk:`);
    for (const file of orphanedFiles) {
      console.log(`     - ${file}`);
    }
    console.log(`   These files should be manually removed if no longer needed.`);
  }

  if (nonRwOwnedFiles.length > 0) {
    console.log(`\n   ⚠️  ${nonRwOwnedFiles.length} non-RW-owned file(s) (not managed by RW):`);
    for (const file of nonRwOwnedFiles) {
      console.log(`     - ${file}`);
    }
    console.log(`   These files are outside RW scope and require manual handling.`);
  }
}

async function runInspect(featureId: string, hostRoot: string): Promise<void> {
  console.log("=".repeat(60));

  if (!workspaceExists(hostRoot)) {
    console.error(`\n❌ Workspace not found at: ${hostRoot}`);
    console.error("   Please provide a valid host root path");
    return;
  }

  const workspaceResult = loadWorkspace(hostRoot);
  if (!workspaceResult.success || !workspaceResult.workspace) {
    console.error(`\n❌ Failed to load workspace: ${workspaceResult.issues.join(", ")}`);
    return;
  }

  const feature = findFeatureById(workspaceResult.workspace, featureId);
  if (!feature) {
    console.error(`\n❌ Feature '${featureId}' not found in workspace`);
    console.error(`   Available features: ${workspaceResult.workspace.features.length}`);
    for (const f of workspaceResult.workspace.features.slice(0, 5)) {
      console.error(`   - ${f.featureId} (${f.status})`);
    }
    return;
  }

  console.log(`\n📋 Feature: ${feature.featureId}`);
  console.log(`   Intent Kind: ${feature.intentKind}`);
  console.log(`   Status: ${feature.status}`);
  console.log(`   Revision: ${feature.revision}`);
  console.log(`   Generated Files: ${feature.generatedFiles.length}`);
  console.log(`   Selected Patterns: ${feature.selectedPatterns.join(", ")}`);
  console.log(`   Created: ${feature.createdAt}`);
  console.log(`   Updated: ${feature.updatedAt}`);

  if (feature.generatedFiles.length > 0) {
    console.log(`\n📁 Generated Files:`);
    for (const file of feature.generatedFiles) {
      console.log(`   - ${file}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  const hasInspectFlag = args.includes("--inspect");
  const inspectIndex = args.indexOf("--inspect");
  const inspectFeatureId = hasInspectFlag ? args[inspectIndex + 1] : undefined;

  if (hasInspectFlag && inspectFeatureId) {
    const nonFlagArgs = args.filter((a, i) => i !== inspectIndex && i !== inspectIndex + 1);
    const hostRoot = nonFlagArgs.find(a => !a.startsWith("--")) || "D:\\test1";
    await runInspect(inspectFeatureId, hostRoot);
    return;
  }

  const hasListFlag = args.includes("--list");
  if (hasListFlag) {
    const nonFlagArgs = args.filter(a => a !== "--list");
    const hostRoot = nonFlagArgs.find(a => !a.startsWith("--")) || "D:\\test1";
    await runList(hostRoot);
    return;
  }

  const hasDeleteFlag = args.includes("--delete");
  const deleteIndex = args.indexOf("--delete");
  const deleteFeatureId = hasDeleteFlag ? args[deleteIndex + 1] : undefined;

  if (hasDeleteFlag && deleteFeatureId) {
    const nonFlagArgs = args.filter((a, i) => i !== deleteIndex && i !== deleteIndex + 1);
    const hostRoot = nonFlagArgs.find(a => !a.startsWith("--")) || "D:\\test1";
    const hasConfirmFlag = args.includes("--confirm");
    await runDelete(deleteFeatureId, hostRoot, hasConfirmFlag);
    return;
  }

  // T416: 解析 --write 开关
  const hasWriteFlag = args.includes("--write");
  let filteredArgs = args.filter(arg => arg !== "--write");

  // T418-R3: 解析 --confirm 参数 (格式: --confirm item1,item2,item3 或 --confirm=item1,item2,item3)
  let confirmedItemIds: string[] | undefined;
  const confirmArgIndex = filteredArgs.findIndex(arg => arg.startsWith("--confirm"));
  if (confirmArgIndex !== -1) {
    const confirmArg = filteredArgs[confirmArgIndex];
    const hasEquals = confirmArg.includes("=");
    const confirmValue = hasEquals ? confirmArg.split("=")[1] : filteredArgs[confirmArgIndex + 1];
    if (confirmValue) {
      confirmedItemIds = confirmValue.split(",").map(id => id.trim()).filter(id => id.length > 0);
    }
    // Remove --confirm arg from filteredArgs
    // If using --confirm= format, only remove current arg
    // If using --confirm format, also remove the value arg (next index)
    const indicesToRemove = hasEquals 
      ? [confirmArgIndex] 
      : [confirmArgIndex, confirmArgIndex + 1];
    filteredArgs = filteredArgs.filter((_, idx) => !indicesToRemove.includes(idx));
  }

  const request = filteredArgs[0] || "a dash ability with 300 range";
  const hostRoot = filteredArgs[1] || "D:\\test1";

  // T416: 默认 dry-run，显式 --write 才进入真实写入模式
  const dryRun = !hasWriteFlag;

  try {
    const result = await runWorkbench(request, { hostRoot, dryRun, confirmedItemIds, write: hasWriteFlag });
    console.log("\n[Workbench] Done.");
    if (result.featureIdentity) {
      console.log(`Feature ID: ${result.featureIdentity.id}`);
      console.log(`Feature Label: ${result.featureIdentity.label}`);
      console.log(`Feature Stage: ${result.featureIdentity.currentStage}`);
    }
    if (result.featureOwnership) {
      console.log(`Ownership Surfaces: ${result.featureOwnership.expectedSurfaces.join(", ")}`);
      console.log(`Ownership Impact: ${result.featureOwnership.impactAreas.join(", ")}`);
      console.log(`Ownership Confidence: ${result.featureOwnership.confidence}`);
    }
    if (result.integrationPoints) {
      console.log(`Integration Points: ${result.integrationPoints.points.length}`);
      console.log(`Point Kinds: ${[...new Set(result.integrationPoints.points.map(p => p.kind))].join(", ")}`);
      console.log(`IP Confidence: ${result.integrationPoints.confidence}`);
    }
    if (result.session) {
      console.log(`Session ID: ${result.session.id}`);
      console.log(`Session Status: ${result.session.status}`);
    }
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("\n[Workbench] Error:", err);
    process.exit(1);
  }
}

main();

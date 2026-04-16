/**
 * Rune Weaver - Wizard -> IntentSchema
 * 
 * 与 docs/SCHEMA.md 4.2 节对齐
 */

import type {
  HostDescriptor,
  IntentActor,
  IntentClassification,
  IntentConstraints,
  IntentEffectContract,
  IntentFlowContract,
  IntentIntegrationContract,
  IntentInvariant,
  IntentReadiness,
  IntentRequirements,
  IntentSchema,
  IntentSelectionContract,
  IntentStateContract,
  IntentUncertainty,
  NormalizedMechanics,
  RequiredClarification,
  UIRequirementSummary,
  UserRequestSummary,
} from "../schema/types";
import {
  DOTA2_X_TEMPLATE_HOST_KIND,
} from "../host/types.js";
import { validateIntentSchema } from "../validation";
import type { WizardIntentOptions, WizardIntentResult } from "./types";

const DEFAULT_HOST: HostDescriptor = {
  kind: DOTA2_X_TEMPLATE_HOST_KIND,
};

const INTENT_SCHEMA_REFERENCE = {
  version: "string",
  host: {
    kind: "string",
    projectRoot: "string?",
    capabilities: ["string?"],
  },
  request: {
    rawPrompt: "string",
    goal: "string",
    nameHint: "string?",
  },
  classification: {
    intentKind: "micro-feature | standalone-system | cross-system-composition | ui-surface | unknown",
    confidence: "low | medium | high",
  },
  readiness: "ready | weak | blocked",
  actors: [
    {
      id: "string",
      role: "string",
      label: "string",
    },
  ],
  requirements: {
    functional: ["string"],
    typed: [
      {
        id: "string",
        kind: "trigger | state | rule | effect | resource | ui | integration",
        summary: "string",
        actors: ["string?"],
        inputs: ["string?"],
        outputs: ["string?"],
        invariants: ["string?"],
        parameters: "object?",
        priority: "must | should | could",
      },
    ],
    interactions: ["string?"],
    dataNeeds: ["string?"],
    outputs: ["string?"],
  },
  constraints: {
    requiredPatterns: ["string?"],
    forbiddenPatterns: ["string?"],
    hostConstraints: ["string?"],
    nonFunctional: ["string?"],
  },
  uiRequirements: {
    needed: "boolean",
    surfaces: ["string?"],
    feedbackNeeds: ["string?"],
  },
  stateModel: {
    states: [
      {
        id: "string",
        summary: "string",
        owner: "feature | session | external",
        lifetime: "ephemeral | session | persistent",
        mutationMode: "create | update | consume | expire | remove",
      },
    ],
  },
  flow: {
    triggerSummary: "string?",
    sequence: ["string?"],
    supportsCancel: "boolean?",
    supportsRetry: "boolean?",
    requiresConfirmation: "boolean?",
  },
  selection: {
    mode: "deterministic | weighted | filtered | user-chosen | hybrid",
    cardinality: "single | multiple",
    repeatability: "one-shot | repeatable | persistent",
    duplicatePolicy: "allow | avoid | forbid",
    inventory: {
      enabled: "boolean",
      capacity: "number",
      storeSelectedItems: "boolean",
      blockDrawWhenFull: "boolean",
      fullMessage: "string",
      presentation: "persistent_panel",
    },
  },
  effects: {
    operations: ["apply | remove | stack | expire | consume | restore"],
    targets: ["string?"],
    durationSemantics: "instant | timed | persistent",
  },
  integrations: {
    expectedBindings: [
      {
        id: "string",
        kind: "entry-point | event-hook | bridge-point | ui-surface | data-source",
        summary: "string",
        required: "boolean?",
      },
    ],
  },
  normalizedMechanics: {
    trigger: "boolean?",
    candidatePool: "boolean?",
    weightedSelection: "boolean?",
    playerChoice: "boolean?",
    uiModal: "boolean?",
    outcomeApplication: "boolean?",
    resourceConsumption: "boolean?",
  },
  acceptanceInvariants: [
    {
      id: "string",
      summary: "string",
      severity: "error | warning",
    },
  ],
  uncertainties: [
    {
      id: "string",
      summary: "string",
      affects: ["intent | blueprint | pattern | realization"],
      severity: "low | medium | high",
    },
  ],
  requiredClarifications: [
    {
      id: "string",
      question: "string",
      blocksFinalization: "boolean",
    },
  ],
  openQuestions: ["string"],
  resolvedAssumptions: ["string"],
  isReadyForBlueprint: "boolean",
};

export async function runWizardToIntentSchema(
  options: WizardIntentOptions
): Promise<WizardIntentResult> {
  const host = options.input.host ?? DEFAULT_HOST;

  const result = await options.client.generateObject<Partial<IntentSchema>>({
    messages: buildWizardMessages(options.input.rawText, host),
    schemaName: "IntentSchema",
    schemaDescription:
      "Transform a Rune Weaver user request into a stable IntentSchema for blueprint generation.",
    schema: INTENT_SCHEMA_REFERENCE,
    model: options.input.model,
    temperature: options.input.temperature,
    providerOptions: options.input.providerOptions,
  });

  const schema = normalizeIntentSchema(result.object, options.input.rawText, host);
  const issues = validateIntentSchema(schema);

  return {
    schema,
    issues,
    valid: !issues.some((issue) => issue.severity === "error"),
    raw: result.raw,
  };
}

export function buildWizardMessages(
  rawText: string,
  host: HostDescriptor
): Array<{ role: "system" | "user"; content: string }> {
  return [
    {
      role: "system",
      content: [
        "You are Rune Weaver's wizard layer.",
        "Do not write code.",
        "Convert the user request into a stable IntentSchema.",
        "Prefer explicit structure over vague prose.",
        "If requirements are incomplete, preserve uncertainties and requiredClarifications.",
        "Use readiness = ready | weak | blocked honestly.",
        "Only use isReadyForBlueprint as a compatibility field.",
        "Use the new simplified schema structure aligned with SCHEMA.md.",
        `Current host: ${JSON.stringify(host)}`,
      ].join("\n"),
    },
    {
      role: "user",
      content: rawText,
    },
  ];
}

export function normalizeIntentSchema(
  candidate: Partial<IntentSchema>,
  rawText: string,
  host: HostDescriptor
): IntentSchema {
  const requiredClarifications = normalizeRequiredClarifications(candidate.requiredClarifications);
  const openQuestions = normalizeStringArray(candidate.openQuestions);
  const uncertainties = normalizeUncertainties(candidate.uncertainties);

  return {
    version: typeof candidate.version === "string" ? candidate.version : "1.0",
    host: normalizeHost(candidate.host, host),
    request: normalizeRequest(candidate.request, rawText),
    classification: normalizeClassification(candidate.classification),
    readiness: normalizeReadiness(candidate, requiredClarifications, openQuestions, uncertainties),
    actors: normalizeActors(candidate.actors),
    requirements: normalizeRequirements(candidate.requirements),
    constraints: normalizeConstraints(candidate.constraints),
    stateModel: normalizeStateModel(candidate.stateModel),
    flow: normalizeFlow(candidate.flow),
    selection: normalizeSelection(candidate.selection),
    effects: normalizeEffects(candidate.effects),
    integrations: normalizeIntegrations(candidate.integrations),
    uiRequirements: normalizeUIRequirements(candidate.uiRequirements),
    normalizedMechanics: normalizeNormalizedMechanics(candidate.normalizedMechanics),
    acceptanceInvariants: normalizeInvariants(candidate.acceptanceInvariants),
    uncertainties,
    requiredClarifications,
    openQuestions,
    resolvedAssumptions: normalizeStringArray(candidate.resolvedAssumptions),
    isReadyForBlueprint: deriveLegacyBlueprintReadiness(candidate, requiredClarifications, openQuestions, uncertainties),
  };
}

function normalizeReadiness(
  candidate: Partial<IntentSchema>,
  requiredClarifications = normalizeRequiredClarifications(candidate.requiredClarifications) || [],
  openQuestions = normalizeStringArray(candidate.openQuestions),
  uncertainties = normalizeUncertainties(candidate.uncertainties) || []
): IntentReadiness {
  const blockingClarifications = requiredClarifications.filter(
    (item) => item.blocksFinalization && !isResolvableExistingSeamIssue(item.question, candidate)
  );
  const blockingOpenQuestions = openQuestions.filter(
    (question) => !isResolvableExistingSeamIssue(question, candidate)
  );
  const blockingUncertainties = uncertainties.filter(
    (item) => !isResolvableExistingSeamIssue(item.summary, candidate)
  );

  if (blockingClarifications.length > 0) {
    return "blocked";
  }

  if (blockingOpenQuestions.length > 0 || blockingUncertainties.length > 0) {
    return "weak";
  }

  if (shouldPromoteExistingSeamSupportedIntent(candidate, requiredClarifications, openQuestions, uncertainties)) {
    return "ready";
  }

  if ((candidate.isReadyForBlueprint === true || candidate.readiness === "ready") && hasBlueprintSemanticMinimum(candidate)) {
    return "ready";
  }

  if (requiredClarifications.length > 0 || openQuestions.length > 0 || uncertainties.length > 0) {
    return "weak";
  }

  return "blocked";
}

function deriveLegacyBlueprintReadiness(
  candidate: Partial<IntentSchema>,
  requiredClarifications = normalizeRequiredClarifications(candidate.requiredClarifications) || [],
  openQuestions = normalizeStringArray(candidate.openQuestions),
  uncertainties = normalizeUncertainties(candidate.uncertainties) || []
): boolean {
  if (candidate.isReadyForBlueprint === true && hasBlueprintSemanticMinimum(candidate)) {
    return true;
  }

  const readiness = normalizeReadiness(candidate, requiredClarifications, openQuestions, uncertainties);
  return readiness === "ready";
}

function hasBlueprintSemanticMinimum(candidate: Partial<IntentSchema>): boolean {
  const hasRequirementSignal =
    normalizeStringArray(candidate.requirements?.functional).length > 0 ||
    normalizeStringArray(candidate.requirements?.interactions).length > 0 ||
    normalizeStringArray(candidate.requirements?.outputs).length > 0 ||
    normalizeStringArray(candidate.requirements?.dataNeeds).length > 0 ||
    (candidate.requirements?.typed?.length || 0) > 0;

  const hasStructuredSemanticSignal =
    !!candidate.selection?.mode ||
    !!candidate.selection?.cardinality ||
    !!candidate.effects?.durationSemantics ||
    (candidate.effects?.operations?.length || 0) > 0 ||
    (candidate.integrations?.expectedBindings?.length || 0) > 0 ||
    (candidate.uiRequirements?.surfaces?.length || 0) > 0 ||
    (candidate.stateModel?.states?.length || 0) > 0 ||
    Object.values(candidate.normalizedMechanics || {}).some((value) => value === true);

  return hasRequirementSignal || hasStructuredSemanticSignal;
}

function normalizeHost(
  host: Partial<HostDescriptor> | undefined,
  fallback: HostDescriptor
): HostDescriptor {
  return {
    kind: typeof host?.kind === "string" && host.kind.trim()
      ? host.kind
      : fallback.kind,
    projectRoot: typeof host?.projectRoot === "string" 
      ? host.projectRoot 
      : fallback.projectRoot,
    capabilities: Array.isArray(host?.capabilities)
      ? host.capabilities.filter((value): value is string => typeof value === "string")
      : fallback.capabilities,
  };
}

function normalizeRequest(
  request: Partial<UserRequestSummary> | undefined,
  rawText: string
): UserRequestSummary {
  return {
    rawPrompt: rawText,
    goal: typeof request?.goal === "string" && request.goal.trim()
      ? request.goal
      : rawText,
    nameHint: typeof request?.nameHint === "string" 
      ? request.nameHint 
      : undefined,
  };
}

function normalizeClassification(
  classification: Partial<IntentClassification> | undefined
): IntentClassification {
  const validKinds = new Set([
    "micro-feature",
    "standalone-system",
    "cross-system-composition",
    "ui-surface",
    "unknown",
  ]);

  return {
    intentKind:
      typeof classification?.intentKind === "string" && validKinds.has(classification.intentKind)
        ? classification.intentKind
        : "unknown",
    confidence: isOneOf(classification?.confidence, ["low", "medium", "high"])
      ? classification.confidence
      : "medium",
  };
}

function normalizeRequirements(
  requirements: Partial<IntentRequirements> | undefined
): IntentRequirements {
  return {
    functional: normalizeStringArray(requirements?.functional),
    typed: Array.isArray(requirements?.typed)
      ? requirements.typed
          .filter((item): item is NonNullable<IntentRequirements["typed"]>[number] => typeof item === "object" && item !== null)
          .map((item, index) => ({
            id: typeof item.id === "string" && item.id.trim() ? item.id : `req_${index}`,
            kind: isOneOf(item.kind, ["trigger", "state", "rule", "effect", "resource", "ui", "integration"])
              ? item.kind
              : "effect",
            summary: typeof item.summary === "string" && item.summary.trim() ? item.summary : "Unspecified requirement",
            actors: normalizeStringArray(item.actors),
            inputs: normalizeStringArray(item.inputs),
            outputs: normalizeStringArray(item.outputs),
            invariants: normalizeStringArray(item.invariants),
            parameters: typeof item.parameters === "object" && item.parameters !== null ? item.parameters : undefined,
            priority: isOneOf(item.priority, ["must", "should", "could"]) ? item.priority : undefined,
          }))
      : undefined,
    interactions: normalizeStringArray(requirements?.interactions),
    dataNeeds: normalizeStringArray(requirements?.dataNeeds),
    outputs: normalizeStringArray(requirements?.outputs),
  };
}

function normalizeActors(actors: unknown): IntentActor[] | undefined {
  if (!Array.isArray(actors)) {
    return undefined;
  }

  const normalized = actors
    .filter((item): item is IntentActor => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `actor_${index}`,
      role: typeof item.role === "string" && item.role.trim() ? item.role : "unknown",
      label: typeof item.label === "string" && item.label.trim() ? item.label : `Actor ${index + 1}`,
    }));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeConstraints(
  constraints: Partial<IntentConstraints> | undefined
): IntentConstraints {
  return {
    requiredPatterns: normalizeStringArray(constraints?.requiredPatterns),
    forbiddenPatterns: normalizeStringArray(constraints?.forbiddenPatterns),
    hostConstraints: normalizeStringArray(constraints?.hostConstraints),
    nonFunctional: normalizeStringArray(constraints?.nonFunctional),
  };
}

function normalizeUIRequirements(
  ui: Partial<UIRequirementSummary> | undefined
): UIRequirementSummary | undefined {
  if (!ui) {
    return undefined;
  }

  return {
    needed: ui.needed === true,
    surfaces: normalizeStringArray(ui.surfaces),
    feedbackNeeds: normalizeStringArray(ui.feedbackNeeds),
  };
}

function normalizeStateModel(
  stateModel: Partial<IntentStateContract> | undefined
): IntentStateContract | undefined {
  if (!stateModel || !Array.isArray(stateModel.states)) {
    return undefined;
  }

  const states = stateModel.states
    .filter((item): item is IntentStateContract["states"][number] => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `state_${index}`,
      summary: typeof item.summary === "string" && item.summary.trim() ? item.summary : "Unspecified state",
      owner: isOneOf(item.owner, ["feature", "session", "external"]) ? item.owner : undefined,
      lifetime: isOneOf(item.lifetime, ["ephemeral", "session", "persistent"]) ? item.lifetime : undefined,
      mutationMode: isOneOf(item.mutationMode, ["create", "update", "consume", "expire", "remove"])
        ? item.mutationMode
        : undefined,
    }));

  return states.length > 0 ? { states } : undefined;
}

function normalizeFlow(
  flow: Partial<IntentFlowContract> | undefined
): IntentFlowContract | undefined {
  if (!flow) {
    return undefined;
  }

  return {
    triggerSummary: typeof flow.triggerSummary === "string" ? flow.triggerSummary : undefined,
    sequence: normalizeStringArray(flow.sequence),
    supportsCancel: flow.supportsCancel === true,
    supportsRetry: flow.supportsRetry === true,
    requiresConfirmation: flow.requiresConfirmation === true,
  };
}

function normalizeSelection(
  selection: Partial<IntentSelectionContract> | undefined
): IntentSelectionContract | undefined {
  if (!selection) {
    return undefined;
  }

  return {
    mode: isOneOf(selection.mode, ["deterministic", "weighted", "filtered", "user-chosen", "hybrid"])
      ? selection.mode
      : undefined,
    cardinality: isOneOf(selection.cardinality, ["single", "multiple"]) ? selection.cardinality : undefined,
    repeatability: isOneOf(selection.repeatability, ["one-shot", "repeatable", "persistent"])
      ? selection.repeatability
      : undefined,
    duplicatePolicy: isOneOf(selection.duplicatePolicy, ["allow", "avoid", "forbid"])
      ? selection.duplicatePolicy
      : undefined,
    inventory:
      selection.inventory &&
      selection.inventory.enabled === true &&
      typeof selection.inventory.capacity === "number" &&
      isFinite(selection.inventory.capacity)
        ? {
            enabled: true,
            capacity: Math.max(1, Math.floor(selection.inventory.capacity)),
            storeSelectedItems: selection.inventory.storeSelectedItems === true,
            blockDrawWhenFull: selection.inventory.blockDrawWhenFull === true,
            fullMessage:
              typeof selection.inventory.fullMessage === "string" && selection.inventory.fullMessage.trim()
                ? selection.inventory.fullMessage
                : "Inventory full",
            presentation: selection.inventory.presentation === "persistent_panel"
              ? "persistent_panel"
              : "persistent_panel",
          }
        : undefined,
  };
}

function normalizeEffects(
  effects: Partial<IntentEffectContract> | undefined
): IntentEffectContract | undefined {
  if (!effects) {
    return undefined;
  }

  const operations = Array.isArray(effects.operations)
    ? effects.operations.filter((item): item is IntentEffectContract["operations"][number] =>
        isOneOf(item, ["apply", "remove", "stack", "expire", "consume", "restore"]))
    : [];

  if (operations.length === 0 && !effects.targets && !effects.durationSemantics) {
    return undefined;
  }

  return {
    operations,
    targets: normalizeStringArray(effects.targets),
    durationSemantics: isOneOf(effects.durationSemantics, ["instant", "timed", "persistent"])
      ? effects.durationSemantics
      : undefined,
  };
}

function normalizeIntegrations(
  integrations: Partial<IntentIntegrationContract> | undefined
): IntentIntegrationContract | undefined {
  if (!integrations || !Array.isArray(integrations.expectedBindings)) {
    return undefined;
  }

  const expectedBindings = integrations.expectedBindings
    .filter((item): item is IntentIntegrationContract["expectedBindings"][number] => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `binding_${index}`,
      kind: isOneOf(item.kind, ["entry-point", "event-hook", "bridge-point", "ui-surface", "data-source"])
        ? item.kind
        : "entry-point",
      summary: typeof item.summary === "string" && item.summary.trim() ? item.summary : "Unspecified binding",
      required: item.required === true,
    }));

  return expectedBindings.length > 0 ? { expectedBindings } : undefined;
}

function normalizeInvariants(invariants: unknown): IntentInvariant[] | undefined {
  if (!Array.isArray(invariants)) {
    return undefined;
  }

  const normalized = invariants
    .filter((item): item is IntentInvariant => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `invariant_${index}`,
      summary: typeof item.summary === "string" && item.summary.trim() ? item.summary : "Unspecified invariant",
      severity: isOneOf(item.severity, ["error", "warning"]) ? item.severity : "warning",
    }));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeUncertainties(uncertainties: unknown): IntentUncertainty[] | undefined {
  if (!Array.isArray(uncertainties)) {
    return undefined;
  }

  const normalized = uncertainties
    .filter((item): item is IntentUncertainty => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `uncertainty_${index}`,
      summary: typeof item.summary === "string" && item.summary.trim() ? item.summary : "Unspecified uncertainty",
      affects: Array.isArray(item.affects)
        ? item.affects.filter((value): value is IntentUncertainty["affects"][number] =>
            isOneOf(value, ["intent", "blueprint", "pattern", "realization"]))
        : [],
      severity: isOneOf(item.severity, ["low", "medium", "high"]) ? item.severity : "medium",
    }));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRequiredClarifications(
  clarifications: unknown
): RequiredClarification[] | undefined {
  if (!Array.isArray(clarifications)) {
    return undefined;
  }

  const normalized = clarifications
    .filter((item): item is RequiredClarification => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `clarification_${index}`,
      question: typeof item.question === "string" && item.question.trim() ? item.question : "Clarification required",
      blocksFinalization: item.blocksFinalization === true && !isBoundedVariabilityQuestion(item.question),
    }));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNormalizedMechanics(
  mechanics: Partial<NormalizedMechanics> | undefined
): NormalizedMechanics {
  return {
    trigger: mechanics?.trigger === true,
    candidatePool: mechanics?.candidatePool === true,
    weightedSelection: mechanics?.weightedSelection === true,
    playerChoice: mechanics?.playerChoice === true,
    uiModal: mechanics?.uiModal === true,
    outcomeApplication: mechanics?.outcomeApplication === true,
    resourceConsumption: mechanics?.resourceConsumption === true,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function isBoundedVariabilityQuestion(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const question = value.toLowerCase();
  const mentionsDetail =
    question.includes("具体内容") ||
    question.includes("具体数值") ||
    question.includes("具体的增益列表") ||
    question.includes("增益列表") ||
    question.includes("属性类型") ||
    question.includes("力量") ||
    question.includes("敏捷") ||
    question.includes("智力") ||
    question.includes("攻击力") ||
    question.includes("护甲") ||
    question.includes("数值") ||
    question.includes("名称") ||
    question.includes("图标") ||
    question.includes("icon") ||
    question.includes("resource path") ||
    question.includes("资源路径") ||
    question.includes("attribute values") ||
    question.includes("属性加成数值");
  const mentionsArchitectureGap =
    question.includes("what triggers") ||
    question.includes("trigger") ||
    question.includes("which existing systems") ||
    question.includes("integrate with") ||
    question.includes("multi-factor") ||
    question.includes("abilities") ||
    question.includes("items") ||
    question.includes("custom hero mechanics") ||
    question.includes("联动") ||
    question.includes("触发") ||
    question.includes("已有系统");

  return mentionsDetail && !mentionsArchitectureGap;
}

function isEffectLifecycleVariabilityQuestion(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const question = value.toLowerCase();
  const mentionsReplacementConcept =
    question.includes("replace") ||
    question.includes("replaced") ||
    question.includes("existing one") ||
    question.includes("existing buff") ||
    question.includes("current buff") ||
    question.includes("previous buff") ||
    question.includes("replace old") ||
    question.includes("new selection replace old") ||
    question.includes("保留最高值") ||
    question.includes("highest value") ||
    question.includes("retention priority") ||
    question.includes("替换") ||
    question.includes("旧增益") ||
    question.includes("当前增益");
  const mentionsStackingConcept =
    question.includes("stack") ||
    question.includes("stacking") ||
    question.includes("additively") ||
    question.includes("accumulate") ||
    question.includes("叠加");
  const mentionsCoexistenceConcept =
    question.includes("hold multiple buffs") ||
    question.includes("multiple buffs simultaneously") ||
    question.includes("multiple buffs") ||
    question.includes("same type") ||
    question.includes("same-type") ||
    question.includes("多次使用系统") ||
    question.includes("repeated uses") ||
    question.includes("same match") ||
    question.includes("simultaneously") ||
    question.includes("coexist") ||
    question.includes("coexisting") ||
    question.includes("同时拥有多个增益") ||
    question.includes("多个增益同时") ||
    question.includes("多个增益") ||
    question.includes("同类型");
  const mentionsLifecycle =
    question.includes("clarify-stacking") ||
    question.includes("clarify-duration") ||
    question.includes("叠加") ||
    question.includes("替换") ||
    question.includes("多次打开") ||
    question.includes("永久的") ||
    question.includes("永久保留") ||
    question.includes("临时的") ||
    question.includes("持续多久") ||
    question.includes("永久持续") ||
    question.includes("限时") ||
    question.includes("limited duration") ||
    question.includes("多少秒") ||
    question.includes("几秒") ||
    question.includes("一段时间") ||
    question.includes("持续到游戏结束") ||
    question.includes("until next selection") ||
    question.includes("仅在特定条件下生效") ||
    question.includes("是否可叠加") ||
    question.includes("禁止选择同类型") ||
    question.includes("可以在一局游戏中多次打开") ||
    question.includes("移除旧效果") ||
    question.includes("持续时间") ||
    question.includes("duration") ||
    question.includes("stacking") ||
    question.includes("temporary") ||
    question.includes("permanent") ||
    question.includes("permanent for the match") ||
    question.includes("temporary with duration") ||
    question.includes("until next selection") ||
    question.includes("accumulate multiple buffs") ||
    question.includes("replace the previous buff") ||
    question.includes("reopen") ||
    question.includes("open multiple times") ||
    question.includes("replace current buff") ||
    question.includes("remove old effect");

  return (
    mentionsLifecycle ||
    (mentionsReplacementConcept && (mentionsStackingConcept || mentionsCoexistenceConcept))
  );
}

function hasSupportedModifierLifecycleContext(candidate: Partial<IntentSchema>): boolean {
  return (
    candidate.normalizedMechanics?.outcomeApplication === true &&
    (candidate.normalizedMechanics?.playerChoice === true || candidate.selection?.mode === "user-chosen") &&
    hasRepeatableSelectionIntent(candidate) &&
    hasChoiceStateCarryThroughIntent(candidate) &&
    (!!candidate.effects?.durationSemantics || candidate.normalizedMechanics?.uiModal === true)
  );
}

function hasRepeatableSelectionIntent(candidate: Partial<IntentSchema>): boolean {
  if (candidate.selection?.repeatability === "repeatable" || candidate.selection?.repeatability === "persistent") {
    return true;
  }

  if (candidate.flow?.supportsRetry === true) {
    return true;
  }

  if ((candidate.flow?.sequence || []).some((step) => {
    const text = step.toLowerCase();
    return text.includes("每次") || text.includes("再次") || text.includes("repeat");
  })) {
    return true;
  }

  return collectIntentStrings(candidate).some((value) => {
    const text = value.toLowerCase();
    return (
      text.includes("repeatable") ||
      text.includes("repeated") ||
      text.includes("repeat trigger") ||
      text.includes("reopen") ||
      text.includes("open again") ||
      text.includes("open multiple times") ||
      text.includes("每次打开") ||
      text.includes("再次打开") ||
      text.includes("多次打开") ||
      text.includes("重复触发") ||
      text.includes("反复触发")
    );
  });
}

function hasChoiceStateCarryThroughIntent(candidate: Partial<IntentSchema>): boolean {
  const stateModel = candidate.stateModel;
  const hasPersistedChoiceState = !!stateModel?.states?.some((state) => {
    const summary = typeof state.summary === "string" ? state.summary.toLowerCase() : "";
    const id = typeof state.id === "string" ? state.id.toLowerCase() : "";
    return (
      state.lifetime === "persistent" ||
      state.lifetime === "session" ||
      summary.includes("active buff") ||
      summary.includes("active state") ||
      summary.includes("current buff") ||
      summary.includes("current selection") ||
      summary.includes("current choice") ||
      summary.includes("selected state") ||
      summary.includes("selection state") ||
      summary.includes("当前增益") ||
      summary.includes("当前选择") ||
      summary.includes("当前状态") ||
      summary.includes("已选择") ||
      summary.includes("选择状态") ||
      summary.includes("状态同步") ||
      summary.includes("active-buff") ||
      id.includes("active_buff") ||
      id.includes("current_buff") ||
      id.includes("current_selection") ||
      id.includes("current_choice") ||
      id.includes("active_state") ||
      id.includes("selected_state") ||
      id.includes("selection_state")
    );
  });

  if (hasPersistedChoiceState) {
    return true;
  }

  return collectIntentStrings(candidate).some((value) => {
    const text = value.toLowerCase();
    return (
      text.includes("current choice") ||
      text.includes("current selection") ||
      text.includes("current state") ||
      text.includes("selected state") ||
      text.includes("selection state") ||
      text.includes("status sync") ||
      text.includes("state sync") ||
      text.includes("display current") ||
      text.includes("show current") ||
      text.includes("已选择") ||
      text.includes("当前选择") ||
      text.includes("当前状态") ||
      text.includes("当前选择状态") ||
      text.includes("选择状态") ||
      text.includes("状态同步")
    );
  });
}

function collectIntentStrings(candidate: Partial<IntentSchema>): string[] {
  const values: string[] = [];
  values.push(candidate.request?.goal || "");
  values.push(candidate.flow?.triggerSummary || "");
  values.push(...normalizeStringArray(candidate.flow?.sequence));
  values.push(...normalizeStringArray(candidate.requirements?.functional));
  values.push(...normalizeStringArray(candidate.requirements?.interactions));
  values.push(...normalizeStringArray(candidate.requirements?.dataNeeds));
  values.push(...normalizeStringArray(candidate.requirements?.outputs));
  values.push(...normalizeStringArray(candidate.uiRequirements?.surfaces));
  values.push(...normalizeStringArray(candidate.uiRequirements?.feedbackNeeds));
  values.push(...normalizeStringArray(candidate.openQuestions));
  values.push(...normalizeStringArray(candidate.resolvedAssumptions));

  for (const requirement of candidate.requirements?.typed || []) {
    values.push(requirement.summary || "");
    values.push(...normalizeStringArray(requirement.inputs));
    values.push(...normalizeStringArray(requirement.outputs));
    values.push(...normalizeStringArray(requirement.invariants));
  }

  for (const binding of candidate.integrations?.expectedBindings || []) {
    values.push(binding.summary || "");
    values.push(binding.id || "");
  }

  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function isNonBlockingClarification(
  question: unknown,
  candidate: Partial<IntentSchema>
): boolean {
  return (
    isBoundedVariabilityQuestion(question) ||
    (isEffectLifecycleVariabilityQuestion(question) && hasSupportedModifierLifecycleContext(candidate))
  );
}

function shouldPromoteExistingSeamSupportedIntent(
  candidate: Partial<IntentSchema>,
  requiredClarifications: RequiredClarification[],
  openQuestions: string[],
  uncertainties: IntentUncertainty[]
): boolean {
  if (!hasBlueprintSemanticMinimum(candidate)) {
    return false;
  }

  const issues = [
    ...requiredClarifications.map((item) => item.question),
    ...openQuestions,
    ...uncertainties.map((item) => item.summary),
  ];

  return issues.length > 0 && issues.every((issue) => isResolvableExistingSeamIssue(issue, candidate));
}

function isSupportedTriChoiceBuffFamilyContext(candidate: Partial<IntentSchema>): boolean {
  const hasMechanicShape =
    candidate.normalizedMechanics?.trigger === true &&
    candidate.normalizedMechanics?.candidatePool === true &&
    candidate.normalizedMechanics?.playerChoice === true &&
    candidate.normalizedMechanics?.uiModal === true &&
    candidate.normalizedMechanics?.outcomeApplication === true;
  const hasSelectionShape =
    (candidate.selection?.mode === "user-chosen" || candidate.normalizedMechanics?.playerChoice === true) &&
    hasRepeatableSelectionIntent(candidate);
  const bindings = candidate.integrations?.expectedBindings || [];
  const hasIntegrationShape =
    bindings.some((binding) => binding.kind === "ui-surface") &&
    bindings.some((binding) => binding.kind === "bridge-point") &&
    bindings.some((binding) => binding.kind === "entry-point" || binding.kind === "data-source");

  return hasMechanicShape && hasSelectionShape && hasIntegrationShape && hasSupportedModifierLifecycleContext(candidate);
}

function isSupportedTriChoicePolishQuestion(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const question = value.toLowerCase();
  return (
    question.includes("rebind") ||
    question.includes("可重绑") ||
    question.includes("rebindable") ||
    question.includes("cooldown") ||
    question.includes("冷却") ||
    question.includes("visual") ||
    question.includes("audio") ||
    question.includes("反馈") ||
    question.includes("音效") ||
    question.includes("特效") ||
    question.includes("f4")
  );
}

function isSupportedTriChoiceCatalogQuestion(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const question = value.toLowerCase();
  return (
    isBoundedVariabilityQuestion(question) ||
    question.includes("pool size") ||
    question.includes("total pool size") ||
    question.includes("buff list") ||
    question.includes("buff types") ||
    question.includes("specific buff types") ||
    question.includes("pool composition") ||
    question.includes("modifier examples") ||
    question.includes("buff option list") ||
    question.includes("stat values") ||
    question.includes("duplicate across sessions") ||
    question.includes("总池大小") ||
    question.includes("总候选池") ||
    question.includes("完整 buff 列表") ||
    question.includes("完整增益列表") ||
    question.includes("具体 buff 类型") ||
    question.includes("具体增益类型") ||
    question.includes("池组成") ||
    question.includes("具体属性加成示例") ||
    question.includes("具体增益选项") ||
    question.includes("跨局重复") ||
    question.includes("同类型") ||
    question.includes("same type") ||
    question.includes("same-type") ||
    question.includes("duplicate")
  );
}

function isResolvableExistingSeamIssue(
  value: unknown,
  candidate: Partial<IntentSchema>
): boolean {
  if (isBoundedVariabilityQuestion(value)) {
    return true;
  }

  if (isEffectLifecycleVariabilityQuestion(value) && hasSupportedModifierLifecycleContext(candidate)) {
    return true;
  }

  if (!isSupportedTriChoiceBuffFamilyContext(candidate)) {
    return false;
  }

  return (
    !explicitlyReopensSupportedFamilyArchitecture(value) &&
    (isSupportedTriChoicePolishQuestion(value) || isSupportedTriChoiceCatalogQuestion(value))
  );
}

function explicitlyReopensSupportedFamilyArchitecture(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const text = value.toLowerCase();
  const reopensTrigger =
    text.includes("what triggers") ||
    text.includes("trigger condition") ||
    text.includes("when does the selection happen") ||
    text.includes("how is f4 triggered") ||
    text.includes("触发条件") ||
    text.includes("什么触发") ||
    text.includes("何时触发");
  const reopensIntegration =
    text.includes("which system") ||
    text.includes("which existing systems") ||
    text.includes("integrate with") ||
    text.includes("what does it sync with") ||
    text.includes("bridge target") ||
    text.includes("联动哪个系统") ||
    text.includes("同步到哪里") ||
    text.includes("桥接到哪里");
  const reopensStateShape =
    text.includes("what state is persisted") ||
    text.includes("whether state should persist") ||
    text.includes("where is current buff stored") ||
    text.includes("candidate pool state") ||
    text.includes("state model") ||
    text.includes("存什么状态") ||
    text.includes("状态模型") ||
    text.includes("候选池状态");

  return reopensTrigger || reopensIntegration || reopensStateShape;
}

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

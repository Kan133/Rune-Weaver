/**
 * Rune Weaver - Wizard -> IntentSchema
 */

import type {
  HostDescriptor,
  IntentActor,
  IntentClassification,
  IntentCompositionContract,
  IntentContentModelContract,
  IntentConstraints,
  IntentEffectContract,
  IntentFlowContract,
  IntentInteractionContract,
  IntentIntegrationContract,
  IntentInvariant,
  IntentOutcomeContract,
  IntentRequirements,
  IntentSchema,
  IntentSelectionContract,
  IntentSpatialContract,
  IntentStateContract,
  IntentTargetingContract,
  IntentTimingContract,
  IntentUncertainty,
  NormalizedMechanics,
  UIRequirementSummary,
  UserRequestSummary,
  ValidationIssue,
} from "../schema/types";
import { DOTA2_X_TEMPLATE_HOST_KIND } from "../host/types.js";
import { buildWizardCreatePromptPackage } from "../llm/prompt-packages.js";
import { buildDota2RetrievalBundle } from "../retrieval/index.js";
import { validateIntentSchema } from "../validation";
import type { WizardIntentOptions, WizardIntentResult } from "./types";
import { buildWizardClarificationPlan } from "./clarification-plan";

const DEFAULT_HOST: HostDescriptor = {
  kind: DOTA2_X_TEMPLATE_HOST_KIND,
};

export const INTENT_SCHEMA_REFERENCE = {
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
        kind: "trigger | state | rule | effect | resource | ui | integration | generic",
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
  interaction: {
    activations: [
      {
        actor: "string?",
        kind: "key | mouse | event | passive | system",
        input: "string?",
        phase: "press | release | hold | enter | occur",
        repeatability: "one-shot | repeatable | toggle | persistent",
        confirmation: "none | implicit | explicit",
      },
    ],
  },
  targeting: {
    subject: "self | ally | enemy | unit | point | area | direction | global",
    selector: "cursor | current-target | nearest | random | none",
    teamScope: "self | ally | enemy | any",
  },
  timing: {
    cooldownSeconds: "number?",
    delaySeconds: "number?",
    intervalSeconds: "number?",
    duration: {
      kind: "instant | timed | persistent",
      seconds: "number?",
    },
  },
  spatial: {
    motion: {
      kind: "dash | teleport | knockback | none",
      distance: "number?",
      direction: "cursor | facing | target | fixed",
    },
    area: {
      shape: "circle | line | cone",
      radius: "number?",
      length: "number?",
      width: "number?",
    },
    emission: {
      kind: "projectile | pulse | wave | none",
      speed: "number?",
      count: "number?",
    },
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
    source: "none | candidate-collection | weighted-pool | filtered-pool",
    choiceMode: "none | user-chosen | random | weighted | hybrid",
    cardinality: "single | multiple",
    choiceCount: "number?",
    repeatability: "one-shot | repeatable | persistent",
    duplicatePolicy: "allow | avoid | forbid",
    commitment: "immediate | confirm | deferred",
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
  outcomes: {
    operations: [
      "apply-effect | move | spawn | grant-feature | update-state | consume-resource | emit-event",
    ],
  },
  contentModel: {
    collections: [
      {
        id: "string",
        role: "candidate-options | spawnables | progress-items | generic",
        ownership: "feature | shared | external",
        updateMode: "replace | merge | append",
        itemSchema: [
          {
            name: "string",
            type: "string | number | boolean | enum | effect-ref | object-ref",
            required: "boolean?",
            semanticRole: "string?",
          },
        ],
      },
    ],
  },
  composition: {
    dependencies: [
      {
        kind: "same-feature | cross-feature | external-system",
        relation: "reads | writes | triggers | grants | syncs-with",
        target: "string?",
        required: "boolean?",
      },
    ],
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
  resolvedAssumptions: ["string"],
  parameters: "object?",
};

interface PromptSemanticHints {
  normalizedText: string;
  candidateCount?: number;
  committedCount?: number;
  inventoryCapacity?: number;
  inventoryFullMessage?: string;
  candidatePool: boolean;
  weightedDraw: boolean;
  playerChoice: boolean;
  inventory: boolean;
  inventoryBlocksWhenFull: boolean;
  noRepeatAfterSelection: boolean;
  returnsUnchosenToPool?: boolean;
  immediateOutcome: boolean;
  explicitPersistence: boolean;
  explicitCrossFeature?: boolean;
  rarityDisplay: boolean;
  uiSurface: boolean;
}

interface LegacyRequiredClarification {
  id?: string;
  question?: string;
  blocksFinalization?: boolean;
}

export async function runWizardToIntentSchema(
  options: WizardIntentOptions,
): Promise<WizardIntentResult> {
  const host = options.input.host ?? DEFAULT_HOST;
  let schema: IntentSchema;
  let raw: unknown;
  const preValidationIssues: ValidationIssue[] = [];
  const retrievalBundle = await buildDota2RetrievalBundle({
    promptPackageId: "wizard.create",
    queryText: options.input.rawText,
    projectRoot: host.projectRoot || process.cwd(),
  });
  const promptPackage = buildWizardCreatePromptPackage({
    rawText: options.input.rawText,
    hostSummary: JSON.stringify(host),
    retrievalBundle,
    refinementContext: options.input.refinementContext,
  });

  try {
    const result = await options.client.generateObject<Partial<IntentSchema>>({
      messages: promptPackage.messages,
      schemaName: "IntentSchema",
      schemaDescription:
        "Transform a Rune Weaver user request into a stable IntentSchema for blueprint generation.",
      schema: INTENT_SCHEMA_REFERENCE,
      model: options.input.model,
      temperature: options.input.temperature,
      providerOptions: options.input.providerOptions,
    });

    raw = result.raw;
    schema = normalizeIntentSchema(result.object, options.input.rawText, host);
  } catch (error) {
    schema = createFallbackIntentSchema(options.input.rawText, host);
    preValidationIssues.push({
      code: "WIZARD_GENERIC_FALLBACK",
      scope: "schema",
      severity: "warning",
      message: `Wizard fell back to generic semantic interpretation: ${error instanceof Error ? error.message : String(error)}`,
      path: "wizard",
    });
  }

  const clarificationPlan = buildWizardClarificationPlan({
    rawText: options.input.rawText,
    schema,
  });
  const issues = [...preValidationIssues, ...validateIntentSchema(schema)];

  return {
    schema,
    interpretation: {
      intentSchema: schema,
      ...(clarificationPlan ? { clarificationPlan } : {}),
      promptPackageId: promptPackage.id,
      promptConstraints: promptPackage.promptConstraints,
      ...(promptPackage.retrievalBundle ? { retrievalBundle: promptPackage.retrievalBundle } : {}),
    },
    ...(clarificationPlan ? { clarificationPlan } : {}),
    issues,
    valid: !issues.some((issue) => issue.severity === "error"),
    raw,
  };
}

export function buildWizardMessages(
  rawText: string,
  host: HostDescriptor,
  refinementContext?: WizardIntentOptions["input"]["refinementContext"],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return buildWizardCreatePromptPackage({
    rawText,
    hostSummary: JSON.stringify(host),
    refinementContext,
  }).messages;
}

function buildWizardFewShotMessages(): Array<{ role: "user" | "assistant"; content: string }> {
  const examples = [
    {
      user: "Create a skill that moves the player 400 units toward the cursor when G is pressed.",
      assistant: {
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["Pressing G moves the player 400 units toward the cursor."] },
        interaction: { activations: [{ kind: "key", input: "G", phase: "press", repeatability: "repeatable" }] },
        targeting: { subject: "self", selector: "cursor", teamScope: "self" },
        spatial: { motion: { kind: "dash", distance: 400, direction: "cursor" } },
        outcomes: { operations: ["move"] },
        uncertainties: [],
      },
    },
    {
      user: "Press F4 to draw 3 weighted candidates from a pool, show rarity on cards, let the player pick 1, and apply the chosen result immediately.",
      assistant: {
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["F4 opens a weighted 3-choice draft and applies the selected result immediately."] },
        interaction: { activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }] },
        selection: {
          mode: "weighted",
          source: "weighted-pool",
          choiceMode: "user-chosen",
          choiceCount: 3,
          cardinality: "single",
          repeatability: "repeatable",
          commitment: "immediate",
        },
        contentModel: {
          collections: [{ id: "candidate_options", role: "candidate-options", ownership: "feature", updateMode: "replace" }],
        },
        uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
        outcomes: { operations: ["apply-effect"] },
      },
    },
    {
      user: "Create a passive aura that gives nearby allies bonus armor.",
      assistant: {
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["A passive aura grants nearby allies bonus armor."] },
        interaction: { activations: [{ kind: "passive", repeatability: "persistent" }] },
        targeting: { subject: "ally", selector: "area", teamScope: "ally" },
        effects: { operations: ["apply"], durationSemantics: "persistent", targets: ["nearby allies"] },
        uncertainties: [],
      },
    },
    {
      user: "After drawing one option, grant another feature and persist it across matches.",
      assistant: {
        classification: { intentKind: "cross-system-composition", confidence: "medium" },
        requirements: { functional: ["After one draw result is committed, grant another feature and persist it across matches."] },
        outcomes: { operations: ["grant-feature", "update-state"] },
        timing: { duration: { kind: "persistent" } },
        composition: {
          dependencies: [
            { kind: "cross-feature", relation: "grants", required: true },
            { kind: "external-system", relation: "writes", required: true },
          ],
        },
        uncertainties: [
          { id: "unc_target_feature", summary: "The exact granted feature target is not specified.", affects: ["intent", "blueprint"], severity: "high" },
        ],
      },
    },
    {
      user: "Make a system where collected echoes tune a reality lattice and change future pulses.",
      assistant: {
        classification: { intentKind: "standalone-system", confidence: "low" },
        requirements: {
          functional: ["Collected echoes tune a shared reality lattice and influence future pulse behavior."],
          typed: [{ id: "generic_reality_lattice", kind: "generic", summary: "Track and apply the reality-lattice tuning semantics described by the user.", priority: "must" }],
        },
        contentModel: {
          collections: [{ id: "echoes", role: "generic", ownership: "feature", updateMode: "merge" }],
        },
        uncertainties: [
          { id: "unc_reality_lattice", summary: "The exact operational meaning of the reality lattice and pulse transformation is still domain-specific.", affects: ["intent", "blueprint"], severity: "high" },
        ],
      },
    },
  ];

  return examples.flatMap((example) => [
    { role: "user" as const, content: example.user },
    { role: "assistant" as const, content: JSON.stringify(example.assistant, null, 2) },
  ]);
}

export function normalizeIntentSchema(
  candidate: Partial<IntentSchema>,
  rawText: string,
  host: HostDescriptor,
): IntentSchema {
  const promptHints = collectPromptSemanticHints(rawText);
  const requirements = normalizeRequirements(candidate.requirements);
  const constraints = normalizeConstraints(candidate.constraints);
  const interaction = normalizeInteraction(candidate.interaction);
  const targeting = normalizeTargeting(candidate.targeting);
  const timing = normalizeTiming(candidate.timing);
  const spatial = normalizeSpatial(candidate.spatial);
  const stateModel = normalizeStateModel(candidate.stateModel);
  const flow = normalizeFlow(candidate.flow, rawText);
  const selection = normalizeSelection(candidate.selection, promptHints);
  const effects = normalizeEffects(candidate.effects);
  const outcomes = normalizeOutcomes(candidate.outcomes);
  const contentModel = normalizeContentModel(candidate.contentModel, promptHints);
  const composition = normalizeComposition(candidate.composition);
  const integrations = normalizeIntegrations(candidate.integrations);
  const uiRequirements = normalizeUIRequirements(candidate.uiRequirements);
  const uncertainties = mergeUncertainties(
    normalizeUncertainties(candidate.uncertainties, promptHints),
    normalizeLegacyClarificationSignals(candidate, promptHints),
  );
  const initialResolvedAssumptions = normalizeResolvedAssumptions(
    candidate.resolvedAssumptions,
    promptHints,
  );
  const initialCandidate: Partial<IntentSchema> = {
    ...candidate,
    requirements,
    constraints,
    interaction,
    targeting,
    timing,
    spatial,
    stateModel,
    flow,
    selection,
    effects,
    outcomes,
    contentModel,
    composition,
    integrations,
    uiRequirements,
  };
  const canonicalized = canonicalizeStructuredCandidateDrawIntentSchema({
    candidate: initialCandidate,
    rawText,
    promptHints,
    uncertainties,
    resolvedAssumptions: initialResolvedAssumptions,
  });
  const normalizedCandidate = canonicalized.candidate;
  const classification = normalizeClassification(candidate.classification, normalizedCandidate);
  const normalizedMechanics = normalizeNormalizedMechanics(
    candidate.normalizedMechanics,
    normalizedCandidate,
    promptHints,
  );

  return {
    version: typeof candidate.version === "string" ? candidate.version : "1.0",
    host: normalizeHost(candidate.host, host),
    request: normalizeRequest(candidate.request, rawText),
    classification,
    actors: normalizeActors(candidate.actors),
    requirements: normalizedCandidate.requirements ?? requirements,
    constraints: normalizedCandidate.constraints ?? constraints,
    interaction: normalizedCandidate.interaction ?? interaction,
    targeting: normalizedCandidate.targeting ?? targeting,
    timing: normalizedCandidate.timing,
    spatial: normalizedCandidate.spatial ?? spatial,
    stateModel: normalizedCandidate.stateModel,
    flow: normalizedCandidate.flow ?? flow,
    selection: normalizedCandidate.selection,
    effects: normalizedCandidate.effects,
    outcomes: normalizedCandidate.outcomes,
    contentModel: normalizedCandidate.contentModel,
    composition: normalizedCandidate.composition,
    integrations: normalizedCandidate.integrations ?? integrations,
    uiRequirements: normalizedCandidate.uiRequirements,
    normalizedMechanics,
    acceptanceInvariants: normalizeInvariants(candidate.acceptanceInvariants),
    uncertainties: canonicalized.uncertainties,
    resolvedAssumptions: canonicalized.resolvedAssumptions,
    parameters: normalizeModuleSafeParameters(normalizedCandidate.parameters ?? candidate.parameters),
  };
}

export function createFallbackIntentSchema(
  rawText: string,
  host: HostDescriptor = DEFAULT_HOST,
): IntentSchema {
  const promptHints = collectPromptSemanticHints(rawText);
  const parameters = extractFallbackScalarParameters(rawText);
  const interaction = buildFallbackInteraction(rawText);
  const targeting = buildFallbackTargeting(rawText);
  const timing = buildFallbackTiming(rawText);
  const spatial = buildFallbackSpatial(rawText);
  const selection = buildFallbackSelection(rawText, promptHints);
  const outcomes = buildFallbackOutcomes(rawText, spatial, selection);
  const composition = buildFallbackComposition(rawText);
  const uiRequirements = buildFallbackUiRequirements(rawText, promptHints, selection);
  const contentModel = buildFallbackContentModel(promptHints, selection);
  const stateModel = buildFallbackStateModel(rawText, selection, composition);
  const uncertainties = buildFallbackUncertainties(rawText, composition);

  return normalizeIntentSchema(
    {
      version: "1.0",
      host,
      request: {
        rawPrompt: rawText,
        goal: rawText.trim() || "Interpret the requested feature semantics.",
        nameHint: buildFallbackNameHint(rawText),
      },
      classification: {
        intentKind: inferFallbackIntentKind(rawText, composition, uiRequirements),
        confidence: "low",
      },
      requirements: {
        functional: [buildFallbackFunctionalRequirement(rawText)],
        typed: buildFallbackTypedRequirements({
          rawText,
          interaction,
          selection,
          spatial,
          outcomes,
          composition,
          uiRequirements,
        }),
      },
      interaction,
      targeting,
      timing,
      spatial,
      selection,
      outcomes,
      contentModel,
      composition,
      stateModel,
      uiRequirements,
      uncertainties,
      resolvedAssumptions: [
        "Using generic wizard fallback after LLM generation failed.",
      ],
      parameters,
    },
    rawText,
    host,
  );
}

function normalizeHost(
  host: Partial<HostDescriptor> | undefined,
  fallback: HostDescriptor,
): HostDescriptor {
  return {
    kind: typeof host?.kind === "string" && host.kind.trim() ? host.kind : fallback.kind,
    projectRoot: typeof host?.projectRoot === "string" ? host.projectRoot : fallback.projectRoot,
    capabilities: Array.isArray(host?.capabilities)
      ? host.capabilities.filter((value): value is string => typeof value === "string")
      : fallback.capabilities,
  };
}

function normalizeRequest(
  request: Partial<UserRequestSummary> | undefined,
  rawText: string,
): UserRequestSummary {
  return {
    rawPrompt: rawText,
    goal: typeof request?.goal === "string" && request.goal.trim() ? request.goal : rawText,
    nameHint: typeof request?.nameHint === "string" ? request.nameHint : undefined,
  };
}

function normalizeClassification(
  classification: Partial<IntentClassification> | undefined,
  candidate?: Partial<IntentSchema>,
): IntentClassification {
  const validKinds = new Set([
    "micro-feature",
    "standalone-system",
    "cross-system-composition",
    "ui-surface",
    "unknown",
  ]);

  let intentKind =
    typeof classification?.intentKind === "string" && validKinds.has(classification.intentKind)
      ? classification.intentKind
      : "unknown";

  if (candidate && hasCrossSystemCompositionSemantics(candidate)) {
    intentKind = "cross-system-composition";
  }

  if (candidate && isCanonicalCandidateDrawGovernanceCore(candidate) && !hasCrossSystemCompositionSemantics(candidate)) {
    intentKind = "standalone-system";
  }

  if (intentKind === "ui-surface" && candidate && hasNonUiGameplaySemantics(candidate)) {
    intentKind = "micro-feature";
  }

  return {
    intentKind,
    confidence: isOneOf(classification?.confidence, ["low", "medium", "high"])
      ? classification.confidence
      : "medium",
  };
}

function isCanonicalCandidateDrawGovernanceCore(candidate: Partial<IntentSchema>): boolean {
  const hasCandidatePool =
    candidate.selection?.source === "weighted-pool" ||
    candidate.selection?.source === "candidate-collection" ||
    (candidate.contentModel?.collections || []).some((collection) => collection.role === "candidate-options");
  const hasSingleChoice =
    candidate.selection?.choiceMode === "user-chosen" &&
    candidate.selection?.cardinality === "single";
  const hasUiSelectionSurface =
    candidate.uiRequirements?.needed === true &&
    (candidate.uiRequirements?.surfaces || []).some((surface) => {
      const normalized = surface.toLowerCase();
      return normalized.includes("selection") || normalized.includes("modal") || normalized.includes("card");
    });

  return Boolean(hasCandidatePool && hasSingleChoice && hasUiSelectionSurface);
}

function normalizeRequirements(
  requirements: Partial<IntentRequirements> | undefined,
): IntentRequirements {
  return {
    functional: normalizeStringArray(requirements?.functional),
    typed: Array.isArray(requirements?.typed)
      ? requirements.typed
          .filter(
            (item): item is NonNullable<IntentRequirements["typed"]>[number] =>
              typeof item === "object" && item !== null,
          )
          .map((item, index) => ({
            id: typeof item.id === "string" && item.id.trim() ? item.id : `req_${index}`,
            kind: isOneOf(item.kind, ["trigger", "state", "rule", "effect", "resource", "ui", "integration", "generic"])
              ? item.kind
              : "generic",
            summary:
              typeof item.summary === "string" && item.summary.trim()
                ? item.summary
                : "Unspecified requirement",
            actors: normalizeStringArray(item.actors),
            inputs: normalizeStringArray(item.inputs),
            outputs: normalizeStringArray(item.outputs),
            invariants: normalizeStringArray(item.invariants),
            parameters:
              typeof item.parameters === "object" && item.parameters !== null
                ? item.parameters
                : undefined,
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
  constraints: Partial<IntentConstraints> | undefined,
): IntentConstraints {
  return {
    requiredPatterns: undefined,
    forbiddenPatterns: undefined,
    hostConstraints: normalizeStringArray(constraints?.hostConstraints),
    nonFunctional: normalizeStringArray(constraints?.nonFunctional),
  };
}

function inferInventoryStoreSelectedItems(rawText: string): boolean {
  return /store|stored|save to inventory|加入库存|进入库存|放进去|存入/i.test(rawText);
}

function normalizeInteraction(
  interaction: Partial<IntentInteractionContract> | undefined,
): IntentInteractionContract | undefined {
  if (!interaction || !Array.isArray(interaction.activations)) {
    return undefined;
  }

  const activations = interaction.activations
    .filter(
      (item): item is NonNullable<IntentInteractionContract["activations"]>[number] =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      actor: typeof item.actor === "string" && item.actor.trim() ? item.actor : undefined,
      kind: isOneOf(item.kind, ["key", "mouse", "event", "passive", "system"]) ? item.kind : "event",
      input: typeof item.input === "string" && item.input.trim() ? item.input : undefined,
      phase: isOneOf(item.phase, ["press", "release", "hold", "enter", "occur"]) ? item.phase : undefined,
      repeatability: isOneOf(item.repeatability, ["one-shot", "repeatable", "toggle", "persistent"])
        ? item.repeatability
        : undefined,
      confirmation: isOneOf(item.confirmation, ["none", "implicit", "explicit"])
        ? item.confirmation
        : undefined,
    }))
    .filter((item) => !!item.input || item.kind === "passive" || item.kind === "system" || item.kind === "event");

  return activations.length > 0 ? { activations } : undefined;
}

function normalizeTargeting(
  targeting: Partial<IntentTargetingContract> | undefined,
): IntentTargetingContract | undefined {
  if (!targeting) {
    return undefined;
  }

  const normalized: IntentTargetingContract = {
    subject: isOneOf(targeting.subject, ["self", "ally", "enemy", "unit", "point", "area", "direction", "global"])
      ? targeting.subject
      : undefined,
    selector: isOneOf(targeting.selector, ["cursor", "current-target", "nearest", "random", "none"])
      ? targeting.selector
      : undefined,
    teamScope: isOneOf(targeting.teamScope, ["self", "ally", "enemy", "any"])
      ? targeting.teamScope
      : undefined,
  };

  return normalized.subject || normalized.selector || normalized.teamScope ? normalized : undefined;
}

function normalizeTiming(
  timing: Partial<IntentTimingContract> | undefined,
): IntentTimingContract | undefined {
  if (!timing) {
    return undefined;
  }

  const normalized: IntentTimingContract = {
    cooldownSeconds: normalizePositiveNumber(timing.cooldownSeconds),
    delaySeconds: normalizePositiveNumber(timing.delaySeconds),
    intervalSeconds: normalizePositiveNumber(timing.intervalSeconds),
    duration:
      timing.duration && isOneOf(timing.duration.kind, ["instant", "timed", "persistent"])
        ? {
            kind: timing.duration.kind,
            seconds: normalizePositiveNumber(timing.duration.seconds),
          }
        : undefined,
  };

  return normalized.cooldownSeconds !== undefined ||
    normalized.delaySeconds !== undefined ||
    normalized.intervalSeconds !== undefined ||
    normalized.duration !== undefined
    ? normalized
    : undefined;
}

function normalizeSpatial(
  spatial: Partial<IntentSpatialContract> | undefined,
): IntentSpatialContract | undefined {
  if (!spatial) {
    return undefined;
  }

  const normalized: IntentSpatialContract = {
    motion:
      spatial.motion && isOneOf(spatial.motion.kind, ["dash", "teleport", "knockback", "none"])
        && spatial.motion.kind !== "none"
        ? {
            kind: spatial.motion.kind,
            distance: normalizePositiveNumber(spatial.motion.distance),
            direction: isOneOf(spatial.motion.direction, ["cursor", "facing", "target", "fixed"])
              ? spatial.motion.direction
              : undefined,
          }
        : undefined,
    area:
      spatial.area && isOneOf(spatial.area.shape, ["circle", "line", "cone"])
      && (
        normalizePositiveNumber(spatial.area.radius) !== undefined ||
        normalizePositiveNumber(spatial.area.length) !== undefined ||
        normalizePositiveNumber(spatial.area.width) !== undefined
      )
        ? {
            shape: spatial.area.shape,
            radius: normalizePositiveNumber(spatial.area.radius),
            length: normalizePositiveNumber(spatial.area.length),
            width: normalizePositiveNumber(spatial.area.width),
          }
        : undefined,
    emission:
      spatial.emission && isOneOf(spatial.emission.kind, ["projectile", "pulse", "wave", "none"])
        && spatial.emission.kind !== "none"
        ? {
            kind: spatial.emission.kind,
            speed: normalizePositiveNumber(spatial.emission.speed),
            count: normalizePositiveInteger(spatial.emission.count),
          }
        : undefined,
  };

  return normalized.motion || normalized.area || normalized.emission ? normalized : undefined;
}

function normalizeUIRequirements(
  ui: Partial<UIRequirementSummary> | undefined,
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
  stateModel: Partial<IntentStateContract> | undefined,
): IntentStateContract | undefined {
  if (!stateModel || !Array.isArray(stateModel.states)) {
    return undefined;
  }

  const states = stateModel.states
    .filter(
      (item): item is IntentStateContract["states"][number] =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `state_${index}`,
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified state",
      owner: isOneOf(item.owner, ["feature", "session", "external"]) ? item.owner : undefined,
      lifetime: isOneOf(item.lifetime, ["ephemeral", "session", "persistent"])
        ? item.lifetime
        : undefined,
      kind: isOneOf(item.kind, ["scalar", "counter", "collection", "inventory", "selection-session", "generic"])
        ? item.kind
        : undefined,
      mutationMode: isOneOf(item.mutationMode, ["create", "update", "consume", "expire", "remove"])
        ? item.mutationMode
        : undefined,
    }));

  return states.length > 0 ? { states } : undefined;
}

function normalizeFlow(
  flow: Partial<IntentFlowContract> | undefined,
  rawText: string,
): IntentFlowContract | undefined {
  if (!flow) {
    return undefined;
  }

  const loweredPrompt = rawText.toLowerCase();

  return {
    triggerSummary: typeof flow.triggerSummary === "string" ? flow.triggerSummary : undefined,
    sequence: normalizeStringArray(flow.sequence),
    supportsCancel: flow.supportsCancel === true && mentionsCancelSemantics(loweredPrompt),
    supportsRetry: flow.supportsRetry === true && mentionsRetrySemantics(loweredPrompt),
    requiresConfirmation: flow.requiresConfirmation === true && mentionsConfirmationSemantics(loweredPrompt),
  };
}

function normalizeSelection(
  selection: Partial<IntentSelectionContract> | undefined,
  promptHints: PromptSemanticHints,
): IntentSelectionContract | undefined {
  if (!selection && !promptHints.candidatePool && !promptHints.playerChoice) {
    return undefined;
  }

  const inferredMode = promptHints.weightedDraw
    ? "weighted"
    : promptHints.playerChoice && promptHints.candidatePool
      ? "user-chosen"
      : undefined;
  const inferredSource = promptHints.weightedDraw
    ? "weighted-pool"
    : promptHints.candidatePool
      ? "candidate-collection"
      : undefined;
  const inferredChoiceMode = promptHints.playerChoice
    ? "user-chosen"
    : promptHints.weightedDraw
      ? "weighted"
      : undefined;
  const inferredCardinality = promptHints.committedCount === 1
    ? "single"
    : promptHints.committedCount && promptHints.committedCount > 1
      ? "multiple"
      : undefined;
  const normalizedInventory =
    promptHints.inventory || selection?.inventory?.enabled === true
      ? {
          enabled: true,
          capacity: promptHints.inventoryCapacity,
          storeSelectedItems:
            inferInventoryStoreSelectedItems(promptHints.normalizedText)
            || selection?.inventory?.storeSelectedItems === true
              ? true
              : undefined,
          blockDrawWhenFull:
            promptHints.inventoryBlocksWhenFull || selection?.inventory?.blockDrawWhenFull === true
              ? true
              : undefined,
          fullMessage: promptHints.inventoryFullMessage,
          presentation:
            promptHints.inventory || selection?.inventory?.presentation === "persistent_panel"
              ? "persistent_panel" as const
              : undefined,
        }
      : undefined;

  const normalizedSelection: IntentSelectionContract = {
    mode: promptHints.weightedDraw
      ? "weighted"
      : isOneOf(selection?.mode, ["deterministic", "weighted", "filtered", "user-chosen", "hybrid"])
        ? selection.mode
        : inferredMode,
    source: promptHints.weightedDraw
      ? "weighted-pool"
      : isOneOf(selection?.source, ["none", "candidate-collection", "weighted-pool", "filtered-pool"])
        ? selection.source
        : inferredSource,
    choiceMode: isOneOf(selection?.choiceMode, ["none", "user-chosen", "random", "weighted", "hybrid"])
      ? promptHints.playerChoice
        ? "user-chosen"
        : selection.choiceMode
      : inferredChoiceMode,
    cardinality: isOneOf(selection?.cardinality, ["single", "multiple"])
      ? selection.cardinality
      : inferredCardinality,
    choiceCount: promptHints.candidateCount ?? normalizePositiveInteger(selection?.choiceCount),
    repeatability: isOneOf(selection?.repeatability, ["one-shot", "repeatable", "persistent"])
      ? selection.repeatability
      : undefined,
    duplicatePolicy: promptHints.noRepeatAfterSelection
      ? "forbid"
      : isOneOf(selection?.duplicatePolicy, ["allow", "avoid", "forbid"])
        ? selection.duplicatePolicy
        : undefined,
    commitment: promptHints.immediateOutcome
      ? "immediate"
      : isOneOf(selection?.commitment, ["immediate", "confirm", "deferred"])
        ? selection.commitment
        : undefined,
    inventory: promptHints.inventory ? normalizedInventory : undefined,
  };

  const hasExplicitSelectionSemantics =
    promptHints.candidatePool ||
    promptHints.playerChoice ||
    promptHints.weightedDraw ||
    normalizedSelection.mode === "weighted" ||
    normalizedSelection.mode === "filtered" ||
    normalizedSelection.mode === "user-chosen" ||
    normalizedSelection.mode === "hybrid" ||
    normalizedSelection.source === "candidate-collection" ||
    normalizedSelection.source === "weighted-pool" ||
    normalizedSelection.source === "filtered-pool" ||
    normalizedSelection.choiceMode === "user-chosen" ||
    normalizedSelection.choiceMode === "random" ||
    normalizedSelection.choiceMode === "weighted" ||
    normalizedSelection.choiceMode === "hybrid" ||
    typeof normalizedSelection.choiceCount === "number" ||
    normalizedSelection.inventory?.enabled === true;

  if (!hasExplicitSelectionSemantics) {
    return undefined;
  }

  return normalizedSelection;
}

function normalizeEffects(
  effects: Partial<IntentEffectContract> | undefined,
): IntentEffectContract | undefined {
  if (!effects) {
    return undefined;
  }

  const operations = Array.isArray(effects.operations)
    ? effects.operations.filter((item): item is IntentEffectContract["operations"][number] =>
        isOneOf(item, ["apply", "remove", "stack", "expire", "consume", "restore"]),
      )
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

function normalizeOutcomes(
  outcomes: Partial<IntentOutcomeContract> | undefined,
): IntentOutcomeContract | undefined {
  if (!outcomes) {
    return undefined;
  }

  const operations = Array.isArray(outcomes.operations)
    ? outcomes.operations.filter((item): item is NonNullable<IntentOutcomeContract["operations"]>[number] =>
        isOneOf(item, [
          "apply-effect",
          "move",
          "spawn",
          "grant-feature",
          "update-state",
          "consume-resource",
          "emit-event",
        ]),
      )
    : [];

  return operations.length > 0 ? { operations } : undefined;
}

function normalizeContentModel(
  contentModel: Partial<IntentContentModelContract> | undefined,
  promptHints: PromptSemanticHints,
): IntentContentModelContract | undefined {
  if (!contentModel || !Array.isArray(contentModel.collections)) {
    if (!promptHints.candidatePool) {
      return undefined;
    }

    return {
      collections: [buildPromptDerivedCandidateCollection(promptHints)],
    };
  }

  const collections = contentModel.collections
    .filter(
      (item): item is NonNullable<IntentContentModelContract["collections"]>[number] =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `collection_${index}`,
      role: isOneOf(item.role, ["candidate-options", "spawnables", "progress-items", "generic"])
        ? item.role
        : promptHints.candidatePool
          ? "candidate-options"
          : "generic",
      ownership: isOneOf(item.ownership, ["feature", "shared", "external"])
        ? item.ownership
        : promptHints.candidatePool
          ? "feature"
          : undefined,
      updateMode: isOneOf(item.updateMode, ["replace", "merge", "append"])
        ? item.updateMode
        : promptHints.candidatePool
          ? "replace"
          : undefined,
      itemSchema: Array.isArray(item.itemSchema)
        ? item.itemSchema
            .filter(
              (schemaItem): schemaItem is NonNullable<
                NonNullable<IntentContentModelContract["collections"]>[number]["itemSchema"]
              >[number] => typeof schemaItem === "object" && schemaItem !== null,
            )
            .map((schemaItem) => ({
              name: typeof schemaItem.name === "string" && schemaItem.name.trim() ? schemaItem.name : "field",
              type: isOneOf(schemaItem.type, ["string", "number", "boolean", "enum", "effect-ref", "object-ref"])
                ? schemaItem.type
                : "string",
              required: schemaItem.required === true,
              semanticRole:
                typeof schemaItem.semanticRole === "string" && schemaItem.semanticRole.trim()
                  ? schemaItem.semanticRole
                  : undefined,
            }))
        : promptHints.candidatePool
          ? buildPromptDerivedCandidateCollection(promptHints).itemSchema
          : undefined,
    }));

  return collections.length > 0
    ? { collections }
    : promptHints.candidatePool
      ? { collections: [buildPromptDerivedCandidateCollection(promptHints)] }
      : undefined;
}

function normalizeComposition(
  composition: Partial<IntentCompositionContract> | undefined,
): IntentCompositionContract | undefined {
  if (!composition || !Array.isArray(composition.dependencies)) {
    return undefined;
  }

  const dependencies = composition.dependencies
    .filter(
      (item): item is NonNullable<IntentCompositionContract["dependencies"]>[number] =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      kind: isOneOf(item.kind, ["same-feature", "cross-feature", "external-system"])
        ? item.kind
        : "external-system",
      relation: isOneOf(item.relation, ["reads", "writes", "triggers", "grants", "syncs-with"])
        ? item.relation
        : "reads",
      target: typeof item.target === "string" && item.target.trim() ? item.target : undefined,
      required: item.required === true,
    }));

  return dependencies.length > 0 ? { dependencies } : undefined;
}

function normalizeIntegrations(
  integrations: Partial<IntentIntegrationContract> | undefined,
): IntentIntegrationContract | undefined {
  if (!integrations || !Array.isArray(integrations.expectedBindings)) {
    return undefined;
  }

  const expectedBindings = integrations.expectedBindings
    .filter(
      (item): item is IntentIntegrationContract["expectedBindings"][number] =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `binding_${index}`,
      kind: isOneOf(item.kind, ["entry-point", "event-hook", "bridge-point", "ui-surface", "data-source"])
        ? item.kind
        : "entry-point",
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified binding",
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
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified invariant",
      severity: isOneOf(item.severity, ["error", "warning"]) ? item.severity : "warning",
    }));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeUncertainties(
  uncertainties: unknown,
  promptHints: PromptSemanticHints,
): IntentUncertainty[] | undefined {
  if (!Array.isArray(uncertainties)) {
    return undefined;
  }

  const normalized = uncertainties
    .filter((item): item is IntentUncertainty => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `uncertainty_${index}`,
      summary:
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary
          : "Unspecified uncertainty",
      affects: Array.isArray(item.affects)
        ? item.affects.filter((value): value is IntentUncertainty["affects"][number] =>
            isOneOf(value, ["intent", "blueprint", "pattern", "realization"]),
          )
        : [],
      severity: isOneOf(item.severity, ["low", "medium", "high"]) ? item.severity : "medium",
    }))
    .filter((item) => !shouldSuppressBoundedCandidateDrawDetail(item.summary, promptHints));

  return normalized.length > 0 ? normalized : undefined;
}

function mergeUncertainties(
  primary: IntentUncertainty[] | undefined,
  secondary: IntentUncertainty[] | undefined,
): IntentUncertainty[] | undefined {
  const merged = [...(primary || []), ...(secondary || [])];
  if (merged.length === 0) {
    return undefined;
  }

  const deduped = new Map<string, IntentUncertainty>();
  for (const item of merged) {
    const key = `${item.summary}::${item.affects.join(",")}::${item.severity}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return [...deduped.values()];
}

function normalizeLegacyClarificationSignals(
  candidate: Partial<IntentSchema>,
  promptHints: PromptSemanticHints,
): IntentUncertainty[] | undefined {
  const legacyCandidate = candidate as Partial<IntentSchema> & {
    requiredClarifications?: unknown;
    openQuestions?: unknown;
  };
  const legacyClarifications = Array.isArray(legacyCandidate.requiredClarifications)
    ? legacyCandidate.requiredClarifications
    : [];
  const legacyOpenQuestions = normalizeStringArray(legacyCandidate.openQuestions);

  const clarifications = legacyClarifications
    .filter((item): item is LegacyRequiredClarification => typeof item === "object" && item !== null)
    .filter(
      (item) =>
        !shouldSuppressBoundedCandidateDrawDetail(item.question || "", promptHints)
        && !isBoundedVariabilityQuestion(item.question || ""),
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `legacy_clarification_${index + 1}`,
      summary:
        typeof item.question === "string" && item.question.trim()
          ? item.question.trim()
          : "Legacy clarification signal retained as uncertainty.",
      affects: ["intent", "blueprint"] as IntentUncertainty["affects"],
      severity: item.blocksFinalization === true ? ("high" as const) : ("medium" as const),
    }));

  const openQuestionUncertainties = legacyOpenQuestions
    .filter((question) => !shouldSuppressBoundedCandidateDrawDetail(question, promptHints))
    .map((question, index) => ({
      id: `legacy_open_question_${index + 1}`,
      summary: question,
      affects: ["intent"] as IntentUncertainty["affects"],
      severity: "medium" as const,
    }));

  const merged = [...clarifications, ...openQuestionUncertainties];
  return merged.length > 0 ? merged : undefined;
}

function normalizeNormalizedMechanics(
  mechanics: Partial<NormalizedMechanics> | undefined,
  candidate: Partial<IntentSchema>,
  promptHints: PromptSemanticHints,
): NormalizedMechanics {
  const interaction = candidate.interaction;
  const selection = candidate.selection;
  const uiRequirements = candidate.uiRequirements;
  const outcomes = candidate.outcomes;
  const effects = candidate.effects;
  const contentModel = candidate.contentModel;

  const hasInteractiveActivation =
    (interaction?.activations || []).some((activation) => activation.kind !== "passive");
  const hasCandidateCollection =
    selection?.source === "candidate-collection" ||
    selection?.source === "weighted-pool" ||
    selection?.source === "filtered-pool" ||
    selection?.choiceMode === "user-chosen" ||
    selection?.choiceMode === "weighted" ||
    selection?.choiceMode === "hybrid" ||
    selection?.mode === "weighted" ||
    selection?.mode === "filtered" ||
    selection?.mode === "user-chosen" ||
    selection?.mode === "hybrid" ||
    (contentModel?.collections || []).some((collection) => collection.role === "candidate-options");
  const hasWeightedSelection =
    selection?.choiceMode === "weighted" ||
    selection?.choiceMode === "hybrid" ||
    selection?.source === "weighted-pool" ||
    selection?.mode === "weighted" ||
    selection?.mode === "hybrid" ||
    promptHints.weightedDraw;
  const hasPlayerChoice =
    selection?.choiceMode === "user-chosen" ||
    selection?.choiceMode === "hybrid" ||
    selection?.mode === "user-chosen" ||
    selection?.mode === "hybrid";
  const hasModalSurface =
    (uiRequirements?.surfaces || []).some((surface) => {
      const normalized = surface.toLowerCase();
      return normalized.includes("modal") || normalized.includes("dialog");
    }) || hasPlayerChoice;
  const hasOutcomeApplication =
    (outcomes?.operations || []).length > 0 ||
    (effects?.operations || []).length > 0 ||
    !!candidate.spatial?.motion ||
    !!candidate.spatial?.emission;
  const hasResourceConsumption =
    (outcomes?.operations || []).includes("consume-resource") ||
    (candidate.requirements?.typed || []).some(
      (requirement) =>
        requirement.kind === "resource" &&
        /consume|cost|spend|mana|health|energy|resource cost/i.test(
          `${requirement.summary} ${(requirement.inputs || []).join(" ")} ${(requirement.outputs || []).join(" ")}`,
        ),
    );
  const hasFacetEvidence =
    !!interaction ||
    !!selection ||
    !!uiRequirements ||
    !!outcomes ||
    !!effects ||
    !!candidate.spatial ||
    !!contentModel;

  return {
    trigger: hasInteractiveActivation || (!hasFacetEvidence && mechanics?.trigger === true),
    candidatePool: hasCandidateCollection || (!hasFacetEvidence && mechanics?.candidatePool === true),
    weightedSelection: hasWeightedSelection || (!hasFacetEvidence && mechanics?.weightedSelection === true),
    playerChoice: hasPlayerChoice || (!hasFacetEvidence && mechanics?.playerChoice === true),
    uiModal: hasModalSurface || (!hasFacetEvidence && mechanics?.uiModal === true),
    outcomeApplication: hasOutcomeApplication || (!hasFacetEvidence && mechanics?.outcomeApplication === true),
    resourceConsumption: hasResourceConsumption || (!hasFacetEvidence && mechanics?.resourceConsumption === true),
  };
}

function normalizeModuleSafeParameters(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      result[key] = entry;
      continue;
    }

    if (Array.isArray(entry) && entry.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")) {
      result[key] = entry;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeResolvedAssumptions(
  value: unknown,
  promptHints: PromptSemanticHints,
): string[] {
  const normalized = new Set(normalizeStringArray(value));

  if (promptHints.noRepeatAfterSelection && !promptHints.explicitPersistence) {
    normalized.add("Selection no-repeat history defaults to session scope unless persistence is explicitly requested.");
  }

  return [...normalized];
}

interface IntentSchemaCanonicalizationResult {
  candidate: Partial<IntentSchema>;
  uncertainties?: IntentUncertainty[];
  resolvedAssumptions: string[];
}

function canonicalizeStructuredCandidateDrawIntentSchema(input: {
  candidate: Partial<IntentSchema>;
  rawText: string;
  promptHints: PromptSemanticHints;
  uncertainties?: IntentUncertainty[];
  resolvedAssumptions: string[];
}): IntentSchemaCanonicalizationResult {
  const { candidate, promptHints } = input;
  const choiceCount = promptHints.candidateCount ?? normalizePositiveInteger(candidate.selection?.choiceCount);

  if (
    !choiceCount ||
    !isStructuredCandidateDrawCanonicalizationEligible(candidate, input.rawText, promptHints)
  ) {
    return {
      candidate,
      uncertainties: input.uncertainties,
      resolvedAssumptions: input.resolvedAssumptions,
    };
  }

  return {
    candidate: {
      ...candidate,
      requirements: buildCanonicalCandidateDrawRequirements(candidate, promptHints, choiceCount),
      selection: buildCanonicalCandidateDrawSelection(choiceCount, promptHints),
      stateModel: buildCanonicalCandidateDrawStateModel(),
      contentModel: {
        collections: [buildCanonicalCandidateDrawCollection(promptHints)],
      },
      composition: undefined,
      timing: undefined,
      effects: {
        operations: ["apply", "remove"],
      },
      outcomes: {
        operations: ["apply-effect", "update-state"],
      },
      uiRequirements: buildCanonicalCandidateDrawUiRequirements(promptHints),
      parameters: buildCanonicalCandidateDrawParameters(candidate, choiceCount, promptHints),
    },
    uncertainties: filterStructuredCandidateDrawUncertainties(input.uncertainties, promptHints),
    resolvedAssumptions: buildCanonicalCandidateDrawResolvedAssumptions(promptHints),
  };
}

function isStructuredCandidateDrawCanonicalizationEligible(
  candidate: Partial<IntentSchema>,
  rawText: string,
  promptHints: PromptSemanticHints,
): boolean {
  const choiceCount = promptHints.candidateCount ?? normalizePositiveInteger(candidate.selection?.choiceCount);
  const cardinality =
    candidate.selection?.cardinality ||
    (promptHints.committedCount === 1 ? "single" : undefined);

  if (!choiceCount || cardinality !== "single") {
    return false;
  }

  if (promptHints.explicitPersistence || hasExplicitCrossFeatureSignal(rawText) || promptHints.inventory) {
    return false;
  }

  const hasCandidatePoolSemantics =
    promptHints.candidatePool ||
    (candidate.contentModel?.collections || []).some((collection) => collection.role === "candidate-options") ||
    candidate.selection?.source === "candidate-collection" ||
    candidate.selection?.source === "weighted-pool" ||
    candidate.selection?.source === "filtered-pool";
  const hasUserChoiceSemantics =
    promptHints.playerChoice ||
    candidate.selection?.choiceMode === "user-chosen" ||
    candidate.selection?.choiceMode === "hybrid" ||
    candidate.selection?.mode === "user-chosen" ||
    candidate.selection?.mode === "hybrid";
  const hasWeightedCandidateSemantics =
    promptHints.weightedDraw ||
    promptHints.rarityDisplay ||
    candidate.selection?.source === "weighted-pool" ||
    candidate.selection?.mode === "weighted";
  const hasUiSurface =
    promptHints.uiSurface ||
    candidate.uiRequirements?.needed === true ||
    (candidate.uiRequirements?.surfaces || []).some((surface) => {
      const normalizedSurface = surface.toLowerCase();
      return normalizedSurface.includes("selection")
        || normalizedSurface.includes("modal")
        || normalizedSurface.includes("dialog")
        || normalizedSurface.includes("card");
    });
  const hasPoolMutationSemantics =
    promptHints.noRepeatAfterSelection ||
    hasSelectionEligibilityRemovalSignal(rawText) ||
    hasReturnToPoolSignal(rawText) ||
    candidate.selection?.duplicatePolicy === "forbid" ||
    (candidate.requirements?.functional || []).some((entry) =>
      /future draws|future eligibility|return.*pool|unchosen.*pool/i.test(entry),
    ) ||
    (candidate.resolvedAssumptions || []).some((entry) =>
      /future draws|session scope|return.*pool|unchosen.*pool/i.test(entry),
    );
  const requestsOneShotOnly = /one[- ]shot|single[- ]use|only once|一次性|只能一次/i.test(rawText);

  return Boolean(
    hasCandidatePoolSemantics &&
      hasUserChoiceSemantics &&
      hasWeightedCandidateSemantics &&
      hasUiSurface &&
      hasPoolMutationSemantics &&
      !requestsOneShotOnly,
  );
}

function buildCanonicalCandidateDrawRequirements(
  candidate: Partial<IntentSchema>,
  promptHints: PromptSemanticHints,
  choiceCount: number,
): IntentRequirements {
  const functional = [
    `${describeCanonicalCandidateDrawTrigger(candidate.interaction)} opens a current-feature candidate selection UI.`,
    `Draw ${choiceCount} weighted candidates from a feature-owned pool.`,
    "Present the drawn candidates for a single player choice.",
    "Apply the chosen candidate result immediately.",
    "Remove the selected candidate from future draw eligibility within the same feature/session.",
    "Return unchosen candidates to the same feature-owned pool for future draws.",
  ];

  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    functional.push("Candidate rarity influences draw weights and selection presentation.");
  }

  return {
    functional,
    typed: [
      {
        id: "candidate_draw_local_trigger",
        kind: "trigger",
        summary: "Capture one local trigger that opens the candidate selection flow.",
        priority: "must",
      },
      {
        id: "candidate_draw_feature_pool",
        kind: "state",
        summary: "Maintain a feature-owned candidate pool for future draws.",
        priority: "must",
      },
      {
        id: "candidate_draw_weighted_rule",
        kind: "rule",
        summary: `Draw ${choiceCount} weighted candidates from the local pool.`,
        priority: "must",
      },
      {
        id: "candidate_draw_single_choice_commit",
        kind: "rule",
        summary: "Let the player choose exactly one candidate and commit it immediately.",
        priority: "must",
      },
      {
        id: "candidate_draw_session_tracking",
        kind: "state",
        summary: "Track selected eligibility removal and pool updates in same-feature session state.",
        priority: "must",
      },
    ],
    interactions: candidate.requirements?.interactions,
    dataNeeds: candidate.requirements?.dataNeeds,
    outputs: candidate.requirements?.outputs,
  };
}

function describeCanonicalCandidateDrawTrigger(
  interaction: IntentInteractionContract | undefined,
): string {
  const activation = (interaction?.activations || []).find((entry) => entry.kind !== "passive");
  if (!activation) {
    return "A local trigger";
  }

  if (activation.kind === "key" && activation.input) {
    return `Pressing ${activation.input.toUpperCase()}`;
  }

  if (activation.input) {
    return `The local ${activation.kind} input ${activation.input}`;
  }

  return "A local trigger";
}

function buildCanonicalCandidateDrawSelection(
  choiceCount: number,
  promptHints: PromptSemanticHints,
): IntentSelectionContract {
  return {
    mode: "weighted",
    source: "weighted-pool",
    choiceMode: "user-chosen",
    cardinality: "single",
    choiceCount,
    repeatability: "repeatable",
    duplicatePolicy: "forbid",
    commitment: "immediate",
  };
}

function buildCanonicalCandidateDrawStateModel(): IntentStateContract {
  return {
    states: [
      {
        id: "candidate_pool_state",
        summary: "Tracks the feature-owned candidate pool and future draw eligibility.",
        owner: "feature",
        lifetime: "session",
        kind: "collection",
        mutationMode: "update",
      },
      {
        id: "selection_commit_state",
        summary: "Tracks the most recent committed candidate choice for the current feature session.",
        owner: "feature",
        lifetime: "session",
        kind: "selection-session",
        mutationMode: "update",
      },
    ],
  };
}

function buildCanonicalCandidateDrawUiRequirements(
  promptHints: PromptSemanticHints,
): UIRequirementSummary {
  const surfaces = new Set<string>(["selection_modal"]);
  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    surfaces.add("rarity_cards");
  }

  return {
    needed: true,
    surfaces: [...surfaces],
  };
}

function buildCanonicalCandidateDrawCollection(
  promptHints: PromptSemanticHints,
): NonNullable<IntentContentModelContract["collections"]>[number] {
  const collection = buildPromptDerivedCandidateCollection(promptHints);
  const itemSchema = [...(collection.itemSchema || [])];

  if (!itemSchema.some((item) => item.semanticRole === "selected-outcome")) {
    itemSchema.push({
      name: "effect",
      type: "effect-ref",
      required: false,
      semanticRole: "selected-outcome",
    });
  }

  return {
    ...collection,
    itemSchema,
  };
}

function buildCanonicalCandidateDrawParameters(
  candidate: Partial<IntentSchema>,
  choiceCount: number,
  promptHints: PromptSemanticHints,
): Record<string, unknown> {
  const triggerKey = (candidate.interaction?.activations || []).find((activation) => activation.kind === "key")?.input;
  const parameters: Record<string, unknown> = {
    drawCount: choiceCount,
    selectionCount: 1,
    applyImmediately: true,
    removeChosenFromFutureDraws: true,
    returnUnchosenToPool: true,
  };

  if (typeof triggerKey === "string" && triggerKey.trim()) {
    parameters.triggerKey = triggerKey.toUpperCase();
  }

  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    parameters.weightedBy = "rarity";
  }

  return parameters;
}

function stripPersistentTiming(
  timing: IntentTimingContract | undefined,
): IntentTimingContract | undefined {
  if (!timing) {
    return undefined;
  }

  const normalized: IntentTimingContract = {
    cooldownSeconds: timing.cooldownSeconds,
    delaySeconds: timing.delaySeconds,
    intervalSeconds: timing.intervalSeconds,
    duration:
      timing.duration?.kind && timing.duration.kind !== "persistent"
        ? timing.duration
        : undefined,
  };

  return normalized.cooldownSeconds !== undefined ||
    normalized.delaySeconds !== undefined ||
    normalized.intervalSeconds !== undefined ||
    normalized.duration !== undefined
    ? normalized
    : undefined;
}

function stripPersistentEffectSemantics(
  effects: IntentEffectContract | undefined,
): IntentEffectContract | undefined {
  if (!effects) {
    return undefined;
  }

  const operations = effects.operations.filter((operation) =>
    isOneOf(operation, ["apply", "remove", "stack", "expire", "consume", "restore"]),
  );

  if (operations.length === 0 && effects.durationSemantics === "persistent") {
    return undefined;
  }

  return {
    operations: operations.length > 0 ? operations : ["apply"],
    targets: normalizeStringArray(effects.targets),
    durationSemantics: effects.durationSemantics === "persistent" ? undefined : effects.durationSemantics,
  };
}

function filterStructuredCandidateDrawUncertainties(
  uncertainties: IntentUncertainty[] | undefined,
  promptHints: PromptSemanticHints,
): IntentUncertainty[] | undefined {
  if (!uncertainties) {
    return undefined;
  }

  const filtered = uncertainties.filter((item) =>
    !shouldSuppressBoundedCandidateDrawDetail(item.summary, promptHints),
  );

  return filtered.length > 0 ? filtered : undefined;
}

function buildCanonicalCandidateDrawResolvedAssumptions(
  promptHints: PromptSemanticHints,
): string[] {
  const assumptions = new Set<string>([
    "Selection eligibility updates stay feature-owned and session-local unless persistence is explicitly requested.",
    "Selected candidates leave future draw eligibility within the same feature/session.",
    "Unchosen candidates remain available in the same feature-owned pool for future draws.",
  ]);

  if (promptHints.rarityDisplay || promptHints.weightedDraw) {
    assumptions.add("Rarity-weighted draw and presentation remain local to the same feature selection flow.");
  }

  return [...assumptions];
}

function buildPromptDerivedCandidateCollection(
  promptHints: PromptSemanticHints,
): NonNullable<IntentContentModelContract["collections"]>[number] {
  const itemSchema: NonNullable<
    NonNullable<IntentContentModelContract["collections"]>[number]["itemSchema"]
  > = [
    {
      name: "id",
      type: "string",
      required: true,
      semanticRole: "stable-option-id",
    },
  ];

  if (promptHints.weightedDraw) {
    itemSchema.push({
      name: "weight",
      type: "number",
      required: false,
      semanticRole: "selection-weight",
    });
  }

  if (promptHints.rarityDisplay) {
    itemSchema.push({
      name: "rarity",
      type: "enum",
      required: false,
      semanticRole: "display-rarity",
    });
  }

  if (promptHints.immediateOutcome) {
    itemSchema.push({
      name: "effect",
      type: "effect-ref",
      required: false,
      semanticRole: "selected-outcome",
    });
  }

  return {
    id: "candidate_options",
    role: "candidate-options",
    ownership: "feature",
    updateMode: "replace",
    itemSchema,
  };
}

function withGlobalFlag(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
}

function hasNegatedSignalPrefix(rawText: string, index: number): boolean {
  const prefix = rawText.slice(Math.max(0, index - 24), index).toLowerCase();
  return /(?:不要|不需要|无需|别|不能|禁止|without|no|do not)\s*(?:any\s*)?$/iu.test(prefix);
}

function hasUnnegatedSignal(rawText: string, pattern: RegExp): boolean {
  const matcher = withGlobalFlag(pattern);
  for (const match of rawText.matchAll(matcher)) {
    const index = match.index ?? -1;
    if (index < 0 || !hasNegatedSignalPrefix(rawText, index)) {
      return true;
    }
  }
  return false;
}

const PERSISTENCE_SIGNAL_PATTERN =
  /persist|persistence|save|saved|cross match|cross-session|persistent|across matches|cross-match|跨局|跨对局|跨会话|持久|持久化|永久保存/iu;
const CROSS_FEATURE_SIGNAL_PATTERN =
  /grant feature|grant another feature|cross-feature|cross feature|授予另一个|授予技能|另一个技能|跨 feature/iu;
const UI_SIGNAL_PATTERN =
  /ui|modal|dialog|panel|window|cards?|界面|窗口|卡牌|弹窗|面板/iu;
const INVENTORY_SIGNAL_PATTERN =
  /inventory|backpack|storage|persistent panel|库存|仓库|背包|槽位|格子/iu;

function hasExplicitCrossFeatureSignal(rawText: string): boolean {
  return hasUnnegatedSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN);
}

function hasSelectionEligibilityRemovalSignal(rawText: string): boolean {
  return /remove from future eligibility|remove from later draws|leave future draw eligibility|later draws|future draws|permanently remove|permanently removed|姘镐箙绉婚櫎|绉诲嚭鎶藉彇姹?/i.test(
    rawText,
  );
}

function hasReturnToPoolSignal(rawText: string): boolean {
  return /unchosen.*return.*pool|return unchosen.*pool|return the unchosen.*pool|return the others.*pool|returns to the pool|back to the pool|back into the pool|put .* back into the pool|return .* to the pool|鏈€変腑.*杩斿洖.*姹?|鏈€変腑.*鍥炴睜/i.test(
    rawText,
  );
}

function collectPromptSemanticHints(rawText: string): PromptSemanticHints {
  const normalizedText = rawText.toLowerCase();
  const triChoiceMatch = rawText.match(/([1-5一二两三四五])\s*选\s*([1-5一二两三四五])/i);
  const candidateCount =
    (triChoiceMatch ? parsePromptCountToken(triChoiceMatch[1]) : undefined) ||
    extractPromptCount(
      rawText,
      /(\d+|[一二两三四五])\s*(?:个|张)?\s*(?:候选对象|候选项|候选|选项|choices?|options?|candidates?)/i,
    ) ||
    extractPromptCount(
      rawText,
      /(?:show|draw|draft|display|抽出|抽取|展示|显示)\s*(\d+|[一二两三四五])/i,
    );
  const committedCount =
    (triChoiceMatch ? parsePromptCountToken(triChoiceMatch[2]) : undefined) ||
    extractPromptCount(
      rawText,
      /(?:choose|select|pick|选|选择)\s*(\d+|[一二两三四五])\s*(?:个|张)?/i,
    );
  const candidatePool =
    /candidate|pool|draw|draft|deck|候选|对象池|候选池|池|抽取|抽卡|抽出|卡池/i.test(rawText);
  const playerChoice = /choose|select|pick|选择|选中|从.+选/i.test(rawText);
  const rarityDisplay = /weight|weighted|rarity|tier|权重|加权|稀有度|稀有/i.test(rawText);
  const weightedDraw =
    /weight|weighted|权重|加权/i.test(rawText) ||
    (rarityDisplay && candidatePool);
  const inventory = hasUnnegatedSignal(rawText, INVENTORY_SIGNAL_PATTERN);
  const inventoryCapacity =
    extractPromptCount(rawText, /(\d+)\s*(?:slots?|格)/i) ||
    extractPromptCount(rawText, /(?:inventory|panel|capacity|容量)(?:\s*(?:to|of|为|=))?\s*(\d+)/i);
  const inventoryFullMessageMatch =
    rawText.match(/(?:inventory\s+full|库存已满|库存满了|满了后(?:显示)?|显示)\s*["“]([^"”]+)["”]/i) ||
    rawText.match(/["“]([^"”]+)["”].*(?:inventory\s+full|库存已满|库存满了)/i);
  const inventoryBlocksWhenFull =
    /inventory full.*(?:stop|block|no longer|cannot)|库存满了.*(?:不再|停止|不能|无法)|满了后.*(?:不再|停止|不能|无法)/i.test(
      rawText,
    );
  const noRepeatAfterSelection =
    /no longer appear|do not appear again|not appear again|remove from future draws|already selected.*not appear|已选.*不再出现|后续不再出现|不会再出现|不再重复出现/i.test(
      rawText,
    );
  const immediateOutcome =
    /immediately|immediate|apply.*immediately|立即应用|立刻生效|马上生效|选中后立即/i.test(rawText);
  const explicitPersistence = hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN);
  const uiSurface = hasUnnegatedSignal(rawText, UI_SIGNAL_PATTERN);

  return {
    normalizedText,
    candidateCount,
    committedCount,
    inventoryCapacity,
    inventoryFullMessage:
      typeof inventoryFullMessageMatch?.[1] === "string" && inventoryFullMessageMatch[1].trim()
        ? inventoryFullMessageMatch[1].trim()
        : undefined,
    candidatePool,
    weightedDraw,
    playerChoice,
    inventory,
    inventoryBlocksWhenFull,
    noRepeatAfterSelection,
    immediateOutcome,
    explicitPersistence,
    rarityDisplay,
    uiSurface,
  };
}

function buildFallbackNameHint(rawText: string): string | undefined {
  const tokens = rawText
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .split("_")
    .filter(Boolean)
    .slice(0, 6);
  return tokens.length > 0 ? tokens.join("_") : undefined;
}

function buildFallbackFunctionalRequirement(rawText: string): string {
  const trimmed = rawText.trim();
  return trimmed.length > 0
    ? trimmed
    : "Interpret the user's requested gameplay or UI behavior.";
}

function inferFallbackIntentKind(
  rawText: string,
  composition: IntentCompositionContract | undefined,
  uiRequirements: UIRequirementSummary | undefined,
): IntentClassification["intentKind"] {
  const text = rawText.toLowerCase();
  if ((composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature" || dependency.kind === "external-system")) {
    return "cross-system-composition";
  }

  const gameplaySignals = [
    "press",
    "key",
    "trigger",
    "dash",
    "move",
    "draw",
    "draft",
    "apply",
    "passive",
    "aura",
    "按",
    "触发",
    "冲刺",
    "移动",
    "抽",
    "选择",
    "被动",
    "光环",
  ];
  const hasPositiveUiSignal = hasUnnegatedSignal(rawText, UI_SIGNAL_PATTERN);

  const hasGameplay = gameplaySignals.some((signal) => text.includes(signal));
  const hasUi = hasPositiveUiSignal || uiRequirements?.needed === true;

  if (!hasGameplay && hasUi) {
    return "ui-surface";
  }

  if (text.includes("system") || text.includes("framework") || text.includes("engine") || text.includes("系统")) {
    return "standalone-system";
  }

  return "micro-feature";
}

function buildFallbackInteraction(rawText: string): IntentInteractionContract | undefined {
  const text = rawText.toLowerCase();
  const keyMatch =
    rawText.match(/(?:press|hit|tap|bind|when)\s+(f\d+|[a-z])/i) ||
    rawText.match(/按(?:下)?\s*(f\d+|[a-z])/i) ||
    rawText.match(/触发键[：:\s]*(f\d+|[a-z])/i);

  if (keyMatch?.[1]) {
    return {
      activations: [
        {
          kind: "key",
          input: keyMatch[1].toUpperCase(),
          phase: "press",
          repeatability: text.includes("toggle") || text.includes("切换")
            ? "toggle"
            : text.includes("hold") || text.includes("持续按住")
              ? "persistent"
              : "repeatable",
        },
      ],
    };
  }

  if (text.includes("passive") || text.includes("aura") || text.includes("被动") || text.includes("光环")) {
    return {
      activations: [
        {
          kind: "passive",
          repeatability: "persistent",
        },
      ],
    };
  }

  return undefined;
}

function buildFallbackTargeting(rawText: string): IntentTargetingContract | undefined {
  const text = rawText.toLowerCase();

  if (text.includes("cursor") || text.includes("mouse") || text.includes("鼠标")) {
    return {
      subject: text.includes("direction") || text.includes("toward") || text.includes("朝") || text.includes("向")
        ? "direction"
        : "point",
      selector: "cursor",
      teamScope: "self",
    };
  }

  if (text.includes("ally") || text.includes("friendly") || text.includes("友军")) {
    return {
      subject: "ally",
      selector: "none",
      teamScope: "ally",
    };
  }

  if (text.includes("enemy") || text.includes("敌人") || text.includes("敌方")) {
    return {
      subject: "enemy",
      selector: "none",
      teamScope: "enemy",
    };
  }

  if (text.includes("self") || text.includes("自身")) {
    return {
      subject: "self",
      selector: "none",
      teamScope: "self",
    };
  }

  return undefined;
}

function buildFallbackTiming(rawText: string): IntentTimingContract | undefined {
  const text = rawText.toLowerCase();
  const cooldownMatch = rawText.match(/(?:cooldown|冷却(?:时间)?)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  const durationMatch = rawText.match(/(?:duration|持续(?:时间)?)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  const intervalMatch = rawText.match(/(?:every|interval|每隔)\s*(\d+(?:\.\d+)?)\s*(?:seconds?|秒)?/i);
  const persistent = hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN);

  if (!cooldownMatch && !durationMatch && !intervalMatch && !persistent) {
    return undefined;
  }

  return {
    cooldownSeconds: normalizePositiveNumber(cooldownMatch?.[1]),
    delaySeconds: undefined,
    intervalSeconds: normalizePositiveNumber(intervalMatch?.[1]),
    duration: persistent
      ? { kind: "persistent" }
      : durationMatch
        ? { kind: "timed", seconds: normalizePositiveNumber(durationMatch[1]) }
        : undefined,
  };
}

function buildFallbackSpatial(rawText: string): IntentSpatialContract | undefined {
  const text = rawText.toLowerCase();
  const distanceMatch =
    rawText.match(/(\d+(?:\.\d+)?)\s*(?:units?|码|yards?)/i) ||
    rawText.match(/(?:distance|range|距离|冲刺距离)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);

  if (text.includes("dash") || text.includes("move") || text.includes("teleport") || text.includes("冲刺") || text.includes("移动") || text.includes("传送")) {
    return {
      motion: {
        kind: text.includes("teleport") || text.includes("传送") ? "teleport" : "dash",
        distance: normalizePositiveNumber(distanceMatch?.[1]),
        direction: text.includes("cursor") || text.includes("mouse") || text.includes("鼠标")
          ? "cursor"
          : text.includes("facing") || text.includes("朝向")
            ? "facing"
            : undefined,
      },
    };
  }

  return undefined;
}

function buildFallbackSelection(
  rawText: string,
  promptHints: PromptSemanticHints,
): IntentSelectionContract | undefined {
  if (!promptHints.candidatePool && !promptHints.playerChoice) {
    return undefined;
  }

  const text = rawText.toLowerCase();
  const capacityMatch =
    rawText.match(/(\d+)\s*(?:slots?|格)/i) ||
    rawText.match(/(?:inventory|panel|capacity|容量)(?:\s*(?:to|of|为|=))?\s*(\d+)/i);

  return {
    mode: promptHints.weightedDraw ? "weighted" : promptHints.playerChoice ? "user-chosen" : "deterministic",
    source: promptHints.weightedDraw ? "weighted-pool" : promptHints.candidatePool ? "candidate-collection" : "none",
    choiceMode: promptHints.playerChoice ? "user-chosen" : promptHints.weightedDraw ? "weighted" : "none",
    choiceCount: promptHints.candidateCount,
    cardinality: promptHints.committedCount && promptHints.committedCount > 1 ? "multiple" : "single",
    repeatability: text.includes("repeatable") || text.includes("可重复") ? "repeatable" : promptHints.explicitPersistence ? "persistent" : "one-shot",
    duplicatePolicy: promptHints.noRepeatAfterSelection ? "forbid" : undefined,
    commitment: promptHints.immediateOutcome ? "immediate" : text.includes("confirm") || text.includes("确认") ? "confirm" : undefined,
    inventory: promptHints.inventory
      ? {
          enabled: true,
          capacity: normalizePositiveInteger(capacityMatch?.[1]),
          storeSelectedItems: inferInventoryStoreSelectedItems(rawText) ? true : undefined,
          blockDrawWhenFull: promptHints.inventoryBlocksWhenFull ? true : undefined,
          fullMessage: promptHints.inventoryFullMessage,
          presentation: promptHints.uiSurface ? "persistent_panel" : undefined,
        }
      : undefined,
  };
}

function buildFallbackOutcomes(
  rawText: string,
  spatial: IntentSpatialContract | undefined,
  selection: IntentSelectionContract | undefined,
): IntentOutcomeContract | undefined {
  const operations = new Set<NonNullable<IntentOutcomeContract["operations"]>[number]>();

  if (spatial?.motion) {
    operations.add("move");
  }
  if (selection) {
    operations.add("apply-effect");
  }
  if (hasUnnegatedSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN)) {
    operations.add("grant-feature");
  }
  if (hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN)) {
    operations.add("update-state");
  }

  return operations.size > 0 ? { operations: [...operations] } : undefined;
}

function buildFallbackContentModel(
  promptHints: PromptSemanticHints,
  selection: IntentSelectionContract | undefined,
): IntentContentModelContract | undefined {
  if (!promptHints.candidatePool && !selection) {
    return undefined;
  }

  return {
    collections: [
      {
        id: "feature_content",
        role: promptHints.candidatePool ? "candidate-options" : "generic",
        ownership: "feature",
        updateMode: "replace",
      },
    ],
  };
}

function buildFallbackComposition(rawText: string): IntentCompositionContract | undefined {
  const dependencies: NonNullable<IntentCompositionContract["dependencies"]> = [];

  if (hasUnnegatedSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN)) {
    dependencies.push({
      kind: "cross-feature",
      relation: "grants",
      required: true,
    });
  }

  if (hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN)) {
    dependencies.push({
      kind: "external-system",
      relation: "writes",
      required: true,
    });
  }

  return dependencies.length > 0 ? { dependencies } : undefined;
}

function buildFallbackUiRequirements(
  rawText: string,
  promptHints: PromptSemanticHints,
  selection: IntentSelectionContract | undefined,
): UIRequirementSummary | undefined {
  const text = rawText.toLowerCase();
  const needed =
    promptHints.uiSurface ||
    hasUnnegatedSignal(rawText, UI_SIGNAL_PATTERN);

  if (!needed) {
    return undefined;
  }

  const surfaces = new Set<string>();
  if (selection) {
    surfaces.add("selection_modal");
  }
  if (promptHints.rarityDisplay || text.includes("rarity") || text.includes("稀有度")) {
    surfaces.add("rarity_cards");
  }
  if (promptHints.inventory || hasUnnegatedSignal(rawText, INVENTORY_SIGNAL_PATTERN)) {
    surfaces.add("inventory_panel");
  }

  return {
    needed: true,
    surfaces: [...surfaces],
  };
}

function buildFallbackStateModel(
  rawText: string,
  selection: IntentSelectionContract | undefined,
  composition: IntentCompositionContract | undefined,
): IntentStateContract | undefined {
  const states: NonNullable<IntentStateContract["states"]> = [];

  if (selection) {
    states.push({
      id: "active_selection_state",
      summary: "Tracks the active selection or draw session state.",
      owner: "feature",
      lifetime: selection.repeatability === "persistent" ? "persistent" : "session",
      kind: selection.inventory?.enabled ? "inventory" : "selection-session",
      mutationMode: "update",
    });
  }

  if (
    (composition?.dependencies || []).some((dependency) => dependency.kind === "external-system") ||
    hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN)
  ) {
    states.push({
      id: "persistent_progression_state",
      summary: "Tracks behavior or progression that the user wants to preserve across sessions or matches.",
      owner: "external",
      lifetime: "persistent",
      kind: "generic",
      mutationMode: "update",
    });
  }

  return states.length > 0 ? { states } : undefined;
}

function buildFallbackUncertainties(
  rawText: string,
  composition: IntentCompositionContract | undefined,
): IntentUncertainty[] | undefined {
  const uncertainties: IntentUncertainty[] = [];
  const text = rawText.toLowerCase();

  if (
    (composition?.dependencies || []).some((dependency) => dependency.kind === "cross-feature") &&
    hasUnnegatedSignal(rawText, CROSS_FEATURE_SIGNAL_PATTERN) &&
    !text.includes("feature ") &&
    !text.includes("feature_") &&
    !text.includes("技能 ")
  ) {
    uncertainties.push({
      id: "unc_cross_feature_target",
      summary: "The request implies cross-feature coupling, but the exact target feature is not specified.",
      affects: ["intent", "blueprint"],
      severity: "high" as const,
    });
  }

  if (
    (composition?.dependencies || []).some((dependency) => dependency.kind === "external-system") &&
    hasUnnegatedSignal(rawText, PERSISTENCE_SIGNAL_PATTERN) &&
    !text.includes("save") &&
    !text.includes("storage") &&
    !text.includes("nettable") &&
    !text.includes("数据库")
  ) {
    uncertainties.push({
      id: "unc_persistence_owner",
      summary: "Persistence is requested, but the exact storage or ownership boundary is not specified.",
      affects: ["intent", "blueprint"],
      severity: "high" as const,
    });
  }

  return uncertainties.length > 0 ? uncertainties : undefined;
}

function buildFallbackTypedRequirements(input: {
  rawText: string;
  interaction: IntentInteractionContract | undefined;
  selection: IntentSelectionContract | undefined;
  spatial: IntentSpatialContract | undefined;
  outcomes: IntentOutcomeContract | undefined;
  composition: IntentCompositionContract | undefined;
  uiRequirements: UIRequirementSummary | undefined;
}): IntentRequirements["typed"] | undefined {
  const typed: NonNullable<IntentRequirements["typed"]> = [];

  if (input.interaction?.activations?.length) {
    typed.push({
      id: "fallback_trigger",
      kind: "trigger",
      summary: "Capture and interpret the requested activation boundary.",
      priority: "must",
    });
  }

  if (input.selection) {
    typed.push({
      id: "fallback_selection",
      kind: "rule",
      summary: "Run the requested candidate selection or draft flow.",
      priority: "must",
    });
  }

  if (input.spatial?.motion || (input.outcomes?.operations || []).includes("move")) {
    typed.push({
      id: "fallback_motion",
      kind: "effect",
      summary: "Apply the requested movement or spatial outcome.",
      priority: "must",
    });
  }

  if (input.uiRequirements?.needed) {
    typed.push({
      id: "fallback_ui",
      kind: "ui",
      summary: "Expose the requested player-facing UI surface or feedback.",
      priority: "should",
    });
  }

  if ((input.composition?.dependencies || []).length > 0) {
    typed.push({
      id: "fallback_composition",
      kind: "integration",
      summary: "Preserve the requested coupling with another feature or external system.",
      priority: "must",
    });
  }

  if (typed.length === 0) {
    typed.push({
      id: "fallback_generic",
      kind: "generic",
      summary: buildFallbackFunctionalRequirement(input.rawText),
      priority: "must",
    });
  }

  return typed;
}

function extractFallbackScalarParameters(rawText: string): Record<string, unknown> | undefined {
  const parameters: Record<string, unknown> = {};
  const keyMatch =
    rawText.match(/(?:press|hit|tap|bind|when)\s+(f\d+|[a-z])/i) ||
    rawText.match(/按(?:下)?\s*(f\d+|[a-z])/i) ||
    rawText.match(/触发键[：:\s]*(f\d+|[a-z])/i);
  const choiceCountMatch =
    rawText.match(/(\d+)\s*(?:choices?|options?|candidates?|选项|候选)/i) ||
    rawText.match(/(?:show|draw|open|生成)\s*(\d+)/i);
  const committedCountMatch =
    rawText.match(/pick\s*(\d+)/i) ||
    rawText.match(/choose\s*(\d+)/i) ||
    rawText.match(/选\s*(\d+)/i);
  const distanceMatch =
    rawText.match(/(\d+(?:\.\d+)?)\s*(?:units?|码|yards?)/i) ||
    rawText.match(/(?:distance|range|距离|冲刺距离)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  const durationMatch = rawText.match(/(?:duration|持续(?:时间)?)(?:\s*(?:to|of|为|=))?\s*(\d+(?:\.\d+)?)/i);
  const capacityMatch =
    rawText.match(/(\d+)\s*(?:slots?|格)/i) ||
    rawText.match(/(?:inventory|panel|capacity|容量)(?:\s*(?:to|of|为|=))?\s*(\d+)/i);

  if (keyMatch?.[1]) {
    parameters.triggerKey = keyMatch[1].toUpperCase();
  }
  if (choiceCountMatch?.[1]) {
    const value = normalizePositiveInteger(choiceCountMatch[1]);
    if (typeof value === "number") {
      parameters.choiceCount = value;
    }
  }
  if (committedCountMatch?.[1]) {
    const value = normalizePositiveInteger(committedCountMatch[1]);
    if (typeof value === "number") {
      parameters.commitCount = value;
    }
  }
  if (distanceMatch?.[1]) {
    const value = normalizePositiveNumber(distanceMatch[1]);
    if (typeof value === "number") {
      parameters.distance = value;
    }
  }
  if (durationMatch?.[1]) {
    const value = normalizePositiveNumber(durationMatch[1]);
    if (typeof value === "number") {
      parameters.durationSeconds = value;
    }
  }
  if (capacityMatch?.[1]) {
    const value = normalizePositiveInteger(capacityMatch[1]);
    if (typeof value === "number") {
      parameters.capacity = value;
    }
  }

  return Object.keys(parameters).length > 0 ? parameters : undefined;
}

function parsePromptCountToken(token: string | undefined): number | undefined {
  if (!token) {
    return undefined;
  }

  const trimmed = token.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const map: Record<string, number> = {
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
  };

  return map[trimmed];
}

function extractPromptCount(rawText: string, pattern: RegExp): number | undefined {
  const match = rawText.match(pattern);
  return match ? parsePromptCountToken(match[1]) : undefined;
}

function isStructuredCandidateDrawPrompt(promptHints: PromptSemanticHints): boolean {
  return Boolean(
    promptHints.candidatePool &&
      promptHints.playerChoice &&
      (promptHints.candidateCount || promptHints.weightedDraw || promptHints.rarityDisplay),
  );
}

function shouldSuppressBoundedCandidateDrawDetail(
  value: unknown,
  promptHints: PromptSemanticHints,
): boolean {
  if (typeof value !== "string" || !isStructuredCandidateDrawPrompt(promptHints)) {
    return false;
  }

  const text = value.toLowerCase();
  const isPersistenceNoise =
    !promptHints.explicitPersistence &&
    /persist|persistence|cross match|cross-session|current session|current match|session-only|跨局|跨会话|持久|持久化|本局|当前会话/i.test(
      value,
    );
  const isPoolDepletionNoise =
    /remaining.*less than|fewer than|pool exhaustion|exhaustion|show fewer|reset the pool|剩余.*少于|不足\s*\d|候选.*少于|候选池耗尽|重置候选池/i.test(
      value,
    );
  const isCatalogNoise =
    /specific|concrete|catalog|candidate contents|effect definitions|what are the choices|which choices|which options|object definitions|具体效果|具体内容|候选对象的来源和具体内容|对象池中的对象|图标|名称|描述|稀有度有哪几个等级|label|icon|copy/i.test(
      value,
    );
  const isPresentationNoise =
    promptHints.uiSurface &&
    /modal|dialog|panel|popup|presentation|surface|界面形式|弹窗|面板|窗口/i.test(text);

  return isPersistenceNoise || isPoolDepletionNoise || isCatalogNoise || isPresentationNoise;
}

function isBoundedVariabilityQuestion(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const question = value.toLowerCase();
  const detailHints = [
    "specific",
    "specific choices",
    "specific options",
    "catalog",
    "list",
    "names",
    "descriptions",
    "available choices",
    "available options",
    "choice list",
    "option list",
    "exact effects",
    "selected result",
    "result list",
    "effect list",
    "icon",
    "resource path",
    "attribute values",
    "stat values",
    "what are the three choices",
    "which choices",
    "which options",
    "具体内容",
    "具体数值",
    "具体选项",
    "选项内容",
    "候选池内容",
    "效果列表",
    "结果列表",
    "列表",
    "名称",
    "描述",
    "图标",
    "资源路径",
    "属性",
    "选项",
    "结果",
    "效果",
  ];
  const architectureHints = [
    "what triggers",
    "trigger condition",
    "which system",
    "integrate with",
    "state model",
    "persist",
    "persistence",
    "触发",
    "联动",
    "系统",
    "状态模型",
    "持久化",
  ];

  const mentionsDetail = detailHints.some((hint) => question.includes(hint));
  const mentionsArchitecture = architectureHints.some((hint) => question.includes(hint));

  return mentionsDetail && !mentionsArchitecture;
}

function hasNonUiGameplaySemantics(candidate: Partial<IntentSchema>): boolean {
  if ((candidate.requirements?.typed || []).some((requirement) => requirement.kind !== "ui")) {
    return true;
  }

  if ((candidate.interaction?.activations?.length || 0) > 0) {
    return true;
  }

  if (
    !!candidate.selection?.mode ||
    !!candidate.selection?.choiceMode ||
    !!candidate.selection?.choiceCount ||
    !!candidate.selection?.source
  ) {
    return true;
  }

  if ((candidate.effects?.operations?.length || 0) > 0 || (candidate.outcomes?.operations?.length || 0) > 0) {
    return true;
  }

  if (!!candidate.spatial?.motion || !!candidate.spatial?.emission) {
    return true;
  }

  if ((candidate.stateModel?.states?.length || 0) > 0 || (candidate.contentModel?.collections?.length || 0) > 0) {
    return true;
  }

  if ((candidate.composition?.dependencies?.length || 0) > 0) {
    return true;
  }

  return (candidate.integrations?.expectedBindings || []).some((binding) => binding.kind !== "ui-surface");
}

function hasCrossSystemCompositionSemantics(candidate: Partial<IntentSchema>): boolean {
  if (
    (candidate.composition?.dependencies || []).some(
      (dependency) => dependency.kind === "cross-feature" || dependency.kind === "external-system",
    )
  ) {
    return true;
  }

  if (
    (candidate.outcomes?.operations || []).includes("grant-feature") &&
    (
      candidate.timing?.duration?.kind === "persistent" ||
      (candidate.stateModel?.states || []).some((state) => state.lifetime === "persistent") ||
      (candidate.integrations?.expectedBindings || []).some((binding) => binding.kind === "data-source")
    )
  ) {
    return true;
  }

  return false;
}

function mentionsCancelSemantics(value: string): boolean {
  return [
    "cancel",
    "dismiss",
    "close without",
    "close the modal",
    "cancelable",
    "取消",
    "关闭",
    "可取消",
  ].some((token) => value.includes(token));
}

function mentionsRetrySemantics(value: string): boolean {
  return [
    "retry",
    "try again",
    "重试",
    "再次尝试",
  ].some((token) => value.includes(token));
}

function mentionsConfirmationSemantics(value: string): boolean {
  return [
    "confirm",
    "confirmation",
    "double confirm",
    "二次确认",
    "确认",
  ].some((token) => value.includes(token));
}

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

function normalizePositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return undefined;
}

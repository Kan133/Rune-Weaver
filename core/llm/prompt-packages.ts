import type {
  Blueprint,
  CurrentFeatureContext,
  FeatureContract,
  FeatureDependencyEdge,
  PromptConstraintBundle,
  PromptPackageId,
  RetrievalBundle,
  SynthesisTargetProfile,
  UnresolvedModuleNeed,
} from "../schema/types.js";
import type { LLMMessage } from "./types.js";
import type { WizardClarificationAnswer } from "../wizard/types.js";
import { extractPromptConstraints, renderPromptConstraints } from "./prompt-constraints.js";

export interface WorkflowPromptPackage {
  id: PromptPackageId;
  messages: LLMMessage[];
  promptConstraints: PromptConstraintBundle;
  retrievalBundle?: RetrievalBundle;
}

interface WizardPackageInput {
  rawText: string;
  hostSummary: string;
  retrievalBundle?: RetrievalBundle;
  refinementContext?: {
    priorSchema?: unknown;
    clarificationTranscript?: WizardClarificationAnswer[];
  };
}

interface UpdateWizardPackageInput extends WizardPackageInput {
  currentFeatureContext: CurrentFeatureContext;
}

interface SynthesisPromptInput {
  featureId: string;
  blueprint: Blueprint;
  moduleNeed: UnresolvedModuleNeed;
  targetProfile: SynthesisTargetProfile;
  targetPath?: string;
  existingContent?: string;
  retrievalBundle?: RetrievalBundle;
}

interface RepairPromptInput {
  featureId: string;
  moduleId?: string;
  boundaryId: string;
  targetFile: string;
  targetExcerpt: string;
  diagnostics: string[];
  fillContractSummary: string;
  originalModuleContract?: Record<string, unknown>;
  retrievalBundle?: RetrievalBundle;
}

function renderRetrievalBundle(bundle?: RetrievalBundle): string {
  if (!bundle || bundle.evidenceRefs.length === 0) {
    return "No retrieval evidence attached.";
  }

  return [
    `Retrieval summary: ${bundle.summary}`,
    `Tiers used: ${bundle.tiersUsed.join(", ")}`,
    "Evidence refs:",
    ...bundle.evidenceRefs.map((item) =>
      `- [${item.sourceKind}] ${item.title}${item.section ? ` :: ${item.section}` : ""}${item.symbol ? ` (symbol=${item.symbol})` : ""}`,
    ),
  ].join("\n");
}

function buildWizardFewShots(): LLMMessage[] {
  const examples = [
    {
      user: "做一个主动技能，不要UI，不要inventory，不要persistence。按Q向鼠标方向冲刺400距离。",
      assistant: {
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["Pressing Q dashes the player 400 units toward the cursor with no UI or persistence layers."] },
        interaction: { activations: [{ kind: "key", input: "Q", phase: "press", repeatability: "repeatable" }] },
        targeting: { subject: "self", selector: "cursor", teamScope: "self" },
        spatial: { motion: { kind: "dash", distance: 400, direction: "cursor" } },
        outcomes: { operations: ["move"] },
        uiRequirements: { needed: false, surfaces: [] },
        uncertainties: [],
      },
    },
    {
      user: "按F4从池里抽3个候选，玩家选1个立即生效，但不要做库存或常驻panel。",
      assistant: {
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["F4 opens a three-choice selection flow and applies the selected result immediately without inventory or persistent panel semantics."] },
        interaction: { activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }] },
        selection: {
          mode: "user-chosen",
          source: "candidate-collection",
          choiceMode: "user-chosen",
          choiceCount: 3,
          cardinality: "single",
          repeatability: "repeatable",
          commitment: "immediate",
        },
        contentModel: {
          collections: [{ id: "candidate_options", role: "candidate-options", ownership: "feature", updateMode: "replace" }],
        },
        uiRequirements: { needed: false, surfaces: [] },
        outcomes: { operations: ["apply-effect"] },
        uncertainties: [],
      },
    },
    {
      user: "Press F4 to draw 3 rarity-weighted candidates from a local pool, show them on cards, let the player choose 1, apply it immediately, remove the chosen one from future draws, and return the unchosen ones to the pool.",
      assistant: {
        classification: { intentKind: "standalone-system", confidence: "high" },
        requirements: {
          functional: [
            "Pressing F4 opens a current-feature selection flow that draws 3 rarity-weighted candidates, lets the player choose 1, applies it immediately, removes the selected candidate from future draw eligibility, and returns unchosen candidates to the pool.",
          ],
        },
        interaction: { activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }] },
        selection: {
          mode: "weighted",
          source: "weighted-pool",
          choiceMode: "user-chosen",
          choiceCount: 3,
          cardinality: "single",
          repeatability: "repeatable",
          duplicatePolicy: "forbid",
          commitment: "immediate",
        },
        stateModel: {
          states: [
            {
              id: "candidate_pool_state",
              summary: "Track same-feature draw eligibility and pool mutation in session-local state.",
              owner: "feature",
              lifetime: "session",
              kind: "collection",
              mutationMode: "update",
            },
          ],
        },
        contentModel: {
          collections: [{ id: "candidate_options", role: "candidate-options", ownership: "feature", updateMode: "replace" }],
        },
        uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
        outcomes: { operations: ["apply-effect", "update-state"] },
        resolvedAssumptions: [
          "Removing a selected candidate from future draws is a same-feature eligibility mutation, not persistence.",
        ],
        uncertainties: [],
      },
    },
    {
      user: "Press F4 to draw 3 rarity-weighted candidates, let the player choose 1, apply it immediately, remove it from future draws, and save the unlocked result across matches in external profile storage.",
      assistant: {
        classification: { intentKind: "cross-system-composition", confidence: "high" },
        requirements: {
          functional: [
            "Pressing F4 runs a weighted local selection flow, applies the chosen result immediately, and persists the unlocked result across matches through an external system.",
          ],
        },
        interaction: { activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }] },
        selection: {
          mode: "weighted",
          source: "weighted-pool",
          choiceMode: "user-chosen",
          choiceCount: 3,
          cardinality: "single",
          repeatability: "repeatable",
          duplicatePolicy: "forbid",
          commitment: "immediate",
        },
        stateModel: {
          states: [
            {
              id: "persistent_unlock_state",
              summary: "Track unlocked results that must survive across matches.",
              owner: "external",
              lifetime: "persistent",
              kind: "generic",
              mutationMode: "update",
            },
          ],
        },
        composition: {
          dependencies: [{ kind: "external-system", relation: "writes", required: true }],
        },
        uiRequirements: { needed: true, surfaces: ["selection_modal", "rarity_cards"] },
        outcomes: { operations: ["apply-effect", "update-state"] },
        uncertainties: [],
      },
    },
    {
      user: "Create one gameplay ability feature with no trigger key. It should not auto-attach to the hero. The granted ability shell should remain available for the current match only and must not save across matches or profiles.",
      assistant: {
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: {
          functional: [
            "Define one gameplay ability shell with no trigger key and no automatic attachment.",
            "Treat the shell as current-match runtime state only, not external persistence or profile storage.",
          ],
        },
        interaction: {
          activations: [
            { actor: "system", kind: "system", input: "shell granted", phase: "occur", repeatability: "repeatable", confirmation: "implicit" },
          ],
        },
        timing: {
          duration: { kind: "persistent" },
        },
        stateModel: {
          states: [
            {
              id: "granted_shell_session_state",
              summary: "Track whether the granted shell remains available during the current match.",
              owner: "feature",
              lifetime: "session",
              kind: "generic",
              mutationMode: "update",
            },
          ],
        },
        effects: {
          operations: ["apply"],
          durationSemantics: "persistent",
        },
        resolvedAssumptions: [
          "Runtime or session-long persistence does not imply cross-match save, external storage, or cross-feature targeting.",
        ],
        uncertainties: [],
      },
    },
    {
      user: "Make a system where collected echoes tune a reality lattice and change future pulses.",
      assistant: {
        classification: { intentKind: "standalone-system", confidence: "low" },
        requirements: {
          functional: ["Collected echoes tune a shared reality lattice and influence future pulse behavior."],
          typed: [{ id: "generic_reality_lattice", kind: "generic", summary: "Track the user-described reality-lattice tuning semantics honestly.", priority: "must" }],
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

function buildUpdateFewShots(): LLMMessage[] {
  const examples = [
    {
      user: [
        "Current feature context:",
        JSON.stringify({
          featureId: "selection_pool_demo",
          preservedModuleBackbone: ["input.key_binding", "data.weighted_pool", "rule.selection_flow"],
          admittedSkeleton: ["input.key_binding", "data.weighted_pool", "rule.selection_flow"],
          preservedInvariants: ["Preserve unspecified existing behavior."],
          boundedFields: { triggerKey: "F4", choiceCount: 3 },
        }, null, 2),
        "",
        "Requested update:",
        "只把触发键改成G，其他逻辑不要动。",
      ].join("\n"),
      assistant: {
        requestedChange: {
          classification: { intentKind: "standalone-system", confidence: "high" },
          requirements: { functional: ["Rebind the existing trigger to G without changing other behavior."] },
          interaction: { activations: [{ kind: "key", input: "G", phase: "press", repeatability: "repeatable" }] },
          uncertainties: [],
        },
        resolvedAssumptions: ["Unspecified existing behavior remains preserved."],
      },
    },
    {
      user: [
        "Current feature context:",
        JSON.stringify({
          featureId: "talent_draw_demo",
          preservedModuleBackbone: ["input_trigger", "weighted_pool", "selection_flow", "selection_modal", "effect_application"],
          sourceBackedInvariantRoles: ["input_trigger", "weighted_pool", "selection_flow", "selection_modal", "effect_application"],
          boundedFields: { triggerKey: "F4", choiceCount: 3, inventoryCapacity: 15 },
        }, null, 2),
        "",
        "Requested update:",
        "16格的天赋仓库，如果满了则按F4不能继续抽取天赋。",
      ].join("\n"),
      assistant: {
        requestedChange: {
          classification: { intentKind: "standalone-system", confidence: "high" },
          requirements: {
            functional: ["Expand the existing inventory capacity to 16 and stop opening new draws when the inventory is full."],
          },
          selection: {
            inventory: {
              enabled: true,
              capacity: 16,
              storeSelectedItems: true,
              blockDrawWhenFull: true,
            },
          },
          uncertainties: [],
        },
        resolvedAssumptions: [
          "The existing choiceCount remains unchanged unless the user explicitly changes candidate/display count.",
        ],
      },
    },
    {
      user: [
        "Current feature context:",
        JSON.stringify({
          featureId: "grantable_shell_demo",
          preservedModuleBackbone: ["gameplay_ability"],
          admittedSkeleton: ["gameplay_ability"],
          preservedInvariants: ["Do not add cross-match save or external storage unless explicitly requested."],
          boundedFields: {},
        }, null, 2),
        "",
        "Requested update:",
        "Keep the granted shell available for the current match only. Do not save it across matches or profiles.",
      ].join("\n"),
      assistant: {
        requestedChange: {
          classification: { intentKind: "micro-feature", confidence: "high" },
          requirements: {
            functional: ["Keep the granted shell active for the current match only without cross-match save semantics."],
          },
          timing: {
            duration: { kind: "persistent" },
          },
          stateModel: {
            states: [
              {
                id: "shell_session_state",
                summary: "Track the shell during the current match only.",
                owner: "feature",
                lifetime: "session",
                kind: "generic",
                mutationMode: "update",
              },
            ],
          },
          effects: {
            durationSemantics: "persistent",
          },
          uncertainties: [],
        },
        resolvedAssumptions: [
          "Current-match runtime persistence does not imply cross-match save, profile storage, or external ownership.",
        ],
      },
    },
  ];

  return examples.flatMap((example) => [
    { role: "user" as const, content: example.user },
    { role: "assistant" as const, content: JSON.stringify(example.assistant, null, 2) },
  ]);
}

function renderUpdateFeatureContext(context: CurrentFeatureContext): string {
  const compatibilityContext = context as CurrentFeatureContext & {
    preservedModuleBackbone?: string[];
  };

  const preservedModuleBackbone =
    compatibilityContext.preservedModuleBackbone && compatibilityContext.preservedModuleBackbone.length > 0
      ? compatibilityContext.preservedModuleBackbone
      : [...(context.admittedSkeleton || [])];

  // Keep a one-round legacy alias for old fixtures/examples while promoting the new key.
  return JSON.stringify(
    {
      ...context,
      preservedModuleBackbone,
      admittedSkeleton: preservedModuleBackbone,
    },
    null,
    2,
  );
}

export function buildWizardCreatePromptPackage(input: WizardPackageInput): WorkflowPromptPackage {
  const promptConstraints = extractPromptConstraints({
    rawText: input.rawText,
    clarificationTranscript: input.refinementContext?.clarificationTranscript,
  });
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: [
        "You are Rune Weaver's wizard.create prompt package.",
        "Do not write code.",
        "Convert the user request into a stable semantic IntentSchema.",
        "Always return a best-effort semantic IntentSchema, even when the request is unfamiliar, cross-feature, partially unspecified, or currently unsupported downstream.",
        "Governance is handled downstream; do not output readiness, blocked, weak, or implementation verdicts.",
        "Do not judge implementation readiness, blocked state, blueprint legality, host write feasibility, or runtime support.",
        "Preserve exact scalar facts and explicit negative constraints.",
        "Unless the prompt explicitly asks for cross-match retention, account/profile save, external storage, or a named external owner or boundary, interpret persistent wording as runtime or session-long existence only.",
        'Interpret "removed from future draws", "no longer appear after selection", and "永久移除出抽取池" as same-feature eligibility mutation unless the user explicitly asks for persistence, save/storage, cross-match, or external ownership.',
        "Use uncertainties only when you need to preserve missing or ambiguous semantic information that would materially change interpretation.",
        "Do not invent UI, persistence, cross-feature coupling, inventory, or extra semantics that the user explicitly forbids.",
        "Do not infer or name implementation families, pattern ids, profiles, source models, gap-fill boundaries, or workspace artifacts.",
        "Use uncertainties only to preserve genuinely unresolved semantic gaps.",
        `Host: ${input.hostSummary}`,
        "",
        renderPromptConstraints(promptConstraints),
        "",
        renderRetrievalBundle(input.retrievalBundle),
      ].join("\n"),
    },
    ...buildWizardFewShots(),
    {
      role: "user",
      content: input.refinementContext
        ? [
            `Original request:\n${input.rawText}`,
            input.refinementContext.priorSchema
              ? `Prior schema:\n${JSON.stringify(input.refinementContext.priorSchema, null, 2)}`
              : "",
            input.refinementContext.clarificationTranscript?.length
              ? `Clarification transcript:\n${JSON.stringify(input.refinementContext.clarificationTranscript, null, 2)}`
              : "",
            "Return an updated best-effort IntentSchema that preserves earlier confirmed facts and explicit negative constraints.",
          ].filter(Boolean).join("\n\n")
        : input.rawText,
    },
  ];

  return {
    id: "wizard.create",
    messages,
    promptConstraints,
    retrievalBundle: input.retrievalBundle,
  };
}

export function buildWizardUpdatePromptPackage(input: UpdateWizardPackageInput): WorkflowPromptPackage {
  const promptConstraints = extractPromptConstraints({
    rawText: input.rawText,
    clarificationTranscript: input.refinementContext?.clarificationTranscript,
    currentFeatureContext: input.currentFeatureContext,
  });
  const messages: LLMMessage[] = [
    {
      role: "system",
        content: [
          "You are Rune Weaver's wizard.update prompt package.",
          "Do not write code.",
          "Interpret only the requested change against the current feature context.",
          "Treat preservedModuleBackbone as the primary context field; admittedSkeleton is a one-round legacy alias and should be interpreted identically when present.",
          "Prefer preserve semantics over rebuild semantics.",
          "Do not restate or rebuild the whole existing feature unless the user explicitly asks for a rewrite.",
          "Return only the semantic-only requestedChange candidate and resolved assumptions.",
          "Unless the prompt explicitly asks for cross-match retention, account/profile save, external storage, or a named external owner or boundary, interpret persistent wording as runtime or session-long existence only.",
          'Do not reinterpret "confirm exactly one candidate" or single-confirm invariants as a request to change selection.choiceCount.',
          "Do not output readiness, blocked/weak labels, or implementation verdicts.",
          "Represent unknown or change-sensitive gaps with uncertainties in the requestedChange schema instead of pretending the update is blocked.",
        renderPromptConstraints(promptConstraints),
        "",
        renderRetrievalBundle(input.retrievalBundle),
      ].join("\n"),
    },
    ...buildUpdateFewShots(),
    {
      role: "user",
      content: [
        `Current feature context:\n${renderUpdateFeatureContext(input.currentFeatureContext)}`,
        `Requested update:\n${input.rawText}`,
        input.refinementContext?.priorSchema
          ? `Prior requested-change schema:\n${JSON.stringify(input.refinementContext.priorSchema, null, 2)}`
          : "",
        input.refinementContext?.clarificationTranscript?.length
          ? `Clarification transcript:\n${JSON.stringify(input.refinementContext.clarificationTranscript, null, 2)}`
          : "",
      ].filter(Boolean).join("\n\n"),
    },
  ];

  return {
    id: "wizard.update",
    messages,
    promptConstraints,
    retrievalBundle: input.retrievalBundle,
  };
}

function renderModuleContract(input: {
  moduleNeed: UnresolvedModuleNeed;
  featureContract?: FeatureContract;
  dependencyEdges?: FeatureDependencyEdge[];
}): string {
  return JSON.stringify(
    {
      moduleNeed: input.moduleNeed,
      featureContract: input.featureContract,
      dependencyEdges: input.dependencyEdges || [],
    },
    null,
    2,
  );
}

export function buildModuleSynthesisPromptPackage(input: SynthesisPromptInput): WorkflowPromptPackage {
  const promptConstraints = extractPromptConstraints({
    rawText: input.blueprint.sourceIntent.goal,
  });
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: [
        "You are Rune Weaver's synthesis.module prompt package.",
        "Write host-native code only for the already-declared module need and target profile.",
        "Do not invent new modules, ownership, bridge wiring, cross-feature writes, host targets, or dependency edges.",
        "Stay inside the declared owned scope and declared target profile.",
        "Return only content for the requested artifact target and keep assumptions explicit.",
        renderPromptConstraints(promptConstraints),
        "",
        renderRetrievalBundle(input.retrievalBundle),
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Feature ID: ${input.featureId}`,
        `Target profile: ${input.targetProfile}`,
        input.targetPath ? `Target path: ${input.targetPath}` : "",
        `Blueprint summary: ${input.blueprint.summary}`,
        "Module contract:",
        renderModuleContract({
          moduleNeed: input.moduleNeed,
          featureContract: input.blueprint.featureContract,
          dependencyEdges: input.blueprint.dependencyEdges,
        }),
        input.existingContent
          ? `Deterministic fallback content:\n${input.existingContent}`
          : "",
      ].join("\n\n"),
    },
  ];

  return {
    id: "synthesis.module",
    messages,
    promptConstraints,
    retrievalBundle: input.retrievalBundle,
  };
}

export function buildLocalRepairPromptPackage(input: RepairPromptInput): WorkflowPromptPackage {
  const promptConstraints = extractPromptConstraints({
    rawText: input.diagnostics.join("\n"),
  });
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: [
        "You are Rune Weaver's repair.local prompt package.",
        "Perform only bounded local repair inside the declared fill contract boundary.",
        "Do not change feature contract, dependency edges, host target selection, module list, bridge/lifecycle wiring, or ownership.",
        "Use the failure evidence first and keep the patch minimal.",
        renderPromptConstraints(promptConstraints),
        "",
        renderRetrievalBundle(input.retrievalBundle),
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Feature ID: ${input.featureId}`,
        `Module ID: ${input.moduleId || "(unknown)"}`,
        `Boundary ID: ${input.boundaryId}`,
        `Target file: ${input.targetFile}`,
        `Fill contract summary: ${input.fillContractSummary}`,
        `Diagnostics:\n${input.diagnostics.join("\n")}`,
        `Target excerpt:\n${input.targetExcerpt}`,
        input.originalModuleContract
          ? `Original module contract:\n${JSON.stringify(input.originalModuleContract, null, 2)}`
          : "",
      ].filter(Boolean).join("\n\n"),
    },
  ];

  return {
    id: "repair.local",
    messages,
    promptConstraints,
    retrievalBundle: input.retrievalBundle,
  };
}

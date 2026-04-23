import type {
  IntentSchema,
  SelectionPoolAdmissionDiagnostics,
  SelectionPoolAdmissionFinding,
  SelectionPoolAdmissionVerdict,
  SelectionPoolContractAssessment,
} from "../../../../core/schema/types.js";
import {
  getGovernanceKeyInputs,
  getIntentGovernanceView,
  hasGovernanceExternalOrSharedOwnership,
  hasGovernanceFeatureOwnedCandidateCollection,
  hasGovernancePersistentScope,
} from "../../../../core/wizard/intent-governance-view.js";
import {
  createAdmissionFinding,
  dedupeStrings,
  normalizeFeatureAuthoringParameters,
  parseChoiceCount,
  parseTriggerKey,
  promptHasPostSelectionPoolBehavior,
  promptHasSelectionUiSurface,
  promptHasSingleSelectionCommit,
  resolveSelectionPoolObjectKind,
  SELECTION_POOL_FAMILY_ID,
  SELECTION_POOL_PARAMETER_SURFACE,
  type FeatureAuthoringNormalizationResult,
  type FeatureAuthoringProposal,
  type ResolveSelectionPoolFamilyInput,
  type ResolveSelectionPoolFamilyResult,
  type SelectionPoolDetectionResult,
  type SelectionPoolProposalBuildResult,
} from "./shared.js";
import {
  collectSelectionPoolSourceValidationErrors,
  countSelectionPoolEntries,
} from "./source-model.js";
import { detectSelectionPoolFallbackIntent } from "./fallback-detection.js";
import {
  createBlockedDiagnostics,
  createNotApplicableDiagnostics,
  extractSelectionPoolAdmissionBlockers,
} from "./diagnostics.js";
import { applyPromptMerge, createSelectionPoolSeedProposal, resolveSelectionPoolFillIntentCandidates } from "./seeding.js";

const FAMILY_BLOCK_PATTERNS: Array<{ code: string; test: RegExp; reason: string }> = [
  {
    code: "SELECTION_POOL_MULTI_TRIGGER_NOT_SUPPORTED",
    test: /(?:second trigger|第二个按键|第二个触发键|第二触发|双触发|multi-trigger|toggle key)/i,
    reason: "selection_pool currently admits only one trigger owner under input.key_binding.",
  },
  {
    code: "SELECTION_POOL_MULTI_CONFIRM_NOT_SUPPORTED",
    test: /(?:多次确认|multi-confirm|二次确认|confirm twice)/i,
    reason: "selection_pool currently admits exactly one confirm flow.",
  },
  {
    code: "SELECTION_POOL_PERSISTENCE_NOT_SUPPORTED",
    test: /(?:persist|save file|cross match|跨局|存档|持久化)/i,
    reason: "selection_pool remains session-only and does not admit persistence in the current family contract.",
  },
  {
    code: "SELECTION_POOL_CUSTOM_EFFECT_FAMILY_NOT_SUPPORTED",
    test: /(?:custom effect|new effect family|新的效果族|自定义效果族|dash|projectile|teleport|blink|knockback)/i,
    reason: "selection_pool only admits bounded per-object outcomes and does not admit arbitrary movement/projectile effect families.",
  },
];

function hasFeatureOwnedCollections(schema: IntentSchema): boolean {
  return hasGovernanceFeatureOwnedCandidateCollection(schema);
}

function hasExternalOrSharedOwnership(schema: IntentSchema): boolean {
  return hasGovernanceExternalOrSharedOwnership(schema);
}

function hasPersistentStateRequest(schema: IntentSchema): boolean {
  return hasGovernancePersistentScope(schema);
}

function hasCrossFeatureRequest(schema: IntentSchema): boolean {
  const governance = getIntentGovernanceView(schema);
  return Boolean(
    governance.intentKind === "cross-system-composition" ||
      (governance.composition.dependencies || []).some((dependency) => dependency.kind === "cross-feature") ||
      (governance.outcome.operations || []).includes("grant-feature"),
  );
}

function hasCustomEffectFamilyRequest(schema: IntentSchema): boolean {
  const governance = getIntentGovernanceView(schema);
  return Boolean(
    schema.spatial?.emission?.kind === "projectile" ||
      (governance.outcome.operations || []).includes("move"),
  );
}

function hasMultipleTriggerOwners(schema: IntentSchema): boolean {
  return getGovernanceKeyInputs(schema).length > 1;
}

function collectFamilyBlockFindings(prompt: string): Array<{ code: string; reason: string }> {
  return FAMILY_BLOCK_PATTERNS
    .filter((pattern) => pattern.test.test(prompt))
    .map((pattern) => ({ code: pattern.code, reason: pattern.reason }));
}

function getSelectionPoolSkeletonSignals(schema: IntentSchema): string[] {
  const governance = getIntentGovernanceView(schema);
  return dedupeStrings([
    governance.mechanics.trigger ? "trigger" : undefined,
    governance.mechanics.candidatePool ? "candidate_pool" : undefined,
    governance.mechanics.weightedSelection ? "weighted_selection" : undefined,
    governance.mechanics.playerChoice ? "player_choice" : undefined,
    governance.mechanics.uiModal ? "ui_modal" : undefined,
  ]);
}

function schemaHasSelectionPoolSkeleton(schema: IntentSchema): boolean {
  return getSelectionPoolSkeletonSignals(schema).length === 5;
}

function assessSelectionPoolContract(
  schema: IntentSchema,
  prompt: string,
  proposal: FeatureAuthoringProposal,
): SelectionPoolContractAssessment {
  const governance = getIntentGovernanceView(schema);
  const normalized = normalizeFeatureAuthoringParameters(
    proposal.parameters,
    resolveSelectionPoolObjectKind(proposal.parameters.objectKind) || resolveSelectionPoolObjectKind(proposal.objectKind),
  );
  const candidateCount = governance.selection.choiceCount || parseChoiceCount(prompt);
  const positiveAtoms = new Set([
    "single_local_trigger",
    "feature_owned_candidate_pool",
    "weighted_or_rarity_backed_draw",
    "present_multiple_candidates",
    "choose_exactly_one",
    "current_feature_ui_surface",
    "commit_and_session_tracking",
    "selected_removed_or_unchosen_retained",
  ]);
  const triggerKeyCount = getGovernanceKeyInputs(schema).length;
  const singleLocalTrigger = Boolean(
    governance.mechanics.trigger || parseTriggerKey(prompt) || triggerKeyCount === 1,
  ) && !hasMultipleTriggerOwners(schema);
  const featureOwnedCandidatePool = Boolean(
    governance.mechanics.candidatePool ||
      governance.selection.source === "candidate-collection" ||
      governance.selection.source === "weighted-pool" ||
      hasFeatureOwnedCollections(schema),
  ) && !hasExternalOrSharedOwnership(schema);
  const weightedOrRarityBackedDraw = Boolean(
    governance.mechanics.weightedSelection ||
      governance.selection.source === "weighted-pool" ||
      governance.selection.choiceMode === "weighted" ||
      governance.selection.choiceMode === "hybrid" ||
      /weight|weighted|rarity|tier|权重|加权|稀有度|稀有/i.test(prompt),
  );
  const presentMultipleCandidates = (candidateCount ?? 0) > 1;
  const chooseExactlyOne = Boolean(
    governance.selection.cardinality === "single" ||
      promptHasSingleSelectionCommit(prompt),
  );
  const currentFeatureUiSurface = Boolean(
    governance.mechanics.uiModal ||
      governance.ui.needed === true ||
      (governance.ui.surfaces || []).length > 0 ||
      schema.integrations?.expectedBindings?.some((binding) => binding.kind === "ui-surface") ||
      promptHasSelectionUiSurface(prompt),
  );
  const commitAndSessionTracking = Boolean(
    (governance.state.states || []).some((state) => state.owner === "feature" || state.owner === "session" || state.lifetime === "session") ||
      normalized.inventory?.enabled === true ||
      promptHasPostSelectionPoolBehavior(prompt) ||
      /(?:进入库存|加入库存|store|stored|inventory|session|会话)/i.test(prompt),
  );
  const selectedRemovedOrUnchosenRetained = Boolean(
    promptHasPostSelectionPoolBehavior(prompt) ||
      governance.selection.duplicatePolicy === "forbid",
  );
  const noPersistence = !hasPersistentStateRequest(schema) &&
    !collectFamilyBlockFindings(prompt).some((finding) => finding.code === "SELECTION_POOL_PERSISTENCE_NOT_SUPPORTED");
  const noExternalOwnership = !hasExternalOrSharedOwnership(schema);
  const noSecondTrigger = triggerKeyCount <= 1 &&
    !collectFamilyBlockFindings(prompt).some((finding) => finding.code === "SELECTION_POOL_MULTI_TRIGGER_NOT_SUPPORTED");
  const noMultiConfirm =
    !collectFamilyBlockFindings(prompt).some((finding) => finding.code === "SELECTION_POOL_MULTI_CONFIRM_NOT_SUPPORTED");
  const noArbitraryCustomEffectFamily = !hasCustomEffectFamilyRequest(schema) &&
    !collectFamilyBlockFindings(prompt).some((finding) => finding.code === "SELECTION_POOL_CUSTOM_EFFECT_FAMILY_NOT_SUPPORTED");

  const atoms = [
    {
      atom: "single_local_trigger",
      satisfied: singleLocalTrigger,
      detail: singleLocalTrigger
        ? "Prompt/schema keep selection_pool on a single local trigger owner."
        : "selection_pool compression requires one local trigger owner.",
    },
    {
      atom: "feature_owned_candidate_pool",
      satisfied: featureOwnedCandidatePool,
      detail: featureOwnedCandidatePool
        ? "Candidate pool remains feature-owned inside the current feature boundary."
        : "selection_pool compression requires a feature-owned candidate pool.",
    },
    {
      atom: "weighted_or_rarity_backed_draw",
      satisfied: weightedOrRarityBackedDraw,
      detail: weightedOrRarityBackedDraw
        ? "Prompt/schema provide weighted or rarity-backed draw semantics."
        : "selection_pool compression requires weighted or rarity-backed draw semantics.",
    },
    {
      atom: "present_multiple_candidates",
      satisfied: presentMultipleCandidates,
      detail: presentMultipleCandidates
        ? `Prompt/schema present ${candidateCount ?? normalized.choiceCount} candidates for selection.`
        : "selection_pool compression requires presenting multiple candidates.",
    },
    {
      atom: "choose_exactly_one",
      satisfied: chooseExactlyOne,
      detail: chooseExactlyOne
        ? "Prompt/schema confirm exactly one candidate."
        : "selection_pool compression requires confirming exactly one candidate.",
    },
    {
      atom: "current_feature_ui_surface",
      satisfied: currentFeatureUiSurface,
      detail: currentFeatureUiSurface
        ? "Prompt/schema include a current-feature UI selection surface."
        : "selection_pool compression requires a current-feature UI selection surface.",
    },
    {
      atom: "commit_and_session_tracking",
      satisfied: commitAndSessionTracking,
      detail: commitAndSessionTracking
        ? "Prompt/schema keep selected-result commit and same-feature/session tracking local."
        : "selection_pool compression requires same-feature/session tracking for committed selections.",
    },
    {
      atom: "selected_removed_or_unchosen_retained",
      satisfied: selectedRemovedOrUnchosenRetained,
      detail: selectedRemovedOrUnchosenRetained
        ? "Prompt/schema specify post-selection pool behavior."
        : "selection_pool compression requires explicit post-selection pool behavior.",
    },
    {
      atom: "no_persistence",
      satisfied: noPersistence,
      detail: noPersistence
        ? "Prompt/schema stay session-local and avoid persistence."
        : "selection_pool does not admit persistence in the bounded family contract.",
    },
    {
      atom: "no_external_ownership",
      satisfied: noExternalOwnership,
      detail: noExternalOwnership
        ? "Prompt/schema avoid external/shared ownership."
        : "selection_pool requires feature-owned/session-local state and collections.",
    },
    {
      atom: "no_second_trigger",
      satisfied: noSecondTrigger,
      detail: noSecondTrigger
        ? "Prompt/schema do not introduce a second trigger owner."
        : "selection_pool currently admits only one trigger owner.",
    },
    {
      atom: "no_multi_confirm",
      satisfied: noMultiConfirm,
      detail: noMultiConfirm
        ? "Prompt/schema keep a single confirm flow."
        : "selection_pool currently admits exactly one confirm flow.",
    },
    {
      atom: "no_arbitrary_custom_effect_family",
      satisfied: noArbitraryCustomEffectFamily,
      detail: noArbitraryCustomEffectFamily
        ? "Prompt/schema stay inside the bounded placeholder effect profile."
        : "selection_pool does not admit arbitrary custom effect families.",
    },
  ];

  const blockerCodes = dedupeStrings([
    !noPersistence ? "SELECTION_POOL_PERSISTENCE_NOT_SUPPORTED" : undefined,
    !noExternalOwnership ? "SELECTION_POOL_EXTERNAL_OWNERSHIP_NOT_SUPPORTED" : undefined,
    !noSecondTrigger ? "SELECTION_POOL_MULTI_TRIGGER_NOT_SUPPORTED" : undefined,
    !noMultiConfirm ? "SELECTION_POOL_MULTI_CONFIRM_NOT_SUPPORTED" : undefined,
    !noArbitraryCustomEffectFamily ? "SELECTION_POOL_CUSTOM_EFFECT_FAMILY_NOT_SUPPORTED" : undefined,
  ]);
  const missingAtoms = atoms
    .filter((atom) => positiveAtoms.has(atom.atom) && !atom.satisfied)
    .map((atom) => atom.atom);
  return {
    skeletonMatch: schemaHasSelectionPoolSkeleton(schema),
    compressionEligible: !schemaHasSelectionPoolSkeleton(schema) && blockerCodes.length === 0 && missingAtoms.length === 0,
    atoms,
    satisfiedAtoms: atoms.filter((atom) => atom.satisfied).map((atom) => atom.atom),
    missingAtoms,
    blockerCodes,
  };
}

function deriveSelectionPoolAdmissionVerdict(input: {
  handled: boolean;
  proposalAvailable: boolean;
  assessment?: SelectionPoolContractAssessment;
  blockerCodes?: string[];
}): SelectionPoolAdmissionVerdict {
  if (!input.handled) {
    return "not_applicable";
  }
  if ((input.blockerCodes || []).length > 0 || (input.assessment?.blockerCodes.length || 0) > 0) {
    return "governance_blocked";
  }
  if (!input.proposalAvailable) {
    return "declined";
  }
  if (input.assessment?.skeletonMatch) {
    return "admitted_explicit";
  }
  if (input.assessment?.compressionEligible) {
    return "admitted_compressed";
  }
  return "declined";
}

function buildSelectionPoolAdmissionDiagnostics(input: {
  prompt: string;
  schema?: IntentSchema;
  detection: SelectionPoolDetectionResult;
  proposal?: FeatureAuthoringProposal;
  proposalBaseSource?: SelectionPoolProposalBuildResult["baseSource"];
  promptMergeActions?: string[];
  initialBlockers?: string[];
}): SelectionPoolAdmissionDiagnostics {
  const assessment =
    input.schema && input.proposal
      ? assessSelectionPoolContract(input.schema, input.prompt, input.proposal)
      : undefined;
  const blockerCodes = dedupeStrings([
    ...(input.initialBlockers || []),
    ...(assessment?.blockerCodes || []),
  ]);
  const verdict = deriveSelectionPoolAdmissionVerdict({
    handled: input.detection.handled,
    proposalAvailable: Boolean(input.proposal),
    assessment,
    blockerCodes,
  });
  const contractFindings = assessment
    ? assessment.atoms.map((atom) =>
        createAdmissionFinding(
          "contract",
          `SELECTION_POOL_CONTRACT_${atom.atom.toUpperCase()}`,
          atom.satisfied ? "info" : "warning",
          atom.detail,
          { atom: atom.atom, satisfied: atom.satisfied },
        ),
      )
    : [];
  const skeletonSignals = input.schema ? getSelectionPoolSkeletonSignals(input.schema) : [];
  if (input.schema) {
    contractFindings.unshift(
      createAdmissionFinding(
        "contract",
        "SELECTION_POOL_SKELETON_SIGNALS",
        assessment?.skeletonMatch ? "info" : "warning",
        assessment?.skeletonMatch
          ? "Blueprint schema already exposes the full selection_pool skeleton."
          : `Blueprint schema exposes only ${skeletonSignals.join(", ") || "no"} selection_pool skeleton signals.`,
        { metadata: { skeletonSignals } },
      ),
    );
    if (hasCrossFeatureRequest(input.schema)) {
      contractFindings.push(
        createAdmissionFinding(
          "contract",
          "SELECTION_POOL_EXTERNALIZED_CROSS_FEATURE_GRANT",
          "info",
          "Cross-feature reward application remains external to selection_pool; family admission only covers the local draw shell.",
        ),
      );
    }
  }
  const proposalFindings = input.proposal
    ? [
        createAdmissionFinding(
          "proposal",
          "SELECTION_POOL_PROPOSAL_AVAILABLE",
          "info",
          "selection_pool produced a bounded source-backed proposal candidate.",
          {
            metadata: {
              proposalSource: input.proposal.proposalSource,
              baseSource: input.proposalBaseSource,
              objectKind: input.proposal.objectKind,
            },
          },
        ),
        ...(input.promptMergeActions || []).map((action) =>
          createAdmissionFinding(
            "proposal",
            "SELECTION_POOL_PROMPT_MERGE",
            "info",
            `selection_pool prompt merge applied ${action}.`,
            { metadata: { action } },
          ),
        ),
      ]
    : [];
  const decisionFindings: SelectionPoolAdmissionFinding[] = [
    createAdmissionFinding(
      "decision",
      `SELECTION_POOL_${verdict.toUpperCase()}`,
      verdict === "governance_blocked" ? "error" : verdict === "declined" ? "warning" : "info",
      verdict === "admitted_explicit"
        ? "selection_pool admitted through the full explicit skeleton."
        : verdict === "admitted_compressed"
          ? "selection_pool admitted through contract-based compression."
          : verdict === "governance_blocked"
            ? "selection_pool contract detected governance-incompatible semantics."
            : verdict === "declined"
              ? "selection_pool matched as a family candidate but did not satisfy the bounded contract."
              : "selection_pool was not applicable for this prompt.",
    ),
    ...blockerCodes.map((code) =>
      createAdmissionFinding("decision", code, "error", `${code} prevented bounded selection_pool admission.`),
    ),
  ];
  const boundedClosureAuthority = verdict === "admitted_explicit"
    ? {
        mode: "explicit_only" as const,
        closeableSurfaces: [
          "selection_flow",
          "candidate_catalog",
          "ui_presentation",
          "selection_outcome",
        ],
        reason:
          "selection_pool explicit admission may close family-owned bounded blueprint residue inside the admitted local draw shell.",
      }
    : undefined;
  return {
    familyId: SELECTION_POOL_FAMILY_ID,
    verdict,
    ...(boundedClosureAuthority ? { boundedClosureAuthority } : {}),
    detection: {
      handled: input.detection.handled,
      objectKindHint: input.detection.objectKindHint,
      matchedBy: input.detection.matchedBy,
      findings: input.detection.findings,
    },
    proposal: {
      proposalAvailable: Boolean(input.proposal),
      proposalSource: input.proposal?.proposalSource,
      baseSource: input.proposalBaseSource,
      promptMergeApplied: (input.promptMergeActions?.length || 0) > 0,
      promptMergeActions: input.promptMergeActions || [],
      objectKind: input.proposal?.objectKind,
      findings: proposalFindings,
    },
    contract: {
      assessed: Boolean(assessment),
      skeletonMatch: assessment?.skeletonMatch || false,
      ...(assessment ? { assessment } : {}),
      findings: contractFindings,
    },
    decision: {
      verdict,
      blockerCodes,
      findings: decisionFindings,
    },
  };
}

export function resolveSelectionPoolFamily(
  input: ResolveSelectionPoolFamilyInput,
): ResolveSelectionPoolFamilyResult {
  const detection = detectSelectionPoolFallbackIntent(input);
  if (!detection.handled) {
    return {
      handled: false,
      blocked: false,
      reasons: [],
      admissionDiagnostics: createNotApplicableDiagnostics(detection),
    };
  }

  const blockFindings = collectFamilyBlockFindings(input.prompt);
  if (blockFindings.length > 0) {
    return {
      handled: true,
      blocked: true,
      reasons: blockFindings.map((finding) => finding.reason),
      admissionDiagnostics: createBlockedDiagnostics(
        detection,
        blockFindings.map((finding) => finding.code),
        blockFindings.map((finding) => finding.reason),
      ),
    };
  }

  const baseProposalResult = createSelectionPoolSeedProposal(input);
  const promptMerge = applyPromptMerge(input, baseProposalResult.proposal);
  const proposal = promptMerge.proposal;
  const admissionDiagnostics = buildSelectionPoolAdmissionDiagnostics({
    schema: input.schema,
    prompt: input.prompt,
    detection,
    proposal,
    proposalBaseSource: baseProposalResult.baseSource,
    promptMergeActions: promptMerge.mergeActions,
    initialBlockers: [],
  });
  const admissionBlockers = extractSelectionPoolAdmissionBlockers(admissionDiagnostics);

  return {
    handled: true,
    blocked: admissionBlockers.length > 0,
    reasons: admissionBlockers,
    proposal,
    fillIntentCandidates: resolveSelectionPoolFillIntentCandidates(input.proposalSource),
    scalarParameters: {
      triggerKey: proposal.parameters.triggerKey,
      choiceCount: proposal.parameters.choiceCount,
    },
    notes: proposal.notes,
    admissionDiagnostics,
  };
}

export function normalizeSelectionPoolFeatureAuthoringProposal(
  schema: IntentSchema,
  proposal: FeatureAuthoringProposal | undefined,
  diagnosticsSeed?: SelectionPoolAdmissionDiagnostics,
  hostRoot?: string,
): FeatureAuthoringNormalizationResult {
  const warnings: string[] = [];
  const notes: string[] = [];
  if (!proposal) {
    return {
      blockers: [],
      warnings,
      notes,
      admissionDiagnostics: diagnosticsSeed,
    };
  }

  const blockers: string[] = [];
  if (proposal.mode !== "source-backed" || proposal.profile !== "selection_pool") {
    blockers.push("Only the bounded selection_pool source-backed profile is admitted in the current Blueprint stage.");
    return {
      blockers,
      warnings,
      notes,
      admissionDiagnostics: buildSelectionPoolAdmissionDiagnostics({
        prompt: schema.request.rawPrompt,
        schema,
        detection: detectSelectionPoolFallbackIntent({
          prompt: schema.request.rawPrompt,
          mode: "create",
          featureId: undefined,
          existingFeature: null,
        }),
        proposal,
        promptMergeActions: diagnosticsSeed?.proposal.promptMergeActions || [],
        proposalBaseSource: diagnosticsSeed?.proposal.baseSource as SelectionPoolProposalBuildResult["baseSource"] | undefined,
        initialBlockers: blockers,
      }),
    };
  }

  const sourceValidationErrors = collectSelectionPoolSourceValidationErrors(
    proposal.parameters,
    hostRoot,
  );
  if (sourceValidationErrors.length > 0) {
    blockers.push(...sourceValidationErrors);
    return {
      blockers: dedupeStrings(blockers),
      warnings,
      notes,
      admissionDiagnostics: buildSelectionPoolAdmissionDiagnostics({
        prompt: schema.request.rawPrompt,
        schema,
        detection: diagnosticsSeed
          ? {
              handled: diagnosticsSeed.detection.handled,
              objectKindHint: diagnosticsSeed.detection.objectKindHint,
              matchedBy: diagnosticsSeed.detection.matchedBy,
              findings: diagnosticsSeed.detection.findings,
            }
          : detectSelectionPoolFallbackIntent({
              prompt: schema.request.rawPrompt,
              mode: "create",
              featureId: undefined,
              existingFeature: null,
            }),
        proposal,
        promptMergeActions: diagnosticsSeed?.proposal.promptMergeActions || [],
        proposalBaseSource: diagnosticsSeed?.proposal.baseSource as SelectionPoolProposalBuildResult["baseSource"] | undefined,
        initialBlockers: blockers,
      }),
    };
  }

  const metadataObjectKind =
    resolveSelectionPoolObjectKind(proposal.parameters.objectKind)
    || resolveSelectionPoolObjectKind(proposal.objectKind);
  const normalized = normalizeFeatureAuthoringParameters(proposal.parameters, metadataObjectKind);
  const diagnostics = buildSelectionPoolAdmissionDiagnostics({
    prompt: schema.request.rawPrompt,
    schema,
    detection: diagnosticsSeed
      ? {
          handled: diagnosticsSeed.detection.handled,
          objectKindHint: diagnosticsSeed.detection.objectKindHint,
          matchedBy: diagnosticsSeed.detection.matchedBy,
          findings: diagnosticsSeed.detection.findings,
        }
      : detectSelectionPoolFallbackIntent({
          prompt: schema.request.rawPrompt,
          mode: "create",
          featureId: undefined,
          existingFeature: null,
        }),
    proposal,
    promptMergeActions: diagnosticsSeed?.proposal.promptMergeActions || [],
    proposalBaseSource: diagnosticsSeed?.proposal.baseSource as SelectionPoolProposalBuildResult["baseSource"] | undefined,
    initialBlockers: blockers,
  });

  if (diagnostics.verdict === "declined" || diagnostics.verdict === "governance_blocked") {
    blockers.push(...extractSelectionPoolAdmissionBlockers(diagnostics));
    notes.push(`selection_pool admission verdict: ${diagnostics.verdict}`);
    return { blockers: dedupeStrings(blockers), warnings, notes, admissionDiagnostics: diagnostics };
  }

  if (!SELECTION_POOL_PARAMETER_SURFACE.triggerKey.allowList.includes(normalized.triggerKey)) {
    warnings.push(`selection_pool proposal normalized triggerKey '${normalized.triggerKey}' into the admitted hotkey set only at review time.`);
  }
  if (normalized.choiceCount < 1 || normalized.choiceCount > 5) {
    warnings.push("selection_pool choiceCount normalized outside the admitted 1..5 bounded field and cannot be trusted for bounded reuse.");
  }
  if (countSelectionPoolEntries(normalized) < 1) {
    warnings.push("selection_pool proposal requires at least one authored pool entry.");
  }
  if (normalized.inventory?.enabled === true) {
    if (normalized.inventory.presentation !== "persistent_panel") {
      warnings.push('selection_pool inventory currently only supports presentation "persistent_panel".');
    }
    if (normalized.inventory.capacity < 1 || normalized.inventory.capacity > 30) {
      warnings.push("selection_pool inventory capacity must stay inside the admitted 1..30 bounded field.");
    }
  }
  if (proposal.parameters.effectProfile?.kind && proposal.parameters.effectProfile.kind !== "tier_attribute_bonus_placeholder") {
    warnings.push("selection_pool currently admits only the bounded placeholder tier effect profile.");
  }

  const featureAuthoring = {
    mode: "source-backed" as const,
    profile: "selection_pool" as const,
    ...(normalized.objectKind ? { objectKind: normalized.objectKind } : {}),
    parameters: normalized,
    parameterSurface: SELECTION_POOL_PARAMETER_SURFACE,
    notes: proposal.notes,
  };

  if (countSelectionPoolEntries(featureAuthoring.parameters) < featureAuthoring.parameters.choiceCount) {
    warnings.push("selection_pool authored object count is smaller than choiceCount; UI payload adaptation will need placeholder padding.");
  }
  notes.push("Blueprint stage admitted a bounded selection_pool source-backed profile.");
  if (proposal.proposalSource) {
    notes.push(`featureAuthoringProposal source: ${proposal.proposalSource}`);
  }
  notes.push(`selection_pool admission verdict: ${diagnostics.verdict}`);

  return { featureAuthoring, blockers, warnings, notes, admissionDiagnostics: diagnostics };
}

import type {
  Blueprint,
  BoundedClosureAuthority,
  NormalizedBlueprintStatus,
  SelectionPoolAdmissionDiagnostics,
  WizardClarificationAuthority,
} from "../../../core/schema/types.js";
import type {
  IntentOpenSemanticResidueItem,
  IntentSemanticAnalysis,
  IntentSemanticSurface,
} from "../../../core/wizard/index.js";

export interface CreateFamilyClosureDecision {
  authority?: BoundedClosureAuthority;
  closedResidue: IntentOpenSemanticResidueItem[];
  remainingResidue: IntentOpenSemanticResidueItem[];
  reasons: string[];
}

export interface CreateReadinessDecision {
  status: NormalizedBlueprintStatus;
  requiresReview: boolean;
  remainingResidue: IntentOpenSemanticResidueItem[];
  closedResidue: IntentOpenSemanticResidueItem[];
  reasons: string[];
}

const SELECTION_POOL_CLOSEABLE_SURFACES: IntentSemanticSurface[] = [
  "selection_flow",
  "candidate_catalog",
  "ui_presentation",
  "effect_profile",
];

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function resolveSelectionPoolBoundedClosureAuthority(
  diagnostics: SelectionPoolAdmissionDiagnostics | undefined,
): BoundedClosureAuthority | undefined {
  if (!diagnostics || diagnostics.verdict !== "admitted_explicit") {
    return undefined;
  }

  return diagnostics.boundedClosureAuthority || {
    mode: "explicit_only",
    closeableSurfaces: [...SELECTION_POOL_CLOSEABLE_SURFACES],
    reason:
      "selection_pool explicit admission may close family-owned bounded blueprint residue inside the admitted local draw shell.",
  };
}

function shouldCloseResidue(
  residue: IntentOpenSemanticResidueItem,
  authority: BoundedClosureAuthority | undefined,
): boolean {
  if (!authority || residue.disposition !== "open" || residue.class !== "blueprint_relevant") {
    return false;
  }

  return authority.closeableSurfaces.includes(residue.surface);
}

export function resolveCreateFamilyClosureDecision(input: {
  semanticAnalysis: IntentSemanticAnalysis;
  familyAdmission?: SelectionPoolAdmissionDiagnostics;
}): CreateFamilyClosureDecision {
  const authority = resolveSelectionPoolBoundedClosureAuthority(input.familyAdmission);
  const closedResidue: IntentOpenSemanticResidueItem[] = [];
  const remainingResidue: IntentOpenSemanticResidueItem[] = [];

  for (const residue of input.semanticAnalysis.openSemanticResidue) {
    if (shouldCloseResidue(residue, authority)) {
      closedResidue.push(residue);
      continue;
    }
    remainingResidue.push(residue);
  }

  const reasons = authority && closedResidue.length > 0
    ? [
        `${authority.reason} Closed residue: ${closedResidue.map((item) => item.id).join(", ")}.`,
      ]
    : [];

  return {
    authority,
    closedResidue,
    remainingResidue,
    reasons,
  };
}

export function applyCreateClosureToAdmissionDiagnostics(
  diagnostics: SelectionPoolAdmissionDiagnostics | undefined,
  closureDecision: CreateFamilyClosureDecision,
): SelectionPoolAdmissionDiagnostics | undefined {
  if (!diagnostics) {
    return diagnostics;
  }

  const authority = closureDecision.authority
    ? closureDecision.authority
    : diagnostics.boundedClosureAuthority;
  const closedResidueIds = closureDecision.closedResidue.map((item) => item.id);
  const closedSurfaces = uniqueStrings(closureDecision.closedResidue.map((item) => item.surface));

  return {
    ...diagnostics,
    ...(authority ? { boundedClosureAuthority: authority } : {}),
    closure: {
      applied: closedResidueIds.length > 0,
      closedResidueIds,
      closedSurfaces,
      reasons: uniqueStrings([
        ...(diagnostics.closure?.reasons || []),
        ...closureDecision.reasons,
      ]),
    },
  };
}

function countOutstandingBlueprintNeeds(blueprint: Blueprint): number {
  const unresolved = (blueprint as Blueprint & { unresolvedModuleNeeds?: unknown[] }).unresolvedModuleNeeds;
  return Array.isArray(unresolved) ? unresolved.length : 0;
}

export function resolveCreateReadinessDecision(input: {
  semanticAnalysis: IntentSemanticAnalysis;
  clarificationAuthority?: WizardClarificationAuthority;
  familyAdmission?: SelectionPoolAdmissionDiagnostics;
  closureDecision?: CreateFamilyClosureDecision;
  blueprint: Blueprint;
  warnings?: string[];
}): CreateReadinessDecision {
  const closureDecision = input.closureDecision || resolveCreateFamilyClosureDecision({
    semanticAnalysis: input.semanticAnalysis,
    familyAdmission: input.familyAdmission,
  });
  const remainingOpenResidue = closureDecision.remainingResidue.filter((item) => item.disposition === "open");
  const hasGovernanceRelevantResidue = remainingOpenResidue.some((item) => item.class === "governance_relevant");
  const hasBlueprintRelevantResidue = remainingOpenResidue.some((item) => item.class === "blueprint_relevant");
  const clarificationBlocksBlueprint = input.clarificationAuthority?.blocksBlueprint === true;
  const clarificationBlocksWrite = input.clarificationAuthority?.blocksWrite === true;
  const outstandingNeeds = countOutstandingBlueprintNeeds(input.blueprint);
  const canAssemble = input.blueprint.commitDecision?.canAssemble ?? input.blueprint.readyForAssembly ?? true;
  const warnings = input.warnings || [];
  const structuralReasons = uniqueStrings([
    clarificationBlocksBlueprint
      ? input.clarificationAuthority?.reasons.join("; ")
      : undefined,
    !canAssemble ? (input.blueprint.commitDecision?.reasons || []).join("; ") : undefined,
    outstandingNeeds > 0 ? `Blueprint still has ${outstandingNeeds} unresolved module need(s).` : undefined,
  ]);

  if (structuralReasons.length > 0) {
    return {
      status: "blocked",
      requiresReview: true,
      remainingResidue: closureDecision.remainingResidue,
      closedResidue: closureDecision.closedResidue,
      reasons: structuralReasons,
    };
  }

  if (hasGovernanceRelevantResidue || hasBlueprintRelevantResidue || clarificationBlocksWrite || warnings.length > 0) {
    return {
      status: "weak",
      requiresReview: true,
      remainingResidue: closureDecision.remainingResidue,
      closedResidue: closureDecision.closedResidue,
      reasons: uniqueStrings([
        ...remainingOpenResidue
          .filter((item) => item.class !== "bounded_detail_only")
          .map((item) => item.summary),
        ...(input.clarificationAuthority?.reasons || []),
        ...warnings,
      ]),
    };
  }

  return {
    status: "ready",
    requiresReview: Boolean(input.blueprint.commitDecision?.requiresReview),
    remainingResidue: closureDecision.remainingResidue,
    closedResidue: closureDecision.closedResidue,
    reasons: uniqueStrings(input.blueprint.commitDecision?.reasons || []),
  };
}

export function applyCreateReadinessDecisionToBlueprint<TBlueprint extends Blueprint>(
  blueprint: TBlueprint,
  decision: CreateReadinessDecision,
): TBlueprint {
  const priorCommitDecision = blueprint.commitDecision;
  const canAssemble =
    decision.status === "blocked"
      ? false
      : (priorCommitDecision?.canAssemble ?? blueprint.readyForAssembly ?? true);
  const canWriteHost =
    decision.status === "blocked"
      ? false
      : (priorCommitDecision?.canWriteHost ?? canAssemble);
  const requiresReview =
    decision.status === "blocked"
      ? true
      : decision.requiresReview;

  return {
    ...blueprint,
    status: decision.status,
    readyForAssembly: canAssemble,
    commitDecision: {
      outcome:
        decision.status === "blocked"
          ? "blocked"
          : requiresReview
            ? "exploratory"
            : "committable",
      canAssemble,
      canWriteHost,
      requiresReview,
      reasons: uniqueStrings([
        ...(priorCommitDecision?.reasons || []),
        ...decision.reasons,
      ]),
      stage: priorCommitDecision?.stage || "blueprint",
    },
  };
}

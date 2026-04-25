export type Dota2PromotionReadinessTargetId =
  | "grant_only_provider_export_seam"
  | "reveal_only_exact_grounded_exploratory_output";

export type Dota2PromotionReadinessVerdict =
  | "ready_for_manual_promotion_review"
  | "must_remain_exploratory";

export interface Dota2PromotionReadinessProofPoint {
  id: string;
  summary: string;
  passed: boolean;
  notes: string[];
  evidenceRefs: string[];
}

export interface Dota2PromotionReadinessAssessment {
  targetId: Dota2PromotionReadinessTargetId;
  summary: string;
  candidateKind: "seam" | "exploratory_output";
  verdict: Dota2PromotionReadinessVerdict;
  rationale: string[];
  manualReviewFocus: string[];
  proofPoints: Dota2PromotionReadinessProofPoint[];
}

export interface Dota2PromotionReadinessSpec {
  candidateId: Dota2PromotionReadinessTargetId;
  summary: string;
  candidateKind: Dota2PromotionReadinessAssessment["candidateKind"];
  expectation: Dota2PromotionReadinessVerdict;
  invariants: string[];
  proofCaseIds: string[];
  manualReviewFocus: string[];
}

const DOTA2_PROMOTION_READINESS_SPECS: Dota2PromotionReadinessSpec[] = [
  {
    candidateId: "grant_only_provider_export_seam",
    summary: "Grant-only provider export seam for cross-feature ability grants",
    candidateKind: "seam",
    expectation: "ready_for_manual_promotion_review",
    invariants: [
      "authoritative Lua/KV identity must close to exactly one runtime abilityName",
      "the provider exports exactly one grant_only capability surface",
      "consumer binding stays explicit and local to the consuming feature",
      "bridge may preload the grant runtime but must not auto-attach it to heroes",
      "non-provider features must not leak provider export sidecars",
    ],
    proofCaseIds: [
      "authoritative_provider_identity_closes",
      "definition_only_provider_shell_exports_grant_only_surface",
      "selection_pool_local_shell_stays_outside_provider_export",
      "identity_drift_blocks_provider_export",
      "bridge_preloads_grant_runtime_without_auto_attach",
    ],
    manualReviewFocus: [
      "Keep the seam bounded to grant_only export plus consumer-side grant binding.",
      "Do not collapse provider identity closure and consumer grant wiring into hidden attachment authority.",
      "Do not treat readiness as formal admission; packet and registry still require manual review.",
    ],
  },
  {
    candidateId: "reveal_only_exact_grounded_exploratory_output",
    summary: "Reveal-only weighted-card exact-grounded exploratory output slice",
    candidateKind: "exploratory_output",
    expectation: "must_remain_exploratory",
    invariants: [
      "structured Panorama host references must close the currently used intrinsic/component subset exactly",
      "fresh reveal-only synthesized UI grounding must stay exact or honestly unknown, never allowlist-softened",
      "repo-side synthesis must continue to label reveal-only output exploratory and review-required",
      "reveal-only output must remain outside the admitted selection_pool family boundary",
    ],
    proofCaseIds: [
      "structured_panorama_intrinsic_subset_has_exact_host_backing",
      "reveal_only_ui_grounding_can_be_exact",
      "reveal_only_output_still_synthesizes_as_exploratory",
      "exploratory_shell_pattern_explicitly_refuses_template_claims",
      "reveal_only_remains_outside_formal_selection_pool_boundary",
    ],
    manualReviewFocus: [
      "Exact grounding on synthesized shells is not enough to justify reusable-asset promotion.",
      "Reveal-only weighted-card asks stay outside the current admitted selection_pool family boundary.",
      "Promotion should wait for an explicitly bounded reusable seam instead of re-labeling exploratory output.",
    ],
  },
];

export function getDota2PromotionReadinessSpecs(): readonly Dota2PromotionReadinessSpec[] {
  return DOTA2_PROMOTION_READINESS_SPECS;
}

export function getDota2PromotionReadinessSpec(
  candidateId: Dota2PromotionReadinessTargetId,
): Dota2PromotionReadinessSpec {
  const spec = DOTA2_PROMOTION_READINESS_SPECS.find((candidate) => candidate.candidateId === candidateId);
  if (!spec) {
    throw new Error(`Unknown Dota2 promotion readiness candidate '${candidateId}'.`);
  }
  return spec;
}

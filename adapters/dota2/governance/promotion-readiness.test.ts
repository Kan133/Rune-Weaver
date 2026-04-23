import assert from "node:assert/strict";

import {
  evaluateAllDota2PromotionReadiness,
  evaluateDota2PromotionReadiness,
} from "./promotion-readiness-harness.js";
import { getDota2PromotionReadinessSpecs } from "./promotion-readiness.js";

{
  const specs = getDota2PromotionReadinessSpecs();

  assert.deepEqual(
    specs.map((spec) => spec.candidateId),
    [
      "grant_only_provider_export_seam",
      "reveal_only_exact_grounded_exploratory_output",
    ],
  );
  assert.equal(specs.every((spec) => spec.invariants.length > 0), true);
  assert.equal(specs.every((spec) => spec.proofCaseIds.length > 0), true);
  assert.equal(specs[0]!.expectation, "ready_for_manual_promotion_review");
  assert.equal(specs[1]!.expectation, "must_remain_exploratory");
}

{
  const assessment = evaluateDota2PromotionReadiness("grant_only_provider_export_seam");

  assert.equal(assessment.verdict, "ready_for_manual_promotion_review");
  assert.equal(assessment.proofPoints.every((point) => point.passed), true);
  assert.equal(
    assessment.proofPoints.some((point) =>
      point.id === "bridge_preloads_grant_runtime_without_auto_attach" && point.passed,
    ),
    true,
  );
  assert.equal(
    assessment.proofPoints.some((point) =>
      point.id === "selection_pool_local_shell_stays_outside_provider_export" && point.passed,
    ),
    true,
  );
}

{
  const assessment = evaluateDota2PromotionReadiness("reveal_only_exact_grounded_exploratory_output");

  assert.equal(assessment.verdict, "must_remain_exploratory");
  assert.equal(
    assessment.proofPoints.some((point) =>
      point.id === "reveal_only_ui_grounding_can_be_exact" && point.passed,
    ),
    true,
  );
  assert.equal(
    assessment.proofPoints.some((point) =>
      point.id === "structured_panorama_intrinsic_subset_has_exact_host_backing" && point.passed,
    ),
    true,
  );
  assert.equal(
    assessment.proofPoints.some((point) =>
      point.id === "reveal_only_remains_outside_formal_selection_pool_boundary" && point.passed,
    ),
    true,
  );
}

{
  const assessments = evaluateAllDota2PromotionReadiness();

  assert.deepEqual(
    assessments.map((assessment) => assessment.targetId),
    [
      "grant_only_provider_export_seam",
      "reveal_only_exact_grounded_exploratory_output",
    ],
  );
}

console.log("adapters/dota2/governance/promotion-readiness.test.ts passed");

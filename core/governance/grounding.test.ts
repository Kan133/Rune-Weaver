import assert from "node:assert/strict";

import {
  aggregateGroundingAssessments,
  buildGroundingAssessment,
  buildGroundingReviewReason,
} from "./grounding.js";

function testBuildGroundingAssessmentStatuses(): void {
  assert.equal(buildGroundingAssessment().status, "none_required");
  assert.equal(
    buildGroundingAssessment({
      artifactId: "exact",
      verifiedSymbols: ["ApplyDamage"],
      allowlistedSymbols: [],
      weakSymbols: [],
      unknownSymbols: [],
      warnings: [],
    }).status,
    "exact",
  );
  assert.equal(
    buildGroundingAssessment({
      artifactId: "partial",
      verifiedSymbols: ["ApplyDamage"],
      allowlistedSymbols: [],
      weakSymbols: ["DealSplash"],
      unknownSymbols: [],
      warnings: ["weak"],
    }).status,
    "partial",
  );
  assert.equal(
    buildGroundingAssessment({
      artifactId: "insufficient",
      verifiedSymbols: [],
      allowlistedSymbols: [],
      weakSymbols: [],
      unknownSymbols: ["UnknownSymbol"],
      warnings: ["unknown"],
    }).status,
    "insufficient",
  );
}

function testAggregateGroundingAssessmentsUsesWorstStatus(): void {
  const aggregate = aggregateGroundingAssessments([
    buildGroundingAssessment({
      artifactId: "a",
      verifiedSymbols: ["ApplyDamage"],
      allowlistedSymbols: [],
      weakSymbols: [],
      unknownSymbols: [],
      warnings: [],
    }),
    buildGroundingAssessment({
      artifactId: "b",
      verifiedSymbols: ["CreateUnitByName"],
      allowlistedSymbols: [],
      weakSymbols: ["SpawnHelper"],
      unknownSymbols: [],
      warnings: ["weak"],
    }),
  ]);

  assert.equal(aggregate.status, "partial");
  assert.equal(aggregate.reviewRequired, true);
  assert.equal(aggregate.verifiedSymbolCount, 2);
  assert.equal(aggregate.weakSymbolCount, 1);
}

function testBuildGroundingReviewReason(): void {
  const reason = buildGroundingReviewReason(
    "module 'reveal_runtime'",
    buildGroundingAssessment({
      artifactId: "partial",
      verifiedSymbols: ["ApplyDamage"],
      allowlistedSymbols: [],
      weakSymbols: ["DealSplash"],
      unknownSymbols: [],
      warnings: ["weak"],
    }),
  );

  assert.match(reason || "", /remained partial/);
  assert.match(reason || "", /weak=1/);
}

testBuildGroundingAssessmentStatuses();
testAggregateGroundingAssessmentsUsesWorstStatus();
testBuildGroundingReviewReason();

console.log("core/governance/grounding.test.ts passed");

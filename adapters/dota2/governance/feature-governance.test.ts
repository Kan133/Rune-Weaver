import assert from "node:assert/strict";

import { summarizeDota2FeatureGovernance } from "./feature-governance.js";

{
  const summary = summarizeDota2FeatureGovernance({
    selectedPatterns: ["effect.outcome_realizer", "input.key_binding"],
    modules: [
      {
        moduleId: "selection_flow",
        role: "selection_flow",
        familyId: "selection_pool",
        selectedPatternIds: ["rule.selection_flow"],
        sourceKind: "family",
        implementationStrategy: "family",
        maturity: "templated",
        requiresReview: false,
        reviewReasons: [],
      },
    ] as any,
    implementationStrategy: "family",
    maturity: "templated",
    commitDecision: {
      outcome: "committable",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: false,
      reasons: [],
      stage: "blueprint",
    },
  });

  assert.equal(summary.familyAdmissions[0]?.status, "admitted");
  assert.equal(summary.patternAdmissions[0]?.status, "admitted");
  assert.equal(summary.patternAdmissions[1]?.status, "untracked");
}

console.log("adapters/dota2/governance/feature-governance.test.ts passed");

import assert from "assert";

import {
  evaluateGapFillDecision,
  formatGapFillDecisionSummary,
} from "./index.js";

const boundary = {
  id: "selection_flow.effect_mapping",
  label: "Selection flow effect mapping",
  filePath: "adapters/dota2/generator/server/selection-flow.ts",
  anchor: "GAP_FILL_BOUNDARY: selection_flow.effect_mapping",
  allowed: ["rarity_formula"],
  forbidden: ["wiring"],
};

function main(): void {
  const autoApply = evaluateGapFillDecision({
    boundary,
    applyRequested: true,
    patchPlan: {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Tighten fallback constant",
      operations: [
        {
          kind: "replace",
          target: "line 0120",
          reason: "Clarify rarity fallback logic near the boundary",
          replacement: "const rarity = option.tier || DEFAULT_RARITY;",
        },
      ],
    },
  });
  assert.strictEqual(autoApply.decision, "auto_apply");
  assert.strictEqual(autoApply.riskLevel, "low");
  assert.strictEqual(autoApply.canApplyDirectly, true);
  assert.deepStrictEqual(autoApply.failureCategories, []);
  assert.ok(formatGapFillDecisionSummary(autoApply).includes("Decision: auto_apply"));

  const reviewOnly = evaluateGapFillDecision({
    boundary,
    applyRequested: false,
    patchPlan: {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Tighten fallback constant",
      operations: [
        {
          kind: "replace",
          target: "line 0120",
          reason: "Clarify rarity fallback logic near the boundary",
          replacement: "const rarity = option.tier || DEFAULT_RARITY;",
        },
      ],
    },
  });
  assert.strictEqual(reviewOnly.decision, "require_confirmation");
  assert.strictEqual(reviewOnly.riskLevel, "low");
  assert.ok(reviewOnly.reasons.some((reason) => reason.code === "apply_not_requested"));
  assert.ok(reviewOnly.failureCategories.includes("approval_required"));

  const confirmation = evaluateGapFillDecision({
    boundary,
    applyRequested: false,
    patchPlan: {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Rewrite several lines",
      operations: [
        {
          kind: "replace",
          target: "lines 0120-0135",
          reason: "Expand the local formula explanation near the boundary",
          replacement: Array.from({ length: 13 }, (_, index) => `const line${index} = ${index};`).join("\n"),
        },
      ],
    },
  });
  assert.strictEqual(confirmation.decision, "require_confirmation");
  assert.strictEqual(confirmation.riskLevel, "medium");
  assert.ok(confirmation.reasons.some((reason) => reason.code === "large_replacement"));
  assert.ok(confirmation.failureCategories.includes("approval_required"));

  const reject = evaluateGapFillDecision({
    boundary,
    applyRequested: true,
    patchPlan: {
      boundaryId: boundary.id,
      targetFile: boundary.filePath,
      summary: "Touch imports",
      operations: [
        {
          kind: "replace",
          target: "line 0001",
          reason: "Update imports for new helper wiring",
          replacement: "import { x } from './x';",
        },
      ],
    },
  });
  assert.strictEqual(reject.decision, "reject");
  assert.strictEqual(reject.riskLevel, "high");
  assert.ok(reject.reasons.some((reason) => reason.code === "touches_imports"));
  assert.ok(reject.failureCategories.includes("policy_reject"));

  console.log("gap-fill decision tests passed");
}

main();

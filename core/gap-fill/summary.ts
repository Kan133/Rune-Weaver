import type { GapFillDecisionIssue, GapFillDecisionResult } from "./types.js";

export function formatGapFillDecisionSummary(result: GapFillDecisionResult): string {
  const lines = [
    "=".repeat(70),
    "Rune Weaver - Gap Fill Decision",
    "=".repeat(70),
    `Decision: ${result.decision}`,
    `Risk: ${result.riskLevel}`,
    `Summary: ${result.userSummary}`,
  ];

  if (result.reasons.length > 0) {
    lines.push("Reasons:");
    for (const reason of result.reasons) {
      lines.push(`  - [${reason.code}] ${reason.message}`);
    }
  }

  return lines.join("\n");
}

export function summarizeGapFillDecision(
  decision: GapFillDecisionResult["decision"],
  reasons: GapFillDecisionIssue[],
): string {
  if (reasons.some((reason) => reason.code === "apply_not_requested")) {
    return "Patch is safe enough for direct apply, but apply was not requested.";
  }

  if (decision === "auto_apply") {
    return "Small in-boundary patch; safe enough for direct apply.";
  }

  if (decision === "require_confirmation") {
    return "Patch stays within the boundary, but it is large or complex enough to require confirmation.";
  }

  return `Patch was rejected because it touches risky change shapes: ${reasons.map((reason) => reason.code).join(", ")}.`;
}

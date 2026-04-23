import type { ActionSummary } from "./action-summary.js";
import type { DoctorCheck } from "./doctor-checks.js";

export function buildDoctorActionSummary(checks: DoctorCheck[], hostRoot: string): ActionSummary {
  const byName = new Map(checks.map((check) => [check.name, check]));
  const postGeneration = byName.get("Post-Generation Validation");

  if (byName.get("Addon Config")?.status === "fail" || byName.get("Dota Directories")?.status === "fail") {
    return {
      status: "blocked",
      headline: "Prepare the host before runtime checks",
      reason: "The addon configuration or install outputs are not ready yet.",
      command: `npm run cli -- dota2 init --host ${hostRoot} --addon-name <addon>`,
      source: "doctor",
    };
  }

  if (byName.get("Rune Weaver Workspace")?.status !== "pass") {
    return {
      status: "action_required",
      headline: "Initialize or repair the Rune Weaver workspace",
      reason: "The workspace record is missing or out of sync with this host.",
      command: `npm run cli -- dota2 init --host ${hostRoot}`,
      source: "doctor",
    };
  }

  if (postGeneration?.status === "fail" && postGeneration.remediationKind === "requires_regenerate") {
    return {
      status: "action_required",
      headline: "Regenerate stale synthesized grounding",
      reason: "This host predates the canonical grounding contract and repair cannot reconstruct missing raw grounding honestly.",
      source: "doctor",
    };
  }

  if (postGeneration?.status === "fail" && postGeneration.remediationKind === "upgrade_workspace_grounding") {
    return {
      status: "action_required",
      headline: "Upgrade legacy synthesized grounding",
      reason: "Preserved raw grounding is present and can be upgraded into canonical module and feature assessments.",
      command: `npm run cli -- dota2 repair --host ${hostRoot} --safe`,
      source: "doctor",
    };
  }

  if (postGeneration?.status === "fail" || byName.get("Runtime Bridge Wiring")?.status === "fail") {
    return {
      status: "action_required",
      headline: "Repair generated/runtime wiring",
      reason: "Generated files or bridge wiring are inconsistent with a runnable host.",
      command: `npm run cli -- dota2 repair --host ${hostRoot} --safe`,
      source: "doctor",
    };
  }

  if (byName.get("Host Build Artifacts")?.status === "warn") {
    return {
      status: "action_required",
      headline: "Rebuild host scripts and Panorama assets",
      reason: "The host is missing compiled build artifacts needed at runtime.",
      command: `cd ${hostRoot} && yarn dev`,
      source: "doctor",
    };
  }

  if (postGeneration?.status === "warn" && postGeneration.remediationKind === "review_required") {
    return {
      status: "action_required",
      headline: "Review exploratory grounding warnings",
      reason: "Fresh synthesized output still has partial or insufficient grounding and remains review-required.",
      source: "doctor",
    };
  }

  return {
    status: "ready",
    headline: "Launch the prepared host",
    reason: "Doctor did not find any blocking runtime issues.",
    command: `cd ${hostRoot} && yarn launch <addon> <map>`,
    source: "doctor",
  };
}

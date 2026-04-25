import type { ActionSummary } from "./action-summary.js";
import type { DoctorCheck } from "./doctor-checks.js";
import {
  buildDota2RepairabilityReadModel,
  type Dota2GovernanceRepairabilityKind,
} from "./dota2-governance-read-model.js";

function getPostGenerationRepairability(
  postGeneration: DoctorCheck | undefined,
): ReturnType<typeof buildDota2RepairabilityReadModel> | undefined {
  return postGeneration?.remediationKind
    ? buildDota2RepairabilityReadModel(postGeneration.remediationKind as Dota2GovernanceRepairabilityKind)
    : undefined;
}

export function buildDoctorActionSummary(checks: DoctorCheck[], hostRoot: string): ActionSummary {
  const byName = new Map(checks.map((check) => [check.name, check]));
  const postGeneration = byName.get("Post-Generation Validation");
  const postGenerationRepairability = getPostGenerationRepairability(postGeneration);

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

  if (postGeneration?.status === "fail" && postGenerationRepairability?.kind === "requires_regenerate") {
    return {
      status: "action_required",
      headline: postGenerationRepairability.doctorHeadline,
      reason: postGenerationRepairability.doctorReason,
      source: "doctor",
    };
  }

  if (postGeneration?.status === "fail" && postGenerationRepairability?.kind === "upgrade_workspace_grounding") {
    return {
      status: "action_required",
      headline: postGenerationRepairability.doctorHeadline,
      reason: postGenerationRepairability.doctorReason,
      command: `npm run cli -- dota2 repair --host ${hostRoot} --safe`,
      source: "doctor",
    };
  }

  if (postGeneration?.status === "fail" || byName.get("Runtime Bridge Wiring")?.status === "fail") {
    const repairability = postGenerationRepairability || buildDota2RepairabilityReadModel("repair_safe");
    return {
      status: "action_required",
      headline: repairability.doctorHeadline,
      reason: repairability.doctorReason,
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

  if (postGeneration?.status === "warn" && postGenerationRepairability?.kind === "review_required") {
    return {
      status: "action_required",
      headline: postGenerationRepairability.doctorHeadline,
      reason: postGenerationRepairability.doctorReason,
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

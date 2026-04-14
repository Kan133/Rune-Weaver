import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../dota2-cli.js";
import { createBaseMaintenanceReviewArtifact } from "./maintenance-artifact.js";

export function createRollbackReviewArtifact(options: Dota2CLIOptions): Dota2ReviewArtifact {
  return createBaseMaintenanceReviewArtifact(options, {
    intentKind: "rollback",
    goal: `Rollback feature: ${options.featureId}`,
  });
}

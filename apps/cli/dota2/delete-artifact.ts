import type { Dota2CLIOptions, Dota2ReviewArtifact } from "../dota2-cli.js";
import { createBaseMaintenanceReviewArtifact } from "./maintenance-artifact.js";

export function createDeleteReviewArtifact(options: Dota2CLIOptions): Dota2ReviewArtifact {
  return createBaseMaintenanceReviewArtifact(options, {
    intentKind: "delete",
    goal: `Delete feature: ${options.featureId}`,
  });
}

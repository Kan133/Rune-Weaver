/**
 * Doctor Command - Health Check Types and Barrel Export
 */

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  details?: string[];
  suggestion?: string;
}

export { checkAddonConfig, checkDotaDirectories, checkPackageJson } from "./doctor-checks-addon.js";
export {
  checkWorkspace,
  checkPostGenerationValidation,
  checkProjectStructure,
  checkGapFillBoundaryAnchors,
  checkHostBuildArtifacts,
  checkRuntimeBridgeWiring,
  generateRecommendations,
} from "./doctor-checks-rw.js";

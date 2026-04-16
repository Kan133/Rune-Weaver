import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { WORKSPACE_REL_PATH } from "./constants.js";
import type { GeneratedFilesData } from "./types.js";

function isTalentDrawLikeFeature(feature: {
  featureId?: string;
  status?: string;
  selectedPatterns?: string[];
  integrationPoints?: string[];
  generatedFiles?: string[];
}): boolean {
  const patterns = Array.isArray(feature.selectedPatterns) ? feature.selectedPatterns : [];
  const integrationPoints = Array.isArray(feature.integrationPoints) ? feature.integrationPoints : [];
  const generatedFiles = Array.isArray(feature.generatedFiles) ? feature.generatedFiles : [];

  const hasSelectionFlow = patterns.includes("rule.selection_flow");
  const hasWeightedPool = patterns.includes("data.weighted_pool");
  const hasSelectionUI = patterns.includes("ui.selection_modal");
  const hasEffect = patterns.includes("effect.modifier_applier");
  const hasF4Binding = integrationPoints.includes("input.key_binding:F4");
  const hasPoolFile = generatedFiles.some((file) => file.endsWith("_data_weighted_pool.ts"));

  return hasSelectionFlow && hasWeightedPool && hasSelectionUI && hasEffect && hasF4Binding && hasPoolFile;
}

export async function readWorkspaceFile(hostPath: string): Promise<GeneratedFilesData | null> {
  const workspacePath = join(hostPath, WORKSPACE_REL_PATH);

  if (!existsSync(workspacePath)) {
    return null;
  }

  try {
    const content = await readFile(workspacePath, "utf-8");
    const workspace = JSON.parse(content);
    const features = Array.isArray(workspace.features) ? workspace.features : [];
    const activeFeatures = features.filter((item: { status?: string }) => item.status === "active");

    const feature =
      activeFeatures.find((item: { featureId?: string }) => item.featureId === "talent_draw_demo")
      || activeFeatures.find(isTalentDrawLikeFeature)
      || null;

    if (!feature) {
      return null;
    }

    return {
      featureId: feature.featureId || "talent_draw_demo",
      revision: feature.revision || "unknown",
      selectedPatterns: feature.selectedPatterns || [],
      generatedFiles: feature.generatedFiles || [],
      entryBindings: feature.entryBindings || [],
    };
  } catch {
    return null;
  }
}

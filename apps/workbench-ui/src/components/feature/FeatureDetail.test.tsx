import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FeatureDetail, refreshFeatureAfterUpdate } from "./FeatureDetail";
import { useFeatureStore } from "@/hooks/useFeatureStore";

const baseFeature = {
  id: "talent_draw_demo",
  displayName: "Talent Draw Demo",
  systemId: "talent_draw_demo",
  group: "system",
  parentId: null,
  childrenIds: [],
  status: "active",
  revision: 1,
  updatedAt: new Date(),
  patterns: [
    "input.key_binding",
    "data.weighted_pool",
    "rule.selection_flow",
    "ui.selection_modal",
  ],
  generatedFiles: [
    "game/scripts/src/rune_weaver/generated/server/talent_draw_demo_input_trigger_input_key_binding.ts",
  ],
  hostRealization: {
    host: "Dota2",
    context: "Talent Draw",
    syncStatus: "synced",
  },
  reviewSignals: {
    proposalStatus: {
      ready: true,
      percentage: 100,
      message: "ready",
    },
    gapFillSummary: {
      autoFilled: 0,
      needsAttention: 0,
    },
    categoryEClarification: {
      count: 0,
      items: [],
    },
    invalidPatternIds: [],
    readiness: {
      score: 100,
      warnings: [],
    },
  },
  gapFillBoundaries: [],
};

function resetStore(featureRevision = 1, generatedFiles = baseFeature.generatedFiles): void {
  useFeatureStore.setState({
    features: [
      {
        ...baseFeature,
        revision: featureRevision,
        generatedFiles,
      } as any,
    ],
    selectedFeatureId: baseFeature.id,
    workspace: {
      version: "0.1",
      hostType: "dota2-x-template",
      hostRoot: "D:\\test-host",
      addonName: "talent_draw_demo",
      mapName: "temp",
      initializedAt: new Date().toISOString(),
      features: [],
    },
    hostConfig: {
      hostRoot: "D:\\test-host",
      addonName: "talent_draw_demo",
      mapName: "temp",
      hostValid: true,
      hostType: "dota2-x-template",
      scanErrors: [],
      integrationStatus: null,
    },
    connectedHostRoot: "D:\\test-host",
    isWorkspaceConnected: true,
  });
}

async function runTests(): Promise<void> {
  resetStore();

  const html = renderToStaticMarkup(React.createElement(FeatureDetail));
  assert.equal(html.includes("Update"), true);
  assert.equal(html.includes("预览更新"), true);
  assert.equal(html.includes("应用更新"), true);

  let reselectedFeatureId: string | null = null;
  await refreshFeatureAfterUpdate(
    async (preferredFeatureId) => {
      resetStore(2, [
        ...baseFeature.generatedFiles,
        "content/panorama/src/rune_weaver/generated/ui/talent_draw_demo_selection_modal.tsx",
      ]);
      reselectedFeatureId = preferredFeatureId ?? null;
    },
    baseFeature.id,
  );

  const refreshedFeature = useFeatureStore.getState().getSelectedFeature();
  assert.equal(reselectedFeatureId, baseFeature.id);
  assert.equal(refreshedFeature?.revision, 2);
  assert.equal(refreshedFeature?.generatedFiles.length, 2);

  console.log("apps/workbench-ui/src/components/feature/FeatureDetail.test.tsx: PASS");
}

runTests().catch((error) => {
  console.error("FeatureDetail.test.tsx failed:", error);
  process.exit(1);
});

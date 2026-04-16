import { buildWar3ShadowDraftBundle } from "../generator/index.js";
import { buildWar3CurrentSliceIntentBridge } from "./current-slice-bridge.js";
import { runWar3CurrentSliceBlueprintTrialFromBridge } from "./blueprint-trial.js";
import { buildWar3ShadowSiteEvidenceReview } from "./shadow-site-evidence-review.js";
import { buildWar3CurrentSliceAssemblySidecar } from "./war3-assembly-sidecar.js";
import { buildWar3ShadowRealizationPlan } from "./shadow-realization-plan.js";

function createCanonicalArtifact() {
  return {
    host: {
      hostKind: "war3-classic" as const,
      platform: "kk" as const,
      warcraftVersion: "1.29" as const,
      scriptMode: "typescript-to-lua" as const,
      jassSupported: false as const,
      hostRoot: "D:\\Rune Weaver\\tmp\\war3-tstl-skeleton\\maps\\demo.w3x",
    },
    anchors: [
      {
        rawId: "manual-1",
        semanticName: "central_shop_proxy",
        role: "shop",
        position: { x: 256, y: 256, z: 0 },
      },
      {
        rawId: "doodad-1",
        semanticName: "mid_trigger_zone",
        role: "trigger",
        position: { x: 384, y: 384, z: 0 },
      },
    ],
    feature: {
      description: "War3 shadow realization canonical slice.",
      inputs: {
        hintDurationSeconds: 4,
        explicitHintText: "Welcome to the mid zone!",
        shopObjectId: "nmrk",
        shopUnlockMechanism: "issue-order",
        shopTargetMode: "existing-anchor",
        shopTargetSourceId: "central_shop_proxy",
        shopOrderMode: "neutral-target-order-by-id",
        shopOrderId: "852008",
        triggerAreaMode: "generated-radius",
        triggerAreaSourceId: "mid_trigger_zone",
        triggerAreaRadius: 192,
      },
    },
  };
}

function runTests() {
  console.log("Running War3 Shadow Realization Tests...\n");
  let passed = 0;
  let failed = 0;

  const bridge = buildWar3CurrentSliceIntentBridge(createCanonicalArtifact());
  const blueprintTrial = runWar3CurrentSliceBlueprintTrialFromBridge(bridge);
  const sidecar = buildWar3CurrentSliceAssemblySidecar(blueprintTrial);
  const plan = buildWar3ShadowRealizationPlan(sidecar);
  const bundle = buildWar3ShadowDraftBundle(plan);
  const siteEvidenceReview = buildWar3ShadowSiteEvidenceReview({
    plan,
    bundle,
  });

  const planSignature = JSON.stringify(
    plan.realizationUnits.map((unit) => ({
      unitId: unit.unitId,
      fileRole: unit.fileRole,
      targetPathHint: unit.targetPathHint,
      consumedBindings: unit.consumedBindings,
      status: unit.status,
    })),
    null,
    2,
  );
  const expectedPlanSignature = JSON.stringify(
    [
      {
        unitId: "shadow-runtime-hook-bootstrap",
        fileRole: "bootstrap-module",
        targetPathHint: "src/host/bootstrap.ts",
        consumedBindings: ["runtime-hook"],
        status: "review-only-draft",
      },
      {
        unitId: "shadow-feature-module",
        fileRole: "feature-module",
        targetPathHint: "src/features/setupMidZoneShop.ts",
        consumedBindings: ["trigger-area", "shop-target", "runtime-hook"],
        status: "review-only-draft",
      },
      {
        unitId: "shadow-host-binding-review",
        fileRole: "host-binding-review",
        targetPathHint: "rune_weaver/generated/host-binding/current-slice.json",
        consumedBindings: ["runtime-hook", "trigger-area", "shop-target"],
        status: "review-only-draft",
      },
    ],
    null,
    2,
  );

  if (
    plan.featureId === "setup-mid-zone-shop" &&
    plan.workspaceFlavor === "tstl-skeleton" &&
    plan.status === "review-only-shadow-path" &&
    planSignature === expectedPlanSignature &&
    plan.siteContracts.length === 4 &&
    plan.siteContracts[0]?.siteId === "runtime-hook-bootstrap-call-site" &&
    plan.siteContracts[1]?.siteId === "shop-target-declaration-site" &&
    plan.siteContracts[2]?.siteId === "trigger-area-realization-site" &&
    plan.siteContracts[3]?.siteId === "host-binding-review-surface" &&
    plan.unresolvedFacts.includes("KK 1.29 runtime behavior remains unproven.") &&
    plan.explicitNonGoals.length === 3
  ) {
    console.log("PASS Test 1: shadow realization plan shape is stable");
    passed++;
  } else {
    console.log("FAIL Test 1: shadow realization plan shape is stable");
    console.log("  Plan:", JSON.stringify(plan, null, 2));
    failed++;
  }

  const bundleSignature = JSON.stringify(
    {
      bootstrap: {
        fileRole: bundle.draftFiles.bootstrap.fileRole,
        pathHint: bundle.draftFiles.bootstrap.pathHint,
        contentType: bundle.draftFiles.bootstrap.contentType,
        sourceUnitId: bundle.draftFiles.bootstrap.sourceUnitId,
        linkedSiteIds: bundle.draftFiles.bootstrap.linkedSiteIds,
      },
      featureModule: {
        fileRole: bundle.draftFiles.featureModule.fileRole,
        pathHint: bundle.draftFiles.featureModule.pathHint,
        contentType: bundle.draftFiles.featureModule.contentType,
        sourceUnitId: bundle.draftFiles.featureModule.sourceUnitId,
        linkedSiteIds: bundle.draftFiles.featureModule.linkedSiteIds,
      },
      hostBindingReview: {
        fileRole: bundle.draftFiles.hostBindingReview.fileRole,
        pathHint: bundle.draftFiles.hostBindingReview.pathHint,
        contentType: bundle.draftFiles.hostBindingReview.contentType,
        sourceUnitId: bundle.draftFiles.hostBindingReview.sourceUnitId,
        linkedSiteIds: bundle.draftFiles.hostBindingReview.linkedSiteIds,
      },
    },
    null,
    2,
  );
  const expectedBundleSignature = JSON.stringify(
    {
      bootstrap: {
        fileRole: "bootstrap-module",
        pathHint: "src/host/bootstrap.ts",
        contentType: "typescript",
        sourceUnitId: "shadow-runtime-hook-bootstrap",
        linkedSiteIds: ["runtime-hook-bootstrap-call-site"],
      },
      featureModule: {
        fileRole: "feature-module",
        pathHint: "src/features/setupMidZoneShop.ts",
        contentType: "typescript",
        sourceUnitId: "shadow-feature-module",
        linkedSiteIds: ["shop-target-declaration-site", "trigger-area-realization-site"],
      },
      hostBindingReview: {
        fileRole: "host-binding-review",
        pathHint: "rune_weaver/generated/host-binding/current-slice.json",
        contentType: "json",
        sourceUnitId: "shadow-host-binding-review",
        linkedSiteIds: ["host-binding-review-surface"],
      },
    },
    null,
    2,
  );

  if (
    bundle.status === "review-only-draft-bundle" &&
    bundle.featureId === "setup-mid-zone-shop" &&
    bundleSignature === expectedBundleSignature
  ) {
    console.log("PASS Test 2: shadow draft bundle shape is stable");
    passed++;
  } else {
    console.log("FAIL Test 2: shadow draft bundle shape is stable");
    console.log("  Bundle:", JSON.stringify(bundle, null, 2));
    failed++;
  }

  if (
    siteEvidenceReview.status === "review-only-site-evidence" &&
    siteEvidenceReview.sites.length === 4 &&
    siteEvidenceReview.sites.every((site) => site.draftCheck.status === "all-markers-present") &&
    siteEvidenceReview.sites.every((site) => site.reviewStatus === "review-contract-defined")
  ) {
    console.log("PASS Test 3: shadow site evidence review is stable and deterministic");
    passed++;
  } else {
    console.log("FAIL Test 3: shadow site evidence review is stable and deterministic");
    console.log("  Site review:", JSON.stringify(siteEvidenceReview, null, 2));
    failed++;
  }

  if (
    bundle.draftFiles.bootstrap.content.includes("export function bootstrapHost(): void {") &&
    bundle.draftFiles.bootstrap.content.includes('siteId: "runtime-hook-bootstrap-call-site"') &&
    bundle.draftFiles.bootstrap.content.includes("runtimeHookPathHint: src/host/bootstrap.ts") &&
    bundle.draftFiles.featureModule.content.includes('featureId: "setup-mid-zone-shop"') &&
    bundle.draftFiles.featureModule.content.includes('siteId: "shop-target-declaration-site"') &&
    bundle.draftFiles.featureModule.content.includes('siteId: "trigger-area-realization-site"') &&
    bundle.draftFiles.featureModule.content.includes('reviewPathHint: "rune_weaver/generated/host-binding/current-slice.json"') &&
    bundle.draftFiles.hostBindingReview.content.includes('"schemaVersion": "war3-tstl-host-binding-review/current-slice-v1"') &&
    bundle.draftFiles.hostBindingReview.content.includes('"siteId": "runtime-hook-bootstrap-call-site"') &&
    bundle.draftFiles.hostBindingReview.content.includes('"sourceAnchorSemanticName": "mid_trigger_zone"') &&
    bundle.draftFiles.hostBindingReview.content.includes('"bindingSymbol": "central_shop_proxy"')
  ) {
    console.log("PASS Test 4: shadow draft contents are stable and review-oriented");
    passed++;
  } else {
    console.log("FAIL Test 4: shadow draft contents are stable and review-oriented");
    console.log("  Draft bundle:", JSON.stringify(bundle, null, 2));
    failed++;
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  return failed === 0;
}

const isDirectExecution = import.meta.url.startsWith("file://");
if (isDirectExecution) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

export { runTests };

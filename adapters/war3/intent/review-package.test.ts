import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

import {
  buildWar3CurrentSliceReviewPackage,
  exportWar3ReviewPackage,
  readWar3ReviewPackageFromDir,
  validateWar3CurrentSliceReviewPackage,
} from "./index.js";

const TEST_DIR = join(process.cwd(), "tmp", "war3-review-package-test");

function setup() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

function teardown() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function createArtifact(hostRoot: string) {
  return {
    host: {
      hostKind: "war3-classic" as const,
      platform: "kk" as const,
      warcraftVersion: "1.29" as const,
      scriptMode: "typescript-to-lua" as const,
      jassSupported: false as const,
      hostRoot,
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
      description: "War3 review package test slice.",
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

function createTstlSkeletonProject(options: {
  name: string;
  bootstrapContent?: string;
  featureContent?: string;
}) {
  const projectRoot = join(TEST_DIR, options.name);
  const mapRoot = join(projectRoot, "maps", "demo.w3x");
  mkdirSync(join(projectRoot, "src", "host"), { recursive: true });
  mkdirSync(join(projectRoot, "src", "features"), { recursive: true });
  mkdirSync(join(projectRoot, "rune_weaver"), { recursive: true });
  mkdirSync(mapRoot, { recursive: true });

  writeFileSync(join(projectRoot, "package.json"), '{"name":"war3-test"}');
  writeFileSync(join(projectRoot, "tsconfig.json"), '{"compilerOptions":{"target":"ES2020"}}');
  writeFileSync(join(projectRoot, "config.json"), '{"luaRuntime":true,"japi":true}');
  writeFileSync(join(projectRoot, "rune_weaver", "workspace.json"), '{"host":"war3"}');
  writeFileSync(join(projectRoot, "src", "main.ts"), 'export {};');
  writeFileSync(
    join(projectRoot, "src", "host", "bootstrap.ts"),
    options.bootstrapContent ||
      [
        'import { setupMidZoneShop } from "../features/setupMidZoneShop";',
        "",
        "export function bootstrapHost(): void {",
        "  setupMidZoneShop({} as never);",
        "}",
        "",
      ].join("\n"),
  );
  writeFileSync(
    join(projectRoot, "src", "features", "setupMidZoneShop.ts"),
    options.featureContent || "export function setupMidZoneShop(): void {}\n",
  );

  return {
    projectRoot,
    hostRoot: mapRoot,
  };
}

function runTests() {
  console.log("Running War3 Review Package Tests...\n");
  let passed = 0;
  let failed = 0;

  // Test 1: Shop target shape-only and trigger area rect-shape-only
  {
    setup();
    const workspace = createTstlSkeletonProject({
      name: "shape-only",
      featureContent: [
        "export function setupMidZoneShop(): void {",
        '  const declarationSitePathHint = "src/features/setupMidZoneShop.ts";',
        '  const realizationSitePathHint = "src/features/setupMidZoneShop.ts";',
        '  const sourceAnchorSemanticName = "mid_trigger_zone";',
        "  const hostBindingDraft = {",
        '    declarationSitePathHint: "src/features/setupMidZoneShop.ts",',
        '    realizationSitePathHint: "src/features/setupMidZoneShop.ts",',
        "  };",
        "  void declarationSitePathHint;",
        "  void realizationSitePathHint;",
        "  void sourceAnchorSemanticName;",
        "  void hostBindingDraft;",
        "}",
        "",
      ].join("\n"),
    });
    const validation = validateWar3CurrentSliceReviewPackage(
      buildWar3CurrentSliceReviewPackage(createArtifact(workspace.hostRoot)),
    );
    if (
      validation.runtimeHookValidation.status === "host-evidence-found" &&
      validation.shopTargetValidation.status === "declaration-shape-only" &&
      validation.triggerAreaValidation.status === "rect-shape-only"
    ) {
      console.log("PASS Test 1: shape-only shop target and trigger area");
      passed++;
    } else {
      console.log("FAIL Test 1: shape-only shop target and trigger area");
      console.log("  Validation:", JSON.stringify(validation, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 2: Shop target declaration-site evidence
  {
    setup();
    const workspace = createTstlSkeletonProject({
      name: "shop-declaration-site",
      featureContent: [
        "export function setupMidZoneShop(): void {",
        '  const declarationSitePathHint = "src/features/setupMidZoneShop.ts";',
        '  const bindingSymbol = "central_shop_proxy";',
        "  const hostBindingDraft = {",
        '    declarationSitePathHint: "src/features/setupMidZoneShop.ts",',
        '    bindingSymbol: "central_shop_proxy",',
        "  };",
        "  void declarationSitePathHint;",
        "  void bindingSymbol;",
        "  void hostBindingDraft;",
        "}",
        "",
      ].join("\n"),
    });
    const validation = validateWar3CurrentSliceReviewPackage(
      buildWar3CurrentSliceReviewPackage(createArtifact(workspace.hostRoot)),
    );
    if (validation.shopTargetValidation.status === "declaration-site-evidence") {
      console.log("PASS Test 2: shop target declaration-site evidence");
      passed++;
    } else {
      console.log("FAIL Test 2: shop target declaration-site evidence");
      console.log("  Validation:", JSON.stringify(validation.shopTargetValidation, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 3: Trigger area realization-site evidence
  {
    setup();
    const workspace = createTstlSkeletonProject({
      name: "trigger-realization-site",
      featureContent: [
        "export function setupMidZoneShop(): void {",
        '  const realizationSitePathHint = "src/features/setupMidZoneShop.ts";',
        '  const sourceAnchorSemanticName = "mid_trigger_zone";',
        "  const rect = Rect(192, 192, 576, 576);",
        "  const region = CreateRegion();",
        "  RegionAddRect(region, rect);",
        "  const trig = CreateTrigger();",
        "  TriggerRegisterEnterRegion(trig, region, null);",
        "  void realizationSitePathHint;",
        "  void sourceAnchorSemanticName;",
        "}",
        "",
      ].join("\n"),
    });
    const validation = validateWar3CurrentSliceReviewPackage(
      buildWar3CurrentSliceReviewPackage(createArtifact(workspace.hostRoot)),
    );
    if (validation.triggerAreaValidation.status === "realization-site-evidence") {
      console.log("PASS Test 3: trigger area realization-site evidence");
      passed++;
    } else {
      console.log("FAIL Test 3: trigger area realization-site evidence");
      console.log("  Validation:", JSON.stringify(validation.triggerAreaValidation, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 4: Missing implementation-draft plan should still read safely
  {
    setup();
    const workspace = createTstlSkeletonProject({
      name: "missing-implementation-plan",
      featureContent: [
        "export function setupMidZoneShop(): void {",
        '  const declarationSitePathHint = "src/features/setupMidZoneShop.ts";',
        '  const bindingSymbol = "central_shop_proxy";',
        '  const realizationSitePathHint = "src/features/setupMidZoneShop.ts";',
        "  const rect = Rect(192, 192, 576, 576);",
        "  const region = CreateRegion();",
        "  RegionAddRect(region, rect);",
        "  const trig = CreateTrigger();",
        "  TriggerRegisterEnterRegion(trig, region, null);",
        "  void declarationSitePathHint;",
        "  void bindingSymbol;",
        "  void realizationSitePathHint;",
        "}",
        "",
      ].join("\n"),
    });
    const reviewPackage = buildWar3CurrentSliceReviewPackage(createArtifact(workspace.hostRoot));
    const packageDir = exportWar3ReviewPackage(reviewPackage, TEST_DIR);
    unlinkSync(join(packageDir, "shadow-realization-plan.json"));
    unlinkSync(join(packageDir, "shadow-draft-bundle.json"));
    unlinkSync(join(packageDir, "shadow-site-evidence-review.json"));
    unlinkSync(join(packageDir, "implementation-draft-plan.json"));
    const reread = readWar3ReviewPackageFromDir(packageDir);
    const validation = validateWar3CurrentSliceReviewPackage(reread);
    if (
      !reread.shadowRealizationPlan &&
      !reread.shadowDraftBundle &&
      !reread.shadowSiteEvidenceReview &&
      !reread.implementationDraftPlan &&
      validation.valid
    ) {
      console.log("PASS Test 4: missing implementation-draft plan is tolerated");
      passed++;
    } else {
      console.log("FAIL Test 4: missing implementation-draft plan is tolerated");
      console.log("  Reread:", JSON.stringify(reread, null, 2));
      failed++;
    }
    teardown();
  }

  // Test 5: Exported implementation-draft plan is present and script-readable
  {
    setup();
    const workspace = createTstlSkeletonProject({
      name: "implementation-plan-present",
      featureContent: [
        "export function setupMidZoneShop(): void {",
        '  const declarationSitePathHint = "src/features/setupMidZoneShop.ts";',
        '  const bindingSymbol = "central_shop_proxy";',
        '  const realizationSitePathHint = "src/features/setupMidZoneShop.ts";',
        "  const rect = Rect(192, 192, 576, 576);",
        "  const region = CreateRegion();",
        "  RegionAddRect(region, rect);",
        "  const trig = CreateTrigger();",
        "  TriggerRegisterEnterRegion(trig, region, null);",
        "  void declarationSitePathHint;",
        "  void bindingSymbol;",
        "  void realizationSitePathHint;",
        "}",
        "",
      ].join("\n"),
    });
    const reviewPackage = buildWar3CurrentSliceReviewPackage(createArtifact(workspace.hostRoot));
    const packageDir = exportWar3ReviewPackage(reviewPackage, TEST_DIR);
    const shadowPlanExists = existsSync(join(packageDir, "shadow-realization-plan.json"));
    const shadowBundleExists = existsSync(join(packageDir, "shadow-draft-bundle.json"));
    const shadowSiteEvidenceExists = existsSync(join(packageDir, "shadow-site-evidence-review.json"));
    const implementationPlan = JSON.parse(
      readFileSync(join(packageDir, "implementation-draft-plan.json"), "utf-8"),
    );
    const shadowPlan = JSON.parse(
      readFileSync(join(packageDir, "shadow-realization-plan.json"), "utf-8"),
    );
    const shadowBundle = JSON.parse(
      readFileSync(join(packageDir, "shadow-draft-bundle.json"), "utf-8"),
    );
    const shadowSiteEvidence = JSON.parse(
      readFileSync(join(packageDir, "shadow-site-evidence-review.json"), "utf-8"),
    );
    if (
      shadowPlanExists &&
      shadowBundleExists &&
      shadowSiteEvidenceExists &&
      reviewPackage.shadowDraftBundle &&
      reviewPackage.shadowRealizationPlan &&
      reviewPackage.shadowSiteEvidenceReview &&
      reviewPackage.tstlHostDraft.bootstrap.content ===
        reviewPackage.shadowDraftBundle.draftFiles.bootstrap.content &&
      reviewPackage.tstlHostDraft.featureModule.content ===
        reviewPackage.shadowDraftBundle.draftFiles.featureModule.content &&
      reviewPackage.tstlHostDraft.hostBindingReview.content ===
        reviewPackage.shadowDraftBundle.draftFiles.hostBindingReview.content &&
      shadowPlan.realizationUnits.length === 3 &&
      shadowPlan.siteContracts.length === 4 &&
      Object.keys(shadowBundle.draftFiles).length === 3 &&
      shadowSiteEvidence.sites.length === 4 &&
      shadowSiteEvidence.sites.every((site: { draftCheck: { status: string } }) =>
        site.draftCheck.status === "all-markers-present",
      ) &&
      implementationPlan.entries.length === 3 &&
      implementationPlan.evidenceLevel === "binding-draft" &&
      implementationPlan.entries.every((entry: { sourceEvidence: string[] }) =>
        entry.sourceEvidence.some((source) => source.startsWith("shadowRealizationPlan:")) &&
        entry.sourceEvidence.some((source) => source.startsWith("shadowDraftBundle:")) &&
        entry.sourceEvidence.some((source) => source.startsWith("shadowSiteEvidenceReview:")),
      ) &&
      implementationPlan.readiness.readyForImplementationDraft === false
    ) {
      console.log("PASS Test 5: shadow artifacts and implementation-draft plan are exported");
      passed++;
    } else {
      console.log("FAIL Test 5: shadow artifacts and implementation-draft plan are exported");
      console.log(
        "  Exported:",
        JSON.stringify(
          {
            shadowPlanExists,
            shadowBundleExists,
            shadowPlan,
            shadowBundle,
            implementationPlan,
          },
          null,
          2,
        ),
      );
      failed++;
    }
    teardown();
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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import {
  buildWar3ShadowDraftBundle,
  generateMidZoneShopSkeletonModuleDraft,
  type War3ShadowDraftBundle,
} from "../generator/index.js";
import type {
  War3CurrentSliceArtifactInput,
  War3CurrentSliceHostBindingManifest,
} from "./current-slice-bridge.js";
import {
  buildWar3CurrentSliceIntentBridge,
  countWar3CurrentSliceOpenBindings,
} from "./current-slice-bridge.js";
import { runWar3CurrentSliceBlueprintTrialFromBridge } from "./blueprint-trial.js";
import {
  buildWar3CurrentSliceAssemblySidecar,
  type War3CurrentSliceAssemblySidecar,
} from "./war3-assembly-sidecar.js";
import {
  buildWar3ShadowRealizationPlan,
  type War3ShadowRealizationPlan,
} from "./shadow-realization-plan.js";
import {
  buildWar3ShadowSiteEvidenceReview,
  type War3ShadowSiteEvidenceReview,
} from "./shadow-site-evidence-review.js";
import {
  buildWar3WritePreviewArtifact,
  type War3WritePreviewArtifact,
} from "./write-preview-artifact.js";
import {
  buildWar3ImplementationDraftPlan,
  type War3ImplementationDraftPlan,
} from "./implementation-draft-plan.js";
import { connectWar3Workspace } from "../workspace/connector.js";

export type War3ReviewPackage = {
  schemaVersion: "war3-review-package/current-slice-v1";
  generatedAt: string;
  packageName: string;
  bridge: ReturnType<typeof buildWar3CurrentSliceIntentBridge>;
  sidecar: War3CurrentSliceAssemblySidecar;
  shadowRealizationPlan?: War3ShadowRealizationPlan;
  shadowDraftBundle?: War3ShadowDraftBundle;
  shadowSiteEvidenceReview?: War3ShadowSiteEvidenceReview;
  writePreviewArtifact: War3WritePreviewArtifact;
  skeletonModule: {
    filename: string;
    content: string;
  };
  tstlHostDraft: {
    bootstrap: {
      filename: string;
      content: string;
    };
    featureModule: {
      filename: string;
      content: string;
    };
    hostBindingReview: {
      filename: string;
      content: string;
    };
  };
  implementationDraftPlan?: War3ImplementationDraftPlan;
};

export type War3ReviewPackageValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
};

export type War3ReviewPackageValidationResult = {
  valid: boolean;
  readyForImplementationDraft: boolean;
  openBindingCount: number;
  workspaceValidation: War3WorkspaceValidationResult;
  hostTargetValidation: War3HostTargetValidationResult;
  tstlDraftValidation: War3TstlDraftValidationResult;
  runtimeHookValidation: War3RuntimeHookValidationResult;
  shopTargetValidation: War3ShopTargetValidationResult;
  triggerAreaValidation: War3TriggerAreaValidationResult;
  issues: War3ReviewPackageValidationIssue[];
};

export type War3WorkspaceValidationResult = {
  flavor: "map-script-sample" | "tstl-skeleton" | "unknown";
  readiness: "recognized" | "partial" | "unrecognized";
  evidencePaths: string[];
  notes: string[];
};

export type War3HostTargetValidationResult = {
  status:
    | "not-applicable"
    | "aligned-with-skeleton"
    | "partially-aligned"
    | "unrecognized";
  checkedPaths: Array<{
    purpose: "runtime-hook" | "feature-module" | "host-binding-review";
    path: string;
    expectedToExistInSkeleton: boolean;
    exists: boolean;
    moduleNameAligned?: boolean;
  }>;
  notes: string[];
};

export type War3TstlDraftValidationResult = {
  status:
    | "draft-slot-semantics-present"
    | "draft-slot-semantics-partial"
    | "draft-slot-semantics-missing";
  checkedArtifacts: Array<{
    artifact: "bootstrap-module" | "feature-module" | "host-binding-review";
    pathHint: string;
    status: "present" | "missing";
    notes: string[];
  }>;
  notes: string[];
};

export type War3RuntimeHookValidationResult = {
  status:
    | "host-evidence-found"
    | "map-script-anchor-only"
    | "workspace-unrecognized";
  scriptEntry: string | null;
  candidateAnchors: string[];
  notes: string[];
};

export type War3ShopTargetValidationResult = {
  status:
    | "declaration-site-evidence"
    | "declaration-shape-only"
    | "no-declaration-evidence"
    | "workspace-unrecognized";
  bindingSymbol: string;
  declarationSitePathHint: string;
  evidenceFiles: string[];
  notes: string[];
};

export type War3TriggerAreaValidationResult = {
  status:
    | "realization-site-evidence"
    | "rect-shape-only"
    | "no-trigger-area-evidence"
    | "workspace-unrecognized";
  sourceAnchorSemanticName: string;
  realizationSitePathHint: string;
  evidenceFiles: string[];
  notes: string[];
};

function validateWar3WorkspaceShapeFromHostRoot(
  hostRoot: string,
): War3WorkspaceValidationResult {
  const connection = connectWar3Workspace(hostRoot);
  if (connection.success && connection.context) {
    const evidencePaths = [connection.context.workspaceRoot];
    if (connection.context.scriptEntry) {
      evidencePaths.push(join(connection.context.workspaceRoot, connection.context.scriptEntry));
    }

    return {
      flavor: "map-script-sample",
      readiness: "recognized",
      evidencePaths,
      notes: [
        "Classic War3 map workspace shape is recognized from war3map.* files.",
      ],
    };
  }

  const normalizedHostRoot = hostRoot.replace(/\\/g, "/");
  const tstlProjectRootMatch = normalizedHostRoot.match(/^(.*)\/maps\/[^/]+\.w3x$/i);
  const projectRoot = tstlProjectRootMatch ? tstlProjectRootMatch[1].replace(/\//g, "\\") : "";
  const requiredTstlPaths = projectRoot
    ? [
        join(projectRoot, "package.json"),
        join(projectRoot, "tsconfig.json"),
        join(projectRoot, "config.json"),
        join(projectRoot, "src", "main.ts"),
        join(projectRoot, "src", "host", "bootstrap.ts"),
        join(projectRoot, "rune_weaver", "workspace.json"),
      ]
    : [];

  const existingRequiredPaths = requiredTstlPaths.filter((filePath) => existsSync(filePath));
  const mapsRoot = projectRoot ? join(projectRoot, "maps") : "";
  const mapWorkspaceExists = !!(
    mapsRoot &&
    existsSync(mapsRoot) &&
    existsSync(hostRoot)
  );

  if (existingRequiredPaths.length > 0 || mapWorkspaceExists) {
    const readiness =
      existingRequiredPaths.length === requiredTstlPaths.length && mapWorkspaceExists
        ? "recognized"
        : "partial";

    return {
      flavor: "tstl-skeleton",
      readiness,
      evidencePaths: [
        ...existingRequiredPaths,
        ...(mapWorkspaceExists ? [hostRoot] : []),
      ],
      notes: readiness === "recognized"
        ? [
            "TSTL-style War3 project shape is recognized.",
            "This only confirms workspace shape, not runnable KK integration.",
          ]
        : [
            "TSTL-style War3 project shape is partially present.",
            "Missing files or directories still prevent treating it as a full host workspace sample.",
          ],
    };
  }

  return {
    flavor: "unknown",
    readiness: "unrecognized",
    evidencePaths: [],
    notes: [
      "Host root did not match a recognized classic map workspace or the current TSTL skeleton workspace shape.",
    ],
  };
}

export function getDefaultWar3ReviewPackageOutputDir(): string {
  return join(process.cwd(), "tmp", "war3-review");
}

function safeReadUtf8IfExists(filePath: string): string {
  if (!existsSync(filePath)) {
    return "";
  }

  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function collectTstlTriggerAreaEvidence(hostRoot: string): {
  status:
    | "region-materialization-evidence"
    | "rect-shape-only"
    | "no-trigger-area-evidence";
  evidence: string[];
  notes: string[];
} {
  const projectRoot = join(hostRoot, "..", "..");
  const featureModulePath = join(projectRoot, "src", "features", "setupMidZoneShop.ts");
  const configPath = join(projectRoot, "config.json");
  const featureModuleText = safeReadUtf8IfExists(featureModulePath);
  const configText = safeReadUtf8IfExists(configPath);
  const evidence: string[] = [];
  const notes = [
    "TSTL feature seam evidence was used here; this is not actual generated region handle proof.",
  ];

  const hasFeatureSeam =
    featureModuleText.includes("setupMidZoneShop") ||
    featureModuleText.includes("UNSPECIFIED IN PROMPT") ||
    featureModuleText.includes("trigger") ||
    featureModuleText.includes("Trigger");
  const hasCapabilityShape =
    configText.includes("luaRuntime") || configText.includes("japi");
  const hasMaterializationEvidence =
    featureModuleText.includes("CreateRegion") ||
    featureModuleText.includes("RegionAddRect") ||
    featureModuleText.includes("TriggerRegisterEnterRegion") ||
    featureModuleText.includes("Rect(") ||
    featureModuleText.includes("rectMaterialization") ||
    featureModuleText.includes("generated-radius");

  if (existsSync(featureModulePath)) {
    evidence.push(`feature-module:${featureModulePath}`);
  }
  if (existsSync(configPath) && hasCapabilityShape) {
    evidence.push(`config-capability-shape:${configPath}`);
  }

  if (hasMaterializationEvidence) {
    notes.push("Feature seam includes explicit rect/region materialization-related text.");
    return {
      status: "region-materialization-evidence",
      evidence,
      notes,
    };
  }

  if (hasFeatureSeam || hasCapabilityShape) {
    notes.push("Feature seam exists, but runtime region materialization is still only indirectly evidenced.");
    return {
      status: "rect-shape-only",
      evidence,
      notes,
    };
  }

  notes.push("No TSTL feature seam evidence for trigger area materialization was found.");
  return {
    status: "no-trigger-area-evidence",
    evidence,
    notes,
  };
}

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "war3-slice";
}

function getFilenameFromPathHint(pathHint: string, fallback: string): string {
  const normalized = pathHint.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] || fallback;
}

function createCompatibilityTstlHostDraftFromShadowBundle(
  shadowDraftBundle: War3ShadowDraftBundle,
): War3ReviewPackage["tstlHostDraft"] {
  return {
    bootstrap: {
      filename: getFilenameFromPathHint(
        shadowDraftBundle.draftFiles.bootstrap.pathHint,
        "bootstrap.ts",
      ),
      content: shadowDraftBundle.draftFiles.bootstrap.content,
    },
    featureModule: {
      filename: getFilenameFromPathHint(
        shadowDraftBundle.draftFiles.featureModule.pathHint,
        "setupMidZoneShop.ts",
      ),
      content: shadowDraftBundle.draftFiles.featureModule.content,
    },
    hostBindingReview: {
      filename: getFilenameFromPathHint(
        shadowDraftBundle.draftFiles.hostBindingReview.pathHint,
        "current-slice.json",
      ),
      content: shadowDraftBundle.draftFiles.hostBindingReview.content,
    },
  };
}

export function buildWar3CurrentSliceReviewPackage(
  artifact: War3CurrentSliceArtifactInput,
): War3ReviewPackage {
  const bridge = buildWar3CurrentSliceIntentBridge(artifact);
  const blueprintTrial = runWar3CurrentSliceBlueprintTrialFromBridge(bridge);
  const sidecar = buildWar3CurrentSliceAssemblySidecar(blueprintTrial);
  const shadowRealizationPlan = buildWar3ShadowRealizationPlan(sidecar);
  const generatorInput = shadowRealizationPlan.adapterLocalDraftSeed.generatorInput;
  const skeletonContent = generateMidZoneShopSkeletonModuleDraft(generatorInput);
  const shadowDraftBundle = buildWar3ShadowDraftBundle(shadowRealizationPlan);
  const shadowSiteEvidenceReview = buildWar3ShadowSiteEvidenceReview({
    plan: shadowRealizationPlan,
    bundle: shadowDraftBundle,
  });
  const writePreviewArtifact = buildWar3WritePreviewArtifact({
    sidecar,
    shadowRealizationPlan,
    shadowDraftBundle,
    skeletonContent,
    moduleName: generatorInput.moduleName,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const packageName = `${sanitizePathSegment(sidecar.sourceBlueprintId)}-${timestamp}`;

  const reviewPackage: War3ReviewPackage = {
    schemaVersion: "war3-review-package/current-slice-v1",
    generatedAt: new Date().toISOString(),
    packageName,
    bridge,
    sidecar,
    shadowRealizationPlan,
    shadowDraftBundle,
    shadowSiteEvidenceReview,
    writePreviewArtifact,
    skeletonModule: {
      filename: `${generatorInput.moduleName}.ts`,
      content: skeletonContent,
    },
    tstlHostDraft: createCompatibilityTstlHostDraftFromShadowBundle(shadowDraftBundle),
  };

  reviewPackage.implementationDraftPlan = buildWar3ImplementationDraftPlan({
    packageName,
    host: bridge.hostBinding.host,
    sidecar,
    shadowRealizationPlan,
    shadowDraftBundle,
    shadowSiteEvidenceReview,
    validation: validateWar3CurrentSliceReviewPackage(reviewPackage),
  });

  return reviewPackage;
}

function deriveTstlProjectRootFromHostRoot(hostRoot: string): string | null {
  const normalizedHostRoot = hostRoot.replace(/\\/g, "/");
  const match = normalizedHostRoot.match(/^(.*)\/maps\/[^/]+\.w3x$/i);
  if (!match) {
    return null;
  }

  return match[1].replace(/\//g, "\\");
}

function validateWar3RuntimeHookAgainstHostRoot(
  reviewPackage: War3ReviewPackage,
): War3RuntimeHookValidationResult {
  const hostRoot = reviewPackage.bridge.hostBinding.host.hostRoot;
  const connection = connectWar3Workspace(hostRoot);

  if (!connection.success || !connection.context) {
    const projectRoot = deriveTstlProjectRootFromHostRoot(hostRoot);
    const bootstrapPath = projectRoot ? join(projectRoot, "src", "host", "bootstrap.ts") : "";
    if (bootstrapPath && existsSync(bootstrapPath)) {
      const bootstrapContent = readFileSync(bootstrapPath, "utf-8");
      const candidateAnchors: string[] = [];

      if (bootstrapContent.includes("bootstrapHost")) {
        candidateAnchors.push("bootstrapHost");
      }
      if (bootstrapContent.includes("setupMidZoneShop(")) {
        candidateAnchors.push("setupMidZoneShop(");
      }

      if (candidateAnchors.length > 0) {
        return {
          status: "host-evidence-found",
          scriptEntry: "src/host/bootstrap.ts",
          candidateAnchors,
          notes: [
            "Runtime-hook review found TSTL bootstrap seam evidence.",
            "This is review-oriented TSTL bootstrap evidence, not direct write proof.",
          ],
        };
      }
    }

    return {
      status: "workspace-unrecognized",
      scriptEntry: null,
      candidateAnchors: [],
      notes: [
        ...connection.issues,
        "Runtime-hook binding could not be checked against a recognized War3 workspace.",
      ],
    };
  }

  const scriptEntry = connection.context.scriptEntry || null;
  if (!scriptEntry) {
    return {
      status: "workspace-unrecognized",
      scriptEntry: null,
      candidateAnchors: [],
      notes: [
        "Workspace was recognized, but no script entry file was found for runtime-hook review.",
      ],
    };
  }

  const scriptPath = join(connection.context.workspaceRoot, scriptEntry);
  const scriptContent = readFileSync(scriptPath, "utf-8");
  const candidateAnchors: string[] = [];

  if (scriptContent.includes("function main()")) {
    candidateAnchors.push("main()");
  }
  if (scriptContent.includes("InitCustomTriggers()")) {
    candidateAnchors.push("InitCustomTriggers()");
  }
  if (scriptContent.includes("RunInitializationTriggers()")) {
    candidateAnchors.push("RunInitializationTriggers()");
  }
  if (scriptContent.includes("CreateTrigger()")) {
    candidateAnchors.push("CreateTrigger()");
  }

  if (candidateAnchors.length === 0) {
    return {
      status: "workspace-unrecognized",
      scriptEntry,
      candidateAnchors,
      notes: [
        `Script entry '${scriptEntry}' was found, but no current-slice runtime-hook anchor was detected.`,
      ],
    };
  }

  const scriptKindNote =
    scriptEntry === "war3map.lua" || scriptEntry === "war3map.j"
      ? "Current evidence is map-script level only; it is not yet a TypeScript project entry proof."
      : "Runtime-hook evidence was found in a non-map script entry.";

  return {
    status:
      scriptEntry === "war3map.lua" || scriptEntry === "war3map.j"
        ? "map-script-anchor-only"
        : "host-evidence-found",
    scriptEntry,
    candidateAnchors,
    notes: [
      `Runtime-hook review found candidate anchors in '${scriptEntry}'.`,
      scriptKindNote,
    ],
  };
}

function validateWar3HostTargetHints(
  reviewPackage: War3ReviewPackage,
  workspaceValidation: War3WorkspaceValidationResult,
): War3HostTargetValidationResult {
  const hints = reviewPackage.sidecar.hostTargetHints;
  if (workspaceValidation.flavor !== "tstl-skeleton") {
    return {
      status: "not-applicable",
      checkedPaths: [],
      notes: [
        "TSTL host target hints are not checked against non-TSTL workspace flavors.",
      ],
    };
  }

  const hostRoot = reviewPackage.bridge.hostBinding.host.hostRoot;
  const normalizedHostRoot = hostRoot.replace(/\\/g, "/");
  const tstlProjectRootMatch = normalizedHostRoot.match(/^(.*)\/maps\/[^/]+\.w3x$/i);
  const projectRoot = tstlProjectRootMatch ? tstlProjectRootMatch[1].replace(/\//g, "\\") : "";
  if (!projectRoot) {
    return {
      status: "unrecognized",
      checkedPaths: [],
      notes: [
        "Workspace was marked as tstl-skeleton, but the project root could not be derived from hostRoot.",
      ],
    };
  }

  const checkedPaths = Object.values(hints.entries).map((entry) => ({
    purpose: entry.purpose,
    path: entry.path,
    expectedToExistInSkeleton: entry.expectedToExistInSkeleton,
    exists: existsSync(join(projectRoot, entry.path)),
    moduleNameAligned:
      entry.purpose === "feature-module"
        ? entry.path.endsWith(`${reviewPackage.writePreviewArtifact.skeletonModule.moduleName}.ts`)
        : undefined,
  }));

  const requiredChecks = checkedPaths.filter((entry) => entry.expectedToExistInSkeleton);
  const missingRequired = requiredChecks.filter((entry) => !entry.exists);
  const featureModuleAligned = checkedPaths
    .filter((entry) => entry.purpose === "feature-module")
    .every((entry) => entry.moduleNameAligned !== false);

  if (missingRequired.length === 0 && featureModuleAligned) {
    return {
      status: "aligned-with-skeleton",
      checkedPaths,
      notes: [
        "TSTL host target hints align with the current skeleton workspace shape.",
      ],
    };
  }

  const notes: string[] = [];
  if (missingRequired.length > 0) {
    notes.push(
      `Missing expected TSTL skeleton target(s): ${missingRequired.map((entry) => entry.path).join(", ")}`,
    );
  }
  if (!featureModuleAligned) {
    notes.push(
      `Feature module target '${hints.entries.featureModule.path}' does not align with skeleton module '${reviewPackage.writePreviewArtifact.skeletonModule.moduleName}.ts'.`,
    );
  }

  return {
    status: "partially-aligned",
    checkedPaths,
    notes,
  };
}

function validateWar3TstlDraftArtifacts(
  reviewPackage: War3ReviewPackage,
): War3TstlDraftValidationResult {
  const featureModulePathHint = reviewPackage.writePreviewArtifact.tstlHostDraft.featureModule.pathHint;
  const bootstrapPathHint = reviewPackage.writePreviewArtifact.tstlHostDraft.bootstrapModule.pathHint;
  const hostBindingReviewPathHint = reviewPackage.writePreviewArtifact.tstlHostDraft.hostBindingReview.pathHint;
  const featureContent = reviewPackage.tstlHostDraft.featureModule.content;
  const bootstrapContent = reviewPackage.tstlHostDraft.bootstrap.content;
  const hostBindingReviewContent = reviewPackage.tstlHostDraft.hostBindingReview.content;
  const bindingDraft = reviewPackage.writePreviewArtifact.hostBindingDraft;
  const runtimeHookSiteReview = reviewPackage.shadowSiteEvidenceReview?.sites.find(
    (site) => site.siteId === "runtime-hook-bootstrap-call-site",
  );
  const shopTargetSiteReview = reviewPackage.shadowSiteEvidenceReview?.sites.find(
    (site) => site.siteId === "shop-target-declaration-site",
  );
  const triggerAreaSiteReview = reviewPackage.shadowSiteEvidenceReview?.sites.find(
    (site) => site.siteId === "trigger-area-realization-site",
  );
  const hostBindingSurfaceReview = reviewPackage.shadowSiteEvidenceReview?.sites.find(
    (site) => site.siteId === "host-binding-review-surface",
  );

  const bootstrapHasRuntimeHook =
    (bootstrapContent.includes("bootstrapHost") &&
      bootstrapContent.includes(bindingDraft.runtimeHook.targetPathHint)) ||
    runtimeHookSiteReview?.draftCheck.status === "all-markers-present";
  const featureHasTriggerAreaDraft =
    ((featureContent.includes("hostBindingDraft") &&
      featureContent.includes(bindingDraft.triggerArea.sourceAnchorSemanticName) &&
      featureContent.includes("realizationSitePathHint")) ||
      triggerAreaSiteReview?.draftCheck.status === "all-markers-present");
  const featureHasShopTargetDraft =
    ((featureContent.includes(bindingDraft.shopTarget.bindingSymbol) &&
      featureContent.includes("declarationSitePathHint")) ||
      shopTargetSiteReview?.draftCheck.status === "all-markers-present");
  const featureHasRuntimeHookDraft =
    featureContent.includes(bindingDraft.runtimeHook.targetPathHint) &&
    featureContent.includes("integrationStatus");
  const hostBindingReviewHasDraft =
    ((hostBindingReviewContent.includes("\"hostBindingDraft\"") &&
      hostBindingReviewContent.includes(bindingDraft.triggerArea.sourceAnchorSemanticName) &&
      hostBindingReviewContent.includes(bindingDraft.shopTarget.bindingSymbol) &&
      hostBindingReviewContent.includes(bindingDraft.runtimeHook.targetPathHint)) ||
      hostBindingSurfaceReview?.draftCheck.status === "all-markers-present");

  const checkedArtifacts: War3TstlDraftValidationResult["checkedArtifacts"] = [
    {
      artifact: "bootstrap-module",
      pathHint: bootstrapPathHint,
      status: bootstrapHasRuntimeHook ? "present" : "missing",
      notes: bootstrapHasRuntimeHook
        ? [
            "Bootstrap draft preserves the runtime-hook path hint and bootstrap entry seam.",
            ...(runtimeHookSiteReview?.draftCheck.status === "all-markers-present"
              ? ["Bootstrap draft also preserves explicit runtime-hook site-review markers."]
              : []),
          ]
        : [
            "Bootstrap draft did not clearly preserve the runtime-hook path hint.",
          ],
    },
    {
      artifact: "feature-module",
      pathHint: featureModulePathHint,
      status: featureHasTriggerAreaDraft && featureHasShopTargetDraft && featureHasRuntimeHookDraft
        ? "present"
        : "missing",
      notes: [
        featureHasTriggerAreaDraft
          ? "Feature draft exposes trigger-area slot semantics."
          : "Feature draft is missing explicit trigger-area slot semantics.",
        ...(triggerAreaSiteReview?.draftCheck.status === "all-markers-present"
          ? ["Feature draft preserves the trigger-area realization site-review markers."]
          : []),
        featureHasShopTargetDraft
          ? "Feature draft exposes shop-target slot semantics."
          : "Feature draft is missing explicit shop-target slot semantics.",
        ...(shopTargetSiteReview?.draftCheck.status === "all-markers-present"
          ? ["Feature draft preserves the shop-target declaration site-review markers."]
          : []),
        featureHasRuntimeHookDraft
          ? "Feature draft exposes runtime-hook slot semantics."
          : "Feature draft is missing explicit runtime-hook slot semantics.",
      ],
    },
    {
      artifact: "host-binding-review",
      pathHint: hostBindingReviewPathHint,
      status: hostBindingReviewHasDraft ? "present" : "missing",
      notes: hostBindingReviewHasDraft
        ? [
            "Host-binding review artifact carries the exported hostBindingDraft structure.",
            ...(hostBindingSurfaceReview?.draftCheck.status === "all-markers-present"
              ? ["Host-binding review artifact preserves the cross-file site-contract markers."]
              : []),
          ]
        : [
            "Host-binding review artifact does not clearly carry the exported hostBindingDraft structure.",
          ],
    },
  ];

  const presentCount = checkedArtifacts.filter((entry) => entry.status === "present").length;
  if (presentCount === checkedArtifacts.length) {
    return {
      status: "draft-slot-semantics-present",
      checkedArtifacts,
      notes: [
        "Exported TSTL draft artifacts preserve explicit slot-level review semantics for runtime-hook, trigger-area, and shop-target.",
      ],
    };
  }

  if (presentCount > 0) {
    return {
      status: "draft-slot-semantics-partial",
      checkedArtifacts,
      notes: [
        "Exported TSTL draft artifacts preserve some slot-level review semantics, but not the full handoff set yet.",
      ],
    };
  }

  return {
    status: "draft-slot-semantics-missing",
    checkedArtifacts,
    notes: [
      "Exported TSTL draft artifacts did not preserve the expected slot-level review semantics.",
    ],
  };
}

function validateWar3WorkspaceShape(
  reviewPackage: War3ReviewPackage,
): War3WorkspaceValidationResult {
  return validateWar3WorkspaceShapeFromHostRoot(reviewPackage.bridge.hostBinding.host.hostRoot);
}

export function validateWar3WorkspaceShapeAtHostRoot(hostRoot: string): War3WorkspaceValidationResult {
  return validateWar3WorkspaceShapeFromHostRoot(hostRoot);
}

function resolveWar3HostEvidenceFiles(hostRoot: string, scriptEntry: string | null): string[] {
  const files: string[] = [];
  if (scriptEntry) {
    files.push(join(hostRoot, scriptEntry));
  }

  const normalizedHostRoot = hostRoot.replace(/\\/g, "/");
  const match = normalizedHostRoot.match(/^(.*)\/maps\/([^/]+)\.w3x$/i);
  if (!match) {
    return files;
  }

  const projectRoot = match[1].replace(/\//g, "\\");
  const mapName = match[2];
  const candidateFiles = [
    join(projectRoot, "pysrc", `${mapName}.py`),
    join(projectRoot, "pysrc", "df", `${mapName}.py`),
  ];

  for (const file of candidateFiles) {
    if (existsSync(file)) {
      files.push(file);
    }
  }

  return [...new Set(files)];
}

function validateWar3ShopTargetAgainstHostRoot(
  reviewPackage: War3ReviewPackage,
): War3ShopTargetValidationResult {
  const hostRoot = reviewPackage.bridge.hostBinding.host.hostRoot;
  const bindingSymbol = reviewPackage.bridge.hostBinding.shopTarget.bindingSymbol;
  const declarationSitePathHint =
    reviewPackage.writePreviewArtifact.hostBindingDraft.shopTarget.declarationSite.pathHint;
  const connection = connectWar3Workspace(hostRoot);

  if (!connection.success || !connection.context) {
    const projectRoot = deriveTstlProjectRootFromHostRoot(hostRoot);
    const declarationSitePath = projectRoot ? join(projectRoot, declarationSitePathHint) : "";
    const hostBindingReviewPath = projectRoot
      ? join(projectRoot, reviewPackage.writePreviewArtifact.tstlHostDraft.hostBindingReview.pathHint)
      : "";
    if (declarationSitePath && existsSync(declarationSitePath)) {
      const featureContent = readFileSync(declarationSitePath, "utf-8");
      const hostBindingReviewContent = hostBindingReviewPath && existsSync(hostBindingReviewPath)
        ? readFileSync(hostBindingReviewPath, "utf-8")
        : "";
      const hasDeclarationSiteHint =
        featureContent.includes("declarationSitePathHint") &&
        featureContent.includes(declarationSitePathHint);
      const hasHostBindingReviewHint =
        hostBindingReviewContent.includes("\"declarationSite\"") &&
        hostBindingReviewContent.includes(declarationSitePathHint);
      if (featureContent.includes(bindingSymbol) && hasDeclarationSiteHint) {
        return {
          status: "declaration-site-evidence",
          bindingSymbol,
          declarationSitePathHint,
          evidenceFiles: [declarationSitePath, ...(hostBindingReviewContent ? [hostBindingReviewPath] : [])],
          notes: [
            `Shop-target symbol '${bindingSymbol}' was found in the declared TSTL declaration-site candidate.`,
            "Declaration-site path hint and binding symbol are aligned in the exported review artifacts.",
          ],
        };
      }

      const hasFeatureSeamShape =
        featureContent.includes("setupMidZoneShop") ||
        featureContent.includes("featureId") ||
        featureContent.includes("unresolved") ||
        hasDeclarationSiteHint ||
        hasHostBindingReviewHint;
      if (hasFeatureSeamShape || hasDeclarationSiteHint || hasHostBindingReviewHint) {
        return {
          status: "declaration-shape-only",
          bindingSymbol,
          declarationSitePathHint,
          evidenceFiles: [
            declarationSitePath,
            ...(hostBindingReviewContent ? [hostBindingReviewPath] : []),
          ],
          notes: [
            `No exact declaration-site evidence was found for '${bindingSymbol}', but the exported review artifacts point at '${declarationSitePathHint}' as the declaration-site candidate.`,
            "Current evidence is declaration-site shape only and does not prove that the requested shop target symbol is already declared there.",
          ],
        };
      }
    }

    return {
      status: "workspace-unrecognized",
      bindingSymbol,
      declarationSitePathHint,
      evidenceFiles: [],
      notes: [
        ...connection.issues,
        "Shop-target declaration site could not be checked against a recognized War3 workspace.",
      ],
    };
  }

  const evidenceFiles = resolveWar3HostEvidenceFiles(
    connection.context.workspaceRoot,
    connection.context.scriptEntry || null,
  );
  const evidenceTexts = evidenceFiles.map((filePath) => ({
    filePath,
    content: readFileSync(filePath, "utf-8"),
  }));

  const declarationSiteCandidates = evidenceTexts.filter((entry) =>
    entry.filePath.replace(/\\/g, "/").endsWith(declarationSitePathHint.replace(/\\/g, "/")),
  );
  const symbolMatches = declarationSiteCandidates
    .filter((entry) => entry.content.includes(bindingSymbol))
    .map((entry) => entry.filePath);
  if (symbolMatches.length > 0) {
    return {
      status: "declaration-site-evidence",
      bindingSymbol,
      declarationSitePathHint,
      evidenceFiles: symbolMatches,
      notes: [
        `Shop-target symbol '${bindingSymbol}' was found in the declared host declaration-site candidate '${declarationSitePathHint}'.`,
      ],
    };
  }

  const hasGeneratedGlobalShape = declarationSiteCandidates.some((entry) => /gg_(unit|rct|trg|cam|snd)_/i.test(entry.content));
  const hasDefinitionImportShape = declarationSiteCandidates.some((entry) => /from\s+df\.[A-Za-z0-9_]+\s+import\s+\*/.test(entry.content));
  const hasHandleWrapperShape = declarationSiteCandidates.some(
    (entry) =>
      entry.content.includes("Handle.get(") ||
      entry.content.includes("Unit.get(") ||
      entry.content.includes("GetSellingUnit()") ||
      entry.content.includes("GetBuyingUnit()"),
  );
  const hasBindingDraftHint = declarationSiteCandidates.some(
    (entry) =>
      entry.content.includes("declarationSitePathHint") ||
      entry.content.includes("hostBindingDraft"),
  );

  if (
    declarationSiteCandidates.length > 0 &&
    (hasGeneratedGlobalShape || hasDefinitionImportShape || hasHandleWrapperShape || hasBindingDraftHint)
  ) {
    return {
      status: "declaration-shape-only",
      bindingSymbol,
      declarationSitePathHint,
      evidenceFiles: declarationSiteCandidates.map((entry) => entry.filePath),
      notes: [
        `No exact declaration-site evidence was found for '${bindingSymbol}', but '${declarationSitePathHint}' exposes declaration shapes that could carry the shop-target binding.`,
        "Current evidence is declaration-site shape only and does not prove that the requested shop target symbol is already declared there.",
      ],
    };
  }

  return {
    status: "no-declaration-evidence",
    bindingSymbol,
    declarationSitePathHint,
    evidenceFiles: declarationSiteCandidates.map((entry) => entry.filePath),
    notes: [
      `No declaration-site evidence was found for shop-target symbol '${bindingSymbol}' at '${declarationSitePathHint}'.`,
    ],
  };
}

function validateWar3TriggerAreaAgainstHostRoot(
  reviewPackage: War3ReviewPackage,
): War3TriggerAreaValidationResult {
  const hostRoot = reviewPackage.bridge.hostBinding.host.hostRoot;
  const sourceAnchorSemanticName = reviewPackage.bridge.hostBinding.triggerArea.sourceAnchorSemanticName;
  const realizationSitePathHint =
    reviewPackage.writePreviewArtifact.hostBindingDraft.triggerArea.realizationSite.pathHint;
  const connection = connectWar3Workspace(hostRoot);

  if (!connection.success || !connection.context) {
    const projectRoot = deriveTstlProjectRootFromHostRoot(hostRoot);
    const featureModulePath = projectRoot ? join(projectRoot, realizationSitePathHint) : "";
    const configPath = projectRoot ? join(projectRoot, "config.json") : "";
    const evidenceFiles: string[] = [];
    let featureContent = "";
    let configContent = "";

    if (featureModulePath && existsSync(featureModulePath)) {
      evidenceFiles.push(featureModulePath);
      featureContent = readFileSync(featureModulePath, "utf-8");
    }
    if (configPath && existsSync(configPath)) {
      evidenceFiles.push(configPath);
      configContent = readFileSync(configPath, "utf-8");
    }

    if (evidenceFiles.length > 0) {
      const hasRectCall = featureContent.includes("Rect(");
      const hasCreateRegion = featureContent.includes("CreateRegion");
      const hasAddRect = featureContent.includes("RegionAddRect");
      const hasEnterRegionRegistration = featureContent.includes("TriggerRegisterEnterRegion");
      const hasRegionMaterialization =
        hasRectCall && hasCreateRegion && hasAddRect && hasEnterRegionRegistration;
      const hasTstlTriggerSeam =
        featureContent.includes("setupMidZoneShop") ||
        featureContent.includes("sourceAnchorSemanticName") ||
        featureContent.includes("realizationSitePathHint") ||
        configContent.includes("\"luaRuntime\": true") ||
        configContent.includes("\"japi\": true");

      if (hasRegionMaterialization) {
        return {
          status: "realization-site-evidence",
          sourceAnchorSemanticName,
          realizationSitePathHint,
          evidenceFiles,
          notes: [
            `The declared realization-site candidate '${realizationSitePathHint}' contains grouped rect/region materialization evidence for '${sourceAnchorSemanticName}'.`,
            "This is still review-oriented realization-site evidence, not runtime proof of a generated handle.",
          ],
        };
      }

      if (hasTstlTriggerSeam) {
        return {
          status: "rect-shape-only",
          sourceAnchorSemanticName,
          realizationSitePathHint,
          evidenceFiles,
          notes: [
            `The declared realization-site candidate '${realizationSitePathHint}' preserves trigger-area review shape for '${sourceAnchorSemanticName}'.`,
            "Current evidence does not yet include grouped rect/region materialization statements.",
          ],
        };
      }
    }

    return {
      status: "workspace-unrecognized",
      sourceAnchorSemanticName,
      realizationSitePathHint,
      evidenceFiles: [],
      notes: [
        ...connection.issues,
        "Trigger-area realization could not be checked against a recognized War3 workspace.",
      ],
    };
  }

  const evidenceFiles = resolveWar3HostEvidenceFiles(
    connection.context.workspaceRoot,
    connection.context.scriptEntry || null,
  );
  const evidenceTexts = evidenceFiles.map((filePath) => ({
    filePath,
    content: readFileSync(filePath, "utf-8"),
  }));

  const realizationSiteCandidates = evidenceTexts.filter((entry) =>
    entry.filePath.replace(/\\/g, "/").endsWith(realizationSitePathHint.replace(/\\/g, "/")),
  );
  const hasRegionMaterialization = realizationSiteCandidates.some(
    (entry) =>
      entry.content.includes("Rect(") &&
      entry.content.includes("CreateRegion") &&
      entry.content.includes("RegionAddRect") &&
      entry.content.includes("TriggerRegisterEnterRegion"),
  );
  const hasRectShape = realizationSiteCandidates.some(
    (entry) =>
      /gg_rct_/i.test(entry.content) ||
      entry.content.includes("Rect(") ||
      entry.content.includes("append_rect(") ||
      entry.content.includes("GetTriggeringRegion()") ||
      entry.content.includes("realizationSitePathHint"),
  );

  if (hasRegionMaterialization) {
    return {
      status: "realization-site-evidence",
      sourceAnchorSemanticName,
      realizationSitePathHint,
      evidenceFiles: realizationSiteCandidates.map((entry) => entry.filePath),
      notes: [
        `Host evidence files show grouped rect/region materialization statements at '${realizationSitePathHint}' for trigger-area '${sourceAnchorSemanticName}'.`,
        "This is realization-site evidence, but not runtime proof that the generated region handle is already wired end to end.",
      ],
    };
  }

  if (hasRectShape) {
    return {
      status: "rect-shape-only",
      sourceAnchorSemanticName,
      realizationSitePathHint,
      evidenceFiles: realizationSiteCandidates.map((entry) => entry.filePath),
      notes: [
        `Host evidence files show trigger-area shape at '${realizationSitePathHint}' for '${sourceAnchorSemanticName}'.`,
        "Current evidence does not yet include the full grouped rect/region materialization set.",
      ],
    };
  }

  return {
    status: "no-trigger-area-evidence",
    sourceAnchorSemanticName,
    realizationSitePathHint,
    evidenceFiles: realizationSiteCandidates.map((entry) => entry.filePath),
    notes: [
      `No trigger-area realization-site evidence was found at '${realizationSitePathHint}' for '${sourceAnchorSemanticName}'.`,
    ],
  };
}

function manifestsMatch(
  left: War3CurrentSliceHostBindingManifest,
  right: War3CurrentSliceHostBindingManifest,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseReviewPackageJsonFile<T>(packageDir: string, filename: string): T {
  const filePath = join(packageDir, filename);
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

export function validateWar3CurrentSliceReviewPackage(
  reviewPackage: War3ReviewPackage,
): War3ReviewPackageValidationResult {
  const issues: War3ReviewPackageValidationIssue[] = [];
  const bridgeManifest = reviewPackage.bridge.hostBinding.bindingManifest;
  const sidecarManifest = reviewPackage.sidecar.hostBindingManifest;
  const previewManifest = {
    schemaVersion: "war3-host-binding-manifest/current-slice-v1" as const,
    bindings: reviewPackage.writePreviewArtifact.hostBindingManifest.bindings,
  };
  const workspaceValidation = validateWar3WorkspaceShape(reviewPackage);
  const hostTargetValidation = validateWar3HostTargetHints(reviewPackage, workspaceValidation);
  const tstlDraftValidation = validateWar3TstlDraftArtifacts(reviewPackage);
  const runtimeHookValidation = validateWar3RuntimeHookAgainstHostRoot(reviewPackage);
  const shopTargetValidation = validateWar3ShopTargetAgainstHostRoot(reviewPackage);
  const triggerAreaValidation = validateWar3TriggerAreaAgainstHostRoot(reviewPackage);
  const shadowSiteEvidenceReview = reviewPackage.shadowSiteEvidenceReview;

  if (reviewPackage.bridge.blockers.length > 0) {
    issues.push({
      severity: "error",
      code: "BRIDGE_BLOCKERS_PRESENT",
      message: `Bridge still has blockers: ${reviewPackage.bridge.blockers.join(" | ")}`,
    });
  }

  if (!manifestsMatch(bridgeManifest, sidecarManifest)) {
    issues.push({
      severity: "error",
      code: "SIDECAR_MANIFEST_DRIFT",
      message: "Sidecar host-binding manifest drifted from bridge host-binding manifest.",
    });
  }

  if (!manifestsMatch(bridgeManifest, previewManifest)) {
    issues.push({
      severity: "error",
      code: "WRITE_PREVIEW_MANIFEST_DRIFT",
      message: "Write preview host-binding manifest drifted from bridge host-binding manifest.",
    });
  }

  if (
    reviewPackage.shadowRealizationPlan &&
    shadowSiteEvidenceReview &&
    reviewPackage.shadowRealizationPlan.siteContracts.length !== shadowSiteEvidenceReview.sites.length
  ) {
    issues.push({
      severity: "error",
      code: "SHADOW_SITE_EVIDENCE_COUNT_MISMATCH",
      message:
        `shadowRealizationPlan.siteContracts=${reviewPackage.shadowRealizationPlan.siteContracts.length} ` +
        `does not match shadowSiteEvidenceReview.sites=${shadowSiteEvidenceReview.sites.length}.`,
    });
  }

  const openBindingCount = countWar3CurrentSliceOpenBindings(bridgeManifest);
  if (reviewPackage.writePreviewArtifact.summary.unresolvedBindingCount !== openBindingCount) {
    issues.push({
      severity: "error",
      code: "SUMMARY_OPEN_BINDING_COUNT_MISMATCH",
      message: `Write preview summary unresolvedBindingCount=${reviewPackage.writePreviewArtifact.summary.unresolvedBindingCount} does not match manifest openBindingCount=${openBindingCount}.`,
    });
  }

  if (reviewPackage.writePreviewArtifact.hostBindingManifest.openBindingCount !== openBindingCount) {
    issues.push({
      severity: "error",
      code: "MANIFEST_OPEN_BINDING_COUNT_MISMATCH",
      message: `Write preview hostBindingManifest.openBindingCount=${reviewPackage.writePreviewArtifact.hostBindingManifest.openBindingCount} does not match bridge manifest openBindingCount=${openBindingCount}.`,
    });
  }

  if (bridgeManifest.bindings.shopAction.status !== "resolved") {
    issues.push({
      severity: "error",
      code: "SHOP_ACTION_NOT_RESOLVED",
      message: "Current slice requires shopAction binding to be resolved before implementation-draft validation.",
    });
  }

  if (
    reviewPackage.writePreviewArtifact.summary.targetBindingSymbol !==
    reviewPackage.sidecar.effectSemantics.targetBindingSymbol
  ) {
    issues.push({
      severity: "error",
      code: "TARGET_SYMBOL_MISMATCH",
      message: "Write preview targetBindingSymbol drifted from sidecar effectSemantics.targetBindingSymbol.",
    });
  }

  if (
    reviewPackage.writePreviewArtifact.summary.blueprintId !==
    reviewPackage.sidecar.sourceBlueprintId
  ) {
    issues.push({
      severity: "error",
      code: "BLUEPRINT_ID_MISMATCH",
      message: "Write preview blueprintId drifted from sidecar sourceBlueprintId.",
    });
  }

  if (
    !reviewPackage.skeletonModule.content.includes(reviewPackage.sidecar.effectSemantics.targetBindingSymbol)
  ) {
    issues.push({
      severity: "error",
      code: "SKELETON_TARGET_SYMBOL_MISSING",
      message: "Generated skeleton module does not reference the target binding symbol from the sidecar.",
    });
  }

  if (
    !reviewPackage.skeletonModule.content.includes(String(reviewPackage.sidecar.effectSemantics.orderId ?? ""))
  ) {
    issues.push({
      severity: "warning",
      code: "SKELETON_ORDER_ID_NOT_OBVIOUS",
      message: "Generated skeleton module does not obviously expose the current orderId.",
    });
  }

  const nonResolvedBindings = Object.values(bridgeManifest.bindings).filter(
    (binding) => binding.status !== "resolved",
  );
  for (const binding of nonResolvedBindings) {
    issues.push({
      severity: "warning",
      code: `OPEN_BINDING_${binding.kind.toUpperCase().replace(/-/g, "_")}`,
      message: `${binding.kind} remains ${binding.status} and still requires host-project review.`,
    });
  }

  if (workspaceValidation.readiness === "unrecognized") {
    issues.push({
      severity: "warning",
      code: "WORKSPACE_SHAPE_UNRECOGNIZED",
      message: workspaceValidation.notes.join(" | "),
    });
  } else if (workspaceValidation.flavor === "tstl-skeleton" && workspaceValidation.readiness === "partial") {
    issues.push({
      severity: "warning",
      code: "TSTL_WORKSPACE_PARTIAL",
      message: workspaceValidation.notes.join(" | "),
    });
  } else if (workspaceValidation.flavor === "tstl-skeleton") {
    issues.push({
      severity: "warning",
      code: "TSTL_WORKSPACE_RECOGNIZED_NOT_RUNTIME_PROVEN",
      message: workspaceValidation.notes.join(" | "),
    });
  }

  if (hostTargetValidation.status === "unrecognized") {
    issues.push({
      severity: "warning",
      code: "HOST_TARGET_HINTS_UNRECOGNIZED",
      message: hostTargetValidation.notes.join(" | "),
    });
  } else if (hostTargetValidation.status === "partially-aligned") {
    issues.push({
      severity: "warning",
      code: "HOST_TARGET_HINTS_PARTIAL",
      message: hostTargetValidation.notes.join(" | "),
    });
  }

  for (const checkedPath of hostTargetValidation.checkedPaths) {
    if (checkedPath.expectedToExistInSkeleton && !checkedPath.exists) {
      issues.push({
        severity: "warning",
        code: `HOST_TARGET_${checkedPath.purpose.toUpperCase().replace(/-/g, "_")}_MISSING`,
        message: `Review-only TSTL target '${checkedPath.path}' is expected in the skeleton workspace but was not found.`,
      });
    }

    if (checkedPath.purpose === "feature-module" && checkedPath.moduleNameAligned === false) {
      issues.push({
        severity: "warning",
        code: "HOST_TARGET_FEATURE_MODULE_NAME_MISMATCH",
        message: `Feature module target '${checkedPath.path}' does not align with skeleton module '${reviewPackage.writePreviewArtifact.skeletonModule.moduleName}.ts'.`,
      });
    }
  }

  if (tstlDraftValidation.status === "draft-slot-semantics-missing") {
    issues.push({
      severity: "warning",
      code: "TSTL_DRAFT_SLOT_SEMANTICS_MISSING",
      message: tstlDraftValidation.notes.join(" | "),
    });
  } else if (tstlDraftValidation.status === "draft-slot-semantics-partial") {
    issues.push({
      severity: "warning",
      code: "TSTL_DRAFT_SLOT_SEMANTICS_PARTIAL",
      message: tstlDraftValidation.notes.join(" | "),
    });
  }

  if (shadowSiteEvidenceReview) {
    for (const site of shadowSiteEvidenceReview.sites) {
      if (site.draftCheck.status === "all-markers-present") {
        continue;
      }

      issues.push({
        severity: "warning",
        code: `SHADOW_SITE_${site.siteId.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MARKERS_${site.draftCheck.status.toUpperCase().replace(/-/g, "_")}`,
        message:
          `Shadow site '${site.siteId}' is ${site.draftCheck.status}: ` +
          `present=${site.draftCheck.presentMarkers.join(", ") || "(none)"}; ` +
          `missing=${site.draftCheck.missingMarkers.join(", ") || "(none)"}.`,
      });
    }
  }

  if (runtimeHookValidation.status === "workspace-unrecognized") {
    issues.push({
      severity: "warning",
      code: "RUNTIME_HOOK_WORKSPACE_UNRECOGNIZED",
      message: runtimeHookValidation.notes.join(" | "),
    });
  } else if (runtimeHookValidation.status === "map-script-anchor-only") {
    issues.push({
      severity: "warning",
      code: "RUNTIME_HOOK_MAP_SCRIPT_ONLY",
      message: runtimeHookValidation.notes.join(" | "),
    });
  }

  if (shopTargetValidation.status === "workspace-unrecognized") {
    issues.push({
      severity: "warning",
      code: "SHOP_TARGET_WORKSPACE_UNRECOGNIZED",
      message: shopTargetValidation.notes.join(" | "),
    });
  } else if (shopTargetValidation.status === "declaration-site-evidence") {
    issues.push({
      severity: "warning",
      code: "SHOP_TARGET_DECLARATION_SITE_REVIEW_ONLY",
      message: shopTargetValidation.notes.join(" | "),
    });
  } else if (shopTargetValidation.status === "declaration-shape-only") {
    issues.push({
      severity: "warning",
      code: "SHOP_TARGET_DECLARATION_SHAPE_ONLY",
      message: shopTargetValidation.notes.join(" | "),
    });
  } else if (shopTargetValidation.status === "no-declaration-evidence") {
    issues.push({
      severity: "warning",
      code: "SHOP_TARGET_NO_DECLARATION_EVIDENCE",
      message: shopTargetValidation.notes.join(" | "),
    });
  }

  if (triggerAreaValidation.status === "workspace-unrecognized") {
    issues.push({
      severity: "warning",
      code: "TRIGGER_AREA_WORKSPACE_UNRECOGNIZED",
      message: triggerAreaValidation.notes.join(" | "),
    });
  } else if (triggerAreaValidation.status === "realization-site-evidence") {
    issues.push({
      severity: "warning",
      code: "TRIGGER_AREA_REALIZATION_SITE_REVIEW_ONLY",
      message: triggerAreaValidation.notes.join(" | "),
    });
  } else if (triggerAreaValidation.status === "rect-shape-only") {
    issues.push({
      severity: "warning",
      code: "TRIGGER_AREA_RECT_SHAPE_ONLY",
      message: triggerAreaValidation.notes.join(" | "),
    });
  } else if (triggerAreaValidation.status === "no-trigger-area-evidence") {
    issues.push({
      severity: "warning",
      code: "TRIGGER_AREA_NO_EVIDENCE",
      message: triggerAreaValidation.notes.join(" | "),
    });
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    readyForImplementationDraft:
      !issues.some((issue) => issue.severity === "error") &&
      nonResolvedBindings.length === 0,
    openBindingCount,
    workspaceValidation,
    hostTargetValidation,
    tstlDraftValidation,
    runtimeHookValidation,
    shopTargetValidation,
    triggerAreaValidation,
    issues,
  };
}

export function readWar3ReviewPackageFromDir(packageDir: string): War3ReviewPackage {
  const packageSummary = parseReviewPackageJsonFile<{
    files?: {
      bridge?: string;
      sidecar?: string;
      shadowRealizationPlan?: string;
      shadowDraftBundle?: string;
      shadowSiteEvidenceReview?: string;
      writePreview?: string;
      implementationDraftPlan?: string;
      skeletonModule?: string;
      tstlBootstrapDraft?: string;
      tstlFeatureDraft?: string;
      tstlHostBindingReview?: string;
    };
  }>(packageDir, "package.json");

  const bridgeFile = packageSummary.files?.bridge || "bridge.json";
  const sidecarFile = packageSummary.files?.sidecar || "sidecar.json";
  const shadowRealizationPlanFile =
    packageSummary.files?.shadowRealizationPlan || "shadow-realization-plan.json";
  const shadowDraftBundleFile =
    packageSummary.files?.shadowDraftBundle || "shadow-draft-bundle.json";
  const shadowSiteEvidenceReviewFile =
    packageSummary.files?.shadowSiteEvidenceReview || "shadow-site-evidence-review.json";
  const writePreviewFile = packageSummary.files?.writePreview || "write-preview.json";
  const skeletonFilename = packageSummary.files?.skeletonModule || "setupMidZoneShop.ts";
  const tstlBootstrapFilename = packageSummary.files?.tstlBootstrapDraft || "tstl-draft/src/host/bootstrap.ts";
  const tstlFeatureFilename =
    packageSummary.files?.tstlFeatureDraft || "tstl-draft/src/features/setupMidZoneShop.ts";
  const tstlHostBindingReviewFilename =
    packageSummary.files?.tstlHostBindingReview || "tstl-draft/rune_weaver/generated/host-binding/current-slice.json";
  const implementationDraftPlanFilename =
    packageSummary.files?.implementationDraftPlan || "implementation-draft-plan.json";

  const reviewPackage: War3ReviewPackage = {
    schemaVersion: "war3-review-package/current-slice-v1",
    generatedAt: new Date().toISOString(),
    packageName: packageDir.split(/[/\\]/).pop() || "war3-review-package",
    bridge: parseReviewPackageJsonFile(packageDir, bridgeFile),
    sidecar: parseReviewPackageJsonFile(packageDir, sidecarFile),
    writePreviewArtifact: parseReviewPackageJsonFile(packageDir, writePreviewFile),
    skeletonModule: {
      filename: skeletonFilename,
      content: readFileSync(join(packageDir, skeletonFilename), "utf-8"),
    },
    tstlHostDraft: {
      bootstrap: {
        filename: tstlBootstrapFilename.split(/[/\\]/).pop() || "bootstrap.ts",
        content: readFileSync(join(packageDir, tstlBootstrapFilename), "utf-8"),
      },
      featureModule: {
        filename: tstlFeatureFilename.split(/[/\\]/).pop() || "setupMidZoneShop.ts",
        content: readFileSync(join(packageDir, tstlFeatureFilename), "utf-8"),
      },
      hostBindingReview: {
        filename: tstlHostBindingReviewFilename.split(/[/\\]/).pop() || "current-slice.json",
        content: readFileSync(join(packageDir, tstlHostBindingReviewFilename), "utf-8"),
      },
    },
  };

  if (existsSync(join(packageDir, shadowRealizationPlanFile))) {
    reviewPackage.shadowRealizationPlan = parseReviewPackageJsonFile(
      packageDir,
      shadowRealizationPlanFile,
    );
  }

  if (existsSync(join(packageDir, shadowDraftBundleFile))) {
    reviewPackage.shadowDraftBundle = parseReviewPackageJsonFile(
      packageDir,
      shadowDraftBundleFile,
    );
  }

  if (existsSync(join(packageDir, shadowSiteEvidenceReviewFile))) {
    reviewPackage.shadowSiteEvidenceReview = parseReviewPackageJsonFile(
      packageDir,
      shadowSiteEvidenceReviewFile,
    );
  }

  if (existsSync(join(packageDir, implementationDraftPlanFilename))) {
    reviewPackage.implementationDraftPlan = parseReviewPackageJsonFile(
      packageDir,
      implementationDraftPlanFilename,
    );
  }

  return reviewPackage;
}

export function exportWar3ReviewPackage(
  reviewPackage: War3ReviewPackage,
  outputDir = getDefaultWar3ReviewPackageOutputDir(),
): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const packageDir = join(outputDir, reviewPackage.packageName);
  mkdirSync(packageDir, { recursive: true });

  const summary = {
    schemaVersion: reviewPackage.schemaVersion,
    generatedAt: reviewPackage.generatedAt,
    packageName: reviewPackage.packageName,
    sliceKind: reviewPackage.writePreviewArtifact.summary.sliceKind,
    blueprintId: reviewPackage.writePreviewArtifact.summary.blueprintId,
    targetBindingSymbol: reviewPackage.writePreviewArtifact.summary.targetBindingSymbol,
    unresolvedBindingCount: reviewPackage.writePreviewArtifact.summary.unresolvedBindingCount,
    files: {
      bridge: "bridge.json",
      sidecar: "sidecar.json",
      ...(reviewPackage.shadowRealizationPlan
        ? { shadowRealizationPlan: "shadow-realization-plan.json" }
        : {}),
      ...(reviewPackage.shadowDraftBundle
        ? { shadowDraftBundle: "shadow-draft-bundle.json" }
        : {}),
      ...(reviewPackage.shadowSiteEvidenceReview
        ? { shadowSiteEvidenceReview: "shadow-site-evidence-review.json" }
        : {}),
      writePreview: "write-preview.json",
      implementationDraftPlan: "implementation-draft-plan.json",
      skeletonModule: reviewPackage.skeletonModule.filename,
      tstlBootstrapDraft: "tstl-draft/src/host/bootstrap.ts",
      tstlFeatureDraft: `tstl-draft/src/features/${reviewPackage.tstlHostDraft.featureModule.filename}`,
      tstlHostBindingReview: "tstl-draft/rune_weaver/generated/host-binding/current-slice.json",
    },
  };

  writeFileSync(join(packageDir, "package.json"), JSON.stringify(summary, null, 2), "utf-8");
  writeFileSync(join(packageDir, "bridge.json"), JSON.stringify(reviewPackage.bridge, null, 2), "utf-8");
  writeFileSync(join(packageDir, "sidecar.json"), JSON.stringify(reviewPackage.sidecar, null, 2), "utf-8");
  if (reviewPackage.shadowRealizationPlan) {
    writeFileSync(
      join(packageDir, "shadow-realization-plan.json"),
      JSON.stringify(reviewPackage.shadowRealizationPlan, null, 2),
      "utf-8",
    );
  }
  if (reviewPackage.shadowDraftBundle) {
    writeFileSync(
      join(packageDir, "shadow-draft-bundle.json"),
      JSON.stringify(reviewPackage.shadowDraftBundle, null, 2),
      "utf-8",
    );
  }
  if (reviewPackage.shadowSiteEvidenceReview) {
    writeFileSync(
      join(packageDir, "shadow-site-evidence-review.json"),
      JSON.stringify(reviewPackage.shadowSiteEvidenceReview, null, 2),
      "utf-8",
    );
  }
  writeFileSync(
    join(packageDir, "write-preview.json"),
    JSON.stringify(reviewPackage.writePreviewArtifact, null, 2),
    "utf-8",
  );
  if (reviewPackage.implementationDraftPlan) {
    writeFileSync(
      join(packageDir, "implementation-draft-plan.json"),
      JSON.stringify(reviewPackage.implementationDraftPlan, null, 2),
      "utf-8",
    );
  }
  writeFileSync(join(packageDir, reviewPackage.skeletonModule.filename), reviewPackage.skeletonModule.content, "utf-8");
  const tstlBootstrapDir = join(packageDir, "tstl-draft", "src", "host");
  const tstlFeatureDir = join(packageDir, "tstl-draft", "src", "features");
  const tstlBindingDir = join(packageDir, "tstl-draft", "rune_weaver", "generated", "host-binding");
  mkdirSync(tstlBootstrapDir, { recursive: true });
  mkdirSync(tstlFeatureDir, { recursive: true });
  mkdirSync(tstlBindingDir, { recursive: true });
  writeFileSync(
    join(tstlBootstrapDir, reviewPackage.tstlHostDraft.bootstrap.filename),
    reviewPackage.tstlHostDraft.bootstrap.content,
    "utf-8",
  );
  writeFileSync(
    join(tstlFeatureDir, reviewPackage.tstlHostDraft.featureModule.filename),
    reviewPackage.tstlHostDraft.featureModule.content,
    "utf-8",
  );
  writeFileSync(
    join(tstlBindingDir, reviewPackage.tstlHostDraft.hostBindingReview.filename),
    reviewPackage.tstlHostDraft.hostBindingReview.content,
    "utf-8",
  );

  const readme = [
    "# War3 Review Package",
    "",
    `- package: ${reviewPackage.packageName}`,
    `- slice: ${reviewPackage.writePreviewArtifact.summary.sliceKind}`,
    `- blueprint: ${reviewPackage.writePreviewArtifact.summary.blueprintId}`,
    `- target symbol: ${reviewPackage.writePreviewArtifact.summary.targetBindingSymbol}`,
    `- unresolved bindings: ${reviewPackage.writePreviewArtifact.summary.unresolvedBindingCount}`,
    "",
    "Files:",
    "- `package.json`: package summary and file index",
    "- `bridge.json`: intent-like meaning plus host-binding split",
    "- `sidecar.json`: War3-local post-Blueprint / pre-Assembly seam",
    ...(reviewPackage.shadowRealizationPlan
      ? ["- `shadow-realization-plan.json`: adapter-local shadow realization plan for the bounded War3 lane"]
      : []),
    ...(reviewPackage.shadowDraftBundle
      ? ["- `shadow-draft-bundle.json`: bounded review-oriented draft file set derived from the shadow realization plan"]
      : []),
    ...(reviewPackage.shadowSiteEvidenceReview
      ? ["- `shadow-site-evidence-review.json`: deterministic declaration-site / realization-site marker checks derived from the shadow draft bundle"]
      : []),
    "- `write-preview.json`: review artifact bundle with host-binding manifest",
    "- `implementation-draft-plan.json`: narrow implementation-draft consumer artifact derived from hostBindingDraft",
    `- \`${reviewPackage.skeletonModule.filename}\`: generated TypeScript-to-Lua skeleton draft`,
    "- `tstl-draft/src/host/bootstrap.ts`: review-only TSTL bootstrap draft",
    `- \`tstl-draft/src/features/${reviewPackage.tstlHostDraft.featureModule.filename}\`: review-only TSTL feature draft`,
    "- `tstl-draft/rune_weaver/generated/host-binding/current-slice.json`: review-only TSTL host-binding handoff",
    "",
    "This package is review-oriented and does not claim War3 host-write readiness.",
    "",
  ].join("\n");

  writeFileSync(join(packageDir, "README.md"), readme, "utf-8");

  return packageDir;
}

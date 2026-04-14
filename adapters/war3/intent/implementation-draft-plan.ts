import type { War3ReviewPackage, War3ReviewPackageValidationResult } from "./review-package.js";

export type War3ImplementationDraftPlanEntry = {
  id: string;
  artifactKind: "bootstrap-module" | "feature-module" | "host-binding-review";
  operation: "review-create";
  targetPathHint: string;
  contentType: "typescript" | "json";
  content: string;
  consumedBindings: Array<"runtime-hook" | "trigger-area" | "shop-target">;
  sourceEvidence: string[];
  status: "review-only-draft";
  notes: string[];
};

export type War3ImplementationDraftPlan = {
  schemaVersion: "war3-implementation-draft-plan/current-slice-v1";
  generatedAt: string;
  packageName: string;
  blueprintId: string;
  host: War3ReviewPackage["bridge"]["hostBinding"]["host"];
  workspaceFlavor: War3ReviewPackageValidationResult["workspaceValidation"]["flavor"];
  status: "review-only";
  evidenceLevel: "binding-draft";
  entries: War3ImplementationDraftPlanEntry[];
  openBindings: Array<{
    kind: string;
    status: string;
    note: string;
  }>;
  readiness: {
    readyForImplementationDraft: boolean;
    blockerCodes: string[];
    notes: string[];
    validationSnapshot: {
      workspaceReadiness: War3ReviewPackageValidationResult["workspaceValidation"]["readiness"];
      hostTargetValidation: War3ReviewPackageValidationResult["hostTargetValidation"]["status"];
      tstlDraftValidation: War3ReviewPackageValidationResult["tstlDraftValidation"]["status"];
      runtimeHookValidation: War3ReviewPackageValidationResult["runtimeHookValidation"]["status"];
      shopTargetValidation: War3ReviewPackageValidationResult["shopTargetValidation"]["status"];
      triggerAreaValidation: War3ReviewPackageValidationResult["triggerAreaValidation"]["status"];
    };
  };
  notes: string[];
};

export function buildWar3ImplementationDraftPlan(
  reviewPackage: War3ReviewPackage,
  validation: War3ReviewPackageValidationResult,
): War3ImplementationDraftPlan {
  const openBindings = Object.values(reviewPackage.sidecar.hostBindingManifest.bindings)
    .filter((binding) => binding.status !== "resolved")
    .map((binding) => ({
      kind: binding.kind,
      status: binding.status,
      note: binding.note,
    }));

  const entries: War3ImplementationDraftPlanEntry[] = [
    {
      id: "runtime-hook-bootstrap",
      artifactKind: "bootstrap-module",
      operation: "review-create",
      targetPathHint: reviewPackage.writePreviewArtifact.tstlHostDraft.bootstrapModule.pathHint,
      contentType: "typescript",
      content: reviewPackage.tstlHostDraft.bootstrap.content,
      consumedBindings: ["runtime-hook"],
      sourceEvidence: [
        "tstlHostDraft.bootstrapModule",
        "hostBindingDraft.runtimeHook",
      ],
      status: "review-only-draft",
      notes: [
        "Bootstrap draft is the narrow runtime-hook integration seam.",
        "This entry remains review-only and does not claim write readiness.",
      ],
    },
    {
      id: "mid-zone-shop-feature",
      artifactKind: "feature-module",
      operation: "review-create",
      targetPathHint: reviewPackage.writePreviewArtifact.tstlHostDraft.featureModule.pathHint,
      contentType: "typescript",
      content: reviewPackage.tstlHostDraft.featureModule.content,
      consumedBindings: ["trigger-area", "shop-target", "runtime-hook"],
      sourceEvidence: [
        "tstlHostDraft.featureModule",
        "hostBindingDraft.triggerArea",
        "hostBindingDraft.shopTarget",
        "hostBindingDraft.runtimeHook",
      ],
      status: "review-only-draft",
      notes: [
        "Feature draft carries slot-level trigger-area and shop-target semantics.",
        "Runtime hook remains represented here only as a path-hinted integration seam.",
      ],
    },
    {
      id: "host-binding-review-json",
      artifactKind: "host-binding-review",
      operation: "review-create",
      targetPathHint: reviewPackage.writePreviewArtifact.tstlHostDraft.hostBindingReview.pathHint,
      contentType: "json",
      content: reviewPackage.tstlHostDraft.hostBindingReview.content,
      consumedBindings: ["runtime-hook", "trigger-area", "shop-target"],
      sourceEvidence: [
        "tstlHostDraft.hostBindingReview",
        "hostBindingManifest",
        "hostBindingDraft",
      ],
      status: "review-only-draft",
      notes: [
        "RW-owned JSON review artifact preserves unresolved binding truth beside the module drafts.",
      ],
    },
  ];

  const blockerCodes = validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);

  return {
    schemaVersion: "war3-implementation-draft-plan/current-slice-v1",
    generatedAt: new Date().toISOString(),
    packageName: reviewPackage.packageName,
    blueprintId: reviewPackage.writePreviewArtifact.summary.blueprintId,
    host: reviewPackage.bridge.hostBinding.host,
    workspaceFlavor: validation.workspaceValidation.flavor,
    status: "review-only",
    evidenceLevel: "binding-draft",
    entries,
    openBindings,
    readiness: {
      readyForImplementationDraft: validation.readyForImplementationDraft,
      blockerCodes,
      notes: [
        "This plan is derived from hostBindingDraft-backed review artifacts.",
        "It is narrower than the write preview, but it still does not claim runtime-proven host binding.",
      ],
      validationSnapshot: {
        workspaceReadiness: validation.workspaceValidation.readiness,
        hostTargetValidation: validation.hostTargetValidation.status,
        tstlDraftValidation: validation.tstlDraftValidation.status,
        runtimeHookValidation: validation.runtimeHookValidation.status,
        shopTargetValidation: validation.shopTargetValidation.status,
        triggerAreaValidation: validation.triggerAreaValidation.status,
      },
    },
    notes: [
      "Use this artifact as a narrow consumer-facing implementation draft plan for the current War3 slice.",
      "If downstream steps need stronger claims, they must prove declaration-site and realization-site evidence in a real host project.",
    ],
  };
}

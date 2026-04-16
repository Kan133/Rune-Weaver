import type { War3CurrentSliceArtifactInput } from "./current-slice-bridge.js";
import type { War3CurrentSliceAssemblySidecar } from "./war3-assembly-sidecar.js";
import type { War3ShadowRealizationPlan } from "./shadow-realization-plan.js";
import type { War3ShadowDraftBundle } from "../generator/shadow-draft-bundle.js";
import type { War3ShadowSiteEvidenceReview } from "./shadow-site-evidence-review.js";
import type { War3ReviewPackageValidationResult } from "./review-package.js";

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
  host: War3CurrentSliceArtifactInput["host"];
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

function getUnit(
  plan: War3ShadowRealizationPlan,
  fileRole: "bootstrap-module" | "feature-module" | "host-binding-review",
) {
  const unit = plan.realizationUnits.find((candidate) => candidate.fileRole === fileRole);
  if (!unit) {
    throw new Error(`Shadow realization plan is missing a unit for fileRole='${fileRole}'.`);
  }

  return unit;
}

export function buildWar3ImplementationDraftPlan(input: {
  packageName: string;
  host: War3CurrentSliceArtifactInput["host"];
  sidecar: War3CurrentSliceAssemblySidecar;
  shadowRealizationPlan: War3ShadowRealizationPlan;
  shadowDraftBundle: War3ShadowDraftBundle;
  shadowSiteEvidenceReview?: War3ShadowSiteEvidenceReview;
  validation: War3ReviewPackageValidationResult;
}): War3ImplementationDraftPlan {
  const openBindings = Object.values(input.sidecar.hostBindingManifest.bindings)
    .filter((binding) => binding.status !== "resolved")
    .map((binding) => ({
      kind: binding.kind,
      status: binding.status,
      note: binding.note,
    }));

  const bootstrapUnit = getUnit(input.shadowRealizationPlan, "bootstrap-module");
  const featureUnit = getUnit(input.shadowRealizationPlan, "feature-module");
  const hostBindingReviewUnit = getUnit(input.shadowRealizationPlan, "host-binding-review");
  const sourceEvidenceForSiteIds = (siteIds: string[]) =>
    siteIds.map((siteId) => {
      const matchingSite = input.shadowSiteEvidenceReview?.sites.find((site) => site.siteId === siteId);
      return matchingSite
        ? `shadowSiteEvidenceReview:${matchingSite.siteId}:${matchingSite.draftCheck.status}`
        : `shadowSiteContract:${siteId}`;
    });

  const entries: War3ImplementationDraftPlanEntry[] = [
    {
      id: "runtime-hook-bootstrap",
      artifactKind: "bootstrap-module",
      operation: "review-create",
      targetPathHint: input.shadowDraftBundle.draftFiles.bootstrap.pathHint,
      contentType: input.shadowDraftBundle.draftFiles.bootstrap.contentType,
      content: input.shadowDraftBundle.draftFiles.bootstrap.content,
      consumedBindings: [...bootstrapUnit.consumedBindings],
      sourceEvidence: [
        `shadowRealizationPlan:${bootstrapUnit.unitId}`,
        `shadowDraftBundle:${input.shadowDraftBundle.draftFiles.bootstrap.sourceUnitId}`,
        ...sourceEvidenceForSiteIds(input.shadowDraftBundle.draftFiles.bootstrap.linkedSiteIds),
      ],
      status: "review-only-draft",
      notes: [
        ...input.shadowDraftBundle.draftFiles.bootstrap.notes,
        "Bootstrap draft is the narrow runtime-hook integration seam.",
      ],
    },
    {
      id: "mid-zone-shop-feature",
      artifactKind: "feature-module",
      operation: "review-create",
      targetPathHint: input.shadowDraftBundle.draftFiles.featureModule.pathHint,
      contentType: input.shadowDraftBundle.draftFiles.featureModule.contentType,
      content: input.shadowDraftBundle.draftFiles.featureModule.content,
      consumedBindings: [...featureUnit.consumedBindings],
      sourceEvidence: [
        `shadowRealizationPlan:${featureUnit.unitId}`,
        `shadowDraftBundle:${input.shadowDraftBundle.draftFiles.featureModule.sourceUnitId}`,
        ...sourceEvidenceForSiteIds(input.shadowDraftBundle.draftFiles.featureModule.linkedSiteIds),
      ],
      status: "review-only-draft",
      notes: [
        ...input.shadowDraftBundle.draftFiles.featureModule.notes,
        "Feature draft carries slot-level trigger-area and shop-target semantics.",
      ],
    },
    {
      id: "host-binding-review-json",
      artifactKind: "host-binding-review",
      operation: "review-create",
      targetPathHint: input.shadowDraftBundle.draftFiles.hostBindingReview.pathHint,
      contentType: input.shadowDraftBundle.draftFiles.hostBindingReview.contentType,
      content: input.shadowDraftBundle.draftFiles.hostBindingReview.content,
      consumedBindings: [...hostBindingReviewUnit.consumedBindings],
      sourceEvidence: [
        `shadowRealizationPlan:${hostBindingReviewUnit.unitId}`,
        `shadowDraftBundle:${input.shadowDraftBundle.draftFiles.hostBindingReview.sourceUnitId}`,
        ...sourceEvidenceForSiteIds(input.shadowDraftBundle.draftFiles.hostBindingReview.linkedSiteIds),
      ],
      status: "review-only-draft",
      notes: [
        ...input.shadowDraftBundle.draftFiles.hostBindingReview.notes,
        "RW-owned JSON review artifact preserves unresolved binding truth beside the module drafts.",
      ],
    },
  ];

  const blockerCodes = input.validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);

  return {
    schemaVersion: "war3-implementation-draft-plan/current-slice-v1",
    generatedAt: new Date().toISOString(),
    packageName: input.packageName,
    blueprintId: input.shadowRealizationPlan.sourceBlueprintId,
    host: input.host,
    workspaceFlavor: input.validation.workspaceValidation.flavor,
    status: "review-only",
    evidenceLevel: "binding-draft",
    entries,
    openBindings,
    readiness: {
      readyForImplementationDraft: input.validation.readyForImplementationDraft,
      blockerCodes,
      notes: [
        "This plan is derived from the adapter-local shadow realization plan and shadow draft bundle.",
        "It remains narrower than a write plan and does not claim runtime-proven host binding.",
      ],
      validationSnapshot: {
        workspaceReadiness: input.validation.workspaceValidation.readiness,
        hostTargetValidation: input.validation.hostTargetValidation.status,
        tstlDraftValidation: input.validation.tstlDraftValidation.status,
        runtimeHookValidation: input.validation.runtimeHookValidation.status,
        shopTargetValidation: input.validation.shopTargetValidation.status,
        triggerAreaValidation: input.validation.triggerAreaValidation.status,
      },
    },
    notes: [
      "Use this artifact as a narrow consumer-facing implementation draft plan for the current War3 slice.",
      "If downstream steps need stronger claims, they must prove declaration-site and realization-site evidence in a real host project.",
    ],
  };
}

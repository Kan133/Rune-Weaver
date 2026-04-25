import type {
  AssemblyPlan,
  GeneratorRoutingPlan,
  HostRealizationPlan,
} from "../../../../core/schema/types.js";
import type { Dota2ReviewArtifact } from "../../dota2-cli.js";

type ArtifactSynthesisStage = NonNullable<Dota2ReviewArtifact["stages"]["artifactSynthesis"]>;
type GeneratorRoutingStage = NonNullable<Dota2ReviewArtifact["stages"]["generatorRouting"]>;

export function buildArtifactSynthesisStageFromPlan(
  plan: AssemblyPlan | null | undefined,
): ArtifactSynthesisStage {
  if (!plan?.artifactSynthesisResult) {
    return {
      success: true,
      triggered: false,
      artifacts: [],
      warnings: [],
      blockers: [],
      groundingSummary: {
        status: "none_required",
        reviewRequired: false,
        verifiedSymbolCount: 0,
        allowlistedSymbolCount: 0,
        weakSymbolCount: 0,
        unknownSymbolCount: 0,
        warningCount: 0,
        reasonCodes: [],
      },
      groundingOffenders: [],
      skipped: true,
    };
  }

  const groundingSummary = plan.artifactSynthesisResult.groundingAssessment;
  const groundingOffenders = (plan.moduleRecords || [])
    .filter((record) =>
      record.sourceKind === "synthesized"
      && record.groundingAssessment
      && record.groundingAssessment.reviewRequired,
    )
    .map((record) => ({
      moduleId: record.moduleId,
      status: record.groundingAssessment!.status,
      reviewRequired: record.groundingAssessment!.reviewRequired,
      verifiedSymbolCount: record.groundingAssessment!.verifiedSymbolCount,
      allowlistedSymbolCount: record.groundingAssessment!.allowlistedSymbolCount,
      weakSymbolCount: record.groundingAssessment!.weakSymbolCount,
      unknownSymbolCount: record.groundingAssessment!.unknownSymbolCount,
      warningCount: record.groundingAssessment!.warnings.length,
      reasonCodes: record.groundingAssessment!.reasonCodes,
    }));

  return {
    success: plan.artifactSynthesisResult.success,
    triggered: true,
    strategy: plan.artifactSynthesisResult.strategy,
    sourceKind: plan.artifactSynthesisResult.sourceKind,
    promptPackageId: plan.artifactSynthesisResult.promptPackageId,
    artifacts: plan.artifactSynthesisResult.artifacts.map((item) => ({
      id: item.id,
      moduleId: item.moduleId,
      outputKind: item.outputKind,
      targetPath: item.targetPath,
      summary: item.summary,
    })),
    bundles: plan.artifactSynthesisResult.bundles?.map((bundle) => ({
      bundleId: bundle.bundleId,
      kind: bundle.kind,
      primaryModuleId: bundle.primaryModuleId,
      moduleIds: bundle.moduleIds,
      artifactIds: plan.artifactSynthesisResult!.artifacts
        .filter((artifactItem) => artifactItem.bundleId === bundle.bundleId)
        .map((artifactItem) => artifactItem.id),
    })),
    moduleBundleMap: (plan.moduleRecords || [])
      .filter((record) => record.sourceKind === "synthesized" && typeof record.bundleId === "string")
      .map((record) => ({
        moduleId: record.moduleId,
        bundleId: record.bundleId!,
      })),
    bundleArtifacts: plan.artifactSynthesisResult.bundles?.map((bundle) => {
      const artifacts = plan.artifactSynthesisResult!.artifacts.filter(
        (artifactItem) => artifactItem.bundleId === bundle.bundleId,
      );
      return {
        bundleId: bundle.bundleId,
        artifactIds: artifacts.map((artifactItem) => artifactItem.id),
        targetPaths: artifacts.map((artifactItem) => artifactItem.targetPath),
      };
    }),
    synthesizedModuleIds: (plan.moduleRecords || [])
      .filter((record) => record.sourceKind === "synthesized")
      .map((record) => record.moduleId),
    warnings: plan.artifactSynthesisResult.warnings,
    blockers: plan.artifactSynthesisResult.blockers,
    retrievalSummary: plan.artifactSynthesisResult.retrievalSummary?.tiersUsed.length
      ? `${plan.artifactSynthesisResult.retrievalSummary.evidenceCount} refs across tiers ${plan.artifactSynthesisResult.retrievalSummary.tiersUsed.join(", ")}`
      : undefined,
    evidenceRefs: plan.artifactSynthesisResult.evidenceRefs?.map((item) => ({
      title: item.title,
      sourceKind: item.sourceKind,
      path: item.path,
    })),
    mustNotAddViolations: plan.artifactSynthesisResult.moduleResults?.flatMap((item) => item.mustNotAddViolations || []) || [],
    groundingSummary: groundingSummary
      ? {
        status: groundingSummary.status,
        reviewRequired: groundingSummary.reviewRequired,
        verifiedSymbolCount: groundingSummary.verifiedSymbolCount,
        allowlistedSymbolCount: groundingSummary.allowlistedSymbolCount,
        weakSymbolCount: groundingSummary.weakSymbolCount,
        unknownSymbolCount: groundingSummary.unknownSymbolCount,
        warningCount: groundingSummary.warnings.length,
        reasonCodes: groundingSummary.reasonCodes,
      }
      : undefined,
    groundingOffenders,
    grounding: plan.artifactSynthesisResult.grounding?.map((item) => ({
      artifactId: item.artifactId,
      verifiedSymbols: item.verifiedSymbols,
      allowlistedSymbols: item.allowlistedSymbols,
      weakSymbols: item.weakSymbols,
      unknownSymbols: item.unknownSymbols,
      warnings: item.warnings,
    })),
  };
}

export function buildHostRealizationStage(
  hostRealizationPlan: HostRealizationPlan,
): Dota2ReviewArtifact["stages"]["hostRealization"] {
  return {
    success: hostRealizationPlan.blockers.length === 0,
    units: hostRealizationPlan.units.map((unit) => ({
      id: unit.id,
      sourceModuleId: unit.sourceModuleId,
      sourcePatternIds: unit.sourcePatternIds,
      sourceKind: unit.sourceKind,
      role: unit.role,
      realizationType: unit.realizationType,
      hostTargets: unit.hostTargets,
      confidence: unit.confidence,
      blockers: unit.blockers,
    })),
    blockers: hostRealizationPlan.blockers,
  };
}

export function buildGeneratorRoutingStage(
  generatorRoutingPlan: GeneratorRoutingPlan,
): GeneratorRoutingStage {
  return {
    success: generatorRoutingPlan.blockers.length === 0,
    routes: generatorRoutingPlan.routes.map((route) => ({
      id: route.id,
      sourceUnitId: route.sourceUnitId,
      sourceKind: route.sourceKind,
      generatorFamily: route.generatorFamily,
      routeKind: route.routeKind,
      hostTarget: route.hostTarget,
      rationale: route.rationale,
      blockers: route.blockers,
    })),
    warnings: generatorRoutingPlan.warnings,
    blockers: generatorRoutingPlan.blockers,
  };
}

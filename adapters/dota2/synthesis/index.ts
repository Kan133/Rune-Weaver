import type {
  ArtifactSynthesisResult,
  AssemblyModule,
  AssemblyPlan,
  Blueprint,
  BridgeUpdate,
  EvidenceRef,
  GroundingCheckResult,
  HostWriteReadiness,
  HostRealizationOutput,
  ImplementationStrategy,
  ModuleImplementationRecord,
  ModuleSynthesisResult,
  SynthesisBundleKind,
  SynthesisBundlePlan,
  SynthesisTargetProfile,
  SynthesizedArtifact,
  UnresolvedModuleNeed,
  ValidationContract,
  WriteTarget,
} from "../../../core/schema/types.js";
import { createLLMClientFromEnv, isLLMConfigured, readLLMExecutionConfig } from "../../../core/llm/factory.js";
import { detectMustNotAddViolations } from "../../../core/llm/prompt-constraints.js";
import { buildModuleSynthesisPromptPackage } from "../../../core/llm/prompt-packages.js";
import type { PatternResolutionResult } from "../../../core/patterns/resolver.js";
import { buildDota2RetrievalBundle, lookupDota2HostSymbolsExact } from "../../../core/retrieval/index.js";

interface LLMArtifactCandidate {
  content?: string;
  summary?: string;
  assumptions?: string[];
  unresolvedAssumptions?: string[];
}

const SYNTHESIS_ARTIFACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    content: { type: "string" },
    summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
    unresolvedAssumptions: { type: "array", items: { type: "string" } },
  },
  required: ["content"],
} as const;

function sanitizeId(value: string): string {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function buildAbilityName(featureId: string, moduleId?: string): string {
  const base = sanitizeId(featureId) || "feature";
  const moduleSuffix = sanitizeId(moduleId || "");
  return moduleSuffix ? `rw_${base}_${moduleSuffix}` : `rw_${base}`;
}

function resolveAbilityBehavior(blueprint: Blueprint): string {
  const context = [
    blueprint.summary,
    blueprint.sourceIntent.goal,
    ...blueprint.modules.map((module) => module.role),
  ]
    .join(" ")
    .toLowerCase();

  if (/(passive|intrinsic|aura)/.test(context)) {
    return "DOTA_ABILITY_BEHAVIOR_PASSIVE";
  }
  if (/(point|cursor|area|ground|location)/.test(context)) {
    return "DOTA_ABILITY_BEHAVIOR_POINT";
  }
  if (/(target|enemy|ally|unit|hero)/.test(context)) {
    return "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET";
  }
  return "DOTA_ABILITY_BEHAVIOR_NO_TARGET";
}

function buildLuaAbilityContent(
  abilityName: string,
  behavior: string,
  blueprint: Blueprint,
): string {
  const isPassive = behavior === "DOTA_ABILITY_BEHAVIOR_PASSIVE";
  const summary = blueprint.summary.replace(/\r?\n/g, " ").trim();

  const body = isPassive
    ? [
        `function ${abilityName}:GetIntrinsicModifierName()`,
        "  return nil",
        "end",
      ].join("\n")
    : [
        `function ${abilityName}:OnSpellStart()`,
        "  local caster = self:GetCaster()",
        "  if not caster then",
        "    return",
        "  end",
        "",
        "  -- Synthesized exploratory shell. Review and extend the gameplay body as needed.",
        "  local origin = caster:GetAbsOrigin()",
        "  EmitSoundOn(\"Hero_OgreMagi.Bloodlust.Target\", caster)",
        "  caster:SetAbsOrigin(origin)",
        "end",
      ].join("\n");

  return [
    `if ${abilityName} == nil then`,
    `  ${abilityName} = class({})`,
    "end",
    "",
    `-- Synthesized exploratory shell for: ${summary || blueprint.sourceIntent.goal}`,
    body,
    "",
  ].join("\n");
}

function buildAbilityKVContent(
  abilityName: string,
  behavior: string,
  blueprint: Blueprint,
): string {
  const cooldown = blueprint.parameters?.cooldown ?? 8;
  const manaCost = blueprint.parameters?.manaCost ?? blueprint.parameters?.mana ?? 50;
  const castRange = blueprint.parameters?.castRange ?? blueprint.parameters?.range ?? 0;

  return [
    `"${abilityName}"`,
    "{",
    '  "BaseClass"                "ability_lua"',
    '  "AbilityType"              "DOTA_ABILITY_TYPE_BASIC"',
    `  "AbilityBehavior"          "${behavior}"`,
    `  "AbilityCooldown"          "${String(cooldown)}"`,
    `  "AbilityManaCost"          "${String(manaCost)}"`,
    `  "AbilityCastRange"         "${String(castRange)}"`,
    '  "AbilityCastPoint"         "0.1"',
    `  "ScriptFile"               "rune_weaver/abilities/${abilityName}"`,
    "}",
  ].join("\n");
}

function buildUITsxContent(componentSeed: string, blueprint: Blueprint): string {
  const title = blueprint.summary.replace(/\r?\n/g, " ").trim() || blueprint.sourceIntent.goal;
  return [
    "import React from \"react\";",
    "",
    `export function ${toComponentName(componentSeed)}(): JSX.Element {`,
    "  return (",
    "    <Panel className=\"rw-v2-synth-panel\">",
    `      <Label className=\"rw-v2-synth-title\" text=\"${escapePanoramaText(title)}\" />`,
    "      <Label",
    "        className=\"rw-v2-synth-body\"",
    "        text=\"Synthesized V2 UI shell. Review and refine the interaction details.\"",
    "      />",
    "    </Panel>",
    "  );",
    "}",
    "",
    `export default ${toComponentName(componentSeed)};`,
    "",
  ].join("\n");
}

function buildUiLessContent(): string {
  return [
    ".rw-v2-synth-panel {",
    "  width: 320px;",
    "  min-height: 120px;",
    "  flow-children: down;",
    "  padding: 16px;",
    "  background-color: gradient(linear, 0% 0%, 0% 100%, from(#16202fdd), to(#0a1018ee));",
    "  border: 1px solid #6e8aa8;",
    "}",
    "",
    ".rw-v2-synth-title {",
    "  font-size: 22px;",
    "  color: #f2e7bf;",
    "  margin-bottom: 8px;",
    "}",
    "",
    ".rw-v2-synth-body {",
    "  font-size: 18px;",
    "  color: #c7d2dc;",
    "}",
    "",
  ].join("\n");
}

function escapePanoramaText(value: string): string {
  return value.replace(/"/g, '\\"');
}

function toComponentName(featureId: string): string {
  return sanitizeId(featureId)
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("") || "RuneWeaverSynthPanel";
}

function buildBridgeUpdates(hasGameplay: boolean, hasUI: boolean): BridgeUpdate[] {
  const updates: BridgeUpdate[] = [];

  if (hasGameplay) {
    updates.push(
      { target: "server", file: "rune_weaver/index.ts", action: "create" },
      { target: "server", file: "rune_weaver/generated/server/index.ts", action: "refresh" },
      { target: "server", file: "game/scripts/src/modules/index.ts", action: "inject_once" },
    );
  }

  if (hasUI) {
    updates.push(
      { target: "ui", file: "rune_weaver/index.tsx", action: "create" },
      { target: "ui", file: "rune_weaver/generated/ui/index.tsx", action: "refresh" },
      { target: "ui", file: "content/panorama/src/hud/script.tsx", action: "inject_once" },
    );
  }

  return updates;
}

function buildReadiness(
  artifacts: SynthesizedArtifact[],
  blockers: string[],
): HostWriteReadiness {
  const ready = artifacts.length > 0 && blockers.length === 0;
  return {
    ready,
    blockers: [...blockers],
    checks: [
      {
        name: "SYNTHESIZED_ARTIFACTS_PRESENT",
        passed: artifacts.length > 0,
        severity: "error",
        message:
          artifacts.length > 0
            ? `${artifacts.length} synthesized artifacts prepared`
            : "No synthesized artifacts were produced",
      },
      {
        name: "SYNTHESIS_BLOCKERS_CLEARED",
        passed: blockers.length === 0,
        severity: "error",
        message: blockers.length === 0 ? "No synthesis blockers" : blockers.join("; "),
      },
    ],
  };
}

function classifyBundleKind(need: UnresolvedModuleNeed): SynthesisBundleKind {
  const targets = new Set(need.artifactTargets || []);
  const isUiOnly =
    need.category === "ui"
    || (targets.size > 0 && [...targets].every((target) => target === "ui"));
  if (isUiOnly) {
    return "ui_surface";
  }
  if (need.category === "integration" || targets.has("bridge")) {
    return "supporting_surface";
  }
  return "gameplay_ability";
}

function inferBundleEntrySurface(kind: SynthesisBundleKind): "gameplay" | "ui" | "supporting" {
  switch (kind) {
    case "ui_surface":
      return "ui";
    case "supporting_surface":
      return "supporting";
    default:
      return "gameplay";
  }
}

function inferBundleOwnedScopeRoot(
  need: UnresolvedModuleNeed,
  kind: SynthesisBundleKind,
): string {
  const hint = need.ownedScopeHints?.find((value) => value.trim().length > 0);
  if (hint) {
    return hint;
  }
  switch (kind) {
    case "ui_surface":
      return "content/panorama/src/rune_weaver/generated/ui";
    case "supporting_surface":
      return "rune_weaver/bridge";
    default:
      return "game/scripts/vscripts/rune_weaver/abilities";
  }
}

function inferBundleLifecycleBoundary(
  need: UnresolvedModuleNeed,
  kind: SynthesisBundleKind,
): string {
  switch (kind) {
    case "ui_surface":
      return `ui-surface:${sanitizeId(need.moduleId) || "module"}`;
    case "supporting_surface":
      return `supporting:${sanitizeId(need.moduleId) || "module"}`;
    default:
      return "feature-owned-ability";
  }
}

function buildSynthesisBundles(
  unresolvedModuleNeeds: UnresolvedModuleNeed[],
): SynthesisBundlePlan[] {
  const bundles = new Map<string, SynthesisBundlePlan>();
  let bundleSequence = 0;

  for (const need of unresolvedModuleNeeds) {
    const kind = classifyBundleKind(need);
    const entrySurface = inferBundleEntrySurface(kind);
    const ownedScopeRoot = inferBundleOwnedScopeRoot(need, kind);
    const lifecycleBoundary = inferBundleLifecycleBoundary(need, kind);
    const bundleKey =
      kind === "gameplay_ability"
        ? [entrySurface, kind, ownedScopeRoot, lifecycleBoundary].join("::")
        : [entrySurface, kind, ownedScopeRoot, lifecycleBoundary, need.moduleId].join("::");

    const artifactTargets = uniqueStrings(need.artifactTargets || []);
    const strategy =
      need.strategy === "guided_native"
        ? "guided_native"
        : "exploratory";
    const existing = bundles.get(bundleKey);
    if (existing) {
      existing.moduleIds = uniqueStrings([...existing.moduleIds, need.moduleId]);
      existing.semanticRoles = uniqueStrings([...existing.semanticRoles, need.semanticRole]);
      existing.categories = [...new Set([...existing.categories, ...(need.category ? [need.category] : [])])];
      existing.artifactTargets = uniqueStrings([...existing.artifactTargets, ...artifactTargets]);
      existing.strategy =
        existing.strategy === "guided_native" || strategy === "guided_native"
          ? "guided_native"
          : "exploratory";
      continue;
    }

    bundleSequence += 1;
    const primaryModuleId = need.moduleId;
    bundles.set(bundleKey, {
      bundleId: [
        sanitizeId(kind) || "bundle",
        sanitizeId(primaryModuleId) || `bundle_${bundleSequence}`,
        bundleSequence,
      ].join("_"),
      kind,
      primaryModuleId,
      moduleIds: [need.moduleId],
      semanticRoles: [need.semanticRole],
      categories: need.category ? [need.category] : [],
      artifactTargets,
      ownedScopeRoot,
      entrySurface,
      lifecycleBoundary,
      strategy,
    });
  }

  return [...bundles.values()];
}

export function shouldUseArtifactSynthesis(
  blueprint: Blueprint,
  resolutionResult?: Pick<
    PatternResolutionResult,
    "patterns" | "unresolved" | "unresolvedModuleNeeds" | "complete"
  >,
): boolean {
  const strategy = blueprint.implementationStrategy || blueprint.designDraft?.chosenImplementationStrategy;
  const unresolvedCount =
    resolutionResult?.unresolvedModuleNeeds?.length
    ?? resolutionResult?.unresolved.length
    ?? blueprint.unresolvedModuleNeeds?.length
    ?? 0;

  if (strategy === "exploratory" || unresolvedCount > 0) {
    return true;
  }

  if (strategy !== "guided_native") {
    return false;
  }

  if (!resolutionResult) {
    return true;
  }

  return resolutionResult.complete === false || unresolvedCount > 0;
}

export function buildSynthesizedAssemblyPlan(
  blueprint: Blueprint,
  featureId: string,
  resolutionResult?: Pick<
    PatternResolutionResult,
    "moduleRecords" | "unresolvedModuleNeeds" | "patterns" | "unresolved" | "complete"
  >,
  basePlan?: AssemblyPlan,
): {
  plan: AssemblyPlan;
  synthesis: ArtifactSynthesisResult;
} {
  const strategy: ImplementationStrategy = blueprint.implementationStrategy || "exploratory";
  const unresolvedModuleNeeds =
    resolutionResult?.unresolvedModuleNeeds
    || blueprint.unresolvedModuleNeeds
    || buildFallbackUnresolvedModuleNeeds(blueprint);
  const synthesisBundles = buildSynthesisBundles(unresolvedModuleNeeds);
  const synthesizedArtifacts: SynthesizedArtifact[] = [];
  const synthesizedModules: AssemblyModule[] = [];
  const synthesizedWriteTargets: WriteTarget[] = [];
  const synthesizedModuleRecords: ModuleImplementationRecord[] = [];
  const moduleResults: ModuleSynthesisResult[] = [];
  const grounding: GroundingCheckResult[] = [];
  const warnings = [
    "Exploratory/guided-native synthesis remains review-required until the implementation graduates.",
  ];
  const blockers: string[] = [];
  const validations: ValidationContract[] = [
    ...(basePlan?.validations || blueprint.validations),
    {
      scope: "host",
      rule: "Synthesized artifacts must stay within declared host targets and owned scope",
      severity: "warning",
    },
  ];
  const bridgeNeeds = { gameplay: false, ui: false };

  for (const bundle of synthesisBundles) {
    const bundleNeeds = unresolvedModuleNeeds.filter((need) => bundle.moduleIds.includes(need.moduleId));
    const moduleSynthesis = synthesizeBundle(blueprint, featureId, bundle, bundleNeeds);
    moduleResults.push(moduleSynthesis);
    warnings.push(...moduleSynthesis.warnings);
    blockers.push(...moduleSynthesis.blockers);

    if (!moduleSynthesis.success) {
      continue;
    }

    synthesizedArtifacts.push(...moduleSynthesis.artifacts);
    synthesizedModuleRecords.push(...moduleSynthesis.moduleRecords);
    synthesizedModules.push(
      createSynthesizedAssemblyModule(bundle, blueprint, moduleSynthesis.artifacts),
    );
    synthesizedWriteTargets.push(
      ...moduleSynthesis.artifacts.map((artifact) => ({
        target: toWriteTarget(artifact.outputKind),
        path: artifact.targetPath,
        summary: artifact.summary,
      })),
    );

    if (moduleSynthesis.artifacts.some((artifact) => artifact.outputKind === "ui")) {
      bridgeNeeds.ui = true;
    }
    if (moduleSynthesis.artifacts.some((artifact) => artifact.outputKind !== "ui")) {
      bridgeNeeds.gameplay = true;
    }
  }

  const remainingUnresolved = unresolvedModuleNeeds.filter(
    (need) =>
      !synthesizedModuleRecords.some((record) => record.moduleId === need.moduleId),
  );
  const mergedModuleRecords = mergeModuleRecords(
    basePlan?.moduleRecords || resolutionResult?.moduleRecords || blueprint.moduleRecords || [],
    synthesizedModuleRecords,
  );
  const synthesis: ArtifactSynthesisResult = {
    success: synthesizedArtifacts.length > 0 && blockers.length === 0,
    strategy,
    sourceKind: "synthesized",
    moduleRecords: synthesizedModuleRecords,
    unresolvedModuleNeeds: remainingUnresolved,
    moduleResults,
    bundles: synthesisBundles,
    artifacts: synthesizedArtifacts,
    grounding,
    warnings: uniqueStrings(warnings),
    blockers: uniqueStrings(blockers),
  };

  const synthesisReadiness = buildReadiness(synthesizedArtifacts, synthesis.blockers);
  const mergedPlan: AssemblyPlan = {
    blueprintId: blueprint.id,
    selectedPatterns: basePlan?.selectedPatterns || [],
    modules: [...(basePlan?.modules || []), ...synthesizedModules],
    moduleRecords: mergedModuleRecords,
    unresolvedModuleNeeds: remainingUnresolved,
    synthesisBundles: synthesisBundles,
    connections: basePlan?.connections || blueprint.connections || [],
    writeTargets: mergeWriteTargets(basePlan?.writeTargets || [], synthesizedWriteTargets),
    bridgeUpdates: mergeBridgeUpdates(
      basePlan?.bridgeUpdates || [],
      buildBridgeUpdates(bridgeNeeds.gameplay, bridgeNeeds.ui),
    ),
    validations,
    readyForHostWrite: computeMergedReadyForHostWrite(basePlan, synthesis),
    hostWriteReadiness: mergeReadiness(basePlan?.hostWriteReadiness, synthesisReadiness, synthesis.blockers),
    parameters: blueprint.parameters,
    featureAuthoring: blueprint.featureAuthoring,
    fillContracts: blueprint.fillContracts,
    implementationStrategy:
      hasReusableModuleRecords(basePlan?.moduleRecords || resolutionResult?.moduleRecords || blueprint.moduleRecords || [])
      ? "guided_native"
      : strategy,
    validationStatus: blueprint.validationStatus,
    dependencyEdges: blueprint.dependencyEdges,
    commitDecision: blueprint.commitDecision,
    sourceKind: deriveAssemblySourceKind(mergedModuleRecords),
    synthesizedArtifacts: [
      ...(basePlan?.synthesizedArtifacts || []),
      ...synthesizedArtifacts,
    ],
    artifactSynthesisResult: synthesis,
  };

  return { plan: mergedPlan, synthesis };
}

export async function buildSynthesizedAssemblyPlanWithLLM(
  blueprint: Blueprint,
  featureId: string,
  resolutionResult?: Pick<
    PatternResolutionResult,
    "moduleRecords" | "unresolvedModuleNeeds" | "patterns" | "unresolved" | "complete"
  >,
  basePlan?: AssemblyPlan,
): Promise<{
  plan: AssemblyPlan;
  synthesis: ArtifactSynthesisResult;
}> {
  const deterministic = buildSynthesizedAssemblyPlan(
    blueprint,
    featureId,
    resolutionResult,
    basePlan,
  );
  if (deterministic.synthesis.artifacts.length === 0) {
    return deterministic;
  }

  const llmEnabled = isLLMConfigured(process.cwd());
  let client;
  let llmConfig;
  if (llmEnabled) {
    try {
      client = createLLMClientFromEnv(process.cwd());
      llmConfig = readLLMExecutionConfig(process.cwd(), "synthesis");
    } catch (error) {
      deterministic.synthesis.warnings = uniqueStrings([
        ...deterministic.synthesis.warnings,
        `LLM synthesis config unavailable; kept deterministic fallback artifacts (${error instanceof Error ? error.message : String(error)}).`,
      ]);
    }
  }

  const unresolvedModuleNeeds =
    resolutionResult?.unresolvedModuleNeeds
    || blueprint.unresolvedModuleNeeds
    || buildFallbackUnresolvedModuleNeeds(blueprint);
  const aggregatedEvidence = [...(deterministic.synthesis.evidenceRefs || [])];
  const sourceKinds = new Set<string>(deterministic.synthesis.retrievalSummary?.sourceKinds || []);
  const tiersUsed = new Set<number>(deterministic.synthesis.retrievalSummary?.tiersUsed || []);
  const aggregatedGrounding: GroundingCheckResult[] = [...(deterministic.synthesis.grounding || [])];

  for (const moduleResult of deterministic.synthesis.moduleResults || []) {
    const moduleNeeds = (moduleResult.moduleIds || [])
      .map((moduleId) => unresolvedModuleNeeds.find((item) => item.moduleId === moduleId))
      .filter((item): item is UnresolvedModuleNeed => !!item);
    const primaryModuleNeed =
      moduleNeeds[0]
      || unresolvedModuleNeeds.find((item) => item.moduleId === moduleResult.moduleId);
    if (!primaryModuleNeed) {
      continue;
    }
    const promptModuleNeed = mergeModuleNeedsForPrompt(
      moduleResult.bundleId,
      primaryModuleNeed,
      moduleNeeds.length > 0 ? moduleNeeds : [primaryModuleNeed],
    );

    const moduleEvidence: EvidenceRef[] = [];
    const moduleAssumptions = new Set<string>(moduleResult.assumptions || []);
    const moduleWarnings: string[] = [];
    const moduleViolations: string[] = [];

    for (const artifact of moduleResult.artifacts) {
      const targetProfile = inferTargetProfile(artifact);
      if (!targetProfile) {
        continue;
      }

      const retrievalBundle = await buildDota2RetrievalBundle({
        promptPackageId: "synthesis.module",
        queryText: [
          blueprint.sourceIntent.goal,
          blueprint.summary,
          ...promptModuleNeed.semanticRole.split(" | "),
          artifact.summary,
        ].join("\n"),
        targetProfile,
        symbolQueries: extractArtifactSymbolQueries(artifact),
        workspaceEvidence: [
          {
            title: "Synthesized bundle context",
            snippet: [
              `bundleId=${moduleResult.bundleId || "none"}`,
              `moduleIds=${(moduleResult.moduleIds || []).join(", ")}`,
            ].join(" | "),
          },
          {
            title: "Owned artifact target",
            snippet: artifact.targetPath,
          },
        ],
      });
      retrievalBundle.evidenceRefs.forEach((ref) => moduleEvidence.push(ref));
      retrievalBundle.evidenceRefs.forEach((ref) => aggregatedEvidence.push(ref));
      retrievalBundle.metadata?.sourceKinds && Array.isArray(retrievalBundle.metadata.sourceKinds)
        ? retrievalBundle.metadata.sourceKinds.forEach((kind) => sourceKinds.add(String(kind)))
        : undefined;
      retrievalBundle.tiersUsed.forEach((tier) => tiersUsed.add(tier));

      const promptPackage = buildModuleSynthesisPromptPackage({
        featureId,
        blueprint,
        moduleNeed: promptModuleNeed,
        targetProfile,
        targetPath: artifact.targetPath,
        existingContent: artifact.content,
        retrievalBundle,
      });

      if (client && llmConfig) {
        try {
          const response = await client.generateObject<LLMArtifactCandidate>({
            messages: promptPackage.messages,
            schemaName: `dota2.synthesis.${targetProfile}`,
            schemaDescription: `Generate a single ${targetProfile} artifact inside the declared owned Dota2 feature scope.`,
            schema: SYNTHESIS_ARTIFACT_SCHEMA,
            model: llmConfig.model,
            temperature: llmConfig.temperature,
            providerOptions: llmConfig.providerOptions,
            maxTokens: 2200,
          });
          const candidate = normalizeArtifactCandidate(response.object, artifact.content, artifact.summary);
          const violations = detectMustNotAddViolations(candidate.content, promptPackage.promptConstraints);
          if (violations.length > 0) {
            moduleViolations.push(...violations);
            moduleWarnings.push(
              `Rejected LLM candidate for ${artifact.targetPath}; kept deterministic fallback because it violated explicit must-not-add constraints.`,
            );
          } else {
            artifact.content = candidate.content;
            artifact.summary = candidate.summary;
            artifact.metadata = {
              ...(artifact.metadata || {}),
              promptPackageId: promptPackage.id,
              evidenceRefs: retrievalBundle.evidenceRefs,
              retrievalSummary: retrievalBundle.summary,
              assumptions: candidate.assumptions,
              unresolvedAssumptions: candidate.unresolvedAssumptions,
              llmGenerated: true,
            };
            for (const assumption of candidate.assumptions) {
              moduleAssumptions.add(assumption);
            }
          }
        } catch (error) {
          moduleWarnings.push(
            `LLM synthesis failed for ${artifact.targetPath}; kept deterministic fallback (${error instanceof Error ? error.message : String(error)}).`,
          );
        }
      }

      const grounding = buildGroundingCheckResult({
        artifact,
        targetProfile,
        projectRoot: process.cwd(),
      });
      aggregatedGrounding.push(grounding);
      grounding.evidenceRefs?.forEach((ref) => moduleEvidence.push(ref));
      grounding.evidenceRefs?.forEach((ref) => aggregatedEvidence.push(ref));
      sourceKinds.add("raw_reference");
      grounding.evidenceRefs && grounding.evidenceRefs.length > 0 ? tiersUsed.add(2) : undefined;
      for (const warning of grounding.warnings) {
        moduleWarnings.push(warning);
      }
      artifact.metadata = {
        ...(artifact.metadata || {}),
        grounding,
      };
    }

    moduleResult.promptPackageId = "synthesis.module";
    moduleResult.evidenceRefs = uniqueEvidenceRefs(moduleEvidence);
    moduleResult.assumptions = [...moduleAssumptions];
    moduleResult.mustNotAddViolations = uniqueStrings(moduleViolations);
    moduleResult.warnings = uniqueStrings([...moduleResult.warnings, ...moduleWarnings]);
    moduleResult.grounding = aggregatedGrounding.filter((item) =>
      moduleResult.artifacts.some((artifact) => artifact.id === item.artifactId),
    );

    for (const record of moduleResult.moduleRecords) {
      record.metadata = {
        ...(record.metadata || {}),
        promptPackageId: "synthesis.module",
        bundleId: moduleResult.bundleId,
        moduleIds: moduleResult.moduleIds,
        evidenceRefs: moduleResult.evidenceRefs,
        assumptions: moduleResult.assumptions,
      };
    }
  }

  deterministic.synthesis.promptPackageId = "synthesis.module";
  deterministic.synthesis.evidenceRefs = uniqueEvidenceRefs(aggregatedEvidence);
  deterministic.synthesis.retrievalSummary = {
    tiersUsed: [...tiersUsed].sort((left, right) => left - right) as Array<0 | 1 | 2 | 3>,
    evidenceCount: deterministic.synthesis.evidenceRefs.length,
    sourceKinds: [...sourceKinds] as Array<"governance" | "curated_host" | "raw_reference" | "workspace_evidence">,
  };
  deterministic.synthesis.grounding = aggregatedGrounding;
  deterministic.synthesis.warnings = uniqueStrings([
    ...deterministic.synthesis.warnings,
    ...deterministic.synthesis.moduleResults?.flatMap((item) => item.warnings) || [],
  ]);
  deterministic.plan.synthesizedArtifacts = deterministic.synthesis.artifacts;
  deterministic.plan.artifactSynthesisResult = deterministic.synthesis;

  return deterministic;
}

function mergeModuleNeedsForPrompt(
  bundleId: string | undefined,
  primaryNeed: UnresolvedModuleNeed,
  moduleNeeds: UnresolvedModuleNeed[],
): UnresolvedModuleNeed {
  return {
    ...primaryNeed,
    semanticRole: uniqueStrings(moduleNeeds.map((need) => need.semanticRole)).join(" | "),
    reason:
      bundleId && moduleNeeds.length > 1
        ? `Bundle '${bundleId}' co-locates unresolved modules into one implementation surface. ${primaryNeed.reason}`
        : primaryNeed.reason,
    requiredCapabilities: uniqueStrings(
      moduleNeeds.flatMap((need) => need.requiredCapabilities || []),
    ),
    optionalCapabilities: uniqueStrings(
      moduleNeeds.flatMap((need) => need.optionalCapabilities || []),
    ),
    requiredOutputs: uniqueStrings(
      moduleNeeds.flatMap((need) => need.requiredOutputs || []),
    ),
    artifactTargets: uniqueStrings(
      moduleNeeds.flatMap((need) => need.artifactTargets || []),
    ),
    ownedScopeHints: uniqueStrings(
      moduleNeeds.flatMap((need) => need.ownedScopeHints || []),
    ),
    stateExpectations: uniqueStrings(
      moduleNeeds.flatMap((need) => need.stateExpectations || []),
    ),
    integrationHints: uniqueStrings(
      moduleNeeds.flatMap((need) => need.integrationHints || []),
    ),
    invariants: uniqueStrings(
      moduleNeeds.flatMap((need) => need.invariants || []),
    ),
    boundedVariability: uniqueStrings(
      moduleNeeds.flatMap((need) => need.boundedVariability || []),
    ),
    explicitPatternHints: uniqueStrings(
      moduleNeeds.flatMap((need) => need.explicitPatternHints || []),
    ),
    prohibitedTraits: uniqueStrings(
      moduleNeeds.flatMap((need) => need.prohibitedTraits || []),
    ),
  };
}

const TARGET_PROFILE_ALLOWLIST: Record<
  SynthesisTargetProfile,
  { exact: string[]; prefixes: string[] }
> = {
  lua_ability: {
    exact: [
      "OnSpellStart",
      "GetIntrinsicModifierName",
      "GetCaster",
      "GetAbsOrigin",
      "SetAbsOrigin",
      "EmitSoundOn",
    ],
    prefixes: [],
  },
  ability_kv: {
    exact: [],
    prefixes: ["DOTA_ABILITY_BEHAVIOR_", "DOTA_ABILITY_TYPE_"],
  },
  panorama_tsx: {
    exact: ["Panel", "Label"],
    prefixes: [],
  },
  panorama_less: {
    exact: [],
    prefixes: [],
  },
};

function normalizeGroundingSymbol(value: string): string {
  return value.trim().toLowerCase();
}

function extractArtifactSymbolsForGrounding(
  content: string,
  targetProfile: SynthesisTargetProfile,
): string[] {
  const symbols = new Set<string>();

  const enumMatches = content.match(/DOTA_[A-Z0-9_]+/g) || [];
  enumMatches.forEach((item) => symbols.add(item));

  if (targetProfile === "lua_ability") {
    const locallyDefinedFunctions = new Set<string>();
    for (const match of content.matchAll(/(?:^|\s)(?:local\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/gm)) {
      locallyDefinedFunctions.add(match[1]);
    }
    for (const match of content.matchAll(/function\s+[A-Za-z0-9_:.]+[:.]([A-Z][A-Za-z0-9_]*)\s*\(/g)) {
      locallyDefinedFunctions.add(match[1]);
    }
    for (const match of content.matchAll(/(?:^|\s)(?:local\s+)?([A-Z][A-Za-z0-9_]*)\s*=\s*function\s*\(/gm)) {
      locallyDefinedFunctions.add(match[1]);
    }
    for (const match of content.matchAll(/(?:^|\s)(?:local\s+)?[A-Za-z0-9_:.]+[:.]([A-Z][A-Za-z0-9_]*)\s*=\s*function\s*\(/gm)) {
      locallyDefinedFunctions.add(match[1]);
    }

    for (const match of content.matchAll(/function\s+[A-Za-z0-9_:.]+:([A-Za-z0-9_]+)\s*\(/g)) {
      symbols.add(match[1]);
    }
    for (const match of content.matchAll(/[:\.]([A-Z][A-Za-z0-9_]+)\s*\(/g)) {
      symbols.add(match[1]);
    }
    for (const match of content.matchAll(/\b([A-Z][A-Za-z0-9_]+)\s*\(/g)) {
      symbols.add(match[1]);
    }
    for (const symbol of locallyDefinedFunctions) {
      symbols.delete(symbol);
    }
  }

  if (targetProfile === "panorama_tsx") {
    for (const match of content.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)) {
      symbols.add(match[1]);
    }
  }

  return [...symbols];
}

function isAllowlistedGroundingSymbol(
  symbol: string,
  targetProfile: SynthesisTargetProfile,
): boolean {
  const allowlist = TARGET_PROFILE_ALLOWLIST[targetProfile];
  return (
    allowlist.exact.includes(symbol)
    || allowlist.prefixes.some((prefix) => symbol.startsWith(prefix))
  );
}

function buildGroundingCheckResult(input: {
  artifact: SynthesizedArtifact;
  targetProfile: SynthesisTargetProfile;
  projectRoot: string;
}): GroundingCheckResult {
  const extractedSymbols = extractArtifactSymbolsForGrounding(input.artifact.content, input.targetProfile);
  const exactRefs = lookupDota2HostSymbolsExact(input.projectRoot, extractedSymbols);
  const refsBySymbol = new Map<string, EvidenceRef[]>();
  for (const ref of exactRefs) {
    const symbol = ref.symbol || ref.title;
    const candidates = new Set([
      normalizeGroundingSymbol(symbol),
      normalizeGroundingSymbol(symbol.split(".").pop() || symbol),
    ]);

    for (const normalized of candidates) {
      if (!normalized) {
        continue;
      }
      const bucket = refsBySymbol.get(normalized);
      if (bucket) {
        bucket.push(ref);
      } else {
        refsBySymbol.set(normalized, [ref]);
      }
    }
  }

  const verifiedSymbols: string[] = [];
  const allowlistedSymbols: string[] = [];
  const weakSymbols: string[] = [];
  const unknownSymbols: string[] = [];
  const warnings: string[] = [];

  for (const symbol of extractedSymbols) {
    if (isAllowlistedGroundingSymbol(symbol, input.targetProfile)) {
      allowlistedSymbols.push(symbol);
      continue;
    }

    const hits = refsBySymbol.get(normalizeGroundingSymbol(symbol)) || [];
    if (hits.length === 1) {
      verifiedSymbols.push(symbol);
      continue;
    }

    if (hits.length > 1) {
      const leafNames = new Set(
        hits.map((hit) => normalizeGroundingSymbol((hit.symbol || hit.title).split(".").pop() || hit.title)),
      );
      if (leafNames.size === 1) {
        verifiedSymbols.push(symbol);
        continue;
      }
      weakSymbols.push(symbol);
      warnings.push(`Generated content references symbol '${symbol}' but grounding remained ambiguous across multiple host symbols.`);
      continue;
    }

    unknownSymbols.push(symbol);
    warnings.push(`Generated content references symbol '${symbol}' without exact host grounding evidence.`);
  }

  return {
    artifactId: input.artifact.id,
    targetProfile: input.targetProfile,
    verifiedSymbols: uniqueStrings(verifiedSymbols),
    allowlistedSymbols: uniqueStrings(allowlistedSymbols),
    weakSymbols: uniqueStrings(weakSymbols),
    unknownSymbols: uniqueStrings(unknownSymbols),
    warnings: uniqueStrings(warnings),
    evidenceRefs: exactRefs,
  };
}

function buildFallbackUnresolvedModuleNeeds(blueprint: Blueprint): UnresolvedModuleNeed[] {
  if (blueprint.modules.length === 0) {
    return [];
  }

  return blueprint.modules.map((module) => ({
    moduleId: module.id,
    semanticRole: module.role,
    category: module.category,
    reason: `No reusable implementation was admitted for module '${module.role}'.`,
    requiredCapabilities: [],
    requiredOutputs:
      module.category === "ui"
        ? ["ui.surface"]
        : ["server.runtime", "host.config.kv"],
    artifactTargets:
      module.category === "ui"
        ? ["ui"]
        : module.category === "integration"
          ? ["bridge"]
          : ["server", "config", "lua"],
    ownedScopeHints: [],
    strategy: blueprint.implementationStrategy || blueprint.designDraft?.chosenImplementationStrategy || "exploratory",
    source: "derived-module",
  }));
}

function synthesizeBundle(
  blueprint: Blueprint,
  featureId: string,
  bundle: SynthesisBundlePlan,
  bundleNeeds: UnresolvedModuleNeed[],
): ModuleSynthesisResult {
  const targets = new Set(bundle.artifactTargets || []);
  const isUiOnly = bundle.kind === "ui_surface";
  const needsBridge = bundle.kind === "supporting_surface";
  const artifacts: SynthesizedArtifact[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (needsBridge) {
    blockers.push(
      `Synthesis bundle '${bundle.bundleId}' cannot invent bridge ownership or undeclared host targets.`,
    );
  }

  if (!isUiOnly && !needsBridge) {
    const abilityName = buildAbilityName(featureId, bundle.bundleId);
    const behavior = resolveAbilityBehavior(blueprint);
    const gameplaySummary =
      bundle.semanticRoles.length > 0
        ? bundle.semanticRoles.join(" + ")
        : bundle.primaryModuleId;
    artifacts.push(
      {
        id: `${featureId}_${bundle.bundleId}_lua`,
        moduleId: bundle.primaryModuleId,
        bundleId: bundle.bundleId,
        sourceKind: "synthesized",
        role: "gameplay-core",
        hostTarget: "lua_ability",
        outputKind: "lua",
        contentType: "lua",
        targetPath: `game/scripts/vscripts/rune_weaver/abilities/${abilityName}.lua`,
        content: buildLuaAbilityContent(abilityName, behavior, blueprint),
        summary: `Synthesized Lua ability shell for bundle ${gameplaySummary}`,
        rationale: [
          "artifact synthesis filled unresolved gameplay modules with a shared host-native Lua shell",
          "artifact stays inside the feature-owned Rune Weaver ability namespace",
        ],
        metadata: {
          abilityName,
          abilityBehavior: behavior,
          moduleIds: bundle.moduleIds,
        },
      },
      {
        id: `${featureId}_${bundle.bundleId}_kv`,
        moduleId: bundle.primaryModuleId,
        bundleId: bundle.bundleId,
        sourceKind: "synthesized",
        role: "gameplay-core",
        hostTarget: "ability_kv",
        outputKind: "kv",
        contentType: "kv",
        targetPath: "game/scripts/npc/npc_abilities_custom.txt",
        content: buildAbilityKVContent(abilityName, behavior, blueprint),
        summary: `Synthesized KV shell for bundle ${gameplaySummary}`,
        rationale: [
          "artifact synthesis filled unresolved gameplay modules with a shared host-native KV shell",
          "KV output is aggregated into the owned custom abilities file",
        ],
        metadata: {
          abilityName,
          abilityBehavior: behavior,
          moduleIds: bundle.moduleIds,
        },
      },
    );
  }

  if (isUiOnly) {
    const componentSeed = `${featureId}_${sanitizeId(bundle.bundleId)}`;
    const uiSummary =
      bundle.semanticRoles.length > 0
        ? bundle.semanticRoles.join(" + ")
        : bundle.primaryModuleId;
    artifacts.push(
      {
        id: `${featureId}_${bundle.bundleId}_ui_tsx`,
        moduleId: bundle.primaryModuleId,
        bundleId: bundle.bundleId,
        sourceKind: "synthesized",
        role: "ui-surface",
        hostTarget: "panorama_tsx",
        outputKind: "ui",
        contentType: "tsx",
        targetPath: `content/panorama/src/rune_weaver/generated/ui/${componentSeed}.tsx`,
        content: buildUITsxContent(componentSeed, blueprint),
        summary: `Synthesized Panorama TSX shell for bundle ${uiSummary}`,
        rationale: ["UI surface was explicitly declared but had no reusable bundle backing"],
      },
      {
        id: `${featureId}_${bundle.bundleId}_ui_less`,
        moduleId: bundle.primaryModuleId,
        bundleId: bundle.bundleId,
        sourceKind: "synthesized",
        role: "ui-surface",
        hostTarget: "panorama_less",
        outputKind: "ui",
        contentType: "less",
        targetPath: `content/panorama/src/rune_weaver/generated/ui/${componentSeed}.less`,
        content: buildUiLessContent(),
        summary: `Synthesized Panorama LESS shell for bundle ${uiSummary}`,
        rationale: ["UI styling stays in the feature-owned generated UI namespace"],
      },
    );
  }

  if (artifacts.length === 0 && blockers.length === 0) {
    blockers.push(`Synthesis produced no artifacts for unresolved bundle '${bundle.bundleId}'.`);
  }

  const synthesisStrategy: ImplementationStrategy =
    bundle.strategy === "guided_native" ? "guided_native" : "exploratory";
  const bundleArtifactTargets =
    bundle.artifactTargets.length > 0
      ? bundle.artifactTargets
      : inferArtifactTargetsFromArtifacts(artifacts);
  const bundleArtifactPaths = artifacts.map((artifact) => artifact.targetPath);
  const bundleArtifactIds = artifacts.map((artifact) => artifact.id);
  const moduleRecords: ModuleImplementationRecord[] = bundleNeeds.map((need) => {
    const fillContractIds = (blueprint.fillContracts || [])
      .filter((fillContract) => fillContract.targetModuleId === need.moduleId)
      .map((fillContract) => fillContract.boundaryId);
    const reviewReasons = [
      `Module '${need.moduleId}' was synthesized inside bundle '${bundle.bundleId}' because no reusable family/pattern implementation fully matched it.`,
    ];

    return {
      moduleId: need.moduleId,
      bundleId: bundle.bundleId,
      role: need.semanticRole,
      category: need.category,
      sourceKind: "synthesized",
      selectedPatternIds: [],
      artifactTargets: bundleArtifactTargets,
      ownedPaths: bundleArtifactPaths,
      fillContractIds,
      reviewRequired: true,
      requiresReview: true,
      reviewReasons,
      implementationStrategy: synthesisStrategy,
      maturity: "exploratory",
      outputKinds:
        artifacts.some((artifact) => artifact.outputKind === "ui")
        && artifacts.every((artifact) => artifact.outputKind === "ui")
          ? ["ui"]
          : ["server"],
      artifactPaths: bundleArtifactPaths,
      synthesizedArtifactIds: bundleArtifactIds,
      resolvedFrom: synthesisStrategy === "guided_native" ? "guided_native" : "exploratory",
      summary: `Synthesized implementation for unresolved module '${need.semanticRole}' via bundle '${bundle.bundleId}'`,
      requiredOutputs: need.requiredOutputs,
      integrationHints: need.integrationHints,
      stateExpectations: need.stateExpectations,
      metadata: {
        moduleIds: bundle.moduleIds,
      },
    };
  });

  return {
    moduleId: bundle.primaryModuleId,
    bundleId: bundle.bundleId,
    moduleIds: bundle.moduleIds,
    success: blockers.length === 0 && artifacts.length > 0,
    strategy: synthesisStrategy,
    sourceKind: "synthesized",
    moduleRecords: blockers.length === 0 ? moduleRecords : [],
    unresolvedModuleNeeds: blockers.length === 0 ? [] : bundleNeeds,
    artifacts,
    warnings,
    blockers,
  };
}

function normalizeArtifactCandidate(
  candidate: LLMArtifactCandidate,
  fallbackContent: string,
  fallbackSummary: string,
): Required<LLMArtifactCandidate> {
  return {
    content:
      typeof candidate.content === "string" && candidate.content.trim().length > 0
        ? candidate.content
        : fallbackContent,
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim().length > 0
        ? candidate.summary
        : fallbackSummary,
    assumptions: Array.isArray(candidate.assumptions)
      ? candidate.assumptions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    unresolvedAssumptions: Array.isArray(candidate.unresolvedAssumptions)
      ? candidate.unresolvedAssumptions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  };
}

function inferTargetProfile(artifact: SynthesizedArtifact): SynthesisTargetProfile | undefined {
  if (artifact.hostTarget === "lua_ability") {
    return "lua_ability";
  }
  if (artifact.hostTarget === "ability_kv") {
    return "ability_kv";
  }
  if (artifact.hostTarget === "panorama_tsx") {
    return "panorama_tsx";
  }
  if (artifact.hostTarget === "panorama_less") {
    return "panorama_less";
  }
  return undefined;
}

function extractArtifactSymbolQueries(artifact: SynthesizedArtifact): string[] {
  const queries = new Set<string>();
  const content = artifact.content;
  const targetProfile = inferTargetProfile(artifact);

  if (targetProfile) {
    for (const symbol of extractArtifactSymbolsForGrounding(content, targetProfile)) {
      queries.add(symbol);
    }
  }

  return [...queries];
}

function uniqueEvidenceRefs<T extends { id?: string; title: string; sourceKind?: unknown; path?: string }>(
  refs: T[],
): T[] {
  const unique = new Map<string, T>();
  for (const ref of refs) {
    unique.set(`${ref.id || ""}::${String(ref.sourceKind || "")}::${ref.title}::${ref.path || ""}`, ref);
  }
  return [...unique.values()];
}

function createSynthesizedAssemblyModule(
  bundle: SynthesisBundlePlan,
  blueprint: Blueprint,
  artifacts: SynthesizedArtifact[],
): AssemblyModule {
  const hasUiArtifacts = artifacts.some((artifact) => artifact.outputKind === "ui");
  const hasGameplayArtifacts = artifacts.some((artifact) => artifact.outputKind !== "ui");
  const outputs: HostRealizationOutput[] = artifacts.map((artifact) => {
    switch (artifact.outputKind) {
      case "lua":
        return { kind: "lua", target: "lua_ability", rationale: [artifact.summary] };
      case "kv":
        return { kind: "kv", target: "ability_kv", rationale: [artifact.summary] };
      case "ui":
        return {
          kind: "ui",
          target: artifact.contentType === "less" ? "panorama_less" : "panorama_tsx",
          rationale: [artifact.summary],
        };
      default:
        return { kind: "bridge", target: artifact.hostTarget, rationale: [artifact.summary] };
    }
  });

  return {
    id: bundle.primaryModuleId,
    role: hasUiArtifacts && !hasGameplayArtifacts ? "ui-surface" : "gameplay-core",
    selectedPatterns: [],
    outputKinds: hasUiArtifacts && !hasGameplayArtifacts ? ["ui"] : ["server"],
    sourceKind: "synthesized",
    parameters: blueprint.parameters,
    outputs,
    realizationHints: {
      runtimeHeavy: hasGameplayArtifacts,
      kvCapable: artifacts.some((artifact) => artifact.outputKind === "kv"),
      uiRequired: hasUiArtifacts,
    },
  };
}

function toWriteTarget(outputKind: SynthesizedArtifact["outputKind"]): WriteTarget["target"] {
  switch (outputKind) {
    case "ui":
      return "ui";
    case "kv":
      return "config";
    default:
      return "server";
  }
}

function mergeWriteTargets(
  base: WriteTarget[],
  extra: WriteTarget[],
): WriteTarget[] {
  const merged = [...base];
  for (const target of extra) {
    if (!merged.some((existing) => existing.target === target.target && existing.path === target.path)) {
      merged.push(target);
    }
  }
  return merged;
}

function mergeBridgeUpdates(base: BridgeUpdate[] = [], extra: BridgeUpdate[] = []): BridgeUpdate[] {
  const merged = [...base];
  for (const update of extra) {
    if (!merged.some((existing) =>
      existing.target === update.target
      && existing.file === update.file
      && existing.action === update.action,
    )) {
      merged.push(update);
    }
  }
  return merged;
}

function mergeModuleRecords(
  base: ModuleImplementationRecord[],
  extra: ModuleImplementationRecord[],
): ModuleImplementationRecord[] {
  const merged = [...base];
  for (const record of extra) {
    const existingIndex = merged.findIndex((item) => item.moduleId === record.moduleId);
    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...record,
      };
    } else {
      merged.push(record);
    }
  }
  return merged;
}

function mergeReadiness(
  base: HostWriteReadiness | undefined,
  synthesis: HostWriteReadiness,
  synthesisBlockers: string[],
): HostWriteReadiness {
  const blockers = uniqueStrings([
    ...(base?.blockers || []).filter((blocker) => !/unresolved/i.test(blocker)),
    ...synthesisBlockers,
  ]);
  const checks = [
    ...(base?.checks || []).filter((check) => check.name !== "NO_UNRESOLVED"),
    ...synthesis.checks,
  ];
  return {
    ready: blockers.length === 0,
    blockers,
    checks,
  };
}

function inferArtifactTargetsFromArtifacts(artifacts: SynthesizedArtifact[]): string[] {
  return uniqueStrings(
    artifacts.map((artifact) => {
      switch (artifact.outputKind) {
        case "ui":
          return "ui";
        case "kv":
          return "config";
        case "lua":
          return "lua";
        case "bridge":
          return "bridge";
        default:
          return "server";
      }
    }),
  );
}

function hasReusableModuleRecords(moduleRecords: ModuleImplementationRecord[]): boolean {
  return moduleRecords.some((record) => record.sourceKind === "family" || record.sourceKind === "pattern");
}

function computeMergedReadyForHostWrite(
  basePlan: AssemblyPlan | undefined,
  synthesis: ArtifactSynthesisResult,
): boolean {
  const baseBlockers = (basePlan?.hostWriteReadiness?.blockers || []).filter(
    (blocker) => !/unresolved/i.test(blocker),
  );
  return baseBlockers.length === 0 && synthesis.blockers.length === 0;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function deriveAssemblySourceKind(
  moduleRecords: ModuleImplementationRecord[],
): "family" | "pattern" | "synthesized" {
  if (moduleRecords.length === 0) {
    return "synthesized";
  }

  if (moduleRecords.every((record) => record.sourceKind === "family")) {
    return "family";
  }

  if (moduleRecords.some((record) => record.sourceKind === "family" || record.sourceKind === "pattern")) {
    return "pattern";
  }

  return "synthesized";
}

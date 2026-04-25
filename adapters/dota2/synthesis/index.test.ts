import assert from "node:assert/strict";

import type { Blueprint } from "../../../core/schema/types.js";
import { lookupDota2HostSymbolsExact } from "../../../core/retrieval/index.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  buildAbilityKvFragmentPath,
  resolveAbilityKvScriptFile,
} from "../kv/contract.js";
import {
  buildSynthesizedAssemblyPlan,
  buildSynthesizedAssemblyPlanWithLLM,
  extractArtifactSymbolsForGrounding,
} from "./index.js";

function makeExploratoryBlueprint(): Blueprint {
  return {
    id: "rw_fire_dash",
    version: "1.0",
    summary: "An exploratory fire dash ability.",
    sourceIntent: {
      intentKind: "micro-feature",
      goal: "Create a fire dash ability.",
      normalizedMechanics: {
        trigger: true,
        outcomeApplication: true,
      },
    },
    modules: [
      {
        id: "fire_dash_core",
        role: "Fire dash core",
        category: "effect",
        responsibilities: ["Dash forward and leave fire at the destination."],
        inputs: [],
        outputs: ["damage_over_time"],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: false,
    implementationStrategy: "exploratory",
    unresolvedModuleNeeds: [
      {
        moduleId: "fire_dash_core",
        semanticRole: "Fire dash core",
        category: "effect",
        reason: "No reusable implementation was admitted for this module.",
        requiredCapabilities: [],
        requiredOutputs: ["server.runtime", "host.config.kv"],
        artifactTargets: ["server", "config", "lua"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
    ],
  } as Blueprint;
}

function makeBundledExploratoryBlueprint(): Blueprint {
  return {
    id: "rw_fire_orbit",
    version: "1.0",
    summary: "An exploratory fire-orbit ability.",
    sourceIntent: {
      intentKind: "micro-feature",
      goal: "Create a fire orb that follows the hero for 5 seconds and burns nearby enemies every second.",
      normalizedMechanics: {
        trigger: true,
        outcomeApplication: true,
      },
    },
    modules: [
      {
        id: "orbit_timing",
        role: "timed_rule",
        category: "rule",
        responsibilities: ["Run the 5-second orbit duration."],
      },
      {
        id: "orbit_state",
        role: "session_state",
        category: "data",
        responsibilities: ["Track the spawned orb instance."],
      },
      {
        id: "orbit_spawn",
        role: "spawn_emitter",
        category: "effect",
        responsibilities: ["Spawn the orb and apply burn pulses."],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: false,
    implementationStrategy: "exploratory",
    unresolvedModuleNeeds: [
      {
        moduleId: "orbit_timing",
        semanticRole: "timed_rule",
        category: "rule",
        reason: "No reusable timing implementation matched.",
        requiredCapabilities: ["timing.interval.local"],
        requiredOutputs: ["server.runtime", "host.config.kv"],
        artifactTargets: ["server", "config", "lua"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
      {
        moduleId: "orbit_state",
        semanticRole: "session_state",
        category: "data",
        reason: "No reusable state implementation matched.",
        requiredCapabilities: ["state.session.feature_owned"],
        requiredOutputs: ["server.runtime"],
        artifactTargets: ["server", "lua"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
      {
        moduleId: "orbit_spawn",
        semanticRole: "spawn_emitter",
        category: "effect",
        reason: "No reusable spawn implementation matched.",
        requiredCapabilities: ["emission.spawn.feature_owned"],
        requiredOutputs: ["server.runtime", "host.config.kv"],
        artifactTargets: ["server", "config", "lua"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
    ],
  } as Blueprint;
}

function makeBackboneExploratoryBlueprint(): Blueprint {
  return {
    id: "rw_fireball_follow",
    version: "1.0",
    summary: "An exploratory fireball-follow ability.",
    sourceIntent: {
      intentKind: "micro-feature",
      goal: "Create one active skill that summons a fireball near the hero, follows the hero, and burns nearby enemies.",
      normalizedMechanics: {
        trigger: true,
        outcomeApplication: true,
      },
    },
    modules: [
      {
        id: "mod_gameplay_backbone_0",
        role: "gameplay_ability",
        category: "effect",
        planningKind: "backbone",
        backboneKind: "gameplay_ability",
        facetIds: [
          "facet_trigger",
          "facet_timing",
          "facet_state",
          "facet_spawn",
          "facet_motion",
        ],
        responsibilities: ["Create one active fireball ability."],
      },
    ],
    moduleFacets: [
      {
        facetId: "facet_trigger",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "trigger",
        role: "input_trigger",
        category: "trigger",
        requiredCapabilities: ["input.trigger.capture"],
      },
      {
        facetId: "facet_timing",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "timing",
        role: "timed_rule",
        category: "rule",
        requiredCapabilities: ["timing.interval.local"],
      },
      {
        facetId: "facet_state",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "state",
        role: "session_state",
        category: "data",
        requiredCapabilities: ["state.session.feature_owned"],
      },
      {
        facetId: "facet_spawn",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "spawn",
        role: "spawn_emitter",
        category: "effect",
        requiredCapabilities: ["emission.spawn.feature_owned"],
      },
      {
        facetId: "facet_motion",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "motion",
        role: "follow_owner_motion",
        category: "effect",
        requiredCapabilities: [],
        optionalCapabilities: ["entity.motion.follow_owner"],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: false,
    implementationStrategy: "exploratory",
    unresolvedModuleNeeds: [
      {
        moduleId: "mod_gameplay_backbone_0",
        semanticRole: "gameplay_ability",
        category: "effect",
        reason: "No reusable implementation matched the gameplay backbone.",
        backboneKind: "gameplay_ability",
        facetIds: [
          "facet_trigger",
          "facet_timing",
          "facet_state",
          "facet_spawn",
          "facet_motion",
        ],
        coLocatePreferred: true,
        requiredCapabilities: [
          "input.trigger.capture",
          "timing.interval.local",
          "state.session.feature_owned",
          "emission.spawn.feature_owned",
        ],
        optionalCapabilities: ["entity.motion.follow_owner"],
        requiredOutputs: ["server.runtime", "host.runtime.lua", "host.config.kv"],
        artifactTargets: ["server", "config", "lua"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
    ],
  } as Blueprint;
}

function makeRevealBatchBackboneBlueprint(): Blueprint {
  return {
    id: "reveal_batch_demo",
    version: "1.0",
    summary: "A reveal-only weighted card demo.",
    sourceIntent: {
      intentKind: "standalone-system",
      goal: "Reveal 3 weighted cards and resolve them immediately as one batch.",
      normalizedMechanics: {
        trigger: true,
        candidatePool: true,
        weightedSelection: true,
        playerChoice: false,
        uiModal: false,
        outcomeApplication: true,
      },
    },
    modules: [
      {
        id: "mod_gameplay_backbone_0",
        role: "gameplay_ability",
        category: "effect",
        planningKind: "backbone",
        backboneKind: "gameplay_ability",
        facetIds: [
          "facet_trigger",
          "facet_pool",
          "facet_reveal_runtime",
          "facet_resolve",
        ],
        responsibilities: ["Reveal 3 weighted cards and resolve them immediately."],
      },
      {
        id: "mod_reveal_surface_0",
        role: "reveal_surface",
        category: "ui",
        responsibilities: ["Show the revealed cards with rarity styling and no choice controls."],
      },
    ],
    moduleFacets: [
      {
        facetId: "facet_trigger",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "trigger",
        role: "input_trigger",
        category: "trigger",
        requiredCapabilities: ["input.trigger.capture"],
        requiredOutputs: ["server.runtime"],
      },
      {
        facetId: "facet_pool",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "state",
        role: "weighted_pool",
        category: "data",
        requiredCapabilities: ["selection.pool.weighted_candidates"],
        requiredOutputs: ["shared.runtime"],
      },
      {
        facetId: "facet_reveal_runtime",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "effect",
        role: "reveal_batch_runtime",
        category: "rule",
        requiredCapabilities: ["selection.reveal.batch_immediate"],
        requiredOutputs: ["server.runtime"],
      },
      {
        facetId: "facet_resolve",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "effect",
        role: "effect_application",
        category: "effect",
        requiredCapabilities: ["effect.modifier.apply"],
        requiredOutputs: ["server.runtime", "host.config.kv"],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: false,
    implementationStrategy: "exploratory",
    unresolvedModuleNeeds: [
      {
        moduleId: "mod_gameplay_backbone_0",
        semanticRole: "gameplay_ability",
        category: "effect",
        reason: "Reveal runtime stays exploratory and synthesizes through one gameplay backbone.",
        backboneKind: "gameplay_ability",
        facetIds: [
          "facet_trigger",
          "facet_pool",
          "facet_reveal_runtime",
          "facet_resolve",
        ],
        coLocatePreferred: true,
        requiredCapabilities: [
          "input.trigger.capture",
          "selection.pool.weighted_candidates",
          "selection.reveal.batch_immediate",
          "effect.modifier.apply",
        ],
        requiredOutputs: ["server.runtime", "host.config.kv"],
        artifactTargets: ["server", "config", "lua"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
      {
        moduleId: "mod_reveal_surface_0",
        semanticRole: "reveal_surface",
        category: "ui",
        reason: "Reveal UI stays exploratory and synthesizes through one UI shell.",
        requiredCapabilities: ["ui.reveal.batch_surface"],
        requiredOutputs: ["card reveal presentation", "ui.surface"],
        artifactTargets: ["ui"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
    ],
  } as Blueprint;
}

function makeNamedShellBlueprint(): Blueprint {
  const blueprint = makeExploratoryBlueprint();
  blueprint.modules = blueprint.modules.map((module) =>
    module.id === "fire_dash_core"
      ? {
          ...module,
          parameters: {
            abilityName: "Placeholder Fire Ability",
          },
        }
      : module,
  );
  return blueprint;
}

function makeDefinitionOnlyProviderShellBlueprint(): Blueprint {
  return {
    id: "skill_provider_demo",
    version: "1.0",
    summary: "A definition-only provider shell.",
    sourceIntent: {
      intentKind: "micro-feature",
      goal: "Define one feature-owned primary hero ability shell for later external granting.",
      normalizedMechanics: {
        trigger: false,
        outcomeApplication: false,
      },
    },
    modules: [
      {
        id: "mod_gameplay_backbone_0",
        role: "gameplay_ability",
        category: "effect",
        planningKind: "backbone",
        backboneKind: "gameplay_ability",
        facetIds: ["facet_shell_definition"],
        responsibilities: ["Define one feature-owned grant-only provider shell."],
        outputs: ["ability shell definition"],
        parameters: {
          abilityName: "Skill Provider Demo",
        },
      },
    ],
    moduleFacets: [
      {
        facetId: "facet_shell_definition",
        backboneModuleId: "mod_gameplay_backbone_0",
        kind: "effect",
        role: "gameplay_ability",
        category: "effect",
        requiredCapabilities: ["ability.definition.shell"],
        requiredOutputs: ["server.runtime", "host.runtime.lua", "host.config.kv"],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: false,
    implementationStrategy: "exploratory",
    unresolvedModuleNeeds: [
      {
        moduleId: "mod_gameplay_backbone_0",
        semanticRole: "gameplay_ability",
        category: "effect",
        reason: "No reusable implementation matched the definition-only provider shell.",
        backboneKind: "gameplay_ability",
        facetIds: ["facet_shell_definition"],
        coLocatePreferred: true,
        requiredCapabilities: ["ability.definition.shell"],
        requiredOutputs: ["server.runtime", "host.runtime.lua", "host.config.kv"],
        artifactTargets: ["server", "config", "lua"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
    ],
  } as Blueprint;
}

function makeNonWritableSupportBlueprint(): Blueprint {
  return {
    id: "rw_contract_only_gap",
    version: "1.0",
    summary: "A contract-only unresolved module.",
    sourceIntent: {
      intentKind: "cross-system-composition",
      goal: "Wire one cross-feature contract without inventing host runtime shells.",
    },
    modules: [
      {
        id: "contract_only_bridge",
        role: "cross_feature_contract",
        category: "integration",
        responsibilities: ["Resolve one explicit cross-feature contract artifact."],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: false,
    implementationStrategy: "exploratory",
    unresolvedModuleNeeds: [
      {
        moduleId: "contract_only_bridge",
        semanticRole: "cross_feature_contract",
        category: "integration",
        reason: "No reusable contract artifact implementation was admitted.",
        requiredCapabilities: ["cross_feature.contract"],
        requiredOutputs: ["bridge.artifact"],
        artifactTargets: ["bridge"],
        ownedScopeHints: [],
        strategy: "exploratory",
        source: "test",
      },
    ],
  } as Blueprint;
}

async function withDisabledLLM<T>(run: () => Promise<T>): Promise<T> {
  const keys = [
    "RW_LLM_PROCESS_ENV_OVERRIDES",
    "LLM_PROVIDER",
    "OPENAI_BASE_URL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
  ] as const;
  const snapshot = new Map<string, string | undefined>(keys.map((key) => [key, process.env[key]]));

  process.env.RW_LLM_PROCESS_ENV_OVERRIDES = "1";
  process.env.LLM_PROVIDER = "";
  process.env.OPENAI_BASE_URL = "";
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_MODEL = "";
  process.env.ANTHROPIC_API_KEY = "";
  process.env.ANTHROPIC_MODEL = "";

  try {
    return await run();
  } finally {
    for (const key of keys) {
      const value = snapshot.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function testBuildSynthesizedAssemblyPlanWithLLMFallsBackToDeterministicPlan() {
  const blueprint = makeExploratoryBlueprint();
  const deterministic = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);
  const withFallback = await withDisabledLLM(() =>
    buildSynthesizedAssemblyPlanWithLLM(blueprint, blueprint.id)
  );

  assert.equal(withFallback.synthesis.artifacts.length, 2);
  assert.equal(withFallback.plan.writeTargets.length, 2);
  assert.deepEqual(
    withFallback.synthesis.artifacts.map((artifact) => artifact.targetPath),
    deterministic.synthesis.artifacts.map((artifact) => artifact.targetPath),
  );
  assert.ok(withFallback.synthesis.artifacts.some((artifact) => artifact.hostTarget === "lua_ability"));
  assert.ok(withFallback.synthesis.artifacts.some((artifact) => artifact.hostTarget === "ability_kv"));
  const kvArtifact = withFallback.synthesis.artifacts.find((artifact) => artifact.outputKind === "kv");
  assert.ok(kvArtifact);
  assert.equal(
    kvArtifact!.targetPath,
    buildAbilityKvFragmentPath(blueprint.id, "rw_rw_fire_dash_gameplay_ability_fire_dash_core_1"),
  );
  assert.equal(kvArtifact!.metadata?.abilityName, "rw_rw_fire_dash_gameplay_ability_fire_dash_core_1");
  assert.equal(kvArtifact!.metadata?.scriptFile, resolveAbilityKvScriptFile("rw_rw_fire_dash_gameplay_ability_fire_dash_core_1"));
  assert.equal(kvArtifact!.metadata?.aggregateTargetPath, ABILITY_KV_AGGREGATE_TARGET_PATH);
  assert.equal(kvArtifact!.metadata?.kvArtifactKind, "fragment");
  assert.equal(withFallback.synthesis.groundingAssessment?.status, "exact");
  assert.equal(withFallback.synthesis.moduleRecords?.[0]?.groundingAssessment?.status, "exact");
  assert.ok((withFallback.synthesis.grounding || []).length >= 2);
  assert.equal(
    (withFallback.synthesis.grounding || []).every((item) => item.unknownSymbols.length === 0),
    true,
  );
  assert.equal(
    (withFallback.synthesis.grounding || []).every((item) => item.warnings.length === 0),
    true,
  );
}

async function testGroundingIgnoresLocallyDefinedLuaHelpers(): Promise<void> {
  const blueprint = makeBundledExploratoryBlueprint();
  const result = await withDisabledLLM(() =>
    buildSynthesizedAssemblyPlanWithLLM(blueprint, blueprint.id)
  );

  const luaGrounding = (result.synthesis.grounding || []).find((item) =>
    item.targetProfile === "lua_ability"
  );
  assert.ok(luaGrounding);
  assert.equal(luaGrounding!.unknownSymbols.includes("BurnNearbyEnemies"), false);
  assert.equal(
    luaGrounding!.warnings.some((warning) => warning.includes("BurnNearbyEnemies")),
    false,
  );
}

function testLuaGroundingIgnoresLocallyDefinedMethodAndPrivateHelpers(): void {
  const symbols = extractArtifactSymbolsForGrounding(
    [
      "if reveal_batch_demo == nil then",
      "  reveal_batch_demo = class({})",
      "end",
      "",
      "function reveal_batch_demo:OnSpellStart()",
      "  self:_ResolveRevealBatch()",
      "  self:DealSplash()",
      "  EmitSoundOn(\"Hero_OgreMagi.Bloodlust.Target\", self:GetCaster())",
      "end",
      "",
      "function reveal_batch_demo:_ResolveRevealBatch()",
      "  return nil",
      "end",
      "",
      "function reveal_batch_demo:DealSplash()",
      "  return nil",
      "end",
      "",
      "local function _BuildCardPayload()",
      "  return {}",
      "end",
      "",
      "local helper = function()",
      "  return _BuildCardPayload()",
      "end",
      "",
      "helper()",
    ].join("\n"),
    "lua_ability",
  );

  assert.equal(symbols.includes("_ResolveRevealBatch"), false);
  assert.equal(symbols.includes("DealSplash"), false);
  assert.equal(symbols.includes("_BuildCardPayload"), false);
  assert.equal(symbols.includes("GetCaster"), true);
  assert.equal(symbols.includes("EmitSoundOn"), true);
}

function testLuaGroundingIgnoresQuotedEnumNoiseAndKeepsVectorCalls(): void {
  const symbols = extractArtifactSymbolsForGrounding(
    [
      "function reveal_batch_demo:CreateRevealParticle(caster, index)",
      "  EmitSoundOn(\"DOTA_Item.ArcaneBoots.Activate\", caster)",
      "  local offset = Vector((index - 2) * 90, 0, 120)",
      "  return offset",
      "end",
    ].join("\n"),
    "lua_ability",
  );

  assert.equal(symbols.includes("DOTA_I"), false);
  assert.equal(symbols.includes("Vector"), true);
  assert.equal(symbols.includes("EmitSoundOn"), true);
}

function testPanoramaGroundingOnlyUsesRealJsxTags(): void {
  const symbols = extractArtifactSymbolsForGrounding(
    [
      "import React from \"react\";",
      "",
      "type RevealBatchCardProps = { rarity: string };",
      "interface RevealBatchCardState<TCard> {",
      "  card: TCard;",
      "}",
      "",
      "function useRevealBatchCard<TCard extends RevealBatchCardProps>(card: TCard): TCard {",
      "  return card;",
      "}",
      "",
      "export function RevealBatchView(): JSX.Element {",
      "  const card = useRevealBatchCard<RevealBatchCardProps>({ rarity: \"rare\" });",
      "  return (",
      "    <Panel>",
      "      <Label text={card.rarity} />",
      "      <TextButton text=\"Confirm\" />",
      "      <Image src=\"file://{images}/heroes/test_png.vtex\" />",
      "    </Panel>",
      "  );",
      "}",
    ].join("\n"),
    "panorama_tsx",
  );

  assert.deepEqual(symbols.sort(), ["Image", "Label", "Panel", "TextButton"]);
}

function testPanoramaIntrinsicTagsCanResolveToExactStructuredRefs(): void {
  const symbols = extractArtifactSymbolsForGrounding(
    [
      "import React from \"react\";",
      "",
      "type RevealActionProps = { icon?: string };",
      "interface RevealActionState<TAction> {",
      "  action: TAction;",
      "}",
      "",
      "export function RevealActionPanel<TAction extends RevealActionProps>(props: TAction): JSX.Element {",
      "  return (",
      "    <Panel>",
      "      <Label text=\"Ready\" />",
      "      <TextButton text=\"Confirm\" />",
      "      {props.icon && <Image src={props.icon} />}",
      "    </Panel>",
      "  );",
      "}",
    ].join("\n"),
    "panorama_tsx",
  );
  const refs = lookupDota2HostSymbolsExact(process.cwd(), symbols, { targetProfile: "panorama_tsx" });
  const exactSymbols = new Set(refs.map((ref) => ref.symbol || ref.title));

  assert.equal(exactSymbols.has("Panel"), true);
  assert.equal(exactSymbols.has("Label"), true);
  assert.equal(exactSymbols.has("TextButton"), true);
  assert.equal(exactSymbols.has("Image"), true);
}

function testRevealBatchUiGroundingUsesExactPanoramaBacking(): void {
  const blueprint = makeRevealBatchBackboneBlueprint();
  const result = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);
  const panoramaGrounding = (result.synthesis.grounding || []).find((item) =>
    item.targetProfile === "panorama_tsx"
  );

  assert.ok(panoramaGrounding);
  assert.equal(panoramaGrounding!.allowlistedSymbols.length, 0);
  assert.equal(panoramaGrounding!.unknownSymbols.length, 0);
  assert.equal(panoramaGrounding!.verifiedSymbols.includes("Panel"), true);
  assert.equal(panoramaGrounding!.verifiedSymbols.includes("Label"), true);
}

function testBuildSynthesizedAssemblyPlanBundlesGameplayModulesIntoSingleAbility(): void {
  const blueprint = makeBundledExploratoryBlueprint();
  const result = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);

  assert.equal(result.synthesis.bundles?.length, 1);
  assert.equal(result.plan.synthesisBundles?.length, 1);
  assert.equal(result.synthesis.artifacts.length, 2);
  assert.equal(result.plan.writeTargets.length, 2);
  assert.equal(result.plan.modules?.length, 1);
  assert.equal(
    result.synthesis.moduleRecords?.every((record) => record.bundleId === result.synthesis.bundles?.[0]?.bundleId),
    true,
  );
  assert.equal(
    result.synthesis.artifacts.every((artifact) => artifact.bundleId === result.synthesis.bundles?.[0]?.bundleId),
    true,
  );
  assert.equal(
    result.synthesis.artifacts.some((artifact) => artifact.outputKind === "ui"),
    false,
  );
  assert.equal(result.synthesis.groundingAssessment?.status, "exact");
  assert.equal(result.synthesis.artifacts.every((artifact) => Boolean(artifact.groundingAssessment)), true);
}

function testBuildSynthesizedAssemblyPlanPreservesBackboneTruth(): void {
  const blueprint = makeBackboneExploratoryBlueprint();
  const result = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);

  assert.equal(result.synthesis.bundles?.length, 1);
  assert.equal(result.synthesis.moduleRecords?.length, 1);
  assert.equal(result.synthesis.moduleRecords?.[0]?.planningKind, "backbone");
  assert.equal(result.synthesis.moduleRecords?.[0]?.backboneKind, "gameplay_ability");
  assert.deepEqual(
    result.synthesis.moduleRecords?.[0]?.facetIds,
    blueprint.modules[0]?.facetIds,
  );
}

function testBuildSynthesizedAssemblyPlanKeepsRevealUiAsSeparateUiBundle(): void {
  const blueprint = makeRevealBatchBackboneBlueprint();
  const result = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);

  const uiBundle = result.synthesis.bundles?.find((bundle) => bundle.kind === "ui_surface");
  const gameplayBundle = result.synthesis.bundles?.find((bundle) => bundle.kind === "gameplay_ability");

  assert.equal(result.synthesis.bundles?.length, 2);
  assert.ok(gameplayBundle);
  assert.ok(uiBundle);
  assert.equal(result.synthesis.artifacts.filter((artifact) => artifact.outputKind === "ui").length, 2);
  assert.equal(
    result.synthesis.artifacts.filter((artifact) => artifact.bundleId === gameplayBundle?.bundleId).length,
    2,
  );
  assert.equal(
    result.synthesis.artifacts.filter((artifact) => artifact.bundleId === uiBundle?.bundleId).length,
    2,
  );
}

function testBuildSynthesizedAssemblyPlanUsesSanitizedExplicitAbilityName(): void {
  const blueprint = makeNamedShellBlueprint();
  const result = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);

  const luaArtifact = result.synthesis.artifacts.find((artifact) => artifact.contentType === "lua");
  const kvArtifact = result.synthesis.artifacts.find((artifact) => artifact.contentType === "kv");
  assert.ok(luaArtifact);
  assert.ok(kvArtifact);
  assert.equal(luaArtifact?.metadata?.abilityName, "placeholder_fire_ability");
  assert.equal(kvArtifact?.metadata?.abilityName, "placeholder_fire_ability");
  assert.ok(luaArtifact?.targetPath.endsWith("placeholder_fire_ability.lua"));
  assert.ok(luaArtifact?.content.includes("if placeholder_fire_ability == nil then"));
  assert.ok(kvArtifact?.content.includes('"placeholder_fire_ability"'));
  assert.ok(kvArtifact?.content.includes('"ScriptFile"               "rune_weaver/abilities/placeholder_fire_ability"'));
}

function testBuildSynthesizedAssemblyPlanSupportsDefinitionOnlyProviderShell(): void {
  const blueprint = makeDefinitionOnlyProviderShellBlueprint();
  const result = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);

  const luaArtifact = result.synthesis.artifacts.find((artifact) => artifact.contentType === "lua");
  const kvArtifact = result.synthesis.artifacts.find((artifact) => artifact.contentType === "kv");
  assert.equal(result.synthesis.bundles?.length, 1);
  assert.equal(result.synthesis.moduleRecords?.[0]?.backboneKind, "gameplay_ability");
  assert.equal(result.synthesis.unresolvedModuleNeeds.length, 0);
  assert.equal(luaArtifact?.metadata?.abilityName, "skill_provider_demo");
  assert.equal(kvArtifact?.metadata?.abilityName, "skill_provider_demo");
  assert.ok(luaArtifact?.targetPath.endsWith("skill_provider_demo.lua"));
  assert.ok(kvArtifact?.targetPath.endsWith("skill_provider_demo.kv.txt"));
}

function testBuildSynthesizedAssemblyPlanDoesNotInventWritableShellsForContractOnlyNeeds(): void {
  const blueprint = makeNonWritableSupportBlueprint();
  const result = buildSynthesizedAssemblyPlan(blueprint, blueprint.id);

  assert.equal(result.synthesis.artifacts.length, 0);
  assert.equal(result.plan.writeTargets.length, 0);
  assert.equal(result.synthesis.moduleRecords.length, 0);
  assert.equal(result.synthesis.unresolvedModuleNeeds.length, 1);
  assert.ok(
    result.synthesis.blockers.some((blocker) => blocker.includes("cannot invent bridge ownership")),
  );
}

async function runTests() {
  testLuaGroundingIgnoresLocallyDefinedMethodAndPrivateHelpers();
  testLuaGroundingIgnoresQuotedEnumNoiseAndKeepsVectorCalls();
  testPanoramaGroundingOnlyUsesRealJsxTags();
  testPanoramaIntrinsicTagsCanResolveToExactStructuredRefs();
  testBuildSynthesizedAssemblyPlanBundlesGameplayModulesIntoSingleAbility();
  testBuildSynthesizedAssemblyPlanPreservesBackboneTruth();
  testBuildSynthesizedAssemblyPlanKeepsRevealUiAsSeparateUiBundle();
  testRevealBatchUiGroundingUsesExactPanoramaBacking();
  testBuildSynthesizedAssemblyPlanUsesSanitizedExplicitAbilityName();
  testBuildSynthesizedAssemblyPlanSupportsDefinitionOnlyProviderShell();
  testBuildSynthesizedAssemblyPlanDoesNotInventWritableShellsForContractOnlyNeeds();
  await testBuildSynthesizedAssemblyPlanWithLLMFallsBackToDeterministicPlan();
  await testGroundingIgnoresLocallyDefinedLuaHelpers();
  console.log("adapters/dota2/synthesis/index.test.ts passed");
}

runTests();

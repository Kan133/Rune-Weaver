import assert from "node:assert/strict";

import type { Blueprint } from "../../../core/schema/types.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  buildAbilityKvFragmentPath,
  resolveAbilityKvScriptFile,
} from "../kv/contract.js";
import {
  buildSynthesizedAssemblyPlan,
  buildSynthesizedAssemblyPlanWithLLM,
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
  testBuildSynthesizedAssemblyPlanBundlesGameplayModulesIntoSingleAbility();
  testBuildSynthesizedAssemblyPlanPreservesBackboneTruth();
  testBuildSynthesizedAssemblyPlanUsesSanitizedExplicitAbilityName();
  testBuildSynthesizedAssemblyPlanDoesNotInventWritableShellsForContractOnlyNeeds();
  await testBuildSynthesizedAssemblyPlanWithLLMFallsBackToDeterministicPlan();
  await testGroundingIgnoresLocallyDefinedLuaHelpers();
  console.log("adapters/dota2/synthesis/index.test.ts passed");
}

runTests();

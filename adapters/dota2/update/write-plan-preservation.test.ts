import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { UpdateIntent } from "../../../core/schema/types.js";
import type { WritePlan } from "../assembler/index.js";
import { preserveDota2UpdateWritePlanArtifacts } from "./write-plan-preservation.js";
import {
  ABILITY_KV_AGGREGATE_TARGET_PATH,
  buildAbilityKvFragmentPath,
  resolveAbilityKvScriptFile,
} from "../kv/contract.js";

function createHostArtifacts(hostRoot: string): { luaPath: string; kvPath: string; fragmentPath: string } {
  const luaPath = "game/scripts/vscripts/rune_weaver/abilities/rw_standalone_system_kmme_gameplay_ability_mod_func_0_1.lua";
  const kvPath = ABILITY_KV_AGGREGATE_TARGET_PATH;
  const fragmentPath = buildAbilityKvFragmentPath(
    "standalone_system_kmme",
    "rw_standalone_system_kmme_gameplay_ability_mod_func_0_1",
  );

  mkdirSync(join(hostRoot, "game/scripts/vscripts/rune_weaver/abilities"), { recursive: true });
  mkdirSync(join(hostRoot, "game/scripts/npc"), { recursive: true });

  writeFileSync(
    join(hostRoot, luaPath),
    [
      "rw_standalone_system_kmme_gameplay_ability_mod_func_0_1 = class({})",
      "rw_standalone_system_kmme_gameplay_ability_mod_func_0_1.TRIGGER_KEY = \"F5\"",
      "function rw_standalone_system_kmme_gameplay_ability_mod_func_0_1:BeginSelectionForHero()",
      "  local session = {",
      "    triggerKey = \"F5\"",
      "  }",
      "  return session",
      "end",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(hostRoot, kvPath),
    [
      "\"DOTAAbilities\"",
      "{",
      "\"rw_standalone_system_kmme_gameplay_ability_mod_func_0_1\"",
      "{",
      "\"BaseClass\" \"ability_lua\"",
      "\"ScriptFile\" \"abilities/rw_standalone_system_kmme_gameplay_ability_mod_func_0_1\"",
      "}",
      "}",
      "",
    ].join("\n"),
  );

  return { luaPath, kvPath, fragmentPath };
}

function createExistingFeatureRecord(paths: { luaPath: string; kvPath: string; fragmentPath: string }) {
  return {
    featureId: "standalone_system_kmme",
    intentKind: "standalone-system",
    status: "active" as const,
    revision: 1,
    blueprintId: "standalone_system_kmme",
    selectedPatterns: ["input.key_binding", "data.weighted_pool", "rule.selection_flow"],
    modules: [
      {
        moduleId: "mod_func_0",
        bundleId: "gameplay_ability_mod_func_0_1",
        role: "gameplay-core",
        category: "rule",
        sourceKind: "synthesized" as const,
        selectedPatternIds: [],
        ownedPaths: [paths.luaPath, paths.fragmentPath],
        artifactPaths: [paths.luaPath, paths.fragmentPath],
      },
    ],
    generatedFiles: [paths.luaPath, paths.kvPath],
    entryBindings: [],
    integrationPoints: ["input.key_binding:F5"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createUpdateIntent(
  rawPrompt: string,
  options: {
    modifyKind?: UpdateIntent["delta"]["modify"][number]["kind"];
    scope?: NonNullable<UpdateIntent["semanticAnalysis"]>["governanceDecisions"]["scope"]["value"];
  } = {},
): UpdateIntent {
  const modifyKind = options.modifyKind || "trigger";
  const scope = options.scope || (modifyKind === "composition" ? "rewrite" : "bounded_update");
  const mutationItem = modifyKind === "trigger"
    ? {
        path: "input.triggerKey",
        kind: "trigger" as const,
        summary: "Rebind the current trigger key to F7.",
        oldValue: "F5",
        newValue: "F7",
      }
    : {
        path: "realization.runtime_shell",
        kind: modifyKind,
        summary: "Rewrite the current runtime shell.",
      };

  return {
    version: "1.0",
    mode: "update",
    target: {
      featureId: "standalone_system_kmme",
      revision: 1,
      sourceBacked: false,
    },
    currentFeatureContext: {
      featureId: "standalone_system_kmme",
      revision: 1,
      intentKind: "standalone-system",
      selectedPatterns: ["input.key_binding", "data.weighted_pool", "rule.selection_flow"],
      sourceBacked: false,
      preservedModuleBackbone: ["gameplay-core"],
      preservedInvariants: [],
      boundedFields: {
        triggerKey: "F5",
        abilityName: "rw_standalone_system_kmme_gameplay_ability_mod_func_0_1",
        hasLuaAbilityShell: true,
        hasAbilityKvParticipation: true,
        bundleIds: ["gameplay_ability_mod_func_0_1"],
        realizationKinds: ["lua", "kv"],
      },
    },
    requestedChange: {
      version: "1.0",
      host: { kind: "dota2-x-template" },
      request: {
        rawPrompt,
        goal: rawPrompt,
      },
      classification: {
        intentKind: "micro-feature",
      },
      requirements: {
        functional: [rawPrompt],
      },
      constraints: {},
      normalizedMechanics: {},
      resolvedAssumptions: [],
    },
    governedChange: {
      version: "1.0",
      target: {
        featureId: "standalone_system_kmme",
        revision: 1,
        sourceBacked: false,
      },
      scope,
      preservation: {
        preservedModuleBackbone: ["gameplay-core"],
        preservedInvariants: [],
        protectedContracts: ["runtime.lua", "runtime.kv"],
      },
      request: {
        rawPrompt,
        goal: rawPrompt,
      },
      classification: {
        intentKind: "micro-feature",
      },
      requirements: {
        functional: [rawPrompt],
      },
      constraints: {},
      interaction: modifyKind === "trigger"
        ? {
            activations: [
              {
                kind: "key",
                input: "F7",
              },
            ],
          }
        : undefined,
      normalizedMechanics: {},
      resolvedAssumptions: [],
      parameters: modifyKind === "trigger"
        ? {
            triggerKey: "F7",
          }
        : undefined,
    },
    semanticAnalysis: {
      promptFacts: [],
      currentTruthFacts: [],
      governanceDecisions: {
        scope: {
          code: "update.scope",
          value: scope,
          confidence: "high",
          rationaleFactCodes: [],
        },
        preservation: {
          code: "update.preservation",
          value: {
            preservedModuleBackbone: ["gameplay-core"],
            preservedInvariants: [],
            protectedContracts: ["runtime.lua", "runtime.kv"],
          },
          confidence: "high",
          rationaleFactCodes: [],
        },
        mutationAuthority: {
          code: "update.mutation_authority",
          value: {
            add: [],
            modify: [mutationItem],
            remove: [],
            blocked: [],
          },
          confidence: "high",
          rationaleFactCodes: [],
        },
        effectiveContracts: {
          code: "update.effective_contracts",
          value: {},
          confidence: "high",
          rationaleFactCodes: [],
        },
      },
      openSemanticResidue: [],
    },
    delta: {
      preserve: [],
      add: [],
      modify: [mutationItem],
      remove: [],
    },
    resolvedAssumptions: [],
  };
}

function createWritePlan(): WritePlan {
  return {
    id: "writeplan_test",
    targetProject: "D:\\rw-test5",
    generatedAt: new Date().toISOString(),
    namespaceRoots: {
      server: "game/scripts/src/rune_weaver",
      panorama: "content/panorama/src/rune_weaver",
    },
    entries: [
      {
        operation: "update",
        targetPath: "game/scripts/src/rune_weaver/generated/server/standalone_system_kmme_input_trigger_input_key_binding.ts",
        contentType: "typescript",
        contentSummary: "input.key_binding runtime refresh",
        sourcePattern: "input.key_binding",
        sourceModule: "input_trigger",
        safe: true,
      },
    ],
    integrationPoints: ["input.key_binding:F7"],
    stats: {
      total: 1,
      create: 0,
      update: 1,
      conflicts: 0,
      deferred: 0,
    },
    executionOrder: [0],
    readyForHostWrite: true,
  };
}

function testPreserveDota2UpdateWritePlanArtifactsCarriesForwardExistingGameplayShell() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-write-plan-preserve-"));
  const paths = createHostArtifacts(hostRoot);
  const writePlan = createWritePlan();

  const result = preserveDota2UpdateWritePlanArtifacts({
    hostRoot,
    updateIntent: createUpdateIntent("Change the trigger key from F5 to F7 and keep everything else the same."),
    existingFeature: createExistingFeatureRecord(paths),
    writePlan,
  });

  assert.equal(result.preserved.length, 2);
  assert.deepEqual(result.prunedPaths, []);
  const preservedLuaEntry = writePlan.entries.find((entry) => entry.targetPath === paths.luaPath);
  assert.ok(preservedLuaEntry?.metadata?.synthesizedContent);
  assert.match(String(preservedLuaEntry?.metadata?.synthesizedContent), /TRIGGER_KEY = "F7"/);
  assert.match(String(preservedLuaEntry?.metadata?.synthesizedContent), /triggerKey = "F7"/);
  assert.ok(writePlan.entries.some((entry) => entry.targetPath === paths.fragmentPath && entry.metadata?.synthesizedContent));
}

function testPreserveDota2UpdateWritePlanArtifactsPrunesUnauthorizedReplacementShells() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-write-plan-prune-"));
  const paths = createHostArtifacts(hostRoot);
  const writePlan = createWritePlan();
  writePlan.entries.push(
    {
      operation: "create",
      targetPath: "game/scripts/vscripts/rune_weaver/abilities/rw_standalone_system_kmme_new_shell.lua",
      contentType: "lua",
      contentSummary: "new replacement shell",
      sourcePattern: "synthesized.mod_new.lua",
      sourceModule: "mod_new",
      safe: true,
    },
    {
      operation: "update",
      targetPath: buildAbilityKvFragmentPath(
        "standalone_system_kmme",
        "rw_standalone_system_kmme_new_shell",
      ),
      contentType: "kv",
      contentSummary: "replacement kv shell",
      sourcePattern: "synthesized.mod_new.kv",
      sourceModule: "mod_new",
      safe: true,
      metadata: {
        abilityName: "rw_standalone_system_kmme_new_shell",
        scriptFile: resolveAbilityKvScriptFile("rw_standalone_system_kmme_new_shell"),
        kvArtifactKind: "fragment",
        aggregateTargetPath: ABILITY_KV_AGGREGATE_TARGET_PATH,
      },
    },
  );

  const result = preserveDota2UpdateWritePlanArtifacts({
    hostRoot,
    updateIntent: createUpdateIntent("Change the trigger key from F5 to F7 and keep everything else the same."),
    existingFeature: createExistingFeatureRecord(paths),
    writePlan,
  });

  assert.deepEqual(
    result.prunedPaths.sort(),
    [
      "game/scripts/vscripts/rune_weaver/abilities/rw_standalone_system_kmme_new_shell.lua",
      buildAbilityKvFragmentPath(
        "standalone_system_kmme",
        "rw_standalone_system_kmme_new_shell",
      ),
    ].sort(),
  );
  assert.equal(writePlan.entries.some((entry) => entry.targetPath === "game/scripts/vscripts/rune_weaver/abilities/rw_standalone_system_kmme_new_shell.lua"), false);
  assert.equal(writePlan.entries.some((entry) => entry.targetPath === paths.fragmentPath && entry.metadata?.preservedFromExistingFeature === true), true);
}

function testPreserveDota2UpdateWritePlanArtifactsSkipsExplicitRealizationRewrite() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-write-plan-skip-"));
  const paths = createHostArtifacts(hostRoot);
  const writePlan = createWritePlan();

  const result = preserveDota2UpdateWritePlanArtifacts({
    hostRoot,
    updateIntent: createUpdateIntent("Rewrite this ability shell in pure TypeScript and remove the Lua shell.", {
      modifyKind: "composition",
      scope: "rewrite",
    }),
    existingFeature: createExistingFeatureRecord(paths),
    writePlan,
  });

  assert.equal(result.preserved.length, 0);
  assert.ok(result.skippedReasons.some((reason) => reason.includes("carry-forward is disabled")));
  assert.equal(writePlan.entries.length, 1);
}

function testPreserveDota2UpdateWritePlanArtifactsDoesNotTreatPromptMentionAsRewriteWhenGovernanceIsBounded() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-write-plan-bounded-"));
  const paths = createHostArtifacts(hostRoot);
  const writePlan = createWritePlan();

  const result = preserveDota2UpdateWritePlanArtifacts({
    hostRoot,
    updateIntent: createUpdateIntent("Keep the existing Lua shell and KV shell, only change the trigger key from F5 to F7.", {
      modifyKind: "trigger",
      scope: "bounded_update",
    }),
    existingFeature: createExistingFeatureRecord(paths),
    writePlan,
  });

  assert.equal(result.preserved.length, 2);
  assert.equal(result.skippedReasons.some((reason) => reason.includes("carry-forward is disabled")), false);
}

function runTests() {
  testPreserveDota2UpdateWritePlanArtifactsCarriesForwardExistingGameplayShell();
  testPreserveDota2UpdateWritePlanArtifactsPrunesUnauthorizedReplacementShells();
  testPreserveDota2UpdateWritePlanArtifactsSkipsExplicitRealizationRewrite();
  testPreserveDota2UpdateWritePlanArtifactsDoesNotTreatPromptMentionAsRewriteWhenGovernanceIsBounded();
  console.log("adapters/dota2/update/write-plan-preservation.test.ts passed");
}

runTests();

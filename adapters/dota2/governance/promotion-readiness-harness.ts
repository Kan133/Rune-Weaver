import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  Blueprint,
  ExecutionAuthorityDecision,
  IntentSchema,
  SelectionPoolFeatureAuthoringParameters,
  SelectionPoolParameterSurface,
  WizardClarificationSignals,
} from "../../../core/schema/types.js";
import { lookupDota2HostSymbolsExact } from "../../../core/retrieval/dota2-bundles.js";
import type { RuneWeaverWorkspace } from "../../../core/workspace/types.js";
import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import { refreshBridge } from "../bridge/index.js";
import {
  applyDota2GrantSeam,
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
} from "../cross-feature/index.js";
import type { FeatureAuthoring as SelectionPoolFeatureAuthoring } from "../families/selection-pool/shared.js";
import { getPatternMeta } from "../patterns/index.js";
import { resolveProviderAbilityBindingFromWritePlan } from "../provider-ability-identity.js";
import { buildSynthesizedAssemblyPlan } from "../synthesis/index.js";
import { getDota2ReusableAssetPromotionPackets } from "./reusable-assets.js";
import {
  type Dota2PromotionReadinessAssessment,
  type Dota2PromotionReadinessProofPoint,
  type Dota2PromotionReadinessTargetId,
  getDota2PromotionReadinessSpec,
  getDota2PromotionReadinessSpecs,
} from "./promotion-readiness.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function createWritePlan(entries: WritePlanEntry[] = []): WritePlan {
  return {
    id: "promotion_readiness_writeplan",
    targetProject: "D:\\promotion-readiness-host",
    generatedAt: new Date().toISOString(),
    namespaceRoots: {
      server: "game/scripts/src/rune_weaver",
      panorama: "content/panorama/src/rune_weaver",
    },
    entries,
    executionOrder: entries.map((_, index) => index),
    readyForHostWrite: true,
    readinessBlockers: [],
    stats: {
      total: entries.length,
      create: entries.filter((entry) => entry.operation === "create").length,
      update: entries.filter((entry) => entry.operation === "update").length,
      conflicts: entries.filter((entry) => !entry.safe || (entry.conflicts && entry.conflicts.length > 0)).length,
      deferred: 0,
    },
  } as WritePlan;
}

function createLuaEntry(targetPath: string, abilityName: string): WritePlanEntry {
  return {
    operation: "create",
    targetPath,
    contentType: "lua",
    contentSummary: `lua ability ${abilityName}`,
    sourcePattern: "synthesized.gameplay_ability",
    sourceModule: "gameplay_ability",
    safe: true,
    metadata: {
      abilityName,
      synthesizedContent: `if ${abilityName} == nil then\n  ${abilityName} = class({})\nend\n`,
    },
  };
}

function createKvEntry(
  targetPath: string,
  abilityName: string,
  options?: {
    kvAbilityName?: string;
    scriptFileName?: string;
  },
): WritePlanEntry {
  const kvAbilityName = options?.kvAbilityName || abilityName;
  const scriptFileName = options?.scriptFileName || kvAbilityName;

  return {
    operation: "create",
    targetPath,
    contentType: "kv",
    contentSummary: `kv ability ${kvAbilityName}`,
    sourcePattern: "synthesized.gameplay_ability",
    sourceModule: "gameplay_ability",
    safe: true,
    metadata: {
      abilityName,
      synthesizedContent: [
        `"${kvAbilityName}"`,
        "{",
        '  "BaseClass"                "ability_lua"',
        `  "ScriptFile"               "rune_weaver/abilities/${scriptFileName}"`,
        "}",
      ].join("\n"),
    },
  };
}

function createGameplayAbilityBlueprint(featureId: string): Blueprint {
  return {
    id: `bp_${featureId}`,
    version: "1.0",
    summary: "Grantable gameplay ability provider",
    sourceIntent: {
      goal: "Provide one grant-only gameplay ability.",
      intentKind: "micro-feature",
      normalizedMechanics: {
        outcomeApplication: true,
      },
    },
    modules: [
      {
        id: "gameplay_ability",
        role: "gameplay_ability",
        category: "effect",
        planningKind: "backbone",
        backboneKind: "gameplay_ability",
        responsibilities: ["Provide one gameplay ability shell."],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: true,
    featureContract: {
      exports: [],
      consumes: [],
      integrationSurfaces: [],
      stateScopes: [],
    },
    commitDecision: {
      outcome: "committable",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: false,
      reasons: [],
    },
  } as Blueprint;
}

function createDefinitionOnlyProviderBlueprint(featureId: string): Blueprint {
  return {
    id: `bp_${featureId}`,
    version: "1.0",
    summary: "Definition-only provider shell",
    sourceIntent: {
      goal: "Define one provider shell for later external granting.",
      intentKind: "micro-feature",
      normalizedMechanics: {
        outcomeApplication: false,
      },
    },
    modules: [
      {
        id: "gameplay_ability",
        role: "gameplay_ability",
        category: "effect",
        planningKind: "backbone",
        backboneKind: "gameplay_ability",
        responsibilities: ["Define one feature-owned ability shell for later external granting."],
        outputs: ["ability shell definition"],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: true,
    featureContract: {
      exports: [],
      consumes: [],
      integrationSurfaces: [],
      stateScopes: [],
    },
    commitDecision: {
      outcome: "exploratory",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: true,
      reasons: [],
    },
  } as Blueprint;
}

function createSelectionPoolBlueprint(featureId: string): Blueprint {
  const parameters: SelectionPoolFeatureAuthoringParameters = {
    triggerKey: "F4",
    choiceCount: 1,
    objectKind: "talent",
    drawMode: "single",
    duplicatePolicy: "forbid",
    poolStateTracking: "session",
    selectionPolicy: "single",
    applyMode: "immediate",
    postSelectionPoolBehavior: "remove_selected_from_remaining",
    trackSelectedItems: true,
    localCollections: [
      {
        collectionId: "local_rewards",
        objects: [
          {
            objectId: "local_reward_01",
            label: "Local Reward",
            description: "Synthetic local selection reward for readiness proof.",
          },
        ],
      },
    ],
    poolEntries: [
      {
        entryId: "R001",
        objectRef: {
          source: "local_collection",
          collectionId: "local_rewards",
          objectId: "local_reward_01",
        },
        weight: 1,
        tier: "R",
      },
    ],
  };
  const parameterSurface: SelectionPoolParameterSurface = {
    triggerKey: {
      kind: "single_hotkey",
      allowList: ["F4"],
    },
    choiceCount: {
      minimum: 1,
      maximum: 1,
    },
    poolEntries: {
      minItems: 1,
      seededWhenMissing: false,
    },
    inventory: {
      supported: false,
      capacityRange: {
        minimum: 0,
        maximum: 0,
      },
      fixedPresentation: "persistent_panel",
    },
    invariants: [
      "feature owns only the pool-entry relationship for local candidates",
      "selection shells stay outside the provider export seam unless an explicit grant relation is requested",
    ],
  };
  const featureAuthoring: SelectionPoolFeatureAuthoring = {
    mode: "source-backed",
    profile: "selection_pool",
    objectKind: parameters.objectKind,
    parameters,
    parameterSurface,
  };

  return {
    id: `bp_${featureId}`,
    version: "1.0",
    summary: "Local selection shell",
    sourceIntent: {
      goal: "Create one local weighted selection shell that stays entirely inside the current feature.",
      intentKind: "standalone-system",
      normalizedMechanics: {
        trigger: true,
        candidatePool: true,
        weightedSelection: true,
        playerChoice: true,
        uiModal: true,
        outcomeApplication: true,
      },
    },
    modules: [
      {
        id: "selection_input",
        role: "input_trigger",
        category: "trigger",
        responsibilities: ["Open the local selection shell."],
      },
      {
        id: "selection_pool",
        role: "weighted_pool",
        category: "data",
        responsibilities: ["Own the local weighted candidate pool."],
      },
      {
        id: "selection_flow",
        role: "selection_flow",
        category: "rule",
        responsibilities: ["Run the local selection flow."],
      },
      {
        id: "selection_outcome",
        role: "selection_outcome",
        category: "effect",
        responsibilities: ["Realize the local selection outcome."],
      },
      {
        id: "selection_modal",
        role: "selection_modal",
        category: "ui",
        responsibilities: ["Render the selection UI."],
      },
    ],
    connections: [],
    patternHints: [],
    assumptions: [],
    validations: [],
    readyForAssembly: true,
    status: "ready",
    featureAuthoring: {
      ...featureAuthoring,
    },
    featureContract: {
      exports: [],
      consumes: [],
      integrationSurfaces: [],
      stateScopes: [],
    },
    commitDecision: {
      outcome: "committable",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: false,
      reasons: [],
    },
  } as Blueprint;
}

function createExecutionAuthorityDecision(
  overrides: Partial<ExecutionAuthorityDecision> = {},
): ExecutionAuthorityDecision {
  return {
    blocksBlueprint: false,
    blocksWrite: false,
    requiresReview: false,
    reasons: [],
    remainingStructuralContracts: [],
    unresolvedDependencies: [],
    ...overrides,
  };
}

function createClarificationSignals(
  overrides: Partial<WizardClarificationSignals> = {},
): WizardClarificationSignals {
  return {
    semanticPosture: "bounded",
    reasons: [],
    openStructuralContracts: [],
    unresolvedDependencies: [],
    ...overrides,
  };
}

function createGameplayProviderSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Create one grantable gameplay ability provider.",
      goal: "Create one grantable gameplay ability provider.",
    },
    classification: { intentKind: "micro-feature", confidence: "high" },
    requirements: { functional: ["Provide one gameplay ability."] },
    constraints: {},
    normalizedMechanics: { outcomeApplication: true },
    resolvedAssumptions: [],
  } as IntentSchema;
}

function createDefinitionOnlyProviderSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Create one gameplay ability shell only for later external granting.",
      goal: "Create one gameplay ability shell only for later external granting.",
    },
    classification: { intentKind: "micro-feature", confidence: "high" },
    requirements: {
      functional: [
        "Define exactly one gameplay ability shell only.",
        "The feature includes no grant logic.",
        "The feature includes no modifier application.",
        "The shell exists only as a definition for later external granting.",
      ],
      typed: [
        {
          id: "grantable_gameplay_ability_shell",
          kind: "effect",
          summary: "Define one gameplay ability shell for later external granting.",
          outputs: ["ability shell definition"],
        },
      ],
    },
    constraints: {},
    parameters: {
      shellOnly: true,
      playerInput: false,
      autoAttach: false,
      grantLogicIncluded: false,
      modifierApplicationIncluded: false,
      externalGrantLater: true,
    },
    normalizedMechanics: {
      outcomeApplication: false,
    },
    resolvedAssumptions: [],
  } as IntentSchema;
}

function createSelectionSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Create one local weighted selection shell that stays entirely inside the current feature.",
      goal: "Create one local weighted selection shell that stays entirely inside the current feature.",
    },
    classification: { intentKind: "standalone-system", confidence: "high" },
    requirements: {
      functional: [
        "Open one local weighted selection UI.",
        "Choose one local reward from the current feature-owned pool.",
      ],
    },
    constraints: {},
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
    },
    resolvedAssumptions: [],
  } as IntentSchema;
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
        source: "derived-module",
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
        source: "derived-module",
      },
    ],
  } as Blueprint;
}

function createBridgeTempHost(): string {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-promotion-readiness-"));

  mkdirSync(join(hostRoot, "game", "scripts", "src", "modules"), { recursive: true });
  mkdirSync(join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "server"), { recursive: true });
  mkdirSync(join(hostRoot, "content", "panorama", "src", "hud"), { recursive: true });
  mkdirSync(join(hostRoot, "content", "panorama", "src", "rune_weaver", "generated", "ui"), { recursive: true });

  writeFileSync(
    join(hostRoot, "game", "scripts", "src", "modules", "index.ts"),
    "export function ActivateModules() {\n  print(\"host activate\");\n}\n",
    "utf-8",
  );
  writeFileSync(
    join(hostRoot, "content", "panorama", "src", "hud", "script.tsx"),
    [
      "import React from \"react\";",
      "import { render } from \"react-panorama-x\";",
      "",
      "function Root() {",
      "  return <Label text=\"host\" />;",
      "}",
      "",
      "render(<Root />, $.GetContextPanel());",
      "",
    ].join("\n"),
    "utf-8",
  );
  writeFileSync(
    join(hostRoot, "content", "panorama", "src", "hud", "styles.less"),
    "@import \"../rune_weaver/generated/ui/stale_feature.less\";\n\n.root {\n  width: 100%;\n}\n",
    "utf-8",
  );

  return hostRoot;
}

function writeJson(hostRoot: string, relativePath: string, value: unknown): void {
  const fullPath = join(hostRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(value, null, 2), "utf-8");
}

function runProofPoint(
  id: string,
  summary: string,
  evidenceRefs: string[],
  run: () => { passed: boolean; notes?: string[] },
): Dota2PromotionReadinessProofPoint {
  try {
    const result = run();
    return {
      id,
      summary,
      passed: result.passed,
      notes: result.notes || [],
      evidenceRefs,
    };
  } catch (error) {
    return {
      id,
      summary,
      passed: false,
      notes: [error instanceof Error ? error.message : String(error)],
      evidenceRefs,
    };
  }
}

function evaluateGrantOnlyProviderExportSeam(): Dota2PromotionReadinessAssessment {
  const spec = getDota2PromotionReadinessSpec("grant_only_provider_export_seam");
  const proofPoints = [
    runProofPoint(
      "authoritative_provider_identity_closes",
      "Provider export seam requires exactly one authoritative Lua/KV ability identity.",
      [
        "adapters/dota2/provider-ability-identity.ts",
      ],
      () => {
        const resolution = resolveProviderAbilityBindingFromWritePlan(
          createWritePlan([
            createLuaEntry(
              "game/scripts/vscripts/rune_weaver/abilities/rw_skill_provider_demo.lua",
              "rw_skill_provider_demo",
            ),
            createKvEntry(
              "game/scripts/npc/npc_abilities_custom.txt",
              "rw_skill_provider_demo",
            ),
          ]),
        );
        return {
          passed:
            resolution.issues.length === 0
            && resolution.binding?.abilityName === "rw_skill_provider_demo",
          notes: resolution.binding
            ? [`Resolved authoritative abilityName '${resolution.binding.abilityName}'.`]
            : resolution.issues,
        };
      },
    ),
    runProofPoint(
      "definition_only_provider_shell_exports_grant_only_surface",
      "Definition-only provider shells can publish the same grant_only provider surface without widening runtime authority.",
      [
        "adapters/dota2/cross-feature/grant-seam.ts",
        "adapters/dota2/cross-feature/grant-seam.test.ts",
      ],
      () => {
        const hostRoot = mkdtempSync(join(tmpdir(), "rw-provider-proof-"));
        try {
          const blueprint = createDefinitionOnlyProviderBlueprint("provider_shell_demo");
          const writePlan = createWritePlan([
            createLuaEntry(
              "game/scripts/vscripts/rune_weaver/abilities/rw_provider_shell_demo.lua",
              "rw_provider_shell_demo",
            ),
            createKvEntry(
              "game/scripts/npc/npc_abilities_custom.txt",
              "rw_provider_shell_demo",
            ),
          ]);

          const result = applyDota2GrantSeam({
            hostRoot,
            featureId: "provider_shell_demo",
            prompt: "Create one gameplay ability shell only for later external granting.",
            schema: createDefinitionOnlyProviderSchema(),
            blueprint,
            writePlan,
            clarificationSignals: createClarificationSignals(),
            workspaceFeatures: [],
          });

          const providerExportEntry = writePlan.entries.find((entry) =>
            entry.targetPath.endsWith("dota2-provider-ability-export.json"),
          );
          const providerExportArtifact = providerExportEntry?.parameters as
            | { surfaces?: Array<{ attachmentMode?: string }> }
            | undefined;
          const attachmentMode = providerExportArtifact?.surfaces?.[0]?.attachmentMode;
          const exportPresent = Boolean(
            result.blueprint.featureContract?.exports.some((surface) =>
              surface.id === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
              && surface.contractId === DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
            ),
          );

          return {
            passed: Boolean(providerExportEntry) && attachmentMode === "grant_only" && exportPresent,
            notes: [
              providerExportEntry
                ? "Provider sidecar emitted for definition-only shell."
                : "Provider sidecar missing for definition-only shell.",
              `featureContract export present=${exportPresent}`,
            ],
          };
        } finally {
          rmSync(hostRoot, { recursive: true, force: true });
        }
      },
    ),
    runProofPoint(
      "selection_pool_local_shell_stays_outside_provider_export",
      "Selection-pool local shells do not leak the provider export seam.",
      [
        "adapters/dota2/cross-feature/grant-seam.ts",
        "adapters/dota2/cross-feature/grant-seam.test.ts",
      ],
      () => {
        const hostRoot = mkdtempSync(join(tmpdir(), "rw-selection-proof-"));
        try {
          const blueprint = createSelectionPoolBlueprint("selection_shell_demo");
          const writePlan = createWritePlan([
            createLuaEntry(
              "game/scripts/vscripts/rune_weaver/abilities/rw_selection_shell_demo.lua",
              "rw_selection_shell_demo",
            ),
          ]);

          applyDota2GrantSeam({
            hostRoot,
            featureId: "selection_shell_demo",
            prompt: "Create one local weighted selection shell that stays entirely inside the current feature.",
            schema: createSelectionSchema(),
            blueprint,
            writePlan,
            clarificationSignals: createClarificationSignals(),
            workspaceFeatures: [],
          });

          const leakedProviderExport = writePlan.entries.some((entry) =>
            entry.targetPath.endsWith("dota2-provider-ability-export.json"),
          );
          return {
            passed: leakedProviderExport === false,
            notes: [
              leakedProviderExport
                ? "selection_pool local shell leaked provider export sidecar."
                : "selection_pool local shell stayed outside provider export sidecar emission.",
            ],
          };
        } finally {
          rmSync(hostRoot, { recursive: true, force: true });
        }
      },
    ),
    runProofPoint(
      "identity_drift_blocks_provider_export",
      "Provider export seam refuses promotion-like claims when KV/Lua identity drifts.",
      [
        "adapters/dota2/cross-feature/grant-seam.ts",
        "adapters/dota2/provider-ability-identity.ts",
      ],
      () => {
        const hostRoot = mkdtempSync(join(tmpdir(), "rw-provider-drift-"));
        try {
          const blueprint = createGameplayAbilityBlueprint("skill_provider_demo");
          const writePlan = createWritePlan([
            createLuaEntry(
              "game/scripts/vscripts/rune_weaver/abilities/rw_skill_provider_demo.lua",
              "rw_skill_provider_demo",
            ),
            createKvEntry(
              "game/scripts/npc/npc_abilities_custom.txt",
              "rw_skill_provider_demo",
              {
                kvAbilityName: "placeholder_fire_ability",
                scriptFileName: "placeholder_fire_ability",
              },
            ),
          ]);

          const result = applyDota2GrantSeam({
            hostRoot,
            featureId: "skill_provider_demo",
            prompt: "Create one grantable gameplay ability provider.",
            schema: createGameplayProviderSchema(),
            blueprint,
            writePlan,
            clarificationSignals: createClarificationSignals(),
            workspaceFeatures: [],
          });

          const exportPresent = writePlan.entries.some((entry) =>
            entry.targetPath.endsWith("dota2-provider-ability-export.json"),
          );
          const hasMismatchBlocker = (writePlan.readinessBlockers || []).some((blocker) =>
            blocker.includes("does not match authoritative abilityName"),
          );

          return {
            passed:
              exportPresent === false
              && writePlan.readyForHostWrite === false
              && hasMismatchBlocker
              && (result.blueprint.featureContract?.exports.length || 0) === 0,
            notes: [
              `readyForHostWrite=${writePlan.readyForHostWrite}`,
              `mismatchBlocker=${hasMismatchBlocker}`,
            ],
          };
        } finally {
          rmSync(hostRoot, { recursive: true, force: true });
        }
      },
    ),
    runProofPoint(
      "bridge_preloads_grant_runtime_without_auto_attach",
      "Bridge refresh wires grant-only providers for consumer binding without auto-attaching them to heroes.",
      [
        "adapters/dota2/bridge/index.ts",
        "adapters/dota2/bridge/bridge-wiring.test.ts",
      ],
      () => {
        const hostRoot = createBridgeTempHost();
        try {
          mkdirSync(join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "shared"), { recursive: true });
          mkdirSync(join(hostRoot, "game", "scripts", "src", "rune_weaver", "features", "skill_provider_demo"), { recursive: true });
          mkdirSync(join(hostRoot, "game", "scripts", "src", "rune_weaver", "features", "consumer_draw_demo"), { recursive: true });

          writeFileSync(
            join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "server", "consumer_draw_demo_input_trigger_input_key_binding.ts"),
            "export class ConsumerDrawDemoInputTriggerInputKeyBinding {}\n",
            "utf-8",
          );
          writeFileSync(
            join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "shared", "consumer_draw_demo_weighted_pool_data_weighted_pool.ts"),
            "export class ConsumerDrawDemoWeightedPoolDataWeightedPool {}\n",
            "utf-8",
          );
          writeFileSync(
            join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "server", "consumer_draw_demo_selection_flow_rule_selection_flow.ts"),
            "export class ConsumerDrawDemoSelectionFlowRuleSelectionFlow {}\n",
            "utf-8",
          );

          writeJson(
            hostRoot,
            "game/scripts/src/rune_weaver/features/skill_provider_demo/dota2-provider-ability-export.json",
            {
              adapter: "dota2_provider_ability_export",
              version: 1,
              featureId: "skill_provider_demo",
              surfaces: [
                {
                  surfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
                  abilityName: "rw_skill_provider_demo",
                  attachmentMode: "grant_only",
                },
              ],
            },
          );
          writeJson(
            hostRoot,
            "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-grant-bindings.json",
            {
              adapter: "dota2_selection_grant_binding",
              version: 1,
              featureId: "consumer_draw_demo",
              bindings: [
                {
                  entryId: "R001",
                  targetFeatureId: "skill_provider_demo",
                  targetSurfaceId: "grantable_primary_hero_ability",
                  targetContractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
                  relation: "grants",
                  applyBehavior: "grant_primary_hero_ability",
                },
              ],
            },
          );

          const workspace = {
            version: "0.1.0",
            hostType: "dota2-x-template",
            hostRoot,
            addonName: "bridge_cross_feature_test",
            initializedAt: new Date().toISOString(),
            features: [
              {
                featureId: "skill_provider_demo",
                status: "active",
                generatedFiles: [
                  "game/scripts/src/rune_weaver/features/skill_provider_demo/dota2-provider-ability-export.json",
                ],
              },
              {
                featureId: "consumer_draw_demo",
                status: "active",
                generatedFiles: [
                  "game/scripts/src/rune_weaver/generated/server/consumer_draw_demo_input_trigger_input_key_binding.ts",
                  "game/scripts/src/rune_weaver/generated/shared/consumer_draw_demo_weighted_pool_data_weighted_pool.ts",
                  "game/scripts/src/rune_weaver/generated/server/consumer_draw_demo_selection_flow_rule_selection_flow.ts",
                  "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-grant-bindings.json",
                ],
              },
            ],
          } as RuneWeaverWorkspace;

          const refresh = refreshBridge(hostRoot, workspace);
          const generatedServerIndex = readFileSync(
            join(hostRoot, "game", "scripts", "src", "rune_weaver", "generated", "server", "index.ts"),
            "utf-8",
          );

          return {
            passed:
              refresh.success
              && generatedServerIndex.includes("registerSelectionGrantHandlers")
              && generatedServerIndex.includes("rw_skill_provider_demo")
              && generatedServerIndex.includes("Hero attachment abilities registered: 0"),
            notes: [
              `bridgeSuccess=${refresh.success}`,
              generatedServerIndex.includes("Hero attachment abilities registered: 0")
                ? "Grant-only provider stayed out of hero auto-attachment."
                : "Grant-only provider was auto-attached unexpectedly.",
            ],
          };
        } finally {
          rmSync(hostRoot, { recursive: true, force: true });
        }
      },
    ),
  ];

  const allPassed = proofPoints.every((point) => point.passed);
  return {
    targetId: spec.candidateId,
    summary: spec.summary,
    candidateKind: spec.candidateKind,
    verdict: allPassed ? "ready_for_manual_promotion_review" : "must_remain_exploratory",
    rationale: allPassed
      ? [
          "Repo-side proof shows the seam is bounded to authoritative ability export, explicit consumer grant wiring, and grant_only attachment mode.",
          "The harness proves readiness for manual promotion review only; it does not mutate formal registry truth or auto-admit the seam.",
        ]
      : [
          "Repo-side proof is incomplete or regressed, so the provider export seam must remain exploratory until the bounded guarantees are restored.",
        ],
    manualReviewFocus: [...spec.manualReviewFocus],
    proofPoints,
  };
}

function evaluateRevealOnlyExactGroundedExploratoryOutput(): Dota2PromotionReadinessAssessment {
  const spec = getDota2PromotionReadinessSpec("reveal_only_exact_grounded_exploratory_output");
  const proofPoints = [
    runProofPoint(
      "structured_panorama_intrinsic_subset_has_exact_host_backing",
      "Structured Panorama references provide exact host backing for the currently curated intrinsic/component subset.",
      [
        "references/dota2/dota-data/files/panorama/api.json",
        "core/retrieval/dota2-bundles.ts",
      ],
      () => {
        const refs = lookupDota2HostSymbolsExact(REPO_ROOT, ["Panel", "Label", "TextButton"], {
          targetProfile: "panorama_tsx",
        });
        const exactSymbols = new Set(refs.map((ref) => ref.symbol).filter((symbol): symbol is string => Boolean(symbol)));
        return {
          passed:
            exactSymbols.has("Panel")
            && exactSymbols.has("Label")
            && exactSymbols.has("TextButton"),
          notes: [`exact=${[...exactSymbols].sort().join(",")}`],
        };
      },
    ),
    runProofPoint(
      "reveal_only_ui_grounding_can_be_exact",
      "Reveal-only synthesized UI shells can be exact-grounded without becoming reusable-asset truth.",
      [
        "adapters/dota2/synthesis/index.ts",
        "adapters/dota2/synthesis/index.test.ts",
      ],
      () => {
        const result = buildSynthesizedAssemblyPlan(makeRevealBatchBackboneBlueprint(), "reveal_batch_demo");
        const panoramaGrounding = (result.synthesis.grounding || []).find(
          (item) => item.targetProfile === "panorama_tsx",
        );
        const exactGrounded = Boolean(
          panoramaGrounding
          && panoramaGrounding.allowlistedSymbols.length === 0
          && panoramaGrounding.unknownSymbols.length === 0
          && panoramaGrounding.verifiedSymbols.includes("Panel")
          && panoramaGrounding.verifiedSymbols.includes("Label"),
        );

        return {
          passed: exactGrounded,
          notes: panoramaGrounding
            ? [
                `verified=${panoramaGrounding.verifiedSymbols.join(",")}`,
                `unknown=${panoramaGrounding.unknownSymbols.length}`,
              ]
            : ["panorama_tsx grounding was not produced"],
        };
      },
    ),
    runProofPoint(
      "reveal_only_output_still_synthesizes_as_exploratory",
      "Repo-side synthesis still models reveal-only weighted-card output as exploratory shells.",
      [
        "adapters/dota2/synthesis/index.ts",
        "adapters/dota2/synthesis/index.test.ts",
      ],
      () => {
        const result = buildSynthesizedAssemblyPlan(makeRevealBatchBackboneBlueprint(), "reveal_batch_demo");
        const moduleRecords = result.synthesis.moduleRecords || [];
        const allExploratory = moduleRecords.length > 0 && moduleRecords.every(
          (record) => record.implementationStrategy === "exploratory" && record.maturity === "exploratory",
        );
        const reviewWarningPresent = (result.synthesis.warnings || []).some((warning) =>
          warning.includes("review-required"),
        );

        return {
          passed: allExploratory && reviewWarningPresent,
          notes: [
            `moduleRecords=${moduleRecords.length}`,
            `warningCount=${(result.synthesis.warnings || []).length}`,
          ],
        };
      },
    ),
    runProofPoint(
      "exploratory_shell_pattern_explicitly_refuses_template_claims",
      "The repo already distinguishes exploratory shells from promotable reusable implementations.",
      [
        "adapters/dota2/patterns/index.ts",
      ],
      () => {
        const pattern = getPatternMeta("dota2.exploratory_ability");
        const keepsExploratoryBoundary = Boolean(
          pattern
          && pattern.traits?.includes("exploratory_runtime_shell")
          && pattern.invariants?.includes("exploratory ability artifacts must stay inside the current feature owned scope"),
        );

        return {
          passed: keepsExploratoryBoundary,
          notes: pattern ? [pattern.id] : ["dota2.exploratory_ability pattern metadata missing"],
        };
      },
    ),
    runProofPoint(
      "reveal_only_remains_outside_formal_selection_pool_boundary",
      "Formal Dota2 reusable-asset governance still excludes reveal-only weighted-card asks from admitted family scope.",
      [
        "adapters/dota2/governance/reusable-assets.ts",
      ],
      () => {
        const selectionPoolPacket = getDota2ReusableAssetPromotionPackets().find(
          (packet) => packet.assetId === "selection_pool" && packet.kind === "pattern_to_family",
        );
        const explicitlyExcluded = (selectionPoolPacket?.reviewRequiredRisks || []).some((risk) =>
          risk.includes("Reveal-only weighted-card asks are still outside the admitted family boundary."),
        );

        return {
          passed: explicitlyExcluded,
          notes: selectionPoolPacket?.reviewRequiredRisks || ["selection_pool promotion packet missing"],
        };
      },
    ),
  ];

  return {
    targetId: spec.candidateId,
    summary: spec.summary,
    candidateKind: spec.candidateKind,
    verdict: "must_remain_exploratory",
    rationale: [
      "Exact grounding on reveal-only synthesized output is not a promotion proof when repo-side synthesis still marks the implementation exploratory.",
      "The admitted selection_pool family explicitly keeps reveal-only weighted-card asks outside its formal boundary.",
    ],
    manualReviewFocus: [...spec.manualReviewFocus],
    proofPoints,
  };
}

export function evaluateDota2PromotionReadiness(
  targetId: Dota2PromotionReadinessTargetId,
): Dota2PromotionReadinessAssessment {
  switch (targetId) {
    case "grant_only_provider_export_seam":
      return evaluateGrantOnlyProviderExportSeam();
    case "reveal_only_exact_grounded_exploratory_output":
      return evaluateRevealOnlyExactGroundedExploratoryOutput();
  }
}

export function evaluateAllDota2PromotionReadiness(): Dota2PromotionReadinessAssessment[] {
  return getDota2PromotionReadinessSpecs().map((spec) =>
    evaluateDota2PromotionReadiness(spec.candidateId),
  );
}

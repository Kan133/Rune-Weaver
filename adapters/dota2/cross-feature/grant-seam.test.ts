import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type {
  Blueprint,
  ExecutionAuthorityDecision,
  IntentSchema,
  SelectionPoolFeatureAuthoringParameters,
  UpdateIntent,
  WizardClarificationSignals,
  WizardUnresolvedDependency,
} from "../../../core/schema/types.js";
import type { WritePlan, WritePlanEntry } from "../assembler/index.js";
import {
  applyDota2GrantSeam,
  DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
  GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
} from "./index.js";
import {
  resolveSelectionPoolFamily,
} from "../families/selection-pool/index.js";
import { resolveSelectionPoolCompiledObjects } from "../families/selection-pool/source-model.js";
import {
  TALENT_DRAW_DEMO_CREATE_PROMPT,
} from "../cases/selection-demo-registry.js";
import { classifyUpdateDiff } from "../update/index.js";

function createWritePlan(entries: WritePlanEntry[] = []): WritePlan {
  return {
    id: "writeplan_test",
    targetProject: "D:\\test-host",
    generatedAt: new Date().toISOString(),
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
    },
    modules: [
      {
        id: "provider_shell_definition",
        role: "resource_pool",
        category: "resource",
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

function createSelectionPoolBlueprint(featureId: string, hostRoot: string): Blueprint {
  const resolution = resolveSelectionPoolFamily({
    prompt: TALENT_DRAW_DEMO_CREATE_PROMPT,
    hostRoot,
    mode: "create",
    featureId,
    proposalSource: "fallback",
  });
  assert.ok(resolution.proposal, "selection_pool proposal should exist");

  return {
    id: `bp_${featureId}`,
    version: "1.0",
    summary: "Local selection shell",
    sourceIntent: {
      goal: TALENT_DRAW_DEMO_CREATE_PROMPT,
      intentKind: "standalone-system",
    },
    modules: [
      {
        id: "selection_input",
        role: "input_trigger",
        category: "trigger",
        responsibilities: ["Open the local selection shell."],
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
      mode: "source-backed",
      profile: "selection_pool",
      objectKind: resolution.proposal.objectKind,
      parameters: resolution.proposal.parameters,
      parameterSurface: resolution.proposal.parameterSurface,
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

function createStaleSelectionPoolPatternEntries(featureId: string): WritePlanEntry[] {
  return [
    {
      operation: "create",
      targetPath: `game/scripts/src/rune_weaver/generated/server/${featureId}_input_trigger_input_key_binding.ts`,
      contentType: "typescript",
      contentSummary: "input.key_binding (typescript) params: {\"triggerKey\":\"F8\"}",
      sourcePattern: "input.key_binding",
      sourceModule: "input_trigger",
      safe: true,
      parameters: {
        triggerKey: "F8",
        key: "F8",
        eventName: "stale_event",
      },
    },
    {
      operation: "create",
      targetPath: `content/panorama/src/rune_weaver/generated/ui/${featureId}_input_trigger_input_key_binding_emitter.tsx`,
      contentType: "tsx",
      contentSummary: "input.key_binding (tsx) params: {\"triggerKey\":\"F8\"}",
      sourcePattern: "input.key_binding",
      sourceModule: "input_trigger",
      safe: true,
      parameters: {
        triggerKey: "F8",
        key: "F8",
        eventName: "stale_event",
      },
      metadata: {
        inputEmitter: true,
      },
    },
    {
      operation: "create",
      targetPath: `game/scripts/src/rune_weaver/generated/shared/${featureId}_weighted_pool_data_weighted_pool.ts`,
      contentType: "typescript",
      contentSummary: "data.weighted_pool (typescript) params: {\"entries\":[{\"id\":\"STALE\"}]}",
      sourcePattern: "data.weighted_pool",
      sourceModule: "weighted_pool",
      safe: true,
      parameters: {
        entries: [{ id: "STALE", label: "STALE", description: "STALE", weight: 1, tier: "R" }],
        choiceCount: 1,
        drawMode: "single",
        duplicatePolicy: "allow",
        poolStateTracking: "none",
      },
    },
    {
      operation: "create",
      targetPath: `game/scripts/src/rune_weaver/generated/server/${featureId}_selection_flow_rule_selection_flow.ts`,
      contentType: "typescript",
      contentSummary: "rule.selection_flow (typescript) params: {\"choiceCount\":99}",
      sourcePattern: "rule.selection_flow",
      sourceModule: "selection_flow",
      safe: true,
      parameters: {
        choiceCount: 99,
        selectionPolicy: "single",
        applyMode: "deferred",
        postSelectionPoolBehavior: "none",
        trackSelectedItems: false,
      },
    },
    {
      operation: "create",
      targetPath: `content/panorama/src/rune_weaver/generated/ui/${featureId}_selection_modal_ui_selection_modal.tsx`,
      contentType: "tsx",
      contentSummary: "ui.selection_modal (tsx) params: {\"title\":\"STALE\"}",
      sourcePattern: "ui.selection_modal",
      sourceModule: "selection_modal",
      safe: true,
      parameters: {
        choiceCount: 1,
        title: "STALE",
        description: "STALE",
        inventoryTitle: "STALE",
      },
    },
  ];
}

function getSelectionPoolFeatureAuthoringParameters(
  blueprint: Blueprint,
): SelectionPoolFeatureAuthoringParameters {
  return (blueprint.featureAuthoring as any).parameters as SelectionPoolFeatureAuthoringParameters;
}

function getSelectionPoolCompiledObjects(blueprint: Blueprint) {
  return resolveSelectionPoolCompiledObjects(
    getSelectionPoolFeatureAuthoringParameters(blueprint),
    undefined,
    { allowDeferredFeatureExportResolution: true },
  ).objects;
}

function createCrossFeatureSelectionSchema(prompt: string): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: { rawPrompt: prompt, goal: prompt },
    classification: { intentKind: "cross-system-composition", confidence: "high" },
    requirements: { functional: [prompt] },
    constraints: {},
    outcomes: { operations: ["grant-feature"] },
    composition: {
      dependencies: [
        { kind: "cross-feature", relation: "grants", required: true },
      ],
    },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      choiceCount: 3,
      cardinality: "single",
    },
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

function createDriftedSelectionRewardSchema(prompt: string): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: { rawPrompt: prompt, goal: prompt },
    classification: { intentKind: "micro-feature", confidence: "medium" },
    requirements: { functional: [prompt] },
    constraints: {},
    outcomes: { operations: ["apply-effect", "update-state"] },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
  } as IntentSchema;
}

function createEquipmentExternalCatalogSchema(prompt: string): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: { rawPrompt: prompt, goal: prompt },
    classification: { intentKind: "cross-system-composition", confidence: "high" },
    requirements: { functional: [prompt] },
    constraints: {},
    outcomes: { operations: ["apply-effect", "grant-feature"] },
    composition: {
      dependencies: [
        { kind: "external-system", relation: "reads", required: true },
      ],
    },
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      choiceCount: 5,
      cardinality: "single",
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
  } as IntentSchema;
}

function createSelectionGrantUpdateIntent(featureId: string, requestedChange: IntentSchema): UpdateIntent {
  return {
    version: "1.0",
    mode: "update",
    target: {
      featureId,
      revision: 1,
      profile: "selection_pool",
      sourceBacked: true,
    },
    currentFeatureContext: {
      featureId,
      revision: 1,
      intentKind: "standalone-system",
      selectedPatterns: [
        "rule.selection_flow",
        "data.weighted_pool",
        "input.key_binding",
        "effect.outcome_realizer",
        "ui.selection_modal",
      ],
      sourceBacked: true,
      sourceBackedInvariantRoles: [
        "input_trigger",
        "weighted_pool",
        "selection_flow",
        "selection_outcome",
        "selection_modal",
      ],
      preservedInvariants: [
        "single trigger entry only",
        "weighted pool candidate source",
        "confirm exactly one candidate",
      ],
      boundedFields: {},
      moduleRecords: [],
    } as any,
    requestedChange,
    delta: {
      preserve: [],
      add: [
        {
          path: "contentModel.collections.reward_objects",
          kind: "content",
          summary: "Append one new reward object entry in the current candidate collection.",
        },
        {
          path: "sourceModel.artifact.poolEntries[]",
          kind: "content",
          summary: "Append one new reward object bound to an existing provider feature.",
        },
        {
          path: "selection_outcome.realization.provider_grant",
          kind: "effect",
          summary: "Selecting the appended reward grants the provider ability to the current controlled hero.",
        },
        {
          path: "composition.dependencies[]",
          kind: "composition",
          summary: "Add explicit cross-feature grant dependency on the resolved provider feature.",
        },
        {
          path: "integrations.expectedBindings[]",
          kind: "integration",
          summary: "Add provider binding for selection commit.",
        },
      ],
      modify: [],
      remove: [],
    },
    resolvedAssumptions: [],
  };
}

function createLocalSelectionUpdateSchema(prompt: string): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: { rawPrompt: prompt, goal: prompt },
    classification: { intentKind: "standalone-system", confidence: "high" },
    requirements: { functional: [prompt] },
    constraints: {},
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "user-chosen",
      choiceCount: 5,
      cardinality: "single",
    },
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

function createLocalSelectionUpdateIntent(featureId: string, requestedChange: IntentSchema): UpdateIntent {
  return {
    version: "1.0",
    mode: "update",
    target: {
      featureId,
      revision: 1,
      profile: "selection_pool",
      sourceBacked: true,
    },
    currentFeatureContext: {
      featureId,
      revision: 1,
      intentKind: "standalone-system",
      selectedPatterns: [
        "rule.selection_flow",
        "data.weighted_pool",
        "input.key_binding",
        "effect.outcome_realizer",
        "ui.selection_modal",
      ],
      sourceBacked: true,
      sourceBackedInvariantRoles: [
        "input_trigger",
        "weighted_pool",
        "selection_flow",
        "selection_outcome",
        "selection_modal",
      ],
      preservedInvariants: [
        "single trigger entry only",
        "weighted pool candidate source",
        "confirm exactly one candidate",
      ],
      boundedFields: {},
      moduleRecords: [],
    } as any,
    requestedChange,
    delta: {
      preserve: [],
      add: [],
      modify: [
        {
          path: "sourceModel.artifact.choiceCount",
          kind: "content",
          summary: "Increase the displayed candidate option count from 3 to 5.",
        },
      ],
      remove: [],
    },
    resolvedAssumptions: [],
  };
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

function writeJson(hostRoot: string, relativePath: string, value: unknown): void {
  const fullPath = join(hostRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(value, null, 2), "utf-8");
}

function testGameplayAbilityProviderExportsGrantSurfaceWithoutSelectionPoolLeak() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const providerBlueprint = createGameplayAbilityBlueprint("skill_provider_demo");
    const providerWritePlan = createWritePlan([
      createLuaEntry("game/scripts/vscripts/rune_weaver/abilities/rw_skill_provider_demo.lua", "rw_skill_provider_demo"),
      createKvEntry("game/scripts/npc/npc_abilities_custom.txt", "rw_skill_provider_demo"),
    ]);

    const providerResult = applyDota2GrantSeam({
      hostRoot,
      featureId: "skill_provider_demo",
      prompt: "Create one grantable gameplay ability provider.",
      schema: {
        version: "1.0",
        host: { kind: "dota2-x-template" },
        request: { rawPrompt: "Create one grantable gameplay ability provider.", goal: "Create one grantable gameplay ability provider." },
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["Provide one gameplay ability."] },
        constraints: {},
        normalizedMechanics: { outcomeApplication: true },
        resolvedAssumptions: [],
      } as IntentSchema,
      blueprint: providerBlueprint,
      writePlan: providerWritePlan,
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [],
    });

    const providerExportEntry = providerWritePlan.entries.find((entry) =>
      entry.targetPath.endsWith("dota2-provider-ability-export.json"),
    );
    assert.ok(providerExportEntry, "gameplay ability provider should export a provider sidecar");
    assert.equal(
      (providerExportEntry?.parameters as Record<string, unknown>).adapter,
      "dota2_provider_ability_export",
    );
    assert.equal(
      ((providerExportEntry?.parameters as any).surfaces?.[0]?.attachmentMode),
      "grant_only",
    );
    assert.equal(
      providerResult.blueprint.featureContract?.exports.some(
        (surface) =>
          surface.id === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
          && surface.contractId === DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
      ),
      true,
    );

    const selectionBlueprint = createSelectionPoolBlueprint("selection_shell_demo", hostRoot);
    const selectionWritePlan = createWritePlan([
      createLuaEntry("game/scripts/vscripts/rune_weaver/abilities/rw_selection_shell_demo.lua", "rw_selection_shell_demo"),
    ]);
    applyDota2GrantSeam({
      hostRoot,
      featureId: "selection_shell_demo",
      prompt: TALENT_DRAW_DEMO_CREATE_PROMPT,
      schema: {
        version: "1.0",
        host: { kind: "dota2-x-template" },
        request: { rawPrompt: TALENT_DRAW_DEMO_CREATE_PROMPT, goal: TALENT_DRAW_DEMO_CREATE_PROMPT },
        classification: { intentKind: "standalone-system", confidence: "high" },
        requirements: { functional: [TALENT_DRAW_DEMO_CREATE_PROMPT] },
        constraints: {},
        normalizedMechanics: {
          trigger: true,
          candidatePool: true,
          weightedSelection: true,
          playerChoice: true,
          uiModal: true,
        },
        resolvedAssumptions: [],
      } as IntentSchema,
      blueprint: selectionBlueprint,
      writePlan: selectionWritePlan,
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [],
    });

    assert.equal(
      selectionWritePlan.entries.some((entry) => entry.targetPath.endsWith("dota2-provider-ability-export.json")),
      false,
      "selection_pool local shell must not export the grantable provider sidecar",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testDefinitionOnlyProviderSchemaStillExportsGrantSurfaceWithoutBackboneRole() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const providerBlueprint = createDefinitionOnlyProviderBlueprint("provider_shell_demo");
    const providerWritePlan = createWritePlan([
      createLuaEntry("game/scripts/vscripts/rune_weaver/abilities/rw_provider_shell_demo.lua", "rw_provider_shell_demo"),
      createKvEntry("game/scripts/npc/npc_abilities_custom.txt", "rw_provider_shell_demo"),
    ]);

    applyDota2GrantSeam({
      hostRoot,
      featureId: "provider_shell_demo",
      prompt: "Create one gameplay ability shell only for later external granting.",
      schema: {
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
              id: "ability_shell_definition",
              kind: "resource",
              summary: "Define one gameplay ability shell for later external granting.",
              outputs: ["ability shell definition"],
            },
          ],
        },
        constraints: {},
        stateModel: {
          states: [
            {
              id: "provider_shell_state",
              summary: "Definition-only provider shell state.",
              owner: "feature",
              lifetime: "session",
              mutationMode: "create",
            },
          ],
        },
        parameters: {
          shellOnly: true,
          playerInput: false,
          autoAttach: false,
          grantLogicIncluded: false,
          modifierApplicationIncluded: false,
          externalGrantLater: true,
        },
        resolvedAssumptions: [],
      } as IntentSchema,
      blueprint: providerBlueprint,
      writePlan: providerWritePlan,
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [],
    });

    assert.equal(
      providerWritePlan.entries.some((entry) => entry.targetPath.endsWith("dota2-provider-ability-export.json")),
      true,
      "definition-only provider schemas should export the provider sidecar even before a gameplay backbone is present",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testGameplayAbilityBackboneDoesNotExportGrantSurfaceWhenCrossFeatureGrantsAreForbidden() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const blueprint = createGameplayAbilityBlueprint("reveal_batch_demo");
    const writePlan = createWritePlan([
      createLuaEntry("game/scripts/vscripts/rune_weaver/abilities/rw_reveal_batch_demo.lua", "rw_reveal_batch_demo"),
      createKvEntry("game/scripts/npc/npc_abilities_custom.txt", "rw_reveal_batch_demo"),
    ]);

    applyDota2GrantSeam({
      hostRoot,
      featureId: "reveal_batch_demo",
      prompt: "Create a reveal-only weighted card system with no cross-feature grants.",
      schema: {
        version: "1.0",
        host: { kind: "dota2-x-template" },
        request: {
          rawPrompt: "Create a reveal-only weighted card system with no cross-feature grants.",
          goal: "Create a reveal-only weighted card system with no cross-feature grants.",
        },
        classification: { intentKind: "standalone-system", confidence: "high" },
        requirements: {
          functional: [
            "Reveal weighted cards locally.",
            "Resolve all revealed results immediately.",
            "No cross-feature grants.",
          ],
        },
        constraints: {},
        normalizedMechanics: {
          trigger: true,
          candidatePool: true,
          weightedSelection: true,
          outcomeApplication: true,
        },
        resolvedAssumptions: [],
      } as IntentSchema,
      blueprint,
      writePlan,
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [],
    });

    assert.equal(
      writePlan.entries.some((entry) => entry.targetPath.endsWith("dota2-provider-ability-export.json")),
      false,
      "explicit no-cross-feature-grants prompts must not emit provider export sidecars",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testProviderExportRequiresClosedLuaAndKvIdentity() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const providerBlueprint = createGameplayAbilityBlueprint("skill_provider_demo");
    const providerWritePlan = createWritePlan([
      createLuaEntry("game/scripts/vscripts/rune_weaver/abilities/rw_skill_provider_demo.lua", "rw_skill_provider_demo"),
    ]);

    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "skill_provider_demo",
      prompt: "Create one grantable gameplay ability provider.",
      schema: {
        version: "1.0",
        host: { kind: "dota2-x-template" },
        request: { rawPrompt: "Create one grantable gameplay ability provider.", goal: "Create one grantable gameplay ability provider." },
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["Provide one gameplay ability."] },
        constraints: {},
        normalizedMechanics: { outcomeApplication: true },
        resolvedAssumptions: [],
      } as IntentSchema,
      blueprint: providerBlueprint,
      writePlan: providerWritePlan,
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [],
    });

    assert.equal(
      providerWritePlan.entries.some((entry) => entry.targetPath.endsWith("dota2-provider-ability-export.json")),
      false,
      "provider export must not be written when the KV side is missing",
    );
    assert.equal(providerWritePlan.readyForHostWrite, false);
    assert.equal(result.blueprint.featureContract?.exports.length || 0, 0);
    assert.ok(
      providerWritePlan.readinessBlockers.some((blocker) => blocker.includes("Expected exactly one provider KV ability entry")),
      "write blockers should explain the missing KV authority",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testProviderExportRejectsDriftedLuaKvIdentity() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const providerBlueprint = createGameplayAbilityBlueprint("skill_provider_demo");
    const providerWritePlan = createWritePlan([
      createLuaEntry("game/scripts/vscripts/rune_weaver/abilities/rw_skill_provider_demo.lua", "rw_skill_provider_demo"),
      createKvEntry("game/scripts/npc/npc_abilities_custom.txt", "rw_skill_provider_demo", {
        kvAbilityName: "placeholder_fire_ability",
        scriptFileName: "placeholder_fire_ability",
      }),
    ]);

    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "skill_provider_demo",
      prompt: "Create one grantable gameplay ability provider.",
      schema: {
        version: "1.0",
        host: { kind: "dota2-x-template" },
        request: { rawPrompt: "Create one grantable gameplay ability provider.", goal: "Create one grantable gameplay ability provider." },
        classification: { intentKind: "micro-feature", confidence: "high" },
        requirements: { functional: ["Provide one gameplay ability."] },
        constraints: {},
        normalizedMechanics: { outcomeApplication: true },
        resolvedAssumptions: [],
      } as IntentSchema,
      blueprint: providerBlueprint,
      writePlan: providerWritePlan,
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [],
    });

    assert.equal(
      providerWritePlan.entries.some((entry) => entry.targetPath.endsWith("dota2-provider-ability-export.json")),
      false,
      "provider export must not be written when KV/Lua identity drifts",
    );
    assert.equal(providerWritePlan.readyForHostWrite, false);
    assert.equal(result.blueprint.featureContract?.exports.length || 0, 0);
    assert.ok(
      providerWritePlan.readinessBlockers.some((blocker) => blocker.includes("does not match authoritative abilityName")),
      "write blockers should capture the identity mismatch",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testUnresolvedCrossFeatureBindingBlocksWriteButKeepsLocalShell() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const blueprint = createSelectionPoolBlueprint("consumer_draw_demo", hostRoot);
    const writePlan = createWritePlan([]);
    const unresolvedDependencies: WizardUnresolvedDependency[] = [
      {
        id: "cross-feature-target",
        kind: "cross-feature-target",
        summary: "Cross-feature semantics are present, but the target feature boundary is not explicit.",
        questionIds: ["clarify-cross-feature-target"],
      },
    ];
    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "consumer_draw_demo",
      prompt: "Add one skill feature as a reward in the current draw feature.",
      schema: createCrossFeatureSelectionSchema("Add one skill feature as a reward in the current draw feature."),
      blueprint,
      writePlan,
      clarificationSignals: createClarificationSignals({
        semanticPosture: "open",
        unresolvedDependencies,
        reasons: ["Cross-feature semantics are present, but the target feature boundary is not explicit."],
      }),
      executionAuthority: createExecutionAuthorityDecision({
        blocksWrite: true,
        requiresReview: true,
        unresolvedDependencies,
      }),
      workspaceFeatures: [],
    });

    assert.equal(writePlan.readyForHostWrite, false);
    assert.ok(
      (writePlan.readinessBlockers || []).some((blocker) => blocker.includes("Cross-feature")),
      "unresolved target should become a write blocker",
    );
    assert.equal(result.blueprint.status, "weak");
    assert.equal(result.blueprint.featureAuthoring?.profile, "selection_pool");
    assert.equal(
      writePlan.entries.some((entry) => entry.targetPath.endsWith("selection-grant-contract.json")),
      true,
      "selection grant contract should still be published from local authoring even when the target is unresolved",
    );
    assert.equal(
      writePlan.entries.some((entry) => entry.targetPath.endsWith("selection-grant-bindings.json")),
      false,
      "binding sidecar must not be written while the provider target is unresolved",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testObservationalSignalsDoNotTriggerGrantSeamForLocalSelectionOnlyFlow() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const blueprint = createSelectionPoolBlueprint("consumer_draw_demo", hostRoot);
    const writePlan = createWritePlan([]);

    applyDota2GrantSeam({
      hostRoot,
      featureId: "consumer_draw_demo",
      prompt: "Increase the displayed candidate option count from 3 to 5.",
      schema: createLocalSelectionUpdateSchema("Increase the displayed candidate option count from 3 to 5."),
      blueprint,
      writePlan,
      clarificationSignals: createClarificationSignals({
        semanticPosture: "open",
        reasons: ["The trigger wording is still structurally noisy."],
        openStructuralContracts: [
          {
            id: "clarify-trigger-authority",
            kind: "activation-boundary",
            surface: "activation",
            summary: "The trigger wording is still structurally noisy.",
            targetPaths: ["interaction.activations"],
            questionIds: ["clarify-trigger-authority"],
          },
        ],
      }),
      executionAuthority: createExecutionAuthorityDecision({
        blocksBlueprint: true,
        blocksWrite: true,
        requiresReview: true,
        reasons: ["The trigger wording is still structurally noisy."],
        remainingStructuralContracts: [
          {
            id: "clarify-trigger-authority",
            kind: "activation-boundary",
            surface: "activation",
            summary: "The trigger wording is still structurally noisy.",
            targetPaths: ["interaction.activations"],
            questionIds: ["clarify-trigger-authority"],
          },
        ],
      }),
      workspaceFeatures: [],
    });

    assert.equal(writePlan.readyForHostWrite, true);
    assert.deepEqual(writePlan.readinessBlockers || [], []);
    assert.equal(
      writePlan.entries.some((entry) => entry.targetPath.endsWith("selection-grant-contract.json")),
      false,
      "observational clarification signals alone must not activate the grant seam",
    );
    assert.equal(
      writePlan.entries.some((entry) => entry.targetPath.endsWith("selection-grant-bindings.json")),
      false,
      "observational clarification signals alone must not emit binding sidecars",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testResolvedProviderBindingWritesBindingSidecarWithoutMutatingLocalSelectionAuthoring() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
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
    const blueprint = createSelectionPoolBlueprint("consumer_draw_demo", hostRoot);
    const originalCompiledObjects = getSelectionPoolCompiledObjects(blueprint);
    const originalObjectCount = originalCompiledObjects.length;
    const replacementObjectId = originalCompiledObjects[0].id;
    const replacementObjectLabel = originalCompiledObjects[0].label;
    writeJson(
      hostRoot,
      "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-grant-bindings.json",
      {
        adapter: "dota2_selection_grant_binding",
        version: 1,
        featureId: "consumer_draw_demo",
        bindings: [
          {
            objectId: originalCompiledObjects[1].id,
            targetFeatureId: "existing_provider_demo",
            targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
            relation: "grants",
            applyBehavior: "grant_primary_hero_ability",
          },
        ],
      },
    );
    const writePlan = createWritePlan(createStaleSelectionPoolPatternEntries("consumer_draw_demo"));
    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "consumer_draw_demo",
      prompt: `Replace ${replacementObjectLabel} with skill_provider_demo as one reward.`,
      schema: createCrossFeatureSelectionSchema(`Replace ${replacementObjectId} with skill_provider_demo as one reward.`),
      blueprint,
      writePlan,
      relationCandidates: [
        {
          relation: "grants",
          targetFeatureId: "skill_provider_demo",
          matchedAlias: "skill provider demo",
          confidence: "high",
          score: 0.95,
          reason: "Prompt references the provider feature directly.",
        },
      ],
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [
        {
          featureId: "skill_provider_demo",
        } as any,
      ],
    });

    assert.equal(writePlan.readyForHostWrite, true);
    const sourceEntry = writePlan.entries.find((entry) => entry.sourcePattern === "rw.feature_source_model");
    const contractEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-contract.json"),
    );
    const bindingEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-bindings.json"),
    );
    const weightedPoolEntry = writePlan.entries.find((entry) => entry.sourcePattern === "data.weighted_pool");
    assert.equal(sourceEntry, undefined, "cross-feature seam should not rewrite selection_pool source authoring");
    assert.ok(contractEntry, "resolved provider binding should publish the explicit local grant contract");
    assert.ok(bindingEntry, "resolved provider binding should write the sidecar binding artifact");
    assert.ok(weightedPoolEntry, "stale weighted pool entry remains untouched because authoring did not change");
    assert.equal(((bindingEntry?.parameters as any).bindings || []).length >= 1, true);
    assert.equal(((contractEntry?.parameters as any).slots || []).length, originalObjectCount);
    assert.equal(((weightedPoolEntry?.parameters as any).entries || []).length, 1);
    assert.equal(
      getSelectionPoolCompiledObjects(result.blueprint).length,
      originalObjectCount,
    );
    assert.equal(((bindingEntry?.parameters as any).bindings || []).length > 0, true);
    assert.equal(result.blueprint.status === "blocked", false);
    assert.equal(writePlan.stats.total, writePlan.entries.length);
    assert.equal(writePlan.executionOrder.length, writePlan.entries.length);
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testBindingWithoutExplicitLocalObjectBecomesRealBlocker() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
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

    const blueprint = createSelectionPoolBlueprint("consumer_draw_demo", hostRoot);
    const writePlan = createWritePlan([]);
    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "consumer_draw_demo",
      prompt: "Add this skill provider as one reward in the current draw feature.",
      schema: createCrossFeatureSelectionSchema("Add this skill provider as one reward in the current draw feature."),
      blueprint,
      writePlan,
      relationCandidates: [
        {
          relation: "grants",
          targetFeatureId: "skill_provider_demo",
          matchedAlias: "skill_provider_demo",
          confidence: "high",
          score: 0.95,
          reason: "Prompt references the provider feature directly.",
        },
      ],
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [
        {
          featureId: "skill_provider_demo",
        } as any,
      ],
    });

    const contractEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-contract.json"),
    );
    const bindingEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-bindings.json"),
    );
    assert.equal(writePlan.readyForHostWrite, false);
    assert.ok(contractEntry);
    assert.equal(bindingEntry, undefined);
    assert.equal(result.blueprint.featureAuthoring?.profile, "selection_pool");
    assert.ok(
      (writePlan.readinessBlockers || []).some((blocker) => blocker.includes("cannot mutate selection_pool local authoring")),
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testExternalCatalogEquipmentDoesNotTriggerGrantSeamWriteBlocker() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const prompt =
      "创建一个装备抽取功能，按下G键弹出五选一的界面，选择一个后获得装备。装备来源于dota2原生装备。分R/SR/SSR/UR四个等级，等级影响抽取权重和界面的外观";
    const blueprint = createSelectionPoolBlueprint("equipment_draw_demo", hostRoot);
    const equipmentBlueprint: Blueprint = {
      ...blueprint,
      summary: "External-catalog native item selection shell",
      sourceIntent: {
        ...blueprint.sourceIntent,
        intentKind: "cross-system-composition",
        goal: prompt,
      },
      featureAuthoring: {
        ...(blueprint.featureAuthoring as any),
        objectKind: "equipment",
      },
    };
    const writePlan = createWritePlan([]);

    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "equipment_draw_demo",
      prompt,
      schema: createEquipmentExternalCatalogSchema(prompt),
      blueprint: equipmentBlueprint,
      writePlan,
      relationCandidates: [],
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [],
    });

    const contractEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-contract.json"),
    );
    const bindingEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-bindings.json"),
    );
    assert.equal(writePlan.readyForHostWrite, true);
    assert.deepEqual(writePlan.readinessBlockers || [], []);
    assert.equal(contractEntry, undefined);
    assert.equal(bindingEntry, undefined);
    assert.equal(result.writeBlockers.length, 0);
    assert.equal(result.blueprint.status === "blocked", false);
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testDriftedSelectionUpdateStopsAtContractInsteadOfAppendingLocalObject() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
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

      const prompt = "Append one reward object that binds to skill_provider_demo and grants its primary hero ability on selection.";
    const driftedSchema = createDriftedSelectionRewardSchema(prompt);
    const updateIntent = createSelectionGrantUpdateIntent("consumer_draw_demo", driftedSchema);
    const blueprint = createSelectionPoolBlueprint("consumer_draw_demo", hostRoot);
    const writePlan = createWritePlan([]);

      applyDota2GrantSeam({
        hostRoot,
        featureId: "consumer_draw_demo",
      prompt,
      schema: driftedSchema,
      updateIntent,
      blueprint,
      writePlan,
      relationCandidates: [
        {
          relation: "reads",
          targetFeatureId: "skill_provider_demo",
          matchedAlias: "skill_provider_demo",
          confidence: "high",
          score: 0.92,
          reason: "Prompt references the resolved provider feature directly.",
        },
      ],
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [
        {
          featureId: "skill_provider_demo",
        } as any,
      ],
    });

    const bindingEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-bindings.json"),
    );
      const contractEntry = writePlan.entries.find((entry) =>
        entry.targetPath.endsWith("selection-grant-contract.json"),
      );
      assert.ok(contractEntry, "selection grant contract should still be emitted from current local authoring");
      assert.equal(bindingEntry, undefined);
      assert.equal(writePlan.readyForHostWrite, false);
      assert.ok(
        (writePlan.readinessBlockers || []).some((blocker) => blocker.includes("cannot mutate selection_pool local authoring")),
      );
    } finally {
      rmSync(hostRoot, { recursive: true, force: true });
    }
}

function testPromptResolvedGrantBindingSurvivesGovernanceDriftWithoutExplicitCrossFeatureDelta() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
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

    const blueprint = createSelectionPoolBlueprint("consumer_draw_demo", hostRoot);
    const compiledObjects = getSelectionPoolCompiledObjects(blueprint);
    const replacementObject = compiledObjects[0];
    const prompt = `Replace ${replacementObject.label} with the feature skill_provider_demo as one reward that grants its primary hero ability on selection. Keep the current F4 three-choice selection flow and all other behavior unchanged.`;
    const driftedSchema = createDriftedSelectionRewardSchema(prompt);
    const writePlan = createWritePlan(createStaleSelectionPoolPatternEntries("consumer_draw_demo"));
    const updateIntent = {
      version: "1.0",
      mode: "update",
      target: {
        featureId: "consumer_draw_demo",
        revision: 1,
        profile: "selection_pool",
        sourceBacked: true,
      },
      currentFeatureContext: {
        featureId: "consumer_draw_demo",
        revision: 1,
        intentKind: "standalone-system",
        selectedPatterns: [
          "rule.selection_flow",
          "data.weighted_pool",
          "input.key_binding",
          "effect.outcome_realizer",
          "ui.selection_modal",
        ],
        sourceBacked: true,
        sourceBackedInvariantRoles: [
          "input_trigger",
          "weighted_pool",
          "selection_flow",
          "selection_outcome",
          "selection_modal",
        ],
        preservedInvariants: [
          "single trigger entry only",
          "weighted pool candidate source",
          "confirm exactly one candidate",
          "no cross-feature grants",
        ],
        boundedFields: {},
        moduleRecords: [],
      },
      requestedChange: driftedSchema,
      governedChange: driftedSchema,
      semanticAnalysis: {
        governanceDecisions: {
          mutationAuthority: {
            value: {
              add: [
                {
                  path: "selection.inventory",
                  kind: "ui",
                  summary: "Add the current feature inventory contract.",
                },
              ],
              modify: [],
              remove: [],
              blocked: [],
            },
          },
          scope: {
            value: "bounded_update",
          },
        },
      },
      delta: {
        preserve: [],
        add: [
          {
            path: "selection.inventory",
            kind: "ui",
            summary: "Add the current feature inventory contract.",
          },
        ],
        modify: [],
        remove: [],
      },
      resolvedAssumptions: [],
    } as any as UpdateIntent;

    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "consumer_draw_demo",
      prompt,
      schema: driftedSchema,
      updateIntent,
      blueprint,
      writePlan,
      relationCandidates: [
        {
          relation: "grants",
          targetFeatureId: "skill_provider_demo",
          matchedAlias: "skill_provider_demo",
          confidence: "high",
          score: 0.95,
          reason: "Prompt references the resolved provider feature directly.",
        },
      ],
      clarificationSignals: createClarificationSignals(),
      workspaceFeatures: [
        {
          featureId: "skill_provider_demo",
        } as any,
      ],
    });

    const contractEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-contract.json"),
    );
    const bindingEntry = writePlan.entries.find((entry) =>
      entry.targetPath.endsWith("selection-grant-bindings.json"),
    );
    assert.ok(contractEntry, "prompt-resolved grant updates should still publish the explicit local grant contract");
    assert.ok(bindingEntry, "prompt-resolved grant updates should write the selection grant binding sidecar");
    assert.equal(writePlan.readyForHostWrite, true);
    assert.equal(((bindingEntry?.parameters as any).bindings || [])[0]?.entryId, replacementObject.id);
    assert.equal(
      result.blueprint.dependencyEdges?.some(
        (edge) =>
          edge.relation === "grants"
          && edge.targetFeatureId === "skill_provider_demo"
          && edge.targetSurfaceId === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
          && edge.targetContractId === DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
      ),
      true,
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

function testLocalOnlyUpdatePreservesExistingBindingSidecarAndDependencyTruth() {
  const hostRoot = mkdtempSync(join(tmpdir(), "rw-grant-seam-"));
  try {
    const blueprint = createSelectionPoolBlueprint("consumer_draw_demo", hostRoot);
    const localSchema = createLocalSelectionUpdateSchema("Increase the displayed candidate option count from 3 to 5.");
    const localUpdateIntent = createLocalSelectionUpdateIntent("consumer_draw_demo", localSchema);
    const preservedObjectId = getSelectionPoolCompiledObjects(blueprint)[0].id;

    writeJson(
      hostRoot,
      "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-grant-bindings.json",
      {
        adapter: "dota2_selection_grant_binding",
        version: 1,
        featureId: "consumer_draw_demo",
        bindings: [
          {
            objectId: preservedObjectId,
            targetFeatureId: "skill_provider_demo",
            targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
            relation: "grants",
            applyBehavior: "grant_primary_hero_ability",
          },
        ],
      },
    );

    const currentFeature = {
      featureId: "consumer_draw_demo",
      generatedFiles: [
        "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-grant-bindings.json",
      ],
      sourceModel: {
        adapter: "selection_pool",
        version: 2,
        path: "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-pool.source.json",
      },
      featureContract: {
        exports: [
          {
            id: "reward_binding_skill_provider_demo",
            kind: "integration",
            summary: "Keeps the current reward binding to skill_provider_demo.",
          },
        ],
        consumes: [
          {
            id: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
            kind: "capability",
            summary: "Consumes a provider feature that can grant one primary hero ability.",
            contractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
          },
        ],
        integrationSurfaces: ["reward_binding_skill_provider_demo"],
        stateScopes: [],
      },
      dependencyEdges: [
        {
          relation: "grants",
          targetFeatureId: "skill_provider_demo",
          targetSurfaceId: GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID,
          targetContractId: DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
          required: true,
          summary: `cross-feature reward grants:skill_provider_demo:${GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID}`,
        },
      ],
    } as any;

    const writePlan = createWritePlan(createStaleSelectionPoolPatternEntries("consumer_draw_demo"));
    const result = applyDota2GrantSeam({
      hostRoot,
      featureId: "consumer_draw_demo",
      prompt: "Increase the displayed candidate option count from 3 to 5.",
      schema: localSchema,
      updateIntent: localUpdateIntent,
      blueprint,
      writePlan,
      clarificationSignals: createClarificationSignals(),
      currentFeature,
      workspaceFeatures: [currentFeature],
    });

      const bindingEntry = writePlan.entries.find((entry) =>
        entry.targetPath.endsWith("selection-grant-bindings.json"),
      );
      const contractEntry = writePlan.entries.find((entry) =>
        entry.targetPath.endsWith("selection-grant-contract.json"),
      );
      assert.ok(
        bindingEntry,
        "local-only updates should preserve the existing selection grant sidecar instead of deleting it",
      );
      assert.ok(contractEntry, "local-only updates should also preserve the explicit local grant contract");
    assert.equal(((bindingEntry?.parameters as any).bindings || []).length, 1);
    assert.equal(((bindingEntry?.parameters as any).bindings || [])[0]?.entryId, preservedObjectId);
    assert.equal(
      getSelectionPoolCompiledObjects(result.blueprint).length,
      getSelectionPoolCompiledObjects(blueprint).length,
      "preserving existing bindings must not append a new placeholder reward object",
    );
    assert.equal(
      result.blueprint.dependencyEdges?.some(
        (edge) =>
          edge.relation === "grants"
          && edge.targetFeatureId === "skill_provider_demo"
          && edge.targetSurfaceId === GRANTABLE_PRIMARY_HERO_ABILITY_SURFACE_ID
          && edge.targetContractId === DOTA2_PRIMARY_HERO_ABILITY_GRANTABLE_CONTRACT_ID,
      ),
      true,
    );
    assert.equal(
      result.blueprint.featureContract?.integrationSurfaces.includes("reward_binding_skill_provider_demo"),
      true,
    );

    const diffResult = classifyUpdateDiff(
      {
        featureId: "consumer_draw_demo",
        revision: 1,
        generatedFiles: [
          "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-grant-bindings.json",
        ],
        sourceModel: {
          adapter: "selection_pool",
          version: 2,
          path: "game/scripts/src/rune_weaver/features/consumer_draw_demo/selection-pool.source.json",
        },
      } as any,
      writePlan,
      hostRoot,
    );
    assert.equal(
      diffResult.deletedFiles.some((file) => file.path.endsWith("selection-grant-bindings.json")),
      false,
      "preserved binding sidecar should no longer be classified as a safe-delete during local-only updates",
    );
  } finally {
    rmSync(hostRoot, { recursive: true, force: true });
  }
}

  testGameplayAbilityProviderExportsGrantSurfaceWithoutSelectionPoolLeak();
  testDefinitionOnlyProviderSchemaStillExportsGrantSurfaceWithoutBackboneRole();
  testGameplayAbilityBackboneDoesNotExportGrantSurfaceWhenCrossFeatureGrantsAreForbidden();
  testProviderExportRequiresClosedLuaAndKvIdentity();
testProviderExportRejectsDriftedLuaKvIdentity();
testUnresolvedCrossFeatureBindingBlocksWriteButKeepsLocalShell();
testObservationalSignalsDoNotTriggerGrantSeamForLocalSelectionOnlyFlow();
testResolvedProviderBindingWritesBindingSidecarWithoutMutatingLocalSelectionAuthoring();
testBindingWithoutExplicitLocalObjectBecomesRealBlocker();
testExternalCatalogEquipmentDoesNotTriggerGrantSeamWriteBlocker();
testDriftedSelectionUpdateStopsAtContractInsteadOfAppendingLocalObject();
testPromptResolvedGrantBindingSurvivesGovernanceDriftWithoutExplicitCrossFeatureDelta();
testLocalOnlyUpdatePreservesExistingBindingSidecarAndDependencyTruth();

console.log("adapters/dota2/cross-feature/grant-seam.test.ts passed");

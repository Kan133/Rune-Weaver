import assert from "node:assert/strict";

import { dota2Patterns } from "../../adapters/dota2/patterns/index.js";
import { buildBlueprint } from "../blueprint/builder.js";
import type { IntentSchema } from "../schema/types.js";
import { resolvePatterns } from "./resolver.js";

const baseBlueprint = {
  id: "bp_test",
  version: "1.0",
  summary: "test",
  sourceIntent: {
    intentKind: "micro-feature",
    goal: "resolver test",
    normalizedMechanics: {},
  },
  modules: [],
  connections: [],
  patternHints: [],
  assumptions: [],
  validations: [],
  readyForAssembly: true,
};

function withSyntheticPatterns<T>(run: () => T): T {
  const syntheticPatterns = [
    {
      id: "test.synthetic.alpha",
      category: "test",
      summary: "alpha",
      responsibilities: [{ text: "alpha", core: true }],
      nonGoals: [{ text: "none" }],
      capabilities: ["test.capability.shared"],
      traits: ["test.synthetic"],
      semanticOutputs: ["server.runtime"],
      inputs: [{ name: "input", type: "string", required: false }],
      outputs: [{ name: "output", type: "string" }],
      parameters: [{ name: "value", type: "string", required: false }],
      hostTarget: "dota2.server",
      outputTypes: ["typescript"],
      hostBindings: [
        {
          hostId: "dota2",
          target: "game/scripts/src/rune_weaver/generated/server",
          outputTypes: ["typescript"],
          preferredFamily: "runtime-primary",
          allowedFamilies: ["runtime-primary"],
        },
      ],
    },
    {
      id: "test.synthetic.beta",
      category: "test",
      summary: "beta",
      responsibilities: [{ text: "beta", core: true }],
      nonGoals: [{ text: "none" }],
      capabilities: ["test.capability.shared"],
      traits: ["test.synthetic"],
      semanticOutputs: ["server.runtime"],
      inputs: [{ name: "input", type: "string", required: false }],
      outputs: [{ name: "output", type: "string" }],
      parameters: [{ name: "value", type: "string", required: false }],
      hostTarget: "dota2.server",
      outputTypes: ["typescript"],
      hostBindings: [
        {
          hostId: "dota2",
          target: "game/scripts/src/rune_weaver/generated/server",
          outputTypes: ["typescript"],
          preferredFamily: "runtime-primary",
          allowedFamilies: ["runtime-primary"],
        },
      ],
    },
  ];

  dota2Patterns.push(...(syntheticPatterns as typeof dota2Patterns));
  try {
    return run();
  } finally {
    dota2Patterns.splice(-syntheticPatterns.length, syntheticPatterns.length);
  }
}

{
  const result = resolvePatterns({
    ...baseBlueprint,
    moduleNeeds: [
      {
        moduleId: "catalog_miss_case",
        semanticRole: "catalog_miss_case",
        requiredCapabilities: ["capability.missing.from.catalog"],
      },
    ],
  });

  assert.equal(result.patterns.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolvedModuleNeeds.length, 1);
  assert.equal(result.viable, true);
  assert.equal(result.complete, false);
  assert.deepEqual(result.unresolved[0].missingCapabilities, ["capability.missing.from.catalog"]);
  assert.equal(result.unresolvedModuleNeeds[0].moduleId, "catalog_miss_case");
  assert.match(result.unresolved[0].reason, /module synthesis/i);
  assert.match(result.unresolved[0].suggestedAlternative || "", /module synthesis/i);
  assert.doesNotMatch(result.unresolved[0].reason, /admitted|unsupported|seam/i);
  assert.ok(
    result.issues.some((issue) => issue.code === "NO_PATTERNS_RESOLVED" && issue.severity === "warning"),
  );
}

{
  const result = resolvePatterns({
    ...baseBlueprint,
    status: "weak",
    implementationStrategy: "exploratory",
    designDraft: {
      retrievedFamilyCandidates: [],
      retrievedPatternCandidates: [],
      reuseConfidence: "low",
      chosenImplementationStrategy: "exploratory",
    },
    commitDecision: {
      outcome: "exploratory",
      canAssemble: true,
      canWriteHost: true,
      requiresReview: true,
      reasons: ["unknown mechanic should continue via exploratory fallback"],
    },
    moduleNeeds: [
      {
        moduleId: "exploratory_case",
        semanticRole: "exploratory_case",
        requiredCapabilities: ["capability.missing.from.catalog"],
        requiredOutputs: ["server.runtime", "host.runtime.lua", "host.config.kv"],
        integrationHints: ["ability.execution"],
      },
    ],
  });

  assert.equal(result.patterns.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolvedModuleNeeds.length, 1);
  assert.equal(result.viable, true);
  assert.equal(result.unresolvedModuleNeeds[0].moduleId, "exploratory_case");
  assert.equal(result.unresolvedModuleNeeds[0].strategy, "exploratory");
  assert.match(result.unresolved[0].suggestedAlternative || "", /module synthesis/i);
  assert.doesNotMatch(result.unresolved[0].reason, /admitted|unsupported|seam/i);
  assert.ok(
    result.issues.some((issue) => issue.code === "MODULE_NEED_UNRESOLVED"),
  );
  assert.ok(
    result.issues.some((issue) => issue.code === "NO_PATTERNS_RESOLVED" && issue.severity === "warning"),
  );
}

withSyntheticPatterns(() => {
  const result = resolvePatterns({
    ...baseBlueprint,
    moduleNeeds: [
      {
        moduleId: "tie_case",
        semanticRole: "tie_case",
        requiredCapabilities: ["test.capability.shared"],
        explicitPatternHints: ["test.synthetic.beta"],
      },
    ],
  });

  assert.equal(result.patterns.length, 1);
  assert.equal(result.moduleRecords.length, 1);
  assert.equal(result.viable, true);
  assert.equal(result.patterns[0].patternId, "test.synthetic.beta");
  assert.equal(result.patterns[0].source, "hint-tiebreak");
  assert.equal(result.moduleRecords[0].moduleId, "tie_case");
});

{
  const result = resolvePatterns({
    ...baseBlueprint,
    moduleNeeds: [
      {
        moduleId: "dash_case",
        semanticRole: "dash_effect",
        requiredCapabilities: ["effect.displacement.dash"],
        requiredOutputs: ["host.config.kv", "server.runtime"],
        integrationHints: ["ability.execution"],
      },
    ],
  });

  assert.equal(result.patterns.length, 1);
  assert.equal(result.moduleRecords.length, 1);
  assert.equal(result.viable, true);
  assert.equal(result.patterns[0].patternId, "effect.dash");
  assert.equal(result.patterns[0].source, "need");
  assert.equal(result.moduleRecords[0].selectedPatternIds[0], "effect.dash");
}

{
  const result = resolvePatterns({
    ...baseBlueprint,
    moduleNeeds: [
      {
        moduleId: "short_time_buff_case",
        semanticRole: "effect_application",
        requiredCapabilities: ["ability.buff.short_duration"],
        optionalCapabilities: ["timing.cooldown.local"],
        requiredOutputs: ["server.runtime", "host.runtime.lua", "host.config.kv"],
        integrationHints: ["ability.execution", "modifier.runtime"],
        stateExpectations: ["modifier.duration_state"],
      },
    ],
  });

  assert.equal(result.patterns.length, 1);
  assert.equal(result.viable, true);
  assert.equal(result.patterns[0].patternId, "dota2.short_time_buff");
  assert.equal(result.patterns[0].source, "need");
  assert.equal(result.unresolvedModuleNeeds.length, 0);
}

{
  const rewardSchema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Track reward progress after each completed selection round and level up after three rounds.",
      goal: "Track reward progress after each completed selection round and level up after three rounds.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: [
        "Track reward progress after each selection round",
        "Level up after three completed rounds",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to open the selection flow",
          parameters: { triggerKey: "A" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Resolve one player-confirmed choice from weighted candidates",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
        {
          id: "state_req",
          kind: "state",
          summary: "Store reward progress and current reward level",
          parameters: { progressThreshold: 3 },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    selection: {
      mode: "weighted",
      cardinality: "single",
      repeatability: "repeatable",
    },
    stateModel: {
      states: [
        { id: "reward_progress", summary: "Completed selection rounds", owner: "feature", lifetime: "session" },
        { id: "reward_level", summary: "Current reward level", owner: "feature", lifetime: "session" },
      ],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: false,
      outcomeApplication: false,
      resourceConsumption: false,
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };

  const blueprint = buildBlueprint(rewardSchema);
  assert.equal(blueprint.success, true);

  const result = resolvePatterns(blueprint.finalBlueprint!);
  const selectionFlow = result.patterns.find((pattern) => pattern.patternId === "rule.selection_flow");

  assert.equal(result.unresolved.length, 0);
  assert.equal(result.viable, true);
  assert.ok(selectionFlow);
  assert.deepEqual(selectionFlow?.parameters?.progression, {
    enabled: true,
    progressThreshold: 3,
    progressStateId: "reward_progress",
    levelStateId: "reward_level",
  });
}

{
  const projectileSchema: IntentSchema = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Press D to fire one forward linear projectile with fixed speed, distance, and radius.",
      goal: "Press D to fire one forward linear projectile with fixed speed, distance, and radius.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Capture a key press", "Fire one forward linear projectile"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture a key press to emit the projectile",
          parameters: { triggerKey: "D" },
        },
        {
          id: "effect_req",
          kind: "effect",
          summary: "Emit one forward linear projectile",
          parameters: {
            projectileDistance: 900,
            projectileSpeed: 1200,
            projectileRadius: 125,
          },
        },
      ],
    },
    constraints: {
      requiredPatterns: [],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: false,
      weightedSelection: false,
      playerChoice: false,
      uiModal: false,
      outcomeApplication: true,
      resourceConsumption: false,
    },
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };

  const blueprint = buildBlueprint(projectileSchema);
  assert.equal(blueprint.success, true);

  const result = resolvePatterns(blueprint.finalBlueprint!);
  const projectilePattern = result.patterns.find((pattern) => pattern.patternId === "dota2.linear_projectile_emit");

  assert.equal(result.unresolved.length, 0);
  assert.equal(result.viable, true);
  assert.ok(projectilePattern);
  assert.equal(projectilePattern?.parameters?.projectileDistance, 900);
  assert.equal(projectilePattern?.parameters?.projectileSpeed, 1200);
  assert.equal(projectilePattern?.parameters?.projectileRadius, 125);
}

{
  const createSchema: IntentSchema & { parameters: Record<string, unknown> } = {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Talent draw v1",
      goal: "Talent draw v1",
    },
    classification: {
      intentKind: "standalone-system",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: ["Press F4 to open a three-choice talent draw", "Show a selection modal"],
    },
    constraints: {},
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
      duplicatePolicy: "forbid",
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: false,
    },
    resolvedAssumptions: [],
    openQuestions: [],
    isReadyForBlueprint: true,
    parameters: {
      triggerKey: "F4",
      choiceCount: 3,
      selectionPolicy: "single",
      applyMode: "immediate",
      drawMode: "multiple_without_replacement",
      duplicatePolicy: "forbid",
      entries: [
        { id: "R001", label: "Strength Boost", description: "+10 Strength", weight: 40, tier: "R" },
      ],
    },
  };

  const updateSchema: IntentSchema & { parameters: Record<string, unknown> } = {
    ...createSchema,
    request: {
      rawPrompt: "Talent draw v2 inventory",
      goal: "Talent draw v2 inventory",
    },
    selection: {
      ...createSchema.selection,
      inventory: {
        enabled: true,
        capacity: 15,
        storeSelectedItems: true,
        blockDrawWhenFull: true,
        fullMessage: "Talent inventory full",
        presentation: "persistent_panel",
      },
    },
    parameters: {
      ...createSchema.parameters,
      inventory: {
        enabled: true,
        capacity: 15,
        storeSelectedItems: true,
        blockDrawWhenFull: true,
        fullMessage: "Talent inventory full",
        presentation: "persistent_panel",
      },
    },
  };

  const createBlueprint = buildBlueprint(createSchema);
  const updateBlueprint = buildBlueprint(updateSchema);
  assert.equal(createBlueprint.success, true);
  assert.equal(updateBlueprint.success, true);

  const createPatterns = resolvePatterns(createBlueprint.finalBlueprint!);
  const updatePatterns = resolvePatterns(updateBlueprint.finalBlueprint!);

  assert.deepEqual(
    createPatterns.patterns.map((pattern) => pattern.patternId).sort(),
    updatePatterns.patterns.map((pattern) => pattern.patternId).sort(),
  );
}

console.log("core/patterns/resolver.test.ts passed");

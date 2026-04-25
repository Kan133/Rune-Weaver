import assert from "node:assert/strict";

import type { IntentSchema, UpdateSemanticAnalysis } from "../schema/types.js";
import {
  buildUpdateClarificationPlan,
  buildWizardClarificationPlan,
  finalizeCreateIntentSchema,
  hasResolvedSelectionFlowBoundary,
} from "./index.js";

const host = { kind: "dota2-x-template" as const };

function createBaseIntentSchema(prompt: string): IntentSchema {
  return {
    version: "1.0",
    host,
    request: {
      rawPrompt: prompt,
      goal: prompt,
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    requirements: {
      functional: [prompt],
    },
    constraints: {},
    normalizedMechanics: {},
    resolvedAssumptions: [],
  };
}

function createAdvisoryUpdateSemanticAnalysis(): UpdateSemanticAnalysis {
  return {
    promptFacts: [],
    currentTruthFacts: [],
    governanceDecisions: {
      scope: {
        code: "scope",
        value: "bounded_update",
        confidence: "high",
      },
      preservation: {
        code: "preservation",
        value: {
          preservedModuleBackbone: [],
          preservedInvariants: [],
          protectedContracts: [],
        },
        confidence: "high",
      },
      mutationAuthority: {
        code: "mutationAuthority",
        value: {
          add: [],
          modify: [],
          remove: [],
          blocked: [],
        },
        confidence: "high",
      },
      effectiveContracts: {
        code: "effectiveContracts",
        value: {},
        confidence: "high",
      },
    },
    openSemanticResidue: [
      {
        id: "unc_ui_polish",
        summary: "Card visual polish is still open, but the update contract is otherwise clear.",
        class: "blueprint_relevant",
        affects: ["blueprint"],
        severity: "medium",
        disposition: "open",
        targetPaths: ["uiRequirements.surfaces"],
      },
    ],
  };
}

function testBuildWizardClarificationPlanPublishesSignalsFirst() {
  const prompt = "Create a gameplay feature that moves the hero forward.";
  const plan = buildWizardClarificationPlan({
    rawText: prompt,
    schema: {
      ...createBaseIntentSchema(prompt),
      outcomes: {
        operations: ["move"],
      },
    },
  });

  assert.ok(plan);
  assert.equal((plan as any).blocksBlueprint, undefined);
  assert.equal((plan as any).blocksWrite, undefined);
  assert.equal(plan?.signals?.semanticPosture, "open");
  assert.equal(plan?.signals?.openStructuralContracts[0]?.kind, "activation-boundary");
  assert.deepEqual(plan?.signals?.unresolvedDependencies, []);
}

function testAdvisoryNoiseOnlyProducesSignalsNotStageOneGate() {
  const plan = buildUpdateClarificationPlan(createAdvisoryUpdateSemanticAnalysis());

  assert.ok(plan);
  assert.equal((plan as any).blocksBlueprint, undefined);
  assert.equal((plan as any).blocksWrite, undefined);
  assert.equal(plan?.questions[0]?.impact, "advisory");
  assert.equal(plan?.signals?.semanticPosture, "open");
  assert.deepEqual(plan?.signals?.openStructuralContracts, []);
  assert.deepEqual(plan?.signals?.unresolvedDependencies, []);
}

function testBuildWizardClarificationPlanSkipsBoundedCatalogDetailResidue() {
  const prompt =
    "用户按下F4后弹出三个随机dota2原生装备选项，用户选择一个后获得对应装备，选项分R/SR/SSR/UR四个等级，等级影响概率和抽取权重";
  const plan = buildWizardClarificationPlan({
    rawText: prompt,
    schema: {
      ...createBaseIntentSchema(prompt),
      interaction: {
        activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
        commitment: "immediate",
      },
      uiRequirements: {
        needed: true,
        surfaces: ["selection_modal", "rarity_cards"],
      },
      normalizedMechanics: {
        trigger: true,
        candidatePool: true,
        weightedSelection: true,
        playerChoice: true,
        uiModal: true,
        outcomeApplication: true,
      },
    },
    semanticAnalysis: {
      rawFacts: [],
      governanceDecisions: {} as any,
      openSemanticResidue: [
        {
          id: "unc_native_item_subset",
          summary: "The exact eligible subset of native Dota 2 items is not specified.",
          surface: "candidate_catalog",
          class: "bounded_detail_only",
          affects: ["blueprint"],
          severity: "medium",
          disposition: "open",
          targetPaths: ["contentModel.collections"],
          source: "schema.uncertainty",
        },
      ],
    } as any,
  });

  assert.equal(plan, undefined);
}

function testBuildWizardClarificationPlanDoesNotMapBoundedWeightDetailToSelectionFlow() {
  const prompt =
    "Press F4 to open a local weighted candidate selection UI, draw 3 rarity-weighted options, let the player choose 1, apply it immediately, remove the selected option from future draws, and return unchosen options to the pool.";
  const plan = buildWizardClarificationPlan({
    rawText: prompt,
    schema: {
      ...createBaseIntentSchema(prompt),
      interaction: {
        activations: [{ kind: "key", input: "F4", phase: "press", repeatability: "repeatable" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
        commitment: "immediate",
      },
      uiRequirements: {
        needed: true,
        surfaces: ["selection_modal", "rarity_cards"],
      },
      normalizedMechanics: {
        trigger: true,
        candidatePool: true,
        weightedSelection: true,
        playerChoice: true,
        uiModal: true,
        outcomeApplication: true,
      },
    },
    semanticAnalysis: {
      rawFacts: [],
      governanceDecisions: {} as any,
      openSemanticResidue: [
        {
          id: "unc_weights",
          summary: "Please define the exact probability weights for each rarity tier.",
          surface: "candidate_catalog",
          class: "bounded_detail_only",
          affects: ["intent", "blueprint"],
          severity: "medium",
          disposition: "open",
          targetPaths: ["contentModel.collections", "selection", "parameters"],
          source: "schema.uncertainty",
        },
      ],
    } as any,
  });

  assert.equal(plan, undefined);
}

function testBuildWizardClarificationPlanDoesNotMapExactNumericWeightDetailToSelectionFlow() {
  const prompt =
    "用户按下G后弹出三个随机dota2原生装备选项，用户选择一个后获得对应装备，选项分R/SR/SSR/UR四个等级，等级影响概率和抽取权重";
  const plan = buildWizardClarificationPlan({
    rawText: prompt,
    schema: {
      ...createBaseIntentSchema(prompt),
      interaction: {
        activations: [{ kind: "key", input: "G", phase: "press", repeatability: "repeatable" }],
      },
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "user-chosen",
        choiceCount: 3,
        cardinality: "single",
        commitment: "immediate",
      },
      uiRequirements: {
        needed: true,
        surfaces: ["selection_modal", "rarity_cards"],
      },
      normalizedMechanics: {
        trigger: true,
        candidatePool: true,
        weightedSelection: true,
        playerChoice: true,
        uiModal: true,
        outcomeApplication: true,
      },
      uncertainties: [
        {
          id: "unc_exact_weight_values",
          summary: "The exact numeric probability or weighting values for R, SR, SSR, and UR are not specified.",
          affects: ["blueprint"],
          severity: "medium",
        },
      ],
    },
  });

  assert.equal(plan, undefined);
}

function testFinalizeCreateIntentSchemaStripsReadinessAuthorityFields() {
  const prompt = "Press F4 to reveal 3 weighted cards.";
  const finalized = finalizeCreateIntentSchema(
    {
      ...createBaseIntentSchema(prompt),
      readiness: "blocked",
      isReadyForBlueprint: false,
      selection: {
        mode: "weighted",
        source: "weighted-pool",
        choiceMode: "none",
        resolutionMode: "reveal_batch_immediate",
        cardinality: "multiple",
        choiceCount: 3,
      },
      normalizedMechanics: {
        candidatePool: true,
        weightedSelection: true,
      },
      parameters: {
        existingKey: "keep-me",
      },
    },
    prompt,
  );

  assert.equal(finalized.readiness, undefined);
  assert.equal(finalized.isReadyForBlueprint, undefined);
  assert.equal(finalized.parameters?.existingKey, "keep-me");
}

function testHasResolvedSelectionFlowBoundaryRequiresExplicitResolutionAuthority() {
  const prompt = "Press F4 to show 3 weighted cards from a local pool with rarity UI.";
  const ambiguousWeightedCardSchema: IntentSchema = {
    ...createBaseIntentSchema(prompt),
    selection: {
      mode: "weighted",
      source: "weighted-pool",
      choiceMode: "weighted",
      choiceCount: 3,
      cardinality: "single",
      commitment: "immediate",
    },
    uiRequirements: {
      needed: true,
      surfaces: ["card_popup", "rarity_cards"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: false,
      uiModal: true,
      outcomeApplication: true,
    },
    resolvedAssumptions: [],
  };

  assert.equal(hasResolvedSelectionFlowBoundary(ambiguousWeightedCardSchema), false);
  assert.equal(
    hasResolvedSelectionFlowBoundary({
      ...ambiguousWeightedCardSchema,
      selection: {
        ...ambiguousWeightedCardSchema.selection!,
        choiceMode: "user-chosen",
        resolutionMode: "player_confirm_single",
      },
      normalizedMechanics: {
        ...ambiguousWeightedCardSchema.normalizedMechanics!,
        playerChoice: true,
      },
    }),
    true,
  );
}

function runTests() {
  testBuildWizardClarificationPlanPublishesSignalsFirst();
  testAdvisoryNoiseOnlyProducesSignalsNotStageOneGate();
  testBuildWizardClarificationPlanSkipsBoundedCatalogDetailResidue();
  testBuildWizardClarificationPlanDoesNotMapBoundedWeightDetailToSelectionFlow();
  testBuildWizardClarificationPlanDoesNotMapExactNumericWeightDetailToSelectionFlow();
  testFinalizeCreateIntentSchemaStripsReadinessAuthorityFields();
  testHasResolvedSelectionFlowBoundaryRequiresExplicitResolutionAuthority();
  console.log("core/wizard/clarification-plan.test.ts passed");
}

runTests();

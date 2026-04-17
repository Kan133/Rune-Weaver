import assert from "node:assert/strict";

import { isResolvableExistingSeamIssue } from "./clarification-policy";
import type { IntentSchema } from "../schema/types";

function createSupportedTriChoiceSchema(): IntentSchema {
  return {
    version: "1.0",
    host: { kind: "dota2-x-template" },
    request: {
      rawPrompt: "Open a repeatable weighted three-choice buff flow and keep the current choice visible.",
      goal: "Open a repeatable weighted three-choice buff flow and keep the current choice visible.",
    },
    classification: {
      intentKind: "micro-feature",
      confidence: "high",
    },
    readiness: "ready",
    requirements: {
      functional: [
        "Open a repeatable weighted three-choice buff flow",
        "Keep the current selected buff visible",
      ],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture an explicit key press to open the buff flow",
          parameters: { triggerKey: "F4" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Resolve one player-confirmed weighted choice",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
        {
          id: "ui_req",
          kind: "ui",
          summary: "Show a selection modal",
          outputs: ["selection_modal"],
        },
        {
          id: "integration_req",
          kind: "integration",
          summary: "Sync the current selection state to the UI surface",
        },
      ],
    },
    constraints: {
      requiredPatterns: ["rule.selection_flow"],
    },
    stateModel: {
      states: [
        {
          id: "current_selection",
          summary: "Current selected buff state",
          owner: "feature",
          lifetime: "session",
        },
      ],
    },
    selection: {
      mode: "user-chosen",
      cardinality: "single",
      repeatability: "repeatable",
    },
    effects: {
      operations: ["apply"],
      durationSemantics: "timed",
      targets: ["self"],
    },
    integrations: {
      expectedBindings: [
        { id: "input_binding", kind: "entry-point", summary: "Open flow from key press", required: true },
        { id: "ui_surface", kind: "ui-surface", summary: "Selection modal surface", required: true },
        { id: "state_sync", kind: "bridge-point", summary: "Sync current selection state", required: true },
      ],
    },
    uiRequirements: {
      needed: true,
      surfaces: ["selection_modal"],
      feedbackNeeds: ["selection_confirm"],
    },
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: true,
      outcomeApplication: true,
      resourceConsumption: false,
    },
    acceptanceInvariants: [],
    uncertainties: [],
    requiredClarifications: [],
    openQuestions: [],
    resolvedAssumptions: [],
    isReadyForBlueprint: true,
  };
}

function testBoundedDetailClarificationStaysResolvable() {
  const schema = createSupportedTriChoiceSchema();

  assert.equal(
    isResolvableExistingSeamIssue(
      "请提供增益候选池的具体内容：每个增益的名称、属性加成数值、图标资源路径",
      schema
    ),
    true
  );
}

function testSupportedLifecycleClarificationRequiresSupportedContext() {
  const supportedSchema = createSupportedTriChoiceSchema();
  const unsupportedSchema: IntentSchema = {
    ...createSupportedTriChoiceSchema(),
    request: {
      rawPrompt: "Open a one-off weighted buff choice.",
      goal: "Open a one-off weighted buff choice.",
    },
    requirements: {
      functional: ["Open a weighted buff choice once"],
      typed: [
        {
          id: "trigger_req",
          kind: "trigger",
          summary: "Capture an explicit key press to open the buff flow",
          parameters: { triggerKey: "F4" },
        },
        {
          id: "rule_req",
          kind: "rule",
          summary: "Resolve one player-confirmed weighted choice",
          parameters: { choiceCount: 1, selectionPolicy: "weighted" },
        },
      ],
    },
    stateModel: { states: [] },
    selection: {
      mode: "user-chosen",
      cardinality: "single",
    },
    integrations: {
      expectedBindings: [
        { id: "ui_surface", kind: "ui-surface", summary: "Selection modal surface", required: true },
      ],
    },
    uiRequirements: undefined,
    normalizedMechanics: {
      trigger: true,
      candidatePool: true,
      weightedSelection: true,
      playerChoice: true,
      uiModal: false,
      outcomeApplication: true,
      resourceConsumption: false,
    },
  };
  const question = "新选择是否替换旧增益，还是可以叠加并同时拥有多个增益？";

  assert.equal(isResolvableExistingSeamIssue(question, supportedSchema), true);
  assert.equal(isResolvableExistingSeamIssue(question, unsupportedSchema), false);
}

function testArchitectureReopeningClarificationStaysNonResolvable() {
  const schema = createSupportedTriChoiceSchema();

  assert.equal(
    isResolvableExistingSeamIssue(
      "What triggers the selection and which existing systems does it sync with?",
      schema
    ),
    false
  );
}

function testTriChoicePolishAndCatalogClarificationsStayResolvable() {
  const schema = createSupportedTriChoiceSchema();

  assert.equal(
    isResolvableExistingSeamIssue("F4 的冷却、音效和视觉反馈怎么处理？", schema),
    true
  );
  assert.equal(
    isResolvableExistingSeamIssue("请提供候选池总大小、具体增益类型和图标资源路径", schema),
    true
  );
}

testBoundedDetailClarificationStaysResolvable();
testSupportedLifecycleClarificationRequiresSupportedContext();
testArchitectureReopeningClarificationStaysNonResolvable();
testTriChoicePolishAndCatalogClarificationsStayResolvable();

console.log("core/blueprint/clarification-policy.test.ts passed");

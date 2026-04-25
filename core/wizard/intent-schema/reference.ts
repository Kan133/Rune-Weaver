export const INTENT_SCHEMA_REFERENCE = {
  version: "string",
  host: {
    kind: "string",
    projectRoot: "string?",
    capabilities: ["string?"],
  },
  request: {
    rawPrompt: "string",
    goal: "string",
    nameHint: "string?",
  },
  classification: {
    intentKind: "micro-feature | standalone-system | cross-system-composition | ui-surface | unknown",
    confidence: "low | medium | high",
  },
  actors: [
    {
      id: "string",
      role: "string",
      label: "string",
    },
  ],
  requirements: {
    functional: ["string"],
    typed: [
      {
        id: "string",
        kind: "trigger | state | rule | effect | resource | ui | integration | generic",
        summary: "string",
        actors: ["string?"],
        inputs: ["string?"],
        outputs: ["string?"],
        invariants: ["string?"],
        parameters: "object?",
        priority: "must | should | could",
      },
    ],
    interactions: ["string?"],
    dataNeeds: ["string?"],
    outputs: ["string?"],
  },
  constraints: {
    requiredPatterns: ["string?"],
    forbiddenPatterns: ["string?"],
    hostConstraints: ["string?"],
    nonFunctional: ["string?"],
  },
  interaction: {
    activations: [
      {
        actor: "string?",
        kind: "key | mouse | event | passive | system",
        input: "string?",
        phase: "press | release | hold | enter | occur",
        repeatability: "one-shot | repeatable | toggle | persistent",
        confirmation: "none | implicit | explicit",
      },
    ],
  },
  targeting: {
    subject: "self | ally | enemy | unit | point | area | direction | global",
    selector: "cursor | current-target | nearest | random | none",
    teamScope: "self | ally | enemy | any",
  },
  timing: {
    cooldownSeconds: "number?",
    delaySeconds: "number?",
    intervalSeconds: "number?",
    duration: {
      kind: "instant | timed | persistent",
      seconds: "number?",
    },
  },
  spatial: {
    motion: {
      kind: "dash | teleport | knockback | none",
      distance: "number?",
      direction: "cursor | facing | target | fixed",
    },
    area: {
      shape: "circle | line | cone",
      radius: "number?",
      length: "number?",
      width: "number?",
    },
    emission: {
      kind: "projectile | pulse | wave | none",
      speed: "number?",
      count: "number?",
    },
  },
  uiRequirements: {
    needed: "boolean",
    surfaces: ["string?"],
    feedbackNeeds: ["string?"],
  },
  stateModel: {
    states: [
      {
        id: "string",
        summary: "string",
        owner: "feature | session | external",
        lifetime: "ephemeral | session | persistent",
        mutationMode: "create | update | consume | expire | remove",
      },
    ],
  },
  flow: {
    triggerSummary: "string?",
    sequence: ["string?"],
    supportsCancel: "boolean?",
    supportsRetry: "boolean?",
    requiresConfirmation: "boolean?",
  },
  selection: {
    mode: "deterministic | weighted | filtered | user-chosen | hybrid",
    source: "none | candidate-collection | weighted-pool | filtered-pool",
    choiceMode: "none | user-chosen | random | weighted | hybrid",
    cardinality: "single | multiple",
    choiceCount: "number?",
    repeatability: "one-shot | repeatable | persistent",
    duplicatePolicy: "allow | avoid | forbid",
    commitment: "immediate | confirm | deferred",
    inventory: {
      enabled: "boolean",
      capacity: "number",
      storeSelectedItems: "boolean",
      blockDrawWhenFull: "boolean",
      fullMessage: "string",
      presentation: "persistent_panel",
    },
  },
  effects: {
    operations: ["apply | remove | stack | expire | consume | restore"],
    targets: ["string?"],
    durationSemantics: "instant | timed | persistent",
  },
  outcomes: {
    operations: [
      "apply-effect | move | spawn | grant-feature | update-state | consume-resource | emit-event",
    ],
  },
  contentModel: {
    collections: [
      {
        id: "string",
        role: "candidate-options | spawnables | progress-items | generic",
        ownership: "feature | shared | external",
        updateMode: "replace | merge | append",
        itemSchema: [
          {
            name: "string",
            type: "string | number | boolean | enum | effect-ref | object-ref",
            required: "boolean?",
            semanticRole: "string?",
          },
        ],
      },
    ],
  },
  composition: {
    dependencies: [
      {
        kind: "same-feature | cross-feature | external-system",
        relation: "reads | writes | triggers | grants | syncs-with",
        target: "string?",
        required: "boolean?",
      },
    ],
  },
  integrations: {
    expectedBindings: [
      {
        id: "string",
        kind: "entry-point | event-hook | bridge-point | ui-surface | data-source",
        summary: "string",
        required: "boolean?",
      },
    ],
  },
  normalizedMechanics: {
    trigger: "boolean?",
    targeting: "boolean?",
    movement: "boolean?",
    selection: "boolean?",
    ui: "boolean?",
    inventory: "boolean?",
    persistence: "boolean?",
    progression: "boolean?",
    outcomeApplication: "boolean?",
    composition: "boolean?",
  },
  acceptanceInvariants: [
    {
      id: "string",
      summary: "string",
      kind: "semantic | governance | host-contract | user-constraint",
    },
  ],
  uncertainties: [
    {
      id: "string",
      summary: "string",
      affects: ["intent | blueprint | pattern | realization"],
      severity: "low | medium | high",
    },
  ],
  resolvedAssumptions: ["string"],
  parameters: "object?",
};

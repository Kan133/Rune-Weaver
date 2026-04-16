# IntentSchema vNext Proposal

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-16
> Read when: checking which IntentSchema vNext details remain residual after baseline wording landed
> Do not use for: restating accepted baseline schema wording in parallel
> Owner: Lane B

This document is a proposal contract for intent-schema enrichment.
It now serves mainly as a residual note for details not yet baselined in [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md) and [WIZARD-BLUEPRINT-CHAIN.md](/D:/Rune%20Weaver/docs/WIZARD-BLUEPRINT-CHAIN.md).

## Purpose

This document no longer re-argues the accepted direction for richer `IntentSchema`.
That direction is already reflected in baseline docs.

Its goal is to make the blueprint stage consume a richer semantic contract without:

- changing current baseline truth directly
- giving LLM authority over final executable planning
- redefining pattern taxonomy
- redefining host realization families

Residual scope only:

- optional-fields-first migration details
- compatibility-layer handling around `isReadyForBlueprint`
- implementation-level field rollout sequencing

---

## 1. Core Decision

The current `IntentSchema` is semantically too thin for broad request generalization.

The main gap is not that the builder is deterministic.
The main gap is that the builder must infer too much from:

- `functional: string[]`
- `constraints: string[]`-like buckets
- coarse `normalizedMechanics`
- binary `isReadyForBlueprint`

`IntentSchema vNext` should therefore preserve more user demand as typed semantic structure before any blueprint proposal or normalization begins.

---

## 2. Frozen Terms Introduced

Accepted baseline terms should now be read from [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md).
The list below is kept only as a Lane B residual reference for migration work.

Lane B introduces these proposal terms for merge review:

- `IntentReadiness`
- `IntentRequirement`
- `IntentActor`
- `IntentStateContract`
- `IntentFlowContract`
- `IntentSelectionContract`
- `IntentEffectContract`
- `IntentIntegrationContract`
- `IntentInvariant`
- `IntentUncertainty`
- `RequiredClarification`

These are proposal terms only.
The main controller remains responsible for final cross-lane wording.

---

## 3. Proposed Readiness Model

`ready | weak | blocked` is already accepted baseline vocabulary.
This section now exists only to retain migration guidance such as compatibility with `isReadyForBlueprint`.

Replace binary-only readiness with a graded model:

```ts
type IntentReadiness = "ready" | "weak" | "blocked";
```

Meaning:

- `ready`: enough structure exists to produce a deterministic `FinalBlueprint`
- `weak`: enough structure exists to produce a proposal and possibly a weak normalized blueprint, but some assumptions remain explicit
- `blocked`: critical semantic gaps prevent safe blueprint finalization

Compatibility guidance:

- keep `isReadyForBlueprint` during migration
- derive it as `readiness === "ready" || readiness === "weak"`
- treat `blocked` as `false`

This preserves current builder compatibility while allowing the planning layer to express honesty about uncertainty.

---

## 4. Minimum vNext Field List

Most of this direction is now represented in baseline schema wording.
Treat this section as a field-rollout checklist, not as competing contract truth.

`IntentSchema vNext` should add, at minimum, the following structured sections.

### 4.1 Actors

Purpose:

- preserve role semantics before module decomposition

Suggested shape:

```ts
interface IntentActor {
  id: string;
  role: "triggering-actor" | "affected-actor" | "observing-actor" | "system-actor" | "external-actor";
  label: string;
  constraints?: string[];
}
```

### 4.2 Typed Requirements

Purpose:

- move beyond raw freeform requirement arrays

Suggested shape:

```ts
interface IntentRequirement {
  id: string;
  kind: "trigger" | "state" | "rule" | "effect" | "resource" | "ui" | "integration";
  summary: string;
  actors?: string[];
  inputs?: string[];
  outputs?: string[];
  invariants?: string[];
  parameters?: Record<string, unknown>;
  priority?: "must" | "should" | "could";
}
```

### 4.3 State Contract

Purpose:

- keep ephemeral vs persistent semantics explicit

Suggested shape:

```ts
interface IntentStateContract {
  states: Array<{
    id: string;
    summary: string;
    owner?: "feature" | "session" | "external";
    lifetime?: "ephemeral" | "session" | "persistent";
    mutationMode?: "create" | "update" | "consume" | "expire" | "remove";
  }>;
}
```

### 4.4 Flow Contract

Purpose:

- preserve user-visible behavioral flow

Suggested shape:

```ts
interface IntentFlowContract {
  triggerSummary?: string;
  sequence?: string[];
  supportsCancel?: boolean;
  supportsRetry?: boolean;
  requiresConfirmation?: boolean;
}
```

### 4.5 Selection Contract

Purpose:

- avoid silent inference for choice semantics

Suggested shape:

```ts
interface IntentSelectionContract {
  mode?: "deterministic" | "weighted" | "filtered" | "user-chosen" | "hybrid";
  cardinality?: "single" | "multiple";
  repeatability?: "one-shot" | "repeatable" | "persistent";
  duplicatePolicy?: "allow" | "avoid" | "forbid";
}
```

### 4.6 Effect Contract

Purpose:

- preserve application semantics without choosing host implementation

Suggested shape:

```ts
interface IntentEffectContract {
  operations: Array<"apply" | "remove" | "stack" | "expire" | "consume" | "restore">;
  targets?: string[];
  durationSemantics?: "instant" | "timed" | "persistent";
}
```

### 4.7 Integration Contract

Purpose:

- express binding expectations without host leakage

Suggested shape:

```ts
interface IntentIntegrationContract {
  expectedBindings: Array<{
    id: string;
    kind: "entry-point" | "event-hook" | "bridge-point" | "ui-surface" | "data-source";
    summary: string;
    required?: boolean;
  }>;
}
```

### 4.8 Hard Constraints And Invariants

Purpose:

- keep must-have and must-not conditions structured

Suggested shape:

```ts
interface IntentInvariant {
  id: string;
  summary: string;
  severity: "error" | "warning";
}
```

Recommended additions:

- `hardConstraints: string[]`
- `acceptanceInvariants: IntentInvariant[]`

### 4.9 Uncertainty And Clarification

Purpose:

- represent missing knowledge honestly

Suggested shape:

```ts
interface IntentUncertainty {
  id: string;
  summary: string;
  affects: Array<"intent" | "blueprint" | "pattern" | "realization">;
  severity: "low" | "medium" | "high";
}

interface RequiredClarification {
  id: string;
  question: string;
  blocksFinalization: boolean;
}
```

### 4.10 Feature Boundary And Source Model Hints

Purpose:

- let Wizard preserve candidate family/source-model hints without turning them into final authority

Suggested shape:

```ts
interface IntentContainedObjectHint {
  kind: string;
  summary: string;
  cardinality?: "single" | "collection";
}

interface IntentSourceModelHints {
  familyCandidate?: string;
  containedObjects?: IntentContainedObjectHint[];
  sourceModelHints?: string[];
}
```

Authority rule:

- these are candidate hints only
- they do not replace deterministic feature-boundary resolution
- they do not create a second authoritative planning object between `IntentSchema` and `FinalBlueprint`

---

## 5. Recommended vNext Envelope

This is a proposal-only envelope showing how the new sections relate:

```ts
interface IntentSchemaVNext {
  version: string;
  host: HostDescriptor;
  request: UserRequestSummary;
  classification: IntentClassification;
  readiness: IntentReadiness;
  normalizedMechanics: NormalizedMechanics;
  actors?: IntentActor[];
  requirements: {
    functional: string[];
    typed?: IntentRequirement[];
    interactions?: string[];
    dataNeeds?: string[];
    outputs?: string[];
  };
  stateModel?: IntentStateContract;
  flow?: IntentFlowContract;
  selection?: IntentSelectionContract;
  effects?: IntentEffectContract;
  integrations?: IntentIntegrationContract;
  sourceModelHints?: IntentSourceModelHints;
  hardConstraints?: string[];
  acceptanceInvariants?: IntentInvariant[];
  uncertainties?: IntentUncertainty[];
  requiredClarifications?: RequiredClarification[];
  constraints: IntentConstraints;
  uiRequirements?: UIRequirementSummary;
  openQuestions: string[];
  resolvedAssumptions: string[];
  isReadyForBlueprint: boolean;
}
```

This residual envelope intentionally keeps existing fields in place for migration safety.
If it diverges from accepted object wording, baseline docs win.

---

## 6. Lane B Boundaries

This proposal may define:

- intent-side semantics needed for blueprinting
- readiness semantics
- uncertainty semantics
- module-need input semantics

This proposal must not define:

- complete pattern taxonomy
- final pattern ids for new concepts
- host realization family taxonomy
- write-path decisions
- authoritative lifecycle scope changes

---

## 7. Lane C Interface Needs

Lane C should expect `IntentSchema vNext` and normalized blueprint output to preserve:

- module-level semantic responsibilities
- selection semantics
- state ownership and lifetime hints
- integration expectations
- acceptance invariants
- unresolved uncertainty markers

The canonical blueprint-side seam for this handoff is:

- [MODULE-NEED-SEAM-PROPOSAL.md](/D:/Rune%20Weaver/docs/MODULE-NEED-SEAM-PROPOSAL.md)

Lane C does not need Lane B to define concrete pattern families here.
Lane B only needs to expose enough semantic need so Pattern can resolve:

- what capability is required
- what contract must be preserved
- what host binding category may later be needed

---

## 8. Non-Goals Preserved

This proposal does not:

- make `IntentSchema` decide final pattern resolution
- make `IntentSchema` decide host realization
- make `IntentSchema` a write plan
- reopen lifecycle baseline scope
- let LLM become final blueprint authority

---

## 9. Merge Recommendation

The main controller should merge this proposal by:

1. freezing the final shared wording for `IntentReadiness` and uncertainty terms
2. adding the minimum typed sections to the baseline schema docs as optional fields first
3. keeping current builder compatibility during migration
4. aligning Lane C terminology only at the seam level, not by forcing taxonomy decisions into Lane B

Residual note:

- baseline wording is already accepted
- what remains here is migration sequencing, not cross-cutting schema authority

# Wizard -> Blueprint Chain

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: aligning current Wizard, clarification, Blueprint, and final-gate stage boundaries
> Do not use for: host-specific routing policy or final lifecycle authority by itself

## Purpose

This document records the accepted chain from Wizard through Blueprint and explains where continuation is allowed versus where write must still stop.

## Accepted Chain

```text
User Request
  -> Wizard
  -> IntentSchema
  -> optional clarification sidecars
       - questions
       - staged clarification authority
  -> Blueprint Stage
       - DesignDraft
       - FeatureContract
       - FeatureDependencyEdges
       - implementation strategy
       - FinalBlueprint
  -> Pattern Resolution / strategy continuation
  -> AssemblyPlan
  -> HostRealizationPlan
  -> GeneratorRoutingPlan
  -> WritePlan
  -> LocalRepair
  -> Validation
  -> Final CommitDecision
  -> Workspace Lifecycle

Update Request
  -> CurrentFeatureContext
  -> Update Wizard
  -> requestedChange + UpdateIntent
  -> Blueprint Stage
  -> downstream lifecycle
```

## Stage Responsibilities

| Stage | Responsibility | Must not do |
|------|----------------|-------------|
| Wizard | interpret the ask and emit best-effort semantics | decide host routing, write targets, or final legality |
| clarification sidecars | expose staged blockers and unresolved dependencies | become final execution truth |
| Blueprint stage | decide structure, owned scope, dependency contract, and implementation strategy | decide concrete write targets |
| downstream lifecycle | realize, validate, and commit or block the feature | reinterpret semantic ownership from scratch |

## Clarification Is Now Staged Authority

Current clarification questions may carry different impacts.

### `blocksBlueprint`

Use when:

- the structure is too unclear to plan honestly
- the feature boundary cannot be drawn without another answer

Effect:

- Blueprint should stop
- write is also blocked

### `blocksWrite`

Use when:

- planning may continue
- host write still lacks enough authority to close safely

Current canonical example:

- unresolved cross-feature target/provider identity

### `requiresReview`

Use when:

- the chain may continue in a weak/exploratory state
- review must remain visible

## Current Continuation Rule

The key current change is:

- unresolved cross-feature targets do not automatically hard-stop Blueprint
- if the local shell is still structurally clear, Blueprint may continue and emit `weak`
- the unresolved dependency stays attached to later gates and blocks write/final closure

This is why the block belongs to write authority, not to planning authority.

## Blueprint Stage Rules

Blueprint currently owns:

- `DesignDraft`
- `FeatureContract`
- `dependencyEdges`
- `moduleNeeds`
- `moduleRecords`
- `unresolvedModuleNeeds`
- implementation strategy choice:
  - `family`
  - `pattern`
  - `guided_native`
  - `exploratory`

Current chain rule:

- missing reuse coverage is not, by itself, a lawful reason to stop Blueprint
- unknown mechanics may continue into guided-native or exploratory planning if owned scope is still bounded

## Update-Mode Rules

Update mode is now explicitly context-backed.

It reads:

- `CurrentFeatureContext`
- current source-backed truth when present

It emits:

- `requestedChange: IntentSchema`
- `UpdateIntent`

It must not:

- re-infer ownership from raw prompt text alone
- push adapter-specific merge authority back into Wizard
- silently drop existing cross-feature sidecars during unrelated local-only updates

## Persistence Boundary In The Chain

Current interpretation rule:

- generic `persistent` or `long-lived` wording defaults to runtime/session-long semantics
- only explicit external storage, profile, or cross-match wording should trigger external-persistence governance questions

This boundary is enforced by code-side normalization and clarification logic, not by prompt prose alone.

## Blueprint Status Versus Final Authority

Blueprint status remains:

- `ready`
- `weak`
- `blocked`

Current meaning:

- these are planning-time truth values
- they do not replace the chain-end `CommitDecision`

Current final authority remains:

- dependency revalidation
- host/runtime validation
- final `CommitDecision`

## Summary

The current chain is governance-first:

- Wizard captures semantics
- clarification stages what blocks planning versus what blocks write
- Blueprint decides structure and strategy
- downstream validation and the final gate decide whether the feature may actually land

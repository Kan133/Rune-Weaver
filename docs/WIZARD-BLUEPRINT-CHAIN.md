# Wizard -> Blueprint Chain

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-24
> Read when: aligning current Wizard, clarification, Blueprint, and final-gate stage boundaries
> Do not use for: host-specific routing policy or final lifecycle authority by itself

## Purpose

This document records the accepted chain from Wizard through Blueprint and explains which stages may observe, annotate, gate execution, or make the final lifecycle decision.

## Accepted Chain

```text
User Request
  -> Wizard
  -> IntentSchema
  -> optional clarification sidecars
       - questions
       - semanticPosture
       - clarificationSignals
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
| clarification sidecars | expose `semanticPosture`, unresolved semantic gaps, and `clarificationSignals` | assign feature `ready / weak / blocked`, rewrite Blueprint `commitDecision`, or become final execution truth |
| Blueprint stage | decide structure, owned scope, dependency contract, implementation strategy, and create-readiness | decide concrete write targets or replace the final lifecycle gate |
| downstream lifecycle | realize, validate, and commit or block the feature | reinterpret semantic ownership from scratch |

## Stage 1 Signals, Not Gate Authority

Stage 1 may emit:

- `IntentSchema`
- `semanticPosture`
- clarification questions
- `clarificationSignals`

These are observation and review surfaces.
They must not directly decide feature lifecycle status, short-circuit create after a valid `IntentSchema`, or overwrite `executionAuthority`.

A Stage 1 failure to produce a valid `IntentSchema` is still a real stage failure.
That is different from using clarification observations as the canonical `weak / ready / blocked` authority for the feature.

Stage 1 may still describe:

- what semantic boundary is still unresolved
- whether the unresolved issue is local-structure-facing or late-gate-facing
- whether review visibility must remain attached downstream

The accepted contract is:

- Stage 1 describes uncertainty
- Blueprint/create-readiness decides `ready / weak / blocked`
- late `executionAuthority` decides whether write may continue
- chain-end `CommitDecision` remains final authority

## Current Continuation Rule

The key current change is:

- unresolved cross-feature targets do not automatically hard-stop Blueprint
- if the local shell is still structurally clear, Blueprint may continue and create-readiness may emit `weak`
- the unresolved dependency stays attached to later `executionAuthority` and blocks write/final closure there

This is why the block belongs to late `executionAuthority`, not to Stage 1 observation authority.

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
- create-readiness:
  - `ready`
  - `weak`
  - `blocked`
- assembly-side execution facts:
  - `readyForAssembly`
  - `canAssemble`
  - review visibility that depends on Blueprint-local facts

Current chain rule:

- missing reuse coverage is not, by itself, a lawful reason to stop Blueprint
- unknown mechanics may continue into guided-native or exploratory planning if owned scope is still bounded
- Stage 1 observation fields such as `semanticPosture`, clarification questions, or raw schema uncertainties do not become Blueprint status by themselves

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

Stage 1 observation surfaces are not Blueprint status:

- `semanticPosture` is not `ready / weak / blocked`
- `clarificationSignals` are not write-gate authority
- raw `IntentSchema` uncertainty lists are not, by themselves, final lifecycle truth

Blueprint status remains:

- `ready`
- `weak`
- `blocked`

Current meaning:

- these are Blueprint/create-readiness truth values
- they do not replace the chain-end `CommitDecision`

Current final authority remains:

- late `executionAuthority`:
  - dependency resolution and dependency revalidation
  - host/runtime validation
  - write-gate legality
- final `CommitDecision`

## Summary

The current chain is governance-first:

- Wizard captures semantics
- clarification exposes observation-only `semanticPosture` and `clarificationSignals`
- Blueprint/create-readiness decides structure, strategy, and honest `ready / weak / blocked`
- late `executionAuthority` decides whether write may continue
- downstream validation and the final gate decide whether the feature may actually land

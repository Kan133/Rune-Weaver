# Blueprint Validation

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-20
> Read when: validating or reviewing current Blueprint/Assembly/final-gate truth in the mainline pipeline
> Do not use for: the standalone `blueprint validate` CLI in isolation or as a substitute for final commit gating

## Purpose

This document records the current layered validation chain.

The important shift is:

- validation is no longer just a structural `Blueprint` check
- the real chain now spans blueprint normalization, assembly continuation, synthesis/repair, dependency revalidation, host/runtime validation, and final commit gating

## Current Validation Layers

### 1. Blueprint Normalization

This layer produces:

- `FinalBlueprint.status`
- normalization issues
- blueprint-stage `commitDecision`

Current meanings:

- `ready`
  - planning structure closed strongly enough to continue
- `weak`
  - planning may continue, but review/write limits remain explicit
- `blocked`
  - planning truth itself does not close honestly

Important boundary:

- this is still not the final lifecycle verdict

### 2. Assembly / Resolution Validation

This layer checks:

- selected pattern coherence
- unresolved need carry-forward honesty
- module implementation records
- synthesis-bundle coherence when present

Current honest behavior:

- unresolved needs may remain visible instead of being turned into fake resolved patterns
- review warnings may accumulate here without forcing an immediate hard block

### 3. Synthesis / Repair Validation

This layer checks:

- synthesized artifacts stay inside declared owned scope
- repair stays inside bounded local boundaries
- no repair action widens ownership, routing, or dependency truth

### 4. Dependency Revalidation

This layer checks:

- required provider/consumer contracts still hold
- provider removals or surface changes downgrade or block consumers honestly
- impacted feature truth is carried into the final gate

### 5. Host Validation

This layer checks host-facing write truth such as:

- expected namespaces and files
- generator outputs
- bridge refresh integrity
- adapter-specific validation such as provider export alignment

### 6. Runtime Validation

This layer checks runtime-meaningful outputs when applicable.

Current rule:

- skipped runtime validation does not equal runtime success
- dry-run mode does not claim runtime proof

### 7. Final Commit Gate

The final lifecycle authority is:

- `CommitDecision.outcome`

Current outcomes:

- `committable`
- `exploratory`
- `blocked`

This layer composes:

- blueprint warnings/blockers
- module review reasons
- dependency blockers
- repair blockers
- host/runtime validation failures

## Current `ValidationStatus` Surface

The persisted validation object is staged:

```ts
interface ValidationStatus {
  status: ValidationOutcome;
  warnings: string[];
  blockers: string[];
  blueprint?: ValidationStageStatus;
  synthesis?: ValidationStageStatus;
  repair?: ValidationStageStatus;
  dependency?: ValidationStageStatus;
  host?: ValidationStageStatus;
  runtime?: ValidationStageStatus;
}
```

Current meaning:

- `ValidationStatus` is the reviewable history of the chain
- it is not just a one-shot blueprint validator result

## Review Guidance

When reviewing a current Blueprint/mainline result, ask in this order:

1. did clarification authority already say planning or write was blocked?
2. is Blueprint honest about `ready`, `weak`, or `blocked`?
3. are unresolved needs represented honestly?
4. did synthesis/repair stay within owned scope?
5. do dependency edges still close?
6. did host/runtime validation actually pass?
7. what did the final `CommitDecision` say?

## What This Doc Does Not Mean

This doc is not claiming:

- the standalone `blueprint validate` CLI models the full mainline validation chain
- blueprint status alone decides host write readiness
- old `uiPlan`-era structural rules are still the center of validation truth

## Summary

Current validation is layered.

Blueprint validation matters, but it is only the first honest slice of a longer chain whose final authority is the chain-end `CommitDecision`.

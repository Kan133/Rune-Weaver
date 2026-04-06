# Engineering Guardrails

## Purpose

This document records the engineering guardrails that should keep Rune Weaver from degrading into a multi-layer glue-code mess.

It exists because this project is likely to grow into a medium-sized system with:

- multiple planning layers
- host-specific adaptation
- multiple generator families
- lifecycle maintenance commands
- validation and workspace state

The main risk is not raw code volume.

The main risk is architectural drift.

## Current Risk Profile

Rune Weaver is not at high risk of becoming an algorithmic monolith.

It is at high risk of becoming a layered glue pile if boundaries drift.

Typical failure mode:

- Wizard starts doing Blueprint work
- Blueprint starts doing realization work
- generators start doing routing work
- CLI starts doing executor work
- each maintenance command grows its own pipeline semantics

This is the failure mode the project must actively resist.

## Code Size Expectation

If the current direction continues, the likely long-term size is:

- core product code: roughly `20k - 45k LOC`
- broader system including adapters, generators, lifecycle, validation, helpers: roughly `35k - 70k LOC`

This size is acceptable.

Large code volume alone is not the danger.

Boundary failure is the danger.

## Primary Anti-Patterns

The project should watch for these anti-patterns continuously.

### 1. Boundary Drift

Examples:

- Wizard emitting pattern ids or host implementation decisions
- Blueprint deciding `kv` / `ts` / `ui`
- generators re-deciding realization policy
- CLI commands directly executing write logic that should live lower in the stack

### 2. Parallel Pipelines

Examples:

- create, update, regenerate, rollback each building their own execution model
- separate artifact semantics per command
- separate workspace update logic per command
- separate validation paths per command

### 3. Host Knowledge Leakage

Examples:

- Dota2-specific implementation details spreading into Wizard
- Dota2 API assumptions appearing inside Blueprint
- generator-local Dota2 rules replacing explicit host realization policy

### 4. TS-Only Gravity

Examples:

- assuming every feature eventually becomes TypeScript
- letting the TS generator absorb KV responsibilities
- treating KV as an edge case rather than a first-class realization route

### 5. Schema Drift

Examples:

- contracts exist in docs but implementation writes incompatible artifacts
- module-level selected patterns stop matching global selected patterns
- stage names mean different things across commands

## Guardrails For Coder Tasks

When delegating implementation work to coders or worker agents, the task must explicitly preserve:

### A. Layer Ownership

- Wizard owns intent extraction
- Blueprint owns structural orchestration
- Pattern Resolution owns core pattern selection
- Assembly owns realization-ready module metadata
- Host Realization owns realization class
- Generator Routing owns dispatch
- generators own artifact emission
- Write Executor owns controlled file write behavior

### B. No Silent Pipeline Forks

A coder task must not introduce a parallel mainline for:

- update
- regenerate
- rollback
- validation
- artifact generation

If a helper exists, it must stay a helper.

It must not quietly become a second pipeline.

### C. No Cross-Layer Smuggling

A coder task must not smuggle:

- host realization ids into pattern layers
- generator routing decisions into Blueprint
- write behavior into CLI-only code

### D. Honest Status Semantics

A coder task must not use:

- `success: true` for non-applicable stages unless the skipped/applicable semantics are explicit
- optimistic verdicts when the path is forced, partial, blocked, or requires regenerate

### E. Preserve Ownership Boundaries

A coder task must not widen Rune Weaver ownership beyond:

- `game/scripts/src/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- explicitly allowed bridge points

## Review Questions For Future Work

Every substantial implementation should be reviewed against these questions:

1. Did this task preserve the current mainline, or create a parallel one?
2. Did any layer take on responsibility that belongs to another layer?
3. Did Dota2 knowledge get centralized, or leak outward?
4. Did generator responsibilities become cleaner, or blurrier?
5. Did the task increase determinism and reviewability, or reduce it?

If the answer trends in the wrong direction, the task should be treated as incomplete even if it "works."

## Dota2 CLI Risk

`apps/cli/dota2-cli.ts` is currently one of the highest-risk files in the project.

It is functionally important, but architecturally dangerous because it can easily absorb logic that belongs elsewhere.

Typical risks:

- command-specific pipeline semantics
- command-local validation logic
- command-local workspace updates
- command-local execution branches
- artifact and verdict logic drift

This file must be kept under deliberate pressure to stay thin over time.

## Expected Long-Term Shape

The project should aim for:

- more contracts
- thinner orchestration files
- clearer host policy layers
- smaller command surfaces
- more typed schemas between layers

This is how a medium-sized system stays governable.

## Summary

Rune Weaver can avoid becoming a codebase mess if it keeps enforcing one rule:

Architectural layers must remain real.

The project will become messy not because it has too much code, but because too many responsibilities collapse into the same files.

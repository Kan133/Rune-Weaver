# Dota2 V2 Governance-First Architecture

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-meaningful-implementation-change
> Last verified: 2026-04-18
> Read when: doing Dota2 V2 host work, especially synthesis/repair/dependency behavior
> Do not use for: overriding root baseline docs on cross-host architecture by itself

## Purpose

This document is the current Dota2-specific V2 reference after root baseline ratification.

Use it together with:

- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
- latest Dota2 session-sync

## Dota2-Specific Principle

Dota2 follows the repo-wide V2 principle:

- hard-code feature governance
- do not hard-code all mechanics they are allowed to attempt

Dota2-specific emphasis:

- stay inside owned host namespaces
- use explicit bridge points only
- prefer family/pattern reuse when strong
- continue into synthesis when reuse is weak but target surfaces are clear

## Current Dota2 Chain

Current Dota2 chain:

`IntentSchema -> Blueprint Stage -> Strategy Selection -> AssemblyPlan / ArtifactSynthesis -> HostRealizationPlan -> GeneratorRoutingPlan -> WritePlan -> LocalRepair -> Write Executor -> Host / Runtime Validation -> Final CommitDecision -> Workspace Lifecycle`

## Current Dota2 Strategy Boundary

### `family`

Use when:

- a stable Dota2 feature skeleton already exists
- repeated updates should converge to the same layout

### `pattern`

Use when:

- mechanism tactics are known
- structure is still composed from reusable parts

### `guided_native`

Use when:

- family/pattern confidence is weak
- host target surfaces are still clear enough for owned synthesis

### `exploratory`

Use when:

- reuse is weak or absent
- the system should still attempt a governed owned artifact candidate

## Current Synthesis Surface

Current Dota2 synthesis supports:

- server Lua ability shell
- ability KV definition
- blueprint-declared UI owned skeleton

Current restrictions:

- no new bridge ownership
- no undeclared cross-feature writes
- no undeclared host targets
- no dependency-truth rewrites inside synthesis

## Current Repair Surface

Dota2 repair is now the bounded local repair layer.

It can:

- patch local muscle inside synthesized or templated owned artifacts
- fill UI body or host-local glue inside declared boundaries

It cannot:

- change contracts
- change routing
- change ownership
- widen lifecycle scope

## Dependency Revalidation

Dota2 now uses contract-driven dependency revalidation.

Current behavior:

- provider updates recheck declared consumers
- required surface break blocks provider commit
- optional surface break downgrades consumers to `needs_review`
- impacted feature status is written back into workspace

## Compatibility Notes

Compatibility layers still present:

- old `gap-fill` command name
- old `dota2.exploratory_ability` records for update/regenerate compatibility
- blueprint `ready | weak | blocked` status for CLI/test compatibility

These do not change the current Dota2 authority model:

- repair is not the main generator
- synthetic exploratory pattern is not the primary V2 path
- final lifecycle truth is the final commit decision

## Current Next Work

Current Dota2 next work is not more migration naming.

Current next work is evidence:

- prove templated stability
- prove exploratory/guided-native review-required path
- prove dependency revalidation on real cases
- graduate repeated exploratory outputs into reusable assets when justified

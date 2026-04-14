# Host ABC Worksplit Plan

> Status
> This document is a coordination plan for parallel host work.
> It does not replace the active product execution queue in [CURRENT-EXECUTION-PLAN.md](/D:/Rune%20Weaver/docs/CURRENT-EXECUTION-PLAN.md).

## Purpose

This document defines a practical split for parallel work across:

- A group: continue hardening the Dota2 lifecycle spine
- B group: start Warcraft III / KK host integration
- C group: extract the minimum host-generic contracts needed so B can build without fighting Dota2 coupling

The goal is not broad architecture cleanup.

The goal is to let B move on a second host while A keeps improving the standing Dota2 path.

## Recommendation

Recommend **keeping a dedicated C group**, but keep it intentionally narrow.

Reason:

- today, too much host policy is absorbed inside `adapters/dota2/**`
- if B both extracts generic contracts and builds the new host, B becomes the merge bottleneck
- if A keeps shipping Dota2 polish while B and C both edit the same host-core surfaces, hidden coupling risk rises

So:

- A keeps product momentum
- B owns the new host
- C clears only the structural blockers that B should not have to untangle alone

## Core Rule

C group should do **minimum necessary extraction**, not a full host architecture rewrite.

If an abstraction does not directly help:

1. a second host descriptor exist cleanly
2. a second host realization route cleanly
3. a second host validate / lifecycle path plug in cleanly

then it is probably out of scope for C.

## Worksplit

### A Group

Owns continued Dota2 hardening, especially:

- Dota2 create/update/delete evidence quality
- Dota2 demo flow and acceptance proof
- Dota2 generator improvements that do not change generic host contracts
- Dota2 validation / repair improvements inside Dota2-specific checks

Avoid editing:

- host-generic schema or workspace contracts
- generic realization / routing / write-plan interfaces
- new shared lifecycle contracts

### B Group

Owns Warcraft III / KK host integration, especially:

- host assumptions and target environment truth
- new `adapters/war3` or `adapters/kk-war3`
- new scanner / init / realization / routing / generator / validator implementations
- War3-specific bootstrap, runtime, object-data, and packaging path

B may temporarily use shims while C is extracting shared contracts, but should avoid growing a second pile of Dota2-shaped coupling.

### C Group

Owns only the thin reusable contracts needed by both hosts.

Primary mission:

- move Dota2 from "host implementation plus hidden framework" toward "host implementation on top of explicit shared contracts"

Non-mission:

- rewriting Dota2 generators for style
- redesigning CLI UX
- redoing Panorama or bridge details
- broad codebase cleanup unrelated to second-host enablement

## C Group Extraction Scope

### 1. Host Realization Contract

Extract the generic framework for:

- pattern or module to realization decision
- realization type classification
- host target declaration
- fallback / blocker / confidence structure

Keep host-specific:

- Dota2 target names
- Dota2 rule tables
- Dota2 fallback heuristics

In other words:

- shared: the contract and engine shape
- Dota2-specific: the policy content

### 2. Route / Write-Plan Contract

Current problem:

- `adapters/dota2/assembler/index.ts` mixes write-plan construction with Dota2 namespace and path policy

Target split:

- host-generic write entry model
- host-generic write-plan structure
- host-specific path resolver
- host-specific namespace / target mapping

Shared contract should answer:

- what is being written
- why it is being written
- what kind of artifact it is
- whether it is safe / deferred / blocked

Host-specific layer should answer:

- exact relative path
- exact namespace root
- exact aggregation behavior

### 3. Doctor / Validator Pipeline Contract

Extract a reusable validation pipeline skeleton for:

- run checks
- collect results
- summarize PASS / FAIL / warning
- optionally emit repair guidance / repair plan

Keep host-specific:

- actual checks
- host readiness semantics
- runtime invocation details
- repair operations

Shared contract should standardize result shape, not force shared check content.

### 4. Lifecycle Executor Contract

Extract the lifecycle step skeleton for:

- create
- update
- regenerate
- rollback
- delete

Shared skeleton should cover:

- planning inputs
- governance / safety gate hook points
- write execution hook points
- validation hook points
- workspace update hook points
- artifact / report output shape

Keep host-specific:

- conflict classification
- owned-scope interpretation
- bridge refresh behavior
- write-point repair logic
- host recovery steps

## Suggested Shared Seams

These are the most likely useful additions for C to create:

- `core/host/types.ts`
- `core/host/realization.ts`
- `core/host/write-plan.ts`
- `core/host/validation.ts`
- `core/host/lifecycle.ts`

The exact filenames can differ, but the rule should stay:

- shared contracts live outside `adapters/dota2`
- Dota2 becomes one implementation of those contracts

## Likely File Ownership Boundary

### C Group First-Touch Area

- [core/schema/types.ts](/D:/Rune%20Weaver/core/schema/types.ts)
- [core/workspace/types.ts](/D:/Rune%20Weaver/core/workspace/types.ts)
- new shared host contract files under `core/host/**`
- thin extraction work in [adapters/dota2/realization/index.ts](/D:/Rune%20Weaver/adapters/dota2/realization/index.ts)
- thin extraction work in [adapters/dota2/assembler/index.ts](/D:/Rune%20Weaver/adapters/dota2/assembler/index.ts)
- thin extraction work in Dota2 validation/lifecycle entry points where contract adapters are needed

### B Group First-Touch Area

- new `adapters/war3/**` or `adapters/kk-war3/**`
- new host-specific CLI command path
- new host-specific generators / validators / bootstrap code

### A Group Safe Area

- Dota2-specific generator logic
- Dota2 command UX
- Dota2 demo/evidence flow
- Dota2-specific repair/check logic that does not alter shared contracts

## Sequencing

Recommended order:

1. C extracts shared host descriptor and workspace typing
2. C extracts realization and write-plan contracts
3. B starts new host scanner/init/realization implementation against those contracts
4. C extracts validator/lifecycle skeletons only as needed by B
5. A continues Dota2 hardening on top of the stabilized contracts

Important:

- B does **not** need to wait for all generic contracts to be perfect
- C should unblock B in slices
- avoid a big-bang "generic host framework" phase

## Guardrails

Do not let C expand into:

- general pattern redesign
- generator-family redesign unless blocked by second-host work
- replacing all Dota2 names with abstract names in one sweep
- rewriting working Dota2 behavior without evidence need

Do let C do:

- explicit type widening where Dota2 is hardcoded
- extracting small interfaces and adapters
- isolating host-specific policy tables
- reducing direct Dota2 assumptions in core objects

## Done Criteria

### C Group Done When

- B can add a second host without editing Dota2 internals for every step
- Dota2 still runs with no intended behavior change
- shared contracts are explicit enough that new host code does not need to copy Dota2 assembler / realization structure verbatim

### B Group Can Proceed Independently When

- host descriptor is not Dota2-only
- write-plan contract is host-generic
- realization/routing can declare non-Dota2 targets

### A Group Should Not Be Blocked By

- War3-specific host work
- broad extraction work outside the thin shared contract layer

## Final Recommendation

Use **A + B + C**.

But keep C small, surgical, and deadline-driven.

If C starts behaving like a general architecture task force, it will slow both A and B.

If C stays focused on four extractions:

1. host realization contract
2. route / write-plan contract
3. doctor / validator pipeline contract
4. lifecycle executor contract

then the split is worth it.

## Lifecycle Slice Update

Current C-group lifecycle extraction status:

- a first maintenance-lifecycle slice has already been extracted
- shared lifecycle base types now exist
- a shared artifact builder now exists
- a Dota2 maintenance runner now exists
- `delete`, `rollback`, and part of `update` now reuse that thinner shell

This is enough for the current phase.

The purpose of this slice was:

- reduce copy-paste in maintenance commands
- make future host maintenance flow easier to reason about
- avoid dragging Dota2-specific bridge / validator / plan logic into the shared layer

It was not intended to finish a universal lifecycle framework.

## Lifecycle Priority Reset

After the first extraction slice, we should explicitly lower the priority of `rollback` and `regenerate`.

Reason:

- in game-feature workflows, rollback is rarely the core product value
- true rollback is expensive and difficult without stronger underlying guarantees
- current rollback semantics are not well-backed by Git-like source control assumptions
- regenerate can still be approximated later through re-planning / re-generation from current intent and feature state
- continuing to optimize rollback/regenerate right now would consume C-group bandwidth that is better spent on second-host enablement

So the current recommendation is:

- do not continue lifecycle extraction mainly for rollback/regenerate
- do not treat rollback as a current strategic differentiator
- do not let C-group spend the next slice polishing rollback semantics

Instead:

- keep the extracted maintenance shell
- stop the lifecycle refactor at this thin boundary for now
- redirect C-group effort toward host-generic contracts that help B-group

## Updated C-Group Next Step

After the current maintenance-lifecycle slice, C-group should prefer:

1. host realization contract
2. route / write-plan contract
3. host descriptor / workspace host typing

and should not prioritize:

1. deeper rollback work
2. regenerate productization
3. a universal maintenance command framework

## Practical Rule

If a proposed C-group task mainly helps:

- `rollback`
- `regenerate`
- or maintenance-path completeness for completeness's sake

then it is probably not the next best use of C-group time.

If a proposed C-group task mainly helps:

- second-host onboarding
- host-generic contract clarity
- reducing Dota2-only assumptions in shared surfaces

then it is probably on the right path.

## Current C-Group Status

The following thin slices are now in place:

1. maintenance lifecycle shell
2. host realization contract, first slice
3. route / write-plan contract, first slice
4. host descriptor / workspace host typing, first slice
5. host registry / known-host-kind utility, first slice

## Shared Gap-Fill Contract

The gap-fill decision and approval flow is now a shared core mechanism.

War3 / KK work should reuse `core/gap-fill` for:

- patch plan decision
- risk level semantics
- reason codes
- approval record creation
- approval record validation

B group should provide host-specific pieces only:

- War3 boundary provider
- War3 target file resolver
- War3 approval persistence or UI surface
- War3 apply wiring
- War3 post-apply validation

B group should not create a separate War3-specific meaning for `auto_apply`, `require_confirmation`, or `reject`.

If War3 needs a new approval sink, shared artifact shape, or host-generic approval persistence contract, that belongs to C group as a small extraction slice.

### Host Descriptor / Workspace Typing Slice

Completed in this slice:

- added shared host core types in [core/host/types.ts](/D:/Rune%20Weaver/core/host/types.ts)
- moved `HostDescriptor` ownership out of [core/schema/types.ts](/D:/Rune%20Weaver/core/schema/types.ts) and onto shared host types
- widened workspace `hostType` from Dota2-only literal to host-generic string in [core/workspace/types.ts](/D:/Rune%20Weaver/core/workspace/types.ts)
- updated workspace normalization and validation in [core/workspace/manager.ts](/D:/Rune%20Weaver/core/workspace/manager.ts) so non-Dota2 host kinds are structurally allowed
- updated wizard host normalization in [core/wizard/intent-schema.ts](/D:/Rune%20Weaver/core/wizard/intent-schema.ts) so host kind is no longer constrained to Dota2-only literals

Intentionally not done in this slice:

- no host registry yet
- no shared scanner contract yet
- no shared initializer contract yet
- no change to Dota2 scanner / init implementation behavior
- no change to generator family or realization-type schema

Why this boundary is useful:

- B-group now has a host-generic type foothold at the schema and workspace layer
- A-group should see no Dota2 behavior change from this slice
- C-group avoided pulling scanner/init internals into a premature abstraction

### Recommended Next Slice

The next C-group slice should likely be one of:

1. a small host registry / known-host-kind utility under `core/host/**`
2. a thin scanner contract for host detection result shape
3. a thin initializer contract for host bootstrap result shape

Recommendation:

- do `host registry / known-host-kind utility` first
- then only add scanner / initializer contracts when B-group has a concrete War3/KK implementation pressing on them

## Host Registry Slice Update

Completed in this slice:

- added a host-generic registry in [registry.ts](/D:/Rune%20Weaver/core/host/registry.ts)
- kept the registry intentionally small: register, inspect, and known-host-kind queries only
- moved Dota2 host registration to the adapter side in [host-registration.ts](/D:/Rune%20Weaver/adapters/dota2/host-registration.ts)
- aligned Dota2 scanner and host-status `hostType` typing to shared `HostKind` in [project-scan.ts](/D:/Rune%20Weaver/adapters/dota2/scanner/project-scan.ts) and [host-status.ts](/D:/Rune%20Weaver/adapters/dota2/scanner/host-status.ts)

Intentionally not done in this slice:

- no host detector interface yet
- no adapter factory
- no shared scanner orchestration
- no shared initializer orchestration

Why this boundary is useful:

- core now knows about host kinds without knowing Dota2 implementation policy
- adapters can self-register host kinds without pushing adapter details into core
- B-group can add a War3/KK host registration path without waiting for scanner/init abstraction

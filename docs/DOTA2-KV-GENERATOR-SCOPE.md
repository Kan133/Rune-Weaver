# Dota2 KV Generator Scope

## Purpose

This document defines the initial scope of `Dota2KVGenerator`.

Its purpose is to make one architectural point explicit:

- Dota2 KV output is not a special case of TypeScript generation
- it needs its own generator boundary

This document defines what `Dota2KVGenerator` should and should not do in v1.

## Position In Pipeline

`HostRealizationPlan -> Generator Router -> Dota2KVGenerator -> Write Plan`

The KV generator consumes realization units that were already routed to KV-oriented output.

It should not decide realization policy for itself.

## Why A Separate KV Generator Is Required

KV output differs from TS output in:

- host semantics
- file format
- merge/write behavior
- validation path
- review surface

Therefore a single generic generator should not be expected to absorb KV generation as a minor branch.

## Core Responsibility

`Dota2KVGenerator` is responsible for emitting Dota2 host-native static configuration artifacts for realization units routed to KV.

In v1, it should focus on:

- ability shell/static config
- static ability properties
- static ability specials
- other low-risk host-native configuration that is clearly KV-first

## v1 Scope

The current recommended v1 scope includes:

- ability-side KV outputs
- cooldown
- mana cost
- cast range
- behavior flags
- target/team/type flags
- other clearly static ability properties

If a unit is routed as `kv+ts`, the KV generator should emit only the KV side of that realization.

The runtime side remains the responsibility of the TS generator.

## Out Of Scope For v1

The KV generator should not initially be responsible for:

- broad hero package generation
- item package generation
- full arbitrary KV patching across unrelated user-owned files
- realization decision making
- runtime gameplay logic
- Panorama/UI output
- freeform merge of arbitrary host-native config outside project-owned scope

These may be added later only after the first realization path is stable.

## Relationship To Host Realization

The KV generator should trust the incoming realization route.

It may validate that the routed unit is sensible for KV output, but it should not replace Host Realization by deciding:

- whether something should really be `kv`
- whether something should be downgraded/upgraded to `ts`

If the route looks invalid, it should surface a warning or blocker, not silently reinterpret the unit.

## Relationship To TS Generator

For `kv+ts` units:

- `Dota2KVGenerator` emits the static host-native shell/config side
- `Dota2TSGenerator` emits runtime logic side

These outputs should later be combined by routing/write planning, not by one generator swallowing the other.

## Input Expectations

The KV generator should receive:

- a realization unit already routed to KV output
- host target info
- enough structural metadata to emit reviewable config

It should not require:

- raw user prompt
- freeform pattern resolution
- unrestricted host scanning

## Output Expectations

The KV generator should emit:

- generated KV artifacts or KV write-target candidates
- generator summary
- warnings/blockers if routed input cannot be safely expressed as KV

It should not emit:

- TS runtime files
- UI files
- final write execution

## Ownership Boundary

The KV generator must respect the Rune Weaver ownership boundary.

It should only participate in emitting host-native config under explicitly allowed RW-managed scope or explicitly permitted integration points.

It must not become a justification for arbitrary mutation of unrelated host KV files.

## Validation Expectations

Good v1 KV generation is:

- conservative
- static-config focused
- reviewable
- aligned with Dota2 host-native strengths

Bad v1 KV generation:

- hides runtime logic inside fake static config
- mutates unrelated host-owned KV surfaces
- expands to hero/item/package generation prematurely
- silently re-decides realization policy

## Future Expansion Candidates

Possible future extensions after v1 is stable:

- broader hero package support
- item package support
- more structured KV merge policies
- richer typed KV output schema
- narrower sub-generators if the single KV generator becomes too broad

These are future upgrades, not current requirements.

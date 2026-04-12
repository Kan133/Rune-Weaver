# Canonical Case: Talent Draw

## Status

- Frozen case spec for upstream product work
- Scope: Rune Weaver product capability validation
- Target host: `dota2-x-template`
- Goal: prove Rune Weaver can accept this case as input and produce code that runs in Dota2

## Purpose

This document freezes a representative medium-complexity gameplay case for Rune Weaver.

It is not a direct implementation ticket for manually writing gameplay code.
It is the canonical truth used to evaluate:

- IntentSchema expressiveness
- Blueprint expressiveness
- Generator coverage and gaps
- Host realization quality
- End-to-end case execution quality inside Dota2

## Product Goal

Rune Weaver should be able to take this case as upstream product input and eventually produce code that:

1. can be generated through the Rune Weaver pipeline,
2. can be written into a Dota2 host,
3. can be launched in Dota2 Tools,
4. and can run as a playable minimum-viable system.

## Canonical User Story

When the player presses `F4`, a three-choice talent selection UI opens.

The system draws 3 non-duplicate candidate talents from the remaining talent pool using rarity weights.

The player chooses 1 talent.

The chosen talent immediately applies its effect and is permanently removed from future draws.

The 2 unchosen talents return to the pool.

If fewer than 3 talents remain, all remaining talents are shown and the empty slots are filled with placeholders.

## Frozen Gameplay Rules

### Trigger

- Input trigger: `F4`
- Availability: always available for the MVP version

### Draw Rules

- Each draw presents exactly 3 slots
- Candidates within the same draw must be unique
- Draw source is the remaining talent pool
- Draw uses rarity-weighted selection

### Selection Rules

- Player may choose exactly 1 talent
- The chosen talent is immediately applied
- The chosen talent is permanently removed from the pool
- The 2 unchosen talents return to the pool

### Insufficient Pool Rule

- If remaining talent count is less than 3, show all remaining talents
- Unfilled slots must display placeholders

### Duplicate Rule

- A selected talent can never appear again in later draws
- Unselected talents remain eligible for future draws

## Frozen Rarity Model

| Rarity | Weight | Card Background | Placeholder Effect |
|---|---:|---|---|
| `R` | 40 | Green | Strength `+10` |
| `SR` | 30 | Blue | Agility `+10` |
| `SSR` | 20 | Purple | Intelligence `+10` |
| `UR` | 10 | Red | All Attributes `+10` |

## Frozen Talent Pool

Each rarity contains 10 unique talent entries.

### IDs

- `R001` to `R010`
- `SR001` to `SR010`
- `SSR001` to `SSR010`
- `UR001` to `UR010`

### Total

- 40 unique talents total

## Frozen MVP Effect Model

Current effects are placeholders only.

They exist to validate Rune Weaver's ability to model:

- pool definition,
- weighted draw,
- UI presentation,
- selection confirmation,
- immediate effect application,
- and permanent removal from future draws.

### Placeholder Effects

- `R` talent selected -> Strength `+10`
- `SR` talent selected -> Agility `+10`
- `SSR` talent selected -> Intelligence `+10`
- `UR` talent selected -> All Attributes `+10`

## Future Extensibility Requirement

This system must be structured so that future talent definitions can be added without redesigning the core system.

Future expansion is expected to support:

- new talent effects,
- richer descriptions,
- effect-specific implementation logic,
- larger or configurable talent pools,
- and content authoring into the same pool model.

This extensibility is a design requirement, but not a requirement for the first runnable MVP.

## Frozen UI Expectations

The MVP UI should show:

- 3 visible card slots
- rarity styling by background color
- talent ID
- talent name
- placeholder effect description
- explicit empty-slot placeholders when fewer than 3 talents remain

The MVP UI does not need:

- premium animation
- polished art
- advanced transitions
- final visual design

## Frozen State Expectations

The MVP system must track:

- all talent definitions
- remaining eligible talent IDs
- selected / owned talent IDs
- current offered choices for the active draw

At minimum, the system must support enough state to ensure:

- selected talents are not offered again
- unselected talents return to the pool
- fewer-than-3 remaining talents still render correctly

## Non-Goals

The following are out of scope for the canonical MVP case:

- gap fill
- regenerate
- rollback
- multi-stage progression design
- balancing tools
- premium animation polish
- multiplayer synchronization polish beyond what is minimally required to run

## Acceptance Bar For "Case Runs"

This case is only considered "run through Rune Weaver" if all of the following are true:

1. Rune Weaver can represent the case as a canonical IntentSchema.
2. Rune Weaver can represent the case as a canonical Blueprint.
3. Rune Weaver can generate a host write plan and code artifacts for the case.
4. The generated artifacts can be written into a Dota2 host.
5. The host can be launched.
6. In Dota2 Tools, pressing `F4` opens the talent UI.
7. The player can choose 1 of 3 candidates.
8. The selected talent effect applies.
9. The selected talent does not reappear on later draws.
10. If fewer than 3 talents remain, empty slots are shown as placeholders.

## Recommended Next Workstreams

The next work should not begin with direct manual gameplay implementation.

It should begin by validating whether Rune Weaver can express and carry this case through its upstream product layers.

### Workstream A: Canonical IntentSchema

Goal:

- hand-author the canonical IntentSchema for this case

Questions to answer:

- Can current IntentSchema express weighted draw?
- Can it express a persistent pool?
- Can it express non-repeat selection behavior?
- Can it express 3-slot UI selection flow?
- Can it express placeholder effects plus future extensibility?

### Workstream B: Canonical Blueprint

Goal:

- hand-author the canonical Blueprint for this case

Questions to answer:

- What subsystems are required?
- What data/state modules are required?
- What UI module is required?
- Where do draw logic and effect application live?
- How should the pool and selection lifecycle be represented?

### Workstream C: Generator Gap Audit

Goal:

- audit the current generator against the canonical Blueprint

Questions to answer:

- Which parts can current generators already emit?
- Which parts are missing?
- Which parts are partially supported?
- What is the minimum product capability gap to close?

## Parallelization Guidance

The following workstreams may run in parallel after this spec is frozen:

1. Canonical IntentSchema authoring
2. Canonical Blueprint authoring
3. Generator gap audit

Parallelism rule:

- All three must use this document as the canonical case truth.
- None of them may silently redefine gameplay rules.
- Any mismatch against this spec must be surfaced explicitly.

## Decision

This document is now the authoritative frozen case definition for the Talent Draw system.

Later prompts, plans, audits, or implementation proposals should treat this file as the canonical source of truth unless a deliberate case revision is approved.

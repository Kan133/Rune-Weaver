# Talent Draw Implementation Plan

## Status

- Target case: frozen
- Execution mode: product capability push
- Goal: make Rune Weaver produce a runnable Dota2 Talent Draw system end-to-end

## Purpose

This document defines how Rune Weaver should advance from frozen case specification to a runnable Dota2 implementation for the Talent Draw case.

The goal is not manual feature coding as the primary delivery path.

The goal is to make Rune Weaver itself capable of:

1. representing the case correctly,
2. producing the right intermediate structures,
3. generating the necessary code artifacts,
4. writing them into a Dota2 host,
5. and launching a runnable result.

## Canonical Inputs

This plan assumes the following inputs are authoritative:

- `/D:/Rune Weaver/docs/talent-draw-case/CANONICAL-CASE-TALENT-DRAW.md`
- `/D:/Rune Weaver/docs/talent-draw-case/A-intentschema-audit.md`
- `/D:/Rune Weaver/docs/talent-draw-case/B-blueprint-audit.md`
- `/D:/Rune Weaver/docs/talent-draw-case/C-generator-gap-audit.md`

## Core Product Principle

The Talent Draw case should run through Rune Weaver itself.

Allowed:

- Rune Weaver internal LLM support for bounded local completion
- LLM assistance for text/content completion inside already-correct structure
- LLM assistance for small implementation branches inside pre-defined module boundaries

Not allowed:

- manual gameplay implementation as the primary path
- human-authored structure replacing Rune Weaver output
- human patching of core system wiring after generation
- human-coded state architecture that Rune Weaver cannot itself produce

## Strict Quality Bar

This case is only considered successful if Rune Weaver itself produces the system structure.

It is not enough for a human to:

- write the runtime state model,
- wire UI/server flow by hand,
- or manually add the pool mutation logic after generation.

The acceptable role of LLM assistance is:

- fill content within an already-defined contract,
- not invent the contract itself.

## Product Positioning

The Talent Draw case is a medium-complexity capability benchmark.

It is intended to validate that Rune Weaver can move beyond micro-features and produce a runnable small gameplay system with:

- input,
- persistent session state,
- weighted pool logic,
- UI selection,
- effect application,
- and state mutation across repeated use.

## Frozen MVP Runtime Semantics

### Talent Definitions

Talent definitions are immutable catalog data.

They contain:

- talent id
- rarity
- name
- description
- effect definition

These definitions are never deleted during runtime.

### Pool State

"Permanent removal" means:

- remove the selected talent from the current session's remaining eligible pool
- add the selected talent to the player's owned list

It does **not** mean deleting the static talent definition.

### MVP Persistence Scope

For the first runnable version, "permanent" means:

- permanent within the current match / session

Cross-session persistence is not required for the first runnable version.

## Non-Negotiable Capability Requirements

Rune Weaver must be able to generate the following as product capability, not as manual patchwork:

1. talent catalog definition structure
2. runtime pool state model
3. F4 trigger wiring
4. weighted draw from remaining pool
5. three-slot UI presentation
6. selection callback path
7. selected talent effect application
8. selected talent removal from remaining pool
9. unselected talent return-to-pool behavior
10. placeholder slots when fewer than three talents remain

## Acceptable LLM Assistance Boundary

LLM assistance is allowed only inside already-correct structure.

### Allowed

- generating talent entry lists from a fixed schema
- drafting placeholder descriptions for talents
- expanding repeated mappings inside fixed templates
- filling effect mapping tables from a fixed contract
- completing UI copy or card labels

### Not Allowed

- deciding what runtime state model should exist
- deciding how pool mutation works
- deciding how UI and server communicate
- inventing Blueprint structure for the case
- inventing module boundaries after generation has already failed

## True Bottleneck Areas

Based on the A/B/C audits, the likely bottlenecks are:

### Bottleneck 1: Runtime State Model

Rune Weaver needs a productized way to represent:

- `talentDefinitions`
- `remainingTalentIds`
- `ownedTalentIds`
- `currentChoices`

This is the most important structural requirement.

### Bottleneck 2: Selection Flow Semantics

Rune Weaver needs a structured way to generate the selection lifecycle:

1. draw candidates
2. show candidates
3. receive selection
4. apply effect
5. mutate pool state
6. clear current offer

### Bottleneck 3: Fixed-Slot UI Semantics

Rune Weaver needs a productized way to generate:

- three fixed UI slots
- placeholder rendering when fewer than three options remain

### Bottleneck 4: Effect Mapping

Rune Weaver needs to generate a bounded effect mapping for:

- `R -> strength +10`
- `SR -> agility +10`
- `SSR -> intelligence +10`
- `UR -> all attributes +10`

This does not require a general talent DSL in the first runnable version.

## Recommended Execution Strategy

The implementation should proceed in layers.

### Layer 1: Product Structure

Make sure Rune Weaver can represent the case without manual structural rescue.

Required outcomes:

- canonical IntentSchema contract is sufficient
- canonical Blueprint contract is sufficient
- pattern contracts can express required runtime semantics

### Layer 2: Generator Capability

Make sure Rune Weaver can generate the required structure.

Required outcomes:

- server state model generation
- selection flow generation
- UI selection modal generation
- effect mapping generation

### Layer 3: Host Realization

Make sure Rune Weaver can write the case into a Dota2 host and launch it.

Required outcomes:

- files generated and written
- host build path valid
- launch path valid

### Layer 4: Runtime Validation

Make sure the generated result works in Dota2.

Required outcomes:

- F4 opens UI
- three slots render
- selection works
- effect applies
- selected talent does not reappear
- placeholders render when remaining < 3

## Concrete Implementation Phases

### Phase 1: Lock Structural Contracts

Goal:

- remove ambiguity in Rune Weaver's internal representation

Must complete:

1. settle the runtime state model
2. settle the selection flow mutation semantics
3. settle the fixed-slot UI semantics

Exit criteria:

- no structural ambiguity remains in how the case is supposed to work

### Phase 2: Productize Required Pattern Semantics

Goal:

- ensure the necessary patterns express the case without manual structure patching

Must complete:

1. `rule.selection_flow` can express:
   - choice count
   - selected mutation
   - unselected policy
   - effect dispatch
2. `ui.selection_modal` can express:
   - fixed slot count
   - placeholder behavior
3. pool/state contract can express:
   - remaining ids
   - owned ids
   - current choices

Exit criteria:

- the case can be represented through productized patterns and contracts

### Phase 3: Generator Support

Goal:

- make generator output the required code paths

Must complete:

1. server-side state model generation
2. server-side weighted draw generation
3. selection event handling generation
4. effect mapping generation
5. UI card rendering generation
6. placeholder rendering generation

Exit criteria:

- Rune Weaver can emit a first runnable artifact set for the case

### Phase 4: Host Write and Runtime Verification

Goal:

- prove the generated case actually runs

Must complete:

1. host write
2. launch
3. Dota2 runtime validation

Exit criteria:

- the generated Talent Draw case is playable in Dota2 Tools

## Minimum Productized State Model

The first runnable version should productize a state model equivalent to:

```ts
interface TalentDefinition {
  id: string;
  rarity: "R" | "SR" | "SSR" | "UR";
  name: string;
  description: string;
  effectType: "str" | "agi" | "int" | "all";
  effectValue: number;
}

interface TalentDrawState {
  remainingTalentIds: string[];
  ownedTalentIds: string[];
  currentChoiceIds: string[];
}
```

This is a product target, not a manual patch instruction.

Rune Weaver should be able to produce an equivalent structure itself.

## What To Avoid

Do not solve this case by:

- manually writing the runtime pool model
- hand-coding the full selection flow
- manually wiring the UI modal after generation
- manually injecting effect application into generated files
- treating post-generation hand edits as the primary path

These may be useful for debugging, but they do not count as product capability completion.

## What Counts As First Runnable Success

The first runnable Talent Draw version is successful only if:

1. the structure comes from Rune Weaver output,
2. the generated code runs in Dota2,
3. the user can press `F4`,
4. a three-choice talent UI opens,
5. one option can be selected,
6. the effect applies,
7. the selected talent no longer appears in later draws,
8. unselected talents remain eligible,
9. fewer-than-three remaining talents produce placeholders.

## Recommended Next Action

Proceed into a true implementation planning round focused on productized structure, not manual feature coding.

The next implementation round should answer:

1. which state contract Rune Weaver will own,
2. which pattern contracts must be extended first,
3. which generator responsibilities must be added,
4. and what the smallest end-to-end runnable milestone is.

## Final Position

The Talent Draw case should be used as a benchmark to make Rune Weaver better at real system generation.

It should not be "made to work" primarily by manual coding.

Rune Weaver may use internal LLM assistance for bounded local completion, but the core system structure must remain productized and generated by Rune Weaver itself.

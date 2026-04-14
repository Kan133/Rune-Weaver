# Rune Weaver MVP Boundary

> ⚠️ **此文档已归档 (ARCHIVED)**
> 
> **状态**: 已过时  
> **归档日期**: 2026-04-11  
> **替代文档**: [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md), [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md)
> 
> 本文档描述的 MVP 边界定义已被更完整的产品和执行基线文档取代。

---

## Purpose

This document captures two near-term architectural decisions for Rune Weaver:

1. how to stay Dota2-first for MVP without making the whole product Dota2-shaped
2. how to handle personalization before introducing full code-level gap fill

It is a staging document for the later `PRODUCT.md` and `ARCHITECTURE.md`.

---

## Position

Rune Weaver should be built as a `Dota2-bound MVP` on the output side, but not as a `Dota2-only architecture` at the core.

That means:

- the first working end-to-end path is allowed to target Dota2 only
- the core orchestration model should not assume Dota2 as the only host forever
- Dota2-specific concerns should be isolated behind an adapter boundary

This gives us a practical MVP while preserving a migration path to later hosts.

---

## Core Question

The MVP is not trying to prove:

`an LLM can freely write arbitrary game code`

The MVP is trying to prove:

`natural language can be clarified into a structured intent, resolved into reusable patterns, assembled into a concrete game feature, and validated inside a real host`

That distinction matters. If we optimize for the first statement too early, the system becomes prompt-heavy and brittle. If we optimize for the second, we get a product.

---

## Architectural Split

### Core Layer

The following parts should be host-agnostic as much as possible:

- CLI conversation shell
- intent classification
- wizard dialogue orchestration
- `IntentSchema`
- `Blueprint`
- pattern catalog abstraction
- retrieval orchestration
- assembly pipeline orchestration
- validation pipeline orchestration
- execution report / diff report model

These layers should talk in neutral concepts such as:

- `resource_system`
- `input_binding`
- `effect`
- `ui_surface`
- `selection_flow`
- `data_pool`
- `rule`

They should avoid directly encoding Dota2-only symbols where possible.

### Dota2 Adapter Layer

The following parts should be explicitly Dota2-bound for MVP:

- Dota2 knowledge base
- Dota2 pattern implementations
- Dota2 pattern metadata extensions
- Dota2 assembler
- Dota2 validator
- Dota2 project scanner
- Dota2-specific UI wizard knowledge
- Dota2-specific output targets such as TypeScript, Panorama, KV, wiring

This adapter is where host-specific terms are acceptable:

- Panorama
- modifier
- ability
- net table
- custom game event
- KV
- x-template integration

### Practical Directory Direction

The exact directory names can change later, but the responsibility split should look like this:

```text
core/
  cli/
  wizard/
  schema/
  blueprint/
  pipeline/
  pattern-catalog/
  retrieval/
  validation/

adapters/
  dota2/
    knowledge/
    patterns/
    assembler/
    validator/
    scanner/
    ui-wizard/
```

For MVP, most implementation work will still happen under the Dota2 adapter. The point is not code motion for its own sake. The point is to keep the interfaces clean.

---

## Why Not Make Everything Dota2-Specific

If the whole system is shaped around Dota2 from day one:

- `IntentSchema` will become polluted with host-specific nouns
- blueprint nodes will stop being portable
- pattern retrieval will mix business meaning with engine details
- later migration will require rethinking the product, not just adding an adapter

If the whole system is made fully abstract too early:

- MVP velocity drops
- every decision gets delayed behind premature generalization
- nothing reaches a real executable target

So the rule is:

`abstract the orchestration, bind the execution`

---

## Personalization Without Full Gap Fill

The main concern is valid:

If we do not allow any gap fill, how do we satisfy user-specific requests?

The answer is to satisfy personalization in stages, from most stable to least stable.

### Layer 1: Wizard Clarification

A large portion of "personalization" is not code generation difficulty. It is unresolved requirement ambiguity.

Examples:

- is the draw flow `3 choices` or `5 choices`
- is the selection modal centered or docked
- does rarity affect weight only, visuals only, or both
- is the dash direction based on cursor, target, or facing
- is the resource visible all the time or only on trigger

These should be clarified in dialogue and stored in structured fields, not left for free-form generation later.

### Layer 2: Parameterized Patterns

Many variations are not unique logic. They are pattern parameters.

Examples:

- `selection_modal(choiceCount=3, layout=card_tray, anchor=center)`
- `weighted_pool(rarityTiers, duplicatePolicy, pityRule)`
- `dash(direction=cursor, speed=1600, invulDuration=0.4)`

If the parameter surface is designed well, many "custom" requests stop needing code generation.

### Layer 3: Structured Extension Points

When patterns are not expressive enough, the next step should not be arbitrary host code generation.

The next step should be constrained extension points such as:

- formulas
- condition expressions
- rule fragments
- effect selection tables
- style tokens
- mini DSL blocks

Example:

```json
{
  "trigger": "on_draw",
  "condition": "rarity == 'SSR' && player_level >= 10",
  "action": "grant_bonus_draw"
}
```

This still allows meaningful variation, but keeps validation realistic.

### Layer 4: Code-Level Gap Fill

Only after the previous three layers are insufficient should we allow code-level gap fill.

This is the most expensive and least stable path, so it should be the last one, not the first one.

---

## Gap Fill Strategy

### Phase 0: No Gap Fill

Goal:

- prove that wizard + schema + blueprint + parameterized patterns + assembler + validator can already solve a meaningful set of Dota2 features

Allowed:

- structured clarification
- parameterized pattern selection
- UI design spec generation

Not allowed:

- arbitrary host code generation inside templates

Success criterion:

- common Dota2 MVP scenarios can run end-to-end without manual edits

### Phase 1: Constrained Gap Fill

Goal:

- support tail-end customization without opening arbitrary code generation

Allowed outputs:

- formulas
- small condition DSL
- effect routing choices
- style fragments
- structured rule snippets

Requirements:

- explicit input schema
- explicit output schema
- validator coverage
- fallback behavior when invalid

Success criterion:

- uncommon but still structured requests can be satisfied without breaking system stability

### Phase 2: Code-Level Gap Fill

Goal:

- support genuinely novel mechanics that cannot be expressed through existing patterns or DSLs

Requirements:

- explicit extension region
- hard constraints on inputs and outputs
- bounded token budget
- post-generation validation
- retry / rejection path
- clear auditability in output

This phase should be introduced only after the Dota2 MVP already proves stable on Phase 0 and some Phase 1 cases.

---

## Recommended MVP Scope

The first Rune Weaver MVP should support these intent classes in Dota2:

1. `micro-feature`
2. `standalone-system`
3. `cross-system-composition`

Examples:

- micro-feature: a single dash skill, a buff, a cooldown-driven trigger
- standalone-system: a talent draw system, a crafting system, a loot pool
- cross-system-composition: an input + resource + effect + UI feature such as psionic dash

This is enough to validate the product direction without requiring total generality.

---

## Working Rule For Current Development

For the next stage of development, use these rules:

- keep the user-facing MVP target as Dota2
- keep the core models host-lean
- prefer wizard clarification over post-hoc code generation
- prefer pattern parameters over gap fill
- prefer structured extension points over arbitrary code
- treat code-level gap fill as a later capability, not a foundational one

---

## Immediate Follow-Up Documents

This document should be followed by:

1. `PRODUCT.md`
   - product definition
   - user promise
   - MVP scope
   - non-goals

2. `ARCHITECTURE.md`
   - system layers
   - core vs adapter responsibilities
   - end-to-end flow
   - schema and blueprint role split

3. `SCHEMA.md`
   - `IntentSchema`
   - `Blueprint`
   - extension point model
   - validation contracts

# Dota2 TS And Lua Authoring Paths

> Status Note
> This document is an active technical reference for the TS/Lua authoring-path distinction in Dota2.
> It is a boundary explanation, not a lifecycle-status or delivery-status document.

## Purpose

This document explains why Rune Weaver keeps both `dota2-ts` and `dota2-lua` generator families for Dota2.

The key point is:

- Dota2 does not have two final runtime languages in this architecture
- the host still ends up executing Lua
- the distinction is between two authoring paths, not two runtime targets

This document exists to prevent future confusion such as:

- "if TS can compile to Lua, why keep a Lua generator at all?"
- "should everything just be TS by default?"
- "is Lua generator only a temporary workaround?"

## The Short Answer

For Dota2, Rune Weaver currently supports two different ways to author host logic that ultimately runs as Lua:

- `dota2-ts`: author in TypeScript, then go through the TS-to-Lua toolchain
- `dota2-lua`: author directly as Lua

So the real distinction is not:

- TypeScript runtime vs Lua runtime

It is:

- indirect Lua authoring path via TypeScript
- direct Lua authoring path

## Why "Just Compile TS" Is Not The Whole Story

It is true that the current Dota2 TS path eventually compiles to Lua.

But that does not mean TS and direct Lua are architecturally interchangeable.

They differ in at least four important ways:

### 1. Source-of-truth shape

The TS path treats TypeScript as the source authoring medium.

That means:

- the generator emits TS-oriented source structure
- the project depends on the TS/x-template/tstl toolchain
- downstream validation includes TS-to-Lua compilation checks

The Lua path treats the final Lua file shape as the source authoring medium.

That means:

- the generator emits the host-native Lua structure directly
- no intermediate TS authoring layer is required for that route
- the code can be shaped around native `ability_lua` expectations from the start

### 2. Host-native fidelity

Some Dota2 mechanics are naturally expressed as native Lua ability/modifier files.

Typical examples:

- `ability_lua`
- same-file ability + modifier
- narrow buff / DOT / stun-style native modifier behavior

For these cases, direct Lua generation can be more natural because it matches the host's native shape directly.

If the system forces those mechanics through TS first, it may still work, but it introduces one more authoring translation layer between:

- intended host-native structure
- generated source structure
- final compiled runtime structure

### 3. Infrastructure dependency

The TS path depends more heavily on:

- TypeScript project structure
- x-template scaffolding
- TypeScriptToLua toolchain
- adapter assumptions around TS-oriented runtime organization

The Lua path depends more heavily on:

- direct Lua emission rules
- host-native file placement
- native ability/modifier structure rules

So even when both paths end as Lua, they are not equivalent operationally.

### 4. Responsibility boundary

The TS path is better for some kinds of logic.
The Lua path is better for others.

If Rune Weaver collapses both into "everything is just TS that compiles to Lua", it loses an important architectural boundary:

- which mechanics are best treated as orchestration/runtime flow
- which mechanics are best treated as native host ability shapes

That boundary matters for:

- routing
- generator choice
- validation
- maintenance expectations

## What The TS Path Is Good At

`dota2-ts` should be preferred when the logic is better understood as orchestrated runtime behavior.

Typical cases:

- input handling
- selection flow
- weighted pool orchestration
- shared logic
- UI/server coordination
- bridge-driven event flow

These are cases where:

- the existing TS-oriented infrastructure is mature
- compilation and validation are already well understood
- the logic is not primarily about matching one native `ability_lua` file shape

In other words:

- TS path is usually better for orchestration-heavy logic
- TS path is not "better because TS is more modern"
- it is better because that implementation family already has stronger infrastructure in the current project

## What The Lua Path Is Good At

`dota2-lua` should be preferred when the host-native Lua file shape is the more truthful authoring target.

Typical cases:

- `dota2.short_time_buff`
- same-file ability + modifier generation
- native `ability_lua` style abilities
- narrow host-native modifier templates

These are cases where direct Lua generation is valuable because:

- the host shape itself is already Lua-native
- the intended file structure is explicit
- forcing TS authoring first adds less value than it does for orchestration-heavy logic

In other words:

- Lua path is usually better for native ability-form logic
- it is not just "TS path but skipping compile"
- it is a different authoring choice with a different source-of-truth shape

## What This Means For Routing

Host Realization and Generator Routing should not think in terms of:

- "which language does Dota2 run?"

They should think in terms of:

- "which authoring path best fits this host-native mechanic?"

That is why a routed output may choose:

- `dota2-ts`
- `dota2-lua`
- `dota2-kv`
- `dota2-ui`

even though Dota2 runtime still converges on Lua for gameplay execution.

## Why Both Paths Must Coexist

If Rune Weaver only keeps the TS path, the system risks:

- overfitting all mechanics into TS-oriented authoring
- losing host-native expressiveness for direct Lua cases
- making native ability/modifier generation more awkward than necessary

If Rune Weaver only keeps the Lua path, the system risks:

- throwing away useful TS-side infrastructure
- weakening orchestration-heavy generation paths
- making UI/server/shared coordination harder

So the stable answer is not "pick one forever".

The stable answer is:

- keep both authoring paths
- make the boundary explicit
- route by host-fit, not by habit

## Boundary Rule

The same mechanic should not casually exist in both paths without an explicit preference rule.

Otherwise the system will drift into:

- duplicated implementations
- unstable routing
- unclear maintenance ownership
- harder review

The correct question is not:

- "can this be made to work in TS?"

The correct question is:

- "which authoring path is the more truthful, stable, and reviewable fit for this mechanic in Dota2?"

## Practical Rule Of Thumb

Use `dota2-ts` when:

- the mechanic is orchestration-heavy
- it leans on server/shared/UI coordination
- current TS infrastructure materially reduces risk
- the host-native file shape is not itself the main point

Use `dota2-lua` when:

- the mechanic is naturally an `ability_lua` / modifier-lua shape
- same-file Lua structure is the intended host-native form
- direct Lua makes the result simpler and more truthful

## Current Project Boundary

Today, Rune Weaver should be described as:

- TS path: broader and more infrastructure-mature
- Lua path: narrower, but more host-native for specific Dota2 ability cases

This means:

- Lua is not yet a general-purpose framework in the project
- TS is not the universal default for every Dota2 mechanic
- both paths are valid, but for different reasons

## One-Sentence Summary

Rune Weaver keeps both `dota2-ts` and `dota2-lua` not because Dota2 runs two languages, but because the system needs two different authoring paths into the same Lua runtime: one optimized for orchestration-heavy TS-driven generation, and one optimized for native Dota2 Lua ability/modifier generation.

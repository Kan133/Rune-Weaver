# Warcraft III KK 1.29 TSTL Provisional Host Workspace Contract

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: evaluating provisional War3 KK workspace assumptions or planning War3 host contracts
> Do not use for: proof of final War3 host support, official KK template guarantees, or current baseline execution truth

## Purpose

This document defines the best current working assumption for what a KK 1.29 plus TypeScript-to-Lua host workspace should look like.

It exists because B-group now has enough evidence to stop treating War3 host shape as fully unknown, but not enough evidence to claim a KK-proven final workspace model.

The goal is to give Rune Weaver:

- a concrete host-workspace target
- a place to attach host-binding validation
- a cleaner target than PyWC3 for future runtime-facing validation

## Evidence Levels

This contract mixes three evidence levels.

### 1. Publicly observed

These are supported by public references.

- A Warcraft III TypeScript project can be organized as a normal Node / TypeScript workspace.
- A map can live as a folder under a `maps/` directory.
- TypeScript source can live outside the map folder.
- A build step can transpile TypeScript to Lua and update the playable map workspace.
- Editor-generated globals / map definitions can be generated into a definitions area.

Public references:

- `w3ts` docs
- `wc3-ts-template`

Concrete public signals:

- `wc3-ts-template` publicly exposes a project shape with:
  - `maps/map.w3x`
  - `scripts/`
  - `src/`
  - `config.json`
  - `package.json`
  - `tsconfig.json`
- `wc3-ts-template` also explicitly describes:
  - building `w3x` archives from a map folder
  - working in World Editor while coding in TypeScript
  - generating definitions for World Editor globals such as regions, cameras, and preplaced units
- `w3ts` publicly points to `wc3-ts-template` as its template project

Canonical judgment for this evidence layer:

- `wc3-ts-template` is the primary TSTL project-shape reference
- `w3ts` is the primary TS API / wrapper reference

### 2. Community observed

These are supported by public community projects, but are not KK-official documentation.

- Classic Warcraft III Lua authoring is widely treated as a practical map-making path.
- JAPI is used in community Lua toolchains as part of the host capability stack.
- SLK/object-data workflows are treated as part of the content/build path rather than as a separate authoring language layer.
- Final output is still a playable map artifact, commonly a `w3x`.

Public community references:

- `h-lua-sdk`
- `map-luamaker`

Concrete community signals:

- `h-lua-sdk` is described as a Warcraft III Lua library that combines:
  - Lua
  - YDWE Lua engine
  - SLK
  - custom events / framework capability
- `map-luamaker` publicly presents a Lua map-making path and includes a `mylua.w3x` sample artifact plus tool/doc directories

Additional Classic/Lua workflow references now mirrored locally:

- `warcraft-template-classic`
- `warcraft-vscode`
- `lib-stdlib`

Canonical judgment for this evidence layer:

- `warcraft-template-classic` is the clearest Classic Lua project-shape reference
- `warcraft-vscode` is the clearest Classic pack/run/editor workflow reference
- `lib-stdlib` is a supplemental Classic Lua runtime/library reference

### 3. Locally observed

These are supported by current Rune Weaver local evidence.

- A classic War3 map workspace can be recognized from `war3map.*` files.
- Current review/export/validator flow already assumes:
  - a host root
  - a script entry
  - explicit host-binding slots
- PyWC3 sample shows:
  - map-script entry evidence
  - generated definition shapes
  - rect / region shapes
  - handle / unit wrapper shapes

### 4. Inferred for KK 1.29

These are not yet proven by KK public docs or a real KK sample.

- KK 1.29 can run a Lua-backed War3 host path in a way compatible with TypeScript-to-Lua output.
- The most plausible host capability model is Lua plus JAPI support, rather than a separate hidden scripting language layer.
- A KK-usable host workspace can likely still follow a Node / TS / map-folder project shape.
- Rune Weaver should target a generated-Lua handoff into a map workspace rather than direct Jass output.

These points remain inferred and must stay marked as such until validated by a real KK sample or official guidance.

## Non-Goals

This contract does not claim:

- the final KK runtime mechanism
- the exact KK packaging flow
- the exact KK compile command
- that `w3ts` 1.31+ assumptions directly apply to KK 1.29
- that PyWC3 is the target host model

## Core Assumption

Current working assumption:

- the target authoring language is TypeScript only
- the generated runtime script is Lua
- the required host capability is best modeled as Lua plus JAPI support
- the practical working object is still a classic Warcraft map workspace
- the project should include both:
  - map artifacts
  - an external TypeScript source tree

Canonical stack for Rune Weaver planning:

- authoring mainline:
  - `TypeScript -> TypeScriptToLua -> Lua output`
- authoring references:
  - `wc3-ts-template`
  - `w3ts`
- Classic host/workflow references:
  - `warcraft-template-classic`
  - `warcraft-vscode`
  - `lib-stdlib`
- parser/reference only:
  - `war3map`

Explicit non-mainline:

- Python authoring paths such as `PyWC3`

That means the best current host-workspace target is:

- not a pure map folder
- not a pure Node project detached from the map
- but a mixed project containing both

## Provisional Workspace Shape

The best current provisional shape is:

```text
<war3-project>/
  package.json
  tsconfig.json
  config.json
  scripts/
  src/
    main.ts
    features/
    host/
    generated/
      bindings/
  maps/
    <map-name>.w3x/
      war3map.w3i
      war3map.w3e
      war3map.lua
      war3mapunits.doo
      war3map.doo
      war3map.wtg
      war3map.wct
      ...
  tools/
  scripts/
  rune_weaver/
    workspace.json
    derived/
    generated/
      review/
      host-binding/
      previews/
```

This shape is provisional, not final.

It is also intentionally closer to the `wc3-ts-template` side of the ecosystem than to Lua-only or Python-only project shapes.

## Layer Model

The workspace should be understood as four layers.

### 1. Project Layer

Standard TypeScript project files.

Examples:

- `package.json`
- `tsconfig.json`
- build scripts
- generator scripts

### 2. Authoring Layer

Human-authored TypeScript source.

Examples:

- `src/main.ts`
- `src/features/*`
- `src/host/*`

This is the preferred place for Rune Weaver draft insertion and review handoff once the host shape is validated.

### 3. Map Workspace Layer

Classic War3 map artifacts.

Examples:

- `maps/<map-name>.w3x/war3map.w3i`
- `maps/<map-name>.w3x/war3map.w3e`
- `maps/<map-name>.w3x/war3map.lua`
- `maps/<map-name>.w3x/war3mapunits.doo`

This is still the ground truth for map content and editor-side data.

### 4. Rune Weaver Layer

RW-owned derived and generated artifacts.

Examples:

- review packages
- host-binding manifests
- workspace metadata
- grounding caches

## Preferred Script Entry Model

Current preferred model:

- TypeScript source entry should live outside the map folder
- generated Lua should flow into the map workspace
- `war3map.lua` should be treated as emitted host output, not the preferred authoring surface

Why:

- this matches public TSTL project shape better than PyWC3
- it gives Rune Weaver a clearer write target
- it keeps host-binding validation honest

Additional judgment:

- `war3map.lua` should still be treated as output evidence
- Classic Lua project workflow remains important, but it should not replace the TSTL authoring seam
- `warcraft.json` is useful workflow evidence, not yet a required RW file
- for the current RW skeleton package, `warcraft.json` should be treated as deliberate non-adoption for now rather than a missing file to backfill
- for the current RW skeleton package, `maps/demo.w3x` remains an RW review-oriented map path choice and not proof that upstream naming alignment is settled

## Host Binding Expectations

For the current War3 slice, the host workspace should eventually provide reviewable declaration / insertion sites for:

### Runtime Hook

Preferred target:

- a TypeScript host entry or bootstrap file
- targeting a Lua / JAPI-capable runtime path

Fallback evidence:

- map-script entry only

Current local evidence level:

- `map-script-anchor-only`

### Shop Target

Preferred target:

- a generated or authored symbol declaration site for anchored host objects
- targeting a Lua / JAPI-capable runtime path

Examples:

- generated globals bindings
- generated handle bindings
- explicit host symbol registry

Current local evidence level:

- `declaration-shape-only`

### Trigger Area

Preferred target:

- a generated rect / region declaration path
- or a typed helper that materializes region handles from map anchors
- targeting a Lua / JAPI-capable runtime path

Current local evidence level:

- `rect-shape-only`

## What Rune Weaver Should Target Next

Given this provisional contract, Rune Weaver should prefer:

1. validating a TSTL-style host project shape
2. generating review-oriented TypeScript host drafts
3. keeping unresolved host bindings explicit
4. treating `war3map.lua` as output evidence, not the main authoring seam
5. treating JAPI as host capability metadata, not as a separate authoring language

It should avoid:

- deepening PyWC3-specific assumptions
- baking PyWC3 hook semantics into generic War3 contracts
- treating map-script evidence as proof of the final KK host model
- importing any single upstream repo wholesale as the RW host model

## Minimum Expected Files

For a provisional TSTL host workspace, the minimum expected files should be:

### Required

- `package.json`
- `tsconfig.json`
- `maps/<map-name>.w3x/war3map.w3i`
- `maps/<map-name>.w3x/war3map.w3e`

### Strongly preferred

- `config.json`
- `src/main.ts` or equivalent TS entry
- `maps/<map-name>.w3x/war3map.lua`

### Optional but valuable

- generated definitions / globals folder
- host bootstrap helpers
- typed wrappers for regions / units / handles
- an explicit definitions-generation placeholder seam such as `tools/defs-seam.js` targeting `src/generated/bindings`
- a read-only intake seed over review artifacts, so future validator/handoff work can consume a bounded input without implying validated host integration
- a bounded review-package -> probe-input -> probe-summary loop, so War3 can test one narrow downstream consumer without claiming runtime execution or validator integration

## Current Risk Statement

The main risk is now clear:

- Rune Weaver has a plausible public TSTL host shape
- but it does not yet have a KK-proven 1.29 host sample

The strongest current public TSTL references are:

- `w3ts`: https://github.com/cipherxof/w3ts
- `wc3-ts-template`: https://github.com/cipherxof/wc3-ts-template

The strongest current Classic Lua workflow references are:

- `warcraft-vscode`: https://github.com/warcraft-iii/warcraft-vscode
- `warcraft-template-classic`: https://github.com/warcraft-iii/warcraft-template-classic
- `lib-stdlib`: https://github.com/warcraft-iii/lib-stdlib

The strongest current public community Lua/JAPI references are:

- `h-lua-sdk`: https://gitee.com/zmwcodediy/h-lua-sdk
- `map-luamaker`: https://gitee.com/zmwcodediy/map-luamaker

So this contract is useful for planning and validation targeting, but not yet strong enough to claim production host certainty.

Current bounded-lane note:

- the RW TSTL skeleton now reaches a local demo-probe loop through:
  - review package export / validation
  - planning-only probe input build
  - bounded probe-result summary
- this improves downstream review truth, but it is still not KK runtime proof and not a write-ready host path

## Upgrade Path

This document should be tightened when one of the following becomes available:

1. a real KK 1.29 TSTL project sample
2. KK documentation that explains Lua / TS-to-Lua host workflow
3. a verified community skeleton known to run on KK 1.29

When that happens, this document should be updated from:

- provisional inferred contract

to:

- validated KK host workspace contract

## Current Decision Summary

For now, B-group should act as if the intended War3 host workspace is:

- a TypeScript project
- paired with a map-folder workspace
- producing Lua for runtime
- relying on Lua / JAPI host capability rather than Jass authoring
- keeping Rune Weaver outputs in a separate RW-owned area

and should use this upstream interpretation:

- TSTL authoring shape from `wc3-ts-template` + `w3ts`
- Classic host/workflow shape from `warcraft-template-classic` + `warcraft-vscode`
- Classic Lua runtime/library shape from `lib-stdlib`

But B-group must continue to mark the KK-specific runtime mechanism as unverified until real platform evidence arrives.

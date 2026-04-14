# War3 TSTL Skeleton

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: inspecting the current War3 TSTL skeleton or reasoning about War3 host-owned file boundaries
> Do not use for: proof that the full War3 generation path is solved or current multi-host execution truth

## Why this exists

This skeleton exists to give the War3 track a concrete, reviewable host shape without pretending that the full Warcraft III generation path is already solved.

It is a minimal expression of:

- a TypeScript project
- a `maps/<map>.w3x` workspace area
- a Rune Weaver-owned workspace area

This helps the team discuss host boundaries, file ownership, and future handoff targets using a shared, low-risk artifact.

It is also meant to track the public War3 TypeScript ecosystem more closely than the old PyWC3 sample path.

Current public references that influenced this skeleton:

- `w3ts`
- `wc3-ts-template`
- `warcraft-template-classic`
- `warcraft-vscode`

## What it solves

This skeleton gives us:

- a smallest-possible War3 TSTL project layout
- a visible seam between host bootstrap and feature modules
- a placeholder map workspace path
- a placeholder Rune Weaver workspace descriptor
- one example feature module shape for review

It is useful as a host-shape reference and as a future starting point for a more formal War3 path.

## What it does not solve

This skeleton does not solve:

- real build execution
- real TypeScript-to-Lua toolchain wiring
- real map sync or pack/unpack flow
- real KK upload flow
- real KK runtime mechanism details
- formal Rune Weaver generation integration

The current mainline judgment still stands:

- target direction is `TypeScript -> Lua`
- target platform is `KK 1.29`
- target host capability is best treated as `Lua + JAPI`
- target artifact is a `w3x`-oriented workspace
- the exact KK runtime mechanism is still not fully confirmed

Canonical interpretation:

- TSTL authoring shape should follow `wc3-ts-template` + `w3ts`
- Classic workflow shape should be compared against `warcraft-template-classic` + `warcraft-vscode`
- Python authoring paths are not the baseline for this skeleton

## File responsibilities

### `package.json`

Declares a minimal project identity and placeholder scripts. The scripts are intentionally non-authoritative and only describe the intended future seams.

Future tightening should compare this file against `wc3-ts-template`, especially for:

- TSTL dependencies
- build/dev/test script seams

### `tsconfig.json`

Captures the TypeScript side of the intended authoring model. It does not claim that the current repo already has a working TSTL pipeline for this skeleton.

### `config.json`

Holds minimal host-facing configuration and reminds readers that the runtime and packaging details are still provisional.

Future tightening should compare this file against `wc3-ts-template` rather than inventing a fresh config shape.

### `src/main.ts`

Shows the smallest application entry shape. It delegates to host bootstrap instead of putting host logic directly in the entry file.

### `src/host/bootstrap.ts`

Defines the runtime hook seam. It intentionally avoids inventing KK-specific APIs and only shows where host wiring and feature registration would happen.

### `src/features/setupMidZoneShop.ts`

Provides a review-oriented feature placeholder that matches the current War3 probe theme. It stays at the level of intent, guards, and future wiring points.

### `maps/demo.w3x/.gitkeep`

Marks the expected map workspace location without pretending that a real demo map is already committed here.

Current note:

- upstream TSTL template uses `maps/map.w3x`
- Classic Lua template uses `map.w3x`
- RW has not yet decided whether to keep `demo.w3x` or move closer to one of those canonical names

### `rune_weaver/workspace.json`

Defines the smallest Rune Weaver-owned workspace metadata needed to describe the area and map path.

### `README.md`

Explains the directory shape and current limits in a way that is easy to hand across sessions.

## Boundary judgment

This skeleton is a host-shape sample, not a runnable War3 implementation path.

Near-term diff checklist:

- add clearer TSTL build/dev/test seams
- add a definitions-generation placeholder
- decide whether RW wants a `warcraft.json` compatibility note
- keep TS authoring outside the map workspace
- do not replace the TSTL authoring seam with Lua-only or Python-only structure

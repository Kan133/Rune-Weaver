# War3 GitHub Upstream Survey

Last reviewed: 2026-04-14

This note records the current upstream reference set for Rune Weaver's War3 track.

Target lane:

- `war3-classic`
- `kk`
- `1.29`
- `typescript-to-lua`
- `no-jass`

Important rule:

- These repos provide structure and workflow evidence.
- They do **not** by themselves prove KK 1.29 runtime compatibility.

## Canonical Stack

Authoring mainline:

- `TypeScript -> TypeScriptToLua -> Lua output`

Canonical upstream references:

- TSTL authoring reference:
  - `wc3-ts-template`
  - `w3ts`
- Classic Lua host/workflow reference:
  - `warcraft-template-classic`
  - `warcraft-vscode`
  - `lib-stdlib`
- Parser/reference only:
  - `war3map`

Explicit non-canonical lane:

- Python authoring paths such as `PyWC3`

## Repo Survey

### `cipherxof/w3ts`

Tag:

- `TSTL authoring reference`

What it is:

- TypeScript API and handle wrapper layer for Warcraft III maps

Strong signals:

- Top-level TypeScript library layout
- Handle wrappers for `rect`, `region`, `trigger`, `unit`, `player`, and other native shapes
- Explicitly points users to `wc3-ts-template` as the template project

Why it matters for RW:

- Best current reference for typed TS-side host interaction shapes
- Strong fit for the current War3 binding seams:
  - trigger area
  - region/rect handling
  - host-side handle wrappers

Limits / risks:

- Not a project skeleton by itself
- Does not prove Classic 1.29 compatibility on its own
- Does not define pack/run/editor workflow by itself

Judgment:

- Adopt as TS API / wrapper reference
- Do not treat as a complete workspace template

### `cipherxof/wc3-ts-template`

Tag:

- `TSTL authoring reference`

What it is:

- A TypeScript Warcraft III template project built around TSTL + `w3ts`

Strong signals:

- `package.json`
- `tsconfig.json`
- `config.json`
- `src/main.ts`
- `src/war3map.d.ts`
- `scripts/build.ts`, `scripts/dev.ts`, `scripts/test.ts`
- `maps/map.w3x/`

Relevant evidence:

- Uses `typescript-to-lua`
- Uses `w3ts`
- Builds from TS source into a Warcraft map workspace
- Keeps TypeScript source outside the map folder
- Generates / carries definitions for editor globals
- Supports object data manipulation and map archive building

Why it matters for RW:

- Best current public match for RW's intended TSTL authoring shape
- Strongest reference for:
  - mixed project + map-folder layout
  - external TS source tree
  - generated Lua output path
  - definitions generation seam

Limits / risks:

- Public template does not itself prove Classic 1.29 or KK runtime truth
- Current sample includes `war3map.lua` in `maps/map.w3x`, which is a useful shape signal but not a KK proof
- Uses a broader ecosystem than RW currently needs

Judgment:

- Primary authoring reference
- Main source for future `tmp/war3-tstl-skeleton` tightening

### `warcraft-iii/warcraft-vscode`

Tag:

- `Classic Lua host/workflow reference`

What it is:

- VS Code extension and workflow toolset for Warcraft III Lua development

Strong signals:

- Explicit `Create Classic Project`
- Explicit `warcraft.json`
- Explicit commands for:
  - compile script
  - pack map
  - run map
  - open world editor
- Explicit Classic / Reforge toggle support
- Classic-only and non-Reforged macro sections in README

Relevant evidence:

- `warcraft.json` includes `mapdir`, `files`, `jassfile`, and Lua package path
- `jassfile` is described as a Classic-specific control point
- Extension settings include Classic game/editor paths and KK world editor path

Why it matters for RW:

- Best current public reference for Classic Lua project workflow
- Strong fit for documenting:
  - `warcraft.json`
  - pack/run/editor flow
  - Classic-vs-Reforge distinction
  - Lua-only project conventions

Limits / risks:

- This is Lua-first, not TypeScript-first
- It is a tool/workflow reference, not a TSTL template
- KK appears in tooling config, but this still does not prove RW's exact KK 1.29 runtime path

Judgment:

- Adopt as Classic Lua host/workflow reference
- Use for workflow and project-shape guidance, not as the authoring template

### `warcraft-iii/warcraft-template-classic`

Tag:

- `Classic Lua host/workflow reference`

What it is:

- Minimal Classic Warcraft III Lua project template

Strong signals:

- `map.w3x`
- `warcraft.json`
- `src/main.lua`
- `objediting/main.lua`
- `imports/`
- `src/lib/`

Relevant evidence:

- Shows the simplest Classic Lua project shape
- `warcraft.json` points at `map.w3x`
- Lua package path includes local and stdlib-oriented paths
- Keeps source and object-editing scripts outside the packed map root

Why it matters for RW:

- Best current public reference for Classic Lua project boundary and workflow layout
- Useful for the host/workflow half of RW's canonical stack

Limits / risks:

- Lua-only authoring, not TSTL
- No TS build chain
- Does not by itself tell RW how to wire generated TS->Lua output

Judgment:

- Adopt as Classic Lua project-shape reference
- Combine with `warcraft-vscode`, not with `w3ts` directly

### `warcraft-iii/lib-stdlib`

Tag:

- `Classic Lua host/workflow reference`

What it is:

- Lua runtime/library stack for Warcraft III projects

Strong signals:

- Large Lua library tree
- `native`, `oop`, `enum`, `triggers`, `ui`, `objediting`
- Generated native/global wrapper areas

Why it matters for RW:

- Strong evidence that Classic Lua projects commonly rely on library-side wrappers and generated glue
- Useful as a shape reference for future host capability assumptions

Limits / risks:

- Lua runtime/library only
- Not a project skeleton
- Not a TS or TSTL reference
- No direct KK 1.29 proof

Judgment:

- Keep as supplemental Classic Lua library reference
- Do not treat as a primary template

### `invoker-bot/war3map`

Tag:

- `parser/reference only`

What it is:

- TypeScript library for converting between object representations and `war3map` format files

Strong signals:

- TypeScript source and tests
- Support matrix for many `war3map.*` and object data formats
- Useful docs and sample file coverage

Why it matters for RW:

- Good parser/reference comparison point
- Useful for validating file format coverage or future parser ambitions

Limits / risks:

- Not an authoring template
- Not a Classic Lua runtime/workflow template
- Trigger file support is incomplete

Judgment:

- Keep as parser/reference-only evidence
- Do not include in canonical host/workflow stack

## RW Adoption Decision

Use this combined stack:

- Authoring shape:
  - `wc3-ts-template`
  - `w3ts`
- Classic host/workflow shape:
  - `warcraft-template-classic`
  - `warcraft-vscode`
- Supplemental Classic runtime/library reference:
  - `lib-stdlib`
- Parser/reference only:
  - `war3map`

Do not adopt:

- Python authoring paths as the War3 mainline baseline
- any single upstream repo wholesale

## Immediate Follow-Up

The next implementation round should only compare these references against:

- `tmp/war3-tstl-skeleton`
- `docs/hosts/war3/WAR3-KK-TSTL-PROVISIONAL-HOST-WORKSPACE-CONTRACT.md`
- `docs/hosts/war3/WAR3-TSTL-SKELETON.md`

and produce a small, explicit diff list rather than importing external structure directly.

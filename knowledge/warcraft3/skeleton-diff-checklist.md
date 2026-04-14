# War3 Skeleton Diff Checklist

Last reviewed: 2026-04-14

This checklist compares RW's current `tmp/war3-tstl-skeleton` against the upstream canonical stack:

- authoring: `wc3-ts-template` + `w3ts`
- host/workflow: `warcraft-template-classic` + `warcraft-vscode`

Current skeleton path:

- `D:\Rune Weaver\tmp\war3-tstl-skeleton`

## Add to skeleton later

### Authoring / build shape

- add a real build/dev/test script seam rather than placeholder-only scripts
- add an explicit TSTL dependency story
- add a definitions-generation seam for editor globals
- add a clearer generated-Lua output path or output folder note

### Project shape

- decide whether to keep `maps/demo.w3x` or move toward `maps/map.w3x` for upstream compatibility
- add a clearer `scripts/` or `tools/` area if the skeleton is going to represent real build flow
- add a stronger `src/war3map.d.ts` or equivalent definitions placeholder if RW wants to mirror the TSTL ecosystem more closely

### Host/workflow shape

- document `warcraft.json` compatibility or deliberate non-adoption
- document pack/run/editor flow explicitly
- document how RW's generated Lua would relate to a Classic Lua project workflow

## Add to docs contract later

- declare the canonical stack explicitly:
  - `wc3-ts-template` + `w3ts`
  - `warcraft-template-classic` + `warcraft-vscode`
- declare that Python authoring is not the mainline baseline
- declare that Classic/Lua workflow evidence is separate from TSTL authoring evidence
- declare that these references provide structure evidence, not KK 1.29 runtime proof

## Do not adopt directly

- do not copy external project layouts wholesale into `adapters/war3`
- do not adopt `warcraft-vscode` as RW's authoring model
- do not adopt `warcraft-template-classic` as RW's TS authoring template
- do not widen `tmp/war3-tstl-skeleton` into a fully runnable toolchain before contract/docs alignment is done

## Suggested next implementation slice

Only change these areas in the next round:

- `tmp/war3-tstl-skeleton`
- `docs/hosts/war3/WAR3-KK-TSTL-PROVISIONAL-HOST-WORKSPACE-CONTRACT.md`
- `docs/hosts/war3/WAR3-TSTL-SKELETON.md`
- validator/intake/handoff code only if a new documented host/workflow fact must be reflected

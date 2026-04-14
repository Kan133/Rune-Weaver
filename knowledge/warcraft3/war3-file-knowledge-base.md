# Warcraft III File Knowledge Base

> Status
> Decision-oriented knowledge note for Rune Weaver B-group.
> Scope: classic Warcraft III map workspace, not Y3.

## Conclusion Summary

For Rune Weaver B-group, the right first mental model is:

- classic Warcraft maps are still centered on `war3map.*` artifacts
- `.w3x` / `.w3m` are container forms, but B-group should not begin from full pack/unpack automation
- the first working object should be a classic Warcraft map workspace or working directory
- P0 should focus on reading map metadata, terrain, placed objects, and the minimum object-definition files needed for grounding

The practical first goal is not "rewrite every map file".

It is:

- connect a workspace
- parse a small set of source files
- build planar-map and anchor indexes
- leave full write-back and repack for later

## Working Object

The project should treat a classic Warcraft map workspace as the main source of truth.

That workspace is still rooted in classic map artifacts such as:

- `war3map.w3i`
- `war3map.w3e`
- `war3mapunits.doo`
- `war3map.doo`
- `war3map.w3u`
- `war3map.w3a`
- `war3map.w3t`
- `war3mapMisc.txt`
- `war3map.j` or `war3map.lua`

Later, Rune Weaver may support opening a packaged `.w3x` / `.w3m` directly.

That should not be the first dependency for B-group.

## File Priorities

### P0: Must Read Early

#### `war3map.w3i`

Use it for:

- map identity
- map dimensions and bounds context
- player slots and high-level metadata

Why it matters:

- this is the safest place to establish workspace identity
- it gives B-group a stable "which map am I looking at" layer

#### `war3map.w3e`

Use it for:

- terrain grid
- rough height and terrain composition
- first planar-map rendering

Why it matters:

- this is the best P0 input for the rough map view
- B-group does not need high-fidelity rendering at first, only useful spatial grounding

#### `war3mapunits.doo`

Use it for:

- placed units
- placed items
- pre-placed world objects that matter for anchors and interactions

Why it matters:

- this is one of the most important files for turning map space into usable semantic anchors

#### `war3map.doo`

Use it for:

- doodads
- destructibles
- environmental landmarks

Why it matters:

- even if B-group does not parse every doodad feature at first, this file is valuable for landmark extraction

### P1: Important After Grounding Loop Exists

#### `war3map.w3u`

Use it for:

- custom unit definitions
- linking placed objects to edited unit data

#### `war3map.w3a`

Use it for:

- custom ability definitions
- later object-data generation and feature attachment

#### `war3map.w3t`

Use it for:

- custom item definitions

#### `war3mapMisc.txt`

Use it for:

- global gameplay constants
- balance parameters

Why these are P1 instead of P0:

- they matter more for generation and write-back than for the first spatial workbench loop

### P2: Read Later, Not First

These are useful but should not block B-group startup:

- `war3map.w3q`
- `war3map.w3b`
- `war3map.w3d`
- `war3map.w3h`
- `war3map.wct`
- `war3map.wtg`
- `war3map.wts`
- `war3map.imp`
- `war3map.wpm`
- `war3map.shd`

They should be introduced as soon as B-group has a concrete need, not as part of the first slice.

## File Roles for Rune Weaver

### Spatial Grounding Inputs

Primary candidates:

- `war3map.w3e`
- `war3mapunits.doo`
- `war3map.doo`
- `war3map.w3i`

These should feed:

- planar map
- overlay markers
- anchor candidates
- map summary

### Feature Generation Inputs

Primary candidates:

- `war3map.w3u`
- `war3map.w3a`
- `war3map.w3t`
- `war3mapMisc.txt`
- `war3map.j` / `war3map.lua`

These should feed:

- feature grounding context
- generated object-data patches
- generated runtime code

## Recommended Parsing Strategy

### First Principle

Do not start by implementing a complete Warcraft file-format stack from scratch.

Prefer:

- existing format knowledge
- existing libraries
- existing conversion tools

when that reduces risk for the first loop.

### Recommended Practical Approach

#### For P0

Build thin read-only parsers or adapters around the minimum files needed by the workbench:

- `w3i`
- `w3e`
- `war3mapunits.doo`
- `war3map.doo`

The output should be project-owned intermediate JSON-like structures such as:

- `map-summary.json`
- `planar-map.json`
- `anchor-index.json`

#### For P1/P2

For object-definition files and container handling, strongly consider reusing or wrapping mature tooling rather than implementing all binary writers early.

Reason:

- B-group's first milestone is grounding, not perfect round-trip serialization

## Recommended Tool / Library Direction

Good candidates to evaluate:

- `wc3-file-formats` as format reference
- `w3x2lni` as a proven community conversion tool and workflow reference
- `wc3libs` or similar format libraries where practical
- MPQ tooling such as StormLib when container access becomes necessary

The project does not need to commit to all of these now.

But B-group should consciously choose:

- whether P0 reads directly from workspace files
- whether packaged-map support is delegated to an external unpack step

## Format / Version Risks

### Risk 1: Version Drift

Classic Warcraft and later versions do not always keep file evolution simple.

Implication:

- do not trust a simplistic "one format forever" assumption
- parser code should be layered and defensive

### Risk 2: Container vs Workspace Confusion

If the team confuses:

- packaged map support
with
- workspace-level reading

then B-group may waste time on MPQ automation before the workbench loop exists.

### Risk 3: Overcommitting to Full Write-Back

Object-definition files are important, but full binary write support is not the first blocker.

Grounding should come before comprehensive write-back.

## Direct Recommendations for Rune Weaver

### Do Now

- define the classic Warcraft workspace contract
- define required vs optional source files
- implement read-only parsing boundaries for `w3i`, `w3e`, `war3mapunits.doo`, and `war3map.doo`
- generate derived formats for planar map and anchor index

### Do Soon After

- connect `w3u`, `w3a`, and `w3t`
- define how generated TS/Lua and object-data patches attach to the workspace

### Do Later

- packaged `.w3x` / `.w3m` open/export automation
- broader object-definition write support
- full trigger or text-trigger interpretation

## Unknowns to Verify

- which exact file set exists in the team's real KK/classic workspace flow
- whether maps are usually kept expanded in a folder or repacked between edits
- whether the chosen editor/workflow already produces stable intermediate files we can reuse
- whether KK-specific tooling imposes any path or packaging expectations

## Reference Directions

Useful references to keep nearby:

- `wc3-file-formats`
- `w3x2lni`
- Warcraft community format discussions on HiveWorkshop
- MPQ tooling references such as StormLib

These should guide implementation choices, but the immediate B-group milestone remains:

- workspace connect
- read-only indexing
- planar map
- anchors

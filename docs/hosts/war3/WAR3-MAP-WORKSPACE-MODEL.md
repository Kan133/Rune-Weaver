# Warcraft III Map Workspace Model

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: modeling War3 workspace shape or validating War3 map-workspace assumptions
> Do not use for: current Dota2 execution truth, final multi-host product scope, or packaged-map-only assumptions

## Purpose

This document defines what Rune Weaver should treat as the working object for the classic Warcraft III host path.

The goal is to avoid a false assumption that B-group must begin from packaged map import and full unpack/repack automation.

For the classic Warcraft path, the primary object should be:

- a map workspace
- rooted in classic Warcraft map files
- with Rune Weaver metadata and generated artifacts alongside or near that workspace

## Target Assumption

Current baseline assumption:

- target host is classic Warcraft III
- the user edits the map with a classic editor workflow
- the practical working surface is an editable map workspace or working directory
- the workspace still revolves around `war3map.*` artifacts and related object data files

This means Rune Weaver should first optimize for:

- connecting to a workspace
- reading map artifacts
- building derived indexes and previews

before attempting:

- full packaged map round-trip
- export automation completeness
- publish automation

## Primary Source Files

The first B-group slice should treat the following as the most relevant source files.

### Core Map Metadata

- `war3map.w3i`
- `war3mapMisc.txt`

These define base map metadata and global gameplay constants.

### Spatial / Terrain Data

- `war3map.w3e`
- `war3map.wpm`
- `war3map.shd`

These are the main candidates for terrain, pathing, and coarse spatial rendering inputs.

### Object Placement Data

- `war3mapunits.doo`
- `war3map.doo`

These are the main candidates for placed-unit, item, doodad, and landmark extraction.

### Object Definition Data

- `war3map.w3u`
- `war3map.w3a`
- `war3map.w3t`
- `war3map.w3q`
- `war3map.w3b`
- `war3map.w3d`
- `war3map.w3h`

These define object customizations that will matter for later feature generation and host write-back.

## Workspace Root Model

The first implementation should define a classic Warcraft map workspace root with three conceptual layers.

### 1. Source Layer

The original Warcraft map files and editable map artifacts.

Examples:

- `war3map.w3i`
- `war3map.w3e`
- `war3map.w3u`
- `war3map.w3a`
- `war3mapunits.doo`

### 2. Derived Layer

Rune Weaver derived metadata and caches.

Examples:

- parsed map summary
- planar map cache
- object placement index
- anchor candidates
- feature grounding index

### 3. Generated Layer

Rune Weaver generated source and host outputs.

Examples:

- TS source
- Lua output
- FDF output
- generated UI assets
- object-data patches or generated object data

## First-Stage Workspace Requirements

The first B-group implementation should support:

- selecting a workspace root
- validating the presence of required map files
- reading a minimal subset of map artifacts
- generating derived data into a Rune Weaver-owned area

It should not require:

- complete map export
- complete map repack
- complete write-back to every map artifact type

## Suggested Rune Weaver-Owned Area

The workspace should include a Rune Weaver-owned area for metadata and generated artifacts.

The exact folder name can change later, but the first model should separate:

- source map files
- derived indexes and previews
- generated outputs

A reasonable initial shape would be:

```text
<map-workspace>/
  war3map.w3i
  war3map.w3e
  war3map.w3u
  war3map.w3a
  war3map.w3t
  war3mapunits.doo
  war3map.doo
  war3mapMisc.txt
  rune_weaver/
    workspace.json
    derived/
      map-summary.json
      planar-map.json
      anchor-index.json
    generated/
      ts/
      lua/
      ui/
      object-data/
```

This is a baseline shape, not a final standard.

## Read-Only First Principle

B-group should begin with a read-only interpretation layer.

That means:

- parse
- inspect
- render
- index

before:

- mutate
- rewrite
- repack

This reduces risk and lets the team prove the workbench interaction model before deeper host write complexity.

## Planar Map Data Model

The first planar-map model should not aim for visual fidelity.

It should aim for usefulness.

It should support:

- map dimensions
- coarse terrain cells or tiles
- walkability or pathing hints when available
- overlay markers for placed objects
- coordinate mapping from canvas to map space

This model exists to support spatial grounding, not beauty.

## Anchor Candidate Model

The first anchor candidate model should be derived from map artifacts.

Candidate sources:

- placed units
- buildings
- items
- doodads
- editor-defined regions when available
- start positions
- manually created points or boxes in Rune Weaver

Each anchor should minimally track:

- anchor id
- anchor kind
- source file
- source object id or source record id
- world position or bounds
- optional label
- optional tags

## First Parsing Priorities

If B-group must choose, parsing priority should be:

1. `war3map.w3i`
2. `war3map.w3e`
3. `war3mapunits.doo`
4. `war3map.doo`
5. `war3map.w3u` / `war3map.w3a` / `war3map.w3t`
6. `war3mapMisc.txt`

Reason:

- this gives enough to build the first workbench and spatial grounding loop
- full object-definition authoring can come after that

## What Not to Over-Design Yet

The first B-group slice should not over-commit on:

- full object-data patch serialization
- every classic Warcraft file variant
- packed-map import/export ergonomics
- complete FDF output structure
- complete Lua bootstrap design

Those will matter later, but they are not the first blocker.

## Recommended Immediate B-Group Tasks

1. define the workspace root contract
2. define which files are required, optional, and deferred
3. define a read-only parser boundary for the first map artifacts
4. define the planar-map intermediate format
5. define the anchor-index intermediate format
6. build a workbench view on top of those two derived outputs

## Decision Summary

For the classic Warcraft III host path:

- the primary object is a map workspace, not only a packaged map file
- the first generation loop should be workspace-connect plus read-only indexing
- the first product milestone is spatial grounding
- full write-back and repack should come later

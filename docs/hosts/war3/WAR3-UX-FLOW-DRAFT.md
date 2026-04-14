# Warcraft III / KK Host UX Flow Draft

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: planning future War3 workbench UX and map-grounded host workflows
> Do not use for: current baseline UX truth, current host execution authority, or current shipped War3 product behavior

## Purpose

This draft proposes a Warcraft-first workflow for Rune Weaver.

Unlike the current Dota2 path, Warcraft III work is expected to be:

- map-first
- space-aware
- UI-first rather than CLI-first
- grounded in editor-authored coordinates, regions, and placed objects

The main idea is:

1. the user edits the map in WE / YDWE
2. Rune Weaver connects to a classic Warcraft III map workspace
3. Rune Weaver builds a rough planar map plus spatial anchors
4. the user describes gameplay and UI in terms of real map locations
5. Rune Weaver generates host artifacts from that grounded context

## Why This Flow Fits Warcraft Better

Warcraft III creation is strongly spatial.

Users usually think in terms of:

- this region
- that building
- the road between these two camps
- the altar near the spawn point
- the boss room in the upper-left corner

So a pure CLI-first or prompt-only workflow is likely to feel unnatural.

The Warcraft path should instead treat map space as a first-class input surface.

## Proposed User Flow

### 1. Edit the Map in WE / YDWE

The user continues using their familiar editor to:

- shape terrain
- place units, buildings, doodads, regions, cameras, and markers
- define the rough spatial structure of the experience

Rune Weaver should not replace the editor at this stage.

It should consume the map as authored.

### 2. Connect a Classic Warcraft III Map Workspace

Rune Weaver should connect to a classic Warcraft III map workspace.

For this host path, the primary working object should be a map workspace or map working directory, not only a final packaged map file.

That workspace is still centered on classic Warcraft map artifacts such as:

- `war3map.w3i`
- `war3map.w3e`
- `war3map.w3u`
- `war3map.w3a`
- `war3map.w3t`
- `war3map.w3q`
- `war3map.doo`
- `war3mapunits.doo`
- `war3mapMisc.txt`

Rune Weaver may later support opening a `.w3x` or `.w3m` directly, but the mainline workflow should assume an editable workspace rooted in these map files.

The connect step should:

- inspect the available map files
- read structured map data where possible
- index the workspace for later generation
- prepare a host workspace for later generation

The first version does not need full round-trip editing.

It is enough to support:

- connect
- inspect
- generate into working files
- later export or repack

### 3. Build a Rough Planar Map

After workspace connection, Rune Weaver should generate a rough 2D representation of the map.

This does not need to be pretty.

A useful first version can be:

- a coarse terrain image
- grid overlay
- rough passability or walkability hints
- object markers for units, buildings, and regions
- hover labels for ids, names, and coordinates

This planar map is not just a preview.

It is the grounding surface for later feature prompts.

### 4. Extract Spatial Anchors

Rune Weaver should create an anchor layer on top of the planar map.

Anchors should include at least:

- point anchors
- rectangular regions
- named editor regions
- placed-unit anchors
- building anchors
- start positions
- path or route nodes

Users should be able to:

- click an object and promote it to an anchor
- draw a new region
- rename anchors
- add tags
- group anchors into a larger semantic zone

Examples:

- `north_forest_entry`
- `talent_shrine_area`
- `boss_room_main`
- `lane_spawn_1`

This anchor layer is the key UX improvement over raw coordinates alone.

## Natural Language on Top of Map Space

Once a map workspace is connected and anchors exist, the user should be able to describe behavior using location-aware language.

Examples:

- "spawn a boss in `boss_room_main`"
- "when players enter the shrine area, show a selection UI"
- "place the wave spawn near the north forest entrance"
- "attach this interaction to the shop building on the left side of the village"

Rune Weaver should resolve these requests against:

- explicit anchors
- editor regions
- known object ids
- current map selection in the UI

This means the model is not inventing location semantics from scratch.

It is grounding them against real map data.

## UI-First Product Shape

For the Warcraft host, the primary user-facing product should be a workbench UI, not a CLI-first interface.

CLI can still exist underneath for:

- debugging
- automation
- scripted builds
- recovery paths

But the intended user flow should start from a visual workspace.

### Recommended Main Screen

The first screen should be the actual map workbench:

- left panel: map objects, anchors, features, layers
- center panel: planar map and spatial canvas
- right panel: prompt, selection context, feature config, and UI config
- bottom panel: build, validation, and export status

This should feel like a real tool surface, not a marketing page and not a CLI wrapper.

## FDF / Warcraft UI Authoring Flow

Warcraft UI should not begin from raw FDF editing.

FDF should be treated as a compilation target.

The intended flow should be:

1. user expresses UI intent
2. Rune Weaver generates a UI skeleton
3. user previews and adjusts structure
4. Rune Weaver emits FDF and bindings

### UI Intent Examples

- "a three-choice talent modal"
- "a bottom status strip with portrait and text"
- "a dialogue box with portrait on the right and text on the left"
- "a shrine interaction panel with confirm and cancel"

### Skeleton Output Should Define

- frame tree
- names and ids
- hierarchy
- basic anchors and layout
- text placeholders
- backdrop slots
- event binding points

The user should refine the skeleton in a preview tool rather than hand-authoring full FDF from zero.

## Image Generation and UI Asset Flow

Image-generation models can help, but they should be used for assets, not for complete UI assembly.

Good uses:

- panel backdrops
- buttons
- icon sets
- decorative borders
- portraits or character art
- texture variants for a chosen style

Rune Weaver should remain responsible for:

- slicing and naming assets
- assigning them to UI slots
- generating FDF references
- creating event bindings
- validating layout and overflow

Recommended split:

- image LLM generates visual material
- Rune Weaver assembles usable Warcraft UI structure

## Suggested B-Group Product Scope

B-group should not try to solve everything at once.

The first usable slice should focus on a narrow but coherent loop.

### P0

- connect a classic Warcraft map workspace
- generate a rough planar map
- extract or create spatial anchors
- allow selecting an anchor and writing a location-aware prompt
- produce a feature skeleton from that context

### P1

- generate TS-to-Lua gameplay logic for location-aware features
- support named anchors in feature ownership and regeneration
- generate minimal FDF UI skeletons
- preview UI skeletons in the workbench

### P2

- connect image-generation-assisted asset workflows
- improve map overlay fidelity
- support repack/export back into map deliverables
- support more complex anchor groups, routes, and region semantics

## Recommended B-Group Starting Work

Given this flow, B-group should begin with the product loop rather than the deepest generator internals.

Recommended order:

1. define the classic Warcraft map workspace model
2. define a minimal workspace-connect and read pipeline
3. define the planar-map data model and rendering contract
4. define the spatial-anchor model
5. define the workbench UI for map inspection and anchor selection
6. only then connect feature generation and host write paths

This order matters because the user experience depends on map grounding existing before prompt generation.

## Concrete First Tasks for B Group

### 1. Map Import Contract

Define:

- what workspace root is connected
- which `war3map.*` files are required or optional
- where derived metadata and cache live
- how map identity is tracked in workspace state

The first version should be explicit that classic Warcraft workspace files, not only packaged map files, are the main source of truth.

### 2. Planar Map Representation

Define:

- rough image generation format
- map dimensions and scaling
- object overlay format
- click-to-coordinate mapping

### 3. Spatial Anchor Model

Define:

- anchor id
- anchor type
- source object or source region
- position or bounds
- tags
- human-readable label

### 4. Workbench UI Slice

Build a first UI that can:

- import a map
- display the rough planar map
- show overlays
- create and rename anchors
- show selected anchor context next to a prompt box

### 5. Feature Grounding Contract

Define how a prompt receives map context:

- selected anchor ids
- nearby object ids
- current map selection
- relevant map metadata

This is the bridge between the UX flow and the eventual generator path.

## Design Principles

The Warcraft host path should follow these principles:

- map space is a first-class input
- anchors are better than raw coordinates alone
- UI-first beats CLI-first for the primary workflow
- FDF is a target, not the authoring language
- image generation helps with assets, not with full structural UI ownership
- round-trip map editing can come later; grounding and generation come first

## Current Recommendation

B-group should start from:

1. map import
2. planar map
3. anchors
4. workbench interaction

and should not start from:

1. deep CLI design
2. full repack automation
3. full FDF authoring completeness
4. image-generation polish

That sequence should give the team a real Warcraft-native workflow early, without waiting for the full host stack to mature.

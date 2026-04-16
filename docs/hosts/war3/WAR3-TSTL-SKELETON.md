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
- a `maps/demo.w3x` workspace area
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
- a review-oriented map workspace path
- a placeholder Rune Weaver workspace descriptor
- one example feature module shape for review
- a typed feature review contract for `setup-mid-zone-shop`
- executable build/dev/test/defs seams that describe the next-stage handoff without claiming the toolchain is solved

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

Declares a minimal project identity and executable seam scripts.

The current script contract is:

- `build`
  - validate required skeleton files
  - explain the future `TypeScript -> TypeScriptToLua -> Lua output -> map workspace handoff`
- `dev`
  - explain the future authoring/watch/map-sync intent
- `defs`
  - mark the definitions-generation entry seam
  - point future generated bindings toward `src/generated/bindings`
- `test`
  - run a read-only smoke check over required files and contract settings

These scripts are intentionally non-authoritative. They are executable review/developer seams, not toolchain success proof.

Future tightening should compare this file against `wc3-ts-template`, especially for:

- TSTL dependencies
- build/dev/test script seams

### `tsconfig.json`

Captures the TypeScript side of the intended authoring model. It does not claim that the current repo already has a working TSTL pipeline for this skeleton.

### `config.json`

Holds minimal host-facing configuration and reminds readers that the runtime and packaging details are still provisional.

It now also records three frozen judgments for this package:

- the authoring seam is `TypeScript -> TypeScriptToLua -> Lua output`
- `maps/demo.w3x` is retained as an RW review-oriented choice for now
- `warcraft.json` is in deliberate non-adoption for now mode

Future tightening should compare this file against `wc3-ts-template` rather than inventing a fresh config shape.

### `src/main.ts`

Shows the smallest application entry shape. It delegates to host bootstrap instead of putting host logic directly in the entry file.

### `src/host/bootstrap.ts`

Defines the runtime hook seam. It intentionally avoids inventing KK-specific APIs and only shows where host wiring and feature registration would happen.

### `src/features/setupMidZoneShop.ts`

Provides a review-oriented feature contract for the current War3 probe theme.

It now models three binding classes explicitly:

- runtime hook
- shop target
- trigger area

These are review bindings, not gameplay implementation.

Current interpretation:

- host bootstrap remains the runtime-hook candidate seam
- definitions-generation remains the candidate source for shop/trigger bindings
- unresolved KK runtime facts stay marked as unverified rather than being promoted to capability truth

### `src/features/featureContract.ts`

Defines the small internal type layer for feature review output.

This contract is intentionally local to the skeleton. It is not a new cross-host abstraction or a validator/intake/handoff API.

### `src/review/formatFeatureReview.ts`

Formats the feature contract into a stable review object that bootstrap can return without pretending that runtime wiring exists.

The formatted review object now carries:

- authoring seam
- binding list and binding kinds
- review-target actions
- unresolved facts
- explicit non-goals
- summary counts for review consumers

### `src/review/renderFeatureReviewSummary.ts`

Renders the formatted review object into a stable summary surface for lightweight review consumers.

This remains a review artifact seam, not a runtime executor or a generated file contract.

### `src/review/createFeatureReviewSnapshot.ts`

Freezes a machine-readable snapshot seam over the current review object.

This snapshot is JSON-compatible and read-only. It exists so review consumers can rely on a stable contract instead of re-parsing free text or source layout details.

### `src/review/createFeatureReviewManifest.ts`

Builds a single-feature manifest shape inside the skeleton.

The manifest is intentionally local to this skeleton and groups the current review bindings into:

- runtime hook
- shop target
- trigger area

It also carries explicit decision markers for the frozen non-runtime judgments.

### `src/review/createFeatureIntakeSeed.ts`

Builds a read-only intake seed from the manifest.

This is future validator/handoff preparation only. It is not validator integration, not a generated file contract, and not a write plan.

### `src/review/reviewArtifactChain.ts`

Names the full local review artifact chain in one place:

- feature contract
- bootstrap review object
- snapshot
- manifest
- intake seed

This is a local review contract entry only. It is not a cross-host API.

### `src/review/createHandoffPrepSurface.ts`

Builds a bounded handoff-prep surface over the intake seed.

The handoff-prep surface is read-only and review-only. It exists so future War3-local handoff consumers can read a narrow prep object without implying validator integration, write planning, or runtime readiness.

### `src/review/createDemoCaseInput.ts`

Freezes the canonical demo/case input for the current bounded War3 lane.

For now this is the `setup-mid-zone-shop` handoff-prep surface, expressed as a stable read-only demo input rather than a live consumer contract.

### `src/review/createDemoConsumerProbe.ts`

Builds a tiny War3-local demo consumer probe over the demo input.

This probe is review-only and read-only. It demonstrates that a narrow local consumer can read the bounded prep surface without turning it into validator integration, write planning, or runtime execution.

### `src/review/createWar3DemoArtifactInput.ts`

Builds the bounded demo artifact input that can be consumed by the existing War3 review-package/export/validate script family.

This bridge is case-specific and review-oriented. It does not promote the skeleton into a general intake schema, runtime path, or write-ready validator surface.

### Root demo-probe scripts

The next narrow consumer loop now sits one layer above the review-package family:

- `scripts/war3-build-skeleton-probe-input.ts`
  - builds a planning-only probe prompt from the canonical demo case or an exported review package
- `scripts/war3-run-skeleton-demo-probe.ts`
  - exports the bounded review package, validates it, builds the probe input, runs the probe, and records bounded summaries
- `scripts/war3-summarize-probe-result.ts`
  - turns probe runner output back into local War3 review evidence and a small evidence ledger

These remain local War3 demo helpers. They are not a cross-host API, not validator integration, and not a write-ready execution path.

### `maps/demo.w3x/.gitkeep`

Marks the expected map workspace location without pretending that a real demo map is already committed here.

Current note:

- upstream TSTL template uses `maps/map.w3x`
- Classic Lua template uses `map.w3x`
- RW deliberately keeps `demo.w3x` in this package as a review-oriented choice
- this is not a claim that upstream naming alignment has been finalized

### `src/generated/bindings/.gitkeep`

Marks the intended landing layer for future definitions generation.

This is only a placeholder seam. It does not claim that World Editor globals, generated handle bindings, or Warcraft toolchain integration are already wired.

### `rune_weaver/workspace.json`

Defines the smallest Rune Weaver-owned workspace metadata needed to describe the area and map path.

### `README.md`

Explains the directory shape and current limits in a way that is easy to hand across sessions.

## Boundary judgment

This skeleton is a host-shape sample, not a runnable War3 implementation path.

Near-term diff checklist:

- keep the current build/dev/test/defs seams honest and aligned with README wording
- keep the definitions-generation placeholder explicit
- keep the feature contract review-oriented and local to the skeleton
- keep snapshot / manifest / intake-seed seams read-only and local to the skeleton
- keep the named review chain and handoff-prep surface local and bounded
- keep the canonical demo input and demo consumer probe local, read-only, and non-runtime
- keep the review-package artifact bridge case-specific and bounded to the current demo case
- keep the probe-input builder, probe wrapper, and probe-result summary bounded to planning/demo evidence only
- keep `warcraft.json` as deliberate non-adoption for now unless the lane explicitly reopens that decision
- keep TS authoring outside the map workspace
- do not replace the TSTL authoring seam with Lua-only or Python-only structure

Frozen judgments for this package:

- `TypeScript -> TypeScriptToLua -> Lua output` is the current authoring seam
- Classic Lua workflow evidence is reference context, not the TSTL baseline
- `maps/demo.w3x` is retained as an RW review-oriented choice
- `warcraft.json` is deliberately not adopted for now
- runtime hook / shop target / trigger area are modeled as bindings, not implemented gameplay
- validator/handoff-facing shapes are currently seed/prep layers only, not integrated execution paths
- the canonical demo/case input is the bounded handoff-prep surface, not `maps/demo.w3x` and not runtime execution
- the first concrete consumer family is the existing War3 review-package/export/validate path, reached only through a bounded demo artifact bridge
- the first narrow external demo loop is review package -> probe input -> probe runner -> bounded result summary
- the skeleton remains a review-oriented host-shape sample, not runtime proof or a write-ready host contract

# Rune Weaver

Rune Weaver is a controlled **NL-to-Code** engine for game features.

The current first real host is **Dota2 x-template**. The main pipeline is:

`Natural Language -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Host Write / Run`

The project is not trying to be a black-box "build any game from one prompt" system. The current goal is narrower and more practical:

- turn constrained game feature requests into structured plans
- reuse mechanic patterns instead of inventing domain-specific templates
- generate reviewable host-oriented code artifacts
- keep host writes inside strict ownership boundaries

## Current Status

The project currently has working foundations for:

- `IntentSchema`, `Blueprint`, and `AssemblyPlan`
- pattern modeling, authoring, and admission workflow
- Dota2 host planning and bridge planning
- Dota2 UI adapter generation for:
  - `ui.selection_modal`
  - `ui.key_hint`
  - `ui.resource_bar`
- Dota2 server/shared generator skeletons for a small supported pattern set

What is not done yet:

- full end-to-end host write execution
- arbitrary host file editing
- unconstrained code generation
- a generalized second host

## Product Boundary

Rune Weaver currently owns only:

- `game/scripts/src/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- a small set of explicitly allowed bridge points

Rune Weaver does **not** own user business code and does **not** perform arbitrary intelligent rewrites of host files.

UI is treated as a **code output surface**, not as a separate product line.

## Why Dota2 First

Dota2 is a good first host because it has:

- strict APIs
- clear host boundaries
- a repeatable event-driven gameplay model
- bounded UI surfaces
- many reusable mechanic shapes

That makes it a better fit for:

- pattern-driven generation
- schema/blueprint planning
- adapter-based host binding
- validation before writing

## Repo Structure

- `core/` - planning layer and shared schema
- `adapters/` - host adapters, currently Dota2
- `apps/cli/` - CLI entrypoints
- `docs/` - current source-of-truth docs
- `knowledge/` - processed host knowledge
- `references/` - raw references and upstream materials
- `skills/` - local Codex skills used for controlled authoring flows
- `archive/` - archived docs and completed task history

## Read First

If you want the current internal baseline, start with:

1. [`docs/PRODUCT.md`](./docs/PRODUCT.md)
2. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
3. [`docs/SCHEMA.md`](./docs/SCHEMA.md)
4. [`docs/DEVELOPMENT-GUIDE.md`](./docs/DEVELOPMENT-GUIDE.md)
5. [`INDEX.md`](./INDEX.md)

For feasibility and scope, see:

- [`docs/QA.md`](./docs/QA.md)

## Development

Requirements:

- Node.js 18+

Install:

```bash
npm install
```

Useful commands:

```bash
npm run check-types
npm run cli -- --help
```

## Current Direction

The current recommended order of work is:

1. controlled generators and adapters
2. write integration under strict ownership boundaries
3. end-to-end Dota2 host execution
4. only then broader host expansion

Roblox is a more realistic second-host direction than Unity or Unreal at the current stage.

## Notes

- This repository is under active design and implementation.
- Internal docs are more complete than the public README.
- The project intentionally prefers controlled planning and code generation over freeform generation.


# Dota2 TS Generator Boundary

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: changing Dota2 TS generator responsibilities or deciding whether Dota2 output belongs in TS
> Do not use for: Dota2 delivery status, cross-host generator policy, or proof that TS owns every host write

## Purpose

This document defines the intended role of the current Dota2 TypeScript generator path.

Its purpose is to stop the existing generator from silently remaining a catch-all implementation layer once Host Realization and generator routing are introduced.

Important:

- `Dota2TSGenerator` is one generator family among several
- it is not the default or primary generator for all Dota2 outputs
- KV and UI generator paths are first-class parts of the intended architecture
- TS vs Lua should be understood as authoring-path boundary, not runtime-language boundary; see `DOTA2-TS-LUA-AUTHORING-PATHS.md`

## Current Architectural Decision

The existing Dota2 server/shared code generation path should be treated as:

- `Dota2TSGenerator`

even if the implementation is not fully renamed yet.

This is important because the project must stop thinking of the current generator as a universal generator for all Dota2 outputs.

## Responsibility

`Dota2TSGenerator` is responsible for:

- server TS outputs
- shared TS outputs
- runtime logic
- modifier behavior
- event-driven gameplay orchestration
- other realization routes explicitly sent to TypeScript generation

## It Is Not Responsible For

`Dota2TSGenerator` should not be responsible for:

- deciding realization policy
- absorbing UI generation
- absorbing KV generation
- pretending all feature units are TS-first by default
- broad host mutation outside routed outputs

## Relationship To Host Realization

`Dota2TSGenerator` should trust the incoming routed outputs.

It may validate that a routed unit is coherent for TS generation, but it should not re-decide:

- whether the unit should really have been `kv`
- whether the unit should really have been `ui`

If the route looks invalid, it should surface a warning or blocker.

## Relationship To KV Generator

If a realization unit is routed as `kv+ts`:

- the TS generator owns only the runtime logic side
- the KV generator owns the static host-native side

This split should remain explicit.

The TS generator should not swallow KV responsibilities just because it already exists.

## Relationship To UI Generator

UI-facing outputs should continue to belong to the UI generator path.

The TS generator may cooperate through shared types or server/UI contracts, but it should not become the direct owner of Panorama-facing code emission.

## Migration Guidance

The project should migrate in this order:

1. keep the current TS generation path working
2. formally treat it as `Dota2TSGenerator`
3. add generator routing in front of it
4. add `Dota2KVGenerator`
5. gradually reduce any remaining TS-only worldview in upstream assumptions

This is preferred over immediately rewriting the whole generator stack.

## Validation Guidance

A good TS generator boundary:

- is explicit
- is stable
- does not re-decide realization policy
- handles runtime-heavy logic well
- remains compatible with future KV/UI routing

A bad TS generator boundary:

- absorbs all outputs by convenience
- hides realization decisions inside codegen
- keeps the project effectively TS-only even after Host Realization exists

## Open Points

These may be refined later:

- exact API boundary between routed outputs and TS generation
- whether shared-ts should become a more explicit subclass inside the TS generator
- whether some TS generation responsibilities should later split into narrower families

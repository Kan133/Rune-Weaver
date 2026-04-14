# Warcraft III Lua Runtime Guardrails

> Status
> Decision-oriented runtime note for Rune Weaver B-group.
> Scope: classic Warcraft III / KK runtime behavior with Lua execution.

## Conclusion Summary

Warcraft III runtime logic must be designed under a deterministic multiplayer model.

The most important implication for Rune Weaver is:

- generated code must assume lockstep-style simulation safety
- local-only behavior must be strictly separated from world-state behavior
- "async" should not be treated like browser or Node async

The safe default is:

- world logic: event-driven, timer-driven, deterministic
- UI logic: local-only where appropriate
- synchronization-sensitive code: generated conservatively

## Core Rule

Anything that may cause different players to observe or compute different world state is dangerous.

Therefore:

- do not let local-only values leak into shared game logic
- do not generate convenience abstractions that hide synchronization boundaries
- do not assume general-purpose async patterns are safe

## Local vs Shared Boundary

### Local-Only Uses

These are the kinds of operations that should remain local-only:

- UI display
- local text
- local sounds
- local camera movement
- local frame interaction

These can differ by player without breaking the shared simulation, as long as they do not mutate shared game state.

### Shared World Uses

These are the kinds of operations that must remain deterministic and shared:

- creating or removing units
- moving units
- modifying life, mana, or inventory
- changing ownership
- changing game-relevant variables that feed later logic
- triggering gameplay consequences

These should never be gated by a local-only branch.

## `GetLocalPlayer()` Guardrail

For Rune Weaver generation, the safe policy should be:

- allow `GetLocalPlayer()` only in display/UI/camera-style zones
- forbid it in generated world-logic paths

That means:

- no unit creation under `GetLocalPlayer()`
- no gameplay variable mutation under `GetLocalPlayer()`
- no branch that changes shared outcomes based on local-only state

If code generation needs player-specific UX:

- generate shared state first
- then generate local display updates separately

## Async and Synchronization Guidance

Warcraft III "async" should be treated as a synchronization risk area, not as a normal convenience feature.

### Good Mental Model

Prefer:

- events
- timers
- deterministic scheduled work

Avoid:

- free-form async flows
- hidden cross-frame state machines
- abstractions that make world logic depend on client-local timing

### Timer Guidance

Timers are acceptable when used as deterministic scheduling primitives.

Generation should prefer:

- one-shot delayed work
- clearly owned periodic timers
- explicit destroy paths

Generation should avoid:

- orphaned repeating timers
- complicated timer webs when a simpler state machine would do

## Coroutine Guidance

Even if the runtime technically allows coroutine-style behavior, Rune Weaver should be conservative.

Recommended policy:

- do not make coroutine-heavy control flow a default generation strategy
- do not yield across synchronization-sensitive boundaries
- do not hold client-local values across coroutine boundaries when those values may affect later shared logic

In practice:

- timers and explicit states are safer than clever coroutine orchestration

## Dangerous Inputs for Shared Logic

The generator should treat the following classes of values as suspect:

- local UI input values before they are intentionally synchronized
- player-local text or frame state
- camera-derived values
- localized display names if used to branch logic

If such values are needed for gameplay:

- they should first be normalized into a synchronized event payload

## Code-Generation Anti-Patterns

Rune Weaver should avoid generating these by default:

- `GetLocalPlayer()` around gameplay logic
- client-local values feeding shared branching
- `pairs()`-style iteration for world mutations when order matters
- hidden random behavior without an explicit deterministic policy
- long-lived periodic timers without cleanup
- generator output that mixes UI and world mutation in one handler

## Recommended Generation Pattern

### World Layer

Generate:

- deterministic event handlers
- deterministic timers
- explicit state transitions
- sorted or stable iteration when order matters

### UI Layer

Generate:

- local frame updates
- local visual state
- local feedback

### Bridge Layer

Generate:

- explicit handoff points between UI intent and world-safe execution

This separation should become a first-class convention in the War3 host path.

## Suggested Static Checks

B-group should plan static or review-time checks for generated Lua:

- flag any `GetLocalPlayer()` usage outside approved UI/display zones
- flag suspicious client-derived values used in gameplay conditions
- flag unstable iteration in world-mutation code
- flag repeating timers without a destroy path
- flag mixed UI/world side effects inside the same generated branch

## Direct Recommendations for Rune Weaver

### Do Now

- define a runtime-safety profile for generated Lua
- separate world logic and UI logic in host realization early
- treat timer/event patterns as the preferred generation target

### Do Soon After

- add static validation for local-only boundary violations
- define a small allowlist for local-only APIs
- define a denylist for generator output patterns

### Do Later

- consider higher-level async abstractions only after the base safety model is proven

## Unknowns to Verify

- which KK/runtime APIs introduce local-only behavior beyond base Warcraft APIs
- whether the target stack adds extra synchronization helpers the generator can rely on
- whether some platform-specific Lua helpers are known desync hazards in practice

## Reference Directions

Useful reference directions:

- Warcraft lockstep/desync discussions on HiveWorkshop
- Warcraft Lua mapping best-practice discussions
- platform-specific API notes for KK runtime behavior

The implementation takeaway is simple:

- generate deterministic world code
- isolate local presentation
- be conservative around anything that smells like async

# War3 Slice: Intent Shape vs Host Binding

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: comparing War3 slice artifacts against future intent-schema and host-binding planning
> Do not use for: final shared seam wording, final War3 host contract, or current baseline architecture truth

The currently validated War3 chain reaches:

`workspace -> intake artifact -> skeleton preview consumer -> module draft string`

That slice is already specific enough to separate **intent-schema-like meaning** from **War3 host-binding data**.

## 1. Intent-schema-like meaning

These parts look like stable authored meaning, not engine quirks:

- an area effect centered from a generated radius trigger area
- player-facing hint text
- explicit duration
- a shop-unlock action that occurs in issue order
- the action targets an existing anchor shop
- the action is a neutral-target order expressed as an abstract order operation

In other words, the current slice can be represented as: "show this hint for this duration, then apply this shop-unlock behavior to this anchored shop target via a neutral-target order action."

## 2. War3 host-binding data

These parts belong in the War3 binding layer:

- how the generated-radius trigger area is materialized in Warcraft III trigger/object data
- how the existing anchor resolves to an actual shop unit or handle in the host
- the concrete order mode `neutral-target-order-by-id`
- the working order id `852566`
- any runtime lookup needed to connect the abstract action to Warcraft III order dispatch

`852566` is a useful current host fact, but it is still a host fact, not portable meaning.

## 3. Explicit unknowns to keep unknown

Do not guess:

- that `852566` is the final canonical binding in every runtime case
- that the current neutral-target order form is the only correct War3 dispatch path
- any extra inferred intent beyond the validated slice
- any missing target-resolution rules not yet validated at runtime

The unresolved pieces are mainly host binding, not broad intent ambiguity.

## 4. Next core-pipeline implication

The next integration step should wire this slice into the core pipeline as:

- an intent-shaped node carrying the validated meaning above
- a War3 host-binding layer that attaches concrete order mode, order id, and anchor-resolution details
- explicit unknown fields preserved until runtime binding validation closes them

So the pipeline should not wait for a richer War3 theory first. It should carry the current meaning forward and isolate the remaining uncertainty inside host binding.

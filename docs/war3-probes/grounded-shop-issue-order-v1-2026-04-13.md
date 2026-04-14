# Grounded shop issue-order probe v1 (2026-04-13)

## Inputs and result artifacts

- Input prompt: `D:/Rune Weaver/tmp/war3-grounded-probe-shop-issue-order-v1.md`
- Final output: `D:/Rune Weaver/tmp/kimi-war3/grounded-shop-issue-order-v1-2026-04-13T13-42-00-589Z.final.txt`
- Summary JSON: `D:/Rune Weaver/tmp/kimi-war3/grounded-shop-issue-order-v1-2026-04-13T13-42-00-589Z.summary.json`
- Summary status: `model-output-success`

## Observed behavior

This run pushed the remaining unknown further into the shop-binding area, but it also exposed a new structural gap.

Useful contraction:

- the output selected an order-style unlock path rather than drifting back to a broad unknown
- it kept the exact order token unresolved as `UNSPECIFIED IN PROMPT`
- it chose `IssueTargetOrder(...)`, which means the remaining ambiguity is now closer to:
  1. exact order string / id
  2. exact target form

New uncontrolled fill:

- the model invented a shop-proxy realization path:
  - `FourCC("nmrk")`
  - `CreateUnit(...)`
  - `SetUnitInvulnerable(...)`
  - `ShowUnit(...)`
- that behavior was not grounded by the prompt and should not be treated as trustworthy host realization

## Judgment

This probe is useful because it shows `shopUnlockMechanism = issue-order` is a meaningful narrowing step.

But it also shows the current schema still leaves one more important choice open:

- is the shop target an existing map object / anchor-backed unit
- or is Rune Weaver expected to realize a new runtime shop proxy

The current contract includes `shopObjectId`, but that is not yet enough to force one interpretation.

## Takeaway for next schema move

The next likely schema tightening should not be another broad prompt rewrite.

It should explicitly encode the shop target realization policy, for example:

1. existing-anchor-backed target
2. existing-unit-id target
3. generated-proxy target
4. unknown

Until that is explicit, `issue-order` still leaves too much room for the model to invent object realization steps around the shop target.

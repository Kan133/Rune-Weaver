# Grounded shop target existing-anchor short probe v1 (2026-04-13)

## Inputs and result artifacts

- Input prompt: `D:/Rune Weaver/tmp/war3-grounded-probe-shop-target-existing-anchor-short-v1.md`
- Final output: `D:/Rune Weaver/tmp/kimi-war3/grounded-shop-target-existing-anchor-short-v1-2026-04-13T13-48-59-297Z.final.txt`
- Summary JSON: `D:/Rune Weaver/tmp/kimi-war3/grounded-shop-target-existing-anchor-short-v1-2026-04-13T13-48-59-297Z.summary.json`
- Summary status: `model-output-success`

## Observed behavior

This run is the first clean signal that explicit `shopTargetMode = existing-anchor` materially suppresses shop-proxy invention.

Improvements over the prior `issue-order` probe:

- no `CreateUnit(...)`
- no `ShowUnit(...)`
- no `SetUnitInvulnerable(...)`
- the model stayed on the existing `central_shop_proxy` anchor instead of inventing a new runtime shop object

The remaining uncertainty narrowed to:

1. exact order id / order token
2. exact runtime symbol binding for `central_shop_proxy`
3. whether the order should be issued from the entering unit to the shop target, or from the shop target toward a different target form

## Judgment

This is better mainline evidence than the prior `issue-order` probe because the unresolved behavior is now much closer to a real host-binding question and much less about object realization invention.

The result is still not final generation truth.

One caution remains:

- the snippet chose `IssueTargetOrderById(u, UNSPECIFIED IN PROMPT, central_shop_proxy)`

That is useful as evidence that the unknown has narrowed to order-form semantics, but it is not trustworthy enough to treat as the correct final order direction.

## Takeaway

Adding explicit `shopTargetMode` was a useful schema move.

The next likely narrowing step is no longer broad shop realization. It is a much smaller host-binding question around:

- order family
- order direction
- target form

# Order semantics probe v1 (2026-04-13)

## Inputs and result artifacts

- Input prompt: `D:/Rune Weaver/tmp/war3_order_semantics_probe_prompt.txt`
- Final output: `D:/Rune Weaver/tmp/kimi-war3/order-semantics-v1-2026-04-13T13-59-14-342Z.final.txt`
- Summary JSON: `D:/Rune Weaver/tmp/kimi-war3/order-semantics-v1-2026-04-13T13-59-14-342Z.summary.json`
- Summary status: `model-output-success`

## Observed behavior

This probe asked the model to stay narrow on the unresolved choice between:

- `IssueTargetOrderById`
- `IssueNeutralTargetOrderById`

and to avoid choosing either one unless the provided facts justified it.

The result followed that rule well:

- it kept the grounded region-entry flow and player gating
- it kept the existing-anchor reading of `central_shop_proxy`
- it explicitly rejected `IssueNeutralImmediateOrderById` as not fitting a target-bearing flow
- it did not choose between `IssueTargetOrderById` and `IssueNeutralTargetOrderById` by guesswork
- it left the order-family call site unresolved and explicit

## Judgment

This is good boundary evidence.

The probe now suggests that the remaining War3 uncertainty is no longer broad shop realization or broad trigger realization.

It is a very narrow host-binding question:

1. whether `central_shop_proxy` should be treated as a grounded neutral-shop structure for order-family purposes
2. which order family is correct
3. which order id is correct
4. what the final parameter binding should be

## Takeaway

The current contract is now strong enough that probes can remain honest at the order-family decision point instead of drifting into invented mechanics.

The next meaningful step should be to ground one more host fact, not to broaden the prompt:

- either prove that `central_shop_proxy` is a neutral-shop-style target
- or encode a different explicit order-family choice into schema / host binding

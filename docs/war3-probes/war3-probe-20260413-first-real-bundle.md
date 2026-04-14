# Objective

Record the first real War3 handoff probe against a real sample map path and use the result as boundary evidence for the current War3 intake and handoff contract.

This probe is not the formal War3 generation path. It is a narrow validation step for contract hardening.

# Input Bundle Summary

- Sample map path: `tmp/war3-samples/PyWC3/maps/test.w3x`
- Map path type: real sample folder map used during parser and workbench validation
- Upstream inputs already available:
  - War3 intake artifact
  - War3 handoff bundle
- Host constraints in scope:
  - KK platform
  - Warcraft III 1.29
  - TypeScript to Lua only
  - no Jass

The point of this probe was not to test parsing again. The point was to check whether the current intake artifact and handoff bundle are expressive enough to elicit a useful implementation-oriented response.

# Prompt Shape

The probe used the existing handoff bundle shape rather than a new experimental prompt format.

Two execution paths were attempted:

1. Repo-level `core/llm` real request with the current bundle
2. The same bundle sent through `kimi --no-thinking`

This kept the probe focused on bundle quality rather than prompt rewriting.

# Model Output Summary

## Repo-level `core/llm`

- Real request attempted
- Request failed with `401 Invalid Authentication`
- No model output was obtained from this path

This means the intended repo-level execution path could not yet provide evidence about output quality.

## `kimi --no-thinking`

The same bundle produced a planning-quality response rather than a final implementation.

Observed response characteristics:

- It returned a small implementation plan
- It proposed a plausible module split, including:
  - `src/features/welcome-hint.ts`
  - `src/features/shop-trigger.ts`
  - `src/utils/anchors.ts`
  - `src/main.ts`
- It surfaced host/runtime cautions that were relevant to the current War3 target:
  - KK 1.29 constraints matter
  - shop interaction may need a unit proxy rather than direct doodad interaction
  - one-shot trigger cleanup should be explicit
  - `tstl` nil/optional behavior needs care
- It asked for missing implementation-shaping inputs instead of inventing them silently:
  - shop interaction mode
  - target players
  - hint duration
  - shop rawcode or proxy id

This is the main useful result of the probe: the bundle was good enough to produce planning-quality structure and to expose underspecified inputs.

# Inferred Schema Gaps

The probe indicates that the current War3 intake contract still leaves several important fields underspecified.

Likely schema candidates:

- shop interaction mode
- target player scope
- hint duration or display timing
- shop rawcode or proxy unit id

These are not cosmetic gaps. They materially affect runtime structure and host-specific implementation choices.

# Inferred Blueprint Candidates

The planning response suggests that some structural pieces may repeat often enough to become skeleton candidates later.

Current candidates:

- anchor lookup or anchor binding module
- feature module for welcome or onboarding hint behavior
- feature module for shop-trigger behavior
- main bootstrap / entry module

These should still be treated as provisional blueprint evidence, not as settled mainline structure.

# Inferred Gap-Fill Candidates

The probe also suggests which details are better treated as gap-fill or host-specific muscle rather than early skeleton.

Current candidates:

- doodad-versus-unit-proxy resolution for interaction points
- one-shot trigger lifecycle and cleanup details
- KK-specific runtime cautions
- `tstl` nil/optional handling details

These look like implementation-layer glue, not first-choice blueprint payload.

# Confidence / Recommended Next Move

Confidence is moderate at best.

Reasons:

- The probe used a real sample map and a real bundle, which is valuable
- The `kimi --no-thinking` response was useful and appropriately cautious
- But the repo-level `core/llm` path failed with `401 Invalid Authentication`, so there is still no successful comparison through the intended in-repo execution route

Current judgment:

- This probe is valid as boundary evidence
- It is not valid as authority for final implementation
- It supports continued hardening of the War3 intake and handoff contract
- It does not justify treating free-form TSTL generation as the new War3 mainline

Recommended next move:

1. Keep treating probe outputs as evidence, not truth
2. Continue hardening the missing-input layer around the inferred schema gaps
3. Restore the repo-level `core/llm` path so the same bundle can be exercised through the intended execution surface
4. Only after that, consider a second probe aimed at typed pseudo-implementation rather than planning only

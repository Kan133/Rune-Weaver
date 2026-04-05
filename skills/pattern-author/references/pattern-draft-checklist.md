# Pattern Draft Checklist

Three-stage validation checklist for `pattern-author`.

Use this together with:

- `docs/PATTERN-MODEL.md`
- `docs/PATTERN-SPEC.md`
- `docs/PATTERN-PIPELINE.md`
- `docs/PATTERN-AUTHORING-GUIDE.md`

---

## Stage 1: PatternCandidate Validation

### Identity Check

- [ ] `proposedId` follows current project naming
  - preferred form: `category.name`
  - examples:
    - `effect.dash`
    - `ui.selection_modal`
    - `resource.basic_pool`

- [ ] `repeatedMechanic` describes a real reusable mechanic

- [ ] `sourceRefs` point to real materials
  - docs
  - code
  - references
  - processed knowledge

### Go / No-Go Gates

- [ ] Is a mechanic, not an API wrapper
  - [X] reject: `SetAbsOrigin wrapper`
  - [OK] accept: `parameterized displacement over time`

- [ ] Is a mechanic, not a KV snippet
  - [X] reject: `npc_abilities_custom.txt values`
  - [OK] accept: `selection flow over weighted options`

- [ ] Is a mechanic, not an enum collection
  - [X] reject: `all DAMAGE_TYPES`
  - [OK] accept: `resource consumption with host validation`

- [ ] Is reusable, not domain-specific
  - [X] reject: `ui.talent_screen`
  - [OK] accept: `ui.selection_modal`

- [ ] Not duplicate of existing pattern or obvious pattern combination

### Stage 1 Result

- [ ] `goNoGo` is one of:
  - `go`
  - `revise`
  - `reject`

- [ ] If `revise` or `reject`, reason is explicit

---

## Stage 2: PatternDraft Completeness

### Hard Requirements

- [ ] `id`
- [ ] `summary`
- [ ] `responsibilities`
- [ ] `nonGoals`
- [ ] `parameters`
- [ ] `hostBindings`

These are hard admission gates.

### Semantic Contract

- [ ] `responsibilities` are clear and limited
- [ ] `nonGoals` prevent scope creep
- [ ] `parameters` cover the main variations
- [ ] `dependencies` are explicit
- [ ] `validationHints` exist

### Host Binding Quality

- [ ] Host binding is separated from semantic core
- [ ] Uses current host model, not legacy assumptions
- [ ] Dota2 paths align with current rules:
  - [OK] `game/scripts/src/rune_weaver/generated/server`
  - [OK] `game/scripts/src/rune_weaver/generated/shared`
  - [OK] `content/panorama/src/rune_weaver/generated/ui`
  - [X] avoid legacy-first bare `game/scripts/vscripts`

### Examples

- [ ] At least one standard example
- [ ] At least one variant or domain-skinned example

---

## Stage 3: AdmissionChecklist

### Mechanic Quality

- [ ] Is smaller than a full feature or system
- [ ] Can be explained without relying on host-specific terms
- [ ] Main variation is parameterized, not split into many near-duplicate patterns

### Boundary Quality

- [ ] `nonGoals` are explicit
- [ ] Inputs / outputs are clear enough for planning layers
- [ ] Host details remain in binding notes, not semantic summary

### Catalog Quality

- [ ] Not duplicate of existing catalog entry
- [ ] Not domain-specific pattern bloat
- [ ] Still fits current backlog and roadmap

### Verdict

- [ ] `overallVerdict` is one of:
  - `accept`
  - `revise`
  - `reject`

- [ ] `revisionNeeded` is populated when verdict is `revise`
- [ ] `admissionReady` matches the verdict

---

## Domain vs Mechanic Quick Check

### Usually Not a Pattern

- single Dota2 API usage
- single KV block
- enum catalog
- one-off project workaround
- domain skin only

### Usually Good Pattern Material

- reusable trigger behavior
- reusable data pool or selection mechanic
- reusable effect or resource mechanic
- reusable UI mechanic

---

## Final Reminder

`pattern-author` is currently a **single skill with three sequential outputs**:

1. `PatternCandidate`
2. `PatternDraft`
3. `AdmissionChecklist`

It is not yet split into extractor / author / reviewer skills.

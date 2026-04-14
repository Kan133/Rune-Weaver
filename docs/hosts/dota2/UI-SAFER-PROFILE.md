# UI Safer Generation Profile

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-contract-change
> Last verified: 2026-04-14
> Read when: generating or validating Dota2 Panorama UI safely inside the x-template host
> Do not use for: UI Wizard architecture, cross-host UI rules, or visual design-system decisions

## Purpose

This document defines the runtime safety baseline for generated Dota2 Panorama UI.

It is not a UI wizard spec and it is not a visual design system. It is the minimum set of rules a UI generator must follow so generated UI can run inside an x-template host without manual repair.

Current proving target:

- `ui.selection_modal`
- x-template Panorama
- `react-panorama-x`
- generated TSX plus generated LESS

Read with:

- [UI-PATTERN-STRATEGY.md](../../UI-PATTERN-STRATEGY.md)
- [UI-SPEC-GUIDE.md](../../UI-SPEC-GUIDE.md)
- [UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md](../../UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md)
- [TALENT-DRAW-E2E-LESSONS.md](../../../TALENT-DRAW-E2E-LESSONS.md)
- [DEMO-GUIDE.md](../../talent-draw-case/DEMO-GUIDE.md)

---

## Non-Goals

This profile does not:

- choose which UI pattern to use,
- infer user-facing visual taste,
- generate arbitrary custom layouts,
- replace UI Wizard,
- add new UI pattern families.

UI Wizard may later produce `UIDesignSpec` and UI parameters. This profile constrains how those parameters are realized safely.

---

## Root Container Rules

Generated HUD UI must assume Panorama panels have no helpful browser-style layout defaults.

Required:

- `.rune-weaver-root` has `width: 100%; height: 100%;`
- generated modal roots fill the HUD layer unless the pattern explicitly defines a smaller surface
- modal content uses explicit alignment, width, min-height, z-index, and pointer behavior
- UI must not depend on parent content size to become visible

Validation target:

- `dota2 validate` should fail if `.rune-weaver-root` lacks full-size dimensions.

---

## LESS Import Rules

x-template can run React TSX, but generated LESS must not be imported from generated TSX.

Required:

- generated component files do not contain `import "./*.less"`
- generated LESS is imported through `content/panorama/src/hud/styles.less`
- bridge refresh or write integration owns style-entry insertion
- style imports are idempotent

Reason:

The x-template Panorama webpack pipeline can parse TSX-side LESS imports as JavaScript and fail with an unexpected token error.

Validation target:

- `dota2 validate` should check every generated UI LESS file is referenced by the HUD style entry.

---

## React Hook Safety

Generated React code must avoid render loops and stale event subscriptions.

Required:

- event subscriptions are created in `useEffect`
- every subscription has cleanup
- effect dependencies are stable
- default arrays and objects are not recreated in dependency lists
- use lazy state initialization for default payloads

Preferred pattern:

```tsx
const [items, setItems] = useState<SelectionItem[]>(() => normalizeItems(initialItems));

useEffect(() => {
  const unsubscribe = subscribeToSelectionEvent((payload) => {
    setItems(normalizeItems(payload.items));
  });
  return unsubscribe;
}, []);
```

Avoid:

```tsx
const { items = [] } = props;

useEffect(() => {
  setItems(items);
}, [items]);
```

---

## Event Payload Normalization

Generated UI must treat server payloads as untrusted.

Dota2 Lua tables can arrive as arrays or object-like values. Missing fields are also possible during debugging.

Required:

- normalize array-like values with `Array.isArray(value) ? value : Object.values(value ?? {})`
- filter null/undefined entries
- provide defaults for `id`, `name`, `description`, `rarity`, and `disabled`
- ignore payloads for another feature id
- keep an empty-state fallback

`ui.selection_modal` minimum item shape:

```ts
interface SelectionItem {
  id: string;
  name: string;
  description?: string;
  rarity?: string;
  disabled?: boolean;
  isPlaceholder?: boolean;
}
```

---

## Selection Modal Rules

`ui.selection_modal` is the first safety target.

Required behavior:

- `minDisplayCount` pads missing options with `placeholderConfig`
- placeholder cards are disabled and non-selectable
- disabled cards cannot become selected
- confirm button is disabled until a selectable item is selected
- confirm emits only the selected item id and feature id
- close behavior follows pattern parameters, not ad hoc component state
- text is constrained with truncation or wrapping
- card grid uses stable dimensions

Required visual safety:

- modal is centered by default
- cards have predictable width and height
- placeholder cards are visually distinct
- selected card state does not shift layout

---

## Runtime Debug Evidence

Generated UI should provide sparse, stable logs that help split server, bridge, and UI failures.

Recommended logs:

- component mounted
- selection event received
- normalized item count
- selected item id
- confirm emitted

Logs should be feature-scoped and easy to grep. Do not log every render.

---

## Template And Generator Boundary

The repository contains UI template files under `adapters/dota2/ui/templates/`, while the current Dota2 generator may still emit TSX strings directly.

Until templates are fully wired:

- templates are reference contracts, not guaranteed source of emitted code
- generator output must still satisfy this safer profile
- template variables must map to explicit `UIDesignSpec` fields or pattern parameters
- no UI wizard output should bypass pattern contracts

---

## Implementation Order

1. Audit current generated `ui.selection_modal` output against this profile.
2. Fix React hook safety and payload normalization.
3. Fix layout and placeholder behavior.
4. Ensure LESS import handling is validated.
5. Add evidence-pack checks for UI mounted/event-received logs.
6. Only then start a UI Wizard branch.

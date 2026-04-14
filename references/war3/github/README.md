# War3 GitHub References

This directory stores read-only upstream mirrors used as reference evidence for the Rune Weaver War3 track.

Current mirrors:

- `w3ts`
- `wc3-ts-template`
- `warcraft-vscode`
- `warcraft-template-classic`
- `lib-stdlib`
- `war3map`

Rules:

- Treat these repositories as external evidence, not as implementation sources.
- Do not copy code from here directly into `adapters/war3`.
- Prefer extracting shape, workflow, and contract conclusions into:
  - `knowledge/warcraft3`
  - `docs/hosts/war3`

Current canonical judgment:

- TSTL authoring reference:
  - `wc3-ts-template`
  - `w3ts`
- Classic Lua host/workflow reference:
  - `warcraft-template-classic`
  - `warcraft-vscode`
  - `lib-stdlib`
- Parser/reference only:
  - `war3map`

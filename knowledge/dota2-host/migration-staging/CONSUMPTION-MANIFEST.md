# Dota2 Host Migration Staging Consumption Manifest

这份文档定义的是 workflow consumption posture，不是 retrieval policy 本身。

它回答这些问题：

- 哪份 staging 文档适合给 `wizard.create` / `wizard.update`
- 哪份更适合 `synthesis.module` / `repair.local`
- 哪份必须搭配 raw structured reference 才安全
- 哪份已经接近 canonical candidate，哪份仍只是 partial guidance

## Consumption Matrix

| path | kind | recommendedTier | recommendedSourceKind | workflowConsumers | shouldAvoidFor | recommendedTargetProfiles | requiresRawReferenceCompanion | rawCompanionPaths | canonicalCandidate | readiness | notes |
|------|------|-----------------|-----------------------|-------------------|----------------|---------------------------|-------------------------------|------------------|-------------------|-----------|-------|
| `knowledge/dota2-host/migration-staging/abilities-casting-and-gameplay-shells.md` | curated-host-knowledge | `tier1` | `curated-knowledge` | `wizard.create`, `wizard.update`, `synthesis.module`, `repair.local` | overly specific symbol lookup | `lua_ability`, `ability_kv` | yes | `references/dota2/dota-data/files/**` | yes | `ready` | Good front-door doc for gameplay shell selection, but exact APIs/enums still need raw companion |
| `knowledge/dota2-host/migration-staging/ability-item-and-modifier-kv-contracts.md` | curated-host-knowledge | `tier1` | `curated-knowledge` | `wizard.create`, `wizard.update`, `synthesis.module`, `repair.local` | pure Panorama-only asks | `lua_ability`, `ability_kv` | yes | `references/dota2/dota-data/files/**` | yes | `ready` | Strong for host contract grounding; should not replace exact KV/API lookup by itself |
| `knowledge/dota2-host/migration-staging/panorama-ui-basics.md` | curated-host-knowledge | `tier1` | `curated-knowledge` | `wizard.create`, `wizard.update` | low-level repair of webpack/layout edge cases | `panorama_tsx`, `panorama_less` | yes | `references/dota2/dota-data/files/**` | yes | `ready` | Best wizard-facing overview for UI/server boundaries and event-vs-state separation |
| `knowledge/dota2-host/migration-staging/panorama-build-input-and-scene-patterns.md` | curated-host-knowledge | `tier1.5` | `curated-knowledge` | `wizard.update`, `synthesis.module`, `repair.local` | simple no-build/no-UI gameplay asks | `panorama_tsx`, `panorama_less` | yes | `references/dota2/dota-data/files/**` | yes | `ready` | Better for build/layout/input/scene realization than for initial feature ideation |
| `knowledge/dota2-host/migration-staging/custom-events-networking-and-state-sync.md` | curated-host-knowledge | `tier1` | `curated-knowledge` | `wizard.create`, `wizard.update`, `synthesis.module`, `repair.local` | isolated single-file UI styling | `panorama_tsx`, `lua_ability` | yes | `references/dota2/dota-data/files/**` | yes | `ready` | Useful shared seam doc for event/state split; exact payload/runtime APIs still need raw companion |
| `knowledge/dota2-host/migration-staging/filters-particles-and-runtime-control.md` | curated-host-knowledge | `tier1.5` | `curated-knowledge` | `wizard.update`, `synthesis.module`, `repair.local` | generic high-level feature ideation | `lua_ability` | yes | `references/dota2/dota-data/files/**` | yes | `ready` | Strong for implementation/repair; too low-level to be the first wizard doc unless the ask is explicitly runtime-control heavy |
| `knowledge/dota2-host/migration-staging/unit-kv-creature-ai-and-wearables.md` | curated-host-knowledge | `tier1` | `curated-knowledge` | `wizard.create`, `wizard.update`, `synthesis.module`, `repair.local` | pure UI asks | `lua_ability`, `ability_kv` | yes | `references/dota2/dota-data/files/**` | yes | `ready` | Safe wizard input for unit/summon/AI surface selection, with raw companion for exact fields |
| `knowledge/dota2-host/migration-staging/typescript-addon-structure-and-watchers.md` | curated-host-knowledge | `tier1` | `curated-knowledge` | `wizard.create`, `wizard.update`, `repair.local` | isolated module synthesis without host-structure concerns | `lua_ability`, `panorama_tsx` | no | | yes | `ready` | Primarily host-structure guidance, not exact API guidance |
| `knowledge/dota2-host/migration-staging/tooltip-localization-and-ability-text-pipeline.md` | curated-host-knowledge | `tier1.5` | `curated-knowledge` | `wizard.update`, `synthesis.module`, `repair.local` | mechanics-only asks with no text surface | `ability_kv`, `panorama_tsx` | no | | yes | `partial` | Valuable when text/localization is in scope, but not broad enough to front every workflow |
| `knowledge/dota2-host/migration-staging/host-realization-target-surfaces-and-boundaries.md` | curated-host-knowledge | `tier0-guardrail` | `curated-knowledge` | `wizard.create`, `wizard.update`, `repair.local` | exact implementation lookup | `lua_ability`, `ability_kv`, `panorama_tsx`, `panorama_less` | no | | no | `ready` | Best used as a scope guardrail before deeper docs; not canonical host truth by itself |
| `knowledge/dota2-host/migration-staging/PROVENANCE-MANIFEST.md` | provenance | `control` | `provenance` | `wizard.update`, `repair.local` | synthesis.module, direct feature generation | | no | | no | `ready` | For migration bookkeeping only |
| `knowledge/dota2-host/migration-staging/CUTOVER-CANDIDATES.md` | provenance | `control` | `provenance` | `wizard.update`, `repair.local` | synthesis.module, direct feature generation | | no | | no | `ready` | For phase 3/4 cutover decisions only |

## Practical Posture

### Best wizard-facing front door docs

- `abilities-casting-and-gameplay-shells.md`
- `panorama-ui-basics.md`
- `custom-events-networking-and-state-sync.md`
- `unit-kv-creature-ai-and-wearables.md`
- `host-realization-target-surfaces-and-boundaries.md`

### Better for synthesis / repair than wizard ideation

- `ability-item-and-modifier-kv-contracts.md`
- `panorama-build-input-and-scene-patterns.md`
- `filters-particles-and-runtime-control.md`
- `tooltip-localization-and-ability-text-pipeline.md`

### Must not be treated as canonical implementation truth

- `PROVENANCE-MANIFEST.md`
- `CUTOVER-CANDIDATES.md`

### Raw companion rule

如果文档涉及：

- exact enum names
- exact event/API signatures
- exact symbol lookup
- exact `.d.ts` / `.json` grounding

则仍应搭配 `references/dota2/dota-data/files/**` 使用。

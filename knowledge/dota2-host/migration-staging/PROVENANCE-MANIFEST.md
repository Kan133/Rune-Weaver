# Dota2 Host Migration Staging Provenance Manifest

这份文档是 migration-staging lane 的人读 provenance 总表。

目的不是宣称 cutover 已完成，而是给主 session 一份可安全消费的来源映射：

- 每份 staging 文档从哪里来
- 它属于 curated knowledge、provenance 还是 mixed consolidation
- 哪些旧来源仍必须继续保留
- 哪些条目可以作为 future canonical candidate

## Curated Staging Docs

| Staging path | Kind | Primary sources | Source sections | Merge? | Future canonical candidate? | Must retain upstream raw/reference |
|--------------|------|-----------------|-----------------|--------|-----------------------------|------------------------------------|
| `knowledge/dota2-host/migration-staging/abilities-casting-and-gameplay-shells.md` | curated-host-knowledge | `references/dota2/docs/moddota_abilities.md`; `references/dota2/docs/moddota_scripting_typescript.md` | `Ability KeyValues`; `Passing AbilityValues values into Lua`; `AbilityDuration tooltips`; `Abilities in Typescript` | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/panorama-ui-basics.md` | curated-host-knowledge | `references/dota2/docs/moddota_panorama_docs.md` | `Introduction to Panorama UI with TypeScript`; `Keybindings`; `React in Panorama` | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/custom-events-networking-and-state-sync.md` | curated-host-knowledge | `knowledge/dota2-host/slices/scripting-systems/custom-events-and-networking.md`; `knowledge/dota2-host/slices/scripting-systems/state-sync-and-tables.md`; `knowledge/dota2-host/slices/panorama/custom-nettables-and-dataflow.md`; `references/dota2/docs/moddota_panorama_docs.md` | slice consolidations + panorama event/dataflow related sections | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/host-realization-target-surfaces-and-boundaries.md` | curated-host-knowledge | multiple staging docs plus `knowledge/dota2-host/slices/scripting-systems/system-composition-notes.md` | cross-doc synthesis | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/typescript-addon-structure-and-watchers.md` | curated-host-knowledge | `references/dota2/docs/moddota_scripting_typescript.md` | `Typescript Introduction` and related setup/watcher sections | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/panorama-build-input-and-scene-patterns.md` | curated-host-knowledge | `references/dota2/docs/moddota_panorama_docs.md` | `Introduction to Panorama UI with TypeScript`; `Keybindings`; `DOTAScenePanel`; `Bundling scripts with webpack`; `React in Panorama` | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/ability-item-and-modifier-kv-contracts.md` | curated-host-knowledge | `references/dota2/docs/moddota_abilities.md` | `Ability KeyValues`; `Item KeyValues`; `Passing AbilityValues values into Lua`; `AbilityDuration tooltips` | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/filters-particles-and-runtime-control.md` | curated-host-knowledge | `references/dota2/docs/moddota_scripting_systems.md` | `Using the order filter and other filters`; `Particle Attachment`; `Basic Vector Math` | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/unit-kv-creature-ai-and-wearables.md` | curated-host-knowledge | `references/dota2/docs/moddota_units.md` | `Unit KeyValues`; `Adding a Very Simple AI to Units`; `Writing a simple AI for neutrals`; `Create Creature AttachWearable blocks directly from the keyvalues` | yes | yes | yes |
| `knowledge/dota2-host/migration-staging/tooltip-localization-and-ability-text-pipeline.md` | curated-host-knowledge | `references/dota2/docs/moddota_scripting_typescript.md` | `Tooltip Generator` | yes | yes | yes |

## Provenance / Migration Control Docs

| Path | Kind | Purpose |
|------|------|---------|
| `knowledge/dota2-host/migration-staging/CONSUMPTION-MANIFEST.md` | provenance | workflow consumption posture 总表 |
| `knowledge/dota2-host/migration-staging/consumption-manifest.json` | provenance | 机器友好 consumption 索引 |
| `knowledge/dota2-host/migration-staging/COVERAGE-GAPS.md` | provenance | 下一轮高价值 coverage gap backlog |
| `knowledge/dota2-host/migration-staging/PROVENANCE-MANIFEST.md` | provenance | 人读 provenance 总表 |
| `knowledge/dota2-host/migration-staging/provenance-manifest.json` | provenance | 机器友好 provenance 索引 |
| `knowledge/dota2-host/migration-staging/CUTOVER-CANDIDATES.md` | provenance | 主 session phase 3/4 cutover 草案 |

## What This Manifest Does Not Claim

- 不宣称任何旧 `references/dota2/docs/*.md` 已可删除
- 不宣称 baseline retrieval 已切到 staging docs
- 不宣称 raw structured reference 可被 markdown 全量替代
- 不宣称现有 canonical `knowledge/dota2-host/**` 已完成更新

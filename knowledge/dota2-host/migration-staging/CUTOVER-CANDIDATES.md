# Dota2 Host Migration Staging Cutover Candidates

这份文档给主 session 在 phase 3/4 使用。

它回答的不是“现在删什么”，而是：

- 哪些旧来源更适合未来被 curated knowledge 替代
- 哪些必须继续保留成 raw structured reference
- 哪些只应留作 provenance
- 哪些仍需要人工判断

## Decision Table

| source path | source type | proposed action | replacement path | risk / unresolved notes |
|-------------|-------------|-----------------|------------------|-------------------------|
| `references/dota2/docs/moddota_abilities.md` | curated-doc | `replace-with-curated-knowledge` | `knowledge/dota2-host/migration-staging/ability-item-and-modifier-kv-contracts.md`; `knowledge/dota2-host/migration-staging/abilities-casting-and-gameplay-shells.md` | 仅适合 section-level replacement；单点教程部分仍未完成 staging |
| `references/dota2/docs/moddota_panorama_docs.md` | curated-doc | `replace-with-curated-knowledge` | `knowledge/dota2-host/migration-staging/panorama-ui-basics.md`; `knowledge/dota2-host/migration-staging/panorama-build-input-and-scene-patterns.md`; `knowledge/dota2-host/migration-staging/custom-events-networking-and-state-sync.md` | `Inclusive Panorama UI`、`Button Examples`、`Hiding HUD with SetHUDVisible` 仍未整理完 |
| `references/dota2/docs/moddota_scripting_systems.md` | curated-doc | `replace-with-curated-knowledge` | `knowledge/dota2-host/migration-staging/filters-particles-and-runtime-control.md`; `knowledge/dota2-host/migration-staging/custom-events-networking-and-state-sync.md`; `knowledge/dota2-host/migration-staging/host-realization-target-surfaces-and-boundaries.md` | 系统案例型内容仍应保留原文，当前不宜 whole-file replace |
| `references/dota2/docs/moddota_scripting_typescript.md` | curated-doc | `replace-with-curated-knowledge` | `knowledge/dota2-host/migration-staging/typescript-addon-structure-and-watchers.md`; `knowledge/dota2-host/migration-staging/tooltip-localization-and-ability-text-pipeline.md`; `knowledge/dota2-host/migration-staging/abilities-casting-and-gameplay-shells.md` | `Modifiers in Typescript`、`Events and Timers in Typescript` 等仍需后续整理 |
| `references/dota2/docs/moddota_units.md` | curated-doc | `replace-with-curated-knowledge` | `knowledge/dota2-host/migration-staging/unit-kv-creature-ai-and-wearables.md` | `Unit producing buildings` 与 `Creating units with a duration` 仍缺更细 staging |
| `references/dota2/dota-data/files/**` | raw-reference | `keep-as-raw-reference` | none | 这是 Tier 2 exact lookup / symbol / enum / API grounding 面，绝不能洗成 curated markdown 真相 |
| `knowledge/dota2-host/sources/**` | mixed | `needs-human-review` | possible future canonical promotion from `migration-staging/**` | 现有 sources 树里有不少 stub 与 source-split 产物，主 session 需决定是继续保留、降级成 provenance，还是被新的 thematic knowledge 替代 |
| `knowledge/dota2-host/slices/**` | mixed | `needs-human-review` | some topics may be superseded by new `migration-staging/**` docs | slices 已经是知识整理，但是否提升为 canonical、是否与新 staging 合并，需要主 session 结合 retrieval 读法决定 |
| `knowledge/dota2-host/migration-staging/provenance-manifest.json` | provenance | `keep-as-provenance-only` | `knowledge/dota2-host/migration-staging/PROVENANCE-MANIFEST.md` | JSON 适合索引，不应被当成面向 LLM 的 canonical knowledge |
| `knowledge/dota2-host/migration-staging/consumption-manifest.json` | provenance | `keep-as-provenance-only` | `knowledge/dota2-host/migration-staging/CONSUMPTION-MANIFEST.md` | JSON 适合索引，不应被当成 wizard-facing curated host truth |

## Recommended Safe Order

1. 先把 `migration-staging/**` 纳入候选 knowledge 语料，不动 raw reference。
2. 优先做 section-level preference，不做 whole-file deletion。
3. 先替换 `moddota_abilities.md`、`moddota_panorama_docs.md`、`moddota_scripting_typescript.md` 中已经被 staged 的高价值 sections。
4. `knowledge/dota2-host/sources/**` 与 `knowledge/dota2-host/slices/**` 的取舍最后做，因为它们可能仍被当前 retrieval 或人工工作流隐式依赖。
5. `references/dota2/dota-data/files/**` 最后也不能迁成 curated knowledge；只能继续作为 raw structured reference 保留。

## Explicit Non-Candidates

这些内容这轮不应迁成 curated knowledge 真相：

- `.json`
- `.d.ts`
- enum / API / symbol dump
- machine-readable exact lookup data

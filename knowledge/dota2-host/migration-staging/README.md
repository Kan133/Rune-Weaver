# Dota2 Host Migration Staging

这个目录是 Dota2 host knowledge 的 additive staging lane。

它只做三件事：

- 把 `references/dota2/docs/**` 里的高价值内容整理成面向 Tier 1 的 curated host knowledge
- 记录 source-to-knowledge provenance，方便主 session 后续接入 registry / canonical path
- 给出 cutover 候选清单，但不直接删除、重命名、搬迁任何仍可能被当前 code path 读取的 raw reference

## 当前边界

- 这里只新增文档，不改现有 canonical / stub 文件
- 不搬运 raw API `.json` / `.d.ts` 到 markdown knowledge
- 不触碰 `core/retrieval/**`
- 不对 `references/dota2/docs/**` 做 delete / move / rename

## 当前 staged 文档

- [abilities-casting-and-gameplay-shells](./abilities-casting-and-gameplay-shells.md)
- [panorama-ui-basics](./panorama-ui-basics.md)
- [custom-events-networking-and-state-sync](./custom-events-networking-and-state-sync.md)
- [host-realization-target-surfaces-and-boundaries](./host-realization-target-surfaces-and-boundaries.md)
- [typescript-addon-structure-and-watchers](./typescript-addon-structure-and-watchers.md)
- [panorama-build-input-and-scene-patterns](./panorama-build-input-and-scene-patterns.md)
- [ability-item-and-modifier-kv-contracts](./ability-item-and-modifier-kv-contracts.md)
- [filters-particles-and-runtime-control](./filters-particles-and-runtime-control.md)
- [unit-kv-creature-ai-and-wearables](./unit-kv-creature-ai-and-wearables.md)
- [tooltip-localization-and-ability-text-pipeline](./tooltip-localization-and-ability-text-pipeline.md)

## 辅助工件

- [CONSUMPTION-MANIFEST](./CONSUMPTION-MANIFEST.md)
- [consumption-manifest](./consumption-manifest.json)
- [COVERAGE-GAPS](./COVERAGE-GAPS.md)
- [provenance-manifest](./provenance-manifest.json)
- [PROVENANCE-MANIFEST](./PROVENANCE-MANIFEST.md)
- [CUTOVER-CANDIDATES](./CUTOVER-CANDIDATES.md)

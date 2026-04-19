# Dota2 Host Migration Staging Coverage Gaps

这份 backlog 只记录还值得继续清洗的高价值缺口。

标准：

- 不因为“还没搬完”就自动高优
- 只把真正影响 wizard / synthesis / repair / cutover 判断的缺口列上来

## Gap Table

| source doc / theme | missing section or gap | why it matters | affected workflow | priority | blocks cutover? | notes |
|--------------------|------------------------|----------------|------------------|----------|-----------------|-------|
| `references/dota2/docs/moddota_scripting_typescript.md` | `Modifiers in Typescript` | 当前 gameplay / modifier 语义有 KV 契约文档，但 TypeScript-side modifier realization 还没有同等级 staged doc | `wizard.create`, `wizard.update`, `synthesis.module` | `high` | yes | 这是 ability/modifier canonical-ready 的主要缺口之一 |
| `references/dota2/docs/moddota_scripting_typescript.md` | `Events and Timers in Typescript` | 现有 networking/state sync 有了，但 timers/event hooks 的 TS realization 还缺统一 staging 面 | `wizard.update`, `synthesis.module`, `repair.local` | `high` | yes | 会影响把 TS host 作为更完整 wizard front door |
| `references/dota2/docs/moddota_panorama_docs.md` | `Inclusive Panorama UI` | 当前 UI 基础和 build pipeline 有了，但可访问性/包容性约束还未转成 curated guidance | `wizard.create`, `wizard.update` | `medium` | no | 不阻塞首轮 cutover，但会影响更成熟的 UI guidance |
| `references/dota2/docs/moddota_panorama_docs.md` | `Button Examples` and `Hiding HUD with SetHUDVisible` | 具体 UI control / HUD manipulation 还没整理，影响部分 UI realization asks | `wizard.update`, `synthesis.module`, `repair.local` | `medium` | no | 这些更像 secondary UI patterns，不是当前主 cutover blocker |
| `references/dota2/docs/moddota_units.md` | `Unit producing buildings` | 单位/召唤已有 staging，但建筑产兵 surface 仍缺独立整理 | `wizard.create`, `wizard.update`, `synthesis.module` | `medium` | partial | 只阻塞涉及 building/spawner 的那类 cutover，不阻塞一般 unit docs cutover |
| `references/dota2/docs/moddota_units.md` | `Creating units with a duration` | 常见 summon shell 仍缺一份更精确的 staging 面 | `wizard.create`, `synthesis.module` | `medium` | partial | 可暂由现有 unit doc + raw reference 兜底 |
| `references/dota2/docs/moddota_abilities.md` | concrete tutorial-style sections such as `Simple Custom Ability`, `Making any ability use charges`, `Reutilizing Built-In Modifiers` | 当前有契约面，但缺少一部分高频 recipe/pattern 面 | `wizard.update`, `synthesis.module`, `repair.local` | `medium` | no | 不阻塞首轮 section-level cutover，但会影响 recipe richness |
| `references/dota2/docs/moddota_scripting_systems.md` | concrete gameplay systems: `Custom Mana System`, `Item Drop System`, `Scripted Shop Spawning` | 这些更偏案例型系统，暂未转成按 seam 组织的 curated docs | `wizard.update`, `synthesis.module` | `low` | no | 现在不宜机械搬运；应等主 session 真正需要这些 lanes 时再清洗 |
| `knowledge/dota2-host/slices/**` vs `migration-staging/**` | overlap classification still unresolved | 主 session 仍需要决定 slices 是保留、吸收到 canonical，还是仅作 provenance/intermediate source | `wizard.update`, `repair.local` | `high` | yes | 这是 cutover metadata blocker，而不是内容 blocker |
| `knowledge/dota2-host/sources/**` vs `migration-staging/**` | source-split stub tree disposition unresolved | 如果不澄清 sources 树在 phase 3/4 的角色，registry/read order 仍容易模糊 | `wizard.update`, `repair.local` | `high` | yes | 需要主 session 结合 retrieval posture 做决策，不建议并行 session 代做 |

## Highest-Value Next Cleaning Targets

如果之后还有一轮内容清洗，优先级建议是：

1. `Modifiers in Typescript`
2. `Events and Timers in Typescript`
3. `Unit producing buildings` / `units with duration`
4. Panorama secondary UI patterns

## Explicit Non-Urgent Gaps

这些缺口暂时不值得为了 cutover-ready metadata 继续扩写：

- 纯案例型 gameplay systems
- 低频 UI example collections
- 可以被 raw reference + 现有 staged contracts 共同兜底的 recipe 文档

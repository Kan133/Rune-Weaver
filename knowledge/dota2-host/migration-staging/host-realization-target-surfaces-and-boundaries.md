# Dota2 Host Realization 目标面与边界

## 1. 什么时候用

当一个 feature prompt 看起来“像一个简单技能”，但可能隐含 UI、inventory、persistence、shared declarations、state sync、input routing 等额外实现面时，优先看这份文档。

## 2. 来源与迁移状态

- 来源文件:
  - `knowledge/dota2-host/slices/scripting-systems/system-composition-notes.md`
  - `knowledge/dota2-host/migration-staging/typescript-addon-structure-and-watchers.md`
  - `knowledge/dota2-host/migration-staging/panorama-build-input-and-scene-patterns.md`
  - `knowledge/dota2-host/migration-staging/custom-events-networking-and-state-sync.md`
  - `knowledge/dota2-host/migration-staging/abilities-casting-and-gameplay-shells.md`
- 来源章节:
  - 多份 staged 文档的交叉归纳
- 合并整理: 是
- future canonical candidate: 是
- 必须继续保留的原文:
  - 上述 staging docs 的上游来源
  - `references/dota2/dota-data/files/**` 的 raw structured reference

## 3. 常见 realization target surfaces

一个 Dota2 feature 常见会落到这些面：

- gameplay ability / modifier / projectile
- units / summons / thinker entities
- panorama UI
- keybinding / input routing
- custom events / nettables
- shared declarations
- localization / tooltip
- inventory / items
- persistence / workspace state

关键点是：它们不是默认全选。

## 4. 推荐判断顺序

### 4.1 先识别 mechanic core

先问：

- 这个 feature 的核心是 ability、rule、unit 还是 UI？

如果核心是 ability，不应自动引入 UI。

### 4.2 再识别是否需要跨边界桥接

再问：

- 是否真的需要 client/server 通信？
- 是否真的需要持续状态显示？
- 是否真的需要 shared declaration？

如果答案都是否，就不要加 event/nettables/shared。

### 4.3 最后识别外围面

只有在需求明确时，才继续判断：

- inventory
- tooltip/localization
- persistence
- scene panel

## 5. 负向约束要当真

如果需求出现这类约束：

- 不要 UI
- 不要 inventory
- 不要 persistence
- 不要 panorama

它们不是“弱建议”，而是 realization scope 的硬边界。

这类边界如果被误判，常见后果是：

- 注入无关 module
- 多生成无用桥接代码
- 让 feature 需要 review 的面数暴涨

## 6. 推荐的最小实现心智

### 6.1 ability-only

只做：

- ability KV
- script/TS ability
- 必要 modifier/projectile

不做：

- UI
- events/nettables
- inventory

### 6.2 ability + state sync

只在玩家需要持续看到状态时，增加：

- nettables
- shared declaration
- 简单 UI 订阅面

### 6.3 ability + explicit UI flow

只有 prompt 明确需要选择框、资源条、提示面板等时，才增加：

- Panorama
- custom events
- manifest / layout / entry 接线

## 7. 哪些东西绝不能迁成 curated knowledge 真相

这轮 staging 要一直保持这条边界：

- `.json`
- `.d.ts`
- symbol dump
- enum dump
- machine reference exact lookup 产物

这些应继续作为：

- raw structured reference
- Tier 2 exact lookup
- symbol / API grounding 来源

而不是被洗成“人读知识正文里的唯一真相”。

## 8. 对主 session 的价值

- 帮 phase 3/4 的 retrieval cutover 保持“按 surface 接线”，而不是按文件名粗暴切换
- 也帮助避免把 raw structured reference 与 curated host knowledge 混层

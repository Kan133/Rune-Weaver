# Abilities API

## 用途

- 汇总 ability 相关宿主 API
- 支撑 ability-oriented Pattern 的 host binding
- 支撑 server 侧写入目标规划

## 当前主要来源

- `references/dota2/dota-data/files/vscripts/api.json`
- `references/dota2/dota-data/files/vscripts/api-types.json`

## 当前可用方式

优先从 `api.json` 中查：

- 以 `CDOTABaseAbility`、`CDOTA_Ability_*`、`CBaseEntity` 为核心的可调用 API

优先从 `api-types.json` 中查：

- ability 相关类型
- ability 行为、返回值和参数类型

## 对 Rune Weaver 的直接价值

- `input.key_binding` 触发后如何接入 ability 逻辑
- `effect.dash` 这类 server effect 最终落到 ability / unit 调用边界
- 后续技能绑定、冷却、施法约束时会继续依赖本类知识

## 当前缺口

- 还没有把 ability 专题切成更细的：
  - cast
  - cooldown
  - behavior
  - targeting

这是后续 P1 工作，不是当前阻塞项。

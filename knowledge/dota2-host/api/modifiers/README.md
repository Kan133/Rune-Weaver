# Modifiers API

## 用途

- 汇总 modifier 相关宿主 API
- 支撑 `effect.modifier_applier`
- 澄清 server 侧效果应用边界

## 当前主要来源

- `references/dota2/dota-data/files/vscripts/api.json`
- `references/dota2/dota-data/files/vscripts/api-types.json`

## 当前重点关注

当前阶段应重点提炼：

- modifier 的应用方式
- buff / debuff 生命周期
- modifier 属性与回调

## 对 Rune Weaver 的直接价值

- `effect.modifier_applier` 已进入真实 catalog
- 系统型 case 的“结果应用”现在主要落在这里
- 后续 talent / card / forge 这类 outcome application 都会依赖 modifier 边界

## 当前缺口

- 还没有独立整理 modifier property / event / state 的专题知识
- 这会在后续 system case 增多时成为知识缺口

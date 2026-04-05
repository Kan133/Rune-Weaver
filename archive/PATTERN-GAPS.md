# PATTERN-GAPS

## 说明

这份文档已阶段性归档。

它记录的是当前 catalog 在早期 assembly 阶段暴露出的历史 gap，以及这些 gap 的处理结果。

它**不再**作为后续新一轮 pattern 提取的主要驱动文档。

## 历史结论

- `effect.modifier_applier`
  - 结论：应成为正式 pattern
  - 当前状态：已进入 catalog

- `rule.player_selection`
  - 结论：不应新增 pattern
  - 当前处理方式：映射到 `rule.selection_flow`

- `rule.weighted_random`
  - 结论：不应新增 pattern
  - 当前处理方式：映射到 `data.weighted_pool`

- `resource.cost_validator`
  - 结论：当前阶段不单独新增
  - 当前处理方式：由 `effect.resource_consume` 承接

- `integration.event_bridge`
  - 结论：当前阶段暂不处理

## 为什么归档

这份文档的历史任务已经完成：

- `P0` gap 已收口
- `P1` gaps 已证明更适合通过 mapping 解决
- `P2` gaps 暂无新 case 触发

继续按这份文档驱动提取，只会重复处理已知结论。

## 后续 pattern 从哪里来

后续若要新增 pattern，应改由以下来源驱动：

1. 新的 assembly / host write / UI adapter 真实缺口
2. 新的 generalization family case
3. 明确的 candidate / reference-fragment review

## 当前 catalog 参考

当前稳定的最小 catalog 包括：

- `input.key_binding`
- `data.weighted_pool`
- `rule.selection_flow`
- `effect.dash`
- `effect.modifier_applier`
- `effect.resource_consume`
- `resource.basic_pool`
- `ui.selection_modal`
- `ui.key_hint`
- `ui.resource_bar`

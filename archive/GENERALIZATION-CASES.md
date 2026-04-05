# GENERALIZATION-CASES

## 1. 文档目的

本文档用于定义 Rune Weaver 在 MVP 之后必须验证的“通用性”问题。

这里的通用性不是指：
- 可以生成很多不同名字的系统
- 可以写很多不同模板

这里的通用性指的是：

`不同领域表述的需求，是否能被 Rune Weaver 稳定归一化为相同或高度相似的机制骨架，并复用同一组 pattern 组合完成生成。`

---

## 2. 为什么需要这份文档

Rune Weaver 的长期价值，不在于：
- 为天赋抽取写一个系统
- 为卡牌抽取再写一个系统
- 为装备锻造随机升级再写第三个系统

而在于：

`把看似不同的系统压缩到少量共享的 mechanic patterns 上。`

例如下面三个需求：
- 天赋三选一
- 卡牌三选一
- 装备锻造随机升级三选一

它们的领域词不同，但底层可能复用同一机制骨架：
- 候选池
- 抽取策略
- 玩家选择流程
- 选择 UI
- 结果应用

如果 Rune Weaver 做不到这一点，它最终会退化为：
- 大量垂直模板
- 大量专用 pattern
- 不断新增“几乎一样”的系统分支

这会直接破坏产品的可迁移性、可维护性和可扩展性。

---

## 3. 当前结论

按照当前架构，Rune Weaver 有机会实现通用性，但当前 MVP 还没有真正证明这一点。

原因：
- `IntentSchema` 已经能承接需求结构，但还不够强调“机制骨架”和“领域皮肤”的分离
- `Blueprint` 的真实归一化能力还没有被家族用例验证
- `Pattern` 体系刚起步，仍需要更多参数化，而不是继续堆专用 pattern

因此，通用性必须被当作一个明确的验证目标，而不能只靠直觉判断。

---

## 4. 通用性判定标准

Rune Weaver 的通用性成立，至少需要同时满足以下四条。

### 4.1 Schema 归一化成立

面对同骨架不同皮的需求：
- `IntentSchema` 的大部分结构应相同
- 真正变化的主要应是：
  - 领域词
  - 数据内容
  - 呈现风格
  - 少数规则参数

不应出现：
- 每换一个题材，schema 结构就完全不同

### 4.2 Blueprint 骨架复用成立

面对同骨架不同皮的需求：
- `Blueprint.modules`
- `Blueprint.wiring`
- `Blueprint.validations`

应高度相似。

不应出现：
- 每个新需求都产出完全不同的 blueprint 结构

### 4.3 Pattern 复用成立

面对同骨架不同皮的需求：
- 主要复用同一组 patterns
- 差异主要体现在参数与 overlay，而不是 pattern 名字全面变化

不应出现：
- `talent_selection_flow`
- `card_selection_flow`
- `forge_selection_flow`

这种仅因领域名不同就新增 pattern 的情况。

### 4.4 宿主落地差异可控

在 Dota2 宿主中，同骨架不同皮的需求不应导致：
- 完全不同的写入策略
- 完全不同的桥接方式
- 完全不同的 UI 接入方式

差异应主要体现为：
- 数据
- 参数
- UI 文案与样式
- 结果应用方式

---

## 5. 家族用例设计原则

通用性不能通过单个 demo 证明，必须通过“家族用例”验证。

家族用例指的是：

`共享底层机制骨架，但领域语义不同的一组需求。`

设计原则：
- 同家族案例必须共享明显的 mechanic structure
- 同家族案例必须在表面语义上有足够差异
- 每组家族至少包含 3 个案例
- 至少覆盖：
  - selection
  - resource
  - trigger

---

## 6. 第一批通用性验证家族

### 6.1 Selection 家族

目标：
- 验证“抽取/选择/应用结果”这一骨架是否真能复用

案例 A：
- 天赋三选一

案例 B：
- 卡牌三选一

案例 C：
- 装备锻造随机升级三选一

预期共享骨架：
- `data.weighted_pool`
- `rule.selection_flow`
- `ui.selection_modal`
- `effect.apply_choice_result`

允许变化：
- 候选对象名称
- 稀有度与权重
- 结果应用目标
- UI 文案与风格

不应变化：
- 整个系统的核心流程结构

### 6.2 Resource 家族

目标：
- 验证“资源存在 / 消耗 / 校验 / 反馈”这一骨架是否真能复用

案例 A：
- 技能释放消耗法力

案例 B：
- 抽卡消耗货币

案例 C：
- 锻造消耗材料

预期共享骨架：
- `resource.basic_pool`
- `effect.resource_consume`
- `ui.resource_bar`
- `rule.requirement_check`

允许变化：
- 资源名称
- 资源图标
- 消耗量
- 不足时提示

### 6.3 Trigger 家族

目标：
- 验证“触发方式变化”是否能只影响局部 pattern

案例 A：
- 按键触发

案例 B：
- 事件触发

案例 C：
- 回合开始触发

预期共享骨架：
- 主功能 pattern 不变
- 只替换或补充 trigger 相关 pattern

允许变化：
- trigger source
- 节流与冷却规则
- 提示方式

---

## 7. 每组家族要记录什么

每组家族验证时，必须至少记录以下内容。

### 7.1 原始需求文本

记录用户的原始自然语言需求。

### 7.2 IntentSchema 对比

记录：
- 哪些字段相同
- 哪些字段不同
- 哪些不同只是领域皮肤
- 哪些不同属于真实机制差异

### 7.3 Blueprint 对比

记录：
- module 数量与类型
- wiring 结构
- validations
- 哪些模块完全复用

### 7.4 Pattern Resolution 对比

记录：
- 复用了哪些 patterns
- 哪些 pattern 只是参数不同
- 哪些地方新增了 pattern
- 新增 pattern 是否合理

### 7.5 宿主输出对比

记录：
- 哪些文件结构相同
- 哪些只是数据或 UI 文案不同
- 是否出现不必要的新桥接路径

---

## 8. 失败信号

如果出现以下情况，应判断通用性验证失败或不足。

### 8.1 不断新增领域专用 pattern

典型失败形式：
- `talent_draw_flow`
- `card_draw_flow`
- `forge_upgrade_flow`

如果它们只是同骨架换名，说明模式抽象失败。

### 8.2 Blueprint 无法归一化

如果三个同家族案例的 blueprint 结构完全不同，说明：
- wizard 澄清不稳定
- builder 没有归一化能力

### 8.3 Schema 混淆领域词和机制词

如果 schema 里大量字段都直接绑定：
- 天赋
- 卡牌
- 装备词条

而不是：
- candidate
- choice
- pool
- outcome

说明 schema 抽象层不够通用。

### 8.4 宿主接入发生分叉

如果同骨架案例在宿主层需要：
- 不同 bridge
- 不同命名空间
- 不同写入策略

说明 adapter 设计发生了不必要分叉。

---

## 9. 对现有架构的要求

为了让 Rune Weaver 真正具备通用性，后续开发必须坚持以下方向。

### 9.1 Pattern 优先参数化，不优先专用化

优先做：
- 更强参数
- 更清晰边界
- 更稳定 host binding

谨慎做：
- 仅因领域不同就新增新 pattern

### 9.2 Wizard 和 Blueprint Builder 需要显式归一化

未来应在 `IntentSchema` 或 `Blueprint` 中增加更明确的 mechanic signals，例如：
- candidate pool
- weighted selection
- player choice
- modal UI
- outcome application

### 9.3 验收必须加入“家族复用”视角

后续 agent 不应只汇报：
- “这个 case 能跑”

还应回答：
- “这个 case 是否复用了已有机制骨架”

---

## 10. 下一步建议

建议后续按如下顺序推进。

### 第一步

先完成真实：
- `Wizard -> IntentSchema -> CLI`

因为没有真实 Wizard 输入，通用性还无法被有效检验。

### 第二步

建立一个最小家族验证样本集：
- 天赋三选一
- 卡牌三选一
- 装备升级三选一

### 第三步

要求每次生成时额外输出：
- 归一化机制摘要
- pattern 复用摘要

### 第四步

如果发现同骨架案例仍然频繁新增 pattern，再回头调整：
- `IntentSchema`
- `Blueprint Builder`
- `PatternMeta`

而不是先堆更多业务模板。

---

## 11. 结论

Rune Weaver 的通用性不应通过“支持很多不同名字的系统”来证明，而应通过：

`同骨架不同皮的需求，是否能稳定归一化并复用同一组 pattern 组合`

来证明。

MVP 阶段可以先接受“通用性方向成立但尚未证明”，但进入下一阶段后，必须用本文件中的家族用例进行验证。

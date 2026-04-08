# Gap Fill 约束框架（中文）

## 目的

本文档用于明确 Rune Weaver 中 `gap-fill` 的能力边界，避免在 Phase 2 / Phase 3 推进过程中把 gap-fill 变成：

- 任意补系统没建模部分的黑洞层
- 变相的新机制承载层
- 伪 pattern 生成器
- 越权修改 host / lifecycle / composition policy 的逃逸通道

这份文档只定义边界，不定义完整实现方案。

---

## 一句话定义

**Gap-fill 是对已确定 feature 结构的局部、低风险、受控补全，不是新机制承载层。**

关键词只有三个：

- 已确定结构
- 局部
- 受控

如果离开这三个前提，gap-fill 很容易变成一个没有边界的系统黑洞。

---

## Gap-fill 为什么需要存在

Rune Weaver 不可能把所有细节都提前抽象成 pattern、contract 或 schema。

真实 feature 构建中，总会存在一类更细粒度、创意化、但又不足以单独抽象成新 pattern 的内容，例如：

- 微文案
- 默认数值
- 局部变体
- 小块局部逻辑
- 已有机制上的轻量差异

如果系统完全不承接这些内容，用户会被迫：

- 手工补文件
- 硬塞进不合适的参数层
- 或反复要求新增不必要的 pattern

因此 gap-fill 需要存在，但必须被严格约束。

---

## Gap-fill 不是什么

### 1. 不是“系统没建模的都丢进去”的兜底层

如果某个能力：

- 改变主机制
- 改变主触发方式
- 改变主数据模型
- 改变主 UI 形态

那它不应进入 gap-fill。

### 2. 不是新 pattern 的替代品

如果一个需求反复出现、语义清晰、结构稳定，那么它更应该被提升为：

- core pattern
- canonical pattern
- 或稳定的 feature preset

而不是长期塞在 gap-fill 里。

### 3. 不是 host policy 的逃逸通道

gap-fill 不应被用来绕过：

- ownership boundary
- host realization policy
- generator routing policy
- lifecycle safety
- composition governance

### 4. 不是自由代码生成区

gap-fill 不能成为：

- “这里系统不懂，随便生成一大段代码”

否则 Rune Weaver 会迅速退化成：

- 更会说垂类术语的 vibe coding

而不是一个受控 feature construction system。

---

## Gap-fill 的三种正当类型

我建议把 gap-fill 收紧成下面三类。

### 第一类：参数级补缺

这是最安全、最基础的 gap-fill。

典型例子：

- duration
- cooldown
- choiceCount
- weight
- title
- description
- style token
- 文案提示

特点：

- 不改变 feature 主结构
- 不引入新机制
- 只是让 feature 更完整、更可用

### 第二类：局部实现变体

前提是主 pattern / 主结构已经存在。

典型例子：

- modal 的 copy 风格
- 已有 effect 骨架上的小逻辑变体
- 已有 UI pattern 的小布局变体
- 已有数据结构中的默认字段扩充

特点：

- 允许产生少量代码或 spec 变化
- 但不改变机制骨架
- 仍然依附于已有 pattern / module 结构

### 第三类：受控局部 patch

前提是 patch 落点明确、ownership 清晰、不会越权。

典型例子：

- 已生成文件中的某个 slot body
- 已有模板中的一个局部条件逻辑
- 某个受控 generator slot 的定制内容

特点：

- patch 面必须小
- patch 点必须受控
- 不允许 host-wide 任意扩散

---

## 什么不应该进入 gap-fill

下面这些东西，原则上都不应进入 gap-fill。

### 1. 新机制

例如：

- 新的伤害传播机制
- 新的目标选择模型
- 新的资源系统
- 新的 UI surface 类型

这些都不应被伪装成 gap-fill。

### 2. 新宿主语义

例如：

- 新 bridge 点
- 新 host capability
- 新 realization route
- 新 generator family

这些属于 host contract / host pack 扩展，不属于 gap-fill。

### 3. 新组合规则

例如：

- 新 hook composition policy
- 新 ownership rule
- 新 conflict strategy

这些属于治理层，不属于 gap-fill。

### 4. 大块自由实现

如果一个“补缺”最终要落成：

- 一段新的独立 server 逻辑
- 一整块新的 UI 主体
- 一段新的 host integration 流程

那它很可能已经超出 gap-fill 范围。

---

## 快速判断一个需求是不是 gap-fill

以后遇到一个需求，可以先问这四个问题。

### 1. 主结构已经确定了吗？

如果没有，先不要进入 gap-fill。

### 2. 这是在改骨架，还是补细节？

改骨架不是 gap-fill。  
补细节才可能是。

### 3. 它需要新的 pattern / host rule / integration point 吗？

如果需要，就不是 gap-fill。

### 4. 如果把它删掉，主 feature 还成立吗？

如果删掉后主 feature 仍成立，只是没那么丰富，那它更可能是 gap-fill。

如果删掉后 feature 的本质改变了，那它不是 gap-fill。

---

## 你提到的“创意化部分”该怎么理解

Rune Weaver 的 gap-fill 可以承接**小创意**，但不能承接**新机制创意**。

这条线必须清楚。

### 可以承接的小创意

例如：

- 一个已有 modal 里的文案风格
- 一个已有 buff 的说明与小数值变化
- 一个已有 effect 的局部视觉表达
- 一个已有规则里的轻量默认策略

### 不应承接的新机制创意

例如：

- “攻击有概率造成闪电链”如果意味着新传播机制
- “击杀目标后复制技能效果到附近单位”如果意味着新主逻辑
- “商店刷新失败时改走另一套候选池”如果意味着新规则骨架

这些不该被偷塞进 gap-fill。

---

## 关于“攻击造成闪电链”这个例子

这个例子很适合用来做边界判断。

### 情况 A：它意味着新的主机制

如果“闪电链”意味着：

- 新的目标选择逻辑
- 新的伤害传播逻辑
- 新的 hook / integration point 使用
- 新的 effect 结构

那这不是 gap-fill。  
它更像：

- 新 pattern
- canonical composition
- 或新的 effect family

### 情况 B：它是已有机制中的局部变体

如果系统已经有：

- 明确的连锁伤害骨架
- 明确的 bounce-effect family
- 明确的 target propagation 结构

而用户只是补：

- 跳几次
- 跳多远
- 伤害衰减
- 文案和默认参数

那它更接近 gap-fill / parameter fill。

所以关键不是“有没有代码”，而是：

- 它是不是在改变 feature 主机制
- 还是只是在补足已有机制的局部细节

---

## Gap-fill 与 Pattern 的关系

### Pattern 负责

- 机制原语
- 稳定可复用结构
- host-aware 可承接能力

### Gap-fill 负责

- 在已有结构之内做局部补足
- 让 feature 更像真实实现
- 避免为过小差异不断新增 pattern

一句话：

- pattern 解决“是什么机制”
- gap-fill 解决“这个机制里还有哪些局部细节没被说清”

---

## Gap-fill 与 Blueprint Planning 的关系

Gap-fill 不应先于 Blueprint Planning。

推荐顺序是：

1. 主结构先由 Wizard / Blueprint / Pattern Resolution 确定
2. host-aware realization 路径确定
3. 再由 gap-fill 补局部缺口

如果顺序反过来，就会出现：

- 结构还没定
- gap-fill 先开始乱补

最后把本该在 planning 层解决的问题推给补缺层。

---

## Gap-fill 与 UI Wizard 的关系

这也是必须收紧的边界。

### UI Wizard 负责

- 结构性 UI 澄清
- 交互强度
- 信息密度
- style direction
- key copy intent

### UI gap-fill 负责

- 微文案
- token defaults
- 小布局变化
- 小交互变化

因此：

- UI Wizard 不应被并入 gap-fill
- UI gap-fill 只能作为 UI Wizard 之后的低风险补缺层

---

## Gap-fill 与治理层的关系

Gap-fill 不能越过治理层。

它不应绕过：

- feature ownership
- conflict detection
- integration point policy
- review / confirm 流程

一句话：

**Gap-fill 可以补缺，但不能越权。**

---

## 宿主污染防线

Gap-fill 也必须防止宿主污染。

### 允许宿主影响的层

- host pack 内的局部补全策略
- host-specific template slots
- host-specific low-risk fill defaults

### 不允许宿主污染的层

- gap-fill 的通用定义
- gap-fill 的风险判断规则
- gap-fill 与 pattern / Wizard / governance 的边界

例如：

- Dota2 的某类细节补全可以是一个 host-specific gap-fill case
- 但不能因此把 Dota2 的细节写成 gap-fill 的通用定义

---

## Phase 2 的接入方式

Gap-fill 不应在 Phase 2 一开始就全面铺开。

推荐节奏如下：

### Phase 2A

只做：

- 参数级补缺
- 低风险默认值补缺
- 局部 copy / style 缺失补缺

### Phase 2B

再做：

- 局部实现变体
- 小范围 slot patch
- 与 review / confirm 面联动

### Phase 2C

最后才考虑：

- 更复杂的 host-specific gap-fill
- 更成熟的结构化 preset + fill 协同
- 与 LLM planning 更紧密联动

---

## 什么时候一个 gap-fill 应该升级为 pattern

如果某个 gap-fill 满足下面条件，就不应长期停留在 gap-fill。

### 升级信号

- 反复出现
- 语义清晰稳定
- 多个 case 都在用
- 已经不再是局部补缺，而是稳定机制
- 需要单独 validation / governance

这时更适合升级为：

- core pattern
- canonical pattern
- 或正式 feature preset

---

## 最终一句话

Rune Weaver 的 gap-fill 应该被定义为：

**在既有 feature 结构、pattern 结构和 host 结构已经确定的前提下，对局部实现细节做低风险、受控、可审阅的补全。它不能承载新机制，不能绕过治理层，也不能取代 pattern。**

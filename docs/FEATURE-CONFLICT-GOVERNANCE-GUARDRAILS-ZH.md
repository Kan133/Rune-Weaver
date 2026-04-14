# Feature Conflict Governance 约束框架（中文）

> Status: planning
> Audience: agents
> Doc family: planning
> Update cadence: temporary
> Last verified: 2026-04-14
> Read when: evaluating future conflict-governance design and guardrails
> Do not use for: current conflict-governance baseline, current lifecycle scope, or execution ordering

## 目的

本文档用于明确 Rune Weaver 中 `Feature Conflict Governance` 的产品边界与架构边界，避免在 Phase 2 / Phase 3 推进过程中把“冲突治理”做成：

- 一个模糊的大词
- 一个纯 agent 判断层
- 一个靠 pairwise compatibility matrix 维持的维护地狱
- 一个用户看不懂、系统也解释不清的黑盒阻断器

这份文档只定义边界与目标，不定义完整实现方案。

---

## 一句话定义

**Feature Conflict Governance 是 Rune Weaver 在写入前发现、解释、裁决和约束 feature 之间冲突的治理层。**

它不是“更聪明的代码生成”，而是“在多 feature 共存时，系统开始承担责任”。

这里必须明确一个关键边界：

- 它不是对“整个代码库”的全局语义理解系统
- 它不是 AGI 级别的任意业务逻辑推理器
- 它不承诺理解所有用户手写代码与所有运行时后果

Rune Weaver 的冲突治理只应建立在：

- Rune Weaver 已知的 feature identity
- Rune Weaver 已声明的 ownership / impact baseline
- Rune Weaver 已声明的 integration points / allowed host boundary

也就是说，它首先是**受控边界内的 feature-level governance**，而不是全局代码语义治理。

---

## 为什么必须存在

Rune Weaver 如果只擅长：

- 生成单个 feature
- 生成局部代码
- 解释单次结果

那它最终很容易退化成：

- 专业领域 RAG
- 特调过 prompt 的 vibe coding

真正能拉开差距的，是当多个 feature 持续叠加时，系统是否能：

- 提前发现冲突
- 解释冲突原因
- 给出处理建议
- 必要时阻止不安全写入

这正是 `Feature Conflict Governance` 存在的意义。

---

## v1 可实现承诺

Feature Conflict Governance 的第一版承诺必须收紧。

第一版不应承诺：

- 判断任意新功能是否会破坏整个代码库
- 理解所有用户业务逻辑
- 自动推演所有 runtime 交互后果
- 自动修复所有 feature 组合问题

第一版更合理的承诺是：

- 只对 Rune Weaver 已知、已声明、已拥有的 feature 与接入边界负责
- 只处理少数高价值、可规则化的冲突类型
- 只做到最小：
  - detect
  - explain
  - confirm
  - block

这不是能力收缩，而是让系统在可信边界内成立。

---

## 它解决的不是所有冲突

Rune Weaver 不应试图一开始治理所有问题。

这层最优先应聚焦于**功能组合冲突**，而不是：

- 平衡性问题
- 视觉 polish 问题
- 文案风格统一问题
- 所有复杂策略推演

第一批冲突治理应聚焦“系统必须在写入前负责”的部分。

---

## 三类核心冲突

### 第一类：共享接入点冲突

这是 Phase 2 最应优先解决的一类。

典型表现：

- 两个 feature 都要接同一个 hook
- 两个 feature 都要接同一个 integration point
- 两个 feature 都要使用同一个 UI mount point
- 两个 feature 都要写同一个 registry / dispatcher 入口

Rune Weaver 必须先能识别这类冲突。

### 第二类：共享资源 / 状态冲突

典型表现：

- 两个 feature 都在改同一份池子
- 两个 feature 都在改同一份 shared data
- 两个 feature 都在影响同一个状态面
- 两个 feature 的局部逻辑都依赖同一份核心数值结构

这类冲突更接近玩法系统中的“组合污染”。

### 第三类：生命周期与 ownership 冲突

典型表现：

- 新 feature 想改一个已有 feature 拥有的位置
- update / regenerate / rollback 后 ownership 会变乱
- 两个 feature 都认为自己拥有同一段生成物

这类冲突最能体现 Rune Weaver 的工程治理价值。

---

## Phase 2 不该一开始解决的冲突

### 1. 纯数值平衡冲突

例如：

- 数值过高
- 概率不合理
- 战斗体验不平衡

这些很重要，但不属于第一层治理重点。

### 2. 纯文案风格冲突

例如：

- 按钮词不统一
- copy tone 不一致

这是产品 polish，不是第一批 feature conflict governance 的核心。

### 3. 高阶策略冲突

例如：

- 多阶段 graph 级调度冲突
- 复杂跨系统时序推演

这更偏 Phase 3。

---

## 谁负责什么

Feature Conflict Governance 不能只靠一个 agent 拍脑袋完成。

必须分层。

### 1. deterministic engine 负责

- 冲突检测
- ownership 检查
- integration point 占用检查
- host policy 检查
- legality / write safety 判断

### 2. orchestrator / lead agent 负责

- 把冲突翻译成用户能理解的语言
- 给出处理选项
- 组织 review / confirm
- 判断哪些冲突必须让用户决策

### 3. 用户负责

- 在多个合法方案中做业务意图选择
- 决定保留、互斥、合并还是放弃

如果没有这三层分工，治理层会要么过度自动化，要么完全不可用。

---

## 系统至少要提供的四步闭环

Feature Conflict Governance 不应止步于“发现冲突”。

最小闭环应至少包含：

1. detect
2. explain
3. propose
4. confirm / block

也就是说：

- 先发现
- 再解释
- 再给方案
- 最后再执行或阻止

---

## 允许的处理结果

对一个冲突，系统最终至少应能落到下面几类结果之一。

### 1. 可聚合

例如：

- 两个 effect 都是 append 型
- 可以进入 shared dispatcher

### 2. 需互斥

例如：

- 两个 feature 都独占某个主入口

### 3. 需共享中介层

例如：

- 两个 feature 都要使用同一个 hook
- 需要由系统建立 shared dispatcher / registry slot

### 4. 必须用户确认

例如：

- 两个方案都成立
- 但系统无法判断产品意图

### 5. 直接阻止写入

例如：

- 越权覆盖
- lifecycle 必然失效
- host policy 明确不允许

---

## 禁止的做法

### 1. 不允许主要依赖 pattern 两两兼容矩阵

不能把治理层做成：

- pattern A compatible with B
- pattern A conflicts with C

这种 pairwise matrix 主导的系统。

应优先依赖：

- pattern 自身属性
- integration point metadata
- ownership rules
- 平台级组合规则

### 2. 不允许让 agent 单独裁决最终合法性

agent 可以：

- 提案
- 解释
- 建议

但合法性与写入安全必须由 deterministic layer 负责。

### 3. 不允许把冲突问题延后到 runtime 再暴露

治理层的核心价值之一，就是尽量在写入前暴露风险。

### 4. 不允许把所有冲突都变成用户手动 debug

如果最后所有冲突都要用户自己读代码解决，那 Rune Weaver 的治理价值就没有成立。

### 5. 不允许把冲突治理宣传成“理解整个代码库”

如果冲突治理被表述成：

- 系统理解整个仓库的全部语义
- 系统能判断任意代码改动的所有后果

那这个承诺就是不现实的。

冲突治理必须始终被约束在：

- Rune Weaver 已知 feature
- Rune Weaver 已声明接入点
- Rune Weaver 已声明 ownership / host boundary

之内。

---

## 与 Pattern 的边界

Pattern 负责：

- 机制原语
- host-aware 可承接能力

Feature Conflict Governance 负责：

- 当多个原语落到同一项目里时，如何共存

所以：

- Pattern 不是治理层
- 治理层也不应直接取代 pattern 设计

---

## 与 Blueprint LLM 的边界

Blueprint LLM 可以：

- 识别潜在冲突风险
- 提出结构建议

但它不能：

- 单独定义冲突规则
- 单独决定最终合法性
- 单独跳过治理层

LLM 可以帮助规划，不能取代治理。

---

## 与 Review 的边界

Feature Conflict Governance 不等于 review，但必须进入 review 面。

产品层应该向用户展示的是：

- 这两个功能都在改同一个入口
- 这两个功能都在影响同一份共享数据
- 这次改动会影响已有功能的后续更新与回退

而不是直接把：

- hook conflict
- ownership boundary
- integration metadata

原样甩给用户。

---

## 宿主污染防线

冲突治理必须保持宿主中立。

### 允许宿主影响的层

- host-specific integration point catalog
- host-specific ownership rules
- host-specific blocking rules

### 不允许宿主污染的层

- 冲突治理的产品定义
- 冲突处理的通用流程
- 默认 review 语言

也就是说：

- Dota2 可以提供第一套 host-specific conflict pack
- 但不能把 Dota2 的冲突表达当成产品通用定义

---

## Phase 2 的接入顺序

推荐顺序如下：

### Phase 2A

先做：

- feature identity
- ownership baseline
- integration point registry

### Phase 2B

再做：

- 共享接入点冲突检测
- 最小 explain / propose / confirm 闭环

### Phase 2C

再扩到：

- 生命周期与 ownership 冲突
- 共享资源 / 状态冲突

### Phase 2D

最后再考虑：

- 更复杂的多 feature 组合裁决
- 更复杂的 graph 级 conflict reasoning

---

## 最终一句话

Rune Weaver 的 `Feature Conflict Governance` 应该被定义为：

**在多 feature 共存时，由 deterministic engine 负责检测合法性与风险，由 orchestrator 负责把冲突翻译成可理解、可裁决的产品语言，并在必要时阻止不安全写入的治理层。**

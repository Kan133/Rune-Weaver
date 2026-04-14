# Workbench Frontend Plan v1（中文）

> Status Note
>
> 本文档是前端规划文档，不是当前 shipped 实现说明。
> 当前 agent 执行时，前端真实边界以 [AGENT-EXECUTION-BASELINE.md](/D:/Rune%20Weaver/docs/AGENT-EXECUTION-BASELINE.md) 和 workspace/bridge 实现为准。

## 目的

本文档用于把 Rune Weaver 的前端方向收束成一份可执行的 Workbench 前端计划，避免前端过早退化成：

- 终端输出的网页翻版
- 普通聊天页面
- 代码编辑器壳
- 脱离 feature lifecycle 的组件堆砌

本文档只回答三件事：

1. 前端到底是什么
2. 前端第一阶段要做成什么样
3. 前端如何服务 Rune Weaver 当前最重要的产品卖点

---

## 一句话定义

**Workbench 前端不是聊天页，而是一个以 feature 为主对象的 lifecycle workbench。**

用户通过统一输入入口描述功能；系统围绕 feature 产出 review、lifecycle、update、governance 与 write 状态；前端负责把这些结构化对象清楚地展示出来。

---

## 当前产品卖点

前端必须围绕以下两个卖点组织，不允许偏离。

### 1. blueprint + pattern 组装代码

Rune Weaver 的价值不是“直接吐代码”，而是：

- 先形成 blueprint / proposal
- 再按 pattern / module / host layer 进行结构化组装
- 因而比纯 prompt codegen 更稳定、更可控、更可审查

前端必须让用户感知到：

- 系统不是乱生成
- 系统有 blueprint
- 系统有 pattern / module / affected surfaces
- 系统知道将落到哪些 host layers

### 2. feature-first

Rune Weaver 的主对象不是：

- prompt
- patch
- file

而是：

- feature

这对小白更友好，因为用户不需要先理解：

- Lua
- KV
- Panorama TS
- server/client 边界

用户管理的是“功能”，系统管理的是“实现层”。

---

## 前端总体定位

前端应该做成一个单页 workbench，具有以下特征：

- 一个统一输入入口
- 一个当前 feature 主视图
- 一组次级状态面板
- 一条清楚的 lifecycle / update chain
- 一块 blueprint / pattern / output 视图

它不是：

- 聊天记录驱动的页面
- 多文件代码浏览器
- patch diff 工具首页

---

## 主对象与核心区块

### 主对象

前端主对象必须是：

- Feature

### 当前最重要的对象层

前端必须围绕以下对象展示：

- FeatureReview
- FeatureCard
- FeatureDetail
- LifecycleActions
- ActionRoute
- FeatureRouting
- FeatureFocus
- UpdateHandoff
- UpdateHandler
- UpdateDryRunPlan
- UpdateWriteResult
- GovernanceRelease
- ConfirmationAction

---

## 页面信息架构

建议第一版采用单页三段式布局。

### A. 顶部：统一输入区

包含：

- request 输入框
- submit 按钮
- host root 指示或切换
- dry-run / write 开关

作用：

- 所有 create / update 请求都从这里进入

### B. 左侧主区：Feature 主视图

包含：

- Feature Review
- Feature Card
- Feature Detail

这部分回答：

- 当前功能是什么
- 系统怎么看这个功能
- 当前风险和缺失项是什么

### C. 右侧状态区：Lifecycle / Update Chain

包含：

- Lifecycle Actions
- Action Route
- Feature Routing
- Current Feature Focus
- Update Handoff
- Update Handler
- Governance Release
- Confirmation Action
- Update Dry-Run Plan
- Update Write Result

这部分回答：

- 系统当前如何判断
- 卡在哪里
- 下一步是什么
- 如果更新，会落到谁
- 是否能进入写入

### D. 底部或折叠区：Blueprint / Pattern / Output

包含：

- Blueprint Proposal
- Proposed Modules
- affected surfaces
- touched outputs
- generated files / write evidence

这部分回答：

- 系统准备怎么实现
- 将影响哪些层
- 实际写入了什么

---

## 第一版交互模式

第一版只支持三条核心交互路径。

### 路径 1：新建 feature

示例：

- 做一个简单的冲刺技能

前端应清楚显示：

- routing = create
- focus = newly_created
- lifecycle = create-oriented

### 路径 2：更新已有 feature

示例：

- 修改已有 feature micro_feature_fjym 的按键绑定

前端应清楚显示：

- routing = update
- focus = persisted_existing
- handoff = direct_target
- handler / plan / write 是否可继续

### 路径 3：治理阻塞

当存在：

- conflict
- confirmation needed
- unresolved target

前端应清楚显示：

- blocked reason
- required confirmation items
- next allowed transition
- release / confirmation hint

核心要求：

- “为什么卡住”必须一眼看懂

---

## 第一版必须具备的前端面板

### 1. RequestBar

显示：

- 请求输入
- host root
- dry-run / write 切换

### 2. SessionSummary

显示：

- session id
- session status
- current feature id
- host root

### 3. FeatureReviewPanel

显示：

- summary
- recognized capabilities
- known inputs
- conflict summary
- next step

### 4. FeatureCardPanel

显示：

- feature id
- label
- status
- risk
- confirmation requirement
- timestamps

### 5. FeatureDetailPanel

显示：

- basic info
- editable params
- host/output summary
- pattern bindings

### 6. LifecyclePanel

显示：

- lifecycle actions
- action route
- suggested next action

### 7. UpdateChainPanel

显示：

- routing
- focus
- handoff
- handler
- governance release
- confirmation action
- dry-run plan
- write result

这是当前产品最关键的链路视图。

### 8. BlueprintPanel

显示：

- proposal id
- source
- status
- confidence
- proposed modules
- notes / issues

### 9. OutputEvidencePanel

显示：

- affected surfaces
- touched outputs
- generated files
- write evidence

---

## 第一版的数据策略

### Phase A：Mock-first

先用 mock 数据驱动页面，覆盖至少三种场景：

- create path
- update path
- governance blocked path

目标：

- 先验证信息架构与交互模式

### Phase B：接真实结构化结果

等 workbench 恢复稳定后，再接真实数据。

前端必须依赖：

- 结构化对象

而不是：

- console 输出文本

---

## 第一版明确不做的事

为避免跑偏，第一版不做：

- 多页面复杂路由
- 真正代码编辑器
- 复杂审批工作流
- feature relationship graph
- 完整 diff viewer
- 富时间线系统
- 实时协作

第一版重点是：

- 看懂当前 feature
- 看懂当前状态链
- 看懂下一步

---

## 视觉与交互原则

前端视觉方向应优先强调：

- 稳定
- 清楚
- 卡片化
- 状态明确
- next step 明确

不要求第一版追求：

- 强视觉实验
- 复杂动画
- 设计系统完备度

第一版首先要做到：

- 信息层次对
- 状态表达清楚
- feature 是主对象

---

## 技术栈

第一版建议使用：

- React
- TypeScript
- Vite

### 状态管理

先使用：

- React state
- Context

不默认引入复杂全局状态库。

### 样式

先使用：

- CSS modules

或：

- 结构化的普通 CSS

不默认引入重量级 UI 框架。

### 数据层

建议在前端目录中预留：

- mock
- types
- services
- panels
- components

---

## 目录建议

前端第一版可按如下方式组织：

```txt
frontend/
  src/
    app/
    components/
    panels/
    sections/
    mock/
    types/
    services/
    styles/
```

说明：

- `panels/` 放大面板
- `components/` 放通用小组件
- `mock/` 放不同状态样例
- `types/` 放前端消费的 view models
- `services/` 放未来真实 workbench 数据接入

---

## 第一阶段完成标准

前端第一阶段完成，至少要满足：

1. 有一个单页 workbench shell
2. 有统一输入区
3. 可以切换至少三组 mock 场景
4. 能完整展示：
   - Feature Review
   - Feature Card / Detail
   - Lifecycle
   - Update Chain
   - Blueprint
   - Output / Write Result
5. 页面结构能清楚体现：
   - feature-first
   - blueprint + pattern driven

---

## 结论

Workbench 前端第一版的目标不是“把终端内容搬到网页上”，而是：

- 建立一个 feature-first 的 lifecycle workbench shell
- 让用户围绕 feature 理解系统状态
- 让 blueprint / pattern / governance / write path 变得可见

第一版先做：

- 信息架构
- 状态面板
- mock-driven shell

后续再接：

- 真实 workbench 结构化结果
- confirmation action
- write / governance 真实动作

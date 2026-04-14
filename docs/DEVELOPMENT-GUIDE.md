# DEVELOPMENT-GUIDE

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: orienting implementation work after the core execution baseline is already understood
> Do not use for: overriding README-target MVP scope, replacing the active execution queue, or superseding current session-sync freshness

## 当前开发目标

当前开发目标不是继续扩概念，而是稳定推进主链路：

`NL -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Host Write / Run`

## 当前优先级

优先级应始终是：

1. 核心对象稳定
2. 主链路可运行
3. 宿主边界受控
4. 再谈更高层能力

## 当前主轴

Rune Weaver 的主轴是 `NL-to-Code`。

这意味着：

- UI 仍然重要
- 但 UI 是代码输出面的一个子集
- 不应喧宾夺主，变成独立产品主线

当前 UI 推荐路线：

- 主 Wizard 先做功能澄清
- 只有在需要时进入 UI Wizard
- `UIDesignSpec` 只表达呈现层，不表达业务规则
- UI 的尾部个性化才考虑 constrained gap fill

## 当前阶段禁止事项

### 不允许跳过中间层

不应出现：

- 自然语言直接写宿主文件
- 不经 `Blueprint` 直接装配 pattern
- 不经 `AssemblyPlan` 直接写宿主

### 不允许把领域模板当通用 Pattern

不应新增：

- `talent_selection_flow`
- `card_selection_flow`
- `forge_selection_flow`

优先做法应是复用 mechanic patterns。

### 不允许宿主写入失控

必须坚持：

- 只写 `game/scripts/src/rune_weaver/**`
- 只写 `content/panorama/src/rune_weaver/**`
- 只在允许的桥接点做一次性接线

### 不允许把 provider 差异塞进业务 CLI

厂商差异必须下沉到 provider / config 层。

## 两条不可打破的边界

### 宿主粒度边界

后续开发不得把 Rune Weaver 扩张成“负责整个 x-template 项目”的系统。

必须坚持：

- 只拥有 `game/scripts/src/rune_weaver/**`
- 只拥有 `content/panorama/src/rune_weaver/**`
- 只在受控桥接点做一次性接线

### UI 入口边界

后续开发不得把 `script.tsx` 误当成“全部 UI 的唯一实现位置”。

必须坚持：

- 宿主入口只做桥接
- 具体 UI 生成内容落在 `rune_weaver/generated/ui/**`

## 推荐实现顺序

### Phase 1

- Wizard
- IntentSchema
- 基础验证

### Phase 2

- Blueprint
- Blueprint validation

### Phase 3

- Pattern core
- Pattern resolution
- AssemblyPlan

### Phase 4

- Dota2 adapter
- host mapping
- bridge planning

### Phase 5

- Write Executor Phase 1
- 端到端最小闭环

## 验收分层

### 结构标准

判断对象和边界是否真正成立，例如：

- `IntentSchema`
- `Blueprint`
- `AssemblyPlan`
- `PatternMeta`

### 流程标准

判断主链路是否真正跑通，例如：

- `wizard --json`
- `blueprint --json`
- `assembly review`
- `dota2 validate --host`

### 质量标准

判断是否守住约束和护栏，例如：

- 没有绕过 schema / blueprint / assembly
- 没有引入领域专用 pattern
- 没有突破宿主写入边界

## 每次交付必须回答的问题

1. 改了什么
2. 为什么这样改
3. 跑了什么验证
4. 当前还缺什么

不能只说：

- “代码写完了”
- “类型过了”

## 文档读取约束

后续 agent 执行时，必须遵守：

1. 优先使用文件读取工具读取文档
2. 如果必须在 PowerShell 直接查看 UTF-8 文档，先执行 `chcp 65001`

## 当前结论

当前最正确的开发策略是：

- 继续围绕 `NL-to-Code` 主轴推进
- 把 UI 当作 code output 的一个重要子集
- 先把受控中间层和宿主边界做稳
- 再进入更深的写入自动化

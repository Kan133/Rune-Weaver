# AGENT-USAGE-PATTERN-PIPELINE

## 目标

这份文档说明 `pattern-pipeline-agent` 的适用场景、输入方式和边界。

它的作用不是“自动发现所有 pattern”，而是：

- 评审一个明确候选
- 把候选规范成 draft
- 给出 admission 预审结果

## 1. 适合使用的场景

当你已经有一个**明确候选**时，使用这个 agent。

候选可以来自：

- `PATTERN-BACKLOG.md` 中明确列出的候选方向
- `archive/PATTERN-GAPS.md` 中的历史 gap（仅作历史参考，不作为当前主要驱动）
- 某个具体 mechanic 名称
- 某段教程 / 参考文档片段
- 某段旧代码中反复出现的机制
- 某个你已经怀疑“这可能该成为 pattern”的对象

它最适合做的事是：

- 判断这是不是一个真正的 reusable mechanic
- 产出 `PatternCandidate`
- 产出 `PatternDraft`
- 产出 `AdmissionChecklist`
- 明确：
  - 建议入库
  - 需要修改
  - 不该成为 pattern

## 2. 不适合使用的场景

以下场景不应交给这个 agent：

- “去仓库里自己找 pattern”
- “帮我扫所有教程”
- “自动发现尽可能多的 mechanic”
- “把 references 全部看一遍再提案”

这些属于未来可能的 `pattern-extractor` 范畴，不是当前 agent 的职责。

## 3. 一句话定义

> `pattern-pipeline-agent` 用于“评审和规范化明确候选”，不用于“自由发现候选”。

## 4. 推荐输入格式

每次调用时，建议显式给出以下信息：

```md
任务类型：candidate-pattern-review
来源：PATTERN-BACKLOG.md 或明确 candidate note
候选上限：2
是否允许直接入库：否
```

也可以换成：

```md
任务类型：candidate-pattern-review
候选：effect.modifier_applier
是否允许直接入库：否
```

或者：

```md
任务类型：reference-fragment-pattern-review
来源：references/dota2/docs/moddota_scripting_systems.md
候选上限：1
是否允许直接入库：否
```

## 5. 期望输出格式

建议每次都固定输出以下 5 段：

1. `Summary`
2. `PatternCandidate`
3. `PatternDraft`
4. `AdmissionChecklist`
5. `Final Recommendation`

其中 `Final Recommendation` 应明确是：

- `accept-for-review`
- `revise-before-review`
- `reject-as-pattern`
- `solve-by-mapping-instead`

## 6. 当前不需要新增的 agent

当前不建议再单独新增：

- candidate reviewer agent
- pattern admission agent
- ui pattern agent

原因：

- candidate 审查已经在 Stage 1 中完成
- admission 预审已经在 Stage 3 中完成
- 额外拆 agent 会增加协调成本

## 7. 未来可能新增的 agent

未来只有在候选发现明显成为瓶颈时，才考虑新增：

- `pattern-extractor`

它的职责应是：

- 自动扫描 references / docs / code
- 只输出候选列表
- 不负责 draft
- 不负责 admission

## 8. 当前结论

当前项目阶段最合理的做法是：

- 保留单个 `pattern-pipeline-agent`
- 用它处理明确候选
- 暂不扩成多 agent pattern orchestration

这样更稳，也更符合当前 pattern 体系的成熟度。

# Rune Weaver Index

## 当前定位

Rune Weaver 是一个 `NL-to-Code` 编织引擎。

当前首个真实宿主是 Dota2 `x-template`。主链路是：

`自然语言 -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Dota2 Adapter -> Host Write / Run`

UI 是代码输出面中的一个子集，不是独立于主产品的新主线。

## 先读什么

1. [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
2. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
3. [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
4. [DEVELOPMENT-GUIDE.md](/D:/Rune%20Weaver/docs/DEVELOPMENT-GUIDE.md)
5. [TASKS.md](/D:/Rune%20Weaver/TASKS.md)

## 当前关键文档

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md): 产品定义、MVP 目标、术语表
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md): 分层、主流程、宿主与 UI 边界
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md): `IntentSchema`、`Blueprint`、`UIDesignSpec`、`AssemblyPlan`
- [DEVELOPMENT-GUIDE.md](/D:/Rune%20Weaver/docs/DEVELOPMENT-GUIDE.md): 当前开发顺序、验收标准、禁止事项
- [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md): Dota2 宿主接入规则
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md): workspace、增量、重生成、文件 ownership
- [LLM-INTEGRATION.md](/D:/Rune%20Weaver/docs/LLM-INTEGRATION.md): provider 边界与配置
- [QA.md](/D:/Rune%20Weaver/docs/QA.md): 可行性、范围和现实预期

## Pattern 文档

- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md): `core pattern` 与 `host binding` 的模型关系
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md): 合格 pattern 的最小标准
- [PATTERN-AUTHORING-GUIDE.md](/D:/Rune%20Weaver/docs/PATTERN-AUTHORING-GUIDE.md): pattern 提取与撰写规则
- [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md): `candidate -> draft -> admission -> catalog` 流程
- [AGENT-USAGE-PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/AGENT-USAGE-PATTERN-PIPELINE.md): `pattern-pipeline-agent` 的适用场景与输入约束
- [PATTERN-BACKLOG.md](/D:/Rune%20Weaver/PATTERN-BACKLOG.md): 当前优先级

## UI 文档

- [UI-ROADMAP.md](/D:/Rune%20Weaver/docs/UI-ROADMAP.md): UI 路线图与阶段判断
- [UI-SPEC-GUIDE.md](/D:/Rune%20Weaver/docs/UI-SPEC-GUIDE.md): `UIDesignSpec` 的最小范围
- [UI-PATTERN-STRATEGY.md](/D:/Rune%20Weaver/docs/UI-PATTERN-STRATEGY.md): UI pattern、spec、gap fill 的边界
- [DOTA2-UI-ADAPTER-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-UI-ADAPTER-SCOPE.md): Dota2 UI adapter 支持面
- [DOTA2-UI-TEMPLATE-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-UI-TEMPLATE-SCOPE.md): 三个核心 UI pattern 的模板范围
- [UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md](/D:/Rune%20Weaver/docs/UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md): `UIDesignSpec` 到模板映射
- [DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md](/D:/Rune%20Weaver/docs/DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md): UI adapter 实现边界

## Dota2 相关文档

- [ASSEMBLY-HOST-MAPPING.md](/D:/Rune%20Weaver/docs/ASSEMBLY-HOST-MAPPING.md)
- [BRIDGE-UPDATE-PLANNING.md](/D:/Rune%20Weaver/docs/BRIDGE-UPDATE-PLANNING.md)
- [DOTA2-ASSEMBLER-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-ASSEMBLER-SCOPE.md)
- [DOTA2-WRITE-EXECUTOR-PHASE1.md](/D:/Rune%20Weaver/docs/DOTA2-WRITE-EXECUTOR-PHASE1.md)

## Knowledge

- 原始资料在 [references](/D:/Rune%20Weaver/references)
- 加工后的知识在 [knowledge](/D:/Rune%20Weaver/knowledge)
- Dota2 API 摘要入口在 [knowledge/dota2-host/api/README.md](/D:/Rune%20Weaver/knowledge/dota2-host/api/README.md)
- ModDota 切片入口在 [knowledge/dota2-host/slices](/D:/Rune%20Weaver/knowledge/dota2-host/slices)

## 当前产品边界

- Rune Weaver 只拥有：
  - `game/scripts/src/rune_weaver/**`
  - `content/panorama/src/rune_weaver/**`
  - 少量明确允许的桥接点
- Rune Weaver 不负责用户原有业务代码
- Rune Weaver 不做任意宿主旧文件智能改写
- `script.tsx` 是 `UI entry root`，不是全部 UI 的唯一位置

## 文档读取约束

- 优先使用文件读取工具读取文档
- 如必须在 PowerShell 直接查看 UTF-8 文档，先执行 `chcp 65001`

## 归档

- 历史文档在 [archive](/D:/Rune%20Weaver/archive)
- 旧产品资料在 [old](/D:/Rune%20Weaver/old)
- 已阶段性收口的 pattern gap 历史见 [archive/PATTERN-GAPS.md](/D:/Rune%20Weaver/archive/PATTERN-GAPS.md)

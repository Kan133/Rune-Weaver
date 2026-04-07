# Rune Weaver Index

## 当前定位

Rune Weaver 是一个受控的 `NL-to-Code` 编织引擎。

当前首个真实宿主是 Dota2 `x-template`。

当前主链路是：

`自然语言 -> IntentSchema -> Blueprint -> Pattern Resolution -> AssemblyPlan -> Host Realization -> Generator Routing -> Generators -> Host Write / Run`

UI 是代码输出面的一部分，不是独立于主产品的新主线。

## 先读什么

1. [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
2. [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
3. [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
4. [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
5. [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
6. [TASK-COMPLETION.md](/D:/Rune%20Weaver/docs/TASK-COMPLETION.md)

## 文档分层

### Cross-Phase Core Contracts

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md)
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md)
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md)
- [QA.md](/D:/Rune%20Weaver/docs/QA.md)
- [ENGINEERING-GUARDRAILS.md](/D:/Rune%20Weaver/docs/ENGINEERING-GUARDRAILS.md)
- [WIZARD-INTENT-CONTRACT.md](/D:/Rune%20Weaver/docs/WIZARD-INTENT-CONTRACT.md)
- [BLUEPRINT-ORCHESTRATION-CONTRACT.md](/D:/Rune%20Weaver/docs/BLUEPRINT-ORCHESTRATION-CONTRACT.md)
- [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md)
- [HOST-REALIZATION-SCHEMA.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-SCHEMA.md)
- [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md)
- [GENERATOR-ROUTING-SCHEMA.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-SCHEMA.md)
- [ASSEMBLY-REALIZATION-NOTES.md](/D:/Rune%20Weaver/docs/ASSEMBLY-REALIZATION-NOTES.md)

### Phase 1 Baseline

- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md)
- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md)
- [TASK-COMPLETION.md](/D:/Rune%20Weaver/docs/TASK-COMPLETION.md)
- [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md)
- [DOTA2-HOST-REALIZATION-POLICY.md](/D:/Rune%20Weaver/docs/DOTA2-HOST-REALIZATION-POLICY.md)
- [DOTA2-TS-GENERATOR-BOUNDARY.md](/D:/Rune%20Weaver/docs/DOTA2-TS-GENERATOR-BOUNDARY.md)
- [DOTA2-KV-GENERATOR-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-KV-GENERATOR-SCOPE.md)
- [DOTA2-CLI-SPLIT-PLAN.md](/D:/Rune%20Weaver/docs/DOTA2-CLI-SPLIT-PLAN.md)
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md)
- [DOTA2-WRITE-EXECUTOR-PHASE1.md](/D:/Rune%20Weaver/docs/DOTA2-WRITE-EXECUTOR-PHASE1.md)

### Phase 2 Future Contracts

- [FEATURE-SEMANTIC-STATE-CONTRACT.md](/D:/Rune%20Weaver/docs/FEATURE-SEMANTIC-STATE-CONTRACT.md)
- [UI-WIZARD-INTAKE-CONTRACT.md](/D:/Rune%20Weaver/docs/UI-WIZARD-INTAKE-CONTRACT.md)
- [GAP-FILL-POLICY.md](/D:/Rune%20Weaver/docs/GAP-FILL-POLICY.md)

## 当前关键文档

- [PRODUCT.md](/D:/Rune%20Weaver/docs/PRODUCT.md): 产品定义、MVP 目标、术语表
- [ARCHITECTURE.md](/D:/Rune%20Weaver/docs/ARCHITECTURE.md): 分层、主流程、宿主与 UI 边界
- [SCHEMA.md](/D:/Rune%20Weaver/docs/SCHEMA.md): `IntentSchema`、`Blueprint`、`UIDesignSpec`、`AssemblyPlan`
- [HOST-INTEGRATION-DOTA2.md](/D:/Rune%20Weaver/docs/HOST-INTEGRATION-DOTA2.md): Dota2 宿主接入规则
- [WORKSPACE-MODEL.md](/D:/Rune%20Weaver/docs/WORKSPACE-MODEL.md): workspace、create/update/regenerate/rollback 的边界
- [WIZARD-INTENT-CONTRACT.md](/D:/Rune%20Weaver/docs/WIZARD-INTENT-CONTRACT.md): Wizard LLM 的输入/输出边界与 IntentSchema 契约
- [BLUEPRINT-ORCHESTRATION-CONTRACT.md](/D:/Rune%20Weaver/docs/BLUEPRINT-ORCHESTRATION-CONTRACT.md): Blueprint 编排的输入/输出边界与契约
- [HOST-REALIZATION-CONTRACT.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-CONTRACT.md): Host Realization 层的职责边界
- [DOTA2-HOST-REALIZATION-POLICY.md](/D:/Rune%20Weaver/docs/DOTA2-HOST-REALIZATION-POLICY.md): Dota2 上 `kv/ts/ui/hybrid` 的 realization policy
- [HOST-REALIZATION-SCHEMA.md](/D:/Rune%20Weaver/docs/HOST-REALIZATION-SCHEMA.md): `HostRealizationPlan` schema
- [GENERATOR-ROUTING-CONTRACT.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-CONTRACT.md): generator routing 的职责分工
- [GENERATOR-ROUTING-SCHEMA.md](/D:/Rune%20Weaver/docs/GENERATOR-ROUTING-SCHEMA.md): Generator Router 的最小 schema
- [DOTA2-TS-GENERATOR-BOUNDARY.md](/D:/Rune%20Weaver/docs/DOTA2-TS-GENERATOR-BOUNDARY.md): 现有 Dota2 TS generator 的职责边界
- [DOTA2-KV-GENERATOR-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-KV-GENERATOR-SCOPE.md): `Dota2KVGenerator` v1 的最小职责边界
- [ASSEMBLY-REALIZATION-NOTES.md](/D:/Rune%20Weaver/docs/ASSEMBLY-REALIZATION-NOTES.md): `AssemblyPlan.modules` 如何作为 Host Realization 的主要输入
- [ROADMAP.md](/D:/Rune%20Weaver/docs/ROADMAP.md): 当前 Phase 划分、Phase 1/2/3 目标与进入条件
- [FEATURE-SEMANTIC-STATE-CONTRACT.md](/D:/Rune%20Weaver/docs/FEATURE-SEMANTIC-STATE-CONTRACT.md): Phase 2 future contract for feature internal semantic state
- [QA.md](/D:/Rune%20Weaver/docs/QA.md): 可行性、范围与现实预期

## Pattern 文档

- [PATTERN-MODEL.md](/D:/Rune%20Weaver/docs/PATTERN-MODEL.md)
- [PATTERN-SPEC.md](/D:/Rune%20Weaver/docs/PATTERN-SPEC.md)
- [PATTERN-AUTHORING-GUIDE.md](/D:/Rune%20Weaver/docs/PATTERN-AUTHORING-GUIDE.md)
- [PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/PATTERN-PIPELINE.md)
- [AGENT-USAGE-PATTERN-PIPELINE.md](/D:/Rune%20Weaver/docs/AGENT-USAGE-PATTERN-PIPELINE.md)
- [PATTERN-BACKLOG.md](/D:/Rune%20Weaver/PATTERN-BACKLOG.md)

## UI 文档

- [UI-ROADMAP.md](/D:/Rune%20Weaver/docs/UI-ROADMAP.md)
- [UI-SPEC-GUIDE.md](/D:/Rune%20Weaver/docs/UI-SPEC-GUIDE.md)
- [UI-PATTERN-STRATEGY.md](/D:/Rune%20Weaver/docs/UI-PATTERN-STRATEGY.md)
- [DOTA2-UI-ADAPTER-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-UI-ADAPTER-SCOPE.md)
- [DOTA2-UI-TEMPLATE-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-UI-TEMPLATE-SCOPE.md)
- [UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md](/D:/Rune%20Weaver/docs/UIDESIGNSPEC-TO-TEMPLATE-MAPPING.md)
- [DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md](/D:/Rune%20Weaver/docs/DOTA2-UI-ADAPTER-IMPLEMENTATION-NOTES.md)

## Dota2 相关文档

- [ASSEMBLY-HOST-MAPPING.md](/D:/Rune%20Weaver/docs/ASSEMBLY-HOST-MAPPING.md)
- [BRIDGE-UPDATE-PLANNING.md](/D:/Rune%20Weaver/docs/BRIDGE-UPDATE-PLANNING.md)
- [DOTA2-ASSEMBLER-SCOPE.md](/D:/Rune%20Weaver/docs/DOTA2-ASSEMBLER-SCOPE.md)
- [DOTA2-WRITE-EXECUTOR-PHASE1.md](/D:/Rune%20Weaver/docs/DOTA2-WRITE-EXECUTOR-PHASE1.md)

## Handoff

- [HANDOFF.md](/D:/Rune%20Weaver/docs/HANDOFF.md): 交接基线、工作模式、当前能力与下一步建议

## Knowledge

- 原始资料在 [references](/D:/Rune%20Weaver/references)
- 加工后的知识在 [knowledge](/D:/Rune%20Weaver/knowledge)
- Dota2 API 摘要入口在 [knowledge/dota2-host/api/README.md](/D:/Rune%20Weaver/knowledge/dota2-host/api/README.md)
- ModDota 切片入口在 [knowledge/dota2-host/slices](/D:/Rune%20Weaver/knowledge/dota2-host/slices)

## 当前产品边界

- Rune Weaver 只拥有：
  - `game/scripts/src/rune_weaver/**`
  - `game/scripts/vscripts/rune_weaver/**` (lua 能力文件)
  - `content/panorama/src/rune_weaver/**`
  - 少量明确允许的桥接点
- Rune Weaver 不负责用户原有业务代码
- Rune Weaver 不做任意宿主旧文件智能改写
- `script.tsx` 是 `UI entry root`，不是全部 UI 的唯一位置

## 当前已验证能力（T121/T125/T126）

### 已 Mainlined

| 能力 | 状态 | 来源 |
|---|---|---|
| dota_ts_adapter repair | ✅ mainlined (init/refresh) | T097-T099 → T121 |
| baseline migration (XLSX→DOTAAbilities) | ✅ refresh 主路径 | T121 |
| lua entry production (contentType: "lua") | ✅ 正常 pipeline | T125 |
| lua code generation (ability+modifier) | ✅ same-file 输出 | T125 |
| lua write integration (.lua 文件写出) | ✅ write executor | T125 |
| 最小真实 Dota2 E2E | ✅ baseline + RW ability 可施放 | T121 |

### 当前边界

| 维度 | 现状 | 说明 |
|---|---|---|
| lua pattern 覆盖 | 仅 short_time_buff 类 case | 不是通用 lua ability framework |
| 视觉/数值效果 | minimal viable | 功能可用，未打磨 |
| 多技能组合 | 未充分测试 | 单技能 E2E 已通过 |
| KV generator v1 | 设计完成，待正式接入 | lua 路径先行 |
| Generator Routing formal | partial (lua route done) | KV/TS 路由需协调 |

## 明天建议优先级 (T127 Handoff)

按自然顺序排列：

| # | 方向 | 为什么优先 | 预计范围 |
|---|---|---|---|
| 1 | **第二个 lua archetype** | 当前只有 short_time_buff，需要证明 lua path 可扩展 | 选一个新 archetype（DOT / stun / heal），定义 metadata schema，不一定要完整实现 |
| 2 | **生命周期 E2E 验证** | create → update → regenerate → rollback 在真实宿主上未跑通 | 跑一遍全流程，确认 workspace 状态一致 |
| 3 | **效果质量提升** | T121 只是 minimal viable，向 playable 迈进 | particle / sound / value tuning，不做 full polish |
| 4 | **多生成器路由形式化** | KV + TS + lua 协调机制需明确 | formalize routing layer |

## 历史脚本边界

以下脚本为 **T121/T125 迭代过程中的 repair/debug evidence**，不是当前 mainline：

- `scripts/run-t121-*.ts`（8 个）— T121 E2E 迭代修复脚本
- `scripts/dry-run-t125-*.ts`（4 个）— T125 lua mainlining 验证脚本

详细说明见 [HANDOFF.md §Historical Script Boundary](/D:/Rune%20Weaver/docs/HANDOFF.md)。

**规则**: 新工作应修改 `adapters/dota2/` 下的正式模块，不应修改这些历史脚本。

## 文档读取约束

- 优先使用文件读取工具读取文档
- 如必须在 PowerShell 直接查看 UTF-8 文档，先执行 `chcp 65001`

## 归档

- 历史文档在 [archive](/D:/Rune%20Weaver/archive)
- 旧产品资料在 [old](/D:/Rune%20Weaver/old)
- 已阶段性收口的 pattern gap 历史见 [archive/PATTERN-GAPS.md](/D:/Rune%20Weaver/archive/PATTERN-GAPS.md)

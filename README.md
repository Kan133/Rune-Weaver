# Rune Weaver

Rune Weaver 是一个面向游戏功能生成的、受控的 **自然语言到代码** 系统。

它不是“输入一句话自动生成整款游戏”的黑盒，也不追求任意宿主上的自由改写。当前目标更窄、更工程化：

- 把受约束的玩法需求转成结构化规划对象
- 复用可审查的 mechanic pattern，而不是到处写一次性模板
- 通过宿主适配层生成可审查、可验证、可回滚的宿主代码产物
- 将写入严格限制在 Rune Weaver 自有命名空间和显式允许的桥接点内

当前第一个真实宿主是 **Dota2 x-template / test1**。

## 完整链路图

当前主链路不是“一步到位生成代码”，而是分层推进：

```text
自然语言请求
  -> Wizard
  -> IntentSchema
  -> Blueprint
  -> Pattern Resolution
  -> AssemblyPlan
  -> HostRealizationPlan
  -> GeneratorRoutingPlan
  -> Generators
     -> Dota2KVGenerator
     -> Dota2TSGenerator
     -> Dota2UIGenerator
     -> Dota2LuaGenerator（窄范围）
  -> Write Plan
  -> Write Executor
  -> Host Validation / Runtime Validation
  -> Workspace State
```

如果只看当前已经跑通的 Dota2 主路径，可以理解为：

```text
Prompt
  -> 结构化规划
  -> Dota2 宿主实现决策
  -> KV / TS / UI / Lua 代码生成
  -> 受控写入 test1
  -> 宿主修复 / bridge refresh
  -> 真实 Dota2 游戏内验证
```

## 当前已实现状态

当前已经成立的能力：

- `IntentSchema / Blueprint / AssemblyPlan` 主链路
- `HostRealizationPlan / GeneratorRoutingPlan` 架构分层
- Dota2 宿主写入与 workspace 基础闭环
- Dota2 adapter repair 已 mainlined
- baseline migration 已 mainlined：
  - `XLSXContent -> DOTAAbilities`
- lua path 已 mainlined 到 write 层：
  - normal pipeline 会自然产出 `contentType: "lua"` entry
  - generator 会生成 same-file ability + modifier Lua
  - write executor 会实际写出 `.lua` 文件
- 最小真实 Dota2 E2E 已验证：
  - baseline 3 技能正常出现
  - RW fresh identity 技能可挂载、可施放
  - 有蓝耗和冷却
  - modifier 创建成功
  - buff 可见并持续约 6 秒

## 当前边界

当前明确 **不应** 误解为已完成的部分：

- 这不是通用“任意游戏 -> 任意代码”的系统
- 这不是通用 lua ability framework
- 当前 lua metadata scope 仅明确覆盖 `short_time_buff` 及近似 case
- 当前真实 Dota2 E2E 是 **minimal viable**，不是 polished gameplay quality
- 多 archetype 的 lua 覆盖仍未完成
- lifecycle 全链路（create / update / regenerate / rollback）真实宿主 E2E 仍可继续补强

## 产品边界

Rune Weaver 当前只拥有并可直接生成/修复：

- `game/scripts/src/rune_weaver/**`
- `game/scripts/vscripts/rune_weaver/**`
- `content/panorama/src/rune_weaver/**`
- 少量显式允许的 bridge / host repair 点

Rune Weaver **不** 直接拥有：

- 用户业务代码的大范围任意改写
- 任意宿主文件的智能重写
- 未声明的宿主侧自由编辑权

## 为什么先做 Dota2

Dota2 适合作为第一宿主，因为它具备：

- 清晰的宿主边界
- 严格 API 和文件结构
- 事件驱动的玩法模型
- 边界明确的 UI 输出面
- 大量可抽象为 pattern 的 mechanic 形状

这让它适合：

- 结构化规划
- pattern-driven generation
- adapter-based host binding
- 写前验证与宿主修复

## 仓库结构

- `core/`：规划层与共享 schema
- `adapters/`：宿主适配层，当前以 Dota2 为主
- `apps/cli/`：CLI 入口
- `docs/`：当前 source-of-truth 文档
- `knowledge/`：处理后的宿主知识
- `references/`：原始参考资料
- `skills/`：本地 Codex skill
- `archive/`：归档文档与历史记录
- `scripts/`：调试、验证、历史修复脚本

## 建议阅读顺序

如果你要快速理解当前基线，建议按这个顺序：

1. [`INDEX.md`](./INDEX.md)
2. [`docs/HANDOFF.md`](./docs/HANDOFF.md)
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
4. [`docs/HOST-INTEGRATION-DOTA2.md`](./docs/HOST-INTEGRATION-DOTA2.md)
5. [`docs/TASK-COMPLETION.md`](./docs/TASK-COMPLETION.md)
6. [`docs/ROADMAP.md`](./docs/ROADMAP.md)
7. [`docs/QA.md`](./docs/QA.md)

## 开发

要求：

- Node.js 18+

安装：

```bash
npm install
```

常用命令：

```bash
npm run check-types
npm run cli -- --help
```

## 当前最自然的下一步

当前更适合继续推进的方向是：

1. 增加第二个 lua archetype，验证 lua metadata schema 的可扩展性
2. 在真实宿主中补强 lifecycle E2E：
   - create
   - update
   - regenerate
   - rollback
3. 提升效果质量：
   - particle
   - sound
   - 数值反馈
4. 继续 formalize 多生成器路由的协调边界

## 说明

- 当前内部文档比 README 更完整
- 历史 `run-t121-*` / `dry-run-t125-*` 脚本保留为调试与证据材料，不应被误解为当前主路径
- Rune Weaver 的方向始终是：
  - **受控规划**
  - **受控生成**
  - **受控写入**
  而不是自由生成

# Rune Weaver Demo Paths

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-phase-change
> Last verified: 2026-04-25
> Read when: selecting demo-safe walkthroughs and presentation paths
> Do not use for: active execution priority, current milestone scope, or architecture authority

本文档定义 Rune Weaver 当前可诚实展示的演示路径。

关于公开能力边界，以 [README.md](/D:/Rune%20Weaver/README.md) 为准。
关于同日 step / blocker truth，以 [RW-SHARED-PLAN.md](/D:/Rune%20Weaver/docs/session-sync/RW-SHARED-PLAN.md) 和最新 session-sync 为准。

## Demo Gate 分层

| 分层 | 标识 | 说明 | 适用场景 |
|------|------|------|----------|
| **External-Safe** | ✅ | 可对外演示，已和当前 README / Step 7 truth 对齐 | 潜在用户、技术决策者 |
| **Boundary-Safe** | ⚠️ | 可演示，但必须明确边界 | 产品/设计/内部协作者 |
| **Deferred** | ⏸️ | 不应作为当前演示承诺 | 未来规划 |

演示原则：

- 外部演示优先选 CLI authoritative path + governed product surface
- Workbench 演示时必须明确它是 product entry / review shell，不是 lifecycle authority
- 不拿 legacy compatibility-only path 当默认产品路径

## 1. Recommended External Demo

### 1.1 CLI Create + Validate + Governed Bridge

> Demo Gate: External-Safe

这是当前最强、最诚实的主路径演示。

**演示目标**

展示 Rune Weaver 如何把自然语言请求落成一个受治理的 feature，并把结果投影到 product surface。

**展示步骤**

```bash
npm run cli -- dota2 init --host <path>
npm run cli -- dota2 run "<prompt>" --host <path> --write
npm run cli -- dota2 validate --host <path>
npm run cli -- dota2 doctor --host <path>
npm run cli -- export-bridge --host <path>
```

**建议 prompt**

- `创建一个按F4弹出三选一的天赋抽取功能，选择后立即生效`
- `创建一个按G键弹出五选一的装备抽取功能，选择后获得对应装备，装备来源于 Dota2 原生装备`

**预期展示点**

- CLI review / write 链路
- workspace feature truth
- validate / doctor 通过
- bridge payload 带 root-level `governanceReadModel`
- Workbench 或 inspect 能读到同一条治理投影

**可以诚实承诺的内容**

- feature 被真实写入到受管 host 路径
- CLI 是 authoritative lifecycle path
- product surface 现在优先消费统一的 governance read-model
- stale payload refresh 只走 `export-bridge`

**必须说明的边界**

- exploratory / guided-native 结果仍可能 `requiresReview=true`
- Workbench 不是 lifecycle authority
- War3 不是 write-ready 第二宿主

## 2. Product-Surface Demo

### 2.1 Workbench as Product Entry / Review Shell

> Demo Gate: Boundary-Safe

**演示目标**

展示用户如何通过 Workbench 查看 governed bridge / connected-host truth，而不是展示 UI 自己成为执行 authority。

**展示步骤**

1. 启动 Workbench
2. 打开 governed sample 或连接真实 host
3. 展示 feature lifecycle / reusable governance / grounding / repairability 四轴
4. 展示 legacy payload 与 governed payload 的显示区别

**重点展示**

- governed payload 优先走 `governanceReadModel`
- connected-host 不隐式跑 validate / doctor
- 未请求 live observation 时，`repairability = not_checked` 是 honest 状态
- legacy payload 只显示 compatibility-only warning，不冒充治理真相

**必须说明的边界**

- Workbench 是 product entry / orchestration / review shell
- Workbench 不取代 CLI lifecycle authority
- compatibility-only 是 legacy display boundary，不是主路径

## 3. Optional Demo Variants

### 3.1 Connected-Host Live Path

> Demo Gate: Boundary-Safe

适合演示：

- `/api/host/status` 返回 adapter-owned `governanceReadModel`
- connected-host store path 不再默认退回 compatibility projector
- product surfaces 与 bridge sample 共享同一 read-model vocabulary

### 3.2 Legacy Payload Boundary

> Demo Gate: Boundary-Safe

适合演示：

- 老 payload 仍可读
- 但只能 compatibility-only display
- 若要退役 stale payload，只能运行 `npm run cli -- export-bridge --host <path>`

不适合演示成：

- “系统会自动迁移一切旧 payload”
- “doctor / validate / inspect 会顺手刷新 payload”

## 4. What We Can Say Publicly

当前可以公开说：

- Rune Weaver 当前在 Dota2 上有一条真实的 CLI lifecycle 主链
- feature 会以 workspace truth 持久化，而不是一次性 patch
- product surface 现在优先消费统一的 governance read-model
- Workbench 是产品入口 / review shell，不是另一个执行系统
- equipment/native-item 这类 catalog-backed choose-one 抽取已经能通过 honest family/source-backed path 写入并验证

当前不该公开说：

- 任意 exploratory 输出都已经 review-free
- Workbench 已完全取代 CLI
- compatibility-only fallback 仍是正常产品路径
- governance read-model 已经是通用 core contract
- War3 已经稳定交付

## 5. Deferred / Do Not Demo

> Demo Gate: Deferred

当前不建议作为主演示承诺：

- second-host genericization
- core-generic governance read-model
- 把 compatibility-only path 当成默认教学路径
- 把 manual JSON editing 当作 refresh lane
- 把 planning-only `PRODUCT.md` 里的长期 thesis 当成 shipped capability

## 6. Best Assets To Show

最值得截图或录屏的对象：

- CLI review / write / validate / doctor 输出
- `rune-weaver.workspace.json`
- `apps/workbench-ui/public/bridge-workspace.json`
- Workbench 中的 lifecycle / reusable governance / grounding / repairability 四轴展示

## 7. Related Docs

- [README.md](/D:/Rune%20Weaver/README.md)
- [COMMAND-RECIPES.md](/D:/Rune%20Weaver/docs/COMMAND-RECIPES.md)
- [VALIDATION-PLAYBOOK.md](/D:/Rune%20Weaver/docs/VALIDATION-PLAYBOOK.md)
- [PRODUCT-GUIDE-FOR-AI-PM-ZH.md](/D:/Rune%20Weaver/docs/PRODUCT-GUIDE-FOR-AI-PM-ZH.md)

# Canonical Walkthrough

## 文档目的

本文档定义一条可重复、可交接、可演示、不过度承诺的 canonical walkthrough。

**适用对象**：
- 外部演示者（向潜在用户/技术决策者展示）
- 内部协作者（开发/QA/架构师）
- 新加入项目的开发者

**权威性说明**：
- 本文档定义的是**演示路径**，不是执行队列
- 关于当前能力边界的权威定义，请参阅 [AGENT-EXECUTION-BASELINE.md](./AGENT-EXECUTION-BASELINE.md)
- 关于命令使用，请参阅 [COMMAND-RECIPES.md](./COMMAND-RECIPES.md)

---

## 前置条件

### 1. 宿主目录要求

宿主目录必须是 **dota2-x-template** 规范：

```
<host-root>/
├── scripts/
│   └── addon.config.ts     # 必须存在，定义 addon_name
├── game/
│   └── scripts/
└── content/
    └── panorama/
```

**验证方法**：
```bash
# 检查 addon.config.ts 是否存在
Test-Path "<host-root>/scripts/addon.config.ts"
```

### 2. 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **LLM API Key**: ANTHROPIC_API_KEY 或 OPENAI_API_KEY（可选，用于完整链路）

**验证方法**：
```bash
node --version
npm --version
```

### 3. Rune Weaver 安装

```bash
# 克隆或下载 Rune Weaver 项目
cd "d:\Rune Weaver"

# 安装依赖
npm install
```

---

## Walkthrough 步骤

### Step 0: 准备宿主

**命令**：
```bash
npm run cli -- dota2 check-host --host <path>
```

**预期结果**：
- 返回 6 维度状态报告
- 显示 scan/init/workspace/namespace/server-bridge/ui-bridge 状态

**证据点**：
```
Host Status Report:
├─ scan: ✅ Valid x-template structure
├─ init: ⚠️ addon_name is still 'x_template'
├─ workspace: ❌ Not initialized
├─ namespace: ❌ Rune Weaver namespace not found
├─ server-bridge: ❌ Server bridge not configured
└─ ui-bridge: ❌ UI bridge not configured
```

**验证标准**：
- `scan` 状态为 ✅（宿主结构有效）
- 其他状态可能为 ❌ 或 ⚠️（待初始化）

**当前限制**：
- node_modules / install 状态检查尚未实现
- 符号链接状态检查尚未实现
- Steam 链接就绪检查尚未实现

---

### Step 1: 初始化宿主

**命令**：
```bash
npm run cli -- dota2 init --host <path>
```

**预期结果**：
- 创建命名空间目录
- 创建 workspace 文件
- 创建桥接文件

**证据点**：
```bash
# 检查 workspace 文件
Test-Path "<host-root>/game/scripts/src/rune_weaver/rune-weaver.workspace.json"

# 检查命名空间目录
Test-Path "<host-root>/game/scripts/src/rune_weaver/"
Test-Path "<host-root>/content/panorama/src/rune_weaver/"

# 检查桥接文件
Test-Path "<host-root>/game/scripts/src/modules/index.ts"
Test-Path "<host-root>/content/panorama/src/hud/script.tsx"
```

**Workspace 文件内容示例**：
```json
{
  "version": "0.1.0",
  "hostType": "dota2-x-template",
  "hostRoot": "<absolute-path>",
  "addonName": "my_project",
  "initializedAt": "2026-04-11T10:00:00.000Z",
  "features": []
}
```

**验证标准**：
- workspace 文件存在且格式正确
- 命名空间目录已创建
- 桥接文件已创建

---

### Step 2: 创建 Feature

**命令**：
```bash
# Dry-run 模式（推荐用于演示）
npm run cli -- dota2 run "做一个按Q键的冲刺技能" --host <path>

# 写入模式（需谨慎）
npm run cli -- dota2 run "做一个按Q键的冲刺技能" --host <path> --write
```

**预期结果**：
- 创建 feature record
- 写入 workspace
- 生成 review artifact

**证据点**：

1. **Workspace 记录**：
```bash
# 查看 workspace JSON
Get-Content "<host-root>/game/scripts/src/rune_weaver/rune-weaver.workspace.json" | ConvertFrom-Json
```

Workspace 中应包含新 feature 记录：
```json
{
  "features": [
    {
      "featureId": "micro_feature_xxx",
      "intentKind": "micro-feature",
      "status": "active",
      "revision": 1,
      "blueprintId": "blueprint_xxx",
      "selectedPatterns": ["input.key_binding", "effect.movement"],
      "generatedFiles": ["..."],
      "entryBindings": ["..."],
      "createdAt": "2026-04-11T10:05:00.000Z",
      "updatedAt": "2026-04-11T10:05:00.000Z"
    }
  ]
}
```

2. **Review Artifact**：
```bash
# 检查 review artifact
Get-ChildItem "tmp/cli-review/dota2-review-run-*.json"
```

3. **生成的文件**（`--write` 模式）：
```bash
# 检查生成的文件
Get-ChildItem "<host-root>/game/scripts/src/rune_weaver/generated/" -Recurse
Get-ChildItem "<host-root>/content/panorama/src/rune_weaver/generated/" -Recurse
```

**验证标准**：
- workspace JSON 中有新 feature 记录
- featureId 稳定且唯一
- selectedPatterns 真实反映使用的 pattern
- generatedFiles 和 entryBindings 真实反映写入结果

**当前状态**：
- ✅ `--write` 模式已支持真实文件写入
- ✅ generatedFiles 和 entryBindings 是 truthful execution result
- ⚠️ 仅支持 RW-owned artifacts 范围内的文件

---

### Step 3: 更新 Feature

**命令**：
```bash
# 获取 feature ID
npm run cli -- dota2 --list --host <path>

# Dry-run 模式
npm run cli -- dota2 update "把冲刺速度改为500" --host <path> --feature <feature-id>

# 写入模式
npm run cli -- dota2 update "把冲刺速度改为500" --host <path> --feature <feature-id> --write
```

**预期结果**：
- 更新 feature 参数
- revision 递增
- 更新 workspace 记录

**证据点**：
```bash
# 检查 revision 是否递增
npm run cli -- dota2 --inspect <feature-id> --host <path>
```

输出应显示：
```
Feature: micro_feature_xxx
Revision: 2
Status: active
Updated: 2026-04-11T10:10:00.000Z
```

**验证标准**：
- workspace JSON 中 feature 参数已更新
- revision 已递增
- updatedAt 时间戳已更新

**当前状态**：
- ✅ 已实现 owned-scope rewrite（选择性文件更新）
- ✅ 执行真实的文件写入和删除
- ⚠️ 如果变化超出安全边界，会触发 requiresRegenerate 安全门

---

### Step 4: 删除 Feature

**命令**：
```bash
# 预览删除
npm run cli -- dota2 delete --host <path> --feature <feature-id>

# 执行删除
npm run cli -- dota2 delete --host <path> --feature <feature-id> --write
```

**预期结果**：
- 移除 workspace 记录
- 更新 workspace 状态

**证据点**：
```bash
# 检查 workspace JSON
Get-Content "<host-root>/game/scripts/src/rune_weaver/rune-weaver.workspace.json" | ConvertFrom-Json

# 列出 features
npm run cli -- dota2 --list --host <path>
```

**验证标准**：
- workspace JSON 中 feature 记录已移除
- `--list` 输出中不再显示该 feature

**当前状态**：
- ✅ 已实现真实 delete/unload
- ✅ 删除 RW-owned 文件
- ✅ 刷新 bridge 索引
- ✅ 从 workspace 移除 feature 记录

---

### Step 5: Governance 冲突检测

**场景**：创建两个使用相同 input.key_binding 的 feature

**步骤**：
```bash
# 创建第一个 feature
npm run cli -- dota2 run "创建冲刺技能，按Q键触发" --host <path> --write

# 尝试创建冲突 feature
npm run cli -- dota2 run "创建闪烁技能，按Q键触发" --host <path> --write
```

**预期结果**：
- governance 检测到 `shared_integration_point` 冲突
- 显示冲突警告
- 建议用户确认或阻止

**证据点**：
终端输出应显示：
```
⚠️  Governance Warning: shared_integration_point conflict detected

Conflict Details:
- Integration Point: input.key_binding
- Existing Feature: micro_feature_xxx
- Requested Binding: Q

Recommended Actions:
1. Choose a different key binding
2. Confirm to proceed with conflict
3. Cancel operation
```

**验证标准**：
- 终端输出显示冲突警告
- 冲突类型为 `shared_integration_point`
- 提供明确的冲突信息

**当前状态**：
- ✅ 已实现 workspace-backed 冲突检测
- ✅ 检测 ownership_overlap、bridge_contention、shared_integration_point、dependency_conflict
- ⚠️ 冲突检测规则仍在完善中

---

## Demo Gate 分层

### External-Safe（可公开演示）

以下内容可以安全地向外部用户演示：

| 能力 | 演示方式 | 验证标准 |
|------|----------|----------|
| `npm run examples` | 静态验证链路 | 所有示例通过 |
| Feature 作为一等公民 | 展示 FeatureCard/FeatureDetail | Feature 有稳定 ID、状态、revision |
| Workspace 记录写入 | 查看 workspace JSON | 记录结构正确、字段完整 |
| Feature ID 稳定生成 | 创建多个 feature | 每个 feature 有唯一 ID |
| `--list` 命令 | 列出所有 features | 显示 ID、状态、revision、更新时间 |
| `--inspect` 命令 | 查看单个 feature 详情 | 显示完整 feature 信息 |
| `dota2 run --write` | 执行真实文件写入 | 文件真实写入磁盘 |
| `dota2 update` | 选择性文件重写 | owned-scope rewrite 生效 |
| `dota2 delete` | 真实文件删除 | 删除 RW-owned 文件 + 刷新 bridge |
| Governance conflict detection | 创建冲突 feature | workspace-backed 冲突检测生效 |

**演示话术**：
- "Rune Weaver 是一个面向 Dota2 模组开发者的功能构建工具"
- "当前版本已完成基础架构和核心数据流"
- "支持从自然语言输入到 workspace 记录的完整链路"
- "dry-run 模式展示完整 proposal 链路"

---

### Internal-Only（仅内部演示）

以下内容仅向内部协作者演示，**不向外部用户承诺**：

| 能力 | 当前状态 | 限制说明 |
|------|----------|----------|
| （当前无 Internal-Only 项目） | - | - |

**演示时必须说明的限制**：
- （当前无 Internal-Only 项目需要说明）

---

### Deferred（不应演示）

以下内容**不应在当前版本演示**：

| 能力 | 状态 | 原因 |
|------|------|------|
| Regenerate | ⏸️ deferred | 未实现，不在当前 MVP 范围 |
| Rollback | ⏸️ deferred | 未实现，不在当前 MVP 范围 |
| Semantic Incremental Update | deferred | 未实现 |
| Second Host | deferred | 当前仅支持 dota2-x-template |

**如果被问及**：
- "这些功能在我们的路线图中，但当前版本尚未实现"
- "我们优先完成了核心的 create/update/delete 基础架构"

---

## 演示话术指南

### 可以说

**产品定位**：
- "Rune Weaver 是一个面向 Dota2 模组开发者的功能构建工具"
- "它帮助开发者用自然语言描述功能，自动生成代码，并统一管理功能"

**当前能力**：
- "当前版本已完成基础架构和核心数据流"
- "支持从自然语言输入到 workspace 记录的完整链路"
- "Feature 作为一等公民被统一管理"
- "dry-run 模式可以展示完整的 proposal 链路"

**技术亮点**：
- "基于 workspace-backed feature registry 的状态管理"
- "支持 host separation，Rune Weaver 拥有独立的命名空间"
- "提供基础的冲突检测和治理能力"

**演示方式**：
- "让我演示一下如何创建一个简单的冲刺技能"
- "这是 workspace 文件，记录了所有 feature 的状态"
- "这是 feature 的详细信息，包括使用的 pattern 和生成的文件"

---

### 不可以说

**过度承诺**：
- ❌ "产品级代码生成已可用"
- ❌ "文件写入支持所有文件类型"（仅支持 RW-owned artifacts）
- ❌ "删除功能支持 cascade delete"（仅支持 owned-scope 删除）
- ❌ "完整的冲突治理已可用"

**功能夸大**：
- ❌ "系统会生成可运行的 Lua/KV 代码"
- ❌ "写入后可以直接在 Dota2 中测试"
- ❌ "冲突检测已经完整实现"
- ❌ "可以开始实际项目开发"

**边界模糊**：
- ❌ "这就是完整产品"
- ❌ "所有功能都已实现"
- ❌ "可以直接用于生产环境"

---

### 正确的表述方式

**关于代码生成**：
- ✅ "系统会生成结构化的功能定义，代码生成正在完善中"
- ✅ "当前版本可以展示完整的数据流和验证链路"

**关于文件写入**：
- ✅ "workspace 记录已写入，真实文件写入功能正在完善"
- ✅ "dry-run 模式可以预览将要生成的文件"

**关于冲突治理**：
- ✅ "基础冲突检测已实现，完整治理正在开发中"
- ✅ "当前可以检测部分类型的冲突"

**关于产品状态**：
- ✅ "这是一个接近完成 Phase 1 的系统骨架"
- ✅ "核心架构已完成，部分功能仍在完善中"

---

## 演示流程建议

### 最小演示流程（5-10 分钟）

**目标**：展示核心价值，不过度承诺

**步骤**：
1. **介绍产品**（1 分钟）
   - "Rune Weaver 是一个面向 Dota2 模组开发者的功能构建工具"

2. **运行 examples**（2 分钟）
   ```bash
   npm run examples
   ```
   - "这些示例展示了核心数据结构和验证链路"

3. **创建 feature**（3 分钟）
   ```bash
   npm run cli -- dota2 run "做一个按Q键的冲刺技能" --host <path>
   ```
   - "这是 dry-run 模式，展示完整的 proposal 链路"

4. **查看 workspace**（2 分钟）
   ```bash
   Get-Content "<host-root>/game/scripts/src/rune_weaver/rune-weaver.workspace.json"
   ```
   - "这是 workspace 文件，记录了 feature 的状态"

5. **列出 features**（2 分钟）
   ```bash
   npm run cli -- dota2 --list --host <path>
   ```
   - "这是所有已创建的 features"

---

### 完整演示流程（15-20 分钟）

**目标**：展示完整链路，说明当前限制

**步骤**：
1. **最小演示流程**（10 分钟）

2. **展示 update**（3 分钟）
   ```bash
   npm run cli -- dota2 update "把冷却改为12秒" --host <path> --feature <id>
   ```
   - "这是 update 功能，当前为 owned-scope rewrite"

3. **展示 governance**（3 分钟）
   - 创建冲突 feature
   - "这是冲突检测，当前为 workspace-backed 冲突检测"

4. **说明限制**（2 分钟）
   - "写入功能已实现（`--write` 模式）"
   - "删除功能会移除 RW-owned 文件并刷新 bridge"
   - "完整功能将在后续版本实现"

---

### 演示失败时的降级方案

| 场景 | 降级方案 | 话术 |
|------|----------|------|
| LLM 不可用 | 使用 `npm run examples` | "让我们先看看静态验证链路" |
| `--write` 失败 | 使用 dry-run 模式 | "我们用 dry-run 模式展示 proposal 链路" |
| UI 无法启动 | 使用 CLI 输出 | "我们通过 CLI 查看结果" |
| 冲突检测失败 | 说明当前限制 | "冲突检测正在完善中" |

---

## 验收清单

### External-Safe 验收

- [ ] `npm run examples` 通过
- [ ] Feature 有稳定 ID
- [ ] Workspace 记录结构正确
- [ ] `--list` 显示 feature 列表
- [ ] `--inspect` 显示 feature 详情
- [ ] `--write` 模式真实写入文件
- [ ] `--delete` 删除 RW-owned 文件并刷新 bridge
- [ ] Governance 检测到冲突并显示警告

### Internal-Only 验收

- [ ] （当前无 Internal-Only 项目）

### Deferred 确认

- [ ] Regenerate 未实现（deferred）
- [ ] Rollback 未实现（deferred）
- [ ] Semantic Update 未实现
- [ ] Second Host 未实现

---

## 相关文档

- [AGENT-EXECUTION-BASELINE.md](./AGENT-EXECUTION-BASELINE.md) - 当前 MVP 边界定义
- [COMMAND-RECIPES.md](./COMMAND-RECIPES.md) - 命令使用指南
- [WORKSPACE-MODEL.md](./WORKSPACE-MODEL.md) - Workspace 模型定义
- [DEMO-PATHS.md](./DEMO-PATHS.md) - 演示路径定义
- [X-TEMPLATE-ONBOARDING.md](./X-TEMPLATE-ONBOARDING.md) - X-Template 集成流程
- [PRODUCT.md](./PRODUCT.md) - 产品定位和目标

---

*文档版本: 1.0*
*最后更新: 2026-04-11*

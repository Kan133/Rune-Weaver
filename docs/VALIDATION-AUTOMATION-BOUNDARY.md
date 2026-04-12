# Rune Weaver 验证自动化边界说明

本文档说明 Rune Weaver 验证流程中哪些动作现在就可以脚本化、哪些后续适合脚本化、哪些当前必须人工判断。

**注意**: 本文档是"自动化边界说明"，不是自动化实现计划。目的是帮助后续做验证自动化决策。

---

## 1. 自动化分级

### 1.1 现在就可以脚本化（Ready）

| 验证动作 | 自动化方式 | 说明 |
|----------|------------|------|
| **Clean State 准备** | PowerShell/Bash 脚本 | 删除 workspace 文件、重置 bridge |
| **执行 verify:p0** | NPM script | `npm run verify:p0` 已完整 |
| **执行 workbench create** | NPM script | `npm run workbench -- "<prompt>" <host> --write` |
| **列出 features** | CLI 命令 | `npx tsx apps/workbench/index.ts --list <host>` |
| **导出 bridge** | CLI 命令 | `npm run cli -- export-bridge --host <host>` |
| **读取 workspace 文件** | JSON 解析 | 读取并解析 `rune-weaver.workspace.json` |
| **检查文件存在性** | 文件系统 API | 检查 `generatedFiles` 中的路径 |
| **检查文件大小** | 文件系统 API | 确认文件非空 |

### 1.2 后续适合脚本化（Future）

| 验证动作 | 自动化方式 | 前置条件 |
|----------|------------|----------|
| **Workspace 字段验证** | JSON Schema 验证 | 需要稳定的 workspace schema |
| **Bridge 导出验证** | JSON 对比 | 需要稳定的 bridge 格式 |
| **Host Truth 检查** | Git diff 解析 | 需要 git 集成 |
| **Governance 冲突检测** | 规则引擎 | 需要 governance 规则稳定 |
| **Revision 递增检查** | 数值比较 | 需要多次执行记录 |
| **Feature Identity 保持** | ID 对比 | 需要跨执行记录 |

### 1.3 当前必须人工判断（Manual）

| 验证动作 | 人工判断点 | 原因 |
|----------|------------|------|
| **代码语义正确性** | 生成的代码是否逻辑正确 | LLM 输出不可完全预测 |
| **Pattern 选择合理性** | selectedPatterns 是否匹配需求 | 需要理解业务语义 |
| **Bridge points 更新正确性** | import/mount 语句是否正确 | 需要理解宿主代码结构 |
| **Governance 决策** | conflict 时是否 proceed | 需要业务判断 |
| **UI 组件渲染** | UI 是否正确显示 | 需要视觉验证 |
| **验收标准最终判定** | PASS/FAIL 最终判定 | 需要综合判断 |

---

## 2. 各 Packet 自动化边界

### 2.1 Packet A: Create

| 步骤 | 自动化级别 | 说明 |
|------|------------|------|
| 1. Clean State 准备 | **Ready** | 脚本可完成 |
| 2. 执行 create 命令 | **Ready** | NPM script |
| 3. 检查 workspace 文件存在 | **Ready** | 文件系统检查 |
| 4. 检查 workspace 字段 | **Future** | 需要 schema 验证 |
| 5. 检查 generatedFiles 存在 | **Ready** | 文件系统检查 |
| 6. 检查文件非空 | **Ready** | 文件大小检查 |
| 7. 检查路径合规 | **Ready** | 路径前缀检查 |
| 8. 检查 Bridge 导出 | **Future** | 需要格式稳定 |
| 9. 代码语义验证 | **Manual** | 需要人工判断 |

### 2.2 Packet B: Update

| 步骤 | 自动化级别 | 说明 |
|------|------------|------|
| 1. 获取 feature ID | **Ready** | list 命令 |
| 2. 执行 update 命令 | **Ready** | CLI 命令（实验性） |
| 3. 检查 revision 递增 | **Future** | 需要记录对比 |
| 4. 检查 featureId 保持 | **Future** | 需要记录对比 |
| 5. 检查文件路径一致 | **Ready** | 文件系统检查 |
| 6. 检查内容更新 | **Manual** | 需要人工判断 |

### 2.3 Packet C: Delete

| 步骤 | 自动化级别 | 说明 |
|------|------------|------|
| 1. 执行 delete 命令 | **Ready** | workbench delete |
| 2. 检查 workspace 状态 | **Ready** | JSON 检查 |
| 3. 检查文件已删除 | **Ready** | 文件系统检查 |
| 4. 检查 Bridge 清理 | **Future** | 需要格式稳定 |
| 5. 检查无孤儿文件 | **Ready** | 目录扫描 |

### 2.4 Packet D: Governance

| 步骤 | 自动化级别 | 说明 |
|------|------------|------|
| 1. 创建冲突场景 | **Ready** | 脚本执行两次 create |
| 2. 检查 conflict 检测 | **Future** | 需要输出解析 |
| 3. 检查 recommendedAction | **Future** | 需要输出解析 |
| 4. 决策是否 proceed | **Manual** | 需要业务判断 |

---

## 3. 自动化建议

### 3.1 立即可实施的自动化

```powershell
# 示例：Packet A 自动化脚本框架

# 1. Clean State
Remove-Item "game/scripts/src/rune_weaver/rune-weaver.workspace.json" -ErrorAction SilentlyContinue

# 2. Execute Create
npm run workbench -- "做一个按Q键的冲刺技能" D:\test1 --write

# 3. Check Workspace Exists
$workspacePath = "game/scripts/src/rune_weaver/rune-weaver.workspace.json"
if (-not (Test-Path $workspacePath)) {
    Write-Error "Workspace file not found"
    exit 1
}

# 4. Check Generated Files
$workspace = Get-Content $workspacePath | ConvertFrom-Json
foreach ($file in $workspace.features[0].generatedFiles) {
    if (-not (Test-Path $file.path)) {
        Write-Error "Generated file not found: $($file.path)"
        exit 1
    }
    if ((Get-Item $file.path).Length -eq 0) {
        Write-Error "Generated file is empty: $($file.path)"
        exit 1
    }
}

Write-Host "✓ Packet A validation passed"
```

### 3.2 后续可扩展的自动化

```typescript
// 示例：Workspace Schema 验证（未来）
import { validateWorkspace } from './validators';

const workspace = JSON.parse(fs.readFileSync(workspacePath, 'utf8'));
const result = validateWorkspace(workspace, {
  requiredFields: ['featureId', 'blueprintId', 'selectedPatterns', 'generatedFiles'],
  featureStatus: 'active',
  minRevision: 1
});

if (!result.valid) {
  console.error('Workspace validation failed:', result.errors);
  process.exit(1);
}
```

### 3.3 保持人工的环节

```markdown
## 人工检查清单（Packet A）

- [ ] 生成的代码逻辑是否符合需求
- [ ] selectedPatterns 是否合理匹配需求
- [ ] entryBindings 是否正确指向宿主入口
- [ ] 代码风格是否符合项目规范
- [ ] 是否有明显的语法错误
```

---

## 4. 自动化实现优先级

### 4.1 P0（立即实现）

1. **Clean State 自动化脚本** - 准备验证环境
2. **基础文件检查脚本** - 检查 workspace 存在、文件存在、文件非空
3. **命令执行封装** - 统一执行验证命令并捕获输出

### 4.2 P1（近期实现）

1. **Workspace Schema 验证** - 验证 workspace 字段完整性
2. **Revision 追踪** - 记录和对比多次执行的 revision
3. **Git 集成** - 检查 host truth（修改范围）

### 4.3 P2（远期实现）

1. **Governance 规则引擎** - 自动化 conflict 检测验证
2. **代码语义分析** - 基础代码正确性检查
3. **端到端自动化** - 完整的验证流水线

---

## 5. 与验收标准的关系

| 验收标准 | 自动化支持 | 说明 |
|----------|------------|------|
| featureId 非空 | **Ready** | 字段存在性检查 |
| selectedPatterns 非空 | **Ready** | 数组长度检查 |
| generatedFiles 非空 | **Ready** | 数组长度 + 文件检查 |
| revision 正确 | **Future** | 需要记录对比 |
| status 正确 | **Ready** | 字符串匹配 |
| 文件存在 | **Ready** | 文件系统检查 |
| 文件非空 | **Ready** | 文件大小检查 |
| 路径合规 | **Ready** | 路径前缀检查 |
| 代码语义正确 | **Manual** | 需要人工判断 |

---

## 6. 风险与限制

### 6.1 自动化风险

| 风险 | 说明 | 缓解措施 |
|------|------|----------|
| **过度自动化** | 自动化可能掩盖真正的问题 | 保留关键人工检查点 |
| **假阳性** | 自动化通过但产品有问题 | 人工抽查验证 |
| **维护成本** | 自动化脚本需要维护 | 保持脚本简单、文档完善 |
| **环境依赖** | 脚本依赖特定环境 | 文档化环境要求 |

### 6.2 当前限制

1. **LLM 输出不可预测** - 生成的代码每次可能不同
2. **Host 环境差异** - 不同 host 可能有不同结构
3. **Bridge 格式不稳定** - 可能随版本变化
4. **Governance 规则演进** - 规则可能调整

---

## 7. 建议的自动化路径

### 7.1 阶段一：基础自动化（当前）

- Clean State 脚本
- 命令执行封装
- 基础文件检查

### 7.2 阶段二：验证自动化（近期）

- Workspace Schema 验证
- Revision 追踪
- Git diff 检查

### 7.3 阶段三：智能自动化（远期）

- 代码语义分析
- Governance 自动化
- 端到端流水线

---

## 8. 相关文档

- [VALIDATION-PLAYBOOK.md](./VALIDATION-PLAYBOOK.md) - 验证执行手册
- [COMMAND-RECIPES.md](./COMMAND-RECIPES.md) - 命令配方
- [CLEAN-STATE-PROTOCOL.md](./CLEAN-STATE-PROTOCOL.md) - Clean State 协议
- [ACCEPTANCE-CHECKLISTS.md](./ACCEPTANCE-CHECKLISTS.md) - 验收检查清单

---

*文档版本: 1.0*
*最后更新: 2026-04-10*
*本文档为自动化边界说明，不是自动化实现计划*

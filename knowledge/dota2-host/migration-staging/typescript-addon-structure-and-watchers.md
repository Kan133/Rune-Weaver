# TypeScript Addon 结构与 Watcher

## 1. 用途

把 ModDota TypeScript 教程里和“宿主项目结构 / 编译流 / 共享类型 / watcher”直接相关的知识整理成 Rune Weaver 可消费的 Tier 1 host knowledge。

这份文档不复述整套模板安装教程，而是提炼对 host mapping、bridge planning、写入落点和共享类型最有价值的部分。

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_typescript.md`
- 章节: `Typescript Introduction`
- 关键页面: https://moddota.com/scripting/Typescript/typescript-introduction

## 3. 核心要点

### 3.1 TypeScript 在 Dota2 host 里的价值不是“语法换皮”，而是显式宿主契约

上游教程强调的核心收益不是单纯从 Lua 改成 TypeScript，而是：

- API 调用会被类型系统约束，明显不合理的调用会在编译期暴露
- 内建 enums / interfaces 让宿主常量、事件、类型名更容易被准确引用
- Server 与 Panorama 可以共享一套类型化思维，而不是分裂成两套弱约束脚本

对 Rune Weaver 来说，这意味着 TypeScript host 更适合做：

- enum / API grounding
- shared declaration planning
- 生成代码后的静态约束检查

### 3.2 模板默认把“源码目录”和“编译产物目录”分开

上游模板的默认形态是：

```text
project root/
  src/
    vscripts/
    panorama/
    common/
  game/
  content/
```

其中最重要的映射关系是：

- `src/vscripts/**` -> 编译到 `game/scripts/vscripts/**`
- `src/panorama/**` -> 编译到 Panorama 对应输出位置
- `src/common/**` -> 放 server / panorama 共享声明，通常是 `.d.ts`

这对 Rune Weaver 的直接意义是：

- 写入执行器应优先识别源码层，而不是直接写编译产物
- `common/*.d.ts` 是 shared events / nettables / custom enums 的天然落点
- 宿主如果使用这种模板，`game/scripts/vscripts/**` 更像产物区，不应当被当成唯一权威编辑面

### 3.3 `src/common` 是跨边界契约层，不只是“杂物目录”

上游特别指出 `common` 适合放：

- shared interfaces
- shared event payloads
- Custom NetTables 数据声明
- 共享 enums

这意味着一旦 feature 同时触发 server 和 UI：

- 先找 `common` 是否已有声明
- 没有时优先考虑在 shared declaration 层补齐，再写两端逻辑

这比让 server / UI 各自硬编码字段名更适合作为 Rune Weaver 的桥接策略。

### 3.4 watcher 是编译流的常态，不是一次性命令

上游把 `npm run dev` / Build Task 视为常驻 watcher：

- 文件改动后自动重编译
- 只有无编译错误时才会产出 Lua / JS
- 这决定了“写入成功”与“宿主可运行”之间还隔着一次 watcher 成功产物

因此在 TypeScript host 上，Rune Weaver 更合理的验证心智应该是：

1. 写入源码
2. watcher / build 成功
3. 运行时验证

而不是把“文件已写入”误判成“宿主已可用”。

### 3.5 模板安装与 symlink 机制是常见实现，不是绝对宿主真理

上游教程默认：

- 项目目录在 Dota 安装目录之外
- `package.json` 里的 name 决定 addon 名
- `npm install` 建立 symlink 到 Dota 的 `game_dota_addons` / `content_dota_addons`

这对 Rune Weaver 的判断很有价值，但必须保持批判性：

- 这是“常见模板默认”，不是所有 host 都会这样布局
- 是否是 symlink 宿主，应该由 host inspection 发现，而不是先验假设
- 如果宿主不是模板派生物，就不能强行套用这些路径约定

### 3.6 更新与底座文件的职责边界

上游把以下文件列为模板底座：

- `tsconfig.json`
- `vscripts/lib/dota_ts_adapter.ts`
- `vscripts/lib/tstl-utils.ts`
- `timers.lua` / `timers.d.ts`

对 Rune Weaver 来说，这些文件更接近“host runtime substrate”：

- feature 生成通常不应随意重写它们
- 若 feature 依赖这些底座能力，应先判定宿主是否已有等价实现
- 更新模板版本属于 host maintenance，不应和 feature logic 变更混在一起

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| Host Mapping | 判断源码层与产物层的真正落点 |
| Bridge Planning | 识别 `src/common` 这类 shared declaration seam |
| Write Executor | 优先写源码目录，再交由 watcher 产生产物 |
| Validation | 把 watcher / typecheck 视为写入后的必要证据 |
| Retrieval | 为 host enum / shared types / API grounding 提供更可信的上下文 |

## 5. 当前最相关的 Pattern / Module

- `state.session.feature_owned`
- `ui.selection_modal`
- `ui.resource_bar`
- 任意需要同时改 server + panorama + shared declarations 的 feature

## 6. 后续注意事项

- 不要把模板默认路径当成全部宿主的硬约束
- 如果宿主已有不同 build pipeline，应先尊重宿主现状再决定写入位置
- `src/common` 适合放共享声明，不适合塞进生成逻辑或运行时代码

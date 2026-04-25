# Tooltip / Localization / Ability Text Pipeline

## 1. 用途

把 ModDota `Tooltip Generator` 相关知识整理成一份适合 Rune Weaver 使用的 host knowledge，重点回答：

- 为什么不该继续手写大块 localization KV
- Tooltip Generator 的对象模型是什么
- watcher / 生成流程如何工作
- 变量插值、语言拆分和 legacy KV 迁移有什么注意点

## 2. 上游来源

- `references/dota2/docs/moddota_scripting_typescript.md`
- 章节: `Tooltip Generator`
- 关键页面: https://moddota.com/scripting/Typescript/tooltip-generator

## 3. 核心要点

### 3.1 这个工具解决的是“文本契约的脆弱性”

上游给出它的动机非常明确：

- 手写 KV 容易拼错 key
- `%value%%%` 这类格式容易出错
- localization 文件会膨胀成巨大单文件
- 多语言维护很容易漂移

因此 Tooltip Generator 的价值不是“把 KV 换种写法”，而是把 tooltip / localization 从脆弱字符串拼接，提升成类型化对象。

### 3.2 生成器把文本分成三大类

上游定义的基本类型是：

- Standard Tooltips
- Ability Tooltips
- Modifier Tooltips

它们分别对应不同 key 结构：

- Standard: 任意 `classname -> name`
- Ability: `DOTA_Tooltip_Ability_<ability>`
- Modifier: `DOTA_Tooltip_<modifier>`

这对 Rune Weaver 很关键，因为它意味着 tooltip 生成不该是“一大段任意 KV 文本”，而应是按能力类别映射到固定结构。

### 3.3 Ability Tooltip 的对象模型比 KV 更适合综合生成

上游为 ability tooltip 提供的是对象字段，而不是手工拼 key：

- `ability_classname`
- `name`
- `description`
- `lore`
- `notes`
- `scepter_description`
- `shard_description`
- `ability specials`

这个对象模型更适合 Rune Weaver，因为它天然支持：

- feature 级文案综合
- notes / lore / shard / scepter 的可选拼接
- 与 ability numeric fields 的显式连接

### 3.4 变量插值应围绕“命名数值键”组织

上游 generator 把变量写法从 `%damage%` 这类 KV 语法，提升成更易写的 `{damage}`。

它的意义不是语法糖，而是：

- 让 description 与数值键之间的关系更清晰
- 让 `%` 号本身不再那么容易写错
- 让同一份文案更容易同步到多语言输出

因此如果 Rune Weaver 生成 tooltip 文本：

- 应优先围绕命名数值键组织文案
- 不要直接在最终 KV 里手工拼接 `%foo%%%`

### 3.5 watcher 是 localization pipeline 的核心，而不是附属脚本

上游 workflow 是：

1. 安装 npm package
2. `npm run init`
3. `npm run dev`
4. watcher 监听 localization 源文件变化并重写 addon language 文件

其中最需要保留的风险提示是：

- 初始化和后续生成会重写 addon localization 文件
- 如果已有手工 KV，需要先备份

这说明 Rune Weaver 若面向已有宿主接入这类工具：

- 不能把 localization 生成当成无副作用操作
- 要先判断宿主是否已有生成器、现有文本是否还是手写 KV

### 3.6 Codemaker 适合一次性迁移，不适合被当成运行时依赖

上游同时提供 Tooltip Codemaker，把旧 KV 反向转成代码。

但它也明确说明：

- 分组并不完美
- 命名相近的 ability 可能被误并
- 更适合一次性迁移现有 KV，而不是日常循环依赖

因此对 Rune Weaver 的直接结论是：

- 如果目标宿主已经有大量旧 KV，这类工具更像 migration helper
- 不应把它设计成日常 feature 生成的必要运行环节

## 4. 对 Rune Weaver 的直接价值

| 场景 | 价值 |
|------|------|
| Tooltip synthesis | 给 ability / modifier 文案一个结构化输出面 |
| Localization hygiene | 降低手写 KV 导致的格式错误与多语言漂移 |
| Host inspection | 判断宿主是否已有 tooltip generator / watcher / localization source tree |
| Migration planning | 为 legacy KV 到结构化文本源的迁移提供路径意识 |

## 5. 当前最相关的 Pattern / Module

- 任意需要 ability / modifier tooltip 的 feature
- `ui.selection_modal` 等带较多文案字段的 UI
- 需要 shard / scepter / notes / lore 细分文本的宿主

## 6. 后续注意事项

- 这套工具更像 localization build pipeline，不只是一个帮助写字符串的小库
- 变量命名最好与 ability numeric keys 保持稳定一致
- 如果宿主已经有自己的 localization compiler，不要强行嫁接第二套生成器

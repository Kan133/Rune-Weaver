# Custom Events、Networking 与 State Sync

## 1. 什么时候用

当需求涉及 Server <-> UI 通信、选择流程、资源同步、按键事件回传时，优先看这份文档。

## 2. 来源与迁移状态

- 来源文件:
  - `knowledge/dota2-host/slices/scripting-systems/custom-events-and-networking.md`
  - `knowledge/dota2-host/slices/scripting-systems/state-sync-and-tables.md`
  - `knowledge/dota2-host/slices/panorama/custom-nettables-and-dataflow.md`
  - `references/dota2/docs/moddota_panorama_docs.md`
- 来源章节:
  - Panorama TS / 事件相关内容
  - 现有 staged slices 中关于 custom events、nettables、dataflow 的整理
- 合并整理: 是
- future canonical candidate: 是
- 必须继续保留的原文:
  - `references/dota2/docs/moddota_panorama_docs.md`
  - 相关 raw structured reference（events/api/types）

## 3. 先分三类，不要混

### 3.1 Custom Events

它们是“动作”：

- 打开某个 UI
- 提交某个选择
- 通知某个按键被按下
- 给玩家一个即时反馈

### 3.2 NetTables

它们是“状态”：

- 资源当前值
- 选择流程当前上下文
- 冷却剩余时间
- 某个共享 UI 需要持续读取的面板状态

### 3.3 Shared declarations

它们是“契约描述”：

- event payload shape
- nettables data shape
- server/UI 共用字段名

如果没有 shared declarations，这两层很容易在演化中分叉。

## 4. 推荐通信模式

### 4.1 选择流程

推荐拆法：

- 打开选择框: custom event
- 选择当前状态: nettables
- 提交选择结果: custom event

原因：

- “打开”是一次性动作
- “当前有哪些选项/剩余多久”是持续状态
- “我选了哪个”是一次性提交

### 4.2 资源条

推荐拆法：

- 当前值 / 最大值 / regen / 标签: nettables
- 资源不足错误提示: custom event

### 4.3 按键触发

推荐拆法：

- Panorama 监听 keybinding command
- UI 向 server 发 custom event
- server 决定是否执行 mechanic
- 若要展示状态，再回写 nettables / 发反馈 event

## 5. 命名与边界建议

### 5.1 事件命名

建议：

- 统一前缀，例如 `rw_`
- 名字表达动作，不表达持久状态

例如：

- `rw_show_selection_modal`
- `rw_selection_submitted`
- `rw_key_binding_pressed`

### 5.2 NetTable 命名

建议：

- 表名按功能域
- key 按 player / entity / session scope

例如：

- `rw_resources`
- `rw_selection_state`
- `rw_cooldowns`

### 5.3 什么不能通过 NetTables 放

- 敏感信息
- 权限真相
- 纯服务端决策依据
- 过大、高频且无节流的数据

## 6. 常见坑

- 用 event 承担持续状态，导致新连接玩家拿不到当前真相
- 用 nettables 传一次性动作，导致 UI 行为迟滞或逻辑重复
- server 和 UI 各自硬编码 payload shape
- 把过多数据塞进单个 key
- 在 UI 端把收到的数据当成可信真相，而不是显示层输入

## 7. 推荐做法

- 先问自己：这是动作、状态，还是契约
- 动作用 custom event，状态用 nettables，字段统一用 shared declarations
- 选择流程和资源条优先采用“event + state”混合模型
- 所有 client -> server 事件都应在 server 端重新校验

## 8. 对 Rune Weaver 的直接价值

- 这是 `ui.selection_modal`、`ui.resource_bar`、`rule.selection_flow` 最关键的 staging 知识面之一
- 也能帮助主 session 后续减少“把 UI 事件误当宿主能力”的误接线

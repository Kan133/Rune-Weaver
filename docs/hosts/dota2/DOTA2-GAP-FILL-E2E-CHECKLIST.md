# Dota2 Gap Fill E2E 检查清单

> Status: active-reference
> Audience: agents
> Doc family: contract
> Update cadence: on-phase-change
> Last verified: 2026-04-14
> Read when: running the frozen Dota2 Talent Draw canonical skeleton-plus-fill acceptance pass and collecting the required evidence pack
> Do not use for: cross-host policy, broad Dota2 roadmap truth, or replacing the active execution queue

这份清单用于人工验证当前 Dota2 Gap Fill 主链，目标是确认 Talent Draw canonical skeleton+fill 路径可以稳定走完：

`create skeleton -> gap-fill review -> confirmation/apply -> validate -> repair-build -> launch`

当前冻结值：

- canonical prompt：
  - `把稀有度映射改成 R / SR / SSR / UR 分别提供 1 / 2 / 4 / 7 点全属性，并保留现有触发键、桥接、事件通道和 UI 交互。`
- canonical boundary：
  - `selection_flow.effect_mapping`
- 运行时视频文件名：
  - `talent-draw-demo-runtime.mp4`

---

## 0. 前置条件

- [ ] 使用一个干净的 Dota2 host
- [ ] `addon.config.ts` 中的 `addon_name` 已正确修改
- [ ] 宿主已完成依赖安装
- [ ] Workbench 能正常连接宿主
- [ ] Rune Weaver 仓库当前 `npm run check-types` 可通过
- [ ] Rune Weaver 仓库当前 `npm test` 可通过

---

## 1. Skeleton 创建

- [ ] 在 Workbench 或既有写入路径中成功创建 Talent Draw skeleton
- [ ] feature 已写入宿主，没有出现 write blocker
- [ ] 生成后的 feature 具备可见的 gap-fill boundary
- [ ] boundary 列表中包含 `selection_flow.effect_mapping`
- [ ] 当前运行没有被误标成别的 case

---

## 2. Gap Fill Review

- [ ] 在 Gap Fill 面板中选择 `selection_flow.effect_mapping`
- [ ] 输入冻结的 canonical prompt
- [ ] 点击“生成评审”
- [ ] summary strip 正常显示四态之一
- [ ] Workbench 出现 “Canonical 演示引导”
- [ ] guidance 明确显示当前是 `Acceptance 路径`，不是 exploratory
- [ ] guidance 中显示的固定 prompt 与固定 boundary 正确
- [ ] review 产物已生成
- [ ] approval / decision record 可读
- [ ] readiness 区块可读，且没有明显空白或乱码

---

## 3. 确认 / 应用 / 校验

- [ ] 若本次为 `needs_confirmation`，审批 / 确认单元完整可见
- [ ] 若需要 approval file，前端行为正确，不会误放行 apply
- [ ] 点击“应用补丁”后成功完成 apply
- [ ] 点击“校验结果”后成功完成 validate
- [ ] validate 后 review 仍保持结构化可读，不退化成只能看 raw log
- [ ] apply + validate 成功后，continuation rail 才出现
- [ ] host 未 ready 时，“启动宿主”不可用
- [ ] host ready 后，“启动宿主”才可用

---

## 4. 修复并构建 / 启动

- [ ] 点击“修复并构建”后成功执行 repair-build
- [ ] repair-build 完成后没有新增阻塞
- [ ] 点击“启动宿主”后 launch 命令正确派发
- [ ] 启动参数中的 addon 与 map 正确
- [ ] 没有出现“还没构建就能启动”的误导路径

---

## 5. 游戏内运行时验证

- [ ] 进入正确地图
- [ ] 英雄正常出生
- [ ] 按 F4 后 UI 正常弹出
- [ ] UI 布局正常，没有缩在角落，没有黑屏
- [ ] 选择一个选项后，效果能正常作用到英雄
- [ ] 没有出现明显脚本报错或无限弹窗
- [ ] VConsole 中能看到关键日志：
  - [ ] key F4
  - [ ] featureId talent_draw_demo
  - [ ] selection flow 初始化日志
  - [ ] modifier applier / effect 生效相关日志

---

## 6. Evidence Pack

- [ ] 执行 `npm run demo:talent-draw:refresh -- --host <host>`
- [ ] `docs/talent-draw-case/demo-evidence/latest/` 下生成：
  - [ ] `canonical-gap-fill-contract.json`
  - [ ] `manifest.json`
  - [ ] `review-artifact.json`
  - [ ] `doctor-output.txt`
  - [ ] `validate-output.txt`
  - [ ] `generated-files.json`
- [ ] 如本次需要确认，`gap-fill-approvals/` 中有 approval record
- [ ] 手工截图已补齐：
  - [ ] `06-gap-fill-review.png`
  - [ ] `07-gap-fill-approval-unit.png`
  - [ ] `08-gap-fill-continuation.png`
  - [ ] 运行时截图 01-05
- [ ] 运行时视频已保存为：
  - [ ] `talent-draw-demo-runtime.mp4`

---

## 7. Acceptance 判定

只有以下条件全部满足，才算本轮 canonical acceptance 通过：

- [ ] 使用的是冻结 prompt
- [ ] 使用的是冻结 boundary
- [ ] 走完了 review -> confirmation/apply -> validate -> repair-build -> launch
- [ ] Workbench guidance 将其识别为 canonical，而不是 exploratory
- [ ] 游戏内 F4 UI 与效果链路正常
- [ ] evidence pack 完整

若以下任一情况出现，本次只能记为 exploratory，不算 acceptance：

- [ ] prompt 被替换
- [ ] boundary 不是 `selection_flow.effect_mapping`
- [ ] 跳过 apply / validate / continuation
- [ ] 缺少核心 evidence
- [ ] 游戏内效果链路未通过

---

## 8. 备注

- 这份清单只针对当前 Talent Draw canonical case。
- 当前阶段不要把别的 case 混进这条 acceptance 判断里。
- 第二个 mechanism case 放到这条链稳定之后再开。

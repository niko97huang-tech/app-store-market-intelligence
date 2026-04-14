# Codex V3 Execution Protocol

## 目的

这份文档用于把 V3 开发与 review 流程固定成一个稳定、可重复、可收口的 Codex 协作协议，避免：

- 重复初始化仓库约束
- 同时推进多个大模块
- 明明已经有基础设施却再次返工
- 没有阶段停止条件导致无限扩张

适用场景：

- README V3 文档升级
- Evidence Schema V3 实施
- External Evidence Layer 实施
- Recommendation Ladder 实施
- 输出层升级
- 多 agent review
- 最终交付收口

## 当前仓库基线

每次进入新阶段前，先同步以下状态：

- 仓库根目录已有 `AGENTS.md`
- 已有项目级 skill：`.codex/skills/market-intelligence-v3/SKILL.md`
- 当前主链路已经是：
  `collect -> diff -> analyze -> opportunities -> export -> dashboard`
- 当前已有静态 dashboard，不要重复建设基础展示层
- 当前要求是增量演进，不推翻 Node.js CLI + 文件系统持久化 + 静态 dashboard 形态
- 不要重复做已经完成的基础设施建设
- 先审计当前实现状态，再开始本轮任务

建议使用固定前言：

```text
先同步当前仓库状态，再按本轮任务推进：

- 仓库根目录已有 AGENTS.md
- 已有项目级 skill：.codex/skills/market-intelligence-v3/SKILL.md
- 当前主链路已经是：
  collect -> diff -> analyze -> opportunities -> export -> dashboard
- 当前已有静态 dashboard，不要重复建设基础展示层
- 当前要求是增量演进，不推翻 Node.js CLI + 文件系统持久化 + 静态 dashboard 形态
- 不要重复做已经完成的基础设施建设
- 先审计当前实现状态，再开始本轮任务
```

## 推荐投喂顺序

### Step 1：README V3 + 文档一致性校准

目标：

- 统一项目定位
- 清理文档口径
- 明确哪些是已实现，哪些是规划中
- 建立 V3 术语基线

约束：

- 不要假设仓库仍处于早期状态
- README 要基于真实实现落地
- 文档与脚本、产物、目录保持一致

### Step 2：V3 实施总控审计版

目标：

- 审计当前 V3 相关实现路径
- 输出 V3 最小改造路径
- 不立即无边界开工

关键要求：

- 先审计，再动手
- 先收敛边界，再拆第一批改动

### Step 3：Evidence Schema V3

目标：

- 把 evidence pack 从“信号列表”升级为研究型证据结构

只做：

- schema 升级
- 生成入口与消费链路接通
- JSON / Markdown 真落地
- 最小测试

### Step 4：External Evidence Layer

目标：

- 做最小可运行、可降级、可扩展的外部证据层

只做：

- 最小 provider
- 样例接入
- 降级逻辑

不做：

- 通用抓取平台
- 无边界情报系统

### Step 5：Recommendation Ladder

目标：

- 让最终结论以动作门槛为主，而不是以 overall score 为主

前置：

- 已有 V3 evidence
- 已有 external evidence 接口或降级位

### Step 6：输出层和 Dashboard

目标：

- 让 V3 能力在 JSON / Markdown / CSV / XLSX / dashboard 中真实可见

约束：

- 不重做 dashboard 框架
- 只在现有静态 dashboard 基础上升级展示

### Step 7：多 agent review

目标：

- 对真实代码、README、docs、产物做并行评审
- 区分本轮必须修和可留到 V4 的问题

使用时机：

- 只有当 `3 / 4 / 5 / 6` 都已落地且可跑时再使用

### Step 8：最终收口

目标：

- README / docs / scripts / tests 一致性校准
- verify 链路可验收
- 输出 `docs/final_delivery_report.md`
- 清楚区分已完成、已知限制、V4 再做

### Step 9：防跑偏

以下情况立即触发防跑偏提示：

- 开始设计新平台
- 想引入数据库
- 想服务化
- 想大规模重构目录
- 开始发明新大模块
- 不对照完成条件直接扩需求

## 每轮发送规则

每一轮给 Codex 的消息，建议固定结构：

1. 先发“状态同步前言”
2. 再发本轮唯一任务 prompt
3. 明确：
   - 这轮只做什么
   - 这轮不做什么
   - 完成后必须输出什么
4. 收到结果后，只检查：
   - 有没有真实落代码/文档
   - 有没有给运行命令、测试命令、人工验收方式

如果没有满足完成条件，直接追击：

```text
不要继续扩范围，只补齐本轮完成条件。
```

## 当前最合理的 V3 顺序

基于当前仓库状态，推荐顺序是：

1. README V3 落地
2. V3 实施总控审计版
3. Evidence Schema V3
4. External Evidence Layer
5. Recommendation Ladder
6. 输出层和 Dashboard
7. 多 agent review
8. 最终收口

不建议再重复执行：

- 仓库级约束初始化
- skill 初始化

因为这两项已经存在，重复要求只会造成重工。

## 何时视为本协议执行成功

以下条件同时成立时，说明这套协作协议是有效的：

- 每轮只有一个主任务包
- 没有重复建设基础设施
- 每轮都有运行命令与验收方式
- 最终能收口到 `verify` 可跑、文档一致、输出可查

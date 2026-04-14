# V3 最小改造路径审计

## 目的

这份文档用于回答三个问题：

1. 当前 V3 改造最应该从哪里开始
2. 哪些链路已经存在，不需要推翻重做
3. 哪条最小路径可以把 V3 做成“主链路真实生效”，而不是只改文案或只加展示字段

## 当前已存在的真实链路

当前主链路已经是：

`collect -> diff -> analyze -> opportunities -> export -> dashboard`

其中 V3 相关的真实落点已经存在于以下位置：

- `src/analysis/evidence-pack.js`
  负责组装内部证据与派生说明
- `src/analysis/panel-review.js`
  负责多角色规则化评审
- `src/analysis/decision-chair.js`
  负责最终 recommendation 仲裁
- `src/analyze-market.js`
  负责主分析文档装配
- `src/generate-opportunities.js`
  负责机会卡输出
- `src/analysis/markdown-renderer.js`
  负责 Markdown 输出
- `src/analysis/export-tables.js`
  负责 CSV / XLSX 输出表
- `src/verify-regression.js`
  负责回归验收

也就是说，V3 不需要新起一套主链路，应该在现有链路上增量演进。

## 审计结论

### 1. evidence pack 已存在，但仍是“信号集合”，不是统一的研究型证据结构

当前 `evidence-pack.js` 已经生成：

- `rank_signals`
- `app_signals`
- `monetization_signals`
- `competition_signals`
- `cross_list_signals`
- `evidence_pack`
- `derived_notes`
- `trend_metrics`
- `trend_summary`
- `product_tags`
- `attribution_summary`

问题不在于“没有证据”，而在于：

- 证据结构分散
- 事实、推断、风险、证据缺口混在不同字段层
- `panel-review` 仍然直接消费旧结构，而不是统一 evidence schema

### 2. panel reviews 已有约束力，但仍未真正 evidence-schema-first

当前 `panel-review.js` 已经是规则化分析器，不是空洞文案生成器。

但它的问题是：

- 多个 reviewer 直接吃 `rank_signals` / `derived_notes` / `trend_summary`
- 没有统一消费 `observations / supporting_evidence / competing_explanations / disconfirming_evidence / action_readiness`
- reviewer 之间仍然部分依赖“字段位置”而不是“证据语义”

结论：

- reviewer 不需要重写
- 但必须改为优先消费统一的 Evidence Schema V3

### 3. decision chair 已经有推荐门槛，但还不是 ladder-first

当前 `decision-chair.js` 已经实现：

- 核心角色联合作为前提
- `evidence_auditor` 能压 recommendation
- `skeptical_reviewer` 能压 recommendation

但它仍然更像：

- `score + review constraints`

而不是：

- `recommendation ladder + evidence threshold system`

所以 Recommendation Ladder 的最小改造应该建立在：

- V3 evidence 完整接入
- external evidence 至少有降级位

之后再做，而不是先做。

### 4. 输出层已经足够完整，适合接 V3 字段

当前输出层已经具备：

- `market-analysis.json / .md`
- `opportunities.json / .md`
- CSV
- XLSX
- dashboard

问题不是输出渠道不够，而是：

- 还没有统一口径的 V3 evidence 字段
- Dashboard 和 Markdown 当前展示的仍是旧证据组织方式

结论：

- 输出层不应该先动
- 应该等 Evidence Schema V3 和 Recommendation Ladder 确定后再统一透出

## V3 最小改造路径

### Phase A：Evidence Schema V3

目标：

- 统一证据结构
- 让 reviewer 和 chair 都消费同一套 evidence 语义

必须完成：

- 在 `src/analysis/evidence-pack.js` 中落地统一 V3 evidence 结构
- 至少包含：
  - `observations`
  - `supporting_evidence`
  - `competing_explanations`
  - `disconfirming_evidence`
  - `action_readiness`
  - `evidence_gaps`
  - `evidence_confidence`
  - `attribution_summary`
- `panel-review.js` 改为优先消费 V3 evidence
- `decision-chair.js` 改为读取 V3 evidence 的 readiness / confidence / counter-evidence
- `market-analysis.json` / `.md`
- `opportunities.json` / `.md`
  真实输出 V3 evidence 字段

这是最优先步骤，因为后面所有升级都依赖它。

### Phase B：External Evidence Layer

目标：

- 在不引入复杂情报平台的前提下，让至少一条外部证据进入主链路

必须完成：

- 外部证据 schema
- provider / adapter 接口
- 至少一个最小 provider
- 降级逻辑
- external evidence 接入 Evidence Schema V3

注意：

- 不要先做抓取平台
- 不要让 external evidence 变成主链路硬依赖

### Phase C：Recommendation Ladder

目标：

- 让最终 recommendation 以动作门槛为主，而不是 score-first

必须完成：

- 定义 `observe / research / validate / deprioritize`
- 明确升级条件与降级条件
- `decision_chair` 优先依据：
  - evidence strength
  - trend strength
  - external corroboration
  - counter-evidence pressure
  - execution feasibility
- `overall_score` 退到辅助信息

### Phase D：输出层统一透出

目标：

- 在所有最终产物里真实看到 V3 能力

必须完成：

- JSON
- Markdown
- CSV / XLSX
- dashboard

但这一阶段必须排在 A / B / C 之后。

## 当前不应该先做什么

现在不建议先做：

- 重做 dashboard 框架
- 新数据库层
- 服务化
- 多数据源平台化
- 大规模目录重构
- 更复杂的 agent 协作系统

这些都不会比统一 evidence schema 更先提高 V3 的真实质量。

## 本轮审计后的建议顺序

建议的实际开发顺序：

1. Evidence Schema V3
2. External Evidence Layer
3. Recommendation Ladder
4. 输出层和 Dashboard
5. 多 agent review
6. 最终收口

## 本轮完成判定

这轮只算“审计完成”，不算“V3 已实施”。

本轮完成的标准是：

- 找到 evidence 生成入口
- 找到 evidence 消费链路
- 找到 recommendation 仲裁位置
- 明确最小改造顺序
- 明确当前不该先做的事

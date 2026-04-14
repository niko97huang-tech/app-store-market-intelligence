# App Store Market Intelligence & Decision Support

这是一个基于 Node.js 的 App Store 市场研究助理 + 决策门槛系统。

它的目标不是单纯抓榜单，而是把中国区 iPhone App Store 的榜单变化、应用元数据和趋势信号，整理成可用于赛道研究、竞品跟踪、选题判断和下一步行动决策的结构化结果。

当前仓库形态：

- Node.js CLI
- 文件系统持久化
- JSON / Markdown / CSV / XLSX 输出
- 静态只读 Dashboard

当前版本定位：

- 已公开并可运行：`V3 Public Preview`
- 当前仓库基于稳定主链路持续增强：趋势、证据、外部证据、动作门槛

## 这是什么

这个项目是一个围绕 App Store 市场研究建立的离线分析系统，核心主链路是：

`collect -> diff -> analyze -> opportunities -> export -> dashboard`

它已经能完成：

- 采集七麦中国区 iPhone 榜单
- 用 Apple Lookup 补齐应用详情
- 生成版本化快照
- 对比两个 run 的榜单变化与应用变化
- 生成趋势增强版分析报告
- 输出机会卡、CSV/XLSX、静态 HTML Dashboard

它更适合解决的问题是：

- 最近哪些赛道发生了值得关注的变化
- 哪些方向更值得继续观察、研究或快速验证
- 哪些结论证据还不够，只能保持保守判断

## 这不是什么

这个项目不是：

- 普通榜单爬虫
- 在线 SaaS
- 数据库中台
- 自动立项机器
- Java / Spring / Vue 项目
- 必须依赖数据库才能运行的系统

也就是说，它当前是一个“本地可运行、可复核、可导出的研究系统”，不是在线平台。

## 核心能力

当前已实现的核心能力：

- 榜单采集：采集七麦中国区 iPhone 免费榜、付费榜、畅销榜
- 应用详情补齐：用 Apple Lookup 补齐应用元数据、价格、评分、版本信息
- 版本化快照：以 `run_id` 组织每次采集结果，并维护 `latest` 镜像
- 双 run diff：比较新上榜、掉榜、排名变化、应用详情变化
- 趋势增强分析：基于历史 run 构建轻量趋势代理信号
- 多角色决策：用规则化角色评审和 `decision_chair` 输出更保守的建议
- 多格式输出：生成 Markdown / JSON / CSV / XLSX / 静态 Dashboard
- 回归验证：通过 `check`、`test:analysis`、`verify:analysis` 校验主链路

## 当前主链路

### 1. `collect`

- 抓取七麦榜单分页数据
- 去重并汇总 `app_id`
- 批量查询 Apple Lookup
- 写入 `data/runs/<run_id>/`
- 更新 `data/runs/index.json`
- 同步 `data/latest/`

### 2. `diff`

- 读取两个 run
- 对比榜单变化和应用变化
- 输出 `data/diffs/<diff_id>/diff.json`

### 3. `analyze`

- 装载历史 run 趋势
- 构建 evidence pack
- 计算多维评分
- 执行 panel reviews 和 `decision_chair`
- 输出 `market-analysis.json` / `market-analysis.md`

### 4. `opportunities`

- 从分析结果组装机会卡
- 输出 `opportunities.json` / `opportunities.md`

### 5. `export`

- 生成多张 CSV
- 生成 `insights.xlsx`

### 6. `dashboard`

- 读取分析、机会卡和导出产物
- 生成静态 HTML Dashboard
- 用于本地阅读和演示

## 关键目录

```text
.
├── AGENTS.md
├── README.md
├── package.json
├── src/
│   ├── collect.js
│   ├── diff-runs.js
│   ├── analyze-market.js
│   ├── generate-opportunities.js
│   ├── export-insights.js
│   ├── render-dashboard.js
│   ├── run-pipeline.js
│   ├── analysis/
│   └── runtime/
├── tests/
├── docs/
├── data/
│   ├── runs/
│   ├── latest/
│   ├── diffs/
│   ├── analysis/
│   ├── opportunities/
│   ├── exports/
│   └── dashboard/
└── .codex/skills/
```

关键目录职责：

- `src/analysis/`：趋势、证据、评分、评审、仲裁、导出表渲染
- `src/runtime/`：运行时配置与日志
- `tests/`：分析内核和主链路相关测试
- `data/`：所有运行产物
- `docs/`：架构、开发、故障排查、V3 协议
- `.codex/skills/`：项目级 agent 工作流

## 当前已实现的分析结构（V3 Public Preview）

当前主报告已经具备：

- `executive_summary`
- `opportunity_decision_cards`
- `negative_findings`
- `next_step_actions`
- `panel_reviews`
- `final_decisions`

当前主分析链路已经接入：

- 趋势代理信号
- 多维评分
- 多角色规则化评审
- 最终仲裁
- 静态 Dashboard 展示

## Evidence Schema V3

`Evidence Schema V3` 是当前 V3 Public Preview 的核心结构之一。

目标是把当前 evidence pack 从“信号集合”升级为“研究型证据结构”，至少统一到以下语义：

- `observations`
- `supporting_evidence`
- `competing_explanations`
- `disconfirming_evidence`
- `action_readiness`
- `evidence_gaps`
- `evidence_confidence`
- `attribution_summary`

当前状态：

- 已接入主链路预览版，当前报告会真实输出：
  - `observations`
  - `supporting_evidence`
  - `competing_explanations`
  - `disconfirming_evidence`
  - `action_readiness`
  - `evidence_confidence`
  - `attribution_summary`
- 当前已经接入 `V3 Public Preview` 主链路，后续会继续增强 Recommendation Ladder 的门槛细化与更完整的外部证据约束

## External Evidence Layer

`External Evidence Layer` 是 V3 Public Preview 的第二个关键能力层。

目标不是把项目做成复杂情报平台，而是在现有内部证据之外，补充最小可运行、可降级的外部证据层，例如：

- 公司新闻
- 官方博客
- Release Notes / 更新说明
- 价格变化说明
- 运营活动或媒体报道

当前状态：

- 已接入最小可运行预览版：
  - 统一 external evidence schema
  - provider / adapter 入口
  - 样例 provider（本地 sample fixture）
  - 缺少 external evidence 时自动降级
- 当前标准案例会命中样例外部证据，主要用于验证架构和字段链路
- 当前报告仍主要依赖内部证据；真实新闻/资讯 provider 还属于后续增强项

## Recommendation Ladder

`Recommendation Ladder` 是 V3 Public Preview 的第三个关键能力层。

目标是让最终结论优先由动作门槛决定，而不是由 `overall_score` 单独主导。

目标等级：

- `observe`
- `research`
- `validate`
- `deprioritize`

当前状态：

- 当前系统已经接入 ladder-first 的主结论路径
- 最终建议优先由证据强度、趋势强度、外部印证、反证压力和执行可行性共同约束
- 后续仍会继续细化等级边界和证据门槛

## 输出结果

### 运行产物

- `data/runs/<run_id>/`
- `data/latest/`
- `data/diffs/<diff_id>/diff.json`
- `data/analysis/<analysis_id>/market-analysis.json`
- `data/analysis/<analysis_id>/market-analysis.md`
- `data/opportunities/<analysis_id>/opportunities.json`
- `data/opportunities/<analysis_id>/opportunities.md`
- `data/exports/<analysis_id>/`
- `data/dashboard/<analysis_id>/index.html`

### 当前重点导出表

- `executive_summary.csv`
- `opportunity_decision_cards.csv`
- `not_recommended_tracks.csv`
- `next_actions.csv`
- `score_breakdown.csv`
- `panel_reviews.csv`
- `disagreement_summary.csv`
- `final_decisions.csv`
- `insights.xlsx`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

如本机缺 Playwright 浏览器环境，再执行：

```bash
npx playwright install chromium
```

### 2. 直接跑完整分析主链路

```bash
npm run pipeline -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
```

### 3. 单步执行

```bash
npm run diff -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full
npm run analyze -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
npm run opportunities -- --analysis-id run_2026-04-11_full__vs__run_2026-04-13_full --top-n 10
npm run export -- --analysis-id run_2026-04-11_full__vs__run_2026-04-13_full
npm run dashboard -- --analysis-id run_2026-04-11_full__vs__run_2026-04-13_full
```

### 4. 新采集一个 run

```bash
npm run collect -- --date 2026-04-13 --pages 10
```

## 工程化入口

### 语法检查

```bash
npm run check
```

### 分析内核测试

```bash
npm run test:analysis
```

### 主链路回归验证

```bash
npm run verify:analysis -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
```

### 推荐最小提交前检查

```bash
npm run check
npm test
```

## 当前边界

当前明确保留的项目边界：

- 保留 Node.js CLI + 文件系统持久化 + 静态 dashboard
- 不迁移到 Java / Spring / Vue
- 不引入数据库作为运行前提
- 不做无关的大规模重构
- 优先 schema 清晰化、测试、文档一致性和回归稳定

当前明确不做：

- 在线 SaaS 化
- 多用户平台化
- 数据库中台化
- 大规模服务化拆分
- 为了未来通用性做过度抽象

## 路线图

### 当前稳定层

- V2.1 趋势增强版分析链路
- 多角色决策
- 多格式导出
- 静态 Dashboard
- 最小测试与回归验证

### 下一步（V3）

1. README / docs / scripts 口径统一
2. Evidence Schema V3
3. External Evidence Layer
4. Recommendation Ladder
5. 输出层和 Dashboard 升级
6. 多 agent review
7. 最终收口与交付报告

## 相关文档

- [开发者指南](docs/developer_guide.md)
- [故障排查](docs/troubleshooting.md)
- [评分模型说明](docs/scoring_model.md)
- [V2 设计说明](docs/report_v2_design.md)
- [V3 执行协议](docs/codex_v3_execution_protocol.md)
- [新版本开发计划](docs/version_next_plan.md)
- [项目总览](docs/project_overview.md)
- [项目结构说明](docs/project_structure.md)

## 开源协作

- [AGENTS.md](AGENTS.md)
- [License](LICENSE)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

一句话总结：

这个仓库当前已经是一个可运行的 App Store 市场研究与决策辅助系统；下一阶段的关键，不是继续堆更多报表，而是把证据结构、外部证据和动作门槛真正做厚。

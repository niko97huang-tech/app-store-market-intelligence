# 开发者指南

## 1. 这份文档解决什么问题

这份文档给第一次接手项目的开发者使用，目标是回答三件事：

- 本地怎么准备环境
- 一次完整流程怎么跑
- 改完代码后怎么验证自己没有把主链路弄坏

如果你想先理解项目定位和架构，请先看：

- [README](../README.md)
- [项目结构说明](./project_structure.md)

## 2. 环境要求

- Node.js 20+
- npm
- Playwright 运行环境
- 可访问七麦页面和 Apple Lookup 接口的网络环境

项目当前是 Node.js ESM 脚本仓库，不需要数据库，也不需要启动服务端或前端。

## 3. 安装

在项目根目录执行：

```bash
npm install
```

如果 Playwright 浏览器环境不完整，再执行：

```bash
npx playwright install chromium
```

## 4. 标准运行路径

### 4.1 只跑分析主链路

如果已经有历史 run，推荐先走这一条：

```bash
npm run pipeline -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
```

这会依次执行：

1. `diff-runs.js`
2. `analyze-market.js`
3. `generate-opportunities.js`
4. `export-insights.js`
5. `render-dashboard.js`

输出目录：

- `data/diffs/<diff_id>/`
- `data/analysis/<analysis_id>/`
- `data/opportunities/<analysis_id>/`
- `data/exports/<analysis_id>/`
- `data/dashboard/<analysis_id>/`

### 4.2 单独跑某一步

```bash
npm run diff -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full
npm run analyze -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
npm run opportunities -- --analysis-id run_2026-04-11_full__vs__run_2026-04-13_full --top-n 10
npm run export -- --analysis-id run_2026-04-11_full__vs__run_2026-04-13_full
npm run dashboard -- --analysis-id run_2026-04-11_full__vs__run_2026-04-13_full
```

### 4.3 新采集一个 run

```bash
npm run collect -- --date 2026-04-13 --pages 10
```

如果想固定本次 run_id：

```bash
npm run collect -- --date 2026-04-13 --run-id run_2026-04-13_full
```

## 5. 改代码后的标准验证方式

### 5.1 语法检查

```bash
npm run check
```

### 5.2 分析内核测试

```bash
npm run test:analysis
```

这组测试当前覆盖：

- 趋势信号是否影响 `persistence_score`
- `decision_chair` 是否遵守证据约束
- 导出表是否带出关键趋势字段
- `evidence_auditor` / `skeptical_reviewer` 的关键规则

### 5.3 完整回归验证

```bash
npm run verify:analysis -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
```

这个命令会：

1. 实际跑完整 pipeline
2. 检查核心产物是否存在
3. 检查趋势增强字段、最终决策字段和 dashboard 页面是否存在

### 5.4 推荐的最小提交前检查

```bash
npm run check
npm test
```

## 6. 运行时配置

支持通过环境变量覆盖一部分运行配置：

- `APPSTORE_DATA_DIR`
- `APPSTORE_LOG_LEVEL`
- `APPSTORE_TREND_WINDOWS`
- `APPSTORE_TREND_MAX_DAYS`
- `APPSTORE_TREND_MAX_RUNS`
- `APPSTORE_TREND_MIN_RANKING_ROWS`

示例：

```bash
APPSTORE_LOG_LEVEL=debug npm run analyze -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
```

## 7. 当前推荐的开发边界

当前核心稳定层是：

- `collect`
- `diff`
- `analysis`
- `opportunities`
- `exports`
- `pipeline`

当前不建议在没有额外阶段确认的情况下直接扩这些内容：

- 重平台化 dashboard
- 新数据源接入
- 评论/截图抓取
- 平台化重构
- 复杂插件系统

## 8. 修改代码时的注意事项

- 尽量保持输出 schema 稳定，尤其是：
  - `market-analysis.json`
  - `opportunities.json`
  - `executive_summary.csv`
  - `opportunity_decision_cards.csv`
  - `score_breakdown.csv`
- 新日志走 stderr，机器可消费结果走 stdout
- 优先复用 `src/runtime/config.js` 和 `src/runtime/logger.js`
- 如果改动影响趋势层或最终决策，至少要补一条分析测试

## 9. 下一步看哪里

- 运行问题：看 [故障排查](./troubleshooting.md)
- 架构边界：看 [新版本开发计划](./version_next_plan.md)
- 评分细节：看 [评分模型说明](./scoring_model.md)

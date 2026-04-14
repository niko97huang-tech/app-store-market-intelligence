# 项目结构说明

## 根目录

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

## 目录职责

### `src/`

项目主逻辑入口。

- `collect.js`
  采集快照
- `diff-runs.js`
  生成两个 run 的差异
- `analyze-market.js`
  生成主分析报告
- `generate-opportunities.js`
  生成机会卡
- `export-insights.js`
  导出 CSV / XLSX
- `render-dashboard.js`
  生成静态 Dashboard
- `run-pipeline.js`
  编排主链路

### `src/analysis/`

分析内核。

当前主要包含：

- 趋势装载与趋势指标
- evidence pack 生成
- 评分模型
- 多角色评审
- `decision_chair`
- Markdown / CSV 表渲染
- 标签与归因辅助逻辑

### `src/runtime/`

运行时支撑层：

- 配置
- 日志

### `tests/`

当前最小测试集合，主要覆盖分析内核与关键规则。

### `data/`

项目所有运行产物目录。

- `data/runs/`
  版本化快照
- `data/latest/`
  最新镜像
- `data/diffs/`
  差异结果
- `data/analysis/`
  主分析报告
- `data/opportunities/`
  机会卡
- `data/exports/`
  CSV / XLSX
- `data/dashboard/`
  静态 HTML Dashboard

### `docs/`

项目说明、开发者指南、故障排查、架构说明、V3 协议等文档。

### `.codex/skills/`

项目级 Codex skill 与模板，用于稳定多轮协作。

## 模块边界

当前项目边界是：

- 有静态展示层
- 无在线服务
- 无数据库前提
- 无前后端分离系统
- 无重平台化后台

它当前更接近：

“离线研究链路 + 导出 + 静态演示”

而不是：

“完整 Web 产品”

## 推荐阅读顺序

1. `README.md`
2. `docs/developer_guide.md`
3. `docs/scoring_model.md`
4. `docs/codex_v3_execution_protocol.md`

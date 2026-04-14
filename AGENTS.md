# AGENTS.md

## 项目定位

这是一个基于 Node.js 的 App Store 市场研究助理 + 决策门槛系统。

它的目标是：

- 采集中国区 iPhone App Store 榜单与应用详情
- 生成版本化快照与跨 run diff
- 提供趋势增强、证据驱动、多角色评审的研究报告
- 输出 Markdown / JSON / CSV / XLSX / 静态 Dashboard，辅助选题、赛道研究与立项判断

## 项目不是什么

这个项目不是：

- 普通榜单爬虫
- 在线 SaaS
- 数据库中台
- 自动立项机器
- Java / Spring / Vue 改造目标
- 依赖数据库才能运行的系统

如果未来新增能力，与以上定位冲突，默认不做。

## 当前主链路

当前标准主链路：

1. `src/collect.js`
   采集七麦榜单 + Apple Lookup，生成 `data/runs/<run_id>/`
2. `src/diff-runs.js`
   对比两个 run，生成 `data/diffs/<diff_id>/diff.json`
3. `src/analyze-market.js`
   构建趋势、evidence pack、多角色评审与主分析报告
4. `src/generate-opportunities.js`
   基于分析结果生成机会卡
5. `src/export-insights.js`
   导出 CSV / XLSX
6. `src/render-dashboard.js`
   生成静态 HTML Dashboard
7. `src/run-pipeline.js`
   串联整个主链路

标准数据流：

`runs -> diffs -> analysis -> opportunities -> exports -> dashboard`

## 关键目录说明

- `src/`
  主脚本入口与运行时逻辑
- `src/analysis/`
  分析内核，包括趋势、证据、评分、评审、仲裁、Markdown/CSV 渲染
- `src/runtime/`
  运行时配置与日志
- `tests/`
  当前最小分析内核测试
- `docs/`
  项目文档、设计文档、开发说明、故障排查
- `data/runs/`
  版本化快照
- `data/diffs/`
  diff 输出
- `data/analysis/`
  主分析报告输出
- `data/opportunities/`
  机会卡输出
- `data/exports/`
  表格导出输出
- `data/dashboard/`
  静态 Dashboard 输出
- `.codex/skills/`
  项目级 agent skill

## 构建 / 运行 / 测试命令

安装依赖：

```bash
npm install
```

常用命令：

```bash
npm run collect
npm run diff -- --base-run-id <base> --target-run-id <target>
npm run analyze -- --base-run-id <base> --target-run-id <target> --top-n 10
npm run opportunities -- --analysis-id <analysis_id> --top-n 10
npm run export -- --analysis-id <analysis_id>
npm run dashboard -- --analysis-id <analysis_id>
npm run pipeline -- --base-run-id <base> --target-run-id <target> --top-n 10
```

最小验证命令：

```bash
npm run check
npm run test:analysis
npm run verify:analysis -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
```

## 开发约束

- 保留 Node.js CLI + 文件系统持久化 + 静态 dashboard 的整体形态
- 不迁移到 Java / Spring / Vue
- 不引入数据库作为必需前提
- 不做无关的大规模重构
- 优先做 schema 清晰化、测试、文档一致性、运行稳定性
- 新能力必须优先接入现有主链路，而不是单独起一套旁路系统
- 分析逻辑优先放在 `src/analysis/`，入口脚本只做 orchestration
- 新字段要有明确语义，避免空壳字段和“先占位后实现”
- 新文档必须和 README、脚本命令、实际输出保持一致
- 每次改动后都要写明：
  - 运行命令
  - 验收方式
  - 产物位置

## Done 的定义

只有同时满足以下条件，改动才算 done：

- 代码改动可运行
- 关键输出结构能生成
- README / docs / scripts 对齐
- 有最小验证命令
- 不留空壳字段和假实现
- 如果影响主链路，至少跑一次对应验证命令

推荐按改动范围选择验收：

- 语法/入口改动：`npm run check`
- 分析内核改动：`npm run test:analysis`
- 主链路改动：`npm run verify:analysis -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10`

## 禁止事项

- 禁止把项目改造成在线 SaaS
- 禁止把数据库作为运行前提
- 禁止迁移到 Java / Spring / Vue
- 禁止为了“更通用”做过度抽象
- 禁止在核心主链路未验证时扩外围系统
- 禁止新增没有证据来源的高层结论字段
- 禁止只改 README 不改实际命令，或只改命令不改文档
- 禁止引入无法本地验证的新依赖和新服务
- 禁止在没有明确阶段目标时无限扩功能

## 代理执行建议

- 先确认当前任务属于哪一层：采集、diff、分析、导出、dashboard、工程化、文档
- 先查现有输出 schema 和脚本入口，避免重复造轮子
- 优先小步增量改造，而不是推翻主链路
- 如果需求和项目定位冲突，先收敛边界，再编码
- 涉及 V3 演进或多轮 Codex 协作时，优先参考 `docs/codex_v3_execution_protocol.md`

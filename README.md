<div align="center">
  <img src="assets/banner-option-e.svg" alt="App Store Market Intelligence Banner" width="100%" />
  <h1>App Store Market Intelligence &amp; Decision Support</h1>
  <p><strong>基于 Node.js 的 App Store 市场研究助理 + 决策门槛系统</strong></p>
  <p>从市场数据采集、趋势研究到证据驱动决策输出的一体化工作流</p>
  <p>
    <img src="https://img.shields.io/badge/%E9%98%B6%E6%AE%B5-V3%20Public%20Preview-22C55E?style=for-the-badge" alt="阶段 V3 Public Preview" />
    <img src="https://img.shields.io/badge/%E8%BF%90%E8%A1%8C%E6%97%B6-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="运行时 Node.js" />
    <img src="https://img.shields.io/badge/%E8%AF%AD%E8%A8%80-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111827" alt="语言 JavaScript" />
    <img src="https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF-MIT-F97316?style=for-the-badge" alt="许可 MIT" />
  </p>
</div>

这是一个基于 Node.js 的 App Store 市场研究助理 + 决策门槛系统。

它的目标不是单纯抓榜单，而是把中国区 iPhone App Store 的榜单变化、应用元数据和趋势信号，整理成可用于赛道研究、竞品跟踪、选题判断和下一步行动决策的结构化结果。

当前版本：`V3 Public Preview`

当前形态：

- Node.js CLI
- 文件系统持久化
- Markdown / JSON / CSV / XLSX 输出
- 静态只读 Dashboard

## 它在工作流中的位置

```text
App Store 榜单 / 应用详情 / 外部线索采集 ──► [市场数据采集与研究决策引擎] ──► 你的 AI 助手（研究 / 判断 / 归因 / 动作建议）
                                                     ▲                                                          │
                                                     │                                                          ▼
                                   快照 / Diff / 趋势 / 证据结构 / 多角色评审 ◄────── 报告 / 导出 / Dashboard / 后续验证
```

这个项目不是单纯抓榜单，也不只是做报表，而是位于“市场数据采集”和“研究判断输出”之间的中间层。它负责把榜单抓取、应用详情补齐、快照沉淀、差异对比、趋势分析、证据组织和多角色评审串成一条完整链路，供 AI 助手或人工继续消费。

## 这是什么

这是一个围绕 App Store 市场研究建立的离线分析系统，核心主链路是：

`collect -> diff -> analyze -> opportunities -> export -> dashboard`

当前更适合解决的问题是：

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

### 📡 市场数据采集

- 采集七麦中国区 iPhone 免费榜、付费榜、畅销榜
- 用 Apple Lookup 补齐应用元数据、价格、评分、版本信息
- 预留外部线索接入能力，支持把内部市场数据与外部证据放在同一条研究链路中

### 🧱 快照与对比

- 以 `run_id` 组织版本化快照，并维护 `latest` 镜像
- 对比两个 run 的新上榜、掉榜、排名变化和应用变化
- 将市场变化沉淀为可复盘、可回放、可继续加工的结构化输入

### 📈 趋势研究

- 基于历史 run 构建趋势增强信号
- 区分短期热度、脆弱增长、稳定增强等不同趋势模式
- 为后续证据判断和动作建议提供更稳的时间维度参考

### 🧠 证据与决策

- 接入 `Evidence Schema V3`，统一组织事实观察、支持证据、替代解释、反证、行动准备度和证据置信度
- 接入 `External Evidence Layer`，支持最小可运行、可降级、可扩展的外部证据补强
- 接入 `Recommendation Ladder`，让最终建议优先由动作门槛而不是单一分数决定
- 用多角色规则化评审和 `decision_chair` 输出更保守、更可解释的建议

### 🤖 AI 工作流接入

- 可将 `market-analysis.json`、`opportunity_decision_cards`、`final_decisions` 直接作为 AI 助手输入
- 适合接到研究助理、归因分析、竞品拆解、MVP 假设生成等上层 AI 工作流
- 项目更像 AI 助手的“市场数据与研究判断中间层”，而不是单纯的数据抓取脚本

### 📦 输出与验证

- 输出 Markdown / JSON / CSV / XLSX / 静态 Dashboard
- 支持 `check`、`test:analysis`、`verify:analysis` 三层验证
- 既能用于本地阅读，也适合继续被自动化脚本或 AI 工作流消费

## 当前主链路

- `collect`：采集榜单与应用详情，生成版本化快照
- `diff`：比较两个 run 的市场变化
- `analyze`：生成趋势、证据和主分析报告
- `opportunities`：生成机会卡与建议动作
- `export`：导出 CSV / XLSX
- `dashboard`：生成静态阅读页

## 关键目录

- `src/`：主链路脚本入口
- `src/analysis/`：趋势、证据、评分、评审、仲裁等分析内核
- `src/runtime/`：配置与日志
- `tests/`：最小测试与回归
- `docs/`：开发、架构、排障说明
- `data/`：快照、diff、分析结果、导出和 dashboard 产物
- `assets/`：README 展示图与项目视觉素材

## 数据采集能力

当前项目的第一层能力不是分析，而是市场数据采集。

它已经支持：

- 采集中国区 iPhone App Store 免费榜、付费榜、畅销榜
- 覆盖多个应用分类，并按分页持续抓取榜单数据
- 用 Apple Lookup 补齐应用名称、价格、评分、版本等详情
- 将每次采集结果沉淀成可复盘的版本化快照

这意味着它不是只消费现成数据，而是已经打通了从榜单采集到研究输入的第一段链路。

## 外部证据能力

除了榜单和应用详情，当前系统也预留了外部证据补强能力，用来给研究结论增加更多背景信息。

当前这部分主要面向：

- 官方更新说明
- 公司新闻或博客
- 价格变化说明
- 活动或媒体报道

当前版本已经打通了外部证据的接入、匹配和降级逻辑。即使没有命中外部证据，主链路仍然可以正常运行；如果后续接入真实新闻源或资讯源，也可以在现有结构上继续扩展。

## 决策输出能力

在完成采集、快照、差异和趋势处理之后，系统会把结果整理成更适合研究和判断的输出，包括：

- 更值得关注的赛道变化
- 更值得继续观察、深入研究或快速验证的方向
- 当前证据仍不足、需要保持保守判断的方向
- 可直接继续被 AI 助手或人工消费的结构化结果

最终输出不是单纯的榜单报表，而是围绕“要不要继续研究、为什么、风险在哪、下一步做什么”来组织的。

## 模型与密钥

当前主链路不依赖外部大模型服务，也不要求配置 OpenAI、Gemini 等模型密钥。

默认情况下，你只需要：

- Node.js 依赖
- Playwright 浏览器环境
- 本地文件系统读写权限

如果本机 Playwright 浏览器路径特殊，可额外设置：

```bash
APPSTORE_CHROMIUM_PATH=/your/chromium/path
```

## 输出结果

每次运行后，你最终会拿到 5 类结果：

### 1. 市场快照

保存某一次采集到的榜单和应用详情，方便后续回看、比较和复盘。

### 2. 变化对比结果

告诉你两个时间点之间发生了什么变化，例如：

- 哪些应用新上榜或掉榜
- 哪些分类变化更明显
- 哪些应用排名波动更快

### 3. 主分析报告

这是最适合直接阅读的核心结果，会告诉你：

- 当前最值得关注的变化是什么
- 哪些方向更值得继续观察、研究或验证
- 当前最大的风险和证据缺口是什么

### 4. 机会卡与决策表

这是最适合继续给 AI 助手或自己做下一步判断的结构化结果，重点包括：

- 机会卡
- 最终建议
- 下一步动作
- 多角色评审结果
- 分数与证据拆解

### 5. 表格导出与 Dashboard

如果你更习惯用表格或页面浏览，系统还会生成：

- CSV 导出表
- Excel 汇总文件
- 静态 Dashboard 页面

对应的常见产物位置包括：

- `data/analysis/<analysis_id>/market-analysis.md`
- `data/opportunities/<analysis_id>/opportunities.md`
- `data/exports/<analysis_id>/`
- `data/dashboard/<analysis_id>/index.html`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

如本机缺 Playwright 浏览器环境，再执行：

```bash
npx playwright install chromium
```

### 2. 跑完整主链路

```bash
npm run pipeline -- --base-run-id <base_run_id> --target-run-id <target_run_id> --top-n 10
```

### 3. 做一次最小验证

```bash
npm run check
npm run test:analysis
```

如果你想按步骤执行，也可以分别运行：

```bash
npm run diff -- --base-run-id <base_run_id> --target-run-id <target_run_id>
npm run analyze -- --base-run-id <base_run_id> --target-run-id <target_run_id> --top-n 10
npm run opportunities -- --analysis-id <analysis_id> --top-n 10
npm run export -- --analysis-id <analysis_id>
npm run dashboard -- --analysis-id <analysis_id>
```

### 4. 新采集一次市场快照

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
npm run verify:analysis -- --base-run-id <base_run_id> --target-run-id <target_run_id> --top-n 10
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

### 当前已发布

- 趋势增强版分析链路
- 多角色决策
- Evidence Schema V3
- External Evidence Layer（最小可运行版）
- Recommendation Ladder（ladder-first 主结论路径）
- 多格式导出
- 静态 Dashboard
- 最小测试与回归验证

### 接下来会继续增强

- 更真实的外部证据来源，而不只依赖示例数据
- 更清晰的动作门槛与建议边界
- 更好的 Dashboard 展示与 README 截图
- 更完整的自动校验与交付文档

## 相关文档

- [开发者指南](docs/developer_guide.md)
- [故障排查](docs/troubleshooting.md)
- [评分模型说明](docs/scoring_model.md)
- [V2 设计说明](docs/report_v2_design.md)
- [新版本开发计划](docs/version_next_plan.md)
- [项目总览](docs/project_overview.md)
- [项目结构说明](docs/project_structure.md)

## 开源协作

- [License](LICENSE)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

一句话总结：

这个仓库当前已经是一个可运行的 V3 Public Preview 版 App Store 市场研究与决策辅助系统；下一阶段的关键，不是继续堆更多报表，而是把外部证据、动作门槛和发布收口真正做厚。

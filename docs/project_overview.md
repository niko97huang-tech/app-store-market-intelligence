# 项目总览

## 项目定位

这是一个基于 Node.js 的 App Store 市场研究助理 + 决策门槛系统。

它当前不是在线 SaaS，也不是数据库中台，而是一个本地可运行、文件系统持久化、可导出和可演示的研究型工具链。

## 当前已实现

当前主链路已经闭环：

1. `collect`
2. `diff`
3. `analyze`
4. `opportunities`
5. `export`
6. `dashboard`

当前已实现能力：

- 榜单采集
- 应用详情补齐
- 版本化快照与 `latest` 镜像
- 双 run diff
- 趋势增强版分析
- 多角色决策
- CSV / XLSX 导出
- 静态 HTML Dashboard
- 最小测试和回归验证

## 当前系统形态

当前系统是：

- Node.js CLI
- 本地文件系统持久化
- JSON / Markdown / CSV / XLSX / HTML 输出
- 单机可运行

当前系统不是：

- 多用户平台
- 在线查询服务
- 数据库驱动架构
- 自动立项系统

## 当前主链路

标准数据流：

`runs -> diffs -> analysis -> opportunities -> exports -> dashboard`

核心脚本：

- `src/collect.js`
- `src/diff-runs.js`
- `src/analyze-market.js`
- `src/generate-opportunities.js`
- `src/export-insights.js`
- `src/render-dashboard.js`
- `src/run-pipeline.js`

## 当前重点问题

当前已经能稳定发现变化、生成报告和输出建议，但仍在继续升级的核心问题是：

- 证据结构还不够统一
- 归因仍偏保守
- 外部证据还没有接入主链路
- 最终 recommendation 还没有完全收口为 ladder-first

## 下一步方向

当前推荐的 V3 顺序：

1. README / docs 口径统一
2. Evidence Schema V3
3. External Evidence Layer
4. Recommendation Ladder
5. 输出层和 Dashboard 升级
6. 多 agent review
7. 最终收口

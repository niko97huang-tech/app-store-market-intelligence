# 开发说明

## 1. 技术栈

- Node.js
- ES Module
- Playwright
- 本地 JSON 文件持久化

## 2. 采集脚本说明

`src/collect.js` 的职责：

- 解析命令行参数
- 打开七麦榜单页面
- 通过页面内 Vue `$http` 请求榜单接口
- 归一化榜单字段
- 调用 Apple Lookup 批量补齐应用详情
- 写入 `runs/`、`latest/` 和兼容旧脚本的 dated 文件

当前默认参数：

- `country=cn`
- `device=iphone`
- `pages=10`

当前内置分类为 25 个 iPhone 应用分类。

## 3. 差异脚本说明

`src/diff-runs.js` 的职责：

- 读取 `runs/index.json`
- 选择 base run 和 target run
- 计算新上榜、掉榜、名次变化
- 计算核心应用详情字段变化
- 写入 `data/diffs/`

`src/analyze-market.js` 的职责：

- 读取两个 run 和对应 diff
- 计算赛道机会分数
- 生成优先研究赛道
- 生成新进榜观察与快速上升观察
- 写入 `data/analysis/`

`src/generate-opportunities.js` 的职责：

- 读取 `market-analysis.json`
- 生成可落地的产品方向建议
- 生成参考应用、交付模式和风险提示
- 写入 `data/opportunities/`

`src/export-insights.js` 的职责：

- 读取分析结果和机会清单
- 导出多份 CSV
- 导出单个 XLSX 工作簿
- 写入 `data/exports/`

`src/run-pipeline.js` 的职责：

- 串联 `diff`
- 串联 `analyze`
- 串联 `opportunities`
- 串联 `export`

若不传参数：

- `target` 默认取最新 `snapshot_date`
- `base` 默认取上一个 `snapshot_date`

## 4. 数据字段

榜单快照核心字段：

- `snapshot_date`
- `country`
- `device`
- `category_id`
- `category_name`
- `brand`
- `brand_name`
- `rank`
- `app_id`
- `app_name`
- `publisher_name`
- `is_ad`

应用详情核心字段：

- `trackId`
- `trackName`
- `sellerName`
- `primaryGenreName`
- `version`
- `currentVersionReleaseDate`
- `price`
- `averageUserRating`
- `userRatingCount`
- `bundleId`

## 5. 配置说明

当前项目没有 `application.yml`、`.env`、数据库配置或多环境配置文件。

当前较关键的“硬编码配置”在 `src/collect.js`：

- 默认国家和设备
- 分类清单
- Playwright 本地 Chromium fallback 路径

这部分后续建议抽成独立配置文件。

## 6. 数据库 / 表结构说明

当前没有接入数据库。

因此：

- 无表结构
- 无 migration
- 无 ORM / Repository 分层

如果后续要做系统化商业分析，建议新增：

- `snapshot_runs`
- `rankings`
- `apps`
- `ranking_diffs`
- `analysis_outputs`

当前仅作为建议，尚未落地，实际状态以代码为准。

## 7. 验证记录

已验证：

- `npm run diff`
  当前可正常执行
- `npm run analyze`
  待本次运行结果落盘后以实际产物为准

已通过已有运行结果确认：

- `run_2026-04-10_full`
- `run_2026-04-11_full`
- `run_2026-04-10_full__vs__run_2026-04-11_full`

未验证：

- `npm run collect` 的重新全量执行结果不在本文件重复记录，以 `data/runs/` 实际产物为准
- `npm run build`
  原因：项目没有定义该脚本

## 8. 文档与代码对齐情况

已对齐部分：

- README 已更新为 Node.js 脚本项目描述
- 已补充项目总览、结构说明、开发说明

仍待处理：

- `package.json` 未声明 `playwright` 依赖，与代码实际使用不一致
- 当前没有自动化任务定义文件
- 当前没有商业分析产出脚本

# 故障排查

## 1. 安装阶段

### `npm install` 失败

先确认：

- Node.js 版本是否过低
- 当前网络是否能访问 npm

建议先执行：

```bash
node -v
npm -v
```

## 2. Playwright / 浏览器相关

### 提示找不到 Chromium 或浏览器启动失败

执行：

```bash
npx playwright install chromium
```

如果你本机已经有 Playwright 缓存，但路径变化了，`collect.js` 里的 fallback 路径不会自动修复，这种情况下优先用 Playwright 默认安装路径，不要继续依赖本地旧缓存目录。

### 采集中断后怀疑还有残留进程

当前项目已经在 `collect.js` 和 `run-pipeline.js` 中加入了中断清理。  
如果你仍然怀疑有残留，先重新跑一次短流程确认，再手动检查本机是否还有 Chromium / Node 子进程。

## 3. 七麦采集相关

### 报错“页面运行态里没有拿到 Vue $http 客户端”

这通常表示：

- 七麦页面结构变了
- 页面没有完全加载
- 当前页面被拦截或重定向

建议排查顺序：

1. 手动打开七麦对应页面确认可访问
2. 重新执行采集
3. 如果仍然失败，再检查页面运行方式是否变化

### 七麦接口返回异常 code != 10000

这通常不是本地 JSON 处理问题，而是上游返回异常。  
先确认：

- 当前日期参数是否合法
- 分类参数是否正常
- 七麦页面是否可访问

## 4. Apple Lookup 相关

### Apple Lookup 请求失败

先确认当前网络能访问：

- `https://itunes.apple.com/lookup`

如果只是部分 chunk 失败，通常是临时网络问题；优先重试，而不是先改代码。

## 5. 分析 / 导出相关

### `至少需要两个 run 才能做 diff / 分析`

说明 `data/runs/index.json` 里可用 run 不足。  
先确认：

- `data/runs/` 下是否真的有两个 run 目录
- `run.json` 是否存在
- `index.json` 是否包含这两个 run

### `analysis 输出缺少趋势增强字段`

这是 `verify:analysis` 主动做的 schema 校验，说明：

- `market-analysis.json` 没按预期生成
- 或分析脚本输出 schema 被改坏了

优先排查：

1. 最近是否改过 `analyze-market.js`
2. 最近是否改过 `evidence-pack.js`
3. 最近是否改过 `trend-loader.js` / `trend-metrics.js`

### CSV / XLSX 缺少某些列

先检查：

- 是否改过 `src/analysis/export-tables.js`
- 是否改过 `opportunity_decision_cards` 的字段结构

如果 JSON 有字段但 CSV 没有，问题通常在导出层，不在分析层。

## 6. 测试相关

### `npm run test:analysis` 失败

这表示分析内核规则或测试夹具被破坏了。  
优先看：

- `tests/analysis-kernel.test.js`
- `src/analysis/scoring.js`
- `src/analysis/panel-review.js`
- `src/analysis/decision-chair.js`
- `src/analysis/export-tables.js`

### `npm run verify:analysis` 失败

这表示完整主链路回归失败。  
优先看：

1. 日志里是哪一个子脚本失败
2. 对应脚本是否还能单独执行
3. 生成文件是否存在但字段不完整

### `npm test` 失败，但 `npm run test:analysis` 通过

这通常说明问题出在完整主链路，而不是分析规则本身。  
优先检查：

- `run-pipeline.js`
- `diff-runs.js`
- `analyze-market.js`
- `generate-opportunities.js`
- `export-insights.js`

## 7. 日志怎么看

当前约定是：

- 结构化结果输出到 stdout
- 运行日志输出到 stderr

日志格式类似：

```text
[2026-04-13T09:20:18.670Z] [export-insights] [INFO] 开始导出分析结果 {"analysisId":"..."}
```

如果一个脚本没有产出最终 JSON，而只有错误日志，优先看 stderr 的最后一条错误。

## 8. 什么时候先不要继续改代码

出现下面情况时，先停下来确认边界，而不是直接扩展：

- 为了修一个 bug 想顺手改 schema
- 为了补测试想顺手大改分析逻辑
- 为了补文档想顺手重写主流程
- 为了提升开源体验想顺手接 CI / 发布系统

这些都容易让当前阶段失控。


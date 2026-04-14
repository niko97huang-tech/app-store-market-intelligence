# 终态系统设计

> 说明：这是一份中长期蓝图文档，不等同于当前已经落地的实现状态。当前真实主链路与当前边界，请优先以 `README.md`、`docs/project_overview.md`、`docs/developer_guide.md` 为准。

## 1. 目标

将当前项目从“本地离线研究链路”继续演进为“更完整的 App Store 市场情报系统”。

核心目标：

- 每天稳定采集快照
- 自动比较榜单变化
- 自动生成赛道判断
- 自动生成产品机会清单
- 自动导出 CSV / XLSX 给人工分析

## 2. 当前已落地能力

当前已落地的流水线：

1. `collect`
2. `diff`
3. `analyze`
4. `opportunities`
5. `export`
6. `dashboard`

当前已经具备：

- 版本化快照
- 最新镜像
- 快照差异
- 商业分析报告
- 细分商业机会清单
- 表格导出
- 一键分析流水线
- 静态 Dashboard

## 3. 当前系统形态

当前系统仍是单机、文件型、CLI 架构：

- 存储：本地 JSON / CSV / XLSX
- 调度：手工执行
- 展示：Markdown / 表格文件 / 静态 HTML Dashboard
- 数据源：七麦页面运行态 + Apple Lookup

适合：

- 单人研究
- 快速试验
- 小规模持续观察

不适合：

- 多人协同
- 大规模历史回溯
- 在线查询
- 高并发服务化使用

## 4. 推荐终态架构

### 4.1 数据采集层

- `collect`
  原始榜单与应用详情采集
- `validator`
  校验数据完整性、异常分类、缺失率
- `snapshot registry`
  统一管理 run 元信息

### 4.2 分析计算层

- `diff`
  生成 run 对 run 变化
- `analyze`
  生成赛道评分、变化摘要
- `opportunities`
  输出产品方向建议
- `reporting`
  生成日报、周报、专题报告

### 4.3 存储层

短期建议：

- 保留当前 JSON 文件
- 继续强化 schema、测试、文档和 verify 链路

中期可研究但当前不是主线：

- SQLite / DuckDB 查询层
- 更系统的历史查询能力

当前不建议把数据库作为运行前提。

### 4.4 输出层

- Markdown 报告
- CSV / XLSX 分析包
- 后续可扩展：
  - 更强的静态 dashboard
  - Notion / 飞书同步
  - 自动日报

## 5. 推荐目录演进

可选的未来目录演进方向：

```text
src/
  collect/
  diff/
  analyze/
  opportunities/
  export/
  pipeline/
  shared/
data/
docs/
scripts/
```

当前已经进入“主脚本 + analysis/runtime 子目录”的混合形态，不再是只有两个脚本的早期状态。

## 6. 下一阶段优先级

### P1

- Evidence Schema V3
- External Evidence Layer
- Recommendation Ladder

### P2

- 输出层一致性与 Dashboard 升级
- V3 文档与交付收口
- 多 agent review

### P3

- 自动化调度
- 更深层竞品内容抓取
- 更重的查询层或平台化能力

## 7. 风险项

- 七麦页面运行态接口依赖前端实现，未来可能失效
- Apple Lookup 返回字段可能波动
- 当前评分与仲裁仍是规则化系统，不是统计或学习模型
- 当前还没有 external evidence 主链路
- 当前没有自动调度和失败重试
- 当前没有数据库，历史查询仍依赖文件读取

## 8. 终态判断标准

达到以下条件时，可认为接近终态：

- 主链路稳定可跑
- 能输出更统一的证据结构
- recommendation 以动作门槛为主
- 外部证据可接入且可降级
- README / docs / tests / verify 基本一致

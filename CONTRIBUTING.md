# Contributing

## 目标

这个项目希望保持两件事同时成立：

- 主链路稳定可跑
- 分析能力能持续演进

所以贡献时，请优先保护主链路，不要为了“顺手优化”扩大改动范围。

## 开始之前

建议先阅读：

- [README](/Users/swong.huang/Documents/Work/Ai/项目/应用榜单数据采集/README.md)
- [开发者指南](/Users/swong.huang/Documents/Work/Ai/项目/应用榜单数据采集/docs/developer_guide.md)
- [故障排查](/Users/swong.huang/Documents/Work/Ai/项目/应用榜单数据采集/docs/troubleshooting.md)

## 贡献范围建议

欢迎的贡献包括：

- 修复采集、diff、analysis、export 主链路 bug
- 改进文档和开发者体验
- 补充测试和回归校验
- 在不破坏 schema 的前提下改进分析规则

当前不建议直接提交的大改动包括：

- 未经讨论的大规模架构重写
- 一次性引入多个新数据源
- 复杂 Web 平台化改造
- 没有阶段边界的大范围重构

## 提交流程

1. 先开 issue，说明你要解决的问题
2. 明确改动范围，不要把多个目标混在一个 PR
3. 本地运行最小校验
4. 提交 PR，并在说明里写清楚：
   - 改了什么
   - 为什么要改
   - 怎么验证
   - 有没有影响现有输出 schema

## 本地校验

提交前至少运行：

```bash
npm run check
npm run test:analysis
```

如果改动影响分析主链路，再运行：

```bash
npm run verify:analysis -- --base-run-id run_2026-04-11_full --target-run-id run_2026-04-13_full --top-n 10
```

## 代码约定

- 优先保持输出 schema 稳定
- 新日志走 stderr，结构化结果走 stdout
- 优先复用 `src/runtime/config.js` 和 `src/runtime/logger.js`
- 如果修改评分、评审或仲裁规则，请同步补测试
- 如果修改 README 或开发说明，请确保文档和代码一致

## PR 说明建议

推荐使用这个结构：

```text
## Summary
- ...

## Validation
- npm run check
- npm run test:analysis
- npm run verify:analysis -- --base-run-id ... --target-run-id ...

## Notes
- schema 是否变化
- 风险点
```


# 商业分析报告 V2 设计说明

## 目标

报告 V2 的目标是把原有“市场变化描述器”升级为“决策辅助报告生成器”。

新版报告重点解决的问题：

- 这次最值得研究的方向是什么
- 为什么值得
- 证据是什么
- 风险是什么
- 下一步应该继续观察、深入研究、快速验证还是放弃

## 核心结构

### 1. executive_summary

面向第一屏阅读，提供：

- `top_opportunities`
- `key_takeaways`
- `not_recommended_tracks`
- `next_actions`
- `confidence_note`

### 2. opportunity_decision_cards

每个候选机会都输出：

- `opportunity_name`
- `category_name`
- `list_type`
- `why_now`
- `supporting_evidence`
- `rank_signal_summary`
- `app_signal_summary`
- `representative_apps`
- `monetization_hint`
- `competition_hint`
- `execution_hint`
- `key_risks`
- `recommendation`
- `confidence`
- `score_breakdown`
- `panel_reviews`
- `disagreement_summary`
- `action_plan`

### 3. negative_findings

明确输出本次不建议跟进的方向，避免报告只有正向判断。

### 4. next_step_actions

根据最终结论输出后续动作，例如：

- 继续观察 7 天
- 建竞品矩阵
- 补抓截图与评论
- 做 MVP 验证
- 暂时放弃

## 多角色评审

V2 不依赖外部 LLM，而是通过规则化面板实现多角色评审。

角色包括：

- `demand_analyst`
- `growth_analyst`
- `monetization_analyst`
- `competition_analyst`
- `evidence_auditor`
- `skeptical_reviewer`
- `decision_chair`

所有角色共享同一份 evidence pack，不允许脱离已有 `diff / rankings / apps / summary` 数据做臆测。

## 决策约束

- 若 `evidence_auditor` 判断证据不足，则最终建议最高不超过 `observe`
- 若 `skeptical_reviewer` 给出高风险且没有被充分反驳，则不能直接进入 `validate`
- 只有需求、增长、商业化三个角色同时给出正向结论，才允许进入 `research` 或 `validate`

## 兼容策略

- 保留原有命令行参数
- 保留原有核心输出目录
- 保留旧版常用导出表，同时新增 V2 导出表
- 不引入外部在线依赖

import { getRecommendationLabel } from "./recommendation-ladder.js";
import {
  getConfidenceLabel,
  getTrendPatternLabel,
  getTrendVerdictLabel,
} from "./output-labels.js";

function renderBulletList(items, fallback = "- 待补充") {
  if (!items?.length) {
    return fallback;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function renderActionStage(stage) {
  return getRecommendationLabel(stage ?? "observe");
}

function renderTopOpportunity(item, index) {
  return `### ${index + 1}. ${item.opportunity_name}

- 一句话结论：${item.one_line_conclusion}
- 推荐动作：${item.recommendation}
- 置信度：${item.confidence}
- 原因摘要：${item.reason_summary.join("；") || "待补充"}
- 风险摘要：${item.risk_summary.join("；") || "待补充"}
`;
}

function renderDecisionCard(card, index) {
  return `## ${index + 1}. ${card.opportunity_name}

- 分类：${card.category_name}
- 榜单类型：${card.list_type}
- 最终建议：${card.recommendation}
- 最终置信度：${card.confidence}
- 一句话结论：${card.one_line_conclusion}

### 事实观察

${renderBulletList(card.observations)}

### 支持证据

${renderBulletList(card.supporting_evidence)}

### 替代解释

${renderBulletList(card.competing_explanations)}

### 反证

${renderBulletList(card.disconfirming_evidence)}

### 外部证据

${renderBulletList(card.external_evidence_summary)}
- 外部证据置信度：${card.external_evidence_confidence?.level_label ?? getConfidenceLabel(card.external_evidence_confidence?.level ?? "low")} (${card.external_evidence_confidence?.score ?? 0})

### 榜单信号

${renderBulletList(card.rank_signal_summary)}

### 应用信号

${renderBulletList(card.app_signal_summary)}

### 产品标签与归因

- 产品标签：${card.product_tags?.join(" / ") || "待补充"}
- 商业化形态：${card.monetization_model_hint}
${renderBulletList(card.likely_drivers)}
- 归因克制说明：${card.attribution_summary?.caution ?? "待补充"}
${renderBulletList(card.attribution_summary?.supported_factors)}

### 趋势信号

- 趋势判断：${card.trend_verdict_label ?? getTrendVerdictLabel(card.trend_verdict)}
- 趋势模式：${card.trend_pattern_label ?? getTrendPatternLabel(card.trend_pattern)}
- 趋势强度：${card.trend_strength}
- 趋势稳定性：${card.trend_stability}
${renderBulletList(card.trend_evidence)}

### 代表应用

${renderBulletList(card.representative_apps.map((app) => `${app.app_name} (#${app.rank ?? "?"})`))}

### 商业化 / 竞争 / 执行提示

- 商业化提示：${card.monetization_hint}
- 竞争提示：${card.competition_hint}
- 执行提示：${card.execution_hint}

### 关键风险

${renderBulletList([...card.key_risks, ...card.trend_risks, ...(card.evidence_gaps ?? [])].slice(0, 8))}

### 行动准备度

- 当前阶段：${renderActionStage(card.action_readiness?.stage)}
- 说明：${card.action_readiness?.summary ?? "待补充"}
${renderBulletList(card.action_readiness?.blockers)}

### 证据置信度

- 置信度等级：${card.evidence_confidence?.level_label ?? getConfidenceLabel(card.evidence_confidence?.level ?? "medium")}
- 置信度分数：${card.evidence_confidence?.score ?? 0}
${renderBulletList(card.evidence_confidence?.explanation)}

### 多角色评审摘要

${renderBulletList(card.disagreement_summary.length ? card.disagreement_summary : ["多角色评审意见基本一致"])}

### 下一步动作

${renderBulletList(card.action_plan)}

### 动作门槛

- 当前建议：${card.recommendation}
${renderBulletList(card.recommendation_rationale)}
${renderBulletList(card.unmet_requirements?.map((item) => `未满足：${item}`), "- 当前没有新增未满足条件")}
${renderBulletList(card.downgrade_risks?.map((item) => `降级风险：${item}`), "- 当前没有新增降级风险")}
- 下一最佳动作：${card.next_best_action ?? "待补充"}

### 评分拆解

- growth_score：${card.score_breakdown.growth_score}
- persistence_score：${card.score_breakdown.persistence_score}
- competition_score：${card.score_breakdown.competition_score}
- monetization_score：${card.score_breakdown.monetization_score}
- execution_feasibility_score：${card.score_breakdown.execution_feasibility_score}
- differentiation_score：${card.score_breakdown.differentiation_score}
- overall_score：${card.score_breakdown.overall_score}
`;
}

export function renderMarketAnalysisMarkdown(doc) {
  const executiveTop = doc.executive_summary.top_opportunities
    .map(renderTopOpportunity)
    .join("\n");

  const negativeFindings = doc.negative_findings
    .map(
      (item, index) => `### ${index + 1}. ${item.track_name}

- 结论：${item.conclusion}
- 原因：${item.reason_summary.join("；") || "待补充"}
- 风险：${item.risk_summary.join("；") || "待补充"}
- 建议动作：${item.recommendation}
`,
    )
    .join("\n");

  const decisionCards = doc.opportunity_decision_cards
    .map(renderDecisionCard)
    .join("\n");

  return `# 商业分析报告 V3（证据预览版）

## 分析范围

- 基线快照：${doc.base_run.run_id} (${doc.base_run.snapshot_date})
- 目标快照：${doc.target_run.run_id} (${doc.target_run.snapshot_date})
- 生成时间：${doc.generated_at}

## 一页结论

### 本次最值得看的机会

${executiveTop || "- 待补充"}

### 关键观察

${renderBulletList(doc.executive_summary.key_takeaways)}

### 明确不建议优先跟进

${renderBulletList(
  doc.executive_summary.not_recommended_tracks.map(
    (item) => `${item.track_name}：${item.reason_summary.join("；") || item.conclusion}`,
  ),
)}

### 建议下一步动作

${renderBulletList(doc.executive_summary.next_actions)}

### 可信度说明

- ${doc.executive_summary.confidence_note}

## 市场变化摘要

- 榜单总行数：${doc.market_summary.ranking_changes.base_row_count} -> ${doc.market_summary.ranking_changes.target_row_count}
- 新上榜：${doc.market_summary.ranking_changes.new_entry_count}
- 掉榜：${doc.market_summary.ranking_changes.dropped_entry_count}
- 名次变化：${doc.market_summary.ranking_changes.changed_entry_count}
- 新应用详情：${doc.market_summary.app_changes.new_app_count}
- 移除应用详情：${doc.market_summary.app_changes.removed_app_count}

## 趋势研究摘要

${renderBulletList(doc.trend_research_summary?.overview)}

## 外部证据层

- 命中决策卡数量：${doc.external_evidence_overview?.matched_card_count ?? 0}
- 命中外部证据条数：${doc.external_evidence_overview?.matched_signal_count ?? 0}
${renderBulletList(
  doc.external_evidence_overview?.provider_status?.map(
    (item) => `${item.provider}：${item.status}，加载 ${item.loaded_count} 条`,
  ),
)}

## 标签与归因摘要

${renderBulletList(doc.tag_summary?.map((item) => `${item.tag}：${item.example_opportunities.join("、")}`))}

${renderBulletList(doc.attribution_summary?.supported_patterns)}

## 决策卡

${decisionCards || "待补充"}

## 反方结论

${negativeFindings || "暂无明确反方结论。"}

## 下一步动作

${renderBulletList(doc.next_step_actions.map((item) => `${item.opportunity_name}：${item.action}`))}

## 评分模型说明

${renderBulletList(doc.methodology.scoring_dimensions)}

## 方法备注

${renderBulletList(doc.methodology.notes)}
`;
}

export function renderOpportunitiesMarkdown(doc) {
  const cards = doc.opportunities.map(renderDecisionCard).join("\n");
  return `# 机会清单 V3（证据预览版）

## 分析范围

- analysis_id：${doc.analysis_id}
- 基线：${doc.base_run_id}
- 目标：${doc.target_run_id}
- 生成时间：${doc.generated_at}

## 使用建议

${renderBulletList(doc.summary_notes)}

## 机会决策卡

${cards || "待补充"}
`;
}

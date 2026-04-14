import { compactTextList } from "./helpers.js";

export function buildAttributionInsights(evidence) {
  const changedFields = evidence.evidence_pack.notable_changed_fields ?? [];
  const likelyDrivers = compactTextList(
    [
      evidence.app_signals.version_refresh_count >= 2 ||
      evidence.app_signals.recent_version_update_count >= 2
        ? "证据支持：多个代表应用近期有版本更新，增长可能与版本迭代同步"
        : null,
      changedFields.some((field) => ["price", "formattedPrice"].includes(field))
        ? "证据支持：样本中出现价格字段变化，排名变化可能与定价调整有关"
        : null,
      evidence.monetization_signals.grossing_or_paid_resonance_count >= 2
        ? "证据支持：免费/付费/畅销榜出现联动，说明需求不只停留在单榜单"
        : null,
      evidence.cross_list_signals.active_brand_count <= 1
        ? "推断：当前增长更多来自单榜单信号，尚不能证明是整条赛道共振"
        : null,
      evidence.competition_signals.top_genre_ratio >= 0.75
        ? "证据支持：头部类型集中度偏高，当前变化可能集中在既有成熟玩法中"
        : null,
    ],
    4,
  );

  const monetizationModelHint =
    evidence.brand === "grossing" || evidence.monetization_signals.category_has_grossing_presence
      ? "偏订阅/内购驱动，可优先拆解持续付费点和高频使用场景"
      : evidence.brand === "paid" || evidence.app_signals.price_points.some((value) => Number(value) > 0)
        ? "偏买断型，可优先拆解功能边界和一次性付费理由"
        : "当前更像免费获量阶段，商业化方式仍需额外验证";

  const evidenceGaps = compactTextList(
    [
      evidence.cross_list_signals.active_brand_count <= 1
        ? "仍缺少跨榜单共振证据"
        : null,
      evidence.app_signals.representative_app_count < 3
        ? "代表应用样本仍偏少"
        : null,
      !evidence.monetization_signals.category_has_grossing_presence && evidence.brand === "free"
        ? "缺少畅销榜表现，变现路径仍不清晰"
        : null,
      evidence.trend_metrics?.active_run_count < 3
        ? "历史趋势样本不足，持续性仍偏代理判断"
        : null,
    ],
    4,
  );

  return {
    likely_drivers: likelyDrivers,
    monetization_model_hint: monetizationModelHint,
    evidence_gaps: evidenceGaps,
  };
}

export function summarizeAttributions(candidates) {
  const supported = [];
  const gaps = [];

  for (const candidate of candidates.slice(0, 10)) {
    if (candidate.likely_drivers?.length) {
      supported.push(
        `${candidate.opportunity_name}：${candidate.likely_drivers.slice(0, 2).join("；")}`,
      );
    }
    if (candidate.evidence_gaps?.length) {
      gaps.push(
        `${candidate.opportunity_name}：${candidate.evidence_gaps.slice(0, 2).join("；")}`,
      );
    }
  }

  return {
    supported_patterns: compactTextList(supported, 6),
    evidence_gaps: compactTextList(gaps, 6),
  };
}

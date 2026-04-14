import { clamp, compactTextList, confidenceFromScore } from "./helpers.js";
import { getConfidenceLabel } from "./output-labels.js";

function buildEvidenceConfidence(evidence) {
  const score =
    Math.min((evidence.app_signals.representative_app_count ?? 0) / 5, 1) * 30 +
    Math.min((evidence.rank_signals.changed_count ?? 0) / 100, 1) * 25 +
    Math.min((evidence.cross_list_signals.active_brand_count ?? 0) / 3, 1) * 20 +
    Math.min((evidence.trend_metrics?.active_run_count ?? 0) / 4, 1) * 15 +
    (evidence.monetization_signals.category_has_grossing_presence ? 10 : 0);

  const roundedScore = Math.round(clamp(score, 0, 100));
  const level = confidenceFromScore(roundedScore);

  return {
    level,
    level_label: getConfidenceLabel(level),
    score: roundedScore,
    explanation: compactTextList(
      [
        `代表应用 ${evidence.app_signals.representative_app_count} 个`,
        `变化样本 ${evidence.rank_signals.changed_count} 个`,
        `跨榜联动 ${evidence.cross_list_signals.active_brand_count} 个榜单类型`,
        evidence.trend_metrics
          ? `趋势样本 ${evidence.trend_metrics.active_run_count} 次快照`
          : "缺少历史趋势样本",
        evidence.monetization_signals.category_has_grossing_presence
          ? "存在畅销榜联动"
          : "缺少畅销榜联动",
      ],
      5,
    ),
  };
}

function buildActionReadiness(evidence, evidenceConfidence) {
  const blockers = compactTextList(
    [
      evidence.cross_list_signals.active_brand_count <= 1 ? "当前主要来自单榜单信号" : null,
      (evidence.trend_metrics?.active_run_count ?? 0) < 3 ? "趋势样本不足 3 次快照" : null,
      !evidence.monetization_signals.category_has_grossing_presence && evidence.brand === "free"
        ? "免费榜缺少商业化联动支撑"
        : null,
      evidence.app_signals.representative_app_count < 3 ? "代表应用样本过少" : null,
    ],
    4,
  );

  const rationale = compactTextList(
    [
      evidence.rank_signals.top20_risers_count >= 2 ? "高位改善样本已出现" : null,
      evidence.cross_list_signals.active_brand_count >= 2 ? "已有跨榜单变化支撑" : null,
      evidence.trend_summary?.trend_verdict === "strengthening"
        ? "趋势层支持继续推进"
        : evidence.trend_summary?.trend_verdict === "strong_but_fragile"
          ? "趋势强但稳定性不足"
          : null,
      evidence.external_evidence?.length ? "已有外部证据形成交叉印证" : null,
      evidence.monetization_signals.category_has_grossing_presence
        ? "商业化代理信号存在"
        : null,
    ],
    4,
  );

  let stage = "deprioritize";
  if (evidenceConfidence.score >= 72 && blockers.length === 0) {
    stage = "research";
  } else if (evidenceConfidence.score >= 45) {
    stage = "observe";
  }

  return {
    stage,
    rationale,
    blockers,
    summary:
      stage === "research"
        ? "当前证据足以进入研究阶段，但还不足以直接进入验证。"
        : stage === "observe"
          ? "当前已有部分证据，但更适合继续观察。"
          : "当前证据不足，不建议推进。",
  };
}

function buildCompetingExplanations(evidence) {
  return compactTextList(
    [
      evidence.app_signals.recent_version_update_count >= 2
        ? "排名改善可能主要由近期版本更新驱动，而不是整条赛道同步增强。"
        : null,
      evidence.cross_list_signals.active_brand_count <= 1
        ? "变化可能主要集中在单榜单，而不是跨榜单共振。"
        : null,
      (evidence.rank_signals.new_count ?? 0) + (evidence.rank_signals.dropped_count ?? 0) >= 25
        ? "高 churn 更像短期热度、活动扰动或榜单噪音。"
        : null,
      evidence.trend_summary?.trend_pattern === "single_point_spike" ||
      (evidence.trend_metrics?.current_window?.momentum_app_count ?? 0) <= 1
        ? "增长可能由少数头部应用拉动，而不是簇状增长。"
        : null,
    ],
    4,
  );
}

function buildDisconfirmingEvidence(evidence) {
  return compactTextList(
    [
      evidence.cross_list_signals.active_brand_count <= 1
        ? `只有 ${evidence.cross_list_signals.active_brand_count} 个榜单类型出现活跃变化`
        : null,
      !evidence.monetization_signals.category_has_grossing_presence
        ? "当前缺少畅销榜联动证据"
        : null,
      (evidence.trend_metrics?.active_run_count ?? 0) < 3
        ? `趋势样本仅 ${evidence.trend_metrics?.active_run_count ?? 0} 次快照`
        : null,
      evidence.rank_signals.top20_entrant_count === 0 ? "当前没有高位新进入者" : null,
      evidence.app_signals.representative_app_count < 3
        ? `代表应用只有 ${evidence.app_signals.representative_app_count} 个`
        : null,
    ],
    5,
  );
}

function buildObservations(evidence) {
  return compactTextList(
    [
      `新进榜 ${evidence.rank_signals.new_count} 个`,
      `发生排名变化 ${evidence.rank_signals.changed_count} 个`,
      `Top20 上升 ${evidence.rank_signals.top20_risers_count} 个`,
      `代表应用 ${evidence.app_signals.representative_app_count} 个`,
      `近 30 天内版本更新 ${evidence.app_signals.recent_version_update_count} 个`,
      `活跃榜单类型 ${evidence.cross_list_signals.active_brand_count} 个`,
      evidence.trend_metrics
        ? `趋势样本 ${evidence.trend_metrics.active_run_count} 次快照`
        : null,
    ],
    7,
  );
}

function buildSupportingEvidence(evidence) {
  return compactTextList(
    [
      ...evidence.evidence_pack.rank_signal_summary,
      ...evidence.evidence_pack.app_signal_summary,
      ...evidence.evidence_pack.trend_summary,
      ...evidence.evidence_pack.cross_list_summary,
      ...(evidence.evidence_pack.external_evidence_summary ?? []),
    ],
    8,
  );
}

function buildAttributionSummary(evidence, competingExplanations) {
  const supportedFactors = compactTextList(
    (evidence.likely_drivers ?? []).map((item) =>
      item.startsWith("证据支持：") ? item.replace(/^证据支持：/, "") : item,
    ),
    4,
  );

  return {
    supported_factors: supportedFactors,
    tentative_factors: competingExplanations.slice(0, 3),
    caution:
      "当前归因仍主要基于内部证据、应用元数据和趋势代理信号，尚未接入外部证据层。",
  };
}

export function buildEvidenceSchemaV3(evidence) {
  const evidenceConfidence = buildEvidenceConfidence(evidence);
  const actionReadiness = buildActionReadiness(evidence, evidenceConfidence);
  const competingExplanations = buildCompetingExplanations(evidence);

  return {
    observations: buildObservations(evidence),
    supporting_evidence: buildSupportingEvidence(evidence),
    competing_explanations: competingExplanations,
    disconfirming_evidence: buildDisconfirmingEvidence(evidence),
    action_readiness: actionReadiness,
    evidence_gaps: compactTextList(evidence.evidence_gaps ?? [], 5),
    evidence_confidence: evidenceConfidence,
    attribution_summary: buildAttributionSummary(evidence, competingExplanations),
    external_evidence: evidence.external_evidence ?? [],
    external_evidence_summary: evidence.external_evidence_summary ?? [],
    external_evidence_confidence: evidence.external_evidence_confidence ?? {
      level: "low",
      level_label: getConfidenceLabel("low"),
      score: 0,
      explanation: "当前未命中外部证据。",
    },
  };
}

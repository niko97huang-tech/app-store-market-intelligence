import { confidenceFromScore, compactTextList, verdictFromScore } from "./helpers.js";
import { getConfidenceLabel } from "./output-labels.js";
import { getNextActionLabel } from "./recommendation-ladder.js";
import { ROLE_LABELS, VERDICT_LABELS } from "./reviewer-rules.js";

function getEvidenceV3(evidence) {
  return (
    evidence.evidence_v3 ?? {
      observations: [],
      supporting_evidence: evidence.evidence_pack?.rank_signal_summary ?? [],
      competing_explanations: [],
      disconfirming_evidence: evidence.evidence_gaps ?? [],
      action_readiness: {
        stage: "observe",
        rationale: evidence.derived_notes?.why_now_candidates ?? [],
        blockers: evidence.derived_notes?.risk_candidates ?? [],
        summary: "当前证据仍需补强。",
      },
      evidence_gaps: evidence.evidence_gaps ?? [],
      evidence_confidence: {
        level: "medium",
        score: 50,
        explanation: [],
      },
      external_evidence: [],
      external_evidence_summary: [],
      external_evidence_confidence: {
        level: "low",
        score: 0,
        explanation: "当前未命中外部证据。",
      },
      attribution_summary: {
        supported_factors: evidence.likely_drivers ?? [],
        tentative_factors: [],
        caution: null,
      },
    }
  );
}

function buildReview({
  role,
  score,
  supportingEvidence,
  keyRisks,
  nextAction,
  notes,
}) {
  const confidenceCode = confidenceFromScore(score);
  const verdictCode = verdictFromScore(score);
  return {
    role_code: role,
    role: ROLE_LABELS[role] ?? role,
    verdict_code: verdictCode,
    verdict: VERDICT_LABELS[verdictCode] ?? verdictCode,
    confidence_code: confidenceCode,
    confidence: getConfidenceLabel(confidenceCode),
    supporting_evidence: compactTextList(supportingEvidence, 5),
    key_risks: compactTextList(keyRisks, 5),
    next_action_code: nextAction,
    next_action: getNextActionLabel(nextAction),
    notes: compactTextList(notes, 5),
  };
}

function reviewDemand(evidence, scores) {
  const v3 = getEvidenceV3(evidence);
  const score =
    scores.growth_score * 0.35 +
    scores.monetization_score * 0.2 +
    Math.min(evidence.monetization_signals.top10_avg_rating_count / 200000, 1) * 45;

  return buildReview({
    role: "demand_analyst",
    score,
    supportingEvidence: [
      ...v3.supporting_evidence.slice(0, 3),
      ...v3.attribution_summary.supported_factors.slice(0, 2),
    ],
    keyRisks: [
      ...v3.disconfirming_evidence.slice(0, 2),
      ...v3.evidence_gaps.slice(0, 2),
    ],
    nextAction:
      score >= 70 ? "research" : score >= 48 ? "observe" : "deprioritize",
    notes: [
      ...v3.action_readiness.rationale.slice(0, 2),
      evidence.top_genre ? `头部类型为 ${evidence.top_genre}` : null,
    ],
  });
}

function reviewGrowth(evidence, scores) {
  const v3 = getEvidenceV3(evidence);
  const score = scores.growth_score * 0.6 + scores.persistence_score * 0.4;
  return buildReview({
    role: "growth_analyst",
    score,
    supportingEvidence: [
      ...v3.supporting_evidence.slice(0, 3),
      ...evidence.trend_summary?.trend_evidence ?? [],
    ],
    keyRisks: [
      scores.persistence_score < 45 ? "持续性代理分偏低，可能是短期异动" : null,
      ...v3.competing_explanations.slice(0, 2),
      ...v3.disconfirming_evidence.slice(0, 2),
    ],
    nextAction:
      score >= 75 ? "research" : score >= 50 ? "observe" : "deprioritize",
    notes: [
      v3.action_readiness.summary,
      v3.external_evidence_summary.length
        ? `外部证据 ${v3.external_evidence_summary.length} 条`
        : "当前没有外部证据交叉印证",
      scores.persistence_score >= 60 ? "增长更像多点扩散" : "增长更像局部波动",
    ],
  });
}

function reviewMonetization(evidence, scores) {
  const v3 = getEvidenceV3(evidence);
  const score = scores.monetization_score;
  return buildReview({
    role: "monetization_analyst",
    score,
    supportingEvidence: [
      ...v3.supporting_evidence.slice(0, 2),
      `榜单类型 ${evidence.list_type}`,
      `付费/畅销联动数 ${evidence.monetization_signals.grossing_or_paid_resonance_count}`,
      evidence.monetization_signals.category_has_grossing_presence
        ? "同分类存在畅销榜表现"
        : null,
    ],
    keyRisks: [
      ...v3.disconfirming_evidence.slice(0, 2),
      ...v3.evidence_gaps.slice(0, 1),
    ],
    nextAction:
      score >= 78 ? "research" : score >= 52 ? "observe" : "deprioritize",
    notes: [
      evidence.app_signals.price_points.length
        ? `代表价格点 ${evidence.app_signals.price_points.join(" / ")}`
        : "价格信号有限",
    ],
  });
}

function reviewCompetition(evidence, scores) {
  const v3 = getEvidenceV3(evidence);
  const score = scores.competition_score * 0.7 + scores.differentiation_score * 0.3;
  return buildReview({
    role: "competition_analyst",
    score,
    supportingEvidence: [
      `竞争友好分 ${scores.competition_score}`,
      `差异化分 ${scores.differentiation_score}`,
      `高位新进入者 ${evidence.competition_signals.high_rank_newcomer_count} 个`,
      `头部类型集中度 ${Math.round(evidence.competition_signals.top_genre_ratio * 100)}%`,
    ],
    keyRisks: [
      ...v3.disconfirming_evidence.slice(0, 2),
      ...v3.competing_explanations.slice(0, 2),
    ],
    nextAction:
      score >= 68 ? "research" : score >= 45 ? "observe" : "deprioritize",
    notes: [
      scores.competition_score >= 60 ? "存在切入窗口" : "更像强者主导赛道",
    ],
  });
}

function reviewEvidence(evidence, scores) {
  const v3 = getEvidenceV3(evidence);
  const breadthScore =
    Math.min(evidence.app_signals.representative_app_count / 5, 1) * 35 +
    Math.min(evidence.rank_signals.changed_count / 120, 1) * 25 +
    Math.min(evidence.cross_list_signals.active_brand_count / 3, 1) * 20 +
    Math.min(evidence.app_signals.changed_field_count / 5, 1) * 10 +
    Math.min((evidence.trend_metrics?.active_run_count ?? 0) / 4, 1) * 10;

  return buildReview({
    role: "evidence_auditor",
    score: breadthScore,
    supportingEvidence: [
      ...v3.observations.slice(0, 4),
      ...v3.evidence_confidence.explanation.slice(0, 2),
      ...v3.external_evidence_summary.slice(0, 1),
    ],
    keyRisks: [
      ...v3.disconfirming_evidence.slice(0, 3),
      ...v3.evidence_gaps.slice(0, 2),
    ],
    nextAction:
      breadthScore >= 70 ? "research" : breadthScore >= 45 ? "observe" : "deprioritize",
    notes: [
      `证据置信度 ${v3.evidence_confidence.level} (${v3.evidence_confidence.score})`,
      `外部证据置信度 ${v3.external_evidence_confidence.level} (${v3.external_evidence_confidence.score})`,
      v3.action_readiness.summary,
    ],
  });
}

function reviewSkeptical(evidence, scores) {
  const v3 = getEvidenceV3(evidence);
  const riskScore =
    (100 - scores.persistence_score) * 0.3 +
    scores.competition_pressure_score * 0.3 +
    (100 - scores.monetization_score) * 0.2 +
    (100 - scores.differentiation_score) * 0.2;

  return buildReview({
    role: "skeptical_reviewer",
    score: 100 - riskScore,
    supportingEvidence: [
      scores.competition_pressure_score >= 60 ? "头部压力偏高" : null,
      scores.persistence_score < 50 ? "持续性代理分偏弱" : null,
      scores.monetization_score < 50 ? "商业化线索不足" : null,
      ...v3.disconfirming_evidence.slice(0, 2),
    ],
    keyRisks: [
      ...v3.competing_explanations,
      ...v3.evidence_gaps,
      scores.competition_pressure_score >= 70 ? "强势玩家可能已经锁死高位" : null,
      evidence.rank_signals.new_count > 0 && evidence.rank_signals.top20_entrant_count === 0
        ? "新进入者很多，但难以进入高位"
        : null,
    ],
    nextAction:
      riskScore >= 60 ? "deprioritize" : riskScore >= 42 ? "observe" : "research",
    notes: [
      riskScore >= 60 ? "反方意见较强" : "反方风险可控但仍需验证",
      v3.action_readiness.blockers[0] ?? null,
    ],
  });
}

export function runPanelReview({ evidence, scores }) {
  const reviews = [
    reviewDemand(evidence, scores),
    reviewGrowth(evidence, scores),
    reviewMonetization(evidence, scores),
    reviewCompetition(evidence, scores),
    reviewEvidence(evidence, scores),
    reviewSkeptical(evidence, scores),
  ];

  return {
    reviews,
    reviewMap: new Map(reviews.map((review) => [review.role_code, review])),
  };
}

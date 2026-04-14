import { RECOMMENDATION_ORDER, ROLE_LABELS, VERDICT_LABELS } from "./reviewer-rules.js";
import { compactTextList, confidenceFromScore } from "./helpers.js";
import { getConfidenceLabel } from "./output-labels.js";
import {
  buildLadderAssessment,
  getNextActionLabel,
  getRecommendationLabel,
} from "./recommendation-ladder.js";

function hasPositive(review) {
  return review?.verdict_code === "positive";
}

function hasNegative(review) {
  return review?.verdict_code === "negative";
}

export function buildDecisionChair({ evidence, scores, panel }) {
  const demand = panel.reviewMap.get("demand_analyst");
  const growth = panel.reviewMap.get("growth_analyst");
  const monetization = panel.reviewMap.get("monetization_analyst");
  const competition = panel.reviewMap.get("competition_analyst");
  const evidenceAuditor = panel.reviewMap.get("evidence_auditor");
  const skeptic = panel.reviewMap.get("skeptical_reviewer");

  const reasons = [];
  const disagreements = [];
  const evidenceV3 = evidence.evidence_v3 ?? {
    action_readiness: {
      stage: "observe",
      summary: "当前证据仍需补强。",
      blockers: [],
    },
    evidence_confidence: {
      level: "medium",
      score: 50,
      explanation: [],
    },
    external_evidence_summary: [],
    external_evidence_confidence: {
      level: "low",
      score: 0,
      explanation: "当前未命中外部证据。",
    },
    disconfirming_evidence: [],
    competing_explanations: [],
  };

  const threeCorePositive =
    hasPositive(demand) && hasPositive(growth) && hasPositive(monetization);

  const skepticHighRisk =
    skeptic?.next_action_code === "deprioritize" && skeptic?.confidence_code !== "low";

  const ladder = buildLadderAssessment({
    evidence,
    scores,
    panel,
    evidenceV3,
    skepticHighRisk,
    threeCorePositive,
  });
  const finalRecommendation = ladder.current_recommendation_code;

  if (threeCorePositive) {
    reasons.push("需求、增长、商业化三个核心角色均给出正向结论");
  } else {
    disagreements.push("需求、增长、商业化三项核心判断未同时成立");
  }

  if (evidenceV3.action_readiness.stage) {
    reasons.push(
      `证据结构 V3 当前行动准备度为 ${getRecommendationLabel(evidenceV3.action_readiness.stage)}。`,
    );
  }

  if (evidenceV3.external_evidence_summary.length) {
    reasons.push("已有外部证据与内部信号形成交叉印证。");
  }

  if (hasNegative(evidenceAuditor)) {
    reasons.push("证据审计认为证据不足，动作等级已被压低。");
  }

  if (skepticHighRisk) {
    disagreements.push("反方审稿人认为高风险尚未被充分反驳");
  }

  if (competition?.verdict_code === "negative") {
    disagreements.push("竞争策略分析认为切入窗口有限");
  }
  if (demand?.verdict_code !== growth?.verdict_code) {
    disagreements.push("需求与增长判断存在分歧，需要补更多跟踪数据");
  }

  const actionPlan = compactTextList(
    [
      finalRecommendation === "validate" ? "针对代表应用做 MVP 验证与竞品拆解" : null,
      RECOMMENDATION_ORDER[finalRecommendation] >= RECOMMENDATION_ORDER.research
        ? "补抓代表应用的截图、描述和评论，建立竞品矩阵"
        : null,
      finalRecommendation === "observe" ? "继续观察未来 7 天的榜单走势" : null,
      skepticHighRisk ? "优先验证高风险假设，避免误判短期噪音" : null,
      evidenceAuditor?.verdict_code !== "positive"
        ? "补更多样本证据后再决定是否升级动作"
        : null,
      ...evidenceV3.action_readiness.blockers.map((item) => `先解决：${item}`),
    ],
    5,
  );

  const rationaleSummary = compactTextList(
    [
      ...reasons,
      ...demand.supporting_evidence.slice(0, 2),
      ...growth.supporting_evidence.slice(0, 2),
      ...monetization.supporting_evidence.slice(0, 2),
      ...evidenceV3.evidence_confidence.explanation.slice(0, 2),
      ...evidenceV3.external_evidence_summary.slice(0, 1),
    ],
    6,
  );

  const confidenceCode = confidenceFromScore(
    scores.overall_score * 0.45 +
      (ladder.ladder_signals.evidence_strength ?? 0) * 0.25 +
      (ladder.ladder_signals.trend_strength ?? 0) * 0.15 +
      (ladder.ladder_signals.external_corroboration ?? 0) * 0.15 +
      (evidenceAuditor?.verdict_code === "positive" ? 20 : 0) -
      (skepticHighRisk ? 15 : 0),
  );

  return {
    role_code: "decision_chair",
    role: ROLE_LABELS.decision_chair,
    verdict_code: finalRecommendation === "deprioritize" ? "negative" : "positive",
    verdict:
      VERDICT_LABELS[finalRecommendation === "deprioritize" ? "negative" : "positive"],
    confidence_code: confidenceCode,
    confidence: getConfidenceLabel(confidenceCode),
    final_recommendation: finalRecommendation,
    final_recommendation_label: getRecommendationLabel(finalRecommendation),
    final_confidence_code: confidenceCode,
    final_confidence: getConfidenceLabel(confidenceCode),
    supporting_evidence: rationaleSummary,
    key_risks: compactTextList(
      [
        ...skeptic.key_risks,
        ...evidenceAuditor.key_risks,
      ],
      6,
    ),
    next_action_code: finalRecommendation,
    next_action: getNextActionLabel(finalRecommendation),
    notes: compactTextList(
      [
        `总体分 ${scores.overall_score}`,
        `竞争压力 ${scores.competition_pressure_score}`,
        `证据置信度 ${evidenceV3.evidence_confidence.level_label ?? getConfidenceLabel(evidenceV3.evidence_confidence.level)} (${evidenceV3.evidence_confidence.score})`,
        `外部证据置信度 ${evidenceV3.external_evidence_confidence.level_label ?? getConfidenceLabel(evidenceV3.external_evidence_confidence.level)} (${evidenceV3.external_evidence_confidence.score})`,
      ],
      4,
    ),
    rationale_summary: rationaleSummary,
    disagreement_summary: compactTextList(disagreements, 5),
    action_plan: actionPlan,
    current_recommendation_code: ladder.current_recommendation_code,
    current_recommendation: ladder.current_recommendation,
    recommendation_rationale: ladder.recommendation_rationale,
    unmet_requirements: ladder.unmet_requirements,
    downgrade_risks: ladder.downgrade_risks,
    next_best_action: ladder.next_best_action,
    ladder_signals: ladder.ladder_signals,
  };
}

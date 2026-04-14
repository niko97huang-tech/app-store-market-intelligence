import { clamp } from "./helpers.js";
import { RECOMMENDATION_ORDER } from "./reviewer-rules.js";

export const RECOMMENDATION_LABELS = {
  observe: "继续观察",
  research: "深入研究",
  validate: "快速验证",
  deprioritize: "暂不优先",
};

export const NEXT_ACTION_LABELS = {
  observe: "继续观察",
  research: "深入研究",
  validate: "快速验证",
  deprioritize: "暂不优先",
};

export const LADDER_RULES = {
  observe: {
    label: "继续观察",
    entry_conditions: [
      "存在一定内部证据，但证据强度或交叉印证仍不足以进入研究。",
      "趋势层有信号，但更适合作为监控对象继续跟踪。",
    ],
    downgrade_conditions: [
      "出现更多反证，或证据审计继续判定证据不足。",
      "后续快照显示趋势不能持续，或高位表现明显回落。",
    ],
  },
  research: {
    label: "深入研究",
    entry_conditions: [
      "需求、增长、商业化三项核心判断同时成立。",
      "内部证据达到中高强度，趋势信号较稳，反证压力可控。",
      "执行可行性与差异化空间没有明显击穿。",
    ],
    downgrade_conditions: [
      "外部印证不足且反证压力抬升。",
      "趋势样本不足，导致研究结论仍停留在代理层。",
    ],
  },
  validate: {
    label: "快速验证",
    entry_conditions: [
      "需求、增长、商业化均为正向，且证据强度达到高位。",
      "趋势强度和外部交叉印证都足够强。",
      "反证压力低，执行可行性达到快速验证门槛。",
    ],
    downgrade_conditions: [
      "证据审计转负向，或反方风险未被充分反驳。",
      "外部证据不足、执行门槛不足，或趋势无法持续。",
    ],
  },
  deprioritize: {
    label: "暂不优先",
    entry_conditions: [
      "证据、趋势和商业化信号均偏弱，或反证显著强于正证。",
      "当前更适合保留监控，而不是继续投入研究成本。",
    ],
    downgrade_conditions: [],
  },
};

export function getRecommendationLabel(code) {
  return RECOMMENDATION_LABELS[code] ?? code;
}

export function getNextActionLabel(code) {
  return NEXT_ACTION_LABELS[code] ?? code;
}

function toList(items) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function hasPositive(review) {
  return review?.verdict_code === "positive";
}

function buildSignalSnapshot({ evidence, scores, panel, evidenceV3, skepticHighRisk, threeCorePositive }) {
  const evidenceAuditor = panel.reviewMap.get("evidence_auditor");
  const skeptic = panel.reviewMap.get("skeptical_reviewer");
  const demand = panel.reviewMap.get("demand_analyst");
  const growth = panel.reviewMap.get("growth_analyst");
  const monetization = panel.reviewMap.get("monetization_analyst");

  const evidenceStrength = Math.round(
    clamp(
      (evidenceV3.evidence_confidence?.score ?? 0) * 0.7 +
        (evidence.cross_list_signals.active_brand_count >= 2 ? 10 : 0) +
        ((evidence.app_signals.representative_app_count ?? 0) >= 5 ? 8 : 0),
      0,
      100,
    ),
  );

  const trendStrength = Math.round(
    clamp(
      (evidence.trend_metrics?.trend_strength_score ?? 0) * 0.6 +
        (evidence.trend_metrics?.trend_stability_score ?? 0) * 0.4,
      0,
      100,
    ),
  );

  const externalCorroboration = Math.round(
    clamp(
      (evidenceV3.external_evidence_confidence?.score ?? 0) * 0.8 +
        ((evidenceV3.external_evidence?.length ?? 0) >= 2 ? 12 : 0),
      0,
      100,
    ),
  );

  const counterEvidencePressure = Math.round(
    clamp(
      (toList(evidenceV3.disconfirming_evidence).length * 10) +
        (toList(evidenceV3.competing_explanations).length * 8) +
        (scores.competition_pressure_score ?? 0) * 0.45 +
        (skepticHighRisk ? 18 : 0) +
        (evidenceAuditor?.verdict_code === "negative" ? 22 : 0) +
        (skeptic?.verdict_code === "negative" ? 10 : 0) +
        (evidence.cross_list_signals.active_brand_count <= 1 ? 12 : 0),
      0,
      100,
    ),
  );

  return {
    evidence_strength: evidenceStrength,
    trend_strength: trendStrength,
    external_corroboration: externalCorroboration,
    counter_evidence_pressure: counterEvidencePressure,
    execution_feasibility: scores.execution_feasibility_score ?? 0,
    differentiation_space: scores.differentiation_score ?? 0,
    three_core_positive: threeCorePositive,
    evidence_auditor_negative: evidenceAuditor?.verdict_code === "negative",
    skeptical_high_risk: skepticHighRisk,
    demand_positive: hasPositive(demand),
    growth_positive: hasPositive(growth),
    monetization_positive: hasPositive(monetization),
  };
}

function chooseRecommendation({ evidenceV3, signals }) {
  if (evidenceV3.action_readiness?.stage === "deprioritize") {
    return "deprioritize";
  }

  if (signals.evidence_auditor_negative) {
    return "observe";
  }

  if (
    signals.three_core_positive &&
    signals.evidence_strength >= 80 &&
    signals.trend_strength >= 72 &&
    signals.external_corroboration >= 60 &&
    signals.counter_evidence_pressure < 42 &&
    signals.execution_feasibility >= 62 &&
    !signals.skeptical_high_risk
  ) {
    return "validate";
  }

  if (
    signals.three_core_positive &&
    signals.evidence_strength >= 62 &&
    signals.trend_strength >= 56 &&
    signals.counter_evidence_pressure < 58 &&
    signals.execution_feasibility >= 48
  ) {
    return "research";
  }

  if (
    signals.evidence_strength >= 45 ||
    signals.trend_strength >= 45 ||
    evidenceV3.action_readiness?.stage === "observe"
  ) {
    return "observe";
  }

  return "deprioritize";
}

function buildRationale(recommendationCode, signals) {
  if (recommendationCode === "validate") {
    return [
      "当前满足快速验证门槛，建议用小步试验验证需求和商业化。",
      `证据强度 ${signals.evidence_strength}、趋势强度 ${signals.trend_strength}、外部印证 ${signals.external_corroboration} 均达到较高水平。`,
    ];
  }
  if (recommendationCode === "research") {
    return [
      "当前更适合先做结构化研究，再决定是否进入快速验证。",
      `证据强度 ${signals.evidence_strength}、趋势强度 ${signals.trend_strength} 已达到研究门槛，但仍需继续补强外部印证。`,
    ];
  }
  if (recommendationCode === "observe") {
    return [
      "当前证据适合继续跟踪，不宜直接升级动作。",
      `反证压力 ${signals.counter_evidence_pressure} 或外部印证 ${signals.external_corroboration} 仍限制了动作升级。`,
    ];
  }
  return [
    "当前反证与证据缺口偏多，暂不建议优先推进。",
    `证据强度 ${signals.evidence_strength} 与趋势强度 ${signals.trend_strength} 都不足以支撑进一步投入。`,
  ];
}

function buildUnmetRequirements(recommendationCode, signals, evidenceV3) {
  const unmet = [];

  if (!signals.three_core_positive) {
    unmet.push("需求、增长、商业化三项核心判断尚未同时成立");
  }
  if (signals.evidence_strength < 62 && RECOMMENDATION_ORDER[recommendationCode] >= RECOMMENDATION_ORDER.research) {
    unmet.push("内部证据强度仍不足以支撑深入研究");
  }
  if (signals.evidence_strength < 80 && recommendationCode === "validate") {
    unmet.push("内部证据强度尚未达到快速验证门槛");
  }
  if (signals.trend_strength < 56 && RECOMMENDATION_ORDER[recommendationCode] >= RECOMMENDATION_ORDER.research) {
    unmet.push("趋势强度不足，仍需更多连续快照确认");
  }
  if (signals.external_corroboration < 60 && recommendationCode === "validate") {
    unmet.push("缺少足够强的外部交叉印证");
  }
  if (signals.execution_feasibility < 62 && recommendationCode === "validate") {
    unmet.push("执行可行性尚未达到快速验证门槛");
  }
  if ((evidenceV3.action_readiness?.blockers ?? []).length) {
    unmet.push(...evidenceV3.action_readiness.blockers);
  }

  return [...new Set(unmet)].slice(0, 6);
}

function buildDowngradeRisks(signals, evidence, panel, evidenceV3) {
  const risks = [];
  if (signals.counter_evidence_pressure >= 58) {
    risks.push("当前反证压力偏高，动作等级容易被压回观察层");
  }
  if (signals.skeptical_high_risk) {
    risks.push("反方审稿仍认为高风险假设尚未被充分反驳");
  }
  if (signals.evidence_auditor_negative) {
    risks.push("证据审计认为当前证据不足，升级动作存在误判风险");
  }
  if ((evidence.trend_metrics?.active_run_count ?? 0) < 3) {
    risks.push("趋势样本不足，结论容易被短期噪音干扰");
  }
  if (evidence.cross_list_signals.active_brand_count <= 1) {
    risks.push("当前更多来自单榜单信号，容易高估赛道强度");
  }
  if (toList(evidenceV3.disconfirming_evidence).length) {
    risks.push(...toList(evidenceV3.disconfirming_evidence).slice(0, 2));
  }
  if (panel.reviewMap.get("competition_analyst")?.verdict_code === "negative") {
    risks.push("竞争压力较强，切入窗口可能继续收窄");
  }
  return [...new Set(risks)].slice(0, 6);
}

function buildNextBestAction(recommendationCode, signals) {
  if (recommendationCode === "validate") {
    return "围绕代表应用做小范围 MVP 验证，并验证关键转化假设";
  }
  if (recommendationCode === "research") {
    return "建立竞品矩阵，补抓截图、描述、评论与外部证据";
  }
  if (recommendationCode === "observe") {
    return signals.external_corroboration > 0
      ? "继续观察未来 7 天走势，并核实外部证据是否持续出现"
      : "继续观察未来 7 天走势并补外部证据";
  }
  return "保留监控，暂不投入更多研究成本";
}

export function buildLadderAssessment({
  recommendationCode,
  evidence,
  scores,
  panel,
  evidenceV3,
  skepticHighRisk,
  threeCorePositive,
}) {
  const signals = buildSignalSnapshot({
    evidence,
    scores,
    panel,
    evidenceV3,
    skepticHighRisk,
    threeCorePositive,
  });

  const chosenRecommendation = chooseRecommendation({ evidenceV3, signals });
  const finalRecommendation = recommendationCode
    ? minRecommendation(recommendationCode, chosenRecommendation)
    : chosenRecommendation;

  return {
    current_recommendation_code: finalRecommendation,
    current_recommendation: getRecommendationLabel(finalRecommendation),
    recommendation_rationale: buildRationale(finalRecommendation, signals),
    unmet_requirements: buildUnmetRequirements(finalRecommendation, signals, evidenceV3),
    downgrade_risks: buildDowngradeRisks(signals, evidence, panel, evidenceV3),
    next_best_action: buildNextBestAction(finalRecommendation, signals),
    ladder_signals: signals,
  };
}

export function minRecommendation(current, limit) {
  return RECOMMENDATION_ORDER[current] > RECOMMENDATION_ORDER[limit]
    ? limit
    : current;
}

import { EXECUTION_GENRE_HINTS, MONETIZATION_BRAND_HINTS } from "./reviewer-rules.js";
import {
  clamp,
  confidenceFromScore,
  round,
  safeDivide,
  toNumber,
} from "./helpers.js";

function scoreGrowth(evidence) {
  const rankSignals = evidence.rank_signals;
  const normalizedNew = clamp(rankSignals.new_count / 18, 0, 1);
  const normalizedRisers = clamp(
    rankSignals.top20_risers_count / 6 + rankSignals.top50_risers_count / 14,
    0,
    1,
  );
  const deltaSignal = clamp(rankSignals.avg_positive_rank_delta / 70, 0, 1);
  const breadthSignal = clamp(rankSignals.breadth_ratio / 0.85, 0, 1);

  const score =
    normalizedNew * 28 +
    normalizedRisers * 30 +
    deltaSignal * 20 +
    breadthSignal * 22;

  return {
    score: round(score),
    explanation: [
      `新进榜信号 ${rankSignals.new_count} 个`,
      `Top20/Top50 上升信号 ${rankSignals.top20_risers_count}/${rankSignals.top50_risers_count}`,
      `平均正向排名改善 ${rankSignals.avg_positive_rank_delta}`,
      `波动广度比 ${round(rankSignals.breadth_ratio * 100)}%`,
    ],
  };
}

function scorePersistence(evidence) {
  const crossList = evidence.cross_list_signals;
  const appSignals = evidence.app_signals;
  const trendWindow = evidence.trend_metrics?.current_window;
  const trendStrength = clamp(
    (evidence.trend_metrics?.trend_strength_score ?? 0) / 100,
    0,
    1,
  );
  const trendStability = clamp(
    (evidence.trend_metrics?.trend_stability_score ?? 0) / 100,
    0,
    1,
  );
  const multiBrandSignal = clamp(crossList.active_brand_count / 3, 0, 1);
  const breadthSignal = clamp(evidence.rank_signals.changed_count / 140, 0, 1);
  const updateExplainabilitySignal = clamp(
    appSignals.recent_version_update_ratio / 0.5,
    0,
    1,
  );
  const representativeBreadth = clamp(
    appSignals.representative_app_count / 6,
    0,
    1,
  );
  const trendPresenceSignal = clamp(
    (evidence.trend_metrics?.active_run_count ?? 0) / 4,
    0,
    1,
  );
  const turnoverPenalty = clamp(
    trendWindow?.top20_turnover_ratio ?? 0.5,
    0,
    1,
  );

  const score =
    multiBrandSignal * 12 +
    breadthSignal * 10 +
    updateExplainabilitySignal * 8 +
    representativeBreadth * 10 +
    trendPresenceSignal * 10 +
    trendStrength * 24 +
    trendStability * 26 -
    turnoverPenalty * 8;

  return {
    score: round(clamp(score, 0, 100)),
    explanation: [
      `跨榜联动品牌数 ${crossList.active_brand_count}`,
      `发生变化的样本广度 ${evidence.rank_signals.changed_count}`,
      `近期版本更新解释比 ${round(appSignals.recent_version_update_ratio * 100)}%`,
      `代表应用覆盖 ${appSignals.representative_app_count} 个`,
      trendWindow
        ? `趋势窗口样本 ${evidence.trend_metrics?.active_run_count ?? 0} 次`
        : "趋势窗口样本不足",
      trendWindow
        ? `趋势强度 ${evidence.trend_metrics?.trend_strength_score ?? 0}`
        : null,
      trendWindow
        ? `趋势稳定性 ${evidence.trend_metrics?.trend_stability_score ?? 0}`
        : null,
      trendWindow
        ? `Top20 换手率 ${round((trendWindow.top20_turnover_ratio ?? 0) * 100)}%`
        : null,
    ],
  };
}

function scoreCompetition(evidence) {
  const competitionSignals = evidence.competition_signals;
  const entrantEase = clamp(
    competitionSignals.high_rank_newcomer_count / 4,
    0,
    1,
  );
  const concentrationRelief = 1 - clamp(competitionSignals.top_genre_ratio, 0, 1);
  const namingRelief = clamp(
    1 - competitionSignals.name_token_top_ratio * 1.8,
    0,
    1,
  );
  const ratingRelief = clamp(
    1 - Math.log10(competitionSignals.representative_rating_total + 1) / 8,
    0,
    1,
  );

  const score =
    entrantEase * 34 +
    concentrationRelief * 28 +
    namingRelief * 18 +
    ratingRelief * 20;

  return {
    score: round(score),
    pressure_score: round(100 - score),
    explanation: [
      `高位新进入者 ${competitionSignals.high_rank_newcomer_count} 个`,
      `头部类型集中度 ${round(competitionSignals.top_genre_ratio * 100)}%`,
      `名称集中 token 比例 ${round(competitionSignals.name_token_top_ratio * 100)}%`,
      `代表应用总评分数 ${competitionSignals.representative_rating_total}`,
    ],
  };
}

function scoreMonetization(evidence) {
  const monetization = evidence.monetization_signals;
  const baseBrandScore = MONETIZATION_BRAND_HINTS[evidence.brand] ?? 50;
  const resonanceSignal = clamp(
    monetization.grossing_or_paid_resonance_count / 2,
    0,
    1,
  );
  const demandSignal = clamp(
    Math.log10(monetization.top10_avg_rating_count + 1) / 6,
    0,
    1,
  );
  const score = clamp(
    baseBrandScore * 0.45 + resonanceSignal * 28 + demandSignal * 32,
    0,
    100,
  );

  return {
    score: round(score),
    explanation: [
      `榜单类型基准 ${baseBrandScore}`,
      `付费/畅销联动数 ${monetization.grossing_or_paid_resonance_count}`,
      `Top10 平均评分人数 ${monetization.top10_avg_rating_count}`,
    ],
  };
}

function scoreExecutionFeasibility(evidence) {
  const genreBase = EXECUTION_GENRE_HINTS[evidence.top_genre] ?? 58;
  const concentrationPenalty = clamp(evidence.top_genre_ratio, 0, 1) * 12;
  const samplePenalty = evidence.app_signals.representative_app_count < 3 ? 8 : 0;
  const score = clamp(genreBase - concentrationPenalty - samplePenalty, 0, 100);

  return {
    score: round(score),
    explanation: [
      `类型基准 ${genreBase}`,
      `集中度扣分 ${round(concentrationPenalty)}`,
      `样本数量扣分 ${samplePenalty}`,
    ],
  };
}

function scoreDifferentiation(evidence) {
  const nameSignal = clamp(
    evidence.app_signals.app_name_token_signal.unique_token_ratio * 2.2,
    0,
    1,
  );
  const concentrationRelief = 1 - clamp(evidence.top_genre_ratio, 0, 1);
  const entrantRelief = clamp(
    safeDivide(evidence.rank_signals.top20_entrant_count, 3),
    0,
    1,
  );
  const score =
    nameSignal * 34 + concentrationRelief * 32 + entrantRelief * 34;

  return {
    score: round(score),
    explanation: [
      `名称差异化信号 ${round(nameSignal * 100)}%`,
      `头部类型去集中化 ${round(concentrationRelief * 100)}%`,
      `高位新进入者 ${evidence.rank_signals.top20_entrant_count} 个`,
    ],
  };
}

export function scoreEvidencePack(evidence) {
  const growth = scoreGrowth(evidence);
  const persistence = scorePersistence(evidence);
  const competition = scoreCompetition(evidence);
  const monetization = scoreMonetization(evidence);
  const execution = scoreExecutionFeasibility(evidence);
  const differentiation = scoreDifferentiation(evidence);

  const overall =
    growth.score * 0.24 +
    persistence.score * 0.18 +
    competition.score * 0.16 +
    monetization.score * 0.2 +
    execution.score * 0.1 +
    differentiation.score * 0.12;

  return {
    growth_score: growth.score,
    persistence_score: persistence.score,
    competition_score: competition.score,
    competition_pressure_score: competition.pressure_score,
    monetization_score: monetization.score,
    execution_feasibility_score: execution.score,
    differentiation_score: differentiation.score,
    overall_score: round(overall),
    confidence: confidenceFromScore(overall),
    score_breakdown_explanation: {
      growth: growth.explanation,
      persistence: persistence.explanation,
      competition: competition.explanation,
      monetization: monetization.explanation,
      execution_feasibility: execution.explanation,
      differentiation: differentiation.explanation,
    },
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { scoreEvidencePack } from "../src/analysis/scoring.js";
import { buildDecisionChair } from "../src/analysis/decision-chair.js";
import { buildExportTables } from "../src/analysis/export-tables.js";
import { matchExternalEvidenceForEvidence } from "../src/analysis/external-evidence/index.js";
import { runPanelReview } from "../src/analysis/panel-review.js";

function makeEvidence(overrides = {}) {
  return {
    opportunity_name: "测试赛道 / 畅销榜",
    list_type: "畅销榜",
    brand: "grossing",
    top_genre: "Health & Fitness",
    top_genre_ratio: 0.42,
    rank_signals: {
      new_count: 12,
      dropped_count: 8,
      changed_count: 96,
      improved_count: 44,
      declined_count: 52,
      unchanged_count: 30,
      avg_positive_rank_delta: 36,
      top20_risers_count: 3,
      top50_risers_count: 7,
      top20_entrant_count: 2,
      breadth_ratio: 0.54,
      ...overrides.rank_signals,
    },
    app_signals: {
      representative_app_count: 6,
      representative_apps: [],
      changed_app_count: 5,
      changed_field_count: 4,
      version_refresh_count: 3,
      rating_signal_avg: 1800,
      recent_version_update_count: 3,
      recent_version_update_ratio: 0.5,
      price_points: ["0", "68"],
      app_name_token_signal: {
        unique_token_ratio: 0.48,
        top_token: "test",
        top_token_ratio: 0.12,
      },
      ...overrides.app_signals,
    },
    monetization_signals: {
      top10_avg_rating_count: 180000,
      top10_total_rating_count: 1800000,
      grossing_peer_score: 84,
      paid_peer_score: 66,
      category_has_grossing_presence: true,
      category_has_paid_presence: true,
      grossing_or_paid_resonance_count: 2,
      ...overrides.monetization_signals,
    },
    competition_signals: {
      top_genre_ratio: 0.42,
      name_token_top_ratio: 0.12,
      name_token_top: "test",
      new_to_changed_ratio: 0.2,
      high_rank_newcomer_count: 2,
      representative_rating_total: 480000,
      ...overrides.competition_signals,
    },
    cross_list_signals: {
      category_brand_count: 3,
      active_brand_count: 3,
      cross_brand_signals: [],
      ...overrides.cross_list_signals,
    },
    trend_metrics: {
      active_run_count: 4,
      trend_pattern: "clustered_growth",
      trend_strength_score: 74,
      trend_stability_score: 62,
      multi_list_resonance_ratio: 0.67,
      current_window: {
        active_run_count: 4,
        repeated_top10_ratio: 0.4,
        repeated_top20_ratio: 0.55,
        repeated_top50_ratio: 0.7,
        top20_turnover_ratio: 0.24,
        momentum_app_count: 4,
        sustained_growth_app_count: 2,
        longest_improvement_streak: 2,
        top10_presence_days: 5,
        top20_presence_days: 8,
        top50_presence_days: 12,
      },
      ...overrides.trend_metrics,
    },
    trend_summary: {
      trend_verdict: "strengthening",
      trend_pattern: "clustered_growth",
      trend_strength: 74,
      trend_stability: 62,
      trend_evidence: ["近 4 次快照中持续出现", "窗口内有 4 个应用净上升"],
      trend_risks: [],
      ...overrides.trend_summary,
    },
    product_tags: ["工具", "订阅型"],
    likely_drivers: ["证据支持：多个代表应用近期有版本更新，增长可能与版本迭代同步"],
    monetization_model_hint: "偏订阅/内购驱动，可优先拆解持续付费点和高频使用场景",
    evidence_gaps: ["仍缺少跨榜单共振证据"],
    evidence_v3: {
      observations: ["新进榜 12 个", "发生排名变化 96 个"],
      supporting_evidence: ["近 4 次快照中持续出现", "Top20 上升 3 个"],
      competing_explanations: ["变化可能主要集中在单榜单，而不是跨榜单共振。"],
      disconfirming_evidence: ["趋势样本仅 2 次快照"],
      action_readiness: {
        stage: "observe",
        summary: "当前已有部分证据，但更适合继续观察。",
        rationale: ["多次快照下呈现持续增强迹象"],
        blockers: ["当前主要来自单榜单信号"],
      },
      evidence_gaps: ["仍缺少跨榜单共振证据"],
      evidence_confidence: {
        level: "medium",
        score: 58,
        explanation: ["代表应用 6 个", "变化样本 96 个"],
      },
      external_evidence: [],
      external_evidence_summary: [],
      external_evidence_confidence: {
        level: "low",
        score: 0,
        explanation: "当前未命中外部证据，系统已降级为仅依赖内部证据运行。",
      },
      attribution_summary: {
        supported_factors: ["多个代表应用近期有版本更新，增长可能与版本迭代同步"],
        tentative_factors: ["变化可能主要集中在单榜单，而不是跨榜单共振。"],
        caution: "当前归因仍主要基于内部证据、应用元数据和趋势代理信号，尚未接入外部证据层。",
      },
    },
    derived_notes: {
      why_now_candidates: ["新进榜数量较多", "多次快照下呈现持续增强迹象"],
      risk_candidates: ["榜单 churn 偏高，可能存在短期噪音"],
      ...overrides.derived_notes,
    },
    evidence_pack: {
      rank_signal_summary: ["新进榜 12 个", "发生排名变化 96 个"],
      app_signal_summary: ["代表应用 6 个", "近 30 天内版本更新 3 个"],
      trend_summary: ["近 4 次快照中持续出现", "窗口内有 4 个应用净上升"],
      cross_list_summary: ["畅销榜: 变化 40, 新进榜 4, 掉榜 3"],
      ...overrides.evidence_pack,
    },
    ...overrides,
  };
}

function makeReview(role, verdict, nextAction, confidence = "medium") {
  const roleLabels = {
    demand_analyst: "需求分析师",
    growth_analyst: "增长分析师",
    monetization_analyst: "商业化分析师",
    competition_analyst: "竞争策略分析师",
    evidence_auditor: "证据审计员",
    skeptical_reviewer: "反方审稿人",
  };
  const verdictLabels = {
    positive: "正向",
    mixed: "中性",
    negative: "负向",
  };
  const nextActionLabels = {
    observe: "继续观察",
    research: "深入研究",
    validate: "快速验证",
    deprioritize: "暂不优先",
  };
  return {
    role_code: role,
    role: roleLabels[role] ?? role,
    verdict_code: verdict,
    verdict: verdictLabels[verdict] ?? verdict,
    next_action_code: nextAction,
    next_action: nextActionLabels[nextAction] ?? nextAction,
    confidence_code: confidence,
    confidence: confidence === "high" ? "高" : confidence === "low" ? "低" : "中",
    supporting_evidence: [`${role} evidence`],
    key_risks: verdict === "negative" ? [`${role} risk`] : [],
    notes: [],
  };
}

test("persistence score consumes trend signals", () => {
  const strongTrend = scoreEvidencePack(makeEvidence());
  const weakTrend = scoreEvidencePack(
    makeEvidence({
      trend_metrics: {
        active_run_count: 2,
        trend_pattern: "short_term_heat",
        trend_strength_score: 18,
        trend_stability_score: 12,
        current_window: {
          repeated_top10_ratio: 0,
          repeated_top20_ratio: 0.1,
          repeated_top50_ratio: 0.12,
          top20_turnover_ratio: 0.78,
          momentum_app_count: 0,
          sustained_growth_app_count: 0,
          longest_improvement_streak: 0,
          top10_presence_days: 0,
          top20_presence_days: 1,
          top50_presence_days: 2,
        },
      },
      trend_summary: {
        trend_verdict: "short_term_heat",
        trend_pattern: "short_term_heat",
        trend_strength: 18,
        trend_stability: 12,
        trend_evidence: [],
        trend_risks: ["高位换手偏高，趋势稳定性不足"],
      },
    }),
  );

  assert.ok(
    strongTrend.persistence_score > weakTrend.persistence_score,
    "strong trend evidence should increase persistence_score",
  );
});

test("decision chair caps recommendation when evidence is insufficient", () => {
  const reviews = [
    makeReview("demand_analyst", "positive", "research", "high"),
    makeReview("growth_analyst", "positive", "research", "high"),
    makeReview("monetization_analyst", "positive", "research", "high"),
    makeReview("competition_analyst", "positive", "research", "medium"),
    makeReview("evidence_auditor", "negative", "observe", "medium"),
    makeReview("skeptical_reviewer", "positive", "research", "low"),
  ];
  const panel = {
    reviews,
    reviewMap: new Map(reviews.map((review) => [review.role_code, review])),
  };

  const decision = buildDecisionChair({
    evidence: makeEvidence(),
    scores: {
      overall_score: 84,
      execution_feasibility_score: 72,
      competition_pressure_score: 28,
    },
    panel,
  });

  assert.equal(decision.final_recommendation, "observe");
  assert.ok(
    decision.rationale_summary.some((item) => item.includes("证据审计认为证据不足")),
  );
});

test("export tables include trend columns and final decisions", () => {
  const analysisDoc = {
    executive_summary: {
      top_opportunities: [
        {
          opportunity_name: "测试赛道 / 畅销榜",
          one_line_conclusion: "值得继续研究",
          recommendation: "深入研究",
          confidence: "medium",
          reason_summary: ["增长和趋势都较强"],
          risk_summary: ["竞争仍需验证"],
        },
      ],
    },
    negative_findings: [],
    next_step_actions: [
      {
        opportunity_name: "测试赛道 / 畅销榜",
        recommendation: "深入研究",
        action: "建立竞品矩阵",
        reason: ["增长和趋势都较强"],
      },
    ],
    category_opportunities: [],
    recommended_tracks: [],
    new_entrant_ideas: [],
    fast_risers: [],
    app_watchlist: [],
    opportunity_decision_cards: [
      {
        opportunity_name: "测试赛道 / 畅销榜",
        category_name: "测试赛道",
        list_type: "畅销榜",
        recommendation: "深入研究",
        recommendation_code: "research",
        confidence: "medium",
        trend_verdict: "strengthening",
        trend_pattern: "clustered_growth",
        trend_strength: 74,
        trend_stability: 62,
        product_tags: ["工具", "订阅型"],
        likely_drivers: ["证据支持：多个代表应用近期有版本更新，增长可能与版本迭代同步"],
        monetization_model_hint: "偏订阅/内购驱动，可优先拆解持续付费点和高频使用场景",
        observations: ["新进榜 12 个", "发生排名变化 96 个"],
        evidence_gaps: ["仍缺少跨榜单共振证据"],
        competing_explanations: ["变化可能主要集中在单榜单，而不是跨榜单共振。"],
        disconfirming_evidence: ["趋势样本仅 2 次快照"],
        action_readiness: {
          stage: "observe",
          summary: "当前已有部分证据，但更适合继续观察。",
          blockers: ["当前主要来自单榜单信号"],
        },
        evidence_confidence: {
          level: "medium",
          score: 58,
          explanation: ["代表应用 6 个", "变化样本 96 个"],
        },
        external_evidence: [],
        external_evidence_summary: [],
        external_evidence_confidence: {
          level: "low",
          score: 0,
          explanation: "当前未命中外部证据，系统已降级为仅依赖内部证据运行。",
        },
        attribution_summary: {
          supported_factors: ["多个代表应用近期有版本更新，增长可能与版本迭代同步"],
          tentative_factors: ["变化可能主要集中在单榜单，而不是跨榜单共振。"],
          caution: "当前归因仍主要基于内部证据、应用元数据和趋势代理信号，尚未接入外部证据层。",
        },
        trend_evidence: ["近 4 次快照中持续出现"],
        why_now: ["多次快照下呈现持续增强迹象"],
        supporting_evidence: ["新进榜 12 个"],
        monetization_hint: "同分类在畅销榜存在表现",
        competition_hint: "仍存在细分切入口",
        execution_hint: "适合先研究再决定",
        key_risks: ["竞争仍需验证"],
        disagreement_summary: [],
        rationale_summary: ["增长和趋势都较强"],
        recommendation_rationale: ["当前更适合先做结构化研究，再决定是否进入快速验证。"],
        unmet_requirements: ["缺少足够强的外部交叉印证"],
        downgrade_risks: ["当前反证压力偏高，动作等级容易被压回观察层"],
        next_best_action: "建立竞品矩阵，补抓截图、描述、评论与外部证据",
        ladder_signals: {
          evidence_strength: 72,
          trend_strength: 74,
          external_corroboration: 18,
          counter_evidence_pressure: 36,
          execution_feasibility: 58,
          differentiation_space: 60,
        },
        action_plan: ["建立竞品矩阵"],
        score_breakdown: {
          growth_score: 70,
          persistence_score: 68,
          competition_score: 62,
          competition_pressure_score: 38,
          monetization_score: 73,
          execution_feasibility_score: 58,
          differentiation_score: 60,
          overall_score: 66,
        },
        score_breakdown_explanation_summary: ["增长 70", "持续性代理 68"],
        trend_metrics: {
          active_run_count: 4,
          multi_list_resonance_ratio: 0.67,
          current_window: {
            momentum_app_count: 4,
            sustained_growth_app_count: 2,
            top10_presence_days: 5,
            top20_presence_days: 8,
            top50_presence_days: 12,
          },
        },
        panel_reviews: [
          {
            role_code: "decision_chair",
            role: "最终仲裁官",
            verdict_code: "positive",
            verdict: "正向",
            confidence: "medium",
            supporting_evidence: ["增长和趋势都较强"],
            key_risks: ["竞争仍需验证"],
            next_action_code: "research",
            next_action: "深入研究",
            notes: [],
          },
        ],
      },
    ],
  };

  const opportunityDoc = {
    opportunities: [
      {
        opportunity_name: "测试赛道 / 畅销榜",
        recommendation: "深入研究",
        confidence: "medium",
        representative_apps: [{ app_name: "App A" }],
        action_plan: ["建立竞品矩阵"],
      },
    ],
  };

  const tables = buildExportTables(analysisDoc, opportunityDoc);
  assert.equal(tables.opportunity_decision_cards[0].trend_verdict, "strengthening");
  assert.equal(tables.opportunity_decision_cards[0].trend_pattern, "clustered_growth");
  assert.equal(tables.opportunity_decision_cards[0].product_tags, "工具 | 订阅型");
  assert.equal(tables.opportunity_decision_cards[0].observations, "新进榜 12 个 | 发生排名变化 96 个");
  assert.equal(tables.opportunity_decision_cards[0].action_readiness_stage, "observe");
  assert.equal(tables.opportunity_decision_cards[0].external_evidence_confidence_level, "low");
  assert.equal(tables.score_breakdown[0].trend_active_run_count, 4);
  assert.equal(tables.score_breakdown[0].trend_strength_score, 74);
  assert.equal(tables.final_decisions[0].final_recommendation, "深入研究");
  assert.equal(tables.final_decisions[0].final_recommendation_code, "research");
  assert.equal(tables.final_decisions[0].ladder_evidence_strength, 72);
  assert.equal(tables.opportunity_decision_cards[0].ladder_trend_strength, 74);
});

test("external evidence layer degrades gracefully when no records match", () => {
  const external = matchExternalEvidenceForEvidence(makeEvidence(), {
    provider_status: [{ provider: "sample-json", status: "ok", loaded_count: 0 }],
    records: [],
  });

  assert.equal(external.external_evidence.length, 0);
  assert.equal(external.external_evidence_confidence.level, "low");
  assert.match(external.external_evidence_confidence.explanation, /降级/);
});

test("evidence auditor becomes negative when evidence breadth is too weak", () => {
  const evidence = makeEvidence({
    app_signals: {
      representative_app_count: 1,
      changed_field_count: 0,
      price_points: [],
      app_name_token_signal: {
        unique_token_ratio: 0.1,
        top_token: "test",
        top_token_ratio: 0.4,
      },
    },
    rank_signals: {
      changed_count: 8,
    },
    cross_list_signals: {
      active_brand_count: 1,
    },
    trend_metrics: {
      active_run_count: 1,
      trend_pattern: "short_term_heat",
      trend_strength_score: 12,
      trend_stability_score: 8,
      current_window: {
        repeated_top10_ratio: 0,
        repeated_top20_ratio: 0,
        repeated_top50_ratio: 0,
        top20_turnover_ratio: 0.9,
        momentum_app_count: 0,
        sustained_growth_app_count: 0,
        longest_improvement_streak: 0,
        top10_presence_days: 0,
        top20_presence_days: 0,
        top50_presence_days: 0,
      },
    },
  });
  const scores = scoreEvidencePack(evidence);
  const panel = runPanelReview({ evidence, scores });
  const auditor = panel.reviewMap.get("evidence_auditor");

  assert.equal(auditor.verdict, "负向");
  assert.equal(auditor.verdict_code, "negative");
  assert.equal(auditor.next_action, "暂不优先");
  assert.equal(auditor.next_action_code, "deprioritize");
});

test("skeptical reviewer deprioritizes when pressure is high and monetization is weak", () => {
  const evidence = makeEvidence({
    monetization_signals: {
      top10_avg_rating_count: 0,
      grossing_or_paid_resonance_count: 0,
      category_has_grossing_presence: false,
    },
    competition_signals: {
      top_genre_ratio: 0.92,
      name_token_top_ratio: 0.35,
      high_rank_newcomer_count: 0,
      representative_rating_total: 9000000,
    },
    rank_signals: {
      top20_entrant_count: 0,
      new_count: 10,
    },
    trend_metrics: {
      active_run_count: 2,
      trend_pattern: "single_point_spike",
      trend_strength_score: 46,
      trend_stability_score: 18,
      current_window: {
        repeated_top10_ratio: 0.05,
        repeated_top20_ratio: 0.08,
        repeated_top50_ratio: 0.12,
        top20_turnover_ratio: 0.86,
        momentum_app_count: 0,
        sustained_growth_app_count: 0,
        longest_improvement_streak: 0,
        top10_presence_days: 1,
        top20_presence_days: 1,
        top50_presence_days: 2,
      },
    },
    trend_summary: {
      trend_verdict: "strong_but_fragile",
      trend_pattern: "single_point_spike",
      trend_strength: 46,
      trend_stability: 18,
      trend_evidence: [],
      trend_risks: ["高位换手偏高，趋势稳定性不足"],
    },
  });
  const scores = scoreEvidencePack(evidence);
  const panel = runPanelReview({ evidence, scores });
  const skeptic = panel.reviewMap.get("skeptical_reviewer");

  assert.equal(skeptic.next_action, "暂不优先");
  assert.equal(skeptic.next_action_code, "deprioritize");
  assert.equal(skeptic.verdict, "负向");
  assert.equal(skeptic.verdict_code, "negative");
});

test("trend signals distinguish strong but fragile from weak but stable", () => {
  const strongFragile = makeEvidence({
    trend_metrics: {
      active_run_count: 4,
      trend_pattern: "single_point_spike",
      trend_strength_score: 78,
      trend_stability_score: 28,
      current_window: {
        repeated_top10_ratio: 0.1,
        repeated_top20_ratio: 0.18,
        repeated_top50_ratio: 0.3,
        top20_turnover_ratio: 0.72,
        momentum_app_count: 4,
        sustained_growth_app_count: 1,
        longest_improvement_streak: 3,
        top10_presence_days: 3,
        top20_presence_days: 4,
        top50_presence_days: 6,
      },
    },
    trend_summary: {
      trend_verdict: "strong_but_fragile",
      trend_pattern: "single_point_spike",
      trend_strength: 78,
      trend_stability: 28,
    },
  });
  const weakStable = makeEvidence({
    trend_metrics: {
      active_run_count: 4,
      trend_pattern: "stable_compounding",
      trend_strength_score: 34,
      trend_stability_score: 71,
      current_window: {
        repeated_top10_ratio: 0.36,
        repeated_top20_ratio: 0.58,
        repeated_top50_ratio: 0.78,
        top20_turnover_ratio: 0.18,
        momentum_app_count: 1,
        sustained_growth_app_count: 1,
        longest_improvement_streak: 1,
        top10_presence_days: 4,
        top20_presence_days: 9,
        top50_presence_days: 14,
      },
    },
    trend_summary: {
      trend_verdict: "weak_but_stable",
      trend_pattern: "stable_compounding",
      trend_strength: 34,
      trend_stability: 71,
    },
  });

  const strongFragileScore = scoreEvidencePack(strongFragile);
  const weakStableScore = scoreEvidencePack(weakStable);

  assert.ok(strongFragileScore.persistence_score > 0);
  assert.ok(weakStableScore.persistence_score > 0);
  assert.notEqual(strongFragile.trend_summary.trend_verdict, weakStable.trend_summary.trend_verdict);
});

test("decision chair upgrades to validate only when ladder thresholds are satisfied", () => {
  const baselineEvidence = makeEvidence();
  const evidence = makeEvidence({
    app_signals: {
      representative_app_count: 8,
    },
    cross_list_signals: {
      active_brand_count: 3,
    },
    trend_metrics: {
      active_run_count: 5,
      trend_pattern: "clustered_growth",
      trend_strength_score: 84,
      trend_stability_score: 76,
      current_window: {
        repeated_top10_ratio: 0.5,
        repeated_top20_ratio: 0.72,
        repeated_top50_ratio: 0.84,
        top20_turnover_ratio: 0.18,
        momentum_app_count: 5,
        sustained_growth_app_count: 4,
        longest_improvement_streak: 3,
        top10_presence_days: 8,
        top20_presence_days: 11,
        top50_presence_days: 14,
      },
    },
    trend_summary: {
      trend_verdict: "strengthening",
      trend_pattern: "clustered_growth",
      trend_strength: 84,
      trend_stability: 76,
      trend_evidence: ["高位稳定天数较高", "多个代表应用持续改善"],
      trend_risks: [],
    },
    evidence_v3: {
      ...baselineEvidence.evidence_v3,
      evidence_confidence: {
        level: "high",
        score: 92,
        explanation: ["内部证据覆盖较广", "多项信号互相支持"],
      },
      external_evidence: [{ title: "样例外部证据 A" }, { title: "样例外部证据 B" }],
      external_evidence_summary: ["两条外部证据与内部趋势形成交叉印证"],
      external_evidence_confidence: {
        level: "high",
        score: 88,
        explanation: "外部证据与内部信号一致。",
      },
      disconfirming_evidence: [],
      competing_explanations: [],
      action_readiness: {
        stage: "research",
        summary: "内部外部证据都较强，可考虑进入验证。",
        rationale: ["趋势和证据强度都达到较高水平"],
        blockers: [],
      },
    },
  });
  const reviews = [
    makeReview("demand_analyst", "positive", "validate", "high"),
    makeReview("growth_analyst", "positive", "validate", "high"),
    makeReview("monetization_analyst", "positive", "validate", "high"),
    makeReview("competition_analyst", "positive", "research", "medium"),
    makeReview("evidence_auditor", "positive", "research", "high"),
    makeReview("skeptical_reviewer", "mixed", "research", "low"),
  ];
  const panel = {
    reviews,
    reviewMap: new Map(reviews.map((review) => [review.role_code, review])),
  };

  const decision = buildDecisionChair({
    evidence,
    scores: {
      overall_score: 86,
      execution_feasibility_score: 74,
      competition_pressure_score: 26,
    },
    panel,
  });

  assert.equal(decision.final_recommendation, "validate");
  assert.equal(decision.current_recommendation_code, "validate");
  assert.ok((decision.ladder_signals?.external_corroboration ?? 0) >= 60);
});

test("skeptical high-risk review blocks validate and keeps recommendation at research", () => {
  const baselineEvidence = makeEvidence();
  const evidence = makeEvidence({
    app_signals: {
      representative_app_count: 8,
    },
    cross_list_signals: {
      active_brand_count: 3,
    },
    trend_metrics: {
      active_run_count: 5,
      trend_pattern: "clustered_growth",
      trend_strength_score: 84,
      trend_stability_score: 76,
      current_window: {
        repeated_top10_ratio: 0.5,
        repeated_top20_ratio: 0.72,
        repeated_top50_ratio: 0.84,
        top20_turnover_ratio: 0.18,
        momentum_app_count: 5,
        sustained_growth_app_count: 4,
        longest_improvement_streak: 3,
        top10_presence_days: 8,
        top20_presence_days: 11,
        top50_presence_days: 14,
      },
    },
    trend_summary: {
      trend_verdict: "strengthening",
      trend_pattern: "clustered_growth",
      trend_strength: 84,
      trend_stability: 76,
      trend_evidence: ["高位稳定天数较高", "多个代表应用持续改善"],
      trend_risks: [],
    },
    evidence_v3: {
      ...baselineEvidence.evidence_v3,
      evidence_confidence: {
        level: "high",
        score: 92,
        explanation: ["内部证据覆盖较广", "多项信号互相支持"],
      },
      external_evidence: [{ title: "样例外部证据 A" }, { title: "样例外部证据 B" }],
      external_evidence_summary: ["两条外部证据与内部趋势形成交叉印证"],
      external_evidence_confidence: {
        level: "high",
        score: 88,
        explanation: "外部证据与内部信号一致。",
      },
      disconfirming_evidence: [],
      competing_explanations: [],
      action_readiness: {
        stage: "research",
        summary: "内部外部证据都较强，但仍需验证高风险假设。",
        rationale: ["趋势和证据强度都达到较高水平"],
        blockers: [],
      },
    },
  });
  const reviews = [
    makeReview("demand_analyst", "positive", "validate", "high"),
    makeReview("growth_analyst", "positive", "validate", "high"),
    makeReview("monetization_analyst", "positive", "validate", "high"),
    makeReview("competition_analyst", "positive", "research", "medium"),
    makeReview("evidence_auditor", "positive", "research", "high"),
    makeReview("skeptical_reviewer", "negative", "deprioritize", "high"),
  ];
  const panel = {
    reviews,
    reviewMap: new Map(reviews.map((review) => [review.role_code, review])),
  };

  const decision = buildDecisionChair({
    evidence,
    scores: {
      overall_score: 86,
      execution_feasibility_score: 74,
      competition_pressure_score: 26,
    },
    panel,
  });

  assert.equal(decision.final_recommendation, "research");
  assert.ok(
    decision.disagreement_summary.some((item) => item.includes("高风险")),
    "反方高风险应进入分歧摘要",
  );
});

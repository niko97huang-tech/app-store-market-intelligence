function flattenList(value) {
  if (Array.isArray(value)) {
    return value.join(" | ");
  }
  return value ?? "";
}

export function buildExportTables(analysisDoc, opportunityDoc) {
  const panelReviews = analysisDoc.opportunity_decision_cards.flatMap((card) =>
    card.panel_reviews.map((review) => ({
      opportunity_name: card.opportunity_name,
      category_name: card.category_name,
      list_type: card.list_type,
      role: review.role,
      role_code: review.role_code ?? "",
      verdict: review.verdict,
      verdict_code: review.verdict_code ?? "",
      confidence: review.confidence,
      confidence_code: review.confidence_code ?? "",
      supporting_evidence: flattenList(review.supporting_evidence),
      key_risks: flattenList(review.key_risks),
      next_action: review.next_action,
      next_action_code: review.next_action_code ?? "",
      notes: flattenList(review.notes),
    })),
  );

  const disagreementSummary = analysisDoc.opportunity_decision_cards.map((card) => ({
    opportunity_name: card.opportunity_name,
    category_name: card.category_name,
    list_type: card.list_type,
    disagreement_summary: flattenList(card.disagreement_summary),
  }));

  const finalDecisions = analysisDoc.opportunity_decision_cards.map((card) => ({
    opportunity_name: card.opportunity_name,
    category_name: card.category_name,
    list_type: card.list_type,
    final_recommendation: card.recommendation,
    final_recommendation_code: card.recommendation_code ?? "",
    final_confidence: card.confidence,
    final_confidence_code: card.confidence_code ?? "",
    rationale_summary: flattenList(card.rationale_summary),
    unmet_requirements: flattenList(card.unmet_requirements),
    downgrade_risks: flattenList(card.downgrade_risks),
    next_best_action: card.next_best_action ?? "",
    action_plan: flattenList(card.action_plan),
    ladder_evidence_strength: card.ladder_signals?.evidence_strength ?? "",
    ladder_trend_strength: card.ladder_signals?.trend_strength ?? "",
    ladder_external_corroboration: card.ladder_signals?.external_corroboration ?? "",
    ladder_counter_evidence_pressure: card.ladder_signals?.counter_evidence_pressure ?? "",
    ladder_execution_feasibility: card.ladder_signals?.execution_feasibility ?? "",
    ladder_differentiation_space: card.ladder_signals?.differentiation_space ?? "",
  }));

  const executiveSummary = analysisDoc.executive_summary.top_opportunities.map((item) => ({
    opportunity_name: item.opportunity_name,
    conclusion: item.one_line_conclusion,
    recommendation: item.recommendation,
    confidence: item.confidence,
    confidence_code: item.confidence_code ?? "",
    reason_summary: flattenList(item.reason_summary),
    risk_summary: flattenList(item.risk_summary),
  }));

  const decisionCards = analysisDoc.opportunity_decision_cards.map((card) => ({
    opportunity_name: card.opportunity_name,
    category_name: card.category_name,
    list_type: card.list_type,
    recommendation: card.recommendation,
    recommendation_code: card.recommendation_code ?? "",
    confidence: card.confidence,
    confidence_code: card.confidence_code ?? "",
    trend_verdict: card.trend_verdict,
    trend_verdict_label: card.trend_verdict_label ?? card.trend_verdict,
    trend_pattern: card.trend_pattern,
    trend_pattern_label: card.trend_pattern_label ?? card.trend_pattern,
    trend_strength: card.trend_strength,
    trend_stability: card.trend_stability,
    product_tags: flattenList(card.product_tags),
    likely_drivers: flattenList(card.likely_drivers),
    monetization_model_hint: card.monetization_model_hint,
    observations: flattenList(card.observations),
    evidence_gaps: flattenList(card.evidence_gaps),
    competing_explanations: flattenList(card.competing_explanations),
    disconfirming_evidence: flattenList(card.disconfirming_evidence),
    action_readiness_stage: card.action_readiness?.stage ?? "",
    action_readiness_stage_label: card.current_recommendation ?? card.recommendation,
    action_readiness_summary: card.action_readiness?.summary ?? "",
    action_readiness_blockers: flattenList(card.action_readiness?.blockers),
    evidence_confidence_level: card.evidence_confidence?.level ?? "",
    evidence_confidence_level_label: card.evidence_confidence?.level_label ?? "",
    evidence_confidence_score: card.evidence_confidence?.score ?? "",
    evidence_confidence_explanation: flattenList(card.evidence_confidence?.explanation),
    external_evidence_summary: flattenList(card.external_evidence_summary),
    external_evidence_confidence_level: card.external_evidence_confidence?.level ?? "",
    external_evidence_confidence_level_label:
      card.external_evidence_confidence?.level_label ?? "",
    external_evidence_confidence_score: card.external_evidence_confidence?.score ?? "",
    external_evidence_confidence_explanation:
      flattenList(card.external_evidence_confidence?.explanation),
    attribution_supported_factors: flattenList(card.attribution_summary?.supported_factors),
    attribution_tentative_factors: flattenList(card.attribution_summary?.tentative_factors),
    attribution_caution: card.attribution_summary?.caution ?? "",
    recommendation_rationale: flattenList(card.recommendation_rationale),
    unmet_requirements: flattenList(card.unmet_requirements),
    downgrade_risks: flattenList(card.downgrade_risks),
    next_best_action: card.next_best_action ?? "",
    ladder_evidence_strength: card.ladder_signals?.evidence_strength ?? "",
    ladder_trend_strength: card.ladder_signals?.trend_strength ?? "",
    ladder_external_corroboration: card.ladder_signals?.external_corroboration ?? "",
    ladder_counter_evidence_pressure: card.ladder_signals?.counter_evidence_pressure ?? "",
    ladder_execution_feasibility: card.ladder_signals?.execution_feasibility ?? "",
    ladder_differentiation_space: card.ladder_signals?.differentiation_space ?? "",
    trend_evidence: flattenList(card.trend_evidence),
    why_now: flattenList(card.why_now),
    supporting_evidence: flattenList(card.supporting_evidence),
    monetization_hint: card.monetization_hint,
    competition_hint: card.competition_hint,
    execution_hint: card.execution_hint,
    key_risks: flattenList(card.key_risks),
  }));

  const notRecommended = analysisDoc.negative_findings.map((item) => ({
    track_name: item.track_name,
    conclusion: item.conclusion,
    reason_summary: flattenList(item.reason_summary),
    risk_summary: flattenList(item.risk_summary),
    recommendation: item.recommendation,
  }));

  const nextActions = analysisDoc.next_step_actions.map((item) => ({
    opportunity_name: item.opportunity_name,
    recommendation: item.recommendation,
    recommendation_code: item.recommendation_code ?? "",
    action: item.action,
    reason: flattenList(item.reason),
  }));

  const scoreBreakdown = analysisDoc.opportunity_decision_cards.map((card) => ({
    opportunity_name: card.opportunity_name,
    category_name: card.category_name,
    list_type: card.list_type,
    growth_score: card.score_breakdown.growth_score,
    persistence_score: card.score_breakdown.persistence_score,
    competition_score: card.score_breakdown.competition_score,
    competition_pressure_score: card.score_breakdown.competition_pressure_score,
    monetization_score: card.score_breakdown.monetization_score,
    execution_feasibility_score: card.score_breakdown.execution_feasibility_score,
    differentiation_score: card.score_breakdown.differentiation_score,
    overall_score: card.score_breakdown.overall_score,
    trend_active_run_count: card.trend_metrics?.active_run_count ?? "",
    trend_momentum_app_count: card.trend_metrics?.current_window?.momentum_app_count ?? "",
    trend_sustained_growth_app_count:
      card.trend_metrics?.current_window?.sustained_growth_app_count ?? "",
    trend_pattern: card.trend_pattern,
    trend_strength_score: card.trend_strength,
    trend_stability_score: card.trend_stability,
    trend_top10_presence_days: card.trend_metrics?.current_window?.top10_presence_days ?? "",
    trend_top20_presence_days: card.trend_metrics?.current_window?.top20_presence_days ?? "",
    trend_top50_presence_days: card.trend_metrics?.current_window?.top50_presence_days ?? "",
    trend_longest_improvement_streak:
      card.trend_metrics?.current_window?.longest_improvement_streak ?? "",
    trend_multi_list_resonance_ratio:
      card.trend_metrics?.multi_list_resonance_ratio ?? "",
    evidence_confidence_score: card.evidence_confidence?.score ?? "",
    action_readiness_stage: card.action_readiness?.stage ?? "",
    external_evidence_confidence_score: card.external_evidence_confidence?.score ?? "",
    explanation: flattenList(card.score_breakdown_explanation_summary),
  }));

  const legacyOpportunityCards = opportunityDoc.opportunities.map((card) => ({
    opportunity_name: card.opportunity_name,
    recommendation: card.recommendation,
    confidence: card.confidence,
    representative_apps: flattenList(card.representative_apps.map((app) => app.app_name)),
    action_plan: flattenList(card.action_plan),
  }));

  return {
    executive_summary: executiveSummary,
    tag_summary: analysisDoc.tag_summary,
    attribution_summary: [
      ...((analysisDoc.attribution_summary?.supported_patterns ?? []).map((item) => ({
        type: "supported_pattern",
        detail: item,
      }))),
      ...((analysisDoc.attribution_summary?.evidence_gaps ?? []).map((item) => ({
        type: "evidence_gap",
        detail: item,
      }))),
    ],
    opportunity_decision_cards: decisionCards,
    not_recommended_tracks: notRecommended,
    next_actions: nextActions,
    score_breakdown: scoreBreakdown,
    panel_reviews: panelReviews,
    disagreement_summary: disagreementSummary,
    final_decisions: finalDecisions,
    category_opportunities: analysisDoc.category_opportunities,
    recommended_tracks: analysisDoc.recommended_tracks,
    new_entrant_ideas: analysisDoc.new_entrant_ideas,
    fast_risers: analysisDoc.fast_risers,
    app_watchlist: analysisDoc.app_watchlist,
    opportunity_cards: legacyOpportunityCards,
  };
}

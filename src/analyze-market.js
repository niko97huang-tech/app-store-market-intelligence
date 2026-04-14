import fs from "node:fs/promises";
import path from "node:path";
import { summarizeAttributions } from "./analysis/attribution.js";
import { buildEvidencePacks } from "./analysis/evidence-pack.js";
import { buildDecisionChair } from "./analysis/decision-chair.js";
import { loadExternalEvidenceCatalog } from "./analysis/external-evidence/index.js";
import { renderMarketAnalysisMarkdown } from "./analysis/markdown-renderer.js";
import { LOW_CONFIDENCE_CATEGORIES } from "./analysis/reviewer-rules.js";
import { summarizeTags } from "./analysis/tagging.js";
import { loadTrendRuns } from "./analysis/trend-loader.js";
import {
  compareRunMeta,
  confidenceFromScore,
  makeBucketKey,
  round,
  toNumber,
} from "./analysis/helpers.js";
import {
  getConfidenceLabel,
  getTrendPatternLabel,
  getTrendVerdictLabel,
} from "./analysis/output-labels.js";
import { runPanelReview } from "./analysis/panel-review.js";
import { getRecommendationLabel } from "./analysis/recommendation-ladder.js";
import { scoreEvidencePack } from "./analysis/scoring.js";
import { getProjectConfig } from "./runtime/config.js";
import { createLogger } from "./runtime/logger.js";

const config = getProjectConfig();
const ANALYSIS_DIR = config.analysisDir;
const LATEST_ANALYSIS_DIR = config.latestAnalysisDir;
const RUN_INDEX_FILE = config.runIndexFile;
const logger = createLogger("analyze-market", config.logLevel);

function parseArgs(argv) {
  const args = {
    baseRunId: null,
    targetRunId: null,
    topN: 15,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--base-run-id" && next) args.baseRunId = next;
    if (current === "--target-run-id" && next) args.targetRunId = next;
    if (current === "--top-n" && next) args.topN = Number(next);
  }

  if (!Number.isFinite(args.topN) || args.topN < 1) {
    throw new Error("--top-n 必须是大于等于 1 的数字");
  }

  return args;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeText(filePath, text) {
  await fs.writeFile(filePath, `${text.trimEnd()}\n`, "utf8");
}

function pickRuns(index, options) {
  const sorted = [...index].sort(compareRunMeta);
  const target =
    sorted.find((item) => item.run_id === options.targetRunId) ??
    (options.targetRunId ? null : sorted[0]);
  if (!target) {
    throw new Error(`没有找到 target run: ${options.targetRunId}`);
  }

  const base =
    sorted.find((item) => item.run_id === options.baseRunId) ??
    (options.baseRunId
      ? null
      : sorted.find((item) => item.run_id !== target.run_id));
  if (!base) {
    throw new Error(
      options.baseRunId
        ? `没有找到 base run: ${options.baseRunId}`
        : "至少需要两个 run 才能做商业分析",
    );
  }

  return { base, target };
}

async function loadRunBundle(runId) {
  const runDir = path.join(config.runsDir, runId);
  const [meta, apps, summary, rankings] = await Promise.all([
    readJson(path.join(runDir, "run.json")),
    readJson(path.join(runDir, "apps.json")),
    readJson(path.join(runDir, "summary.json")),
    readJson(path.join(runDir, "rankings.json")),
  ]);
  return { runDir, meta, apps, summary, rankings };
}

async function loadDiff(baseRunId, targetRunId) {
  const diffId = `${baseRunId}__vs__${targetRunId}`;
  return readJson(path.join(config.diffsDir, diffId, "diff.json"));
}

function buildCategoryOpportunity(candidate) {
  return {
    category_id: candidate.category_id,
    category_name: candidate.category_name,
    brand: candidate.brand,
    brand_name: candidate.list_type,
    app_count: candidate.app_count,
    top10_avg_rating_count: candidate.monetization_signals.top10_avg_rating_count,
    top10_total_rating_count: candidate.monetization_signals.top10_total_rating_count,
    top_genre: candidate.top_genre,
    top_genre_ratio: candidate.top_genre_ratio,
    churn_ratio: round(
      (candidate.rank_signals.new_count +
        candidate.rank_signals.dropped_count) /
        Math.max(candidate.app_count, 1),
      4,
    ),
    movement_ratio: round(
      candidate.rank_signals.changed_count / Math.max(candidate.app_count, 1),
      4,
    ),
    new_count: candidate.rank_signals.new_count,
    dropped_count: candidate.rank_signals.dropped_count,
    changed_count: candidate.rank_signals.changed_count,
    opportunity_score: candidate.score_breakdown.overall_score,
    confidence: candidate.confidence,
    reasons: candidate.reason_summary,
  };
}

function buildDecisionCard(candidate) {
  return {
    opportunity_name: candidate.opportunity_name,
    category_name: candidate.category_name,
    list_type: candidate.list_type,
    why_now: candidate.why_now,
    supporting_evidence: candidate.supporting_evidence,
    rank_signal_summary: candidate.rank_signal_summary,
    app_signal_summary: candidate.app_signal_summary,
    representative_apps: candidate.representative_apps,
    monetization_hint: candidate.monetization_hint,
    competition_hint: candidate.competition_hint,
    execution_hint: candidate.execution_hint,
    product_tags: candidate.product_tags,
    likely_drivers: candidate.likely_drivers,
    monetization_model_hint: candidate.monetization_model_hint,
    observations: candidate.observations,
    competing_explanations: candidate.competing_explanations,
    disconfirming_evidence: candidate.disconfirming_evidence,
    action_readiness: candidate.action_readiness,
    evidence_confidence: candidate.evidence_confidence,
    external_evidence: candidate.external_evidence,
    external_evidence_summary: candidate.external_evidence_summary,
    external_evidence_confidence: candidate.external_evidence_confidence,
    attribution_summary: candidate.attribution_summary,
    evidence_gaps: candidate.evidence_gaps,
    key_risks: candidate.key_risks,
    recommendation_code: candidate.recommendation_code,
    recommendation: candidate.recommendation,
    confidence_code: candidate.confidence_code,
    confidence: candidate.confidence,
    one_line_conclusion: candidate.one_line_conclusion,
    score_breakdown: candidate.score_breakdown,
    score_breakdown_explanation: candidate.score_breakdown_explanation,
    score_breakdown_explanation_summary: candidate.score_breakdown_explanation_summary,
    panel_reviews: candidate.panel_reviews,
    disagreement_summary: candidate.disagreement_summary,
    rationale_summary: candidate.rationale_summary,
    current_recommendation: candidate.current_recommendation,
    recommendation_rationale: candidate.recommendation_rationale,
    unmet_requirements: candidate.unmet_requirements,
    downgrade_risks: candidate.downgrade_risks,
    next_best_action: candidate.next_best_action,
    ladder_signals: candidate.ladder_signals,
    action_plan: candidate.action_plan,
    trend_verdict: candidate.trend_summary?.trend_verdict ?? "insufficient_data",
    trend_verdict_label: getTrendVerdictLabel(
      candidate.trend_summary?.trend_verdict ?? "insufficient_data",
    ),
    trend_pattern: candidate.trend_summary?.trend_pattern ?? "insufficient_data",
    trend_pattern_label: getTrendPatternLabel(
      candidate.trend_summary?.trend_pattern ?? "insufficient_data",
    ),
    trend_strength: candidate.trend_summary?.trend_strength ?? 0,
    trend_stability: candidate.trend_summary?.trend_stability ?? 0,
    trend_evidence: candidate.trend_summary?.trend_evidence ?? [],
    trend_risks: candidate.trend_summary?.trend_risks ?? [],
    trend_metrics: candidate.trend_metrics ?? null,
    evidence_pack: candidate.evidence_pack,
    evidence_v3: candidate.evidence_v3,
  };
}

function buildTopOpportunitySummary(card) {
  return {
    opportunity_name: card.opportunity_name,
    one_line_conclusion: card.one_line_conclusion,
    recommendation: card.recommendation,
    reason_summary: card.rationale_summary.slice(0, 4),
    risk_summary: card.key_risks.slice(0, 3),
    confidence: card.confidence,
    trend_pattern: card.trend_pattern_label ?? getTrendPatternLabel(card.trend_pattern),
  };
}

function buildNegativeFinding(candidate) {
  return {
    track_name: candidate.opportunity_name,
    conclusion:
      candidate.recommendation_code === "deprioritize"
        ? "当前不建议优先跟进"
        : "当前更适合保持观察，不建议直接推进验证",
    reason_summary: candidate.disagreement_summary.length
      ? candidate.disagreement_summary
      : candidate.key_risks.slice(0, 3),
    risk_summary: candidate.key_risks,
    recommendation: candidate.recommendation,
    confidence: candidate.confidence,
  };
}

function buildCandidateFromEvidence(evidence) {
  const scoreBreakdown = scoreEvidencePack(evidence);
  const panel = runPanelReview({ evidence, scores: scoreBreakdown });
  const chair = buildDecisionChair({ evidence, scores: scoreBreakdown, panel });

  const monetizationHint = evidence.monetization_signals.category_has_grossing_presence
    ? "同分类在畅销榜存在表现，可优先关注订阅、内购或强需求付费模型"
    : evidence.brand === "paid"
      ? "付费榜有一定验证，可关注买断或轻订阅模型"
      : "当前商业化信号偏弱，先不要直接推收入结论";

  const competitionHint =
    scoreBreakdown.competition_score >= 60
      ? "竞争压力可控，仍存在细分切入口"
      : "头部集中度偏高，切入前要先验证差异化空间";

  const executionHint =
    scoreBreakdown.execution_feasibility_score >= 65
      ? "产品形态更像轻量切入，适合先做小范围验证"
      : "实现复杂度或用户预期较高，建议先做研究再决定";

  const recommendationCode = chair.final_recommendation;
  const recommendation = chair.final_recommendation_label ?? getRecommendationLabel(recommendationCode);
  const confidenceCode = chair.final_confidence_code ?? chair.final_confidence;
  const confidence = chair.final_confidence ?? getConfidenceLabel(confidenceCode);
  const oneLineConclusion =
    recommendationCode === "validate"
      ? "具备较强需求、增长和商业化信号，值得进入快速验证"
      : recommendationCode === "research"
        ? "机会存在，但需要先做竞品和用户需求研究"
        : recommendationCode === "observe"
          ? "已有信号，但证据还不够强，先继续观察"
          : "当前信号不够扎实，不建议优先投入";
  const trendSummary = evidence.trend_summary ?? {};
  const evidenceV3 = evidence.evidence_v3 ?? {};

  return {
    ...evidence,
    score_breakdown: scoreBreakdown,
    panel_reviews: [...panel.reviews, chair],
    recommendation_code: recommendationCode,
    recommendation,
    confidence_code: confidenceCode,
    confidence,
    one_line_conclusion: oneLineConclusion,
    why_now: evidenceV3.action_readiness?.rationale ?? evidence.derived_notes.why_now_candidates,
    observations: evidenceV3.observations ?? [],
    supporting_evidence: evidenceV3.supporting_evidence ?? [],
    competing_explanations: evidenceV3.competing_explanations ?? [],
    disconfirming_evidence: evidenceV3.disconfirming_evidence ?? [],
    action_readiness: evidenceV3.action_readiness ?? null,
    evidence_confidence: evidenceV3.evidence_confidence ?? null,
    external_evidence: evidenceV3.external_evidence ?? [],
    external_evidence_summary: evidenceV3.external_evidence_summary ?? [],
    external_evidence_confidence: evidenceV3.external_evidence_confidence ?? {
      level: "low",
      score: 0,
      explanation: "当前未命中外部证据。",
    },
    attribution_summary: evidenceV3.attribution_summary ?? null,
    rank_signal_summary: evidence.evidence_pack.rank_signal_summary,
    app_signal_summary: evidence.evidence_pack.app_signal_summary,
    representative_apps: evidence.app_signals.representative_apps,
    monetization_hint: monetizationHint,
    competition_hint: competitionHint,
    execution_hint: executionHint,
    product_tags: evidence.product_tags ?? [],
    likely_drivers: evidence.likely_drivers ?? [],
    monetization_model_hint: evidence.monetization_model_hint ?? monetizationHint,
    evidence_gaps: evidence.evidence_gaps ?? [],
    key_risks: chair.key_risks,
    disagreement_summary: chair.disagreement_summary,
    rationale_summary: chair.rationale_summary,
    current_recommendation: chair.current_recommendation,
    recommendation_rationale: chair.recommendation_rationale,
    unmet_requirements: chair.unmet_requirements,
    downgrade_risks: chair.downgrade_risks,
    next_best_action: chair.next_best_action,
    ladder_signals: chair.ladder_signals,
    action_plan: chair.action_plan,
    evidence_pack: evidence.evidence_pack,
    evidence_v3: evidenceV3,
    trend_pattern: trendSummary.trend_pattern ?? evidence.trend_metrics?.trend_pattern ?? "mixed",
    trend_strength: trendSummary.trend_strength ?? evidence.trend_metrics?.trend_strength_score ?? 0,
    trend_stability: trendSummary.trend_stability ?? evidence.trend_metrics?.trend_stability_score ?? 0,
    score_breakdown_explanation_summary: [
      `增长 ${scoreBreakdown.growth_score}`,
      `持续性代理 ${scoreBreakdown.persistence_score}`,
      `竞争友好度 ${scoreBreakdown.competition_score}`,
      `商业化 ${scoreBreakdown.monetization_score}`,
      `执行可行性 ${scoreBreakdown.execution_feasibility_score}`,
      `差异化 ${scoreBreakdown.differentiation_score}`,
    ],
  };
}

function buildKeyTakeaways({
  candidates,
  diffDoc,
  topCandidates,
  negativeCandidates,
}) {
  const topOpportunity = topCandidates[0];
  return [
    topOpportunity
      ? `${topOpportunity.opportunity_name} 是本次综合信号最强的方向，推荐动作为 ${topOpportunity.recommendation}`
      : null,
    `两次快照之间新上榜 ${diffDoc.ranking_changes.summary.new_entry_count} 个、掉榜 ${diffDoc.ranking_changes.summary.dropped_entry_count} 个，整体市场仍在显著轮动`,
    candidates.filter((item) => item.brand === "grossing" && item.recommendation_code !== "deprioritize").length >= 3
      ? "畅销榜主导了本次高优先级机会，商业化信号明显强于免费榜"
      : null,
    negativeCandidates.length
      ? `有 ${negativeCandidates.length} 个方向被判定为暂不建议优先跟进，说明这次不是“全部都值得看”`
      : null,
  ].filter(Boolean);
}

function buildNextStepActions(cards) {
  return cards.slice(0, 5).map((card) => ({
    opportunity_name: card.opportunity_name,
    recommendation: card.recommendation,
    action:
      card.recommendation_code === "validate"
        ? "补抓代表应用截图、描述、评论并建立 MVP 验证清单"
        : card.recommendation_code === "research"
          ? "建立竞品矩阵，拆解代表应用的定位、变现和版本更新节奏"
          : card.recommendation_code === "observe"
            ? "继续观察未来 7 天的榜单变化与高位新进入者"
            : "暂不投入，保留监控即可",
    reason: card.rationale_summary.slice(0, 3),
  }));
}

function buildConfidenceNote(cards) {
  const highConfidence = cards.filter((card) => card.confidence === "high").length;
  const observeOnly = cards.filter((card) => card.recommendation_code === "observe").length;
  if (!cards.length) {
    return "当前没有足够候选机会，报告可信度较低。";
  }
  if (highConfidence >= 2) {
    return "本次报告中已有多个高置信度方向，但仍应把持续性理解为两次快照下的代理判断。";
  }
  if (observeOnly >= Math.ceil(cards.length / 2)) {
    return "本次多数方向仍停留在观察层，说明现有证据更适合做监控，不适合直接做立项结论。";
  }
  return "本次报告的结论可用于排序和聚焦，但关键方向仍建议配合连续多日数据进一步确认。";
}

function buildAnalysisDocument({
  baseBundle,
  targetBundle,
  diffDoc,
  trendContext,
  externalCatalog,
  options,
}) {
  const evidencePacks = buildEvidencePacks({
    baseBundle,
    targetBundle,
    diffDoc,
    trendContext,
    externalCatalog,
  });
  const candidates = evidencePacks
    .map(buildCandidateFromEvidence)
    .filter((candidate) => !LOW_CONFIDENCE_CATEGORIES.has(String(candidate.category_id)))
    .sort((a, b) => b.score_breakdown.overall_score - a.score_breakdown.overall_score);

  const topCandidates = candidates
    .filter((candidate) => candidate.recommendation_code !== "deprioritize")
    .slice(0, options.topN);
  const topOpportunityCards = topCandidates.map(buildDecisionCard);
  const negativeCandidates = candidates
    .filter((candidate) => candidate.recommendation_code === "deprioritize")
    .slice(0, Math.max(2, Math.min(5, options.topN)));

  const categoryOpportunities = candidates.map(buildCategoryOpportunity);
  const newEntrants = (diffDoc.ranking_changes?.new_entries ?? [])
    .sort((a, b) => toNumber(a.current_rank, 9999) - toNumber(b.current_rank, 9999))
    .slice(0, options.topN)
    .map((item) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      brand: item.brand,
      brand_name: item.brand_name,
      app_id: item.app_id,
      app_name: item.app_name,
      current_rank: item.current_rank,
      publisher_name: item.publisher_name,
    }));

  const fastRisers = (diffDoc.ranking_changes?.changed_entries ?? [])
    .filter((item) => toNumber(item.rank_delta) > 0)
    .sort((a, b) => toNumber(b.rank_delta) - toNumber(a.rank_delta))
    .slice(0, options.topN)
    .map((item) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      brand: item.brand,
      brand_name: item.brand_name,
      app_id: item.app_id,
      app_name: item.app_name,
      previous_rank: item.previous_rank,
      current_rank: item.current_rank,
      rank_delta: item.rank_delta,
    }));

  const appWatchlist = (diffDoc.app_changes?.changed_apps ?? [])
    .slice(0, options.topN)
    .map((item) => ({
      app_id: item.app_id,
      track_name: item.trackName,
      seller_name: item.sellerName,
      primary_genre: item.primaryGenreName,
      changed_field_count: item.changed_field_count,
      changed_fields: item.changed_fields,
    }));

  const executiveSummary = {
    top_opportunities: topOpportunityCards.slice(0, 5).map(buildTopOpportunitySummary),
    key_takeaways: buildKeyTakeaways({
      candidates,
      diffDoc,
      topCandidates: topOpportunityCards,
      negativeCandidates,
    }),
    not_recommended_tracks: negativeCandidates.map(buildNegativeFinding),
    next_actions: buildNextStepActions(topOpportunityCards).map((item) => `${item.opportunity_name}：${item.action}`),
    confidence_note: buildConfidenceNote(topOpportunityCards),
  };

  const trendResearchSummary = {
    overview: [
      topOpportunityCards[0]
        ? `${topOpportunityCards[0].opportunity_name} 在本次样本中呈现最强趋势强度，当前模式为 ${topOpportunityCards[0].trend_pattern_label ?? getTrendPatternLabel(topOpportunityCards[0].trend_pattern)}`
        : null,
      topOpportunityCards.find(
        (card) => card.trend_verdict === "strong_but_fragile",
      )
        ? "本次报告中存在强趋势但高风险的方向，短期拉升并不等于稳定机会"
        : null,
      topOpportunityCards.find(
        (card) => card.trend_verdict === "weak_but_stable",
      )
        ? "本次报告中也存在弱趋势但相对稳定的方向，更适合继续跟踪而不是立刻验证"
        : null,
    ].filter(Boolean),
    top_patterns: topOpportunityCards.slice(0, 5).map((card) => ({
      opportunity_name: card.opportunity_name,
      trend_pattern: card.trend_pattern,
      trend_pattern_label: card.trend_pattern_label ?? getTrendPatternLabel(card.trend_pattern),
      trend_verdict: card.trend_verdict,
      trend_verdict_label: card.trend_verdict_label ?? getTrendVerdictLabel(card.trend_verdict),
      trend_strength: card.trend_strength,
      trend_stability: card.trend_stability,
    })),
  };
  const tagSummary = summarizeTags(topCandidates);
  const attributionSummary = summarizeAttributions(topCandidates);
  const externalEvidenceOverview = {
    provider_status: externalCatalog?.provider_status ?? [],
    matched_card_count: topOpportunityCards.filter((card) => card.external_evidence?.length).length,
    matched_signal_count: topOpportunityCards.reduce(
      (sum, card) => sum + (card.external_evidence?.length ?? 0),
      0,
    ),
  };

  return {
    analysis_id: `${baseBundle.meta.run_id}__vs__${targetBundle.meta.run_id}`,
    report_version: "v3-public-preview",
    evidence_schema_version: "v3",
    generated_at: new Date().toISOString(),
    base_run: baseBundle.meta,
    target_run: targetBundle.meta,
    methodology: {
      scoring_dimensions: [
        "growth_score：综合新进榜、快速上升、高位改善和波动广度",
        "persistence_score：综合跨榜联动、变化广度、版本更新解释力，以及趋势强度/趋势稳定性双维信号",
        "competition_score：越高表示切入友好度越高，内部同时保留 competition_pressure_score 作为反向参考",
        "monetization_score：综合免费/付费/畅销联动、评分规模和榜单类型的变现清晰度代理分",
        "execution_feasibility_score：基于品类复杂度代理和赛道集中度的执行可行性分",
        "differentiation_score：基于命名集中度、头部集中度和高位新进入者信号的差异化空间分",
      ],
      notes: [
        "新版报告从变化描述升级为结论、证据、风险、建议动作四层结构。",
        "本次已接入证据结构 V3，统一输出事实观察、支持证据、替代解释、反证、行动准备度与证据置信度。",
        externalEvidenceOverview.matched_signal_count > 0
          ? `本次已接入可降级外部证据层，命中 ${externalEvidenceOverview.matched_signal_count} 条样例外部证据。`
          : "当前外部证据层未命中样例，系统已自动降级为仅依赖内部证据。",
        "当前 persistence_score 已拆分接入趋势强度与趋势稳定性，不再只是单一混合代理分。",
        trendContext?.runs?.length
          ? `本次趋势层使用了 ${trendContext.runs.length} 次历史快照，窗口包含 ${trendContext.windows.join("/") } 天`
          : "本次趋势层缺少足够历史快照，因此仍主要依赖双快照证据。",
        "多角色评审是规则化分析器，不依赖外部 LLM 服务，但所有结论都必须回到 evidence pack。",
        `若证据审计员认为证据不足，则最终建议最高不超过 ${getRecommendationLabel("observe")}。`,
      ],
    },
    market_summary: {
      ranking_changes: diffDoc.ranking_changes.summary,
      app_changes: diffDoc.app_changes.summary,
    },
    trend_research_summary: trendResearchSummary,
    external_evidence_overview: externalEvidenceOverview,
    tag_summary: tagSummary,
    attribution_summary: attributionSummary,
    executive_summary: executiveSummary,
    category_opportunities: categoryOpportunities,
    recommended_tracks: categoryOpportunities.slice(0, options.topN),
    new_entrant_ideas: newEntrants,
    fast_risers: fastRisers,
    app_watchlist: appWatchlist,
    opportunity_decision_cards: topOpportunityCards,
    negative_findings: negativeCandidates.map(buildNegativeFinding),
    next_step_actions: buildNextStepActions(topOpportunityCards),
    panel_reviews: topOpportunityCards.flatMap((card) =>
      card.panel_reviews.map((review) => ({
        opportunity_name: card.opportunity_name,
        role: review.role,
        role_code: review.role_code,
        verdict: review.verdict,
        verdict_code: review.verdict_code,
        confidence: review.confidence,
        supporting_evidence: review.supporting_evidence,
        key_risks: review.key_risks,
        next_action: review.next_action,
        next_action_code: review.next_action_code,
        notes: review.notes,
      })),
    ),
    final_decisions: topOpportunityCards.map((card) => ({
      opportunity_name: card.opportunity_name,
      final_recommendation: card.recommendation,
      final_recommendation_code: card.recommendation_code,
      final_confidence: card.confidence,
      final_confidence_code: card.confidence_code,
      rationale_summary: card.rationale_summary,
      disagreement_summary: card.disagreement_summary,
      unmet_requirements: card.unmet_requirements,
      downgrade_risks: card.downgrade_risks,
      next_best_action: card.next_best_action,
      action_plan: card.action_plan,
      ladder_evidence_strength: card.ladder_signals?.evidence_strength ?? 0,
      ladder_trend_strength: card.ladder_signals?.trend_strength ?? 0,
      ladder_external_corroboration: card.ladder_signals?.external_corroboration ?? 0,
      ladder_counter_evidence_pressure: card.ladder_signals?.counter_evidence_pressure ?? 0,
      ladder_execution_feasibility: card.ladder_signals?.execution_feasibility ?? 0,
      ladder_differentiation_space: card.ladder_signals?.differentiation_space ?? 0,
    })),
  };
}

async function writeAnalysisOutputs(doc) {
  await ensureDir(ANALYSIS_DIR);
  await ensureDir(LATEST_ANALYSIS_DIR);

  const reportDir = path.join(ANALYSIS_DIR, doc.analysis_id);
  await ensureDir(reportDir);

  const markdown = renderMarketAnalysisMarkdown(doc);
  await writeJson(path.join(reportDir, "market-analysis.json"), doc);
  await writeText(path.join(reportDir, "market-analysis.md"), markdown);
  await writeJson(path.join(LATEST_ANALYSIS_DIR, "market-analysis.json"), doc);
  await writeText(path.join(LATEST_ANALYSIS_DIR, "market-analysis.md"), markdown);

  return { reportDir };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  logger.info("开始生成商业分析报告", {
    baseRunId: options.baseRunId,
    targetRunId: options.targetRunId,
    topN: options.topN,
  });
  const runIndex = await readJson(RUN_INDEX_FILE);
  const { base, target } = pickRuns(runIndex, options);
  const [baseBundle, targetBundle, diffDoc, trendContext, externalCatalog] = await Promise.all([
    loadRunBundle(base.run_id),
    loadRunBundle(target.run_id),
    loadDiff(base.run_id, target.run_id),
    loadTrendRuns(runIndex, target),
    loadExternalEvidenceCatalog({ config }),
  ]);

  const analysisDoc = buildAnalysisDocument({
    baseBundle,
    targetBundle,
    diffDoc,
    trendContext,
    externalCatalog,
    options,
  });
  const outputs = await writeAnalysisOutputs(analysisDoc);
  logger.result({
    ok: true,
    analysis_id: analysisDoc.analysis_id,
    base_run_id: base.run_id,
    target_run_id: target.run_id,
    report_dir: outputs.reportDir,
    top_opportunity_count: analysisDoc.executive_summary.top_opportunities.length,
    decision_card_count: analysisDoc.opportunity_decision_cards.length,
    negative_finding_count: analysisDoc.negative_findings.length,
  });
}

main().catch((error) => {
  logger.error("生成商业分析报告失败", error?.stack ?? String(error));
  process.exitCode = 1;
});

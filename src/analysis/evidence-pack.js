import {
  average,
  buildNameConcentration,
  compactTextList,
  diffDays,
  makeBucketKey,
  round,
  safeDivide,
  sum,
  toNumber,
  unique,
} from "./helpers.js";
import { buildAttributionInsights } from "./attribution.js";
import { buildEvidenceSchemaV3 } from "./evidence-schema.js";
import { matchExternalEvidenceForEvidence } from "./external-evidence/index.js";
import { inferProductTags } from "./tagging.js";
import { buildTrendMetricsForEvidence } from "./trend-metrics.js";
import { buildTrendSummary } from "./trend-summary.js";

function indexBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    map.set(getKey(item), item);
  }
  return map;
}

function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  }
  return map;
}

function pickRepresentativeApps({
  rankings,
  entrants,
  risers,
  appMap,
  appChangesByAppId,
}) {
  const ranked = [...rankings]
    .sort((a, b) => toNumber(a.rank, 9999) - toNumber(b.rank, 9999))
    .slice(0, 8);

  const ids = unique([
    ...entrants.slice(0, 4).map((item) => item.app_id),
    ...risers.slice(0, 4).map((item) => item.app_id),
    ...ranked.map((item) => item.app_id),
  ]);

  return ids.slice(0, 8).map((appId) => {
    const detail = appMap.get(String(appId));
    const ranking = ranked.find((item) => String(item.app_id) === String(appId));
    const appChange = appChangesByAppId.get(String(appId));
    return {
      app_id: String(appId),
      app_name: detail?.trackName ?? ranking?.app_name ?? null,
      seller_name: detail?.sellerName ?? ranking?.publisher_name ?? null,
      primary_genre: detail?.primaryGenreName ?? null,
      rank: ranking?.rank ?? null,
      rating_count: toNumber(detail?.userRatingCount),
      rating: detail?.averageUserRating ?? null,
      price: detail?.price ?? null,
      version: detail?.version ?? null,
      release_date: detail?.currentVersionReleaseDate ?? null,
      changed_fields: appChange?.changed_fields?.map((field) => field.field) ?? [],
    };
  });
}

function buildEvidenceForBucket({
  item,
  diffBucket,
  targetBundle,
  diffDoc,
  appMap,
  appChangesByAppId,
  rankingsByBucket,
  entrantsByBucket,
  risersByBucket,
  categoryBuckets,
  snapshotDate,
  trendContext,
  externalCatalog,
}) {
  const key = makeBucketKey(item);
  const rankings = rankingsByBucket.get(key) ?? [];
  const entrants = entrantsByBucket.get(key) ?? [];
  const risers = risersByBucket.get(key) ?? [];
  const categoryPeers = categoryBuckets.get(String(item.category_id)) ?? [];
  const representativeApps = pickRepresentativeApps({
    rankings,
    entrants,
    risers,
    appMap,
    appChangesByAppId,
  });

  const topRankings = rankings
    .filter((row) => toNumber(row.rank) > 0)
    .sort((a, b) => toNumber(a.rank, 9999) - toNumber(b.rank, 9999))
    .slice(0, 20);

  const positiveDeltas = risers.map((row) => toNumber(row.rank_delta)).filter((value) => value > 0);
  const top20Risers = risers.filter((row) => toNumber(row.current_rank, 9999) <= 20);
  const top50Risers = risers.filter((row) => toNumber(row.current_rank, 9999) <= 50);
  const top20Entrants = entrants.filter((row) => toNumber(row.current_rank, 9999) <= 20);
  const recentVersionUpdates = representativeApps
    .map((app) => diffDays(app.release_date, snapshotDate))
    .filter((days) => days !== null && days >= 0 && days <= 30);

  const representativeAppIds = new Set(
    representativeApps.map((app) => app.app_id),
  );
  const changedAppsInBucket = rankings
    .map((row) => appChangesByAppId.get(String(row.app_id)))
    .filter(Boolean);

  const changedFieldCounts = changedAppsInBucket.flatMap(
    (app) => app.changed_fields?.map((field) => field.field) ?? [],
  );
  const nameConcentration = buildNameConcentration(topRankings.map((row) => row.app_name));

  const crossBrandSignals = categoryPeers.map((peer) => ({
    brand: peer.brand,
    brand_name: peer.brand_name,
    changed_count: toNumber(peer.changed_count),
    new_count: toNumber(peer.new_count),
    dropped_count: toNumber(peer.dropped_count),
    opportunity_score: peer.opportunity_score ?? null,
  }));

  const grossingPeer = categoryPeers.find((peer) => peer.brand === "grossing");
  const paidPeer = categoryPeers.find((peer) => peer.brand === "paid");

  const evidence = {
    opportunity_key: key,
    opportunity_name: `${item.category_name} / ${item.brand_name}`,
    category_id: item.category_id,
    category_name: item.category_name,
    brand: item.brand,
    list_type: item.brand_name,
    app_count: toNumber(item.app_count),
    top_genre: item.top_genre ?? null,
    top_genre_ratio: toNumber(item.top_genre_ratio),
    rank_signals: {
      changed_count: toNumber(diffBucket.changed_count),
      new_count: toNumber(diffBucket.new_count),
      dropped_count: toNumber(diffBucket.dropped_count),
      improved_count: toNumber(diffBucket.improved_count),
      declined_count: toNumber(diffBucket.declined_count),
      unchanged_count: toNumber(diffBucket.unchanged_count),
      avg_positive_rank_delta: round(average(positiveDeltas), 2),
      top20_risers_count: top20Risers.length,
      top50_risers_count: top50Risers.length,
      top20_entrant_count: top20Entrants.length,
      breadth_ratio: round(
        safeDivide(
          toNumber(diffBucket.changed_count) +
            toNumber(diffBucket.new_count) +
            toNumber(diffBucket.dropped_count),
          item.app_count,
        ),
        4,
      ),
    },
    app_signals: {
      representative_app_count: representativeApps.length,
      representative_apps: representativeApps,
      changed_app_count: changedAppsInBucket.length,
      changed_field_count: unique(changedFieldCounts).length,
      version_refresh_count: changedAppsInBucket.filter((app) =>
        (app.changed_fields ?? []).some((field) =>
          ["version", "currentVersionReleaseDate"].includes(field.field),
        ),
      ).length,
      rating_signal_avg: round(average(representativeApps.map((app) => app.rating_count)), 2),
      recent_version_update_count: recentVersionUpdates.length,
      recent_version_update_ratio: round(
        safeDivide(recentVersionUpdates.length, representativeApps.length),
        4,
      ),
      price_points: compactTextList(
        representativeApps.map((app) => app.price).filter((value) => value !== null),
        8,
      ),
      app_name_token_signal: nameConcentration,
    },
    monetization_signals: {
      top10_avg_rating_count: toNumber(item.top10_avg_rating_count),
      top10_total_rating_count: toNumber(item.top10_total_rating_count),
      grossing_peer_score: grossingPeer?.opportunity_score ?? null,
      paid_peer_score: paidPeer?.opportunity_score ?? null,
      category_has_grossing_presence: Boolean(grossingPeer),
      category_has_paid_presence: Boolean(paidPeer),
      grossing_or_paid_resonance_count: categoryPeers.filter(
        (peer) =>
          ["grossing", "paid"].includes(peer.brand) &&
          (toNumber(peer.changed_count) > 0 ||
            toNumber(peer.new_count) > 0 ||
            toNumber(peer.dropped_count) > 0),
      ).length,
    },
    competition_signals: {
      top_genre_ratio: toNumber(item.top_genre_ratio),
      name_token_top_ratio: nameConcentration.top_token_ratio,
      name_token_top: nameConcentration.top_token,
      new_to_changed_ratio: round(
        safeDivide(diffBucket.new_count, toNumber(diffBucket.changed_count) || 1),
        4,
      ),
      high_rank_newcomer_count: top20Entrants.length,
      representative_rating_total: sum(
        representativeApps.map((app) => app.rating_count),
      ),
    },
    cross_list_signals: {
      category_brand_count: categoryPeers.length,
      active_brand_count: categoryPeers.filter(
        (peer) =>
          toNumber(peer.changed_count) > 0 ||
          toNumber(peer.new_count) > 0 ||
          toNumber(peer.dropped_count) > 0,
      ).length,
      cross_brand_signals: crossBrandSignals,
    },
    evidence_pack: {
      headline_metrics: {
        new_entries: toNumber(diffBucket.new_count),
        dropped_entries: toNumber(diffBucket.dropped_count),
        changed_entries: toNumber(diffBucket.changed_count),
        fast_risers: risers.length,
        avg_positive_rank_delta: round(average(positiveDeltas), 2),
      },
      representative_apps: representativeApps,
      notable_changed_fields: compactTextList(changedFieldCounts, 8),
      rank_signal_summary: [
        `新进榜 ${toNumber(diffBucket.new_count)} 个`,
        `掉榜 ${toNumber(diffBucket.dropped_count)} 个`,
        `发生排名变化 ${toNumber(diffBucket.changed_count)} 个`,
        `Top20 上升 ${top20Risers.length} 个`,
      ],
      app_signal_summary: [
        `代表应用 ${representativeApps.length} 个`,
        `近 30 天内版本更新 ${recentVersionUpdates.length} 个`,
        `涉及字段变化 ${unique(changedFieldCounts).length} 类`,
      ],
      cross_list_summary: crossBrandSignals
        .slice(0, 3)
        .map(
          (peer) =>
            `${peer.brand_name}: 变化 ${peer.changed_count}, 新进榜 ${peer.new_count}, 掉榜 ${peer.dropped_count}`,
        ),
    },
    derived_notes: {
      why_now_candidates: compactTextList(
        [
          diffBucket.new_count >= 10 ? "新进榜数量较多" : null,
          risers.length >= 8 ? "快速上升应用较多" : null,
          top20Entrants.length >= 2 ? "有新进入者进入高位区间" : null,
          recentVersionUpdates.length >= 2 ? "代表应用近期有版本更新" : null,
          grossingPeer ? "同分类在畅销榜存在商业化信号" : null,
        ],
        5,
      ),
      risk_candidates: compactTextList(
        [
          item.top_genre_ratio >= 0.9 ? "头部类型高度集中" : null,
          diffBucket.new_count + diffBucket.dropped_count >= 25
            ? "榜单 churn 偏高，可能存在短期噪音"
            : null,
          !grossingPeer && item.brand === "free"
            ? "缺少畅销榜联动，商业化信号偏弱"
            : null,
          representativeApps.length < 3 ? "代表样本数量偏少" : null,
        ],
        5,
      ),
    },
  };

  const trendMetrics = trendContext
    ? buildTrendMetricsForEvidence(evidence, trendContext)
    : null;
  const trendSummary = buildTrendSummary({
    ...evidence,
    trend_metrics: trendMetrics,
  });

  evidence.trend_metrics = trendMetrics;
  evidence.trend_summary = trendSummary;
  evidence.product_tags = inferProductTags(evidence);
  const attribution = buildAttributionInsights(evidence);
  evidence.likely_drivers = attribution.likely_drivers;
  evidence.monetization_model_hint = attribution.monetization_model_hint;
  evidence.evidence_gaps = attribution.evidence_gaps;
  evidence.evidence_pack.trend_summary = compactTextList(
    [
      ...trendSummary.trend_evidence,
      ...trendMetrics?.summary_lines ?? [],
    ],
    6,
  );
  evidence.evidence_pack.trend_risks = trendSummary.trend_risks;
  evidence.evidence_pack.attribution_summary = compactTextList(
    [...evidence.likely_drivers, ...evidence.evidence_gaps],
    6,
  );
  const externalEvidence = matchExternalEvidenceForEvidence(evidence, externalCatalog);
  evidence.external_evidence = externalEvidence.external_evidence;
  evidence.external_evidence_summary = externalEvidence.external_evidence_summary;
  evidence.external_evidence_confidence = externalEvidence.external_evidence_confidence;
  evidence.external_evidence_provider_status = externalEvidence.provider_status;
  evidence.evidence_pack.external_evidence_summary = compactTextList(
    externalEvidence.external_evidence_summary,
    4,
  );
  evidence.derived_notes.why_now_candidates = compactTextList(
    [
      ...evidence.derived_notes.why_now_candidates,
      trendSummary.trend_verdict === "strengthening"
        ? "多次快照下呈现持续增强迹象"
        : null,
      trendMetrics?.current_window?.sustained_growth_app_count >= 2
        ? "窗口内存在连续改善应用"
        : null,
      externalEvidence.external_evidence.length
        ? "已有外部证据与当前方向形成弱交叉印证"
        : null,
    ],
    6,
  );
  evidence.derived_notes.risk_candidates = compactTextList(
    [
      ...evidence.derived_notes.risk_candidates,
      ...trendSummary.trend_risks,
      ...evidence.evidence_gaps,
    ],
    6,
  );
  evidence.evidence_v3 = buildEvidenceSchemaV3(evidence);

  return evidence;
}

export function buildEvidencePacks({
  baseBundle,
  targetBundle,
  diffDoc,
  trendContext = null,
  externalCatalog = null,
}) {
  const targetSummary = targetBundle.summary ?? [];
  const targetRankings = targetBundle.rankings ?? [];
  const targetApps = targetBundle.apps ?? [];
  const appMap = indexBy(targetApps, (item) => String(item.trackId));
  const appChangesByAppId = indexBy(
    diffDoc.app_changes?.changed_apps ?? [],
    (item) => String(item.app_id),
  );

  const rankingsByBucket = groupBy(targetRankings, (item) => makeBucketKey(item));
  const entrantsByBucket = groupBy(
    diffDoc.ranking_changes?.new_entries ?? [],
    (item) => makeBucketKey(item),
  );
  const risersByBucket = groupBy(
    (diffDoc.ranking_changes?.changed_entries ?? []).filter(
      (item) => toNumber(item.rank_delta) > 0,
    ),
    (item) => makeBucketKey(item),
  );

  const categoryBuckets = groupBy(targetSummary, (item) => String(item.category_id));
  const diffBucketMap = indexBy(
    diffDoc.ranking_changes?.buckets ?? [],
    (item) => makeBucketKey(item),
  );

  return targetSummary.map((item) =>
    buildEvidenceForBucket({
      item,
      diffBucket:
        diffBucketMap.get(makeBucketKey(item)) ?? {
          new_count: 0,
          dropped_count: 0,
          changed_count: 0,
          improved_count: 0,
          declined_count: 0,
          unchanged_count: 0,
        },
      targetBundle,
      diffDoc,
      appMap,
      appChangesByAppId,
      rankingsByBucket,
      entrantsByBucket,
      risersByBucket,
      categoryBuckets,
      snapshotDate: targetBundle.meta?.snapshot_date,
      trendContext,
      externalCatalog,
    }),
  );
}

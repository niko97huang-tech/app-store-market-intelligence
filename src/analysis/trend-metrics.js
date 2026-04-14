import { compactTextList, makeBucketKey, parseDateValue, round, safeDivide, toNumber } from "./helpers.js";

function groupByBucket(trendBundles) {
  const map = new Map();
  for (const bundle of trendBundles) {
    const byBucket = new Map();
    for (const row of bundle.rankings) {
      const key = makeBucketKey(row);
      if (!byBucket.has(key)) {
        byBucket.set(key, []);
      }
      byBucket.get(key).push(row);
    }
    map.set(bundle.meta.run_id, {
      meta: bundle.meta,
      buckets: byBucket,
    });
  }
  return map;
}

function toTopSet(rows, limit = 20) {
  return new Set(
    [...rows]
      .sort((a, b) => toNumber(a.rank, 9999) - toNumber(b.rank, 9999))
      .slice(0, limit)
      .map((row) => String(row.app_id)),
  );
}

function calculateJaccard(a, b) {
  const union = new Set([...a, ...b]);
  if (!union.size) {
    return 1;
  }
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) {
      intersection += 1;
    }
  }
  return intersection / union.size;
}

function buildAppTrajectories(bucketSnapshots) {
  const map = new Map();
  for (const snapshot of bucketSnapshots) {
    for (const row of snapshot.rows) {
      const key = String(row.app_id);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push({
        snapshot_date: snapshot.meta.snapshot_date,
        run_id: snapshot.meta.run_id,
        rank: toNumber(row.rank, 9999),
        app_name: row.app_name,
      });
    }
  }

  for (const value of map.values()) {
    value.sort((a, b) => String(a.snapshot_date).localeCompare(String(b.snapshot_date)));
  }

  return map;
}

function longestImprovementStreak(history) {
  if (history.length < 2) {
    return 0;
  }
  let longest = 0;
  let current = 0;
  for (let i = 1; i < history.length; i += 1) {
    if (history[i].rank < history[i - 1].rank) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function countPresenceDays(history, limit) {
  return history.filter((entry) => entry.rank <= limit).length;
}

function calculateRepeatedRatio(bucketSnapshots, currentTopIds, limit) {
  const currentSet = new Set(
    [...bucketSnapshots[bucketSnapshots.length - 1]?.rows ?? []]
      .sort((a, b) => toNumber(a.rank, 9999) - toNumber(b.rank, 9999))
      .slice(0, limit)
      .map((row) => String(row.app_id)),
  );
  const ids = currentTopIds?.size ? new Set([...currentTopIds].filter((appId) => currentSet.has(appId))) : currentSet;
  const historicalSets = bucketSnapshots
    .slice(0, -1)
    .map((snapshot) => toTopSet(snapshot.rows, limit));
  const repeatedCount = [...ids].filter((appId) =>
    historicalSets.some((set) => set.has(appId)),
  ).length;
  return round(safeDivide(repeatedCount, Math.max(ids.size, 1)), 4);
}

function summarizeWindow(bucketSnapshots, currentTop20) {
  const activeRunCount = bucketSnapshots.length;
  if (!activeRunCount) {
    return {
      active_run_count: 0,
      consecutive_active_run_count: 0,
      repeated_top20_ratio: 0,
      top20_turnover_ratio: 0,
      momentum_app_count: 0,
      sustained_growth_app_count: 0,
      longest_improvement_streak: 0,
      top10_presence_days: 0,
      top20_presence_days: 0,
      top50_presence_days: 0,
      repeated_top10_ratio: 0,
      repeated_top50_ratio: 0,
      cluster_growth_ratio: 0,
      leading_app_share: 0,
      high_rank_presence_days: 0,
      representative_trend_apps: [],
    };
  }

  const top20Sets = bucketSnapshots.map((snapshot) => toTopSet(snapshot.rows, 20));
  const currentTopIds = [...currentTop20];

  const jaccardScores = [];
  for (let i = 1; i < top20Sets.length; i += 1) {
    jaccardScores.push(calculateJaccard(top20Sets[i - 1], top20Sets[i]));
  }

  const trajectories = buildAppTrajectories(bucketSnapshots);
  const momentumApps = [];
  const sustainedGrowthApps = [];
  let longestStreak = 0;
  let top10PresenceDays = 0;
  let top20PresenceDays = 0;
  let top50PresenceDays = 0;
  let highRankPresenceDays = 0;

  for (const [appId, history] of trajectories.entries()) {
    const appearances = history.length;
    longestStreak = Math.max(longestStreak, longestImprovementStreak(history));
    top10PresenceDays += countPresenceDays(history, 10);
    top20PresenceDays += countPresenceDays(history, 20);
    top50PresenceDays += countPresenceDays(history, 50);
    if (history.some((entry) => entry.rank <= 20)) {
      highRankPresenceDays += history.filter((entry) => entry.rank <= 20).length;
    }
    if (appearances >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      if (last.rank < first.rank) {
        momentumApps.push({
          app_id: appId,
          app_name: last.app_name ?? first.app_name ?? null,
          first_rank: first.rank,
          last_rank: last.rank,
          improvement: first.rank - last.rank,
          appearances,
        });
      }
    }
    if (appearances >= 3) {
      let improving = true;
      for (let i = 1; i < history.length; i += 1) {
        if (history[i].rank >= history[i - 1].rank) {
          improving = false;
          break;
        }
      }
      if (improving) {
        sustainedGrowthApps.push({
          app_id: appId,
          app_name: history[history.length - 1].app_name ?? null,
          appearances,
        });
      }
    }
  }

  const totalImprovement = momentumApps.reduce(
    (sum, item) => sum + Math.max(item.improvement, 0),
    0,
  );
  const maxImprovement = momentumApps.reduce(
    (max, item) => Math.max(max, item.improvement),
    0,
  );
  const clusteredGrowthRatio = round(
    safeDivide(momentumApps.filter((item) => item.improvement >= 8).length, Math.max(momentumApps.length, 1)),
    4,
  );

  return {
    active_run_count: activeRunCount,
    consecutive_active_run_count: activeRunCount,
    repeated_top10_ratio: calculateRepeatedRatio(bucketSnapshots, currentTop20, 10),
    repeated_top20_ratio: calculateRepeatedRatio(bucketSnapshots, currentTop20, 20),
    repeated_top50_ratio: calculateRepeatedRatio(bucketSnapshots, currentTop20, 50),
    top20_turnover_ratio: round(
      1 - (jaccardScores.length ? jaccardScores.reduce((sum, score) => sum + score, 0) / jaccardScores.length : 1),
      4,
    ),
    momentum_app_count: momentumApps.length,
    sustained_growth_app_count: sustainedGrowthApps.length,
    longest_improvement_streak: longestStreak,
    top10_presence_days: top10PresenceDays,
    top20_presence_days: top20PresenceDays,
    top50_presence_days: top50PresenceDays,
    cluster_growth_ratio: clusteredGrowthRatio,
    leading_app_share: round(safeDivide(maxImprovement, Math.max(totalImprovement, 1)), 4),
    high_rank_presence_days: highRankPresenceDays,
    representative_trend_apps: compactTextList(
      momentumApps
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 5)
        .map((item) => `${item.app_name} ${item.first_rank}->${item.last_rank}`),
      5,
    ),
  };
}

export function buildTrendMetricsForEvidence(evidence, trendContext) {
  const currentKey = evidence.opportunity_key;
  const currentTop20 = new Set(
    (evidence.app_signals.representative_apps ?? [])
      .filter((app) => toNumber(app.rank, 9999) <= 20)
      .map((app) => String(app.app_id)),
  );

  const bundlesByRun = groupByBucket(trendContext.bundles);
  const targetDate = parseDateValue(
    trendContext.bundles[trendContext.bundles.length - 1]?.meta.snapshot_date,
  );

  const snapshots = trendContext.bundles
    .map((bundle) => {
      const bucketRows = bundlesByRun.get(bundle.meta.run_id)?.buckets.get(currentKey) ?? [];
      return {
        meta: bundle.meta,
        rows: bucketRows,
        date: parseDateValue(bundle.meta.snapshot_date),
      };
    })
    .filter((snapshot) => snapshot.rows.length);

  const windows = {};
  for (const windowDays of trendContext.windows) {
    const scoped = snapshots.filter((snapshot) => {
      if (!snapshot.date || !targetDate) return false;
      const diff = Math.floor((targetDate.getTime() - snapshot.date.getTime()) / (24 * 60 * 60 * 1000));
      return diff <= windowDays;
    });
    windows[`${windowDays}d`] = summarizeWindow(scoped, currentTop20);
  }

  const allRuns = summarizeWindow(snapshots, currentTop20);
  const currentWindow = windows["30d"];
  const multiListResonance = round(
    safeDivide(
      evidence.cross_list_signals?.active_brand_count ?? 0,
      Math.max(evidence.cross_list_signals?.category_brand_count ?? 1, 1),
    ),
    4,
  );
  const averageTop10PresencePerRun = safeDivide(
    currentWindow?.top10_presence_days ?? 0,
    Math.max(currentWindow?.active_run_count ?? 1, 1),
  );
  const averageTop20PresencePerRun = safeDivide(
    currentWindow?.top20_presence_days ?? 0,
    Math.max(currentWindow?.active_run_count ?? 1, 1),
  );
  const momentumBreadthSignal = Math.min((currentWindow?.momentum_app_count ?? 0) / 20, 1);
  const sustainedBreadthSignal = Math.min(
    (currentWindow?.sustained_growth_app_count ?? 0) / 8,
    1,
  );
  const streakSignal = Math.min((currentWindow?.longest_improvement_streak ?? 0) / 3, 1);
  const highRankPresenceSignal = Math.min(
    averageTop10PresencePerRun / 18 + averageTop20PresencePerRun / 35,
    1,
  );
  const stabilitySignal =
    (currentWindow?.repeated_top20_ratio ?? 0) >= 0.45 &&
    (currentWindow?.top20_turnover_ratio ?? 0) <= 0.4;

  return {
    available_run_count: trendContext.bundles.length,
    active_run_count: snapshots.length,
    snapshot_dates: snapshots.map((snapshot) => snapshot.meta.snapshot_date),
    current_window: currentWindow,
    windows,
    trend_pattern:
      currentWindow?.top20_turnover_ratio >= 0.65 &&
      (currentWindow?.repeated_top20_ratio ?? 0) < 0.25
        ? "short_term_heat"
        : currentWindow?.momentum_app_count >= 3 &&
            currentWindow?.cluster_growth_ratio >= 0.35 &&
            currentWindow?.leading_app_share <= 0.55
          ? "clustered_growth"
          : currentWindow?.momentum_app_count >= 1 &&
              ((currentWindow?.leading_app_share ?? 0) > 0.65 ||
                (currentWindow?.cluster_growth_ratio ?? 0) < 0.2)
            ? "single_point_spike"
            : stabilitySignal
              ? "stable_compounding"
              : "mixed",
    trend_strength_score: round(
      Math.min(
        100,
        momentumBreadthSignal * 30 +
          sustainedBreadthSignal * 24 +
          streakSignal * 16 +
          highRankPresenceSignal * 20 +
          multiListResonance * 10,
      ),
    ),
    trend_stability_score: round(
      Math.max(
        0,
        Math.min(
          100,
          (currentWindow?.repeated_top10_ratio ?? 0) * 28 +
            (currentWindow?.repeated_top20_ratio ?? 0) * 30 +
            (currentWindow?.repeated_top50_ratio ?? 0) * 18 +
            multiListResonance * 16 +
            Math.min((currentWindow?.active_run_count ?? 0) * 4, 12) -
            (currentWindow?.top20_turnover_ratio ?? 0) * 34,
        ),
      ),
    ),
    multi_list_resonance_ratio: multiListResonance,
    summary_lines: compactTextList(
      [
        allRuns.active_run_count
          ? `近 ${allRuns.active_run_count} 次快照中持续出现`
          : null,
        allRuns.momentum_app_count
          ? `有 ${allRuns.momentum_app_count} 个应用在窗口内呈现净上升`
          : null,
        allRuns.sustained_growth_app_count
          ? `有 ${allRuns.sustained_growth_app_count} 个应用出现连续改善`
          : null,
        allRuns.longest_improvement_streak
          ? `最长连续改善跨度 ${allRuns.longest_improvement_streak + 1} 次快照`
          : null,
        allRuns.top20_turnover_ratio
          ? `Top20 平均换手率 ${Math.round(allRuns.top20_turnover_ratio * 100)}%`
          : null,
        multiListResonance
          ? `多榜单共振比 ${Math.round(multiListResonance * 100)}%`
          : null,
      ],
      6,
    ),
  };
}

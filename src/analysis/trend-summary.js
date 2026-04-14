import { compactTextList } from "./helpers.js";

export function buildTrendSummary(candidate) {
  const trend = candidate.trend_metrics;
  const currentWindow = trend?.current_window;
  if (!trend || !currentWindow) {
    return {
      trend_verdict: "insufficient_data",
      trend_pattern: "insufficient_data",
      trend_strength: 0,
      trend_stability: 0,
      trend_evidence: [],
      trend_risks: ["缺少足够多的历史 run，暂时无法形成趋势判断"],
    };
  }

  const strength = trend.trend_strength_score ?? 0;
  const stability = trend.trend_stability_score ?? 0;
  const pattern = trend.trend_pattern ?? "mixed";

  const evidence = compactTextList(
    [
      `近 ${trend.active_run_count} 次快照中该方向持续出现`,
      currentWindow.momentum_app_count
        ? `窗口内有 ${currentWindow.momentum_app_count} 个应用净上升`
        : null,
      currentWindow.sustained_growth_app_count
        ? `窗口内有 ${currentWindow.sustained_growth_app_count} 个应用连续改善`
        : null,
      currentWindow.longest_improvement_streak
        ? `最长连续改善跨度 ${currentWindow.longest_improvement_streak + 1} 次快照`
        : null,
      currentWindow.top10_presence_days
        ? `Top10 高位稳定天数 ${currentWindow.top10_presence_days}`
        : null,
      currentWindow.repeated_top20_ratio
        ? `Top20 高位复现率 ${Math.round(currentWindow.repeated_top20_ratio * 100)}%`
        : null,
      trend.multi_list_resonance_ratio
        ? `多榜单共振比 ${Math.round(trend.multi_list_resonance_ratio * 100)}%`
        : null,
    ],
    6,
  );

  const risks = compactTextList(
    [
      currentWindow.top20_turnover_ratio >= 0.6
        ? "高位换手偏高，趋势稳定性不足"
        : null,
      currentWindow.momentum_app_count === 0
        ? "窗口内缺少明确净上升应用"
        : null,
      pattern === "single_point_spike"
        ? "当前更像单点应用拉动，可能不是整簇机会"
        : null,
      pattern === "short_term_heat"
        ? "当前更像短期热度，后续回落风险较高"
        : null,
      trend.active_run_count < 3 ? "历史样本过少，趋势判断仍偏弱" : null,
    ],
    5,
  );

  const verdict =
    strength >= 65 && stability >= 55
      ? "strengthening"
      : strength >= 60 && stability < 45
        ? "strong_but_fragile"
        : strength < 45 && stability >= 55
          ? "weak_but_stable"
          : currentWindow.top20_turnover_ratio >= 0.65
            ? "short_term_heat"
            : "mixed";

  return {
    trend_verdict: verdict,
    trend_pattern: pattern,
    trend_strength: strength,
    trend_stability: stability,
    trend_evidence: evidence,
    trend_risks: risks,
  };
}

export const CONFIDENCE_LABELS = {
  low: "低",
  medium: "中",
  high: "高",
};

export const TREND_VERDICT_LABELS = {
  strengthening: "持续增强",
  mixed: "信号混合",
  noisy: "噪音偏多",
  strong_but_fragile: "强趋势但脆弱",
  weak_but_stable: "弱趋势但稳定",
  short_term_heat: "短期热度",
  insufficient_data: "样本不足",
};

export const TREND_PATTERN_LABELS = {
  clustered_growth: "簇状增长",
  single_point_spike: "单点尖峰",
  stable_compounding: "稳定累积",
  short_term_heat: "短期热度",
  mixed_signal: "混合信号",
  insufficient_data: "样本不足",
};

export function getConfidenceLabel(code) {
  return CONFIDENCE_LABELS[code] ?? code ?? "中";
}

export function getTrendVerdictLabel(code) {
  return TREND_VERDICT_LABELS[code] ?? code ?? "样本不足";
}

export function getTrendPatternLabel(code) {
  return TREND_PATTERN_LABELS[code] ?? code ?? "样本不足";
}

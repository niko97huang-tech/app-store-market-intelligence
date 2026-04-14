import { clamp, compactTextList, confidenceFromScore, round } from "../helpers.js";
import { getConfidenceLabel } from "../output-labels.js";

const FRESHNESS_LABELS = {
  fresh: "新近",
  recent: "近期",
  stale: "较旧",
  unknown: "未知",
};

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function inferFreshness(publishedAt, now = new Date()) {
  const normalized = normalizeDate(publishedAt);
  if (!normalized) {
    return "unknown";
  }
  const diffMs = now.getTime() - new Date(normalized).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) {
    return "fresh";
  }
  if (diffDays <= 30) {
    return "recent";
  }
  return "stale";
}

function normalizeMatchField(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [String(value).trim()].filter(Boolean);
}

function normalizeConfidence(value) {
  if (typeof value === "number") {
    return confidenceFromScore(Math.round(clamp(value * 100, 0, 100)));
  }
  if (["low", "medium", "high"].includes(value)) {
    return value;
  }
  return "medium";
}

export function normalizeExternalEvidenceRecord(raw, now = new Date()) {
  const publishedAt = normalizeDate(raw.published_at);
  const retrievedAt = normalizeDate(raw.retrieved_at) ?? now.toISOString();
  const relevanceScore = round(clamp(Number(raw.relevance_score) || 0.5, 0, 1), 2);

  return {
    signal_type: raw.signal_type ?? "external_signal",
    source_name: raw.source_name ?? "unknown_source",
    source_url: raw.source_url ?? null,
    source_id: raw.source_id ?? null,
    title: raw.title ?? "未命名外部证据",
    published_at: publishedAt,
    retrieved_at: retrievedAt,
    matched_app: normalizeMatchField(raw.matched_app),
    matched_category: normalizeMatchField(raw.matched_category),
    matched_theme: normalizeMatchField(raw.matched_theme),
    match_reason: raw.match_reason ?? "",
    evidence_excerpt: raw.evidence_excerpt ?? null,
    structured_summary: raw.structured_summary ?? null,
    confidence: normalizeConfidence(raw.confidence),
    freshness: raw.freshness ?? inferFreshness(publishedAt, now),
    relevance_score: relevanceScore,
  };
}

export function buildExternalEvidenceConfidence(records) {
  if (!records.length) {
    return {
      level: "low",
      level_label: getConfidenceLabel("low"),
      score: 0,
      explanation: "当前未命中外部证据，系统已降级为仅依赖内部证据运行。",
    };
  }

  const score = Math.round(
    clamp(
      records.reduce((sum, item) => {
        const freshnessBoost =
          item.freshness === "fresh" ? 0.15 : item.freshness === "recent" ? 0.08 : 0.02;
        const confidenceBoost =
          item.confidence === "high" ? 0.2 : item.confidence === "medium" ? 0.12 : 0.04;
        return sum + item.relevance_score * 0.55 + freshnessBoost + confidenceBoost;
      }, 0) /
        records.length *
        100,
      0,
      100,
    ),
  );

  return {
    level: confidenceFromScore(score),
    level_label: getConfidenceLabel(confidenceFromScore(score)),
    score,
    explanation: compactTextList(
      records.slice(0, 3).map(
        (item) =>
          `${item.source_name}：${item.title}（${FRESHNESS_LABELS[item.freshness] ?? item.freshness} / 相关度 ${item.relevance_score}）`,
      ),
      3,
    ).join("；"),
  };
}

export function summarizeExternalEvidence(records) {
  if (!records.length) {
    return [];
  }
  return compactTextList(
    records.map((item) => {
      const excerpt = item.structured_summary ?? item.evidence_excerpt ?? "待补充摘要";
      return `${item.source_name}：${item.title}；${excerpt}`;
    }),
    4,
  );
}

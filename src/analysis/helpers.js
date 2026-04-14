export function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function round(value, digits = 2) {
  return Number(toNumber(value).toFixed(digits));
}

export function safeDivide(numerator, denominator, fallback = 0) {
  const divisor = toNumber(denominator);
  if (!divisor) {
    return fallback;
  }
  return toNumber(numerator) / divisor;
}

export function average(values) {
  const normalized = values.map((value) => toNumber(value)).filter(Boolean);
  if (!normalized.length) {
    return 0;
  }
  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

export function sum(values) {
  return values.reduce((acc, value) => acc + toNumber(value), 0);
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function compareRunMeta(a, b) {
  const snapshotGap = String(b.snapshot_date ?? "").localeCompare(
    String(a.snapshot_date ?? ""),
  );
  if (snapshotGap !== 0) {
    return snapshotGap;
  }
  return String(b.collected_at ?? "").localeCompare(String(a.collected_at ?? ""));
}

export function makeBucketKey(item) {
  return `${item.category_id}__${item.brand}`;
}

export function getListTypeLabel(brand) {
  return (
    {
      free: "免费榜",
      paid: "付费榜",
      grossing: "畅销榜",
    }[brand] ?? brand
  );
}

export function parseDateValue(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function diffDays(fromValue, toValue) {
  const from = parseDateValue(fromValue);
  const to = parseDateValue(toValue);
  if (!from || !to) {
    return null;
  }
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function confidenceFromScore(score) {
  if (score >= 78) return "high";
  if (score >= 52) return "medium";
  return "low";
}

export function verdictFromScore(score, positiveThreshold = 68, mixedThreshold = 45) {
  if (score >= positiveThreshold) return "positive";
  if (score >= mixedThreshold) return "mixed";
  return "negative";
}

export function tokenizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && token.length > 1);
}

export function buildNameConcentration(appNames) {
  const counts = new Map();
  let total = 0;

  for (const name of appNames) {
    for (const token of tokenizeName(name)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
      total += 1;
    }
  }

  if (!total) {
    return {
      unique_token_ratio: 0,
      top_token: null,
      top_token_ratio: 0,
    };
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    unique_token_ratio: round(counts.size / total, 4),
    top_token: sorted[0]?.[0] ?? null,
    top_token_ratio: round((sorted[0]?.[1] ?? 0) / total, 4),
  };
}

export function compactTextList(items, limit = 5) {
  return unique(items).slice(0, limit);
}

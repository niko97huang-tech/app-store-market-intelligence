import { buildExternalEvidenceConfidence, summarizeExternalEvidence } from "./schema.js";
import { sampleExternalEvidenceProvider } from "./providers/sample-provider.js";

const DEFAULT_PROVIDERS = [sampleExternalEvidenceProvider];

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildCandidateMatchContext(evidence) {
  return {
    apps: new Set(
      (evidence.app_signals?.representative_apps ?? [])
        .map((item) => normalizeText(item.app_name))
        .filter(Boolean),
    ),
    category: normalizeText(evidence.category_name),
    themes: new Set(
      [
        ...(evidence.product_tags ?? []),
        evidence.top_genre,
        evidence.brand,
        evidence.list_type,
      ]
        .map((item) => normalizeText(item))
        .filter(Boolean),
    ),
  };
}

function scoreRecordMatch(record, context) {
  const reasons = [];
  let score = 0;

  const appHit = record.matched_app.find((item) => context.apps.has(normalizeText(item)));
  if (appHit) {
    score += 0.6;
    reasons.push(`命中代表应用 ${appHit}`);
  }

  const categoryHit = record.matched_category.find(
    (item) => normalizeText(item) === context.category,
  );
  if (categoryHit) {
    score += 0.25;
    reasons.push(`命中分类 ${categoryHit}`);
  }

  const themeHit = record.matched_theme.find((item) => context.themes.has(normalizeText(item)));
  if (themeHit) {
    score += 0.15;
    reasons.push(`命中主题 ${themeHit}`);
  }

  return {
    score: Math.min(score, 1),
    reasons,
  };
}

export async function loadExternalEvidenceCatalog({ config, now = new Date(), providers = DEFAULT_PROVIDERS }) {
  const providerStatus = [];
  const records = [];

  for (const provider of providers) {
    try {
      const loaded = await provider.loadRecords({ config, now });
      providerStatus.push({
        provider: provider.name,
        status: "ok",
        loaded_count: loaded.length,
      });
      records.push(...loaded.map((item) => ({ ...item, provider: provider.name })));
    } catch (error) {
      providerStatus.push({
        provider: provider.name,
        status: "error",
        loaded_count: 0,
        message: error?.message ?? String(error),
      });
    }
  }

  return {
    provider_status: providerStatus,
    records,
  };
}

export function matchExternalEvidenceForEvidence(evidence, catalog) {
  const context = buildCandidateMatchContext(evidence);
  const matched = (catalog?.records ?? [])
    .map((record) => {
      const match = scoreRecordMatch(record, context);
      return {
        ...record,
        relevance_score:
          match.score > 0
            ? Number(((record.relevance_score ?? 0.5) * match.score).toFixed(2))
            : 0,
        match_reason: record.match_reason || match.reasons.join("；"),
      };
    })
    .filter((record) => (record.relevance_score ?? 0) >= 0.35)
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
    .slice(0, 3);

  return {
    external_evidence: matched,
    external_evidence_summary: summarizeExternalEvidence(matched),
    external_evidence_confidence: buildExternalEvidenceConfidence(matched),
    provider_status: catalog?.provider_status ?? [],
  };
}

import { compactTextList, tokenizeName, unique } from "./helpers.js";

const GENRE_TAGS = {
  Utilities: ["工具"],
  Productivity: ["工具"],
  "Developer Tools": ["工具"],
  Navigation: ["工具"],
  Business: ["工具"],
  Weather: ["工具"],
  Reference: ["工具"],
  "Graphics & Design": ["工具"],
  Education: ["教育"],
  "Health & Fitness": ["健康管理"],
  Medical: ["健康管理"],
  Finance: ["财务管理"],
  Entertainment: ["内容"],
  "Photo & Video": ["内容"],
  Book: ["内容"],
  Music: ["内容"],
  "Social Networking": ["社区"],
};

const AI_KEYWORDS = [
  "ai",
  "gpt",
  "llm",
  "chatbot",
  "assistant",
  "智能",
  "助手",
  "生成",
  "写作",
];

function hasAiKeyword(text) {
  const normalized = String(text ?? "").toLowerCase();
  return AI_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function inferProductTags(evidence) {
  const tags = new Set(GENRE_TAGS[evidence.top_genre]?.slice(0, 2) ?? []);
  const appNames = evidence.app_signals.representative_apps.map((app) => app.app_name);
  const sellerNames = evidence.app_signals.representative_apps.map((app) => app.seller_name);
  const allTexts = [...appNames, ...sellerNames];

  if (allTexts.some(hasAiKeyword)) {
    tags.add("AI");
  }

  if (
    evidence.brand === "grossing" ||
    evidence.monetization_signals.category_has_grossing_presence
  ) {
    tags.add("订阅型");
  }

  const positivePrices = evidence.app_signals.price_points.filter(
    (value) => Number(value) > 0,
  );
  if (evidence.brand === "paid" || positivePrices.length >= 2) {
    tags.add("买断型");
  }

  const topTokens = unique(
    allTexts.flatMap((text) => tokenizeName(text)).slice(0, 20),
  );
  if (topTokens.some((token) => ["community", "social", "club", "圈子"].includes(token))) {
    tags.add("社区");
  }

  return compactTextList([...tags], 4);
}

export function summarizeTags(candidates) {
  const counts = new Map();
  const examples = new Map();

  for (const candidate of candidates) {
    for (const tag of candidate.product_tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
      if (!examples.has(tag)) {
        examples.set(tag, []);
      }
      if (examples.get(tag).length < 3) {
        examples.get(tag).push(candidate.opportunity_name);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({
      tag,
      count,
      example_opportunities: examples.get(tag) ?? [],
    }));
}

export const LOW_CONFIDENCE_CATEGORIES = new Set(["36"]);

export const EXECUTION_GENRE_HINTS = {
  Utilities: 82,
  Productivity: 78,
  "Developer Tools": 80,
  Business: 70,
  Education: 66,
  Navigation: 58,
  "Photo & Video": 60,
  Lifestyle: 68,
  Weather: 72,
  Medical: 52,
  Sports: 64,
  Entertainment: 54,
  "Health & Fitness": 62,
  Book: 65,
  Music: 56,
  "Graphics & Design": 61,
  "Social Networking": 40,
};

export const MONETIZATION_BRAND_HINTS = {
  free: 42,
  paid: 72,
  grossing: 88,
};

export const PANEL_ROLES = [
  "demand_analyst",
  "growth_analyst",
  "monetization_analyst",
  "competition_analyst",
  "evidence_auditor",
  "skeptical_reviewer",
  "decision_chair",
];

export const RECOMMENDATION_ORDER = {
  deprioritize: 0,
  observe: 1,
  research: 2,
  validate: 3,
};

export const ROLE_LABELS = {
  demand_analyst: "需求分析师",
  growth_analyst: "增长分析师",
  monetization_analyst: "商业化分析师",
  competition_analyst: "竞争策略分析师",
  evidence_auditor: "证据审计员",
  skeptical_reviewer: "反方审稿人",
  decision_chair: "最终仲裁官",
};

export const VERDICT_LABELS = {
  positive: "正向",
  mixed: "中性",
  negative: "负向",
};

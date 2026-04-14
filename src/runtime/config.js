import path from "node:path";

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseNumberList(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  return parsed.length ? parsed : fallback;
}

export function getProjectConfig() {
  const dataDir = path.resolve(process.env.APPSTORE_DATA_DIR || "data");
  const runsDir = path.join(dataDir, "runs");
  const diffsDir = path.join(dataDir, "diffs");
  const analysisDir = path.join(dataDir, "analysis");
  const opportunitiesDir = path.join(dataDir, "opportunities");
  const exportsDir = path.join(dataDir, "exports");
  const dashboardsDir = path.join(dataDir, "dashboard");
  const externalEvidenceDir = path.join(dataDir, "external-evidence");

  return {
    dataDir,
    runsDir,
    diffsDir,
    analysisDir,
    opportunitiesDir,
    exportsDir,
    dashboardsDir,
    externalEvidenceDir,
    latestAnalysisDir: path.join(analysisDir, "latest"),
    latestDiffDir: path.join(diffsDir, "latest"),
    latestOpportunitiesDir: path.join(opportunitiesDir, "latest"),
    latestExportsDir: path.join(exportsDir, "latest"),
    latestDashboardDir: path.join(dashboardsDir, "latest"),
    runIndexFile: path.join(runsDir, "index.json"),
    trend: {
      windows: parseNumberList(process.env.APPSTORE_TREND_WINDOWS, [7, 14, 30]),
      maxWindowDays: toNumber(process.env.APPSTORE_TREND_MAX_DAYS, 30),
      maxRuns: toNumber(process.env.APPSTORE_TREND_MAX_RUNS, 10),
      minRankingRows: toNumber(process.env.APPSTORE_TREND_MIN_RANKING_ROWS, 1000),
    },
    logLevel: process.env.APPSTORE_LOG_LEVEL || "info",
  };
}

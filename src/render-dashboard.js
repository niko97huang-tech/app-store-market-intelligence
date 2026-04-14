import fs from "node:fs/promises";
import path from "node:path";
import { compareRunMeta } from "./analysis/helpers.js";
import { buildDashboardLinks, renderDashboardHtml } from "./dashboard/html-template.js";
import { getProjectConfig } from "./runtime/config.js";
import { createLogger } from "./runtime/logger.js";

const config = getProjectConfig();
const logger = createLogger("render-dashboard", config.logLevel);

function parseArgs(argv) {
  const args = {
    analysisId: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--analysis-id" && next) args.analysisId = next;
  }

  return args;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeText(filePath, text) {
  await fs.writeFile(filePath, text, "utf8");
}

async function resolveLatestAnalysisId() {
  const runs = await readJson(config.runIndexFile);
  const sorted = [...runs].sort(compareRunMeta);
  if (sorted.length < 2) {
    throw new Error("至少需要两个 run 才能推导默认 analysis_id");
  }
  return `${sorted[1].run_id}__vs__${sorted[0].run_id}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  logger.info("开始生成 dashboard", { analysisId: options.analysisId });

  const analysisId = options.analysisId ?? (await resolveLatestAnalysisId());
  const analysisDir = path.join(config.analysisDir, analysisId);
  const opportunitiesDir = path.join(config.opportunitiesDir, analysisId);
  const exportsDir = path.join(config.exportsDir, analysisId);
  const dashboardDir = path.join(config.dashboardsDir, analysisId);

  const analysisDoc = await readJson(path.join(analysisDir, "market-analysis.json"));

  await ensureDir(config.dashboardsDir);
  await ensureDir(config.latestDashboardDir);
  await ensureDir(dashboardDir);

  const html = renderDashboardHtml({
    analysisDoc,
    analysisId,
    links: buildDashboardLinks({
      dashboardDir,
      analysisDir,
      opportunitiesDir,
      exportsDir,
    }),
  });

  await writeText(path.join(dashboardDir, "index.html"), html);
  await writeText(path.join(config.latestDashboardDir, "index.html"), html);

  logger.result({
    ok: true,
    analysis_id: analysisId,
    output_dir: dashboardDir,
    entry_file: path.join(dashboardDir, "index.html"),
  });
}

main().catch((error) => {
  logger.error("生成 dashboard 失败", error?.stack ?? String(error));
  process.exitCode = 1;
});

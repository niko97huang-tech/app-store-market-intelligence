import fs from "node:fs/promises";
import path from "node:path";
import { renderOpportunitiesMarkdown } from "./analysis/markdown-renderer.js";
import { compareRunMeta } from "./analysis/helpers.js";
import { getProjectConfig } from "./runtime/config.js";
import { createLogger } from "./runtime/logger.js";

const config = getProjectConfig();
const ANALYSIS_DIR = config.analysisDir;
const OPPORTUNITIES_DIR = config.opportunitiesDir;
const LATEST_DIR = config.latestOpportunitiesDir;
const RUN_INDEX_FILE = config.runIndexFile;
const logger = createLogger("generate-opportunities", config.logLevel);

function parseArgs(argv) {
  const args = {
    analysisId: null,
    topN: 8,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--analysis-id" && next) args.analysisId = next;
    if (current === "--top-n" && next) args.topN = Number(next);
  }

  if (!Number.isFinite(args.topN) || args.topN < 1) {
    throw new Error("--top-n 必须是大于等于 1 的数字");
  }

  return args;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeText(filePath, text) {
  await fs.writeFile(filePath, `${text.trimEnd()}\n`, "utf8");
}

async function resolveLatestAnalysisId() {
  const runs = await readJson(RUN_INDEX_FILE);
  const sorted = [...runs].sort(compareRunMeta);
  if (sorted.length < 2) {
    throw new Error("至少需要两个 run 才能推导默认 analysis_id");
  }
  return `${sorted[1].run_id}__vs__${sorted[0].run_id}`;
}

function buildOpportunityDocument(analysisDoc, topN) {
  const opportunities = analysisDoc.opportunity_decision_cards.slice(0, topN);
  return {
    analysis_id: analysisDoc.analysis_id,
    report_version: analysisDoc.report_version,
    base_run_id: analysisDoc.base_run.run_id,
    target_run_id: analysisDoc.target_run.run_id,
    generated_at: new Date().toISOString(),
    summary_notes: [
      "优先看最终建议为“快速验证”或“深入研究”的方向。",
      "若证据审计员认为证据不足，即使总分高也应先停留在“继续观察”。",
      "负面结论同样有价值，可帮助快速排除噪音赛道。",
    ],
    opportunities,
    negative_findings: analysisDoc.negative_findings,
    final_decisions: analysisDoc.final_decisions,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  logger.info("开始生成机会清单", {
    analysisId: options.analysisId,
    topN: options.topN,
  });
  const analysisId = options.analysisId ?? (await resolveLatestAnalysisId());
  const analysisDoc = await readJson(
    path.join(ANALYSIS_DIR, analysisId, "market-analysis.json"),
  );
  const opportunityDoc = buildOpportunityDocument(analysisDoc, options.topN);

  await ensureDir(OPPORTUNITIES_DIR);
  await ensureDir(LATEST_DIR);
  const outDir = path.join(OPPORTUNITIES_DIR, analysisId);
  await ensureDir(outDir);

  const markdown = renderOpportunitiesMarkdown(opportunityDoc);
  await writeJson(path.join(outDir, "opportunities.json"), opportunityDoc);
  await writeText(path.join(outDir, "opportunities.md"), markdown);
  await writeJson(path.join(LATEST_DIR, "opportunities.json"), opportunityDoc);
  await writeText(path.join(LATEST_DIR, "opportunities.md"), markdown);

  logger.result({
    ok: true,
    analysis_id: analysisId,
    output_dir: outDir,
    opportunity_count: opportunityDoc.opportunities.length,
  });
}

main().catch((error) => {
  logger.error("生成机会清单失败", error?.stack ?? String(error));
  process.exitCode = 1;
});

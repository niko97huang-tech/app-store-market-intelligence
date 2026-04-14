import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { getProjectConfig } from "./runtime/config.js";

const config = getProjectConfig();

function parseArgs(argv) {
  const args = {
    baseRunId: null,
    targetRunId: null,
    topN: 10,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--base-run-id" && next) args.baseRunId = next;
    if (current === "--target-run-id" && next) args.targetRunId = next;
    if (current === "--top-n" && next) args.topN = Number(next);
  }

  if (!args.baseRunId || !args.targetRunId) {
    throw new Error("verify-regression 需要同时提供 --base-run-id 和 --target-run-id");
  }

  return args;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} 失败，exit code=${code}`));
    });
    child.on("error", reject);
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function assertFile(filePath) {
  await fs.access(filePath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const analysisId = `${options.baseRunId}__vs__${options.targetRunId}`;

  await run("node", [
    "src/run-pipeline.js",
    "--base-run-id",
    options.baseRunId,
    "--target-run-id",
    options.targetRunId,
    "--top-n",
    String(options.topN),
  ]);

  const analysisFile = path.join(
    config.analysisDir,
    analysisId,
    "market-analysis.json",
  );
  const mdFile = path.join(config.analysisDir, analysisId, "market-analysis.md");
  const decisionsCsv = path.join(
    config.exportsDir,
    analysisId,
    "opportunity_decision_cards.csv",
  );
  const scoreCsv = path.join(
    config.exportsDir,
    analysisId,
    "score_breakdown.csv",
  );
  const dashboardFile = path.join(
    config.dashboardsDir,
    analysisId,
    "index.html",
  );

  await Promise.all([
    assertFile(analysisFile),
    assertFile(mdFile),
    assertFile(decisionsCsv),
    assertFile(scoreCsv),
    assertFile(dashboardFile),
  ]);

  const analysisDoc = await readJson(analysisFile);
  const firstCard = analysisDoc.opportunity_decision_cards?.[0];
  if (!analysisDoc.executive_summary || !firstCard) {
    throw new Error("analysis 输出缺少 executive_summary 或 opportunity_decision_cards");
  }
  if (!("trend_verdict" in firstCard) || !("trend_metrics" in firstCard)) {
    throw new Error("analysis 输出缺少趋势增强字段");
  }
  if (!Array.isArray(firstCard.product_tags) || !Array.isArray(firstCard.likely_drivers)) {
    throw new Error("analysis 输出缺少标签或归因字段");
  }
  if (!analysisDoc.panel_reviews?.length || !analysisDoc.final_decisions?.length) {
    throw new Error("analysis 输出缺少多角色评审或最终决策");
  }
  if (analysisDoc.report_version !== "v3-public-preview") {
    throw new Error(`analysis report_version 异常: ${analysisDoc.report_version}`);
  }
  if (!Array.isArray(firstCard.trend_evidence)) {
    throw new Error("首个决策卡缺少 trend_evidence 数组");
  }
  if (!Array.isArray(firstCard.observations) || !Array.isArray(firstCard.competing_explanations)) {
    throw new Error("首个决策卡缺少 Evidence Schema V3 关键字段");
  }
  if (!firstCard.action_readiness || !firstCard.evidence_confidence) {
    throw new Error("首个决策卡缺少 action_readiness 或 evidence_confidence");
  }
  if (!firstCard.ladder_signals || !("evidence_strength" in firstCard.ladder_signals)) {
    throw new Error("首个决策卡缺少 Recommendation Ladder 信号摘要");
  }
  if (!firstCard.score_breakdown || !("persistence_score" in firstCard.score_breakdown)) {
    throw new Error("首个决策卡缺少 score_breakdown.persistence_score");
  }
  if (!analysisDoc.executive_summary.top_opportunities?.length) {
    throw new Error("analysis 输出缺少 top_opportunities");
  }
  if (!Array.isArray(analysisDoc.tag_summary) || !analysisDoc.attribution_summary) {
    throw new Error("analysis 输出缺少 tag_summary 或 attribution_summary");
  }
  if (!analysisDoc.external_evidence_overview) {
    throw new Error("analysis 输出缺少 external_evidence_overview");
  }
  if (!("external_evidence_summary" in firstCard) || !("external_evidence_confidence" in firstCard)) {
    throw new Error("首个决策卡缺少 external evidence 字段");
  }
  if (!firstCard.recommendation_code || !firstCard.recommendation) {
    throw new Error("首个决策卡缺少最终建议编码或中文建议");
  }
  if (!["继续观察", "深入研究", "快速验证", "暂不优先"].includes(firstCard.recommendation)) {
    throw new Error(`首个决策卡 recommendation 不是中文动作标签: ${firstCard.recommendation}`);
  }
  if (!analysisDoc.final_decisions?.[0]?.final_recommendation_code) {
    throw new Error("analysis 输出缺少 final_recommendation_code");
  }
  if (!("ladder_evidence_strength" in analysisDoc.final_decisions?.[0] ?? {})) {
    throw new Error("analysis 最终决策缺少 ladder 信号字段");
  }
  const externalEvidenceCount = analysisDoc.opportunity_decision_cards.reduce(
    (sum, card) => sum + (card.external_evidence?.length ?? 0),
    0,
  );
  if (externalEvidenceCount < 1) {
    throw new Error("当前标准样例未命中任何外部证据，说明 External Evidence Layer 未接通");
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        analysis_id: analysisId,
        verified_files: [analysisFile, mdFile, decisionsCsv, scoreCsv, dashboardFile],
        top_opportunity_count: analysisDoc.executive_summary.top_opportunities.length,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? String(error)}\n`);
  process.exitCode = 1;
});

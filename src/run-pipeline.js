import { spawn } from "node:child_process";
import { getProjectConfig } from "./runtime/config.js";
import { createLogger } from "./runtime/logger.js";

const activeChildren = new Set();
const config = getProjectConfig();
const logger = createLogger("run-pipeline", config.logLevel);

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

  return args;
}

function terminateChild(child, signal = "SIGTERM") {
  if (!child || child.killed) {
    return;
  }

  try {
    child.kill(signal);
  } catch {}
}

function cleanupChildren(signal = "SIGTERM") {
  for (const child of activeChildren) {
    terminateChild(child, signal);
  }
}

function registerProcessCleanup() {
  let cleaned = false;

  const cleanupAndExit = (signal) => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    cleanupChildren(signal);
  };

  process.on("SIGINT", () => {
    cleanupAndExit("SIGINT");
    process.exit(130);
  });

  process.on("SIGTERM", () => {
    cleanupAndExit("SIGTERM");
    process.exit(143);
  });

  process.on("exit", () => {
    cleanupAndExit("SIGTERM");
  });
}

function runNodeScript(script, args) {
  return new Promise((resolve, reject) => {
    logger.info("执行子任务", { script, args });
    const child = spawn("node", [script, ...args], {
      stdio: "inherit",
    });
    activeChildren.add(child);

    child.on("exit", (code) => {
      activeChildren.delete(child);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${script} 执行失败，exit code=${code}`));
    });

    child.on("error", (error) => {
      activeChildren.delete(child);
      reject(error);
    });
  });
}

async function main() {
  registerProcessCleanup();
  const options = parseArgs(process.argv.slice(2));
  logger.info("开始执行 pipeline", options);
  const diffArgs = [];
  const analyzeArgs = [];
  const opportunitiesArgs = ["--top-n", String(options.topN)];
  const exportArgs = [];
  const dashboardArgs = [];

  if (options.baseRunId) {
    diffArgs.push("--base-run-id", options.baseRunId);
    analyzeArgs.push("--base-run-id", options.baseRunId);
  }
  if (options.targetRunId) {
    diffArgs.push("--target-run-id", options.targetRunId);
    analyzeArgs.push("--target-run-id", options.targetRunId);
  }
  analyzeArgs.push("--top-n", String(options.topN));
  const analysisId =
    options.baseRunId && options.targetRunId
      ? `${options.baseRunId}__vs__${options.targetRunId}`
      : null;
  if (analysisId) {
    opportunitiesArgs.push("--analysis-id", analysisId);
    exportArgs.push("--analysis-id", analysisId);
    dashboardArgs.push("--analysis-id", analysisId);
  }

  await runNodeScript("src/diff-runs.js", diffArgs);
  await runNodeScript("src/analyze-market.js", analyzeArgs);
  await runNodeScript("src/generate-opportunities.js", opportunitiesArgs);
  await runNodeScript("src/export-insights.js", exportArgs);
  await runNodeScript("src/render-dashboard.js", dashboardArgs);
}

main().catch((error) => {
  logger.error("pipeline 执行失败", error?.stack ?? String(error));
  process.exitCode = 1;
});

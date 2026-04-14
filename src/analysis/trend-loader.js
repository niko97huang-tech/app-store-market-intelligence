import fs from "node:fs/promises";
import path from "node:path";
import { compareRunMeta, parseDateValue } from "./helpers.js";
import { getProjectConfig } from "../runtime/config.js";

const config = getProjectConfig();
const RUNS_DIR = config.runsDir;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function dateDiffInDays(fromDate, toDate) {
  if (!fromDate || !toDate) {
    return Infinity;
  }
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function collapseRunsBySnapshotDate(runs) {
  const picked = new Map();
  for (const run of runs) {
    if (!picked.has(run.snapshot_date)) {
      picked.set(run.snapshot_date, run);
    }
  }
  return [...picked.values()];
}

export function pickTrendRuns(runIndex, targetMeta, options = {}) {
  const {
    maxWindowDays = config.trend.maxWindowDays,
    maxRuns = config.trend.maxRuns,
    minRankingRows = config.trend.minRankingRows,
  } = options;

  const targetDate = parseDateValue(targetMeta.snapshot_date);
  const sorted = [...runIndex].sort(compareRunMeta);
  const candidates = sorted.filter((run) => {
    const snapshotDate = parseDateValue(run.snapshot_date);
    return (
      run.country === targetMeta.country &&
      run.device === targetMeta.device &&
      run.category_count === targetMeta.category_count &&
      run.pages === targetMeta.pages &&
      run.ranking_row_count >= minRankingRows &&
      snapshotDate &&
      snapshotDate <= targetDate &&
      dateDiffInDays(snapshotDate, targetDate) <= maxWindowDays
    );
  });

  return collapseRunsBySnapshotDate(candidates).slice(0, maxRuns).reverse();
}

export async function loadTrendRuns(runIndex, targetMeta, options = {}) {
  const runs = pickTrendRuns(runIndex, targetMeta, options);
  const bundles = await Promise.all(
    runs.map(async (run) => {
      const runDir = path.join(RUNS_DIR, run.run_id);
      const rankings = await readJson(path.join(runDir, "rankings.json"));
      return {
        meta: run,
        rankings,
      };
    }),
  );

  return {
    runs,
    bundles,
    windows: options.windows ?? config.trend.windows,
  };
}

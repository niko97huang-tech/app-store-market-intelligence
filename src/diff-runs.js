import fs from "node:fs/promises";
import path from "node:path";
import { getProjectConfig } from "./runtime/config.js";
import { createLogger } from "./runtime/logger.js";

const config = getProjectConfig();
const DIFFS_DIR = config.diffsDir;
const LATEST_DIFF_DIR = config.latestDiffDir;
const RUN_INDEX_FILE = config.runIndexFile;
const logger = createLogger("diff-runs", config.logLevel);

function parseArgs(argv) {
  const args = {
    baseRunId: null,
    targetRunId: null,
    topChanges: 200,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--base-run-id" && next) args.baseRunId = next;
    if (current === "--target-run-id" && next) args.targetRunId = next;
    if (current === "--top-changes" && next) args.topChanges = Number(next);
  }

  if (!Number.isFinite(args.topChanges) || args.topChanges < 1) {
    throw new Error("--top-changes 必须是大于等于 1 的数字");
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

function pickRuns(index, options) {
  if (!index.length) {
    throw new Error("还没有任何 runs 数据，先执行一次采集");
  }

  const target =
    index.find((item) => item.run_id === options.targetRunId) ??
    (options.targetRunId ? null : index[0]);
  if (!target) {
    throw new Error(`没有找到 target run: ${options.targetRunId}`);
  }

  const base =
    index.find((item) => item.run_id === options.baseRunId) ??
    (options.baseRunId
      ? null
      : index.find((item) => item.run_id !== target.run_id));
  if (!base) {
    throw new Error(
      options.baseRunId
        ? `没有找到 base run: ${options.baseRunId}`
        : "至少需要两个 run 才能做 diff",
    );
  }

  return { base, target };
}

function buildRankingKey(row) {
  return `${row.category_id}__${row.brand}__${row.app_id}`;
}

function buildBucketKey(row) {
  return `${row.category_id}__${row.brand}`;
}

function buildBucketLabel(row) {
  return `${row.category_name} / ${row.brand_name}`;
}

function summarizeRankings(baseRankings, targetRankings, topChanges) {
  const baseMap = new Map(baseRankings.map((row) => [buildRankingKey(row), row]));
  const targetMap = new Map(
    targetRankings.map((row) => [buildRankingKey(row), row]),
  );
  const bucketMap = new Map();
  const newEntries = [];
  const droppedEntries = [];
  const changedEntries = [];

  function ensureBucket(rowLike) {
    const key = buildBucketKey(rowLike);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        category_id: rowLike.category_id,
        category_name: rowLike.category_name,
        brand: rowLike.brand,
        brand_name: rowLike.brand_name,
        bucket_label: buildBucketLabel(rowLike),
        new_count: 0,
        dropped_count: 0,
        changed_count: 0,
        improved_count: 0,
        declined_count: 0,
        unchanged_count: 0,
      });
    }
    return bucketMap.get(key);
  }

  for (const targetRow of targetRankings) {
    const baseRow = baseMap.get(buildRankingKey(targetRow));
    const bucket = ensureBucket(targetRow);

    if (!baseRow) {
      bucket.new_count += 1;
      newEntries.push({
        category_id: targetRow.category_id,
        category_name: targetRow.category_name,
        brand: targetRow.brand,
        brand_name: targetRow.brand_name,
        app_id: targetRow.app_id,
        app_name: targetRow.app_name,
        publisher_name: targetRow.publisher_name,
        current_rank: targetRow.rank,
      });
      continue;
    }

    const previousRank = Number(baseRow.rank);
    const currentRank = Number(targetRow.rank);
    const delta = previousRank - currentRank;

    if (delta === 0) {
      bucket.unchanged_count += 1;
      continue;
    }

    bucket.changed_count += 1;
    if (delta > 0) {
      bucket.improved_count += 1;
    } else {
      bucket.declined_count += 1;
    }

    changedEntries.push({
      category_id: targetRow.category_id,
      category_name: targetRow.category_name,
      brand: targetRow.brand,
      brand_name: targetRow.brand_name,
      app_id: targetRow.app_id,
      app_name: targetRow.app_name,
      publisher_name: targetRow.publisher_name,
      previous_rank: baseRow.rank,
      current_rank: targetRow.rank,
      rank_delta: delta,
    });
  }

  for (const baseRow of baseRankings) {
    if (targetMap.has(buildRankingKey(baseRow))) {
      continue;
    }
    const bucket = ensureBucket(baseRow);
    bucket.dropped_count += 1;
    droppedEntries.push({
      category_id: baseRow.category_id,
      category_name: baseRow.category_name,
      brand: baseRow.brand,
      brand_name: baseRow.brand_name,
      app_id: baseRow.app_id,
      app_name: baseRow.app_name,
      publisher_name: baseRow.publisher_name,
      previous_rank: baseRow.rank,
    });
  }

  const buckets = [...bucketMap.values()].sort((a, b) => {
    const changedGap =
      b.changed_count + b.new_count + b.dropped_count -
      (a.changed_count + a.new_count + a.dropped_count);
    if (changedGap !== 0) return changedGap;
    return a.bucket_label.localeCompare(b.bucket_label, "zh-CN");
  });

  const sortedChangedEntries = changedEntries.sort((a, b) => {
    const absGap = Math.abs(b.rank_delta) - Math.abs(a.rank_delta);
    if (absGap !== 0) return absGap;
    return a.current_rank - b.current_rank;
  });

  return {
    summary: {
      base_row_count: baseRankings.length,
      target_row_count: targetRankings.length,
      new_entry_count: newEntries.length,
      dropped_entry_count: droppedEntries.length,
      changed_entry_count: changedEntries.length,
      improved_entry_count: changedEntries.filter((item) => item.rank_delta > 0)
        .length,
      declined_entry_count: changedEntries.filter((item) => item.rank_delta < 0)
        .length,
    },
    buckets,
    new_entries: newEntries
      .sort((a, b) => a.current_rank - b.current_rank)
      .slice(0, topChanges),
    dropped_entries: droppedEntries
      .sort((a, b) => a.previous_rank - b.previous_rank)
      .slice(0, topChanges),
    changed_entries: sortedChangedEntries.slice(0, topChanges),
  };
}

function diffAppFields(baseApp, targetApp) {
  const fields = [
    "trackName",
    "sellerName",
    "primaryGenreName",
    "version",
    "currentVersionReleaseDate",
    "releaseDate",
    "price",
    "formattedPrice",
    "averageUserRating",
    "averageUserRatingForCurrentVersion",
    "userRatingCount",
    "userRatingCountForCurrentVersion",
    "minimumOsVersion",
    "contentAdvisoryRating",
  ];

  const changes = [];
  for (const field of fields) {
    const before = baseApp[field] ?? null;
    const after = targetApp[field] ?? null;
    if (JSON.stringify(before) === JSON.stringify(after)) {
      continue;
    }
    changes.push({ field, before, after });
  }
  return changes;
}

function summarizeApps(baseApps, targetApps, topChanges) {
  const baseMap = new Map(baseApps.map((app) => [String(app.trackId), app]));
  const targetMap = new Map(targetApps.map((app) => [String(app.trackId), app]));
  const newApps = [];
  const removedApps = [];
  const changedApps = [];

  for (const targetApp of targetApps) {
    const baseApp = baseMap.get(String(targetApp.trackId));
    if (!baseApp) {
      newApps.push({
        app_id: String(targetApp.trackId),
        trackName: targetApp.trackName,
        sellerName: targetApp.sellerName,
        primaryGenreName: targetApp.primaryGenreName,
        version: targetApp.version,
      });
      continue;
    }

    const changes = diffAppFields(baseApp, targetApp);
    if (!changes.length) {
      continue;
    }

    changedApps.push({
      app_id: String(targetApp.trackId),
      trackName: targetApp.trackName,
      sellerName: targetApp.sellerName,
      primaryGenreName: targetApp.primaryGenreName,
      changed_field_count: changes.length,
      changed_fields: changes,
    });
  }

  for (const baseApp of baseApps) {
    if (targetMap.has(String(baseApp.trackId))) {
      continue;
    }
    removedApps.push({
      app_id: String(baseApp.trackId),
      trackName: baseApp.trackName,
      sellerName: baseApp.sellerName,
      primaryGenreName: baseApp.primaryGenreName,
      version: baseApp.version,
    });
  }

  return {
    summary: {
      base_app_count: baseApps.length,
      target_app_count: targetApps.length,
      new_app_count: newApps.length,
      removed_app_count: removedApps.length,
      changed_app_count: changedApps.length,
    },
    new_apps: newApps
      .sort((a, b) => String(a.trackName).localeCompare(String(b.trackName), "zh-CN"))
      .slice(0, topChanges),
    removed_apps: removedApps
      .sort((a, b) => String(a.trackName).localeCompare(String(b.trackName), "zh-CN"))
      .slice(0, topChanges),
    changed_apps: changedApps
      .sort((a, b) => b.changed_field_count - a.changed_field_count)
      .slice(0, topChanges),
  };
}

async function loadRunBundle(runId) {
  const runDir = path.join(config.runsDir, runId);
  const [meta, rankings, apps, summary] = await Promise.all([
    readJson(path.join(runDir, "run.json")),
    readJson(path.join(runDir, "rankings.json")),
    readJson(path.join(runDir, "apps.json")),
    readJson(path.join(runDir, "summary.json")),
  ]);

  return { runDir, meta, rankings, apps, summary };
}

function buildDiffDocument({ baseBundle, targetBundle, rankingDiff, appDiff }) {
  return {
    diff_id: `${baseBundle.meta.run_id}__vs__${targetBundle.meta.run_id}`,
    generated_at: new Date().toISOString(),
    base_run: baseBundle.meta,
    target_run: targetBundle.meta,
    ranking_changes: rankingDiff,
    app_changes: appDiff,
  };
}

async function writeDiffOutputs(diffDoc) {
  await ensureDir(DIFFS_DIR);
  await ensureDir(LATEST_DIFF_DIR);

  const diffDir = path.join(DIFFS_DIR, diffDoc.diff_id);
  await ensureDir(diffDir);

  await writeJson(path.join(diffDir, "diff.json"), diffDoc);
  await writeJson(path.join(LATEST_DIFF_DIR, "diff.json"), diffDoc);

  return diffDir;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  logger.info("开始生成 diff", {
    baseRunId: options.baseRunId,
    targetRunId: options.targetRunId,
    topChanges: options.topChanges,
  });
  const runIndex = await readJson(RUN_INDEX_FILE);
  const { base, target } = pickRuns(runIndex, options);

  const [baseBundle, targetBundle] = await Promise.all([
    loadRunBundle(base.run_id),
    loadRunBundle(target.run_id),
  ]);

  const rankingDiff = summarizeRankings(
    baseBundle.rankings,
    targetBundle.rankings,
    options.topChanges,
  );
  const appDiff = summarizeApps(
    baseBundle.apps,
    targetBundle.apps,
    options.topChanges,
  );

  const diffDoc = buildDiffDocument({
    baseBundle,
    targetBundle,
    rankingDiff,
    appDiff,
  });
  const diffDir = await writeDiffOutputs(diffDoc);

  logger.result({
    ok: true,
    diff_id: diffDoc.diff_id,
    base_run_id: base.run_id,
    target_run_id: target.run_id,
    diff_dir: diffDir,
    ranking_changes: diffDoc.ranking_changes.summary,
    app_changes: diffDoc.app_changes.summary,
  });
}

main().catch((error) => {
  logger.error("生成 diff 失败", error?.stack ?? String(error));
  process.exitCode = 1;
});

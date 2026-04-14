import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { getProjectConfig } from "./runtime/config.js";
import { createLogger } from "./runtime/logger.js";

const config = getProjectConfig();
const OUTPUT_DIR = config.dataDir;
const RUNS_DIR = config.runsDir;
const LATEST_DIR = path.join(OUTPUT_DIR, "latest");
const RUN_INDEX_FILE = config.runIndexFile;
const logger = createLogger("collect", config.logLevel);
const DEFAULT_COUNTRY = "cn";
const DEFAULT_DEVICE = "iphone";
const TODAY = new Date().toISOString().slice(0, 10);

const BRANDS = [
  { key: "free", brandId: 1, label: "免费榜" },
  { key: "paid", brandId: 0, label: "付费榜" },
  { key: "grossing", brandId: 2, label: "畅销榜" },
];

const APP_CATEGORIES = [
  { name: "全部应用", param: "5000" },
  { name: "儿童", param: "36", skipBrands: ["grossing"] },
  { name: "财务", param: "6015" },
  { name: "参考", param: "6006" },
  { name: "导航", param: "6010" },
  { name: "工具", param: "6002" },
  { name: "购物", param: "6024" },
  { name: "健康健美", param: "6013" },
  { name: "教育", param: "6017" },
  { name: "旅游", param: "6003" },
  { name: "美食佳饮", param: "6023" },
  { name: "软件开发工具", param: "6026" },
  { name: "商务", param: "6000" },
  { name: "社交", param: "6005" },
  { name: "摄影与录像", param: "6008" },
  { name: "生活", param: "6012" },
  { name: "体育", param: "6004" },
  { name: "天气", param: "6001" },
  { name: "图书", param: "6018" },
  { name: "图形和设计", param: "6027" },
  { name: "效率", param: "6007" },
  { name: "新闻", param: "6009" },
  { name: "医疗", param: "6020" },
  { name: "音乐", param: "6011" },
  { name: "娱乐", param: "6016" },
];

function parseArgs(argv) {
  const args = {
    country: DEFAULT_COUNTRY,
    device: DEFAULT_DEVICE,
    date: TODAY,
    pages: 10,
    categories: APP_CATEGORIES,
    runId: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--country" && next) args.country = next;
    if (current === "--device" && next) args.device = next;
    if (current === "--date" && next) args.date = next;
    if (current === "--pages" && next) args.pages = Number(next);
    if (current === "--run-id" && next) args.runId = next;
    if (current === "--categories" && next) {
      const wanted = new Set(
        next
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
      args.categories = APP_CATEGORIES.filter(
        (category) => wanted.has(category.param) || wanted.has(category.name),
      );
    }
  }

  if (!Number.isFinite(args.pages) || args.pages < 1) {
    throw new Error("--pages 必须是大于等于 1 的数字");
  }
  if (!args.categories.length) {
    throw new Error("没有匹配到任何分类，请检查 --categories 参数");
  }
  return args;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readJsonIfExists(filePath, fallbackValue) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallbackValue;
  }
}

function buildRunId(providedRunId) {
  if (providedRunId) {
    return providedRunId;
  }

  const now = new Date();
  const compact = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `run_${compact}`;
}

function buildRunContext(options) {
  const collectedAt = new Date().toISOString();
  const runId = buildRunId(options.runId);
  return {
    runId,
    collectedAt,
    snapshotDate: options.date,
    country: options.country,
    device: options.device,
    pages: options.pages,
  };
}

function attachRankSnapshotMeta(rankings, runContext) {
  return rankings.map((row) => ({
    run_id: runContext.runId,
    collected_at: runContext.collectedAt,
    ...row,
  }));
}

function attachAppSnapshotMeta(appDetails, runContext) {
  return appDetails.map((item) => ({
    run_id: runContext.runId,
    collected_at: runContext.collectedAt,
    snapshot_date: runContext.snapshotDate,
    country: runContext.country,
    device: runContext.device,
    ...item,
  }));
}

function buildRunMeta(runContext, categories, rankings, appDetails, summary) {
  return {
    run_id: runContext.runId,
    collected_at: runContext.collectedAt,
    snapshot_date: runContext.snapshotDate,
    country: runContext.country,
    device: runContext.device,
    pages: runContext.pages,
    category_count: categories.length,
    ranking_row_count: rankings.length,
    ranking_app_count: new Set(rankings.map((item) => item.app_id)).size,
    app_detail_count: appDetails.length,
    summary_row_count: summary.length,
  };
}

async function updateRunIndex(meta) {
  const current = await readJsonIfExists(RUN_INDEX_FILE, []);
  const next = [
    meta,
    ...current.filter((item) => item.run_id !== meta.run_id),
  ].sort((a, b) => compareRunMeta(b, a));
  await writeJson(RUN_INDEX_FILE, next);
  return next;
}

function compareRunMeta(a, b) {
  const snapshotGap = String(a.snapshot_date ?? "").localeCompare(
    String(b.snapshot_date ?? ""),
  );
  if (snapshotGap !== 0) {
    return snapshotGap;
  }

  return String(a.collected_at ?? "").localeCompare(String(b.collected_at ?? ""));
}

async function mirrorRunDirToLatest(runDir) {
  await writeJson(
    path.join(LATEST_DIR, "run.json"),
    await readJsonIfExists(path.join(runDir, "run.json"), null),
  );
  await writeJson(
    path.join(LATEST_DIR, "categories.json"),
    await readJsonIfExists(path.join(runDir, "categories.json"), []),
  );
  await writeJson(
    path.join(LATEST_DIR, "rankings.json"),
    await readJsonIfExists(path.join(runDir, "rankings.json"), []),
  );
  await writeJson(
    path.join(LATEST_DIR, "apps.json"),
    await readJsonIfExists(path.join(runDir, "apps.json"), []),
  );
  await writeJson(
    path.join(LATEST_DIR, "summary.json"),
    await readJsonIfExists(path.join(runDir, "summary.json"), []),
  );
}

async function writeVersionedOutputs({
  runContext,
  categories,
  rankings,
  appDetails,
  summary,
  meta,
}) {
  const runDir = path.join(RUNS_DIR, runContext.runId);
  await ensureDir(runDir);
  await ensureDir(LATEST_DIR);

  const runFiles = {
    meta: path.join(runDir, "run.json"),
    categories: path.join(runDir, "categories.json"),
    rankings: path.join(runDir, "rankings.json"),
    apps: path.join(runDir, "apps.json"),
    summary: path.join(runDir, "summary.json"),
  };

  await writeJson(runFiles.meta, meta);
  await writeJson(runFiles.categories, categories);
  await writeJson(runFiles.rankings, rankings);
  await writeJson(runFiles.apps, appDetails);
  await writeJson(runFiles.summary, summary);

  // Keep the old top-level dated files for compatibility with existing analysis scripts.
  const stamp = `${runContext.country}_${runContext.device}_${runContext.snapshotDate}`;
  await writeJson(
    path.join(OUTPUT_DIR, `categories_${stamp}.json`),
    categories,
  );
  await writeJson(path.join(OUTPUT_DIR, `rankings_${stamp}.json`), rankings);
  await writeJson(path.join(OUTPUT_DIR, `apps_${stamp}.json`), appDetails);
  await writeJson(path.join(OUTPUT_DIR, `summary_${stamp}.json`), summary);

  const updatedIndex = await updateRunIndex(meta);
  const latestMeta = updatedIndex[0];
  if (latestMeta?.run_id) {
    await mirrorRunDirToLatest(path.join(RUNS_DIR, latestMeta.run_id));
  }

  return { runDir };
}

async function fetchJsonInPage(page, endpoint, params) {
  const result = await page.evaluate(
    async ({ endpointValue, paramsValue }) => {
      const vueRoot = document.querySelector("#app")?.__vue__;
      if (!vueRoot?.$http?.get) {
        return {
          ok: false,
          status: 500,
          textSample: "页面运行态里没有拿到 Vue $http 客户端",
          json: null,
        };
      }

      try {
        const response = await vueRoot.$http.get(endpointValue, {
          params: paramsValue,
        });
        return {
          ok: true,
          status: 200,
          textSample: "",
          json: response?.data ?? null,
        };
      } catch (error) {
        return {
          ok: false,
          status: 500,
          textSample: String(error?.message ?? error),
          json: null,
        };
      }
    },
    { endpointValue: endpoint, paramsValue: params },
  );

  if (!result.ok) {
    throw new Error(`请求失败 ${endpoint}，HTTP ${result.status}`);
  }
  if (!result.json) {
    throw new Error(`接口没有返回 JSON: ${endpoint}\n${result.textSample}`);
  }
  return result.json;
}

async function openQimaiContext(browser, { country, device, date }) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const seedUrl = `https://www.qimai.cn/rank/index/brand/all/device/${device}/country/${country}/genre/5000`;
  await page.goto(seedUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  return { context, page };
}

function normalizeRankItem(raw, meta) {
  const appInfo = raw?.appInfo ?? {};
  const appId = String(appInfo.appId ?? appInfo.app_id ?? raw?.app_id ?? "");
  return {
    snapshot_date: meta.date,
    country: meta.country,
    device: meta.device,
    category_id: meta.category.param,
    category_name: meta.category.name,
    brand: meta.brand.key,
    brand_name: meta.brand.label,
    page: meta.page,
    rank: raw?.rank ?? raw?.index ?? null,
    app_id: appId,
    app_name: appInfo.appName ?? appInfo.app_name ?? null,
    publisher_name: appInfo.publisher ?? appInfo.publisherName ?? null,
    category_name_from_item: appInfo.genre ?? appInfo.genreName ?? null,
    country_code_from_item: appInfo.country ?? meta.country,
    icon: appInfo.icon ?? null,
    is_ad: Boolean(raw?.isAd ?? raw?.is_ad ?? false),
    raw,
  };
}

async function collectQimaiRankings(page, options) {
  const rankings = [];
  const appIds = new Set();
  let requestCount = 0;

  for (const category of options.categories) {
    for (const brand of BRANDS) {
      if (category.skipBrands?.includes(brand.key)) {
        continue;
      }

      for (let pageNumber = 1; pageNumber <= options.pages; pageNumber += 1) {
        requestCount += 1;
        logger.info("抓取七麦榜单分页", {
          requestCount,
          category: `${category.param}:${category.name}`,
          brand: brand.key,
          page: pageNumber,
        });
        const params = {
          brand: "all",
          device: options.device,
          country: options.country,
          genre: category.param,
          date: options.date,
          page: pageNumber,
        };

        const json = await fetchJsonInPage(
          page,
          `/rank/indexPlus/brand_id/${brand.brandId}`,
          params,
        );

        if (json.code !== 10000) {
          throw new Error(
            `七麦接口返回异常 code=${json.code} msg=${json.msg ?? ""} category=${category.param} brand=${brand.key} page=${pageNumber}`,
          );
        }

        const list = Array.isArray(json.list) ? json.list : [];
        if (!list.length) {
          break;
        }

        for (const item of list) {
          const normalized = normalizeRankItem(item, {
            date: options.date,
            country: options.country,
            device: options.device,
            category,
            brand,
            page: pageNumber,
          });
          rankings.push(normalized);
          if (normalized.app_id) {
            appIds.add(normalized.app_id);
          }
        }

        if (list.length < 20) {
          break;
        }
      }
    }
  }

  return {
    rankings,
    appIds: [...appIds],
  };
}

async function lookupApps(appIds, country) {
  const uniqueIds = [...new Set(appIds)].filter(Boolean);
  const results = [];

  for (let i = 0; i < uniqueIds.length; i += 200) {
    const chunk = uniqueIds.slice(i, i + 200);
    logger.info("拉取 Apple Lookup 详情", {
      chunkIndex: Math.floor(i / 200) + 1,
      chunkSize: chunk.length,
      offset: i,
      total: uniqueIds.length,
    });
    const url = new URL("https://itunes.apple.com/lookup");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("country", country);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Apple Lookup 请求失败，HTTP ${response.status}`);
    }

    const json = await response.json();
    if (Array.isArray(json.results)) {
      results.push(...json.results);
    }
  }

  return results.map((item) => ({
    trackId: String(item.trackId),
    trackName: item.trackName ?? null,
    sellerName: item.sellerName ?? null,
    artistName: item.artistName ?? null,
    primaryGenreId: item.primaryGenreId ?? null,
    primaryGenreName: item.primaryGenreName ?? null,
    genres: item.genres ?? [],
    genreIds: item.genreIds ?? [],
    description: item.description ?? null,
    version: item.version ?? null,
    currentVersionReleaseDate: item.currentVersionReleaseDate ?? null,
    releaseDate: item.releaseDate ?? null,
    price: item.price ?? null,
    formattedPrice: item.formattedPrice ?? null,
    averageUserRating: item.averageUserRating ?? null,
    averageUserRatingForCurrentVersion:
      item.averageUserRatingForCurrentVersion ?? null,
    userRatingCount: item.userRatingCount ?? null,
    userRatingCountForCurrentVersion:
      item.userRatingCountForCurrentVersion ?? null,
    fileSizeBytes: item.fileSizeBytes ?? null,
    sellerUrl: item.sellerUrl ?? null,
    trackViewUrl: item.trackViewUrl ?? null,
    artistViewUrl: item.artistViewUrl ?? null,
    bundleId: item.bundleId ?? null,
    minimumOsVersion: item.minimumOsVersion ?? null,
    releaseNotes: item.releaseNotes ?? null,
    screenshotUrls: item.screenshotUrls ?? [],
    ipadScreenshotUrls: item.ipadScreenshotUrls ?? [],
    artworkUrl100: item.artworkUrl100 ?? null,
    artworkUrl512: item.artworkUrl512 ?? null,
    currency: item.currency ?? null,
    contentAdvisoryRating: item.contentAdvisoryRating ?? null,
    raw: item,
  }));
}

function buildSummary(rankings, appDetails) {
  const byCategoryBrand = new Map();
  const detailMap = new Map(appDetails.map((item) => [item.trackId, item]));

  for (const row of rankings) {
    const detail = detailMap.get(row.app_id);
    const key = `${row.category_id}__${row.brand}`;
    if (!byCategoryBrand.has(key)) {
      byCategoryBrand.set(key, {
        category_id: row.category_id,
        category_name: row.category_name,
        brand: row.brand,
        brand_name: row.brand_name,
        app_count: 0,
        top_10: [],
        primary_genres: {},
      });
    }

    const bucket = byCategoryBrand.get(key);
    bucket.app_count += 1;

    if (row.rank && row.rank <= 10) {
      bucket.top_10.push({
        rank: row.rank,
        app_id: row.app_id,
        app_name: row.app_name,
        primary_genre: detail?.primaryGenreName ?? null,
        seller_name: detail?.sellerName ?? row.publisher_name,
        rating_count: detail?.userRatingCount ?? null,
      });
    }

    const genreKey =
      detail?.primaryGenreName ?? row.category_name_from_item ?? "未知";
    bucket.primary_genres[genreKey] =
      (bucket.primary_genres[genreKey] ?? 0) + 1;
  }

  return [...byCategoryBrand.values()].map((item) => ({
    ...item,
    primary_genres: Object.entries(item.primary_genres)
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count })),
  }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  logger.info("开始采集 run", {
    country: options.country,
    device: options.device,
    date: options.date,
    pages: options.pages,
    categoryCount: options.categories.length,
    runId: options.runId,
  });
  await ensureDir(OUTPUT_DIR);
  await ensureDir(RUNS_DIR);
  await ensureDir(LATEST_DIR);
  const runContext = buildRunContext(options);

  const launchOptions = { headless: true };
  if (
    config.playwrightExecutablePath &&
    fsSync.existsSync(config.playwrightExecutablePath)
  ) {
    launchOptions.executablePath = config.playwrightExecutablePath;
  }

  const browser = await chromium.launch(launchOptions);
  let context;
  let cleaned = false;

  const cleanupBrowser = async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
  };

  const handleSignal = async (signal, exitCode) => {
    await cleanupBrowser();
    process.exit(exitCode);
  };

  process.once("SIGINT", () => {
    handleSignal("SIGINT", 130).catch(() => process.exit(130));
  });

  process.once("SIGTERM", () => {
    handleSignal("SIGTERM", 143).catch(() => process.exit(143));
  });

  try {
    const opened = await openQimaiContext(browser, options);
    context = opened.context;

    const { rankings, appIds } = await collectQimaiRankings(
      opened.page,
      options,
    );
    const rawAppDetails = await lookupApps(appIds, options.country);
    const versionedRankings = attachRankSnapshotMeta(rankings, runContext);
    const versionedAppDetails = attachAppSnapshotMeta(
      rawAppDetails,
      runContext,
    );
    const summary = buildSummary(versionedRankings, versionedAppDetails);
    const meta = buildRunMeta(
      runContext,
      options.categories,
      versionedRankings,
      versionedAppDetails,
      summary,
    );
    const { runDir } = await writeVersionedOutputs({
      runContext,
      categories: options.categories,
      rankings: versionedRankings,
      appDetails: versionedAppDetails,
      summary,
      meta,
    });

    logger.result({
      ok: true,
      run_id: runContext.runId,
      category_count: options.categories.length,
      ranking_row_count: versionedRankings.length,
      app_count: versionedAppDetails.length,
      output_dir: OUTPUT_DIR,
      run_dir: runDir,
    });
  } finally {
    await cleanupBrowser();
  }
}

main().catch((error) => {
  logger.error("采集 run 失败", error?.stack ?? String(error));
  process.exitCode = 1;
});

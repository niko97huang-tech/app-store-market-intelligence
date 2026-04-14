import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { buildExportTables } from "./analysis/export-tables.js";
import { compareRunMeta } from "./analysis/helpers.js";
import { getProjectConfig } from "./runtime/config.js";
import { createLogger } from "./runtime/logger.js";

const config = getProjectConfig();
const ANALYSIS_DIR = config.analysisDir;
const OPPORTUNITIES_DIR = config.opportunitiesDir;
const EXPORTS_DIR = config.exportsDir;
const LATEST_DIR = config.latestExportsDir;
const RUN_INDEX_FILE = config.runIndexFile;
const logger = createLogger("export-insights", config.logLevel);

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
  await fs.writeFile(filePath, `${text}`, "utf8");
}

async function resolveLatestAnalysisId() {
  const runs = await readJson(RUN_INDEX_FILE);
  const sorted = [...runs].sort(compareRunMeta);
  if (sorted.length < 2) {
    throw new Error("至少需要两个 run 才能推导默认 analysis_id");
  }
  return `${sorted[1].run_id}__vs__${sorted[0].run_id}`;
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value)
    ? value.join(" | ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

async function writeCsvBundle(outDir, files) {
  for (const [name, rows] of Object.entries(files)) {
    await writeText(path.join(outDir, `${name}.csv`), toCsv(rows));
  }
}

async function writeWorkbook(outDir, sheets) {
  const workbook = new ExcelJS.Workbook();

  for (const [sheetName, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
    const safeRows = rows.length ? rows : [{}];
    const headers = [...new Set(safeRows.flatMap((row) => Object.keys(row)))];

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(Math.max(header.length + 4, 16), 40),
    }));

    for (const row of safeRows) {
      const normalized = {};
      for (const header of headers) {
        const value = row[header];
        normalized[header] = Array.isArray(value)
          ? value.join(" | ")
          : value && typeof value === "object"
            ? JSON.stringify(value)
            : value ?? "";
      }
      worksheet.addRow(normalized);
    }

    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  await workbook.xlsx.writeFile(path.join(outDir, "insights.xlsx"));
}

async function mirrorDir(files, sourceDir, targetDir) {
  await ensureDir(targetDir);
  for (const file of files) {
    await fs.copyFile(path.join(sourceDir, file), path.join(targetDir, file));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  logger.info("开始导出分析结果", {
    analysisId: options.analysisId,
  });
  const analysisId = options.analysisId ?? (await resolveLatestAnalysisId());

  const [analysisDoc, opportunityDoc] = await Promise.all([
    readJson(path.join(ANALYSIS_DIR, analysisId, "market-analysis.json")),
    readJson(path.join(OPPORTUNITIES_DIR, analysisId, "opportunities.json")),
  ]);

  const outDir = path.join(EXPORTS_DIR, analysisId);
  await ensureDir(outDir);
  await ensureDir(LATEST_DIR);

  const csvFiles = buildExportTables(analysisDoc, opportunityDoc);
  await writeCsvBundle(outDir, csvFiles);
  await writeWorkbook(outDir, csvFiles);

  const generatedFiles = [
    ...Object.keys(csvFiles).map((name) => `${name}.csv`),
    "insights.xlsx",
  ];

  await mirrorDir(generatedFiles, outDir, LATEST_DIR);

  logger.result({
    ok: true,
    analysis_id: analysisId,
    output_dir: outDir,
    files: generatedFiles,
  });
}

main().catch((error) => {
  logger.error("导出分析结果失败", error?.stack ?? String(error));
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Convert filmography Excel -> CSV + Markdown (text formats).
 *
 * Uses a ready-made converter (SheetJS `xlsx`) — no manual Excel parsing in Python.
 *
 * Default Excel path:
 *   /home/ae/Загрузки/si_production_files/Фильмография_Щербаков.xlsx
 *
 * Outputs:
 *   - data/filmography.csv
 *   - public/data/filmography.csv
 *   - data/filmography.md
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DEFAULT_XLSX = "/home/ae/Загрузки/si_production_files/Фильмография_Щербаков.xlsx";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function toMarkdownTable(rows) {
  if (!rows || rows.length === 0) return "";
  const maxCols = Math.max(...rows.map((r) => r.length));
  const norm = (v) => String(v ?? "").replace(/\r?\n/g, " ").trim();

  const table = rows.map((r) => {
    const rr = Array.from({ length: maxCols }, (_, i) => norm(r[i] ?? ""));
    return rr;
  });

  const header = table[0];
  const sep = header.map(() => "---");
  const body = table.slice(1);

  const renderRow = (r) => `| ${r.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;

  return [renderRow(header), renderRow(sep), ...body.map(renderRow)].join("\n") + "\n";
}

function main() {
  const excelPath = process.env.FILMOGRAPHY_XLSX || DEFAULT_XLSX;
  if (!fs.existsSync(excelPath)) {
    console.error(`Excel not found: ${excelPath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(excelPath, { cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Convert entire sheet to CSV (text output)
  const csv = XLSX.utils.sheet_to_csv(ws, {
    FS: ",",
    RS: "\n",
    strip: false,
    blankrows: true,
  });

  const outDataDir = path.resolve(__dirname, "..", "data");
  const outPublicDir = path.resolve(__dirname, "..", "public", "data");
  ensureDir(outDataDir);
  ensureDir(outPublicDir);

  const outCsv1 = path.join(outDataDir, "filmography.csv");
  const outCsv2 = path.join(outPublicDir, "filmography.csv");
  fs.writeFileSync(outCsv1, csv, "utf8");
  fs.writeFileSync(outCsv2, csv, "utf8");

  // Optional: also output markdown for easy human review/editing
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const md = toMarkdownTable(rows);
  fs.writeFileSync(path.join(outDataDir, "filmography.md"), md, "utf8");

  console.log(`[ok] sheet: ${sheetName}`);
  console.log(`[ok] wrote: ${outCsv1}`);
  console.log(`[ok] wrote: ${outCsv2}`);
  console.log(`[ok] wrote: ${path.join(outDataDir, "filmography.md")}`);
}

main();


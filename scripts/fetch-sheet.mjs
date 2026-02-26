import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildDataset, parseCsv } from "./sheet-transform.mjs";

const DEFAULT_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1EBXkZCBdk5EGiuPgiMUwki1oIvxtC6j1UdQ8CBWf4Mg/export?format=csv&gid=0";

async function main() {
  const csvUrl = process.env.SHEET_CSV_URL?.trim() || DEFAULT_SHEET_CSV_URL;

  console.log(`[data-refresh] Fetching CSV from ${csvUrl}`);
  const response = await fetch(csvUrl, {
    headers: {
      "cache-control": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);
  const dataset = buildDataset(rows);

  const dataDir = path.join(process.cwd(), "data");
  const targetPath = path.join(dataDir, "shredders.json");
  const tempPath = path.join(dataDir, "shredders.tmp.json");

  await mkdir(dataDir, { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf-8");
  await rename(tempPath, targetPath);

  console.log(`[data-refresh] Updated ${targetPath} with ${dataset.items.length} items`);
}

main().catch((error) => {
  console.error("[data-refresh] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

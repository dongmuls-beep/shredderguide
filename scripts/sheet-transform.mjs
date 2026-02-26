const REQUIRED_HEADERS = [
  "id",
  "name",
  "image",
  "link",
  "capacity",
  "cutSize",
  "binSize",
  "runTime",
  "features",
  "bestFor",
  "price"
];

const AUTOFEED_HEADERS = [
  "autofeed",
  "autoFeed",
  "auto_feed",
  "auto-feed",
  "auto feed",
  "autoCapacity",
  "autofeedCapacity",
  "autofeed_capacity",
  "autofeed capacity",
  "trayCapacity"
];

function normalizeHeader(header) {
  return String(header ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function getRowValue(row, candidates) {
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, candidate)) {
      return row[candidate];
    }
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
  );

  for (const candidate of candidates) {
    const normalized = normalizeHeader(candidate);
    if (normalized in normalizedMap) {
      return normalizedMap[normalized];
    }
  }

  return "";
}

function parseNumber(input) {
  const normalized = String(input ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  if (normalized === "" || normalized === "-" || normalized === "." || normalized === "-.") {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseSheetCapacity(input) {
  const matches = String(input ?? "").match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const lastToken = matches[matches.length - 1];
  const value = Number(lastToken);
  return Number.isFinite(value) ? value : null;
}

function parseAutofeedCapacity(input) {
  return parseNumber(input);
}

function parseCutWidthMm(cutSize) {
  const values = String(cutSize ?? "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value));

  if (!values || values.length === 0) {
    return null;
  }

  const value = Math.min(...values);
  return Number.isFinite(value) ? value : null;
}

export function deriveSecurityLevel(cutSize) {
  const width = parseCutWidthMm(cutSize);
  const dimensions = String(cutSize ?? "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value));
  const area =
    dimensions && dimensions.length >= 2
      ? dimensions[0] * dimensions[1]
      : null;

  if (width === null) {
    return "P-1";
  }

  if (area !== null) {
    if (width <= 1 && area <= 5) {
      return "P-7";
    }

    if (width <= 1 && area <= 10) {
      return "P-6";
    }

    if (width <= 2 && area <= 30) {
      return "P-5";
    }

    if (width <= 6 && area <= 160) {
      return "P-4";
    }

    if (width <= 2 && area <= 320) {
      return "P-3";
    }

    if (width <= 6 && area <= 800) {
      return "P-2";
    }

    if (width <= 12 && area <= 2000) {
      return "P-1";
    }
  }

  if (width <= 1) {
    return "P-6";
  }

  if (width <= 2) {
    return "P-5";
  }

  if (width <= 6) {
    return "P-2";
  }

  if (width <= 12) {
    return "P-1";
  }

  return "P-1";
}

export function derivePeopleEstimate(volumePerDay) {
  if (volumePerDay <= 100) {
    return 2;
  }

  if (volumePerDay <= 300) {
    return 4;
  }

  if (volumePerDay <= 700) {
    return 8;
  }

  if (volumePerDay <= 1500) {
    return 15;
  }

  return 25;
}

function assertHeaders(headers) {
  const trimmedHeaders = headers.map((header) => header.trim());

  for (const required of REQUIRED_HEADERS) {
    if (!trimmedHeaders.includes(required)) {
      throw new Error(`Missing required header: ${required}`);
    }
  }

  return trimmedHeaders;
}

export function parseCsv(csvText) {
  const rows = [];
  let current = "";
  let currentRow = [];
  let inQuotes = false;

  const pushCell = () => {
    currentRow.push(current);
    current = "";
  };

  const pushRow = () => {
    if (currentRow.length === 1 && currentRow[0] === "") {
      currentRow = [];
      return;
    }

    rows.push(currentRow);
    currentRow = [];
  };

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];

    if (char === '"') {
      const nextChar = csvText[index + 1];

      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (!inQuotes && char === ",") {
      pushCell();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && csvText[index + 1] === "\n") {
        index += 1;
      }

      pushCell();
      pushRow();
      continue;
    }

    current += char;
  }

  if (current.length > 0 || currentRow.length > 0) {
    pushCell();
    pushRow();
  }

  if (rows.length === 0) {
    throw new Error("CSV has no rows");
  }

  const headers = assertHeaders(rows[0]);

  return rows.slice(1).map((row) => {
    const entry = {};
    for (let index = 0; index < headers.length; index += 1) {
      entry[headers[index]] = String(row[index] ?? "").trim();
    }

    return entry;
  });
}

export function mapCsvRow(row) {
  const sheetCapacity = parseSheetCapacity(row.capacity);
  const binCapacity = parseNumber(row.binSize);
  const runTime = parseNumber(row.runTime);
  const price = parseNumber(row.price);
  const autofeedCapacity = parseAutofeedCapacity(getRowValue(row, AUTOFEED_HEADERS));

  if (
    !row.id ||
    !row.name ||
    !row.image ||
    !row.link ||
    sheetCapacity === null ||
    binCapacity === null ||
    runTime === null ||
    price === null
  ) {
    return null;
  }

  const volumeEstimate = sheetCapacity * runTime * 6;

  return {
    id: row.id,
    name: row.name,
    image_url: row.image,
    product_url: row.link,
    sheet_capacity: sheetCapacity,
    cut_size: row.cutSize,
    autofeed_capacity: autofeedCapacity ?? 0,
    bin_capacity_l: binCapacity,
    run_time_min: runTime,
    features: String(row.features ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    best_for: row.bestFor,
    price,
    derived: {
      security_level: deriveSecurityLevel(row.cutSize),
      volume_estimate_per_day: volumeEstimate,
      people_estimate: derivePeopleEstimate(volumeEstimate)
    }
  };
}

export function buildDataset(rows) {
  const items = [];

  for (const row of rows) {
    const mapped = mapCsvRow(row);

    if (!mapped) {
      console.warn(`[data-refresh] Skipping invalid row: ${JSON.stringify(row)}`);
      continue;
    }

    items.push(mapped);
  }

  if (items.length < 3) {
    throw new Error(`At least 3 valid items are required. Current: ${items.length}`);
  }

  return {
    version: "1.0.0",
    updated_at: new Date().toISOString(),
    items
  };
}

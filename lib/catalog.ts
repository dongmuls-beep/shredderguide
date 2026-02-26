import type { CatalogFilters, CatalogSort, ShredderItem } from "@/lib/types";

export interface CatalogResult {
  items: ShredderItem[];
  totalItems: number;
  totalPages: number;
  page: number;
}

function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) {
    return 0;
  }

  return (value - min) / (max - min);
}

function getEffectiveSheetCapacity(item: ShredderItem): number {
  return Math.max(item.sheet_capacity, item.autofeed_capacity ?? 0);
}

function computeRecommendedScore(item: ShredderItem, items: ShredderItem[]): number {
  const volumes = items.map((target) => target.derived.volume_estimate_per_day);
  const runtimes = items.map((target) => target.run_time_min);
  const capacities = items.map((target) => getEffectiveSheetCapacity(target));
  const autoCapacities = items.map((target) => target.autofeed_capacity ?? 0);

  const volumeNorm = normalize(
    item.derived.volume_estimate_per_day,
    Math.min(...volumes),
    Math.max(...volumes)
  );
  const runtimeNorm = normalize(item.run_time_min, Math.min(...runtimes), Math.max(...runtimes));
  const capacityNorm = normalize(
    getEffectiveSheetCapacity(item),
    Math.min(...capacities),
    Math.max(...capacities)
  );
  const autoCapacityNorm = normalize(
    item.autofeed_capacity ?? 0,
    Math.min(...autoCapacities),
    Math.max(...autoCapacities)
  );

  return volumeNorm * 0.45 + runtimeNorm * 0.25 + capacityNorm * 0.2 + autoCapacityNorm * 0.1;
}

function sortItems(items: ShredderItem[], sort: CatalogSort): ShredderItem[] {
  const sorted = [...items];

  if (sort === "price_asc") {
    sorted.sort((left, right) => left.price - right.price);
    return sorted;
  }

  if (sort === "price_desc") {
    sorted.sort((left, right) => right.price - left.price);
    return sorted;
  }

  const scoreTable = Object.fromEntries(
    sorted.map((item) => [item.id, computeRecommendedScore(item, sorted)]
    )
  );

  sorted.sort((left, right) => {
    const scoreDiff = (scoreTable[right.id] ?? 0) - (scoreTable[left.id] ?? 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.price - right.price;
  });

  return sorted;
}

export function filterAndSortCatalog(
  items: ShredderItem[],
  filters: CatalogFilters,
  pageSize = 12
): CatalogResult {
  const query = filters.search.trim().toLowerCase();
  const selectedSecurityLevel = filters.minSecurityLevel;

  const filtered = items.filter((item) => {
    const searchable = `${item.name} ${item.features.join(" ")} ${item.best_for}`.toLowerCase();

    const matchesQuery = query.length === 0 || searchable.includes(query);
    const matchesSecurity =
      selectedSecurityLevel === "" || item.derived.security_level === selectedSecurityLevel;
    const matchesMinPrice = item.price >= filters.minPrice;
    const matchesMaxPrice = item.price <= filters.maxPrice;
    const matchesSheetCapacity =
      item.sheet_capacity >= filters.minSheetCapacity &&
      item.sheet_capacity <= filters.maxSheetCapacity;
    const matchesAutofeedCapacity =
      (!filters.requireAutofeed || item.autofeed_capacity > 0) &&
      item.autofeed_capacity >= filters.minAutofeedCapacity &&
      item.autofeed_capacity <= filters.maxAutofeedCapacity;
    const matchesBin =
      item.bin_capacity_l >= filters.minBinCapacity &&
      item.bin_capacity_l <= filters.maxBinCapacity;
    const matchesRunTime =
      item.run_time_min >= filters.minRunTime &&
      item.run_time_min <= filters.maxRunTime;

    return (
      matchesQuery &&
      matchesSecurity &&
      matchesMinPrice &&
      matchesMaxPrice &&
      matchesSheetCapacity &&
      matchesAutofeedCapacity &&
      matchesBin &&
      matchesRunTime
    );
  });

  const sorted = sortItems(filtered, filters.sort);
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const startIndex = (page - 1) * pageSize;

  return {
    items: sorted.slice(startIndex, startIndex + pageSize),
    totalItems,
    totalPages,
    page
  };
}

export function getCatalogDefaults(items: ShredderItem[]): CatalogFilters {
  const maxPrice = items.length > 0 ? Math.max(...items.map((item) => item.price)) : 0;
  const maxSheetCapacity = items.length > 0 ? Math.max(...items.map((item) => item.sheet_capacity)) : 0;
  const maxAutofeedCapacity =
    items.length > 0 ? Math.max(...items.map((item) => item.autofeed_capacity ?? 0)) : 0;
  const maxBinCapacity = items.length > 0 ? Math.max(...items.map((item) => item.bin_capacity_l)) : 0;
  const maxRunTime = items.length > 0 ? Math.max(...items.map((item) => item.run_time_min)) : 0;

  return {
    search: "",
    minSecurityLevel: "",
    minPrice: 0,
    maxPrice,
    minSheetCapacity: 0,
    maxSheetCapacity,
    minAutofeedCapacity: 0,
    maxAutofeedCapacity,
    requireAutofeed: false,
    minBinCapacity: 0,
    maxBinCapacity,
    minRunTime: 0,
    maxRunTime,
    sort: "recommended",
    page: 1
  };
}



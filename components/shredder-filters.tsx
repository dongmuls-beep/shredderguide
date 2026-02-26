"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { filterAndSortCatalog, getCatalogDefaults } from "@/lib/catalog";
import { formatCurrency, formatNumber } from "@/lib/format";
import { incrementProductClickCount } from "@/lib/product-clicks";
import type { CatalogSort, Dictionary, Locale, SecurityLevel, ShredderItem } from "@/lib/types";

interface ShredderFiltersProps {
  locale: Locale;
  dictionary: Dictionary;
  items: ShredderItem[];
}

const RANGE_LEVEL_COUNT = 5;
type FilterLevel = 1 | 2 | 3 | 4 | 5;
type FilterLevelValue = FilterLevel | "";

interface FilterRangeLevel {
  level: number;
  min: number;
  max: number;
}

const SECURITY_LEVEL_ORDER: SecurityLevel[] = ["P-1", "P-2", "P-3", "P-4", "P-5", "P-6", "P-7"];

function toLevel(value: string): FilterLevelValue {
  if (value === "") {
    return "";
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  const parsedLevel = Math.min(RANGE_LEVEL_COUNT, Math.max(1, Math.trunc(parsed)));
  return parsedLevel as FilterLevelValue;
}

function buildRangeLevels(values: number[]): FilterRangeLevel[] {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (safeValues.length === 0) {
    return Array.from({ length: RANGE_LEVEL_COUNT }, (_, index) => ({
      level: index + 1,
      min: 0,
      max: 0
    }));
  }

  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);

  if (max <= min) {
    return Array.from({ length: RANGE_LEVEL_COUNT }, (_, index) => ({
      level: index + 1,
      min,
      max
    }));
  }

  const step = (max - min) / RANGE_LEVEL_COUNT;

  return Array.from({ length: RANGE_LEVEL_COUNT }, (_, index) => {
    const rangeMin = min + step * index;
    const rangeMax = index === RANGE_LEVEL_COUNT - 1 ? max : min + step * (index + 1);

    return {
      level: index + 1,
      min: rangeMin,
      max: rangeMax
    };
  });
}

function buildFilterRangeMatcher(params: {
  query: string;
  minPrice: number;
  maxPrice: number;
  minSheetCapacity: number;
  maxSheetCapacity: number;
  minAutofeedCapacity: number;
  maxAutofeedCapacity: number;
  requireAutofeed: boolean;
  minBinCapacity: number;
  maxBinCapacity: number;
  minRunTime: number;
  maxRunTime: number;
  minSecurityLevel: SecurityLevel | "";
}) {
  return (item: ShredderItem) => {
  const searchable = `${item.name} ${item.features.join(" ")} ${item.best_for}`.toLowerCase();
    const matchesQuery = params.query.length === 0 || searchable.includes(params.query);
    const matchesSecurity =
      params.minSecurityLevel === "" || item.derived.security_level === params.minSecurityLevel;
    const matchesMinPrice = item.price >= params.minPrice;
    const matchesMaxPrice = item.price <= params.maxPrice;
    const matchesSheetCapacity =
      item.sheet_capacity >= params.minSheetCapacity &&
      item.sheet_capacity <= params.maxSheetCapacity;
    const matchesAutofeedCapacity =
      (!params.requireAutofeed || item.autofeed_capacity > 0) &&
      item.autofeed_capacity >= params.minAutofeedCapacity &&
      item.autofeed_capacity <= params.maxAutofeedCapacity;
    const matchesBin =
      item.bin_capacity_l >= params.minBinCapacity &&
      item.bin_capacity_l <= params.maxBinCapacity;
    const matchesRunTime =
      item.run_time_min >= params.minRunTime &&
      item.run_time_min <= params.maxRunTime;

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
  };
}

function extractLevelsFromItems(
  levels: FilterRangeLevel[],
  sourceItems: ShredderItem[],
  getValue: (item: ShredderItem) => number
): FilterRangeLevel[] {
  return levels.filter((range) => {
    const hasMatch = sourceItems.some((item) => {
      const value = getValue(item);
      return value >= range.min && value <= range.max;
    });

    return hasMatch;
  });
}

function formatLevelRange(
  range: FilterRangeLevel,
  locale: Locale,
  options: { currency?: boolean; unit?: string; digits?: number } = {}
): string {
  const digits = options.digits ?? 0;
  const rangeMin = Number(range.min.toFixed(digits));
  const rangeMax = Number(range.max.toFixed(digits));

  const start = options.currency ? formatCurrency(rangeMin, locale) : formatNumber(rangeMin, locale);
  const end = options.currency ? formatCurrency(rangeMax, locale) : formatNumber(rangeMax, locale);
  const suffix = options.unit ? ` ${options.unit}` : "";

  if (locale === "ko") {
    return `${range.level}단계 (${start}${suffix} ~ ${end}${suffix})`;
  }

  return `Level ${range.level} (${start}${suffix} - ${end}${suffix})`;
}

export function ShredderFilters({ locale, dictionary, items }: ShredderFiltersProps) {
  const defaults = useMemo(() => getCatalogDefaults(items), [items]);
  const [search, setSearch] = useState(defaults.search);
  const [priceRangeLevel, setPriceRangeLevel] = useState<FilterLevelValue>("");
  const [minSheetCapacityLevel, setMinSheetCapacityLevel] = useState<FilterLevelValue>("");
  const [minAutofeedCapacityLevel, setMinAutofeedCapacityLevel] = useState<FilterLevelValue>("");
  const [minBinCapacityLevel, setMinBinCapacityLevel] = useState<FilterLevelValue>("");
  const [minRunTimeLevel, setMinRunTimeLevel] = useState<FilterLevelValue>("");
  const [minSecurityLevel, setMinSecurityLevel] = useState<SecurityLevel | "">("");
  const [sort, setSort] = useState<CatalogSort>(defaults.sort);
  const [page, setPage] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const basePriceRangeLevels = useMemo(() => buildRangeLevels(items.map((item) => item.price)), [items]);
  const baseSheetRangeLevels = useMemo(
    () => buildRangeLevels(items.map((item) => item.sheet_capacity)),
    [items]
  );
  const baseAutofeedRangeLevels = useMemo(
    () =>
      buildRangeLevels(
        items
          .map((item) => item.autofeed_capacity ?? 0)
          .filter((capacity) => capacity > 0)
      ),
    [items]
  );
  const baseBinRangeLevels = useMemo(
    () => buildRangeLevels(items.map((item) => item.bin_capacity_l)),
    [items]
  );
  const baseRunTimeRangeLevels = useMemo(
    () => buildRangeLevels(items.map((item) => item.run_time_min)),
    [items]
  );

  const minPrice = priceRangeLevel === ""
    ? defaults.minPrice
    : basePriceRangeLevels[priceRangeLevel - 1]?.min ?? defaults.minPrice;
  const maxPrice = priceRangeLevel === ""
    ? defaults.maxPrice
    : basePriceRangeLevels[priceRangeLevel - 1]?.max ?? defaults.maxPrice;
  const minSheetCapacity =
    minSheetCapacityLevel === ""
      ? defaults.minSheetCapacity
      : baseSheetRangeLevels[minSheetCapacityLevel - 1]?.min ?? defaults.minSheetCapacity;
  const maxSheetCapacity =
    minSheetCapacityLevel === ""
      ? defaults.maxSheetCapacity
      : baseSheetRangeLevels[minSheetCapacityLevel - 1]?.max ?? defaults.maxSheetCapacity;
  const minAutofeedCapacity =
    minAutofeedCapacityLevel === ""
      ? defaults.minAutofeedCapacity
      : baseAutofeedRangeLevels[minAutofeedCapacityLevel - 1]?.min ??
        defaults.minAutofeedCapacity;
  const maxAutofeedCapacity =
    minAutofeedCapacityLevel === ""
      ? defaults.maxAutofeedCapacity
      : baseAutofeedRangeLevels[minAutofeedCapacityLevel - 1]?.max ??
        defaults.maxAutofeedCapacity;
  const minBinCapacity =
    minBinCapacityLevel === ""
      ? defaults.minBinCapacity
      : baseBinRangeLevels[minBinCapacityLevel - 1]?.min ?? defaults.minBinCapacity;
  const maxBinCapacity =
    minBinCapacityLevel === ""
      ? defaults.maxBinCapacity
      : baseBinRangeLevels[minBinCapacityLevel - 1]?.max ?? defaults.maxBinCapacity;
  const minRunTime =
    minRunTimeLevel === ""
      ? defaults.minRunTime
      : baseRunTimeRangeLevels[minRunTimeLevel - 1]?.min ?? defaults.minRunTime;
  const maxRunTime =
    minRunTimeLevel === ""
      ? defaults.maxRunTime
      : baseRunTimeRangeLevels[minRunTimeLevel - 1]?.max ?? defaults.maxRunTime;

  const query = search.trim().toLowerCase();
  const requireAutofeed = minAutofeedCapacityLevel !== "";
  const activeFilterParams = useMemo(
    () => ({
      query,
      minPrice,
      maxPrice,
      minSheetCapacity,
      maxSheetCapacity,
      minAutofeedCapacity,
      maxAutofeedCapacity,
      requireAutofeed,
      minBinCapacity,
      maxBinCapacity,
      minRunTime,
      maxRunTime,
      minSecurityLevel
    }),
    [
      query,
      minPrice,
      maxPrice,
      minSheetCapacity,
      maxSheetCapacity,
      minAutofeedCapacity,
      maxAutofeedCapacity,
      requireAutofeed,
      minBinCapacity,
      maxBinCapacity,
      minRunTime,
      maxRunTime,
      minSecurityLevel
    ]
  );
  const priceOptionSource = useMemo(
    () =>
      items.filter(
        buildFilterRangeMatcher({
          ...activeFilterParams,
          minPrice: defaults.minPrice,
          maxPrice: defaults.maxPrice
        })
      ),
    [items, activeFilterParams, defaults.minPrice, defaults.maxPrice]
  );
  const sheetOptionSource = useMemo(
    () =>
      items.filter(
        buildFilterRangeMatcher({
          ...activeFilterParams,
          minSheetCapacity: defaults.minSheetCapacity,
          maxSheetCapacity: defaults.maxSheetCapacity
        })
      ),
    [items, activeFilterParams, defaults.minSheetCapacity, defaults.maxSheetCapacity]
  );
  const autofeedOptionSource = useMemo(
    () =>
      items.filter(
        buildFilterRangeMatcher({
          ...activeFilterParams,
          minAutofeedCapacity: defaults.minAutofeedCapacity,
          maxAutofeedCapacity: defaults.maxAutofeedCapacity,
          requireAutofeed: false
        })
      ),
    [items, activeFilterParams, defaults.minAutofeedCapacity, defaults.maxAutofeedCapacity]
  );
  const binOptionSource = useMemo(
    () =>
      items.filter(
        buildFilterRangeMatcher({
          ...activeFilterParams,
          minBinCapacity: defaults.minBinCapacity,
          maxBinCapacity: defaults.maxBinCapacity
        })
      ),
    [items, activeFilterParams, defaults.minBinCapacity, defaults.maxBinCapacity]
  );
  const runTimeOptionSource = useMemo(
    () =>
      items.filter(
        buildFilterRangeMatcher({
          ...activeFilterParams,
          minRunTime: defaults.minRunTime,
          maxRunTime: defaults.maxRunTime
        })
      ),
    [items, activeFilterParams, defaults.minRunTime, defaults.maxRunTime]
  );
  const securityOptionSource = useMemo(
    () =>
      items.filter(
        buildFilterRangeMatcher({
          ...activeFilterParams,
          minSecurityLevel: ""
        })
      ),
    [items, activeFilterParams]
  );

  const priceRangeLevels = useMemo(
    () =>
      extractLevelsFromItems(
        basePriceRangeLevels,
        priceOptionSource,
        (item) => item.price
      ),
    [basePriceRangeLevels, priceOptionSource]
  );
  const sheetRangeLevels = useMemo(
    () =>
      extractLevelsFromItems(
        baseSheetRangeLevels,
        sheetOptionSource,
        (item) => item.sheet_capacity
      ),
    [baseSheetRangeLevels, sheetOptionSource]
  );
  const autofeedRangeLevels = useMemo(
    () =>
      extractLevelsFromItems(
        baseAutofeedRangeLevels,
        autofeedOptionSource,
        (item) => item.autofeed_capacity ?? 0
      ),
    [baseAutofeedRangeLevels, autofeedOptionSource]
  );
  const binRangeLevels = useMemo(
    () =>
      extractLevelsFromItems(
        baseBinRangeLevels,
        binOptionSource,
        (item) => item.bin_capacity_l
      ),
    [baseBinRangeLevels, binOptionSource]
  );
  const runTimeRangeLevels = useMemo(
    () =>
      extractLevelsFromItems(
        baseRunTimeRangeLevels,
        runTimeOptionSource,
        (item) => item.run_time_min
      ),
    [baseRunTimeRangeLevels, runTimeOptionSource]
  );
  const securityLevels = useMemo(() => {
    const present = new Set<SecurityLevel>(
      securityOptionSource.map((item) => item.derived.security_level)
    );

    const options = SECURITY_LEVEL_ORDER.filter((level) => present.has(level));

    if (minSecurityLevel !== "" && !options.includes(minSecurityLevel)) {
      return [minSecurityLevel, ...options];
    }

    return options.length > 0 ? options : SECURITY_LEVEL_ORDER;
  }, [securityOptionSource, minSecurityLevel]);

  const result = useMemo(
    () =>
      filterAndSortCatalog(items, {
        search,
        minSecurityLevel,
        minPrice,
        maxPrice,
        minSheetCapacity,
        maxSheetCapacity,
        minAutofeedCapacity,
        maxAutofeedCapacity,
        requireAutofeed,
        minBinCapacity,
        maxBinCapacity,
        minRunTime,
        maxRunTime,
        sort,
        page
      }),
    [
      items,
      maxPrice,
      maxSheetCapacity,
      maxAutofeedCapacity,
      maxBinCapacity,
      maxRunTime,
      minAutofeedCapacity,
      minSecurityLevel,
      requireAutofeed,
      minBinCapacity,
      minPrice,
      minRunTime,
      minSheetCapacity,
      page,
      search,
      sort
    ]
  );

  const resetFilters = () => {
    setSearch(defaults.search);
    setPriceRangeLevel("");
    setMinSheetCapacityLevel("");
    setMinAutofeedCapacityLevel("");
    setMinBinCapacityLevel("");
    setMinRunTimeLevel("");
    setMinSecurityLevel("");
    setSort(defaults.sort);
    setPage(1);
  };

  const noFilterLabel = locale === "ko" ? "선택 안함" : "No filter";
  const priceFilterLabel = locale === "ko" ? "가격대" : dictionary.catalog.filters.minPrice;
  const sheetFilterLabel =
    locale === "ko" ? "단일 투입 매수" : dictionary.catalog.filters.minSheetCapacity;
  const autofeedFilterLabel =
    locale === "ko" ? "자동급지 매수" : dictionary.catalog.filters.minAutofeedCapacity;
  const binFilterLabel =
    locale === "ko" ? "파지함 용량" : dictionary.catalog.filters.minBinCapacity;
  const runTimeFilterLabel =
    locale === "ko" ? "연속 세단 시간" : dictionary.catalog.filters.minRunTime;
  const securityFilterLabel =
    locale === "ko" ? "보안 등급" : dictionary.catalog.filters.minSecurityLevel;

  const filterPanel = (
    <div className="filter-panel glass-card">
      <div className="filter-title-row">
        <h2>{dictionary.catalog.filters.title}</h2>
        <button
          type="button"
          className="touch-button secondary mobile-only"
          onClick={() => setIsDrawerOpen(false)}
        >
          {dictionary.catalog.filters.close}
        </button>
      </div>

      <label className="field-label" htmlFor="catalog_search">
        {dictionary.catalog.searchPlaceholder}
      </label>
      <input
        id="catalog_search"
        type="text"
        value={search}
        placeholder={dictionary.catalog.searchPlaceholder}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />

      <label className="field-label" htmlFor="price_range_level">
        {priceFilterLabel}
      </label>
      <select
        id="price_range_level"
        value={priceRangeLevel}
        onChange={(event) => {
          setPriceRangeLevel(toLevel(event.target.value));
          setPage(1);
        }}
      >
        <option value="">{noFilterLabel}</option>
        {priceRangeLevels.map((range) => (
          <option key={`price_range_${range.level}`} value={range.level}>
            {formatLevelRange(range, locale, { currency: true })}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="min_sheet_level">
        {sheetFilterLabel}
      </label>
      <select
        id="min_sheet_level"
        value={minSheetCapacityLevel}
        onChange={(event) => {
          setMinSheetCapacityLevel(toLevel(event.target.value));
          setPage(1);
        }}
      >
        <option value="">{noFilterLabel}</option>
        {sheetRangeLevels.map((range) => (
          <option key={`min_sheet_${range.level}`} value={range.level}>
            {formatLevelRange(range, locale)}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="min_autofeed_level">
        {autofeedFilterLabel}
      </label>
      <select
        id="min_autofeed_level"
        value={minAutofeedCapacityLevel}
        onChange={(event) => {
          setMinAutofeedCapacityLevel(toLevel(event.target.value));
          setPage(1);
        }}
      >
        <option value="">{noFilterLabel}</option>
        {autofeedRangeLevels.map((range) => (
          <option key={`min_autofeed_${range.level}`} value={range.level}>
            {formatLevelRange(range, locale, {
              unit: locale === "ko" ? "장" : "sheets"
            })}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="min_security_level">
        {securityFilterLabel}
      </label>
      <select
        id="min_security_level"
        value={minSecurityLevel}
        onChange={(event) => {
          setMinSecurityLevel(event.target.value as SecurityLevel | "");
          setPage(1);
        }}
      >
        <option value="">{noFilterLabel}</option>
        {securityLevels.map((level) => (
          <option key={`security_${level}`} value={level}>
            {level}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="min_bin_level">
        {binFilterLabel}
      </label>
      <select
        id="min_bin_level"
        value={minBinCapacityLevel}
        onChange={(event) => {
          setMinBinCapacityLevel(toLevel(event.target.value));
          setPage(1);
        }}
      >
        <option value="">{noFilterLabel}</option>
        {binRangeLevels.map((range) => (
          <option key={`min_bin_${range.level}`} value={range.level}>
            {formatLevelRange(range, locale, { unit: "L", digits: 1 })}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="min_runtime_level">
        {runTimeFilterLabel}
      </label>
      <select
        id="min_runtime_level"
        value={minRunTimeLevel}
        onChange={(event) => {
          setMinRunTimeLevel(toLevel(event.target.value));
          setPage(1);
        }}
      >
        <option value="">{noFilterLabel}</option>
        {runTimeRangeLevels.map((range) => (
          <option key={`min_runtime_${range.level}`} value={range.level}>
            {formatLevelRange(range, locale, { unit: locale === "ko" ? "분" : "min" })}
          </option>
        ))}
      </select>

      <div className="filter-actions">
        <button
          type="button"
          className="touch-button primary"
          onClick={() => setIsDrawerOpen(false)}
        >
          {dictionary.catalog.filters.apply}
        </button>
        <button type="button" className="touch-button secondary" onClick={resetFilters}>
          {dictionary.catalog.filters.reset}
        </button>
      </div>
    </div>
  );

  return (
    <section className="catalog-shell">
      <div className="catalog-toolbar glass-card">
        <button
          type="button"
          className="touch-button secondary mobile-only"
          onClick={() => setIsDrawerOpen(true)}
        >
          {dictionary.catalog.filters.open}
        </button>

        <label htmlFor="sort_select" className="sort-label">
          {dictionary.catalog.sort.label}
        </label>
        <select
          id="sort_select"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as CatalogSort);
            setPage(1);
          }}
        >
          <option value="recommended">{dictionary.catalog.sort.recommended}</option>
          <option value="price_asc">{dictionary.catalog.sort.priceAsc}</option>
          <option value="price_desc">{dictionary.catalog.sort.priceDesc}</option>
        </select>
      </div>

      <div className="catalog-layout">
        <div className="desktop-filter">{filterPanel}</div>

        {isDrawerOpen && (
          <div className="mobile-filter-overlay" role="dialog" aria-modal="true">
            {filterPanel}
          </div>
        )}

        <div className="catalog-results">
          {result.totalItems === 0 && <p className="glass-card empty-state">{dictionary.catalog.empty}</p>}

          <div className="catalog-grid">
            {result.items.map((item) => (
              <article key={item.id} className="glass-card catalog-card">
                <div className="catalog-image-wrap">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    width={640}
                    height={420}
                    className="catalog-image"
                  />
                </div>
                <div className="catalog-card-body">
                  <h3>{item.name}</h3>
                  <p className="price-highlight">{formatCurrency(item.price, locale)}</p>
                  <p>
                    {dictionary.recommendation.sheetCapacity}: {formatNumber(item.sheet_capacity, locale)}
                  </p>
                  <p>
                    {dictionary.recommendation.binCapacity}: {formatNumber(item.bin_capacity_l, locale)} L
                  </p>
                  <p>
                    {dictionary.recommendation.runTime}: {formatNumber(item.run_time_min, locale)} min
                  </p>
                  <p>
                    {dictionary.recommendation.securityLevel}: {item.derived.security_level}
                  </p>
                  <a
                    href={item.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="touch-button primary"
                    onClick={() => incrementProductClickCount(item.id)}
                  >
                    {dictionary.recommendation.buyNow}
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="pagination glass-card">
            <button
              type="button"
              className="touch-button secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={result.page <= 1}
            >
              {dictionary.catalog.pagination.previous}
            </button>
            <span>
              {dictionary.catalog.pagination.page} {result.page} / {result.totalPages}
            </span>
            <button
              type="button"
              className="touch-button secondary"
              onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))}
              disabled={result.page >= result.totalPages}
            >
              {dictionary.catalog.pagination.next}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}



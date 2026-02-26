import type { PeopleBand, RecommendationInput, RecommendationResult, SecurityLevel, ShredderItem } from "@/lib/types";
import type { ProductClickCounts } from "@/lib/product-clicks";

const SECURITY_LEVEL_SCORE: Record<SecurityLevel, number> = {
  "P-1": 1,
  "P-2": 2,
  "P-3": 3,
  "P-4": 4,
  "P-5": 5,
  "P-6": 6,
  "P-7": 7
};

const PEOPLE_MIDPOINT: Record<PeopleBand, number> = {
  "1_2": 1.5,
  "3_5": 4,
  "6_10": 8,
  "11_20": 15,
  over_20: 25
};

const ENTERPRISE_ARCHIVE_PRESET_ID: "enterprise_archive" = "enterprise_archive";
const ENTERPRISE_ARCHIVE_MIN_PRICE = 1_000_000;
const ARCHIVE_PRIORITY_KEYWORDS = ["자동급지", "스틸", "스틸 제본기"];
const ARCHIVE_PREFERRED_AUTOFEED_MIN_PRICE = 1_000_000;

function safeScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function distanceScore(itemValue: number, targetValue: number): number {
  const denominator = Math.max(1, targetValue);
  const value = 1 - Math.abs(itemValue - targetValue) / denominator;
  return safeScore(value);
}

function getBudgetRange(input: RecommendationInput): { min: number; max: number } | null {
  const maxCandidate =
    typeof input.budget_max === "number" && Number.isFinite(input.budget_max)
      ? input.budget_max
      : typeof input.budget === "number" && Number.isFinite(input.budget)
        ? input.budget
        : undefined;

  if (maxCandidate === undefined || maxCandidate <= 0) {
    return null;
  }

  const minCandidate =
    typeof input.budget_min === "number" && Number.isFinite(input.budget_min) ? input.budget_min : 0;
  const min = Math.max(0, Math.min(minCandidate, maxCandidate));
  const max = Math.max(min, maxCandidate);

  return { min, max };
}

function isWithinBudgetRange(price: number, range: { min: number; max: number }): boolean {
  return price >= range.min && price <= range.max;
}

function getBudgetTarget(range: { min: number; max: number }): number {
  return range.min + (range.max - range.min) / 2;
}

function isP5OrHigher(level: SecurityLevel): boolean {
  return SECURITY_LEVEL_SCORE[level] >= 5;
}

function isSecuritySensitivePreset(input: RecommendationInput): input is RecommendationInput & { preset_id: "security_sensitive" } {
  return input.preset_id === "security_sensitive";
}

function isEnterpriseArchivePreset(input: RecommendationInput): input is RecommendationInput & { preset_id: "enterprise_archive" } {
  return input.preset_id === ENTERPRISE_ARCHIVE_PRESET_ID;
}

function getSecurityFilteredItems(items: ShredderItem[], input: RecommendationInput): ShredderItem[] {
  if (!isSecuritySensitivePreset(input)) {
    return items;
  }

  return items.filter((item) => isP5OrHigher(item.derived.security_level));
}

function isArchivePriorityCandidate(item: ShredderItem): boolean {
  if (item.price < ENTERPRISE_ARCHIVE_MIN_PRICE) {
    return false;
  }

  const normalizedText = `${item.name} ${item.best_for} ${item.features.join(" ")}`;

  return ARCHIVE_PRIORITY_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
}

function isAutofeedCandidate(item: ShredderItem): boolean {
  return item.autofeed_capacity > 0;
}

function isSteelCandidate(item: ShredderItem): boolean {
  const normalizedText = `${item.name} ${item.best_for} ${item.features.join(" ")}`.toLowerCase();
  return ARCHIVE_PRIORITY_KEYWORDS.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  );
}

function prioritizeForEnterpriseArchive(
  items: ShredderItem[],
  scoreTable: Record<string, number>,
  clickCounts: ProductClickCounts,
  input: RecommendationInput
): ShredderItem[] {
  if (!isEnterpriseArchivePreset(input) || items.length === 0) {
    return sortWithTieBreaker(items, scoreTable, clickCounts);
  }

  const preferredItems = items.filter(
    (item) =>
      item.price >= ARCHIVE_PREFERRED_AUTOFEED_MIN_PRICE &&
      isAutofeedCandidate(item) &&
      isSteelCandidate(item)
  );
  const rankedPreferredItems = sortWithTieBreaker(preferredItems, scoreTable, clickCounts);
  const priorityItems = items.filter(isArchivePriorityCandidate);
  const rankedPriorityItems = sortWithTieBreaker(priorityItems, scoreTable, clickCounts);
  const rankedItems = sortWithTieBreaker(items, scoreTable, clickCounts);

  if (rankedPreferredItems.length >= 3) {
    return rankedPreferredItems;
  }

  if (rankedPriorityItems.length === 0) {
    return rankedItems;
  }

  if (rankedPriorityItems.length >= 3) {
    return [...rankedPreferredItems, ...rankedPriorityItems].filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.id === item.id) === index
    );
  }

  const seenIds = new Set<string>();
  const merged: ShredderItem[] = [];

  for (const item of rankedPreferredItems) {
    if (seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    merged.push(item);
  }

  for (const item of rankedPriorityItems) {
    if (seenIds.has(item.id)) {
      continue;
    }
    seenIds.add(item.id);
    merged.push(item);
  }

  for (const item of rankedItems) {
    if (merged.length >= 3) {
      break;
    }
    if (seenIds.has(item.id)) {
      continue;
    }
    seenIds.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function getScoreBreakdown(item: ShredderItem, input: RecommendationInput): {
  peopleScore: number;
  volumeScore: number;
  budgetScore: number;
  finalScore: number;
} {
  const targetPeople = PEOPLE_MIDPOINT[input.people_band];
  const peopleScore = distanceScore(item.derived.people_estimate, targetPeople);
  const volumeScore = distanceScore(item.derived.volume_estimate_per_day, input.volume_per_day);
  const budgetRange = getBudgetRange(input);
  const budgetScore = budgetRange ? distanceScore(item.price, getBudgetTarget(budgetRange)) : 0.5;

  const finalScore = safeScore(peopleScore * 0.4 + volumeScore * 0.4 + budgetScore * 0.2);

  return {
    peopleScore,
    volumeScore,
    budgetScore,
    finalScore
  };
}

function calculateFinalScore(item: ShredderItem, input: RecommendationInput): number {
  return getScoreBreakdown(item, input).finalScore;
}

function getPopularityBoost(
  itemId: string,
  clickCounts: ProductClickCounts,
  maxClicks: number
): number {
  if (maxClicks <= 0) {
    return 0;
  }

  const currentClicks = Math.max(0, clickCounts[itemId] ?? 0);
  if (currentClicks === 0) {
    return 0;
  }

  return Math.log1p(currentClicks) / Math.log1p(maxClicks);
}

function sortWithTieBreaker(
  items: ShredderItem[],
  scoreTable: Record<string, number>,
  clickCounts: ProductClickCounts
): ShredderItem[] {
  return [...items].sort((left, right) => {
    const scoreDiff = (scoreTable[right.id] ?? 0) - (scoreTable[left.id] ?? 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    const clickDiff = (clickCounts[right.id] ?? 0) - (clickCounts[left.id] ?? 0);
    if (clickDiff !== 0) {
      return clickDiff;
    }

    const priceDiff = left.price - right.price;
    if (priceDiff !== 0) {
      return priceDiff;
    }

    return right.derived.volume_estimate_per_day - left.derived.volume_estimate_per_day;
  });
}

function toScoreTable(
  items: ShredderItem[],
  input: RecommendationInput,
  applyBudgetPenalty: boolean,
  clickCounts: ProductClickCounts
): Record<string, number> {
  const table: Record<string, number> = {};
  const maxClicks = Math.max(0, ...Object.values(clickCounts).map((value) => Math.max(0, value)));
  const budgetRange = getBudgetRange(input);
  const hasBudget = budgetRange !== null;

  for (const item of items) {
    let score = calculateFinalScore(item, input);
    if (hasBudget && applyBudgetPenalty && !isWithinBudgetRange(item.price, budgetRange!)) {
      score = safeScore(score - 0.15);
    }

    score = safeScore(score + getPopularityBoost(item.id, clickCounts, maxClicks) * 0.18);
    table[item.id] = score;
  }

  return table;
}

function ensureThreeItems(items: ShredderItem[], candidates: ShredderItem[]): ShredderItem[] {
  const selected = [...items];

  for (const candidate of candidates) {
    if (selected.length >= 3) {
      break;
    }

    if (!selected.some((item) => item.id === candidate.id)) {
      selected.push(candidate);
    }
  }

  while (selected.length < 3 && selected.length > 0) {
    selected.push(selected[selected.length - 1]);
  }

  return selected.slice(0, 3);
}

export function recommendShredders(
  items: ShredderItem[],
  input: RecommendationInput,
  clickCounts: ProductClickCounts = {}
): RecommendationResult {
  if (items.length === 0) {
    return {
      items: [],
      mode: "near",
      scores: {}
    };
  }

  const scopedItems = getSecurityFilteredItems(items, input);
  if (scopedItems.length === 0) {
    return {
      items: [],
      mode: "near",
      scores: {}
    };
  }

  const budgetRange = getBudgetRange(input);
  const hasBudget = budgetRange !== null;
  const strictCandidates = hasBudget
    ? scopedItems.filter((item) => isWithinBudgetRange(item.price, budgetRange!))
    : scopedItems;
  const strictScores = toScoreTable(strictCandidates, input, false, clickCounts);
  const strictRanked = prioritizeForEnterpriseArchive(strictCandidates, strictScores, clickCounts, input);

  if (strictRanked.length >= 3) {
    const topThree = strictRanked.slice(0, 3);

    return {
      items: topThree,
      mode: "strict",
      scores: Object.fromEntries(topThree.map((item) => [item.id, strictScores[item.id] ?? 0]))
    };
  }

  const nearSource = hasBudget ? strictCandidates : scopedItems;
  const nearScores = toScoreTable(nearSource, input, !hasBudget, clickCounts);
  const nearRanked = prioritizeForEnterpriseArchive(nearSource, nearScores, clickCounts, input);
  const topThree = ensureThreeItems(nearRanked.slice(0, 3), nearRanked);

  return {
    items: topThree,
    mode: "near",
    scores: Object.fromEntries(topThree.map((item) => [item.id, nearScores[item.id] ?? 0]))
  };
}

export function peopleBandLabelToMidpoint(peopleBand: PeopleBand): number {
  return PEOPLE_MIDPOINT[peopleBand];
}

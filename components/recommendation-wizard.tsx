"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  Dictionary,
  Locale,
  RecommendationInput,
  SecurityLevel,
  ShredderItem,
  WizardPresetId
} from "@/lib/types";

interface RecommendationWizardProps {
  locale: Locale;
  items: ShredderItem[];
  dictionary: Dictionary["wizard"];
  onSubmit: (input: RecommendationInput) => void;
}

type BudgetRangeOption = {
  value: string;
  label: string;
  minBudget: number | "";
  maxBudget: number | "";
};

const RANGE_LEVEL_COUNT = 5;

function getNumberFormatter(locale: Locale): Intl.NumberFormat {
  return locale === "ko" ? new Intl.NumberFormat("ko-KR") : new Intl.NumberFormat("en-US");
}

function formatMoney(locale: Locale, value: number): string {
  const formatCurrency = getNumberFormatter(locale);
  const formatted = formatCurrency.format(Math.floor(value));
  return locale === "ko" ? `${formatted}원` : formatted;
}

function isP5OrHigher(level: SecurityLevel): boolean {
  return Number(level.split("-")[1]) >= 5;
}

function buildBudgetOptions(items: ShredderItem[], locale: Locale): BudgetRangeOption[] {
  const noBudgetLabel = locale === "ko" ? "선택 안함" : "No budget";
  const noBudgetOption: BudgetRangeOption = {
    value: "",
    label: noBudgetLabel,
    minBudget: "",
    maxBudget: ""
  };

  const uniqueSortedPrices = Array.from(
    new Set(items.map((item) => item.price).filter((price) => Number.isFinite(price)))
  ).sort((left, right) => left - right);

  if (uniqueSortedPrices.length === 0) {
    return [noBudgetOption];
  }

  const levelCount = Math.min(RANGE_LEVEL_COUNT, uniqueSortedPrices.length);
  const ranges: BudgetRangeOption[] = [];

  for (let level = 1; level <= levelCount; level += 1) {
    const startIndex = Math.floor((uniqueSortedPrices.length * (level - 1)) / levelCount);
    const endIndex = Math.max(
      startIndex,
      Math.floor((uniqueSortedPrices.length * level) / levelCount) - 1
    );
    const minValue = uniqueSortedPrices[startIndex] ?? uniqueSortedPrices[0];
    const maxValue = uniqueSortedPrices[endIndex] ?? uniqueSortedPrices[uniqueSortedPrices.length - 1];

    if (minValue === undefined || maxValue === undefined) {
      continue;
    }

    ranges.push({
      value: String(maxValue),
      minBudget: minValue,
      maxBudget: maxValue,
      label:
        locale === "ko"
          ? `단계 ${level} (${formatMoney(locale, minValue)} ~ ${formatMoney(locale, maxValue)})`
          : `Level ${level} (${formatMoney(locale, minValue)} - ${formatMoney(locale, maxValue)})`
    });
  }

  return [noBudgetOption, ...ranges];
}

const PRESET_ORDER: WizardPresetId[] = [
  "home_light",
  "small_office",
  "team_standard",
  "security_sensitive",
  "enterprise_archive"
];

const PRESET_INPUTS: Record<WizardPresetId, Pick<RecommendationInput, "people_band" | "volume_per_day">> = {
  home_light: {
    people_band: "1_2",
    volume_per_day: 120
  },
  small_office: {
    people_band: "3_5",
    volume_per_day: 280
  },
  team_standard: {
    people_band: "6_10",
    volume_per_day: 600
  },
  security_sensitive: {
    people_band: "11_20",
    volume_per_day: 900
  },
  enterprise_archive: {
    people_band: "over_20",
    volume_per_day: 2500
  }
};

export function RecommendationWizard({ locale, items, dictionary, onSubmit }: RecommendationWizardProps) {
  const [presetId, setPresetId] = useState<WizardPresetId>("small_office");
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const presetItems = useMemo(
    () =>
      presetId === "security_sensitive"
        ? items.filter((item) => isP5OrHigher(item.derived.security_level))
        : items,
    [items, presetId]
  );

  const budgetOptions = useMemo(() => buildBudgetOptions(presetItems, locale), [presetItems, locale]);
  const presetInput = useMemo(() => PRESET_INPUTS[presetId], [presetId]);
  const canSubmit = Boolean(presetInput);
  const budgetInputId = "budget_input";

  useEffect(() => {
    if (!showBudgetInput) {
      setBudgetInput("");
      return;
    }

    if (budgetInput === "" || budgetOptions.some((option) => option.value === budgetInput)) {
      return;
    }

    setBudgetInput("");
  }, [showBudgetInput, budgetInput, budgetOptions]);

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    const selectedBudget = budgetOptions.find((option) => option.value === budgetInput);
    const budgetMin =
      showBudgetInput && selectedBudget?.minBudget !== "" ? selectedBudget.minBudget : undefined;
    const budgetMax =
      showBudgetInput && selectedBudget?.maxBudget !== "" ? selectedBudget.maxBudget : undefined;

    onSubmit({
      ...presetInput,
      budget: budgetMax,
      budget_min: budgetMin,
      budget_max: budgetMax,
      preset_id: presetId
    });
  };

  return (
    <section className="glass-card wizard-card" aria-label={dictionary.title}>
      <h2>{dictionary.title}</h2>
      <p>{dictionary.subtitle}</p>

      <div className="wizard-step">
        <label className="field-label">{dictionary.profile.label}</label>
        <p className="field-hint">{dictionary.profile.hint}</p>
        <div className="preset-grid">
          {PRESET_ORDER.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`touch-button option-button ${presetId === preset ? "active" : ""}`}
              onClick={() => setPresetId(preset)}
            >
              <span className="option-title">{dictionary.profile.options[preset].title}</span>
              <span className="option-description">{dictionary.profile.options[preset].description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard-step">
        <label className="field-label" htmlFor={budgetInputId}>
          {dictionary.budget.label}
        </label>
        <button
          type="button"
          className="touch-button secondary"
          onClick={() => setShowBudgetInput((current) => !current)}
        >
          {showBudgetInput
            ? locale === "ko"
              ? "예산 닫기"
              : "Hide budget"
            : locale === "ko"
              ? "예산 보기"
              : "Set budget"}
        </button>
        <p className="field-hint">{dictionary.budget.hint}</p>
        {showBudgetInput && (
          <div className="text-field">
            <select
              id={budgetInputId}
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
            >
              {budgetOptions.map((option) => (
                <option key={`budget_${option.value || "none"}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="wizard-actions">
        <button type="button" className="touch-button primary" disabled={!canSubmit} onClick={handleSubmit}>
          {dictionary.actions.submit}
        </button>
      </div>
    </section>
  );
}

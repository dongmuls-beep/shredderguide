"use client";

import Image from "next/image";

import { formatCurrency, formatNumber } from "@/lib/format";
import { getScoreBreakdown } from "@/lib/recommendation";
import type { Dictionary, Locale, RecommendationInput, RecommendationResult } from "@/lib/types";

interface RecommendationResultCardsProps {
  locale: Locale;
  dictionary: Dictionary["recommendation"];
  input: RecommendationInput | null;
  result: RecommendationResult | null;
  onProductClick?: (productId: string) => void;
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function RecommendationResultCards({
  locale,
  dictionary,
  input,
  result,
  onProductClick
}: RecommendationResultCardsProps) {
  if (!result || result.items.length === 0) {
    return (
      <section className="glass-card result-shell result-shell-empty" aria-live="polite">
        <h2>{dictionary.title}</h2>
        <p>{dictionary.noData}</p>
      </section>
    );
  }

  return (
    <section className="result-shell" aria-live="polite">
      <div className="result-header glass-card">
        <h2>{dictionary.title}</h2>
        <span className="result-mode-badge">
          {result.mode === "strict" ? dictionary.strictMode : dictionary.nearMode}
        </span>
      </div>

      <div className="result-grid">
        {result.items.map((item) => {
          const breakdown = input ? getScoreBreakdown(item, input) : null;

          return (
            <article key={`${item.id}-${item.name}`} className="glass-card result-card">
              <div className="result-image-wrap">
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={720}
                  height={480}
                  className="result-image"
                />
              </div>
              <div className="result-card-body">
                <h3>{item.name}</h3>
                <p className="price-highlight">{formatCurrency(item.price, locale)}</p>
                {breakdown && (
                  <ul className="reason-list">
                    <li>
                      {dictionary.reasonPeople}: {toPercent(breakdown.peopleScore)}
                    </li>
                    <li>
                      {dictionary.reasonVolume}: {toPercent(breakdown.volumeScore)}
                    </li>
                    <li>
                      {dictionary.reasonBudget}: {toPercent(breakdown.budgetScore)}
                    </li>
                  </ul>
                )}
                <div className="spec-grid">
                  <div>
                    <span>{dictionary.sheetCapacity}</span>
                    <strong>{formatNumber(item.sheet_capacity, locale)}</strong>
                  </div>
                  <div>
                    <span>{dictionary.runTime}</span>
                    <strong>{formatNumber(item.run_time_min, locale)} min</strong>
                  </div>
                  <div>
                    <span>{dictionary.binCapacity}</span>
                    <strong>{formatNumber(item.bin_capacity_l, locale)} L</strong>
                  </div>
                  <div>
                    <span>{dictionary.securityLevel}</span>
                    <strong>{item.derived.security_level}</strong>
                  </div>
                </div>
                <p className="volume-summary">
                  {dictionary.dailyVolume}: {formatNumber(item.derived.volume_estimate_per_day, locale)}
                </p>
                <a
                  href={item.product_url}
                  target="_blank"
                  rel="noreferrer"
                  className="touch-button primary"
                  onClick={() => onProductClick?.(item.id)}
                >
                  {dictionary.buyNow}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

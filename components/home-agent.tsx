"use client";

import Link from "next/link";
import { useState } from "react";

import { recommendShredders } from "@/lib/recommendation";
import { incrementProductClickCount, loadProductClickCounts } from "@/lib/product-clicks";
import type { Dictionary, Locale, RecommendationInput, RecommendationResult, ShredderItem } from "@/lib/types";

import { RecommendationResultCards } from "@/components/recommendation-result-cards";
import { RecommendationWizard } from "@/components/recommendation-wizard";

interface HomeAgentProps {
  locale: Locale;
  dictionary: Dictionary;
  items: ShredderItem[];
}

export function HomeAgent({ locale, dictionary, items }: HomeAgentProps) {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [input, setInput] = useState<RecommendationInput | null>(null);
  const [wizardKey, setWizardKey] = useState(0);

  const maintenanceHref = locale === "ko" ? "/maintenance" : "/en/maintenance";

  const handleSubmit = (nextInput: RecommendationInput) => {
    const latestCounts = loadProductClickCounts();
    setInput(nextInput);
    setResult(recommendShredders(items, nextInput, latestCounts));
  };

  const handleReset = () => {
    setResult(null);
    setInput(null);
    setWizardKey((current) => current + 1);
  };

  const handleProductClick = (productId: string) => {
    const nextCounts = incrementProductClickCount(productId);

    if (!input) {
      return;
    }

    setResult(recommendShredders(items, input, nextCounts));
  };

  return (
    <>
      <div className="home-grid">
        <RecommendationWizard
          key={wizardKey}
          locale={locale}
          items={items}
          dictionary={dictionary.wizard}
          onSubmit={handleSubmit}
        />
        <RecommendationResultCards
          locale={locale}
          dictionary={dictionary.recommendation}
          input={input}
          result={result}
          onProductClick={handleProductClick}
        />
      </div>

      <div className="home-actions">
        <button type="button" className="touch-button secondary" onClick={handleReset}>
          {dictionary.wizard.actions.reset}
        </button>
      </div>

      <section className="glass-card maintenance-summary">
        <h2>{dictionary.maintenanceSummary.title}</h2>
        <p>{dictionary.maintenanceSummary.description}</p>
        <Link href={maintenanceHref} className="touch-button primary">
          {dictionary.maintenanceSummary.cta}
        </Link>
      </section>
    </>
  );
}

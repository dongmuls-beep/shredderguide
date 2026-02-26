import { z, type ZodType } from "zod";

import en from "@/content/i18n/en.json";
import ko from "@/content/i18n/ko.json";
import rawData from "@/data/shredders.json";
import type { Dictionary, Locale, ShredderDataset } from "@/lib/types";

const derivedSchema = z.object({
  security_level: z.enum(["P-1", "P-2", "P-3", "P-4", "P-5", "P-6", "P-7"]),
  volume_estimate_per_day: z.number().nonnegative(),
  people_estimate: z.number().nonnegative()
});

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  image_url: z.string().url(),
  product_url: z.string().url(),
  sheet_capacity: z.number().nonnegative(),
  autofeed_capacity: z.number().nonnegative().default(0),
  cut_size: z.string().min(1),
  bin_capacity_l: z.number().nonnegative(),
  run_time_min: z.number().nonnegative(),
  features: z.array(z.string()),
  best_for: z.string().min(1),
  price: z.number().nonnegative(),
  derived: derivedSchema
});

const datasetSchema = z.object({
  version: z.string().min(1),
  updated_at: z.string().datetime(),
  items: z.array(itemSchema).min(3)
});

const dictionarySchema: ZodType<Dictionary> = z.object({
  locale: z.enum(["ko", "en"]),
  site: z.object({
    title: z.string(),
    subtitle: z.string()
  }),
  nav: z.object({
    home: z.string(),
    shredders: z.string(),
    maintenance: z.string(),
    switchToKo: z.string(),
    switchToEn: z.string()
  }),
  wizard: z.object({
    title: z.string(),
    subtitle: z.string(),
    profile: z.object({
      label: z.string(),
      hint: z.string(),
      options: z.record(
        z.object({
          title: z.string(),
          description: z.string()
        })
      )
    }),
    budget: z.object({
      label: z.string(),
      hint: z.string(),
      placeholder: z.string()
    }),
    actions: z.object({
      submit: z.string(),
      reset: z.string()
    })
  }),
  recommendation: z.object({
    title: z.string(),
    strictMode: z.string(),
    nearMode: z.string(),
    noData: z.string(),
    reasonPeople: z.string(),
    reasonVolume: z.string(),
    reasonBudget: z.string(),
    dailyVolume: z.string(),
    runTime: z.string(),
    sheetCapacity: z.string(),
    binCapacity: z.string(),
    securityLevel: z.string(),
    buyNow: z.string(),
    currency: z.string()
  }),
  maintenanceSummary: z.object({
    title: z.string(),
    description: z.string(),
    cta: z.string()
  }),
  catalog: z.object({
    title: z.string(),
    subtitle: z.string(),
    searchPlaceholder: z.string(),
    filters: z.object({
      title: z.string(),
      minSecurityLevel: z.string(),
      minPrice: z.string(),
      maxPrice: z.string(),
      minSheetCapacity: z.string(),
      minAutofeedCapacity: z.string(),
      minBinCapacity: z.string(),
      minRunTime: z.string(),
      apply: z.string(),
      close: z.string(),
      open: z.string(),
      reset: z.string()
    }),
    sort: z.object({
      label: z.string(),
      recommended: z.string(),
      priceAsc: z.string(),
      priceDesc: z.string()
    }),
    pagination: z.object({
      previous: z.string(),
      next: z.string(),
      page: z.string()
    }),
    empty: z.string()
  }),
  maintenance: z.object({
    title: z.string(),
    subtitle: z.string()
  })
});

const dictionaries: Record<Locale, unknown> = {
  ko,
  en
};

export function getShreddersData(): ShredderDataset {
  return datasetSchema.parse(rawData);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionarySchema.parse(dictionaries[locale]);
}


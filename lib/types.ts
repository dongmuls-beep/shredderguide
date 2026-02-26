export type SecurityLevel = "P-1" | "P-2" | "P-3" | "P-4" | "P-5" | "P-6" | "P-7";

export type PeopleBand = "1_2" | "3_5" | "6_10" | "11_20" | "over_20";

export type WizardPresetId =
  | "home_light"
  | "small_office"
  | "team_standard"
  | "security_sensitive"
  | "enterprise_archive";

export type Locale = "ko" | "en";

export interface ShredderDerived {
  security_level: SecurityLevel;
  volume_estimate_per_day: number;
  people_estimate: number;
}

export interface ShredderItem {
  id: string;
  name: string;
  image_url: string;
  product_url: string;
  sheet_capacity: number;
  autofeed_capacity: number;
  cut_size: string;
  bin_capacity_l: number;
  run_time_min: number;
  features: string[];
  best_for: string;
  price: number;
  derived: ShredderDerived;
}

export interface ShredderDataset {
  version: string;
  updated_at: string;
  items: ShredderItem[];
}

export interface RecommendationInput {
  people_band: PeopleBand;
  volume_per_day: number;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  preset_id?: WizardPresetId;
}

export interface RecommendationResult {
  items: ShredderItem[];
  mode: "strict" | "near";
  scores: Record<string, number>;
}

export type Dictionary = {
  locale: Locale;
  site: {
    title: string;
    subtitle: string;
  };
  nav: {
    home: string;
    shredders: string;
    maintenance: string;
    switchToKo: string;
    switchToEn: string;
  };
  wizard: {
    title: string;
    subtitle: string;
    profile: {
      label: string;
      hint: string;
      options: Record<WizardPresetId, { title: string; description: string }>;
    };
    budget: {
      label: string;
      hint: string;
      placeholder: string;
    };
    actions: {
      submit: string;
      reset: string;
    };
  };
  recommendation: {
    title: string;
    strictMode: string;
    nearMode: string;
    noData: string;
    reasonPeople: string;
    reasonVolume: string;
    reasonBudget: string;
    dailyVolume: string;
    runTime: string;
    sheetCapacity: string;
    binCapacity: string;
    securityLevel: string;
    buyNow: string;
    currency: string;
  };
  maintenanceSummary: {
    title: string;
    description: string;
    cta: string;
  };
  catalog: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filters: {
    title: string;
      minPrice: string;
      minSecurityLevel: string;
      maxPrice: string;
      minSheetCapacity: string;
      minAutofeedCapacity: string;
      minBinCapacity: string;
      minRunTime: string;
      apply: string;
      close: string;
      open: string;
      reset: string;
    };
    sort: {
      label: string;
      recommended: string;
      priceAsc: string;
      priceDesc: string;
    };
    pagination: {
      previous: string;
      next: string;
      page: string;
    };
    empty: string;
  };
  maintenance: {
    title: string;
    subtitle: string;
  };
};

export type CatalogSort = "recommended" | "price_asc" | "price_desc";

export interface CatalogFilters {
  search: string;
  minSecurityLevel: SecurityLevel | "";
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
  sort: CatalogSort;
  page: number;
}

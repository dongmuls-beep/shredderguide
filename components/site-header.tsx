import Link from "next/link";

import type { Dictionary, Locale } from "@/lib/types";

interface SiteHeaderProps {
  locale: Locale;
  nav: Dictionary["nav"];
}

export function SiteHeader({ locale, nav }: SiteHeaderProps) {
  const homeHref = locale === "ko" ? "/" : "/en";
  const shreddersHref = locale === "ko" ? "/shredders" : "/en/shredders";
  const maintenanceHref = locale === "ko" ? "/maintenance" : "/en/maintenance";
  const switchHref = locale === "ko" ? "/en" : "/";
  const switchLabel = locale === "ko" ? nav.switchToEn : nav.switchToKo;

  return (
    <header className="site-header glass-card">
      <nav className="site-nav" aria-label="Primary">
        <div className="site-nav-links">
          <Link href={homeHref}>{nav.home}</Link>
          <Link href={shreddersHref}>{nav.shredders}</Link>
          <Link href={maintenanceHref}>{nav.maintenance}</Link>
        </div>
        <Link href={switchHref} className="lang-switch touch-button">
          {switchLabel}
        </Link>
      </nav>
    </header>
  );
}

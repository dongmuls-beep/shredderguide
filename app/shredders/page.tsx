import { ShredderFilters } from "@/components/shredder-filters";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, getShreddersData } from "@/lib/data-loader";

export default function ShreddersPage() {
  const dictionary = getDictionary("ko");
  const data = getShreddersData();

  return (
    <>
      <SiteHeader locale="ko" nav={dictionary.nav} />
      <section className="hero glass-card reveal">
        <h1>{dictionary.catalog.title}</h1>
        <p>{dictionary.catalog.subtitle}</p>
      </section>
      <ShredderFilters locale="ko" dictionary={dictionary} items={data.items} />
    </>
  );
}

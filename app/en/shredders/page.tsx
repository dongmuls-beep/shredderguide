import { ShredderFilters } from "@/components/shredder-filters";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, getShreddersData } from "@/lib/data-loader";

export default function ShreddersPageEn() {
  const dictionary = getDictionary("en");
  const data = getShreddersData();

  return (
    <>
      <SiteHeader locale="en" nav={dictionary.nav} />
      <section className="hero glass-card reveal">
        <h1>{dictionary.catalog.title}</h1>
        <p>{dictionary.catalog.subtitle}</p>
      </section>
      <ShredderFilters locale="en" dictionary={dictionary} items={data.items} />
    </>
  );
}

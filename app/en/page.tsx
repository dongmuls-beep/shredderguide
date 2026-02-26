import { HomeAgent } from "@/components/home-agent";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, getShreddersData } from "@/lib/data-loader";

export default function HomePageEn() {
  const dictionary = getDictionary("en");
  const data = getShreddersData();

  return (
    <>
      <SiteHeader locale="en" nav={dictionary.nav} />
      <section className="hero glass-card reveal">
        <h1>{dictionary.site.title}</h1>
        <p>{dictionary.site.subtitle}</p>
      </section>
      <HomeAgent locale="en" dictionary={dictionary} items={data.items} />
    </>
  );
}

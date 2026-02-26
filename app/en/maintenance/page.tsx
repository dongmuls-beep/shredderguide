import ReactMarkdown from "react-markdown";

import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/lib/data-loader";
import { getMaintenanceContent } from "@/lib/maintenance-content";

export default async function MaintenancePageEn() {
  const dictionary = getDictionary("en");
  const markdown = await getMaintenanceContent("en");

  return (
    <>
      <SiteHeader locale="en" nav={dictionary.nav} />
      <section className="hero glass-card reveal">
        <h1>{dictionary.maintenance.title}</h1>
        <p>{dictionary.maintenance.subtitle}</p>
      </section>
      <article className="glass-card maintenance-content">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </article>
    </>
  );
}

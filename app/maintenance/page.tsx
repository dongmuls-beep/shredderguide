import ReactMarkdown from "react-markdown";

import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/lib/data-loader";
import { getMaintenanceContent } from "@/lib/maintenance-content";

export default async function MaintenancePage() {
  const dictionary = getDictionary("ko");
  const markdown = await getMaintenanceContent("ko");

  return (
    <>
      <SiteHeader locale="ko" nav={dictionary.nav} />
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

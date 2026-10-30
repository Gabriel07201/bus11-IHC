import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BUS11_FACTORS, BUS11_ITEMS } from "@/lib/bus11";
import { getMessages, isStudyLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function ProtocolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStudyLocale(locale)) notFound();
  const messages = getMessages(locale);

  return (
    <main className="page-container">
      <Link className="back-link" href={`/${locale}/researcher`}><ArrowLeft size={15} aria-hidden="true" />{messages.back}</Link>
      <div className="page-heading"><div><h1>{messages.protocolTitle}</h1><p>{messages.protocolDescription}</p></div></div>
      <p className="notice">{messages.protocolNote}</p>

      <section className="section-block" aria-labelledby="factor-list-title">
        <div className="section-heading"><div><h2 id="factor-list-title">{messages.factorMeans}</h2></div></div>
        <div className="panel panel-body">
          {BUS11_FACTORS.map((factor) => (
            <div className="protocol-factor" key={factor.id}>
              <strong>{messages[factor.labelKey]}</strong>
              <code>{factor.items.map((item) => String(item).padStart(2, "0")).join(" · ")}</code>
              <span>{factor.items.length} {messages.itemCount}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="bus-items-title">
        <div className="section-heading"><div><h2 id="bus-items-title">{messages.protocolItemsTitle}</h2><p>{messages.responseScale}: {messages.responseAnchorOne} (1) – {messages.responseAnchorFive} (5).</p></div></div>
        <div className="panel panel-body"><ol className="protocol-items">
          {BUS11_ITEMS.map((item) => <li key={item.number}>{locale === "en" ? item.en : item.pt}</li>)}
        </ol></div>
      </section>

      <section className="section-block notice"><strong>{messages.normalizedScore}</strong><p>{messages.formulaNotice}</p></section>
    </main>
  );
}

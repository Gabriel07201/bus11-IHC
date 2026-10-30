import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Languages } from "lucide-react";
import { getMessages, isStudyLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <Suspense fallback={<div className="home-page" aria-busy="true"><main className="home-main"><div className="skeleton-block" aria-hidden="true" /></main></div>}>
      <HomeContent params={params} />
    </Suspense>
  );
}

async function HomeContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStudyLocale(locale)) notFound();
  const messages = getMessages(locale);
  const otherLocale = locale === "pt-BR" ? "en" : "pt-BR";

  return (
    <div className="home-page">
      <header className="site-header">
        <Link className="brand" href={`/${locale}`} aria-label={messages.appName}>
          <span className="brand-mark">B11</span>
          <span className="brand-name">BUS-11 <small>Lab</small></span>
        </Link>
        <Link className="language-link" href={`/${otherLocale}`} aria-label={messages.language}>
          <Languages size={17} aria-hidden="true" />
          {otherLocale === "en" ? messages.english : messages.portuguese}
        </Link>
      </header>

      <main className="home-main">
        <section className="home-intro">
          <h1>{messages.homeTitle}</h1>
          <p>{messages.appDescription}</p>
        </section>

        <nav className="entry-list" aria-label={messages.appName}>
          <Link className="entry-link" href={`/${locale}/researcher`}>
            <span className="entry-icon"><ClipboardList size={20} aria-hidden="true" /></span>
            <span className="entry-copy">
              <strong>{messages.enterResearcherArea}</strong>
              <span>{messages.homeResearcher}</span>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="entry-link" href={`/${locale}/participant`}>
            <span className="entry-icon"><ArrowRight size={20} aria-hidden="true" /></span>
            <span className="entry-copy">
              <strong>{messages.enterParticipantArea}</strong>
              <span>{messages.homeParticipant}</span>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </nav>
      </main>

      <footer className="site-footer">
        <span>{messages.appName} · {messages.appDescription}</span>
      </footer>
    </div>
  );
}

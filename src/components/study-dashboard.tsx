"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Plus } from "lucide-react";
import { useResearcherAccess } from "@/components/researcher-access";
import { BUS11_FACTORS } from "@/lib/bus11";
import { getMessages } from "@/lib/i18n";

export function StudyDashboard() {
  const { locale, studies } = useResearcherAccess();
  const messages = getMessages(locale);
  const totalParticipants = studies.reduce((sum, study) => sum + study.participantCount, 0);
  const totalEvaluations = studies.reduce((sum, study) => sum + study.completedCount, 0);

  return (
    <main className="page-container">
      <div className="page-heading">
        <div><h1>{messages.dashboardTitle}</h1><p>{messages.dashboardDescription}</p></div>
        <div className="page-heading-actions">
          <Link className="button button-primary" href={`/${locale}/researcher/studies/new`}>
            <Plus size={17} aria-hidden="true" />{messages.createStudy}
          </Link>
        </div>
      </div>

      <div className="results-overview">
        <div className="overview-item"><strong>{studies.length}</strong><span>{messages.studyCount}</span></div>
        <div className="overview-item"><strong>{totalParticipants}</strong><span>{messages.participantCount}</span></div>
        <div className="overview-item"><strong>{totalEvaluations}</strong><span>{messages.completedEvaluationCount}</span></div>
      </div>

      <div className="dashboard-layout section-block">
        <section aria-labelledby="study-list-title">
          <div className="section-heading">
            <div><h2 id="study-list-title">{messages.studies}</h2><p>{messages.dashboardDescription}</p></div>
          </div>
          {studies.length === 0 ? (
            <div className="center-state panel">
              <div>
                <h2>{messages.noStudies}</h2>
                <p>{messages.noStudiesDescription}</p>
                <Link className="button button-primary" href={`/${locale}/researcher/studies/new`}>
                  <Plus size={16} aria-hidden="true" />{messages.createStudy}
                </Link>
              </div>
            </div>
          ) : (
            <div className="study-list">
              {studies.map((study) => {
                const statusLabel = study.status === "open" ? messages.statusOpen : study.status === "closed" ? messages.statusClosed : messages.statusDraft;
                return (
                  <article className="study-row" key={study.id}>
                    <div className="study-row-main">
                      <div className="study-row-meta">
                        <span className={`status-label status-${study.status}`}><span className="status-dot" />{statusLabel}</span>
                        <span className="muted small-text">{study.locale === "en" ? messages.english : messages.portuguese}</span>
                      </div>
                      <h2>{study.title}</h2>
                      <p>{study.description || messages.appDescription}</p>
                      <div className="study-row-stats">
                        <span>{study.participantCount} {messages.participantCount}</span>
                        <span>{study.completedCount} {messages.completedEvaluationCount}</span>
                        <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(study.updatedAt))}</span>
                      </div>
                    </div>
                    <div className="study-row-actions">
                      <Link className="button button-secondary" href={`/${locale}/researcher/studies/${study.id}`}>{messages.manageStudy}</Link>
                      {study.completedCount > 0 && <Link className="button button-quiet" href={`/${locale}/researcher/studies/${study.id}/results`}>{messages.viewResults}</Link>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="dashboard-side">
          <section>
            <div className="section-heading"><div><h2>{messages.protocol}</h2><p>{messages.protocolDescription}</p></div></div>
            <ul className="protocol-mini-list">
              {BUS11_FACTORS.map((factor) => (
                <li key={factor.id}><span>{messages[factor.labelKey]}</span><small>{factor.items.join(" · ")}</small></li>
              ))}
            </ul>
            <Link className="back-link" href={`/${locale}/researcher/protocol`}><BookOpenText size={15} aria-hidden="true" />{messages.openProtocol}<ArrowRight size={14} aria-hidden="true" /></Link>
          </section>
          <section className="notice">
            <strong>{messages.participantArea}</strong>
            <p>{messages.participantLinkHelp}</p>
            <Link href={`/${locale}/participant`} className="back-link">{messages.enterParticipantArea}<ArrowRight size={14} aria-hidden="true" /></Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

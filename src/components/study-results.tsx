"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useResearcherAccess } from "@/components/researcher-access";
import { apiErrorMessage, apiRequest } from "@/lib/client-api";
import { BUS11_FACTORS, BUS11_ITEMS, type Bus11FactorId, type StudyLocale } from "@/lib/bus11";
import type { ResultsSummary } from "@/lib/results";
import type { StudyStatus } from "@/lib/types";

interface ResultsResponse {
  study: { id: string; title: string; status: StudyStatus; locale: StudyLocale };
  results: ResultsSummary;
}

const factorLabelKey: Record<Bus11FactorId, "factorAccessibility" | "factorFunctionalConversation" | "factorPrivacy" | "factorResponsiveness"> = {
  accessibility: "factorAccessibility",
  functionalConversation: "factorFunctionalConversation",
  privacy: "factorPrivacy",
  responsiveness: "factorResponsiveness",
};

export function StudyResults({ studyId }: { studyId: string }) {
  const { locale, messages } = useResearcherAccess();
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [selectedBot, setSelectedBot] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  useEffect(() => {
    let active = true;
    apiRequest<ResultsResponse>(`/api/studies/${studyId}/results`)
      .then((response) => {
        if (!active) return;
        setData(response);
        setSelectedBot((current) => response.results.chatbots.some((bot) => bot.id === current) ? current : response.results.chatbots[0]?.id ?? "");
      })
      .catch((loadError: unknown) => {
        if (active) setError(apiErrorMessage(loadError, messages, messages.studyLoadError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [messages, retryVersion, studyId]);

  if (loading) return <main className="page-container"><div className="skeleton-block" aria-label={messages.loading} /></main>;
  if (!data) return <main className="page-container center-state"><div><h1>{messages.studyLoadError}</h1><p>{error}</p><button className="button button-secondary" onClick={() => { setLoading(true); setRetryVersion((current) => current + 1); }}>{messages.continue}</button></div></main>;

  const summary = data.results;
  const bot = summary.chatbots.find((item) => item.id === selectedBot) ?? summary.chatbots[0];
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const statusLabel = data.study.status === "open" ? messages.statusOpen : data.study.status === "closed" ? messages.statusClosed : messages.statusDraft;

  return (
    <main className="page-container">
      <Link className="back-link" href={`/${locale}/researcher/studies/${studyId}`}><ArrowLeft size={15} aria-hidden="true" />{messages.back}</Link>
      <div className="results-intro">
        <div>
          <div className={`status-label status-${data.study.status}`}><span className="status-dot" />{statusLabel}</div>
          <h1>{data.study.title}</h1>
          <p>{messages.resultsDescription}</p>
        </div>
        <a className="button button-primary" href={`/api/studies/${studyId}/export`}>
          <Download size={16} aria-hidden="true" />{messages.exportCsv}
        </a>
      </div>

      <p className="notice">{messages.formulaNotice}</p>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="results-overview">
        <div className="overview-item"><strong>{summary.evaluations}</strong><span>{messages.evaluations}</span></div>
        <div className="overview-item"><strong>{summary.participants}</strong><span>{messages.participantCountResults}</span></div>
        <div className="overview-item"><strong>{summary.chatbots.length}</strong><span>{messages.chatbotCount}</span></div>
      </div>

      {summary.evaluations === 0 ? (
        <section className="center-state section-block panel">
          <div><h2>{messages.noResults}</h2><p>{messages.noResultsDescription}</p></div>
        </section>
      ) : <>
        <section className="section-block" aria-labelledby="comparison-title">
          <div className="section-heading"><div><h2 id="comparison-title">{messages.chatbotComparison}</h2><p>{messages.factorMeans}</p></div></div>
          <p className="comparison-scroll-hint">{messages.comparisonScrollHint}</p>
          <div className="panel table-wrap comparison-table-wrap" role="region" aria-label={messages.chatbotComparison} tabIndex={0}>
            <table className="data-table comparison-table">
              <thead><tr>
                <th scope="col">{messages.chatbotName}</th><th scope="col" className="numeric">{messages.evaluations}</th>
                <th scope="col" className="numeric">{messages.overall} 0–100</th>
                {BUS11_FACTORS.map((factor) => <th className="numeric" scope="col" key={factor.id}>{messages[factorLabelKey[factor.id]]} 0–100</th>)}
              </tr></thead>
              <tbody>{summary.chatbots.map((chatbot) => <tr key={chatbot.id}>
                <td>{chatbot.name}</td><td className="numeric">{chatbot.evaluations}</td><td className="numeric"><strong>{number.format(chatbot.overall)}</strong></td>
                {BUS11_FACTORS.map((factor) => <td className="numeric" key={factor.id}>{number.format(chatbot.factors.find((item) => item.id === factor.id)?.normalized ?? 0)}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
        </section>

        {summary.chatbots.length > 0 ? <section className="section-block" aria-labelledby="bot-detail-title">
          <div className="section-heading"><div><h2 id="bot-detail-title">{messages.factorMeans}</h2><p>{messages.meanScale} · {messages.normalizedScore}</p></div>
            <div className="field results-select"><label htmlFor="results-chatbot">{messages.chatbotName}</label>
              <select id="results-chatbot" value={bot?.id ?? ""} onChange={(event) => setSelectedBot(event.target.value)}>
                {summary.chatbots.map((chatbot) => <option value={chatbot.id} key={chatbot.id}>{chatbot.name}</option>)}
              </select>
            </div>
          </div>

          {bot && <>
            <h3 className="selected-bot-title">{bot.name} <span>{bot.evaluations} {messages.evaluations}</span></h3>
            <div className="factor-grid">
              {BUS11_FACTORS.map((factor) => {
                const score = bot.factors.find((item) => item.id === factor.id);
                return <article className="factor-cell" key={factor.id}>
                  <h3>{messages[factorLabelKey[factor.id]]}</h3>
                  <div className="factor-score"><strong>{number.format(score?.normalized ?? 0)}</strong><span>/ 100</span></div>
                  <div className="factor-mean">{messages.meanScale}: {number.format(score?.mean ?? 0)}</div>
                </article>;
              })}
            </div>
            <div className="section-block">
              <div className="section-heading"><div><h3>{messages.itemDistribution}</h3><p>{bot.evaluations} {messages.evaluations}</p></div></div>
              <div className="panel panel-body">
                <div className="likert-legend" aria-label={messages.responseDistribution}>
                  {[1, 2, 3, 4, 5].map((value) => <span className="legend-item" key={value}>
                    <span className={`legend-swatch likert-${value}`} aria-hidden="true" />
                    {value}{value === 1 ? ` · ${messages.disagree}` : value === 3 ? ` · ${messages.neutral}` : value === 5 ? ` · ${messages.agree}` : ""}
                  </span>)}
                </div>
                <div className="item-list">
                  {bot.items.map((item) => {
                    const definition = BUS11_ITEMS[item.number - 1];
                    const mean = item.counts.reduce((sum, count, index) => sum + count * (index + 1), 0) / bot.evaluations;
                    return <div className="item-row" key={item.number}>
                      <div className="item-title"><span>{messages.item} {item.number}. {data.study.locale === "en" ? definition.en : definition.pt}</span><span>{number.format(mean)}</span></div>
                      <div className="likert-bar" role="img" aria-label={`${messages.item} ${item.number}: ${item.counts.join(", ")}`}>
                        {item.percentages.map((percent, index) => <span className={`likert-${index + 1}`} key={index} style={{ width: `${percent}%` }} />)}
                      </div>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          </>}
        </section> : <p className="notice section-block">{messages.noChatbotResults}</p>}
      </>}

      <section className="section-block" aria-labelledby="demographic-title">
        <div className="section-heading"><div><h2 id="demographic-title">{messages.demographicAnalysis}</h2><p>{messages.demographicNote}</p></div></div>
        {summary.demographics.length === 0 ? <p className="muted">{messages.noDemographicGroups}</p> : summary.demographics.map((demographic) => (
          <section className="demographic-section" key={demographic.id}>
            <h3>{demographic.label}</h3>
            {demographic.groups.length === 0 ? <p className="muted small-text">{messages.noDemographicGroups}</p> : (
              <div className="panel table-wrap demographic-table-wrap" role="region"
                aria-label={`${messages.demographicAnalysis}: ${demographic.label}`} tabIndex={0}>
                <table className="data-table demographic-table"><colgroup><col /><col /><col /><col /></colgroup><thead><tr>
                  <th scope="col">{demographic.label}</th><th scope="col" className="numeric">{messages.groupSize}</th>
                  <th scope="col" className="numeric">%</th><th scope="col" className="numeric">{messages.groupMean}</th>
                </tr></thead><tbody>{demographic.groups.map((group) => <tr key={group.value}>
                  <td>{group.value}</td><td className="numeric">{group.participants}</td><td className="numeric">{number.format(group.percent)}%</td><td className="numeric">{number.format(group.meanOverall)}</td>
                </tr>)}</tbody></table>
              </div>
            )}
          </section>
        ))}
      </section>
    </main>
  );
}

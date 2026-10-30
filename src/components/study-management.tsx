"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Download, ExternalLink, Pencil, Plus } from "lucide-react";
import { useResearcherAccess } from "@/components/researcher-access";
import { apiErrorMessage, apiRequest } from "@/lib/client-api";
import { formatAgeRange } from "@/lib/study-validation";
import type { StudyRecord, StudyStatus } from "@/lib/types";

const noSubscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function StudyManagement({ studyId }: { studyId: string }) {
  const { locale, messages, studies, setStudies } = useResearcherAccess();
  const [study, setStudy] = useState<StudyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [codeCount, setCodeCount] = useState(1);
  const [codes, setCodes] = useState<string[]>([]);
  const [participantPath, setParticipantPath] = useState("");
  const origin = useSyncExternalStore(noSubscribe, browserOrigin, serverOrigin);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ study: StudyRecord }>(`/api/studies/${studyId}`)
      .then(({ study: loadedStudy }) => {
        if (!active) return;
        setStudy(loadedStudy);
        setParticipantPath(`/${loadedStudy.locale}/participant`);
      })
      .catch((loadError: unknown) => {
        if (active) setError(apiErrorMessage(loadError, messages, messages.studyLoadError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [messages, studyId]);

  async function changeStatus(status: StudyStatus) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest<{ status: StudyStatus }>(`/api/studies/${studyId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setStudy((current) => current ? { ...current, status: response.status } : current);
      setStudies(studies.map((item) => item.id === studyId ? { ...item, status: response.status } : item));
    } catch (statusError) {
      setError(apiErrorMessage(statusError, messages, messages.studyStatusError));
    } finally {
      setPending(false);
    }
  }

  async function generateCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest<{ codes: string[]; participantPath: string }>(`/api/studies/${studyId}/codes`, {
        method: "POST",
        body: JSON.stringify({ count: codeCount }),
      });
      setCodes(response.codes);
      setParticipantPath(response.participantPath);
      setNotice(response.codes.length === 1 ? messages.codeGenerated : `${response.codes.length} ${messages.codesGenerated}`);
    } catch (codeError) {
      setError(apiErrorMessage(codeError, messages, messages.genericError));
    } finally {
      setPending(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(messages.copied);
    } catch {
      setError(messages.codeCopyError);
    }
  }

  if (loading) return <main className="page-container"><div className="skeleton-block" aria-label={messages.loading} /></main>;
  if (!study) return <main className="page-container center-state"><div><h1>{messages.studyNotFound}</h1><p>{error}</p><Link className="button button-secondary" href={`/${locale}/researcher`}>{messages.back}</Link></div></main>;

  const statusLabel = study.status === "open" ? messages.statusOpen : study.status === "closed" ? messages.statusClosed : messages.statusDraft;
  const participantUrl = origin && participantPath ? `${origin}${participantPath}` : participantPath;
  const studyStats = studies.find((item) => item.id === studyId);
  const nextStatus = study.status === "draft" || study.status === "closed" ? "open" : "closed";

  return (
    <main className="page-container">
      <Link className="back-link" href={`/${locale}/researcher`}><ArrowLeft size={15} aria-hidden="true" />{messages.back}</Link>
      <div className="page-heading">
        <div><h1>{study.title}</h1>{study.description && <p>{study.description}</p>}</div>
        <div className="page-heading-actions">
          <Link className="button button-secondary" href={`/${locale}/researcher/studies/${studyId}/edit`}><Pencil size={15} aria-hidden="true" />{messages.editStudy}</Link>
          <Link className="button button-primary" href={`/${locale}/researcher/studies/${studyId}/results`}>{messages.viewResults}</Link>
        </div>
      </div>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}

      <section className="study-summary" aria-label={messages.studySummary}>
        <span className={`status-label status-${study.status}`}><span className="status-dot" />{statusLabel}</span>
        <span className="summary-value"><strong>{studyStats?.participantCount ?? 0}</strong>{messages.participantCount}</span>
        <span className="summary-value"><strong>{studyStats?.completedCount ?? 0}</strong>{messages.completedEvaluationCount}</span>
        <span className="summary-value"><strong>{study.chatbots.length}</strong>{messages.chatbotCount}</span>
        <button className="button button-secondary" type="button" disabled={pending} onClick={() => void changeStatus(nextStatus)}>
          {study.status === "open" ? messages.closeCollection : study.status === "closed" ? messages.reopenCollection : messages.openCollection}
        </button>
      </section>

      <section className="section-block" aria-labelledby="study-configuration-title">
        <div className="section-heading"><div><h2 id="study-configuration-title">{messages.studyConfiguration}</h2></div></div>
        <div className="study-configuration-grid">
          <section className="panel">
            <div className="panel-header">
              <h3>{messages.studyLanguage}</h3>
              <p>{study.locale === "en" ? messages.english : messages.portuguese}</p>
            </div>
            <div className="panel-body study-consent">
              <h3>{study.consentTitle}</h3>
              <p>{study.consentBody}</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h3>{messages.demographicsTitle}</h3></div>
            <div className="panel-body">
              {study.demographicFields.length === 0 ? <p className="muted">{messages.noDemographicFields}</p> : (
                <ul className="study-demographic-list">
                  {study.demographicFields.map((field) => {
                    const label = field.id === "age" ? messages.includeAge
                      : field.id === "sex" ? messages.includeSex
                        : field.id === "nationality" ? messages.includeNationality
                          : field.label ?? field.id;
                    const detail = field.id === "age" && field.ranges?.length
                      ? field.ranges.map((range) => formatAgeRange(range)).join(" · ")
                      : field.options?.length ? field.options.join(" · ")
                        : field.type === "number" ? messages.fieldNumber
                          : messages.fieldText;
                    return <li key={field.id}><strong>{label}</strong><span>{detail}</span></li>;
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </section>

      <div className="management-grid section-block">
        <section className="panel">
          <div className="panel-header"><div><h2>{messages.chatbotTitle}</h2><p>{messages.quantityHelp}</p></div></div>
          <div className="panel-body">
            <p className="study-summary"><strong>{study.chatbotQuantity}</strong> {messages.chatbotsPerParticipant}</p>
            {study.chatbots.map((chatbot, index) => (
              <article className="chatbot-detail" key={chatbot.id}>
                <h3>{chatbot.name}</h3>
                <p className="task-copy">{chatbot.task}</p>
                <a href={chatbot.url} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" />{chatbot.url}</a>
                <span className="muted small-text">{messages.item} {index + 1}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel code-panel">
          <div className="panel-header"><div><h2>{messages.generateCodes}</h2><p>{messages.participantLinkHelp}</p></div></div>
          <div className="panel-body">
            {participantPath && <div className="field">
              <label>{messages.studyLink}</label>
              <div className="link-display"><a href={participantUrl} target="_blank" rel="noreferrer">{participantUrl}</a></div>
              <button className="button button-quiet" type="button" onClick={() => void copy(participantUrl)}><Copy size={15} aria-hidden="true" />{messages.copyLink}</button>
            </div>}
            <form className="inline-form" onSubmit={generateCodes}>
              <div className="field"><label htmlFor="code-count">{messages.codeQuantity}</label>
                <input id="code-count" type="number" min={1} max={50} value={codeCount} required disabled={study.status !== "open"}
                  onChange={(event) => setCodeCount(Number(event.target.value))} /></div>
              <button className="button button-primary" type="submit" disabled={pending || study.status !== "open"}>
                <Plus size={16} aria-hidden="true" />{pending ? messages.saving : messages.generateCodes}
              </button>
            </form>
            {study.status !== "open" && <p className="field-hint">{messages.collectionNotOpen}</p>}
            {codes.length > 0 && <div className="code-results">
              <p className="notice">{messages.codeSecurityNote}</p>
              <div className="code-list">
                {codes.map((code) => <div className="code-row" key={code}>
                  <strong className="code-value mono">{code}</strong>
                  <button className="button button-quiet" type="button" onClick={() => void copy(code)}><Copy size={15} aria-hidden="true" />{messages.copyCode}</button>
                </div>)}
              </div>
            </div>}
            <div className="download-link">
              <a className="button button-secondary" href={`/api/studies/${studyId}/export`}><Download size={15} aria-hidden="true" />{messages.exportCsv}</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

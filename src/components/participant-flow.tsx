"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, Languages, LoaderCircle } from "lucide-react";
import { ApiError, apiErrorMessage, apiRequest } from "@/lib/client-api";
import { BUS11_ITEMS, type StudyLocale } from "@/lib/bus11";
import { getMessages } from "@/lib/i18n";
import { formatAgeRange } from "@/lib/study-validation";
import { validationErrorMessage } from "@/lib/validation-messages";
import type { ParticipantSessionView } from "@/lib/types";

function demographicLabel(id: string, label: string | undefined, messages: ReturnType<typeof getMessages>): string {
  if (label) return label;
  if (id === "age") return messages.includeAge;
  if (id === "sex") return messages.includeSex;
  if (id === "nationality") return messages.includeNationality;
  return id;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id}>{message}</p> : null;
}

export function ParticipantFlow({ locale }: { locale: StudyLocale }) {
  const [code, setCode] = useState("");
  const [session, setSession] = useState<ParticipantSessionView | null>(null);
  const [demographics, setDemographics] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<(number | undefined)[]>(Array(11).fill(undefined));
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const messages = getMessages(session?.locale ?? locale);

  function fieldError(id: string): string | undefined {
    const code = fieldErrors[id];
    return code ? validationErrorMessage(code, messages) : undefined;
  }

  function changeDemographic(id: string, value: string) {
    setDemographics((current) => ({ ...current, [id]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setError("");
  }

  async function lookUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ session: ParticipantSessionView }>("/api/participant/lookup", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setSession(response.session);
      setDemographics({});
      setFieldErrors({});
      setAnswers(Array(11).fill(undefined));
      setTaskCompleted(false);
    } catch (lookupError) {
      setError(apiErrorMessage(lookupError, messages, messages.invalidCode));
    } finally {
      setBusy(false);
    }
  }

  async function recordConsent(accepted: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ session: ParticipantSessionView }>("/api/participant/consent", {
        method: "POST",
        body: JSON.stringify({ code, accepted }),
      });
      setSession(response.session);
    } catch (consentError) {
      setError(apiErrorMessage(consentError, messages, messages.genericError));
    } finally {
      setBusy(false);
    }
  }

  async function submitDemographics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    const values = Object.fromEntries(session?.demographicFields.map((field) => [field.id, demographics[field.id] ?? ""]) ?? []);
    try {
      const response = await apiRequest<{ session: ParticipantSessionView }>("/api/participant/demographics", {
        method: "POST",
        body: JSON.stringify({ code, demographics: values }),
      });
      setSession(response.session);
    } catch (demographicError) {
      setError(apiErrorMessage(demographicError, messages, messages.invalidDemographics));
      if (demographicError instanceof ApiError) setFieldErrors(demographicError.fields ?? {});
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answers.some((answer) => answer === undefined)) {
      setError(messages.selectAnswer);
      return;
    }
    const assignment = session?.assignments.find((item) => !item.completed);
    if (!assignment) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ session: ParticipantSessionView }>("/api/participant/answers", {
        method: "POST",
        body: JSON.stringify({ code, assignmentId: assignment.id, answers }),
      });
      setSession(response.session);
      setAnswers(Array(11).fill(undefined));
      setTaskCompleted(false);
      setNotice(messages.answersSaved);
    } catch (answerError) {
      setError(apiErrorMessage(answerError, messages, messages.selectAnswer));
    } finally {
      setBusy(false);
    }
  }

  function useAnotherCode() {
    setSession(null);
    setCode("");
    setDemographics({});
    setFieldErrors({});
    setAnswers(Array(11).fill(undefined));
    setTaskCompleted(false);
    setNotice("");
    setError("");
  }

  const assignment = session?.assignments.find((item) => !item.completed);
  const completedAssignments = session?.assignments.filter((item) => item.completed).length ?? 0;
  const otherLocale = locale === "pt-BR" ? "en" : "pt-BR";

  return (
    <main className="participant-shell">
      <header className="participant-header">
        <Link className="brand" href={`/${locale}`}>
          <span className="brand-mark">B11</span><span className="brand-name">BUS-11 <small>Lab</small></span>
        </Link>
        {!session && <Link className="language-switch" href={`/${otherLocale}/participant`} aria-label={messages.language}>
          <Languages size={16} aria-hidden="true" />{otherLocale === "en" ? messages.english : messages.portuguese}
        </Link>}
        {session && <span className="mono small-text">{messages.participantSessionCode}: {code}</span>}
      </header>

      {!session && <section className="participant-panel panel">
        <h1 className="participant-title">{messages.participantPageTitle}</h1>
        <p className="participant-subtitle">{messages.participantCodePrompt}</p>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <form className="form-stack section-block" onSubmit={lookUp}>
          <div className="field">
            <label htmlFor="participation-code">{messages.participantCode}</label>
            <input id="participation-code" name="code" value={code} required maxLength={24} autoComplete="one-time-code"
              autoCapitalize="characters" className="mono" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              onChange={(event) => setCode(event.target.value)} />
          </div>
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            {busy ? messages.loading : messages.continue}
          </button>
        </form>
      </section>}

      {session?.status === "issued" && <section className="participant-panel panel">
        <h1 className="participant-title">{session.title}</h1>
        {session.description && <p className="participant-subtitle">{session.description}</p>}
        <div className="consent-copy"><h2>{session.consentTitle}</h2><p>{session.consentBody}</p></div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <div className="participant-actions">
          <button className="button button-primary" type="button" disabled={busy} onClick={() => void recordConsent(true)}>
            {messages.consentAccept}<ArrowRight size={16} aria-hidden="true" />
          </button>
          <button className="button button-secondary" type="button" disabled={busy} onClick={() => void recordConsent(false)}>{messages.consentDecline}</button>
        </div>
      </section>}

      {session?.status === "declined" && <section className="participant-panel panel center-state">
        <div><h1>{messages.consentDeclined}</h1><button className="button button-secondary" type="button" onClick={useAnotherCode}>{messages.enterAnotherCode}</button></div>
      </section>}

      {session?.status === "consented" && <section className="participant-panel panel">
        <h1>{messages.demographicsHeading}</h1>
        <p className="participant-subtitle">{messages.demographicsParticipant}</p>
        {error && <div className="notice notice-error" role="alert">{fieldError("form") ?? error}</div>}
        <form className="form-stack section-block" onSubmit={submitDemographics} noValidate>
          {session.demographicFields.map((field) => {
            const errorId = `demographic-${field.id}-error`;
            const validationError = fieldError(field.id);
            const choices = field.id === "age" && field.ranges?.length
              ? field.ranges.map((range) => ({ value: range.id, label: formatAgeRange(range) }))
              : field.type === "singleChoice"
                ? field.options?.map((option) => ({ value: option, label: option }))
                : undefined;
            return <div className="field" key={field.id}>
              <label htmlFor={`demographic-${field.id}`}>{demographicLabel(field.id, field.label, messages)} <span aria-hidden="true">*</span></label>
              {choices ? (
                <select id={`demographic-${field.id}`} required value={demographics[field.id] ?? ""} aria-invalid={Boolean(validationError)}
                  aria-describedby={validationError ? errorId : undefined}
                  onChange={(event) => changeDemographic(field.id, event.target.value)}>
                  <option value="" disabled>—</option>
                  {choices.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
                </select>
              ) : (
                <input id={`demographic-${field.id}`} type={field.type === "number" ? "number" : "text"} required aria-invalid={Boolean(validationError)}
                  aria-describedby={validationError ? errorId : undefined}
                  min={field.id === "age" ? 0 : undefined} max={field.id === "age" ? 130 : undefined}
                  value={demographics[field.id] ?? ""} maxLength={field.type === "text" ? 250 : undefined}
                  onChange={(event) => changeDemographic(field.id, event.target.value)} />
              )}
              <FieldError id={errorId} message={validationError} />
            </div>;
          })}
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? messages.saving : messages.continue}<ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      </section>}

      {session?.status === "in_progress" && assignment && <section className="participant-panel panel">
        <h1 className="participant-title">{session.title}</h1>
        <p className="participant-subtitle">{messages.sessionResume}</p>
        {notice && <div className="notice notice-success" role="status">{notice}</div>}
        <div className="participant-progress">
          <span>{messages.questionnaireProgress} {completedAssignments + 1} / {session.assignments.length}</span>
          <span>{assignment.chatbot.name}</span>
        </div>

        <section aria-labelledby="task-title">
          <h2 id="task-title">{messages.chatbotTaskHeading}</h2>
          <p className="task-copy">{assignment.chatbot.task}</p>
          <a className="button button-secondary" href={assignment.chatbot.url} target="_blank" rel="noopener noreferrer">
            {messages.openChatbot}<ArrowRight size={16} aria-hidden="true" />
          </a>
          <p className="field-hint section-block">{messages.returnAndContinue}</p>
          <button className={`button ${taskCompleted ? "button-primary" : "button-secondary"} task-complete-button`} type="button"
            aria-pressed={taskCompleted} aria-controls="bus11-questionnaire"
            onClick={() => setTaskCompleted((current) => !current)}>
            {taskCompleted && <Check size={16} aria-hidden="true" />}{messages.taskCompleted}
          </button>
        </section>

        {taskCompleted && <form id="bus11-questionnaire" className="section-block" onSubmit={submitAnswers}>
          <div className="section-heading"><div><h2>{messages.questionnaireHeading}</h2><p>{messages.responseScale}: 1 = {messages.disagree}; 5 = {messages.agree}.</p></div></div>
          <div className="scale-extremes"><span>1 · {messages.disagree}</span><span>3 · {messages.neutral}</span><span>5 · {messages.agree}</span></div>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {notice && <div className="notice notice-success" role="status">{notice}</div>}
          <div className="question-list">
            {BUS11_ITEMS.map((item, index) => (
              <fieldset className="question fieldset-reset" key={item.number}>
                <legend>{messages.item} {item.number}. {session.locale === "en" ? item.en : item.pt}</legend>
                <div className="question-options">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label className="answer-option" key={value}>
                      <input type="radio" name={`bus11-item-${item.number}`} value={value} checked={answers[index] === value}
                        aria-label={`${messages.item} ${item.number}, ${value}`} onChange={() => setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer))} />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="form-actions">
            <span className="muted small-text">{messages.selectAnswer}</span>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? messages.saving : messages.submitAnswers}{!busy && <Check size={16} aria-hidden="true" />}
            </button>
          </div>
        </form>}
      </section>}

      {session?.status === "completed" && <section className="participant-panel panel center-state">
        <div><h1>{messages.participantComplete}</h1><p>{messages.participantCompleteDescription}</p>
          <button className="button button-secondary" type="button" onClick={useAnotherCode}>{messages.enterAnotherCode}</button></div>
      </section>}
      {session && error && session.status !== "issued" && session.status !== "consented" && session.status !== "in_progress" && <div className="notice notice-error" role="alert">{error}</div>}
      <footer className="participant-footer">{messages.appDescription}</footer>
    </main>
  );
}

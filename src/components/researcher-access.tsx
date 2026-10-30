"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Languages, LogOut } from "lucide-react";
import type { StudyLocale } from "@/lib/bus11";
import { getMessages, type Messages } from "@/lib/i18n";
import { apiErrorMessage, apiRequest, ApiError } from "@/lib/client-api";

export interface StudyListItem {
  id: string;
  title: string;
  description: string;
  locale: StudyLocale;
  status: "draft" | "open" | "closed";
  participantCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ResearcherContextValue {
  locale: StudyLocale;
  messages: Messages;
  studies: StudyListItem[];
  setStudies: (studies: StudyListItem[]) => void;
}

const ResearcherContext = createContext<ResearcherContextValue | null>(null);

export function useResearcherAccess(): ResearcherContextValue {
  const value = useContext(ResearcherContext);
  if (!value) throw new Error("A página precisa estar dentro de ResearcherAccess.");
  return value;
}

export function ResearcherAccess({ locale, children }: { locale: StudyLocale; children: ReactNode }) {
  const messages = getMessages(locale);
  const [phase, setPhase] = useState<"loading" | "login" | "ready" | "error">("loading");
  const [accessMode, setAccessMode] = useState<"login" | "register">("login");
  const [studies, setStudies] = useState<StudyListItem[]>([]);
  const [legacyStudiesRequireNewDatabase, setLegacyStudiesRequireNewDatabase] = useState(false);
  const [loadError, setLoadError] = useState("");
  const pathname = usePathname() ?? `/${locale}/researcher`;

  const loadStudies = useCallback(async () => {
    try {
      const response = await apiRequest<{ studies: StudyListItem[]; legacyStudiesRequireNewDatabase?: boolean }>("/api/studies");
      setStudies(response.studies);
      setLegacyStudiesRequireNewDatabase(Boolean(response.legacyStudiesRequireNewDatabase));
      setPhase("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPhase("login");
        return;
      }
      setLoadError(apiErrorMessage(error, messages, messages.studyLoadError));
      setPhase("error");
    }
  }, [messages]);

  useEffect(() => {
    let active = true;
    apiRequest<{ studies: StudyListItem[]; legacyStudiesRequireNewDatabase?: boolean }>("/api/studies")
      .then((response) => {
        if (!active) return;
        setStudies(response.studies);
        setLegacyStudiesRequireNewDatabase(Boolean(response.legacyStudiesRequireNewDatabase));
        setPhase("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          setPhase("login");
          return;
        }
        setLoadError(apiErrorMessage(error, messages, messages.studyLoadError));
        setPhase("error");
      });
    return () => { active = false; };
  }, [messages]);

  const contextValue = useMemo(() => ({ locale, messages, studies, setStudies }), [locale, messages, studies]);
  const otherLocale = locale === "pt-BR" ? "en" : "pt-BR";
  const localePath = pathname.replace(/^\/(?:pt-BR|en)(?=\/|$)/, `/${otherLocale}`);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoadError("");
    try {
      await apiRequest(accessMode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ code: form.get("code"), password: form.get("password") }),
      });
      setPhase("loading");
      await loadStudies();
    } catch (error) {
      setLoadError(apiErrorMessage(error, messages, messages.loginError));
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setStudies([]);
    setLegacyStudiesRequireNewDatabase(false);
    setPhase("login");
    setLoadError("");
  }

  if (phase === "loading") {
    return <main className="page-container"><div className="skeleton-block" aria-label={messages.loading} /></main>;
  }

  if (phase === "login") {
    return (
      <main className="login-area">
        <div className="login-panel panel">
          <Link className="brand" href={`/${locale}`}>
            <span className="brand-mark">B11</span><span className="brand-name">BUS-11 <small>Lab</small></span>
          </Link>
          <h1>{accessMode === "login" ? messages.loginTitle : messages.createGroupTitle}</h1>
          <p>{accessMode === "login" ? messages.loginDescription : messages.createGroupDescription}</p>
          {loadError && <div className="notice notice-error" role="alert">{loadError}</div>}
          <form className="form-stack" onSubmit={submitAccess}>
            <div className="field">
              <label htmlFor="group-code">{messages.accessCode}</label>
              <input id="group-code" name="code" autoComplete="username" minLength={accessMode === "register" ? 3 : undefined} maxLength={64} required />
            </div>
            <div className="field">
              <label htmlFor="group-password">{messages.password}</label>
              <input id="group-password" name="password" type="password" autoComplete={accessMode === "register" ? "new-password" : "current-password"} minLength={accessMode === "register" ? 8 : undefined} maxLength={128} required />
            </div>
            <button className="button button-primary" type="submit">
              {accessMode === "login" ? messages.signIn : messages.registerGroup}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <div className="login-links">
            <button className="button button-quiet" type="button" onClick={() => { setAccessMode(accessMode === "login" ? "register" : "login"); setLoadError(""); }}>
              {accessMode === "login" ? messages.switchToRegistration : messages.switchToLogin}
            </button>
            <Link href={`/${locale}/participant`}>{messages.enterParticipantArea}</Link>
            <Link href={localePath} className="language-switch"><Languages size={15} aria-hidden="true" />{otherLocale === "en" ? messages.english : messages.portuguese}</Link>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="page-container center-state">
        <div><h1>{messages.studyLoadError}</h1><p>{loadError}</p><button className="button button-secondary" onClick={() => { setPhase("loading"); void loadStudies(); }}>{messages.continue}</button></div>
      </main>
    );
  }

  const base = `/${locale}/researcher`;
  const navStudies = `${base}`;
  const navProtocol = `${base}/protocol`;
  return (
    <ResearcherContext.Provider value={contextValue}>
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand" href={`/${locale}`}>
            <span className="brand-mark">B11</span><span className="brand-name">BUS-11 <small>Lab</small></span>
          </Link>
          <nav className="app-nav" aria-label={messages.researcherArea}>
            <Link href={navStudies} aria-current={pathname === navStudies ? "page" : undefined}>{messages.studies}</Link>
            <Link href={navProtocol} aria-current={pathname.includes("/protocol") ? "page" : undefined}>{messages.protocol}</Link>
          </nav>
          <div className="header-actions">
            <Link href={localePath} className="language-switch" aria-label={messages.language}>
              <Languages size={16} aria-hidden="true" />{otherLocale === "en" ? messages.english : messages.portuguese}
            </Link>
            <span className="header-separator" aria-hidden="true" />
            <button className="button button-quiet desktop-nav" type="button" onClick={() => void signOut()}>
              <LogOut size={16} aria-hidden="true" />{messages.signOut}
            </button>
            <button className="button button-quiet mobile-nav" type="button" onClick={() => void signOut()} aria-label={messages.signOut}>
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      {legacyStudiesRequireNewDatabase && <div className="page-container"><div className="notice" role="status">{messages.legacyStudiesNotice}</div></div>}
      {children}
    </ResearcherContext.Provider>
  );
}

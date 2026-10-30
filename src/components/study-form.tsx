"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { useResearcherAccess } from "@/components/researcher-access";
import { ApiError, apiErrorMessage, apiRequest } from "@/lib/client-api";
import { getMessages } from "@/lib/i18n";
import { createClientUuid } from "@/lib/ids";
import { formatAgeRange, PREDEFINED_DEMOGRAPHIC_FIELDS, validateStudyInput, type AgeRange, type DemographicField, type StudyInput } from "@/lib/study-validation";
import { validationErrorMessage } from "@/lib/validation-messages";
import type { StudyRecord } from "@/lib/types";

const blankStudy = (locale: StudyInput["locale"]): StudyInput => ({
  title: "",
  description: "",
  locale,
  consentTitle: "",
  consentBody: "",
  demographicFields: [],
  chatbots: [],
  chatbotQuantity: 1,
});

const DEFAULT_AGE_BOUNDS: readonly { min: number; max: number | null }[] = [
  { min: 0, max: 17 },
  { min: 18, max: 24 },
  { min: 25, max: 34 },
  { min: 35, max: 44 },
  { min: 45, max: 54 },
  { min: 55, max: 64 },
  { min: 65, max: null },
];

function createDefaultAgeRanges(): AgeRange[] {
  return DEFAULT_AGE_BOUNDS.map((range) => ({ id: createClientUuid(), ...range }));
}

function stepForError(key: string): number {
  if (key.startsWith("consent")) return 1;
  if (key.startsWith("demographicFields")) return 2;
  if (key.startsWith("chatbots")) return 3;
  if (key === "chatbotQuantity") return 4;
  return 0;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id}>{message}</p> : null;
}

export function StudyForm({ studyId }: { studyId?: string }) {
  const { locale, messages, studies, setStudies } = useResearcherAccess();
  const router = useRouter();
  const [form, setForm] = useState<StudyInput>(() => blankStudy(locale));
  const [step, setStep] = useState(0);
  const [visibleErrors, setVisibleErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(studyId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studyId) return;
    let active = true;
    apiRequest<{ study: StudyRecord }>(`/api/studies/${studyId}`)
      .then(({ study }) => {
        if (!active) return;
        setForm({
          title: study.title,
          description: study.description,
          locale: study.locale,
          consentTitle: study.consentTitle,
          consentBody: study.consentBody,
          demographicFields: study.demographicFields,
          chatbots: study.chatbots,
          chatbotQuantity: study.chatbotQuantity,
        });
      })
      .catch((loadError: unknown) => {
        if (active) setError(apiErrorMessage(loadError, messages, messages.studyLoadError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [messages, studyId]);

  function stepErrors(candidateStep: number, allErrors: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(allErrors).filter(([key]) => stepForError(key) === candidateStep));
  }

  function continueStep() {
    const validation = validateStudyInput(form);
    if (!validation.ok) {
      const currentErrors = stepErrors(step, validation.errors);
      if (Object.keys(currentErrors).length) {
        setVisibleErrors(currentErrors);
        setError(messages.reviewFields);
        return;
      }
    }
    setVisibleErrors({});
    setError("");
    setStep((current) => Math.min(4, current + 1));
  }

  async function saveStudy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateStudyInput(form);
    if (!validation.ok) {
      setVisibleErrors(validation.errors);
      setError(messages.reviewFields);
      setStep(Math.min(...Object.keys(validation.errors).map(stepForError)));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await apiRequest<{ study: StudyRecord }>(studyId ? `/api/studies/${studyId}` : "/api/studies", {
        method: studyId ? "PUT" : "POST",
        body: JSON.stringify(validation.value),
      });
      const saved = response.study;
      const savedItem = {
        id: saved.id,
        title: saved.title,
        description: saved.description,
        locale: saved.locale,
        status: saved.status,
        participantCount: saved.participantCount ?? 0,
        completedCount: saved.completedCount ?? 0,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
      setStudies(studies.some((item) => item.id === saved.id)
        ? studies.map((item) => item.id === saved.id ? { ...item, ...savedItem } : item)
        : [...studies, savedItem]);
      router.push(`/${locale}/researcher/studies/${response.study.id}`);
    } catch (saveError) {
      setError(apiErrorMessage(saveError, messages, messages.studySaveError));
      if (saveError instanceof ApiError && saveError.fields) {
        setVisibleErrors(saveError.fields);
        const errorSteps = Object.keys(saveError.fields).map(stepForError);
        if (errorSteps.length) setStep(Math.min(...errorSteps));
      }
    } finally {
      setSaving(false);
    }
  }

  function hasError(field: string): boolean {
    return Boolean(visibleErrors[field]);
  }

  function fieldError(field: string): string | undefined {
    const code = visibleErrors[field];
    return code ? validationErrorMessage(code, messages) : undefined;
  }

  function clearVisibleErrors(...fields: string[]) {
    setVisibleErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) =>
      key !== "form" && !fields.some((field) => key === field || key.startsWith(`${field}.`)),
    )));
    setError("");
  }

  function update<K extends keyof StudyInput>(key: K, value: StudyInput[K], errorFields: string[] = [String(key)]) {
    setForm((current) => ({ ...current, [key]: value }));
    clearVisibleErrors(...errorFields);
  }

  function togglePreset(id: "age" | "sex" | "nationality") {
    const definition = PREDEFINED_DEMOGRAPHIC_FIELDS.find((field) => field.id === id)!;
    const exists = form.demographicFields.some((field) => field.id === id);
    const preset: DemographicField = id === "age"
      ? { ...definition, ranges: createDefaultAgeRanges() }
      : id === "sex"
        ? { id, type: "singleChoice", options: [getMessages(form.locale).sexMale, getMessages(form.locale).sexFemale] }
        : { id, type: "singleChoice", options: [getMessages(form.locale).nationalityBrazilian, getMessages(form.locale).nationalityOther] };
    update("demographicFields", exists
      ? form.demographicFields.filter((field) => field.id !== id)
      : [...form.demographicFields, preset]);
  }

  function configureAgeRanges(index: number) {
    changeDemographic(index, { ranges: createDefaultAgeRanges() });
  }

  function changeAgeRange(index: number, rangeIndex: number, changes: Partial<AgeRange>) {
    const field = form.demographicFields[index];
    if (!field?.ranges) return;
    changeDemographic(index, {
      ranges: field.ranges.map((range, currentIndex) => currentIndex === rangeIndex ? { ...range, ...changes } : range),
    });
  }

  function addAgeRange(index: number) {
    const field = form.demographicFields[index];
    if (!field?.ranges || field.ranges.length >= 20) return;
    const ranges = [...field.ranges];
    const last = ranges.at(-1);
    const min = last ? (last.max === null ? last.min + 1 : last.max + 1) : 0;
    if (min > 130) return;
    if (last?.max === null) ranges[ranges.length - 1] = { ...last, max: last.min };
    ranges.push({ id: createClientUuid(), min, max: null });
    changeDemographic(index, { ranges });
  }

  function removeAgeRange(index: number, rangeIndex: number) {
    const field = form.demographicFields[index];
    if (!field?.ranges) return;
    changeDemographic(index, { ranges: field.ranges.filter((_, currentIndex) => currentIndex !== rangeIndex) });
  }

  function changeDemographicOption(index: number, optionIndex: number, value: string) {
    const options = [...(form.demographicFields[index]?.options ?? [])];
    options[optionIndex] = value;
    changeDemographic(index, { options });
  }

  function addDemographicOption(index: number) {
    const field = form.demographicFields[index];
    if (!field?.options || field.options.length >= 20) return;
    changeDemographic(index, { options: [...field.options, ""] });
  }

  function removeDemographicOption(index: number, optionIndex: number) {
    const field = form.demographicFields[index];
    if (!field?.options) return;
    changeDemographic(index, { options: field.options.filter((_, currentIndex) => currentIndex !== optionIndex) });
  }

  function addCustomField() {
    const field: DemographicField = { id: `custom-${createClientUuid()}`, type: "text", label: "" };
    update("demographicFields", [...form.demographicFields, field]);
  }

  function changeDemographic(index: number, changes: Partial<DemographicField>) {
    update("demographicFields", form.demographicFields.map((field, currentIndex) => {
      if (currentIndex !== index) return field;
      const next = { ...field, ...changes };
      if (changes.type === "singleChoice" && !next.options) next.options = ["", ""];
      if (changes.type && changes.type !== "singleChoice") delete next.options;
      return next;
    }), Object.keys(changes).map((key) => `demographicFields.${index}.${key}`));
  }

  function addChatbot() {
    const chatbot = { id: createClientUuid(), name: "", url: "", task: "" };
    update("chatbots", [...form.chatbots, chatbot]);
  }

  function changeChatbot(index: number, changes: Partial<StudyInput["chatbots"][number]>) {
    update("chatbots", form.chatbots.map((chatbot, currentIndex) => currentIndex === index ? { ...chatbot, ...changes } : chatbot),
      Object.keys(changes).map((key) => `chatbots.${index}.${key}`));
  }

  const title = studyId ? messages.editStudy : messages.createStudy;
  const localeError = fieldError("locale");
  if (loading) return <main className="page-container"><div className="skeleton-block" aria-label={messages.loading} /></main>;

  return (
    <main className="page-container">
      <Link className="back-link" href={studyId ? `/${locale}/researcher/studies/${studyId}` : `/${locale}/researcher`}>
        <ArrowLeft size={15} aria-hidden="true" />{messages.back}
      </Link>
      <div className="page-heading"><div><h1>{title}</h1><p>{messages.studySummary}</p></div></div>

      <nav className="stepper" aria-label={messages.studySummary}>
        {messages.steps.map((name, index) => (
          <button className="step-button" type="button" key={name} aria-current={step === index ? "step" : undefined}
            disabled={index > step} onClick={() => setStep(index)}>
            <span className="step-number">{index + 1}</span><span className="step-name">{name}</span>
          </button>
        ))}
      </nav>

      <form className="panel form-panel" onSubmit={saveStudy} noValidate>
        <section className="form-section-heading">
          <h2>{messages.steps[step]}</h2>
          <p>{step === 0 ? messages.studyDescription : step === 1 ? messages.consentHelp : step === 2 ? messages.demographicsHelp : step === 3 ? messages.chatbotHelp : messages.quantityHelp}</p>
        </section>

        {error && <div className="notice notice-error" role="alert">{fieldError("form") ?? error}</div>}

        {step === 0 && <div className="form-stack">
          <div className="field">
            <label htmlFor="study-title">{messages.studyTitle} <span aria-hidden="true">*</span></label>
            <input id="study-title" value={form.title} maxLength={160} required aria-invalid={hasError("title")}
              aria-describedby={fieldError("title") ? "study-title-error" : undefined}
              onChange={(event) => update("title", event.target.value)} />
            <FieldError id="study-title-error" message={fieldError("title")} />
          </div>
          <div className="field">
            <label htmlFor="study-description">{messages.studyDescription}</label>
            <textarea id="study-description" value={form.description} maxLength={2000} aria-invalid={hasError("description")}
              aria-describedby={fieldError("description") ? "study-description-error" : undefined}
              onChange={(event) => update("description", event.target.value)} />
            <FieldError id="study-description-error" message={fieldError("description")} />
          </div>
          <fieldset className="field fieldset-reset" aria-describedby={localeError ? "study-locale-error" : undefined}>
            <legend className="field-label">{messages.studyLanguage}</legend>
            <div className="choice-list">
              {(["pt-BR", "en"] as const).map((language) => (
                <label className="choice-panel" key={language}>
                  <input type="radio" name="study-language" value={language} checked={form.locale === language}
                    onChange={() => update("locale", language)} />
                  <span><strong>{language === "en" ? messages.english : messages.portuguese}</strong></span>
                </label>
              ))}
            </div>
            <FieldError id="study-locale-error" message={localeError} />
          </fieldset>
        </div>}

        {step === 1 && <div className="form-stack">
          <div className="field">
            <label htmlFor="consent-title">{messages.consentTitle} <span aria-hidden="true">*</span></label>
            <input id="consent-title" value={form.consentTitle} maxLength={120} required aria-invalid={hasError("consentTitle")}
              aria-describedby={fieldError("consentTitle") ? "consent-title-error" : undefined}
              onChange={(event) => update("consentTitle", event.target.value)} />
            <FieldError id="consent-title-error" message={fieldError("consentTitle")} />
          </div>
          <div className="field">
            <label htmlFor="consent-body">{messages.consentBody} <span aria-hidden="true">*</span></label>
            <textarea id="consent-body" value={form.consentBody} maxLength={10000} required aria-invalid={hasError("consentBody")}
              aria-describedby={fieldError("consentBody") ? "consent-body-error" : undefined}
              onChange={(event) => update("consentBody", event.target.value)} />
            <FieldError id="consent-body-error" message={fieldError("consentBody")} />
            <p className="field-hint">{messages.consentHelp}</p>
          </div>
        </div>}

        {step === 2 && <div className="form-stack">
          <fieldset className="field fieldset-reset">
            <legend className="field-label">{messages.demographicsTitle}</legend>
            {(["age", "sex", "nationality"] as const).map((id) => {
              const errorId = `demographic-${id}-type-error`;
              const validationError = fieldError(`demographicFields.${id}.type`);
              const label = id === "age" ? messages.includeAge : id === "sex" ? messages.includeSex : messages.includeNationality;
              return <div className="field" key={id}>
                <label className="checkbox-row"><input type="checkbox" checked={form.demographicFields.some((field) => field.id === id)}
                  aria-invalid={Boolean(validationError)} aria-describedby={validationError ? errorId : undefined}
                  onChange={() => togglePreset(id)} />{label}</label>
                <FieldError id={errorId} message={validationError} />
              </div>;
            })}
          </fieldset>

          {form.demographicFields.map((field, index) => ({ field, index }))
            .filter(({ field }) => field.id === "age" && field.type === "number").map(({ field, index }) => {
            const rangesError = fieldError("demographicFields.age.ranges");
            return <fieldset className="chatbot-editor fieldset-reset" key="demographic-age-ranges">
              <legend className="field-label">{messages.ageRanges}</legend>
              {field.ranges ? <>
                <p className="field-hint">{messages.ageRangeHelp}</p>
                {field.ranges.map((range, rangeIndex) => <div className="field-row" key={range.id}>
                  <div className="field"><label htmlFor={`age-range-${rangeIndex}-min`}>{messages.rangeFrom}</label>
                    <input id={`age-range-${rangeIndex}-min`} type="number" min={0} max={130} step={1} value={range.min}
                      aria-invalid={Boolean(rangesError)} aria-describedby={rangesError ? "age-ranges-error" : undefined}
                      onChange={(event) => changeAgeRange(index, rangeIndex, { min: Number(event.target.value) })} />
                  </div>
                  <div className="field"><label htmlFor={`age-range-${rangeIndex}-max`}>{messages.rangeTo}</label>
                    <input id={`age-range-${rangeIndex}-max`} type="number" min={range.min} max={130} step={1} value={range.max ?? ""}
                      placeholder={messages.noMaximum} aria-invalid={Boolean(rangesError)} aria-describedby={rangesError ? "age-ranges-error" : undefined}
                      onChange={(event) => changeAgeRange(index, rangeIndex, { max: event.target.value === "" ? null : Number(event.target.value) })} />
                  </div>
                  <div className="field age-range-preview"><span className="field-label">{messages.ageRange} {rangeIndex + 1}</span>
                    <output>{formatAgeRange(range)}</output>
                  </div>
                  <button className="button button-quiet" type="button" aria-label={`${messages.remove} ${messages.ageRange.toLowerCase()} ${rangeIndex + 1}`}
                    onClick={() => removeAgeRange(index, rangeIndex)}><Trash2 size={15} aria-hidden="true" />{messages.remove}</button>
                </div>)}
                <FieldError id="age-ranges-error" message={rangesError} />
                <button className="button button-secondary" type="button" disabled={field.ranges.length >= 20}
                  onClick={() => addAgeRange(index)}><Plus size={16} aria-hidden="true" />{messages.addAgeRange}</button>
              </> : <button className="button button-secondary" type="button" onClick={() => configureAgeRanges(index)}>{messages.configureAgeBands}</button>}
            </fieldset>;
          })}

          {form.demographicFields.map((field, index) => ({ field, index }))
            .filter(({ field }) => field.id === "sex" && field.type === "singleChoice").map(({ field }) => (
              <p className="field-hint" key="fixed-sex-options">{messages.fixedSexChoices}: {field.options?.join(" · ")}</p>
            ))}

          {form.demographicFields.map((field, index) => ({ field, index }))
            .filter(({ field }) => field.id === "nationality" && field.type === "singleChoice").map(({ field, index }) => (
              <fieldset className="chatbot-editor fieldset-reset" key="nationality-options">
                <legend className="field-label">{messages.nationalityOptions}</legend>
                {field.options?.map((option, optionIndex) => <div className="field-row" key={`nationality-option-${optionIndex}`}>
                  <div className="field"><label htmlFor={`nationality-option-${optionIndex}`}>{messages.optionNumber} {optionIndex + 1}</label>
                    <input id={`nationality-option-${optionIndex}`} value={option} maxLength={100}
                      onChange={(event) => changeDemographicOption(index, optionIndex, event.target.value)} />
                  </div>
                  <button className="button button-quiet" type="button" aria-label={`${messages.remove} ${messages.optionNumber.toLowerCase()} ${optionIndex + 1}`}
                    onClick={() => removeDemographicOption(index, optionIndex)}><Trash2 size={15} aria-hidden="true" />{messages.remove}</button>
                </div>)}
                <FieldError id="nationality-options-error" message={fieldError("demographicFields.nationality.options")} />
                <button className="button button-secondary" type="button" disabled={(field.options?.length ?? 0) >= 20}
                  onClick={() => addDemographicOption(index)}><Plus size={16} aria-hidden="true" />{messages.addOption}</button>
              </fieldset>
            ))}

          {form.demographicFields.map((field, index) => ({ field, index }))
            .filter(({ field }) => field.id.startsWith("custom-")).map(({ field, index }) => {
            const fieldPath = `demographicFields.${index}`;
            const groupError = fieldError(fieldPath) ?? fieldError(`${fieldPath}.id`);
            const labelError = fieldError(`${fieldPath}.label`);
            const typeError = fieldError(`${fieldPath}.type`);
            const optionsError = fieldError(`${fieldPath}.options`);
            return (
              <div className="chatbot-editor" key={`demographic-field-${index}`}>
                <div className="chatbot-editor-heading"><h3>{messages.customField}</h3>
                  <button className="button button-quiet" type="button" aria-describedby={groupError ? `demographic-field-${index}-group-error` : undefined}
                    onClick={() => update("demographicFields", form.demographicFields.filter((_, currentIndex) => currentIndex !== index))}>
                    <Trash2 size={15} aria-hidden="true" />{messages.remove}
                  </button>
                </div>
                <FieldError id={`demographic-field-${index}-group-error`} message={groupError} />
                <div className="field-row">
                  <div className="field"><label htmlFor={`demographic-field-${index}-label`}>{messages.fieldLabel}</label>
                    <input id={`demographic-field-${index}-label`} value={field.label ?? ""} maxLength={80} aria-invalid={hasError(`${fieldPath}.label`)}
                      aria-describedby={labelError ? `demographic-field-${index}-label-error` : undefined}
                      onChange={(event) => changeDemographic(index, { label: event.target.value })} />
                    <FieldError id={`demographic-field-${index}-label-error`} message={labelError} />
                  </div>
                  <div className="field"><label htmlFor={`demographic-field-${index}-type`}>{messages.fieldType}</label>
                    <select id={`demographic-field-${index}-type`} value={field.type} aria-invalid={Boolean(typeError)}
                      aria-describedby={typeError ? `demographic-field-${index}-type-error` : undefined}
                      onChange={(event) => changeDemographic(index, { type: event.target.value as DemographicField["type"] })}>
                      <option value="text">{messages.fieldText}</option><option value="number">{messages.fieldNumber}</option><option value="singleChoice">{messages.fieldChoice}</option>
                    </select>
                    <FieldError id={`demographic-field-${index}-type-error`} message={typeError} />
                  </div>
                </div>
                {field.type === "singleChoice" && <fieldset className="field fieldset-reset">
                  <legend className="field-label">{messages.choices}</legend>
                  {field.options?.map((option, optionIndex) => <div className="field-row" key={`custom-${index}-option-${optionIndex}`}>
                    <div className="field"><label htmlFor={`demographic-field-${index}-option-${optionIndex}`}>{messages.optionNumber} {optionIndex + 1}</label>
                      <input id={`demographic-field-${index}-option-${optionIndex}`} value={option} maxLength={100} aria-invalid={Boolean(optionsError)}
                        aria-describedby={optionsError ? `demographic-field-${index}-options-error` : undefined}
                        onChange={(event) => changeDemographicOption(index, optionIndex, event.target.value)} />
                    </div>
                    <button className="button button-quiet" type="button" aria-label={`${messages.remove} ${messages.optionNumber.toLowerCase()} ${optionIndex + 1}`}
                      onClick={() => removeDemographicOption(index, optionIndex)}><Trash2 size={15} aria-hidden="true" />{messages.remove}</button>
                  </div>)}
                  <FieldError id={`demographic-field-${index}-options-error`} message={optionsError} />
                  <button className="button button-secondary" type="button" disabled={(field.options?.length ?? 0) >= 20}
                    onClick={() => addDemographicOption(index)}><Plus size={16} aria-hidden="true" />{messages.addOption}</button>
                </fieldset>}
              </div>
            );
          })}
          <button className="button button-secondary" type="button" disabled={form.demographicFields.length >= 20}
            aria-describedby={fieldError("demographicFields") ? "demographic-fields-error" : undefined} onClick={addCustomField}>
            <Plus size={16} aria-hidden="true" />{messages.addField}
          </button>
          <FieldError id="demographic-fields-error" message={fieldError("demographicFields")} />
        </div>}

        {step === 3 && <div className="form-stack">
          {form.chatbots.map((chatbot, index) => {
            const groupError = fieldError(`chatbots.${index}`);
            return (
            <fieldset className="chatbot-editor fieldset-reset" key={chatbot.id}>
              <div className="chatbot-editor-heading"><h3>{messages.chatbotName} {index + 1}</h3>
                <button className="button button-quiet" type="button" aria-label={`${messages.remove} ${index + 1}`}
                  aria-describedby={groupError ? `bot-${index}-error` : undefined}
                  onClick={() => update("chatbots", form.chatbots.filter((item) => item.id !== chatbot.id))}>
                  <Trash2 size={15} aria-hidden="true" />{messages.remove}
                </button>
              </div>
              <FieldError id={`bot-${index}-error`} message={groupError} />
              <div className="field-row">
                <div className="field"><label htmlFor={`bot-${index}-name`}>{messages.chatbotName} *</label>
                  <input id={`bot-${index}-name`} value={chatbot.name} maxLength={100} required aria-invalid={hasError(`chatbots.${index}.name`)}
                    aria-describedby={fieldError(`chatbots.${index}.name`) ? `bot-${index}-name-error` : undefined} onChange={(event) => changeChatbot(index, { name: event.target.value })} />
                  <FieldError id={`bot-${index}-name-error`} message={fieldError(`chatbots.${index}.name`)} /></div>
                <div className="field"><label htmlFor={`bot-${index}-url`}>{messages.chatbotUrl} *</label>
                  <input id={`bot-${index}-url`} type="url" placeholder="https://" value={chatbot.url} required aria-invalid={hasError(`chatbots.${index}.url`)}
                    aria-describedby={fieldError(`chatbots.${index}.url`) ? `bot-${index}-url-error` : undefined} onChange={(event) => changeChatbot(index, { url: event.target.value })} />
                  <FieldError id={`bot-${index}-url-error`} message={fieldError(`chatbots.${index}.url`)} /></div>
              </div>
              <div className="field"><label htmlFor={`bot-${index}-task`}>{messages.task} *</label>
                <textarea id={`bot-${index}-task`} value={chatbot.task} maxLength={2000} required aria-invalid={hasError(`chatbots.${index}.task`)}
                  aria-describedby={fieldError(`chatbots.${index}.task`) ? `bot-${index}-task-error` : undefined} onChange={(event) => changeChatbot(index, { task: event.target.value })} />
                <FieldError id={`bot-${index}-task-error`} message={fieldError(`chatbots.${index}.task`)} />
                <p className="field-hint">{messages.taskHelp}</p>
                <div className="suggestions" aria-label={messages.chatbotSuggestion}>
                  {[messages.taskSuggestion1, messages.taskSuggestion2, messages.taskSuggestion3].map((suggestion, suggestionIndex) => (
                    <button className="suggestion-button" type="button" key={suggestionIndex} onClick={() => changeChatbot(index, { task: suggestion })}>{suggestion}</button>
                  ))}
                </div>
              </div>
            </fieldset>
            );
          })}
          <button className="button button-secondary" type="button" disabled={form.chatbots.length >= 50}
            aria-describedby={fieldError("chatbots") ? "chatbots-error" : undefined} onClick={addChatbot}>
            <Plus size={16} aria-hidden="true" />{messages.addChatbot}
          </button>
          <FieldError id="chatbots-error" message={fieldError("chatbots")} />
        </div>}

        {step === 4 && <div className="form-stack">
          <div className="field">
            <label htmlFor="chatbot-quantity">{messages.chatbotsPerParticipant}</label>
            <select id="chatbot-quantity" value={form.chatbotQuantity} aria-invalid={hasError("chatbotQuantity")}
              aria-describedby={fieldError("chatbotQuantity") ? "chatbot-quantity-error" : undefined}
              onChange={(event) => update("chatbotQuantity", Number(event.target.value))}>
              {form.chatbots.map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
            </select>
            <p className="field-hint">{messages.quantityHelp}</p>
            <FieldError id="chatbot-quantity-error" message={fieldError("chatbotQuantity")} />
          </div>
          <section className="study-summary" aria-label={messages.studySummary}>
            <h2>{form.title || messages.studyTitle}</h2>
            <span className="summary-value"><strong>{form.chatbots.length}</strong>{messages.chatbotCount}</span>
            <span className="summary-value"><strong>{form.chatbotQuantity}</strong>{messages.chatbotsPerParticipant}</span>
            <span className="summary-value"><strong>{form.demographicFields.length}</strong>{messages.demographicsTitle}</span>
          </section>
        </div>}

        <div className="form-actions">
          <button className="button button-secondary" type="button" disabled={step === 0 || saving} onClick={() => { setStep((current) => current - 1); setError(""); setVisibleErrors({}); }}>
            <ArrowLeft size={16} aria-hidden="true" />{messages.back}
          </button>
          {step < 4 ? (
            <button key="continue-step" className="button button-primary" type="button" disabled={saving}
              onClick={(event) => { event.preventDefault(); continueStep(); }}>{messages.next}<ArrowRight size={16} aria-hidden="true" /></button>
          ) : (
            <button key="save-study" className="button button-primary" type="submit" disabled={saving}>
              {saving ? messages.saving : messages.saveDraft}{!saving && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

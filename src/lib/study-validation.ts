export interface AgeRange {
  id: string;
  min: number;
  max: number | null;
}

export interface DemographicField {
  id: string;
  type: "text" | "number" | "singleChoice";
  label?: string;
  options?: string[];
  ranges?: AgeRange[];
}

export type StudyInput = {
  title: string;
  description: string;
  locale: "pt-BR" | "en";
  consentTitle: string;
  consentBody: string;
  demographicFields: DemographicField[];
  chatbots: { id: string; name: string; url: string; task: string }[];
  chatbotQuantity: number;
};

export const PREDEFINED_DEMOGRAPHIC_FIELDS: readonly DemographicField[] = [
  { id: "age", type: "number" },
  { id: "sex", type: "singleChoice", options: ["Masculino", "Feminino"] },
  { id: "nationality", type: "singleChoice", options: ["Brasileira", "Outra"] },
];

type ValidationResult<T> = { ok: false; errors: Record<string, string> } | { ok: true; value: T };

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function formatAgeRange(range: AgeRange): string {
  return range.max === null ? `${range.min}+` : `${range.min}–${range.max}`;
}

function validOptions(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length < 2 || input.length > 20) return null;
  const options = input.map(text);
  if (options.some((option) => !option || option.length > 100)
    || new Set(options.map((option) => option?.toLocaleLowerCase())).size !== options.length) return null;
  return options as string[];
}

function validateAgeRanges(input: unknown): AgeRange[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) return null;
  const ranges: AgeRange[] = [];
  const ids = new Set<string>();
  for (const candidate of input) {
    if (!isRecord(candidate) || !validId(candidate.id) || ids.has(candidate.id)
      || !Number.isInteger(candidate.min) || (candidate.min as number) < 0 || (candidate.min as number) > 130
      || (candidate.max !== null && (!Number.isInteger(candidate.max) || (candidate.max as number) < (candidate.min as number) || (candidate.max as number) > 130))) {
      return null;
    }
    ids.add(candidate.id);
    ranges.push({ id: candidate.id, min: candidate.min as number, max: candidate.max as number | null });
  }
  ranges.sort((left, right) => left.min - right.min);
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    if (range.max === null && index !== ranges.length - 1) return null;
    const previous = ranges[index - 1];
    if (previous && (previous.max === null || range.min <= previous.max)) return null;
  }
  return ranges;
}

function validateFields(input: unknown): ValidationResult<DemographicField[]> {
  if (!Array.isArray(input) || input.length > 20) {
    return { ok: false, errors: { demographicFields: "tooManyDemographicFields" } };
  }

  const fields: DemographicField[] = [];
  const seen = new Set<string>();
  for (const [index, candidate] of input.entries()) {
    const key = `demographicFields.${index}`;
    if (!isRecord(candidate) || typeof candidate.id !== "string") {
      return { ok: false, errors: { [key]: "duplicateDemographicFieldId" } };
    }
    const predefined = PREDEFINED_DEMOGRAPHIC_FIELDS.find((field) => field.id === candidate.id);
    if (seen.has(candidate.id)) {
      const duplicateKey = predefined ? `demographicFields.${candidate.id}.type` : `${key}.id`;
      return { ok: false, errors: { [duplicateKey]: "duplicateDemographicFieldId" } };
    }
    seen.add(candidate.id);

    if (predefined) {
      if (candidate.id === "age") {
        if (candidate.type !== "number") {
          return { ok: false, errors: { "demographicFields.age.type": "invalidPredefinedField" } };
        }
        if (candidate.ranges === undefined) {
          return { ok: false, errors: { "demographicFields.age.ranges": "invalidAgeRanges" } };
        }
        const ranges = validateAgeRanges(candidate.ranges);
        if (!ranges) return { ok: false, errors: { "demographicFields.age.ranges": "invalidAgeRanges" } };
        fields.push({ id: "age", type: "number", ranges });
        continue;
      }

      if (candidate.id === "sex" && candidate.type === "singleChoice") {
        const options = validOptions(candidate.options);
        const validPortuguese = options?.length === 2 && options[0] === "Masculino" && options[1] === "Feminino";
        const validEnglish = options?.length === 2 && options[0] === "Male" && options[1] === "Female";
        if (!options || (!validPortuguese && !validEnglish)) {
          return { ok: false, errors: { "demographicFields.sex.options": "invalidSexOptions" } };
        }
        fields.push({ id: "sex", type: "singleChoice", options });
        continue;
      }
      if (candidate.id === "nationality" && candidate.type === "singleChoice") {
        if (!Array.isArray(candidate.options) || candidate.options.length < 2 || candidate.options.length > 20) {
          return { ok: false, errors: { "demographicFields.nationality.options": "invalidChoiceCount" } };
        }
        const options = validOptions(candidate.options);
        if (!options) return { ok: false, errors: { "demographicFields.nationality.options": "invalidChoices" } };
        fields.push({ id: "nationality", type: "singleChoice", options });
        continue;
      }
      if (candidate.id === "nationality") {
        return { ok: false, errors: { "demographicFields.nationality.options": "invalidChoices" } };
      }
      if (candidate.type !== predefined.type) {
        return { ok: false, errors: { [`demographicFields.${candidate.id}.type`]: "invalidPredefinedField" } };
      }
      continue;
    }

    if (!/^custom-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.id)) {
      return { ok: false, errors: { [`${key}.id`]: "invalidDemographicFieldId" } };
    }
    const label = text(candidate.label);
    if (!label || label.length > 80) {
      return { ok: false, errors: { [`${key}.label`]: "invalidDemographicLabel" } };
    }
    if (candidate.type !== "text" && candidate.type !== "number" && candidate.type !== "singleChoice") {
      return { ok: false, errors: { [`${key}.type`]: "invalidDemographicType" } };
    }

    if (candidate.type === "singleChoice") {
      if (!Array.isArray(candidate.options) || candidate.options.length < 2 || candidate.options.length > 20) {
        return { ok: false, errors: { [`${key}.options`]: "invalidChoiceCount" } };
      }
      const options = validOptions(candidate.options);
      if (!options) {
        return { ok: false, errors: { [`${key}.options`]: "invalidChoices" } };
      }
      fields.push({ id: candidate.id, type: "singleChoice", label, options });
    } else {
      fields.push({ id: candidate.id, type: candidate.type, label });
    }
  }

  return { ok: true, value: fields };
}

export function validateStudyInput(input: unknown): ValidationResult<StudyInput> {
  if (!isRecord(input)) return { ok: false, errors: { form: "invalidStudyData" } };

  const errors: Record<string, string> = {};
  const title = text(input.title);
  const description = text(input.description);
  const consentTitle = text(input.consentTitle);
  const consentBody = text(input.consentBody);
  if (!title || title.length > 160) errors.title = "invalidStudyTitle";
  if (description === null || description.length > 2000) errors.description = "invalidStudyDescription";
  if (input.locale !== "pt-BR" && input.locale !== "en") errors.locale = "invalidStudyLocale";
  if (!consentTitle || consentTitle.length > 120) errors.consentTitle = "invalidConsentTitle";
  if (!consentBody || consentBody.length > 10000) errors.consentBody = "invalidConsentBody";

  const fieldResult = validateFields(input.demographicFields);
  if (!fieldResult.ok) Object.assign(errors, fieldResult.errors);

  const bots: StudyInput["chatbots"] = [];
  if (!Array.isArray(input.chatbots) || input.chatbots.length < 1 || input.chatbots.length > 50) {
    errors.chatbots = "invalidChatbotCount";
  } else {
    const ids = new Set<string>();
    for (const [index, candidate] of input.chatbots.entries()) {
      const key = `chatbots.${index}`;
      if (!isRecord(candidate) || !validId(candidate.id) || ids.has(candidate.id)) {
        errors[key] = "duplicateChatbotId";
        continue;
      }
      ids.add(candidate.id);
      const name = text(candidate.name);
      const urlText = text(candidate.url);
      const task = text(candidate.task);
      if (!name || name.length > 100) errors[`${key}.name`] = "invalidChatbotName";
      if (!task || task.length > 2000) errors[`${key}.task`] = "invalidChatbotTask";
      let url = "";
      try {
        const parsed = new URL(urlText ?? "");
        if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) throw new Error("invalid URL");
        url = parsed.toString();
      } catch {
        errors[`${key}.url`] = "invalidChatbotUrl";
      }
      if (name && task && url) bots.push({ id: candidate.id, name, url, task });
    }
  }

  const quantity = input.chatbotQuantity;
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > bots.length) {
    errors.chatbotQuantity = "invalidChatbotQuantity";
  }

  if (Object.keys(errors).length || !fieldResult.ok || (input.locale !== "pt-BR" && input.locale !== "en")) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title: title as string,
      description: description as string,
      locale: input.locale,
      consentTitle: consentTitle as string,
      consentBody: consentBody as string,
      demographicFields: fieldResult.value,
      chatbots: bots,
      chatbotQuantity: quantity as number,
    },
  };
}

export function validateDemographicAnswers(
  fields: readonly DemographicField[],
  input: unknown,
): ValidationResult<Record<string, string | number>> {
  if (!isRecord(input)) return { ok: false, errors: { form: "invalidDemographicData" } };

  const values: Record<string, string | number> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = text(input[field.id]);
    if (!value) {
      errors[field.id] = "required";
      continue;
    }

    if (field.type === "text") {
      if (value.length > 250) errors[field.id] = "demographicTextTooLong";
      else values[field.id] = value;
    } else if (field.id === "age" && field.ranges?.length) {
      if (!field.ranges.some((range) => range.id === value)) errors[field.id] = "invalidChoice";
      else values[field.id] = value;
    } else if (field.type === "number") {
      const number = Number(value);
      const isAge = field.id === "age";
      if (!Number.isFinite(number) || (isAge && (!Number.isInteger(number) || number < 0 || number > 130))) {
        errors[field.id] = isAge ? "invalidAge" : "invalidNumber";
      } else {
        values[field.id] = number;
      }
    } else if (!field.options?.includes(value)) {
      errors[field.id] = "invalidChoice";
    } else {
      values[field.id] = value;
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: values };
}

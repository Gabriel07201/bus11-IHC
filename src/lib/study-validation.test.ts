import { describe, expect, it } from "vitest";
import { validateDemographicAnswers, validateStudyInput, type StudyInput } from "./study-validation";

const firstAgeRangeId = "123e4567-e89b-12d3-a456-426614174010";

const validStudy: StudyInput = {
  title: "Estudo piloto",
  description: "",
  locale: "pt-BR",
  consentTitle: "Consentimento",
  consentBody: "Informações do estudo e consentimento.",
  demographicFields: [
    { id: "age", type: "number", ranges: [{ id: firstAgeRangeId, min: 18, max: 24 }] },
    { id: "sex", type: "singleChoice", options: ["Masculino", "Feminino"] },
    { id: "nationality", type: "singleChoice", options: ["Brasileira", "Outra"] },
    { id: "custom-123e4567-e89b-12d3-a456-426614174000", type: "singleChoice", label: "Experiência", options: ["Pouca", "Média", "Muita"] },
  ],
  chatbots: [
    { id: "123e4567-e89b-12d3-a456-426614174001", name: "Assistente", url: "https://example.com/chat", task: "Peça informações sobre o serviço." },
  ],
  chatbotQuantity: 1,
};

describe("validateStudyInput", () => {
  it("accepts a complete study and normalizes surrounding whitespace", () => {
    const result = validateStudyInput({ ...validStudy, title: "  Estudo piloto  " });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.title).toBe("Estudo piloto");
  });

  it("requires an http(s) chatbot URL, task, and quantity within the chatbot count", () => {
    expect(validateStudyInput({
      ...validStudy,
      chatbots: [{ ...validStudy.chatbots[0], url: "javascript:alert(1)" }],
    }).ok).toBe(false);
    expect(validateStudyInput({
      ...validStudy,
      chatbots: [{ ...validStudy.chatbots[0], task: " " }],
    }).ok).toBe(false);
    expect(validateStudyInput({ ...validStudy, chatbotQuantity: 2 }).ok).toBe(false);
  });

  it("returns stable error codes for fields the researcher must correct", () => {
    const result = validateStudyInput({
      ...validStudy,
      title: " ",
      chatbots: [{ ...validStudy.chatbots[0], url: "javascript:alert(1)" }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        title: "invalidStudyTitle",
        "chatbots.0.url": "invalidChatbotUrl",
      });
    }
  });

  it("returns error paths for the specific custom demographic control", () => {
    const custom = validStudy.demographicFields[3];
    const invalidLabel = validateStudyInput({
      ...validStudy,
      demographicFields: [{ ...custom, label: " " }],
    });
    const invalidType = validateStudyInput({
      ...validStudy,
      demographicFields: [{ ...custom, type: "unsupported" }],
    });
    const invalidOptionCount = validateStudyInput({
      ...validStudy,
      demographicFields: [{ ...custom, options: ["Uma"] }],
    });
    const duplicateOptions = validateStudyInput({
      ...validStudy,
      demographicFields: [{ ...custom, options: ["A", "a"] }],
    });
    const invalidPreset = validateStudyInput({
      ...validStudy,
      demographicFields: [{ id: "age", type: "text" }],
    });
    const invalidId = validateStudyInput({
      ...validStudy,
      demographicFields: [{ id: "custom-invalid", type: "text", label: "Legacy" }],
    });
    const duplicateId = validateStudyInput({
      ...validStudy,
      demographicFields: [custom, { ...custom }],
    });
    const age = validStudy.demographicFields[0];
    const duplicatePresetId = validateStudyInput({
      ...validStudy,
      demographicFields: [age, { ...age }],
    });

    expect(invalidLabel.ok ? {} : invalidLabel.errors).toHaveProperty("demographicFields.0.label", "invalidDemographicLabel");
    expect(invalidType.ok ? {} : invalidType.errors).toHaveProperty("demographicFields.0.type", "invalidDemographicType");
    expect(invalidOptionCount.ok ? {} : invalidOptionCount.errors).toHaveProperty("demographicFields.0.options", "invalidChoiceCount");
    expect(duplicateOptions.ok ? {} : duplicateOptions.errors).toHaveProperty("demographicFields.0.options", "invalidChoices");
    expect(invalidPreset.ok ? {} : invalidPreset.errors).toHaveProperty("demographicFields.age.type", "invalidPredefinedField");
    expect(invalidId.ok ? {} : invalidId.errors).toHaveProperty("demographicFields.0.id", "invalidDemographicFieldId");
    expect(duplicateId.ok ? {} : duplicateId.errors).toHaveProperty("demographicFields.1.id", "duplicateDemographicFieldId");
    expect(duplicatePresetId.ok ? {} : duplicatePresetId.errors).toHaveProperty("demographicFields.age.type", "duplicateDemographicFieldId");
  });

  it("requires fields marked for collection to have a valid definition", () => {
    expect(validateStudyInput({
      ...validStudy,
      demographicFields: [{ id: "custom-123e4567-e89b-12d3-a456-426614174002", type: "singleChoice", label: "Experiência", options: ["A"] }],
    }).ok).toBe(false);
  });

  it("accepts researcher-defined inclusive age bands and fixed sex choices", () => {
    const ageRanges = [
      { id: "123e4567-e89b-12d3-a456-426614174010", min: 0, max: 17 },
      { id: "123e4567-e89b-12d3-a456-426614174011", min: 18, max: 24 },
      { id: "123e4567-e89b-12d3-a456-426614174012", min: 25, max: null },
    ];
    const result = validateStudyInput({
      ...validStudy,
      demographicFields: [
        { id: "age", type: "number", ranges: ageRanges },
        { id: "sex", type: "singleChoice", options: ["Masculino", "Feminino"] },
        { id: "nationality", type: "singleChoice", options: ["Brasileira", "Outra"] },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.demographicFields).toEqual([
      { id: "age", type: "number", ranges: ageRanges },
      { id: "sex", type: "singleChoice", options: ["Masculino", "Feminino"] },
      { id: "nationality", type: "singleChoice", options: ["Brasileira", "Outra"] },
    ]);
  });

  it("rejects overlapping or invalid open-ended age ranges", () => {
    for (const ranges of [
      [
        { id: "123e4567-e89b-12d3-a456-426614174010", min: 18, max: 24 },
        { id: "123e4567-e89b-12d3-a456-426614174011", min: 24, max: 35 },
      ],
      [
        { id: "123e4567-e89b-12d3-a456-426614174010", min: 18, max: null },
        { id: "123e4567-e89b-12d3-a456-426614174011", min: 35, max: 45 },
      ],
    ]) {
      const result = validateStudyInput({ ...validStudy, demographicFields: [{ id: "age", type: "number", ranges }] });
      expect(result.ok ? {} : result.errors).toHaveProperty("demographicFields.age.ranges", "invalidAgeRanges");
    }
  });
});

describe("validateDemographicAnswers", () => {
  it("requires every enabled field and accepts the configured types", () => {
    const result = validateDemographicAnswers(validStudy.demographicFields, {
      age: firstAgeRangeId,
      sex: "Feminino",
      nationality: "Brasileira",
      "custom-123e4567-e89b-12d3-a456-426614174000": "Média",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects missing, out-of-range numeric, and unlisted choice answers", () => {
    expect(validateDemographicAnswers(validStudy.demographicFields, { age: "22" }).ok).toBe(false);
    expect(validateDemographicAnswers(validStudy.demographicFields, {
      age: "not-a-configured-range",
      sex: "X",
      nationality: "BR",
      "custom-123e4567-e89b-12d3-a456-426614174000": "Média",
    }).ok).toBe(false);
    expect(validateDemographicAnswers(validStudy.demographicFields, {
      age: "22",
      sex: "X",
      nationality: "BR",
      "custom-123e4567-e89b-12d3-a456-426614174000": "Outra",
    }).ok).toBe(false);
  });

  it("returns stable field-level codes for required, age, and choice errors", () => {
    const result = validateDemographicAnswers(validStudy.demographicFields, {
      age: "131",
      sex: "X",
      nationality: "BR",
      "custom-123e4567-e89b-12d3-a456-426614174000": "Outra",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        age: "invalidChoice",
        "custom-123e4567-e89b-12d3-a456-426614174000": "invalidChoice",
      });
    }
  });

  it("marks omitted enabled fields as required", () => {
    const result = validateDemographicAnswers(validStudy.demographicFields, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toMatchObject({ age: "required", sex: "required" });
  });

  it("accepts an age-band selection and rejects a number outside the configured range IDs", () => {
    const rangeId = "123e4567-e89b-12d3-a456-426614174011";
    const fields = [
      { id: "age", type: "number" as const, ranges: [{ id: rangeId, min: 18, max: 24 }] },
      { id: "sex", type: "singleChoice" as const, options: ["Masculino", "Feminino"] },
    ] as unknown as Parameters<typeof validateDemographicAnswers>[0];

    expect(validateDemographicAnswers(fields, { age: rangeId, sex: "Feminino" })).toMatchObject({
      ok: true,
      value: { age: rangeId, sex: "Feminino" },
    });
    expect(validateDemographicAnswers(fields, { age: "24", sex: "Feminino" }).ok).toBe(false);
  });

  it("continues validating numeric ages from older participant snapshots", () => {
    const result = validateDemographicAnswers([{ id: "age", type: "number" }], { age: "131" });

    expect(result.ok ? {} : result.errors).toMatchObject({ age: "invalidAge" });
  });
});

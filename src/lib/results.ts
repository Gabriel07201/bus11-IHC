import { formatAgeRange, type DemographicField } from "./study-validation";
import { BUS11_FACTORS, isBusAnswers, scoreBus11, type Bus11FactorId } from "./bus11";

export interface CompletedEvaluation {
  sessionId: string;
  demographics: Record<string, unknown>;
  demographicFields?: DemographicField[];
  chatbot: { id: string; name: string; url: string };
  position: number;
  answers: unknown;
  completedAt: string | null;
}

export interface FactorSummary {
  id: Bus11FactorId;
  mean: number;
  normalized: number;
}

export interface ChatbotSummary {
  id: string;
  name: string;
  url: string;
  evaluations: number;
  overall: number;
  factors: FactorSummary[];
  items: { number: number; counts: number[]; percentages: number[] }[];
}

export interface DemographicSummary {
  id: string;
  label: string;
  type: DemographicField["type"];
  groups: { value: string; participants: number; percent: number; meanOverall: number }[];
}

export interface ResultsSummary {
  evaluations: number;
  participants: number;
  chatbots: ChatbotSummary[];
  demographics: DemographicSummary[];
}

const predefinedLabels = {
  en: { age: "Age", sex: "Sex", nationality: "Nationality" },
  "pt-BR": { age: "Idade", sex: "Sexo", nationality: "Nacionalidade" },
} as const;

export function summarizeResults(
  rows: readonly CompletedEvaluation[],
  fields: readonly DemographicField[],
  locale: "pt-BR" | "en" = "pt-BR",
): ResultsSummary {
  const byBot = new Map<string, {
    chatbot: CompletedEvaluation["chatbot"];
    scores: ReturnType<typeof scoreBus11>[];
    itemCounts: number[][];
  }>();
  const byParticipant = new Map<string, {
    demographics: Record<string, unknown>;
    demographicFields?: DemographicField[];
    scores: number[];
  }>();

  for (const row of rows) {
    if (!row.completedAt || !row.sessionId || !row.chatbot.id || !isBusAnswers(row.answers)) continue;

    const score = scoreBus11(row.answers);
    let bot = byBot.get(row.chatbot.id);
    if (!bot) {
      bot = {
        chatbot: row.chatbot,
        scores: [],
        itemCounts: Array.from({ length: 11 }, () => Array<number>(5).fill(0)),
      };
      byBot.set(row.chatbot.id, bot);
    }
    bot.scores.push(score);
    row.answers.forEach((answer, index) => { bot!.itemCounts[index][answer - 1] += 1; });

    let participant = byParticipant.get(row.sessionId);
    if (!participant) {
      participant = { demographics: row.demographics, demographicFields: row.demographicFields, scores: [] };
      byParticipant.set(row.sessionId, participant);
    }
    participant.scores.push(score.overall);
  }

  const chatbots = [...byBot.entries()].map(([id, result]): ChatbotSummary => {
    const evaluations = result.scores.length;
    const factors = BUS11_FACTORS.map((definition) => {
      const values = result.scores.map((score) => score.factors.find((factor) => factor.id === definition.id)!);
      return {
        id: definition.id,
        mean: values.reduce((sum, factor) => sum + factor.mean, 0) / evaluations,
        normalized: values.reduce((sum, factor) => sum + factor.normalized, 0) / evaluations,
      };
    });
    return {
      id,
      name: result.chatbot.name,
      url: result.chatbot.url,
      evaluations,
      overall: result.scores.reduce((sum, score) => sum + score.overall, 0) / evaluations,
      factors,
      items: result.itemCounts.map((counts, index) => ({
        number: index + 1,
        counts,
        percentages: counts.map((count) => (count / evaluations) * 100),
      })),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));

  const demographics = fields.map((field): DemographicSummary => {
    const groups = new Map<string, { participants: number; scores: number[]; sortValue: number | null }>();
    for (const participant of byParticipant.values()) {
      const rawValue = participant.demographics[field.id];
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") continue;
      const participantField = participant.demographicFields?.find((item) => item.id === field.id) ?? field;
      let value = String(rawValue).trim();
      let sortValue: number | null = field.type === "number" ? Number(value) : null;
      if (field.id === "age" && participantField.ranges?.length) {
        const range = participantField.ranges.find((item) => item.id === value);
        if (!range) continue;
        value = formatAgeRange(range);
        sortValue = range.min;
      }
      let group = groups.get(value);
      if (!group) {
        group = { participants: 0, scores: [], sortValue };
        groups.set(value, group);
      }
      group.participants += 1;
      group.scores.push(participant.scores.reduce((sum, score) => sum + score, 0) / participant.scores.length);
    }

    const denominator = [...groups.values()].reduce((sum, group) => sum + group.participants, 0);
    const entries = [...groups.entries()];
    entries.sort(([a, left], [b, right]) => field.type === "number"
      ? (left.sortValue ?? Number(a)) - (right.sortValue ?? Number(b))
      : a.localeCompare(b, locale));
    const preset = predefinedLabels[locale][field.id as keyof typeof predefinedLabels[typeof locale]];

    return {
      id: field.id,
      label: field.label ?? preset ?? field.id,
      type: field.type,
      groups: entries.map(([value, group]) => ({
        value,
        participants: group.participants,
        percent: denominator ? (group.participants / denominator) * 100 : 0,
        meanOverall: group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length,
      })),
    };
  });

  return {
    evaluations: chatbots.reduce((sum, chatbot) => sum + chatbot.evaluations, 0),
    participants: byParticipant.size,
    chatbots,
    demographics,
  };
}

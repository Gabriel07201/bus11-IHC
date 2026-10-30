export type Bus11FactorId = "accessibility" | "functionalConversation" | "privacy" | "responsiveness";

export interface Bus11FactorDefinition {
  id: Bus11FactorId;
  labelKey: "factorAccessibility" | "factorFunctionalConversation" | "factorPrivacy" | "factorResponsiveness";
  items: readonly number[];
}

export interface Bus11FactorScore extends Bus11FactorDefinition {
  mean: number;
  normalized: number;
}

export interface Bus11Score {
  factors: Bus11FactorScore[];
  overall: number;
}

export type StudyLocale = "pt-BR" | "en";
export type BusAnswers = readonly [number, number, number, number, number, number, number, number, number, number, number];

export const BUS11_FACTORS: readonly Bus11FactorDefinition[] = [
  { id: "accessibility", labelKey: "factorAccessibility", items: [1, 2] },
  { id: "functionalConversation", labelKey: "factorFunctionalConversation", items: [3, 4, 5, 6, 7, 8, 9] },
  { id: "privacy", labelKey: "factorPrivacy", items: [10] },
  { id: "responsiveness", labelKey: "factorResponsiveness", items: [11] },
];

// English wording follows Table 2 and the factor structure recommended by
// Borsci & Schmettow (2024). The Portuguese wording is a local translation,
// not a validated Portuguese adaptation.
export const BUS11_ITEMS = [
  {
    number: 1,
    factor: "accessibility",
    en: "The chatbot function was easily detectable",
    pt: "Foi fácil perceber a função do chatbot",
  },
  {
    number: 2,
    factor: "accessibility",
    en: "It was easy to find the chatbot",
    pt: "Foi fácil encontrar o chatbot",
  },
  {
    number: 3,
    factor: "functionalConversation",
    en: "Communicating with the chatbot was clear",
    pt: "A comunicação com o chatbot foi clara",
  },
  {
    number: 4,
    factor: "functionalConversation",
    en: "The chatbot was able to keep track of context",
    pt: "O chatbot foi capaz de manter o contexto",
  },
  {
    number: 5,
    factor: "functionalConversation",
    en: "The chatbot’s responses were easy to understand",
    pt: "As respostas do chatbot foram fáceis de entender",
  },
  {
    number: 6,
    factor: "functionalConversation",
    en: "I find that the chatbot understands what I want and helps me achieve my goal",
    pt: "Sinto que o chatbot entende o que quero e me ajuda a atingir meu objetivo",
  },
  {
    number: 7,
    factor: "functionalConversation",
    en: "The chatbot gives me the appropriate amount of information",
    pt: "O chatbot me fornece uma quantidade adequada de informações",
  },
  {
    number: 8,
    factor: "functionalConversation",
    en: "The chatbot only gives me the information I need",
    pt: "O chatbot me fornece apenas as informações de que preciso",
  },
  {
    number: 9,
    factor: "functionalConversation",
    en: "I feel like the chatbot’s responses were accurate",
    pt: "Sinto que as respostas do chatbot foram precisas",
  },
  {
    number: 10,
    factor: "privacy",
    en: "I believe the chatbot informs me of any possible privacy issues",
    pt: "Acredito que o chatbot me informa sobre possíveis questões de privacidade",
  },
  {
    number: 11,
    factor: "responsiveness",
    en: "My waiting time for a response from the chatbot was short",
    pt: "O tempo de espera por uma resposta do chatbot foi curto",
  },
] as const;

export function isBusAnswers(input: unknown): input is BusAnswers {
  return Array.isArray(input)
    && input.length === 11
    && input.every((answer) => Number.isInteger(answer) && answer >= 1 && answer <= 5);
}

export function scoreBus11(input: unknown): Bus11Score {
  if (!isBusAnswers(input)) {
    throw new RangeError("A BUS-11 exige exatamente 11 respostas inteiras de 1 a 5.");
  }

  const factors = BUS11_FACTORS.map((factor): Bus11FactorScore => {
    const values = factor.items.map((item) => input[item - 1]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { ...factor, mean, normalized: ((mean - 1) / 4) * 100 };
  });

  return {
    factors,
    overall: factors.reduce((sum, factor) => sum + factor.normalized, 0) / factors.length,
  };
}

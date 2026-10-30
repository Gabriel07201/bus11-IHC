export function selectBalancedBots<T extends { id: string }>(
  bots: readonly T[],
  counts: Readonly<Record<string, number>>,
  quantity: number,
  randomIndex: (length: number) => number,
): T[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > bots.length) {
    throw new RangeError("A quantidade deve estar entre 1 e o total de chatbots disponíveis.");
  }

  const remaining = [...bots];
  const ids = remaining.map(({ id }) => id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new RangeError("Cada chatbot precisa ter um identificador único.");
  }

  const assignmentCounts = new Map<string, number>();
  for (const id of ids) {
    const count = counts[id] ?? 0;
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError("As contagens de atribuição devem ser inteiros não negativos.");
    }
    assignmentCounts.set(id, count);
  }

  const chooseIndex = (length: number): number => {
    const index = randomIndex(length);
    if (!Number.isInteger(index) || index < 0 || index >= length) {
      throw new RangeError("A função de sorteio retornou um índice inválido.");
    }
    return index;
  };

  const selected: T[] = [];
  while (selected.length < quantity) {
    const lowestCount = Math.min(...remaining.map(({ id }) => assignmentCounts.get(id) ?? 0));
    const tied = remaining.filter(({ id }) => assignmentCounts.get(id) === lowestCount);
    const bot = tied[chooseIndex(tied.length)];
    selected.push(bot);
    assignmentCounts.set(bot.id, lowestCount + 1);
    remaining.splice(remaining.findIndex(({ id }) => id === bot.id), 1);
  }

  for (let index = selected.length - 1; index > 0; index -= 1) {
    const swapIndex = chooseIndex(index + 1);
    [selected[index], selected[swapIndex]] = [selected[swapIndex], selected[index]];
  }

  return selected;
}

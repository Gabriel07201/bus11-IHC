import { describe, expect, it } from "vitest";
import { getMessages } from "./i18n";

describe("participant and protocol copy", () => {
  it("states that participation progress is saved automatically", () => {
    expect(getMessages("pt-BR").sessionResume)
      .toBe("Seu progresso é salvo automaticamente. Você pode retomar depois com o mesmo código de participação.");
    expect(getMessages("en").sessionResume)
      .toBe("Your progress is saved automatically. You can resume later with the same participation code.");
  });

  it("describes the protocol without a translation-validation warning", () => {
    expect(getMessages("pt-BR").protocolNote.toLowerCase()).not.toContain("tradução");
    expect(getMessages("en").protocolNote.toLowerCase()).not.toContain("translation");
  });
});

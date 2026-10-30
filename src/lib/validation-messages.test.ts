import { describe, expect, it } from "vitest";
import { getMessages } from "./i18n";
import { validationErrorMessage } from "./validation-messages";

describe("validationErrorMessage", () => {
  it("localizes the same stable validation code in the selected interface language", () => {
    expect(validationErrorMessage("invalidStudyTitle", getMessages("pt-BR"))).toBe("Informe um título de até 160 caracteres.");
    expect(validationErrorMessage("invalidStudyTitle", getMessages("en"))).toBe("Enter a study title of up to 160 characters.");
  });

  it("uses the generic error for unknown codes", () => {
    expect(validationErrorMessage("unknown", getMessages("en"))).toBe(getMessages("en").genericError);
  });
});

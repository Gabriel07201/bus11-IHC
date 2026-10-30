import type { Messages } from "./i18n";

export function validationErrorMessage(code: string, messages: Messages): string {
  return messages.validationErrors[code as keyof Messages["validationErrors"]] ?? messages.genericError;
}

import en from "./locales/en";
import id from "./locales/id";

export const messages = {
  en,
  id,
} as const;

export type Locale = keyof typeof messages;
export type Messages = (typeof messages)[Locale];

export const isLocale = (value: string): value is Locale =>
  Object.prototype.hasOwnProperty.call(messages, value);

export const getLanguageTag = (locale: Locale) =>
  (locale === "id" ? "id-ID" : "en-US") as const;

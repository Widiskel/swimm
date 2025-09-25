import { messages, type Locale } from "./messages";

type Primitive = string | number | boolean | null | undefined;
type Replacements = Record<string, Primitive>;

const resolvePath = (source: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== "object") {
      return undefined;
    }
    return (acc as Record<string, unknown>)[segment];
  }, source);

const formatMessage = (message: string, replacements?: Replacements) => {
  if (!replacements) {
    return message;
  }
  return Object.entries(replacements).reduce((acc, [key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    return acc.replace(regex, value == null ? "" : String(value));
  }, message);
};

export const translate = (locale: Locale, path: string, replacements?: Replacements) => {
  const localeMessages = messages[locale];
  const resolved = resolvePath(localeMessages, path);
  if (typeof resolved === "string") {
    return formatMessage(resolved, replacements);
  }
  if (Array.isArray(resolved)) {
    return resolved
      .map((item) =>
        typeof item === "string" ? formatMessage(item, replacements) : String(item)
      )
      .join(" ");
  }
  return path;
};

export type { Replacements };

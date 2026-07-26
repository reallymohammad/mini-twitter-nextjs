// lib/i18n/config.ts
export const locales = ["en", "fa"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const rtlLocales: Locale[] = ["fa"];

export const isValidLocale = (locale: string): locale is Locale =>
  (locales as readonly string[]).includes(locale);

export interface Language {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { id: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { id: "pt", name: "Portuguese (Brazil)", nativeName: "Português", flag: "🇧🇷" },
  { id: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { id: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { id: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { id: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { id: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { id: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
];

export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isValidLocale(locale: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.id === locale.toLowerCase());
}

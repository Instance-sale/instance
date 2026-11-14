import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE } from "@/config/languages";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value || DEFAULT_LOCALE;
  const locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  let messages = {};
  try {
    messages = (await import(`../locales/${locale}.json`)).default;
  } catch {
    messages = (await import(`../locales/${DEFAULT_LOCALE}.json`)).default;
  }

  return {
    locale,
    messages,
  };
});

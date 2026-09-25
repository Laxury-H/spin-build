import { useSpin } from "@/lib/store";
import { DICTIONARY, type TranslationKey } from "./i18n";

export function useTranslation() {
  const lang = useSpin((s) => s.lang);
  const t = (key: TranslationKey) => DICTIONARY[lang]?.[key] ?? DICTIONARY.en[key] ?? key;
  return { t, lang };
}

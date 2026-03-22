import type { i18n } from "i18next";
import { LOCAL_STORAGE_KEYS } from "@/constants";

export function updateAppLanguage(i18n: i18n) {
  const localLang = localStorage.getItem(LOCAL_STORAGE_KEYS.LANGUAGE);
  if (!localLang) {
    return;
  }

  i18n.changeLanguage(localLang);
  document.documentElement.lang = localLang;
}

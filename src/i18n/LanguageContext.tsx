import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { translations, Language, TranslationKey } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  tObj: (key: TranslationKey) => any;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("lang");
    return (stored === "es" || stored === "en") ? stored : "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const val = translations[language][key];
    if (typeof val === "string") return val;
    return String(val);
  }, [language]);

  const tObj = useCallback((key: TranslationKey): any => {
    return translations[language][key];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tObj }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

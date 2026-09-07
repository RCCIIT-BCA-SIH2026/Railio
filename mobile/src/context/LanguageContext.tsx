import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  SUPPORTED_LANGUAGES,
  UI_DICTIONARY,
  LanguageOption,
  translateWithGoogleApi,
  translateStringSync,
  setCurrentLanguage,
  getCurrentLanguage,
  registerTranslationListener,
} from '../services/googleTranslateService';

interface LanguageContextProps {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  translateDynamic: (text: string) => Promise<string>;
  isModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
  activeLanguageOption: LanguageOption;
  supportedLanguages: LanguageOption[];
  translationTick: number;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(getCurrentLanguage());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [translationTick, setTranslationTick] = useState<number>(0);

  // Set language with persistence and global synchronization
  const setLanguage = useCallback((newLang: string) => {
    setLanguageState(newLang);
    setCurrentLanguage(newLang);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('railsathi_mobile_lang', newLang);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const saved = getCurrentLanguage();
    if (saved && saved !== language) {
      setLanguageState(saved);
    }

    // When background Google Translate calls resolve, trigger re-render of subscribed screens
    const unregister = registerTranslationListener(() => {
      setTranslationTick((t) => t + 1);
    });
    return unregister;
  }, [language]);

  // Robust translation lookup: handles exact phrases, keys, and dynamic cache
  const t = useCallback(
    (keyOrPhrase: string, fallback?: string): string => {
      if (!keyOrPhrase) return fallback || '';
      if (language === 'en') return fallback || keyOrPhrase;

      // 1. Try direct string translation
      const translated = translateStringSync(keyOrPhrase, language);
      if (translated && translated !== keyOrPhrase) {
        return translated;
      }

      // 2. Try dictionary key lookup (e.g. 'nav.home')
      const entry = UI_DICTIONARY[keyOrPhrase];
      if (entry && entry[language]) {
        return entry[language];
      }

      return fallback || keyOrPhrase;
    },
    [language]
  );

  // Dynamic Google Translate for runtime texts
  const translateDynamic = useCallback(
    async (text: string): Promise<string> => {
      if (language === 'en') return text;
      return await translateWithGoogleApi(text, language);
    },
    [language]
  );

  const openLanguageModal = useCallback(() => setIsModalOpen(true), []);
  const closeLanguageModal = useCallback(() => setIsModalOpen(false), []);

  const activeLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateDynamic,
        isModalOpen,
        openLanguageModal,
        closeLanguageModal,
        activeLanguageOption,
        supportedLanguages: SUPPORTED_LANGUAGES,
        translationTick,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'All India' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'Northern / Central' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'Eastern (ER/SER)' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Southern (SR)' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'South Central (SCR)' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Central / Western' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Western (WR)' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'South Western (SWR)' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Southern (SR/Kerala)' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Northern (NR/Punjab)' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'East Coast (ECoR)' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Northern / Deccan' },
];

export const LanguageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentLang, setCurrentLang] = useState<string>('en');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read stored language or google translate cookie
    const savedLang = localStorage.getItem('railsathi_admin_lang');
    if (savedLang && SUPPORTED_LANGUAGES.some((l) => l.code === savedLang)) {
      setCurrentLang(savedLang);
    } else {
      // Check cookies
      const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/);
      if (match && match[1] && SUPPORTED_LANGUAGES.some((l) => l.code === match[1])) {
        setCurrentLang(match[1]);
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (langCode: string) => {
    setCurrentLang(langCode);
    localStorage.setItem('railsathi_admin_lang', langCode);
    setIsOpen(false);

    // Set Google Translate Cookie
    const cookieValue = `/en/${langCode}`;
    document.cookie = `googtrans=${cookieValue}; path=/;`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=.${window.location.hostname};`;

    // Try finding and triggering the Google combo
    const selectElem = document.querySelector('select.goog-te-combo') as HTMLSelectElement | null;
    if (selectElem) {
      selectElem.value = langCode;
      selectElem.dispatchEvent(new Event('change'));
    } else {
      // If combo not in DOM yet, reload with the cookie set
      window.location.reload();
    }
  };

  const activeLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 hover:border-orange-300 transition-all focus:outline-none focus:ring-2 focus:ring-rail-orange/40"
        title="Google Translate Multilingual Engine"
      >
        <Globe className="w-4 h-4 text-rail-orange animate-pulse-glow" />
        <span className="font-bold text-slate-800">{activeLanguage.nativeName}</span>
        <span className="text-[10px] text-slate-400 font-normal hidden md:inline">({activeLanguage.code.toUpperCase()})</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-white/95 backdrop-blur-md shadow-2xl border border-slate-200 ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-rail-orange" />
                Select Language (भाषा)
              </p>
              <p className="text-[9px] text-slate-500 font-medium">Powered by Google Translate</p>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-200/60 text-orange-900 font-bold uppercase">
              12 Languages
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-100">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-orange-50/80 text-rail-orange font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold flex items-center gap-2">
                      {lang.nativeName}
                      <span className="text-[10px] text-slate-400 font-normal">({lang.name})</span>
                    </span>
                    <span className="text-[9px] text-slate-400">{lang.region}</span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-rail-orange text-white flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Dynamic IR Telemetry Live Translate</span>
            <span className="text-rail-orange font-bold text-[9px]">ACTIVE</span>
          </div>
        </div>
      )}
    </div>
  );
};

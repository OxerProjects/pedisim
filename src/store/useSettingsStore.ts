import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'he';

interface SettingsState {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'he', // default to hebrew per request
      dir: 'rtl',
      setLanguage: (lang) =>
        set({
          language: lang,
          dir: lang === 'he' ? 'rtl' : 'ltr',
        }),
    }),
    {
      name: 'pedisim-settings',
    }
  )
);

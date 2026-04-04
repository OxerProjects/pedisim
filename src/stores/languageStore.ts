import { create } from 'zustand';

type Lang = 'EN' | 'HE';

interface LanguageState {
  lang: Lang;
  toggleLang: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: 'HE', // Default as per initial spec in Hebrew
  toggleLang: () => set((state) => ({ lang: state.lang === 'EN' ? 'HE' : 'EN' })),
}));

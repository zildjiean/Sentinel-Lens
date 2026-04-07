import { create } from "zustand";

interface LanguageStore {
  locale: "en" | "th";
  setLocale: (locale: "en" | "th") => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
}));

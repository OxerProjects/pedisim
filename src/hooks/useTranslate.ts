"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { dictionaries } from "@/lib/i18n";
import { useState, useEffect } from "react";

export function useTranslate() {
  const language = useSettingsStore((state) => state.language);
  
  // To avoid hydration mismatch errors with fallback to default english on first render
  // we could just return the dictionary by default since we're using Zustand persistance
  // However, hydration might still be tricky. For now, we trust client rendering.
  return dictionaries[language];
}

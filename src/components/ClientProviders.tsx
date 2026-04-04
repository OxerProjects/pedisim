"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { useEffect } from "react";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const { dir, language } = useSettingsStore();

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  return <>{children}</>;
}

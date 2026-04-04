"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { useEffect, useState } from "react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[70px] h-[32px]" />;
  }

  return (
    <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden text-xs font-semibold">
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1.5 transition-all ${
          language === "en"
            ? "bg-gray-800 text-white"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("he")}
        className={`px-3 py-1.5 transition-all ${
          language === "he"
            ? "bg-gray-800 text-white"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        HE
      </button>
    </div>
  );
}

"use client";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PediSimLogo } from "@/components/PediSimLogo";
import { useTranslate } from "@/hooks/useTranslate";
import Link from "next/link";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslate();

  return (
    <div className="flex flex-col min-h-screen bg-white" dir="ltr">
      {/* Header - always LTR so logo stays left */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 fixed top-0 left-0 right-0 z-50 bg-white">
        <Link href="/">
          <PediSimLogo size="small" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            {t.common.login}
          </Link>
          <Link
            href="#"
            className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {t.home.goToLogin}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content - respects dir from settings */}
      <main className="flex-1 flex flex-col mt-20" dir="auto">
        {children}
      </main>
    </div>
  );
}

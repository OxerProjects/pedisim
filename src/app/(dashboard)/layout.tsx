"use client";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { useTranslate } from "@/hooks/useTranslate";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslate();

  return (
    <div className="flex min-h-screen bg-slate-50 flex-col">
      <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl text-primary flex items-center gap-2">
            <span className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">P</span>
            PEDI SIM
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
              {t.dashboard.adminTitle}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

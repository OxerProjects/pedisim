"use client";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white flex-col">
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl text-primary flex items-center gap-2">
            <span className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">P</span>
            PEDI SIM
          </Link>
          <span className="text-slate-400 text-sm font-medium">Control Panel</span>
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

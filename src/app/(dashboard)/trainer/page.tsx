"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { Activity } from "lucide-react";

export default function TrainerDashboard() {
  const t = useTranslate();

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.dashboard.trainerTitle}</h1>
        </div>
        <p className="text-slate-500">
          This module is under construction. It will contain controls for simulating patient vitals, rhythms, and alarms.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder cards for future features */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-64 flex flex-col items-center justify-center text-slate-400 border-dashed">
          Vitals Controller (Pending)
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-64 flex flex-col items-center justify-center text-slate-400 border-dashed">
          Active Alarms (Pending)
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-64 flex flex-col items-center justify-center text-slate-400 border-dashed">
          Interventions & Logs (Pending)
        </div>
      </div>
    </div>
  );
}

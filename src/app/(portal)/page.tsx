"use client";

import { useTranslate } from "@/hooks/useTranslate";
import Image from "next/image";

export default function HomePage() {
  const t = useTranslate();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center pt-16 pb-12 px-4">
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-black text-center leading-tight tracking-tight">
          {t.home.title}
        </h1>
        <p className="text-xl sm:text-2xl text-gray-500 mt-4 text-center font-normal">
          {t.home.subtitle}
        </p>
      </section>

      {/* Monitor Preview Image */}
      <section className="w-full max-w-5xl mx-auto px-4 pb-16">
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
          <Image
            src="/monitor-preview.png"
            alt="PEDI SIM Medical Monitor Preview"
            width={1200}
            height={700}
            className="w-full h-auto"
            priority
          />
        </div>
      </section>
    </div>
  );
}

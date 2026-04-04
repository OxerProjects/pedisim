"use client";

export function PediSimLogo({ className = "", size = "default" }: { className?: string; size?: "small" | "default" | "large" }) {
  const heights: Record<string, number> = { small: 28, default: 40, large: 64 };
  const h = heights[size];
  const w = h * 3.5;

  return (
    <img src="/logo.png" alt="PediSim Logo" width={w} height={h} className={className} />
  );
}

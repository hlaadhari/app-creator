import React from "react";

interface SproutLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export function SproutLogo({
  size = "md",
  showText = true,
  subtitle = "Labo STI",
  className = "",
}: SproutLogoProps) {
  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Sprout Icon */}
      <div className={`relative flex shrink-0 items-center justify-center rounded-lg bg-emerald-950/40 p-1 border border-emerald-500/20 ${iconSizes[size]}`}>
        <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soil */}
          <path d="M 18 52 Q 32 48 46 52" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
          {/* Stems */}
          <path d="M 30 50 L 30 32" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          <path d="M 34 50 L 34 32" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          {/* Left Leaf */}
          <path d="M 30 33 C 18 33 10 22 16 14 C 26 14 30 24 30 33 Z" fill="#4ade80" />
          {/* Right Leaf */}
          <path d="M 34 33 C 45 15 61 12 64 24 C 57 37 42 35 34 33 Z" fill="#22c55e" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-semibold tracking-tight ${textSizes[size]}`}>
            <span className="text-emerald-500">Sprout</span>{" "}
            <span className="text-foreground">Workshop</span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

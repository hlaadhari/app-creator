import React from "react";
import { Search, X, Sparkles } from "lucide-react";

interface CourseSearchProps {
  value: string;
  onChange: (query: string) => void;
  className?: string | undefined;
}

const QUICK_TAGS = [
  "mysqli_fetch_array",
  "box-model",
  "onsubmit",
  "length",
  "CHECK",
  "display: inline-block",
  "return false",
  "CREATE TABLE",
];

export function CourseSearch({ value, onChange, className = "" }: CourseSearchProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Champ de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher une notion (ex: mysqli, verif, CHECK...)"
          className="w-full pl-9 pr-8 py-1.5 text-xs bg-background/80 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            title="Effacer la recherche"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Raccourcis de recherche rapide */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
        <span className="text-muted-foreground/70 shrink-0 flex items-center gap-0.5">
          <Sparkles className="h-2.5 w-2.5 text-primary" />
          Suggestions:
        </span>
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(value === tag ? "" : tag)}
            className={`px-1.5 py-0.5 rounded font-mono shrink-0 transition-colors cursor-pointer border ${
              value === tag
                ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

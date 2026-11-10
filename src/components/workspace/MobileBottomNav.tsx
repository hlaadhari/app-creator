import type { ReactNode } from "react";
import { BookOpen, CheckCircle2, Code2, Eye } from "lucide-react";

export type MobileNavKey = "sujet" | "code" | "apercu" | "resultats";

interface MobileBottomNavProps {
  active: MobileNavKey;
  onSelect: (key: MobileNavKey) => void;
  /** Pastille de la note sur l'entrée « Résultats ». */
  resultBadge?: string | null | undefined;
}

const ITEMS: { key: MobileNavKey; label: string; ariaLabel: string; icon: ReactNode }[] = [
  {
    key: "sujet",
    label: "Sujet",
    ariaLabel: "Afficher l'énoncé du sujet",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    key: "code",
    label: "Code",
    ariaLabel: "Afficher l'éditeur de code",
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    key: "apercu",
    label: "Aperçu",
    ariaLabel: "Afficher l'aperçu",
    icon: <Eye className="h-5 w-5" />,
  },
  {
    key: "resultats",
    label: "Résultats",
    ariaLabel: "Afficher les résultats de vérification",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
];

/**
 * Navigation du bas du workspace sur mobile (< 768 px) : un seul panneau à la fois (#243).
 * Cibles tactiles de 44 px minimum et marge pour la zone sûre des écrans à encoche.
 */
export function MobileBottomNav({ active, onSelect, resultBadge }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navigation du workspace"
      className="flex shrink-0 border-t bg-panel pb-[env(safe-area-inset-bottom)]"
    >
      {ITEMS.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-label={item.ariaLabel}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
              isActive
                ? "border-t-2 border-primary bg-background/40 text-foreground"
                : "border-t-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.key === "resultats" && resultBadge && (
              <span className="absolute right-3 top-1 rounded-full bg-primary/20 px-1 text-[10px] text-primary">
                {resultBadge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

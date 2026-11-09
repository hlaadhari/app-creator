import type { ReactNode } from "react";

interface SidebarTabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  /** Pastille optionnelle à droite du libellé (ex. note /20). */
  badge?: ReactNode;
}

/**
 * Onglet de la barre latérale du workspace (Sujet / Fichiers / Résultats).
 * Factorise la chaîne de classes conditionnelle répétée (#240).
 */
export function SidebarTabButton({
  active,
  onClick,
  label,
  ariaLabel,
  icon,
  badge,
}: SidebarTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`flex-1 py-2 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[11px] transition-colors cursor-pointer ${
        active
          ? "border-b-2 border-primary text-foreground font-semibold bg-background/40"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge}
    </button>
  );
}

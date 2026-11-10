import { useEffect, useState } from "react";

export type WorkspaceLayout = "mobile" | "tablet" | "desktop";

/** Mêmes seuils que `useIsMobile` (768 px) ; le desktop commence à 1280 px (#244). */
export const MOBILE_MAX = 767;
export const DESKTOP_MIN = 1280;

function lireMode(): WorkspaceLayout {
  if (window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches) return "mobile";
  if (window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`).matches) return "desktop";
  return "tablet";
}

/**
 * Mode de mise en page du workspace : un panneau (mobile), deux colonnes (tablette)
 * ou trois colonnes redimensionnables (desktop). Renvoie `null` avant le montage :
 * la taille de la fenêtre n'est connue que côté client, ce qui évite tout écart
 * d'hydratation avec le rendu serveur.
 */
export function useWorkspaceLayout(): WorkspaceLayout | null {
  const [mode, setMode] = useState<WorkspaceLayout | null>(null);

  useEffect(() => {
    const mobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const desktop = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const maj = () => setMode(lireMode());
    maj();
    mobile.addEventListener("change", maj);
    desktop.addEventListener("change", maj);
    return () => {
      mobile.removeEventListener("change", maj);
      desktop.removeEventListener("change", maj);
    };
  }, []);

  return mode;
}

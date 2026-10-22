/**
 * Lecture du détail d'une tentative. Deux formats coexistent en base :
 *  - élève (page sujet) : `{ [idCritère]: { ok, label } }`
 *  - ancien/atelier     : `{ criteres: [{ valide, code, titre }] }`
 */

export type BilanCriteres = {
  total: number;
  reussis: number;
  pointsFaibles: string[];
};

const VIDE: BilanCriteres = { total: 0, reussis: 0, pointsFaibles: [] };

export function analyserDetailsTentative(details: unknown): BilanCriteres {
  if (!details || typeof details !== "object") return VIDE;
  const brut = details as Record<string, unknown>;

  if (Array.isArray(brut["criteres"])) {
    const liste = brut["criteres"] as { valide?: boolean; code?: string; titre?: string }[];
    return {
      total: liste.length,
      reussis: liste.filter((c) => c.valide === true).length,
      pointsFaibles: liste
        .filter((c) => !c.valide)
        .map((c) => c.titre || c.code || "Critère non validé"),
    };
  }

  const entrees = Object.entries(brut).filter(
    (e): e is [string, { ok?: boolean; label?: string }] =>
      !!e[1] && typeof e[1] === "object" && "ok" in (e[1] as object),
  );
  return {
    total: entrees.length,
    reussis: entrees.filter(([, v]) => v.ok === true).length,
    pointsFaibles: entrees.filter(([, v]) => v.ok !== true).map(([id, v]) => v.label || id),
  };
}

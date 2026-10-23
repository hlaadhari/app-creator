/**
 * Lecture du détail d'une tentative. Deux formats coexistent en base :
 *  - élève (page sujet) : `{ [idCritère]: { ok, label } }`
 *  - ancien/atelier     : `{ criteres: [{ valide, code, titre }] }`
 */

export type TentativeSource = "client" | "serveur" | "enseignant";

export type BilanCriteres = {
  total: number;
  reussis: number;
  pointsFaibles: string[];
};

/**
 * Retourne le libellé explicite de provenance d'une tentative (SEC-02 / Issue #116).
 */
export function getLibelleSourceTentative(source?: TentativeSource | null): string {
  if (source === "serveur" || source === "enseignant") {
    return "Vérifié / Enseignant";
  }
  return "Déclaratif (poste élève)";
}

/**
 * Indique si une tentative est d'origine officielle (serveur ou enseignant) et peut
 * être prise en compte dans les notes d'examen officielles (SEC-02 / T-15).
 */
export function estTentativeOfficielle(source?: TentativeSource | null): boolean {
  return source === "serveur" || source === "enseignant";
}

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

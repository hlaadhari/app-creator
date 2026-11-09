/**
 * Identité de l'application : source unique pour la version, la révision,
 * les droits et les auteurs affichés dans l'interface (#237).
 */

export interface AppAuthor {
  nom: string;
  role: string;
  href?: string;
}

export interface AppInfo {
  nom: string;
  sousTitre: string;
  version: string;
  revision: string;
  dateBuild: string | null;
  licence: { nom: string; url: string };
  copyright: string;
  depot: string;
  auteurs: readonly AppAuthor[];
  outils: readonly string[];
  mentionContenus: string;
}

const DEPOT = "https://github.com/hlaadhari/app-creator";

function lireConstante(lecture: () => string): string | null {
  try {
    return lecture();
  } catch {
    // Constante non injectée (Vitest, outils) : repli géré par l'appelant.
    return null;
  }
}

const version = lireConstante(() => __APP_VERSION__) ?? "dev";
const revision = lireConstante(() => __APP_COMMIT__) ?? "locale";
const dateBuild = lireConstante(() => __APP_BUILD_DATE__);

export const APP_INFO: AppInfo = {
  nom: "Labo STI",
  sousTitre: "Atelier d'entraînement Bac STI — Sprout Workshop",
  version,
  revision,
  dateBuild,
  licence: { nom: "Licence MIT", url: `${DEPOT}/blob/main/LICENSE` },
  copyright: "© 2026 Hatem Laadhari / Labo STI Contributors",
  depot: DEPOT,
  auteurs: [
    {
      nom: "Hatem Laadhari",
      role: "Auteur et mainteneur",
      href: "https://github.com/hlaadhari",
    },
    {
      nom: "Labo STI Contributors",
      role: "Contributeurs du dépôt",
      href: `${DEPOT}/graphs/contributors`,
    },
  ],
  outils: ["Lovable", "Claude (Anthropic)"],
  mentionContenus:
    "Les énoncés d'annales proviennent du Ministère de l'Éducation — Tunisie : leurs droits restent ceux de leurs titulaires. Ils sont proposés à des fins d'entraînement pédagogique.",
};

/** Révision lisible : « v3.1.0 · rév. abc1234 ». */
export function formatRevision(info: Pick<AppInfo, "version" | "revision"> = APP_INFO): string {
  return `v${info.version} · rév. ${info.revision}`;
}

/** Date de build au format français, ou null si inconnue/invalide. */
export function formatBuildDate(iso: string | null = APP_INFO.dateBuild): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

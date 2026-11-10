import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CORRECTION_ENSEIGNANT,
  critereDepuisJson,
  type RawCriterion,
} from "@/lib/evaluation/critere-json";

interface Props {
  criteres: RawCriterion[];
  onChange: (criteres: RawCriterion[]) => void;
  disabled?: boolean;
}

/** Points d'un critère : nombre fini, positif ou nul, avec 2 décimales au plus (barèmes d'examen). */
const pointsValides = (valeur: unknown): boolean =>
  typeof valeur === "number" &&
  Number.isFinite(valeur) &&
  valeur >= 0 &&
  Math.abs(valeur * 100 - Math.round(valeur * 100)) < 1e-9;

/** Erreur de structure du JSON saisi, ou null s'il est exploitable. */
export function erreurCriteres(valeur: unknown): string | null {
  if (!Array.isArray(valeur)) return "Le JSON doit être une liste de critères [ … ].";
  for (const [i, c] of valeur.entries()) {
    if (!c || typeof c !== "object" || Array.isArray(c)) return `Critère ${i + 1} : objet attendu.`;
    const r = c as Record<string, unknown>;
    if (typeof r["id"] !== "string" || r["id"].trim() === "") {
      return `Critère ${i + 1} : « id » (texte) obligatoire.`;
    }
    if (typeof r["titre"] !== "string" || r["titre"].trim() === "") {
      return `Critère ${i + 1} : « titre » (texte) obligatoire.`;
    }
    if (!pointsValides(r["points"])) {
      return `Critère ${i + 1} : « points » doit être un nombre positif, avec 2 décimales au plus (ex. 1,25 s'écrit 1.25).`;
    }
    if (r["correction"] !== undefined && r["correction"] !== CORRECTION_ENSEIGNANT) {
      return `Critère ${i + 1} : « correction » ne peut valoir que « ${CORRECTION_ENSEIGNANT} ».`;
    }
  }
  const ids = valeur.map((c) => (c as { id: string }).id);
  const doublon = ids.find((id, i) => ids.indexOf(id) !== i);
  return doublon ? `L'identifiant « ${doublon} » est utilisé deux fois.` : null;
}

type TypeVerification = "aucune" | "dom_selector" | "css_property" | "avancee";

function typeVerification(c: RawCriterion): TypeVerification {
  if (c["correction"] === CORRECTION_ENSEIGNANT) return "aucune";
  const t = c.sonde?.type;
  if (t === "dom_selector" || t === "css_property") return t;
  return c.sonde ? "avancee" : "aucune";
}

function identifiantSuivant(criteres: RawCriterion[]): string {
  let n = criteres.length + 1;
  const pris = new Set(criteres.map((c) => c.id));
  while (pris.has(`c${n}`)) n += 1;
  return `c${n}`;
}

/**
 * Éditeur de critères (#194) : un formulaire par critère (titre, points, type de vérification,
 * indice, « corrigé par l'enseignant »), avec le JSON brut en mode avancé pour les vérifications
 * déclarées (js_function_exists, js_test_execution…). Un aperçu indique pour chaque critère s'il a
 * une vraie vérification automatique.
 */
export function CriteriaEditor({ criteres, onChange, disabled }: Props) {
  const [texte, setTexte] = useState(() => JSON.stringify(criteres, null, 2));
  const [erreur, setErreur] = useState<string | null>(null);

  const apercu = useMemo(
    () =>
      criteres.map((c) => {
        const critere = critereDepuisJson(c);
        const etat = critere.manuel ? "manuel" : critere.automatique !== false ? "auto" : "non";
        return { c, etat };
      }),
    [criteres],
  );

  /** Modification via le formulaire : le JSON avancé est resynchronisé. */
  const appliquer = (nouveaux: RawCriterion[]) => {
    setTexte(JSON.stringify(nouveaux, null, 2));
    setErreur(null);
    onChange(nouveaux);
  };

  const remplacer = (i: number, critere: RawCriterion) =>
    appliquer(criteres.map((c, j) => (j === i ? critere : c)));

  const modifierCritere = (i: number, changements: Partial<RawCriterion>) => {
    const c = criteres[i];
    if (c) remplacer(i, { ...c, ...changements });
  };

  const changerVerification = (i: number, type: TypeVerification) => {
    const c = criteres[i];
    if (!c || type === "avancee") return;
    const base: RawCriterion = { ...c };
    delete base.sonde;
    delete base["correction"];
    if (type === "aucune") {
      remplacer(i, { ...base, correction: CORRECTION_ENSEIGNANT });
    } else if (type === "dom_selector") {
      remplacer(i, { ...base, sonde: { type, selector: "", minCount: 1 } });
    } else {
      remplacer(i, { ...base, sonde: { type, selector: "", property: "", expectedValue: "" } });
    }
  };

  const modifierSonde = (i: number, changements: Record<string, unknown>) => {
    const c = criteres[i];
    if (!c?.sonde) return;
    modifierCritere(i, { sonde: { ...c.sonde, ...changements } });
  };

  const ajouter = () =>
    appliquer([
      ...criteres,
      {
        id: identifiantSuivant(criteres),
        titre: "",
        points: 1,
        sonde: { type: "dom_selector", selector: "", minCount: 1 },
      },
    ]);

  const modifier = (valeur: string) => {
    setTexte(valeur);
    let analyse: unknown;
    try {
      analyse = JSON.parse(valeur);
    } catch {
      setErreur("JSON invalide : la saisie n'est pas encore prise en compte.");
      return;
    }
    const probleme = erreurCriteres(analyse);
    setErreur(probleme);
    if (!probleme) onChange(analyse as RawCriterion[]);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {criteres.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Aucun critère. Ajoutez-en au moins un : sans critère, le banc didactique ne peut pas
            tester le sujet.
          </p>
        )}
        {criteres.map((c, i) => {
          const type = typeVerification(c);
          const n = i + 1;
          const indices = Array.isArray(c["indices"]) ? (c["indices"] as unknown[]) : [];
          return (
            <fieldset
              key={i}
              disabled={disabled}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 rounded-lg border p-2 text-xs"
            >
              <legend className="px-1 text-[10px] font-mono text-muted-foreground">
                Critère {n}
              </legend>
              <Input
                aria-label={`Identifiant du critère ${n}`}
                className="sm:col-span-2 h-8 text-xs font-mono"
                value={String(c.id ?? "")}
                onChange={(e) => modifierCritere(i, { id: e.target.value.trim() })}
              />
              <Input
                aria-label={`Titre du critère ${n}`}
                className="sm:col-span-6 h-8 text-xs"
                placeholder="Ce que l'élève doit réaliser"
                value={String(c.titre ?? "")}
                onChange={(e) => modifierCritere(i, { titre: e.target.value })}
              />
              <Input
                aria-label={`Points du critère ${n}`}
                type="number"
                min={0}
                step={0.25}
                className="sm:col-span-2 h-8 text-xs"
                value={Number.isFinite(c.points) ? c.points : ""}
                onChange={(e) => modifierCritere(i, { points: Number(e.target.value) })}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="sm:col-span-2 h-8 text-xs text-destructive"
                aria-label={`Supprimer le critère ${n}`}
                onClick={() => appliquer(criteres.filter((_, j) => j !== i))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>

              <select
                aria-label={`Type de vérification du critère ${n}`}
                className="sm:col-span-4 h-8 px-2 border rounded-md bg-background"
                value={type}
                onChange={(e) => changerVerification(i, e.target.value as TypeVerification)}
              >
                <option value="dom_selector">Un élément existe (sélecteur CSS)</option>
                <option value="css_property">Une propriété CSS a une valeur</option>
                <option value="aucune">Corrigé par l'enseignant</option>
                {type === "avancee" && <option value="avancee">Vérification avancée (JSON)</option>}
              </select>
              {(type === "dom_selector" || type === "css_property") && (
                <Input
                  aria-label={`Sélecteur du critère ${n}`}
                  className="sm:col-span-8 h-8 text-xs font-mono"
                  placeholder="ex. nav a"
                  value={String(c.sonde?.selector ?? "")}
                  onChange={(e) => modifierSonde(i, { selector: e.target.value })}
                />
              )}
              {type === "css_property" && (
                <>
                  <Input
                    aria-label={`Propriété CSS du critère ${n}`}
                    className="sm:col-span-6 h-8 text-xs font-mono"
                    placeholder="ex. color"
                    value={String(c.sonde?.property ?? "")}
                    onChange={(e) => modifierSonde(i, { property: e.target.value })}
                  />
                  <Input
                    aria-label={`Valeur attendue du critère ${n}`}
                    className="sm:col-span-6 h-8 text-xs font-mono"
                    placeholder="ex. blue"
                    value={String(c.sonde?.expectedValue ?? "")}
                    onChange={(e) => modifierSonde(i, { expectedValue: e.target.value })}
                  />
                </>
              )}
              {type === "avancee" && (
                <p className="sm:col-span-8 text-[11px] text-muted-foreground self-center">
                  Vérification définie en JSON : modifiez-la dans le mode avancé ci-dessous.
                </p>
              )}
              <Input
                aria-label={`Indice du critère ${n}`}
                className="sm:col-span-12 h-8 text-xs"
                placeholder="Indice affiché à l'élève (facultatif)"
                value={typeof indices[0] === "string" ? indices[0] : ""}
                onChange={(e) =>
                  modifierCritere(i, { indices: e.target.value.trim() ? [e.target.value] : [] })
                }
              />
            </fieldset>
          );
        })}
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={ajouter}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un critère
          </Button>
        )}
      </div>

      <details className="rounded-md border p-2">
        <summary className="cursor-pointer text-[11px] font-semibold">
          Mode avancé : JSON des critères
        </summary>
        <textarea
          aria-label="Critères (JSON)"
          rows={12}
          spellCheck={false}
          disabled={disabled}
          value={texte}
          onChange={(e) => modifier(e.target.value)}
          className="mt-2 w-full p-2 text-xs font-mono border rounded-md bg-background"
        />
      </details>
      {erreur && (
        <p role="alert" className="text-[11px] text-destructive">
          {erreur}
        </p>
      )}
      <div className="space-y-1.5">
        {apercu.map(({ c, etat }, i) => (
          <div
            key={i}
            className="p-2 border rounded-lg bg-card/50 flex items-center justify-between gap-2 text-xs"
          >
            <div className="min-w-0">
              <span className="font-semibold text-primary mr-2">[{String(c.id)}]</span>
              <span>{String(c.titre ?? c.label)}</span>
              {typeof c["fichier"] === "string" && (
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  {c["fichier"]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {etat === "auto" ? (
                <Badge className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Vérifiable
                </Badge>
              ) : etat === "manuel" ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <UserCheck className="w-3 h-3" />
                  Corrigé par l'enseignant
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <AlertTriangle className="w-3 h-3" />
                  Non vérifiable
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {c.points} pts
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

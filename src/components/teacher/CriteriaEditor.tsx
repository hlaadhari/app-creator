import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { critereDepuisJson, type RawCriterion } from "@/lib/evaluation/critere-json";

interface Props {
  criteres: RawCriterion[];
  onChange: (criteres: RawCriterion[]) => void;
  disabled?: boolean;
}

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
    if (typeof r["points"] !== "number" || !Number.isInteger(r["points"]) || r["points"] < 0) {
      return `Critère ${i + 1} : « points » doit être un entier positif.`;
    }
  }
  const ids = valeur.map((c) => (c as { id: string }).id);
  const doublon = ids.find((id, i) => ids.indexOf(id) !== i);
  return doublon ? `L'identifiant « ${doublon} » est utilisé deux fois.` : null;
}

/**
 * Critères au format des sujets du catalogue (content/<sujet>/criteria.json) : sonde « dom_selector »
 * ou « css_property », ou vérification déclarée (js_function_exists, js_test_execution…). Un aperçu
 * indique pour chacun s'il a une vraie vérification automatique.
 */
export function CriteriaEditor({ criteres, onChange, disabled }: Props) {
  const [texte, setTexte] = useState(() => JSON.stringify(criteres, null, 2));
  const [erreur, setErreur] = useState<string | null>(null);

  const apercu = useMemo(
    () => criteres.map((c) => ({ c, automatique: critereDepuisJson(c).automatique !== false })),
    [criteres],
  );

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
      <textarea
        aria-label="Critères (JSON)"
        rows={12}
        spellCheck={false}
        disabled={disabled}
        value={texte}
        onChange={(e) => modifier(e.target.value)}
        className="w-full p-2 text-xs font-mono border rounded-md bg-background"
      />
      {erreur && (
        <p role="alert" className="text-[11px] text-destructive">
          {erreur}
        </p>
      )}
      <div className="space-y-1.5">
        {apercu.map(({ c, automatique }) => (
          <div
            key={String(c.id)}
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
              {automatique ? (
                <Badge className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Vérifiable
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

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NOM_VALIDE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

interface Props {
  /** Préfixe des identifiants HTML (plusieurs éditeurs peuvent coexister dans la page). */
  idPrefix: string;
  files: Record<string, string>;
  onChange: (files: Record<string, string>) => void;
  disabled?: boolean;
}

/** Édition d'un ensemble de fichiers (code de départ ou solution) : un onglet par fichier. */
export function FilesEditor({ idPrefix, files, onChange, disabled }: Props) {
  const noms = Object.keys(files);
  const [actif, setActif] = useState<string | undefined>(noms[0]);
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const courant = actif !== undefined && actif in files ? actif : noms[0];

  const ajouter = () => {
    const nom = nouveau.trim();
    if (!NOM_VALIDE.test(nom)) {
      setErreur("Nom de fichier invalide (lettres, chiffres, point, tiret, sans dossier).");
      return;
    }
    if (nom in files) {
      setErreur("Ce fichier existe déjà.");
      return;
    }
    setErreur(null);
    onChange({ ...files, [nom]: "" });
    setActif(nom);
    setNouveau("");
  };

  const supprimer = (nom: string) => {
    const { [nom]: _retire, ...reste } = files;
    onChange(reste);
    setActif(Object.keys(reste)[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Fichiers">
        {noms.map((nom) => (
          <button
            key={nom}
            type="button"
            role="tab"
            aria-selected={nom === courant}
            onClick={() => setActif(nom)}
            className={`px-2 py-1 text-[11px] font-mono rounded border ${
              nom === courant
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {nom}
          </button>
        ))}
        {noms.length === 0 && (
          <span className="text-[11px] text-muted-foreground">Aucun fichier.</span>
        )}
      </div>

      {courant !== undefined && (
        <div className="space-y-1">
          <textarea
            id={`${idPrefix}-contenu`}
            aria-label={`Contenu de ${courant}`}
            rows={10}
            spellCheck={false}
            disabled={disabled}
            value={files[courant] ?? ""}
            onChange={(e) => onChange({ ...files, [courant]: e.target.value })}
            className="w-full p-2 text-xs font-mono border rounded-md bg-background"
          />
          {!disabled && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => supprimer(courant)}
              className="h-6 px-2 text-[11px] gap-1 text-destructive"
            >
              <Trash2 className="w-3 h-3" />
              Retirer {courant}
            </Button>
          )}
        </div>
      )}

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            aria-label="Nom du nouveau fichier"
            placeholder="ex. utilisateur.html"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ajouter();
              }
            }}
            className="h-7 text-xs max-w-56"
          />
          <Button type="button" size="sm" variant="outline" onClick={ajouter} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" />
            Ajouter un fichier
          </Button>
        </div>
      )}
      {erreur && (
        <p role="alert" className="text-[11px] text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}

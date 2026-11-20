/**
 * Carte d'administration « Tuteur Gemini Notebook » dans /admin (Issue #294).
 * Permet d'activer/désactiver le bouton « Demander au notebook » et de configurer son URL sans redéploiement.
 */
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Save, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useParametreApplication } from "@/hooks/useParametreApplication";
import { validerUrlNotebook } from "@/lib/supabase/app-settings";

interface NotebookTutorSettingCardProps {
  isDemo?: boolean | undefined;
}

export function NotebookTutorSettingCard({ isDemo = false }: NotebookTutorSettingCardProps) {
  const { parametre, record, isLoading, saveParametre, isSaving } =
    useParametreApplication("tuteur_gemini_notebook");

  const [actif, setActif] = useState(parametre.actif);
  const [url, setUrl] = useState(parametre.url);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setActif(parametre.actif);
    setUrl(parametre.url);
  }, [parametre.actif, parametre.url]);

  const urlCheck = validerUrlNotebook(url);
  const hasChanges = actif !== parametre.actif || url.trim() !== parametre.url;

  const handleSave = async () => {
    setErrorMsg(null);
    const check = validerUrlNotebook(url);
    if (!check.valide) {
      setErrorMsg(check.erreur ?? "URL invalide.");
      return;
    }

    if (isDemo) {
      toast.info("Mode démo : modification simulée (non enregistrée en base).");
      return;
    }

    try {
      await saveParametre({ actif, url: url.trim() });
      toast.success(
        actif
          ? "Tuteur Gemini Notebook activé et enregistré."
          : "Tuteur Gemini Notebook désactivé.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement.";
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const formattedDate = record.updated_at
    ? new Date(record.updated_at).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Par défaut (non modifié)";

  return (
    <Card className="border-primary/25">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Tuteur Gemini Notebook
          </span>
          <Badge
            variant="outline"
            className={
              actif
                ? "text-[11px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "text-[11px] bg-muted text-muted-foreground border-border"
            }
          >
            {actif ? "Activé" : "Désactivé"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="font-medium text-foreground">
              Afficher le bouton « Demander au notebook » aux élèves
            </p>
            <p className="text-muted-foreground mt-0.5">
              Disponible dans le tuteur de <code>/cours</code> et de l&apos;atelier (toujours masqué
              pendant un examen en cours).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={actif}
            aria-label="Activer ou désactiver le Tuteur Gemini Notebook"
            disabled={isLoading || isSaving}
            onClick={() => setActif((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              actif ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
                actif ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notebook-url-input" className="font-medium text-foreground block">
            URL publique du notebook Google
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="notebook-url-input"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="https://notebook.google.com/notebook/..."
              className="font-mono text-xs flex-1"
              disabled={isSaving}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!urlCheck.valide}
              onClick={() => window.open(url.trim(), "_blank", "noopener,noreferrer")}
              className="gap-1.5 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Tester le lien
            </Button>
          </div>
          {!urlCheck.valide && url.trim().length > 0 && (
            <p className="text-destructive flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {urlCheck.erreur}
            </p>
          )}
          {errorMsg && (
            <p className="text-destructive flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {errorMsg}
            </p>
          )}
        </div>

        <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 p-2.5 flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            Les élèves utilisent leur propre compte Google. Aucune donnée de compte Google
            n&apos;est transmise à Labo STI.
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t">
          <div className="text-[11px] text-muted-foreground">
            Dernière modification :{" "}
            <span className="font-medium text-foreground">{formattedDate}</span>
            {record.modifie_par_nom && (
              <>
                {" "}
                par <span className="font-medium text-foreground">{record.modifie_par_nom}</span>
              </>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !urlCheck.valide || !hasChanges}
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileCode,
  Lock,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { CriteriaEditor } from "@/components/teacher/CriteriaEditor";
import { FilesEditor } from "@/components/teacher/FilesEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { critereDepuisJson } from "@/lib/evaluation/critere-json";
import { evaluerDansFrame } from "@/lib/evaluation/iframe-evaluation";
import { validerBancDidactiqueReel } from "@/lib/subjects/banc-didactique";
import type { PreValidationReport, ValidationSolution } from "@/lib/subjects/subject-studio";
import {
  chargerVersionStudio,
  creerNouvelleVersionStudio,
  enregistrerBrouillon,
  listerSujetsStudio,
  publierVersionStudio,
  supprimerBrouillon,
  type SujetStudioResume,
  type VersionStudio,
} from "@/lib/supabase/studio";

const NIVEAUX = ["Facile", "Moyen", "Difficile"] as const;

const SOLUTIONS_VIDES: ValidationSolution[] = [
  {
    id: "sol-canonique",
    nom: "Solution A (canonique)",
    type: "canonique",
    description: "Solution de référence respectant l'énoncé.",
    files: { "index.html": "" },
  },
  {
    id: "sol-alternative",
    nom: "Solution B (alternative valide)",
    type: "alternative",
    description: "Autre solution correcte, rédigée différemment.",
    files: { "index.html": "" },
  },
  {
    id: "sol-invalide",
    nom: "Solution C (invalide)",
    type: "invalide",
    description: "Solution contenant une erreur courante : elle doit perdre des points.",
    files: { "index.html": "" },
  },
];

const PAGE_DE_DEPART =
  '<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>Sujet</title>\n</head>\n<body>\n  <!-- À compléter par l\'élève -->\n</body>\n</html>\n';

function nouveauSujet(): VersionStudio {
  return {
    id: "",
    sujet_id: "",
    numero: 1,
    titre: "",
    niveau: "Facile",
    duree_min: 30,
    competence: "",
    enonce_md: "",
    publiee: false,
    criteres: [],
    indices: [],
    fichiers_depart: { "index.html": PAGE_DE_DEPART },
    solutions_test: SOLUTIONS_VIDES.map((s) => ({ ...s, files: { ...s.files } })),
  };
}

const messageDe = (e: unknown, defaut: string) => (e instanceof Error ? e.message : defaut);

export function SubjectStudioTab() {
  const [sujets, setSujets] = useState<SujetStudioResume[] | null>(null);
  const [erreurListe, setErreurListe] = useState<string | null>(null);
  const [version, setVersion] = useState<VersionStudio | null>(null);
  const [estNouveau, setEstNouveau] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [report, setReport] = useState<PreValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [confirmerPublication, setConfirmerPublication] = useState(false);
  const [publication, setPublication] = useState(false);

  const charger = useCallback(async () => {
    setErreurListe(null);
    try {
      setSujets(await listerSujetsStudio());
    } catch (e) {
      setSujets([]);
      setErreurListe(messageDe(e, "Chargement impossible."));
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const modifier = (changements: Partial<VersionStudio>) => {
    setVersion((v) => (v ? { ...v, ...changements } : v));
    setModifie(true);
    setReport(null);
    setMessage(null);
  };

  const ouvrir = async (versionId: string) => {
    setMessage(null);
    try {
      setVersion(await chargerVersionStudio(versionId));
      setEstNouveau(false);
      setModifie(false);
      setReport(null);
    } catch (e) {
      setMessage({ ok: false, texte: messageDe(e, "Ouverture impossible.") });
    }
  };

  const fermer = () => {
    setVersion(null);
    setMessage(null);
    void charger();
  };

  const supprimer = async (s: SujetStudioResume) => {
    try {
      await supprimerBrouillon(s.version_id);
      await charger();
    } catch (e) {
      setErreurListe(messageDe(e, "Suppression impossible."));
    }
  };

  const lancerBanc = async () => {
    if (!version) return;
    setIsValidating(true);
    try {
      // Même moteur que pour les élèves : scripts exécutés, chaque critère évalué sur sa page.
      setReport(
        await validerBancDidactiqueReel(
          version.criteres.map(critereDepuisJson),
          version.solutions_test,
          (fichiers) => (page, criteres) => evaluerDansFrame(fichiers, page, criteres),
        ),
      );
    } catch (e) {
      setMessage({ ok: false, texte: messageDe(e, "Banc interrompu.") });
    } finally {
      setIsValidating(false);
    }
  };

  const enregistrer = async () => {
    if (!version) return;
    setEnregistrement(true);
    setMessage(null);
    try {
      const res = await enregistrerBrouillon(version, estNouveau);
      setVersion({ ...version, id: res.version_id, numero: res.numero });
      setEstNouveau(false);
      setModifie(false);
      setMessage({ ok: true, texte: "Brouillon enregistré." });
    } catch (e) {
      setMessage({ ok: false, texte: messageDe(e, "Enregistrement impossible.") });
    } finally {
      setEnregistrement(false);
    }
  };

  const publier = async () => {
    if (!version || !report?.readyToPublish) return;
    setConfirmerPublication(false);
    setPublication(true);
    setMessage(null);
    try {
      await publierVersionStudio(version.id, {
        ready: true,
        validated_at: new Date(report.validatedAt).toISOString(),
        results: report.results.map((r) => ({
          type: r.type,
          success: r.success,
          passes: r.criteresPasses,
          total: r.totalCriteres,
        })),
      });
      // Relecture depuis le serveur : l'écran reflète l'état réellement publié.
      setVersion(await chargerVersionStudio(version.id));
      setMessage({
        ok: true,
        texte: `Version ${version.numero} publiée : elle est désormais immuable et disponible pour les élèves.`,
      });
    } catch (e) {
      setMessage({ ok: false, texte: messageDe(e, "Publication impossible.") });
    } finally {
      setPublication(false);
    }
  };

  const nouvelleVersion = async () => {
    if (!version) return;
    setMessage(null);
    try {
      const res = await creerNouvelleVersionStudio(version.sujet_id);
      setVersion(await chargerVersionStudio(res.version_id));
      setModifie(false);
      setReport(null);
      setMessage({ ok: true, texte: `Brouillon de la version ${res.numero} créé à partir de la version publiée.` });
    } catch (e) {
      setMessage({ ok: false, texte: messageDe(e, "Création de la version impossible.") });
    }
  };

  // ---------------------------------------------------------------- Liste des sujets
  if (!version) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Studio de conception</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Créez un TP ou un examen : énoncé, fichiers de départ, critères et 3 solutions de
              contrôle (2 valides, 1 invalide).
            </p>
          </div>
          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => {
              setVersion(nouveauSujet());
              setEstNouveau(true);
              setModifie(false);
              setReport(null);
              setMessage(null);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau sujet
          </Button>
        </div>

        {message && !message.ok && (
          <p role="alert" className="text-xs text-destructive">
            {message.texte}
          </p>
        )}
        {erreurListe && (
          <div
            role="alert"
            className="p-3 rounded-lg text-xs border border-destructive/30 text-destructive"
          >
            {erreurListe}{" "}
            <Button
              size="sm"
              variant="outline"
              className="h-6 ml-2 text-xs"
              onClick={() => void charger()}
            >
              Réessayer
            </Button>
          </div>
        )}
        {sujets === null && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {sujets && sujets.length === 0 && !erreurListe && (
          <p className="text-xs text-muted-foreground">
            Aucun sujet pour le moment. Cliquez sur « Nouveau sujet » pour commencer.
          </p>
        )}
        <div className="space-y-2">
          {sujets?.map((s) => (
            <Card key={s.version_id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{s.titre}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {s.sujet_id} · v{s.numero} · {s.niveau}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.publiee ? (
                    <Badge className="gap-1 text-[10px] bg-emerald-600/10 text-emerald-600 border-emerald-600/20">
                      <Lock className="w-3 h-3" />
                      Publiée
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-500/30 text-amber-600"
                    >
                      Brouillon
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => void ouvrir(s.version_id)}
                  >
                    {s.publiee ? "Consulter" : "Modifier"}
                  </Button>
                  {!s.publiee && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      aria-label={`Supprimer le brouillon ${s.titre}`}
                      onClick={() => void supprimer(s)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Édition
  const verrouille = version.publiee;
  const total = version.criteres.reduce((s, c) => s + (Number(c.points) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={fermer}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Mes sujets
          </Button>
          <h2 className="text-base font-bold tracking-tight">{version.titre || "Nouveau sujet"}</h2>
          {verrouille ? (
            <Badge className="gap-1 text-[10px] bg-emerald-600/10 text-emerald-600 border-emerald-600/20">
              <Lock className="w-3 h-3" />
              Version {version.numero} publiée (immuable)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
              Brouillon v{version.numero}
              {modifie ? " · non enregistré" : ""}
            </Badge>
          )}
        </div>
        {!verrouille ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              disabled={enregistrement || (!modifie && !estNouveau)}
              onClick={() => void enregistrer()}
            >
              <Save className="w-3.5 h-3.5" />
              {enregistrement ? "Enregistrement…" : "Enregistrer le brouillon"}
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!report?.readyToPublish || modifie || estNouveau || publication}
              title={
                !report?.readyToPublish
                  ? "Lancez d'abord le banc didactique : il doit être validé."
                  : modifie || estNouveau
                    ? "Enregistrez le brouillon avant de publier."
                    : undefined
              }
              onClick={() => setConfirmerPublication(true)}
            >
              <Send className="w-3.5 h-3.5" />
              {publication ? "Publication…" : `Publier la version ${version.numero}`}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={() => void nouvelleVersion()}
          >
            <Plus className="w-3.5 h-3.5" />
            Créer la version {version.numero + 1}
          </Button>
        )}
      </div>

      <AlertDialog open={confirmerPublication} onOpenChange={setConfirmerPublication}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publier la version {version.numero} ?</AlertDialogTitle>
            <AlertDialogDescription>
              La version sera immédiatement disponible pour les élèves et ne pourra plus jamais
              être modifiée (énoncé, fichiers, critères, solutions). Pour la corriger, vous
              créerez une nouvelle version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void publier()}>Publier définitivement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {message && (
        <div
          role={message.ok ? "status" : "alert"}
          className={`p-3 rounded-lg text-xs border ${
            message.ok
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.texte}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Sujet et énoncé (Markdown)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sujet-id" className="text-xs">
                    Identifiant
                  </Label>
                  <Input
                    id="sujet-id"
                    value={version.sujet_id}
                    disabled={!estNouveau}
                    placeholder="tp-menu-01"
                    onChange={(e) => modifier({ sujet_id: e.target.value.trim() })}
                    className="text-xs mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="titre-sujet" className="text-xs">
                    Titre du sujet
                  </Label>
                  <Input
                    id="titre-sujet"
                    value={version.titre}
                    disabled={verrouille}
                    onChange={(e) => modifier({ titre: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sujet-niveau" className="text-xs">
                    Niveau
                  </Label>
                  <select
                    id="sujet-niveau"
                    value={version.niveau}
                    disabled={verrouille}
                    onChange={(e) =>
                      modifier({ niveau: e.target.value as VersionStudio["niveau"] })
                    }
                    className="w-full mt-1 h-9 px-2 text-xs border rounded-md bg-background"
                  >
                    {NIVEAUX.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="sujet-duree" className="text-xs">
                    Durée (minutes)
                  </Label>
                  <Input
                    id="sujet-duree"
                    type="number"
                    min={5}
                    max={600}
                    value={version.duree_min}
                    disabled={verrouille}
                    onChange={(e) => modifier({ duree_min: Number(e.target.value) || 30 })}
                    className="text-xs mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="sujet-competence" className="text-xs">
                    Compétence visée
                  </Label>
                  <Input
                    id="sujet-competence"
                    value={version.competence ?? ""}
                    disabled={verrouille}
                    placeholder="HTML – structure sémantique"
                    onChange={(e) => modifier({ competence: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="enonce-md" className="text-xs">
                  Consignes et directives
                </Label>
                <textarea
                  id="enonce-md"
                  rows={9}
                  disabled={verrouille}
                  value={version.enonce_md}
                  onChange={(e) => modifier({ enonce_md: e.target.value })}
                  className="w-full mt-1 p-2 text-xs font-mono border rounded-md bg-background"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-semibold">Fichiers de départ fournis à l'élève</div>
              <FilesEditor
                idPrefix="depart"
                files={version.fichiers_depart}
                disabled={verrouille}
                onChange={(fichiers_depart) => modifier({ fichiers_depart })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span>Critères de correction ({version.criteres.length})</span>
                </div>
                <span className="text-xs font-semibold text-primary">Total : {total} points</span>
              </div>
              <CriteriaEditor
                key={version.id || "nouveau"}
                criteres={version.criteres}
                disabled={verrouille}
                onChange={(criteres) => modifier({ criteres })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <Label htmlFor="indices-sujet" className="text-xs font-semibold">
                Indices (un par ligne, du plus discret au plus explicite)
              </Label>
              <textarea
                id="indices-sujet"
                rows={4}
                disabled={verrouille}
                value={(version.indices ?? []).join("\n")}
                onChange={(e) =>
                  modifier({ indices: e.target.value.split("\n").filter((l) => l.trim() !== "") })
                }
                className="w-full p-2 text-xs border rounded-md bg-background"
              />
            </CardContent>
          </Card>

          {version.solutions_test.map((sol, i) => (
            <Card key={sol.id}>
              <CardContent className="p-4 space-y-3">
                <div className="text-xs font-semibold">{sol.nom}</div>
                <p className="text-[11px] text-muted-foreground">{sol.description}</p>
                <FilesEditor
                  idPrefix={sol.id}
                  files={sol.files}
                  disabled={verrouille}
                  onChange={(files) =>
                    modifier({
                      solutions_test: version.solutions_test.map((s, j) =>
                        j === i ? { ...s, files } : s,
                      ),
                    })
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Banc didactique</h3>
              </div>
              <p className="text-xs text-muted-foreground">Avant toute publication (PRD §10.4) :</p>
              <ul className="text-[11px] space-y-1 text-muted-foreground list-disc list-inside">
                <li>la solution canonique obtient tous les points</li>
                <li>la solution alternative obtient tous les points</li>
                <li>la solution invalide perd au moins un critère</li>
                <li>
                  chaque critère a une vérification automatique réelle, ou est déclaré « corrigé par
                  l'enseignant »
                </li>
              </ul>
              <Button
                size="sm"
                onClick={() => void lancerBanc()}
                disabled={isValidating}
                className="w-full text-xs gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isValidating ? "Exécution du banc…" : "Lancer le banc didactique"}
              </Button>

              <div className="space-y-2 pt-2 border-t">
                {version.solutions_test.map((sol) => {
                  const res = report?.results.find((r) => r.type === sol.type);
                  return (
                    <div
                      key={sol.id}
                      className="p-2.5 border rounded-lg text-xs space-y-1 bg-card/60"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[11px]">{sol.nom}</span>
                        {res ? (
                          res.success ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Conforme ({res.criteresPasses}/{res.totalCriteres})
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[10px]">
                              <XCircle className="w-3 h-3" />
                              Non conforme
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Non testée
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {report && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    report.readyToPublish
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {report.readyToPublish ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Banc validé : le sujet est prêt pour la publication.</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Validation didactique incomplète</span>
                      </>
                    )}
                  </div>
                  {report.errors.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-[10px] space-y-0.5">
                      {report.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Publier est définitif : la version devient immuable. Pour corriger un énoncé, un
                fichier ou un critère, créez la version suivante.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

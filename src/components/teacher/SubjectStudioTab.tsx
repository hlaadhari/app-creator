import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { critereDepuisJson, type RawCriterion } from "@/lib/evaluation/critere-json";
import { evaluerDansFrame } from "@/lib/evaluation/iframe-evaluation";
import { validerBancDidactiqueReel } from "@/lib/subjects/banc-didactique";
import {
  publierVersionSujet,
  creerNouvelleVersion,
  type SubjectVersionRecord,
  type PreValidationReport,
  type ValidationSolution,
} from "@/lib/subjects/subject-studio";
import {
  ShieldCheck,
  Lock,
  Plus,
  CheckCircle2,
  XCircle,
  FileCode,
  BookOpen,
  Send,
  AlertTriangle,
} from "lucide-react";

const INITIAL_SUBJECT_VERSION: SubjectVersionRecord<RawCriterion> = {
  id: "v-carte-profil-1",
  sujet_id: "carte-profil",
  numero: 1,
  titre: "Carte de présentation personnelle",
  niveau: "Facile",
  duree_min: 30,
  publiee: false,
  published_at: null,
  enonce_md: `# Carte de Présentation Personnelle

## Contexte
Créez une carte d'identité sémantique en HTML5 et CSS3.

## Consignes
1. Utilisez un élément \`<article class="carte">\`.
2. Incluez un titre \`<h1>\` avec votre prénom.
3. Insérez une liste \`<ul>\` d'au moins 3 centres d'intérêt.
4. Ajoutez un lien email \`mailto:\`.
`,
  fichiers_depart: {
    "index.html": `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="style.css">
  <title>Profil Élève</title>
</head>
<body>
  <!-- À compléter par l'élève -->
</body>
</html>`,
    "style.css": `body { font-family: sans-serif; }`,
    "script.js": `// Aucun JS requis`,
  },
  criteres: [
    {
      id: "c1",
      code: "DOM-01",
      titre: "Élément <article class='carte'> présent",
      points: 4,
      sonde: { type: "dom_selector", selector: "article.carte" },
      fail_message: "L'article avec la classe 'carte' est absent.",
    },
    {
      id: "c2",
      code: "DOM-02",
      titre: "Titre <h1> dans l'article",
      points: 5,
      sonde: { type: "dom_selector", selector: "article.carte h1" },
      fail_message: "Le titre h1 est absent de l'article.",
    },
    {
      id: "c3",
      code: "DOM-03",
      titre: "Liste de 3 centres d'intérêt minimum",
      points: 6,
      sonde: { type: "dom_selector", selector: "article.carte ul > li", minCount: 3 },
      fail_message: "La liste doit comporter au moins 3 éléments <li>.",
    },
    {
      id: "c4",
      code: "DOM-04",
      titre: "Lien email mailto:",
      points: 5,
      sonde: { type: "dom_selector", selector: 'article.carte a[href^="mailto:"]' },
      fail_message: "Le lien mailto: est manquant.",
    },
  ],
  solutions_test: [
    {
      id: "sol-canonique",
      nom: "Solution A (Canonique conforme)",
      type: "canonique",
      description:
        "Solution standard rédigée par l'enseignant respectant scrupuleusement l'énoncé.",
      files: {
        "index.html": `
          <article class="carte">
            <h1>Hatem</h1>
            <p>Élève passionné de STI2D.</p>
            <ul>
              <li>Robotique</li>
              <li>Programmation</li>
              <li>Réseaux</li>
            </ul>
            <a href="mailto:eleve@lycee.tn">Contact</a>
          </article>
        `,
        "style.css": "body { margin: 20px; }",
        "script.js": "",
      },
    },
    {
      id: "sol-alternative",
      nom: "Solution B (Alternative valide avec spans)",
      type: "alternative",
      description: "Variante valide avec balisage plus riche (spans, strong, 4 items).",
      files: {
        "index.html": `
          <article class="carte">
            <h1><span>Amira</span></h1>
            <p>Élève de <strong>Terminale</strong>.</p>
            <ul>
              <li><span>Électronique</span></li>
              <li><span>Algorithmique</span></li>
              <li><span>Web Design</span></li>
              <li><span>Musique</span></li>
            </ul>
            <a href="mailto:amira@ecole.org">Envoyer un mail</a>
          </article>
        `,
        "style.css": "",
        "script.js": "",
      },
    },
    {
      id: "sol-invalide",
      nom: "Solution C (Invalide didactique - 2 items seulement)",
      type: "invalide",
      description:
        "Solution contenant une erreur courante (liste de seulement 2 items au lieu de 3).",
      files: {
        "index.html": `
          <article class="carte">
            <h1>Karim</h1>
            <p>Passionné d'informatique.</p>
            <ul>
              <li>Jeux</li>
              <li>Musique</li>
            </ul>
            <a href="mailto:karim@lycee.tn">Contact</a>
          </article>
        `,
        "style.css": "",
        "script.js": "",
      },
    },
  ],
};

export function SubjectStudioTab() {
  const [version, setVersion] = useState<SubjectVersionRecord<RawCriterion>>(INITIAL_SUBJECT_VERSION);
  const [report, setReport] = useState<PreValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  // Exécution du banc didactique
  const handleRunValidation = async () => {
    setIsValidating(true);
    try {
      // Même moteur que pour les élèves : scripts exécutés, chaque critère évalué sur sa page.
      const rep = await validerBancDidactiqueReel(
        version.criteres.map(critereDepuisJson),
        version.solutions_test,
        (fichiers) => (page, criteres) => evaluerDansFrame(fichiers, page, criteres),
      );
      setReport(rep);
    } finally {
      setIsValidating(false);
    }
  };

  // Publication immuable
  const handlePublish = () => {
    if (!report) return;
    const res = publierVersionSujet(version, report);
    if (res.success && res.version) {
      setVersion(res.version);
      setPublishMessage(
        "Banc didactique validé. Brouillon local : l'enregistrement en base du sujet n'est pas encore branché.",
      );
    } else {
      setPublishMessage(res.error || "Erreur de publication.");
    }
  };

  // Création d'une nouvelle version incrémentale
  const handleCreateNewVersion = () => {
    const next = creerNouvelleVersion(version, {
      titre: `${version.titre} (Révision)`,
    });
    setVersion(next);
    setReport(null);
    setPublishMessage(`Nouvelle version de travail v${next.numero} initialisée.`);
  };

  return (
    <div className="space-y-6">
      {/* En-tête du Studio */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight">
              Studio de Conception & Immuabilité
            </h2>
            {version.publiee ? (
              <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-600/20 gap-1">
                <Lock className="w-3 h-3" />
                Version {version.numero} Publiée (Immuable)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-600 bg-amber-500/10"
              >
                Brouillon v{version.numero}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Règle didactique PRD §10.4 : 2 solutions valides et 1 invalide requises avant
            publication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {version.publiee ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateNewVersion}
              className="text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Créer la version {version.numero + 1}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!report?.readyToPublish}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-3.5 h-3.5" />
              Publier la version {version.numero}
            </Button>
          )}
        </div>
      </div>

      {publishMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            version.publiee
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
          }`}
        >
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>{publishMessage}</span>
        </div>
      )}

      {/* Métadonnées & Énoncé Markdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Énoncé Pédagogique (Markdown)</span>
              </div>
              <div>
                <Label htmlFor="titre-sujet" className="text-xs">
                  Titre du sujet
                </Label>
                <Input
                  id="titre-sujet"
                  value={version.titre}
                  disabled={version.publiee}
                  onChange={(e) => setVersion({ ...version, titre: e.target.value })}
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="enonce-md" className="text-xs">
                  Consignes & Directives
                </Label>
                <textarea
                  id="enonce-md"
                  rows={8}
                  disabled={version.publiee}
                  value={version.enonce_md}
                  onChange={(e) => setVersion({ ...version, enonce_md: e.target.value })}
                  className="w-full mt-1 p-2 text-xs font-mono border rounded-md bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* Critères d'évaluation */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span>Critères de correction ({version.criteres.length})</span>
                </div>
                <span className="text-xs font-semibold text-primary">
                  Total : {version.criteres.reduce((s, c) => s + c.points, 0)} points
                </span>
              </div>

              <div className="space-y-2">
                {version.criteres.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 border rounded-lg bg-card/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-primary mr-2">[{String(c.code ?? c.id)}]</span>
                      <span className="text-foreground">{c.titre ?? c.label}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {c.points} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panneau de Pré-validation Didactique (Bouton publier verrouillé tant que non validé) */}
        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Banc Didactique Pré-Publication
                </h3>
              </div>

              <p className="text-xs text-muted-foreground">
                Conformément au PRD §10.4, le bouton « Publier » reste verrouillé tant que :
              </p>
              <ul className="text-[11px] space-y-1 text-muted-foreground list-disc list-inside">
                <li>La solution canonique valide obtient 100%</li>
                <li>La solution alternative valide obtient 100%</li>
                <li>La solution invalide échoue à au moins un critère</li>
              </ul>

              <Button
                size="sm"
                onClick={handleRunValidation}
                disabled={isValidating || version.publiee}
                className="w-full text-xs gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isValidating ? "Exécution du banc..." : "Lancer le banc didactique"}
              </Button>

              {/* État des 3 solutions */}
              <div className="space-y-2 pt-2 border-t">
                {version.solutions_test.map((sol) => {
                  const solRes = report?.results.find((r) => r.type === sol.type);

                  return (
                    <div
                      key={sol.id}
                      className="p-2.5 border rounded-lg text-xs space-y-1 bg-card/60"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground text-[11px]">{sol.nom}</span>
                        {solRes ? (
                          solRes.success ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Succès ({solRes.criteresPasses}/{solRes.totalCriteres})
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[10px]">
                              <XCircle className="w-3 h-3" />
                              Échec
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            En attente de test
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{sol.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Résumé de conformité */}
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
                        <span>Sujet certifié prêt à la publication !</span>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

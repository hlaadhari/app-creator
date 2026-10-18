import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import { JoinClassModal } from "@/components/JoinClassModal";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { getSujetsCatalog, type RemoteSujet } from "@/lib/supabase/sujets";
import { getMesClasses, type ClassInfo } from "@/lib/supabase/classes";
import { getAllBuffers } from "@/lib/storage/indexeddb";
import { useAuth } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { HelpCircle, GraduationCap, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sprout Workshop – Labo STI" },
      {
        name: "description",
        content:
          "Entraînez-vous au Bac STI avec Sprout Workshop : HTML, CSS et JavaScript avec correction automatique et indices.",
      },
      { property: "og:title", content: "Sprout Workshop – Labo STI" },
      {
        property: "og:description",
        content: "Éditeur dans le navigateur, aperçu en direct et correction automatique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, role } = useAuth();
  const [sujets, setSujets] = useState<RemoteSujet[]>([]);
  const [best, setBest] = useState<Record<string, number | undefined>>({});
  const [mesClasses, setMesClasses] = useState<ClassInfo[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  const loadData = () => {
    getSujetsCatalog().then((list) => {
      setSujets(list);
    });

    // Chargement des scores depuis le tampon garanti IndexedDB
    getAllBuffers().then((buffers) => {
      const scores: Record<string, number | undefined> = {};
      for (const b of buffers) {
        scores[b.exerciseId] = b.bestScore;
      }
      setBest(scores);
    });

    if (user) {
      getMesClasses().then(setMesClasses);
    } else {
      setMesClasses([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3.5 flex items-center justify-between">
        <SproutLogo size="sm" subtitle="Labo STI" />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide(true)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Guide de démarrage</span>
          </Button>

          {(role === "enseignant" || role === "admin") && (
            <Link to="/enseignant">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
              >
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Espace Enseignant</span>
              </Button>
            </Link>
          )}

          {user && <JoinClassModal onClassJoined={loadData} />}

          <AuthModal />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-primary">
              // Entraînement officiel Bac STI
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              Codez, vérifiez, progressez.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Éditeur VS Code intégré, arborescence normalisée, bac à sable étanche et correction
              formative critère par critère.
            </p>
          </div>

          {!user && (
            <div className="shrink-0">
              <JoinClassModal
                triggerButton={
                  <Button
                    size="sm"
                    className="gap-2 text-xs bg-primary text-primary-foreground font-medium"
                  >
                    <Users className="h-4 w-4" />
                    <span>Rejoindre ma classe</span>
                  </Button>
                }
              />
            </div>
          )}
        </div>

        {/* Bloc classes actives pour l'élève connecté */}
        {user && mesClasses.length > 0 && (
          <div className="mt-8 rounded-lg border bg-card/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>Mes Classes Enregistrées</span>
              </h2>
              <JoinClassModal
                onClassJoined={loadData}
                triggerButton={
                  <button className="text-xs font-medium text-primary hover:underline cursor-pointer">
                    + Ajouter une classe
                  </button>
                }
              />
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {mesClasses.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border bg-background p-3 flex flex-col justify-between"
                >
                  <div className="font-medium text-sm text-foreground">{c.nom}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 font-mono">
                    <span>{c.annee}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Inscrit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Catalogue des Sujets */}
        <div className="mt-8">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
            Catalogue des sujets pratiques ({sujets.length})
          </h2>

          <div className="grid gap-3">
            {sujets.map((e, i) => (
              <Link
                key={e.id}
                to="/sujet/$id"
                params={{ id: e.id }}
                className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-xs"
              >
                <span className="font-mono text-xl font-bold text-muted-foreground/60 group-hover:text-primary transition-colors">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {e.titre}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{e.competence}</div>
                </div>
                <span className="rounded border px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  {e.niveau}
                </span>
                <span
                  className={`w-20 text-right font-mono text-sm font-semibold ${best[e.id] === 20 ? "text-emerald-500" : best[e.id] !== undefined ? "text-primary" : "text-muted-foreground/50"}`}
                >
                  {best[e.id] !== undefined ? `${best[e.id]}/20` : "—"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <OnboardingGuide forceOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

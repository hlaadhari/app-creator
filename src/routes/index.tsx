import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import { JoinClassModal } from "@/components/JoinClassModal";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { getSujetsCatalog, type RemoteSujet } from "@/lib/supabase/sujets";
import { getMesClasses, type ClassInfo } from "@/lib/supabase/classes";
import { getAllBuffers } from "@/lib/storage/indexeddb";
import { useAuth } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { ProgressionModal } from "@/components/competences/ProgressionModal";
import { getLocalAttempts } from "@/lib/pedagogy/attempts-service";
import { getExercise } from "@/lib/exercises";
import { load as loadProgress } from "@/lib/progress";
import {
  HelpCircle,
  GraduationCap,
  Users,
  Clock,
  Award,
  ShieldAlert,
  Shield,
  TrendingUp,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    const list = await getSujetsCatalog();
    return { initialSujets: list };
  },
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
  const loaderData = Route.useLoaderData();
  const { user, role } = useAuth();
  const [sujets, setSujets] = useState<RemoteSujet[]>(loaderData?.initialSujets || []);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [best, setBest] = useState<Record<string, number | undefined>>({});
  const [progressMap, setProgressMap] = useState<
    Record<
      string,
      {
        status: "non_commence" | "en_cours" | "valide";
        passedCriteria?: number;
        totalCriteria?: number;
        score?: number;
      }
    >
  >({});
  const [mesClasses, setMesClasses] = useState<ClassInfo[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  const computeProgress = async (catalog: RemoteSujet[]) => {
    try {
      const buffers = await getAllBuffers();
      const bufferMap = new Map(buffers.map((b) => [b.exerciseId, b]));
      const scores: Record<string, number | undefined> = {};
      const map: Record<
        string,
        {
          status: "non_commence" | "en_cours" | "valide";
          passedCriteria?: number;
          totalCriteria?: number;
          score?: number;
        }
      > = {};

      for (const s of catalog) {
        const ex = getExercise(s.id);
        const totalCriteria = ex?.criteria.length || 0;
        const buf = bufferMap.get(s.id);
        const local = loadProgress(s.id);
        const attempts = getLocalAttempts(s.id);

        const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
        const bestScore =
          buf?.bestScore ?? local?.best ?? (latestAttempt ? latestAttempt.note20 : undefined);
        scores[s.id] = bestScore;

        if (
          bestScore === 20 ||
          (latestAttempt &&
            totalCriteria > 0 &&
            latestAttempt.criteres.filter((c) => c.ok).length === totalCriteria)
        ) {
          map[s.id] = {
            status: "valide",
            passedCriteria: totalCriteria,
            totalCriteria,
            score: 20,
          };
        } else if (latestAttempt) {
          const passed = latestAttempt.criteres.filter((c) => c.ok).length;
          map[s.id] = {
            status: "en_cours",
            passedCriteria: passed,
            totalCriteria: totalCriteria || latestAttempt.criteres.length,
            score: latestAttempt.note20,
          };
        } else if (bestScore !== undefined && bestScore > 0) {
          map[s.id] = {
            status: "en_cours",
            score: bestScore,
            totalCriteria,
          };
        } else if (buf || local) {
          map[s.id] = {
            status: "en_cours",
            passedCriteria: 0,
            totalCriteria,
            score: 0,
          };
        } else {
          map[s.id] = {
            status: "non_commence",
          };
        }
      }

      setBest(scores);
      setProgressMap(map);
    } catch (e) {
      console.warn("Erreur calcul progression catalogue :", e);
    }
  };

  const loadData = () => {
    getSujetsCatalog().then((list) => {
      setSujets(list);
      computeProgress(list);
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

  const filteredSujets = useMemo(() => {
    if (selectedFilter === "all") return sujets;
    return sujets.filter((s) => s.module === selectedFilter);
  }, [sujets, selectedFilter]);

  const counts = useMemo(() => {
    return {
      all: sujets.length,
      initiation: sujets.filter((s) => s.module === "Initiation").length,
      moduleA: sujets.filter((s) => s.module === "Module A").length,
      moduleB: sujets.filter((s) => s.module === "Module B").length,
      moduleC: sujets.filter((s) => s.module === "Module C").length,
    };
  }, [sujets]);

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3.5 flex items-center justify-between">
        <SproutLogo size="sm" subtitle="Labo STI" />
        <div className="flex items-center gap-3">
          {/* Mémento & Support de cours officiel */}
          <Link to="/cours">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-foreground border-border hover:bg-accent/40"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Mémento STI</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide(true)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Guide de démarrage</span>
          </Button>

          {/* Espace Enseignant réservé aux rôles enseignant et admin connectés */}
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

          {/* Espace Administration réservé aux administrateurs connectés */}
          {role === "admin" && (
            <Link to="/admin">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Administration</span>
              </Button>
            </Link>
          )}

          <ProgressionModal />

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

          <div className="shrink-0 flex items-center flex-wrap gap-2.5">
            <ProgressionModal
              triggerButton={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs border-primary/40 text-primary hover:bg-primary/10 font-medium cursor-pointer"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Bilan Compétences</span>
                </Button>
              }
            />

            {!user && (
              <JoinClassModal
                triggerButton={
                  <Button
                    size="sm"
                    className="gap-2 text-xs bg-primary text-primary-foreground font-medium cursor-pointer"
                  >
                    <Users className="h-4 w-4" />
                    <span>Rejoindre ma classe</span>
                  </Button>
                }
              />
            )}
          </div>
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

        {/* Catalogue des Sujets avec Filtres de Modules */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Catalogue des sujets pratiques ({filteredSujets.length}/{sujets.length})
            </h2>

            {/* Filtres par Module */}
            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              <button
                onClick={() => setSelectedFilter("all")}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                  selectedFilter === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Tous ({counts.all})
              </button>
              <button
                onClick={() => setSelectedFilter("Initiation")}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                  selectedFilter === "Initiation"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Initiation ({counts.initiation})
              </button>
              <button
                onClick={() => setSelectedFilter("Module A")}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                  selectedFilter === "Module A"
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Module A ({counts.moduleA})
              </button>
              <button
                onClick={() => setSelectedFilter("Module B")}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                  selectedFilter === "Module B"
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Module B ({counts.moduleB})
              </button>
              <button
                onClick={() => setSelectedFilter("Module C")}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                  selectedFilter === "Module C"
                    ? "bg-amber-600 text-white font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Module C ({counts.moduleC})
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {filteredSujets.map((e, i) => (
              <Link
                key={e.id}
                to="/sujet/$id"
                params={{ id: e.id }}
                className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold text-muted-foreground/60 group-hover:text-primary transition-colors w-8">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                        e.module === "Module A"
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : e.module === "Module B"
                            ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                            : e.module === "Module C"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}
                    >
                      {e.module || "Initiation"}
                    </span>
                    {e.examMode && (
                      <span className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[10px] font-mono text-rose-500 font-semibold">
                        Bac Blanc
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors text-sm sm:text-base">
                      {e.titre}
                    </span>
                    <span
                      className={`hidden sm:inline-block rounded px-2 py-0.5 text-[10px] font-mono font-medium shrink-0 ${
                        e.module === "Module A"
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : e.module === "Module B"
                            ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                            : e.module === "Module C"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}
                    >
                      {e.module || "Initiation"}
                    </span>
                    {e.examMode && (
                      <span className="hidden sm:inline-block rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-500 font-semibold shrink-0">
                        Bac Blanc Officiel
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {e.competence}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded border px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                      {e.niveau}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {e.dureeMinutes || 20}m
                    </span>
                  </div>

                  <div className="w-40 flex justify-end">
                    {(() => {
                      const prog = progressMap[e.id];
                      if (prog?.status === "valide") {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Validé (20/20)</span>
                          </span>
                        );
                      }
                      if (prog?.status === "en_cours") {
                        const label =
                          prog.passedCriteria !== undefined &&
                          prog.totalCriteria !== undefined &&
                          prog.totalCriteria > 0
                            ? `${prog.passedCriteria}/${prog.totalCriteria} critères`
                            : prog.score !== undefined
                              ? `${prog.score}/20`
                              : "En cours";
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/25 shrink-0">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>En cours ({label})</span>
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono text-muted-foreground/60 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          <span>Non commencé</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <OnboardingGuide forceOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

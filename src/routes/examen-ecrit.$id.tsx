import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useMemo } from "react";
import { getWrittenExamPublic } from "@/lib/content/written-subjects";
import { WrittenExamEnvironment } from "@/components/exam/written/WrittenExamEnvironment";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/examen-ecrit/$id")({
  head: () => ({
    meta: [
      { title: "Épreuve Écrite Théorique – Labo STI" },
      {
        name: "description",
        content: "Environnement d'épreuve écrite théorique standardisée pour le Baccalauréat STI.",
      },
    ],
  }),
  component: ExamenEcritPage,
});

function ExamenEcritPage() {
  const { id } = Route.useParams();

  const manifest = useMemo(() => {
    return getWrittenExamPublic(id);
  }, [id]);

  if (!manifest) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground">Épreuve écrite introuvable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun sujet d'épreuve écrite ne correspond à l'identifiant{" "}
            <code className="font-mono text-primary font-bold">{id}</code>.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
              </Button>
            </Link>
            <Link to="/examen-ecrit/$id" params={{ id: "written-bac-demo" }}>
              <Button size="sm" className="gap-2 bg-primary">
                <BookOpen className="h-4 w-4" /> Ouvrir le spécimen démo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-5xl mx-auto px-4 mb-4 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quitter l'épreuve et revenir à l'accueil
        </Link>
        <AuthModal />
      </div>

      <WrittenExamEnvironment manifest={manifest} />
    </div>
  );
}

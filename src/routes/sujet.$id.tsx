import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getExercise, type Exercise } from "@/lib/exercises";
import { chargerSujetPublie } from "@/lib/supabase/sujets-publies";
import { useWorkspaceState } from "@/hooks/useWorkspaceState";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const Route = createFileRoute("/sujet/$id")({
  loader: async ({ params }) => {
    // Catalogue embarqué d'abord, puis sujets publiés depuis le Studio.
    const ex = getExercise(params.id) ?? (await chargerSujetPublie(params.id));
    if (!ex) throw notFound();
    return { title: ex.title, competence: ex.competence };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Sujet"} – Labo STI` },
      { name: "description", content: `Sujet d'entraînement : ${loaderData?.competence ?? ""}` },
      { property: "og:title", content: `${loaderData?.title ?? "Sujet"} – Labo STI` },
      {
        property: "og:description",
        content: `Sujet d'entraînement Bac STI : ${loaderData?.competence ?? ""}`,
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const local = getExercise(id);
  const [distant, setDistant] = useState<Exercise | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (local) return;
    let actif = true;
    chargerSujetPublie(id)
      .then((e) => {
        if (!actif) return;
        if (e) setDistant(e);
        else setErreur("Ce sujet n'existe pas ou n'est pas publié.");
      })
      .catch((e: unknown) => {
        if (actif) setErreur(e instanceof Error ? e.message : "Chargement du sujet impossible.");
      });
    return () => {
      actif = false;
    };
  }, [id, local]);

  const ex = local ?? distant;
  if (!ex) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground p-6">
        {erreur ? (
          <div role="alert" className="text-center space-y-3">
            <p>{erreur}</p>
            <Link to="/" className="underline">
              Retour aux sujets
            </Link>
          </div>
        ) : (
          <p>Chargement du sujet…</p>
        )}
      </div>
    );
  }
  return <WorkspaceView key={ex.id} ex={ex} />;
}

function WorkspaceView({ ex }: { ex: Exercise }) {
  const ws = useWorkspaceState(ex);
  return <WorkspaceShell ex={ex} ws={ws} />;
}

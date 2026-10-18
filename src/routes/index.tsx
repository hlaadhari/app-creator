import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exercises } from "@/lib/exercises";
import { load } from "@/lib/progress";
import { SproutLogo } from "@/components/SproutLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sprout Workshop – Labo STI" },
      { name: "description", content: "Entraînez-vous au Bac STI avec Sprout Workshop : HTML, CSS et JavaScript avec correction automatique et indices." },
      { property: "og:title", content: "Sprout Workshop – Labo STI" },
      { property: "og:description", content: "Éditeur dans le navigateur, aperçu en direct et correction automatique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [best, setBest] = useState<Record<string, number | undefined>>({});
  useEffect(() => {
    setBest(Object.fromEntries(exercises.map((e) => [e.id, load(e.id)?.best])));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3.5 flex items-center justify-between">
        <SproutLogo size="sm" subtitle="Labo STI" />
        <span className="text-xs text-muted-foreground font-mono">parcours HTML · CSS · JS</span>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-sm text-primary">// entraînement Bac STI</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
          Codez, vérifiez, progressez.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Un éditeur dans votre navigateur, un aperçu en direct et une correction immédiate critère par critère.
        </p>

        <div className="mt-12 grid gap-3">
          {exercises.map((e, i) => (
            <Link
              key={e.id}
              to="/sujet/$id"
              params={{ id: e.id }}
              className="group flex items-center gap-5 rounded-lg border bg-card p-5 transition-colors hover:border-primary"
            >
              <span className="font-mono text-2xl text-muted-foreground group-hover:text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <div className="font-medium">{e.title}</div>
                <div className="text-sm text-muted-foreground">{e.competence}</div>
              </div>
              <span className="rounded border px-2 py-0.5 text-xs font-mono text-muted-foreground">{e.level}</span>
              <span className={`w-16 text-right font-mono text-sm ${best[e.id] === 20 ? "text-success" : "text-muted-foreground"}`}>
                {best[e.id] !== undefined ? `${best[e.id]}/20` : "—"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
